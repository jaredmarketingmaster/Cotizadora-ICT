// Páginas /privacidad/, /terminos/ y /cookies/: muestran el documento que la
// tienda publicó desde Legales (tienda.legal_publicado), con su vigencia al
// pie. Sin publicar: "Página en preparación." Estas páginas no cargan
// herramientas de medición; el pie permite cambiar las preferencias de cookies.
import { api as obtenerApi } from "../datos/api.js";
import { aplicarTema } from "../tema.js";
import { logoGenericoSVG } from "../ilustracion.js";
import { formatoBasico, escaparHTML } from "../utils.js";
import { conVigencia } from "../legal/vigencia.js";
import { iniciarConsentimiento } from "./consentimiento.js";
import { fijarPais } from "../datos/paises.js";
import { cargarIdioma, traducirDom, idiomaActual, t } from "../i18n/i18n.js";

const caja = document.getElementById("legal-texto");
try {
  const api = await obtenerApi();
  const { tienda } = await api.cargarPublico();
  fijarPais(tienda.pais);
  await cargarIdioma(tienda.idioma);
  traducirDom();
  aplicarTema(tienda);
  const logo = tienda.logo ? api.urlArchivo("marca", tienda.logo) : "";
  document.getElementById("marca-logo").innerHTML = logo ? `<img src="${escaparHTML(logo)}" alt="" width="160" height="40">` : logoGenericoSVG();
  document.getElementById("marca-nombre").textContent = tienda.nombre || "";
  const texto = conVigencia(tienda.legal_publicado, document.body.dataset.legal);
  caja.innerHTML = texto ? formatoBasico(texto) : `<p>${t("legalpag.en_preparacion")}</p>`;
  // El documento legal está solo en español (no hay módulo en portugués): se
  // avisa arriba, en portugués, y el texto se marca como español.
  if (texto && idiomaActual() === "pt") {
    caja.lang = "es";
    const aviso = document.createElement("p");
    aviso.className = "legal-idioma";
    aviso.style.marginBottom = "20px"; // sitio.css no tiene regla para .legal-idioma
    aviso.textContent = t("legalpag.solo_espanol");
    caja.before(aviso);
  }
  iniciarConsentimiento({ tienda, cargar: false, preguntar: false, rutaCookies: "../cookies/" });
} catch {
  caja.innerHTML = `<p>${t("legalpag.error")}</p>`;
}
caja.removeAttribute("aria-busy");
