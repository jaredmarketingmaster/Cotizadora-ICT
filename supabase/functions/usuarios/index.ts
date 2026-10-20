// =============================================================================
// Función "usuarios" (solo administrador activo): invitar por correo con su
// rol, desactivar y reactivar. El cambio de rol va directo a la tabla perfiles
// (política perfiles_editar). La base exige que quede un administrador activo.
// Usa la clave de servicio, que Supabase ya pone en las variables de entorno de
// las funciones (SUPABASE_URL, SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).
// Nunca llega al navegador.
//
//   supabase functions deploy usuarios
// =============================================================================

import { createClient } from "npm:@supabase/supabase-js@2.117.2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "apikey, authorization, content-type, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json"
};

function responder(cuerpo: unknown, estado = 200) {
  return new Response(JSON.stringify(cuerpo), { status: estado, headers: CORS });
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { status: 204, headers: CORS });
  if (req.method !== "POST") return responder({ error: "Método no permitido." }, 405);

  const url = Deno.env.get("SUPABASE_URL")!;
  const servicio = createClient(url, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

  // Quién llama: el token de su sesión.
  const token = (req.headers.get("authorization") || "").replace(/^Bearer\s+/i, "");
  const { data: quien, error: errorQuien } = await servicio.auth.getUser(token);
  if (errorQuien || !quien.user) return responder({ error: "Su sesión terminó. Vuelva a iniciar sesión." }, 401);
  const { data: perfil } = await servicio.from("perfiles").select("rol, activo").eq("user_id", quien.user.id).maybeSingle();
  if (!perfil?.activo || perfil.rol !== "administrador") return responder({ error: "Solo el administrador puede gestionar usuarios." }, 403);

  let datos: Record<string, string>;
  try { datos = await req.json(); } catch { return responder({ error: "Pedido inválido." }, 400); }

  if (datos.accion === "invitar") {
    const correo = String(datos.correo || "").trim().toLowerCase();
    const rol = datos.rol === "administrador" ? "administrador" : "gestor";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(correo)) return responder({ error: "Revise el correo." }, 400);
    // Si ya tiene perfil no se invita de nuevo: GoTrue reenviaría la
    // invitación a un usuario que todavía no la aceptó.
    const { data: existente } = await servicio.from("perfiles").select("user_id").eq("correo", correo).maybeSingle();
    if (existente) return responder({ error: "Ese correo ya tiene usuario." }, 400);
    const { data, error } = await servicio.auth.admin.inviteUserByEmail(correo, {
      redirectTo: typeof datos.redirectTo === "string" ? datos.redirectTo : undefined
    });
    if (error || !data.user) {
      const ya = /already|registered|exists/i.test(error?.message || "");
      return responder({ error: ya ? "Ese correo ya tiene usuario." : "No se pudo enviar la invitación. Revise la configuración de correo de Supabase." }, 400);
    }
    const { error: errorPerfil } = await servicio.from("perfiles").insert({ user_id: data.user.id, correo, rol, activo: true });
    if (errorPerfil) return responder({ error: "Se envió la invitación pero no se pudo crear el perfil." }, 500);
    return responder({ ok: true });
  }

  if (datos.accion === "desactivar" || datos.accion === "reactivar") {
    const id = String(datos.user_id || "");
    if (id === quien.user.id) return responder({ error: "No puede desactivarse a sí mismo." }, 400);
    const activo = datos.accion === "reactivar";
    const { error } = await servicio.from("perfiles").update({ activo }).eq("user_id", id);
    // perfiles_proteger: siempre debe quedar un administrador activo.
    if (error && /al menos un administrador/i.test(error.message)) return responder({ error: error.message }, 400);
    if (error) return responder({ error: "No se pudo cambiar el usuario." }, 500);
    // Además se bloquea (o desbloquea) el inicio de sesión.
    await servicio.auth.admin.updateUserById(id, { ban_duration: activo ? "none" : "876000h" });
    return responder({ ok: true });
  }

  return responder({ error: "Acción desconocida." }, 400);
});
