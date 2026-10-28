// =============================================================================
// Validación de los campos de contacto, compartida por el pop-up y la página
// de solicitudes (/solicitudes/): los mensajes de error y el formato del
// celular mientras se escribe. Los textos están en i18n (son los del pop-up).
// =============================================================================

import { soloDigitos } from "../utils.js";
import { datosPais, paisActual, agruparCelular, AUTORIDAD_CONSUMIDOR } from "../datos/paises.js";
import { t } from "../i18n/i18n.js";

// Funciones: el idioma se carga después de importar este módulo.
export const ERRORES = {
  nombre: () => t("popup.error.nombre"),
  correo: () => t("popup.error.correo"),
  // Colombia: texto literal del prompt. Los demás países, con su prefijo.
  telefono: () => {
    if (paisActual() === "co") return t("popup.error.telefono.co");
    const cel = datosPais(paisActual()).celular;
    return cel.ejemplo
      ? t("popup.error.telefono.ejemplo", { prefijo: cel.visible, ejemplo: cel.ejemplo })
      : t("popup.error.telefono", { prefijo: cel.visible });
  },
  autorizacion: () => t("popup.error.autorizacion")
};

// Argentina (0031, legal/FUENTES.md AR9): si la tienda vende a Argentina, el
// consentimiento expreso para enviar los datos a HighLevel (Estados Unidos) va
// nombrado en la única casilla del formulario (desde el 28/10/2026, decisión de
// Jared; antes era una casilla aparte). claveAutorizacion() elige ese texto.
export const pideTransferencia = (tienda) => (tienda?.legal_paises || []).includes("ar");
export const claveAutorizacion = (base, tienda) => (pideTransferencia(tienda) ? `${base}.ar` : base);

// Mantiene el cursor en el mismo dígito al reformatear "300 123 4567".
export function formatearConCursor(input) {
  const pos = input.selectionStart ?? input.value.length;
  const digitosAntes = soloDigitos(input.value.slice(0, pos)).length;
  input.value = agruparCelular(input.value, paisActual());
  let n = 0;
  let nueva = input.value.length;
  for (let i = 0; i < input.value.length; i++) {
    if (n === digitosAntes) { nueva = i; break; }
    if (/\d/.test(input.value[i])) n++;
  }
  if (document.activeElement === input) input.setSelectionRange(nueva, nueva);
}

// Pie de las páginas internas (legales y solicitudes): el enlace a la
// autoridad de protección al consumidor del país de la tienda, como en la
// página principal (Argentina: en todas las páginas, AR11).
export function enlaceConsumidorEnPie(tienda) {
  const url = AUTORIDAD_CONSUMIDOR[tienda?.pais];
  const nav = document.querySelector(".pie-enlaces");
  if (!url || !nav) return;
  const a = document.createElement("a");
  a.href = url;
  a.target = "_blank";
  a.rel = "noopener";
  a.textContent = t(`sitio.pie.consumidor.${tienda.pais}`);
  nav.insertBefore(a, nav.querySelector("[data-preferencias-cookies]"));
}
