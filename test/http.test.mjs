import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { once } from "node:events";
import { makeServer } from "../server/app.mjs";
const admin = "a".repeat(64),
  device = "d".repeat(64);
async function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "senai-http-"));
  const app = makeServer({
    dataDir: dir,
    publicDir: fileURLToPath(new URL("../public", import.meta.url)),
    adminToken: admin,
    deviceToken: device,
  });
  app.server.listen(0, "127.0.0.1");
  await once(app.server, "listening");
  t.after(async () => {
    app.close();
    app.server.closeAllConnections();
    rmSync(dir, { recursive: true, force: true });
  });
  return { url: `http://127.0.0.1:${app.server.address().port}`, app };
}
test("autenticação separa painel/dispositivo e login cria cookie HttpOnly", async (t) => {
  const { url } = await fixture(t);
  assert.equal((await fetch(url + "/api/state")).status, 401);
  assert.equal(
    (
      await fetch(url + "/api/state", {
        headers: { Authorization: "Bearer " + device },
      })
    ).status,
    401,
  );
  const res = await fetch(url + "/api/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ token: admin }),
  });
  assert.equal(res.status, 200);
  assert.match(res.headers.get("set-cookie"), /HttpOnly/);
  assert.match(res.headers.get("set-cookie"), /SameSite=Strict/);
  const cookie = res.headers.get("set-cookie").split(";")[0];
  assert.equal(
    (await fetch(url + "/api/state", { headers: { Cookie: cookie } })).status,
    200,
  );
});
test("API rejeita origem cruzada e JSON inválido", async (t) => {
  const { url } = await fixture(t);
  const headers = {
    Authorization: "Bearer " + admin,
    "Content-Type": "application/json",
  };
  assert.equal(
    (
      await fetch(url + "/api/tags", {
        method: "POST",
        headers: { ...headers, Origin: "https://outro.local" },
        body: "{}",
      })
    ).status,
    403,
  );
  assert.equal(
    (await fetch(url + "/api/tags", { method: "POST", headers, body: "oops" }))
      .status,
    400,
  );
  assert.equal(
    (
      await fetch(url + "/api/tags", {
        method: "POST",
        headers,
        body: JSON.stringify({ uid: "A".repeat(20000) }),
      })
    ).status,
    413,
  );
});
test("servidor entrega o 3D e protege arquivos fora de public", async (t) => {
  const { url } = await fixture(t);
  assert.equal((await fetch(url + "/model/")).status, 200);
  assert.equal((await fetch(url + "/.env")).status, 404);
  assert.equal((await fetch(url + "/server/store.mjs")).status, 404);
  assert.match(
    (await fetch(url + "/")).headers.get("content-security-policy"),
    /frame-ancestors 'self'/,
  );
});
test("SSE publica o estado e API completa um movimento", async (t) => {
  const { url } = await fixture(t);
  const headers = {
    Authorization: "Bearer " + admin,
    "Content-Type": "application/json",
  };
  const ac = new AbortController();
  t.after(() => ac.abort());
  const events = await fetch(url + "/api/events", {
    headers,
    signal: ac.signal,
  });
  assert.equal(events.status, 200);
  const reader = events.body.getReader();
  assert.match(new TextDecoder().decode((await reader.read()).value), /data: /);
  let res = await fetch(url + "/api/tags", {
    method: "POST",
    headers,
    body: JSON.stringify({ boxId: "CX-01", uid: "04A1B201" }),
  });
  assert.equal(res.status, 200);
  res = await fetch(url + "/api/command", {
    method: "POST",
    headers,
    body: JSON.stringify({ boxId: "CX-01", action: "entrada", slot: "A2" }),
  });
  const cmd = await res.json();
  assert.equal(res.status, 200);
  res = await fetch(url + "/api/device/report", {
    method: "POST",
    headers: { ...headers, Authorization: "Bearer " + device },
    body: JSON.stringify({
      deviceId: "esp32-maquete-01",
      telemetry: { present: true, distanceCm: 3, color: "azul", rssi: -50 },
      scan: { eventId: "http0001", uid: "04A1B201", commandId: cmd.id },
    }),
  });
  assert.equal((await res.json()).result.accepted, true);
  const state = await (await fetch(url + "/api/state", { headers })).json();
  assert.equal(state.boxes[0].slot, "A2");
  await reader.cancel();
});
