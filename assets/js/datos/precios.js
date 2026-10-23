// =============================================================================
// Precios que ve el cliente: dólar (0038), promos (0039) y stock contado
// (0040). Reglas y cálculos compartidos por el sitio, el panel y los dos
// back-ends; las validaciones son las mismas del SQL, con los mismos mensajes.
//
// Dólar (tienda.usd_*): "apoyo" muestra el precio en U$D al lado del de la
// moneda del país; "reemplazo" muestra solo el de U$D. El precio en U$D es el
// del equipo (equipos.precio_usd) o, si no tiene, el de la moneda del país
// dividido por la cotización, con el redondeo elegido (al 0 o al 5, hacia
// arriba o hacia abajo). La fecha de la cotización la pone el servidor.
//
// Promos (tienda.promo_*, equipos.promo_descuento): un banner arriba del sitio
// y descuentos para toda la tienda, por modelo y por equipo, con un
// interruptor general. Si un equipo tiene más de uno, la tienda elige: el
// mayor, el más específico (equipo, después modelo, después tienda) o la suma
// (hasta MAX_DESCUENTO_PROMO).
//
// Stock contado (equipos.contar_stock, stock_cantidad): la cantidad solo la ve
// el panel; el público recibe stock_bajo (de 1 a 5) para el cartel.
// =============================================================================

import { t } from "../i18n/i18n.js";
import { formatearNumero, formatearPrecio, datosPais, paisActual } from "./paises.js";

// --- Dólar ---------------------------------------------------------------------
export const MODOS_USD = ["no", "apoyo", "reemplazo"];
export const REDONDEOS_USD = ["no", "arriba", "abajo"];
export const USD_INICIAL = { usd_modo: "no", usd_cotizacion: null, usd_actualizado_en: null, usd_redondeo: "no" };
// Los países cuya moneda ya es el dólar no lo ofrecen.
export const usdDisponible = (pais) => datosPais(pais).moneda !== "USD";
export const MAX_COTIZACION = 1e9;

const cotizacionValida = (c) => typeof c === "number" && Number.isFinite(c) && c > 0 && c <= MAX_COTIZACION
  && Math.abs(Math.round(c * 100) - c * 100) < 1e-6;

// Como validar_usd (0038). "" = bien.
export function errorUsd(t_) {
  if (!MODOS_USD.includes(t_.usd_modo) || !REDONDEOS_USD.includes(t_.usd_redondeo)) return t("datos.error.formato");
  if (t_.usd_cotizacion != null && !cotizacionValida(t_.usd_cotizacion)) return t("datos.error.usd_cotizacion");
  if (t_.usd_modo !== "no") {
    if (!usdDisponible(t_.pais)) return t("datos.error.usd_pais");
    if (t_.usd_cotizacion == null) return t("datos.error.usd_cotizacion");
  }
  return "";
}

// Al 0 o al 5: hacia arriba (237 → 240), hacia abajo (237 → 235) o al entero.
export function redondearUsd(x, modo) {
  if (modo === "arriba") return Math.ceil(x / 5 - 1e-9) * 5;
  if (modo === "abajo") return Math.max(5, Math.floor(x / 5 + 1e-9) * 5);
  return Math.round(x);
}

export function formatearUsd(n, codigo = paisActual()) {
  return `U$D ${formatearNumero(n, codigo)}`;
}

// --- Promos --------------------------------------------------------------------
export const COMBINAR_PROMOS = ["mayor", "especifico", "suma"];
export const MAX_DESCUENTO_PROMO = 90;
export const MAX_BANNER = 120;
export const PROMOS_INICIAL = {
  promo_banner_activo: false, promo_banner_texto: "", promo_descuentos_activos: false,
  promo_descuento_tienda: null, promo_descuentos_modelo: {}, promo_combinar: "mayor"
};
const pct = (n) => Number.isInteger(n) && n >= 1 && n <= MAX_DESCUENTO_PROMO;

// Como validar_promos (0039). "" = bien.
export function errorPromos(t_) {
  if (typeof t_.promo_banner_activo !== "boolean" || typeof t_.promo_descuentos_activos !== "boolean"
      || typeof t_.promo_banner_texto !== "string" || !COMBINAR_PROMOS.includes(t_.promo_combinar)) return t("datos.error.formato");
  const texto = t_.promo_banner_texto;
  if (texto !== texto.trim() || texto.length > MAX_BANNER || /[\r\n]/.test(texto)) return t("datos.error.promo_banner_texto");
  if (t_.promo_banner_activo && !texto) return t("datos.error.promo_banner_vacio");
  if (t_.promo_descuento_tienda != null && !pct(t_.promo_descuento_tienda)) return t("datos.error.promo_descuento");
  const m = t_.promo_descuentos_modelo;
  if (!m || typeof m !== "object" || Array.isArray(m) || Object.keys(m).length > 100
      || Object.entries(m).some(([slug, v]) => !/^[a-z0-9-]{1,60}$/.test(slug) || !pct(v))) return t("datos.error.promo_descuento");
  return "";
}

// El descuento de un equipo (0 si no tiene o las promos están apagadas).
export function descuentoEquipo(q, tienda, slugModelo) {
  if (!tienda?.promo_descuentos_activos) return 0;
  const equipo = pct(q.promo_descuento) ? q.promo_descuento : 0;
  const modelo = pct(tienda.promo_descuentos_modelo?.[slugModelo]) ? tienda.promo_descuentos_modelo[slugModelo] : 0;
  const general = pct(tienda.promo_descuento_tienda) ? tienda.promo_descuento_tienda : 0;
  if (tienda.promo_combinar === "suma") return Math.min(MAX_DESCUENTO_PROMO, equipo + modelo + general);
  if (tienda.promo_combinar === "especifico") return equipo || modelo || general;
  return Math.max(equipo, modelo, general);
}

const conDescuento = (n, d) => Math.round((n * (100 - d)) / 100);

// --- Stock contado ---------------------------------------------------------------
export const STOCK_BAJO = 5;
export const MAX_STOCK = 99999;

// --- Equipo --------------------------------------------------------------------
// Como los checks de equipos de 0038 a 0040. "" = bien.
export function errorEquipoPrecios(q) {
  if (q.precio_usd != null && !(Number.isSafeInteger(q.precio_usd) && q.precio_usd > 0)) return t("datos.error.precio_usd");
  if (q.promo_descuento != null && !pct(q.promo_descuento)) return t("datos.error.promo_descuento");
  if (typeof q.contar_stock !== "boolean") return t("datos.error.formato");
  if (q.stock_cantidad != null && !(Number.isInteger(q.stock_cantidad) && q.stock_cantidad >= 0 && q.stock_cantidad <= MAX_STOCK)) return t("datos.error.stock_cantidad");
  if (q.contar_stock && q.stock_cantidad == null) return t("datos.error.stock_cantidad");
  return "";
}

// Como el disparador equipos_stock (0040): con el stock contado, "con stock"
// es tener al menos una unidad; sin contarlo, la cantidad no se guarda.
export function aplicarStock(q) {
  if (q.contar_stock) q.en_stock = q.stock_cantidad > 0;
  else q.stock_cantidad = null;
  return q;
}

// Lo que el público ve del stock: la cantidad solo si es de 1 a 5.
export function stockBajo(q) {
  return q.contar_stock && Number.isInteger(q.stock_cantidad) && q.stock_cantidad >= 1 && q.stock_cantidad <= STOCK_BAJO ? q.stock_cantidad : null;
}

// Los precios de un equipo para el sitio:
// { lista, precio (con descuento), descuento, usdLista, usd } (usd null si la
// tienda no muestra dólares o no se puede calcular).
export function preciosEquipo(q, tienda, slugModelo) {
  const descuento = descuentoEquipo(q, tienda, slugModelo);
  const lista = q.precio;
  const precio = descuento ? conDescuento(lista, descuento) : lista;
  let usdLista = null;
  let usd = null;
  if (tienda?.usd_modo && tienda.usd_modo !== "no" && usdDisponible(tienda.pais)) {
    if (Number.isSafeInteger(q.precio_usd) && q.precio_usd > 0) {
      usdLista = q.precio_usd;
      usd = descuento ? conDescuento(q.precio_usd, descuento) : q.precio_usd;
    } else if (cotizacionValida(Number(tienda.usd_cotizacion))) {
      const c = Number(tienda.usd_cotizacion);
      usdLista = redondearUsd(lista / c, tienda.usd_redondeo);
      usd = redondearUsd(precio / c, tienda.usd_redondeo);
    }
  }
  return { lista, precio, descuento, usdLista, usd };
}

// Los textos del precio: principal, el tachado (con descuento) y el de apoyo.
// q ya tiene precio_lista, precio, descuento, usd_lista y usd (prepararCatalogo
// los pone con preciosEquipo).
export function textosPrecio(q, tienda) {
  const reemplazo = tienda?.usd_modo === "reemplazo" && q.usd != null;
  if (reemplazo) {
    return { principal: formatearUsd(q.usd), tachado: q.descuento ? formatearUsd(q.usd_lista) : "", apoyo: "" };
  }
  return {
    principal: formatearPrecio(q.precio),
    tachado: q.descuento ? formatearPrecio(q.precio_lista) : "",
    apoyo: tienda?.usd_modo === "apoyo" && q.usd != null ? formatearUsd(q.usd) : ""
  };
}

// El valor con el que se ordena y se compara (el de la moneda principal).
export const valorPrincipal = (q, tienda) => (tienda?.usd_modo === "reemplazo" && q.usd != null ? q.usd : q.precio);
