// PostgREST simulado para la función catalogo-feed: responde
// POST /rest/v1/rpc/datos_publicos con una tienda de prueba (inventada).
//   node tests/funciones/datos-simulados.mjs <puerto> [sin_url]
import http from "node:http";

const [puerto, modo] = process.argv.slice(2);
const datos = {
  tienda: { nombre: "Tienda de prueba", pais: "ar", idioma: "es", url_sitio: modo === "sin_url" ? "" : "https://tienda.com.ar" },
  modelos: [{ id: 1, nombre: "iPhone 15 Pro", slug: "iphone-15-pro", activo: true }],
  colores: [{ id: 10, modelo_id: 1, nombre_es: "Titanio negro", nombre_en: "Black Titanium" }],
  equipos: [
    { id: "e1", modelo_id: 1, condicion: "nuevo", capacidad: "128 GB", color_id: 10, color_nombre_mostrar: "", precio: 1500000, publicado: true, en_stock: true, es_demo: false, fotos: ["equipos/e1.webp"] },
    { id: "e2", modelo_id: 1, condicion: "nuevo", capacidad: "256 GB", color_id: 10, color_nombre_mostrar: "", precio: 1800000, publicado: true, en_stock: true, es_demo: false, fotos: [] }
  ],
  resenas: [], fichas: []
};
http.createServer((req, res) => {
  if (req.method === "POST" && req.url === "/rest/v1/rpc/datos_publicos" && req.headers.apikey === "anon-de-prueba") {
    res.writeHead(200, { "content-type": "application/json" });
    res.end(JSON.stringify(datos));
    return;
  }
  res.writeHead(401); res.end("{}");
}).listen(Number(puerto), "127.0.0.1");
