// =============================================================================
// Datos de fábrica (0036, restablecer_fabrica).
//
//   ICT_FABRICA=/tmp/instalacion.json bash tests/sql/probar.sh
//   node tests/sql/fabrica.mjs sql /tmp/instalacion.json
//       Escribe la función datos_fabrica() con el estado de una instalación
//       nueva (la salida de estado_fabrica.sql en una base recién migrada;
//       probar.sh la guarda con ICT_FABRICA aunque después falle).
//       Una migración que cambie la semilla o los valores iniciales de la
//       tienda debe volver a crear datos_fabrica() con esta salida.
//   node tests/sql/fabrica.mjs comparar <instalacion.json> <restablecida.json>
//       Falla si la base restablecida no quedó igual a la instalación nueva.
//   node tests/sql/fabrica.mjs demo <instalacion.json>
//       Falla si la tienda de la instalación nueva del SQL no es la de
//       tiendaNueva() del modo demo (assets/js/datos/ejemplo.js, 0037 y 0041),
//       si datos_de_ejemplo() no da lo mismo que camposDeEjemplo() o si los
//       equipos no son los de la vitrina (equiposVitrina(), vitrina.js).
//   node tests/sql/fabrica.mjs basica <instalacion.json> <basica.json>
//       Falla si restablecer_fabrica('basica') (0041) no dejó la tienda de
//       tiendaNueva(fecha, { modo: "basica" }), los 6 equipos de DEMO_EQUIPOS
//       con sus modelos activos y el resto del catálogo como la instalación.
// =============================================================================
import { readFileSync } from "node:fs";
import { DEMO_EQUIPOS } from "../../assets/js/datos/semilla.js";
import { TIENDA_VITRINA, tiendaNueva, camposDeEjemplo } from "../../assets/js/datos/ejemplo.js";
import { equiposVitrina } from "../../assets/js/datos/vitrina.js";

const [modo, a, b] = process.argv.slice(2);
const leer = (ruta) => JSON.parse(readFileSync(ruta, "utf8"));

// jsonb ordena las claves: se comparan ordenadas.
const canonico = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x)
  ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x));
// Sin lo que estado_fabrica.sql no guarda (cambia en cada instalación).
const sinFechas = ({ id: _i, actualizado_en: _a, precios_actualizados_en: _p, usd_actualizado_en: _u, ...t }) => t;
function compararTienda(demo, sql) {
  const d = [];
  for (const c of new Set([...Object.keys(demo), ...Object.keys(sql)])) {
    if (canonico(demo[c]) !== canonico(sql[c])) d.push(`tienda.${c}: demo ${JSON.stringify(demo[c])} ≠ SQL ${JSON.stringify(sql[c])}`.slice(0, 300));
  }
  return d;
}
// Los equipos del SQL (con ids) contra los de JS (por modelo y color).
function compararEquipos(esperados, estado, equipos) {
  const slug = new Map(estado.modelos.map((m) => [m.id, m.slug]));
  const color = new Map(estado.colores.map((c) => [c.id, c.nombre_es]));
  const campos = ["condicion", "capacidad", "color_nombre_mostrar", "precio", "en_stock", "destacado", "mas_vendido", "promo_descuento",
    "contar_stock", "stock_cantidad", "fotos", "bateria_porcentaje", "estado_estetico", "detalles", "incluye"];
  const valores = { mas_vendido: false, promo_descuento: null, contar_stock: false, stock_cantidad: null, fotos: [], bateria_porcentaje: null, estado_estetico: null, detalles: "", incluye: "" };
  const fila = (q) => canonico({ slug: q.slug, color: q.color, ...Object.fromEntries(campos.map((k) => [k, q[k] ?? valores[k] ?? null])) });
  const sql = equipos.filter((q) => q.es_demo && q.publicado).map((q) => fila({ ...q, slug: slug.get(q.modelo_id), color: color.get(q.color_id) })).sort();
  const js = esperados.map(fila).sort();
  if (equipos.some((q) => !q.es_demo || !q.publicado)) return ["equipos: hay equipos que no son de demostración"];
  if (sql.length !== js.length) return [`equipos: ${sql.length} en el SQL y ${js.length} en JS`];
  const i = sql.findIndex((x, j) => x !== js[j]);
  return i < 0 ? [] : [`equipos: primero distinto\n  SQL ${sql[i].slice(0, 300)}\n  JS  ${js[i].slice(0, 300)}`];
}

if (modo === "sql") {
  const { resenas: _r, ejemplo: _e, ...estado } = leer(a);
  // Una fila por línea: el diff de una migración futura se puede leer.
  const lista = (filas) => `[\n${filas.map((f) => JSON.stringify(f)).join(",\n")}\n]`;
  // El modo básico (0041): sin los campos de la vitrina y con los 6 equipos de
  // demostración, por modelo y color (los resuelve restablecer_fabrica).
  const basica = { tienda_sin: Object.keys(TIENDA_VITRINA), equipos: DEMO_EQUIPOS };
  const cuerpo = `{\n"tienda": ${JSON.stringify(estado.tienda)},\n${["modelos", "colores", "fichas", "equipos"]
    .map((k) => `"${k}": ${lista(estado[k])}`).join(",\n")},\n"basica": {"tienda_sin": ${JSON.stringify(basica.tienda_sin)},\n"equipos": ${lista(basica.equipos)}}\n}`;
  if (cuerpo.includes("$fabrica$")) throw new Error("los datos no pueden contener $fabrica$");
  process.stdout.write(`create or replace function public.datos_fabrica()
returns jsonb language sql immutable set search_path = public as $f$
select $fabrica$${cuerpo}$fabrica$::jsonb
$f$;
`);
} else if (modo === "comparar") {
  const [instalacion, restablecida] = [leer(a), leer(b)];
  const diferencias = [];
  for (const k of Object.keys(instalacion)) {
    const [x, y] = [instalacion[k], restablecida[k]];
    if (JSON.stringify(x) === JSON.stringify(y)) continue;
    if (Array.isArray(x) && Array.isArray(y)) {
      diferencias.push(`${k}: ${x.length} filas en la instalación y ${y.length} en la restablecida`);
      const i = x.findIndex((f, j) => JSON.stringify(f) !== JSON.stringify(y[j]));
      if (i >= 0) diferencias.push(`  primera distinta (${i}): ${JSON.stringify(x[i]).slice(0, 300)}\n  ≠ ${JSON.stringify(y[i]).slice(0, 300)}`);
    } else if (x && y && typeof x === "object") {
      for (const c of new Set([...Object.keys(x), ...Object.keys(y)])) {
        if (JSON.stringify(x[c]) !== JSON.stringify(y[c])) diferencias.push(`${k}.${c}: ${JSON.stringify(x[c])} ≠ ${JSON.stringify(y[c])}`);
      }
    } else diferencias.push(`${k}: ${JSON.stringify(x)} ≠ ${JSON.stringify(y)}`);
  }
  if (diferencias.length) {
    console.error(`FALLA: restablecer_fabrica() no deja la base como una instalación nueva\n${diferencias.join("\n")}`);
    process.exit(1);
  }
  console.log("OK: restablecer_fabrica() deja la base como una instalación nueva");
} else if (modo === "demo") {
  const instalacion = leer(a);
  const demo = sinFechas(tiendaNueva(null));
  const diferencias = compararTienda(demo, instalacion.tienda);
  if (JSON.stringify(camposDeEjemplo(demo)) !== JSON.stringify(instalacion.ejemplo)) diferencias.push(`ejemplo: demo ${camposDeEjemplo(demo)} ≠ SQL ${instalacion.ejemplo}`);
  if (!instalacion.usd_con_fecha) diferencias.push("tienda.usd_actualizado_en: la cotización no tiene fecha");
  diferencias.push(...compararEquipos(equiposVitrina(), instalacion, instalacion.equipos));
  if (diferencias.length) {
    console.error(`FALLA: la tienda nueva del SQL y la del modo demo no coinciden\n${diferencias.join("\n")}`);
    process.exit(1);
  }
  console.log(`OK: la tienda nueva del SQL es la del modo demo (${Object.keys(demo).length} campos, ${instalacion.ejemplo.length} datos de ejemplo, ${instalacion.equipos.length} equipos de la vitrina)`);
} else if (modo === "basica") {
  const [instalacion, basica] = [leer(a), leer(b)];
  const demo = sinFechas(tiendaNueva(null, { modo: "basica" }));
  const diferencias = compararTienda(demo, basica.tienda);
  if (!basica.usd_con_fecha) diferencias.push("tienda.usd_actualizado_en: con fecha y sin cotización");
  diferencias.push(...compararEquipos(DEMO_EQUIPOS, basica, basica.equipos));
  const activos = new Set(DEMO_EQUIPOS.map((d) => d.slug));
  const modelosEsperados = instalacion.modelos.map((m) => ({ ...m, activo: activos.has(m.slug), activo_por_demo: activos.has(m.slug) }));
  if (JSON.stringify(modelosEsperados) !== JSON.stringify(basica.modelos)) diferencias.push("modelos: los activos no son los de los equipos de demostración");
  for (const k of ["colores", "fichas", "resenas"]) {
    if (JSON.stringify(instalacion[k]) !== JSON.stringify(basica[k])) diferencias.push(`${k}: distinto de la instalación nueva`);
  }
  if (diferencias.length) {
    console.error(`FALLA: restablecer_fabrica('basica') no deja la tienda básica\n${diferencias.join("\n")}`);
    process.exit(1);
  }
  console.log(`OK: restablecer_fabrica('basica') deja la tienda de ejemplo con los ${DEMO_EQUIPOS.length} equipos de demostración`);
} else {
  console.error("Uso: node tests/sql/fabrica.mjs sql <estado.json> | comparar <instalacion.json> <restablecida.json> | demo <instalacion.json> | basica <instalacion.json> <basica.json>");
  process.exit(2);
}
