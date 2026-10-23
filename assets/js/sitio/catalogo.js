// =============================================================================
// Lógica del catálogo público: filtros encadenados, opciones con stock,
// tarjetas de la galería, diapositivas del detalle y mensajes de WhatsApp.
// Funciones puras (sin DOM), para poder probarlas solas.
// =============================================================================

import { capacidadEnGB, formatearPrecio, fechaCorta } from "../utils.js";
import { datosPais, paisActual } from "../datos/paises.js";
import { nombreColor } from "../datos/comun.js";
import { preciosEquipo, textosPrecio, valorPrincipal } from "../datos/precios.js";
import { t as tr } from "../i18n/i18n.js";

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
  // Precios (0038 y 0039): precio queda con el descuento de las promos;
  // precio_lista es el cargado. usd y usd_lista, en U$D (null sin dólar).
  // valor ordena y compara en la moneda que se muestra; textos, lo que se ve.
  const tienda = datos.tienda || {};
  const equipos = (datos.equipos || [])
    .filter((q) => porId.has(q.modelo_id) && q.publicado && q.en_stock)
    .map((q) => {
      const color = colores.get(q.color_id) || null;
      const modelo = porId.get(q.modelo_id);
      const p = preciosEquipo(q, tienda, modelo.slug);
      const e = {
        ...q, modelo, color, color_nombre: nombreColor(color, q.color_nombre_mostrar), color_hex: color?.hex || "",
        precio_lista: p.lista, precio: p.precio, descuento: p.descuento, usd_lista: p.usdLista, usd: p.usd
      };
      e.valor = valorPrincipal(e, tienda);
      e.textos = textosPrecio(e, tienda);
      return e;
    });
  return { tienda, porId, porSlug, fichas, colores, equipos, resenas: datos.resenas || [] };
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
  return /^(\d+|X)/.test(generacion) ? tr("sitio.generacion", { generacion }) : generacion;
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
  return (b.destacado - a.destacado) || (a.valor - b.valor) || a.color_nombre.localeCompare(b.color_nombre);
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
    t.precioMin = Math.min(...t.equipos.map((q) => q.valor));
    t.desde = new Set(t.equipos.map((q) => q.valor)).size > 1;
    // El equipo del precio que se muestra (el más barato) y su descuento.
    t.equipoMin = t.equipos.find((q) => q.valor === t.precioMin);
    // Stock contado (0040): el cartel, si todos sus equipos lo cuentan y entre
    // todos quedan 5 o menos.
    const bajos = t.equipos.map((q) => q.stock_bajo);
    t.stockBajo = bajos.every((n) => Number.isInteger(n)) && bajos.reduce((s, n) => s + n, 0) <= 5 ? bajos.reduce((s, n) => s + n, 0) : null;
    t.esDemo = t.equipos.some((q) => q.es_demo);
    // "Más vendido": si cualquiera de sus equipos lo es. No cambia el orden.
    t.masVendido = t.equipos.some((q) => q.mas_vendido);
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

// "Cambio actualizado el 23/10/2026 · U$D 1 = $1.234,50" (0038), si la tienda
// muestra dólares con cotización.
export function textoCambio(tienda) {
  const c = Number(tienda?.usd_cotizacion);
  if (!tienda?.usd_modo || tienda.usd_modo === "no" || !(c > 0) || !tienda.usd_actualizado_en) return "";
  return tr("sitio.precio.cambio", { fecha: fechaCorta(tienda.usd_actualizado_en), cotizacion: formatearCotizacion(c) });
}

// La cotización con hasta 2 decimales, con los separadores del país.
export function formatearCotizacion(c) {
  const [entero, dec] = Number(c).toFixed(2).split(".");
  const conMiles = formatearPrecio(Number(entero));
  return dec === "00" ? conMiles : `${conMiles}${datosPais(paisActual()).miles === "," ? "." : ","}${dec}`;
}

// Textos en el idioma de la tienda (i18n): se piden al usarlos, no al cargar.
export const textoMasVendido = () => tr("sitio.mas_vendido");

// idioma (opcional): forzar uno, p. ej. "es" para un dato que no depende del sitio.
export function textoCondicion(condicion, idioma) {
  return tr(condicion === "usado" ? "sitio.condicion.usado" : "sitio.condicion.nuevo", undefined, idioma);
}

export function textoAlternativo(q) {
  return [q.modelo.nombre, q.capacidad, q.color_nombre && tr("sitio.alt.color", { color: q.color_nombre })].filter(Boolean).join(", ");
}

// Lo que el cliente buscó (para el mensaje "sin stock").
export function describirBusqueda(cat, { condicion, modelo, capacidad }) {
  const nombre = (modelo && cat.porSlug.get(modelo)?.nombre) || "iPhone";
  const textoCond = condicion && tr(condicion === "usado" ? "sitio.busqueda.usado" : "sitio.busqueda.nuevo");
  return [nombre, textoCond, capacidad && tr("sitio.busqueda.capacidad", { capacidad })].filter(Boolean).join(" ");
}

export function mensajeCompra(q, codigo, nombre) {
  const lineas = [
    tr("sitio.wa.saludo_compra"),
    `${q.modelo.nombre} ${textoCondicion(q.condicion)}`,
    [q.capacidad, q.color_nombre].filter(Boolean).join(" · "),
    tr("sitio.wa.precio", { precio: textoPrecioMensaje(q) })
  ];
  // Promos (0039): el descuento y el precio de lista.
  if (q.descuento) lineas.push(tr("sitio.wa.descuento", { n: q.descuento, lista: q.textos?.tachado || formatearPrecio(q.precio_lista ?? q.precio) }));
  if (q.condicion === "usado") {
    const usado = [
      q.bateria_porcentaje != null && tr("sitio.wa.bateria", { n: q.bateria_porcentaje }),
      q.estado_estetico && tr("sitio.wa.estado", { estado: q.estado_estetico })
    ].filter(Boolean).join(" · ");
    if (usado) lineas.push(usado);
  }
  lineas.push(tr("sitio.wa.codigo", { codigo }), tr("sitio.wa.soy", { nombre: nombre.trim() }));
  return lineas.join("\n");
}

// El precio del mensaje: el que se ve, con el de U$D entre paréntesis si es de
// apoyo (0038). Sin dólar ni promos, el mismo de siempre.
function textoPrecioMensaje(q) {
  if (!q.textos) return formatearPrecio(q.precio);
  return q.textos.apoyo ? `${q.textos.principal} (${q.textos.apoyo})` : q.textos.principal;
}

export function mensajeSinStock(busqueda, codigo, nombre) {
  return tr("sitio.wa.sin_stock", { busqueda, codigo, nombre: nombre.trim() });
}

// México (0033): en el enlace va un 1 después del 52 (521 + 10 dígitos); el
// número guardado sigue siendo 52 + 10 dígitos.
export function enlaceWhatsApp(numero, mensaje) {
  const n = /^52\d{10}$/.test(String(numero)) ? `521${String(numero).slice(2)}` : numero;
  return `https://wa.me/${n}?text=${encodeURIComponent(mensaje)}`;
}
