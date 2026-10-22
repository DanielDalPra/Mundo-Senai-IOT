import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Store } from "../server/store.mjs";
function fixture(t) {
  const dir = mkdtempSync(join(tmpdir(), "senai-store-"));
  t.after(() => rmSync(dir, { recursive: true, force: true }));
  let time = 1000000;
  const store = new Store(dir, { now: () => time });
  return { store, dir, advance: (ms) => (time += ms) };
}
const telemetry = {
  present: true,
  distanceCm: 3.2,
  color: "azul",
  rssi: -48,
  pulses: [120, 140, 80],
  rfidOk: true,
  oledOk: true,
};
const report = (store, id, uid, commandId = null, extras = {}) =>
  store.report({
    deviceId: "esp32-maquete-01",
    telemetry: { ...telemetry, ...extras },
    scan: { eventId: id, uid, commandId },
  });
const register = (s, id = "CX-01", uid = "04A1B201") =>
  s.register({ boxId: id, uid });
test("inicia vazio, sem inferir presença física das fotografias", (t) => {
  const { store } = fixture(t);
  assert.equal(store.snapshot().boxes.filter((b) => b.slot).length, 0);
  assert.equal(store.snapshot().deviceOnline, false);
});
test("cadastro valida UID, normaliza e impede duplicação", (t) => {
  const { store } = fixture(t);
  register(store, "CX-01", "04:a1:b2:01");
  assert.equal(store.state.boxes[0].uid, "04A1B201");
  assert.throws(() => register(store, "CX-02", "04A1B201"), /outra caixa/);
  assert.throws(() => register(store, "CX-02", "04GG"), /UID inválido/);
});
test("tag não cadastrada é observada, sem mover caixa", (t) => {
  const { store } = fixture(t);
  const r = report(store, "unknown01", "04A1B201");
  assert.equal(r.result.code, "unknown_tag");
  assert.equal(store.snapshot().lastScan.uid, "04A1B201");
  assert.equal(store.state.boxes[0].slot, null);
});
test("entrada, mudança de vaga e saída exigem tag da caixa esperada", (t) => {
  const { store } = fixture(t);
  register(store);
  register(store, "CX-02", "04A1B202");
  let cmd = store.arm({ action: "entrada", boxId: "CX-01", slot: "A1" });
  assert.equal(
    report(store, "wrong001", "04A1B202", cmd.id).result.code,
    "wrong_box",
  );
  assert.equal(store.state.boxes[0].slot, null);
  assert.equal(
    report(store, "entry001", "04A1B201", cmd.id).result.accepted,
    true,
  );
  assert.equal(store.state.boxes[0].slot, "A1");
  cmd = store.arm({ action: "mover", boxId: "CX-01", slot: "B3" });
  assert.equal(
    report(store, "move0001", "04A1B201", cmd.id).result.accepted,
    true,
  );
  assert.equal(store.state.boxes[0].slot, "B3");
  cmd = store.arm({ action: "saida", boxId: "CX-01" });
  report(store, "exit0001", "04A1B201", cmd.id);
  assert.equal(store.state.boxes[0].slot, null);
});
test("vaga ocupada, caixa já presente e operação concorrente são rejeitadas", (t) => {
  const { store } = fixture(t);
  register(store);
  register(store, "CX-02", "04A1B202");
  const c = store.arm({ action: "entrada", boxId: "CX-01", slot: "A1" });
  assert.throws(
    () => store.arm({ action: "entrada", boxId: "CX-02", slot: "A2" }),
    /Já existe/,
  );
  report(store, "entry002", "04A1B201", c.id);
  assert.throws(
    () => store.arm({ action: "entrada", boxId: "CX-02", slot: "A1" }),
    /ocupada/,
  );
  assert.throws(
    () => store.arm({ action: "entrada", boxId: "CX-01", slot: "A2" }),
    /já está/,
  );
  assert.throws(() => register(store), /Retire/);
});
test("reenvio de evento após perda de resposta não duplica movimento", (t) => {
  const { store } = fixture(t);
  register(store);
  const c = store.arm({ action: "entrada", boxId: "CX-01", slot: "A1" });
  report(store, "retry001", "04A1B201", c.id);
  const result = report(store, "retry001", "04A1B201", c.id);
  assert.equal(result.result.duplicate, true);
  assert.equal(
    store.state.history.filter((e) => e.type === "movimento").length,
    1,
  );
});
test("operação expirada, cancelada ou antiga não movimenta", (t) => {
  const { store, advance } = fixture(t);
  register(store);
  let c = store.arm({ action: "entrada", boxId: "CX-01", slot: "A1" });
  advance(60001);
  assert.equal(
    report(store, "expire01", "04A1B201", c.id).result.code,
    "expired",
  );
  c = store.arm({ action: "entrada", boxId: "CX-01", slot: "A1" });
  store.cancel();
  assert.equal(
    report(store, "cancel01", "04A1B201", c.id).result.code,
    "expired",
  );
  store.arm({ action: "entrada", boxId: "CX-01", slot: "A2" });
  assert.equal(
    report(store, "stale001", "04A1B201", c.id).result.code,
    "stale_command",
  );
  assert.equal(store.state.boxes[0].slot, null);
});
test("UID conhecido sem operação e leitura sem presença não alteram estoque", (t) => {
  const { store } = fixture(t);
  register(store);
  assert.equal(report(store, "observe1", "04A1B201").result.code, "observed");
  const c = store.arm({ action: "entrada", boxId: "CX-01", slot: "A1" });
  assert.equal(
    report(store, "absent01", "04A1B201", c.id, { present: false }).result.code,
    "not_present",
  );
  assert.equal(store.state.boxes[0].slot, null);
});
test("cor não identifica caixa e amarelo é aceito como telemetria", (t) => {
  const { store } = fixture(t);
  register(store);
  const c = store.arm({ action: "entrada", boxId: "CX-01", slot: "A1" });
  assert.equal(
    report(store, "yellow01", "04A1B201", c.id, { color: "amarelo" }).result
      .accepted,
    true,
  );
  assert.equal(store.state.boxes[0].id, "CX-01");
});
test("persistência sobrevive reinício e invalida comando pendente", (t) => {
  const { store, dir } = fixture(t);
  register(store);
  const c = store.arm({ action: "entrada", boxId: "CX-01", slot: "A1" });
  report(store, "saved001", "04A1B201", c.id);
  store.arm({ action: "saida", boxId: "CX-01" });
  const fresh = new Store(dir);
  assert.equal(fresh.state.boxes[0].slot, "A1");
  assert.equal(fresh.pending(), null);
  assert.equal(
    report(fresh, "saved001", "04A1B201", c.id).result.duplicate,
    true,
  );
});
test("correção é auditada e não aceita vaga duplicada", (t) => {
  const { store } = fixture(t);
  store.reconcile({ boxId: "CX-01", slot: "B1", reason: "Conferência física" });
  assert.equal(store.state.history[0].type, "ajuste");
  assert.throws(
    () =>
      store.reconcile({
        boxId: "CX-02",
        slot: "B1",
        reason: "Conferência física",
      }),
    /ocupada/,
  );
});
test("payload inválido não altera arquivo de estado", (t) => {
  const { store, dir } = fixture(t);
  const before = readFileSync(join(dir, "state.json"), "utf8");
  assert.throws(
    () => store.report({ deviceId: "outro", telemetry }),
    /autorizado/,
  );
  assert.throws(
    () =>
      store.report({
        deviceId: "esp32-maquete-01",
        telemetry: { ...telemetry, distanceCm: -1 },
      }),
    /Distância/,
  );
  assert.equal(readFileSync(join(dir, "state.json"), "utf8"), before);
});
