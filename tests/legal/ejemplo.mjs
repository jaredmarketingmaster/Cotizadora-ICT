// =============================================================================
// Documentos legales de la tienda de ejemplo (0037, assets/js/datos/ejemplo.js).
//
//   node tests/legal/ejemplo.mjs js    Escribe assets/js/datos/legales-ejemplo.js
//                                      con los documentos publicados por el motor.
//   node tests/legal/ejemplo.mjs sql   Escribe el UPDATE de 0037 (solo para una
//                                      instalación nueva: la tienda sin tocar).
// Si cambian las plantillas o los datos de ejemplo, motor.test.mjs falla hasta
// volver a generar legales-ejemplo.js; la instalación nueva del SQL se pone al
// día con una migración que repita el UPDATE (y datos_fabrica()).
// =============================================================================
import { writeFileSync } from "node:fs";
import { publicar } from "../../assets/js/legal/motor.js";
import { tiendaNueva, TIENDA_EJEMPLO, VIGENCIA_EJEMPLO } from "../../assets/js/datos/ejemplo.js";

export function publicadoEjemplo() {
  return publicar(tiendaNueva(null, { conLegales: false }), null, VIGENCIA_EJEMPLO);
}

const modo = process.argv[2];
if (modo === "js") {
  const destino = new URL("../../assets/js/datos/legales-ejemplo.js", import.meta.url);
  writeFileSync(destino, `// Los documentos legales publicados de la tienda de ejemplo (0037).
// GENERADO con node tests/legal/ejemplo.mjs js: no editar a mano.
export const LEGAL_PUBLICADO_EJEMPLO = ${JSON.stringify(publicadoEjemplo(), null, 2)};
`);
  console.log(`escrito ${destino.pathname}`);
} else if (modo === "sql") {
  const valores = { ...TIENDA_EJEMPLO, legal_publicado: publicadoEjemplo() };
  const json = JSON.stringify(valores);
  if (json.includes("$ejemplo$")) throw new Error("los datos no pueden contener $ejemplo$");
  const columnas = Object.keys(valores);
  process.stdout.write(`update public.tienda t set (${columnas.join(", ")})
  = (select ${columnas.map((c) => `x.${c}`).join(", ")}
     from jsonb_populate_record(t, $ejemplo$${json}$ejemplo$::jsonb) x)
where t.id = 1 and t.nombre = 'Tienda de demostración' and t.modo_demo and t.legal_publicado is null
  and t.whatsapp = '' and t.logo = '' and t.correo_contacto = '';
`);
} else if (modo) {
  console.error("Uso: node tests/legal/ejemplo.mjs js | sql");
  process.exit(2);
}
