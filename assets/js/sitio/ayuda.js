// =============================================================================
// Globo de ayuda del sitio (ronda 3, F): un botón redondo con "?" abajo a la
// derecha que abre una ventana para quien no puede comprar con el cotizador.
//   1. "¿Está en el celular o en la computadora?"
//   2. El video de ayuda de ese dispositivo (si existe: assets/videos/
//      ayuda-celular.mp4 o ayuda-computadora.mp4), sin descargar nada hasta
//      reproducirlo.
//   3. El texto y "Escribir a la tienda por WhatsApp" con un mensaje fijo.
// No pide datos, no dispara eventos del píxel y nunca se abre solo. Sin un
// WhatsApp válido de la tienda no aparece. No tapa la barra fija de compra
// (sube por encima con transform, sin mover nada) y se oculta mientras está
// abierto el banner de cookies.
// =============================================================================

import { escaparHTML as esc } from "../utils.js";
import { whatsappValido } from "../datos/paises.js";
import { enlaceWhatsApp } from "./catalogo.js";
import { t } from "../i18n/i18n.js";

const VIDEOS = { celular: "assets/videos/ayuda-celular.mp4", computadora: "assets/videos/ayuda-computadora.mp4" };
const SEPARACION = 12;  // px entre el globo y la barra de compra

// Si el video existe (un HEAD liviano; un hosting que responde con una página
// para cualquier ruta no cuenta).
async function existe(url) {
  try {
    const r = await fetch(url, { method: "HEAD", cache: "no-store" });
    const tipo = r.headers.get("content-type") || "";
    return r.ok && (!tipo || tipo.startsWith("video/"));
  } catch {
    return false;
  }
}

export function iniciarAyuda({ tienda }) {
  if (!tienda || !whatsappValido(tienda.whatsapp, tienda.pais) || document.querySelector(".ayuda-globo")) return;

  const globo = document.createElement("button");
  globo.type = "button";
  globo.className = "ayuda-globo";
  globo.setAttribute("aria-label", t("sitio.ayuda.aria"));
  globo.setAttribute("aria-haspopup", "dialog");
  globo.innerHTML = '<span aria-hidden="true">?</span>';

  const dialogo = document.createElement("dialog");
  dialogo.className = "ayuda-dialogo";
  dialogo.setAttribute("aria-labelledby", "ayuda-titulo");

  const enlace = enlaceWhatsApp(tienda.whatsapp, t("sitio.ayuda.mensaje"));
  const cierre = `<button type="button" class="boton-icono ayuda-cerrar" data-cerrar aria-label="${esc(t("popup.cerrar"))}"><svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M6 6l12 12M18 6L6 18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg></button>`;

  function pregunta() {
    dialogo.innerHTML = `<div class="ayuda-contenido">
      ${cierre}
      <h2 id="ayuda-titulo">${esc(t("sitio.ayuda.titulo"))}</h2>
      <p id="ayuda-pregunta">${esc(t("sitio.ayuda.pregunta"))}</p>
      <div class="ayuda-opciones" role="group" aria-labelledby="ayuda-pregunta">
        <button type="button" class="boton boton--secundario" data-dispositivo="celular">${esc(t("sitio.ayuda.celular"))}</button>
        <button type="button" class="boton boton--secundario" data-dispositivo="computadora">${esc(t("sitio.ayuda.computadora"))}</button>
      </div>
    </div>`;
  }

  // El video (si existe) y, siempre, el texto y el enlace de WhatsApp.
  async function respuesta(dispositivo) {
    const hay = await existe(VIDEOS[dispositivo]);
    if (!dialogo.open) return;
    dialogo.innerHTML = `<div class="ayuda-contenido">
      ${cierre}
      <h2 id="ayuda-titulo">${esc(t("sitio.ayuda.titulo"))}</h2>
      ${hay ? `<video class="ayuda-video ayuda-video--${dispositivo}" src="${VIDEOS[dispositivo]}" controls preload="none" playsinline aria-label="${esc(t(`sitio.ayuda.video_${dispositivo}`))}"></video>` : ""}
      <p>${esc(t("sitio.ayuda.texto"))}</p>
      <a class="boton boton--primario ayuda-whatsapp" href="${esc(enlace)}" target="_blank" rel="noopener">${esc(t("sitio.ayuda.whatsapp"))}</a>
    </div>`;
    // Si el video no se puede cargar, queda solo el texto.
    dialogo.querySelector("video")?.addEventListener("error", (e) => e.target.remove());
    (dialogo.querySelector("video") || dialogo.querySelector(".ayuda-whatsapp")).focus();
  }

  dialogo.addEventListener("click", (e) => {
    if (e.target.closest("[data-cerrar]") || e.target === dialogo) { dialogo.close(); return; }
    const b = e.target.closest("[data-dispositivo]");
    if (b) respuesta(b.dataset.dispositivo);
  });
  dialogo.addEventListener("close", () => {
    dialogo.querySelector("video")?.pause();
    globo.focus();
  });
  globo.addEventListener("click", () => {
    pregunta();
    dialogo.showModal();
    dialogo.querySelector("[data-dispositivo]").focus();
  });

  document.body.append(globo, dialogo);

  // Arriba de la barra de compra visible; oculto mientras el banner de cookies
  // está abierto (así no tapa sus botones).
  let pendiente = false;
  function ubicar() {
    pendiente = false;
    const barra = document.querySelector("#barra-compra");
    const visible = barra && !barra.hidden && getComputedStyle(barra).display !== "none";
    globo.style.setProperty("--ayuda-subir", `${visible ? Math.ceil(barra.getBoundingClientRect().height) + SEPARACION - 16 : 0}px`);
    const banner = document.querySelector(".banner-cookies");
    const ocultar = Boolean(banner && !banner.hidden);
    // Solo si cambia: escribir el atributo dispararía otra vez el observador.
    if (globo.hidden !== ocultar) globo.hidden = ocultar;
  }
  const pedir = () => { if (!pendiente) { pendiente = true; requestAnimationFrame(ubicar); } };
  new MutationObserver(pedir).observe(document.body, { subtree: true, childList: true, attributes: true, attributeFilter: ["hidden"] });
  addEventListener("resize", pedir, { passive: true });
  ubicar();
}
