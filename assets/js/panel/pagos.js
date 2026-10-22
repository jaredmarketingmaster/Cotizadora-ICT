// =============================================================================
// Formas de pago (pestaña de Catálogo, 0013): medios, cuotas, criptomonedas,
// pasarelas y "Otras formas de pago" (la lista libre que antes estaba en Mi
// tienda). Abajo, cómo se ve en el detalle del sitio (frasesPagos).
// =============================================================================

import { MEDIOS_PAGO, PASARELAS_PAGO, MIN_CUOTAS, MAX_CUOTAS, errorPagos, frasesPagos, nombreMedioPago, nombrePasarela } from "../datos/comun.js";
import { t as tr } from "../i18n/i18n.js";
import { $, $$, esc, conBoton, campoTexto, interruptor, marcarError, enfocarPrimerError } from "./ui.js";

export async function dibujar(vista, ctx) {
  const { api } = ctx;
  const t = await api.leerTienda();
  if (!vista.isConnected) return; // se cambió de pestaña o de sección mientras cargaba
  let otras = [...(t.pagos_otras || [])];
  const chips = (nombre, lista, marcados, nombreDe) => `<div class="opciones-chip">${lista.map((o) =>
    `<label class="opcion-chip"><input type="checkbox" name="${nombre}" value="${o.clave}" ${marcados.includes(o.clave) ? "checked" : ""}><span>${esc(nombreDe(o.clave))}</span></label>`).join("")}</div>`;
  const numero = (id, etiqueta, valor, ayuda) => campoTexto({ id, etiqueta, valor: valor ?? "", ayuda, atributos: `inputmode="numeric" maxlength="2" autocomplete="off"` });

  vista.innerHTML = `
    <p>${esc(tr("panel.pagos.intro"))}</p>
    <form id="form-pagos" novalidate>
      <fieldset class="bloque bloque--grupo">
        <legend>${esc(tr("panel.pagos.medios"))}</legend>
        ${chips("medio", MEDIOS_PAGO, t.pagos_medios || [], nombreMedioPago)}
      </fieldset>

      <fieldset class="bloque bloque--grupo">
        <legend>${esc(tr("panel.pagos.cuotas.titulo"))}</legend>
        ${interruptor({ id: "p-cuotas", etiqueta: tr("panel.pagos.cuotas.pregunta"), marcado: t.pagos_cuotas })}
        <div class="caja-pagos" id="caja-cuotas">
          ${numero("p-cuotas-max", tr("panel.pagos.cuotas.max"), t.pagos_cuotas_max, esc(tr("panel.pagos.cuotas.rango", { min: MIN_CUOTAS, max: MAX_CUOTAS })))}
          ${interruptor({ id: "p-sin-interes", etiqueta: tr("panel.pagos.sin_interes.ofrece"), marcado: t.pagos_sin_interes })}
          <div class="caja-pagos" id="caja-sin-interes">
            ${numero("p-sin-interes-max", tr("panel.pagos.sin_interes.max"), t.pagos_sin_interes_max, esc(tr("panel.pagos.sin_interes.tope")))}
          </div>
        </div>
      </fieldset>

      <fieldset class="bloque bloque--grupo">
        <legend>${esc(tr("panel.pagos.cripto.titulo"))}</legend>
        ${interruptor({ id: "p-cripto", etiqueta: tr("panel.pagos.cripto.acepta"), marcado: t.pagos_cripto })}
        <div class="caja-pagos" id="caja-cripto">
          ${campoTexto({ id: "p-cripto-cuales", etiqueta: tr("panel.pagos.cripto.cuales"), valor: t.pagos_cripto_cuales, ayuda: esc(tr("panel.pagos.cripto.cuales_ayuda")), atributos: 'maxlength="120"' })}
        </div>
      </fieldset>

      <fieldset class="bloque bloque--grupo">
        <legend>${esc(tr("panel.pagos.pasarelas"))}</legend>
        ${chips("pasarela", PASARELAS_PAGO, t.pagos_pasarelas || [], nombrePasarela)}
        <div class="caja-pagos" id="caja-otra">
          ${campoTexto({ id: "p-pasarela-otra", etiqueta: tr("panel.pagos.pasarela_otra"), valor: t.pagos_pasarela_otra, atributos: 'maxlength="60"' })}
        </div>
      </fieldset>

      <section class="bloque" aria-labelledby="t-otras-pagos">
        <h2 id="t-otras-pagos">${esc(tr("panel.pagos.otras.titulo"))}</h2>
        <p class="ayuda">${esc(tr("panel.pagos.otras.ayuda"))}</p>
        <ul class="lista-editable" id="pagos-otras" aria-labelledby="t-otras-pagos"></ul>
        <button type="button" class="boton boton--secundario" id="agregar-pago">${esc(tr("panel.pagos.otras.agregar"))}</button>
      </section>

      <section class="bloque" aria-labelledby="t-vista-pagos">
        <h2 id="t-vista-pagos">${esc(tr("panel.pagos.vista.titulo"))}</h2>
        <ul class="vista-pagos" id="vista-pagos"></ul>
      </section>

      <p class="error-campo" id="pagos-error" role="alert"></p>
      <div class="acciones-formulario"><button type="submit" class="boton boton--primario" id="guardar-pagos">${esc(tr("panel.pagos.guardar"))}</button></div>
    </form>`;

  const form = $("#form-pagos", vista);
  const marcado = (id) => $(`#${id}`, form).checked;
  const entero = (id) => {
    const v = $(`#${id}`, form).value.trim();
    return /^\d+$/.test(v) ? Number(v) : (v ? NaN : null);
  };

  function pintarOtras() {
    $("#pagos-otras", form).innerHTML = otras.map((p, i) => `<li>
      <label class="oculto-visual" for="pago-${i}">${esc(tr("panel.pagos.otras.forma", { n: i + 1 }))}</label>
      <input class="entrada" id="pago-${i}" data-pago="${i}" value="${esc(p)}" maxlength="80">
      <button type="button" class="boton-icono" data-subir="${i}" aria-label="${esc(tr("panel.pagos.otras.subir", { n: i + 1 }))}" ${i === 0 ? "disabled" : ""}>↑</button>
      <button type="button" class="boton-icono" data-quitar-pago="${i}" aria-label="${esc(tr("panel.pagos.otras.quitar", { n: i + 1 }))}">✕</button>
    </li>`).join("");
  }

  // Lo que se guardaría con lo que hay en pantalla (sin cuotas, sus campos
  // quedan vacíos; lo mismo con criptomonedas y "Otra").
  function datos() {
    const cuotas = marcado("p-cuotas");
    const sinInteres = cuotas && marcado("p-sin-interes");
    const pasarelas = $$('input[name="pasarela"]:checked', form).map((x) => x.value);
    return {
      pagos_medios: $$('input[name="medio"]:checked', form).map((x) => x.value),
      pagos_cuotas: cuotas,
      pagos_cuotas_max: cuotas ? entero("p-cuotas-max") : null,
      pagos_sin_interes: sinInteres,
      pagos_sin_interes_max: sinInteres ? entero("p-sin-interes-max") : null,
      pagos_cripto: marcado("p-cripto"),
      pagos_cripto_cuales: marcado("p-cripto") ? $("#p-cripto-cuales", form).value.trim() : "",
      pagos_pasarelas: pasarelas,
      pagos_pasarela_otra: pasarelas.includes("otra") ? $("#p-pasarela-otra", form).value.trim() : "",
      pagos_otras: otras.map((p) => p.trim()).filter(Boolean)
    };
  }

  function actualizar() {
    $("#caja-cuotas", form).hidden = !marcado("p-cuotas");
    $("#caja-sin-interes", form).hidden = !marcado("p-sin-interes");
    $("#caja-cripto", form).hidden = !marcado("p-cripto");
    $("#caja-otra", form).hidden = !$('input[name="pasarela"][value="otra"]', form).checked;
    // Vista previa: lo que todavía no es válido no se muestra.
    const d = datos();
    const valido = (n) => Number.isInteger(n) && n >= MIN_CUOTAS && n <= MAX_CUOTAS;
    const cuotas = d.pagos_cuotas && valido(d.pagos_cuotas_max);
    const sinInteres = cuotas && d.pagos_sin_interes && valido(d.pagos_sin_interes_max) && d.pagos_sin_interes_max <= d.pagos_cuotas_max;
    const vistaPrevia = frasesPagos({ ...d, pagos_cuotas: cuotas, pagos_sin_interes: sinInteres });
    $("#vista-pagos", form).innerHTML = vistaPrevia.length
      ? vistaPrevia.map((f) => `<li>${esc(f)}</li>`).join("")
      : `<li class="ayuda">${esc(tr("panel.pagos.vista.vacia"))}</li>`;
  }

  form.addEventListener("input", (e) => {
    ctx.sucio = true;
    if (e.target.dataset.pago) otras[Number(e.target.dataset.pago)] = e.target.value;
    actualizar();
  });
  form.addEventListener("change", () => { ctx.sucio = true; actualizar(); });
  $("#pagos-otras", form).addEventListener("click", (e) => {
    const quitar = e.target.closest("[data-quitar-pago]");
    const subir = e.target.closest("[data-subir]");
    if (quitar) { otras.splice(Number(quitar.dataset.quitarPago), 1); ctx.sucio = true; pintarOtras(); actualizar(); }
    if (subir) {
      const i = Number(subir.dataset.subir);
      [otras[i - 1], otras[i]] = [otras[i], otras[i - 1]];
      ctx.sucio = true; pintarOtras(); actualizar();
      $(`[data-subir="${i - 1}"]`, form)?.focus();
    }
  });
  $("#agregar-pago", form).addEventListener("click", () => { otras.push(""); pintarOtras(); $(`#pago-${otras.length - 1}`, form).focus(); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = datos();
    const fuera = (n) => !Number.isInteger(n) || n < MIN_CUOTAS || n > MAX_CUOTAS;
    marcarError(form, "p-cuotas-max", d.pagos_cuotas && fuera(d.pagos_cuotas_max) ? tr("panel.pagos.error.rango", { min: MIN_CUOTAS, max: MAX_CUOTAS }) : "");
    marcarError(form, "p-sin-interes-max", !d.pagos_sin_interes ? ""
      : fuera(d.pagos_sin_interes_max) ? tr("panel.pagos.error.rango", { min: MIN_CUOTAS, max: MAX_CUOTAS })
      : !fuera(d.pagos_cuotas_max) && d.pagos_sin_interes_max > d.pagos_cuotas_max ? tr("panel.pagos.sin_interes.tope") : "");
    marcarError(form, "p-pasarela-otra", d.pagos_pasarelas.includes("otra") && !d.pagos_pasarela_otra ? tr("panel.pagos.error.pasarela") : "");
    if (enfocarPrimerError(form)) return;
    const error = errorPagos(d);
    $("#pagos-error", form).textContent = error;
    if (error) return;
    try {
      await conBoton($("#guardar-pagos", form), () => api.guardarTienda(d));
    } catch { return; }
    otras = d.pagos_otras;
    ctx.sucio = false;
    pintarOtras();
    actualizar();
  });

  pintarOtras();
  actualizar();
}
