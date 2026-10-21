// Páginas /privacidad y /terminos: muestran el texto cargado en el panel, con
// los datos de la tienda en lugar de {{nombre}}, {{correo}}, etc. Las marcas
// [PENDIENTE: …] nunca se muestran: se quitan y arriba se avisa "Texto en
// revisión." (prepararLegal, comun.js).
import { api as obtenerApi } from "../datos/api.js";
import { aplicarTema } from "../tema.js";
import { logoGenericoSVG } from "../ilustracion.js";
import { formatoBasico, escaparHTML } from "../utils.js";
import { prepararLegal } from "../datos/comun.js";

const caja = document.getElementById("legal-texto");
try {
  const api = await obtenerApi();
  const { tienda } = await api.cargarPublico();
  aplicarTema(tienda);
  const logo = tienda.logo ? api.urlArchivo("marca", tienda.logo) : "";
  document.getElementById("marca-logo").innerHTML = logo ? `<img src="${escaparHTML(logo)}" alt="" width="160" height="40">` : logoGenericoSVG();
  document.getElementById("marca-nombre").textContent = tienda.nombre || "";
  const crudo = document.body.dataset.legal === "privacidad" ? tienda.texto_privacidad : tienda.texto_terminos;
  const { texto, pendientes } = prepararLegal(crudo, tienda);
  caja.innerHTML = texto
    ? `${pendientes.length ? '<p class="legal-revision">Texto en revisión.</p>' : ""}${formatoBasico(texto)}`
    : "<p>La tienda todavía no publicó este texto.</p>";
} catch {
  caja.innerHTML = "<p>No pudimos cargar el texto. Recargue la página.</p>";
}
caja.removeAttribute("aria-busy");
