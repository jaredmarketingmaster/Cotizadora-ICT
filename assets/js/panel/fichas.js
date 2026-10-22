// =============================================================================
// Ficha técnica (pestaña de Catálogo).
// - Lista: el interruptor "Mostrar la ficha técnica en el sitio", uno por
//   categoría y los modelos activos con su ficha.
// - Editor de un modelo: descripción, las categorías fijas (precargadas desde
//   la fuente en 0012; la tienda las corrige o completa) y las filas que
//   agrega la tienda (agregar, editar, subir, bajar y borrar).
// =============================================================================

import { CATEGORIAS_FICHA, MAX_ETIQUETA_FICHA, MAX_VALOR_FICHA, etiquetaCategoriaFicha } from "../datos/comun.js";
import { t, tn } from "../i18n/i18n.js";
import { $, $$, esc, conBoton, confirmar, campoTexto, interruptor } from "./ui.js";

const FIJAS = CATEGORIAS_FICHA.filter((c) => c.clave !== "otras");
// Etiquetas sugeridas para las filas de la tienda (panel.fichas.sugerida.<clave>).
const SUGERIDAS = ["desbloqueo", "agua", "conectividad", "sensores"];
const volver = () => `<a class="volver" href="#/catalogo/ficha">${esc(t("panel.fichas.volver"))}</a>`;

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
        <h2 id="t-ficha-sitio">${esc(t("panel.fichas.sitio.titulo"))}</h2>
        ${interruptor({ id: "i-mostrar-ficha", etiqueta: t("panel.fichas.sitio.mostrar"), marcado: tienda.mostrar_ficha !== false })}
        <fieldset class="categorias-ficha" id="categorias-ficha" ${tienda.mostrar_ficha === false ? "disabled" : ""}>
          <legend>${esc(t("panel.fichas.sitio.categorias"))}</legend>
          ${CATEGORIAS_FICHA.map((c) => interruptor({ id: `i-cat-${c.clave}`, etiqueta: etiquetaCategoriaFicha(c.clave), marcado: !ocultas.has(c.clave), atributos: `data-categoria="${c.clave}"` })).join("")}
        </fieldset>
        <p class="ayuda">${esc(t("panel.fichas.sitio.ayuda"))}</p>
      </section>
      <section class="bloque" aria-labelledby="t-fichas-modelos">
        <h2 id="t-fichas-modelos">${esc(t("panel.fichas.modelos.titulo"))}</h2>
        <p>${esc(t("panel.fichas.modelos.intro"))}</p>
        ${activos.length ? `<ul class="avisos avisos--neutro">${activos.map((m) => {
          const f = fichaDe(m.id);
          const n = conValor(f).length;
          return `<li><span>${esc(m.nombre)}<br><span class="ayuda">${esc(llenas(f) ? [tn("panel.fichas.modelos.datos", n), f.descripcion.trim() && t("panel.fichas.modelos.con_descripcion")].filter(Boolean).join(" · ") : t("panel.fichas.modelos.vacia"))}</span></span><a class="boton boton--suave boton--chico" href="#/catalogo/ficha/${m.id}">${esc(t("panel.fichas.modelos.editar"))}</a></li>`;
        }).join("")}</ul>` : `<p class="vacio-panel">${t("panel.fichas.modelos.sin_activos", { enlace: `<a href="#/catalogo">${esc(t("panel.fichas.modelos.sin_activos_enlace"))}</a>` })}</p>`}
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
  if (!modelo) { vista.innerHTML = `<p class="popup-alerta">${esc(t("panel.fichas.no_existe"))}</p>${volver()}`; return; }
  const ficha = fichaDe(id);
  const valorDe = (f, clave) => (f.especificaciones || []).find((x) => x.clave === clave)?.valor || "";
  // Filas que agrega la tienda (sin categoría fija)
  let filas = (ficha.especificaciones || []).filter((f) => !f.clave).map((f) => ({ etiqueta: f.etiqueta || "", valor: f.valor || "" }));
  const otras = modelos.filter((m) => m.id !== id && llenas(fichaDe(m.id)));

  vista.innerHTML = `
    ${volver()}
    <div class="vista-cabecera"><h2>${esc(modelo.nombre)}</h2>${modelo.activo ? "" : `<p>${esc(t("panel.fichas.editor.inactivo"))}</p>`}</div>
    <form id="form-ficha" novalidate>
      <section class="bloque">
        ${campoTexto({ id: "f-descripcion", etiqueta: t("panel.fichas.editor.descripcion"), valor: ficha.descripcion, ayuda: esc(t("panel.fichas.editor.descripcion_ayuda")), multilinea: true, atributos: 'rows="4" maxlength="1500"' })}
      </section>
      <section class="bloque" aria-labelledby="t-categorias">
        <h3 id="t-categorias">${esc(t("panel.fichas.editor.especificaciones"))}</h3>
        <p class="ayuda">${esc(t("panel.fichas.editor.especificaciones_ayuda"))}</p>
        ${FIJAS.map((c) => campoTexto({
          id: `fc-${c.clave}`, etiqueta: etiquetaCategoriaFicha(c.clave), valor: valorDe(ficha, c.clave), multilinea: true,
          ayuda: ocultas.has(c.clave) ? esc(t("panel.fichas.editor.apagada")) : "",
          atributos: `rows="3" maxlength="${MAX_VALOR_FICHA}" data-categoria="${c.clave}"`
        })).join("")}
      </section>
      <section class="bloque" aria-labelledby="t-filas">
        <h3 id="t-filas">${esc(t("panel.fichas.filas.titulo"))}</h3>
        <p class="ayuda">${esc(t("panel.fichas.filas.ayuda"))}</p>
        <ul class="filas-ficha" id="filas"></ul>
        <div class="zona-subida-botones" style="justify-content:flex-start">
          <button type="button" class="boton boton--secundario" id="agregar-fila">${esc(t("panel.fichas.filas.agregar"))}</button>
          ${otras.length ? `<button type="button" class="boton boton--secundario" id="copiar">${esc(t("panel.fichas.copiar.abrir"))}</button>` : ""}
        </div>
        <div id="caja-copiar" hidden>
          <div class="campo">
            <label for="copiar-de">${esc(t("panel.fichas.copiar.de"))}</label>
            <select class="entrada" id="copiar-de">${otras.map((m) => `<option value="${m.id}">${esc(m.nombre)}</option>`).join("")}</select>
          </div>
          <button type="button" class="boton boton--primario" id="copiar-ya">${esc(t("panel.fichas.copiar.boton"))}</button>
        </div>
      </section>
      <div class="acciones-formulario"><button type="submit" class="boton boton--primario" id="guardar-ficha">${esc(t("panel.fichas.guardar"))}</button></div>
    </form>
    <datalist id="etiquetas-sugeridas">${SUGERIDAS.map((s) => `<option value="${esc(t(`panel.fichas.sugerida.${s}`))}">`).join("")}</datalist>`;

  function pintar() {
    $("#filas").innerHTML = filas.length ? filas.map((f, i) => `<li class="fila-ficha">
      <div class="campo"><label for="fe-${i}">${esc(t("panel.fichas.filas.etiqueta"))}</label><input class="entrada" id="fe-${i}" data-i="${i}" data-k="etiqueta" value="${esc(f.etiqueta)}" list="etiquetas-sugeridas" maxlength="${MAX_ETIQUETA_FICHA}"></div>
      <div class="campo"><label for="fv-${i}">${esc(t("panel.fichas.filas.valor"))}</label><textarea class="entrada" id="fv-${i}" data-i="${i}" data-k="valor" rows="2" maxlength="${MAX_VALOR_FICHA}">${esc(f.valor)}</textarea></div>
      <div class="fila-ficha-botones">
        <button type="button" class="boton-icono" data-mover="-1" data-i="${i}" aria-label="${esc(t("panel.fichas.filas.subir", { n: i + 1 }))}" ${i === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="boton-icono" data-mover="1" data-i="${i}" aria-label="${esc(t("panel.fichas.filas.bajar", { n: i + 1 }))}" ${i === filas.length - 1 ? "disabled" : ""}>↓</button>
        <button type="button" class="boton-icono" data-borrar data-i="${i}" aria-label="${esc(t("panel.fichas.filas.borrar", { n: i + 1 }))}">✕</button>
      </div>
    </li>`).join("") : `<li class="vacio-panel">${esc(t("panel.fichas.filas.vacio"))}</li>`;
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
    if (hayAlgo && !(await confirmar({ titulo: t("panel.fichas.copiar.confirmar_titulo"), texto: t("panel.fichas.copiar.confirmar_texto"), aceptar: t("panel.fichas.copiar.reemplazar") }))) return;
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
