// =============================================================================
// Controles de los filtros: segmentado (condición), lista desplegable propia
// (modelo) y chips (almacenamiento).
// =============================================================================

import { escaparHTML, formatearMiles } from "../utils.js";
import { etiquetaGeneracion } from "./catalogo.js";

const FLECHA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 9l6 6 6-6" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

export function marcarLimpiado(el) {
  if (!el) return;
  el.classList.remove("limpiado");
  void el.offsetWidth;
  el.classList.add("limpiado");
  setTimeout(() => el.classList.remove("limpiado"), 800);
}

// --- Segmentado ----------------------------------------------------------------
// Ninguno marcado al cargar; un segundo toque desmarca.
export function iniciarSegmentado(contenedor, alCambiar) {
  const botones = [...contenedor.querySelectorAll(".segmento")];
  contenedor.addEventListener("click", (e) => {
    const b = e.target.closest(".segmento");
    if (!b) return;
    const ya = b.getAttribute("aria-pressed") === "true";
    alCambiar(ya ? "" : b.dataset.valor);
  });
  return {
    marcar(valor) {
      for (const b of botones) b.setAttribute("aria-pressed", String(b.dataset.valor === valor));
      // Indicador que se desliza (sitio.css, .segmentado::before)
      const i = botones.findIndex((b) => b.dataset.valor === valor);
      if (i >= 0) contenedor.style.setProperty("--i", String(i));
      contenedor.style.setProperty("--visible", i >= 0 ? "1" : "0");
    }
  };
}

// --- Chips ---------------------------------------------------------------------
export function iniciarChips(contenedor, alCambiar) {
  contenedor.addEventListener("click", (e) => {
    const b = e.target.closest(".chip");
    if (!b) return;
    alCambiar(b.getAttribute("aria-pressed") === "true" ? "" : b.dataset.valor);
  });
  return {
    dibujar(opciones, valor) {
      const lista = valor && !opciones.includes(valor) ? [...opciones, valor] : opciones;
      const enfocado = document.activeElement?.closest?.(".chip")?.dataset.valor;
      contenedor.innerHTML = lista.length
        ? lista.map((c) => `<button type="button" class="chip" data-valor="${escaparHTML(c)}" aria-pressed="${c === valor}">${escaparHTML(c)}</button>`).join("")
        : '<p class="chips-vacio">Sin opciones para lo elegido.</p>';
      if (enfocado) contenedor.querySelector(`.chip[data-valor="${CSS.escape(enfocado)}"]`)?.focus();
    }
  };
}

// --- Lista desplegable -----------------------------------------------------------
// Botón + panel con lista (role="listbox"), agrupada, con buscador si hay más de
// 8 opciones. Teclado: flechas, Inicio/Fin, Enter, Escape y Tab.
export function iniciarDesplegable(contenedor, { etiquetaId, alElegir }) {
  const id = contenedor.id;
  contenedor.innerHTML = `
    <button type="button" class="desplegable-boton" id="${id}-boton" aria-haspopup="listbox" aria-expanded="false" aria-controls="${id}-lista" aria-labelledby="${etiquetaId} ${id}-boton">
      <span class="valor"></span>${FLECHA}
    </button>
    <div class="desplegable-panel" id="${id}-panel" hidden>
      <div class="desplegable-buscar" hidden>
        <label class="oculto-visual" for="${id}-buscar">Buscar modelo</label>
        <input class="entrada" id="${id}-buscar" type="search" placeholder="Buscar modelo" autocomplete="off" role="combobox" aria-controls="${id}-lista" aria-expanded="true" aria-autocomplete="list">
      </div>
      <ul class="desplegable-lista" id="${id}-lista" role="listbox" aria-labelledby="${etiquetaId}" tabindex="-1"></ul>
    </div>`;
  const boton = contenedor.querySelector(".desplegable-boton");
  const textoValor = boton.querySelector(".valor");
  const panel = contenedor.querySelector(".desplegable-panel");
  const cajaBuscar = contenedor.querySelector(".desplegable-buscar");
  const buscar = contenedor.querySelector("input");
  const lista = contenedor.querySelector(".desplegable-lista");

  let grupos = [];
  let total = 0;
  let valor = "";
  let activo = -1;

  const opcionesVisibles = () => [...lista.querySelectorAll('[role="option"]')];

  function dibujarLista() {
    const q = buscar.value.trim().toLowerCase();
    const filtrar = (o) => !q || o.nombre.toLowerCase().includes(q);
    let html = "";
    if (!q) {
      html += `<li role="option" id="${id}-op-todos" class="desplegable-opcion" data-valor="" aria-selected="${valor === ""}"><span>Todos los modelos</span><span class="cantidad cifras">${formatearMiles(total)}</span></li>`;
    }
    grupos.forEach((g, i) => {
      const ops = g.opciones.filter(filtrar);
      if (!ops.length) return;
      html += `<li role="group" aria-labelledby="${id}-g${i}"><div class="desplegable-grupo" id="${id}-g${i}" role="presentation">${escaparHTML(etiquetaGeneracion(g.generacion))}</div>`;
      html += ops.map((o) => `<div role="option" id="${id}-op-${escaparHTML(o.slug)}" class="desplegable-opcion" data-valor="${escaparHTML(o.slug)}" aria-selected="${o.slug === valor}"><span>${escaparHTML(o.nombre)}</span><span class="cantidad cifras" aria-label="${o.cantidad} disponibles">${formatearMiles(o.cantidad)}</span></div>`).join("");
      html += "</li>";
    });
    lista.innerHTML = html || '<li class="desplegable-vacio" role="presentation">No hay modelos con ese nombre.</li>';
    const ops = opcionesVisibles();
    const sel = ops.findIndex((o) => o.dataset.valor === valor);
    marcarActivo(sel >= 0 ? sel : 0, false);
  }

  function marcarActivo(i, desplazar = true) {
    const ops = opcionesVisibles();
    ops.forEach((o) => o.classList.remove("activa"));
    activo = ops.length ? Math.max(0, Math.min(i, ops.length - 1)) : -1;
    const el = ops[activo];
    const destino = cajaBuscar.hidden ? lista : buscar;
    if (el) {
      el.classList.add("activa");
      destino.setAttribute("aria-activedescendant", el.id);
      if (desplazar) el.scrollIntoView({ block: "nearest" });
    } else {
      destino.removeAttribute("aria-activedescendant");
    }
  }

  function abrir() {
    if (!panel.hidden) return;
    const cuantas = grupos.reduce((n, g) => n + g.opciones.length, 0);
    cajaBuscar.hidden = cuantas <= 8;
    buscar.value = "";
    panel.hidden = false;
    boton.setAttribute("aria-expanded", "true");
    dibujarLista();
    (cajaBuscar.hidden ? lista : buscar).focus();
    document.addEventListener("pointerdown", fuera, true);
  }

  function cerrar(devolverFoco = true) {
    if (panel.hidden) return;
    panel.hidden = true;
    boton.setAttribute("aria-expanded", "false");
    document.removeEventListener("pointerdown", fuera, true);
    if (devolverFoco) boton.focus();
  }

  function fuera(e) {
    if (!contenedor.contains(e.target)) cerrar(false);
  }

  function elegir(op) {
    if (!op) return;
    cerrar();
    alElegir(op.dataset.valor);
  }

  function teclas(e) {
    const ops = opcionesVisibles();
    switch (e.key) {
      case "ArrowDown": e.preventDefault(); marcarActivo(activo + 1); break;
      case "ArrowUp": e.preventDefault(); marcarActivo(activo - 1); break;
      case "Home": if (e.target === lista) { e.preventDefault(); marcarActivo(0); } break;
      case "End": if (e.target === lista) { e.preventDefault(); marcarActivo(ops.length - 1); } break;
      case "Enter": e.preventDefault(); elegir(ops[activo]); break;
      case "Escape": e.preventDefault(); cerrar(); break;
      case "Tab": cerrar(false); break;
      default: break;
    }
  }

  boton.addEventListener("click", () => (panel.hidden ? abrir() : cerrar()));
  boton.addEventListener("keydown", (e) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") { e.preventDefault(); abrir(); }
  });
  lista.addEventListener("keydown", teclas);
  buscar.addEventListener("keydown", teclas);
  buscar.addEventListener("input", dibujarLista);
  lista.addEventListener("click", (e) => elegir(e.target.closest('[role="option"]')));
  lista.addEventListener("pointermove", (e) => {
    const op = e.target.closest('[role="option"]');
    if (op) marcarActivo(opcionesVisibles().indexOf(op), false);
  });

  return {
    actualizar(nuevosGrupos, nuevoValor, nombreValor, nuevoTotal) {
      grupos = nuevosGrupos;
      valor = nuevoValor;
      total = nuevoTotal;
      textoValor.textContent = nombreValor || "Todos los modelos";
      textoValor.classList.toggle("valor--vacio", !nombreValor);
      if (!panel.hidden) dibujarLista();
    },
    boton,
    cerrar
  };
}
