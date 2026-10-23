// =============================================================================
// Panel de administración: acceso, rutas (#/seccion) y la vista de Inicio.
// =============================================================================

import { CONFIG } from "../../../config.js";
import { api as obtenerApi } from "../datos/api.js";
import { aplicarTema } from "../tema.js";
import { fechaCorta, formatearMiles } from "../utils.js";
import { whatsappValido, fijarPais } from "../datos/paises.js";
import { frasesPagos } from "../datos/comun.js";
import { tieneEnvios } from "../datos/envios.js";
import { camposDeEjemplo, legalesDeEjemplo, MODOS_FABRICA } from "../datos/ejemplo.js";
import { $, $$, esc, avisar, confirmar, conBoton, campoTexto, marcarError, enfocarPrimerError, interruptor } from "./ui.js";
import { republicarAlGuardar } from "./legales.js";
import { faltantes } from "../legal/motor.js";
import { t, tn, cargarIdioma, traducirDom, idiomaActual, idiomaGuardado } from "../i18n/i18n.js";

const RUTAS = {
  inicio: () => ({ dibujar: vistaInicio }),
  inventario: () => import("./inventario.js"),
  tienda: () => import("./tienda.js"),
  catalogo: () => import("./catalogo.js"),
  promos: () => import("./promos.js"),
  legales: () => import("./legales.js"),
  usuarios: () => import("./usuarios.js")
};

const ctx = {
  api: null,
  usuario: null,
  tienda: null,
  sucio: false,
  alSalir: null,
  // 0035: el administrador hace todo lo del gestor y, además, Usuarios.
  // esGestor() = "puede gestionar la tienda" (gestor o administrador).
  esAdministrador() { return this.usuario?.rol === "administrador"; },
  esGestor() { return ["gestor", "administrador"].includes(this.usuario?.rol); },
  inicio() { return "inicio"; },
  async recargarTienda() {
    this.tienda = await this.api.leerTienda();
    fijarPais(this.tienda.pais);
    if ((this.tienda.idioma || "es") !== idiomaActual()) { await cargarIdioma(this.tienda.idioma); traducirDom(); }
    aplicarTema(this.tienda);
    $("#barra-tienda").textContent = this.tienda.nombre || t("panel.comun.panel_tienda");
    return this.tienda;
  },
  ir(ruta) { location.hash = `#/${ruta}`; },
  // Cambia la dirección sin volver a dibujar la vista (pestañas).
  marcarRuta(ruta) { history.replaceState(null, "", `#/${ruta}`); rutaAnterior = location.hash; }
};

// --- Acceso ------------------------------------------------------------------

function mostrarAcceso(html) {
  $("#cargando-panel").hidden = true;
  $("#app").hidden = true;
  $("#acceso").hidden = false;
  $("#acceso-contenido").innerHTML = html;
}

function vistaLogin(mensaje = "") {
  const demo = ctx.api.tipo === "demo";
  mostrarAcceso(`
    <h1>${esc(t("panel.acceso.iniciar_sesion"))}</h1>
    ${mensaje ? `<p class="todo-bien" role="status">${esc(mensaje)}</p>` : ""}
    ${demo ? `<p class="nota-demo">${esc(t("panel.acceso.nota_demo")).replace(/\{(gestor|administrador|clave)\}/g, (m, c) => `<strong>${{ gestor: "gestor@demo.co", administrador: "administrador@demo.co", clave: "demo1234" }[c]}</strong>`)}</p>` : ""}
    <form id="form-login" novalidate>
      ${campoTexto({ id: "l-correo", etiqueta: t("panel.acceso.correo"), tipo: "email", requerido: true, atributos: 'autocomplete="username" inputmode="email"' })}
      ${campoTexto({ id: "l-clave", etiqueta: t("panel.acceso.contrasena"), tipo: "password", requerido: true, atributos: 'autocomplete="current-password"' })}
      <p class="popup-alerta" id="l-alerta" role="alert" hidden></p>
      <button class="boton boton--primario boton--grande boton--bloque" type="submit">${esc(t("panel.acceso.entrar"))}</button>
      <button class="boton boton--enlace" type="button" id="ir-recuperar">${esc(t("panel.acceso.olvido"))}</button>
    </form>`);
  const form = $("#form-login");
  $("#l-correo").focus();
  $("#ir-recuperar").addEventListener("click", vistaRecuperar);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const correo = $("#l-correo").value.trim();
    const clave = $("#l-clave").value;
    marcarError(form, "l-correo", correo ? "" : t("panel.acceso.escriba_correo"));
    marcarError(form, "l-clave", clave ? "" : t("panel.acceso.escriba_contrasena"));
    if (enfocarPrimerError(form)) return;
    const alerta = $("#l-alerta");
    alerta.hidden = true;
    try {
      ctx.usuario = await conBoton(form.querySelector('[type="submit"]'), () => ctx.api.iniciarSesion(correo, clave), { exito: "" });
      await entrar();
    } catch (err) {
      alerta.textContent = err.message;
      alerta.hidden = false;
    }
  });
}

function vistaRecuperar() {
  mostrarAcceso(`
    <h1>${esc(t("panel.acceso.recuperar_titulo"))}</h1>
    <p class="nota">${esc(t("panel.acceso.recuperar_nota"))}</p>
    <form id="form-recuperar" novalidate>
      ${campoTexto({ id: "r-correo", etiqueta: t("panel.acceso.correo"), tipo: "email", requerido: true, atributos: 'autocomplete="username" inputmode="email"' })}
      <p class="popup-alerta" id="r-alerta" role="alert" hidden></p>
      <button class="boton boton--primario boton--grande boton--bloque" type="submit">${esc(t("panel.acceso.enviar_enlace"))}</button>
      <button class="boton boton--enlace" type="button" id="ir-login">${esc(t("panel.acceso.volver_login"))}</button>
    </form>`);
  $("#r-correo").focus();
  $("#ir-login").addEventListener("click", () => vistaLogin());
  $("#form-recuperar").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const correo = $("#r-correo").value.trim();
    if (!marcarError(form, "r-correo", /\S+@\S+\.\S+/.test(correo) ? "" : t("panel.acceso.revise_correo"))) return enfocarPrimerError(form);
    try {
      const r = await conBoton(form.querySelector('[type="submit"]'), () => ctx.api.recuperarClave(correo), { exito: "" });
      vistaLogin(r?.demo
        ? t("panel.acceso.recuperar_demo")
        : t("panel.acceso.recuperar_enviado"));
    } catch (err) {
      $("#r-alerta").textContent = err.message;
      $("#r-alerta").hidden = false;
    }
  });
}

function vistaNuevaClave(tipo) {
  mostrarAcceso(`
    <h1>${esc(t(tipo === "invite" ? "panel.acceso.cree_contrasena" : "panel.acceso.contrasena_nueva"))}</h1>
    <form id="form-clave" novalidate>
      ${campoTexto({ id: "c-clave", etiqueta: t("panel.acceso.contrasena_nueva"), tipo: "password", ayuda: esc(t("panel.acceso.minimo_8")), requerido: true, atributos: 'autocomplete="new-password" minlength="8"' })}
      ${campoTexto({ id: "c-clave2", etiqueta: t("panel.acceso.repita_contrasena"), tipo: "password", requerido: true, atributos: 'autocomplete="new-password"' })}
      <p class="popup-alerta" id="c-alerta" role="alert" hidden></p>
      <button class="boton boton--primario boton--grande boton--bloque" type="submit">${esc(t("panel.acceso.guardar_contrasena"))}</button>
    </form>`);
  $("#c-clave").focus();
  $("#form-clave").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const a = $("#c-clave").value;
    const b = $("#c-clave2").value;
    marcarError(form, "c-clave", a.length >= 8 ? "" : t("panel.acceso.clave_corta"));
    marcarError(form, "c-clave2", a === b ? "" : t("panel.acceso.no_coinciden"));
    if (enfocarPrimerError(form)) return;
    try {
      await conBoton(form.querySelector('[type="submit"]'), () => ctx.api.cambiarClave(a), { exito: t("panel.acceso.contrasena_guardada") });
      history.replaceState(null, "", location.pathname + "#/inicio");
      ctx.usuario = await ctx.api.sesionActual();
      if (ctx.usuario) await entrar(); else vistaLogin(t("panel.acceso.contrasena_guardada_login"));
    } catch (err) {
      $("#c-alerta").textContent = err.message;
      $("#c-alerta").hidden = false;
    }
  });
}

// --- Panel ---------------------------------------------------------------------

// Compatibilidad: el ID del píxel estaba en config.js. Se copia una vez a la
// tienda (Legales → Herramientas) si allí está vacío.
async function copiarPixelViejo() {
  const viejo = String(CONFIG.metaPixelId || "").trim();
  if (!ctx.esGestor() || !viejo || ctx.tienda.meta_pixel_id || !/^\d{5,20}$/.test(viejo)) return;
  try { ctx.tienda = await ctx.api.guardarTienda({ meta_pixel_id: viejo }); } catch (e) { console.error("píxel de config.js", e); }
}

async function entrar() {
  await ctx.recargarTienda();
  await copiarPixelViejo();
  $("#acceso").hidden = true;
  $("#acceso-contenido").innerHTML = "";
  $("#cargando-panel").hidden = true;
  $("#app").hidden = false;
  $("#barra-usuario").textContent = `${ctx.usuario.correo} · ${t(ctx.esAdministrador() ? "panel.comun.rol.administrador" : "panel.comun.rol.gestor")}`;
  // data-rol="gestor": gestor y administrador; data-rol="administrador": solo el administrador (0035).
  $$("[data-rol]").forEach((el) => { el.hidden = el.dataset.rol === "administrador" ? !ctx.esAdministrador() : !ctx.esGestor(); });
  if (!location.hash.startsWith("#/")) history.replaceState(null, "", `#/${ctx.inicio()}`);
  await enrutar();
}

let rutaAnterior = "";
async function enrutar() {
  if (!ctx.usuario) return;
  let [nombre = "inicio", ...resto] = location.hash.replace(/^#\/?/, "").split("?")[0].split("/");
  // "Fichas técnicas" ahora es una pestaña de Catálogo.
  if (nombre === "fichas") {
    resto = ["ficha", ...resto];
    nombre = "catalogo";
    history.replaceState(null, "", `#/catalogo/${resto.join("/")}`);
  }
  const params = new URLSearchParams(location.hash.split("?")[1] || "");
  if (ctx.sucio && location.hash !== rutaAnterior) {
    const salir = await confirmar({ titulo: t("panel.nav.sin_guardar_titulo"), texto: t("panel.nav.sin_guardar_texto"), aceptar: t("panel.nav.salir_sin_guardar"), peligro: true });
    if (!salir) { history.replaceState(null, "", rutaAnterior); return; }
  }
  ctx.sucio = false;
  ctx.alSalir?.();
  ctx.alSalir = null;
  rutaAnterior = location.hash;
  // Cada rol ve solo sus secciones; lo demás lleva a su inicio.
  const permitida = RUTAS[nombre] && (nombre === "usuarios" ? ctx.esAdministrador() : ctx.esGestor());
  const cargar = permitida ? RUTAS[nombre] : RUTAS[ctx.inicio()];
  if (!permitida && nombre !== ctx.inicio()) history.replaceState(null, "", `#/${ctx.inicio()}`);
  $$(".navegacion a").forEach((a) => {
    if (a.dataset.ruta === nombre) a.setAttribute("aria-current", "page"); else a.removeAttribute("aria-current");
  });
  const vista = $("#vista");
  vista.innerHTML = `<p class="subiendo"><span class="spinner" aria-hidden="true"></span>${esc(t("panel.nav.cargando"))}</p>`;
  try {
    const modulo = await cargar();
    await modulo.dibujar(vista, ctx, resto, params);
  } catch (e) {
    console.error(e);
    if (e?.codigo === "sin-sesion") { ctx.usuario = null; vistaLogin(t("panel.nav.sesion_terminada")); return; }
    vista.innerHTML = `<p class="popup-alerta" role="alert">${esc(e?.message || t("panel.nav.no_se_pudo_cargar"))}</p>`;
  }
  vista.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

// --- Inicio ------------------------------------------------------------------

// Video de introducción al panel (ronda 3, E). El botón "Ver intro" solo
// aparece si el archivo existe: un HEAD liviano al dibujar Inicio. Nada se
// descarga hasta que se reproduce (preload="none", sin reproducción automática).
const VIDEO_INTRO = "../assets/videos/intro-panel.mp4";
async function prepararIntro() {
  const boton = $("#ver-intro");
  const dialogo = $("#dialogo-intro");
  if (!boton || !dialogo) return;
  let existe = false;
  try {
    const r = await fetch(VIDEO_INTRO, { method: "HEAD", cache: "no-store" });
    const tipo = r.headers.get("content-type") || "";
    // Un hosting que responde con una página para cualquier ruta no cuenta.
    existe = r.ok && (!tipo || tipo.startsWith("video/"));
  } catch { /* sin conexión: sin botón */ }
  if (!existe || !boton.isConnected) return;
  boton.hidden = false;
  const video = $("video", dialogo);
  boton.addEventListener("click", () => dialogo.showModal());
  // Escape o "Cerrar": se pausa el video y el foco vuelve al botón.
  dialogo.addEventListener("close", () => { video.pause(); boton.focus(); });
}

async function vistaInicio(vista) {
  const [equipos, modelos, tienda] = await Promise.all([ctx.api.listarEquipos(), ctx.api.listarModelos(), ctx.recargarTienda()]);
  const activos = new Set(modelos.filter((m) => m.activo).map((m) => m.id));
  const publicados = equipos.filter((q) => q.publicado && q.en_stock && activos.has(q.modelo_id));
  const borradores = equipos.filter((q) => !q.publicado);
  const ocultosPorModelo = equipos.filter((q) => q.publicado && q.en_stock && !activos.has(q.modelo_id));
  const sinFoto = equipos.filter((q) => !q.es_demo && !(q.fotos || []).length);
  // Legales primero: sin publicar, el pop-up no envía pedidos (0017).
  const legales = faltantes(tienda);
  const pasoLegal = legales.find((f) => f.paso > 0)?.paso || 6;
  // Datos de ejemplo (0037): primero, porque con ellos no se quita la demostración.
  const ejemplo = camposDeEjemplo(tienda);
  const avisos = [
    ejemplo.includes("whatsapp") && [t("panel.inicio.whatsapp_ejemplo"), "#/tienda"],
    legalesDeEjemplo(tienda) && [t("panel.inicio.legales_ejemplo"), "#/legales/2"],
    !tienda.legal_publicado && [t("panel.inicio.falta_legales"), `#/legales/${pasoLegal}`],
    tienda.legal_publicado && legales.length && [t("panel.inicio.faltan_datos_legales"), `#/legales/${pasoLegal}`],
    !tienda.nombre.trim() && [t("panel.inicio.falta_nombre"), "#/tienda"],
    !tienda.ciudad.trim() && [t("panel.inicio.falta_ciudad"), "#/tienda"],
    !tienda.correo_contacto.trim() && [t("panel.inicio.falta_correo"), "#/tienda"],
    !tienda.logo && [t("panel.inicio.falta_logo"), "#/tienda"],
    !whatsappValido(tienda.whatsapp, tienda.pais) && [t("panel.inicio.falta_whatsapp"), "#/tienda"],
    !frasesPagos(tienda).length && [t("panel.inicio.faltan_pagos"), "#/catalogo/pagos"],
    !tieneEnvios(tienda) && [t("panel.inicio.faltan_envios"), "#/catalogo/envios"],
    sinFoto.length && [t("panel.inicio.sin_foto"), "#/inventario?fotos=sin"],
    ocultosPorModelo.length && [tn("panel.inicio.ocultos_por_modelo", ocultosPorModelo.length, { n: formatearMiles(ocultosPorModelo.length) }), "#/catalogo"]
  ].filter(Boolean);
  const demo = equipos.filter((q) => q.es_demo).length;

  vista.innerHTML = `
    <div class="vista-cabecera">
      <h1>${esc(t("panel.inicio.titulo"))}</h1>
      <div class="cabecera-acciones">
        <a class="boton boton--primario" href="../" target="_blank" rel="noopener">${esc(t("panel.comun.ver_sitio"))}</a>
        <button type="button" class="boton boton--violeta" id="ver-intro" aria-haspopup="dialog" hidden>${esc(t("panel.inicio.ver_intro"))}</button>
      </div>
    </div>
    <dialog class="dialogo-intro" id="dialogo-intro" aria-labelledby="intro-titulo">
      <div class="dialogo-intro-contenido">
        <h2 id="intro-titulo">${esc(t("panel.inicio.intro_titulo"))}</h2>
        <video src="${VIDEO_INTRO}" controls preload="none" playsinline aria-label="${esc(t("panel.inicio.intro_titulo"))}"></video>
        <form method="dialog"><button class="boton boton--secundario" value="cerrar">${esc(t("panel.comun.cerrar"))}</button></form>
      </div>
    </dialog>
    <section class="bloque" aria-labelledby="t-inventario">
      <h2 id="t-inventario">${esc(t("panel.inicio.inventario"))}</h2>
      <div class="estadisticas cifras">
        <a class="estadistica" href="#/inventario?publicado=si"><strong class="cifras-grandes">${publicados.length}</strong><span>${esc(t("panel.inicio.publicados"))}</span></a>
        <a class="estadistica" href="#/inventario?publicado=no"><strong class="cifras-grandes">${borradores.length}</strong><span>${esc(t("panel.inicio.en_borrador"))}</span></a>
      </div>
      <p>${esc(t("panel.inicio.ultima_actualizacion"))} <strong class="cifras">${fechaCorta(tienda.precios_actualizados_en) || esc(t("panel.inicio.sin_precios"))}</strong></p>
      <a class="boton boton--secundario" href="#/inventario/nuevo">${esc(t("panel.inicio.agregar_equipo"))}</a>
    </section>
    <section class="bloque" aria-labelledby="t-avisos">
      <h2 id="t-avisos">${esc(t("panel.inicio.lo_que_falta"))}</h2>
      ${avisos.length
        ? `<ul class="avisos">${avisos.map(([texto, href]) => `<li><span>${esc(texto)}</span><a href="${href}">${esc(t("panel.inicio.resolver"))}</a></li>`).join("")}</ul>`
        : `<p class="todo-bien">${esc(t("panel.inicio.todo_completo"))}</p>`}
    </section>
    ${ctx.esGestor() ? `
    <section class="bloque" aria-labelledby="t-demo">
      <h2 id="t-demo">${esc(t("panel.inicio.modo_demo"))}</h2>
      <p class="ayuda">${esc(tn("panel.inicio.demo_ayuda", demo, { n: formatearMiles(demo) }))}</p>
      ${!tienda.legal_publicado ? `<p class="aviso-datos" id="demo-sin-legales">${esc(t("panel.inicio.demo_sin_legales")).replace("{enlace}", `<a href="#/legales/${pasoLegal}">${esc(t("panel.inicio.publique_legales"))}</a>`)}</p>`
        : ejemplo.length ? `<p class="aviso-datos" id="demo-sin-legales">${esc(t("panel.inicio.demo_con_ejemplo"))}</p>` : ""}
      ${interruptor({ id: "i-modo-demo", etiqueta: t("panel.inicio.mostrar_franja"), marcado: tienda.modo_demo, atributos: (!tienda.legal_publicado || ejemplo.length) && tienda.modo_demo ? 'disabled aria-describedby="demo-sin-legales"' : "" })}
      <button type="button" class="boton boton--peligro" id="borrar-demo" ${(!demo && !tienda.modo_demo) || !tienda.legal_publicado || ejemplo.length ? "disabled" : ""} ${!tienda.legal_publicado || ejemplo.length ? 'aria-describedby="demo-sin-legales"' : ""}>${esc(t("panel.inicio.borrar_demo"))}</button>
    </section>` : ""}
    ${ctx.esAdministrador() ? `
    <section class="bloque" aria-labelledby="t-fabrica">
      <h2 id="t-fabrica">${esc(t("panel.inicio.fabrica"))}</h2>
      <p class="ayuda">${esc(t("panel.inicio.fabrica_ayuda"))}</p>
      <fieldset class="campo">
        <legend>${esc(t("panel.inicio.fabrica_modo"))}</legend>
        <div class="opciones-vista">
          ${MODOS_FABRICA.map((m, i) => `<label class="opcion-vista"><input type="radio" name="fabrica_modo" value="${m}" aria-describedby="fabrica-${m}-ayuda" ${i === 0 ? "checked" : ""}>
            <span class="opcion-vista-nombre">${esc(t(`panel.inicio.fabrica_${m}`))}</span>
            <span class="ayuda" id="fabrica-${m}-ayuda">${esc(t(`panel.inicio.fabrica_${m}_ayuda`))}</span>
          </label>`).join("")}
        </div>
      </fieldset>
      <button type="button" class="boton boton--peligro" id="restablecer-fabrica">${esc(t("panel.inicio.fabrica_boton"))}</button>
    </section>` : ""}`;

  prepararIntro();
  $("#i-modo-demo")?.addEventListener("change", async (e) => {
    try {
      await conBoton(null, () => ctx.api.guardarTienda({ modo_demo: e.target.checked }));
    } catch { e.target.checked = !e.target.checked; }
  });
  $("#borrar-demo")?.addEventListener("click", async (e) => {
    const ok = await confirmar({
      titulo: t("panel.inicio.borrar_demo_titulo"),
      texto: t("panel.inicio.borrar_demo_texto"),
      aceptar: t("panel.inicio.borrar"), peligro: true
    });
    if (!ok) return;
    await conBoton(e.currentTarget, () => ctx.api.borrarDatosDemo(), { exito: t("panel.inicio.demo_borrados") });
    await vistaInicio(vista);
  });
  // Restablecer de fábrica (0036): se recarga el panel entero (cambian la
  // marca, el idioma y todo lo demás) y el aviso se muestra al volver.
  // Modo (0041): la vitrina completa o la básica.
  $("#restablecer-fabrica")?.addEventListener("click", async (e) => {
    const ok = await confirmar({
      titulo: t("panel.inicio.fabrica_titulo"), texto: t("panel.inicio.fabrica_texto"),
      aceptar: t("panel.inicio.fabrica_boton"), peligro: true, palabra: t("panel.inicio.fabrica_palabra")
    });
    if (!ok) return;
    const modo = $('input[name="fabrica_modo"]:checked')?.value || MODOS_FABRICA[0];
    try { await conBoton(e.currentTarget, () => ctx.api.restablecerFabrica(modo), { exito: "" }); } catch { return; }
    try { sessionStorage.setItem(AVISO_AL_VOLVER, t("panel.inicio.fabrica_listo")); } catch { /* sin almacenamiento */ }
    location.reload();
  });
  let aviso = "";
  try { aviso = sessionStorage.getItem(AVISO_AL_VOLVER) || ""; sessionStorage.removeItem(AVISO_AL_VOLVER); } catch { /* nada */ }
  if (aviso) avisar(aviso);
}
const AVISO_AL_VOLVER = "cotizadora:panel-aviso";

// --- Arranque ------------------------------------------------------------------

async function iniciar() {
  try {
    // El idioma de la visita anterior, hasta leer la tienda (pantalla de acceso).
    await cargarIdioma(idiomaGuardado());
    traducirDom();
    ctx.api = await obtenerApi();
    await ctx.api.iniciar();
    republicarAlGuardar(ctx.api);
    const tipo = await ctx.api.tipoDeEnlace();
    ctx.usuario = await ctx.api.sesionActual();
    if (tipo === "invite" || tipo === "recovery") {
      if (ctx.usuario) return vistaNuevaClave(tipo);
    }
    if (!ctx.usuario) return vistaLogin();
    await entrar();
  } catch (e) {
    console.error(e);
    mostrarAcceso(`<p class="popup-alerta" role="alert">${esc(t("panel.comun.error_arranque", { error: e?.message || t("panel.comun.error_desconocido") }))}</p>`);
  }
}

$("#salir").addEventListener("click", async () => {
  await ctx.api.cerrarSesion();
  ctx.usuario = null;
  history.replaceState(null, "", location.pathname);
  vistaLogin();
});
window.addEventListener("hashchange", enrutar);
window.addEventListener("beforeunload", (e) => { if (ctx.sucio) { e.preventDefault(); e.returnValue = ""; } });

iniciar();
