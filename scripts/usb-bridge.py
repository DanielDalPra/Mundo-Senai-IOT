"""Liga o firmware original pela USB ao mesmo endpoint autenticado do Wi-Fi."""
import argparse
import json
import math
import os
from pathlib import Path
import sys
from urllib.request import Request, urlopen

REPORT_PREFIX = "APRENDE_REPORT "
REPLY_PREFIX = "APRENDE_REPLY "
MAX_LINE = 17000


def load_settings():
    values = {}
    env_file = Path(__file__).resolve().parents[1] / ".env"
    if env_file.exists():
        for line in env_file.read_text(encoding="utf-8-sig").splitlines():
            if "=" in line and not line.lstrip().startswith("#"):
                key, value = line.split("=", 1)
                values[key.strip()] = value.strip()
    values.update(os.environ)
    return values


def forward(line, url, token, opener=urlopen):
    """Retorna confirmação somente após resposta HTTP válida; nunca fabrica ACK."""
    if len(line) > MAX_LINE or not line.startswith(REPORT_PREFIX):
        return None
    envelope = json.loads(line[len(REPORT_PREFIX):])
    request_id = envelope.get("requestId")
    report = envelope.get("report")
    if type(request_id) is not int or not 0 <= request_id <= 0xFFFFFFFF or not isinstance(report, dict):
        raise ValueError("Envelope USB inválido")
    if isinstance(report.get("telemetry"), dict):
        report = {**report, "telemetry": {**report["telemetry"], "transport": "usb"}}
    request = Request(
        url.rstrip("/") + "/api/device/report",
        data=json.dumps(report, separators=(",", ":")).encode("utf-8"),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + token},
        method="POST",
    )
    with opener(request, timeout=2) as response:
        if response.status != 200:
            raise ValueError("Servidor não confirmou o relatório")
        data = response.read(4097)
        if len(data) > 4096:
            raise ValueError("Resposta do servidor excede o limite")
        reply = json.loads(data)
    server_time = reply.get("serverTime") if isinstance(reply, dict) else None
    if (not isinstance(reply, dict) or reply.get("ok") is not True
            or type(server_time) not in (int, float) or not math.isfinite(server_time)):
        raise ValueError("Resposta inválida; leitura permanece no ESP32")
    return REPLY_PREFIX + json.dumps({"requestId": request_id, "reply": reply}, separators=(",", ":")) + "\n"


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", help="Porta do ESP32, por exemplo COM14")
    parser.add_argument("--url", help="URL do servidor local; padrão http://127.0.0.1:3000")
    parser.add_argument("--stdio", action="store_true", help="Ponte por stdin/stdout para testes de protocolo, sem placa")
    parser.add_argument("--verbose", action="store_true", help="Mostrar diagnóstico da serial")
    args = parser.parse_args()
    settings = load_settings()
    token = settings.get("DEVICE_TOKEN", "")
    if len(token) < 32:
        parser.error("Execute npm run setup para criar DEVICE_TOKEN no .env")
    url = args.url or "http://127.0.0.1:" + settings.get("PORT", "3000")

    def handle(line):
        try:
            return forward(line, url, token)
        except Exception as error:
            # Não imprimir token, corpo da requisição ou exceções que exponham credenciais.
            print("Ponte USB: " + type(error).__name__ + "; evento não confirmado, será reenviado.", file=sys.stderr, flush=True)
            return None

    if args.stdio:
        for line in sys.stdin:
            result = handle(line)
            if result:
                print(result, end="", flush=True)
        return

    try:
        import serial
        from serial.tools import list_ports
    except ImportError:
        parser.error("Instale pyserial: python -m pip install pyserial")
    port = args.port
    if not port:
        ports = [p.device for p in list_ports.comports() if p.vid is not None]
        if len(ports) != 1:
            parser.error("Informe --port COMxx; portas USB encontradas: " + ", ".join(ports))
        port = ports[0]
    connection = serial.Serial()
    connection.port, connection.baudrate = port, 115200
    connection.timeout, connection.write_timeout = .2, 1
    connection.dtr, connection.rts = False, False
    connection.open()
    print("Ponte USB ativa em " + port + ". Abra o painel; Ctrl+C encerra.", flush=True)
    buffer = bytearray()
    oversized = False
    try:
        while True:
            for byte in connection.read(connection.in_waiting or 1):
                if byte == 10:
                    if not oversized:
                        line = buffer.decode("utf-8", errors="replace").rstrip("\r")
                        result = handle(line)
                        if result:
                            connection.write(result.encode("utf-8"))
                        elif args.verbose and not line.startswith(REPORT_PREFIX):
                            print(line, flush=True)
                    buffer.clear()
                    oversized = False
                elif not oversized:
                    buffer.append(byte)
                    if len(buffer) > MAX_LINE:
                        oversized = True
                        buffer.clear()
    except KeyboardInterrupt:
        pass
    finally:
        connection.close()


if __name__ == "__main__":
    main()
