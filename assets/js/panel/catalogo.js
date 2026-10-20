// =============================================================================
// Catálogo: interruptor activo/inactivo para todos. La agencia además agrega,
// renombra y reordena. El slug (lo que va en la URL de los anuncios) no cambia
// al renombrar, para no romper enlaces ya publicados.
// =============================================================================

import { slugDe } from "../datos/semilla.js";
import { $, esc, conBoton, campoTexto, marcarError, enfocarPrimerError, avisar } from "./ui.js";

export async function dibujar(vista, ctx) {
  const { api } = ctx;
  const agencia = ctx.esAgencia();
  let modelos = await api.listarModelos();

  function grupos() {
    const g = [];
    for (const m of [...modelos].sort((a, b) => b.orden - a.orden)) {
      let x = g.find((y) => y.nombre === m.generacion);
      if (!x) { x = { nombre: m.generacion, modelos: [] }; g.push(x); }
      x.modelos.push(m);
    }
    g.forEach((x) => x.modelos.sort((a, b) => a.orden - b.orden));
    return g;
  }

  function pintar() {
    const ordenados = [...modelos].sort((a, b) => a.orden - b.orden);
    $("#lista-catalogo").innerHTML = grupos().map((g) => `<section class="grupo-catalogo">
      <h2>${/^\d+$/.test(g.nombre) ? `Generación ${esc(g.nombre)}` : esc(g.nombre)}</h2>
      ${g.modelos.map((m) => {
        const i = ordenados.indexOf(m);
        return `<div class="modelo-fila" data-id="${m.id}">
          ${agencia
            ? `<label class="oculto-visual" for="n-${m.id}">Nombre</label><input class="entrada nombre" id="n-${m.id}" data-renombrar value="${esc(m.nombre)}" maxlength="60">`
            : `<span class="nombre">${esc(m.nombre)}</span>`}
          <div class="botones">
            ${agencia ? `<button type="button" class="boton-icono" data-mover="-1" aria-label="Mover ${esc(m.nombre)} antes" ${i === 0 ? "disabled" : ""}>↑</button>
            <button type="button" class="boton-icono" data-mover="1" aria-label="Mover ${esc(m.nombre)} después" ${i === ordenados.length - 1 ? "disabled" : ""}>↓</button>` : ""}
            <label class="interruptor" for="a-${m.id}"><input type="checkbox" role="switch" id="a-${m.id}" data-activar ${m.activo ? "checked" : ""}><span class="oculto-visual">${esc(m.nombre)}: </span><span>${m.activo ? "Activo" : "Inactivo"}</span></label>
          </div>
        </div>`;
      }).join("")}
    </section>`).join("");
  }

  vista.innerHTML = `
    <div class="vista-cabecera"><h1>Catálogo</h1><p>Active solo los modelos que vende. Un modelo inactivo y sus equipos no se ven en el sitio.${agencia ? " El orden define qué generación es más nueva." : ""}</p></div>
    ${agencia ? `<details class="bloque">
      <summary style="font-weight:700;cursor:pointer;min-height:44px;display:flex;align-items:center">Agregar modelo</summary>
      <form id="form-modelo" novalidate class="grilla-2">
        ${campoTexto({ id: "m-nombre", etiqueta: "Nombre", ayuda: "Tal como lo nombra el fabricante.", atributos: 'maxlength="60"' })}
        ${campoTexto({ id: "m-generacion", etiqueta: "Generación", ayuda: "Ej. 19, o un grupo como «Plegable».", atributos: 'maxlength="30"' })}
        <div><button type="submit" class="boton boton--primario">Agregar al final</button></div>
      </form>
    </details>` : ""}
    <div id="lista-catalogo"></div>`;

  const lista = $("#lista-catalogo");
  lista.addEventListener("change", async (e) => {
    const fila = e.target.closest(".modelo-fila");
    if (!fila) return;
    const id = Number(fila.dataset.id);
    const m = modelos.find((x) => x.id === id);
    if (e.target.dataset.activar !== undefined) {
      try {
        Object.assign(m, await conBoton(null, () => api.guardarModelo(id, { activo: e.target.checked })));
        e.target.nextElementSibling.nextElementSibling.textContent = m.activo ? "Activo" : "Inactivo";
      } catch { e.target.checked = !e.target.checked; }
    }
    if (e.target.dataset.renombrar !== undefined) {
      const nombre = e.target.value.trim();
      if (!nombre) { e.target.value = m.nombre; avisar("El nombre no puede quedar vacío.", "error"); return; }
      if (nombre === m.nombre) return;
      try { Object.assign(m, await conBoton(null, () => api.guardarModelo(id, { nombre }))); } catch { e.target.value = m.nombre; }
    }
  });
  lista.addEventListener("keydown", (e) => { if (e.key === "Enter" && e.target.dataset.renombrar !== undefined) { e.preventDefault(); e.target.blur(); } });
  lista.addEventListener("click", async (e) => {
    const b = e.target.closest("[data-mover]");
    if (!b) return;
    const id = Number(b.closest(".modelo-fila").dataset.id);
    const ordenados = [...modelos].sort((a, c) => a.orden - c.orden);
    const i = ordenados.findIndex((x) => x.id === id);
    const j = i + Number(b.dataset.mover);
    const [a, c] = [ordenados[i], ordenados[j]];
    if (!c) return;
    // Intercambia el orden de los dos modelos. Si cambian de generación, el
    // modelo pasa al grupo vecino solo si se le cambia la generación.
    try {
      await conBoton(null, async () => {
        const oa = a.orden; const oc = c.orden;
        Object.assign(a, await api.guardarModelo(a.id, { orden: oc }));
        Object.assign(c, await api.guardarModelo(c.id, { orden: oa }));
      });
    } catch { modelos = await api.listarModelos(); }
    pintar();
    lista.querySelector(`.modelo-fila[data-id="${id}"] [data-mover="${b.dataset.mover}"]`)?.focus();
  });

  $("#form-modelo")?.addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const nombre = $("#m-nombre").value.trim();
    const generacion = $("#m-generacion").value.trim();
    const slug = slugDe(nombre);
    marcarError(form, "m-nombre", !nombre ? "Escriba el nombre." : modelos.some((m) => m.nombre === nombre || m.slug === slug) ? "Ya existe un modelo con ese nombre." : "");
    marcarError(form, "m-generacion", generacion ? "" : "Escriba la generación.");
    if (enfocarPrimerError(form)) return;
    const orden = Math.max(0, ...modelos.map((m) => m.orden)) + 10;
    try {
      const m = await conBoton(form.querySelector("[type=submit]"), () => api.agregarModelo({ nombre, slug, generacion, orden, activo: false }), { exito: "Modelo agregado" });
      modelos.push(m);
      form.reset();
      pintar();
    } catch { /* aviso mostrado */ }
  });

  pintar();
}
