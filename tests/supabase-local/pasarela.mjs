// =============================================================================
// Pasarela local que imita la API de Supabase para las pruebas:
//   /rest/v1/*       → PostgREST
//   /auth/v1/*       → servidor de auth de Supabase (GoTrue)
//   /functions/v1/x  → la función x de Deno en su puerto
//   /storage/v1/*    → Storage SIMULADO en memoria (subir, leer público, borrar)
//   /verify          → auth (el GoTrue local arma así los enlaces de los correos)
//   /plantillas/*    → supabase/correos/*.html (plantillas de correo para auth)
// Como en Supabase, si no viene Authorization se usa la apikey.
// Solo para pruebas locales.
// =============================================================================
import { createServer, request } from "node:http";
import { readFileSync } from "node:fs";

//   node pasarela.mjs <puerto> <rest> <auth> "enviar-lead=9100,usuarios=9102"
const [puerto, rest, auth] = process.argv.slice(2, 5).map(Number);
const funciones = Object.fromEntries((process.argv[5] || "").split(",").filter(Boolean)
  .map((par) => par.split("=")).map(([nombre, p]) => [nombre, Number(p)]));
const archivos = new Map();

function cors(res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Headers", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,PATCH,PUT,DELETE,OPTIONS");
  res.setHeader("Access-Control-Expose-Headers", "*");
}

function reenviar(req, res, destino, ruta) {
  const headers = { ...req.headers, host: `127.0.0.1:${destino}` };
  if (!headers.authorization && headers.apikey) headers.authorization = `Bearer ${headers.apikey}`;
  const p = request({ host: "127.0.0.1", port: destino, path: ruta, method: req.method, headers }, (r) => {
    cors(res);
    const h = { ...r.headers };
    delete h["access-control-allow-origin"];
    res.writeHead(r.statusCode, h);
    r.pipe(res);
  });
  p.on("error", () => { cors(res); res.writeHead(502).end("pasarela: destino caído"); });
  req.pipe(p);
}

createServer((req, res) => {
  const url = new URL(req.url, "http://x");
  if (req.method === "OPTIONS") { cors(res); res.writeHead(204).end(); return; }
  if (url.pathname.startsWith("/rest/v1")) return reenviar(req, res, rest, req.url.replace("/rest/v1", "") || "/");
  if (url.pathname.startsWith("/auth/v1")) return reenviar(req, res, auth, req.url.replace("/auth/v1", ""));
  if (url.pathname === "/verify") return reenviar(req, res, auth, req.url);
  if (url.pathname.startsWith("/plantillas/")) {
    try {
      const nombre = url.pathname.split("/").pop().replace(/[^a-z0-9.-]/gi, "");
      const html = readFileSync(new URL(`../../supabase/correos/${nombre}`, import.meta.url));
      res.writeHead(200, { "content-type": "text/html; charset=utf-8" }).end(html);
    } catch { res.writeHead(404).end(); }
    return;
  }
  if (url.pathname.startsWith("/functions/v1/")) {
    const destino = funciones[url.pathname.split("/")[3]];
    if (!destino) { cors(res); res.writeHead(404).end("función desconocida"); return; }
    return reenviar(req, res, destino, "/");
  }
  if (url.pathname.startsWith("/storage/v1/")) {
    cors(res);
    const m = url.pathname.match(/^\/storage\/v1\/object\/(public\/)?([^/]+)\/?(.*)$/);
    if (!m) { res.writeHead(404).end(); return; }
    const [, publico, bucket, ruta] = m;
    const clave = `${bucket}/${decodeURIComponent(ruta)}`;
    if (req.method === "GET" && publico) {
      const a = archivos.get(clave);
      if (!a) { res.writeHead(404).end(); return; }
      res.writeHead(200, { "content-type": a.tipo }).end(a.datos);
      return;
    }
    if (req.method === "POST" || req.method === "PUT") {
      const partes = [];
      req.on("data", (c) => partes.push(c));
      req.on("end", () => {
        archivos.set(clave, { tipo: req.headers["content-type"] || "application/octet-stream", datos: Buffer.concat(partes) });
        res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify({ Key: clave }));
      });
      return;
    }
    if (req.method === "DELETE") {
      let cuerpo = "";
      req.on("data", (c) => { cuerpo += c; });
      req.on("end", () => {
        const { prefixes = [] } = JSON.parse(cuerpo || "{}");
        for (const p of prefixes) archivos.delete(`${bucket}/${p}`);
        res.writeHead(200, { "content-type": "application/json" }).end("[]");
      });
      return;
    }
  }
  cors(res);
  res.writeHead(404).end();
}).listen(puerto, "127.0.0.1");
