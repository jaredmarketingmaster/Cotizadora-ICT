// =============================================================================
// Reseñas del sitio (0014): debajo de los equipos y antes de la información de
// la tienda. Solo si la tienda las muestra y hay alguna (si no, la sección no
// existe para el cliente). Se carga solo cuando hace falta (principal.js).
// - Celular: fila que se desliza con el dedo (scroll-snap). Escritorio: mosaico.
// - Las imágenes cargan diferidas; de los videos no se descarga nada hasta
//   que el cliente toca reproducir (preload="none", sin reproducción automática).
// - Tocar una abre el visor a pantalla completa (<dialog>): se cierra con
//   Escape, el botón o tocando afuera; ← y → pasan de una a otra.
// =============================================================================

import { escaparHTML } from "../utils.js";
import { rutaMiniatura, LADO_MINIATURA, LADO_GRANDE, TITULO_RESENAS, textoOrigen } from "../datos/comun.js";
import { abrirConTransicion, cerrarConTransicion, cerrarConEscape } from "./transiciones.js";

const ICONO_PLAY = '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><circle cx="12" cy="12" r="11" fill="currentColor" opacity=".14"/><path d="M10 8l6 4-6 4z" fill="currentColor"/></svg>';

function htmlImagen(api, r, alt, { sizes, diferida = true }) {
  const grande = api.urlArchivo("resenas", r.ruta);
  const mini = api.urlArchivo("resenas", rutaMiniatura(r.ruta));
  return `<img src="${escaparHTML(mini || grande)}" srcset="${escaparHTML(mini)} ${LADO_MINIATURA}w, ${escaparHTML(grande)} ${LADO_GRANDE}w" sizes="${sizes}" alt="${escaparHTML(alt)}" ${diferida ? 'loading="lazy"' : ""} decoding="async">`;
}

export function dibujarResenas({ seccion, dialogo, api, tienda, resenas }) {
  const lista = tienda?.mostrar_resenas ? (resenas || []).filter((r) => r?.ruta) : [];
  const ul = seccion.querySelector(".resenas-lista");
  seccion.hidden = !lista.length;
  if (!lista.length) { ul.innerHTML = ""; return; }
  seccion.querySelector(".resenas-titulo").textContent = String(tienda.titulo_resenas || "").trim() || TITULO_RESENAS;
  const n = lista.length;
  ul.innerHTML = lista.map((r, i) => {
    const origen = textoOrigen(r);
    return `<li class="resena">
      <button type="button" class="resena-boton" data-i="${i}" aria-haspopup="dialog">
        <span class="oculto-visual">Ver la reseña ${i + 1} de ${n}. </span>
        <span class="resena-medio${r.tipo === "video" ? " resena-medio--video" : ""}">${r.tipo === "imagen"
          ? htmlImagen(api, r, `Imagen de la reseña ${i + 1}`, { sizes: "(min-width: 900px) 260px, 72vw" })
          : `<span class="resena-play">${ICONO_PLAY}<span>Video</span></span>`}</span>
        ${r.texto ? `<span class="resena-texto">${escaparHTML(r.texto)}</span>` : ""}
        ${origen ? `<span class="resena-origen">${escaparHTML(origen)}</span>` : ""}
      </button>
    </li>`;
  }).join("");

  let actual = 0;
  let origenFoco = null;
  const medio = dialogo.querySelector(".visor-medio");

  function mostrar(i) {
    actual = (i + n) % n;
    const r = lista[actual];
    dialogo.querySelector(".visor-titulo").textContent = `Reseña ${actual + 1} de ${n}`;
    // El video se crea recién aquí, sin descargar nada hasta que se toque
    // reproducir; el anterior se quita (y deja de sonar).
    medio.innerHTML = r.tipo === "imagen"
      ? htmlImagen(api, r, `Imagen de la reseña ${actual + 1}`, { sizes: "100vw", diferida: false })
      : `<video controls playsinline preload="none" src="${escaparHTML(api.urlArchivo("resenas", r.ruta))}" aria-label="Video de la reseña ${actual + 1}"></video>`;
    const texto = dialogo.querySelector(".visor-texto");
    texto.textContent = r.texto || "";
    texto.hidden = !r.texto;
    const origen = dialogo.querySelector(".visor-origen");
    origen.textContent = textoOrigen(r);
    origen.hidden = !origen.textContent;
    dialogo.querySelector(".visor-nav").hidden = n < 2;
  }

  ul.onclick = (e) => {
    const b = e.target.closest(".resena-boton");
    if (!b) return;
    origenFoco = b;
    abrirConTransicion(dialogo, () => { mostrar(Number(b.dataset.i)); dialogo.showModal(); dialogo.querySelector(".visor-cerrar").focus(); });
  };

  if (!dialogo.dataset.listo) {
    dialogo.dataset.listo = "1";
    cerrarConEscape(dialogo);
    dialogo.addEventListener("click", (e) => {
      if (e.target === dialogo || e.target.closest(".visor-cerrar")) cerrarConTransicion(dialogo);
      const paso = e.target.closest("[data-paso]");
      if (paso) dialogo.mover(Number(paso.dataset.paso));
    });
    dialogo.addEventListener("keydown", (e) => {
      if (e.target.closest("video")) return;
      if (e.key === "ArrowRight") { e.preventDefault(); dialogo.mover(1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); dialogo.mover(-1); }
    });
    dialogo.addEventListener("close", () => { dialogo.querySelector(".visor-medio").innerHTML = ""; dialogo.alCerrar?.(); });
  }
  dialogo.mover = (paso) => mostrar(actual + paso);
  dialogo.alCerrar = () => origenFoco?.focus({ preventScroll: true });
}
