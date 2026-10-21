// =============================================================================
// Panel de administración: acceso, rutas (#/seccion) y la vista de Inicio.
// =============================================================================

import { api as obtenerApi } from "../datos/api.js";
import { aplicarTema } from "../tema.js";
import { fechaCorta, plural, whatsappTiendaValido } from "../utils.js";
import { $, $$, esc, avisar, confirmar, conBoton, campoTexto, marcarError, enfocarPrimerError, interruptor } from "./ui.js";

const RUTAS = {
  inicio: () => ({ dibujar: vistaInicio }),
  inventario: () => import("./inventario.js"),
  tienda: () => import("./tienda.js"),
  catalogo: () => import("./catalogo.js"),
  legales: () => import("./legales.js"),
  usuarios: () => import("./usuarios.js")
};

const ctx = {
  api: null,
  usuario: null,
  tienda: null,
  sucio: false,
  alSalir: null,
  // El administrador solo gestiona accesos (Usuarios); el gestor, todo lo demás.
  esAdministrador() { return this.usuario?.rol === "administrador"; },
  esGestor() { return this.usuario?.rol === "gestor"; },
  inicio() { return this.esAdministrador() ? "usuarios" : "inicio"; },
  async recargarTienda() {
    this.tienda = await this.api.leerTienda();
    aplicarTema(this.tienda);
    $("#barra-tienda").textContent = this.tienda.nombre || "Panel de la tienda";
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
    <h1>Iniciar sesión</h1>
    ${mensaje ? `<p class="todo-bien" role="status">${esc(mensaje)}</p>` : ""}
    ${demo ? `<p class="nota-demo">Modo demo: entre con <strong>gestor@demo.co</strong> (tienda, inventario y catálogo) o <strong>administrador@demo.co</strong> (usuarios) y la contraseña <strong>demo1234</strong>. Los cambios quedan solo en este navegador.</p>` : ""}
    <form id="form-login" novalidate>
      ${campoTexto({ id: "l-correo", etiqueta: "Correo", tipo: "email", requerido: true, atributos: 'autocomplete="username" inputmode="email"' })}
      ${campoTexto({ id: "l-clave", etiqueta: "Contraseña", tipo: "password", requerido: true, atributos: 'autocomplete="current-password"' })}
      <p class="popup-alerta" id="l-alerta" role="alert" hidden></p>
      <button class="boton boton--primario boton--grande boton--bloque" type="submit">Entrar</button>
      <button class="boton boton--enlace" type="button" id="ir-recuperar">¿Olvidó su contraseña?</button>
    </form>`);
  const form = $("#form-login");
  $("#l-correo").focus();
  $("#ir-recuperar").addEventListener("click", vistaRecuperar);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const correo = $("#l-correo").value.trim();
    const clave = $("#l-clave").value;
    marcarError(form, "l-correo", correo ? "" : "Escriba su correo.");
    marcarError(form, "l-clave", clave ? "" : "Escriba su contraseña.");
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
    <h1>Recuperar contraseña</h1>
    <p class="nota">Escriba su correo y le enviaremos un enlace para crear una contraseña nueva.</p>
    <form id="form-recuperar" novalidate>
      ${campoTexto({ id: "r-correo", etiqueta: "Correo", tipo: "email", requerido: true, atributos: 'autocomplete="username" inputmode="email"' })}
      <p class="popup-alerta" id="r-alerta" role="alert" hidden></p>
      <button class="boton boton--primario boton--grande boton--bloque" type="submit">Enviar enlace</button>
      <button class="boton boton--enlace" type="button" id="ir-login">Volver a iniciar sesión</button>
    </form>`);
  $("#r-correo").focus();
  $("#ir-login").addEventListener("click", () => vistaLogin());
  $("#form-recuperar").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const correo = $("#r-correo").value.trim();
    if (!marcarError(form, "r-correo", /\S+@\S+\.\S+/.test(correo) ? "" : "Revise su correo.")) return enfocarPrimerError(form);
    try {
      const r = await conBoton(form.querySelector('[type="submit"]'), () => ctx.api.recuperarClave(correo), { exito: "" });
      vistaLogin(r?.demo
        ? "En modo demo no se envían correos. Use la contraseña demo1234."
        : "Si el correo tiene usuario, le llegará un enlace para crear una contraseña nueva. Revise también el correo no deseado.");
    } catch (err) {
      $("#r-alerta").textContent = err.message;
      $("#r-alerta").hidden = false;
    }
  });
}

function vistaNuevaClave(tipo) {
  mostrarAcceso(`
    <h1>${tipo === "invite" ? "Cree su contraseña" : "Contraseña nueva"}</h1>
    <form id="form-clave" novalidate>
      ${campoTexto({ id: "c-clave", etiqueta: "Contraseña nueva", tipo: "password", ayuda: "Mínimo 8 caracteres.", requerido: true, atributos: 'autocomplete="new-password" minlength="8"' })}
      ${campoTexto({ id: "c-clave2", etiqueta: "Repita la contraseña", tipo: "password", requerido: true, atributos: 'autocomplete="new-password"' })}
      <p class="popup-alerta" id="c-alerta" role="alert" hidden></p>
      <button class="boton boton--primario boton--grande boton--bloque" type="submit">Guardar contraseña</button>
    </form>`);
  $("#c-clave").focus();
  $("#form-clave").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const a = $("#c-clave").value;
    const b = $("#c-clave2").value;
    marcarError(form, "c-clave", a.length >= 8 ? "" : "La contraseña debe tener al menos 8 caracteres.");
    marcarError(form, "c-clave2", a === b ? "" : "Las dos contraseñas no coinciden.");
    if (enfocarPrimerError(form)) return;
    try {
      await conBoton(form.querySelector('[type="submit"]'), () => ctx.api.cambiarClave(a), { exito: "Contraseña guardada" });
      history.replaceState(null, "", location.pathname + "#/inicio");
      ctx.usuario = await ctx.api.sesionActual();
      if (ctx.usuario) await entrar(); else vistaLogin("Contraseña guardada. Ya puede iniciar sesión.");
    } catch (err) {
      $("#c-alerta").textContent = err.message;
      $("#c-alerta").hidden = false;
    }
  });
}

// --- Panel ---------------------------------------------------------------------

async function entrar() {
  await ctx.recargarTienda();
  $("#acceso").hidden = true;
  $("#acceso-contenido").innerHTML = "";
  $("#cargando-panel").hidden = true;
  $("#app").hidden = false;
  $("#barra-usuario").textContent = `${ctx.usuario.correo} · ${ctx.esAdministrador() ? "Administrador" : "Gestor"}`;
  $$("[data-rol]").forEach((el) => { el.hidden = el.dataset.rol !== ctx.usuario.rol; });
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
    const salir = await confirmar({ titulo: "Hay cambios sin guardar", texto: "Si sale ahora, se pierden.", aceptar: "Salir sin guardar", peligro: true });
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
  vista.innerHTML = '<p class="subiendo"><span class="spinner" aria-hidden="true"></span>Cargando…</p>';
  try {
    const modulo = await cargar();
    await modulo.dibujar(vista, ctx, resto, params);
  } catch (e) {
    console.error(e);
    if (e?.codigo === "sin-sesion") { ctx.usuario = null; vistaLogin("Su sesión terminó. Vuelva a iniciar sesión."); return; }
    vista.innerHTML = `<p class="popup-alerta" role="alert">${esc(e?.message || "No se pudo cargar esta sección.")}</p>`;
  }
  vista.focus({ preventScroll: true });
  window.scrollTo(0, 0);
}

// --- Inicio ------------------------------------------------------------------

async function vistaInicio(vista) {
  const [equipos, modelos, tienda] = await Promise.all([ctx.api.listarEquipos(), ctx.api.listarModelos(), ctx.recargarTienda()]);
  const activos = new Set(modelos.filter((m) => m.activo).map((m) => m.id));
  const publicados = equipos.filter((q) => q.publicado && q.en_stock && activos.has(q.modelo_id));
  const borradores = equipos.filter((q) => !q.publicado);
  const ocultosPorModelo = equipos.filter((q) => q.publicado && q.en_stock && !activos.has(q.modelo_id));
  const sinFoto = equipos.filter((q) => !q.es_demo && !(q.fotos || []).length);
  const avisos = [
    !tienda.logo && ["Falta el logo", "#/tienda"],
    !whatsappTiendaValido(tienda.whatsapp) && ["Falta el WhatsApp", "#/tienda"],
    (!tienda.texto_privacidad.trim() || !tienda.texto_terminos.trim() || !tienda.texto_autorizacion_datos.trim()) && ["Faltan los textos legales", "#/legales"],
    sinFoto.length && ["Hay equipos sin foto", "#/inventario?fotos=sin"],
    ocultosPorModelo.length && [`${plural(ocultosPorModelo.length, "equipo publicado no se ve", "equipos publicados no se ven")} porque su modelo está inactivo`, "#/catalogo"]
  ].filter(Boolean);
  const demo = equipos.filter((q) => q.es_demo).length;

  vista.innerHTML = `
    <div class="vista-cabecera">
      <h1>Inicio</h1>
      <a class="boton boton--primario" href="../" target="_blank" rel="noopener">Ver mi sitio</a>
    </div>
    <section class="bloque" aria-labelledby="t-inventario">
      <h2 id="t-inventario">Inventario</h2>
      <div class="estadisticas cifras">
        <a class="estadistica" href="#/inventario?publicado=si"><strong class="cifras-grandes">${publicados.length}</strong><span>Publicados</span></a>
        <a class="estadistica" href="#/inventario?publicado=no"><strong class="cifras-grandes">${borradores.length}</strong><span>En borrador</span></a>
      </div>
      <p>Última actualización de precios: <strong class="cifras">${fechaCorta(tienda.precios_actualizados_en) || "sin precios todavía"}</strong></p>
      <a class="boton boton--secundario" href="#/inventario/nuevo">Agregar equipo</a>
    </section>
    <section class="bloque" aria-labelledby="t-avisos">
      <h2 id="t-avisos">Lo que falta</h2>
      ${avisos.length
        ? `<ul class="avisos">${avisos.map(([t, href]) => `<li><span>${esc(t)}</span><a href="${href}">Resolver</a></li>`).join("")}</ul>`
        : '<p class="todo-bien">Todo está completo.</p>'}
    </section>
    ${ctx.esGestor() ? `
    <section class="bloque" aria-labelledby="t-demo">
      <h2 id="t-demo">Modo demo</h2>
      <p class="ayuda">Con el modo demo encendido, el sitio muestra la franja "Sitio en preparación". Hay ${plural(demo, "equipo de demostración", "equipos de demostración")}.</p>
      ${interruptor({ id: "i-modo-demo", etiqueta: "Mostrar la franja de demostración", marcado: tienda.modo_demo })}
      <button type="button" class="boton boton--peligro" id="borrar-demo" ${!demo && !tienda.modo_demo ? "disabled" : ""}>Borrar datos de demostración</button>
      ${ctx.api.tipo === "demo" ? '<button type="button" class="boton boton--secundario" id="reiniciar-demo">Volver a los datos iniciales (solo en este navegador)</button>' : ""}
    </section>` : ""}`;

  $("#i-modo-demo")?.addEventListener("change", async (e) => {
    try {
      await conBoton(null, () => ctx.api.guardarTienda({ modo_demo: e.target.checked }));
    } catch { e.target.checked = !e.target.checked; }
  });
  $("#borrar-demo")?.addEventListener("click", async (e) => {
    const ok = await confirmar({
      titulo: "¿Borrar los datos de demostración?",
      texto: "Se borran los equipos de ejemplo, se apagan los modelos que se activaron para la demo y se quita la franja. No se puede deshacer.",
      aceptar: "Borrar", peligro: true
    });
    if (!ok) return;
    await conBoton(e.currentTarget, () => ctx.api.borrarDatosDemo(), { exito: "Datos de demostración borrados" });
    await vistaInicio(vista);
  });
  $("#reiniciar-demo")?.addEventListener("click", async () => {
    if (!(await confirmar({ titulo: "¿Volver a los datos iniciales?", texto: "Se pierden todos los cambios hechos en este navegador.", aceptar: "Reiniciar", peligro: true }))) return;
    await ctx.api.reiniciarDemo();
    location.reload();
  });
}

// --- Arranque ------------------------------------------------------------------

async function iniciar() {
  try {
    ctx.api = await obtenerApi();
    await ctx.api.iniciar();
    const tipo = await ctx.api.tipoDeEnlace();
    ctx.usuario = await ctx.api.sesionActual();
    if (tipo === "invite" || tipo === "recovery") {
      if (ctx.usuario) return vistaNuevaClave(tipo);
    }
    if (!ctx.usuario) return vistaLogin();
    await entrar();
  } catch (e) {
    console.error(e);
    mostrarAcceso(`<p class="popup-alerta" role="alert">No se pudo abrir el panel: ${esc(e?.message || "error desconocido")}. Recargue la página.</p>`);
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
