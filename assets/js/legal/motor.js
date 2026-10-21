// =============================================================================
// Motor legal: arma los documentos de la tienda desde las plantillas, los
// datos que cargó en el asistente (Legales), los módulos de sus países y las
// herramientas activas. Funciones puras (sin DOM ni red): las usan el panel
// (vista previa y publicación) y las pruebas.
//
// - faltantes(tienda): lo que falta para publicar, con el paso del asistente.
// - generar(tienda): { privacidad, terminos, cookies, aviso } en el formato
//   de formatoBasico (utils.js). Nunca deja marcadores ni datos vacíos: no se
//   genera si falta algo.
// - publicar(tienda, anterior, hoy): la versión publicada. Si los textos no
//   cambiaron, conserva la versión; si cambiaron, sube el número y la fecha.
// =============================================================================

import { frasesPagos, PLATAFORMA_POR_DEFECTO } from "../datos/comun.js";
import { CODIGOS_PAISES, PAISES_DISPONIBLES, modulosDe, documentosDe } from "./paises/indice.js";
import { activas, idValido, OPCIONALES, HERRAMIENTAS } from "./herramientas.js";
import * as privacidad from "./plantillas/privacidad.js";
import * as terminos from "./plantillas/terminos.js";
import * as cookies from "./plantillas/cookies.js";
import * as aviso from "./plantillas/aviso.js";
import { fechaDMA, conVigencia } from "./vigencia.js";

export const DOCUMENTOS = [
  { clave: "privacidad", titulo: "Política de tratamiento de datos personales", ruta: "privacidad/", clausula: "legal_clausula_privacidad" },
  { clave: "terminos", titulo: "Términos y condiciones", ruta: "terminos/", clausula: "legal_clausula_terminos" },
  { clave: "cookies", titulo: "Política de cookies", ruta: "cookies/", clausula: "legal_clausula_cookies" },
  { clave: "aviso", titulo: "Aviso de privacidad", ruta: "", clausula: "legal_clausula_aviso" }
];
const PLANTILLAS = { privacidad, terminos, cookies, aviso };

export const PERFILES = [
  { clave: "oficial", nombre: "Tienda oficial de Apple", local: true, apple: true },
  { clave: "autorizado", nombre: "Revendedor autorizado de Apple", local: true, apple: true },
  { clave: "electronica", nombre: "Tienda de electrónica en general", local: true, apple: false },
  { clave: "no_oficial", nombre: "Revendedor no oficial de Apple", local: true, apple: false },
  { clave: "emprendedor", nombre: "Emprendedor sin local físico", local: false, apple: false },
  { clave: "particular", nombre: "Revendedor particular", local: false, apple: false }
];
export const ENTREGAS = [
  { clave: "retiro", nombre: "Retiro en el local" },
  { clave: "transportadora", nombre: "Envío con transportadora" },
  { clave: "personal", nombre: "Entrega personal" }
];
export const PASOS = ["Perfil", "Identificación", "Países", "Condiciones de venta", "Herramientas", "Publicar"];

const CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFONO = /^\+?\d{7,15}$/;
export const MARCAS = /\[PENDIENTE|\{\{/;
const texto = (v) => String(v ?? "").trim();
// Lo que escribe la tienda entra al texto sin formato propio (ni corchetes,
// ni asteriscos, ni numerales al inicio).
const limpio = (v) => texto(v).replace(/[[\]*_`]/g, "").replace(/^#+\s*/, "").replace(/\s+/g, " ");

export const perfilDe = (t) => PERFILES.find((p) => p.clave === t?.legal_perfil) || null;
export const necesitaLocal = (t) => perfilDe(t)?.local !== false;
export const declaraApple = (t) => Boolean(perfilDe(t)?.apple);

export function porcentaje(n) {
  const v = Number(n);
  return `${String(Math.round(v * 100) / 100).replace(".", ",")} %`;
}

export function formatearTelefono(t) {
  const d = texto(t).replace(/[^\d+]/g, "");
  const m = d.replace(/^\+/, "").match(/^57(3\d{2})(\d{3})(\d{4})$/);
  return m ? `+57 ${m[1]} ${m[2]} ${m[3]}` : d;
}

// --- Lo que falta para publicar --------------------------------------------------
// { paso (1 a 6 del asistente, o 0 = Mi tienda), campo, texto }. El mismo criterio está en
// legal_faltantes() de 0016_legales_asistente.sql.
export function faltantes(t) {
  const f = [];
  const falta = (paso, campo, que) => f.push({ paso, campo, texto: que });
  if (!texto(t.nombre)) falta(0, "nombre", "El nombre de la tienda (Mi tienda)");
  // Paso 1
  if (!perfilDe(t)) falta(1, "legal_perfil", "El perfil de la tienda");
  // Paso 2
  if (!["natural", "juridica"].includes(t.legal_tipo_persona)) falta(2, "legal_tipo_persona", "El tipo de persona");
  if (!texto(t.legal_nombre)) falta(2, "legal_nombre", t.legal_tipo_persona === "juridica" ? "La razón social" : "El nombre completo");
  const doc = documentosDe(t.legal_paises).find((d) => d.clave === t.legal_doc_tipo);
  if (!doc) falta(2, "legal_doc_tipo", "El tipo de documento");
  else if (!doc.patron.test(texto(t.legal_doc_numero))) falta(2, "legal_doc_numero", `El número de ${doc.nombre.toLowerCase().replace("nit", "NIT")}`);
  if (!texto(t.legal_direccion)) falta(2, "legal_direccion", "La dirección para notificaciones");
  if (!texto(t.legal_ciudad)) falta(2, "legal_ciudad", "La ciudad");
  if (!CORREO.test(texto(t.legal_correo))) falta(2, "legal_correo", "El correo para temas de datos personales");
  if (!TELEFONO.test(texto(t.legal_telefono))) falta(2, "legal_telefono", "El teléfono de contacto");
  if (t.legal_tipo_persona === "juridica") {
    if (!texto(t.legal_representante)) falta(2, "legal_representante", "El representante legal");
    if (!texto(t.legal_matricula_numero)) falta(2, "legal_matricula_numero", "El número de matrícula mercantil");
    if (!texto(t.legal_matricula_camara)) falta(2, "legal_matricula_camara", "La cámara de comercio de la matrícula");
  }
  if (perfilDe(t) && necesitaLocal(t) && !texto(t.legal_direccion_local)) falta(2, "legal_direccion_local", "La dirección del local");
  // Paso 3
  const paises = t.legal_paises || [];
  if (!paises.length) falta(3, "legal_paises", "Los países donde vende");
  else if (paises.some((p) => !PAISES_DISPONIBLES.includes(p))) falta(3, "legal_paises", "Solo se pueden elegir países disponibles");
  // Paso 4
  const impuestos = Array.isArray(t.legal_impuestos) ? t.legal_impuestos : [];
  if (!impuestos.length) falta(4, "legal_impuestos", "Los impuestos que se muestran junto al precio");
  impuestos.forEach((i, n) => {
    const p = Number(i?.porcentaje);
    if (!texto(i?.nombre)) falta(4, `legal_impuestos.${n}.nombre`, `El nombre del impuesto ${n + 1}`);
    if (typeof i?.porcentaje !== "number" || !Number.isFinite(p) || p < 0 || p > 100) falta(4, `legal_impuestos.${n}.porcentaje`, `El porcentaje de ${texto(i?.nombre) || `el impuesto ${n + 1}`}`);
    if (typeof i?.incluido !== "boolean") falta(4, `legal_impuestos.${n}.incluido`, `Si ${texto(i?.nombre) || `el impuesto ${n + 1}`} está incluido en el precio`);
  });
  const minimo = Math.max(1, ...modulosDe(paises).map((m) => m.consumo.garantiaNuevosMinMeses));
  if (!Number.isInteger(t.legal_garantia_nuevos) || t.legal_garantia_nuevos < minimo) falta(4, "legal_garantia_nuevos", `La garantía de los equipos nuevos (${minimo} meses o más)`);
  if (t.legal_garantia_usados === "con") {
    if (!Number.isInteger(t.legal_garantia_usados_meses) || t.legal_garantia_usados_meses < 1) falta(4, "legal_garantia_usados_meses", "Los meses de garantía de los equipos usados");
  } else if (t.legal_garantia_usados !== "sin") falta(4, "legal_garantia_usados", "La garantía de los equipos usados");
  if (t.legal_retracto_canal === "whatsapp") {
    if (!/^57\d{10}$/.test(texto(t.whatsapp))) falta(0, "whatsapp", "El WhatsApp de la tienda (Mi tienda), para pedir el retracto");
  } else if (t.legal_retracto_canal !== "correo") falta(4, "legal_retracto_canal", "El canal para pedir el retracto");
  if (!(t.legal_entrega || []).length) falta(4, "legal_entrega", "Cómo se entregan los equipos");
  if (!texto(t.legal_entrega_zonas)) falta(4, "legal_entrega_zonas", "Las zonas de entrega");
  if (declaraApple(t) && !texto(t.legal_apple_detalle)) falta(4, "legal_apple_detalle", "El detalle de su autorización de Apple");
  if (!["si", "no"].includes(t.legal_homologados)) falta(4, "legal_homologados", "Si los equipos están homologados");
  // Paso 5
  if (!idValido(HERRAMIENTAS[0], t.meta_pixel_id)) falta(5, "meta_pixel_id", "El ID del píxel de Meta");
  for (const h of OPCIONALES) if (t[h.activo] && !idValido(h, t[h.campo])) falta(5, h.campo, `El ${h.etiquetaId} de ${h.nombre}`);
  if (!texto(t.plataforma_sitio)) falta(5, "plataforma_sitio", "La plataforma del sitio");
  // Paso 6: una cláusula propia con marcas del texto anterior (0016 pasó ahí
  // lo que la tienda había escrito).
  for (const d of DOCUMENTOS) if (MARCAS.test(texto(t[d.clausula]))) falta(6, d.clausula, `Corregir la cláusula propia de: ${d.titulo}`);
  return f;
}

// --- Contexto de las plantillas ----------------------------------------------------
export function contexto(t, { rutas = {} } = {}) {
  const paises = modulosDe(t.legal_paises);
  const doc = documentosDe(t.legal_paises).find((d) => d.clave === t.legal_doc_tipo);
  const perfil = perfilDe(t);
  const tienda = limpio(t.nombre) || limpio(t.legal_nombre);
  const correo = texto(t.legal_correo);
  return {
    tienda,
    perfil,
    paises,
    responsable: {
      nombre: limpio(t.legal_nombre),
      juridica: t.legal_tipo_persona === "juridica",
      documento: doc ? `${doc.nombre} ${texto(t.legal_doc_numero)}` : "",
      direccion: limpio(t.legal_direccion),
      ciudad: limpio(t.legal_ciudad),
      correo: `[${correo}](mailto:${correo})`,
      correoTexto: correo,
      telefono: formatearTelefono(t.legal_telefono),
      representante: limpio(t.legal_representante),
      matricula: t.legal_tipo_persona === "juridica" ? `${limpio(t.legal_matricula_numero)} (${limpio(t.legal_matricula_camara)})` : "",
      local: necesitaLocal(t) ? limpio(t.legal_direccion_local) : ""
    },
    venta: {
      impuestos: (t.legal_impuestos || []).map((i) => ({ nombre: limpio(i.nombre), porcentaje: porcentaje(i.porcentaje), incluido: i.incluido })),
      garantiaNuevos: t.legal_garantia_nuevos,
      garantiaUsados: t.legal_garantia_usados,
      garantiaUsadosMeses: t.legal_garantia_usados_meses,
      retractoCanal: t.legal_retracto_canal === "whatsapp"
        ? `escríbanos por WhatsApp al ${formatearTelefono(`+${t.whatsapp}`)}`
        : `escríbanos a [${correo}](mailto:${correo})`,
      entrega: ENTREGAS.filter((e) => (t.legal_entrega || []).includes(e.clave)).map((e) => e.nombre),
      zonas: limpio(t.legal_entrega_zonas),
      // Plazo de entrega de la pestaña Envíos (llega con C2); sin plazo, el legal.
      plazoEntrega: null,
      apple: perfil?.apple
        ? { autorizado: true, detalle: limpio(t.legal_apple_detalle) }
        : { autorizado: false },
      homologados: t.legal_homologados === "si",
      rnbd: t.legal_rnbd,
      pagos: frasesPagos(t)
    },
    herramientas: activas(t),
    capiSoloConsentimiento: t.capi_solo_consentimiento !== false,
    plataforma: limpio(t.plataforma_sitio) || PLATAFORMA_POR_DEFECTO,
    rutas: { privacidad: "../privacidad/", terminos: "../terminos/", cookies: "../cookies/", ...rutas }
  };
}

// Junta las secciones de una plantilla: "## N. Título" y sus líneas. La
// cláusula propia va al final, en "Condiciones adicionales de la tienda".
function armar(secciones, clausula, { numerar = true } = {}) {
  const partes = [];
  let n = 0;
  for (const s of secciones) {
    if (!s || !s.lineas?.length) continue;
    if (s.titulo) partes.push(`## ${numerar ? `${++n}. ` : ""}${s.titulo}`);
    partes.push(s.lineas.join("\n"));
  }
  const propia = texto(clausula);
  if (propia) {
    partes.push(`## ${numerar ? `${++n}. ` : ""}Condiciones adicionales de la tienda`);
    partes.push(propia.replace(/\r\n?/g, "\n"));
  }
  return partes.join("\n\n").replace(/\n{3,}/g, "\n\n").trim();
}

export function generar(t) {
  if (faltantes(t).length) throw new Error("Faltan datos para generar los textos legales.");
  const ctx = contexto(t);
  const docs = {};
  for (const d of DOCUMENTOS) {
    docs[d.clave] = armar(PLANTILLAS[d.clave].secciones(ctx), t[d.clausula], { numerar: d.clave !== "aviso" });
  }
  return docs;
}

// Huella para saber si un texto cambió (FNV-1a de 32 bits).
export function huella(docs) {
  let h = 0x811c9dc5;
  const s = DOCUMENTOS.map((d) => docs[d.clave]).join("\u0000");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

// Fecha de hoy en Colombia, AAAA-MM-DD.
export function hoyColombia(ahora = new Date()) {
  return new Date(ahora.getTime() - 5 * 3600 * 1000).toISOString().slice(0, 10);
}

// La versión que se publica. Igual a la anterior si los textos no cambiaron.
export function publicar(t, anterior = null, hoy = hoyColombia()) {
  const documentos = generar(t);
  const h = huella(documentos);
  if (anterior && anterior.huella === h) return anterior;
  return { version: (anterior?.version || 0) + 1, vigente_desde: hoy, huella: h, documentos };
}

export { CODIGOS_PAISES, PLATAFORMA_POR_DEFECTO, fechaDMA, conVigencia };
