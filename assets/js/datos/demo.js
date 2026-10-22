// =============================================================================
// Back-end de demostración: todo vive en este navegador.
// - Datos en localStorage (se comparten entre pestañas del mismo navegador).
// - Fotos en IndexedDB.
// - Usuarios de prueba: administrador@demo.co y gestor@demo.co, clave demo1234.
// Repite las reglas del SQL (permisos por rol, validaciones y la fecha de
// precios) para que el sitio y el panel se comporten igual que con Supabase.
// No sirve para producción: cada navegador tiene su propia copia.
// =============================================================================

import { CATALOGO, COLORES, DEMO_EQUIPOS, filasDeFuente } from "./semilla.js";
import { ErrorDatos, equipoEsPublico, nombreColor, BUCKETS, mensajeArchivo, RUTA_VIDEO, MAX_MAS_VENDIDOS, VISTAS_EQUIPOS, CAMPOS_TIENDA, CAMPOS_EQUIPO, CAMPOS_COLOR, ESTADOS_ESTETICOS, TAMANOS_TEXTO, CATEGORIAS_FICHA, especificacionesValidas, errorPagos, CAMPOS_RESENA, MAX_RESENAS, TITULO_RESENAS, ORIGENES_RESENA, RUTA_RESENA, LEGAL_INICIAL, errorLegales, elegir } from "./comun.js";
import { hexValido, sesion, esperar } from "../utils.js";
import { whatsappValido, CODIGOS_PAIS_TIENDA } from "./paises.js";
import { CODIGOS_IDIOMA, t as tr } from "../i18n/i18n.js";

// Los mensajes de error se traducen al lanzarlos (claves datos.error.*): son
// los mismos del SQL, que llegan en español y traduce traducirServidor().
const error = (clave, codigo) => new ErrorDatos(tr(`datos.error.${clave}`), codigo);

const CLAVE = "cotizadora-demo:v1";
const CLAVE_SESION = "cotizadora-demo:sesion";
export const USUARIOS_DEMO = [
  { correo: "administrador@demo.co", rol: "administrador" },
  { correo: "gestor@demo.co", rol: "gestor" }
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
  const colores = coloresOficiales(modelos);
  const colorDe = (modeloId, nombre) => colores.find((c) => c.modelo_id === modeloId && c.nombre_es === nombre).id;
  const equipos = DEMO_EQUIPOS.map((d) => ({
    id: uuid(), modelo_id: porSlug.get(d.slug).id, condicion: d.condicion, capacidad: d.capacidad,
    color_id: colorDe(porSlug.get(d.slug).id, d.color), color_nombre_mostrar: d.color_nombre_mostrar,
    precio: d.precio, en_stock: d.en_stock, fotos: [], video: "",
    publicado: true, destacado: d.destacado, mas_vendido: false, descripcion_extra: "", es_demo: true,
    bateria_porcentaje: d.bateria_porcentaje ?? null, estado_estetico: d.estado_estetico ?? null,
    detalles: d.detalles ?? "", incluye: d.incluye ?? "", creado_en: t, actualizado_en: t
  }));
  return {
    version: VERSION,
    tienda: {
      // El demo es una tienda de Colombia (sus precios de ejemplo están en pesos colombianos)
      id: 1, nombre: "Tienda de demostración", pais: "co", idioma: "es", ciudad: "", direccion: "", horario_texto: "", whatsapp: "",
      correo_contacto: "", instagram_url: "", facebook_url: "", tiktok_url: "", logo: "", favicon: "",
      color_primario: "#1A73E8", color_secundario: "#0F172A", tema: "claro", texto_entrega: "",
      pagos_otras: [], ...PAGOS_VACIOS, texto_garantia_nuevos: "", texto_garantia_usados: "", etiqueta_precio: "Precio",
      ...copia(LEGAL_INICIAL),
      precios_actualizados_en: t, modo_demo: true, tamano_texto: "normal", vista_equipos: "cuadricula",
      mostrar_ficha: true, ficha_ocultas: [], mostrar_resenas: false, titulo_resenas: TITULO_RESENAS, titulo_sitio: "", actualizado_en: t
    },
    modelos,
    fichas: modelos.map((m) => ({ modelo_id: m.id, descripcion: "", especificaciones: filasDeFuente(m.slug), actualizado_en: t })),
    colores,
    equipos,
    // Sin reseñas: no se crean ni de ejemplo (0014)
    resenas: [],
    perfiles: USUARIOS_DEMO.map((u, i) => ({ user_id: `demo-${i + 1}`, correo: u.correo, rol: u.rol, activo: true, clave: CLAVE_DEMO, creado_en: t }))
  };
}

// Versión de los datos guardados en el navegador. Cada cambio de forma repite
// la migración SQL del mismo número, para no perder lo que el usuario cargó.
const VERSION = 17;
const MIGRACIONES = {
  // 0004_en_stock.sql: stock numérico → en_stock (sí/no).
  1(e) {
    for (const q of e.equipos) { q.en_stock = q.stock > 0; delete q.stock; }
  },
  // 0005_tamano_texto.sql
  2(e) {
    e.tienda.tamano_texto = "normal";
  },
  // 0006_catalogo_colores.sql: modelos que faltaban, orden por fecha de
  // lanzamiento (los de la agencia, al final) y colores oficiales.
  3(e) {
    const enLista = new Set(CATALOGO.map((m) => m.slug));
    for (const m of e.modelos) if (!enLista.has(m.slug)) m.orden += 10000;
    const t = ahora();
    for (const c of CATALOGO) {
      const m = e.modelos.find((x) => x.slug === c.slug);
      if (m) { m.orden = c.orden; continue; }
      const id = Math.max(0, ...e.modelos.map((x) => x.id)) + 1;
      e.modelos.push({ id, ...c, activo: false, activo_por_demo: false, creado_en: t });
      e.fichas.push({ modelo_id: id, descripcion: "", especificaciones: [], actualizado_en: t });
    }
    e.colores = coloresOficiales(e.modelos);
  },
  // 0007_roles.sql: agencia → administrador, tienda → gestor. Los usuarios de
  // prueba cambian también de correo.
  4(e) {
    const correos = { "agencia@demo.co": "administrador@demo.co", "tienda@demo.co": "gestor@demo.co" };
    for (const p of e.perfiles) {
      p.rol = { agencia: "administrador", tienda: "gestor" }[p.rol] || p.rol;
      p.correo = correos[p.correo] || p.correo;
    }
  },
  // 0008_color_oficial.sql: cada equipo pasa a un color oficial de su modelo
  // (por nombre en español o inglés; "Glacier" → Glaciar). Si el nombre que
  // tenía no es el que se mostraría, queda en color_nombre_mostrar. Sin color
  // encontrado: color_id vacío y el nombre se conserva.
  5(e) {
    const equivalentes = { glacier: "glaciar" };
    for (const q of e.equipos) {
      const viejo = String(q.color_nombre || "").trim();
      const v = viejo.toLowerCase();
      const c = viejo && e.colores
        .filter((x) => x.modelo_id === q.modelo_id)
        .sort((a, b) => a.orden - b.orden)
        .find((x) => x.nombre_es.toLowerCase() === v || (x.nombre_en && x.nombre_en.toLowerCase() === v) || x.nombre_es.toLowerCase() === equivalentes[v]);
      q.color_id = c ? c.id : null;
      q.color_nombre_mostrar = c ? (viejo !== nombreColor(c) ? viejo : "") : viejo.slice(0, 40);
      delete q.color_nombre;
      delete q.color_hex;
    }
  },
  // 0009_video.sql: un video opcional por equipo.
  6(e) {
    for (const q of e.equipos) q.video = q.video || "";
  },
  // 0010_mas_vendido.sql
  7(e) {
    for (const q of e.equipos) q.mas_vendido = Boolean(q.mas_vendido);
  },
  // 0011_vista_equipos.sql
  8(e) {
    e.tienda.vista_equipos = "cuadricula";
  },
  // 0012_fichas.sql: interruptores de la ficha y precarga de la fuente en las
  // fichas sin filas (lo que ya cargó la tienda no se toca).
  9(e) {
    e.tienda.mostrar_ficha = true;
    e.tienda.ficha_ocultas = [];
    for (const m of e.modelos) {
      let f = e.fichas.find((x) => x.modelo_id === m.id);
      if (!f) { f = { modelo_id: m.id, descripcion: "", especificaciones: [], actualizado_en: ahora() }; e.fichas.push(f); }
      if (!(f.especificaciones || []).length) f.especificaciones = filasDeFuente(m.slug);
    }
  },
  // 0013_formas_pago.sql: formas_pago pasa a pagos_otras y se suman los
  // campos estructurados, vacíos.
  10(e) {
    e.tienda.pagos_otras = e.tienda.formas_pago || [];
    delete e.tienda.formas_pago;
    Object.assign(e.tienda, PAGOS_VACIOS);
  },
  // 0014_resenas.sql: el interruptor apagado, el título por defecto y la
  // lista vacía.
  11(e) {
    e.tienda.mostrar_resenas = false;
    e.tienda.titulo_resenas = TITULO_RESENAS;
    e.resenas = e.resenas || [];
  },
  // 0015_legales.sql: textos base solo donde estaban vacíos, la lista de
  // herramientas y "Un abogado ya revisó estos textos" en no.
  12(e) {
    const t = e.tienda;
    // (Los textos base de 0015 ya no existen en el código: la migración 13 los
    // reconoce por su huella y los descarta.)
    for (const k of ["texto_privacidad", "texto_terminos", "texto_autorizacion_datos"]) t[k] = t[k] || "";
    t.legales_revisados = false;
    t.legales_herramientas = [];
  },
  // 0016_legales_asistente.sql: los datos del asistente con sus valores
  // iniciales; lo que la tienda había escrito pasa a la cláusula propia de su
  // documento (los textos base de 0015 sin cambios se descartan, por su
  // huella) y el aviso de marca, a la de los términos. Sin publicar.
  13(e) {
    const t = e.tienda;
    const propio = (texto, base) => (huellaTexto(texto || "") === base ? "" : String(texto || "").trim().slice(0, 4000));
    Object.assign(t, copia(LEGAL_INICIAL), {
      legal_clausula_privacidad: propio(t.texto_privacidad, "d8e42352"),
      legal_clausula_terminos: [propio(t.texto_terminos, "0d6f6d52"), String(t.aviso_marca || "").trim()].filter(Boolean).join("\n\n").slice(0, 4000),
      legal_clausula_aviso: propio(t.texto_autorizacion_datos, "0e0f5fbb")
    });
    for (const k of ["texto_privacidad", "texto_terminos", "texto_autorizacion_datos", "aviso_marca", "legales_revisados", "legales_herramientas"]) delete t[k];
  },
  // 0018_pais.sql: el país de la tienda. Los datos del demo eran de Colombia.
  14(e) {
    e.tienda.pais = "co";
  },
  // 0020_idioma.sql: las tiendas que ya existían quedan en español.
  15(e) { e.tienda.idioma = "es"; },
  // 0021_titulo_sitio.sql: vacío = el título del idioma de la tienda.
  16(e) { e.tienda.titulo_sitio = ""; }
};

// FNV-1a de 32 bits (la misma huella de motor.js).
function huellaTexto(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, "0");
}

// Como 0017: sin textos legales publicados, la demo se queda (se traducen al usarlos).
const SIN_LEGALES_DEMO = () => error("sin_legales_demo");
const SIN_LEGALES_BORRAR = () => error("sin_legales_borrar");

// Valores por defecto de las formas de pago estructuradas (0013).
const PAGOS_VACIOS = {
  pagos_medios: [], pagos_cuotas: false, pagos_cuotas_max: null, pagos_sin_interes: false, pagos_sin_interes_max: null,
  pagos_cripto: false, pagos_cripto_cuales: "", pagos_pasarelas: [], pagos_pasarela_otra: ""
};

function coloresOficiales(modelos) {
  const lista = [];
  for (const m of [...modelos].sort((a, b) => a.orden - b.orden)) {
    (COLORES[m.slug] || []).forEach(([nombre_es, nombre_en, hex], i) => lista.push({
      id: lista.length + 1, modelo_id: m.id, nombre_es, nombre_en, hex, orden: i + 1, oficial: true, hex_de_fuente: hex !== ""
    }));
  }
  return lista;
}

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
    throw error("sin_espacio");
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

// Roles (igual que 0007_roles.sql): el administrador solo gestiona accesos;
// el gestor, todo lo demás.
function exigirSesion(e) {
  const p = perfilActual(e);
  if (!p) throw error("sesion", "sin-sesion");
  return p;
}

// que: la acción, como clave (datos.error.solo_gestor.<que>).
function exigirGestor(e, que = "cambio") {
  const p = exigirSesion(e);
  if (p.rol !== "gestor") throw error(`solo_gestor.${que}`, "42501");
  return p;
}

// El administrador solo gestiona usuarios (datos.error.solo_administrador).
function exigirAdministrador(e) {
  const p = exigirSesion(e);
  if (p.rol !== "administrador") throw error("solo_administrador", "42501");
  return p;
}

function esGestor(e) { return perfilActual(e)?.rol === "gestor"; }

// Como perfiles_proteger: siempre queda al menos un administrador activo.
function cambiarPerfil(e, userId, cambios) {
  const p = e.perfiles.find((x) => x.user_id === userId);
  if (!p) throw error("usuario_no_existe");
  const nuevo = { ...p, ...cambios };
  const otros = e.perfiles.some((x) => x.user_id !== userId && x.rol === "administrador" && x.activo);
  if (p.rol === "administrador" && p.activo && (nuevo.rol !== "administrador" || !nuevo.activo) && !otros) {
    throw error("un_administrador", "42501");
  }
  Object.assign(p, nuevo);
}

// --- Validaciones (las mismas restricciones CHECK del SQL) -------------------

function validarTienda(t) {
  // Como 0018: el país es uno de la lista y el WhatsApp sigue su formato
  if (!CODIGOS_IDIOMA.includes(t.idioma)) throw error("formato");
  if (!CODIGOS_PAIS_TIENDA.includes(t.pais)) throw error("formato");
  if (t.whatsapp && !whatsappValido(t.whatsapp, t.pais)) throw error("whatsapp_pais");
  if (!hexValido(t.color_primario) || !hexValido(t.color_secundario)) throw error("colores_hex");
  if (!["claro", "oscuro"].includes(t.tema)) throw error("tema");
  if (!TAMANOS_TEXTO.includes(t.tamano_texto)) throw error("tamano");
  if (!VISTAS_EQUIPOS.includes(t.vista_equipos)) throw error("vista");
  // Como los checks de 0012
  if (typeof t.mostrar_ficha !== "boolean" || !Array.isArray(t.ficha_ocultas) ||
      t.ficha_ocultas.some((c) => !CATEGORIAS_FICHA.some((x) => x.clave === c))) {
    throw error("formato");
  }
  // Como validar_pagos (0013)
  const pagos = errorPagos(t);
  if (pagos) throw new ErrorDatos(pagos);
  // 0014
  if (typeof t.mostrar_resenas !== "boolean" || typeof t.titulo_resenas !== "string" || t.titulo_resenas.length > 80) {
    throw error("formato");
  }
  // 0021
  if (typeof t.titulo_sitio !== "string" || t.titulo_sitio.length > 80) throw error("formato");
  // Como los checks de 0016
  const legales = errorLegales(t);
  if (legales) throw new ErrorDatos(legales);
}

// Como publicar_legales (0016): solo completa, con los cuatro documentos sin
// marcas y sin despublicar. La versión y la fecha las pone el adaptador:
// suben solo si cambió algún documento. El motor se carga solo al publicar.
async function publicarLegales(nueva, anterior) {
  const viejo = anterior.legal_publicado;
  if (JSON.stringify(nueva.legal_publicado) === JSON.stringify(viejo)) return;
  if (!nueva.legal_publicado) throw error("legales_quitar");
  const { faltantes, hoyColombia, DOCUMENTOS, MARCAS } = await import("../legal/motor.js");
  if (faltantes(nueva).length) throw error("legales_faltan");
  const docs = nueva.legal_publicado.documentos || {};
  if (DOCUMENTOS.some((d) => typeof docs[d.clave] !== "string" || !docs[d.clave].trim() || MARCAS.test(docs[d.clave]))) {
    throw error("formato");
  }
  const iguales = viejo && DOCUMENTOS.every((d) => viejo.documentos?.[d.clave] === docs[d.clave]);
  nueva.legal_publicado = iguales ? viejo : {
    version: (viejo?.version || 0) + 1, vigente_desde: hoyColombia(),
    huella: String(nueva.legal_publicado.huella || ""), documentos: Object.fromEntries(DOCUMENTOS.map((d) => [d.clave, docs[d.clave]]))
  };
}

// Como los checks de la tabla resenas (0014)
function validarResena(r) {
  const bien = ["imagen", "video"].includes(r.tipo) && RUTA_RESENA[r.tipo].test(r.ruta) &&
    typeof r.texto === "string" && r.texto.length <= 300 &&
    (r.origen === "" || ORIGENES_RESENA.some((o) => o.clave === r.origen)) &&
    typeof r.origen_otro === "string" && r.origen_otro.length <= 40 && (r.origen === "otro" || r.origen_otro === "") &&
    r.autorizado === true && Number.isInteger(r.orden);
  if (!bien) throw error("formato");
}

// Como validar_color_equipo (0008): el color es del modelo y es obligatorio
// si el modelo tiene colores (al crear, o al cambiar el modelo o el color).
function validarColorEquipo(q, e, anterior = null) {
  q.color_nombre_mostrar = String(q.color_nombre_mostrar || "").trim();
  if (q.color_nombre_mostrar.length > 40) throw error("formato");
  if (q.color_id != null) {
    if (!e.colores.some((c) => c.id === q.color_id && c.modelo_id === q.modelo_id)) throw error("color_modelo");
  } else if ((!anterior || anterior.modelo_id !== q.modelo_id || anterior.color_id != null) && e.colores.some((c) => c.modelo_id === q.modelo_id)) {
    throw error("elija_color");
  }
}

// Como limitar_mas_vendidos (0010): no más de 3 marcados.
function validarMasVendido(q, e, anterior = null) {
  if (q.mas_vendido && !anterior?.mas_vendido && e.equipos.filter((x) => x.mas_vendido && x.id !== q.id).length >= MAX_MAS_VENDIDOS) {
    throw error("mas_vendidos");
  }
}

function validarEquipo(q, e) {
  if (!e.modelos.some((m) => m.id === q.modelo_id)) throw error("elija_modelo");
  if (!["nuevo", "usado"].includes(q.condicion)) throw error("elija_condicion");
  if (!String(q.capacidad || "").trim()) throw error("elija_capacidad");
  if (!Number.isSafeInteger(q.precio) || q.precio <= 0) throw error("precio");
  if (typeof q.en_stock !== "boolean") throw error("stock");
  if (typeof q.mas_vendido !== "boolean") throw error("formato");
  if ((q.fotos || []).length > 6) throw error("max_fotos");
  if ((q.video ?? "") !== "" && !RUTA_VIDEO.test(q.video)) throw error("formato");
  if (q.bateria_porcentaje != null && !(Number.isInteger(q.bateria_porcentaje) && q.bateria_porcentaje >= 0 && q.bateria_porcentaje <= 100)) {
    throw error("bateria");
  }
  if (q.estado_estetico != null && !ESTADOS_ESTETICOS.includes(q.estado_estetico)) throw error("estado_estetico");
}

function validarColor(c, e) {
  if (!e.modelos.some((m) => m.id === c.modelo_id)) throw error("elija_modelo");
  if (!String(c.nombre_es || "").trim()) throw error("nombre_color");
  if (c.hex !== "" && !hexValido(c.hex)) throw error("color_hex");
  if (e.colores.some((x) => x.id !== c.id && x.modelo_id === c.modelo_id && x.nombre_es === c.nombre_es)) {
    throw error("duplicado");
  }
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
      colores: e.colores.filter((c) => ids.has(c.modelo_id)).sort((a, b) => a.modelo_id - b.modelo_id || a.orden - b.orden),
      equipos: e.equipos.filter((q) => equipoEsPublico(q, porId)),
      // Como datos_publicos (0014): solo con el interruptor encendido
      resenas: e.tienda.mostrar_resenas
        ? [...e.resenas].sort((a, b) => a.orden - b.orden || a.creado_en.localeCompare(b.creado_en))
          .map(({ id, tipo, ruta, texto, origen, origen_otro }) => ({ id, tipo, ruta, texto, origen, origen_otro }))
        : []
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
    if (!p || p.clave !== clave) throw error("credenciales");
    if (!p.activo) throw error("desactivado");
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
    const p = exigirSesion(e);
    if (String(nueva).length < 8) throw error("clave_corta");
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
    const p = exigirGestor(e, "tienda");
    const datos = elegir(cambios, CAMPOS_TIENDA);
    if ("modo_demo" in datos && datos.modo_demo !== e.tienda.modo_demo && p.rol !== "gestor") {
      throw error("solo_gestor.modo_demo", "42501");
    }
    const nueva = copia({ ...e.tienda, ...datos, actualizado_en: ahora() });
    validarTienda(nueva);
    if ("legal_publicado" in datos) await publicarLegales(nueva, e.tienda);
    // Como proteger_tienda (0017)
    if (e.tienda.modo_demo && !nueva.modo_demo && !nueva.legal_publicado) throw SIN_LEGALES_DEMO();
    e.tienda = nueva;
    escribir(e);
    return copia(nueva);
  },

  // ---------------- Catálogo ----------------
  async listarModelos() {
    await red();
    const e = leer();
    return copia(e.modelos.filter((m) => esGestor(e) || m.activo).sort((a, b) => a.orden - b.orden));
  },

  async guardarModelo(id, cambios) {
    await red();
    const e = leer();
    exigirGestor(e, "catalogo");
    const m = e.modelos.find((x) => x.id === id);
    if (!m) throw error("modelo_no_existe");
    if ("nombre" in cambios && e.modelos.some((x) => x.id !== id && x.nombre === cambios.nombre)) throw error("modelo_duplicado");
    if ("slug" in cambios && e.modelos.some((x) => x.id !== id && x.slug === cambios.slug)) throw error("modelo_duplicado");
    if ("activo" in cambios && cambios.activo !== m.activo) m.activo_por_demo = false;
    Object.assign(m, elegir(cambios, ["nombre", "slug", "generacion", "orden", "activo"]));
    escribir(e);
    return copia(m);
  },

  async agregarModelo(datos) {
    await red();
    const e = leer();
    exigirGestor(e, "catalogo");
    if (e.modelos.some((x) => x.nombre === datos.nombre || x.slug === datos.slug)) throw error("modelo_duplicado");
    const id = Math.max(0, ...e.modelos.map((m) => m.id)) + 1;
    const m = { id, nombre: datos.nombre, slug: datos.slug, generacion: datos.generacion, orden: datos.orden, activo: Boolean(datos.activo), activo_por_demo: false, creado_en: ahora() };
    e.modelos.push(m);
    e.fichas.push({ modelo_id: id, descripcion: "", especificaciones: [], actualizado_en: ahora() });
    escribir(e);
    return copia(m);
  },

  // ---------------- Colores (mismas reglas que proteger_color) ----------------
  async listarColores() {
    await red();
    const e = leer();
    const activos = new Set(e.modelos.filter((m) => m.activo).map((m) => m.id));
    return copia(e.colores.filter((c) => esGestor(e) || activos.has(c.modelo_id)).sort((a, b) => a.modelo_id - b.modelo_id || a.orden - b.orden));
  },

  async guardarColor(id, cambios) {
    await red();
    const e = leer();
    exigirGestor(e);
    const c = e.colores.find((x) => x.id === id);
    if (!c) throw error("color_no_existe");
    const nuevo = { ...c, ...elegir(cambios, CAMPOS_COLOR) };
    if (nuevo.modelo_id !== c.modelo_id || (c.oficial && ["nombre_es", "nombre_en", "orden"].some((k) => nuevo[k] !== c[k]))) {
      throw error("color_oficial_nombre", "42501");
    }
    if (c.hex_de_fuente && nuevo.hex !== c.hex) throw error("color_hex_fuente", "42501");
    validarColor(nuevo, e);
    Object.assign(c, nuevo);
    escribir(e);
    return copia(c);
  },

  async agregarColor(datos) {
    await red();
    const e = leer();
    exigirGestor(e, "catalogo");
    if (e.colores.some((c) => c.modelo_id === datos.modelo_id && c.oficial)) {
      throw error("colores_oficiales", "42501");
    }
    const c = {
      id: Math.max(0, ...e.colores.map((x) => x.id)) + 1, nombre_en: "", hex: "", orden: 0,
      ...elegir(datos, CAMPOS_COLOR), oficial: false, hex_de_fuente: false
    };
    validarColor(c, e);
    e.colores.push(c);
    escribir(e);
    return copia(c);
  },

  async borrarColor(id) {
    await red();
    const e = leer();
    exigirGestor(e, "catalogo");
    const c = e.colores.find((x) => x.id === id);
    if (!c) return;
    if (c.oficial) throw error("color_oficial_borrar", "42501");
    if (e.equipos.some((q) => q.color_id === id)) throw error("borrar_color_en_uso");
    e.colores.splice(e.colores.indexOf(c), 1);
    escribir(e);
  },

  // ---------------- Fichas ----------------
  async listarFichas() {
    await red();
    const e = leer();
    const activos = new Set(e.modelos.filter((m) => m.activo).map((m) => m.id));
    return copia(e.fichas.filter((f) => esGestor(e) || activos.has(f.modelo_id)));
  },

  async guardarFicha(modeloId, { descripcion, especificaciones }) {
    await red();
    const e = leer();
    exigirGestor(e);
    // Como validar_ficha (0012)
    if (!especificacionesValidas(especificaciones ?? [])) throw error("ficha");
    let f = e.fichas.find((x) => x.modelo_id === modeloId);
    if (!f) { f = { modelo_id: modeloId }; e.fichas.push(f); }
    Object.assign(f, { descripcion: descripcion ?? "", especificaciones: especificaciones ?? [], actualizado_en: ahora() });
    escribir(e);
    return copia(f);
  },

  // ---------------- Reseñas (0014) ----------------
  async listarResenas() {
    await red();
    const e = leer();
    // Como resenas_leer: el público, solo con el interruptor encendido
    if (!esGestor(e) && !e.tienda.mostrar_resenas) return [];
    return copia([...e.resenas].sort((a, b) => a.orden - b.orden || a.creado_en.localeCompare(b.creado_en)));
  },

  async agregarResena(datos) {
    await red();
    const e = leer();
    exigirGestor(e, "resenas");
    if (e.resenas.length >= MAX_RESENAS) throw error("max_resenas");
    const r = { id: uuid(), texto: "", origen: "", origen_otro: "", orden: 0, ...elegir(datos, CAMPOS_RESENA), creado_en: ahora() };
    validarResena(r);
    e.resenas.push(r);
    escribir(e);
    return copia(r);
  },

  async guardarResena(id, cambios) {
    await red();
    const e = leer();
    exigirGestor(e, "resenas");
    const r = e.resenas.find((x) => x.id === id);
    if (!r) throw error("resena_no_existe");
    const nueva = { ...r, ...elegir(cambios, CAMPOS_RESENA) };
    validarResena(nueva);
    Object.assign(r, nueva);
    escribir(e);
    return copia(r);
  },

  async borrarResena(id) {
    await red();
    const e = leer();
    exigirGestor(e, "resenas");
    e.resenas = e.resenas.filter((x) => x.id !== id);
    escribir(e);
  },

  // ---------------- Inventario ----------------
  async listarEquipos() {
    await red();
    const e = leer();
    exigirSesion(e);
    const porId = new Map(e.modelos.map((m) => [m.id, m]));
    return copia(e.equipos.filter((q) => esGestor(e) || equipoEsPublico(q, porId)));
  },

  async crearEquipo(datos) {
    await red();
    const e = leer();
    exigirGestor(e);
    const q = {
      id: uuid(), color_id: null, color_nombre_mostrar: "", en_stock: true, fotos: [], video: "", publicado: false, destacado: false, mas_vendido: false,
      descripcion_extra: "", es_demo: false, bateria_porcentaje: null, estado_estetico: null, detalles: "", incluye: "",
      ...elegir(datos, CAMPOS_EQUIPO), creado_en: ahora(), actualizado_en: ahora()
    };
    validarEquipo(q, e);
    validarColorEquipo(q, e);
    validarMasVendido(q, e);
    e.equipos.push(q);
    e.tienda.precios_actualizados_en = ahora();
    escribir(e);
    return copia(q);
  },

  async actualizarEquipo(id, cambios) {
    await red();
    const e = leer();
    exigirGestor(e);
    const q = e.equipos.find((x) => x.id === id);
    if (!q) throw error("equipo_no_existe");
    const nuevo = { ...q, ...elegir(cambios, CAMPOS_EQUIPO), actualizado_en: ahora() };
    validarEquipo(nuevo, e);
    if (["modelo_id", "color_id", "color_nombre_mostrar"].some((k) => k in cambios)) validarColorEquipo(nuevo, e, q);
    if ("mas_vendido" in cambios) validarMasVendido(nuevo, e, q);
    if (nuevo.precio !== q.precio) e.tienda.precios_actualizados_en = ahora();
    Object.assign(q, nuevo);
    escribir(e);
    return copia(q);
  },

  async borrarEquipo(id) {
    await red();
    const e = leer();
    exigirGestor(e);
    e.equipos = e.equipos.filter((x) => x.id !== id);
    escribir(e);
  },

  // ---------------- Archivos ----------------
  async subirArchivo(bucket, ruta, blob) {
    const e = leer();
    exigirGestor(e);
    // Como Storage: cada bucket con su límite y sus tipos.
    const reglas = BUCKETS[bucket];
    if (!reglas) throw error("subir_archivo");
    if (!reglas.tipos.includes(blob.type)) throw new ErrorDatos(mensajeArchivo(bucket, "tipo"));
    if (blob.size > reglas.max) throw new ErrorDatos(mensajeArchivo(bucket, "peso"));
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
    exigirGestor(e, "borrar_demo");
    if (!e.tienda.legal_publicado) throw SIN_LEGALES_BORRAR();
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
    const yo = exigirSesion(e);
    // Como perfiles_leer: cada uno ve el suyo; el administrador, todos.
    return e.perfiles.filter((p) => yo.rol === "administrador" || p.user_id === yo.user_id).map(({ clave: _c, ...p }) => p);
  },

  async invitarUsuario(correo, rol) {
    await red();
    const e = leer();
    exigirAdministrador(e);
    if (!["administrador", "gestor"].includes(rol)) throw error("elija_rol");
    const c = String(correo).trim().toLowerCase();
    if (e.perfiles.some((p) => p.correo === c)) throw error("correo_existe");
    // En demo el invitado entra con la clave de prueba.
    e.perfiles.push({ user_id: uuid(), correo: c, rol, activo: true, clave: CLAVE_DEMO, creado_en: ahora() });
    escribir(e);
    return { demo: true };
  },

  async cambiarEstadoUsuario(userId, activo) {
    await red();
    const e = leer();
    const yo = exigirAdministrador(e);
    if (yo.user_id === userId) throw error("desactivarse");
    cambiarPerfil(e, userId, { activo });
    escribir(e);
  },

  async cambiarRolUsuario(userId, rol) {
    await red();
    const e = leer();
    const yo = exigirAdministrador(e);
    if (yo.user_id === userId) throw error("propio_rol", "42501");
    if (!["administrador", "gestor"].includes(rol)) throw error("elija_rol");
    cambiarPerfil(e, userId, { rol });
    escribir(e);
  }
};
