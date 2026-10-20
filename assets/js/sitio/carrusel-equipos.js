// =============================================================================
// Vista "Carrusel" de los equipos (tienda.vista_equipos = "carrusel").
// Las mismas tarjetas, el mismo filtro y el mismo orden que la cuadrícula,
// pero una al centro y las vecinas a los lados, más chicas y desvanecidas.
//
// - Bucle infinito en los dos sentidos. Con 1 tarjeta: sin flechas ni bucle.
//   Con 2: una sola vecina, nunca la misma a los dos lados.
// - Se mueve arrastrando (con inercia y ajuste a la tarjeta), con las flechas,
//   con ← y → del teclado y con el desplazamiento horizontal del trackpad.
// - Tocar la del centro abre el detalle; tocar una vecina la trae al centro.
// - Indicador "3 de 10". Altura estable (la de la tarjeta más alta).
// - prefers-reduced-motion: los cambios son directos, sin animación.
//
// La posición es un número continuo ("pos"): la tarjeta i se dibuja a la
// distancia d = i − pos, llevada al tramo más corto del bucle.
// =============================================================================

import { reducirMovimiento } from "../utils.js";

const VECINAS = 2;          // vecinas que se dibujan a cada lado
const UMBRAL_ARRASTRE = 6;  // px antes de considerar que es un arrastre

export function crearCarruselEquipos(region, lista) {
  const ventana = region.querySelector(".ce-ventana");
  const anterior = region.querySelector(".ce-anterior");
  const siguiente = region.querySelector(".ce-siguiente");
  const indicador = region.querySelector(".ce-indicador");

  let tarjetas = [];
  let n = 0;
  let pos = 0;
  let paso = 300;
  let origen = 0;  // x de la tarjeta del centro, en px enteros
  // Lado por el que se mueve (+1 adelante, −1 atrás). Con un número par de
  // tarjetas decide de qué lado queda la opuesta; con 2, la vecina.
  let sesgo = -1;
  let cuadro = 0;
  let previas = new Map();   // li → última distancia dibujada
  let saltos = new Map();    // li → momento en que saltó de lado (para el fundido)

  const actual = () => (n ? ((Math.round(pos) % n) + n) % n : 0);

  function distancia(i) {
    if (n <= 1) return i - pos;
    let d = (((i - pos) % n) + n) % n;
    if (Math.abs(d - n / 2) < 1e-6) d = sesgo > 0 ? -n / 2 : n / 2;
    else if (d > n / 2) d -= n;
    return d;
  }

  function dibujar(ahora = performance.now()) {
    let fundiendo = false;
    tarjetas.forEach((li, i) => {
      const d = distancia(i);
      const a = Math.abs(d);
      const previa = previas.get(li);
      if (previa != null && Math.abs(d - previa) > 1.2 && !reducirMovimiento()) saltos.set(li, ahora);
      previas.set(li, d);
      const visible = a <= VECINAS + 0.5;
      li.style.visibility = visible ? "" : "hidden";
      if (!visible) return;
      const escala = 1 - Math.min(a, 1.5) * 0.09;
      // El desvanecido de las vecinas lo hace una capa encima (::after, con
      // --distancia); la opacidad solo baja en el fundido de un salto de lado.
      let opacidad = 1;
      const salto = saltos.get(li);
      if (salto != null) {
        const t = (ahora - salto) / 200;
        if (t >= 1) saltos.delete(li); else { opacidad *= t; fundiendo = true; }
      }
      // Posición en píxeles enteros: con medios píxeles el texto se ve borroso.
      li.style.transform = `translate3d(${origen + Math.round(d * paso)}px, 0, 0) scale(${escala.toFixed(4)})`;
      li.style.opacity = opacidad.toFixed(3);
      li.style.zIndex = String(100 - Math.round(a * 10));
      li.style.setProperty("--distancia", a.toFixed(3));
      const centro = a < 0.5;
      li.toggleAttribute("data-centro", centro);
      li.setAttribute("aria-hidden", String(!centro));
      li.querySelector(".tarjeta-boton")?.setAttribute("tabindex", centro ? "0" : "-1");
    });
    indicador.textContent = n ? `${actual() + 1} de ${n}` : "";
    return fundiendo;
  }

  function continuarFundido() {
    cancelAnimationFrame(cuadro);
    const paso1 = (t) => { if (dibujar(t)) cuadro = requestAnimationFrame(paso1); };
    cuadro = requestAnimationFrame(paso1);
  }

  // Lleva "pos" a destino con una curva suave (o directo, sin movimiento).
  // Mientras se mueve, la región lleva data-moviendo y "objetivo" guarda el
  // destino, así dos toques seguidos avanzan dos tarjetas.
  let enfocarAlTerminar = false;
  let objetivo = null;
  function irA(destino) {
    cancelAnimationFrame(cuadro);
    if (n <= 1) { pos = 0; dibujar(); return; }
    if (destino !== pos) sesgo = destino > pos ? 1 : -1;
    objetivo = destino;
    region.setAttribute("data-moviendo", "");
    const terminar = () => {
      objetivo = null;
      region.removeAttribute("data-moviendo");
      // Se normaliza para no acumular números grandes.
      pos = ((Math.round(destino) % n) + n) % n;
      previas = new Map([...previas].map(([li]) => [li, distancia(tarjetas.indexOf(li))]));
      const fundiendo = dibujar();
      if (fundiendo) continuarFundido();
      if (enfocarAlTerminar) {
        enfocarAlTerminar = false;
        tarjetas[actual()]?.querySelector(".tarjeta-boton")?.focus({ preventScroll: true });
      }
    };
    if (reducirMovimiento()) { pos = destino; terminar(); return; }
    const desde = pos;
    const duracion = Math.min(560, 260 + Math.abs(destino - desde) * 120);
    const inicio = performance.now();
    const curva = (t) => 1 - (1 - t) ** 3;
    const avanzar = (t) => {
      const k = Math.min(1, (t - inicio) / duracion);
      pos = desde + (destino - desde) * curva(k);
      dibujar(t);
      if (k < 1) cuadro = requestAnimationFrame(avanzar); else terminar();
    };
    cuadro = requestAnimationFrame(avanzar);
  }

  function mover(pasos) {
    if (n <= 1) return;
    irA((objetivo ?? Math.round(pos)) + pasos);
  }

  function medir() {
    if (!n) { lista.style.height = ""; return; }
    const ancho = tarjetas[0].getBoundingClientRect().width || 280;
    origen = Math.round((lista.getBoundingClientRect().width - ancho) / 2);
    paso = ancho * 0.92 + 12;
    const alto = Math.max(...tarjetas.map((li) => li.offsetHeight));
    lista.style.height = `${Math.ceil(alto)}px`;
  }

  // --- Arrastre (dedo o mouse) con inercia ---
  let toque = null;
  let suprimirClic = false;
  ventana.addEventListener("pointerdown", (e) => {
    if (n <= 1 || (e.pointerType === "mouse" && e.button !== 0)) return;
    toque = { id: e.pointerId, x0: e.clientX, y0: e.clientY, pos0: pos, arrastre: false, muestras: [[performance.now(), e.clientX]] };
  });
  ventana.addEventListener("pointermove", (e) => {
    if (!toque || e.pointerId !== toque.id) return;
    const dx = e.clientX - toque.x0;
    if (!toque.arrastre) {
      if (Math.abs(dx) < UMBRAL_ARRASTRE || Math.abs(dx) < Math.abs(e.clientY - toque.y0)) return;
      toque.arrastre = true;
      // Toma el carrusel donde esté (aunque se estuviera moviendo).
      cancelAnimationFrame(cuadro);
      objetivo = null;
      toque.pos0 = pos + dx / paso;
      region.setAttribute("data-moviendo", "");
      ventana.setPointerCapture(e.pointerId);
      region.classList.add("ce-arrastrando");
    }
    e.preventDefault();
    sesgo = dx < 0 ? 1 : -1;
    pos = toque.pos0 - dx / paso;
    toque.muestras.push([performance.now(), e.clientX]);
    if (toque.muestras.length > 6) toque.muestras.shift();
    dibujar();
  });
  const soltar = (e) => {
    if (!toque || e.pointerId !== toque.id) return;
    const t = toque;
    toque = null;
    region.classList.remove("ce-arrastrando");
    if (!t.arrastre) return;
    suprimirClic = true;
    setTimeout(() => { suprimirClic = false; }, 0);
    // Velocidad de los últimos ~100 ms → cuántas tarjetas más avanza.
    const [tA, xA] = t.muestras[0];
    const [tB, xB] = t.muestras[t.muestras.length - 1];
    const v = tB > tA ? (xB - xA) / (tB - tA) : 0; // px por ms
    const extra = Math.max(-3, Math.min(3, (-v * 220) / paso));
    irA(Math.round(pos + extra));
  };
  ventana.addEventListener("pointerup", soltar);
  ventana.addEventListener("pointercancel", soltar);

  // Un toque en una vecina la trae al centro; uno después de arrastrar no
  // hace nada. Solo la del centro llega al que abre el detalle.
  lista.addEventListener("click", (e) => {
    if (!region.isConnected || region.hidden) return;
    const li = e.target.closest(".tarjeta");
    if (suprimirClic) { e.preventDefault(); e.stopPropagation(); return; }
    if (!li || li.hasAttribute("data-centro")) return;
    e.preventDefault();
    e.stopPropagation();
    const i = tarjetas.indexOf(li);
    if (i >= 0) irA(Math.round(pos + distancia(i)));
  }, true);

  // --- Flechas, teclado y trackpad ---
  anterior.addEventListener("click", () => mover(-1));
  siguiente.addEventListener("click", () => mover(1));
  region.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    if (e.target.closest("input, select, textarea")) return;
    e.preventDefault();
    enfocarAlTerminar = Boolean(e.target.closest(".tarjeta"));
    mover(e.key === "ArrowRight" ? 1 : -1);
  });
  let ruedaFin = 0;
  ventana.addEventListener("wheel", (e) => {
    if (n <= 1 || Math.abs(e.deltaX) <= Math.abs(e.deltaY)) return;
    e.preventDefault();
    cancelAnimationFrame(cuadro);
    objetivo = null;
    region.setAttribute("data-moviendo", "");
    sesgo = e.deltaX > 0 ? 1 : -1;
    pos += e.deltaX / paso;
    dibujar();
    clearTimeout(ruedaFin);
    ruedaFin = setTimeout(() => irA(Math.round(pos)), 140);
  }, { passive: false });

  new ResizeObserver(() => { if (n) { medir(); dibujar(); } }).observe(ventana);

  // Toma las tarjetas que dibujó la galería y vuelve a la primera.
  function reconstruir({ animar = true } = {}) {
    cancelAnimationFrame(cuadro);
    objetivo = null;
    region.removeAttribute("data-moviendo");
    tarjetas = [...lista.querySelectorAll(":scope > .tarjeta")];
    n = tarjetas.length;
    pos = 0;
    sesgo = -1;
    previas = new Map();
    saltos = new Map();
    // Cada tarjeta sigue siendo un ítem de la lista (un <li> no admite
    // role="group"); su nombre es "N de M".
    tarjetas.forEach((li, i) => li.setAttribute("aria-label", `${i + 1} de ${n}`));
    region.hidden = n === 0;
    region.classList.toggle("ce-una", n <= 1);
    anterior.hidden = siguiente.hidden = n <= 1;
    indicador.hidden = n <= 1;
    medir();
    dibujar();
    if (animar && n && !reducirMovimiento()) {
      lista.animate([{ opacity: 0, transform: "translateY(10px) scale(.985)" }, { opacity: 1, transform: "none" }],
        { duration: 320, easing: "cubic-bezier(.2,.8,.2,1)" });
    }
  }

  return { reconstruir, mover, actual: () => actual() };
}
