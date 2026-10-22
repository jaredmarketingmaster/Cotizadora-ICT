// =============================================================================
// Envíos (pestaña de Catálogo, ronda 3, C2; 0023_envios.sql): retiro en el
// local, envío a domicilio (zonas o todo el país, costo y envío gratis con
// condición) y plazo de entrega. Abajo, cómo se ve en el detalle del sitio
// (frasesEnvio). Las reglas están en assets/js/datos/envios.js.
// =============================================================================

import { errorEnvios, frasesEnvio, MAX_ZONAS, MAX_ZONA, MAX_PLAZO } from "../datos/envios.js";
import { datosPais, formatearNumero } from "../datos/paises.js";
import { soloDigitos } from "../utils.js";
import { t as tr } from "../i18n/i18n.js";
import { $, $$, esc, conBoton, campoTexto, interruptor, marcarError, enfocarPrimerError } from "./ui.js";

export async function dibujar(vista, ctx) {
  const { api } = ctx;
  const t = await api.leerTienda();
  if (!vista.isConnected) return; // se cambió de pestaña o de sección mientras cargaba
  let zonas = [...(t.envio_zonas || [])];
  let costos = { ...(t.envio_costos_zona || {}) };
  let gratisZonas = new Set(t.envio_gratis_zonas || []);
  const moneda = datosPais(t.pais).moneda;
  const monto = (n) => (Number.isInteger(n) ? formatearNumero(n) : "");
  const campoMonto = (id, etiqueta, valor, ayuda = "") => campoTexto({ id, etiqueta: `${etiqueta} (${moneda})`, valor: monto(valor), ayuda, atributos: 'inputmode="numeric" maxlength="15" autocomplete="off"' });
  const radio = (nombre, valor, texto, marcado) => `<label class="casilla" for="${nombre}-${valor}"><input type="radio" name="${nombre}" id="${nombre}-${valor}" value="${valor}" ${marcado ? "checked" : ""}><span>${esc(texto)}</span></label>`;
  const local = [t.direccion, t.ciudad].map((x) => String(x || "").trim()).filter(Boolean).join(", ");

  vista.innerHTML = `
    <p>${esc(tr("panel.envios.intro"))}</p>
    <form id="form-envios" novalidate>
      <fieldset class="bloque bloque--grupo">
        <legend>${esc(tr("panel.envios.retiro.titulo"))}</legend>
        ${interruptor({ id: "e-retiro", etiqueta: tr("panel.envios.retiro.pregunta"), marcado: t.envio_retiro })}
        <p class="ayuda" id="e-retiro-ayuda">${local
          ? esc(tr("panel.envios.retiro.local", { local, horario: String(t.horario_texto || "").trim() || tr("panel.envios.retiro.sin_horario") }))
          : tr("panel.envios.retiro.sin_direccion", { enlace: `<a href="#/tienda">${esc(tr("panel.envios.mi_tienda"))}</a>` })}</p>
      </fieldset>

      <fieldset class="bloque bloque--grupo">
        <legend>${esc(tr("panel.envios.domicilio.titulo"))}</legend>
        ${interruptor({ id: "e-domicilio", etiqueta: tr("panel.envios.domicilio.pregunta"), marcado: t.envio_domicilio })}
        <div class="caja-pagos" id="caja-domicilio">
          <fieldset class="opciones-legales" id="e-cobertura">
            <legend>${esc(tr("panel.envios.cobertura"))}</legend>
            ${radio("e-cobertura", "pais", tr("panel.envios.cobertura.pais"), t.envio_todo_el_pais)}
            ${radio("e-cobertura", "zonas", tr("panel.envios.cobertura.zonas"), !t.envio_todo_el_pais)}
          </fieldset>
          <div id="caja-zonas">
            <p class="ayuda" id="e-zonas-ayuda">${esc(tr("panel.envios.zonas.ayuda", { max: MAX_ZONAS }))}</p>
            <ul class="lista-editable" id="e-zonas" aria-label="${esc(tr("panel.envios.zonas.lista"))}"></ul>
            <button type="button" class="boton boton--secundario" id="e-agregar-zona">${esc(tr("panel.envios.zonas.agregar"))}</button>
            <p class="error-campo" id="e-zonas-error" role="alert"></p>
          </div>
          <fieldset class="opciones-legales" id="e-costo">
            <legend>${esc(tr("panel.envios.costo"))}</legend>
            ${["gratis", "fijo", "zona", "al_recibir"].map((c) => radio("e-costo", c, tr(`panel.envios.costo.${c}`), t.envio_costo === c)).join("")}
            <p class="error-campo" id="e-costo-error" role="alert"></p>
          </fieldset>
          <div id="caja-fijo">${campoMonto("e-fijo", tr("panel.envios.costo.fijo_monto"), t.envio_costo_fijo)}</div>
          <div id="caja-por-zona">
            <p class="ayuda">${esc(tr("panel.envios.costo.zona_ayuda"))}</p>
            <div id="e-costos-zona"></div>
          </div>
          <div id="caja-gratis">
            ${interruptor({ id: "e-gratis", etiqueta: tr("panel.envios.gratis.pregunta"), marcado: t.envio_gratis })}
            <div class="caja-pagos" id="caja-gratis-datos">
              <p class="ayuda">${esc(tr("panel.envios.gratis.ayuda"))}</p>
              <div id="e-gratis-zonas"></div>
              ${campoMonto("e-gratis-minimo", tr("panel.envios.gratis.minimo"), t.envio_gratis_minimo, esc(tr("panel.envios.gratis.minimo_ayuda")))}
              <p class="error-campo" id="e-gratis-error" role="alert"></p>
            </div>
          </div>
        </div>
      </fieldset>

      <fieldset class="bloque bloque--grupo">
        <legend>${esc(tr("panel.envios.plazo.titulo"))}</legend>
        <p class="ayuda">${esc(tr("panel.envios.plazo.ayuda", { max: MAX_PLAZO }))}</p>
        <div class="grilla-2">
          ${campoTexto({ id: "e-plazo-desde", etiqueta: tr("panel.envios.plazo.desde"), valor: t.envio_plazo_desde ?? "", atributos: 'inputmode="numeric" maxlength="2" autocomplete="off"' })}
          ${campoTexto({ id: "e-plazo-hasta", etiqueta: tr("panel.envios.plazo.hasta"), valor: t.envio_plazo_hasta ?? "", atributos: 'inputmode="numeric" maxlength="2" autocomplete="off"' })}
        </div>
      </fieldset>

      <section class="bloque" aria-labelledby="t-vista-envios">
        <h2 id="t-vista-envios">${esc(tr("panel.envios.vista.titulo"))}</h2>
        <ul class="vista-pagos" id="vista-envios"></ul>
      </section>

      <p class="error-campo" id="envios-error" role="alert"></p>
      <div class="acciones-formulario"><button type="submit" class="boton boton--primario" id="guardar-envios">${esc(tr("panel.envios.guardar"))}</button></div>
    </form>`;

  const form = $("#form-envios", vista);
  const marcado = (id) => $(`#${id}`, form).checked;
  const elegido = (nombre) => $(`input[name="${nombre}"]:checked`, form)?.value || "";
  const numero = (id) => {
    const v = soloDigitos($(`#${id}`, form)?.value || "");
    return v ? Number(v) : null;
  };
  const zonasLimpias = () => zonas.map((z) => z.trim()).filter(Boolean);

  function pintarZonas() {
    $("#e-zonas", form).innerHTML = zonas.map((z, i) => `<li>
      <label class="oculto-visual" for="zona-${i}">${esc(tr("panel.envios.zonas.zona", { n: i + 1 }))}</label>
      <input class="entrada" id="zona-${i}" data-zona="${i}" value="${esc(z)}" maxlength="${MAX_ZONA}">
      <button type="button" class="boton-icono" data-quitar-zona="${i}" aria-label="${esc(tr("panel.envios.zonas.quitar", { n: i + 1 }))}">✕</button>
    </li>`).join("");
    $("#e-agregar-zona", form).disabled = zonas.length >= MAX_ZONAS;
    pintarDependientes();
  }

  // La tabla de costos por zona y las casillas de envío gratis siguen la lista de zonas.
  function pintarDependientes() {
    const lista = zonasLimpias();
    $("#e-costos-zona", form).innerHTML = lista.map((z, i) => campoTexto({
      id: `costo-zona-${i}`, etiqueta: tr("panel.envios.costo.de_zona", { zona: z, moneda }),
      valor: monto(costos[z]), atributos: `inputmode="numeric" maxlength="15" autocomplete="off" data-costo-zona="${esc(z)}"`
    })).join("") || `<p class="ayuda">${esc(tr("panel.envios.zonas.vacia"))}</p>`;
    $("#e-gratis-zonas", form).innerHTML = lista.length && elegido("e-cobertura") === "zonas"
      ? `<fieldset class="opciones-legales"><legend>${esc(tr("panel.envios.gratis.zonas"))}</legend>${lista.map((z, i) => `<label class="casilla" for="gz-${i}"><input type="checkbox" id="gz-${i}" data-gratis-zona="${esc(z)}" ${gratisZonas.has(z) ? "checked" : ""}><span>${esc(z)}</span></label>`).join("")}</fieldset>`
      : "";
  }

  // Lo que se guardaría (sin envío a domicilio, sus datos quedan vacíos; lo
  // mismo con lo que no corresponde al costo elegido).
  function datos() {
    const domicilio = marcado("e-domicilio");
    const todo = domicilio && elegido("e-cobertura") === "pais";
    const lista = domicilio && !todo ? zonasLimpias() : [];
    const costo = domicilio ? elegido("e-costo") : "";
    const gratis = domicilio && costo !== "gratis" && marcado("e-gratis");
    return {
      envio_retiro: marcado("e-retiro"),
      envio_domicilio: domicilio,
      envio_todo_el_pais: todo,
      envio_zonas: lista,
      envio_costo: costo,
      envio_costo_fijo: costo === "fijo" ? numero("e-fijo") : null,
      envio_costos_zona: costo === "zona" ? Object.fromEntries(lista.map((z) => [z, Number.isInteger(costos[z]) ? costos[z] : null])) : {},
      envio_gratis: gratis,
      envio_gratis_zonas: gratis ? lista.filter((z) => gratisZonas.has(z)) : [],
      envio_gratis_minimo: gratis ? numero("e-gratis-minimo") : null,
      envio_plazo_desde: numero("e-plazo-desde"),
      envio_plazo_hasta: numero("e-plazo-hasta")
    };
  }

  function actualizar() {
    const domicilio = marcado("e-domicilio");
    const costo = elegido("e-costo");
    $("#caja-domicilio", form).hidden = !domicilio;
    $("#caja-zonas", form).hidden = elegido("e-cobertura") !== "zonas";
    $("#caja-fijo", form).hidden = costo !== "fijo";
    $("#caja-por-zona", form).hidden = costo !== "zona";
    $("#caja-gratis", form).hidden = costo === "gratis";
    $("#caja-gratis-datos", form).hidden = !marcado("e-gratis");
    // Vista previa: lo que todavía no es válido no se muestra.
    const d = datos();
    const vistaPrevia = frasesEnvio(errorEnvios(d) ? { ...d, envio_gratis: false, envio_plazo_desde: null, envio_plazo_hasta: null } : d);
    $("#vista-envios", form).innerHTML = vistaPrevia.length
      ? vistaPrevia.map((f) => `<li>${esc(f)}</li>`).join("")
      : `<li class="ayuda">${esc(tr("panel.envios.vista.vacia"))}</li>`;
  }

  form.addEventListener("input", (e) => {
    ctx.sucio = true;
    if (e.target.dataset.zona) {
      const viejo = zonas[Number(e.target.dataset.zona)].trim();
      const nuevo = e.target.value.trim();
      zonas[Number(e.target.dataset.zona)] = e.target.value;
      if (viejo !== nuevo) {
        if (viejo in costos) { costos[nuevo] = costos[viejo]; delete costos[viejo]; }
        if (gratisZonas.delete(viejo)) gratisZonas.add(nuevo);
      }
    }
    if (e.target.dataset.costoZona !== undefined) {
      const v = soloDigitos(e.target.value);
      costos[e.target.dataset.costoZona] = v ? Number(v) : null;
    }
    actualizar();
  });
  // Al salir de una zona, se rearma lo que depende de la lista.
  form.addEventListener("focusout", (e) => { if (e.target.dataset.zona) pintarDependientes(); });
  form.addEventListener("change", (e) => {
    ctx.sucio = true;
    if (e.target.dataset.gratisZona !== undefined) {
      if (e.target.checked) gratisZonas.add(e.target.dataset.gratisZona); else gratisZonas.delete(e.target.dataset.gratisZona);
    }
    if (e.target.name === "e-cobertura") pintarDependientes();
    actualizar();
  });
  $("#e-zonas", form).addEventListener("click", (e) => {
    const quitar = e.target.closest("[data-quitar-zona]");
    if (!quitar) return;
    const [z] = zonas.splice(Number(quitar.dataset.quitarZona), 1);
    delete costos[z.trim()];
    gratisZonas.delete(z.trim());
    ctx.sucio = true;
    pintarZonas();
    actualizar();
    $("#e-agregar-zona", form).focus();
  });
  $("#e-agregar-zona", form).addEventListener("click", () => {
    zonas.push("");
    pintarZonas();
    $(`#zona-${zonas.length - 1}`, form).focus();
  });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const d = datos();
    const zonasMal = d.envio_domicilio && !d.envio_todo_el_pais && !d.envio_zonas.length;
    $("#e-zonas-error", form).textContent = zonasMal ? tr("panel.envios.error.zonas") : "";
    $("#e-costo-error", form).textContent = d.envio_domicilio && !d.envio_costo ? tr("panel.envios.error.costo") : "";
    marcarError(form, "e-fijo", d.envio_costo === "fijo" && !(d.envio_costo_fijo > 0) ? tr("panel.envios.error.fijo") : "");
    d.envio_zonas.forEach((z, i) => marcarError(form, `costo-zona-${i}`, d.envio_costo === "zona" && !Number.isInteger(d.envio_costos_zona[z]) ? tr("panel.envios.error.costo_zona") : ""));
    const plazoMal = (d.envio_plazo_desde != null || d.envio_plazo_hasta != null) && errorEnvios({ ...d, envio_retiro: false, envio_domicilio: false, envio_todo_el_pais: false, envio_zonas: [], envio_costo: "", envio_costo_fijo: null, envio_costos_zona: {}, envio_gratis: false, envio_gratis_zonas: [], envio_gratis_minimo: null });
    marcarError(form, "e-plazo-hasta", plazoMal || "");
    if (zonasMal || (d.envio_domicilio && !d.envio_costo)) {
      $(zonasMal ? "#e-agregar-zona" : 'input[name="e-costo"]', form).focus();
      return;
    }
    if (enfocarPrimerError(form)) return;
    const error = errorEnvios(d);
    $("#envios-error", form).textContent = error;
    if (error) return;
    try {
      await conBoton($("#guardar-envios", form), () => api.guardarTienda(d));
    } catch { return; }
    zonas = [...d.envio_zonas];
    ctx.sucio = false;
    pintarZonas();
    actualizar();
  });

  if (!zonas.length) zonas.push("");
  pintarZonas();
  actualizar();
}
