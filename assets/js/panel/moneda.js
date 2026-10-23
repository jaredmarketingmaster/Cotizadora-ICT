// =============================================================================
// Mi tienda → Moneda (0038): el dólar como moneda de apoyo o de reemplazo.
// - Cómo se muestran los precios: solo en la moneda del país, en las dos o
//   solo en U$D. Los países cuya moneda ya es el dólar no lo ofrecen.
// - La cotización (cuánto vale 1 U$D), con la fecha de su última
//   actualización (la pone el servidor al cambiarla).
// - El redondeo del precio calculado, en pestañas: sin redondeo, hacia arriba
//   o hacia abajo (al 0 o al 5), con un ejemplo en vivo.
// tienda.js arma la sección con htmlMoneda() y lee los valores con leer().
// =============================================================================

import { datosPais, formatearPrecio } from "../datos/paises.js";
import { MODOS_USD, REDONDEOS_USD, usdDisponible, redondearUsd, formatearUsd, MAX_COTIZACION } from "../datos/precios.js";
import { fechaCorta } from "../utils.js";
import { $, $$, esc, marcarError } from "./ui.js";
import { t as t_ } from "../i18n/i18n.js";

// Un precio de ejemplo para mostrar el redondeo.
const EJEMPLO_LOCAL = 1234567;

// "1.234,50" o "1,234.50" según los separadores del país → 1234.5 (null si no es válido).
export function leerCotizacion(texto, pais) {
  const s = String(texto || "").replace(/\s| /g, "");
  if (!s) return null;
  const miles = datosPais(pais).miles === "," ? "," : ".";
  const decimal = miles === "," ? "." : ",";
  const limpio = s.split(miles).join("").replace(decimal, ".");
  if (!/^\d+(\.\d{1,2})?$/.test(limpio)) return NaN;
  const n = Number(limpio);
  return n > 0 && n <= MAX_COTIZACION ? n : NaN;
}

export function mostrarCotizacion(n, pais) {
  if (n == null || n === "") return "";
  const [entero, dec] = Number(n).toFixed(2).split(".");
  const conMiles = formatearPrecio(Number(entero), pais).replace(/^\D+/, "");
  return dec === "00" ? conMiles : `${conMiles}${datosPais(pais).miles === "," ? "." : ","}${dec}`;
}

export function htmlMoneda(t) {
  const modo = t.usd_modo || "no";
  const redondeo = t.usd_redondeo || "no";
  return `<section class="bloque" aria-labelledby="t-moneda">
    <h2 id="t-moneda">${esc(t_("panel.tienda.moneda.titulo"))}</h2>
    <p class="ayuda" id="moneda-sin-dolar" hidden></p>
    <div id="moneda-opciones">
      <fieldset class="campo">
        <legend>${esc(t_("panel.tienda.moneda.como"))}</legend>
        <div class="opciones-vista" id="usd-modos">
          ${MODOS_USD.map((m) => `<label class="opcion-vista"><input type="radio" name="usd_modo" value="${m}" aria-describedby="usd-${m}-ayuda" ${modo === m ? "checked" : ""}>
            <span class="opcion-vista-nombre" data-moneda-texto="panel.tienda.moneda.${m}"></span>
            <span class="ayuda" id="usd-${m}-ayuda" data-moneda-texto="panel.tienda.moneda.${m}_ayuda"></span>
          </label>`).join("")}
        </div>
      </fieldset>
      <div id="moneda-dolar">
        <div class="campo">
          <label for="usd_cotizacion" data-moneda-texto="panel.tienda.moneda.cotizacion"></label>
          <p class="ayuda" id="usd_cotizacion-ayuda">${esc(t_("panel.tienda.moneda.cotizacion_ayuda"))}${t.usd_actualizado_en ? ` ${esc(t_("panel.tienda.moneda.actualizada", { fecha: fechaCorta(t.usd_actualizado_en) }))}` : ""}</p>
          <input class="entrada cifras" id="usd_cotizacion" inputmode="decimal" autocomplete="off" value="${esc(mostrarCotizacion(t.usd_cotizacion, t.pais))}" aria-describedby="usd_cotizacion-ayuda usd_cotizacion-error">
          <p class="error-campo" id="usd_cotizacion-error"></p>
        </div>
        <fieldset class="campo" aria-describedby="usd-ejemplo">
          <legend>${esc(t_("panel.tienda.moneda.redondeo"))}</legend>
          <div class="segmentos">
            ${REDONDEOS_USD.map((r) => `<label class="segmento-opcion"><input type="radio" name="usd_redondeo" value="${r}" ${redondeo === r ? "checked" : ""}><span>${esc(t_(`panel.tienda.moneda.redondeo_${r}`))}</span></label>`).join("")}
          </div>
          <p class="ayuda cifras" id="usd-ejemplo" aria-live="polite"></p>
        </fieldset>
        <p class="ayuda">${esc(t_("panel.tienda.moneda.por_equipo"))}</p>
      </div>
    </div>
  </section>`;
}

// Conecta la sección. pais(): el país elegido en el formulario (puede cambiar).
export function iniciarMoneda(form, pais) {
  function pintar() {
    const p = datosPais(pais());
    const disponible = usdDisponible(p.codigo);
    $("#moneda-sin-dolar").hidden = disponible;
    $("#moneda-sin-dolar").textContent = disponible ? "" : t_("panel.tienda.moneda.ya_dolar", { pais: p.nombre });
    $("#moneda-opciones").hidden = !disponible;
    $$("[data-moneda-texto]", form).forEach((el) => { el.textContent = t_(el.dataset.monedaTexto, { moneda: p.moneda }); });
    const modo = $('input[name="usd_modo"]:checked')?.value || "no";
    $("#moneda-dolar").hidden = modo === "no";
    const c = leerCotizacion($("#usd_cotizacion").value, p.codigo);
    const redondeo = $('input[name="usd_redondeo"]:checked')?.value || "no";
    $("#usd-ejemplo").textContent = c > 0
      ? t_("panel.tienda.moneda.ejemplo", { local: formatearPrecio(EJEMPLO_LOCAL, p.codigo), usd: formatearUsd(redondearUsd(EJEMPLO_LOCAL / c, redondeo), p.codigo) })
      : "";
  }
  form.addEventListener("change", (e) => { if (["usd_modo", "usd_redondeo", "pais"].includes(e.target.name || e.target.id)) pintar(); });
  $("#usd_cotizacion").addEventListener("input", pintar);
  pintar();

  return {
    // Marca el error y devuelve los campos para guardar (null si hay error).
    leer() {
      const codigo = pais();
      const disponible = usdDisponible(codigo);
      const modo = disponible ? ($('input[name="usd_modo"]:checked')?.value || "no") : "no";
      const texto = $("#usd_cotizacion").value.trim();
      const c = leerCotizacion(texto, codigo);
      const error = Number.isNaN(c) ? t_("panel.tienda.moneda.error_cotizacion")
        : modo !== "no" && c == null ? t_("datos.error.usd_cotizacion") : "";
      marcarError(form, "usd_cotizacion", error);
      if (error) return null;
      return { usd_modo: modo, usd_cotizacion: c, usd_redondeo: $('input[name="usd_redondeo"]:checked')?.value || "no" };
    },
    pintar
  };
}
