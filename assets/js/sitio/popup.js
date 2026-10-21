// =============================================================================
// Pop-up "Antes de pasar a WhatsApp".
// Orden al enviar: a) código de cotización, b) envío a GHL y espera de la
// confirmación, c) evento Lead, d) WhatsApp con el mensaje escrito.
// El formulario es un <form> real con campos con nombre (también los ocultos),
// para que el script de seguimiento externo de GHL, si se instala, lo reconozca.
// Legales (0016): arriba de las casillas va el aviso corto publicado; la
// casilla de datos es obligatoria y la de promociones, opcional (las dos sin
// marcar). Sin textos legales publicados no se envía nada. Los campos y el
// resumen llevan data-clarity-mask para que Clarity no los grabe.
// =============================================================================

import {
  escaparHTML, formatearPrecio, soloDigitos, correoValido, generarCodigo, formatoBasico
} from "../utils.js";
import { datosPais, paisActual, celularNacionalValido, celularInternacional, agruparCelular, whatsappValido, fechaConZona } from "../datos/paises.js";
import { textoAlternativo, textoCondicion, mensajeCompra, mensajeSinStock, enlaceWhatsApp } from "./catalogo.js";
import { leerAtribucion, CLAVES_ATRIBUCION } from "./atribucion.js";
import { evento, parametrosEquipo } from "./pixel.js";
import { htmlMedio } from "./fotos.js";
import { ICONO_WA } from "./detalle.js";
import { cerrarConTransicion, cerrarConEscape } from "./transiciones.js";
import { estado as estadoCookies, permitido } from "./consentimiento.js";

const CERRAR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/></svg>';
const OK = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/></svg>';

const ERRORES = {
  nombre: "Escriba su nombre.",
  correo: "Revise su correo.",
  // Colombia: texto literal del prompt. Los demás países, con su prefijo.
  telefono: () => (paisActual() === "co"
    ? "Escriba un celular de 10 dígitos que empiece por 3, sin el +57."
    : `Revise su celular: escríbalo sin el ${datosPais(paisActual()).celular.visible}${datosPais(paisActual()).celular.ejemplo ? `, como ${datosPais(paisActual()).celular.ejemplo}` : ""}.`),
  autorizacion: "Para continuar, acepte la autorización de datos."
};

const OCULTOS = ["modelo", "condicion", "capacidad", "color", "precio_cotizado", "equipo_id", "tipo_consulta", "codigo_cotizacion", ...CLAVES_ATRIBUCION];

// Mantiene el cursor en el mismo dígito al reformatear "300 123 4567".
function formatearConCursor(input) {
  const pos = input.selectionStart ?? input.value.length;
  const digitosAntes = soloDigitos(input.value.slice(0, pos)).length;
  input.value = agruparCelular(input.value, paisActual());
  let n = 0;
  let nueva = input.value.length;
  for (let i = 0; i < input.value.length; i++) {
    if (n === digitosAntes) { nueva = i; break; }
    if (/\d/.test(input.value[i])) n++;
  }
  if (document.activeElement === input) input.setSelectionRange(nueva, nueva);
}

export function crearPopup({ dialogo, api, obtenerTienda }) {
  let contexto = null;
  let codigo = "";
  let intentos = 0;
  let datos = null;
  let enlace = "";

  function resumenHTML() {
    if (contexto.tipo === "compra") {
      const q = contexto.equipo;
      return `<div class="resumen" data-clarity-mask="true">
        <span class="resumen-medio">${htmlMedio(api, q, textoAlternativo(q), { sizes: "64px" })}</span>
        <div>
          <p class="resumen-nombre">${escaparHTML(q.modelo.nombre)} · ${textoCondicion(q.condicion)}</p>
          <p class="resumen-sub cifras">${[q.capacidad, q.color_nombre].filter(Boolean).map(escaparHTML).join(" · ")}</p>
          <p class="resumen-precio cifras">${formatearPrecio(q.precio)}${q.es_demo ? ' <span class="etiqueta-demo">DEMO</span>' : ""}</p>
        </div>
      </div>`;
    }
    return `<div class="resumen" data-clarity-mask="true"><span class="resumen-medio">${htmlMedio(api, { color_hex: "#8E8E93" }, "")}</span>
      <div><p class="resumen-nombre">Consulta: ${escaparHTML(contexto.busqueda)}</p></div></div>`;
  }

  function dibujarFormulario() {
    const tienda = obtenerTienda();
    if (!tienda.legal_publicado) { dibujarSinLegales(); return; }
    const pais = datosPais(paisActual());
    const cel = pais.celular;
    dialogo.innerHTML = `
      <div class="popup-contenido">
        <div class="popup-cabecera">
          <div>
            <h2 class="popup-titulo" id="popup-titulo">Antes de pasar a WhatsApp</h2>
            <p class="popup-texto">Así sabemos que usted es una persona y no un bot.</p>
          </div>
          <button type="button" class="boton-icono" data-cerrar aria-label="Cerrar">${CERRAR}</button>
        </div>
        ${resumenHTML()}
        ${whatsappValido(tienda.whatsapp, tienda.pais) ? "" : '<p class="popup-alerta" role="alert">Esta tienda todavía no tiene WhatsApp configurado.</p>'}
        <form class="popup-form" id="form-cotizacion" name="cotizadora-ict" action="#" method="post" novalidate data-clarity-mask="true">
          <div class="campo">
            <label for="p-nombre">Su nombre</label>
            <input class="entrada" id="p-nombre" name="name" type="text" autocomplete="name" required aria-describedby="p-nombre-error" maxlength="80">
            <p class="error-campo" id="p-nombre-error"></p>
          </div>
          <div class="campo">
            <label for="p-correo">Su correo</label>
            <input class="entrada" id="p-correo" name="email" type="email" autocomplete="email" inputmode="email" required aria-describedby="p-correo-error" maxlength="120">
            <p class="error-campo" id="p-correo-error"></p>
          </div>
          <div class="campo">
            <label for="p-telefono">Su WhatsApp</label>
            <div class="telefono">
              <span class="prefijo" aria-hidden="true">${escaparHTML(cel.visible)}</span>
              <input class="entrada cifras" id="p-telefono" type="tel" inputmode="numeric" autocomplete="tel-national" placeholder="${escaparHTML(cel.ejemplo)}" required aria-describedby="p-telefono-prefijo p-telefono-error" maxlength="18">
            </div>
            <span class="oculto-visual" id="p-telefono-prefijo">Número de ${escaparHTML(pais.nombre)}, con el prefijo ${escaparHTML(cel.visible)} ya puesto.</span>
            <p class="error-campo" id="p-telefono-error"></p>
          </div>
          <input type="hidden" name="phone" value="">
          ${OCULTOS.map((n) => `<input type="hidden" name="${n}" value="">`).join("")}
          <div class="oculto-visual" aria-hidden="true">
            <label for="p-sitio">No llene este campo</label>
            <input id="p-sitio" name="sitio_web" type="text" tabindex="-1" autocomplete="off">
          </div>
          <div class="popup-aviso-legal" id="p-aviso">${formatoBasico(tienda.legal_publicado.documentos.aviso)}</div>
          <div class="campo">
            <label class="casilla" for="p-autorizacion">
              <input id="p-autorizacion" name="autorizacion_datos" type="checkbox" required aria-describedby="p-autorizacion-error">
              <span>Soy mayor de 18 años y autorizo el tratamiento de mis datos para recibir mi cotización y ser contactado sobre ella por WhatsApp y correo, según la <a href="privacidad/" target="_blank" rel="noopener">Política de privacidad</a>.</span>
            </label>
            <p class="error-campo" id="p-autorizacion-error"></p>
          </div>
          <div class="campo">
            <label class="casilla" for="p-promociones">
              <input id="p-promociones" name="promociones" type="checkbox">
              <span>Quiero recibir promociones y novedades de ${escaparHTML(tienda.nombre || "la tienda")} por WhatsApp y correo.</span>
            </label>
          </div>
          <div class="popup-alerta" data-alerta role="alert" hidden></div>
          <button type="button" class="boton boton--primario boton--grande boton--bloque" data-enviar>${ICONO_WA}Continuar a WhatsApp</button>
          <a class="boton boton--secundario boton--grande boton--bloque" data-wa-respaldo hidden target="_blank" rel="noopener">${ICONO_WA}Abrir WhatsApp</a>
          <p class="nota-pequena">Se abrirá WhatsApp con su pedido escrito. Solo toque Enviar.</p>
        </form>
      </div>`;

    const form = dialogo.querySelector("form");
    // Los enlaces del aviso se abren aparte, para no perder lo escrito.
    form.querySelectorAll("#p-aviso a").forEach((a) => { a.target = "_blank"; a.rel = "noopener"; });
    const tel = form.querySelector("#p-telefono");
    tel.addEventListener("input", () => formatearConCursor(tel));
    form.querySelectorAll(".entrada, #p-autorizacion").forEach((el) => {
      el.addEventListener("blur", () => { if (el.value || el.type === "checkbox") validarCampo(el.id); });
      el.addEventListener("input", () => { if (el.getAttribute("aria-invalid") === "true") validarCampo(el.id); });
      el.addEventListener("change", () => { if (el.type === "checkbox") validarCampo(el.id); });
    });
    // Enter en un campo envía (el botón es type="button" para que el evento
    // submit solo ocurra con los datos ya validados).
    form.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && e.target.matches("input:not([type=checkbox])")) { e.preventDefault(); intentarEnviar(); }
    });
    form.querySelector("[data-enviar]").addEventListener("click", intentarEnviar);
    form.addEventListener("submit", (e) => { e.preventDefault(); enviar(); });
  }

  // Sin textos legales publicados (0016) el pop-up no pide datos ni envía.
  function dibujarSinLegales() {
    dialogo.innerHTML = `
      <div class="popup-contenido">
        <div class="popup-cabecera">
          <div><h2 class="popup-titulo" id="popup-titulo" tabindex="-1">Antes de pasar a WhatsApp</h2></div>
          <button type="button" class="boton-icono" data-cerrar aria-label="Cerrar">${CERRAR}</button>
        </div>
        <p class="popup-alerta" role="alert">Esta tienda todavía no completó su información legal.</p>
      </div>`;
  }

  function validarCampo(id) {
    const f = dialogo.querySelector("form");
    const el = f.querySelector(`#${id}`);
    let error = "";
    if (id === "p-nombre" && el.value.trim().length < 2) error = ERRORES.nombre;
    if (id === "p-correo" && !correoValido(el.value)) error = ERRORES.correo;
    if (id === "p-telefono" && !celularNacionalValido(soloDigitos(el.value), paisActual())) error = ERRORES.telefono();
    if (id === "p-autorizacion" && !el.checked) error = ERRORES.autorizacion;
    el.setAttribute("aria-invalid", String(Boolean(error)));
    f.querySelector(`#${id}-error`).textContent = error;
    return !error;
  }

  function intentarEnviar() {
    const f = dialogo.querySelector("form");
    const ids = ["p-nombre", "p-correo", "p-telefono", "p-autorizacion"];
    const malos = ids.filter((id) => !validarCampo(id));
    if (malos.length) { f.querySelector(`#${malos[0]}`).focus(); return; }
    if (f.querySelector("#p-sitio").value) return; // trampa para bots
    // Dispara un evento submit real (lo ve el script de GHL si está).
    if (typeof f.requestSubmit === "function") f.requestSubmit();
    else enviar();
  }

  function armarDatos() {
    const f = dialogo.querySelector("form");
    const nombre = f.querySelector("#p-nombre").value.trim().replace(/\s+/g, " ");
    const correo = f.querySelector("#p-correo").value.trim();
    const telefono = "+" + celularInternacional(soloDigitos(f.querySelector("#p-telefono").value), paisActual());
    const atrib = leerAtribucion();
    const compra = contexto.tipo === "compra";
    const q = contexto.equipo;
    const filtros = contexto.filtros || {};
    const cookies = estadoCookies();
    return {
      nombre, correo, telefono,
      modelo: compra ? q.modelo.nombre : contexto.nombreModelo || "",
      condicion: compra ? textoCondicion(q.condicion) : (filtros.condicion ? textoCondicion(filtros.condicion) : ""),
      capacidad: compra ? q.capacidad : filtros.capacidad || "",
      color: compra ? q.color_nombre : "",
      precio_cotizado: compra ? q.precio : "",
      equipo_id: compra ? q.id : "",
      tipo_consulta: compra ? "compra" : "sin stock",
      codigo_cotizacion: codigo,
      ...atrib,
      event_id: codigo,
      // Consentimiento (0016): la casilla obligatoria, la opcional, el banner
      // de cookies y la versión de los textos que aceptó.
      consentimiento_datos: f.querySelector("#p-autorizacion").checked,
      consentimiento_promociones: f.querySelector("#p-promociones").checked,
      consentimiento_medicion: cookies.medicion,
      consentimiento_publicidad: cookies.publicidad,
      version_politica: obtenerTienda().legal_publicado.version,
      fecha_consentimiento: fechaConZona(),
      pagina: location.origin + location.pathname,
      enviado_en: new Date().toISOString()
    };
  }

  function copiarAlFormulario(d) {
    const f = dialogo.querySelector("form");
    f.elements.phone.value = d.telefono;
    for (const n of OCULTOS) f.elements[n].value = d[n] ?? "";
  }

  function mensaje(d) {
    return contexto.tipo === "compra"
      ? mensajeCompra(contexto.equipo, codigo, d.nombre)
      : mensajeSinStock(contexto.busqueda, codigo, d.nombre);
  }

  async function enviar() {
    const f = dialogo.querySelector("form");
    const boton = f.querySelector("[data-enviar]");
    const alerta = f.querySelector("[data-alerta]");
    if (boton.disabled) return;
    if (!codigo) codigo = generarCodigo();
    datos = armarDatos();
    copiarAlFormulario(datos);
    const tienda = obtenerTienda();
    enlace = whatsappValido(tienda.whatsapp, tienda.pais) ? enlaceWhatsApp(tienda.whatsapp, mensaje(datos)) : "";

    boton.disabled = true;
    boton.innerHTML = '<span class="spinner" aria-hidden="true"></span>Enviando…';
    alerta.hidden = true;
    const r = await api.enviarLead(datos);
    if (!dialogo.open) return;

    if (r.ok) {
      const parametros = contexto.tipo === "compra" ? parametrosEquipo(contexto.equipo) : { content_name: contexto.busqueda };
      if (permitido("publicidad")) evento("Lead", parametros, codigo);
      confirmar(true);
      return;
    }

    intentos++;
    boton.disabled = false;
    boton.innerHTML = `${ICONO_WA}Reintentar`;
    alerta.textContent = "No pudimos guardar sus datos. Inténtelo de nuevo.";
    alerta.hidden = false;
    if (intentos >= 2 && enlace) {
      const respaldo = f.querySelector("[data-wa-respaldo]");
      respaldo.href = enlace;
      respaldo.hidden = false;
    }
  }

  function confirmar(abrirSolo) {
    dialogo.innerHTML = `
      <div class="popup-contenido">
        <div class="popup-cabecera"><span></span><button type="button" class="boton-icono" data-cerrar aria-label="Cerrar">${CERRAR}</button></div>
        <div class="popup-estado">
          <span class="sello-ok">${OK}</span>
          <h2 class="popup-titulo" id="popup-titulo" tabindex="-1">Su pedido está listo</h2>
          ${enlace ? `<p class="popup-texto">Si WhatsApp no se abrió, toque el botón.</p>
          <a class="boton boton--primario boton--grande boton--bloque" href="${escaparHTML(enlace)}" target="_blank" rel="noopener" data-abrir-wa>${ICONO_WA}Abrir WhatsApp</a>` : ""}
          <p class="cifras">Su código: <span class="codigo">${escaparHTML(codigo)}</span>. Si nos escribe desde otro número, menciónelo.</p>
        </div>
      </div>`;
    dialogo.querySelector("#popup-titulo").focus();
    if (abrirSolo && enlace) {
      const ventana = window.open(enlace, "_blank");
      if (ventana) ventana.opener = null;
    }
  }

  dialogo.addEventListener("click", (e) => {
    if (e.target.closest("[data-cerrar]") || e.target === dialogo) cerrarConTransicion(dialogo);
  });
  cerrarConEscape(dialogo);

  return {
    // contexto: { tipo: "compra", equipo } o { tipo: "sin stock", busqueda, filtros, nombreModelo }
    abrir(nuevo) {
      contexto = nuevo;
      codigo = "";
      intentos = 0;
      enlace = "";
      dibujarFormulario();
      dialogo.showModal();
      (dialogo.querySelector("#p-nombre") || dialogo.querySelector("#popup-titulo")).focus();
    }
  };
}
