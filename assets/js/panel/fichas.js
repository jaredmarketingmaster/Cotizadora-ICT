// =============================================================================
// Ficha técnica (pestaña de Catálogo).
// - Lista: el interruptor "Mostrar la ficha técnica en el sitio", uno por
//   categoría y los modelos activos con su ficha.
// - Editor de un modelo: descripción, las categorías fijas (precargadas desde
//   la fuente en 0012; la tienda las corrige o completa) y las filas que
//   agrega la tienda (agregar, editar, subir, bajar y borrar).
// =============================================================================

import { CATEGORIAS_FICHA, MAX_ETIQUETA_FICHA, MAX_VALOR_FICHA } from "../datos/comun.js";
import { $, $$, esc, conBoton, confirmar, campoTexto, interruptor } from "./ui.js";

const FIJAS = CATEGORIAS_FICHA.filter((c) => c.clave !== "otras");
const SUGERIDAS = ["Desbloqueo", "Resistencia al agua", "Conectividad", "Sensores"];

export async function dibujar(vista, ctx, resto) {
  const { api } = ctx;
  const [modelos, fichas, tienda] = await Promise.all([api.listarModelos(), api.listarFichas(), api.leerTienda()]);
  if (!vista.isConnected) return; // se cambió de pestaña o de sección mientras cargaba
  const activos = modelos.filter((m) => m.activo).sort((a, b) => b.orden - a.orden);
  const fichaDe = (id) => fichas.find((f) => f.modelo_id === id) || { modelo_id: id, descripcion: "", especificaciones: [] };
  const conValor = (f) => (f.especificaciones || []).filter((x) => String(x.valor || "").trim());
  const llenas = (f) => f.descripcion.trim() || conValor(f).length;
  const ocultas = new Set(tienda.ficha_ocultas || []);

  const id = Number(resto[0]);
  if (!id) {
    vista.innerHTML = `
      <section class="bloque" aria-labelledby="t-ficha-sitio">
        <h2 id="t-ficha-sitio">En el sitio</h2>
        ${interruptor({ id: "i-mostrar-ficha", etiqueta: "Mostrar la ficha técnica en el sitio", marcado: tienda.mostrar_ficha !== false })}
        <fieldset class="categorias-ficha" id="categorias-ficha" ${tienda.mostrar_ficha === false ? "disabled" : ""}>
          <legend>Categorías que se muestran</legend>
          ${CATEGORIAS_FICHA.map((c) => interruptor({ id: `i-cat-${c.clave}`, etiqueta: c.etiqueta, marcado: !ocultas.has(c.clave), atributos: `data-categoria="${c.clave}"` })).join("")}
        </fieldset>
        <p class="ayuda">En cada modelo se ven solo las categorías encendidas que tienen dato, en este orden.</p>
      </section>
      <section class="bloque" aria-labelledby="t-fichas-modelos">
        <h2 id="t-fichas-modelos">Fichas por modelo</h2>
        <p>Una por cada modelo activo. Lo que quede vacío no se muestra en el sitio.</p>
        ${activos.length ? `<ul class="avisos avisos--neutro">${activos.map((m) => {
          const f = fichaDe(m.id);
          const n = conValor(f).length;
          return `<li><span>${esc(m.nombre)}<br><span class="ayuda">${llenas(f) ? `${n} dato${n === 1 ? "" : "s"}${f.descripcion.trim() ? " · con descripción" : ""}` : "Vacía"}</span></span><a class="boton boton--suave boton--chico" href="#/catalogo/ficha/${m.id}">Editar</a></li>`;
        }).join("")}</ul>` : '<p class="vacio-panel">No hay modelos activos. Actívelos en <a href="#/catalogo">Modelos y colores</a>.</p>'}
      </section>`;

    $("#i-mostrar-ficha", vista).addEventListener("change", async (e) => {
      try {
        await conBoton(null, () => api.guardarTienda({ mostrar_ficha: e.target.checked }));
        $("#categorias-ficha", vista).disabled = !e.target.checked;
      } catch { e.target.checked = !e.target.checked; }
    });
    $("#categorias-ficha", vista).addEventListener("change", async (e) => {
      const clave = e.target.dataset.categoria;
      if (!clave) return;
      const nuevas = new Set(ocultas);
      if (e.target.checked) nuevas.delete(clave); else nuevas.add(clave);
      try {
        await conBoton(null, () => api.guardarTienda({ ficha_ocultas: CATEGORIAS_FICHA.map((c) => c.clave).filter((c) => nuevas.has(c)) }));
        if (e.target.checked) ocultas.delete(clave); else ocultas.add(clave);
      } catch { e.target.checked = !e.target.checked; }
    });
    return;
  }

  const modelo = modelos.find((m) => m.id === id);
  if (!modelo) { vista.innerHTML = '<p class="popup-alerta">Ese modelo no existe.</p><a class="volver" href="#/catalogo/ficha">← Ficha técnica</a>'; return; }
  const ficha = fichaDe(id);
  const valorDe = (f, clave) => (f.especificaciones || []).find((x) => x.clave === clave)?.valor || "";
  // Filas que agrega la tienda (sin categoría fija)
  let filas = (ficha.especificaciones || []).filter((f) => !f.clave).map((f) => ({ etiqueta: f.etiqueta || "", valor: f.valor || "" }));
  const otras = modelos.filter((m) => m.id !== id && llenas(fichaDe(m.id)));

  vista.innerHTML = `
    <a class="volver" href="#/catalogo/ficha">← Ficha técnica</a>
    <div class="vista-cabecera"><h2>${esc(modelo.nombre)}</h2>${modelo.activo ? "" : "<p>Este modelo está inactivo: su ficha no se ve en el sitio.</p>"}</div>
    <form id="form-ficha" novalidate>
      <section class="bloque">
        ${campoTexto({ id: "f-descripcion", etiqueta: "Descripción", valor: ficha.descripcion, ayuda: "Texto libre de la tienda. Se muestra en la ficha de todos los equipos de este modelo.", multilinea: true, atributos: 'rows="4" maxlength="1500"' })}
      </section>
      <section class="bloque" aria-labelledby="t-categorias">
        <h3 id="t-categorias">Especificaciones</h3>
        <p class="ayuda">Vienen de los datos del catálogo. Puede corregirlas o completarlas; lo que quede vacío no se muestra.</p>
        ${FIJAS.map((c) => campoTexto({
          id: `fc-${c.clave}`, etiqueta: c.etiqueta, valor: valorDe(ficha, c.clave), multilinea: true,
          ayuda: ocultas.has(c.clave) ? "Esta categoría está apagada: no se ve en el sitio." : "",
          atributos: `rows="3" maxlength="${MAX_VALOR_FICHA}" data-categoria="${c.clave}"`
        })).join("")}
      </section>
      <section class="bloque" aria-labelledby="t-filas">
        <h3 id="t-filas">Otras filas de la tienda</h3>
        <p class="ayuda">Solo se muestran las filas que tienen etiqueta y valor, después de las especificaciones.</p>
        <ul class="filas-ficha" id="filas"></ul>
        <div class="zona-subida-botones" style="justify-content:flex-start">
          <button type="button" class="boton boton--secundario" id="agregar-fila">Agregar fila</button>
          ${otras.length ? `<button type="button" class="boton boton--secundario" id="copiar">Copiar ficha de otro modelo</button>` : ""}
        </div>
        <div id="caja-copiar" hidden>
          <div class="campo">
            <label for="copiar-de">Copiar de</label>
            <select class="entrada" id="copiar-de">${otras.map((m) => `<option value="${m.id}">${esc(m.nombre)}</option>`).join("")}</select>
          </div>
          <button type="button" class="boton boton--primario" id="copiar-ya">Copiar</button>
        </div>
      </section>
      <div class="acciones-formulario"><button type="submit" class="boton boton--primario" id="guardar-ficha">Guardar</button></div>
    </form>
    <datalist id="etiquetas-sugeridas">${SUGERIDAS.map((s) => `<option value="${s}">`).join("")}</datalist>`;

  function pintar() {
    $("#filas").innerHTML = filas.length ? filas.map((f, i) => `<li class="fila-ficha">
      <div class="campo"><label for="fe-${i}">Etiqueta</label><input class="entrada" id="fe-${i}" data-i="${i}" data-k="etiqueta" value="${esc(f.etiqueta)}" list="etiquetas-sugeridas" maxlength="${MAX_ETIQUETA_FICHA}"></div>
      <div class="campo"><label for="fv-${i}">Valor</label><textarea class="entrada" id="fv-${i}" data-i="${i}" data-k="valor" rows="2" maxlength="${MAX_VALOR_FICHA}">${esc(f.valor)}</textarea></div>
      <div class="fila-ficha-botones">
        <button type="button" class="boton-icono" data-mover="-1" data-i="${i}" aria-label="Subir la fila ${i + 1}" ${i === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="boton-icono" data-mover="1" data-i="${i}" aria-label="Bajar la fila ${i + 1}" ${i === filas.length - 1 ? "disabled" : ""}>↓</button>
        <button type="button" class="boton-icono" data-borrar data-i="${i}" aria-label="Borrar la fila ${i + 1}">✕</button>
      </div>
    </li>`).join("") : '<li class="vacio-panel">Sin filas todavía.</li>';
  }

  const form = $("#form-ficha");
  form.addEventListener("input", (e) => {
    ctx.sucio = true;
    const { i, k } = e.target.dataset;
    if (k) filas[Number(i)][k] = e.target.value;
  });
  $("#filas").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    const i = Number(b.dataset.i);
    if (b.dataset.borrar !== undefined) { filas.splice(i, 1); ctx.sucio = true; pintar(); return; }
    if (b.dataset.mover) {
      const j = i + Number(b.dataset.mover);
      [filas[i], filas[j]] = [filas[j], filas[i]];
      ctx.sucio = true; pintar();
      $(`[data-mover="${b.dataset.mover}"][data-i="${j}"]`)?.focus();
    }
  });
  $("#agregar-fila").addEventListener("click", () => {
    filas.push({ etiqueta: "", valor: "" });
    pintar();
    $(`#fe-${filas.length - 1}`).focus();
  });
  $("#copiar")?.addEventListener("click", () => { $("#caja-copiar").hidden = false; $("#copiar-de").focus(); });
  $("#copiar-ya")?.addEventListener("click", async () => {
    const origen = fichaDe(Number($("#copiar-de").value));
    const hayAlgo = filas.length || $("#f-descripcion").value.trim() || $$("[data-categoria]", form).some((el) => el.value.trim());
    if (hayAlgo && !(await confirmar({ titulo: "¿Reemplazar esta ficha?", texto: "Se cambian la descripción, las especificaciones y las filas por las del otro modelo. Se guarda al tocar «Guardar».", aceptar: "Reemplazar" }))) return;
    filas = (origen.especificaciones || []).filter((f) => !f.clave).map((f) => ({ etiqueta: f.etiqueta, valor: f.valor }));
    for (const el of $$("[data-categoria]", form)) el.value = valorDe(origen, el.dataset.categoria);
    $("#f-descripcion").value = origen.descripcion;
    $("#caja-copiar").hidden = true;
    ctx.sucio = true;
    pintar();
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const fijas = FIJAS.map((c) => ({ clave: c.clave, etiqueta: c.etiqueta, valor: $(`#fc-${c.clave}`).value.trim() })).filter((f) => f.valor);
    const propias = filas.map((f) => ({ etiqueta: f.etiqueta.trim(), valor: f.valor.trim() })).filter((f) => f.etiqueta || f.valor);
    try {
      await conBoton($("#guardar-ficha"), () => api.guardarFicha(id, { descripcion: $("#f-descripcion").value.trim(), especificaciones: [...fijas, ...propias] }));
      filas = propias;
      ctx.sucio = false;
      pintar();
    } catch { /* aviso mostrado */ }
  });
  pintar();
}
