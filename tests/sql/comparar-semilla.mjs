// Compara la semilla del SQL (catálogo y equipos demo) con la del adaptador demo.
//   node tests/sql/comparar-semilla.mjs <raíz> <archivo con el JSON del SQL>
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const [raiz, archivo] = process.argv.slice(2);
const sql = JSON.parse(readFileSync(archivo, "utf8"));
const { CATALOGO, COLORES, DEMO_EQUIPOS, HEX_APROXIMADOS, filasDeFuente } = await import(pathToFileURL(`${raiz}/assets/js/datos/semilla.js`));

assert.deepEqual(sql.modelos, CATALOGO, "el catálogo del SQL y el de semilla.js no coinciden");
// Con el hexadecimal aproximado de 0022 donde la fuente no lo trae.
const colores = CATALOGO.flatMap((m) => (COLORES[m.slug] || []).map(([nombre_es, nombre_en, hex], i) => ({
  slug: m.slug, nombre_es, nombre_en, hex: hex || HEX_APROXIMADOS[nombre_es] || "", orden: i + 1, oficial: true, hex_de_fuente: hex !== "",
  hex_aproximado: !hex && Boolean(HEX_APROXIMADOS[nombre_es])
})));
assert.deepEqual(sql.colores, colores, "los colores del SQL y los de semilla.js no coinciden");
const normal = (e) => ({
  slug: e.slug, condicion: e.condicion, capacidad: e.capacidad, color: e.color,
  color_nombre_mostrar: e.color_nombre_mostrar, precio: Number(e.precio), en_stock: e.en_stock, destacado: e.destacado,
  bateria_porcentaje: e.bateria_porcentaje ?? null, estado_estetico: e.estado_estetico ?? null,
  detalles: e.detalles ?? "", incluye: e.incluye ?? ""
});
const orden = (a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b));
assert.deepEqual(sql.demo.map(normal).sort(orden), DEMO_EQUIPOS.map(normal).sort(orden),
  "los equipos demo del SQL y los de semilla.js no coinciden");
// Fichas técnicas precargadas (0012): mismas filas, mismo orden y mismos textos.
const fichas = Object.fromEntries(CATALOGO.filter((m) => m.slug !== "iphone-13").map((m) => [m.slug, filasDeFuente(m.slug)]));
assert.deepEqual(sql.fichas, fichas, "las fichas del SQL y las de semilla.js no coinciden");
const nFilas = Object.values(fichas).reduce((n, f) => n + f.length, 0);
// Legales (0016): los valores iniciales del SQL, iguales a LEGAL_INICIAL
// (comun.js), salvo las cláusulas, que traen lo que la tienda había escrito
// (antes_0015 y antes_0016).
const { LEGAL_INICIAL } = await import(pathToFileURL(`${raiz}/assets/js/datos/comun.js`));
const clausulas = { legal_clausula_terminos: "Términos que ya escribió la tienda.\n\nAviso de marca propio." };
const legales = Object.fromEntries(Object.keys(LEGAL_INICIAL).map((k) => [k, sql.legales[k]]));
assert.deepEqual(legales, { ...LEGAL_INICIAL, ...clausulas }, "los valores legales iniciales del SQL y LEGAL_INICIAL no coinciden");
console.log(`OK: semilla igual en SQL y JS (${CATALOGO.length} modelos, ${colores.length} colores, ${DEMO_EQUIPOS.length} equipos demo, ${nFilas} filas de fichas y valores legales)`);
