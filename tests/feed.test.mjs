// Archivo XML de productos (supabase/functions/_compartido/feed.js, ronda 3, C4), sin navegador:
//   node tests/feed.test.mjs
import assert from "node:assert/strict";
import { armarFeed, analizarFeed, itemFeed, urlBase, MONEDAS, TEXTOS_FEED } from "../supabase/functions/_compartido/feed.js";
import { PAISES_TIENDA } from "../assets/js/datos/paises.js";
import { nombreColor, ESTADOS_ESTETICOS } from "../assets/js/datos/comun.js";

let casos = 0;
const caso = (nombre, fn) => { fn(); casos++; console.log(`ok   ${nombre}`); };
const modelos = [{ id: 1, nombre: "iPhone 15 Pro", slug: "iphone-15-pro", activo: true }, { id: 2, nombre: "iPhone 7", slug: "iphone-7", activo: false }];
const colores = [{ id: 10, modelo_id: 1, nombre_es: "Titanio negro", nombre_en: "Black Titanium" }];
const base = { publicado: true, en_stock: true, es_demo: false, fotos: ["equipos/a.webp", "equipos/b.webp"], color_id: 10, color_nombre_mostrar: "" };
const equipos = [
  { ...base, id: "u1", modelo_id: 1, condicion: "usado", capacidad: "128 GB", precio: 3500000, bateria_porcentaje: 87, estado_estetico: "Muy bueno", descripcion_extra: "Con caja & cargador." },
  { ...base, id: "n1", modelo_id: 1, condicion: "nuevo", capacidad: "256 GB", precio: 5299000, color_nombre_mostrar: "Negro" },
  { ...base, id: "x1", modelo_id: 1, condicion: "nuevo", capacidad: "256 GB", precio: 1, fotos: [] },
  { ...base, id: "x2", modelo_id: 1, condicion: "nuevo", capacidad: "256 GB", precio: 1, publicado: false },
  { ...base, id: "x3", modelo_id: 1, condicion: "nuevo", capacidad: "256 GB", precio: 1, en_stock: false },
  { ...base, id: "x4", modelo_id: 2, condicion: "nuevo", capacidad: "32 GB", precio: 1 },
  { ...base, id: "x5", modelo_id: 1, condicion: "nuevo", capacidad: "256 GB", precio: 1, es_demo: true }
];
const tienda = { nombre: "La 70 & Cía", pais: "co", idioma: "es", url_sitio: "https://tienda.co" };
const urlFoto = (r) => `https://x.supabase.co/storage/v1/object/public/fotos/${r}`;

caso("las monedas y el nombre del color son los mismos del sitio", () => {
  assert.deepEqual(MONEDAS, Object.fromEntries(Object.entries(PAISES_TIENDA).map(([c, p]) => [c, p.moneda])));
  for (const [c, m] of [[colores[0], ""], [colores[0], "Negro"], [{ nombre_es: "Rosa", nombre_en: "" }, ""]]) assert.equal(itemFeed({ ...equipos[0], color_nombre_mostrar: m, color_id: c === colores[0] ? 10 : 99 }, { tienda, modelos, colores: c === colores[0] ? colores : [{ id: 99, ...c }], urlFoto }).color, nombreColor(c, m));
  for (const idioma of Object.keys(TEXTOS_FEED)) assert.deepEqual(Object.keys(TEXTOS_FEED[idioma].estados), ESTADOS_ESTETICOS, idioma);
});

caso("solo los públicos con foto, y el motivo de los demás", () => {
  const { incluidos, excluidos } = analizarFeed({ modelos, equipos });
  assert.deepEqual(incluidos.map((q) => q.id), ["u1", "n1"]);
  assert.deepEqual(excluidos.map((x) => [x.equipo.id, x.motivo]), [["x1", "sin_foto"], ["x2", "sin_publicar"], ["x3", "sin_stock"], ["x4", "modelo_inactivo"], ["x5", "demo"]]);
});

caso("cada producto: título, descripción, enlace ?equipo=, fotos, condición, precio con moneda, marca, color y grupo", () => {
  const xml = armarFeed({ tienda, modelos, colores, equipos }, { formato: "google", urlFoto });
  assert.ok(xml.startsWith('<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0" xmlns:g="http://base.google.com/ns/1.0">'));
  assert.equal((xml.match(/<item>/g) || []).length, 2);
  for (const x of ["<title>La 70 &amp; Cía</title>", "<link>https://tienda.co/</link>",
    "<g:id>u1</g:id>", "<title>iPhone 15 Pro 128 GB Black Titanium - Usado</title>",
    "<description>iPhone 15 Pro, 128 GB, color Black Titanium, usado. Batería al 87 %. Estado: Muy bueno. Con caja &amp; cargador.</description>",
    "<link>https://tienda.co/?equipo=u1</link>", "<g:image_link>https://x.supabase.co/storage/v1/object/public/fotos/equipos/a.webp</g:image_link>",
    "<g:additional_image_link>https://x.supabase.co/storage/v1/object/public/fotos/equipos/b.webp</g:additional_image_link>",
    "<g:availability>in_stock</g:availability>", "<g:condition>used</g:condition>", "<g:price>3500000.00 COP</g:price>",
    "<g:brand>Apple</g:brand>", "<g:color>Black Titanium</g:color>", "<g:item_group_id>iphone-15-pro-128-gb</g:item_group_id>",
    "<title>iPhone 15 Pro 256 GB Negro - Nuevo</title>", "<g:condition>new</g:condition>", "<g:price>5299000.00 COP</g:price>"]) assert.ok(xml.includes(x), x);
  assert.ok(!xml.includes("google_product_category"), "sin categoría (no verificada)");
  // Las etiquetas abren y cierran parejas
  const abiertas = [...xml.matchAll(/<([a-z:_]+)[ >]/g)].map((m) => m[1]).sort();
  const cerradas = [...xml.matchAll(/<\/([a-z:_]+)>/g)].map((m) => m[1]).sort();
  assert.deepEqual(abiertas, cerradas);
});

caso("Meta: in stock; en portugués y en reales; sin dirección no hay enlace", () => {
  const meta = armarFeed({ tienda, modelos, colores, equipos }, { formato: "meta", urlFoto });
  assert.ok(meta.includes("<g:availability>in stock</g:availability>"));
  const pt = armarFeed({ tienda: { ...tienda, idioma: "pt", pais: "br" }, modelos, colores, equipos }, { formato: "google", urlFoto });
  assert.ok(pt.includes("<title>iPhone 15 Pro 128 GB Black Titanium - Usado</title>") && pt.includes("<title>iPhone 15 Pro 256 GB Negro - Novo</title>"));
  assert.ok(pt.includes("Bateria em 87 %. Estado: Muito bom.") && pt.includes("<g:price>5299000.00 BRL</g:price>"));
  assert.equal(urlBase(""), "");
  assert.equal(urlBase("http://tienda.co"), "");
  assert.equal(urlBase("https://tienda.co/catalogo"), "https://tienda.co/catalogo/");
});

console.log(`\nOK: ${casos} casos del archivo XML`);
