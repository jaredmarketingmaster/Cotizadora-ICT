// =============================================================================
// Reglas de datos compartidas por los dos back-ends (demo y Supabase).
// =============================================================================

export class ErrorDatos extends Error {
  constructor(mensaje, codigo = "") {
    super(mensaje);
    this.name = "ErrorDatos";
    this.codigo = codigo;
  }
}

// Lo que el público puede ver (igual que la política equipos_leer del SQL).
export function equipoEsPublico(equipo, modelosPorId) {
  const modelo = modelosPorId.get(equipo.modelo_id);
  return Boolean(equipo.publicado && equipo.en_stock && modelo?.activo);
}

// Fotos: se guardan dos tamaños. La ruta principal es la grande (máx. 1600 px)
// y la miniatura (máx. 640 px) lleva "-640" antes de la extensión.
export const LADO_GRANDE = 1600;

// Buckets de Storage con su límite y sus tipos (los mismos de las migraciones
// 0001 y 0009). El modo demo los repite; en Supabase los exige Storage.
export const BUCKETS = {
  fotos: { max: 10 * 1024 * 1024, tipos: ["image/webp", "image/jpeg", "image/png"] },
  marca: { max: 10 * 1024 * 1024, tipos: ["image/webp", "image/jpeg", "image/png", "image/svg+xml", "image/x-icon"] },
  videos: { max: 20 * 1024 * 1024, tipos: ["video/mp4", "video/webm"] },
  resenas: { max: 20 * 1024 * 1024, tipos: ["image/webp", "image/jpeg", "image/png", "video/mp4", "video/webm"] }
};

// Mensaje cuando Storage rechaza un archivo (por peso o por tipo).
export function mensajeArchivo(bucket, motivo) {
  if (bucket === "videos") return motivo === "peso" ? "El video pesa más de 20 MB." : "Este formato puede no verse en todos los celulares. Súbalo en MP4.";
  if (bucket === "resenas") return motivo === "peso" ? "El archivo pesa más de 20 MB." : "Ese tipo de archivo no se puede subir. Use una imagen, o un video en MP4.";
  return motivo === "peso" ? "La foto es muy pesada." : "No se pudo subir la foto. Inténtelo de nuevo.";
}

// Ruta del video de un equipo (igual que el check de equipos.video en 0009).
export const RUTA_VIDEO = /^equipos\/[A-Za-z0-9_-]+\.(mp4|webm)$/;
export const LADO_MINIATURA = 640;

export function rutaMiniatura(ruta) {
  return String(ruta).replace(/(\.[a-z0-9]+)$/i, `-${LADO_MINIATURA}$1`);
}

export const CAMPOS_TIENDA = [
  "nombre", "pais", "ciudad", "direccion", "horario_texto", "whatsapp", "correo_contacto",
  "instagram_url", "facebook_url", "tiktok_url", "logo", "favicon",
  "color_primario", "color_secundario", "tema", "texto_entrega", "pagos_otras",
  "texto_garantia_nuevos", "texto_garantia_usados", "etiqueta_precio", "modo_demo",
  "tamano_texto", "vista_equipos", "mostrar_ficha", "ficha_ocultas",
  "pagos_medios", "pagos_cuotas", "pagos_cuotas_max", "pagos_sin_interes", "pagos_sin_interes_max",
  "pagos_cripto", "pagos_cripto_cuales", "pagos_pasarelas", "pagos_pasarela_otra",
  "mostrar_resenas", "titulo_resenas"
];

// Legales (0016): los datos del asistente, con sus valores iniciales (los
// mismos defaults del SQL; tests/sql/comparar-semilla.mjs lo revisa).
// legal_publicado lo arma el motor (assets/js/legal/motor.js) al publicar.
export const PLATAFORMA_POR_DEFECTO = "HighLevel (GoHighLevel)";
export const LEGAL_INICIAL = {
  legal_paso: 1, legal_perfil: "", legal_tipo_persona: "", legal_nombre: "", legal_doc_tipo: "", legal_doc_numero: "",
  legal_direccion: "", legal_ciudad: "", legal_correo: "", legal_telefono: "", legal_representante: "",
  legal_matricula_numero: "", legal_matricula_camara: "", legal_direccion_local: "", legal_rnbd: "",
  legal_paises: [], legal_impuestos: [{ nombre: "IVA", porcentaje: null, incluido: null }],
  legal_garantia_nuevos: null, legal_garantia_usados: "", legal_garantia_usados_meses: null, legal_retracto_canal: "",
  legal_entrega: [], legal_entrega_zonas: "", legal_apple_detalle: "", legal_homologados: "",
  legal_clausula_privacidad: "", legal_clausula_terminos: "", legal_clausula_cookies: "", legal_clausula_aviso: "",
  meta_pixel_id: "", ga4_activo: false, ga4_id: "", gtm_activo: false, gtm_id: "", clarity_activo: false, clarity_id: "",
  tiktok_activo: false, tiktok_id: "", gads_activo: false, gads_id: "",
  capi_solo_consentimiento: true, plataforma_sitio: PLATAFORMA_POR_DEFECTO, legal_publicado: null
};
export const CAMPOS_LEGALES = Object.keys(LEGAL_INICIAL);
CAMPOS_TIENDA.push(...CAMPOS_LEGALES);

// Como los checks de 0016 (lo que se puede guardar; lo que falta para
// publicar lo dice faltantes() de motor.js). "" = bien.
const LARGOS_LEGALES = {
  legal_nombre: 160, legal_doc_numero: 20, legal_direccion: 160, legal_ciudad: 80, legal_correo: 160, legal_telefono: 20,
  legal_representante: 160, legal_matricula_numero: 40, legal_matricula_camara: 80, legal_direccion_local: 160,
  legal_entrega_zonas: 200, legal_apple_detalle: 400, legal_clausula_privacidad: 4000, legal_clausula_terminos: 4000,
  legal_clausula_cookies: 4000, legal_clausula_aviso: 4000, meta_pixel_id: 30, ga4_id: 30, gtm_id: 30, clarity_id: 30,
  tiktok_id: 30, gads_id: 30, plataforma_sitio: 80
};
const OPCIONES_LEGALES = {
  legal_perfil: ["", "oficial", "autorizado", "electronica", "no_oficial", "emprendedor", "particular"],
  legal_tipo_persona: ["", "natural", "juridica"], legal_doc_tipo: ["", "cc", "nit", "ce"], legal_rnbd: ["", "si", "no"],
  legal_garantia_usados: ["", "con", "sin"], legal_retracto_canal: ["", "correo", "whatsapp"], legal_homologados: ["", "si", "no"]
};
export const CODIGOS_PAISES_SQL = ["ar", "bo", "br", "cl", "co", "cr", "cu", "ec", "sv", "gt", "hn", "mx", "ni", "pa", "py", "pe", "do", "uy", "ve"];
export function errorLegales(t) {
  const MAL = "Algún dato no tiene el formato correcto. Revise los campos.";
  for (const [k, max] of Object.entries(LARGOS_LEGALES)) if (typeof t[k] !== "string" || t[k].length > max) return MAL;
  for (const [k, op] of Object.entries(OPCIONES_LEGALES)) if (!op.includes(t[k])) return MAL;
  const meses = (v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 120);
  if (!Number.isInteger(t.legal_paso) || t.legal_paso < 1 || t.legal_paso > 6) return MAL;
  if (!Array.isArray(t.legal_paises) || t.legal_paises.some((p) => !CODIGOS_PAISES_SQL.includes(p))) return MAL;
  if (!Array.isArray(t.legal_entrega) || t.legal_entrega.some((e) => !["retiro", "transportadora", "personal"].includes(e))) return MAL;
  if (!Array.isArray(t.legal_impuestos) || t.legal_impuestos.length > 6) return MAL;
  if (!meses(t.legal_garantia_nuevos) || !meses(t.legal_garantia_usados_meses)) return MAL;
  for (const k of ["ga4_activo", "gtm_activo", "clarity_activo", "tiktok_activo", "gads_activo", "capi_solo_consentimiento"]) if (typeof t[k] !== "boolean") return MAL;
  if (t.legal_publicado !== null && (typeof t.legal_publicado !== "object" || Array.isArray(t.legal_publicado))) return MAL;
  return "";
}

// Reseñas (0014): hasta 12; imagen o video de hasta 30 segundos.
export const CAMPOS_RESENA = ["tipo", "ruta", "texto", "origen", "origen_otro", "autorizado", "orden"];
export const MAX_RESENAS = 12;
export const MENSAJE_MAX_RESENAS = "Ya tiene 12 reseñas. Borre una para agregar otra.";
export const MAX_SEGUNDOS_RESENA = 30;
export const TITULO_RESENAS = "Lo que dicen nuestros clientes";
export const ORIGENES_RESENA = [
  { clave: "instagram", texto: "Instagram" },
  { clave: "whatsapp", texto: "WhatsApp" },
  { clave: "google", texto: "Google" },
  { clave: "otro", texto: "Otro" }
];
// Como los checks de la tabla resenas
export const RUTA_RESENA = { imagen: /^resenas\/[A-Za-z0-9_-]+\.(webp|jpg|png)$/, video: /^resenas\/[A-Za-z0-9_-]+\.(mp4|webm)$/ };

// El origen que se muestra (texto, sin logos). "Otro" sin nombre no se muestra.
export function textoOrigen(r) {
  if (r?.origen === "otro") return String(r.origen_otro || "").trim();
  return ORIGENES_RESENA.find((o) => o.clave === r?.origen)?.texto || "";
}

// Formas de pago (0013). Las claves son las de los checks del SQL.
export const MEDIOS_PAGO = [
  { clave: "transferencia", texto: "Transferencia bancaria" },
  { clave: "efectivo", texto: "Efectivo" },
  { clave: "debito", texto: "Tarjeta débito" },
  { clave: "credito", texto: "Tarjeta de crédito" }
];
export const PASARELAS_PAGO = [
  { clave: "mercado_pago", texto: "Mercado Pago" },
  { clave: "pse", texto: "PSE" },
  { clave: "nequi", texto: "Nequi" },
  { clave: "daviplata", texto: "Daviplata" },
  { clave: "wompi", texto: "Wompi" },
  { clave: "bold", texto: "Bold" },
  { clave: "otra", texto: "Otra" }
];
export const MIN_CUOTAS = 2;
export const MAX_CUOTAS = 48;

// Las reglas de validar_pagos (0013), con los mismos mensajes. "" = bien.
export function errorPagos(t) {
  const entre = (n) => Number.isInteger(n) && n >= MIN_CUOTAS && n <= MAX_CUOTAS;
  if (!(t.pagos_medios || []).every((m) => MEDIOS_PAGO.some((x) => x.clave === m)) ||
      !(t.pagos_pasarelas || []).every((m) => PASARELAS_PAGO.some((x) => x.clave === m))) return "Algún dato no tiene el formato correcto. Revise los campos.";
  if (t.pagos_cuotas) {
    if (!entre(t.pagos_cuotas_max)) return "Indique hasta cuántas cuotas acepta: de 2 a 48.";
    if (t.pagos_sin_interes) {
      if (!entre(t.pagos_sin_interes_max)) return "Indique hasta cuántas cuotas sin interés ofrece: de 2 a 48.";
      if (t.pagos_sin_interes_max > t.pagos_cuotas_max) return "Las cuotas sin interés no pueden ser más que el máximo de cuotas.";
    } else if (t.pagos_sin_interes_max != null) return "Sin cuotas sin interés, deje vacío hasta cuántas.";
  } else if (t.pagos_cuotas_max != null || t.pagos_sin_interes || t.pagos_sin_interes_max != null) {
    return "Sin pagos a cuotas, los datos de cuotas quedan vacíos.";
  }
  if (!t.pagos_cripto && t.pagos_cripto_cuales) return "Sin criptomonedas, deje vacío cuáles.";
  if (String(t.pagos_cripto_cuales || "").length > 120 || String(t.pagos_pasarela_otra || "").length > 60) return "Algún dato no tiene el formato correcto. Revise los campos.";
  if ((t.pagos_pasarelas || []).includes("otra")) {
    if (!String(t.pagos_pasarela_otra || "").trim()) return "Escriba el nombre de la otra pasarela.";
  } else if (t.pagos_pasarela_otra) return "Sin «Otra» pasarela, deje vacío el nombre.";
  return "";
}

function unirConY(lista) {
  return lista.length < 2 ? lista.join("") : `${lista.slice(0, -1).join(", ")} y ${lista.at(-1)}`;
}
const sinPunto = (s) => String(s || "").trim().replace(/\.+$/, "");

// Las formas de pago del sitio, en frases cortas y solo con lo que marcó la
// tienda. Ej.: "Tarjeta de crédito: hasta 12 cuotas, hasta 6 sin interés."
export function frasesPagos(t) {
  const frases = [];
  const medios = new Set(t?.pagos_medios || []);
  let cuotas = "";
  if (t?.pagos_cuotas && t.pagos_cuotas_max) {
    const max = t.pagos_cuotas_max;
    const sin = t.pagos_sin_interes ? t.pagos_sin_interes_max : null;
    cuotas = sin ? (sin === max ? `hasta ${max} cuotas sin interés` : `hasta ${max} cuotas, hasta ${sin} sin interés`) : `hasta ${max} cuotas`;
  }
  for (const m of MEDIOS_PAGO) {
    if (!medios.has(m.clave)) continue;
    frases.push(m.clave === "credito" && cuotas ? `${m.texto}: ${cuotas}.` : `${m.texto}.`);
  }
  if (cuotas && !medios.has("credito")) frases.push(`Pago a cuotas: ${cuotas}.`);
  if (t?.pagos_cripto) frases.push(sinPunto(t.pagos_cripto_cuales) ? `Criptomonedas: ${sinPunto(t.pagos_cripto_cuales)}.` : "Criptomonedas.");
  const pasarelas = PASARELAS_PAGO.filter((p) => (t?.pagos_pasarelas || []).includes(p.clave))
    .map((p) => (p.clave === "otra" ? sinPunto(t.pagos_pasarela_otra) : p.texto)).filter(Boolean);
  if (pasarelas.length) frases.push(`Pago en línea con ${unirConY(pasarelas)}.`);
  for (const o of t?.pagos_otras || []) if (String(o).trim()) frases.push(String(o).trim());
  return frases;
}

export const CAMPOS_EQUIPO = [
  "modelo_id", "condicion", "capacidad", "color_id", "color_nombre_mostrar", "precio", "en_stock",
  "fotos", "video", "publicado", "destacado", "mas_vendido", "descripcion_extra", "es_demo",
  "bateria_porcentaje", "estado_estetico", "detalles", "incluye"
];

// Colores del catálogo: la tienda completa el hexadecimal que falta y, solo en
// modelos sin colores oficiales, agrega los suyos (igual que proteger_color).
export const CAMPOS_COLOR = ["modelo_id", "nombre_es", "nombre_en", "hex", "orden"];

// Nombre del color que ve el cliente: el que eligió la tienda o, si no, el
// oficial en inglés (o el de la fuente, si no hay nombre en inglés).
export function nombreColor(color, mostrar = "") {
  return String(mostrar || "").trim() || color?.nombre_en || color?.nombre_es || "";
}

// "Más vendido": hasta 3 equipos (igual que limitar_mas_vendidos en 0010).
export const MAX_MAS_VENDIDOS = 3;
export const MENSAJE_MAS_VENDIDOS = "Ya tiene 3 equipos marcados como más vendidos. Desmarque uno para marcar este.";

// Ficha técnica (0012): categorías fijas, en el orden en que se muestran.
// "otras" son las filas que agrega la tienda (sin clave); se muestran al final.
export const CATEGORIAS_FICHA = [
  { clave: "lanzamiento", etiqueta: "Año de lanzamiento" },
  { clave: "procesador", etiqueta: "Procesador" },
  { clave: "pantalla", etiqueta: "Pantalla" },
  { clave: "camaras_traseras", etiqueta: "Cámaras traseras" },
  { clave: "camara_frontal", etiqueta: "Cámara frontal" },
  { clave: "bateria", etiqueta: "Batería" },
  { clave: "versiones", etiqueta: "Versiones del modelo" },
  { clave: "materiales", etiqueta: "Materiales" },
  { clave: "puertos", etiqueta: "Puertos y carga" },
  { clave: "dimensiones", etiqueta: "Dimensiones y peso" },
  { clave: "otras", etiqueta: "Otras filas de la tienda" }
];
export const MAX_ETIQUETA_FICHA = 60;
export const MAX_VALOR_FICHA = 600;
const CLAVES_FIJAS = CATEGORIAS_FICHA.map((c) => c.clave).filter((c) => c !== "otras");

// Como validar_ficha (0012).
export function especificacionesValidas(lista) {
  if (!Array.isArray(lista)) return false;
  const vistas = new Set();
  for (const f of lista) {
    if (!f || typeof f !== "object" || typeof f.etiqueta !== "string" || typeof f.valor !== "string") return false;
    if (f.etiqueta.length > MAX_ETIQUETA_FICHA || f.valor.length > MAX_VALOR_FICHA) return false;
    if (f.clave != null) {
      if (!CLAVES_FIJAS.includes(f.clave) || vistas.has(f.clave)) return false;
      vistas.add(f.clave);
    }
  }
  return true;
}

// Lo que el sitio muestra de una ficha: nada si la tienda apagó la ficha;
// si no, las categorías encendidas que tienen valor, en el orden fijo, y al
// final las filas de la tienda (si "otras" está encendida).
export function filasVisiblesFicha(ficha, tienda) {
  if (tienda?.mostrar_ficha === false) return [];
  const ocultas = new Set(tienda?.ficha_ocultas || []);
  const lista = (ficha?.especificaciones || []).filter((f) => String(f?.etiqueta || "").trim() && String(f?.valor || "").trim());
  const orden = (f) => (f.clave ? CLAVES_FIJAS.indexOf(f.clave) : CLAVES_FIJAS.length);
  return lista
    .filter((f) => !ocultas.has(f.clave || "otras"))
    .map((f, i) => ({ f, i }))
    .sort((a, b) => orden(a.f) - orden(b.f) || a.i - b.i)
    .map(({ f }) => ({ clave: f.clave || null, etiqueta: f.etiqueta.trim(), valor: f.valor.trim() }));
}

export const TAMANOS_TEXTO = ["compacto", "normal", "grande"];
export const VISTAS_EQUIPOS = ["cuadricula", "carrusel"];

export const ESTADOS_ESTETICOS = ["Como nuevo", "Excelente", "Muy bueno", "Bueno"];

export function elegir(objeto, campos) {
  const r = {};
  for (const c of campos) if (objeto[c] !== undefined) r[c] = objeto[c];
  return r;
}

// Traduce los errores de Postgres / PostgREST a mensajes para el usuario.
export function mensajeDeError(error) {
  const texto = String(error?.message || error || "");
  const codigo = error?.code || "";
  if (codigo === "42501" || /row-level security|permission denied/i.test(texto)) {
    // Los mensajes de los disparadores ya están en español para el usuario.
    return !texto || /row-level security|permission denied/i.test(texto) ? "Su usuario no tiene permiso para hacer este cambio." : texto;
  }
  if (codigo === "23505") return "Ya existe un registro con ese nombre.";
  if (codigo === "23503") return /colores|color_id/.test(texto) ? "No se puede borrar: hay equipos con este color." : "No se puede borrar: hay equipos cargados con este modelo.";
  if (codigo === "23514") return /violates check constraint/i.test(texto) || !texto ? "Algún dato no tiene el formato correcto. Revise los campos." : texto;
  if (/Failed to fetch|NetworkError|network/i.test(texto)) return "No hay conexión. Revise su internet e inténtelo de nuevo.";
  return texto || "Algo salió mal. Inténtelo de nuevo.";
}
