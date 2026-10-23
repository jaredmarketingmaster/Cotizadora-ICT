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
//       tiendaNueva() del modo demo (assets/js/datos/ejemplo.js, 0037), o si
//       datos_de_ejemplo() no da lo mismo que camposDeEjemplo().
// =============================================================================
import { readFileSync } from "node:fs";

const [modo, a, b] = process.argv.slice(2);
const leer = (ruta) => JSON.parse(readFileSync(ruta, "utf8"));

if (modo === "sql") {
  const { resenas: _r, ejemplo: _e, ...estado } = leer(a);
  // Una fila por línea: el diff de una migración futura se puede leer.
  const lista = (filas) => `[\n${filas.map((f) => JSON.stringify(f)).join(",\n")}\n]`;
  const cuerpo = `{\n"tienda": ${JSON.stringify(estado.tienda)},\n${["modelos", "colores", "fichas", "equipos"]
    .map((k) => `"${k}": ${lista(estado[k])}`).join(",\n")}\n}`;
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
  const { tiendaNueva, camposDeEjemplo } = await import("../../assets/js/datos/ejemplo.js");
  const instalacion = leer(a);
  const { id: _i, actualizado_en: _a, precios_actualizados_en: _p, ...demo } = tiendaNueva(null);
  const diferencias = [];
  // jsonb ordena las claves: se comparan ordenadas.
  const canonico = (v) => JSON.stringify(v, (_k, x) => (x && typeof x === "object" && !Array.isArray(x)
    ? Object.fromEntries(Object.keys(x).sort().map((k) => [k, x[k]])) : x));
  for (const c of new Set([...Object.keys(demo), ...Object.keys(instalacion.tienda)])) {
    if (canonico(demo[c]) !== canonico(instalacion.tienda[c])) diferencias.push(`tienda.${c}: demo ${JSON.stringify(demo[c])} ≠ SQL ${JSON.stringify(instalacion.tienda[c])}`.slice(0, 300));
  }
  if (JSON.stringify(camposDeEjemplo(demo)) !== JSON.stringify(instalacion.ejemplo)) diferencias.push(`ejemplo: demo ${camposDeEjemplo(demo)} ≠ SQL ${instalacion.ejemplo}`);
  if (diferencias.length) {
    console.error(`FALLA: la tienda nueva del SQL y la del modo demo no coinciden\n${diferencias.join("\n")}`);
    process.exit(1);
  }
  console.log(`OK: la tienda nueva del SQL es la del modo demo (${Object.keys(demo).length} campos, ${instalacion.ejemplo.length} datos de ejemplo)`);
} else {
  console.error("Uso: node tests/sql/fabrica.mjs sql <estado.json> | comparar <instalacion.json> <restablecida.json> | demo <instalacion.json>");
  process.exit(2);
}
