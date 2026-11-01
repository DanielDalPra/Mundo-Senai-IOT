import {
  existsSync,
  mkdirSync,
  readFileSync,
  writeFileSync,
  renameSync,
} from "node:fs";
import { join } from "node:path";
import { randomUUID } from "node:crypto";
export const SLOTS = ["A1", "A2", "A3", "B1", "B2", "B3"];
export const UID_PATTERN = /^(?:[0-9A-F]{8}|[0-9A-F]{14}|[0-9A-F]{20})$/;
export function uid(value) {
  return typeof value === "string"
    ? value.toUpperCase().replace(/[\s:-]/g, "")
    : "";
}
export class ApiError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}
export function assert(test, message, status = 400) {
  if (!test) throw new ApiError(status, message);
}
function initial() {
  return {
    version: 1,
    revision: 0,
    boxes: ["azul", "verde", "azul", "amarelo", "azul", "verde"].map(
      (color, i) => ({ id: `CX-0${i + 1}`, color, uid: null, slot: null }),
    ),
    command: null,
    lastScan: null,
    device: null,
    history: [],
    receipts: [],
  };
}
export class Store {
  constructor(
    dir,
    { now = () => Date.now(), deviceId = "esp32-maquete-01" } = {},
  ) {
    this.now = now;
    this.deviceId = deviceId;
    mkdirSync(dir, { recursive: true });
    this.file = join(dir, "state.json");
    this.state = existsSync(this.file)
      ? JSON.parse(readFileSync(this.file, "utf8"))
      : initial();
    assert(
      this.state.version === 1 &&
        Array.isArray(this.state.boxes) &&
        this.state.boxes.length === 6,
      "Arquivo de estoque incompatível",
      500,
    );
    // Uma operação pendente nunca sobrevive a um reinício do servidor.
    this.state.command = null;
    this.state.device = null;
    this.save();
  }
  save() {
    const tmp = this.file + ".tmp";
    writeFileSync(tmp, JSON.stringify(this.state, null, 2), { mode: 0o600 });
    renameSync(tmp, this.file);
  }
  commit(fn) {
    const previous = structuredClone(this.state);
    try {
      const value = fn();
      this.state.revision++;
      this.save();
      return value;
    } catch (e) {
      this.state = previous;
      throw e;
    }
  }
  pending() {
    const c = this.state.command;
    return c && c.expiresAt > this.now() ? c : null;
  }
  snapshot() {
    const { receipts, ...state } = this.state;
    return structuredClone({
      ...state,
      command: this.pending(),
      serverTime: this.now(),
      deviceOnline:
        !!state.device && this.now() - state.device.lastSeen < 10000,
    });
  }
  log(type, message, extra = {}) {
    this.state.history.unshift({
      id: randomUUID(),
      at: this.now(),
      type,
      message,
      ...extra,
    });
    this.state.history = this.state.history.slice(0, 200);
  }
  register(body) {
    const value = uid(body.uid);
    assert(
      UID_PATTERN.test(value),
      "UID inválido: use 4, 7 ou 10 bytes em hexadecimal.",
    );
    const b = this.state.boxes.find((x) => x.id === body.boxId);
    assert(b, "Caixa inválida.");
    assert(
      !this.state.boxes.some((x) => x.uid === value && x.id !== b.id),
      "Esta tag já pertence a outra caixa.",
      409,
    );
    assert(
      b.slot === null,
      "Retire a caixa do estoque antes de trocar sua tag.",
      409,
    );
    return this.commit(() => {
      b.uid = value;
      this.log("cadastro", `Tag cadastrada em ${b.id}.`, { boxId: b.id });
      return { ok: true };
    });
  }
  arm(body) {
    assert(
      ["entrada", "saida", "mover"].includes(body.action),
      "Operação inválida.",
    );
    const b = this.state.boxes.find((x) => x.id === body.boxId);
    assert(b, "Selecione uma caixa.");
    assert(b.uid, "Cadastre a tag desta caixa primeiro.", 409);
    assert(
      !this.pending(),
      "Já existe uma operação aguardando leitura. Cancele ou conclua.",
      409,
    );
    if (body.action === "entrada")
      assert(b.slot === null, "A caixa já está no estoque.", 409);
    else assert(b.slot !== null, "A caixa está fora do estoque.", 409);
    const slot = body.action === "saida" ? null : body.slot;
    assert(slot === null || SLOTS.includes(slot), "Vaga inválida.");
    if (slot)
      assert(
        !this.state.boxes.some((x) => x.slot === slot),
        "Vaga ocupada.",
        409,
      );
    return this.commit(() => {
      this.state.command = {
        id: randomUUID(),
        action: body.action,
        boxId: b.id,
        slot,
        createdAt: this.now(),
        expiresAt: this.now() + 60000,
      };
      this.log(
        "operacao",
        `Aguardando tag de ${b.id}: ${body.action}${slot ? " → " + slot : ""}.`,
      );
      return this.state.command;
    });
  }
  cancel() {
    return this.commit(() => {
      this.state.command = null;
      return { ok: true };
    });
  }
  reconcile(body) {
    assert(SLOTS.includes(body.slot) || body.slot === null, "Vaga inválida.");
    const b = this.state.boxes.find((x) => x.id === body.boxId);
    assert(b, "Caixa inválida.");
    assert(
      typeof body.reason === "string" &&
        body.reason.trim().length >= 5 &&
        body.reason.length <= 160,
      "Informe um motivo (5–160 caracteres).",
    );
    if (body.slot)
      assert(
        !this.state.boxes.some((x) => x.id !== b.id && x.slot === body.slot),
        "Vaga ocupada.",
        409,
      );
    return this.commit(() => {
      b.slot = body.slot;
      this.state.command = null;
      this.log("ajuste", `Ajuste manual de ${b.id}: ${body.reason.trim()}`, {
        boxId: b.id,
        slot: b.slot,
      });
      return { ok: true };
    });
  }
  report(body) {
    assert(body.deviceId === this.deviceId, "Dispositivo não autorizado.", 403);
    const t = body.telemetry;
    assert(t && typeof t === "object", "Telemetria ausente.");
    assert(typeof t.present === "boolean", "Presença inválida.");
    assert(
      t.distanceCm === null ||
        (Number.isFinite(t.distanceCm) &&
          t.distanceCm >= 0 &&
          t.distanceCm <= 500),
      "Distância inválida.",
    );
    assert(
      ["azul", "verde", "vermelho", "amarelo", "indefinida"].includes(t.color),
      "Cor inválida.",
    );
    assert(
      Number.isInteger(t.rssi) && t.rssi >= -127 && t.rssi <= 0,
      "RSSI inválido.",
    );
    const pulses = t.pulses || [0, 0, 0];
    assert(
      Array.isArray(pulses) &&
        pulses.length === 3 &&
        pulses.every((v) => Number.isInteger(v) && v >= 0 && v <= 100000),
      "Pulsos inválidos.",
    );
    const scan = body.scan;
    if (scan) {
      assert(
        typeof scan.eventId === "string" &&
          /^[A-Za-z0-9_-]{8,80}$/.test(scan.eventId),
        "ID de evento inválido.",
      );
      assert(UID_PATTERN.test(uid(scan.uid)), "UID inválido.");
      assert(
        scan.commandId === null ||
          (typeof scan.commandId === "string" && scan.commandId.length <= 80),
        "Comando inválido.",
      );
    }
    return this.commit(() => {
      this.state.device = {
        id: this.deviceId,
        lastSeen: this.now(),
        telemetry: {
          present: t.present,
          distanceCm: t.distanceCm,
          color: t.color,
          rssi: t.rssi,
          transport: t.transport === "usb" ? "usb" : "wifi",
          pulses,
          rfidOk: t.rfidOk === true,
          oledOk: t.oledOk === true,
        },
      };
      let result = null;
      if (scan) {
        const prior = this.state.receipts.find((r) => r.id === scan.eventId);
        if (prior) result = { ...prior.result, duplicate: true };
        else {
          const value = uid(scan.uid),
            b = this.state.boxes.find((x) => x.uid === value),
            c = this.pending();
          result = {
            accepted: false,
            code: "observed",
            message: "Tag lida. Prepare uma operacao no painel.",
          };
          if (!b)
            result = {
              accepted: false,
              code: "unknown_tag",
              message: "Tag nao cadastrada.",
            };
          else if (scan.commandId && !c)
            result = {
              accepted: false,
              code: "expired",
              message: "Operacao expirada ou cancelada.",
            };
          else if (c && scan.commandId !== c.id)
            result = {
              accepted: false,
              code: "stale_command",
              message: "Retire e reapresente a caixa.",
            };
          else if (c && c.boxId !== b.id)
            result = {
              accepted: false,
              code: "wrong_box",
              message: "Tag de outra caixa.",
            };
          else if (c && !t.present)
            result = {
              accepted: false,
              code: "not_present",
              message: "Caixa fora da estacao.",
            };
          else if (c) {
            const valid =
              c.action === "entrada" ? b.slot === null : b.slot !== null;
            if (
              !valid ||
              (c.slot && this.state.boxes.some((x) => x.slot === c.slot))
            )
              result = {
                accepted: false,
                code: "conflict",
                message: "Estado mudou. Prepare novamente.",
              };
            else {
              b.slot = c.slot;
              result = {
                accepted: true,
                code: "applied",
                message: `${b.id} ${c.action} OK`,
                boxId: b.id,
                slot: b.slot,
              };
              this.state.command = null;
            }
          }
          this.state.lastScan = {
            at: this.now(),
            uid: value,
            boxId: b?.id || null,
            result,
          };
          this.log(result.accepted ? "movimento" : "leitura", result.message, {
            uid: value,
            boxId: b?.id || null,
            slot: result.slot ?? null,
          });
          this.state.receipts.push({ id: scan.eventId, result });
          this.state.receipts = this.state.receipts.slice(-1000);
        }
      }
      return {
        ok: true,
        serverTime: this.now(),
        result,
        command: this.pending(),
      };
    });
  }
}
