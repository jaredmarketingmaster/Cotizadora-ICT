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
// =============================================================================
import { readFileSync } from "node:fs";

const [modo, a, b] = process.argv.slice(2);
const leer = (ruta) => JSON.parse(readFileSync(ruta, "utf8"));

if (modo === "sql") {
  const { resenas: _r, ...estado } = leer(a);
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
} else {
  console.error("Uso: node tests/sql/fabrica.mjs sql <estado.json> | comparar <instalacion.json> <restablecida.json>");
  process.exit(2);
}
