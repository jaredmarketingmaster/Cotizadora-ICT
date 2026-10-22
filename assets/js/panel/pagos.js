// =============================================================================
// Formas de pago (pestaña de Catálogo, 0013 y 0024): medios, cuotas,
// criptomonedas, pasarelas (primero las del país de la tienda, después las
// regionales; pasarelas.js), otras pasarelas con su nombre, descuentos
// informativos y "Otras formas de pago" (la lista libre que antes estaba en Mi
// tienda). Abajo, cómo se ve en el detalle del sitio (frasesPagos).
// =============================================================================

import { MEDIOS_PAGO, MIN_CUOTAS, MAX_CUOTAS, MAX_PASARELAS_OTRAS, MAX_DESCUENTO, errorPagos, frasesPagos, nombreMedioPago, nombrePasarela, clavesDescuento } from "../datos/comun.js";
import { gruposPasarelas } from "../datos/pasarelas.js";
import { datosPais } from "../datos/paises.js";
import { t as tr } from "../i18n/i18n.js";
import { $, $$, esc, conBoton, campoTexto, interruptor, marcarError, enfocarPrimerError } from "./ui.js";

export async function dibujar(vista, ctx) {
  const { api } = ctx;
  const t = await api.leerTienda();
  if (!vista.isConnected) return; // se cambió de pestaña o de sección mientras cargaba
  let otras = [...(t.pagos_otras || [])];
  let pasarelasOtras = [...(t.pagos_pasarelas_otras || [])];
  const descuentos = { ...(t.pagos_descuentos || {}) };
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
        ${gruposPasarelas(t.pais, t.pagos_pasarelas || []).map((g) => `<p class="ayuda" id="grupo-${g.grupo}">${esc(tr(`panel.pagos.pasarelas.${g.grupo}`, { pais: datosPais(t.pais).nombre }))}</p>
          ${chips("pasarela", g.claves.map((clave) => ({ clave })), t.pagos_pasarelas || [], nombrePasarela)}`).join("")}
        <p class="ayuda" id="t-pasarelas-otras">${esc(tr("panel.pagos.pasarelas.otras_ayuda", { max: MAX_PASARELAS_OTRAS }))}</p>
        <ul class="lista-editable" id="pasarelas-otras" aria-labelledby="t-pasarelas-otras"></ul>
        <button type="button" class="boton boton--secundario" id="agregar-pasarela">${esc(tr("panel.pagos.pasarelas.agregar"))}</button>
        <p class="error-campo" id="pasarelas-otras-error" role="alert"></p>
      </fieldset>

      <fieldset class="bloque bloque--grupo">
        <legend>${esc(tr("panel.pagos.descuentos.titulo"))}</legend>
        <p class="ayuda" id="descuentos-ayuda">${esc(tr("panel.pagos.descuentos.ayuda", { max: MAX_DESCUENTO }))}</p>
        <div class="grilla-2" id="descuentos"></div>
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

  function pintarPasarelasOtras() {
    $("#pasarelas-otras", form).innerHTML = pasarelasOtras.map((p, i) => `<li>
      <label class="oculto-visual" for="pasarela-otra-${i}">${esc(tr("panel.pagos.pasarelas.otra", { n: i + 1 }))}</label>
      <input class="entrada" id="pasarela-otra-${i}" data-pasarela-otra="${i}" value="${esc(p)}" maxlength="60">
      <button type="button" class="boton-icono" data-quitar-pasarela="${i}" aria-label="${esc(tr("panel.pagos.pasarelas.quitar", { n: i + 1 }))}">✕</button>
    </li>`).join("");
    $("#agregar-pasarela", form).disabled = pasarelasOtras.length >= MAX_PASARELAS_OTRAS;
  }

  // Un campo de descuento por cada forma de pago que la tienda acepta (lo que
  // se va desmarcando sale de la lista y de lo que se guarda).
  function pintarDescuentos() {
    const lista = clavesDescuento(datosSinDescuentos());
    $("#descuentos", form).innerHTML = lista.length
      ? lista.map((d, i) => campoTexto({ id: `dto-${i}`, etiqueta: tr("panel.pagos.descuentos.de", { forma: d.nombre }), valor: descuentos[d.clave] ?? "",
          atributos: `inputmode="numeric" maxlength="2" autocomplete="off" data-descuento="${esc(d.clave)}"` })).join("")
      : `<p class="ayuda">${esc(tr("panel.pagos.descuentos.vacio"))}</p>`;
  }

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
  function datosSinDescuentos() {
    const cuotas = marcado("p-cuotas");
    const sinInteres = cuotas && marcado("p-sin-interes");
    return {
      pagos_medios: $$('input[name="medio"]:checked', form).map((x) => x.value),
      pagos_cuotas: cuotas,
      pagos_cuotas_max: cuotas ? entero("p-cuotas-max") : null,
      pagos_sin_interes: sinInteres,
      pagos_sin_interes_max: sinInteres ? entero("p-sin-interes-max") : null,
      pagos_cripto: marcado("p-cripto"),
      pagos_cripto_cuales: marcado("p-cripto") ? $("#p-cripto-cuales", form).value.trim() : "",
      pagos_pasarelas: $$('input[name="pasarela"]:checked', form).map((x) => x.value),
      pagos_pasarelas_otras: pasarelasOtras.map((p) => p.trim()).filter(Boolean),
      pagos_otras: otras.map((p) => p.trim()).filter(Boolean)
    };
  }

  function datos() {
    const d = datosSinDescuentos();
    const validas = new Set(clavesDescuento(d).map((x) => x.clave));
    d.pagos_descuentos = Object.fromEntries(Object.entries(descuentos).filter(([k, v]) => validas.has(k) && v != null));
    return d;
  }

  function actualizar() {
    $("#caja-cuotas", form).hidden = !marcado("p-cuotas");
    $("#caja-sin-interes", form).hidden = !marcado("p-sin-interes");
    $("#caja-cripto", form).hidden = !marcado("p-cripto");
    // Vista previa: lo que todavía no es válido no se muestra.
    const d = datos();
    const valido = (n) => Number.isInteger(n) && n >= MIN_CUOTAS && n <= MAX_CUOTAS;
    const cuotas = d.pagos_cuotas && valido(d.pagos_cuotas_max);
    const sinInteres = cuotas && d.pagos_sin_interes && valido(d.pagos_sin_interes_max) && d.pagos_sin_interes_max <= d.pagos_cuotas_max;
    const dtos = Object.fromEntries(Object.entries(d.pagos_descuentos).filter(([, v]) => Number.isInteger(v) && v >= 1 && v <= MAX_DESCUENTO));
    const vistaPrevia = frasesPagos({ ...d, pagos_cuotas: cuotas, pagos_sin_interes: sinInteres, pagos_descuentos: dtos });
    $("#vista-pagos", form).innerHTML = vistaPrevia.length
      ? vistaPrevia.map((f) => `<li>${esc(f)}</li>`).join("")
      : `<li class="ayuda">${esc(tr("panel.pagos.vista.vacia"))}</li>`;
  }

  form.addEventListener("input", (e) => {
    ctx.sucio = true;
    if (e.target.dataset.pago) otras[Number(e.target.dataset.pago)] = e.target.value;
    if (e.target.dataset.pasarelaOtra) pasarelasOtras[Number(e.target.dataset.pasarelaOtra)] = e.target.value;
    if (e.target.dataset.descuento !== undefined) {
      const v = e.target.value.trim();
      descuentos[e.target.dataset.descuento] = /^\d+$/.test(v) ? Number(v) : (v ? NaN : null);
    }
    actualizar();
  });
  form.addEventListener("change", (e) => {
    ctx.sucio = true;
    if (e.target.name === "medio" || e.target.name === "pasarela" || e.target.id === "p-cripto") pintarDescuentos();
    actualizar();
  });
  // Al salir del nombre de otra pasarela, se rearman los descuentos (el nombre es su clave).
  form.addEventListener("focusout", (e) => { if (e.target.dataset.pasarelaOtra) pintarDescuentos(); });
  $("#pasarelas-otras", form).addEventListener("click", (e) => {
    const quitar = e.target.closest("[data-quitar-pasarela]");
    if (!quitar) return;
    pasarelasOtras.splice(Number(quitar.dataset.quitarPasarela), 1);
    ctx.sucio = true; pintarPasarelasOtras(); pintarDescuentos(); actualizar();
    $("#agregar-pasarela", form).focus();
  });
  $("#agregar-pasarela", form).addEventListener("click", () => {
    pasarelasOtras.push("");
    pintarPasarelasOtras();
    $(`#pasarela-otra-${pasarelasOtras.length - 1}`, form).focus();
  });
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
    clavesDescuento(d).forEach((x, i) => {
      const v = descuentos[x.clave];
      marcarError(form, `dto-${i}`, v != null && !(Number.isInteger(v) && v >= 1 && v <= MAX_DESCUENTO) ? tr("panel.pagos.error.descuento", { max: MAX_DESCUENTO }) : "");
    });
    if (enfocarPrimerError(form)) return;
    const error = errorPagos(d);
    $("#pagos-error", form).textContent = error;
    if (error) return;
    try {
      await conBoton($("#guardar-pagos", form), () => api.guardarTienda(d));
    } catch { return; }
    otras = d.pagos_otras;
    pasarelasOtras = d.pagos_pasarelas_otras;
    ctx.sucio = false;
    pintarOtras();
    pintarPasarelasOtras();
    pintarDescuentos();
    actualizar();
  });

  pintarOtras();
  pintarPasarelasOtras();
  pintarDescuentos();
  actualizar();
}
