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
  "nombre", "ciudad", "direccion", "horario_texto", "whatsapp", "correo_contacto",
  "instagram_url", "facebook_url", "tiktok_url", "logo", "favicon",
  "color_primario", "color_secundario", "tema", "texto_entrega", "pagos_otras",
  "texto_garantia_nuevos", "texto_garantia_usados", "etiqueta_precio",
  "texto_privacidad", "texto_terminos", "texto_autorizacion_datos", "aviso_marca", "modo_demo",
  "tamano_texto", "vista_equipos", "mostrar_ficha", "ficha_ocultas",
  "pagos_medios", "pagos_cuotas", "pagos_cuotas_max", "pagos_sin_interes", "pagos_sin_interes_max",
  "pagos_cripto", "pagos_cripto_cuales", "pagos_pasarelas", "pagos_pasarela_otra",
  "mostrar_resenas", "titulo_resenas", "legales_revisados", "legales_herramientas"
];

// Textos legales (0015). {{nombre}}, {{ciudad}}, {{direccion}}, {{correo}} y
// {{herramientas}} se reemplazan por los datos de la tienda; un dato vacío
// queda como [PENDIENTE: …] (el nombre vacío, como "la tienda").
// prepararLegal quita las marcas [PENDIENTE: …] y lo que queda vacío por
// ellas (un ítem "- Etiqueta:" sin valor, el "…:" de una lista que quedó
// vacía, un título sin contenido) y dice qué faltaba. El sitio nunca
// muestra una marca.
const MARCA_PENDIENTE = /\[PENDIENTE:([^\]]*)\]/g;

export function expandirLegal(texto, tienda = {}) {
  const dato = (v, falta) => String(v || "").trim() || `[PENDIENTE: ${falta}]`;
  const herramientas = (tienda.legales_herramientas || []).map((h) => String(h).trim()).filter(Boolean);
  const valores = {
    nombre: String(tienda.nombre || "").trim() || "la tienda",
    ciudad: dato(tienda.ciudad, "ciudad"),
    direccion: dato(tienda.direccion, "dirección"),
    correo: dato(tienda.correo_contacto, "correo de contacto"),
    herramientas: herramientas.length ? herramientas.map((h) => `- ${h}`).join("\n") : "[PENDIENTE: herramientas]"
  };
  return String(texto || "").replace(/\{\{(\w+)\}\}/g, (m, k) => (k in valores ? valores[k] : m));
}

export function prepararLegal(texto, tienda = {}) {
  const expandido = expandirLegal(texto, tienda).replace(/\r\n?/g, "\n");
  const pendientes = [...expandido.matchAll(MARCA_PENDIENTE)].map((m) => m[1].trim());
  const lineas = expandido.replace(MARCA_PENDIENTE, "").split("\n")
    .map((l) => l.replace(/[ \t]+$/, "").replace(/ {2,}/g, " "))
    // Un ítem que quedó sin valor ("- Correo:" o "-") no se muestra.
    .filter((l) => !/^\s*[-*]\s*([^:]*:)?\s*$/.test(l));
  // Un párrafo que presenta una lista ("…:") cuya lista quedó vacía tampoco.
  const conLista = lineas.filter((l, i) => {
    if (!/:\s*$/.test(l) || /^\s*[-*]\s/.test(l)) return true;
    const siguiente = lineas.slice(i + 1).find((x) => x.trim());
    return Boolean(siguiente) && /^\s*([-*]|\d+[.)])\s/.test(siguiente);
  });
  // Un título sin nada debajo (hasta el próximo título) tampoco.
  const limpias = conLista.filter((l, i) => {
    if (!/^#{2,3}\s/.test(l.trim())) return true;
    const siguiente = conLista.slice(i + 1).find((x) => x.trim());
    return Boolean(siguiente) && !/^#{2,3}\s/.test(siguiente.trim());
  });
  return { texto: limpias.join("\n").replace(/\n{3,}/g, "\n\n").trim(), pendientes };
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
