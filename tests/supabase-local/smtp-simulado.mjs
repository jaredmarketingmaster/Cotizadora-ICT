// =============================================================================
// Servidor SMTP mínimo para las pruebas: acepta todo (sin TLS ni clave) y
// guarda cada correo como JSON en una carpeta, para leer los enlaces de
// invitación y de recuperación de contraseña. Solo para pruebas locales.
//   node smtp-simulado.mjs <puerto> <carpeta>
// =============================================================================
import { createServer } from "node:net";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const [puerto, carpeta] = process.argv.slice(2);
mkdirSync(carpeta, { recursive: true });
let n = 0;

// Decodifica lo justo para leer el correo: encabezados con =?UTF-8?q|b?…?=
// (desplegando las líneas partidas) y cuerpo quoted-printable leído como UTF-8.
function qp(texto) {
  const limpio = texto.replace(/=\r?\n/g, "");
  const bytes = [];
  for (let i = 0; i < limpio.length; i++) {
    if (limpio[i] === "=" && /^[0-9A-F]{2}$/i.test(limpio.slice(i + 1, i + 3))) {
      bytes.push(parseInt(limpio.slice(i + 1, i + 3), 16));
      i += 2;
    } else {
      bytes.push(...Buffer.from(limpio[i], "utf8"));
    }
  }
  return Buffer.from(bytes).toString("utf8");
}
function decodificar(texto) {
  const corte = texto.search(/\r?\n\r?\n/);
  const cabecera = (corte < 0 ? texto : texto.slice(0, corte)).replace(/\r?\n[ \t]+/g, " ")
    .replace(/\?=\s+=\?/g, "?==?") // el espacio entre dos palabras codificadas no cuenta
    .replace(/=\?utf-8\?([qb])\?([^?]*)\?=/gi, (_, tipo, v) =>
      tipo.toLowerCase() === "b" ? Buffer.from(v, "base64").toString("utf8") : qp(v.replace(/_/g, " ")));
  let cuerpo = corte < 0 ? "" : texto.slice(corte).trim();
  if (/content-transfer-encoding:\s*quoted-printable/i.test(cabecera)) cuerpo = qp(cuerpo);
  else if (/content-transfer-encoding:\s*base64/i.test(cabecera)) cuerpo = Buffer.from(cuerpo.replace(/\s+/g, ""), "base64").toString("utf8");
  return `${cabecera}\n\n${cuerpo}`;
}

createServer((s) => {
  let para = [];
  let datos = null;
  let pendiente = "";
  const responder = (l) => s.write(`${l}\r\n`);
  responder("220 smtp-simulado");
  s.on("data", (trozo) => {
    pendiente += trozo.toString("utf8");
    let i;
    while ((i = pendiente.indexOf("\r\n")) >= 0) {
      const linea = pendiente.slice(0, i);
      pendiente = pendiente.slice(i + 2);
      if (datos !== null) {
        if (linea === ".") {
          const crudo = decodificar(datos.join("\n"));
          writeFileSync(join(carpeta, `${String(++n).padStart(3, "0")}.json`), JSON.stringify({ para, crudo }));
          datos = null; para = [];
          responder("250 OK");
        } else {
          datos.push(linea.startsWith("..") ? linea.slice(1) : linea);
        }
        continue;
      }
      const cmd = linea.slice(0, 4).toUpperCase();
      if (cmd === "EHLO" || cmd === "HELO") responder("250 smtp-simulado");
      else if (cmd === "MAIL") responder("250 OK");
      else if (cmd === "RCPT") { para.push(linea.replace(/^RCPT TO:\s*/i, "").replace(/[<>]/g, "")); responder("250 OK"); }
      else if (cmd === "DATA") { datos = []; responder("354 Fin con <CRLF>.<CRLF>"); }
      else if (cmd === "QUIT") { responder("221 Chau"); s.end(); }
      else responder("250 OK");
    }
  });
  s.on("error", () => {});
}).listen(Number(puerto), "127.0.0.1");
