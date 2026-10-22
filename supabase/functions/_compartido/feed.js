// =============================================================================
// Archivo XML de productos (ronda 3, C4): RSS 2.0 con el espacio de nombres g:
// de Google Merchant Center (xmlns:g="http://base.google.com/ns/1.0"), que
// también lee el catálogo de Meta. Lo usan la función catalogo-feed (Deno) y
// el panel (pestaña "Archivo XML": vista previa y, en demo, la descarga).
// JS puro y sin importaciones, para que la función lo pueda empaquetar.
//
// Fuentes (consultadas con el buscador el 21/10/2026; las páginas oficiales no
// se pudieron abrir desde aquí, ver DOCUMENTACION.md):
//   - Google, especificación RSS 2.0: https://support.google.com/merchants/answer/14987622
//     (g:id, g:title, g:description, g:link, g:image_link, g:condition,
//     g:availability, g:price "49.99 USD").
//   - Google, availability: https://support.google.com/merchants/answer/6324448 (in_stock).
//   - condition: new / used / refurbished.
//   - Meta: https://developers.facebook.com/docs/marketing-api/catalog/reference/
//     (feeds RSS XML; availability "in stock"; brand).
// g:google_product_category NO va: el número de "Teléfonos móviles" solo se
// encontró en fuentes de terceros.
//
// Solo van los equipos públicos (publicado, con stock y de un modelo activo),
// con al menos una foto y que no sean de demostración.
// =============================================================================

// La moneda de cada país (igual a PAISES_TIENDA de assets/js/datos/paises.js;
// tests/feed.test.mjs lo compara).
export const MONEDAS = {
  ar: "ARS", bo: "BOB", br: "BRL", cl: "CLP", co: "COP", cr: "CRC", cu: "CUP", ec: "USD", sv: "USD", gt: "GTQ",
  hn: "HNL", mx: "MXN", ni: "NIO", pa: "USD", py: "PYG", pe: "PEN", do: "DOP", uy: "UYU", ve: "VES"
};

// Lo que el archivo dice en el idioma de la tienda (los nombres de los
// productos y su descripción). Los estados estéticos son los de
// ESTADOS_ESTETICOS (comun.js).
export const TEXTOS_FEED = {
  es: {
    nuevo: "Nuevo", usado: "Usado", descripcion: "{modelo}, {capacidad}, color {color}, {condicion}.",
    bateria: "Batería al {n} %.", estado: "Estado: {estado}.", canal: "Equipos de {tienda}",
    estados: { "Como nuevo": "Como nuevo", "Excelente": "Excelente", "Muy bueno": "Muy bueno", "Bueno": "Bueno" }
  },
  pt: {
    nuevo: "Novo", usado: "Usado", descripcion: "{modelo}, {capacidad}, cor {color}, {condicion}.",
    bateria: "Bateria em {n} %.", estado: "Estado: {estado}.", canal: "Aparelhos de {tienda}",
    estados: { "Como nuevo": "Como novo", "Excelente": "Excelente", "Muy bueno": "Muito bom", "Bueno": "Bom" }
  }
};

export const FORMATOS_FEED = ["google", "meta"];
const DISPONIBLE = { google: "in_stock", meta: "in stock" };

const conVariables = (s, v) => s.replace(/\{(\w+)\}/g, (m, k) => (k in v ? String(v[k]) : m));
const slug = (s) => String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
export const escaparXML = (s) => String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&apos;" })[c]);

// El nombre del color que ve el cliente (igual que nombreColor de comun.js).
const nombreColor = (color, mostrar) => String(mostrar || "").trim() || color?.nombre_en || color?.nombre_es || "";

// La dirección del sitio, con barra al final; "" si no es https.
export function urlBase(url) {
  const u = String(url || "").trim();
  if (!/^https:\/\/[^\s/]+\.[^\s]+$/.test(u)) return "";
  return u.endsWith("/") ? u : `${u}/`;
}

// Separa lo que va al archivo de lo que no, con el motivo:
// "demo", "sin_publicar", "sin_stock", "modelo_inactivo", "sin_foto".
export function analizarFeed({ modelos, equipos }) {
  const modelo = new Map(modelos.map((m) => [m.id, m]));
  const incluidos = [];
  const excluidos = [];
  for (const q of equipos) {
    const m = modelo.get(q.modelo_id);
    const motivo = q.es_demo ? "demo" : !q.publicado ? "sin_publicar" : !q.en_stock ? "sin_stock"
      : !m?.activo ? "modelo_inactivo" : !(q.fotos || []).length ? "sin_foto" : "";
    (motivo ? excluidos : incluidos).push(motivo ? { equipo: q, motivo } : q);
  }
  return { incluidos, excluidos };
}

// Los datos de un producto del archivo (también para la vista previa del panel).
export function itemFeed(q, { tienda, modelos, colores, urlFoto }) {
  const idioma = TEXTOS_FEED[tienda.idioma] ? tienda.idioma : "es";
  const tx = TEXTOS_FEED[idioma];
  const m = modelos.find((x) => x.id === q.modelo_id) || {};
  const color = nombreColor(colores.find((c) => c.id === q.color_id), q.color_nombre_mostrar);
  const condicion = q.condicion === "usado" ? tx.usado : tx.nuevo;
  const extra = [
    q.condicion === "usado" && Number.isInteger(q.bateria_porcentaje) ? conVariables(tx.bateria, { n: q.bateria_porcentaje }) : "",
    q.condicion === "usado" && q.estado_estetico ? conVariables(tx.estado, { estado: tx.estados[q.estado_estetico] || q.estado_estetico }) : "",
    String(q.descripcion_extra || "").trim()
  ].filter(Boolean);
  const fotos = (q.fotos || []).map(urlFoto);
  return {
    id: String(q.id),
    titulo: [m.nombre, q.capacidad, color].filter(Boolean).join(" ") + ` - ${condicion}`,
    descripcion: [conVariables(tx.descripcion, { modelo: m.nombre, capacidad: q.capacidad, color: color || "-", condicion: condicion.toLowerCase() }), ...extra].join(" "),
    enlace: `${urlBase(tienda.url_sitio)}?equipo=${encodeURIComponent(q.id)}`,
    imagen: fotos[0] || "",
    imagenes: fotos.slice(1, 11),
    condicion: q.condicion === "usado" ? "used" : "new",
    precio: `${Number(q.precio).toFixed(2)} ${MONEDAS[tienda.pais] || "COP"}`,
    color,
    grupo: `${m.slug || q.modelo_id}-${slug(q.capacidad)}`
  };
}

// El archivo completo. datos: { tienda, modelos, colores, equipos } (los de
// datos_publicos o los del panel); urlFoto(ruta): la dirección pública de la foto.
export function armarFeed(datos, { formato = "google", urlFoto }) {
  const f = FORMATOS_FEED.includes(formato) ? formato : "google";
  const { tienda } = datos;
  const idioma = TEXTOS_FEED[tienda.idioma] ? tienda.idioma : "es";
  const items = analizarFeed(datos).incluidos.map((q) => itemFeed(q, { ...datos, urlFoto }));
  const e = escaparXML;
  const linea = (etiqueta, valor) => (valor ? `      <${etiqueta}>${e(valor)}</${etiqueta}>\n` : "");
  const cuerpo = items.map((i) => "    <item>\n"
    + linea("g:id", i.id) + linea("title", i.titulo) + linea("description", i.descripcion) + linea("link", i.enlace)
    + linea("g:image_link", i.imagen) + i.imagenes.map((u) => linea("g:additional_image_link", u)).join("")
    + linea("g:availability", DISPONIBLE[f]) + linea("g:condition", i.condicion) + linea("g:price", i.precio)
    + linea("g:brand", "Apple") + linea("g:color", i.color) + linea("g:item_group_id", i.grupo)
    + "    </item>\n").join("");
  const nombre = String(tienda.nombre || "").trim();
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">
  <channel>
    <title>${e(nombre)}</title>
    <link>${e(urlBase(tienda.url_sitio))}</link>
    <description>${e(conVariables(TEXTOS_FEED[idioma].canal, { tienda: nombre }))}</description>
${cuerpo}  </channel>
</rss>
`;
}
