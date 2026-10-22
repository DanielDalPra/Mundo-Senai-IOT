import { existsSync, writeFileSync, readFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { networkInterfaces } from "node:os";
if (existsSync(".env")) {
  console.log(".env já existe. Configurações preservadas.");
  process.exit(0);
}
const key = () => randomBytes(32).toString("hex");
writeFileSync(
  ".env",
  `HOST=0.0.0.0\nPORT=3000\nADMIN_TOKEN=${key()}\nDEVICE_TOKEN=${key()}\nDEVICE_ID=esp32-maquete-01\nDATA_DIR=./data\n`,
  { mode: 0o600 },
);
console.log("Configuração criada em .env. Não envie esse arquivo ao GitHub.");
console.log(
  "Abra .env: ADMIN_TOKEN é a chave do painel; DEVICE_TOKEN vai no config.h do ESP32.",
);
console.log("Inicie com npm start. Painel: http://localhost:3000");
for (const entries of Object.values(networkInterfaces()))
  for (const n of entries || [])
    if (n.family === "IPv4" && !n.internal)
      console.log(`Endereço possível para o ESP32: http://${n.address}:3000`);
