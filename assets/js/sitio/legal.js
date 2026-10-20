// Páginas /privacidad y /terminos: muestran el texto cargado en el panel.
import { api as obtenerApi } from "../datos/api.js";
import { aplicarTema } from "../tema.js";
import { logoGenericoSVG } from "../ilustracion.js";
import { formatoBasico, escaparHTML } from "../utils.js";

const caja = document.getElementById("legal-texto");
try {
  const api = await obtenerApi();
  const { tienda } = await api.cargarPublico();
  aplicarTema(tienda);
  const logo = tienda.logo ? api.urlArchivo("marca", tienda.logo) : "";
  document.getElementById("marca-logo").innerHTML = logo ? `<img src="${escaparHTML(logo)}" alt="" width="160" height="40">` : logoGenericoSVG();
  document.getElementById("marca-nombre").textContent = tienda.nombre || "";
  const texto = document.body.dataset.legal === "privacidad" ? tienda.texto_privacidad : tienda.texto_terminos;
  caja.innerHTML = texto?.trim()
    ? formatoBasico(texto)
    : "<p>La tienda todavía no publicó este texto.</p>";
} catch {
  caja.innerHTML = "<p>No pudimos cargar el texto. Recargue la página.</p>";
}
caja.removeAttribute("aria-busy");
