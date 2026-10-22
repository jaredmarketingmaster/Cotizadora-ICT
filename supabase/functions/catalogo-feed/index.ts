// =============================================================================
// Función "catalogo-feed" (ronda 3, C4): el archivo XML de productos para
// Google Merchant Center y el catálogo de Meta (RSS 2.0 con g:).
//   GET /functions/v1/catalogo-feed?formato=google   (o formato=meta)
// Lee lo público con datos_publicos() (la misma RPC del sitio, con la clave
// anon) y arma el archivo con _compartido/feed.js. Solo van los equipos
// públicos con al menos una foto. Caché corta (15 minutos).
//
// Variables que Supabase ya pone en las funciones: SUPABASE_URL y
// SUPABASE_ANON_KEY. Se publica sin verificación de JWT (la piden Google y Meta):
//   supabase functions deploy catalogo-feed --no-verify-jwt
// =============================================================================

import { armarFeed, urlBase, FORMATOS_FEED } from "../_compartido/feed.js";

const BASE = (Deno.env.get("SUPABASE_URL") || "").replace(/\/+$/, "");
const ANON = Deno.env.get("SUPABASE_ANON_KEY") || "";

function texto(cuerpo: string, estado: number) {
  return new Response(cuerpo, { status: estado, headers: { "Content-Type": "text/plain; charset=utf-8", "Access-Control-Allow-Origin": "*" } });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET, OPTIONS" } });
  if (req.method !== "GET") return texto("Método no permitido.", 405);
  const formato = new URL(req.url).searchParams.get("formato") || "google";
  if (!FORMATOS_FEED.includes(formato)) return texto("formato: google o meta.", 400);
  if (!BASE || !ANON) return texto("Falta la configuración de Supabase.", 500);
  let datos;
  try {
    const r = await fetch(`${BASE}/rest/v1/rpc/datos_publicos`, {
      method: "POST", body: "{}",
      headers: { apikey: ANON, Authorization: `Bearer ${ANON}`, "Content-Type": "application/json" }
    });
    if (!r.ok) return texto("No se pudieron leer los equipos.", 502);
    datos = await r.json();
  } catch {
    return texto("No se pudieron leer los equipos.", 502);
  }
  if (!urlBase(datos?.tienda?.url_sitio)) return texto("Falta la dirección del sitio (Catálogo → Archivo XML).", 409);
  const urlFoto = (ruta: string) => `${BASE}/storage/v1/object/public/fotos/${String(ruta).split("/").map(encodeURIComponent).join("/")}`;
  const xml = armarFeed(datos, { formato, urlFoto });
  return new Response(xml, {
    status: 200,
    headers: { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=900", "Access-Control-Allow-Origin": "*" }
  });
});
