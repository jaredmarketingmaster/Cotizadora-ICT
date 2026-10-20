// =============================================================================
// Ilustración genérica de un teléfono (marcador de posición).
// Silueta propia en SVG: sin manzana, sin cámaras ni isla, sin copiar el diseño
// de ningún modelo. El marco toma el color del equipo.
// =============================================================================

import { escaparHTML, luminancia, hexValido } from "./utils.js";

let contador = 0;

export function telefonoSVG(colorHex, titulo = "") {
  const color = hexValido(colorHex) ? colorHex : "#8E8E93";
  const id = `tel${++contador}`;
  const claro = luminancia(color) > 0.6;
  const borde = claro ? "rgba(0,0,0,.18)" : "rgba(255,255,255,.18)";
  const etiqueta = titulo
    ? `role="img" aria-label="${escaparHTML(titulo)}"`
    : 'aria-hidden="true" focusable="false"';
  return `<svg class="ilustracion-telefono" viewBox="0 0 240 420" ${etiqueta} xmlns="http://www.w3.org/2000/svg">
  <defs>
    <linearGradient id="${id}p" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" stop-color="#1b2330"/><stop offset=".55" stop-color="#0d1118"/><stop offset="1" stop-color="#1f2a3a"/>
    </linearGradient>
    <linearGradient id="${id}b" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#fff" stop-opacity=".22"/><stop offset=".5" stop-color="#fff" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".18"/>
    </linearGradient>
    <radialGradient id="${id}r" cx=".3" cy=".25" r=".9">
      <stop offset="0" stop-color="${color}" stop-opacity=".55"/><stop offset="1" stop-color="${color}" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="120" cy="404" rx="78" ry="9" fill="#000" opacity=".12"/>
  <rect x="223" y="104" width="5" height="44" rx="2.5" fill="${color}"/>
  <rect x="12" y="92" width="5" height="26" rx="2.5" fill="${color}"/>
  <rect x="12" y="128" width="5" height="40" rx="2.5" fill="${color}"/>
  <rect x="16" y="10" width="208" height="384" rx="40" fill="${color}" stroke="${borde}" stroke-width="1.5"/>
  <rect x="16" y="10" width="208" height="384" rx="40" fill="url(#${id}b)"/>
  <rect x="25" y="19" width="190" height="366" rx="32" fill="url(#${id}p)"/>
  <rect x="25" y="19" width="190" height="366" rx="32" fill="url(#${id}r)"/>
  <path d="M25 250 C 80 205, 140 300, 215 235 L215 353 Q215 385 183 385 L57 385 Q25 385 25 353 Z" fill="${color}" opacity=".28"/>
  <path d="M25 290 C 90 250, 150 330, 215 285 L215 353 Q215 385 183 385 L57 385 Q25 385 25 353 Z" fill="${color}" opacity=".22"/>
</svg>`;
}

// Marca genérica para cuando la tienda no tiene logo.
export function logoGenericoSVG() {
  return `<svg class="logo-generico" viewBox="0 0 40 40" aria-hidden="true" focusable="false" xmlns="http://www.w3.org/2000/svg">
  <rect x="1" y="1" width="38" height="38" rx="11" fill="currentColor" opacity=".14"/>
  <rect x="13" y="7" width="14" height="26" rx="4" fill="none" stroke="currentColor" stroke-width="2.4"/>
  <rect x="18" y="28" width="4" height="1.8" rx=".9" fill="currentColor"/>
</svg>`;
}
