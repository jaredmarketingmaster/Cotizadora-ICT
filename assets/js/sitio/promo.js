// =============================================================================
// Banner de promos (0039): fijo arriba del sitio, con el texto de la tienda
// que corre de derecha a izquierda sin parar.
// - La pista tiene dos mitades iguales, cada una con el texto repetido hasta
//   llenar el ancho; se mueve media pista y vuelve a empezar sin salto.
// - Velocidad pareja: la duración sale del ancho (VELOCIDAD px por segundo).
// - Botón para pausar y seguir (WCAG 2.2.2); también se detiene con el mouse
//   encima o con el foco adentro.
// - prefers-reduced-motion: el texto queda quieto, una sola vez, y sin botón.
// - Los lectores de pantalla leen el texto una vez (#promo-texto); la pista es
//   decorativa (aria-hidden).
// =============================================================================

import { reducirMovimiento } from "../utils.js";
import { t as tr } from "../i18n/i18n.js";

const VELOCIDAD = 60;
let observador = null;
let rearmar = null;
let escuchando = false;

export function mostrarBanner(banner, texto) {
  const pista = banner.querySelector("#promo-pista");
  const pausa = banner.querySelector("#promo-pausa");
  const limpio = String(texto || "").trim();
  banner.querySelector("#promo-texto").textContent = limpio;
  banner.hidden = false;
  document.documentElement.classList.add("con-promo");

  function item() {
    const s = document.createElement("span");
    s.className = "promo-item";
    s.textContent = limpio;
    return s;
  }

  function armar() {
    pista.textContent = "";
    pista.style.animationDuration = "";
    const quieto = reducirMovimiento();
    banner.classList.toggle("promo-quieto", quieto);
    pausa.hidden = quieto;
    if (quieto) { pista.append(item()); return; }
    // Una mitad que llene el ancho visible (al menos dos repeticiones).
    const mitad = document.createElement("span");
    mitad.className = "promo-mitad";
    mitad.append(item(), item());
    pista.append(mitad);
    const ancho = banner.clientWidth || window.innerWidth;
    let vueltas = 0;
    while (mitad.scrollWidth < ancho && vueltas++ < 20) mitad.append(item());
    pista.append(mitad.cloneNode(true));
    pista.style.animationDuration = `${Math.max(8, mitad.scrollWidth / VELOCIDAD).toFixed(1)}s`;
  }

  pausa.onclick = () => {
    const pausado = pausa.getAttribute("aria-pressed") !== "true";
    pausa.setAttribute("aria-pressed", String(pausado));
    pausa.setAttribute("aria-label", tr(pausado ? "sitio.promo.seguir" : "sitio.promo.pausar"));
    banner.classList.toggle("promo-pausado", pausado);
  };

  armar();
  observador?.disconnect();
  let ancho = banner.clientWidth;
  observador = new ResizeObserver(() => {
    if (Math.abs(banner.clientWidth - ancho) < 2) return;
    ancho = banner.clientWidth;
    armar();
  });
  observador.observe(banner);
  rearmar = armar;
  if (!escuchando) {
    escuchando = true;
    window.matchMedia("(prefers-reduced-motion: reduce)").addEventListener?.("change", () => rearmar?.());
  }
}
