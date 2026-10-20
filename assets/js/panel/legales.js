// =============================================================================
// Legales: política de privacidad, términos, autorización de datos (casilla
// del pop-up) y aviso de marca (pie). Formato básico con vista previa.
// =============================================================================

import { formatoBasico } from "../utils.js";
import { $, esc, conBoton } from "./ui.js";

const CAMPOS = [
  ["texto_privacidad", "Política de privacidad", "Se muestra en /privacidad.", true],
  ["texto_terminos", "Términos y condiciones", "Se muestra en /terminos.", true],
  ["texto_autorizacion_datos", "Autorización de datos", "Texto corto de la casilla obligatoria del pop-up. Al lado va el enlace a la política de privacidad.", false],
  ["aviso_marca", "Aviso de marca (opcional)", "Texto corto para el pie. Ej. aclarar que la tienda no es un distribuidor oficial, si aplica.", false]
];

export async function dibujar(vista, ctx) {
  const t = await ctx.recargarTienda();
  vista.innerHTML = `
    <div class="vista-cabecera"><h1>Legales</h1><p>Los textos los redacta su abogado. Formato: <code>## Título</code>, <code>**negrita**</code>, líneas que empiezan con <code>-</code> para listas y <code>[texto](https://…)</code> para enlaces.</p></div>
    <form id="form-legales" novalidate>
      ${CAMPOS.map(([id, etiqueta, ayuda, largo]) => `<section class="bloque">
        <div class="campo">
          <label for="${id}">${etiqueta}</label>
          <p class="ayuda" id="${id}-ayuda">${ayuda}</p>
          <p class="avisos" data-vacio="${id}" ${t[id].trim() || id === "aviso_marca" ? "hidden" : ""}><span>Está vacío.</span></p>
          <textarea class="entrada" id="${id}" rows="${largo ? 12 : 3}" aria-describedby="${id}-ayuda" maxlength="${largo ? 60000 : 600}">${esc(t[id])}</textarea>
        </div>
        ${largo ? `<details><summary style="font-weight:700;cursor:pointer;min-height:44px;display:flex;align-items:center">Ver cómo queda</summary><div class="vista-previa-legal" data-previa="${id}"></div></details>` : ""}
      </section>`).join("")}
      <div class="acciones-formulario"><button type="submit" class="boton boton--primario" id="guardar-legales">Guardar</button></div>
    </form>`;

  const pintarPrevia = (id) => {
    const caja = $(`[data-previa="${id}"]`);
    if (caja) caja.innerHTML = formatoBasico($(`#${id}`).value) || "<p>Sin texto.</p>";
  };
  CAMPOS.forEach(([id]) => pintarPrevia(id));
  $("#form-legales").addEventListener("input", (e) => {
    ctx.sucio = true;
    pintarPrevia(e.target.id);
    const aviso = $(`[data-vacio="${e.target.id}"]`);
    if (aviso && e.target.id !== "aviso_marca") aviso.hidden = Boolean(e.target.value.trim());
  });
  $("#form-legales").addEventListener("submit", async (e) => {
    e.preventDefault();
    const cambios = Object.fromEntries(CAMPOS.map(([id]) => [id, $(`#${id}`).value.trim()]));
    try {
      await conBoton($("#guardar-legales"), () => ctx.api.guardarTienda(cambios));
      ctx.sucio = false;
    } catch { /* aviso mostrado */ }
  });
}
