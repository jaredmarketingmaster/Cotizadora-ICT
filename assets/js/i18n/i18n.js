// =============================================================================
// Idioma del sitio y del panel (tienda.idioma, ronda 3): español ("es", por
// defecto, trato de "usted") o portugués de Brasil ("pt", "você").
//
// - Todo el texto visible sale de los diccionarios es.js y pt.js (mismas
//   claves; tests/i18n.test.mjs lo revisa). Nada de texto suelto en el código.
// - t(clave, variables, idioma): el texto en el idioma en uso. Las variables
//   van entre llaves: t("sitio.contador", { n: 3 }) con "{n} equipos".
//   Una clave que no existe se avisa en la consola (la suite falla con eso).
// - es.js se carga siempre; pt.js solo si la tienda está en portugués.
// - El HTML trae el texto en español con data-t="clave" (y data-t-<atributo>
//   para aria-label, placeholder, content, title y alt); traducirDom() lo
//   cambia. Así, sin JS se ve en español y el primer pintado no espera.
// - Primer pintado: el script en línea del <head> del sitio y de las páginas
//   legales lee el idioma guardado (cotizadora:idioma). Si es "pt", pone
//   lang="pt-BR", marca <html data-traduciendo>, que oculta los textos con
//   data-t (sitio.css) hasta el primer traducirDom() (o 3 s, si el JS no
//   llega), y carga primer-pintado.js, que traduce sin esperar al resto del
//   sitio. Así el primer pintado ya sale en portugués.
// - Los textos legales generados (plantillas) siguen en español: todavía no
//   hay módulo legal en portugués.
// =============================================================================

import ES from "./es.js";

export const IDIOMAS = {
  es: { lang: "es-CO" },
  pt: { lang: "pt-BR" }
};
export const CODIGOS_IDIOMA = Object.keys(IDIOMAS);
export const IDIOMA_POR_DEFECTO = "es";
const GUARDADO = "cotizadora:idioma";

const diccionarios = { es: ES };
let actual = "es";

export const idiomaActual = () => actual;

// Carga el diccionario (pt.js, la primera vez) y lo deja en uso.
export async function cargarIdioma(codigo) {
  const c = IDIOMAS[codigo] ? codigo : IDIOMA_POR_DEFECTO;
  if (!diccionarios[c]) diccionarios[c] = (await import(`./${c}.js`)).default;
  actual = c;
  if (typeof document !== "undefined") document.documentElement.lang = IDIOMAS[c].lang;
  try { localStorage.setItem(GUARDADO, c); } catch { /* sin almacenamiento */ }
  return c;
}

// El idioma de la visita anterior (para el acceso al panel, antes de leer la tienda).
export function idiomaGuardado() {
  try { const c = localStorage.getItem(GUARDADO); return IDIOMAS[c] ? c : IDIOMA_POR_DEFECTO; } catch { return IDIOMA_POR_DEFECTO; }
}

export function t(clave, variables, idioma = actual) {
  const texto = (diccionarios[idioma] || ES)[clave];
  if (texto == null) {
    console.error(`i18n: falta la clave «${clave}» (${idioma})`);
    return clave;
  }
  if (!variables) return texto;
  return texto.replace(/\{(\w+)\}/g, (m, k) => (k in variables ? String(variables[k]) : m));
}

// Texto con número: "{n} equipo" / "{n} equipos" (claves <clave>.uno y <clave>.varios).
export const tn = (clave, n, variables = {}) => t(`${clave}.${n === 1 ? "uno" : "varios"}`, { n, ...variables });

const ATRIBUTOS = ["aria-label", "placeholder", "content", "title", "alt"];
export function traducirDom(raiz = document) {
  for (const el of raiz.querySelectorAll("[data-t]")) el.textContent = t(el.dataset.t);
  for (const a of ATRIBUTOS) {
    for (const el of raiz.querySelectorAll(`[data-t-${a}]`)) el.setAttribute(a, t(el.getAttribute(`data-t-${a}`)));
  }
  if (raiz === document) document.documentElement.removeAttribute("data-traduciendo");
}
