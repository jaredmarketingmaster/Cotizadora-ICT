// =============================================================================
// El precio que ve el cliente, en HTML, para la galería, el detalle, la barra
// de compra y el pop-up: el principal, el tachado de las promos (0039), el de
// U$D de apoyo (0038), la etiqueta del descuento y el cartel de pocas
// unidades del stock contado (0040). Los textos ya vienen armados
// (q.textos, de prepararCatalogo).
// =============================================================================

import { escaparHTML } from "../utils.js";
import { t as tr, tn } from "../i18n/i18n.js";

// El precio de lista tachado lleva "Antes:" para los lectores de pantalla.
export function htmlTachado(textos) {
  return textos?.tachado ? `<s class="precio-tachado"><span class="oculto-visual">${escaparHTML(tr("sitio.precio.antes"))} </span>${escaparHTML(textos.tachado)}</s> ` : "";
}

export function htmlApoyo(textos, clase = "precio-apoyo") {
  return textos?.apoyo ? `<span class="${clase} cifras">${escaparHTML(textos.apoyo)}</span>` : "";
}

export function htmlDescuento(n) {
  return n ? `<span class="etiqueta-pildora etiqueta-pildora--descuento">${escaparHTML(tr("sitio.precio.descuento", { n }))}</span>` : "";
}

// 5 unidades: naranja; 1: rojo con resplandor (el color sube con data-n).
export function htmlStockBajo(n) {
  return Number.isInteger(n) && n >= 1 && n <= 5
    ? `<span class="stock-bajo" data-n="${n}">${escaparHTML(tn("sitio.stock_bajo", n, { n }))}</span>` : "";
}
