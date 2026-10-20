// =============================================================================
// Verifica que DOCUMENTACION.md cubra todos los archivos del repo: cada archivo
// versionado (y cada archivo nuevo sin ignorar) debe aparecer mencionado entre
// comillas invertidas, ej. `assets/js/utils.js`. Se aceptan también las
// carpetas con comodín usadas en la sección 5, ej. `supabase/correos/*`.
//   node tests/documentacion.mjs
// =============================================================================
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const raiz = join(dirname(fileURLToPath(import.meta.url)), "..");
const doc = readFileSync(join(raiz, "DOCUMENTACION.md"), "utf8");
const mencionados = new Set([...doc.matchAll(/`([^`\s]+)`/g)].map((m) => m[1]));

const archivos = execSync("git ls-files --cached --others --exclude-standard", { cwd: raiz, encoding: "utf8" })
  .split("\n").filter(Boolean)
  .filter((f) => { try { readFileSync(join(raiz, f)); return true; } catch { return false; } }); // sin los borrados

const faltan = archivos.filter((f) => {
  if (mencionados.has(f)) return false;
  // Comodín de carpeta: `carpeta/*`
  const partes = f.split("/");
  for (let i = partes.length - 1; i > 0; i--) {
    if (mencionados.has(`${partes.slice(0, i).join("/")}/*`)) return false;
  }
  return true;
});

if (faltan.length) {
  console.log(`FALLA: ${faltan.length} archivo(s) sin documentar en DOCUMENTACION.md (sección 5):`);
  for (const f of faltan) console.log(`  - ${f}`);
  process.exit(1);
}
console.log(`OK: DOCUMENTACION.md menciona los ${archivos.length} archivos del repo`);
