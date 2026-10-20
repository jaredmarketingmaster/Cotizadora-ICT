// =============================================================================
// Fichas técnicas: un formulario por modelo activo, con descripción y filas
// etiqueta/valor que la tienda agrega, edita, reordena y borra.
// No se precarga ninguna especificación.
// =============================================================================

import { $, esc, conBoton, confirmar, campoTexto } from "./ui.js";

const SUGERIDAS = ["Pantalla", "Chip", "Cámaras", "Batería", "Desbloqueo", "Resistencia al agua"];

export async function dibujar(vista, ctx, resto) {
  const { api } = ctx;
  const [modelos, fichas] = await Promise.all([api.listarModelos(), api.listarFichas()]);
  const activos = modelos.filter((m) => m.activo).sort((a, b) => b.orden - a.orden);
  const fichaDe = (id) => fichas.find((f) => f.modelo_id === id) || { modelo_id: id, descripcion: "", especificaciones: [] };
  const llenas = (f) => f.descripcion.trim() || (f.especificaciones || []).length;

  const id = Number(resto[0]);
  if (!id) {
    vista.innerHTML = `
      <div class="vista-cabecera"><h1>Fichas técnicas</h1><p>Una por cada modelo activo. Lo que quede vacío no se muestra en el sitio.</p></div>
      ${activos.length ? `<ul class="avisos avisos--neutro">${activos.map((m) => {
        const f = fichaDe(m.id);
        const n = (f.especificaciones || []).length;
        return `<li><span>${esc(m.nombre)}<br><span class="ayuda">${llenas(f) ? `${n} fila${n === 1 ? "" : "s"}${f.descripcion.trim() ? " · con descripción" : ""}` : "Vacía"}</span></span><a class="boton boton--suave boton--chico" href="#/fichas/${m.id}">Editar</a></li>`;
      }).join("")}</ul>` : '<p class="vacio-panel">No hay modelos activos. Actívelos en <a href="#/catalogo">Catálogo</a>.</p>'}`;
    return;
  }

  const modelo = modelos.find((m) => m.id === id);
  if (!modelo) { vista.innerHTML = '<p class="popup-alerta">Ese modelo no existe.</p><a class="volver" href="#/fichas">← Fichas técnicas</a>'; return; }
  const ficha = fichaDe(id);
  let filas = (ficha.especificaciones || []).map((f) => ({ etiqueta: f.etiqueta || "", valor: f.valor || "" }));
  const otras = modelos.filter((m) => m.id !== id && llenas(fichaDe(m.id)));

  vista.innerHTML = `
    <a class="volver" href="#/fichas">← Fichas técnicas</a>
    <div class="vista-cabecera"><h1>${esc(modelo.nombre)}</h1>${modelo.activo ? "" : "<p>Este modelo está inactivo: su ficha no se ve en el sitio.</p>"}</div>
    <form id="form-ficha" novalidate>
      <section class="bloque">
        ${campoTexto({ id: "f-descripcion", etiqueta: "Descripción", valor: ficha.descripcion, ayuda: "Texto libre de la tienda. Se muestra en la ficha de todos los equipos de este modelo.", multilinea: true, atributos: 'rows="4" maxlength="1500"' })}
      </section>
      <section class="bloque" aria-labelledby="t-filas">
        <h2 id="t-filas">Especificaciones</h2>
        <p class="ayuda">Solo se muestran las filas que tienen etiqueta y valor. Cargue datos de una fuente verificada.</p>
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
      <div class="campo"><label for="fe-${i}">Etiqueta</label><input class="entrada" id="fe-${i}" data-i="${i}" data-k="etiqueta" value="${esc(f.etiqueta)}" list="etiquetas-sugeridas" maxlength="60"></div>
      <div class="campo"><label for="fv-${i}">Valor</label><textarea class="entrada" id="fv-${i}" data-i="${i}" data-k="valor" rows="2" maxlength="400">${esc(f.valor)}</textarea></div>
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
    if ((filas.length || $("#f-descripcion").value.trim()) &&
        !(await confirmar({ titulo: "¿Reemplazar esta ficha?", texto: "Se cambian la descripción y las filas por las del otro modelo. Se guarda al tocar «Guardar».", aceptar: "Reemplazar" }))) return;
    filas = (origen.especificaciones || []).map((f) => ({ ...f }));
    $("#f-descripcion").value = origen.descripcion;
    $("#caja-copiar").hidden = true;
    ctx.sucio = true;
    pintar();
  });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const especificaciones = filas.map((f) => ({ etiqueta: f.etiqueta.trim(), valor: f.valor.trim() })).filter((f) => f.etiqueta || f.valor);
    try {
      await conBoton($("#guardar-ficha"), () => api.guardarFicha(id, { descripcion: $("#f-descripcion").value.trim(), especificaciones }));
      filas = especificaciones;
      ctx.sucio = false;
      pintar();
    } catch { /* aviso mostrado */ }
  });
  pintar();
}
