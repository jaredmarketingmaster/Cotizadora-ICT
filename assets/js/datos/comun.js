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
  "modelo_id", "condicion", "capacidad", "color_nombre", "color_hex", "precio", "en_stock",
  "fotos", "publicado", "destacado", "descripcion_extra", "es_demo",
  "bateria_porcentaje", "estado_estetico", "detalles", "incluye"
];

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
    return /agencia/i.test(texto) ? texto : "Su usuario no tiene permiso para hacer este cambio.";
  }
  if (codigo === "23505") return "Ya existe un registro con ese nombre.";
  if (codigo === "23503") return "No se puede borrar: hay equipos cargados con este modelo.";
  if (codigo === "23514") return "Algún dato no tiene el formato correcto. Revise los campos.";
  if (/Failed to fetch|NetworkError|network/i.test(texto)) return "No hay conexión. Revise su internet e inténtelo de nuevo.";
  return texto || "Algo salió mal. Inténtelo de nuevo.";
}
