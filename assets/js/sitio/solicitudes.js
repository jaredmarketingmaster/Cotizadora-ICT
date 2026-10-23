// =============================================================================
// Página /solicitudes/: peticiones, quejas y reclamos con código de radicado
// (Colombia, legal/FUENTES.md, fuente 17). Los tipos salen de SOLICITUDES
// (paises.js) según el país de la tienda; los demás países no la ofrecen
// (Argentina tuvo el botón de arrepentimiento hasta 0041).
// - Los datos van SOLO a GHL por enviar-lead (api.enviarLead), como el pop-up:
//   nunca a Supabase ni al píxel. Esta página no carga herramientas de
//   medición.
// - El radicado es un código SOL-XXXX (generarCodigo("SOL")) que se muestra al
//   cliente y viaja en codigo_cotizacion.
// - Sin textos legales publicados (0016) la página no envía: dice "Página en
//   preparación.", como las páginas legales.
// =============================================================================
import { api as obtenerApi } from "../datos/api.js";
import { aplicarTema } from "../tema.js";
import { logoGenericoSVG } from "../ilustracion.js";
import { escaparHTML, soloDigitos, correoValido, generarCodigo, codigoValido } from "../utils.js";
import { iniciarConsentimiento, estado as estadoCookies } from "./consentimiento.js";
import { fijarPais, paisActual, datosPais, celularNacionalValido, celularInternacional, fechaConZona, SOLICITUDES } from "../datos/paises.js";
import { ERRORES, formatearConCursor, pideTransferencia, htmlTransferencia, enlaceConsumidorEnPie } from "./campos.js";
import { cargarIdioma, idiomaGuardado, traducirDom, idiomaActual, t } from "../i18n/i18n.js";

const caja = document.getElementById("solicitudes");
const OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

await cargarIdioma(idiomaGuardado()).catch(() => {});
traducirDom();
try {
  const api = await obtenerApi();
  const { tienda } = await api.cargarPublico();
  fijarPais(tienda.pais);
  if ((tienda.idioma || "es") !== idiomaActual()) { await cargarIdioma(tienda.idioma); traducirDom(); }
  aplicarTema(tienda);
  const logo = tienda.logo ? api.urlArchivo("marca", tienda.logo) : "";
  document.getElementById("marca-logo").innerHTML = logo ? `<img src="${escaparHTML(logo)}" alt="" width="160" height="40">` : logoGenericoSVG();
  document.getElementById("marca-nombre").textContent = tienda.nombre || "";
  const tipos = SOLICITUDES[tienda.pais] || [];
  if (tipos.length) {
    const titulo = t(`solicitudes.titulo.${tienda.pais}`);
    document.getElementById("solicitudes-titulo").textContent = titulo;
    document.title = titulo;
  }
  if (!tipos.length) caja.innerHTML = `<p>${t("solicitudes.no_disponible")}</p>`;
  else if (!tienda.legal_publicado?.version) caja.innerHTML = `<p>${t("legalpag.en_preparacion")}</p>`;
  else dibujarFormulario(api, tienda, tipos);
  enlaceConsumidorEnPie(tienda);
  iniciarConsentimiento({ tienda, cargar: false, preguntar: false, rutaCookies: "../cookies/" });
} catch {
  caja.innerHTML = `<p>${t("legalpag.error")}</p>`;
}
caja.removeAttribute("aria-busy");

function dibujarFormulario(api, tienda, tipos) {
  const cel = datosPais(paisActual()).celular;
  caja.innerHTML = `
    <p>${t("solicitudes.intro")}</p>
    <form class="popup-form solicitudes-form" id="form-solicitud" name="solicitud" action="#" method="post" novalidate data-clarity-mask="true">
      <fieldset class="campo" id="s-tipo" aria-describedby="s-tipo-error">
        <legend class="etiqueta">${t("solicitudes.tipo")}</legend>
        ${tipos.map((x) => `<label class="casilla"><input type="radio" name="tipo" value="${x}" ${tipos.length === 1 ? "checked" : ""}><span>${t(`solicitudes.tipo.${x}`)}</span></label>`).join("")}
        <p class="error-campo" id="s-tipo-error"></p>
      </fieldset>
      <div class="campo">
        <label for="s-nombre">${t("popup.nombre")}</label>
        <input class="entrada" id="s-nombre" name="name" type="text" autocomplete="name" required aria-describedby="s-nombre-error" maxlength="80">
        <p class="error-campo" id="s-nombre-error"></p>
      </div>
      <div class="campo">
        <label for="s-correo">${t("popup.correo")}</label>
        <input class="entrada" id="s-correo" name="email" type="email" autocomplete="email" inputmode="email" required aria-describedby="s-correo-error" maxlength="120">
        <p class="error-campo" id="s-correo-error"></p>
      </div>
      <div class="campo">
        <label for="s-telefono">${t("popup.whatsapp")}</label>
        <div class="telefono">
          <span class="prefijo" aria-hidden="true">${escaparHTML(cel.visible)}</span>
          <input class="entrada cifras" id="s-telefono" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="${escaparHTML(cel.ejemplo || "")}" required aria-describedby="s-telefono-prefijo s-telefono-error" maxlength="18">
        </div>
        <span class="oculto-visual" id="s-telefono-prefijo">${t("popup.telefono.prefijo", { pais: escaparHTML(datosPais(paisActual()).nombre), prefijo: escaparHTML(cel.visible) })}</span>
        <p class="error-campo" id="s-telefono-error"></p>
      </div>
      <div class="campo">
        <label for="s-cotizacion">${t("solicitudes.cotizacion")}</label>
        <p class="ayuda" id="s-cotizacion-ayuda">${t("solicitudes.cotizacion.ayuda")}</p>
        <input class="entrada cifras" id="s-cotizacion" name="cotizacion_relacionada" type="text" autocomplete="off" aria-describedby="s-cotizacion-ayuda s-cotizacion-error" maxlength="8">
        <p class="error-campo" id="s-cotizacion-error"></p>
      </div>
      <div class="campo">
        <label for="s-detalle">${t("solicitudes.detalle")}</label>
        <p class="ayuda" id="s-detalle-ayuda">${t("solicitudes.detalle.ayuda")}</p>
        <textarea class="entrada" id="s-detalle" name="detalle" required aria-describedby="s-detalle-ayuda s-detalle-error" maxlength="1000"></textarea>
        <p class="error-campo" id="s-detalle-error"></p>
      </div>
      <div class="oculto-visual" aria-hidden="true">
        <label for="s-sitio">${t("popup.trampa")}</label>
        <input id="s-sitio" name="sitio_web" type="text" tabindex="-1" autocomplete="off">
      </div>
      <div class="campo">
        <label class="casilla" for="s-autorizacion">
          <input id="s-autorizacion" name="autorizacion_datos" type="checkbox" required aria-describedby="s-autorizacion-error">
          <span>${t("solicitudes.autorizacion", { enlace: `<a href="../privacidad/" target="_blank" rel="noopener">${t("popup.autorizacion.enlace")}</a>` })}</span>
        </label>
        <p class="error-campo" id="s-autorizacion-error"></p>
      </div>
      ${pideTransferencia(tienda) ? htmlTransferencia("s") : ""}
      <div class="popup-alerta" data-alerta role="alert" hidden></div>
      <button type="submit" class="boton boton--primario boton--grande boton--bloque" data-enviar>${t("solicitudes.enviar")}</button>
    </form>`;

  const form = caja.querySelector("form");
  const tel = form.querySelector("#s-telefono");
  tel.addEventListener("input", () => formatearConCursor(tel));
  let codigo = "";

  function validar(id) {
    const el = form.querySelector(`#${id}`);
    let error = "";
    if (id === "s-tipo" && !form.querySelector("input[name=tipo]:checked")) error = t("solicitudes.error.tipo");
    if (id === "s-nombre" && el.value.trim().length < 2) error = ERRORES.nombre();
    if (id === "s-correo" && !correoValido(el.value)) error = ERRORES.correo();
    if (id === "s-telefono" && !celularNacionalValido(soloDigitos(el.value), paisActual())) error = ERRORES.telefono();
    if (id === "s-cotizacion" && el.value.trim() && !codigoValido(el.value.trim().toUpperCase())) error = t("solicitudes.error.cotizacion");
    if (id === "s-detalle" && el.value.trim().length < 10) error = t("solicitudes.error.detalle");
    if (id === "s-autorizacion" && !el.checked) error = ERRORES.autorizacion();
    if (id === "s-transferencia" && !el.checked) error = ERRORES.transferencia();
    if (id !== "s-tipo") el.setAttribute("aria-invalid", String(Boolean(error)));
    form.querySelector(`#${id}-error`).textContent = error;
    return !error;
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const ids = ["s-tipo", "s-nombre", "s-correo", "s-telefono", "s-cotizacion", "s-detalle", "s-autorizacion", ...(form.querySelector("#s-transferencia") ? ["s-transferencia"] : [])];
    const malos = ids.filter((id) => !validar(id));
    if (malos.length) {
      const primero = form.querySelector(`#${malos[0]}`);
      (primero.matches("fieldset") ? primero.querySelector("input") : primero).focus();
      return;
    }
    if (form.querySelector("#s-sitio").value) return; // trampa para bots
    const boton = form.querySelector("[data-enviar]");
    const alerta = form.querySelector("[data-alerta]");
    if (boton.disabled) return;
    if (!codigo) codigo = generarCodigo("SOL");
    const cookies = estadoCookies();
    const datos = {
      nombre: form.querySelector("#s-nombre").value.trim().replace(/\s+/g, " "),
      correo: form.querySelector("#s-correo").value.trim(),
      telefono: "+" + celularInternacional(soloDigitos(tel.value), paisActual()),
      tipo_consulta: form.querySelector("input[name=tipo]:checked").value,
      codigo_cotizacion: codigo,
      detalle: form.querySelector("#s-detalle").value.trim(),
      cotizacion_relacionada: form.querySelector("#s-cotizacion").value.trim().toUpperCase(),
      consentimiento_datos: true,
      consentimiento_transferencia: Boolean(form.querySelector("#s-transferencia")?.checked),
      consentimiento_promociones: false,
      consentimiento_medicion: cookies.medicion,
      consentimiento_publicidad: cookies.publicidad,
      version_politica: tienda.legal_publicado.version,
      fecha_consentimiento: fechaConZona(),
      pagina: location.origin + location.pathname,
      enviado_en: new Date().toISOString()
    };
    boton.disabled = true;
    boton.textContent = t("solicitudes.enviando");
    alerta.hidden = true;
    const r = await api.enviarLead(datos);
    if (!r.ok) {
      boton.disabled = false;
      boton.textContent = t("solicitudes.enviar");
      alerta.textContent = t("solicitudes.error.envio");
      alerta.hidden = false;
      return;
    }
    caja.innerHTML = `
      <div class="popup-estado">
        <span class="sello-ok">${OK}</span>
        <h2 class="popup-titulo" id="solicitud-lista" tabindex="-1">${t("solicitudes.listo")}</h2>
        <p class="cifras">${t("solicitudes.listo.codigo", { codigo: `<span class="codigo">${escaparHTML(codigo)}</span>` })}</p>
        <p>${t("solicitudes.listo.respuesta")}</p>
      </div>`;
    caja.querySelector("#solicitud-lista").focus();
  });
}
