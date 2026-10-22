// =============================================================================
// Envíos (pestaña de Catálogo, ronda 3, C2; 0023_envios.sql).
//   - Retiro en el local (con la dirección y el horario de Mi tienda).
//   - Envío a domicilio: zonas (o todo el país), costo (gratis, fijo, según la
//     zona o lo paga el cliente al recibir) y envío gratis con condición
//     (en algunas zonas y/o desde un monto).
//   - Plazo de entrega opcional, de X a Y días hábiles.
// errorEnvios() repite validar_envios() del SQL (mismos mensajes, que el panel
// traduce con traducirServidor). frasesEnvio() arma las frases cortas del
// detalle del sitio; lo que va a los términos lo arma la plantilla en español.
// =============================================================================

import { t, idiomaActual } from "../i18n/i18n.js";
import { formatearPrecio } from "./paises.js";

export const COSTOS_ENVIO = ["gratis", "fijo", "zona", "al_recibir"];
export const MAX_ZONAS = 30;
export const MAX_ZONA = 200;
export const MAX_PLAZO = 60;

export const ENVIOS_INICIAL = {
  envio_retiro: false, envio_domicilio: false, envio_todo_el_pais: false, envio_zonas: [],
  envio_costo: "", envio_costo_fijo: null, envio_costos_zona: {},
  envio_gratis: false, envio_gratis_zonas: [], envio_gratis_minimo: null,
  envio_plazo_desde: null, envio_plazo_hasta: null
};
export const CAMPOS_ENVIO = Object.keys(ENVIOS_INICIAL);

const texto = (v) => String(v ?? "").trim();
const monto = (n) => Number.isInteger(n) && n > 0;
const lista = (v) => (Array.isArray(v) ? v : []);
const e = (clave) => t(`datos.error.${clave}`, undefined, idiomaActual());

// El mensaje del primer problema, o "". Igual que validar_envios() de 0023.
export function errorEnvios(d) {
  const zonas = lista(d.envio_zonas);
  const gratisZonas = lista(d.envio_gratis_zonas);
  const costos = d.envio_costos_zona && typeof d.envio_costos_zona === "object" && !Array.isArray(d.envio_costos_zona) ? d.envio_costos_zona : null;
  if (!Array.isArray(d.envio_zonas) || !Array.isArray(d.envio_gratis_zonas) || !costos
      || ![true, false].includes(d.envio_retiro) || ![true, false].includes(d.envio_domicilio)
      || ![true, false].includes(d.envio_todo_el_pais) || ![true, false].includes(d.envio_gratis)
      || !["", ...COSTOS_ENVIO].includes(d.envio_costo)) return e("formato");
  if (!d.envio_domicilio) {
    if (d.envio_todo_el_pais || zonas.length || d.envio_costo || d.envio_costo_fijo != null || Object.keys(costos).length
        || d.envio_gratis || gratisZonas.length || d.envio_gratis_minimo != null) return e("envio_sin_domicilio");
  } else {
    if (zonas.length > MAX_ZONAS || zonas.some((z) => typeof z !== "string" || !texto(z) || z !== texto(z) || z.length > MAX_ZONA)
        || new Set(zonas.map((z) => z.toLowerCase())).size !== zonas.length) return e("envio_zonas");
    if (d.envio_todo_el_pais && zonas.length) return e("envio_todo_o_zonas");
    if (d.envio_costo === "fijo") { if (!monto(d.envio_costo_fijo)) return e("envio_costo_fijo"); }
    else if (d.envio_costo_fijo != null) return e("formato");
    if (d.envio_costo === "zona") {
      const claves = Object.keys(costos);
      if (d.envio_todo_el_pais || claves.length !== zonas.length || !zonas.every((z) => Number.isInteger(costos[z]) && costos[z] >= 0)) return e("envio_costo_zona");
    } else if (Object.keys(costos).length) return e("formato");
    if (d.envio_gratis) {
      if (d.envio_costo === "gratis") return e("envio_gratis_ya");
      if (!gratisZonas.length && !monto(d.envio_gratis_minimo)) return e("envio_gratis_condicion");
      if (d.envio_gratis_minimo != null && !monto(d.envio_gratis_minimo)) return e("envio_gratis_condicion");
      if (gratisZonas.some((z) => !zonas.includes(z)) || new Set(gratisZonas).size !== gratisZonas.length) return e("envio_gratis_zonas");
    } else if (gratisZonas.length || d.envio_gratis_minimo != null) return e("formato");
  }
  const desde = d.envio_plazo_desde;
  const hasta = d.envio_plazo_hasta;
  if (desde != null || hasta != null) {
    const ok = (n) => Number.isInteger(n) && n >= 1 && n <= MAX_PLAZO;
    if (!ok(desde) || !ok(hasta) || desde > hasta) return e("envio_plazo");
  }
  return "";
}

// ¿Se puede entregar de alguna forma? (para publicar los legales y para Inicio)
export const tieneEnvios = (d) => Boolean(d?.envio_retiro || d?.envio_domicilio);

// "Palermo y Belgrano", "Palermo, Belgrano y Núñez" (en el idioma pedido).
export function enumerar(items, idioma = idiomaActual()) {
  const v = items.filter(Boolean);
  if (v.length <= 1) return v.join("");
  return `${v.slice(0, -1).join(", ")} ${t("sitio.envios.y", undefined, idioma)} ${v[v.length - 1]}`;
}

export function textoPlazo(desde, hasta, idioma = idiomaActual()) {
  if (desde == null || hasta == null) return "";
  if (desde === hasta) return desde === 1 ? t("sitio.envios.plazo.uno", undefined, idioma) : t("sitio.envios.plazo.igual", { n: desde }, idioma);
  return t("sitio.envios.plazo.rango", { desde, hasta }, idioma);
}

// Frases cortas del detalle del sitio (solo lo que cargó la tienda):
// "Retiro en el local.", "Envío a todo el país: $15.000.", "Envío gratis en
// Palermo y Belgrano.", "Entrega en 2 a 4 días hábiles."
export function frasesEnvio(d, idioma = idiomaActual()) {
  const f = [];
  const tt = (clave, vars) => t(`sitio.envios.${clave}`, vars, idioma);
  if (d.envio_retiro) f.push(tt("retiro"));
  const zonas = lista(d.envio_zonas);
  const donde = d.envio_todo_el_pais ? tt("todo_el_pais") : enumerar(zonas, idioma);
  if (d.envio_domicilio && donde) {
    if (d.envio_costo === "gratis") f.push(tt("gratis", { donde }));
    else if (d.envio_costo === "fijo" && monto(d.envio_costo_fijo)) f.push(tt("fijo", { donde, monto: formatearPrecio(d.envio_costo_fijo) }));
    else if (d.envio_costo === "zona") {
      for (const z of zonas) {
        const c = d.envio_costos_zona?.[z];
        if (Number.isInteger(c)) f.push(c === 0 ? tt("gratis_zona", { zona: z }) : tt("fijo", { donde: z, monto: formatearPrecio(c) }));
      }
    } else if (d.envio_costo === "al_recibir") f.push(tt("al_recibir", { donde }));
    if (d.envio_gratis && d.envio_costo !== "gratis") {
      const gz = enumerar(lista(d.envio_gratis_zonas), idioma);
      const minimo = monto(d.envio_gratis_minimo) ? formatearPrecio(d.envio_gratis_minimo) : "";
      if (gz && minimo) f.push(tt("gratis_zonas_minimo", { zonas: gz, monto: minimo }));
      else if (gz) f.push(tt("gratis_zonas", { zonas: gz }));
      else if (minimo) f.push(tt("gratis_minimo", { monto: minimo }));
    }
  }
  const plazo = textoPlazo(d.envio_plazo_desde, d.envio_plazo_hasta, idioma);
  if (plazo && tieneEnvios(d)) f.push(plazo);
  return f;
}
