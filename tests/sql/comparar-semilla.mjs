// Compara la semilla del SQL (catálogo y equipos demo) con la del adaptador demo.
//   node tests/sql/comparar-semilla.mjs <raíz> <archivo con el JSON del SQL>
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const [raiz, archivo] = process.argv.slice(2);
const sql = JSON.parse(readFileSync(archivo, "utf8"));
const { CATALOGO, COLORES, DEMO_EQUIPOS } = await import(pathToFileURL(`${raiz}/assets/js/datos/semilla.js`));

assert.deepEqual(sql.modelos, CATALOGO, "el catálogo del SQL y el de semilla.js no coinciden");
const colores = CATALOGO.flatMap((m) => (COLORES[m.slug] || []).map(([nombre_es, nombre_en, hex], i) => ({
  slug: m.slug, nombre_es, nombre_en, hex, orden: i + 1, oficial: true, hex_de_fuente: hex !== ""
})));
assert.deepEqual(sql.colores, colores, "los colores del SQL y los de semilla.js no coinciden");
const normal = (e) => ({
  slug: e.slug, condicion: e.condicion, capacidad: e.capacidad, color_nombre: e.color_nombre,
  color_hex: e.color_hex, precio: Number(e.precio), en_stock: e.en_stock, destacado: e.destacado,
  bateria_porcentaje: e.bateria_porcentaje ?? null, estado_estetico: e.estado_estetico ?? null,
  detalles: e.detalles ?? "", incluye: e.incluye ?? ""
});
const orden = (a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b));
assert.deepEqual(sql.demo.map(normal).sort(orden), DEMO_EQUIPOS.map(normal).sort(orden),
  "los equipos demo del SQL y los de semilla.js no coinciden");
console.log(`OK: semilla igual en SQL y JS (${CATALOGO.length} modelos, ${colores.length} colores, ${DEMO_EQUIPOS.length} equipos demo)`);
