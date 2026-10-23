// Compara whatsapp_valido() del SQL (0018 y 0033) con whatsappValido() de
// assets/js/datos/paises.js, con números válidos e inválidos de los 19 países.
//   node tests/sql/comparar-paises.mjs sql <raíz>              → imprime el SQL
//   node tests/sql/comparar-paises.mjs comparar <raíz> <json>  → compara
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const [modo, raiz, archivo] = process.argv.slice(2);
const { PAISES_TIENDA, whatsappValido, datosPais } = await import(pathToFileURL(`${raiz}/assets/js/datos/paises.js`));

const CASOS = [];
for (const codigo of Object.keys(PAISES_TIENDA)) {
  const c = datosPais(codigo).celular;
  const ejemplo = (c.ejemplo || "").replace(/\s/g, "") || "12345678";
  for (const n of [
    c.internacional + ejemplo, c.internacional + ejemplo + "1", c.internacional + ejemplo.slice(1),
    c.internacional, c.internacional + "1", "57" + "3001234567", "549" + "1123456789", "55" + "11912345678",
    "52" + "5512345678", "56" + "912345678", "51" + "912345678", "1" + "8095551234", "999999999999999", "12", "",
    // 0033: fijos de la tienda (prefijo + número), el 0 troncal y los celulares nuevos.
    PAISES_TIENDA[codigo].prefijo + "21234567", PAISES_TIENDA[codigo].prefijo + "021234567", PAISES_TIENDA[codigo].prefijo + "2123456789012",
    "50371234567", "50322123456", "59171234567", "50683123456", "593991234567", "5930991234567", "541143214321"
  ]) CASOS.push([codigo, n]);
}

if (modo === "sql") {
  const filas = CASOS.map(([p, n], i) => `select ${i} as i, public.whatsapp_valido('${p}', '${n}') as v`);
  console.log(`select json_agg(coalesce(v, false) order by i) from (${filas.join("\nunion all\n")}) x;`);
} else {
  const sql = JSON.parse(readFileSync(archivo, "utf8"));
  CASOS.forEach(([p, n], i) => assert.equal(sql[i], whatsappValido(n, p), `${p} ${n}: SQL ${sql[i]}`));
  console.log(`OK: whatsapp_valido() del SQL igual a whatsappValido() de paises.js (${CASOS.length} casos, 19 países)`);
}
