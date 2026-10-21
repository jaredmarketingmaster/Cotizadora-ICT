// =============================================================================
// Galería: tarjetas con claves estables. Al filtrar, las que salen se
// desvanecen y las que quedan se reacomodan con animación (técnica FLIP).
// Con prefers-reduced-motion el cambio es directo.
// =============================================================================

import { escaparHTML, formatearPrecio, reducirMovimiento } from "../utils.js";
import { textoCondicion, TEXTO_MAS_VENDIDO } from "./catalogo.js";
import { htmlMedio } from "./fotos.js";

const SIZES = "(min-width: 1200px) 280px, (min-width: 960px) 30vw, (min-width: 640px) 45vw, 112px";

function htmlTarjeta(api, t, i) {
  const q = t.equipos[0];
  const nombre = t.modelo.nombre;
  let sub;
  let muestras = "";
  if (t.condicion === "nuevo") {
    sub = escaparHTML(t.capacidad);
    const colores = t.equipos.filter((e) => e.color_nombre || e.color_hex);
    muestras = `<span class="muestras" aria-hidden="true">${colores.map((e) => `<span class="muestra"${e.color_hex ? ` style="--c:${e.color_hex}"` : ""}></span>`).join("")}</span>`;
    const nombres = colores.map((e) => e.color_nombre).filter(Boolean);
    if (nombres.length) muestras += `<span class="oculto-visual">Colores: ${escaparHTML(nombres.join(", "))}.</span>`;
  } else {
    const partes = [t.capacidad, q.color_nombre].filter(Boolean).map(escaparHTML).join(" · ");
    const usado = [
      q.bateria_porcentaje != null && `Batería ${q.bateria_porcentaje}%`,
      q.estado_estetico && escaparHTML(q.estado_estetico)
    ].filter(Boolean).join(" · ");
    sub = partes + (usado ? `<br>${usado}` : "");
  }
  const alt = [nombre, t.capacidad, t.condicion === "usado" && q.color_nombre && `color ${q.color_nombre}`].filter(Boolean).join(", ");
  // Más vendido: borde con una luz que recorre el contorno (span.tarjeta-brillo,
  // decorativo) y la etiqueta junto a la condición.
  return `<li class="tarjeta${t.masVendido ? " tarjeta--mas-vendido" : ""}" data-clave="${escaparHTML(t.clave)}">
    ${t.masVendido ? '<span class="tarjeta-brillo" aria-hidden="true"><span></span></span>' : ""}
    <button type="button" class="tarjeta-boton" data-clave="${escaparHTML(t.clave)}">
      <span class="tarjeta-medio">${htmlMedio(api, q, alt, { sizes: SIZES, cargaInmediata: i < 2 })}</span>
      <span class="tarjeta-cuerpo">
        <span class="tarjeta-etiquetas"><span class="etiqueta-pildora${t.condicion === "usado" ? " etiqueta-pildora--usado" : ""}">${textoCondicion(t.condicion)}</span>${t.masVendido ? `<span class="etiqueta-pildora etiqueta-pildora--mas-vendido">${TEXTO_MAS_VENDIDO}</span>` : ""}</span>
        <span class="tarjeta-nombre">${escaparHTML(nombre)}</span>
        <span class="tarjeta-sub cifras">${sub}</span>
        ${muestras}
        <span class="tarjeta-precio cifras">${t.desde ? '<span class="desde">Desde</span>' : ""}${formatearPrecio(t.precioMin)}${t.esDemo ? ' <span class="etiqueta-demo">DEMO</span>' : ""}</span>
      </span>
    </button>
  </li>`;
}

export function crearGaleria(lista, api) {
  let animaciones = [];
  let version = 0;
  let carrusel = null;  // con la vista "carrusel", él se encarga de mover las tarjetas

  function plantilla(t, i) {
    const tmp = document.createElement("template");
    tmp.innerHTML = htmlTarjeta(api, t, i).trim();
    return tmp.content.firstElementChild;
  }

  // "Más vendido": la luz del borde solo corre en las tarjetas que se ven
  // (data-en-pantalla) y en 3 como máximo.
  const MAX_BRILLOS = 3;
  let observador = null;
  function observarBrillos() {
    observador?.disconnect();
    const brillos = [...lista.querySelectorAll(":scope > .tarjeta--mas-vendido")].slice(0, MAX_BRILLOS);
    if (!brillos.length || !("IntersectionObserver" in window)) return;
    observador ??= new IntersectionObserver((entradas) => {
      for (const e of entradas) e.target.toggleAttribute("data-en-pantalla", e.isIntersecting);
    });
    brillos.forEach((el) => observador.observe(el));
  }

  async function dibujar(tarjetas) {
    await dibujarTarjetas(tarjetas);
    observarBrillos();
  }

  async function dibujarTarjetas(tarjetas) {
    const mia = ++version;
    animaciones.forEach((a) => a.cancel());
    animaciones = [];
    lista.removeAttribute("aria-busy");
    if (carrusel) {
      const habia = lista.querySelector(":scope > .tarjeta:not(.tarjeta--esqueleto)");
      lista.innerHTML = "";
      tarjetas.forEach((t, i) => lista.appendChild(plantilla(t, i)));
      carrusel.reconstruir({ animar: Boolean(habia) });
      return;
    }
    const conMovimiento = !reducirMovimiento() && lista.children.length > 0 && !lista.querySelector(".tarjeta--esqueleto");
    const actuales = new Map([...lista.querySelectorAll(":scope > .tarjeta[data-clave]")].map((el) => [el.dataset.clave, el]));
    const nuevas = new Set(tarjetas.map((t) => t.clave));

    if (!conMovimiento) {
      lista.innerHTML = "";
      tarjetas.forEach((t, i) => lista.appendChild(plantilla(t, i)));
      return;
    }

    // 1) Las que salen se desvanecen
    const salen = [...actuales].filter(([k]) => !nuevas.has(k)).map(([, el]) => el);
    if (salen.length) {
      const fades = salen.map((el) => el.animate(
        [{ opacity: 1, transform: "scale(1)" }, { opacity: 0, transform: "scale(.96)" }],
        { duration: 170, easing: "ease-out", fill: "forwards" }));
      animaciones.push(...fades);
      await Promise.allSettled(fades.map((a) => a.finished));
      if (mia !== version) return;
    }

    // 2) FLIP: posiciones antes
    const antes = new Map();
    for (const [k, el] of actuales) if (nuevas.has(k)) antes.set(k, el.getBoundingClientRect());
    salen.forEach((el) => el.remove());

    // 3) Orden nuevo, reutilizando los nodos que quedan
    const frag = document.createDocumentFragment();
    const entran = [];
    tarjetas.forEach((t, i) => {
      let el = actuales.get(t.clave);
      if (!el) { el = plantilla(t, i); entran.push(el); }
      frag.appendChild(el);
    });
    lista.appendChild(frag);

    // 4) Animar desde la posición anterior
    for (const [k, r] of antes) {
      const el = lista.querySelector(`:scope > .tarjeta[data-clave="${CSS.escape(k)}"]`);
      if (!el) continue;
      const ahora = el.getBoundingClientRect();
      const dx = r.left - ahora.left;
      const dy = r.top - ahora.top;
      if (dx || dy) {
        animaciones.push(el.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: "none" }],
          { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" }));
      }
    }
    entran.forEach((el, i) => animaciones.push(el.animate(
      [{ opacity: 0, transform: "translateY(10px) scale(.98)" }, { opacity: 1, transform: "none" }],
      { duration: 300, delay: 60 + i * 30, easing: "cubic-bezier(.2,.8,.2,1)", fill: "backwards" })));
  }

  return { dibujar, usarCarrusel(c) { carrusel = c; } };
}
