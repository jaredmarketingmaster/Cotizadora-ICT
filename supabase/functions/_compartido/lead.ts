// Validación y armado del lead que va a GHL. Sin dependencias de Deno, para
// poder probarlo también con Node (tests/funciones.test.mjs).

export const CAMPOS_ATRIBUCION = ["utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ad_id", "fbclid"];

export const CAMPOS_OCULTOS = [
  "modelo", "condicion", "capacidad", "color", "precio_cotizado", "equipo_id",
  "tipo_consulta", "codigo_cotizacion", ...CAMPOS_ATRIBUCION
];

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
  if (!/^\+573\d{9}$/.test(telefono)) return { error: "telefono" };
  if (tipo !== "compra" && tipo !== "sin stock") return { error: "tipo_consulta" };
  if (!/^COT-[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{4}$/.test(codigo)) return { error: "codigo_cotizacion" };

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
    codigo_cotizacion: codigo
  };
  for (const c of CAMPOS_ATRIBUCION) lead[c] = texto(datos[c], 500);
  // Datos técnicos útiles para el workflow
  lead.event_id = codigo;
  lead.pagina = texto(datos.pagina, 300);
  lead.enviado_en = texto(datos.enviado_en, 40);
  return { lead };
}
