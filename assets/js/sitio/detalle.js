// =============================================================================
// Detalle del equipo: carrusel por color (nuevos) o por unidad (usados) y ficha.
// El carrusel usa scroll-snap (inercia y ajuste nativos al deslizar con el
// dedo) y se mueve también con flechas, puntos, muestras y teclado.
// =============================================================================

import { escaparHTML, formatearPrecio, reducirMovimiento } from "../utils.js";
import { textoCondicion, textoAlternativo, textoMasVendido } from "./catalogo.js";
import { htmlFoto, htmlMedio } from "./fotos.js";
import { filasVisiblesFicha, frasesPagos, etiquetaCategoriaFicha } from "../datos/comun.js";
import { frasesEnvio } from "../datos/envios.js";
import { t as tr } from "../i18n/i18n.js";

const ICONO_ANT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICONO_SIG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICONO_PLAY = '<svg class="icono-play" viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="11" fill="rgba(0,0,0,.55)"/><path d="M10 8l6 4-6 4z" fill="#fff"/></svg>';
const ICONO_ABRIR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export const ICONO_WA = '<svg class="icono-wa" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>';

// "Precio" es el valor por defecto guardado en la base (en español): se
// muestra en el idioma del sitio. Si la tienda escribió otro, el suyo.
function etiquetaPrecio(tienda) {
  const e = tienda.etiqueta_precio;
  return !e || e === "Precio" ? tr("sitio.detalle.precio") : e;
}

function htmlDiapositiva(api, q, i, total) {
  const alt = textoAlternativo(q);
  const etiqueta = `${tr("sitio.detalle.diapositiva", { i: i + 1, total })}${q.color_nombre ? `: ${q.color_nombre}` : ""}`;
  return `<div class="diapositiva" role="group" aria-roledescription="${tr("sitio.detalle.diapositiva_rol")}" aria-label="${escaparHTML(etiqueta)}" data-i="${i}">
    ${htmlMedio(api, q, alt, { sizes: "(min-width: 900px) 560px, 100vw", cargaInmediata: i === 0 })}
  </div>`;
}

function etiquetaMuestra(q, condicion) {
  if (condicion === "nuevo") return q.color_nombre || tr("sitio.detalle.color");
  return [q.color_nombre, q.bateria_porcentaje != null && `${q.bateria_porcentaje}%`].filter(Boolean).join(" · ") || tr("sitio.detalle.unidad");
}

export function crearDetalle({ api, cat, tarjeta, lista, inicial, alComprar, alCambiarEquipo, idTitulo = "detalle-titulo" }) {
  const tienda = cat.tienda;
  const modelo = tarjeta.modelo;
  const ficha = cat.fichas.get(modelo.id);
  // Solo si la tienda muestra la ficha: categorías encendidas y con valor, en
  // el orden fijo, y las filas de la tienda al final.
  const filas = filasVisiblesFicha(ficha, tienda);
  const condicion = tarjeta.condicion;
  let indice = inicial;
  let fotoActual = 0;
  let fichaAbierta = false;

  const raiz = document.createElement("article");
  raiz.className = "detalle";
  raiz.innerHTML = `
    <div class="detalle-medios">
      <div class="carrusel" role="region" aria-roledescription="${tr("sitio.carrusel.descripcion")}" aria-label="${escaparHTML(tr("sitio.detalle.carrusel_fotos", { modelo: modelo.nombre }))}">
        <div class="carrusel-marco">
          <div class="carrusel-pista" tabindex="0" aria-label="${tr(condicion === "nuevo" ? "sitio.detalle.teclado_color" : "sitio.detalle.teclado_unidad")}">
            ${lista.map((q, i) => htmlDiapositiva(api, q, i, lista.length)).join("")}
          </div>
          ${lista.length > 1 ? `
          <button type="button" class="carrusel-flecha carrusel-flecha--ant" aria-label="${tr("sitio.detalle.anterior")}">${ICONO_ANT}</button>
          <button type="button" class="carrusel-flecha carrusel-flecha--sig" aria-label="${tr("sitio.detalle.siguiente")}">${ICONO_SIG}</button>
          <span class="carrusel-contador cifras" aria-hidden="true"></span>` : ""}
        </div>
        <div class="miniaturas" role="group" aria-label="${tr(condicion === "nuevo" ? "sitio.detalle.fotos_color" : "sitio.detalle.fotos_equipo")}" hidden></div>
        ${lista.length > 1 ? `<div class="carrusel-puntos">${lista.map((_, i) => `<button type="button" class="punto" data-i="${i}" aria-label="${tr("sitio.detalle.ir_diapositiva", { n: i + 1 })}"></button>`).join("")}</div>` : ""}
      </div>
      <div class="colores">
        <p class="colores-titulo">${tr(condicion === "nuevo" ? "sitio.detalle.color" : "sitio.detalle.unidad")}: <strong data-color-actual></strong></p>
        ${lista.length > 1 ? `<div class="colores-lista" role="group" aria-label="${tr(condicion === "nuevo" ? "sitio.detalle.colores" : "sitio.detalle.unidades")}">
          ${lista.map((q, i) => `<button type="button" class="color-boton" data-i="${i}"><span class="muestra"${q.color_hex ? ` style="--c:${q.color_hex}"` : ""} aria-hidden="true"></span>${escaparHTML(etiquetaMuestra(q, condicion))}</button>`).join("")}
        </div>` : ""}
      </div>
    </div>
    <div class="detalle-ficha"></div>`;

  const pista = raiz.querySelector(".carrusel-pista");
  const ant = raiz.querySelector(".carrusel-flecha--ant");
  const sig = raiz.querySelector(".carrusel-flecha--sig");
  const contador = raiz.querySelector(".carrusel-contador");
  const puntos = [...raiz.querySelectorAll(".punto")];
  const colores = [...raiz.querySelectorAll(".color-boton")];
  const miniaturas = raiz.querySelector(".miniaturas");
  const colorActual = raiz.querySelector("[data-color-actual]");
  const fichaEl = raiz.querySelector(".detalle-ficha");

  function equipo() { return lista[indice]; }

  function dibujarFicha() {
    const q = equipo();
    const usado = condicion === "usado";
    // Igual que la tarjeta: un nuevo es "más vendido" si lo es cualquiera de
    // sus colores; un usado, si lo es esa unidad. Sin animación.
    const masVendido = usado ? q.mas_vendido : lista.some((x) => x.mas_vendido);
    const descripcion = [ficha?.descripcion, q.descripcion_extra].map((t) => String(t || "").trim()).filter(Boolean);
    const garantia = usado ? tienda.texto_garantia_usados : tienda.texto_garantia_nuevos;
    // Formas de pago en frases cortas, solo con lo que marcó la tienda (0013)
    const pagos = frasesPagos(tienda);
    const envios = frasesEnvio(tienda);
    const datosUsado = usado ? [
      q.bateria_porcentaje != null && [tr("sitio.detalle.bateria"), `${q.bateria_porcentaje}%`],
      q.estado_estetico && [tr("sitio.detalle.estado_estetico"), q.estado_estetico],
      q.detalles && [tr("sitio.detalle.detalles"), q.detalles, "ancho"],
      q.incluye && [tr("sitio.detalle.incluye"), q.incluye, "ancho"]
    ].filter(Boolean) : [];

    fichaEl.innerHTML = `
      <div class="detalle-encabezado">
        <div class="tarjeta-etiquetas"><span class="etiqueta-pildora${usado ? " etiqueta-pildora--usado" : ""}">${textoCondicion(condicion)}</span>${masVendido ? `<span class="etiqueta-pildora etiqueta-pildora--mas-vendido">${textoMasVendido()}</span>` : ""}</div>
        <h2 class="detalle-nombre" id="${idTitulo}">${escaparHTML(modelo.nombre)}</h2>
        <p class="detalle-variante cifras">${[q.capacidad, q.color_nombre].filter(Boolean).map(escaparHTML).join(" · ")}</p>
      </div>
      <div class="precio-bloque">
        <span class="precio-etiqueta">${escaparHTML(etiquetaPrecio(tienda))}</span>
        <p class="precio-valor cifras">${formatearPrecio(q.precio)}${q.es_demo ? `<span class="etiqueta-demo">${tr("sitio.demo")}</span>` : ""}</p>
      </div>
      ${datosUsado.length ? `<dl class="datos-usado">${datosUsado.map(([k, v, c]) => `<div${c ? ` class="${c}"` : ""}><dt>${k}</dt><dd>${escaparHTML(v)}</dd></div>`).join("")}</dl>` : ""}
      ${descripcion.map((t) => `<p class="detalle-texto">${escaparHTML(t)}</p>`).join("")}
      ${filas.length ? `<details class="ficha-tecnica"${fichaAbierta ? " open" : ""}>
        <summary>${tr("sitio.detalle.ver_ficha")} ${ICONO_ABRIR}</summary>
        <dl>${filas.map((f) => `<div${f.clave ? ` data-clave="${f.clave}"` : ""}><dt>${escaparHTML(f.clave ? etiquetaCategoriaFicha(f.clave) : f.etiqueta)}</dt><dd>${escaparHTML(f.valor)}</dd></div>`).join("")}</dl>
      </details>` : ""}
      ${(pagos.length || envios.length || tienda.texto_entrega || garantia) ? `<div class="info-compra">
        ${pagos.length ? `<section><h3>${tr("sitio.detalle.formas_pago")}</h3><ul>${pagos.map((p) => `<li>${escaparHTML(p)}</li>`).join("")}</ul></section>` : ""}
        ${envios.length || tienda.texto_entrega ? `<section><h3>${tr("sitio.detalle.entrega")}</h3>${envios.length ? `<ul class="frases-envio">${envios.map((f) => `<li>${escaparHTML(f)}</li>`).join("")}</ul>` : ""}${tienda.texto_entrega ? `<p>${escaparHTML(tienda.texto_entrega)}</p>` : ""}</section>` : ""}
        ${garantia ? `<section><h3>${tr("sitio.detalle.garantia")}</h3><p>${escaparHTML(garantia)}</p></section>` : ""}
      </div>` : ""}
      <div class="detalle-cta">
        <button type="button" class="boton boton--primario boton--grande boton--bloque" data-comprar>${ICONO_WA}${tr("sitio.detalle.comprar")}</button>
      </div>`;
    fichaEl.querySelector(".ficha-tecnica")?.addEventListener("toggle", (e) => { fichaAbierta = e.target.open; });
  }

  // Miniaturas: las fotos del color (o la unidad) y, si tiene, el video al
  // final con el ícono de reproducir. El video no se descarga hasta tocarlo.
  const urlVideo = (q) => (q.video ? api.urlArchivo("videos", q.video) : "");
  function dibujarMiniaturas() {
    const q = equipo();
    const fotos = (q.fotos || []).filter((r) => api.urlArchivo("fotos", r));
    const video = urlVideo(q);
    if (fotos.length < 2 && !video) { miniaturas.hidden = true; miniaturas.innerHTML = ""; return; }
    miniaturas.hidden = false;
    const conFotos = fotos.length
      ? fotos.map((r, i) => `<button type="button" class="miniatura" data-f="${i}" aria-label="${tr("sitio.detalle.foto_n", { i: i + 1, n: fotos.length })}" aria-current="${i === fotoActual}">${htmlFoto(api, r, "", { sizes: "64px" })}</button>`).join("")
      : `<button type="button" class="miniatura" data-f="0" aria-label="${tr("sitio.detalle.imagen")}" aria-current="${fotoActual === 0}">${htmlMedio(api, q, "")}</button>`;
    miniaturas.innerHTML = conFotos + (video
      ? `<button type="button" class="miniatura miniatura--video" data-video aria-label="${tr("sitio.detalle.ver_video")}" aria-current="${fotoActual === "video"}">${fotos.length ? htmlFoto(api, fotos[0], "", { sizes: "64px" }) : ""}${ICONO_PLAY}</button>`
      : "");
  }

  function mostrarVideo() {
    const q = equipo();
    const url = urlVideo(q);
    if (!url) return;
    fotoActual = "video";
    const diap = pista.children[indice];
    // preload="none": hasta ahora no se descargó nada. Se reproduce porque el
    // cliente lo tocó (no hay reproducción automática al cargar).
    diap.innerHTML = `<video class="detalle-video" src="${escaparHTML(url)}" controls playsinline preload="none" aria-label="${escaparHTML(tr("sitio.detalle.video_de", { equipo: textoAlternativo(q) }))}"></video>`;
    const v = diap.querySelector("video");
    v.play?.()?.catch?.(() => {});
    miniaturas.querySelectorAll(".miniatura").forEach((b) => b.setAttribute("aria-current", String(b.hasAttribute("data-video"))));
  }

  function mostrarFoto(i) {
    const q = equipo();
    const fotos = (q.fotos || []).filter((r) => api.urlArchivo("fotos", r));
    if (!fotos[i] && !(i === 0 && !fotos.length)) return;
    fotoActual = i;
    if (fotos.length) {
      pista.children[indice].innerHTML = htmlFoto(api, fotos[i], textoAlternativo(q), { sizes: "(min-width: 900px) 560px, 100vw", cargaInmediata: true });
    } else {
      restaurarDiapositiva(indice);
    }
    miniaturas.querySelectorAll(".miniatura").forEach((b) => b.setAttribute("aria-current", String(Number(b.dataset.f) === i && !b.hasAttribute("data-video"))));
  }

  function actualizar() {
    const q = equipo();
    colorActual.textContent = etiquetaMuestra(q, condicion);
    puntos.forEach((p, i) => p.setAttribute("aria-current", String(i === indice)));
    colores.forEach((c, i) => c.setAttribute("aria-current", String(i === indice)));
    if (ant) ant.disabled = indice === 0;
    if (sig) sig.disabled = indice === lista.length - 1;
    if (contador) contador.textContent = `${indice + 1}/${lista.length}`;
    dibujarFicha();
    dibujarMiniaturas();
    alCambiarEquipo?.(q);
  }

  function ir(i, { suave = true } = {}) {
    const destino = Math.max(0, Math.min(i, lista.length - 1));
    pista.scrollTo({ left: destino * pista.clientWidth, behavior: suave && !reducirMovimiento() ? "smooth" : "auto" });
    if (destino !== indice) {
      // Al volver a una diapositiva se restaura su foto principal.
      if (fotoActual !== 0) { const anterior = indice; fotoActual = 0; restaurarDiapositiva(anterior); }
      indice = destino;
      actualizar();
    }
  }

  function restaurarDiapositiva(i) {
    const tmp = document.createElement("template");
    tmp.innerHTML = htmlDiapositiva(api, lista[i], i, lista.length).trim();
    pista.children[i].replaceWith(tmp.content.firstElementChild);
  }

  let marco = 0;
  pista.addEventListener("scroll", () => {
    cancelAnimationFrame(marco);
    marco = requestAnimationFrame(() => {
      const i = Math.round(pista.scrollLeft / Math.max(1, pista.clientWidth));
      if (i !== indice && i >= 0 && i < lista.length) {
        if (fotoActual !== 0) { const anterior = indice; fotoActual = 0; restaurarDiapositiva(anterior); }
        indice = i;
        actualizar();
      }
    });
  }, { passive: true });

  pista.addEventListener("keydown", (e) => {
    const mapa = { ArrowLeft: indice - 1, ArrowRight: indice + 1, Home: 0, End: lista.length - 1 };
    if (e.key in mapa) { e.preventDefault(); ir(mapa[e.key]); }
  });
  ant?.addEventListener("click", () => ir(indice - 1));
  sig?.addEventListener("click", () => ir(indice + 1));
  puntos.forEach((p) => p.addEventListener("click", () => ir(Number(p.dataset.i))));
  colores.forEach((c) => c.addEventListener("click", () => ir(Number(c.dataset.i))));
  miniaturas.addEventListener("click", (e) => {
    const b = e.target.closest(".miniatura");
    if (!b) return;
    if (b.hasAttribute("data-video")) mostrarVideo(); else mostrarFoto(Number(b.dataset.f));
  });
  fichaEl.addEventListener("click", (e) => {
    if (e.target.closest("[data-comprar]")) alComprar(equipo());
  });

  // Mantener la diapositiva al cambiar el ancho (girar el teléfono).
  const observador = new ResizeObserver(() => { pista.scrollLeft = indice * pista.clientWidth; });

  return {
    elemento: raiz,
    equipo,
    montar() {
      actualizar();
      pista.scrollLeft = indice * pista.clientWidth;
      observador.observe(pista);
    },
    destruir() { observador.disconnect(); }
  };
}

// Barra de compra (precio + botón) para celular.
export function htmlBarraCompra(tienda, q) {
  return `<div class="barra-precio cifras"><span>${escaparHTML(etiquetaPrecio(tienda))}</span><strong>${formatearPrecio(q.precio)}${q.es_demo ? ` <span class="etiqueta-demo">${tr("sitio.demo")}</span>` : ""}</strong></div>
    <button type="button" class="boton boton--primario boton--grande" data-comprar>${ICONO_WA}${tr("sitio.detalle.comprar")}</button>`;
}
