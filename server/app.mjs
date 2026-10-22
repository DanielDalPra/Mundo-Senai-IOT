import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
import { randomBytes, timingSafeEqual } from "node:crypto";
import { Store, ApiError, assert } from "./store.mjs";
const equal = (a, b) =>
  typeof a === "string" &&
  Buffer.byteLength(a) === Buffer.byteLength(b) &&
  timingSafeEqual(Buffer.from(a), Buffer.from(b));
const mime = {
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".glb": "model/gltf-binary",
  ".txt": "text/plain; charset=utf-8",
};
export function makeServer({
  dataDir,
  publicDir,
  adminToken,
  deviceToken,
  deviceId = "esp32-maquete-01",
  now = () => Date.now(),
}) {
  assert(
    typeof adminToken === "string" && adminToken.length >= 32,
    "ADMIN_TOKEN deve ter pelo menos 32 caracteres.",
    500,
  );
  assert(
    typeof deviceToken === "string" &&
      deviceToken.length >= 32 &&
      !equal(adminToken, deviceToken),
    "DEVICE_TOKEN deve ser forte e diferente da chave do painel.",
    500,
  );
  const store = new Store(dataDir, { now, deviceId }),
    sessions = new Map(),
    attempts = new Map(),
    streams = new Set();
  const base = resolve(publicDir);
  const bearer = (req) =>
    (req.headers.authorization || "").replace(/^Bearer /, "");
  const admin = (req) => {
    if (equal(bearer(req), adminToken)) return true;
    const id = (req.headers.cookie || "")
      .split(";")
      .map((x) => x.trim())
      .find((x) => x.startsWith("session="))
      ?.slice(8);
    return !!id && (sessions.get(id) || 0) > now();
  };
  const json = (res, status, obj) => {
    res.writeHead(status, {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
    });
    res.end(JSON.stringify(obj));
  };
  const broadcast = () => {
    const msg = `data: ${JSON.stringify(store.snapshot())}\n\n`;
    for (const r of streams) {
      if (r.writableLength > 131072) {
        r.end();
        streams.delete(r);
      } else r.write(msg);
    }
  };
  async function body(req) {
    assert(
      (req.headers["content-type"] || "").startsWith("application/json"),
      "Envie JSON.",
      415,
    );
    let size = 0,
      parts = [];
    for await (const c of req) {
      size += c.length;
      assert(size <= 16384, "Corpo muito grande.", 413);
      parts.push(c);
    }
    let data;
    try {
      data = JSON.parse(Buffer.concat(parts).toString());
    } catch {
      throw new ApiError(400, "JSON inválido.");
    }
    assert(
      data && typeof data === "object" && !Array.isArray(data),
      "Objeto JSON obrigatório.",
    );
    return data;
  }
  const server = createServer(async (req, res) => {
    try {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Referrer-Policy", "same-origin");
      res.setHeader("X-Frame-Options", "SAMEORIGIN");
      res.setHeader(
        "Content-Security-Policy",
        "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'; frame-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'self'",
      );
      const path = new URL(req.url, "http://localhost").pathname;
      if (path === "/api/health" && req.method === "GET")
        return json(res, 200, { ok: true });
      if (req.method !== "GET" && req.headers.origin) {
        let origin;
        try {
          origin = new URL(req.headers.origin).host;
        } catch {}
        assert(origin === req.headers.host, "Origem não permitida.", 403);
      }
      if (path === "/api/login" && req.method === "POST") {
        const ip = req.socket.remoteAddress,
          record = attempts.get(ip) || { count: 0, until: now() + 600000 };
        if (record.until <= now()) {
          record.count = 0;
          record.until = now() + 600000;
        }
        assert(
          record.count < 10,
          "Muitas tentativas. Aguarde dez minutos.",
          429,
        );
        const b = await body(req);
        if (!equal(b.token, adminToken)) {
          record.count++;
          attempts.set(ip, record);
          throw new ApiError(401, "Chave inválida.");
        }
        attempts.delete(ip);
        const id = randomBytes(32).toString("hex");
        sessions.set(id, now() + 43200000);
        res.setHeader(
          "Set-Cookie",
          `session=${id}; HttpOnly; SameSite=Strict; Path=/; Max-Age=43200`,
        );
        return json(res, 200, { ok: true });
      }
      if (path === "/api/device/report" && req.method === "POST") {
        assert(
          equal(bearer(req), deviceToken),
          "Chave de dispositivo inválida.",
          401,
        );
        const result = store.report(await body(req));
        broadcast();
        return json(res, 200, result);
      }
      if (path.startsWith("/api/")) {
        assert(admin(req), "Entre com a chave do painel.", 401);
        if (path === "/api/logout" && req.method === "POST") {
          const id = (req.headers.cookie || "").match(
            /(?:^|;\s*)session=([^;]+)/,
          )?.[1];
          sessions.delete(id);
          res.setHeader(
            "Set-Cookie",
            "session=; HttpOnly; SameSite=Strict; Path=/; Max-Age=0",
          );
          return json(res, 200, { ok: true });
        }
        if (path === "/api/state" && req.method === "GET")
          return json(res, 200, store.snapshot());
        if (path === "/api/events" && req.method === "GET") {
          assert(streams.size < 50, "Limite de conexões.", 503);
          res.writeHead(200, {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
          });
          res.write(`data: ${JSON.stringify(store.snapshot())}\n\n`);
          streams.add(res);
          req.on("close", () => streams.delete(res));
          return;
        }
        let result;
        if (path === "/api/tags" && req.method === "POST")
          result = store.register(await body(req));
        else if (path === "/api/command" && req.method === "POST")
          result = store.arm(await body(req));
        else if (path === "/api/command" && req.method === "DELETE")
          result = store.cancel();
        else if (path === "/api/reconcile" && req.method === "POST")
          result = store.reconcile(await body(req));
        else throw new ApiError(404, "Rota não encontrada.");
        broadcast();
        return json(res, 200, result);
      }
      assert(
        req.method === "GET" || req.method === "HEAD",
        "Método não permitido.",
        405,
      );
      let decoded;
      try {
        decoded = decodeURIComponent(path);
      } catch {
        throw new ApiError(400, "Caminho inválido.");
      }
      const target = resolve(
        base,
        "." + (decoded.endsWith("/") ? decoded + "index.html" : decoded),
      );
      assert(target.startsWith(base + sep), "Caminho inválido.", 403);
      let content;
      try {
        content = await readFile(target);
      } catch {
        throw new ApiError(404, "Arquivo não encontrado.");
      }
      res.writeHead(200, {
        "Content-Type": mime[extname(target)] || "application/octet-stream",
        "Cache-Control": "no-cache",
      });
      res.end(req.method === "HEAD" ? undefined : content);
    } catch (e) {
      if (!res.headersSent)
        json(res, e.status || 500, {
          error: e.status
            ? e.message
            : "Falha interna. Consulte o terminal do servidor.",
        });
      else res.end();
      if (!e.status) console.error(e.message);
    }
  });
  server.requestTimeout = 10000;
  server.headersTimeout = 10000;
  const timer = setInterval(() => {
    for (const [id, exp] of sessions) if (exp < now()) sessions.delete(id);
    for (const [ip, v] of attempts) if (v.until < now()) attempts.delete(ip);
    for (const r of streams) r.write(": heartbeat\n\n");
  }, 15000);
  timer.unref();
  server.on("close", () => clearInterval(timer));
  return {
    server,
    store,
    close: () => {
      for (const r of streams) r.end();
      server.close();
    },
  };
}
