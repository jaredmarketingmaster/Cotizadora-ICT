// Compara legal_faltantes() del SQL (la última versión) con faltantes() de motor.js, con
// la tienda de prueba y variantes que rompen cada regla.
//   node tests/sql/comparar-faltantes.mjs sql <raíz>              → imprime el SQL
//   node tests/sql/comparar-faltantes.mjs comparar <raíz> <json>  → compara
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import assert from "node:assert/strict";

const [modo, raiz, archivo] = process.argv.slice(2);
const { faltantes } = await import(pathToFileURL(`${raiz}/assets/js/legal/motor.js`));
const { TIENDA_LEGAL_PRUEBA: base } = await import(pathToFileURL(`${raiz}/tests/legal/datos-prueba.mjs`));

const vacia = Object.fromEntries(Object.entries(base).map(([k, v]) => [k,
  Array.isArray(v) ? [] : typeof v === "boolean" ? false : v === null || typeof v === "number" ? null : ""]));
const VARIANTES = [
  {},
  { ...vacia, pagos_medios: [] },
  { ...vacia, legal_impuestos: [{ nombre: "", porcentaje: "19", incluido: "si" }, 5] },
  { legal_tipo_persona: "juridica" },
  { legal_perfil: "emprendedor", legal_direccion_local: "" },
  { legal_perfil: "no_oficial", legal_direccion_local: "  " },
  { legal_perfil: "oficial" },
  { legal_perfil: "autorizado", legal_apple_detalle: "Contrato 123." },
  { legal_garantia_nuevos: 6 },
  { legal_impuestos: [{ nombre: "IVA", porcentaje: null, incluido: true }] },
  { legal_impuestos: [{ nombre: "IVA", porcentaje: 19, incluido: null }, { nombre: "Otro", porcentaje: 101, incluido: false }] },
  { legal_impuestos: [] },
  { legal_doc_numero: "900123456" },
  { legal_doc_tipo: "cc", legal_doc_numero: "abc" },
  { legal_doc_tipo: "ce", legal_doc_numero: "E12345" },
  { ga4_activo: true, ga4_id: "UA-123", clarity_activo: true, clarity_id: "abc123def4", meta_pixel_id: "12a" },
  { gtm_activo: true, gtm_id: "GTM-1", tiktok_activo: true, tiktok_id: "abc", gads_activo: true, gads_id: "AW-12" },
  { gtm_activo: false, gtm_id: "malo", ga4_activo: true, ga4_id: "G-ABC123XYZ9" },
  { legal_garantia_usados: "con", legal_garantia_usados_meses: null },
  { legal_garantia_usados: "con", legal_garantia_usados_meses: 3 },
  // 0030: con Colombia, menos de 3 meses falta; sin Colombia en los países, alcanza 1.
  { legal_garantia_usados: "con", legal_garantia_usados_meses: 2 },
  { legal_garantia_usados: "con", legal_garantia_usados_meses: 1, legal_paises: ["br"] },
  { legal_retracto_canal: "whatsapp", whatsapp: "" },
  { legal_retracto_canal: "whatsapp" },
  { legal_paises: ["co", "mx"] },
  { legal_paises: [] },
  { pais: "ar" },
  { pais: "br", legal_paises: ["co", "br"] },
  { legal_correo: "datos@", legal_telefono: "12" },
  { nombre: "  ", legal_homologados: "", plataforma_sitio: "" },
  // Envíos (0023)
  { envio_retiro: false, envio_domicilio: false, envio_zonas: [], envio_costo: "", envio_costo_fijo: null },
  { envio_retiro: true, direccion: " ", envio_domicilio: true, envio_zonas: [], envio_costo: "" },
  { envio_domicilio: true, envio_todo_el_pais: true, envio_zonas: [], envio_costo: "al_recibir", envio_costo_fijo: null, envio_retiro: false },
  { legal_clausula_privacidad: "Texto con [PENDIENTE: dato].", legal_clausula_aviso: "Hola {{nombre}}." }
].map((v) => ({ ...base, ...v }));

if (modo === "sql") {
  const filas = VARIANTES.map((v, i) => `select ${i} as n, coalesce(to_json(public.legal_faltantes(jsonb_populate_record(t, $v$${JSON.stringify(v)}$v$::jsonb))), '[]') as f from public.tienda t`);
  console.log(`select json_agg(f order by n) from (${filas.join("\nunion all\n")}) x;`);
} else {
  const sql = JSON.parse(readFileSync(archivo, "utf8"));
  VARIANTES.forEach((v, i) => {
    assert.deepEqual([...sql[i]].sort(), faltantes(v).map((f) => f.campo).sort(), `variante ${i}: ${JSON.stringify(v).slice(0, 200)}`);
  });
  console.log(`OK: legal_faltantes() del SQL igual a faltantes() de motor.js (${VARIANTES.length} variantes)`);
}
