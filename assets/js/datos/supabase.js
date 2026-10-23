// =============================================================================
// Back-end Supabase: base de datos (con seguridad a nivel de fila), usuarios y
// archivos. El sitio público usa fetch directo (sin cargar supabase-js) para
// que pese poco; el panel carga supabase-js desde el CDN.
// =============================================================================

import { CONFIG } from "../../../config.js";
import { ErrorDatos, CAMPOS_TIENDA, CAMPOS_EQUIPO, CAMPOS_COLOR, CAMPOS_RESENA, elegir, mensajeDeError, mensajeArchivo, traducirServidor } from "./comun.js";
import { t as tr } from "../i18n/i18n.js";
import { esPredeterminada, urlPredeterminada } from "./predeterminadas.js";

// Mensaje para la persona, en el idioma en uso (claves datos.error.*).
const msj = (clave) => tr(`datos.error.${clave}`);

const SUPABASE_JS = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm";
const URL_BASE = String(CONFIG.supabase.url || "").replace(/\/+$/, "");
const CLAVE = CONFIG.supabase.anonKey;

// --- Público (fetch) -----------------------------------------------------------

async function pedir(ruta, opciones = {}, ms = 10000) {
  const control = new AbortController();
  const reloj = setTimeout(() => control.abort(), ms);
  try {
    return await fetch(`${URL_BASE}${ruta}`, {
      ...opciones,
      signal: control.signal,
      headers: { apikey: CLAVE, "Content-Type": "application/json", ...(opciones.headers || {}) }
    });
  } finally {
    clearTimeout(reloj);
  }
}

// --- Panel (supabase-js) -------------------------------------------------------

let clientePromesa = null;
let tipoEnlace = "";

function cliente() {
  if (!clientePromesa) {
    // Antes de crear el cliente (que limpia la URL) se anota si se llegó desde
    // un enlace de invitación o de recuperación de contraseña.
    const params = new URLSearchParams(location.hash.replace(/^#/, "") + "&" + location.search.replace(/^\?/, ""));
    tipoEnlace = params.get("type") || "";
    clientePromesa = import(SUPABASE_JS).then(({ createClient }) => {
      // Flujo "implicit": el enlace del correo (invitación o recuperación)
      // funciona aunque se abra en otro navegador o en el celular. Con PKCE
      // solo funcionaría en el mismo navegador donde se pidió.
      const c = createClient(URL_BASE, CLAVE, {
        auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "implicit" }
      });
      c.auth.onAuthStateChange((evento) => {
        if (evento === "PASSWORD_RECOVERY") tipoEnlace = "recovery";
      });
      return c;
    });
  }
  return clientePromesa;
}

function fallo(error) {
  if (!error) return;
  throw new ErrorDatos(mensajeDeError(error), error.code || "");
}

function traducirAuth(error) {
  const t = String(error?.message || "");
  if (/invalid login credentials/i.test(t)) return msj("credenciales");
  if (/email not confirmed/i.test(t)) return msj("no_confirmado");
  if (/banned|user is banned/i.test(t)) return msj("desactivado");
  if (/password should be at least/i.test(t)) return msj("clave_corta");
  if (/rate limit|too many/i.test(t)) return msj("demasiados_intentos");
  if (/same password|different from the old/i.test(t)) return msj("clave_igual");
  return mensajeDeError(error);
}

async function perfilDe(c, user) {
  if (!user) return null;
  const { data, error } = await c.from("perfiles").select("rol, activo").eq("user_id", user.id).maybeSingle();
  if (error || !data || !data.activo) return null;
  return { id: user.id, correo: user.email, rol: data.rol };
}

async function funcion(nombre, cuerpo) {
  const c = await cliente();
  const { data, error } = await c.functions.invoke(nombre, { body: cuerpo });
  if (error) {
    let mensaje = "";
    try { mensaje = (await error.context.json()).error; } catch { /* sin cuerpo */ }
    // La función responde en español: se pasa al idioma en uso.
    throw new ErrorDatos(traducirServidor(mensaje) || msj("accion"));
  }
  return data;
}

export const supabase = {
  tipo: "supabase",

  async iniciar() { await cliente(); },

  // ---------------- Público ----------------
  async cargarPublico() {
    let r;
    try {
      r = await pedir("/rest/v1/rpc/datos_publicos", { method: "POST", body: "{}" });
    } catch (e) {
      throw new ErrorDatos(mensajeDeError(e));
    }
    if (!r.ok) throw new ErrorDatos(msj("cargar_equipos"));
    return r.json();
  },

  urlArchivo(bucket, ruta) {
    if (!ruta) return "";
    if (/^(https?:|data:|blob:)/.test(ruta)) return ruta;
    // Imagen predeterminada del modelo y color: está en el sitio (predeterminadas.js).
    if (bucket === "fotos" && esPredeterminada(ruta)) return urlPredeterminada(ruta);
    return `${URL_BASE}/storage/v1/object/public/${bucket}/${ruta.split("/").map(encodeURIComponent).join("/")}`;
  },

  // Función "enviar-lead": reenvía el pedido a GHL con la clave guardada en los
  // secretos de Supabase. Espera la confirmación (2xx) hasta 12 segundos.
  async enviarLead(payload) {
    try {
      const r = await pedir("/functions/v1/enviar-lead", { method: "POST", body: JSON.stringify(payload) }, 12000);
      if (!r.ok) return { ok: false, error: `HTTP ${r.status}` };
      const data = await r.json().catch(() => ({}));
      return { ok: data.ok !== false };
    } catch (e) {
      return { ok: false, error: String(e?.message || e) };
    }
  },

  // ---------------- Sesión ----------------
  async sesionActual() {
    const c = await cliente();
    const { data } = await c.auth.getSession();
    return perfilDe(c, data.session?.user);
  },

  async iniciarSesion(correo, clave) {
    const c = await cliente();
    const { data, error } = await c.auth.signInWithPassword({ email: String(correo).trim(), password: clave });
    if (error) throw new ErrorDatos(traducirAuth(error));
    const perfil = await perfilDe(c, data.user);
    if (!perfil) {
      await c.auth.signOut();
      throw new ErrorDatos(msj("sin_acceso"));
    }
    return perfil;
  },

  async cerrarSesion() {
    const c = await cliente();
    await c.auth.signOut();
  },

  async recuperarClave(correo) {
    const c = await cliente();
    const redirectTo = new URL("./", location.href).href;
    const { error } = await c.auth.resetPasswordForEmail(String(correo).trim(), { redirectTo });
    if (error) throw new ErrorDatos(traducirAuth(error));
    return {};
  },

  async cambiarClave(nueva) {
    const c = await cliente();
    const { error } = await c.auth.updateUser({ password: nueva });
    if (error) throw new ErrorDatos(traducirAuth(error));
  },

  // "invite" o "recovery" si se llegó desde un enlace del correo.
  async tipoDeEnlace() {
    await cliente();
    return tipoEnlace;
  },

  alCambiarSesion(fn) {
    let quitar = () => {};
    cliente().then((c) => {
      const { data } = c.auth.onAuthStateChange((evento) => {
        if (evento === "SIGNED_OUT" || evento === "SIGNED_IN") fn();
      });
      quitar = () => data.subscription.unsubscribe();
    });
    return () => quitar();
  },

  // ---------------- Tienda ----------------
  async leerTienda() {
    const c = await cliente();
    const { data, error } = await c.from("tienda").select("*").eq("id", 1).single();
    fallo(error);
    return data;
  },

  async guardarTienda(cambios) {
    const c = await cliente();
    const { data, error } = await c.from("tienda").update(elegir(cambios, CAMPOS_TIENDA)).eq("id", 1).select().single();
    fallo(error);
    return data;
  },

  // ---------------- Catálogo ----------------
  async listarModelos() {
    const c = await cliente();
    const { data, error } = await c.from("modelos").select("*").order("orden");
    fallo(error);
    return data;
  },

  async guardarModelo(id, cambios) {
    const c = await cliente();
    const { data, error } = await c.from("modelos")
      .update(elegir(cambios, ["nombre", "slug", "generacion", "orden", "activo"])).eq("id", id).select().single();
    fallo(error);
    return data;
  },

  async agregarModelo(datos) {
    const c = await cliente();
    const { data, error } = await c.from("modelos")
      .insert(elegir(datos, ["nombre", "slug", "generacion", "orden", "activo"])).select().single();
    fallo(error);
    return data;
  },

  // ---------------- Colores (las reglas están en proteger_color) ----------------
  async listarColores() {
    const c = await cliente();
    const { data, error } = await c.from("colores").select("*").order("modelo_id").order("orden");
    fallo(error);
    return data;
  },

  async guardarColor(id, cambios) {
    const c = await cliente();
    const { data, error } = await c.from("colores").update(elegir(cambios, CAMPOS_COLOR)).eq("id", id).select().single();
    fallo(error);
    return data;
  },

  async agregarColor(datos) {
    const c = await cliente();
    const { data, error } = await c.from("colores").insert(elegir(datos, CAMPOS_COLOR)).select().single();
    fallo(error);
    return data;
  },

  async borrarColor(id) {
    const c = await cliente();
    const { error } = await c.from("colores").delete().eq("id", id);
    fallo(error);
  },

  // ---------------- Fichas ----------------
  async listarFichas() {
    const c = await cliente();
    const { data, error } = await c.from("fichas").select("*");
    fallo(error);
    return data;
  },

  async guardarFicha(modeloId, { descripcion, especificaciones }) {
    const c = await cliente();
    const { data, error } = await c.from("fichas")
      .upsert({ modelo_id: modeloId, descripcion: descripcion ?? "", especificaciones: especificaciones ?? [] })
      .select().single();
    fallo(error);
    return data;
  },

  // ---------------- Reseñas (las reglas están en 0014) ----------------
  async listarResenas() {
    const c = await cliente();
    const { data, error } = await c.from("resenas").select("*").order("orden").order("creado_en");
    fallo(error);
    return data;
  },

  async agregarResena(datos) {
    const c = await cliente();
    const { data, error } = await c.from("resenas").insert(elegir(datos, CAMPOS_RESENA)).select().single();
    fallo(error);
    return data;
  },

  async guardarResena(id, cambios) {
    const c = await cliente();
    const { data, error } = await c.from("resenas").update(elegir(cambios, CAMPOS_RESENA)).eq("id", id).select().single();
    fallo(error);
    return data;
  },

  async borrarResena(id) {
    const c = await cliente();
    const { error } = await c.from("resenas").delete().eq("id", id);
    fallo(error);
  },

  // ---------------- Inventario ----------------
  async listarEquipos() {
    const c = await cliente();
    const { data, error } = await c.from("equipos").select("*").order("creado_en", { ascending: false });
    fallo(error);
    return data;
  },

  async crearEquipo(datos) {
    const c = await cliente();
    const { data, error } = await c.from("equipos").insert(elegir(datos, CAMPOS_EQUIPO)).select().single();
    fallo(error);
    return data;
  },

  // crear_equipos_lote (0026): una sola llamada; todo o nada.
  async crearEquiposLote(lista) {
    const c = await cliente();
    const { data, error } = await c.rpc("crear_equipos_lote", { lote: (lista || []).map((q) => elegir(q, CAMPOS_EQUIPO)) });
    fallo(error);
    return data;
  },

  // archivos_en_uso (0026): las rutas que algún equipo todavía usa.
  async archivosEnUso(bucket, rutas) {
    if (!rutas?.length) return [];
    const c = await cliente();
    const { data, error } = await c.rpc("archivos_en_uso", { bucket, rutas });
    fallo(error);
    return data || [];
  },

  async actualizarEquipo(id, cambios) {
    const c = await cliente();
    const { data, error } = await c.from("equipos").update(elegir(cambios, CAMPOS_EQUIPO)).eq("id", id).select().single();
    fallo(error);
    return data;
  },

  async borrarEquipo(id) {
    const c = await cliente();
    const { error } = await c.from("equipos").delete().eq("id", id);
    fallo(error);
  },

  // ---------------- Archivos ----------------
  async subirArchivo(bucket, ruta, blob) {
    const c = await cliente();
    const { error } = await c.storage.from(bucket).upload(ruta, blob, {
      contentType: blob.type, cacheControl: "31536000", upsert: false
    });
    if (error) throw new ErrorDatos(mensajeArchivo(bucket, /size|large/i.test(error.message) ? "peso" : /mime|type/i.test(error.message) ? "tipo" : ""));
    return ruta;
  },

  async borrarArchivos(bucket, todas) {
    // Las imágenes predeterminadas son compartidas: nunca se borran.
    const rutas = (todas || []).filter((r) => !esPredeterminada(r));
    if (!rutas.length) return;
    const c = await cliente();
    await c.storage.from(bucket).remove(rutas);
  },

  // ---------------- Demo ----------------
  async borrarDatosDemo() {
    const c = await cliente();
    const { error } = await c.rpc("borrar_datos_demo");
    fallo(error);
  },

  // ---------------- Usuarios (solo administrador) ----------------
  // Invitar, desactivar y reactivar van por la función "usuarios" (necesitan la
  // clave de servicio). El rol se cambia directo en perfiles (perfiles_editar);
  // la base exige que quede al menos un administrador activo.
  async listarUsuarios() {
    const c = await cliente();
    const { data, error } = await c.from("perfiles").select("*").order("creado_en");
    fallo(error);
    return data;
  },

  async invitarUsuario(correo, rol) {
    return funcion("usuarios", { accion: "invitar", correo, rol, redirectTo: new URL("./", location.href).href });
  },

  async cambiarEstadoUsuario(userId, activo) {
    return funcion("usuarios", { accion: activo ? "reactivar" : "desactivar", user_id: userId });
  },

  async cambiarRolUsuario(userId, rol) {
    const c = await cliente();
    const { data, error } = await c.from("perfiles").update({ rol }).eq("user_id", userId).select();
    fallo(error);
    if (!data?.length) throw new ErrorDatos(msj("permiso"), "42501");
    return data[0];
  }
};
