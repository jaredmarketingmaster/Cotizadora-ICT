// =============================================================================
// Back-end de demostración: todo vive en este navegador.
// - Datos en localStorage (se comparten entre pestañas del mismo navegador).
// - Fotos en IndexedDB.
// - Usuarios de prueba: agencia@demo.co y tienda@demo.co, clave demo1234.
// Repite las reglas del SQL (permisos por rol, validaciones y la fecha de
// precios) para que el sitio y el panel se comporten igual que con Supabase.
// No sirve para producción: cada navegador tiene su propia copia.
// =============================================================================

import { CATALOGO, DEMO_EQUIPOS } from "./semilla.js";
import { ErrorDatos, equipoEsPublico, CAMPOS_TIENDA, CAMPOS_EQUIPO, ESTADOS_ESTETICOS, TAMANOS_TEXTO, elegir } from "./comun.js";
import { hexValido, whatsappTiendaValido, sesion, esperar } from "../utils.js";

const CLAVE = "cotizadora-demo:v1";
const CLAVE_SESION = "cotizadora-demo:sesion";
export const USUARIOS_DEMO = [
  { correo: "agencia@demo.co", rol: "agencia" },
  { correo: "tienda@demo.co", rol: "tienda" }
];
export const CLAVE_DEMO = "demo1234";

// --- Estado ------------------------------------------------------------------

function uuid() {
  return crypto.randomUUID?.() ?? "10000000-1000-4000-8000-100000000000".replace(/[018]/g, (c) =>
    (c ^ (crypto.getRandomValues(new Uint8Array(1))[0] & (15 >> (c / 4)))).toString(16));
}

function ahora() { return new Date().toISOString(); }

function estadoInicial() {
  const t = ahora();
  const modelos = CATALOGO.map((m, i) => ({ id: i + 1, ...m, activo: false, activo_por_demo: false, creado_en: t }));
  const porSlug = new Map(modelos.map((m) => [m.slug, m]));
  for (const d of DEMO_EQUIPOS) Object.assign(porSlug.get(d.slug), { activo: true, activo_por_demo: true });
  const equipos = DEMO_EQUIPOS.map((d) => ({
    id: uuid(), modelo_id: porSlug.get(d.slug).id, condicion: d.condicion, capacidad: d.capacidad,
    color_nombre: d.color_nombre, color_hex: d.color_hex, precio: d.precio, en_stock: d.en_stock, fotos: [],
    publicado: true, destacado: d.destacado, descripcion_extra: "", es_demo: true,
    bateria_porcentaje: d.bateria_porcentaje ?? null, estado_estetico: d.estado_estetico ?? null,
    detalles: d.detalles ?? "", incluye: d.incluye ?? "", creado_en: t, actualizado_en: t
  }));
  return {
    version: VERSION,
    tienda: {
      id: 1, nombre: "Tienda de demostración", ciudad: "", direccion: "", horario_texto: "", whatsapp: "",
      correo_contacto: "", instagram_url: "", facebook_url: "", tiktok_url: "", logo: "", favicon: "",
      color_primario: "#1A73E8", color_secundario: "#0F172A", tema: "claro", texto_entrega: "",
      formas_pago: [], texto_garantia_nuevos: "", texto_garantia_usados: "", etiqueta_precio: "Precio",
      texto_privacidad: "", texto_terminos: "", texto_autorizacion_datos: "", aviso_marca: "",
      precios_actualizados_en: t, modo_demo: true, tamano_texto: "normal", actualizado_en: t
    },
    modelos,
    fichas: modelos.map((m) => ({ modelo_id: m.id, descripcion: "", especificaciones: [], actualizado_en: t })),
    equipos,
    perfiles: USUARIOS_DEMO.map((u, i) => ({ user_id: `demo-${i + 1}`, correo: u.correo, rol: u.rol, activo: true, clave: CLAVE_DEMO, creado_en: t }))
  };
}

// Versión de los datos guardados en el navegador. Cada cambio de forma repite
// la migración SQL del mismo número, para no perder lo que el usuario cargó.
const VERSION = 3;
const MIGRACIONES = {
  // 0004_en_stock.sql: stock numérico → en_stock (sí/no).
  1(e) {
    for (const q of e.equipos) { q.en_stock = q.stock > 0; delete q.stock; }
  },
  // 0005_tamano_texto.sql
  2(e) {
    e.tienda.tamano_texto = "normal";
  }
};

function migrar(e) {
  while (e.version < VERSION) { MIGRACIONES[e.version](e); e.version += 1; }
}

function leer() {
  try {
    const crudo = localStorage.getItem(CLAVE);
    if (crudo) {
      const e = JSON.parse(crudo);
      if (Number.isInteger(e?.version) && e.version <= VERSION) {
        if (e.version < VERSION) { migrar(e); escribir(e); }
        return e;
      }
    }
  } catch { /* sin almacenamiento o dato roto: se reinicia */ }
  const e = estadoInicial();
  escribir(e);
  return e;
}

function escribir(e) {
  try { localStorage.setItem(CLAVE, JSON.stringify(e)); } catch {
    throw new ErrorDatos("El navegador no tiene espacio para guardar los datos de demostración.");
  }
}

function copia(x) { return structuredClone(x); }

// Simula la latencia de una red rápida, para que se vean los estados de carga.
async function red() { await esperar(120); }

// --- Archivos (IndexedDB) ----------------------------------------------------

const urls = new Map();
let dbPromesa = null;

function db() {
  if (!dbPromesa) {
    dbPromesa = new Promise((resolver, rechazar) => {
      const pedido = indexedDB.open("cotizadora-demo", 1);
      pedido.onupgradeneeded = () => pedido.result.createObjectStore("archivos");
      pedido.onsuccess = () => resolver(pedido.result);
      pedido.onerror = () => rechazar(pedido.error);
    });
  }
  return dbPromesa;
}

async function idb(modo, fn) {
  const base = await db();
  return new Promise((resolver, rechazar) => {
    const tx = base.transaction("archivos", modo);
    const r = fn(tx.objectStore("archivos"));
    tx.oncomplete = () => resolver(r?.result);
    tx.onerror = () => rechazar(tx.error);
  });
}

async function cargarArchivos() {
  try {
    const base = await db();
    await new Promise((resolver) => {
      const tx = base.transaction("archivos", "readonly");
      const cursor = tx.objectStore("archivos").openCursor();
      cursor.onsuccess = () => {
        const c = cursor.result;
        if (!c) return resolver();
        if (!urls.has(c.key)) urls.set(c.key, URL.createObjectURL(c.value));
        c.continue();
      };
      cursor.onerror = () => resolver();
    });
  } catch { /* sin IndexedDB: las fotos no se ven, el resto funciona */ }
}

// --- Permisos ----------------------------------------------------------------

function perfilActual(e) {
  const id = sesion.leer(CLAVE_SESION);
  return e.perfiles.find((p) => p.user_id === id && p.activo) || null;
}

function exigirStaff(e) {
  const p = perfilActual(e);
  if (!p) throw new ErrorDatos("Su sesión terminó. Vuelva a iniciar sesión.", "sin-sesion");
  return p;
}

function exigirAgencia(e, que) {
  const p = exigirStaff(e);
  if (p.rol !== "agencia") throw new ErrorDatos(`Solo la agencia puede ${que}.`, "42501");
  return p;
}

// --- Validaciones (las mismas restricciones CHECK del SQL) -------------------

function validarTienda(t) {
  if (t.whatsapp && !whatsappTiendaValido(t.whatsapp)) throw new ErrorDatos("El WhatsApp debe tener 12 dígitos y empezar por 57.");
  if (!hexValido(t.color_primario) || !hexValido(t.color_secundario)) throw new ErrorDatos("Los colores deben estar en formato hexadecimal, ej. #1A73E8.");
  if (!["claro", "oscuro"].includes(t.tema)) throw new ErrorDatos("El tema debe ser claro u oscuro.");
  if (!TAMANOS_TEXTO.includes(t.tamano_texto)) throw new ErrorDatos("El tamaño del texto debe ser compacto, normal o grande.");
}

function validarEquipo(q, e) {
  if (!e.modelos.some((m) => m.id === q.modelo_id)) throw new ErrorDatos("Elija un modelo.");
  if (!["nuevo", "usado"].includes(q.condicion)) throw new ErrorDatos("Elija si es nuevo o usado.");
  if (!String(q.capacidad || "").trim()) throw new ErrorDatos("Elija la capacidad.");
  if (!Number.isSafeInteger(q.precio) || q.precio <= 0) throw new ErrorDatos("El precio debe ser un número entero mayor que 0.");
  if (typeof q.en_stock !== "boolean") throw new ErrorDatos("Indique si el equipo tiene stock.");
  if (!hexValido(q.color_hex)) throw new ErrorDatos("El color debe estar en formato hexadecimal, ej. #1C1C1E.");
  if ((q.fotos || []).length > 6) throw new ErrorDatos("Máximo 6 fotos por equipo.");
  if (q.bateria_porcentaje != null && !(Number.isInteger(q.bateria_porcentaje) && q.bateria_porcentaje >= 0 && q.bateria_porcentaje <= 100)) {
    throw new ErrorDatos("La batería debe estar entre 0 y 100.");
  }
  if (q.estado_estetico != null && !ESTADOS_ESTETICOS.includes(q.estado_estetico)) throw new ErrorDatos("Elija un estado estético de la lista.");
}

// --- Adaptador ---------------------------------------------------------------

const oyentesSesion = new Set();
function avisarSesion() { for (const fn of oyentesSesion) fn(); }

export const demo = {
  tipo: "demo",

  async iniciar() { await cargarArchivos(); },

  // ---------------- Público ----------------
  async cargarPublico() {
    await cargarArchivos();
    const e = leer();
    const modelosActivos = e.modelos.filter((m) => m.activo).sort((a, b) => a.orden - b.orden);
    const porId = new Map(e.modelos.map((m) => [m.id, m]));
    const ids = new Set(modelosActivos.map((m) => m.id));
    return copia({
      tienda: e.tienda,
      modelos: modelosActivos,
      fichas: e.fichas.filter((f) => ids.has(f.modelo_id)),
      equipos: e.equipos.filter((q) => equipoEsPublico(q, porId))
    });
  },

  urlArchivo(_bucket, ruta) {
    if (!ruta) return "";
    if (/^(https?:|data:|blob:)/.test(ruta)) return ruta;
    return urls.get(ruta) || "";
  },

  // Envío del lead: en demo no sale nada del navegador. El payload queda en la
  // consola y en sessionStorage ("cotizadora-demo:ultimo-lead") para revisarlo.
  // Para probar el error: sessionStorage["cotizadora-demo:fallos-lead"] = "2"
  // hace que fallen los próximos 2 envíos.
  async enviarLead(payload) {
    await esperar(400);
    const fallos = Number(sesion.leer("cotizadora-demo:fallos-lead") || 0);
    if (fallos > 0) {
      sesion.guardar("cotizadora-demo:fallos-lead", String(fallos - 1));
      return { ok: false, error: "demo: fallo simulado" };
    }
    sesion.guardar("cotizadora-demo:ultimo-lead", JSON.stringify(payload));
    console.info("[demo] Lead que se enviaría a GHL:", payload);
    return { ok: true };
  },

  // ---------------- Sesión ----------------
  async sesionActual() {
    const p = perfilActual(leer());
    return p ? { id: p.user_id, correo: p.correo, rol: p.rol } : null;
  },

  async iniciarSesion(correo, clave) {
    await red();
    const e = leer();
    const p = e.perfiles.find((x) => x.correo.toLowerCase() === String(correo).trim().toLowerCase());
    if (!p || p.clave !== clave) throw new ErrorDatos("El correo o la contraseña no coinciden.");
    if (!p.activo) throw new ErrorDatos("Este usuario está desactivado. Hable con la agencia.");
    sesion.guardar(CLAVE_SESION, p.user_id);
    avisarSesion();
    return { id: p.user_id, correo: p.correo, rol: p.rol };
  },

  async cerrarSesion() { sesion.borrar(CLAVE_SESION); avisarSesion(); },

  async recuperarClave() {
    await red();
    // En demo no se envían correos.
    return { demo: true };
  },

  async cambiarClave(nueva) {
    const e = leer();
    const p = exigirStaff(e);
    if (String(nueva).length < 8) throw new ErrorDatos("La contraseña debe tener al menos 8 caracteres.");
    e.perfiles.find((x) => x.user_id === p.user_id).clave = nueva;
    escribir(e);
  },

  // En demo no hay enlaces de invitación ni de recuperación.
  async tipoDeEnlace() { return ""; },

  alCambiarSesion(fn) { oyentesSesion.add(fn); return () => oyentesSesion.delete(fn); },

  // ---------------- Tienda ----------------
  async leerTienda() { await red(); return copia(leer().tienda); },

  async guardarTienda(cambios) {
    await red();
    const e = leer();
    const p = exigirStaff(e);
    const datos = elegir(cambios, CAMPOS_TIENDA);
    if ("modo_demo" in datos && datos.modo_demo !== e.tienda.modo_demo && p.rol !== "agencia") {
      throw new ErrorDatos("Solo la agencia puede cambiar el modo demo.", "42501");
    }
    const nueva = { ...e.tienda, ...datos, actualizado_en: ahora() };
    validarTienda(nueva);
    e.tienda = nueva;
    escribir(e);
    return copia(nueva);
  },

  // ---------------- Catálogo ----------------
  async listarModelos() {
    await red();
    return copia(leer().modelos.sort((a, b) => a.orden - b.orden));
  },

  async guardarModelo(id, cambios) {
    await red();
    const e = leer();
    const p = exigirStaff(e);
    const m = e.modelos.find((x) => x.id === id);
    if (!m) throw new ErrorDatos("Ese modelo ya no existe.");
    const protegidos = ["nombre", "slug", "generacion", "orden"].filter((c) => c in cambios && cambios[c] !== m[c]);
    if (protegidos.length && p.rol !== "agencia") {
      throw new ErrorDatos("Solo la agencia puede cambiar el nombre, la generación o el orden del catálogo.", "42501");
    }
    if ("nombre" in cambios && e.modelos.some((x) => x.id !== id && x.nombre === cambios.nombre)) throw new ErrorDatos("Ya existe un modelo con ese nombre.");
    if ("slug" in cambios && e.modelos.some((x) => x.id !== id && x.slug === cambios.slug)) throw new ErrorDatos("Ya existe un modelo con ese nombre.");
    if ("activo" in cambios && cambios.activo !== m.activo) m.activo_por_demo = false;
    Object.assign(m, elegir(cambios, ["nombre", "slug", "generacion", "orden", "activo"]));
    escribir(e);
    return copia(m);
  },

  async agregarModelo(datos) {
    await red();
    const e = leer();
    exigirAgencia(e, "agregar modelos");
    if (e.modelos.some((x) => x.nombre === datos.nombre || x.slug === datos.slug)) throw new ErrorDatos("Ya existe un modelo con ese nombre.");
    const id = Math.max(0, ...e.modelos.map((m) => m.id)) + 1;
    const m = { id, nombre: datos.nombre, slug: datos.slug, generacion: datos.generacion, orden: datos.orden, activo: Boolean(datos.activo), activo_por_demo: false, creado_en: ahora() };
    e.modelos.push(m);
    e.fichas.push({ modelo_id: id, descripcion: "", especificaciones: [], actualizado_en: ahora() });
    escribir(e);
    return copia(m);
  },

  // ---------------- Fichas ----------------
  async listarFichas() { await red(); return copia(leer().fichas); },

  async guardarFicha(modeloId, { descripcion, especificaciones }) {
    await red();
    const e = leer();
    exigirStaff(e);
    let f = e.fichas.find((x) => x.modelo_id === modeloId);
    if (!f) { f = { modelo_id: modeloId }; e.fichas.push(f); }
    Object.assign(f, { descripcion: descripcion ?? "", especificaciones: especificaciones ?? [], actualizado_en: ahora() });
    escribir(e);
    return copia(f);
  },

  // ---------------- Inventario ----------------
  async listarEquipos() {
    await red();
    const e = leer();
    exigirStaff(e);
    return copia(e.equipos);
  },

  async crearEquipo(datos) {
    await red();
    const e = leer();
    exigirStaff(e);
    const q = {
      id: uuid(), color_nombre: "", color_hex: "#8E8E93", en_stock: true, fotos: [], publicado: false, destacado: false,
      descripcion_extra: "", es_demo: false, bateria_porcentaje: null, estado_estetico: null, detalles: "", incluye: "",
      ...elegir(datos, CAMPOS_EQUIPO), creado_en: ahora(), actualizado_en: ahora()
    };
    validarEquipo(q, e);
    e.equipos.push(q);
    e.tienda.precios_actualizados_en = ahora();
    escribir(e);
    return copia(q);
  },

  async actualizarEquipo(id, cambios) {
    await red();
    const e = leer();
    exigirStaff(e);
    const q = e.equipos.find((x) => x.id === id);
    if (!q) throw new ErrorDatos("Ese equipo ya no existe.");
    const nuevo = { ...q, ...elegir(cambios, CAMPOS_EQUIPO), actualizado_en: ahora() };
    validarEquipo(nuevo, e);
    if (nuevo.precio !== q.precio) e.tienda.precios_actualizados_en = ahora();
    Object.assign(q, nuevo);
    escribir(e);
    return copia(q);
  },

  async borrarEquipo(id) {
    await red();
    const e = leer();
    exigirStaff(e);
    e.equipos = e.equipos.filter((x) => x.id !== id);
    escribir(e);
  },

  // ---------------- Archivos ----------------
  async subirArchivo(_bucket, ruta, blob) {
    const e = leer();
    exigirStaff(e);
    await idb("readwrite", (s) => s.put(blob, ruta));
    urls.set(ruta, URL.createObjectURL(blob));
    return ruta;
  },

  async borrarArchivos(_bucket, rutas) {
    if (!rutas?.length) return;
    try {
      await idb("readwrite", (s) => { for (const r of rutas) s.delete(r); });
    } catch { /* sin IndexedDB */ }
    for (const r of rutas) { if (urls.has(r)) URL.revokeObjectURL(urls.get(r)); urls.delete(r); }
  },

  // ---------------- Demo ----------------
  async borrarDatosDemo() {
    await red();
    const e = leer();
    exigirAgencia(e, "borrar los datos de demostración");
    e.equipos = e.equipos.filter((q) => !q.es_demo);
    for (const m of e.modelos) if (m.activo_por_demo) Object.assign(m, { activo: false, activo_por_demo: false });
    e.tienda.modo_demo = false;
    escribir(e);
  },

  // Solo en demo: vuelve a los datos iniciales.
  async reiniciarDemo() {
    try { localStorage.removeItem(CLAVE); } catch { /* nada */ }
    try { await idb("readwrite", (s) => s.clear()); } catch { /* nada */ }
    urls.clear();
  },

  // ---------------- Usuarios ----------------
  async listarUsuarios() {
    await red();
    const e = leer();
    exigirAgencia(e, "ver los usuarios");
    return e.perfiles.map(({ clave: _c, ...p }) => p);
  },

  async invitarUsuario(correo, rol) {
    await red();
    const e = leer();
    exigirAgencia(e, "invitar usuarios");
    const c = String(correo).trim().toLowerCase();
    if (e.perfiles.some((p) => p.correo === c)) throw new ErrorDatos("Ese correo ya tiene usuario.");
    // En demo el invitado entra con la clave de prueba.
    e.perfiles.push({ user_id: uuid(), correo: c, rol, activo: true, clave: CLAVE_DEMO, creado_en: ahora() });
    escribir(e);
    return { demo: true };
  },

  async cambiarEstadoUsuario(userId, activo) {
    await red();
    const e = leer();
    const yo = exigirAgencia(e, "desactivar usuarios");
    if (yo.user_id === userId) throw new ErrorDatos("No puede desactivarse a sí mismo.");
    const p = e.perfiles.find((x) => x.user_id === userId);
    if (!p) throw new ErrorDatos("Ese usuario ya no existe.");
    p.activo = activo;
    escribir(e);
  }
};
