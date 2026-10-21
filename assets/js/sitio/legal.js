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

const caja = document.getElementById("legal-texto");
try {
  const api = await obtenerApi();
  const { tienda } = await api.cargarPublico();
  aplicarTema(tienda);
  const logo = tienda.logo ? api.urlArchivo("marca", tienda.logo) : "";
  document.getElementById("marca-logo").innerHTML = logo ? `<img src="${escaparHTML(logo)}" alt="" width="160" height="40">` : logoGenericoSVG();
  document.getElementById("marca-nombre").textContent = tienda.nombre || "";
  const texto = conVigencia(tienda.legal_publicado, document.body.dataset.legal);
  caja.innerHTML = texto ? formatoBasico(texto) : "<p>Página en preparación.</p>";
  iniciarConsentimiento({ tienda, cargar: false, preguntar: false, rutaCookies: "../cookies/" });
} catch {
  caja.innerHTML = "<p>No pudimos cargar el texto. Recargue la página.</p>";
}
caja.removeAttribute("aria-busy");
