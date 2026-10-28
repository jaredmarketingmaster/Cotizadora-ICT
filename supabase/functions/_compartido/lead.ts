// Validación y armado del lead que va a GHL. Sin dependencias de Deno, para
// poder probarlo también con Node (tests/funciones.test.mjs).

export const CAMPOS_ATRIBUCION = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ad_id", "fbclid"];

export const CAMPOS_OCULTOS = [
  "modelo", "condicion", "capacidad", "color", "precio_cotizado", "equipo_id",
  "tipo_consulta", "codigo_cotizacion", ...CAMPOS_ATRIBUCION
];

// Solicitudes de la página /solicitudes/ (PQR en Colombia): van por la misma
// función, con código SOL-XXXX (el radicado) y el texto de la solicitud en
// "detalle". Los datos solo van a GHL. Sin "arrepentimiento" desde 0041 (Jared
// quitó el botón de arrepentimiento de Argentina).
export const TIPOS_SOLICITUD = ["peticion", "queja", "reclamo"];

const CODIGO = (prefijo: string) => new RegExp(`^${prefijo}-[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{4}$`);

// consentimiento_transferencia: Argentina (0031), el envío a Estados Unidos,
// nombrado en la única casilla del formulario desde 0042 (false si la tienda no
// vende a Argentina). consentimiento_promociones: desde 0042 no hay casilla de
// promociones y llega siempre false (sigue en el pedido para no romper los
// workflows de GHL que leen el campo).
export const CAMPOS_CONSENTIMIENTO = ["consentimiento_datos", "consentimiento_promociones", "consentimiento_medicion", "consentimiento_publicidad", "consentimiento_transferencia"];

type Datos = Record<string, unknown>;

function texto(v: unknown, max = 500): string {
  return typeof v === "string" ? v.trim().slice(0, max) : typeof v === "number" ? String(v) : "";
}

// Devuelve { lead } si todo está bien, o { error } con el motivo.
export function armarLead(datos: Datos): { lead?: Datos; error?: string } {
  const nombre = texto(datos.nombre, 80);
  const correo = texto(datos.correo, 120);
  const telefono = texto(datos.telefono, 20);
  const tipo = texto(datos.tipo_consulta, 20);
  const codigo = texto(datos.codigo_cotizacion, 20);

  if (nombre.length < 2) return { error: "nombre" };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return { error: "correo" };
  // E.164: + y de 8 a 15 dígitos (el formato de cada país lo valida el pop-up).
  if (!/^\+\d{8,15}$/.test(telefono)) return { error: "telefono" };
  const solicitud = TIPOS_SOLICITUD.includes(tipo);
  if (!solicitud && tipo !== "compra" && tipo !== "sin stock") return { error: "tipo_consulta" };
  if (!CODIGO(solicitud ? "SOL" : "COT").test(codigo)) return { error: "codigo_cotizacion" };
  const detalle = solicitud ? texto(datos.detalle, 1000) : "";
  if (solicitud && detalle.length < 10) return { error: "detalle" };
  const relacionada = solicitud ? texto(datos.cotizacion_relacionada, 20).toUpperCase() : "";
  if (relacionada && !CODIGO("COT").test(relacionada)) return { error: "cotizacion_relacionada" };
  // Consentimiento (0016): la autorización de datos es obligatoria; la versión
  // de los textos y la fecha con zona horaria, también.
  if (datos.consentimiento_datos !== true) return { error: "consentimiento_datos" };
  const version = datos.version_politica;
  if (typeof version !== "number" || !Number.isSafeInteger(version) || version < 1) return { error: "version_politica" };
  const fecha = texto(datos.fecha_consentimiento, 40);
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{1,3})?([+-]\d{2}:\d{2}|Z)$/.test(fecha) || Number.isNaN(Date.parse(fecha))) return { error: "fecha_consentimiento" };

  const precio = datos.precio_cotizado;
  const lead: Datos = {
    // Campos estándar del contacto
    name: nombre,
    email: correo,
    phone: telefono,
    // Campos ocultos (campos personalizados del contacto)
    modelo: texto(datos.modelo, 80),
    condicion: texto(datos.condicion, 20),
    capacidad: texto(datos.capacidad, 20),
    color: texto(datos.color, 40),
    precio_cotizado: typeof precio === "number" && Number.isSafeInteger(precio) && precio > 0 ? precio : "",
    equipo_id: texto(datos.equipo_id, 40),
    tipo_consulta: tipo,
    codigo_cotizacion: codigo,
    // Solo en las solicitudes (vacíos en las cotizaciones).
    detalle,
    cotizacion_relacionada: relacionada
  };
  for (const c of CAMPOS_ATRIBUCION) lead[c] = texto(datos[c], 500);
  // Consentimiento: GHL debe revisar consentimiento_publicidad antes de la API
  // de Conversiones. consentimiento_promociones llega siempre false (0042): con
  // estos datos no se envían promociones.
  for (const c of CAMPOS_CONSENTIMIENTO) lead[c] = datos[c] === true;
  lead.version_politica = version;
  lead.fecha_consentimiento = fecha;
  // Datos técnicos útiles para el workflow
  lead.event_id = codigo;
  lead.pagina = texto(datos.pagina, 300);
  lead.enviado_en = texto(datos.enviado_en, 40);
  return { lead };
}
