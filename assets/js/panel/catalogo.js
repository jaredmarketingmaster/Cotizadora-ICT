// =============================================================================
// Catálogo (gestor): interruptor activo/inactivo, agregar, renombrar y
// reordenar. El slug (lo que va en la URL de los anuncios) no cambia
// al renombrar, para no romper enlaces ya publicados.
//
// Colores de cada modelo: los oficiales vienen de la fuente (nombre de solo
// lectura); el hexadecimal se completa donde falta. En modelos sin colores
// oficiales, el gestor agrega y borra los de la tienda.
// =============================================================================

import { slugDe } from "../datos/semilla.js";
import { hexValido } from "../utils.js";
import { etiquetaGeneracion } from "../sitio/catalogo.js";
import { t } from "../i18n/i18n.js";
import { $, esc, conBoton, campoTexto, marcarError, enfocarPrimerError, avisar, confirmar } from "./ui.js";

// Pestañas del Catálogo. Cada una tiene su ruta (#/catalogo/…); #/fichas
// lleva a "Ficha técnica" (panel.js). El nombre visible sale de
// panel.catalogo.pestana.<id> al dibujar.
const PESTANAS = [
  { id: "modelos", ruta: "catalogo", cargar: async () => ({ dibujar: dibujarModelos }) },
  { id: "ficha", ruta: "catalogo/ficha", cargar: () => import("./fichas.js") },
  { id: "pagos", ruta: "catalogo/pagos", cargar: () => import("./pagos.js") },
  { id: "envios", ruta: "catalogo/envios", cargar: () => import("./envios.js") }
];

export async function dibujar(vista, ctx, resto = []) {
  let actual = PESTANAS.find((p) => p.id === resto[0]) || PESTANAS[0];
  vista.innerHTML = `
    <div class="vista-cabecera"><h1>${esc(t("panel.catalogo.titulo"))}</h1></div>
    <div class="pestanas" role="tablist" aria-label="${esc(t("panel.catalogo.secciones"))}">
      ${PESTANAS.map((p) => `<button type="button" class="pestana" role="tab" id="pestana-${p.id}" data-pestana="${p.id}" aria-controls="panel-catalogo" aria-selected="${p === actual}" tabindex="${p === actual ? 0 : -1}">${esc(t(`panel.catalogo.pestana.${p.id}`))}</button>`).join("")}
    </div>
    <div class="panel-pestana" id="panel-catalogo" role="tabpanel" aria-labelledby="pestana-${actual.id}" tabindex="0"></div>`;
  const lista = $(".pestanas", vista);
  const panel = $("#panel-catalogo", vista);

  let version = 0;
  async function mostrar(p, sub = []) {
    const mia = ++version;
    for (const b of lista.querySelectorAll("[role=tab]")) {
      const si = b.dataset.pestana === p.id;
      b.setAttribute("aria-selected", String(si));
      b.tabIndex = si ? 0 : -1;
    }
    panel.setAttribute("aria-labelledby", `pestana-${p.id}`);
    // En celular las pestañas se desplazan: la elegida queda a la vista.
    const elegida = $(`#pestana-${p.id}`, lista);
    const r = elegida.getBoundingClientRect();
    const rl = lista.getBoundingClientRect();
    lista.scrollLeft += r.left - rl.left - (rl.width - r.width) / 2;
    // Cada vez, un contenedor nuevo: si se cambia de pestaña mientras carga,
    // el anterior queda fuera de la página y su módulo no dibuja nada.
    const contenedor = document.createElement("div");
    contenedor.innerHTML = `<p class="subiendo"><span class="spinner" aria-hidden="true"></span>${esc(t("panel.catalogo.cargando"))}</p>`;
    panel.replaceChildren(contenedor);
    const modulo = await p.cargar();
    if (mia !== version || !contenedor.isConnected) return;
    await modulo.dibujar(contenedor, ctx, sub);
  }

  // Cambiar de pestaña no recarga la vista (el foco queda en la pestaña).
  async function cambiar(p, enfocar) {
    if (p === actual) { if (enfocar) $(`#pestana-${p.id}`).focus(); return; }
    if (ctx.sucio && !(await confirmar({ titulo: t("panel.catalogo.sin_guardar.titulo"), texto: t("panel.catalogo.sin_guardar.texto"), aceptar: t("panel.catalogo.sin_guardar.salir"), peligro: true }))) {
      $(`#pestana-${actual.id}`).focus();
      return;
    }
    ctx.sucio = false;
    actual = p;
    ctx.marcarRuta(p.ruta);
    if (enfocar) $(`#pestana-${p.id}`).focus();
    await mostrar(p);
  }
  lista.addEventListener("click", (e) => {
    const b = e.target.closest("[role=tab]");
    if (b) cambiar(PESTANAS.find((p) => p.id === b.dataset.pestana), true);
  });
  lista.addEventListener("keydown", (e) => {
    const i = PESTANAS.indexOf(actual);
    const n = PESTANAS.length;
    const destino = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    cambiar(PESTANAS[destino], true);
  });

  await mostrar(actual, resto.slice(1));
}

async function dibujarModelos(vista, ctx) {
  const { api } = ctx;
  // Solo el gestor llega aquí; la base lo exige igual (políticas de 0007).
  const completo = ctx.esGestor();
  let [modelos, colores] = await Promise.all([api.listarModelos(), api.listarColores()]);
  if (!vista.isConnected) return; // se cambió de pestaña o de sección mientras cargaba
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
          ${completo
            ? `<label class="oculto-visual" for="n-${m.id}">${esc(t("panel.catalogo.modelo.nombre"))}</label><input class="entrada nombre" id="n-${m.id}" data-renombrar value="${esc(m.nombre)}" maxlength="60">`
            : `<span class="nombre">${esc(m.nombre)}</span>`}
          <div class="botones">
            ${completo ? `<button type="button" class="boton-icono" data-mover="-1" aria-label="${esc(t("panel.catalogo.modelo.mover_antes", { nombre: m.nombre }))}" ${i === 0 ? "disabled" : ""}>↑</button>
            <button type="button" class="boton-icono" data-mover="1" aria-label="${esc(t("panel.catalogo.modelo.mover_despues", { nombre: m.nombre }))}" ${i === ordenados.length - 1 ? "disabled" : ""}>↓</button>` : ""}
            <label class="interruptor" for="a-${m.id}"><input type="checkbox" role="switch" id="a-${m.id}" data-activar ${m.activo ? "checked" : ""}><span class="oculto-visual">${esc(m.nombre)}: </span><span>${esc(t(m.activo ? "panel.catalogo.modelo.activo" : "panel.catalogo.modelo.inactivo"))}</span></label>
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
    const resumen = !lista.length ? t("panel.catalogo.colores.sin_oficiales")
      : faltan ? t("panel.catalogo.colores.cuenta_faltan", { n: lista.length, faltan })
      : t("panel.catalogo.colores.cuenta", { n: lista.length });
    return `<details class="colores-modelo" data-modelo="${m.id}" ${abiertos.has(m.id) ? "open" : ""}>
      <summary>${esc(resumen)}</summary>
      ${lista.length ? `<ul class="lista-colores">${lista.map((c) => `<li data-color="${c.id}">
        <span class="muestra-color${c.hex ? "" : " muestra-color--vacia"}" ${c.hex ? `style="background:${esc(c.hex)}"` : ""} aria-hidden="true"></span>
        <span class="color-nombres"><span class="color-nombre">${esc(c.nombre_es)}</span>${c.nombre_en ? `<span class="ayuda">${esc(c.nombre_en)}</span>` : ""}${c.oficial ? "" : `<span class="ayuda">${esc(t("panel.catalogo.colores.de_la_tienda"))}</span>`}${c.hex_aproximado ? `<span class="ayuda">${esc(t("panel.catalogo.colores.aproximado"))}</span>` : ""}</span>
        ${c.hex_de_fuente
          ? `<span class="cifras color-hex">${esc(c.hex)}</span>`
          : `<span class="campo color-campo"><label class="oculto-visual" for="hex-${c.id}">${esc(t("panel.catalogo.colores.hex_de", { color: c.nombre_es, modelo: m.nombre }))}</label><input class="entrada cifras" id="hex-${c.id}" data-hex value="${esc(c.hex)}" maxlength="7" placeholder="#RRGGBB" spellcheck="false" aria-describedby="hex-${c.id}-error"><span class="error-campo" id="hex-${c.id}-error"></span></span>`}
        ${completo && !c.oficial ? `<button type="button" class="boton boton--peligro boton--chico" data-borrar-color>${esc(t("panel.catalogo.colores.borrar"))}</button>` : ""}
      </li>`).join("")}</ul>` : ""}
      ${completo && !oficiales ? `<form class="agregar-color" data-agregar-color novalidate>
        ${campoTexto({ id: `cn-${m.id}`, etiqueta: t("panel.catalogo.colores.nombre"), atributos: 'maxlength="40" data-nombre-color' })}
        ${campoTexto({ id: `ch-${m.id}`, etiqueta: t("panel.catalogo.colores.hex_opcional"), atributos: 'maxlength="7" placeholder="#RRGGBB" spellcheck="false" data-hex-nuevo' })}
        <div><button type="submit" class="boton boton--secundario">${esc(t("panel.catalogo.colores.agregar"))}</button></div>
      </form>` : ""}
    </details>`;
  }

  vista.innerHTML = `
    <div class="vista-cabecera"><p>${esc(t("panel.catalogo.modelos.intro"))}${completo ? ` ${esc(t("panel.catalogo.modelos.orden"))}` : ""}</p>
      <p class="ayuda">${esc(t("panel.catalogo.modelos.colores_ayuda"))}</p>
      <p class="ayuda" id="nota-hex">${esc(t("panel.catalogo.colores.nota_hex"))}</p></div>
    ${completo ? `<details class="bloque">
      <summary style="font-weight:700;cursor:pointer;min-height:44px;display:flex;align-items:center">${esc(t("panel.catalogo.agregar.titulo"))}</summary>
      <form id="form-modelo" novalidate class="grilla-2">
        ${campoTexto({ id: "m-nombre", etiqueta: t("panel.catalogo.agregar.nombre"), ayuda: esc(t("panel.catalogo.agregar.nombre_ayuda")), atributos: 'maxlength="60"' })}
        ${campoTexto({ id: "m-generacion", etiqueta: t("panel.catalogo.agregar.generacion"), ayuda: esc(t("panel.catalogo.agregar.generacion_ayuda")), atributos: 'maxlength="30"' })}
        <div><button type="submit" class="boton boton--primario">${esc(t("panel.catalogo.agregar.boton"))}</button></div>
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
    if (v && !hexValido(v)) { error.textContent = t("panel.catalogo.error.hex"); input.setAttribute("aria-invalid", "true"); return; }
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
    marcarError(form, nombre.id, nombre.value.trim() ? "" : t("panel.catalogo.error.nombre_color"));
    marcarError(form, hex.id, !v || hexValido(v) ? "" : t("panel.catalogo.error.hex"));
    if (enfocarPrimerError(form)) return;
    const orden = Math.max(0, ...colores.filter((c) => c.modelo_id === modeloId).map((c) => c.orden)) + 1;
    try {
      colores.push(await conBoton(form.querySelector("[type=submit]"), () => api.agregarColor({ modelo_id: modeloId, nombre_es: nombre.value.trim(), hex: v, orden }), { exito: t("panel.catalogo.colores.agregado") }));
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
        e.target.nextElementSibling.nextElementSibling.textContent = t(m.activo ? "panel.catalogo.modelo.activo" : "panel.catalogo.modelo.inactivo");
      } catch { e.target.checked = !e.target.checked; }
    }
    if (e.target.dataset.renombrar !== undefined) {
      const nombre = e.target.value.trim();
      if (!nombre) { e.target.value = m.nombre; avisar(t("panel.catalogo.error.nombre_vacio"), "error"); return; }
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
      if (!await confirmar({ titulo: t("panel.catalogo.colores.borrar_titulo"), texto: c.nombre_es, aceptar: t("panel.catalogo.colores.borrar"), peligro: true })) return;
      try {
        await conBoton(null, () => api.borrarColor(id), { exito: t("panel.catalogo.colores.borrado") });
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
    marcarError(form, "m-nombre", !nombre ? t("panel.catalogo.error.nombre") : modelos.some((m) => m.nombre === nombre || m.slug === slug) ? t("panel.catalogo.error.repetido") : "");
    marcarError(form, "m-generacion", generacion ? "" : t("panel.catalogo.error.generacion"));
    if (enfocarPrimerError(form)) return;
    const orden = Math.max(0, ...modelos.map((m) => m.orden)) + 10;
    try {
      const m = await conBoton(form.querySelector("[type=submit]"), () => api.agregarModelo({ nombre, slug, generacion, orden, activo: false }), { exito: t("panel.catalogo.agregar.agregado") });
      modelos.push(m);
      form.reset();
      pintar();
    } catch { /* aviso mostrado */ }
  });

  pintar();
}
