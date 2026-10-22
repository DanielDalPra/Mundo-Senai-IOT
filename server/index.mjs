import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { makeServer } from "./app.mjs";
const root = fileURLToPath(new URL("../", import.meta.url));
try {
  const app = makeServer({
    dataDir: resolve(process.env.DATA_DIR || resolve(root, "data")),
    publicDir: resolve(root, "public"),
    adminToken: process.env.ADMIN_TOKEN,
    deviceToken: process.env.DEVICE_TOKEN,
    deviceId: process.env.DEVICE_ID || "esp32-maquete-01",
  });
  const port = Number(process.env.PORT || 3000);
  app.server.listen(port, process.env.HOST || "0.0.0.0", () =>
    console.log(
      `Estoque Inteligente: http://localhost:${port} | use a chave ADMIN_TOKEN do .env`,
    ),
  );
  for (const sig of ["SIGINT", "SIGTERM"])
    process.on(sig, () => {
      app.close();
    });
} catch (e) {
  console.error(e.message);
  process.exit(1);
}
