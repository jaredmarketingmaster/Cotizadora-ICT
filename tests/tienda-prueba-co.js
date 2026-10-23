// =============================================================================
// Para tests/verificar.cjs: la tienda de prueba de Colombia, que es la
// instalación nueva de antes de 0037 (Colombia, sin WhatsApp y Legales vacío,
// sin publicar). Las pruebas escritas para esa tienda la siguen usando: el
// navegador recibe este módulo en lugar de assets/js/datos/ejemplo.js (con
// ctx.route). Las pruebas de la tienda nueva de Argentina piden la real con
// nueva(..., { tienda: "nueva" }).
// Solo funciona servido en la ruta de ejemplo.js: "./ejemplo.js?original" es
// el módulo real (otra URL, que la ruta no intercepta).
// =============================================================================

import * as real from "./ejemplo.js?original";
import { LEGAL_INICIAL } from "./comun.js";
import { ENVIOS_INICIAL } from "./envios.js";

export * from "./ejemplo.js?original";

// Nada es de ejemplo: la tienda de prueba no tiene datos ficticios.
export const TIENDA_EJEMPLO = { nombre: "Tienda de demostración", pais: "co" };
export const CAMPOS_EJEMPLO = [];
export const camposDeEjemplo = () => [];
export const tieneDatosDeEjemplo = () => false;
export const legalesDeEjemplo = () => false;

export function tiendaNueva(fecha) {
  return structuredClone({
    ...real.tiendaNueva(fecha, { conLegales: false }),
    ...LEGAL_INICIAL, ...ENVIOS_INICIAL,
    pais: "co", whatsapp: "", ciudad: "", direccion: "", legal_publicado: null
  });
}
