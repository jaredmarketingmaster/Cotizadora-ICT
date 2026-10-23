// =============================================================================
// Consentimiento de cookies: el ÚNICO módulo que decide qué herramientas de
// medición y publicidad se cargan (los ID salen de la tienda, paso 5 de
// Legales; nunca del código).
// - Nada se carga antes de que la persona acepte la categoría de cada
//   herramienta (assets/js/legal/herramientas.js). Rechazar = no se carga nada.
// - Google: Consent Mode v2 básico (todo "denied" por defecto y el script solo
//   después de aceptar). Clarity: consentv2. Meta: consent revoke al retirar.
// - Global Privacy Control (navigator.globalPrivacyControl) = publicidad
//   rechazada, sin poder encenderla.
// - La elección se guarda 6 meses en este navegador (localStorage). Se cambia
//   desde "Preferencias de cookies" (pie). Al retirar una categoría, desde ese
//   momento no se carga ni se envía nada de ella y se borran sus cookies.
// - Banner: no tapa el título ni los filtros (si en la pantalla no hay lugar,
//   espera a que la persona baje); tres botones iguales; región accesible.
// =============================================================================

import { HERRAMIENTAS, activas, esPixelDeEjemplo } from "../legal/herramientas.js";
import { iniciarPixel, retirarPixel } from "./pixel.js";
import { escaparHTML } from "../utils.js";
import { t } from "../i18n/i18n.js";

const CLAVE = "cotizadora:cookies";
const SEIS_MESES = 183 * 24 * 3600 * 1000;
// Los textos (nombre y explicación) salen del diccionario al dibujar el banner:
// cookies.categoria.<clave> y cookies.categoria.<clave>.texto.
const CATEGORIAS = [{ clave: "medicion" }, { clave: "publicidad" }];
// Cookies propias de cada categoría, para borrarlas al retirar el permiso.
const COOKIES = { medicion: /^(_ga|_ga_.+|_clck|_clsk)$/, publicidad: /^(_fbp|_fbc|_gcl_.+|_ttp)$/ };

let tienda = null;
let eleccion = null;
let cargadas = new Set();
const oyentes = new Set();
let banner = null;
let origenFoco = null;

export const gpc = () => typeof navigator !== "undefined" && navigator.globalPrivacyControl === true;

function leer() {
  try {
    const e = JSON.parse(localStorage.getItem(CLAVE));
    if (e && typeof e.medicion === "boolean" && typeof e.publicidad === "boolean" && Date.now() - Date.parse(e.fecha) < SEIS_MESES) {
      return { ...e, publicidad: e.publicidad && !gpc() };
    }
  } catch { /* sin almacenamiento: se pregunta */ }
  return null;
}

function guardar(e) {
  eleccion = { medicion: Boolean(e.medicion), publicidad: Boolean(e.publicidad) && !gpc(), fecha: new Date().toISOString() };
  try { localStorage.setItem(CLAVE, JSON.stringify(eleccion)); } catch { /* vale solo para esta visita */ }
  aplicar();
  for (const fn of oyentes) fn(estado());
}

// Lo que va en el lead: lo que eligió la persona (sin elegir = no).
export function estado() {
  return { elegido: Boolean(eleccion), medicion: Boolean(eleccion?.medicion), publicidad: Boolean(eleccion?.publicidad), fecha: eleccion?.fecha || "" };
}
export const permitido = (categoria) => Boolean(eleccion?.[categoria]);
export function alCambiar(fn) { oyentes.add(fn); return () => oyentes.delete(fn); }

// --- Cargadores ------------------------------------------------------------------
function script(src) {
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  document.head.appendChild(s);
}

function gtag() { window.dataLayer = window.dataLayer || []; window.dataLayer.push(arguments); }
function consentimientoGoogle() {
  return {
    analytics_storage: permitido("medicion") ? "granted" : "denied",
    ad_storage: permitido("publicidad") ? "granted" : "denied",
    ad_user_data: permitido("publicidad") ? "granted" : "denied",
    ad_personalization: permitido("publicidad") ? "granted" : "denied"
  };
}
let googleIniciado = false;
function iniciarGoogle() {
  if (googleIniciado) { gtag("consent", "update", consentimientoGoogle()); return; }
  googleIniciado = true;
  window.gtag = window.gtag || gtag;
  gtag("consent", "default", { analytics_storage: "denied", ad_storage: "denied", ad_user_data: "denied", ad_personalization: "denied" });
  gtag("consent", "update", consentimientoGoogle());
  gtag("js", new Date());
}

const CARGAR = {
  meta: (id) => iniciarPixel(id),
  ga4: (id) => {
    iniciarGoogle();
    if (!cargadas.has("gtag")) { cargadas.add("gtag"); script(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`); }
    gtag("config", id);
  },
  gads: (id) => {
    iniciarGoogle();
    if (!cargadas.has("gtag")) { cargadas.add("gtag"); script(`https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(id)}`); }
    gtag("config", id);
  },
  gtm: (id) => {
    iniciarGoogle();
    window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" });
    script(`https://www.googletagmanager.com/gtm.js?id=${encodeURIComponent(id)}`);
  },
  clarity: (id) => {
    window.clarity = window.clarity || function () { (window.clarity.q = window.clarity.q || []).push(arguments); };
    window.clarity("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });
    script(`https://www.clarity.ms/tag/${encodeURIComponent(id)}`);
  },
  tiktok: (id) => {
    const ttq = (window.ttq = window.ttq || []);
    window.TiktokAnalyticsObject = "ttq";
    ttq.methods = ["page", "track", "identify", "instances", "debug", "on", "off", "once", "ready", "alias", "group", "enableCookie", "disableCookie"];
    ttq.setAndDefer = (o, m) => { o[m] = function () { o.push([m, ...arguments]); }; };
    for (const m of ttq.methods) ttq.setAndDefer(ttq, m);
    // Como el código base de TikTok: instance y load
    ttq.instance = (t) => { const e = ttq._i[t] || []; for (const m of ttq.methods) ttq.setAndDefer(e, m); return e; };
    ttq.load = (e, n) => {
      const r = "https://analytics.tiktok.com/i18n/pixel/events.js";
      ttq._i = ttq._i || {}; ttq._i[e] = []; ttq._i[e]._u = r;
      ttq._t = ttq._t || {}; ttq._t[e] = Date.now();
      ttq._o = ttq._o || {}; ttq._o[e] = n || {};
      script(`${r}?sdkid=${encodeURIComponent(e)}&lib=ttq`);
    };
    ttq.load(id);
    ttq.page();
  }
};

const RETIRAR = {
  meta: () => retirarPixel(),
  ga4: () => googleIniciado && gtag("consent", "update", consentimientoGoogle()),
  gads: () => googleIniciado && gtag("consent", "update", consentimientoGoogle()),
  gtm: () => googleIniciado && gtag("consent", "update", consentimientoGoogle()),
  clarity: () => window.clarity?.("consentv2", { ad_Storage: "denied", analytics_Storage: "denied" }),
  tiktok: () => {}
};

function borrarCookies(categoria) {
  const partes = location.hostname.split(".");
  for (const c of document.cookie.split(";")) {
    const nombre = c.split("=")[0].trim();
    if (!COOKIES[categoria].test(nombre)) continue;
    for (let i = 0; i < partes.length; i++) {
      const dominio = partes.slice(i).join(".");
      document.cookie = `${nombre}=; Max-Age=0; path=/; domain=${dominio}`;
    }
    document.cookie = `${nombre}=; Max-Age=0; path=/`;
  }
}

// Carga lo permitido que falta y retira lo que se dejó de permitir.
function aplicar() {
  if (!tienda?.cargar) return;
  for (const h of activas(tienda.datos)) {
    const id = String(tienda.datos[h.campo] || "").trim();
    // El ID de ejemplo de la tienda nueva (0037) no es de nadie: no se carga.
    if (!h.patron.test(id) || (h.campo === "meta_pixel_id" && esPixelDeEjemplo(id))) continue;
    if (permitido(h.categoria) && !cargadas.has(h.clave)) {
      cargadas.add(h.clave);
      try { CARGAR[h.clave](id); } catch (e) { console.error(h.nombre, e); }
    } else if (!permitido(h.categoria) && cargadas.has(h.clave)) {
      try { RETIRAR[h.clave](); } catch (e) { console.error(h.nombre, e); }
    }
  }
  for (const c of CATEGORIAS) if (!permitido(c.clave)) borrarCookies(c.clave);
  if (permitido("medicion") && cargadas.has("clarity")) window.clarity?.("consentv2", { ad_Storage: "denied", analytics_Storage: "granted" });
}

// --- Banner ------------------------------------------------------------------
function categoriasEnUso() {
  const usadas = activas(tienda.datos);
  // Los nombres de las herramientas, del diccionario (cookies.herramienta.<clave>);
  // herramientas.js sigue en español para la Política de cookies.
  return CATEGORIAS.map((c) => ({
    ...c,
    nombre: t(`cookies.categoria.${c.clave}`),
    texto: t(`cookies.categoria.${c.clave}.texto`),
    herramientas: usadas.filter((h) => h.categoria === c.clave).map((h) => t(`cookies.herramienta.${h.clave}`))
  }))
    .filter((c) => c.herramientas.length);
}

function htmlBanner(configurar) {
  const ruta = tienda.rutaCookies;
  const cats = categoriasEnUso();
  const actual = estado();
  return `<div class="banner-cookies-caja">
    <h2 class="banner-cookies-titulo" id="cookies-titulo" tabindex="-1">${t("cookies.titulo")}</h2>
    <p class="banner-cookies-texto" id="cookies-texto">${t("cookies.texto")} <a href="${ruta}">${t("cookies.politica")}</a></p>
    ${configurar ? `<form class="banner-cookies-config" id="cookies-config" aria-labelledby="cookies-config-titulo">
      <h3 class="oculto-visual" id="cookies-config-titulo">${t("cookies.configurar.titulo")}</h3>
      <div class="cookie-categoria">
        <label class="interruptor-cookie" for="ck-necesarias"><input type="checkbox" role="switch" id="ck-necesarias" checked disabled aria-describedby="ck-necesarias-texto"><span>${t("cookies.categoria.necesarias")}</span></label>
        <p class="cookie-categoria-texto" id="ck-necesarias-texto">${t("cookies.categoria.necesarias.texto")}</p>
      </div>
      ${cats.map((c) => {
        const bloqueada = c.clave === "publicidad" && gpc();
        return `<div class="cookie-categoria">
        <label class="interruptor-cookie" for="ck-${c.clave}"><input type="checkbox" role="switch" id="ck-${c.clave}" data-categoria="${c.clave}" ${actual[c.clave] ? "checked" : ""} ${bloqueada ? "disabled" : ""} aria-describedby="ck-${c.clave}-texto"><span>${c.nombre}</span></label>
        <p class="cookie-categoria-texto" id="ck-${c.clave}-texto">${c.texto} ${escaparHTML(c.herramientas.join(", "))}.${bloqueada ? ` ${t("cookies.gpc")}` : ""}</p>
      </div>`;
      }).join("")}
      <button type="submit" class="boton boton--primario banner-cookies-guardar">${t("cookies.guardar")}</button>
    </form>` : ""}
    <div class="banner-cookies-botones">
      <button type="button" class="boton boton--secundario" data-cookies="aceptar">${t("cookies.aceptar")}</button>
      <button type="button" class="boton boton--secundario" data-cookies="rechazar">${t("cookies.rechazar")}</button>
      <button type="button" class="boton boton--secundario" data-cookies="configurar" aria-expanded="${configurar}" ${configurar ? 'aria-controls="cookies-config"' : ""}>${t("cookies.configurar")}</button>
    </div>
  </div>`;
}

function cerrarBanner() {
  if (!banner) return;
  banner.remove();
  banner = null;
  const volver = origenFoco;
  origenFoco = null;
  if (volver?.isConnected) volver.focus();
}

function mostrarBanner({ configurar = false, enfocar = false } = {}) {
  if (!banner) {
    banner = document.createElement("section");
    banner.className = "banner-cookies";
    banner.setAttribute("aria-labelledby", "cookies-titulo");
    banner.setAttribute("aria-describedby", "cookies-texto");
    banner.addEventListener("click", (e) => {
      const b = e.target.closest("[data-cookies]");
      if (!b) return;
      if (b.dataset.cookies === "aceptar") { guardar({ medicion: true, publicidad: true }); cerrarBanner(); }
      if (b.dataset.cookies === "rechazar") { guardar({ medicion: false, publicidad: false }); cerrarBanner(); }
      if (b.dataset.cookies === "configurar") mostrarBanner({ configurar: b.getAttribute("aria-expanded") !== "true", enfocar: true });
    });
    banner.addEventListener("submit", (e) => {
      e.preventDefault();
      const valor = (c) => Boolean(banner.querySelector(`[data-categoria="${c}"]`)?.checked);
      guardar({ medicion: valor("medicion"), publicidad: valor("publicidad") });
      cerrarBanner();
    });
    banner.addEventListener("keydown", (e) => { if (e.key === "Escape" && eleccion) cerrarBanner(); });
    document.body.appendChild(banner);
  }
  banner.hidden = false;
  banner.innerHTML = htmlBanner(configurar);
  if (enfocar) (configurar ? banner.querySelector("#cookies-config input:not(:disabled)") || banner.querySelector(".banner-cookies-guardar") : banner.querySelector("#cookies-titulo"))?.focus();
}

// Primera visita: muestra el banner cuando no tapa el título ni los filtros
// (en un celular, cuando la persona baja y los filtros ya pasaron). Mide el
// banner de verdad, después de la fuente y de que los filtros se dibujaron.
async function mostrarSinTapar(protegido) {
  if (protegido) {
    try { await Promise.race([document.fonts?.ready, new Promise((r) => setTimeout(r, 3000))]); } catch { /* sin fuentes */ }
    await new Promise((r) => requestAnimationFrame(() => r()));
  }
  if (eleccion) return;
  mostrarBanner();
  if (!protegido) return;
  // Alto del banner medido desde el borde de abajo de la pantalla
  const alto = innerHeight - banner.querySelector(".banner-cookies-caja").getBoundingClientRect().top;
  const cabe = () => protegido.getBoundingClientRect().bottom <= innerHeight - alto;
  if (cabe()) return;
  banner.hidden = true;
  const revisar = () => {
    if (!banner || eleccion) { quitar(); return; }
    if (!cabe()) return;
    quitar();
    banner.hidden = false;
  };
  const quitar = () => { removeEventListener("scroll", revisar); removeEventListener("resize", revisar); };
  addEventListener("scroll", revisar, { passive: true });
  addEventListener("resize", revisar, { passive: true });
}

// tienda: la de la base. cargar: false en las páginas legales (no miden).
// protegido: lo que el banner no debe tapar (los filtros).
export function iniciarConsentimiento({ tienda: datos, cargar = true, protegido = null, rutaCookies = "cookies/", preguntar = true }) {
  tienda = { datos, cargar, rutaCookies };
  eleccion = leer();
  aplicar();
  if (!eleccion && preguntar) mostrarSinTapar(protegido);
  document.querySelectorAll("[data-preferencias-cookies]").forEach((b) => {
    b.hidden = false;
    b.addEventListener("click", () => { origenFoco = b; mostrarBanner({ configurar: true, enfocar: true }); });
  });
}

export { HERRAMIENTAS };
