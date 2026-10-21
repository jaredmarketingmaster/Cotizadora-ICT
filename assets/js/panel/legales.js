// =============================================================================
// Legales: política de privacidad, términos, autorización de datos (casilla
// del pop-up) y aviso de marca (pie). Formato básico con vista previa.
// Desde 0015:
// - Los tres primeros vienen con un texto base para que lo revise un abogado.
//   Mientras no se marque "Un abogado ya revisó estos textos", cada editor lo
//   avisa e Inicio lo pone en "Lo que falta".
// - {{nombre}}, {{ciudad}}, {{direccion}}, {{correo}} y {{herramientas}} se
//   reemplazan por los datos de la tienda; la lista de herramientas se edita
//   aquí. La vista previa es la del sitio (sin las marcas [PENDIENTE: …]) y
//   abajo lista lo que todavía falta.
// =============================================================================

import { formatoBasico } from "../utils.js";
import { prepararLegal } from "../datos/comun.js";
import { $, esc, conBoton, interruptor } from "./ui.js";

const CAMPOS = [
  ["texto_privacidad", "Política de privacidad", "Se muestra en /privacidad.", true, true],
  ["texto_terminos", "Términos y condiciones", "Se muestra en /terminos.", true, true],
  ["texto_autorizacion_datos", "Autorización de datos", "Texto corto de la casilla obligatoria del pop-up. Al lado va el enlace a la política de privacidad.", false, true],
  ["aviso_marca", "Aviso de marca (opcional)", "Texto corto para el pie. Ej. aclarar que la tienda no es un distribuidor oficial, si aplica.", false, false]
];
const AVISO_BASE = "Texto base preparado para revisión de un abogado. No lo trate como definitivo.";

export async function dibujar(vista, ctx) {
  const t = await ctx.recargarTienda();
  let herramientas = [...(t.legales_herramientas || [])];
  vista.innerHTML = `
    <div class="vista-cabecera"><h1>Legales</h1><p>Los textos los revisa su abogado. Formato: <code>## Título</code>, <code>**negrita**</code>, líneas que empiezan con <code>-</code> para listas y <code>[texto](https://…)</code> para enlaces.</p>
      <p class="ayuda"><code>{{nombre}}</code>, <code>{{ciudad}}</code>, <code>{{direccion}}</code> y <code>{{correo}}</code> se reemplazan por los datos de Mi tienda, y <code>{{herramientas}}</code> por la lista de abajo. Lo que dice <code>[PENDIENTE: …]</code> no se muestra en el sitio: allí aparece "Texto en revisión." hasta que lo complete.</p></div>
    <form id="form-legales" novalidate>
      <section class="bloque">
        ${interruptor({ id: "legales_revisados", etiqueta: "Un abogado ya revisó estos textos", marcado: t.legales_revisados })}
        <p class="ayuda">Mientras esté apagado, Inicio lo muestra en "Lo que falta".</p>
      </section>
      ${CAMPOS.map(([id, etiqueta, ayuda, largo, base]) => `<section class="bloque">
        ${base ? `<p class="aviso-datos" data-aviso-base ${t.legales_revisados ? "hidden" : ""}>${AVISO_BASE}</p>` : ""}
        <div class="campo">
          <label for="${id}">${etiqueta}</label>
          <p class="ayuda" id="${id}-ayuda">${ayuda}</p>
          <p class="avisos" data-vacio="${id}" ${t[id].trim() || id === "aviso_marca" ? "hidden" : ""}><span>Está vacío.</span></p>
          <textarea class="entrada" id="${id}" rows="${largo ? 12 : 3}" aria-describedby="${id}-ayuda" maxlength="${largo ? 60000 : 600}">${esc(t[id])}</textarea>
        </div>
        ${base ? `<p class="ayuda" data-pendientes="${id}"></p>` : ""}
        ${largo ? `<details><summary style="font-weight:700;cursor:pointer;min-height:44px;display:flex;align-items:center">Ver cómo queda</summary><div class="vista-previa-legal" data-previa="${id}"></div></details>` : ""}
      </section>`).join("")}
      <section class="bloque" aria-labelledby="t-herramientas">
        <h2 id="t-herramientas">Herramientas que usa la tienda</h2>
        <p class="ayuda">Van en la política de privacidad, donde dice <code>{{herramientas}}</code>. Una por línea.</p>
        <ul class="lista-editable" id="herramientas" aria-labelledby="t-herramientas"></ul>
        <button type="button" class="boton boton--secundario" id="agregar-herramienta">Agregar herramienta</button>
      </section>
      <div class="acciones-formulario"><button type="submit" class="boton boton--primario" id="guardar-legales">Guardar</button></div>
    </form>`;

  const form = $("#form-legales");
  // Los datos con los que se ve: los de la tienda, con la lista de herramientas en edición.
  const datos = () => ({ ...t, legales_herramientas: herramientas.map((h) => h.trim()).filter(Boolean) });

  function pintarHerramientas() {
    $("#herramientas").innerHTML = herramientas.map((h, i) => `<li>
      <label class="oculto-visual" for="herramienta-${i}">Herramienta ${i + 1}</label>
      <input class="entrada" id="herramienta-${i}" data-herramienta="${i}" value="${esc(h)}" maxlength="160">
      <button type="button" class="boton-icono" data-subir="${i}" aria-label="Subir la herramienta ${i + 1}" ${i === 0 ? "disabled" : ""}>↑</button>
      <button type="button" class="boton-icono" data-quitar="${i}" aria-label="Quitar la herramienta ${i + 1}">✕</button>
    </li>`).join("");
  }
  function pintarPrevia(id) {
    const caja = $(`[data-previa="${id}"]`);
    const lista = $(`[data-pendientes="${id}"]`);
    if (!caja && !lista) return;
    const { texto, pendientes } = prepararLegal($(`#${id}`).value, datos());
    if (caja) caja.innerHTML = formatoBasico(texto) || "<p>Sin texto.</p>";
    if (lista) lista.textContent = pendientes.length ? `Falta: ${[...new Set(pendientes)].join("; ")}.` : "";
  }
  const pintarTodo = () => CAMPOS.forEach(([id]) => pintarPrevia(id));

  form.addEventListener("input", (e) => {
    ctx.sucio = true;
    if (e.target.dataset.herramienta) { herramientas[Number(e.target.dataset.herramienta)] = e.target.value; pintarTodo(); return; }
    pintarPrevia(e.target.id);
    const aviso = $(`[data-vacio="${e.target.id}"]`);
    if (aviso && e.target.id !== "aviso_marca") aviso.hidden = Boolean(e.target.value.trim());
  });
  form.addEventListener("change", (e) => {
    if (e.target.id === "legales_revisados") form.querySelectorAll("[data-aviso-base]").forEach((p) => { p.hidden = e.target.checked; });
  });
  $("#herramientas").addEventListener("click", (e) => {
    const quitar = e.target.closest("[data-quitar]");
    const subir = e.target.closest("[data-subir]");
    if (quitar) herramientas.splice(Number(quitar.dataset.quitar), 1);
    if (subir) { const i = Number(subir.dataset.subir); [herramientas[i - 1], herramientas[i]] = [herramientas[i], herramientas[i - 1]]; }
    if (!quitar && !subir) return;
    ctx.sucio = true;
    pintarHerramientas();
    pintarTodo();
    if (subir) $(`[data-subir="${Number(subir.dataset.subir) - 1}"]`)?.focus();
  });
  $("#agregar-herramienta").addEventListener("click", () => { herramientas.push(""); pintarHerramientas(); $(`#herramienta-${herramientas.length - 1}`).focus(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const cambios = Object.fromEntries(CAMPOS.map(([id]) => [id, $(`#${id}`).value.trim()]));
    cambios.legales_revisados = $("#legales_revisados").checked;
    cambios.legales_herramientas = datos().legales_herramientas;
    try {
      Object.assign(t, await conBoton($("#guardar-legales"), () => ctx.api.guardarTienda(cambios)));
      herramientas = [...cambios.legales_herramientas];
      ctx.sucio = false;
      pintarHerramientas();
      pintarTodo();
    } catch { /* aviso mostrado */ }
  });

  pintarHerramientas();
  pintarTodo();
}
