// Webhook de GHL simulado: guarda el último cuerpo recibido y responde con el
// estado que diga ESTADO (200 por defecto).
import { createServer } from "node:http";
import { writeFileSync } from "node:fs";
const [puerto, archivo] = process.argv.slice(2);
createServer((req, res) => {
  let cuerpo = "";
  req.on("data", (c) => { cuerpo += c; });
  req.on("end", () => {
    writeFileSync(archivo, cuerpo);
    res.writeHead(Number(process.env.ESTADO || 200)).end("{}");
  });
}).listen(Number(puerto), "127.0.0.1");
