"""Failure injection at the original USB bridge's HTTP boundary (no hardware)."""
import importlib.util
import json
from pathlib import Path
import unittest
from unittest.mock import Mock
from urllib.error import HTTPError, URLError

spec = importlib.util.spec_from_file_location("usb_bridge", Path(__file__).resolve().parents[1] / "scripts/usb-bridge.py")
bridge = importlib.util.module_from_spec(spec)
spec.loader.exec_module(bridge)


class Response:
    status = 200
    def __init__(self, body):
        self.body = body
    def __enter__(self):
        return self
    def __exit__(self, *_):
        pass
    def read(self, count):
        return self.body[:count]


class BridgeTests(unittest.TestCase):
    def setUp(self):
        self.line = bridge.REPORT_PREFIX + json.dumps({"requestId": 7, "report": {"deviceId": "esp32-maquete-01", "telemetry": {"present": True}}})
        self.opener = Mock(return_value=Response(b'{"ok":true,"serverTime":1000000,"command":null,"result":null}'))

    def send(self, line=None):
        return bridge.forward(self.line if line is None else line, "http://127.0.0.1:3000", "test-device-token", self.opener)

    def test_authenticated_payload_and_correlation(self):
        ack = self.send()
        self.assertEqual(json.loads(ack[len(bridge.REPLY_PREFIX):])["requestId"], 7)
        req = self.opener.call_args.args[0]
        self.assertEqual(req.get_header("Authorization"), "Bearer test-device-token")
        self.assertEqual(json.loads(req.data)["telemetry"]["transport"], "usb")

    def test_diagnostic_is_ignored(self):
        self.assertIsNone(self.send("DIAG RFID error"))
        self.opener.assert_not_called()

    def test_oversized_report_is_ignored(self):
        self.assertIsNone(self.send(self.line + "x" * bridge.MAX_LINE))
        self.opener.assert_not_called()

    def test_invalid_request_ids_rejected(self):
        for value in [True, -1, 4294967296, "7", None]:
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.send(bridge.REPORT_PREFIX + json.dumps({"requestId": value, "report": {}}))
        self.opener.assert_not_called()

    def test_malformed_report_rejected(self):
        with self.assertRaises(ValueError):
            self.send(bridge.REPORT_PREFIX + '{bad JSON}')
        self.opener.assert_not_called()

    def test_http_auth_failure_has_no_ack(self):
        self.opener.side_effect = HTTPError("http://127.0.0.1:3000", 401, "Unauthorized", {}, None)
        with self.assertRaises(HTTPError):
            self.send()

    def test_network_failure_has_no_ack(self):
        self.opener.side_effect = URLError("Connection refused")
        with self.assertRaises(URLError):
            self.send()

    def test_timeout_has_no_ack(self):
        self.opener.side_effect = TimeoutError()
        with self.assertRaises(TimeoutError):
            self.send()

    def test_oversized_response_has_no_ack(self):
        self.opener.return_value = Response(b" " * 4097)
        with self.assertRaises(ValueError):
            self.send()

    def test_invalid_json_response_has_no_ack(self):
        self.opener.return_value = Response(b"not JSON")
        with self.assertRaises(ValueError):
            self.send()

    def test_invalid_server_time_has_no_ack(self):
        for value in [None, True, "1000000", float("nan"), float("inf")]:
            self.opener.return_value = Response(json.dumps({"ok": True, "serverTime": value}).encode())
            with self.subTest(value=value), self.assertRaises(ValueError):
                self.send()

    def test_rejected_response_has_no_ack(self):
        self.opener.return_value = Response(b'{"ok":false,"serverTime":1000000}')
        with self.assertRaises(ValueError):
            self.send()


if __name__ == "__main__":
    unittest.main(verbosity=2)
