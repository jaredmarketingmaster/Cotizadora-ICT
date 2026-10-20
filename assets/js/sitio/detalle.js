// =============================================================================
// Detalle del equipo: carrusel por color (nuevos) o por unidad (usados) y ficha.
// El carrusel usa scroll-snap (inercia y ajuste nativos al deslizar con el
// dedo) y se mueve también con flechas, puntos, muestras y teclado.
// =============================================================================

import { escaparHTML, formatearCOP, reducirMovimiento } from "../utils.js";
import { textoCondicion, textoAlternativo } from "./catalogo.js";
import { htmlFoto, htmlMedio } from "./fotos.js";

const ICONO_ANT = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M15 6l-6 6 6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICONO_SIG = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 6l6 6-6 6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
const ICONO_ABRIR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
export const ICONO_WA = '<svg class="icono-wa" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M12 2a10 10 0 0 0-8.6 15.1L2 22l5-1.3A10 10 0 1 0 12 2zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3 .8.8-2.9-.2-.3A8.2 8.2 0 1 1 12 20.2zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8-.2-.1-.4-.1-.6.1l-.8 1c-.1.2-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.2-.4.2-.4.7-1.3.1-.2 0-.3 0-.4l-.8-1.8c-.2-.5-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3 3 3 0 0 0-.9 2.2 5.2 5.2 0 0 0 1.1 2.7 11.8 11.8 0 0 0 4.5 4c1.7.7 2.3.8 3.2.6.5-.1 1.5-.6 1.7-1.2.2-.6.2-1.1.2-1.2-.1-.1-.3-.2-.5-.3z"/></svg>';

function filasFicha(ficha) {
  return (ficha?.especificaciones || []).filter((f) => String(f?.etiqueta || "").trim() && String(f?.valor || "").trim());
}

function htmlDiapositiva(api, q, i, total) {
  const alt = textoAlternativo(q);
  const etiqueta = `${i + 1} de ${total}${q.color_nombre ? `: ${q.color_nombre}` : ""}`;
  return `<div class="diapositiva" role="group" aria-roledescription="diapositiva" aria-label="${escaparHTML(etiqueta)}" data-i="${i}">
    ${htmlMedio(api, q, alt, { sizes: "(min-width: 900px) 560px, 100vw", cargaInmediata: i === 0 })}
  </div>`;
}

function etiquetaMuestra(q, condicion) {
  if (condicion === "nuevo") return q.color_nombre || "Color";
  return [q.color_nombre, q.bateria_porcentaje != null && `${q.bateria_porcentaje}%`].filter(Boolean).join(" · ") || "Unidad";
}

export function crearDetalle({ api, cat, tarjeta, lista, inicial, alComprar, alCambiarEquipo, idTitulo = "detalle-titulo" }) {
  const tienda = cat.tienda;
  const modelo = tarjeta.modelo;
  const ficha = cat.fichas.get(modelo.id);
  const filas = filasFicha(ficha);
  const condicion = tarjeta.condicion;
  let indice = inicial;
  let fotoActual = 0;
  let fichaAbierta = false;

  const raiz = document.createElement("article");
  raiz.className = "detalle";
  raiz.innerHTML = `
    <div class="detalle-medios">
      <div class="carrusel" role="region" aria-roledescription="carrusel" aria-label="Fotos de ${escaparHTML(modelo.nombre)}">
        <div class="carrusel-marco">
          <div class="carrusel-pista" tabindex="0" aria-label="Use las flechas del teclado para cambiar de ${condicion === "nuevo" ? "color" : "unidad"}">
            ${lista.map((q, i) => htmlDiapositiva(api, q, i, lista.length)).join("")}
          </div>
          ${lista.length > 1 ? `
          <button type="button" class="carrusel-flecha carrusel-flecha--ant" aria-label="Anterior">${ICONO_ANT}</button>
          <button type="button" class="carrusel-flecha carrusel-flecha--sig" aria-label="Siguiente">${ICONO_SIG}</button>
          <span class="carrusel-contador cifras" aria-hidden="true"></span>` : ""}
        </div>
        <div class="miniaturas" role="group" aria-label="Fotos de este ${condicion === "nuevo" ? "color" : "equipo"}" hidden></div>
        ${lista.length > 1 ? `<div class="carrusel-puntos">${lista.map((_, i) => `<button type="button" class="punto" data-i="${i}" aria-label="Ir a la diapositiva ${i + 1}"></button>`).join("")}</div>` : ""}
      </div>
      <div class="colores">
        <p class="colores-titulo">${condicion === "nuevo" ? "Color" : "Unidad"}: <strong data-color-actual></strong></p>
        ${lista.length > 1 ? `<div class="colores-lista" role="group" aria-label="${condicion === "nuevo" ? "Colores" : "Unidades"}">
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
    const etiquetaPrecio = tienda.etiqueta_precio || "Precio";
    const descripcion = [ficha?.descripcion, q.descripcion_extra].map((t) => String(t || "").trim()).filter(Boolean);
    const garantia = usado ? tienda.texto_garantia_usados : tienda.texto_garantia_nuevos;
    const pagos = (tienda.formas_pago || []).filter((p) => String(p).trim());
    const datosUsado = usado ? [
      q.bateria_porcentaje != null && ["Batería", `${q.bateria_porcentaje}%`],
      q.estado_estetico && ["Estado estético", q.estado_estetico],
      q.detalles && ["Detalles", q.detalles, "ancho"],
      q.incluye && ["Incluye", q.incluye, "ancho"]
    ].filter(Boolean) : [];

    fichaEl.innerHTML = `
      <div class="detalle-encabezado">
        <div class="tarjeta-etiquetas"><span class="etiqueta-pildora${usado ? " etiqueta-pildora--usado" : ""}">${textoCondicion(condicion)}</span></div>
        <h2 class="detalle-nombre" id="${idTitulo}">${escaparHTML(modelo.nombre)}</h2>
        <p class="detalle-variante cifras">${[q.capacidad, q.color_nombre].filter(Boolean).map(escaparHTML).join(" · ")}</p>
      </div>
      <div class="precio-bloque">
        <span class="precio-etiqueta">${escaparHTML(etiquetaPrecio)}</span>
        <p class="precio-valor cifras">${formatearCOP(q.precio)}${q.es_demo ? '<span class="etiqueta-demo">DEMO</span>' : ""}</p>
      </div>
      ${datosUsado.length ? `<dl class="datos-usado">${datosUsado.map(([k, v, c]) => `<div${c ? ` class="${c}"` : ""}><dt>${k}</dt><dd>${escaparHTML(v)}</dd></div>`).join("")}</dl>` : ""}
      ${descripcion.map((t) => `<p class="detalle-texto">${escaparHTML(t)}</p>`).join("")}
      ${filas.length ? `<details class="ficha-tecnica"${fichaAbierta ? " open" : ""}>
        <summary>Ver ficha técnica ${ICONO_ABRIR}</summary>
        <dl>${filas.map((f) => `<div><dt>${escaparHTML(f.etiqueta)}</dt><dd>${escaparHTML(f.valor)}</dd></div>`).join("")}</dl>
      </details>` : ""}
      ${(pagos.length || tienda.texto_entrega || garantia) ? `<div class="info-compra">
        ${pagos.length ? `<section><h3>Formas de pago</h3><ul>${pagos.map((p) => `<li>${escaparHTML(p)}</li>`).join("")}</ul></section>` : ""}
        ${tienda.texto_entrega ? `<section><h3>Entrega</h3><p>${escaparHTML(tienda.texto_entrega)}</p></section>` : ""}
        ${garantia ? `<section><h3>Garantía</h3><p>${escaparHTML(garantia)}</p></section>` : ""}
      </div>` : ""}
      <div class="detalle-cta">
        <button type="button" class="boton boton--primario boton--grande boton--bloque" data-comprar>${ICONO_WA}Comprar por WhatsApp</button>
      </div>`;
    fichaEl.querySelector(".ficha-tecnica")?.addEventListener("toggle", (e) => { fichaAbierta = e.target.open; });
  }

  function dibujarMiniaturas() {
    const q = equipo();
    const fotos = (q.fotos || []).filter((r) => api.urlArchivo("fotos", r));
    if (fotos.length < 2) { miniaturas.hidden = true; miniaturas.innerHTML = ""; return; }
    miniaturas.hidden = false;
    miniaturas.innerHTML = fotos.map((r, i) =>
      `<button type="button" class="miniatura" data-f="${i}" aria-label="Foto ${i + 1} de ${fotos.length}" aria-current="${i === fotoActual}">${htmlFoto(api, r, "", { sizes: "64px" })}</button>`).join("");
  }

  function mostrarFoto(i) {
    const q = equipo();
    const fotos = (q.fotos || []).filter((r) => api.urlArchivo("fotos", r));
    if (!fotos[i]) return;
    fotoActual = i;
    const diap = pista.children[indice];
    diap.innerHTML = htmlFoto(api, fotos[i], textoAlternativo(q), { sizes: "(min-width: 900px) 560px, 100vw", cargaInmediata: true });
    miniaturas.querySelectorAll(".miniatura").forEach((b, j) => b.setAttribute("aria-current", String(j === i)));
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
    if (b) mostrarFoto(Number(b.dataset.f));
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
  return `<div class="barra-precio cifras"><span>${escaparHTML(tienda.etiqueta_precio || "Precio")}</span><strong>${formatearCOP(q.precio)}${q.es_demo ? ' <span class="etiqueta-demo">DEMO</span>' : ""}</strong></div>
    <button type="button" class="boton boton--primario boton--grande" data-comprar>${ICONO_WA}Comprar por WhatsApp</button>`;
}
