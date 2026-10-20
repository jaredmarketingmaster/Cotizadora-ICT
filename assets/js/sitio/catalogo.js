// =============================================================================
// Lógica del catálogo público: filtros encadenados, opciones con stock,
// tarjetas de la galería, diapositivas del detalle y mensajes de WhatsApp.
// Funciones puras (sin DOM), para poder probarlas solas.
// =============================================================================

import { capacidadEnGB, formatearCOP } from "../utils.js";
import { nombreColor } from "../datos/comun.js";

// Recencia de cada generación = el mayor "orden" de sus modelos en el catálogo.
// Así el plegable (último del catálogo) y los modelos que se agreguen después
// quedan ordenados sin escribir las generaciones en el código.
export function prepararCatalogo(datos) {
  const modelos = [...(datos.modelos || [])].sort((a, b) => a.orden - b.orden);
  const recencia = new Map();
  for (const m of modelos) recencia.set(m.generacion, Math.max(recencia.get(m.generacion) ?? -Infinity, m.orden));
  const porId = new Map(modelos.map((m) => [m.id, { ...m, recencia: recencia.get(m.generacion) }]));
  const porSlug = new Map([...porId.values()].map((m) => [m.slug, m]));
  const fichas = new Map((datos.fichas || []).map((f) => [f.modelo_id, f]));
  const colores = new Map((datos.colores || []).map((c) => [c.id, c]));
  // El color de cada equipo sale del color oficial: color_nombre es el nombre
  // que ve el cliente (el que eligió la tienda o el oficial) y color_hex la
  // muestra oficial ("" si la fuente no la tiene: muestra neutra).
  const equipos = (datos.equipos || [])
    .filter((q) => porId.has(q.modelo_id) && q.publicado && q.en_stock)
    .map((q) => {
      const color = colores.get(q.color_id) || null;
      return { ...q, modelo: porId.get(q.modelo_id), color, color_nombre: nombreColor(color, q.color_nombre_mostrar), color_hex: color?.hex || "" };
    });
  return { tienda: datos.tienda || {}, porId, porSlug, fichas, colores, equipos };
}

export function filtrar(equipos, { condicion = "", modelo = "", capacidad = "" } = {}) {
  return equipos.filter((q) =>
    (!condicion || q.condicion === condicion) &&
    (!modelo || q.modelo.slug === modelo) &&
    (!capacidad || q.capacidad === capacidad));
}

// El stock es sí/no: se cuentan equipos (variantes y usados), no unidades.
export function contarEquipos(equipos) {
  return equipos.length;
}

// Modelos con stock para la condición elegida, agrupados por generación de la
// más nueva a la más vieja. Dentro del grupo, en el orden del catálogo.
export function opcionesModelo(cat, condicion) {
  const lista = filtrar(cat.equipos, { condicion });
  const cantidades = new Map();
  for (const q of lista) cantidades.set(q.modelo_id, (cantidades.get(q.modelo_id) || 0) + 1);
  const grupos = new Map();
  for (const [id, cantidad] of cantidades) {
    const m = cat.porId.get(id);
    if (!grupos.has(m.generacion)) grupos.set(m.generacion, { generacion: m.generacion, recencia: m.recencia, opciones: [] });
    grupos.get(m.generacion).opciones.push({ slug: m.slug, nombre: m.nombre, orden: m.orden, cantidad });
  }
  return [...grupos.values()]
    .sort((a, b) => b.recencia - a.recencia)
    .map((g) => ({ ...g, opciones: g.opciones.sort((a, b) => a.orden - b.orden) }));
}

// "11" → "Generación 11"; "XS y XR" → "Generación XS y XR"; un grupo con
// nombre propio ("Plegable") queda igual.
export function etiquetaGeneracion(generacion) {
  return /^(\d+|X)/.test(generacion) ? `Generación ${generacion}` : generacion;
}

export function opcionesCapacidad(cat, condicion, modelo) {
  const caps = new Set(filtrar(cat.equipos, { condicion, modelo }).map((q) => q.capacidad));
  return [...caps].sort((a, b) => capacidadEnGB(a) - capacidadEnGB(b) || a.localeCompare(b));
}

// Si un cambio deja inválida una elección posterior, se limpia.
// Devuelve los filtros corregidos y qué se limpió.
export function encadenar(cat, filtros) {
  const f = { ...filtros };
  const limpiados = [];
  if (f.modelo && !opcionesModelo(cat, f.condicion).some((g) => g.opciones.some((o) => o.slug === f.modelo))) {
    f.modelo = ""; limpiados.push("modelo");
  }
  if (f.capacidad && !opcionesCapacidad(cat, f.condicion, f.modelo).includes(f.capacidad)) {
    f.capacidad = ""; limpiados.push("capacidad");
  }
  return { filtros: f, limpiados };
}

function ordenarEquipos(a, b) {
  return (b.destacado - a.destacado) || (a.precio - b.precio) || a.color_nombre.localeCompare(b.color_nombre);
}

// Nuevos: una tarjeta por modelo + capacidad (los colores van como muestras).
// Usados: una tarjeta por unidad.
export function tarjetas(equipos) {
  const lista = [];
  const grupos = new Map();
  for (const q of equipos) {
    if (q.condicion === "usado") {
      lista.push({ clave: `u:${q.id}`, condicion: "usado", modelo: q.modelo, capacidad: q.capacidad, equipos: [q] });
      continue;
    }
    const clave = `n:${q.modelo_id}:${q.capacidad}`;
    if (!grupos.has(clave)) {
      const t = { clave, condicion: "nuevo", modelo: q.modelo, capacidad: q.capacidad, equipos: [] };
      grupos.set(clave, t);
      lista.push(t);
    }
    grupos.get(clave).equipos.push(q);
  }
  for (const t of lista) {
    t.equipos.sort(ordenarEquipos);
    t.destacado = t.equipos.some((q) => q.destacado);
    t.precioMin = Math.min(...t.equipos.map((q) => q.precio));
    t.desde = new Set(t.equipos.map((q) => q.precio)).size > 1;
    t.esDemo = t.equipos.some((q) => q.es_demo);
  }
  // Destacados primero, después la generación más nueva, después el precio.
  return lista.sort((a, b) =>
    (b.destacado - a.destacado) ||
    (b.modelo.recencia - a.modelo.recencia) ||
    (a.precioMin - b.precioMin) ||
    (b.modelo.orden - a.modelo.orden) ||
    (capacidadEnGB(a.capacidad) - capacidadEnGB(b.capacidad)) ||
    a.clave.localeCompare(b.clave));
}

// Diapositivas del carrusel: los colores del grupo (nuevos) o todas las
// unidades del mismo modelo y capacidad (usados), empezando por la elegida.
export function diapositivas(cat, tarjeta) {
  if (tarjeta.condicion === "nuevo") return { lista: tarjeta.equipos, inicial: 0 };
  const lista = cat.equipos
    .filter((q) => q.condicion === "usado" && q.modelo_id === tarjeta.modelo.id && q.capacidad === tarjeta.capacidad)
    .sort(ordenarEquipos);
  return { lista, inicial: Math.max(0, lista.findIndex((q) => q.id === tarjeta.equipos[0].id)) };
}

export function textoCondicion(condicion) {
  return condicion === "usado" ? "Usado" : "Nuevo";
}

export function textoAlternativo(q) {
  return [q.modelo.nombre, q.capacidad, q.color_nombre && `color ${q.color_nombre}`].filter(Boolean).join(", ");
}

// Lo que el cliente buscó (para el mensaje "sin stock").
export function describirBusqueda(cat, { condicion, modelo, capacidad }) {
  const nombre = (modelo && cat.porSlug.get(modelo)?.nombre) || "iPhone";
  return [nombre, condicion, capacidad && `de ${capacidad}`].filter(Boolean).join(" ");
}

export function mensajeCompra(q, codigo, nombre) {
  const lineas = [
    "Hola, quiero comprar este equipo:",
    `${q.modelo.nombre} ${textoCondicion(q.condicion)}`,
    [q.capacidad, q.color_nombre].filter(Boolean).join(" · "),
    `Precio: ${formatearCOP(q.precio)}`
  ];
  if (q.condicion === "usado") {
    const usado = [
      q.bateria_porcentaje != null && `Batería ${q.bateria_porcentaje}%`,
      q.estado_estetico && `Estado: ${q.estado_estetico}`
    ].filter(Boolean).join(" · ");
    if (usado) lineas.push(usado);
  }
  lineas.push(`Código: ${codigo}`, `Soy ${nombre.trim()}.`);
  return lineas.join("\n");
}

export function mensajeSinStock(busqueda, codigo, nombre) {
  return `Hola, busco un ${busqueda}. ¿Lo tienen disponible? Código: ${codigo}. Soy ${nombre.trim()}.`;
}

export function enlaceWhatsApp(numero, mensaje) {
  return `https://wa.me/${numero}?text=${encodeURIComponent(mensaje)}`;
}
