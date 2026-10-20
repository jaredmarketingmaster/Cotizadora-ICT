// =============================================================================
// Sitio público: carga los datos y arma encabezado, filtros, galería,
// detalle, información de la tienda y pie.
// =============================================================================

import { CONFIG } from "../../../config.js";
import { api as obtenerApi } from "../datos/api.js";
import { aplicarTema } from "../tema.js";
import { logoGenericoSVG } from "../ilustracion.js";
import { escaparHTML, fechaCorta, plural, seguro, slugCapacidad, capacidadDeSlug, reducirMovimiento } from "../utils.js";
import {
  prepararCatalogo, filtrar, contarEquipos, opcionesModelo, opcionesCapacidad, encadenar,
  tarjetas as armarTarjetas, diapositivas, describirBusqueda
} from "./catalogo.js";
import { iniciarSegmentado, iniciarChips, iniciarDesplegable, marcarLimpiado } from "./filtros.js";
import { crearGaleria } from "./galeria.js";
import { crearCarruselEquipos } from "./carrusel-equipos.js";
import { crearDetalle, htmlBarraCompra } from "./detalle.js";
import { crearPopup } from "./popup.js";
import { capturarAtribucion } from "./atribucion.js";
import { iniciarPixel, evento, parametrosEquipo } from "./pixel.js";

const $ = (s) => document.querySelector(s);

let api;
let cat;
let filtros = { condicion: "", modelo: "", capacidad: "" };
let ultimasTarjetas = [];
let controles;
let galeria;
let popup;
let detalleEnLinea = null;
let detalleHoja = null;
let claveEnLinea = "";

// --- URL ---------------------------------------------------------------------
function leerFiltrosURL() {
  const p = new URLSearchParams(location.search);
  const condicion = ["nuevo", "usado"].includes(p.get("condicion")) ? p.get("condicion") : "";
  const modelo = cat.porSlug.has(p.get("modelo")) ? p.get("modelo") : "";
  const capacidad = capacidadDeSlug(p.get("capacidad"));
  return { condicion, modelo, capacidad };
}

// Solo cambia condicion, modelo y capacidad; los UTM y demás se quedan.
function escribirFiltrosURL() {
  const url = new URL(location.href);
  for (const [k, v] of Object.entries({ condicion: filtros.condicion, modelo: filtros.modelo, capacidad: filtros.capacidad && slugCapacidad(filtros.capacidad) })) {
    if (v) url.searchParams.set(k, v); else url.searchParams.delete(k);
  }
  history.replaceState(history.state, "", url);
}

// --- Encabezado, info y pie ----------------------------------------------------
function dibujarMarca(t) {
  const logo = t.logo ? api.urlArchivo("marca", t.logo) : "";
  $("#marca-logo").innerHTML = logo ? `<img src="${escaparHTML(logo)}" alt="" width="160" height="40">` : logoGenericoSVG();
  $("#marca-nombre").textContent = t.nombre || "";
  if (t.nombre) document.title = `${t.nombre} · Elija su iPhone y cómprelo por WhatsApp`;
  if (t.favicon) {
    const link = document.querySelector('link[rel="icon"]');
    link.href = api.urlArchivo("marca", t.favicon);
  }
  $("#franja-demo").hidden = !t.modo_demo;
}

function urlMapa(t) {
  const q = [t.direccion, t.ciudad].filter(Boolean).join(", ");
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(q)}`;
}

function dibujarInfo(t) {
  const datos = [
    t.direccion && ["Dirección", [t.direccion, t.ciudad].filter(Boolean).join(", ")],
    !t.direccion && t.ciudad && ["Ciudad", t.ciudad],
    t.horario_texto && ["Horario", t.horario_texto]
  ].filter(Boolean);
  const redes = [
    t.instagram_url && ["Instagram", t.instagram_url],
    t.facebook_url && ["Facebook", t.facebook_url],
    t.tiktok_url && ["TikTok", t.tiktok_url]
  ].filter(Boolean).filter(([, u]) => /^https?:\/\//i.test(u));
  if (!datos.length && !redes.length) { $("#info-tienda").hidden = true; return; }
  $("#info-tienda").hidden = false;
  $("#info-titulo").textContent = t.nombre || "La tienda";
  $("#info-datos").innerHTML = datos.map(([k, v]) => `<div><dt>${k}</dt><dd>${escaparHTML(v)}</dd></div>`).join("");
  $("#info-acciones").innerHTML = `
    ${t.direccion ? `<a class="boton boton--primario" href="${escaparHTML(urlMapa(t))}" target="_blank" rel="noopener">Cómo llegar</a>` : ""}
    ${redes.length ? `<div class="redes">${redes.map(([n, u]) => `<a class="boton boton--secundario" href="${escaparHTML(u)}" target="_blank" rel="noopener">${n}</a>`).join("")}</div>` : ""}`;
}

function dibujarPie(t) {
  $("#pie-tienda").textContent = [t.nombre, t.ciudad].filter(Boolean).join(" · ");
  const fecha = fechaCorta(t.precios_actualizados_en);
  $("#pie-precios").textContent = fecha ? `Precios actualizados al ${fecha}` : "";
  $("#pie-aviso").textContent = t.aviso_marca || "";
  $("#pie-aviso").hidden = !t.aviso_marca;
}

// --- Filtros y galería ---------------------------------------------------------
function cambiarFiltro(campo, valor) {
  const previo = { ...filtros };
  filtros[campo] = valor;
  const { filtros: corregidos, limpiados } = encadenar(cat, filtros);
  filtros = corregidos;
  if (limpiados.includes("modelo")) marcarLimpiado(controles.modelo.boton);
  if (limpiados.includes("capacidad")) marcarLimpiado($("#f-capacidad"));
  if (JSON.stringify(previo) !== JSON.stringify(filtros)) {
    escribirFiltrosURL();
    actualizar();
  }
}

function actualizar() {
  const { condicion, modelo, capacidad } = filtros;
  controles.condicion.marcar(condicion);

  const grupos = opcionesModelo(cat, condicion);
  const totalCondicion = contarEquipos(filtrar(cat.equipos, { condicion }));
  controles.modelo.actualizar(grupos, modelo, modelo ? cat.porSlug.get(modelo)?.nombre : "", totalCondicion);
  controles.capacidad.dibujar(opcionesCapacidad(cat, condicion, modelo), capacidad);

  const lista = filtrar(cat.equipos, filtros);
  const cantidad = contarEquipos(lista);
  $("#contador").textContent = plural(cantidad, "equipo disponible", "equipos disponibles");
  $("#limpiar").hidden = !(condicion || modelo || capacidad);

  ultimasTarjetas = armarTarjetas(lista);
  $("#vacio").hidden = ultimasTarjetas.length > 0;
  galeria.dibujar(ultimasTarjetas);

  // Con los tres filtros y una sola tarjeta, el detalle se abre solo debajo.
  const unica = condicion && modelo && capacidad && ultimasTarjetas.length === 1 ? ultimasTarjetas[0] : null;
  if (unica) mostrarEnLinea(unica); else quitarEnLinea();
}

// --- Vista de los equipos: cuadrícula o carrusel --------------------------------
let carrusel = null;
let vistaActual = "cuadricula";
function aplicarVista(t) {
  const vista = t.vista_equipos === "carrusel" ? "carrusel" : "cuadricula";
  if (vista === vistaActual) return;
  vistaActual = vista;
  const region = $("#vista-equipos");
  const lista = $("#lista-equipos");
  const enCarrusel = vista === "carrusel";
  region.classList.toggle("carrusel-equipos", enCarrusel);
  lista.classList.toggle("galeria--carrusel", enCarrusel);
  if (enCarrusel) {
    region.setAttribute("role", "region");
    region.setAttribute("aria-roledescription", "carrusel");
    region.setAttribute("aria-label", "Equipos disponibles");
    carrusel ??= crearCarruselEquipos(region, lista);
    galeria.usarCarrusel(carrusel);
  } else {
    for (const a of ["role", "aria-roledescription", "aria-label"]) region.removeAttribute(a);
    region.hidden = false;
    region.querySelectorAll(".ce-flecha, .ce-indicador").forEach((el) => { el.hidden = true; });
    for (const li of lista.children) {
      for (const a of ["style", "role", "aria-roledescription", "aria-label", "aria-hidden", "data-centro"]) li.removeAttribute(a);
      li.querySelector(".tarjeta-boton")?.removeAttribute("tabindex");
    }
    lista.style.height = "";
    galeria.usarCarrusel(null);
  }
}

// --- Detalle -----------------------------------------------------------------
function comprar(q) {
  popup.abrir({ tipo: "compra", equipo: q });
}

function mostrarEnLinea(tarjeta) {
  if (claveEnLinea === tarjeta.clave && detalleEnLinea) return;
  quitarEnLinea();
  const { lista, inicial } = diapositivas(cat, tarjeta);
  const barra = $("#barra-compra");
  detalleEnLinea = crearDetalle({
    api, cat, tarjeta, lista, inicial, alComprar: comprar, idTitulo: "detalle-en-linea-titulo",
    alCambiarEquipo: (q) => { barra.innerHTML = htmlBarraCompra(cat.tienda, q); }
  });
  claveEnLinea = tarjeta.clave;
  const seccion = $("#detalle-en-linea");
  seccion.innerHTML = "";
  seccion.appendChild(detalleEnLinea.elemento);
  seccion.hidden = false;
  detalleEnLinea.montar();
  evento("ViewContent", parametrosEquipo(detalleEnLinea.equipo()));
  observarBarra(seccion);
}

function quitarEnLinea() {
  if (!detalleEnLinea) return;
  detalleEnLinea.destruir();
  detalleEnLinea = null;
  claveEnLinea = "";
  $("#detalle-en-linea").hidden = true;
  $("#detalle-en-linea").innerHTML = "";
  $("#barra-compra").hidden = true;
  observadorBarra?.disconnect();
}

// La barra fija de compra se ve mientras el detalle en línea está en pantalla.
let observadorBarra = null;
function observarBarra(seccion) {
  observadorBarra?.disconnect();
  observadorBarra = new IntersectionObserver(([e]) => {
    $("#barra-compra").hidden = !e.isIntersecting || $("#hoja-detalle").open;
  }, { threshold: 0.05 });
  observadorBarra.observe(seccion);
}

function abrirHoja(tarjeta) {
  const hoja = $("#hoja-detalle");
  const cuerpo = $("#hoja-cuerpo");
  const { lista, inicial } = diapositivas(cat, tarjeta);
  const barra = document.createElement("div");
  barra.className = "hoja-barra";
  detalleHoja = crearDetalle({
    api, cat, tarjeta, lista, inicial, alComprar: comprar,
    alCambiarEquipo: (q) => { barra.innerHTML = htmlBarraCompra(cat.tienda, q); }
  });
  cuerpo.innerHTML = "";
  cuerpo.appendChild(detalleHoja.elemento);
  cuerpo.appendChild(barra);
  barra.addEventListener("click", (e) => { if (e.target.closest("[data-comprar]")) comprar(detalleHoja.equipo()); });
  $("#barra-compra").hidden = true;
  hoja.showModal();
  cuerpo.scrollTop = 0;
  detalleHoja.montar();
  hoja.querySelector(".carrusel-pista").focus({ preventScroll: true });
  evento("ViewContent", parametrosEquipo(detalleHoja.equipo()));
}

function iniciarHoja() {
  const hoja = $("#hoja-detalle");
  let origen = null;
  $("#cerrar-detalle").addEventListener("click", () => hoja.close());
  hoja.addEventListener("click", (e) => { if (e.target === hoja) hoja.close(); });
  hoja.addEventListener("close", () => {
    detalleHoja?.destruir();
    detalleHoja = null;
    hoja.style.transform = "";
    $("#hoja-cuerpo").innerHTML = "";
    if (detalleEnLinea) observarBarra($("#detalle-en-linea"));
    origen?.focus({ preventScroll: true });
  });
  $("#lista-equipos").addEventListener("click", (e) => {
    const b = e.target.closest(".tarjeta-boton");
    if (!b) return;
    const t = ultimasTarjetas.find((x) => x.clave === b.dataset.clave);
    if (!t) return;
    origen = b;
    abrirHoja(t);
  });

  // Gesto de deslizar hacia abajo para cerrar (celular).
  const agarre = $("#hoja-agarre");
  let inicioY = null;
  let delta = 0;
  agarre.addEventListener("pointerdown", (e) => {
    if (e.target.closest("button") || window.matchMedia("(min-width: 900px)").matches) return;
    inicioY = e.clientY; delta = 0;
    agarre.setPointerCapture(e.pointerId);
  });
  agarre.addEventListener("pointermove", (e) => {
    if (inicioY == null) return;
    delta = Math.max(0, e.clientY - inicioY);
    if (!reducirMovimiento()) hoja.style.transform = `translateY(${delta}px)`;
  });
  const soltar = () => {
    if (inicioY == null) return;
    inicioY = null;
    if (delta > 110) { hoja.close(); return; }
    if (!reducirMovimiento()) {
      hoja.animate([{ transform: hoja.style.transform || "none" }, { transform: "none" }], { duration: 200, easing: "ease-out" });
    }
    hoja.style.transform = "";
  };
  agarre.addEventListener("pointerup", soltar);
  agarre.addEventListener("pointercancel", soltar);
}

// --- Arranque ------------------------------------------------------------------
async function iniciar() {
  seguro(capturarAtribucion, "atribución");
  seguro(iniciarPixel, "píxel");
  seguro(cargarSeguimientoGHL, "seguimiento GHL");

  api = await obtenerApi();
  let datos;
  try {
    datos = await api.cargarPublico();
  } catch (e) {
    const aviso = $("#aviso-carga");
    aviso.textContent = e?.message || "No pudimos cargar los equipos. Recargue la página.";
    aviso.hidden = false;
    $("#lista-equipos").innerHTML = "";
    return;
  }
  cat = prepararCatalogo(datos);
  const t = cat.tienda;
  seguro(() => aplicarTema(t), "tema");
  seguro(() => dibujarMarca(t), "marca");
  seguro(() => dibujarInfo(t), "info");
  seguro(() => dibujarPie(t), "pie");

  galeria = crearGaleria($("#lista-equipos"), api);
  seguro(() => aplicarVista(t), "vista de equipos");
  popup = crearPopup({ dialogo: $("#popup"), api, obtenerTienda: () => cat.tienda });
  controles = {
    condicion: iniciarSegmentado($("#f-condicion"), (v) => cambiarFiltro("condicion", v)),
    modelo: iniciarDesplegable($("#f-modelo"), { etiquetaId: "f-modelo-titulo", alElegir: (v) => cambiarFiltro("modelo", v) }),
    capacidad: iniciarChips($("#f-capacidad"), (v) => cambiarFiltro("capacidad", v))
  };
  $("#limpiar").addEventListener("click", () => {
    filtros = { condicion: "", modelo: "", capacidad: "" };
    escribirFiltrosURL();
    actualizar();
    $("#f-condicion .segmento").focus();
  });
  $("#consultar-sin-stock").addEventListener("click", () => popup.abrir({
    tipo: "sin stock",
    busqueda: describirBusqueda(cat, filtros),
    filtros: { ...filtros },
    nombreModelo: filtros.modelo ? cat.porSlug.get(filtros.modelo)?.nombre || "" : ""
  }));
  $("#barra-compra").addEventListener("click", (e) => {
    if (e.target.closest("[data-comprar]") && detalleEnLinea) comprar(detalleEnLinea.equipo());
  });
  seguro(iniciarHoja, "hoja");

  // Los filtros de la URL vienen marcados (aunque no tengan stock: así un
  // anuncio de un equipo agotado lleva al estado vacío con la consulta).
  filtros = leerFiltrosURL();
  actualizar();

  // En demo, otra pestaña (el panel) puede cambiar los datos: se recargan.
  if (api.tipo === "demo") {
    window.addEventListener("storage", async (e) => {
      if (e.key !== "cotizadora-demo:v1") return;
      cat = prepararCatalogo(await api.cargarPublico());
      aplicarTema(cat.tienda); dibujarMarca(cat.tienda); dibujarInfo(cat.tienda); dibujarPie(cat.tienda);
      aplicarVista(cat.tienda);
      quitarEnLinea();
      actualizar();
    });
  }
}

// Script de seguimiento externo de GHL (opcional, ver config.js).
function cargarSeguimientoGHL() {
  const { src, id } = CONFIG.ghlSeguimiento || {};
  if (!src || !/^https:\/\//.test(src)) return;
  const s = document.createElement("script");
  s.src = src;
  s.async = true;
  if (id) s.dataset.trackingId = id;
  document.head.appendChild(s);
}

iniciar();
