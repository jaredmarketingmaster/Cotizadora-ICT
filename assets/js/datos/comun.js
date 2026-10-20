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
  videos: { max: 20 * 1024 * 1024, tipos: ["video/mp4", "video/webm"] }
};

// Mensaje cuando Storage rechaza un archivo (por peso o por tipo).
export function mensajeArchivo(bucket, motivo) {
  if (bucket === "videos") return motivo === "peso" ? "El video pesa más de 20 MB." : "Este formato puede no verse en todos los celulares. Súbalo en MP4.";
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
  "color_primario", "color_secundario", "tema", "texto_entrega", "formas_pago",
  "texto_garantia_nuevos", "texto_garantia_usados", "etiqueta_precio",
  "texto_privacidad", "texto_terminos", "texto_autorizacion_datos", "aviso_marca", "modo_demo",
  "tamano_texto"
];

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

export const TAMANOS_TEXTO = ["compacto", "normal", "grande"];

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
