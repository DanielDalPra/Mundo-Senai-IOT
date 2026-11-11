// Cliente de teste. Envia eventos pelo mesmo endpoint do ESP32; não lê hardware.
import { randomUUID } from "node:crypto";
const args = process.argv.slice(2),
  get = (name) => args[args.indexOf(name) + 1];
const watch = args.includes("--watch"),
  tag = args.includes("--uid")
    ? get("--uid")
        .toUpperCase()
        .replace(/[\s:-]/g, "")
    : null;
const url =
  (args.includes("--url")
    ? get("--url")
    : `http://127.0.0.1:${process.env.PORT || 3000}`) + "/api/device/report";
let command = null;
const eventId = randomUUID();
async function send(scan = null) {
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: "Bearer " + process.env.DEVICE_TOKEN,
    },
    body: JSON.stringify({
      deviceId: process.env.DEVICE_ID || "esp32-maquete-01",
      telemetry: {
        present: !!tag,
        distanceCm: null,
        color: tag ? "azul" : "indefinida",
        colorCalibrated: true,
        rssi: -40,
        pulses: [120, 140, 80],
        rfidOk: true,
        oledOk: true,
      },
      ...(scan ? { scan } : {}),
    }),
  });
  const result = await res.json();
  if (!res.ok) throw Error(result.error);
  command = result.command;
  return result;
}
try {
  await send();
  if (tag) {
    const result = await send({
      eventId,
      uid: tag,
      commandId: command?.id || null,
    });
    console.log("SIMULAÇÃO:", result.result);
  } else
    console.log(
      "SIMULAÇÃO: dispositivo de teste conectado. Use --uid 04A1B201 para uma leitura.",
    );
  if (watch) {
    console.log("Enviando telemetria simulada a cada 2 s. Ctrl+C encerra.");
    setInterval(() => send().catch((e) => console.error(e.message)), 2000);
  }
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
