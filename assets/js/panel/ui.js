// =============================================================================
// Piezas de interfaz del panel: aviso "Guardado", confirmación, campos.
// =============================================================================

import { escaparHTML } from "../utils.js";
import { t } from "../i18n/i18n.js";

export const $ = (s, raiz = document) => raiz.querySelector(s);
export const $$ = (s, raiz = document) => [...raiz.querySelectorAll(s)];
export const esc = escaparHTML;

let reloj = 0;
export function avisar(texto = t("panel.comun.guardado"), tipo = "ok") {
  const el = $("#aviso-flotante");
  el.textContent = texto;
  el.classList.toggle("error", tipo === "error");
  el.classList.add("visible");
  clearTimeout(reloj);
  reloj = setTimeout(() => el.classList.remove("visible"), tipo === "error" ? 5000 : 2200);
}

export function confirmar({ titulo, texto = "", aceptar = t("panel.comun.aceptar"), peligro = false }) {
  const d = $("#confirmar");
  d.innerHTML = `<form method="dialog" class="confirmar-contenido">
    <h2 id="confirmar-titulo">${esc(titulo)}</h2>
    ${texto ? `<p>${esc(texto)}</p>` : ""}
    <div class="confirmar-botones">
      <button class="boton boton--secundario" value="no">${esc(t("panel.comun.cancelar"))}</button>
      <button class="boton ${peligro ? "boton--peligro" : "boton--primario"}" value="si">${esc(aceptar)}</button>
    </div>
  </form>`;
  d.returnValue = "";
  d.showModal();
  d.querySelector('[value="no"]').focus();
  return new Promise((r) => d.addEventListener("close", () => r(d.returnValue === "si"), { once: true }));
}

// Ejecuta una acción con el botón en estado "cargando" y avisa el resultado.
export async function conBoton(boton, accion, { exito = t("panel.comun.guardado") } = {}) {
  const original = boton?.innerHTML;
  if (boton) { boton.disabled = true; boton.innerHTML = `<span class="spinner" aria-hidden="true"></span>${boton.textContent.trim()}`; }
  try {
    const r = await accion();
    if (exito) avisar(exito);
    return r;
  } catch (e) {
    avisar(e?.message || t("panel.comun.error_generico"), "error");
    throw e;
  } finally {
    if (boton) { boton.disabled = false; boton.innerHTML = original; }
  }
}

export function campoTexto({ id, etiqueta, valor = "", tipo = "text", ayuda = "", requerido = false, atributos = "", multilinea = false }) {
  const desc = [ayuda && `${id}-ayuda`, `${id}-error`].filter(Boolean).join(" ");
  const control = multilinea
    ? `<textarea class="entrada" id="${id}" name="${id}" aria-describedby="${desc}" ${requerido ? "required" : ""} ${atributos}>${esc(valor)}</textarea>`
    : `<input class="entrada" id="${id}" name="${id}" type="${tipo}" value="${esc(valor)}" aria-describedby="${desc}" ${requerido ? "required" : ""} ${atributos}>`;
  return `<div class="campo">
    <label for="${id}">${esc(etiqueta)}</label>
    ${ayuda ? `<p class="ayuda" id="${id}-ayuda">${ayuda}</p>` : ""}
    ${control}
    <p class="error-campo" id="${id}-error"></p>
  </div>`;
}

// estados: ["Con stock", "Sin stock"] muestra al lado el texto del estado
// actual (el lector de pantalla ya anuncia encendido/apagado).
export function interruptor({ id, etiqueta, marcado = false, atributos = "", estados = null }) {
  const estado = estados
    ? `<span class="interruptor-estado" aria-hidden="true"><span class="si">${esc(estados[0])}</span><span class="no">${esc(estados[1])}</span></span>`
    : "";
  return `<label class="interruptor" for="${id}"><input type="checkbox" role="switch" id="${id}" name="${id}" ${marcado ? "checked" : ""} ${atributos}><span>${esc(etiqueta)}</span>${estado}</label>`;
}

export function marcarError(raiz, id, mensaje) {
  const el = $(`#${id}`, raiz);
  const err = $(`#${id}-error`, raiz);
  if (el) el.setAttribute("aria-invalid", String(Boolean(mensaje)));
  if (err) err.textContent = mensaje || "";
  return !mensaje;
}

export function enfocarPrimerError(raiz) {
  const el = $('[aria-invalid="true"]', raiz);
  el?.focus();
  return Boolean(el);
}
