// =============================================================================
// Apertura y cierre de los diálogos del sitio (hoja de detalle y pop-up).
// - Abrir: con la View Transitions API (si el navegador la tiene), la foto de
//   la tarjeta viaja hasta el detalle. Sin ella, la animación de CSS de
//   siempre (sitio.css, "Aperturas").
// - Cerrar: una salida corta (baja en celular, se achica y desvanece en
//   pantallas grandes) y después close().
// - Con prefers-reduced-motion: abre y cierra directo, sin animación.
// =============================================================================

import { reducirMovimiento } from "../utils.js";

const NOMBRE = "equipo-foto";

// mostrar(): arma el contenido y llama showModal(). destino(): el elemento del
// diálogo que recibe la foto (o null).
export function abrirConTransicion(dialogo, mostrar, { origen = null, destino = () => null } = {}) {
  if (reducirMovimiento() || !document.startViewTransition || !origen) {
    mostrar();
    return;
  }
  origen.style.viewTransitionName = NOMBRE;
  dialogo.setAttribute("data-vt", "");
  let t;
  try {
    t = document.startViewTransition(() => {
      origen.style.viewTransitionName = "";
      mostrar();
      const d = destino();
      if (d) d.style.viewTransitionName = NOMBRE;
    });
  } catch {
    origen.style.viewTransitionName = "";
    dialogo.removeAttribute("data-vt");
    mostrar();
    return;
  }
  t.finished.catch(() => {}).finally(() => {
    const d = destino();
    if (d) d.style.viewTransitionName = "";
    origen.style.viewTransitionName = "";
    dialogo.removeAttribute("data-vt");
  });
}

const cerrando = new WeakSet();

export function cerrarConTransicion(dialogo) {
  if (!dialogo.open || cerrando.has(dialogo)) return;
  if (reducirMovimiento() || !dialogo.animate) { dialogo.close(); return; }
  cerrando.add(dialogo);
  const abajo = dialogo.classList.contains("hoja") ? !window.matchMedia("(min-width: 900px)").matches
    : !window.matchMedia("(min-width: 640px)").matches;
  const desde = getComputedStyle(dialogo).transform;
  const cuadros = abajo
    ? [{ transform: desde === "none" ? "translateY(0)" : desde }, { transform: "translateY(100%)" }]
    : [{ opacity: 1, transform: "none" }, { opacity: 0, transform: "translateY(8px) scale(.97)" }];
  const opciones = { duration: abajo ? 240 : 180, easing: "cubic-bezier(.4,0,1,1)", fill: "forwards" };
  const salida = dialogo.animate(cuadros, opciones);
  try { dialogo.animate([{ opacity: 1 }, { opacity: 0 }], { ...opciones, pseudoElement: "::backdrop" }); } catch { /* sin ::backdrop animable */ }
  const terminar = () => {
    cerrando.delete(dialogo);
    dialogo.close();
    dialogo.getAnimations({ subtree: false }).forEach((a) => a.cancel());
  };
  salida.finished.then(terminar, terminar);
}

// Escape también cierra con la salida animada.
export function cerrarConEscape(dialogo) {
  dialogo.addEventListener("cancel", (e) => {
    e.preventDefault();
    cerrarConTransicion(dialogo);
  });
}
