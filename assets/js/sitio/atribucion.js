// =============================================================================
// Atribución del anuncio. Al cargar la página se leen de la URL los UTM, ad_id
// y fbclid y se guardan en sessionStorage. En cada clave se conserva el primer
// valor recibido en la sesión. Los filtros de la URL no los tocan.
// =============================================================================

import { sesion } from "../utils.js";

export const CLAVES_ATRIBUCION = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ad_id", "fbclid"];
const CLAVE = "cotizadora:atribucion";

function guardada() {
  try { return JSON.parse(sesion.leer(CLAVE) || "{}") || {}; } catch { return {}; }
}

export function capturarAtribucion(busqueda = location.search) {
  const params = new URLSearchParams(busqueda);
  const actual = guardada();
  let cambio = false;
  for (const clave of CLAVES_ATRIBUCION) {
    const valor = (params.get(clave) || "").trim().slice(0, 500);
    if (valor && !actual[clave]) { actual[clave] = valor; cambio = true; }
  }
  if (cambio) sesion.guardar(CLAVE, JSON.stringify(actual));
  return leerAtribucion();
}

export function leerAtribucion() {
  const actual = guardada();
  return Object.fromEntries(CLAVES_ATRIBUCION.map((c) => [c, actual[c] || ""]));
}
