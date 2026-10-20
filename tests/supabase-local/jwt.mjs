// Firma un JWT HS256 (anon o service_role) para el entorno local.
//   node jwt.mjs <secreto> <rol>
import { createHmac } from "node:crypto";
const [secreto, rol] = process.argv.slice(2);
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString("base64url");
const cuerpo = `${b64({ alg: "HS256", typ: "JWT" })}.${b64({ iss: "supabase-local", role: rol, iat: 1700000000, exp: 2000000000 })}`;
process.stdout.write(`${cuerpo}.${createHmac("sha256", secreto).update(cuerpo).digest("base64url")}`);
