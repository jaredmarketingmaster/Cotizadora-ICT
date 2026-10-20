// =============================================================================
// Catálogo: interruptor activo/inactivo para todos. La agencia además agrega,
// renombra y reordena. El slug (lo que va en la URL de los anuncios) no cambia
// al renombrar, para no romper enlaces ya publicados.
//
// Colores de cada modelo: los oficiales vienen de la fuente (nombre de solo
// lectura); el hexadecimal se completa donde falta. En modelos sin colores
// oficiales, la agencia agrega y borra los de la tienda.
// =============================================================================

import { slugDe } from "../datos/semilla.js";
import { hexValido } from "../utils.js";
import { etiquetaGeneracion } from "../sitio/catalogo.js";
import { $, esc, conBoton, campoTexto, marcarError, enfocarPrimerError, avisar, confirmar } from "./ui.js";

export async function dibujar(vista, ctx) {
  const { api } = ctx;
  const agencia = ctx.esAgencia();
  let [modelos, colores] = await Promise.all([api.listarModelos(), api.listarColores()]);
  const abiertos = new Set();

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
      <h2>${esc(etiquetaGeneracion(g.nombre))}</h2>
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
          ${bloqueColores(m)}
        </div>`;
      }).join("")}
    </section>`).join("");
  }

  function bloqueColores(m) {
    const lista = colores.filter((c) => c.modelo_id === m.id).sort((a, b) => a.orden - b.orden);
    const oficiales = lista.some((c) => c.oficial);
    const faltan = lista.filter((c) => !c.hex).length;
    const resumen = lista.length
      ? `Colores (${lista.length})${faltan ? ` · ${faltan} sin muestra` : ""}`
      : "Colores: la fuente no tiene colores oficiales";
    return `<details class="colores-modelo" data-modelo="${m.id}" ${abiertos.has(m.id) ? "open" : ""}>
      <summary>${resumen}</summary>
      ${lista.length ? `<ul class="lista-colores">${lista.map((c) => `<li data-color="${c.id}">
        <span class="muestra-color${c.hex ? "" : " muestra-color--vacia"}" ${c.hex ? `style="background:${esc(c.hex)}"` : ""} aria-hidden="true"></span>
        <span class="color-nombres"><span class="color-nombre">${esc(c.nombre_es)}</span>${c.nombre_en ? `<span class="ayuda">${esc(c.nombre_en)}</span>` : ""}${c.oficial ? "" : '<span class="ayuda">De la tienda</span>'}</span>
        ${c.hex_de_fuente
          ? `<span class="cifras color-hex">${esc(c.hex)}</span>`
          : `<span class="campo color-campo"><label class="oculto-visual" for="hex-${c.id}">Hexadecimal de ${esc(c.nombre_es)} (${esc(m.nombre)})</label><input class="entrada cifras" id="hex-${c.id}" data-hex value="${esc(c.hex)}" maxlength="7" placeholder="#RRGGBB" spellcheck="false" aria-describedby="hex-${c.id}-error"><span class="error-campo" id="hex-${c.id}-error"></span></span>`}
        ${agencia && !c.oficial ? `<button type="button" class="boton boton--peligro boton--chico" data-borrar-color>Borrar</button>` : ""}
      </li>`).join("")}</ul>` : ""}
      ${agencia && !oficiales ? `<form class="agregar-color" data-agregar-color novalidate>
        ${campoTexto({ id: `cn-${m.id}`, etiqueta: "Nombre del color", atributos: 'maxlength="40" data-nombre-color' })}
        ${campoTexto({ id: `ch-${m.id}`, etiqueta: "Hexadecimal (opcional)", atributos: 'maxlength="7" placeholder="#RRGGBB" spellcheck="false" data-hex-nuevo' })}
        <div><button type="submit" class="boton boton--secundario">Agregar color</button></div>
      </form>` : ""}
    </details>`;
  }

  vista.innerHTML = `
    <div class="vista-cabecera"><h1>Catálogo</h1><p>Active solo los modelos que vende. Un modelo inactivo y sus equipos no se ven en el sitio.${agencia ? " El orden define qué generación es más nueva." : ""}</p>
      <p class="ayuda">Los colores oficiales vienen de la fuente y su nombre no se cambia. Si a un color le falta la muestra (el hexadecimal), puede completarla.</p></div>
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
  lista.addEventListener("toggle", (e) => {
    const d = e.target.closest?.(".colores-modelo");
    if (!d) return;
    const id = Number(d.dataset.modelo);
    if (d.open) abiertos.add(id); else abiertos.delete(id);
  }, true);

  // Completar el hexadecimal que falta (o corregir el de un color de la tienda).
  async function guardarHex(input) {
    const id = Number(input.closest("[data-color]").dataset.color);
    const c = colores.find((x) => x.id === id);
    const v = input.value.trim().toUpperCase();
    const error = $(`#hex-${id}-error`);
    if (v === (c.hex || "")) { error.textContent = ""; return; }
    if (v && !hexValido(v)) { error.textContent = "Use el formato #RRGGBB, ej. #1C1C1E."; input.setAttribute("aria-invalid", "true"); return; }
    error.textContent = ""; input.removeAttribute("aria-invalid");
    try {
      Object.assign(c, await conBoton(null, () => api.guardarColor(id, { hex: v })));
      pintar();
      $(`#hex-${id}`)?.focus();
    } catch { input.value = c.hex; }
  }
  lista.addEventListener("submit", async (e) => {
    const form = e.target.closest("[data-agregar-color]");
    if (!form) return;
    e.preventDefault();
    const modeloId = Number(form.closest(".colores-modelo").dataset.modelo);
    const nombre = $("[data-nombre-color]", form);
    const hex = $("[data-hex-nuevo]", form);
    const v = hex.value.trim().toUpperCase();
    marcarError(form, nombre.id, nombre.value.trim() ? "" : "Escriba el nombre del color.");
    marcarError(form, hex.id, !v || hexValido(v) ? "" : "Use el formato #RRGGBB, ej. #1C1C1E.");
    if (enfocarPrimerError(form)) return;
    const orden = Math.max(0, ...colores.filter((c) => c.modelo_id === modeloId).map((c) => c.orden)) + 1;
    try {
      colores.push(await conBoton(form.querySelector("[type=submit]"), () => api.agregarColor({ modelo_id: modeloId, nombre_es: nombre.value.trim(), hex: v, orden }), { exito: "Color agregado" }));
      pintar();
      $(`#cn-${modeloId}`)?.focus();
    } catch { /* aviso mostrado */ }
  });

  lista.addEventListener("change", async (e) => {
    if (e.target.dataset.hex !== undefined) { guardarHex(e.target); return; }
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
  lista.addEventListener("keydown", (e) => { if (e.key === "Enter" && (e.target.dataset.renombrar !== undefined || e.target.dataset.hex !== undefined)) { e.preventDefault(); e.target.blur(); } });
  lista.addEventListener("click", async (e) => {
    const borrar = e.target.closest("[data-borrar-color]");
    if (borrar) {
      const id = Number(borrar.closest("[data-color]").dataset.color);
      const c = colores.find((x) => x.id === id);
      if (!await confirmar({ titulo: "¿Borrar este color?", texto: c.nombre_es, aceptar: "Borrar", peligro: true })) return;
      try {
        await conBoton(null, () => api.borrarColor(id), { exito: "Color borrado" });
        colores = colores.filter((x) => x.id !== id);
        pintar();
      } catch { /* aviso mostrado */ }
      return;
    }
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
