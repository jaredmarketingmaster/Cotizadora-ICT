// =============================================================================
// Documentos legales de la tienda de ejemplo (0037, assets/js/datos/ejemplo.js).
//
//   node tests/legal/ejemplo.mjs js    Escribe assets/js/datos/legales-ejemplo.js
//                                      con los documentos publicados por el motor.
// El UPDATE del SQL lo escribe tests/sql/vitrina.mjs sql (0041; antes, el modo
// "sql" de este archivo escribió el de 0037).
// Si cambian las plantillas o los datos de ejemplo, motor.test.mjs falla hasta
// volver a generar legales-ejemplo.js; la instalación nueva del SQL se pone al
// día con una migración que repita el bloque de vitrina.mjs (y datos_fabrica()).
// =============================================================================
import { writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { publicar } from "../../assets/js/legal/motor.js";
import { tiendaNueva, VIGENCIA_EJEMPLO } from "../../assets/js/datos/ejemplo.js";

export function publicadoEjemplo() {
  return publicar(tiendaNueva(null, { conLegales: false }), null, VIGENCIA_EJEMPLO);
}

// Solo como programa (vitrina.mjs importa publicadoEjemplo).
const modo = import.meta.url === pathToFileURL(process.argv[1]).href ? process.argv[2] : null;
if (modo === "js") {
  const destino = new URL("../../assets/js/datos/legales-ejemplo.js", import.meta.url);
  writeFileSync(destino, `// Los documentos legales publicados de la tienda de ejemplo (0037).
// GENERADO con node tests/legal/ejemplo.mjs js: no editar a mano.
export const LEGAL_PUBLICADO_EJEMPLO = ${JSON.stringify(publicadoEjemplo(), null, 2)};
`);
  console.log(`escrito ${destino.pathname}`);
} else if (modo) {
  console.error("Uso: node tests/legal/ejemplo.mjs js");
  process.exit(2);
}
