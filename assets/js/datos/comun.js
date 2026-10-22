// =============================================================================
// Reglas de datos compartidas por los dos back-ends (demo y Supabase).
// - Idioma: los mensajes que ve la persona salen de los diccionarios (claves
//   datos.*), traducidos al usarlos. Los valores que se guardan en la base
//   (TITULO_RESENAS, PLATAFORMA_POR_DEFECTO, "IVA", las claves) quedan en
//   español. Los mensajes del SQL y de las funciones llegan en español:
//   traducirServidor() los pasa al idioma en uso.
// =============================================================================

import { t, idiomaActual } from "../i18n/i18n.js";

// Un texto que se traduce cada vez que se usa como texto (para las constantes
// exportadas, que se leen antes de cargar el idioma).
const traducible = (clave) => {
  const texto = () => t(clave);
  return { toString: texto, valueOf: texto, toJSON: texto, [Symbol.toPrimitive]: texto };
};

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
  const tipo = bucket === "videos" ? "video" : bucket === "resenas" ? "resena" : "foto";
  return t(`datos.archivo.${tipo}.${motivo === "peso" ? "peso" : "tipo"}`);
}

// Ruta del video de un equipo (igual que el check de equipos.video en 0009).
export const RUTA_VIDEO = /^equipos\/[A-Za-z0-9_-]+\.(mp4|webm)$/;
export const LADO_MINIATURA = 640;

export function rutaMiniatura(ruta) {
  return String(ruta).replace(/(\.[a-z0-9]+)$/i, `-${LADO_MINIATURA}$1`);
}

export const CAMPOS_TIENDA = [
  "nombre", "pais", "idioma", "ciudad", "direccion", "horario_texto", "whatsapp", "correo_contacto",
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
export function errorLegales(tienda) {
  const MAL = t("datos.error.formato");
  for (const [k, max] of Object.entries(LARGOS_LEGALES)) if (typeof tienda[k] !== "string" || tienda[k].length > max) return MAL;
  for (const [k, op] of Object.entries(OPCIONES_LEGALES)) if (!op.includes(tienda[k])) return MAL;
  const meses = (v) => v === null || (Number.isInteger(v) && v >= 1 && v <= 120);
  if (!Number.isInteger(tienda.legal_paso) || tienda.legal_paso < 1 || tienda.legal_paso > 6) return MAL;
  if (!Array.isArray(tienda.legal_paises) || tienda.legal_paises.some((p) => !CODIGOS_PAISES_SQL.includes(p))) return MAL;
  if (!Array.isArray(tienda.legal_entrega) || tienda.legal_entrega.some((e) => !["retiro", "transportadora", "personal"].includes(e))) return MAL;
  if (!Array.isArray(tienda.legal_impuestos) || tienda.legal_impuestos.length > 6) return MAL;
  if (!meses(tienda.legal_garantia_nuevos) || !meses(tienda.legal_garantia_usados_meses)) return MAL;
  for (const k of ["ga4_activo", "gtm_activo", "clarity_activo", "tiktok_activo", "gads_activo", "capi_solo_consentimiento"]) if (typeof tienda[k] !== "boolean") return MAL;
  if (tienda.legal_publicado !== null && (typeof tienda.legal_publicado !== "object" || Array.isArray(tienda.legal_publicado))) return MAL;
  return "";
}

// Reseñas (0014): hasta 12; imagen o video de hasta 30 segundos.
export const CAMPOS_RESENA = ["tipo", "ruta", "texto", "origen", "origen_otro", "autorizado", "orden"];
export const MAX_RESENAS = 12;
// Se traduce al usarlo como texto (t("datos.error.max_resenas")).
export const MENSAJE_MAX_RESENAS = traducible("datos.error.max_resenas");
export const MAX_SEGUNDOS_RESENA = 30;
export const TITULO_RESENAS = "Lo que dicen nuestros clientes";
export const ORIGENES_RESENA = [
  { clave: "instagram", texto: "Instagram" },
  { clave: "whatsapp", texto: "WhatsApp" },
  { clave: "google", texto: "Google" },
  { clave: "otro", texto: "Otro" }
];
// El nombre de un origen que se muestra en el panel, en el idioma en uso
// (`texto` queda como dato en español; los demás son marcas).
export const nombreOrigenResena = (clave) => (clave === "otro" ? t("datos.resena.origen.otro") : ORIGENES_RESENA.find((o) => o.clave === clave)?.texto || "");
// Como los checks de la tabla resenas
export const RUTA_RESENA = { imagen: /^resenas\/[A-Za-z0-9_-]+\.(webp|jpg|png)$/, video: /^resenas\/[A-Za-z0-9_-]+\.(mp4|webm)$/ };

// El origen que se muestra (texto, sin logos). "Otro" sin nombre no se muestra.
export function textoOrigen(r) {
  if (r?.origen === "otro") return String(r.origen_otro || "").trim();
  return nombreOrigenResena(r?.origen);
}

// Formas de pago (0013). Las claves son las de los checks del SQL. `texto`
// queda como dato en español; lo que se muestra sale de nombreMedioPago() y
// nombrePasarela() (idioma en uso).
export const MEDIOS_PAGO = [
  { clave: "transferencia", texto: "Transferencia bancaria" },
  { clave: "efectivo", texto: "Efectivo" },
  { clave: "debito", texto: "Tarjeta débito" },
  { clave: "credito", texto: "Tarjeta de crédito" }
];
export const nombreMedioPago = (clave, idioma = idiomaActual()) => t(`datos.pago.medio.${clave}`, undefined, idioma);
export const PASARELAS_PAGO = [
  { clave: "mercado_pago", texto: "Mercado Pago" },
  { clave: "pse", texto: "PSE" },
  { clave: "nequi", texto: "Nequi" },
  { clave: "daviplata", texto: "Daviplata" },
  { clave: "wompi", texto: "Wompi" },
  { clave: "bold", texto: "Bold" },
  { clave: "otra", texto: "Otra" }
];
// Las pasarelas son marcas; solo "Otra" se traduce.
export const nombrePasarela = (clave) => (clave === "otra" ? t("datos.pago.pasarela.otra") : PASARELAS_PAGO.find((p) => p.clave === clave)?.texto || "");
export const MIN_CUOTAS = 2;
export const MAX_CUOTAS = 48;

// Las reglas de validar_pagos (0013), con los mismos mensajes. "" = bien.
export function errorPagos(tienda) {
  const entre = (n) => Number.isInteger(n) && n >= MIN_CUOTAS && n <= MAX_CUOTAS;
  if (!(tienda.pagos_medios || []).every((m) => MEDIOS_PAGO.some((x) => x.clave === m)) ||
      !(tienda.pagos_pasarelas || []).every((m) => PASARELAS_PAGO.some((x) => x.clave === m))) return t("datos.error.formato");
  if (tienda.pagos_cuotas) {
    if (!entre(tienda.pagos_cuotas_max)) return t("datos.error.cuotas_max");
    if (tienda.pagos_sin_interes) {
      if (!entre(tienda.pagos_sin_interes_max)) return t("datos.error.sin_interes_max");
      if (tienda.pagos_sin_interes_max > tienda.pagos_cuotas_max) return t("datos.error.sin_interes_mayor");
    } else if (tienda.pagos_sin_interes_max != null) return t("datos.error.sin_interes_vacio");
  } else if (tienda.pagos_cuotas_max != null || tienda.pagos_sin_interes || tienda.pagos_sin_interes_max != null) {
    return t("datos.error.cuotas_vacias");
  }
  if (!tienda.pagos_cripto && tienda.pagos_cripto_cuales) return t("datos.error.cripto_vacio");
  if (String(tienda.pagos_cripto_cuales || "").length > 120 || String(tienda.pagos_pasarela_otra || "").length > 60) return t("datos.error.formato");
  if ((tienda.pagos_pasarelas || []).includes("otra")) {
    if (!String(tienda.pagos_pasarela_otra || "").trim()) return t("datos.error.pasarela_otra");
  } else if (tienda.pagos_pasarela_otra) return t("datos.error.pasarela_otra_vacia");
  return "";
}

function unirConY(lista, idioma) {
  return lista.length < 2 ? lista.join("") : t("datos.pagos.lista", { lista: lista.slice(0, -1).join(", "), ultimo: lista.at(-1) }, idioma);
}
const sinPunto = (s) => String(s || "").trim().replace(/\.+$/, "");

// Las formas de pago del sitio, en frases cortas y solo con lo que marcó la
// tienda. Ej.: "Tarjeta de crédito: hasta 12 cuotas, hasta 6 sin interés."
// En el idioma en uso; el motor legal pide "es" (los documentos van en español).
export function frasesPagos(tienda, idioma = idiomaActual()) {
  const tx = (clave, vars) => t(clave, vars, idioma);
  const frases = [];
  const medios = new Set(tienda?.pagos_medios || []);
  let cuotas = "";
  if (tienda?.pagos_cuotas && tienda.pagos_cuotas_max) {
    const max = tienda.pagos_cuotas_max;
    const sin = tienda.pagos_sin_interes ? tienda.pagos_sin_interes_max : null;
    cuotas = sin ? (sin === max ? tx("datos.pagos.cuotas_sin_interes", { max }) : tx("datos.pagos.cuotas_y_sin_interes", { max, sin })) : tx("datos.pagos.cuotas", { max });
  }
  for (const m of MEDIOS_PAGO) {
    if (!medios.has(m.clave)) continue;
    const nombre = nombreMedioPago(m.clave, idioma);
    frases.push(m.clave === "credito" && cuotas ? tx("datos.pagos.medio_con_cuotas", { medio: nombre, cuotas }) : tx("datos.pagos.medio", { medio: nombre }));
  }
  if (cuotas && !medios.has("credito")) frases.push(tx("datos.pagos.a_cuotas", { cuotas }));
  if (tienda?.pagos_cripto) frases.push(sinPunto(tienda.pagos_cripto_cuales) ? tx("datos.pagos.cripto_cuales", { cuales: sinPunto(tienda.pagos_cripto_cuales) }) : tx("datos.pagos.cripto"));
  const pasarelas = PASARELAS_PAGO.filter((p) => (tienda?.pagos_pasarelas || []).includes(p.clave))
    .map((p) => (p.clave === "otra" ? sinPunto(tienda.pagos_pasarela_otra) : p.texto)).filter(Boolean);
  if (pasarelas.length) frases.push(tx("datos.pagos.en_linea", { pasarelas: unirConY(pasarelas, idioma) }));
  for (const o of tienda?.pagos_otras || []) if (String(o).trim()) frases.push(String(o).trim());
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
// Se traduce al usarlo como texto (t("datos.error.mas_vendidos")).
export const MENSAJE_MAS_VENDIDOS = traducible("datos.error.mas_vendidos");

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
// `etiqueta` es un dato en español (fichas.js y semilla.js la guardan en la
// base). Lo que se muestra en el panel: etiquetaCategoriaFicha(clave).
export const etiquetaCategoriaFicha = (clave) => t(`datos.ficha.${clave}`);
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

// Los mensajes del servidor (disparadores y validaciones del SQL, funciones)
// que tienen clave: el SQL los escribe en español, igual que demo.js.
const ERRORES_SERVIDOR = [
  "formato", "permiso", "duplicado", "sesion", "solo_gestor.cambio", "solo_gestor.tienda", "solo_gestor.catalogo",
  "solo_gestor.resenas", "solo_gestor.borrar_demo", "solo_gestor.modo_demo", "solo_administrador", "un_administrador",
  "propio_rol", "desactivarse", "correo_existe", "elija_rol", "elija_color", "color_modelo", "mas_vendidos", "max_resenas",
  "ficha", "cuotas_max", "sin_interes_max", "sin_interes_mayor", "sin_interes_vacio", "cuotas_vacias", "cripto_vacio",
  "pasarela_otra", "pasarela_otra_vacia", "color_oficial_nombre", "color_hex_fuente", "colores_oficiales",
  "colores_fuente", "color_oficial_borrar", "borrar_color_en_uso", "sin_legales_demo", "sin_legales_borrar",
  "legales_quitar", "legales_faltan", "whatsapp_pais", "correo", "metodo", "pedido_invalido", "invitacion_perfil",
  "cambiar_usuario", "accion_desconocida"
];

// Un mensaje del servidor en español → el mismo mensaje en el idioma en uso.
// Si no tiene clave, queda como llegó.
export function traducirServidor(texto) {
  const s = String(texto ?? "");
  if (!s || idiomaActual() === "es") return s;
  const clave = ERRORES_SERVIDOR.find((k) => t(`datos.error.${k}`, undefined, "es") === s);
  return clave ? t(`datos.error.${clave}`) : s;
}

// Traduce los errores de Postgres / PostgREST a mensajes para el usuario.
export function mensajeDeError(error) {
  const texto = String(error?.message || error || "");
  const codigo = error?.code || "";
  if (codigo === "42501" || /row-level security|permission denied/i.test(texto)) {
    // Los mensajes de los disparadores ya están escritos para el usuario (en español).
    return !texto || /row-level security|permission denied/i.test(texto) ? t("datos.error.permiso") : traducirServidor(texto);
  }
  if (codigo === "23505") return t("datos.error.duplicado");
  if (codigo === "23503") return /colores|color_id/.test(texto) ? t("datos.error.borrar_color_en_uso") : t("datos.error.borrar_modelo_en_uso");
  if (codigo === "23514") return /violates check constraint/i.test(texto) || !texto ? t("datos.error.formato") : traducirServidor(texto);
  if (/Failed to fetch|NetworkError|network/i.test(texto)) return t("datos.error.conexion");
  return traducirServidor(texto) || t("datos.error.generico");
}
