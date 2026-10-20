// =============================================================================
// Función "enviar-lead": recibe el pedido del pop-up y lo reenvía al Inbound
// Webhook de un workflow de GHL, que crea o actualiza el contacto con los
// campos personalizados. No guarda nada en Supabase.
//
// Secretos (supabase secrets set ...):
//   GHL_WEBHOOK_URL       URL del Inbound Webhook del workflow (obligatorio)
//   ORIGENES_PERMITIDOS   dominios del sitio separados por coma (opcional;
//                         vacío = cualquiera). Ej. https://tienda.com
//
// Se publica sin verificación de JWT (la llama el público):
//   supabase functions deploy enviar-lead --no-verify-jwt
// =============================================================================

import { armarLead } from "../_compartido/lead.ts";

const permitidos = (Deno.env.get("ORIGENES_PERMITIDOS") || "")
  .split(",").map((s) => s.trim().replace(/\/+$/, "")).filter(Boolean);

function cabeceras(origen: string | null): HeadersInit {
  const permitir = !permitidos.length ? "*" : origen && permitidos.includes(origen) ? origen : permitidos[0];
  return {
    "Access-Control-Allow-Origin": permitir,
    "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
    "Content-Type": "application/json"
  };
}

function responder(cuerpo: unknown, estado: number, origen: string | null) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: cabeceras(origen) });
}

Deno.serve(async (req) => {
  const origen = req.headers.get("origin");
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: cabeceras(origen) });
  if (req.method !== "POST") return responder({ ok: false, error: "método" }, 405, origen);
  if (permitidos.length && origen && !permitidos.includes(origen)) return responder({ ok: false, error: "origen" }, 403, origen);

  let datos: Record<string, unknown>;
  try {
    datos = await req.json();
  } catch {
    return responder({ ok: false, error: "json" }, 400, origen);
  }
  const { lead, error } = armarLead(datos);
  if (!lead) return responder({ ok: false, error }, 400, origen);

  const url = Deno.env.get("GHL_WEBHOOK_URL");
  if (!url) {
    console.error("Falta el secreto GHL_WEBHOOK_URL");
    return responder({ ok: false, error: "configuración" }, 500, origen);
  }

  try {
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(lead),
      signal: AbortSignal.timeout(10000)
    });
    if (!r.ok) {
      // Sin datos personales en los registros: solo el estado y el código.
      console.error(`GHL respondió ${r.status} para ${lead.codigo_cotizacion}`);
      return responder({ ok: false, error: "ghl" }, 502, origen);
    }
  } catch (e) {
    console.error(`No se pudo contactar a GHL para ${lead.codigo_cotizacion}: ${e instanceof Error ? e.name : "error"}`);
    return responder({ ok: false, error: "ghl" }, 502, origen);
  }
  return responder({ ok: true }, 200, origen);
});
