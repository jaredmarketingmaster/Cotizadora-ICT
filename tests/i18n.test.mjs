// Diccionarios del sitio y del panel (assets/js/i18n/, ronda 3, B4).
//   node tests/i18n.test.mjs
// - es.js y pt.js tienen las mismas claves, ninguna vacía y las mismas variables.
// - Toda clave escrita en el código (t("…"), tn("…"), data-t*="…") existe.
// - El texto de cada data-t del HTML es igual al del diccionario en español.
// - El español va con "usted"; el portugués, con "você" (sin "tu"/"teu").
// - Los correos de supabase/correos/ y supabase/correos/pt/: las mismas
//   plantillas, con las mismas variables de Supabase y un solo enlace.
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import ES from "../assets/js/i18n/es.js";
import PT from "../assets/js/i18n/pt.js";
import { t, tn, cargarIdioma } from "../assets/js/i18n/i18n.js";

await cargarIdioma("pt");
await cargarIdioma("es");

const RAIZ = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
let casos = 0;
function caso(nombre, fn) { fn(); casos++; console.log(`ok   ${nombre}`); }

const variables = (s) => [...String(s).matchAll(/\{(\w+)\}/g)].map((m) => m[1]).sort();

function archivos(dir, ext) {
  return fs.readdirSync(path.join(RAIZ, dir), { withFileTypes: true }).flatMap((d) => {
    const r = `${dir}/${d.name}`;
    if (d.isDirectory()) return archivos(r, ext);
    return ext.some((e) => d.name.endsWith(e)) ? [r] : [];
  });
}
const HTML = ["index.html", "admin/index.html", "privacidad/index.html", "terminos/index.html", "cookies/index.html"];
const JS = archivos("assets/js", [".js"]).filter((f) => !f.startsWith("assets/js/i18n/"));

caso("es.js y pt.js: mismas claves, ninguna vacía y las mismas variables", () => {
  assert.deepEqual(Object.keys(PT).sort(), Object.keys(ES).sort(), "las claves no coinciden");
  for (const [k, v] of Object.entries(ES)) {
    assert.equal(typeof v, "string", k);
    assert.ok(v.trim(), `vacía en es: ${k}`);
    assert.ok(String(PT[k]).trim(), `vacía en pt: ${k}`);
    assert.deepEqual(variables(PT[k]), variables(v), `variables distintas: ${k}`);
  }
  assert.ok(Object.keys(ES).length > 300, "el diccionario parece incompleto");
});

caso("toda clave escrita en el código existe en los diccionarios", () => {
  const faltan = new Set();
  for (const f of [...JS, ...HTML]) {
    const s = fs.readFileSync(path.join(RAIZ, f), "utf8");
    for (const m of s.matchAll(/(?<![\w.$])(t|tr|t_|tn)\(\s*["'`]([a-z0-9_.-]+)["'`]/g)) {
      const claves = m[1] === "tn" ? [`${m[2]}.uno`, `${m[2]}.varios`] : [m[2]];
      for (const c of claves) if (!(c in ES)) faltan.add(`${f}: ${c}`);
    }
    for (const m of s.matchAll(/data-t(?:-[a-z-]+)?="([a-z0-9_.-]+)"/g)) if (!(m[1] in ES)) faltan.add(`${f}: ${m[1]}`);
  }
  assert.deepEqual([...faltan], []);
});

caso("el HTML trae el mismo texto que el diccionario en español", () => {
  const malos = [];
  for (const f of HTML) {
    const s = fs.readFileSync(path.join(RAIZ, f), "utf8");
    for (const m of s.matchAll(/<(\w+)([^>]*?)\sdata-t="([a-z0-9_.-]+)"([^>]*)>([^<]*)<\/\1>/g)) {
      const texto = m[5].replace(/\s+/g, " ").trim();
      const esperado = ES[m[3]].replace(/\s+/g, " ").trim();
      if (texto !== esperado) malos.push(`${f}: ${m[3]}: «${texto}» ≠ «${esperado}»`);
    }
    for (const m of s.matchAll(/\s([a-z-]+)="([^"]*)"[^>]*?\sdata-t-\1="([a-z0-9_.-]+)"/g)) {
      if (m[2] !== ES[m[3]]) malos.push(`${f}: ${m[3]} (${m[1]}): «${m[2]}» ≠ «${ES[m[3]]}»`);
    }
  }
  assert.deepEqual(malos, []);
});

caso("español con usted y portugués con você", () => {
  const es = Object.values(ES).join("\n");
  const tuteo = es.match(/\b(tú|vos|tienes|puedes|quieres|tu pedido|tus datos|tu nombre|tu correo|tu whatsapp)\b|(^|[>"'.!?]\s*)(Elige|Escribe|Toca|Revisa|Acepta|Ingresa|Llena)\b/im);
  assert.ok(!tuteo, `tuteo en es.js: ${tuteo?.[0]}`);
  const pt = Object.values(PT).join("\n");
  const tu = pt.match(/\b(tu|teu|tua|teus|tuas|vosso|vossa)\b/i);
  assert.ok(!tu, `"tu" en pt.js: ${tu?.[0]}`);
  assert.ok(/\bvocê\b/i.test(pt), "pt.js trata de você");
});

caso("correos: las plantillas en portugués son las mismas que en español, con las mismas variables, y tratan de você", () => {
  const plantillas = (dir) => fs.readdirSync(path.join(RAIZ, dir)).filter((f) => f.endsWith(".html")).sort();
  const es = plantillas("supabase/correos");
  assert.deepEqual(plantillas("supabase/correos/pt"), es);
  assert.ok(es.length >= 2, "faltan las plantillas en español");
  const variablesGo = (s) => [...s.matchAll(/\{\{\s*\.(\w+)\s*\}\}/g)].map((m) => m[1]).sort();
  for (const f of es) {
    const a = fs.readFileSync(path.join(RAIZ, "supabase/correos", f), "utf8");
    const b = fs.readFileSync(path.join(RAIZ, "supabase/correos/pt", f), "utf8");
    assert.deepEqual(variablesGo(b), variablesGo(a), `variables distintas: ${f}`);
    assert.equal((b.match(/<a href="\{\{ \.ConfirmationURL \}\}">/g) || []).length, 1, `un enlace: pt/${f}`);
    assert.ok(/\busted\b/i.test(a) && !/\b(tú|vos|tienes|puedes)\b/i.test(a), `usted: ${f}`);
    assert.ok(/\bvocê(?!\p{L})/iu.test(b) && !/\b(tu|teu|tua)\b/i.test(b), `você: pt/${f}`);
  }
});

caso("t() reemplaza variables, tn() elige uno o varios, y una clave que falta se devuelve tal cual", () => {
  const k = Object.keys(ES).find((x) => variables(ES[x]).length);
  const vars = Object.fromEntries(variables(ES[k]).map((v) => [v, "X"]));
  assert.ok(!/\{\w+\}/.test(t(k, vars)), "quedan variables");
  assert.equal(t(k, vars, "pt").includes("X"), true);
  const plural = Object.keys(ES).find((x) => x.endsWith(".uno") && `${x.slice(0, -4)}.varios` in ES);
  if (plural) {
    const base = plural.slice(0, -4);
    assert.equal(tn(base, 1), t(`${base}.uno`, { n: 1 }));
    assert.equal(tn(base, 3), t(`${base}.varios`, { n: 3 }));
  }
  const error = console.error; console.error = () => {};
  try { assert.equal(t("no.existe"), "no.existe"); } finally { console.error = error; }
});

console.log(`\nOK: ${casos} casos de los diccionarios (${Object.keys(ES).length} claves)`);
