// =============================================================================
// Tema de la tienda: variables CSS a partir de color_primario,
// color_secundario y tema (claro u oscuro), y el tamaño del texto. El color del texto sobre cada color
// se calcula para cumplir contraste AA (4,5:1).
// =============================================================================

import { hexValido, textoSobre, ajustarParaTexto, mezclar } from "./utils.js";
import { TAMANOS_TEXTO } from "./datos/comun.js";

export const FONDOS = { claro: "#FFFFFF", oscuro: "#0E1117" };
// Fondos donde puede ir texto en el color primario (página, tarjeta y
// superficies). Deben coincidir con base.css.
const SUPERFICIES = {
  claro: ["#FFFFFF", "#F4F5F7", "#E9EBEF"],
  oscuro: ["#0E1117", "#161A22", "#202631"]
};

export function variablesTema(tienda) {
  const tema = tienda?.tema === "oscuro" ? "oscuro" : "claro";
  const primario = hexValido(tienda?.color_primario) ? tienda.color_primario.toUpperCase() : "#1A73E8";
  const secundario = hexValido(tienda?.color_secundario) ? tienda.color_secundario.toUpperCase() : "#0F172A";
  return {
    tema,
    // Tamaño del texto del sitio (sitio.css lo lee de data-tamano; el panel no).
    tamano: TAMANOS_TEXTO.includes(tienda?.tamano_texto) ? tienda.tamano_texto : "normal",
    vars: {
      "--primario": primario,
      "--sobre-primario": textoSobre(primario),
      // El primario usado como texto, enlace o borde sobre el fondo de la página
      "--primario-texto": ajustarParaTexto(primario, SUPERFICIES[tema]),
      "--secundario": secundario,
      "--sobre-secundario": textoSobre(secundario),
      // Texto secundario sobre el color secundario (pie): más suave, pero
      // ajustado hasta 4,5:1 como mínimo.
      "--sobre-secundario-suave": ajustarParaTexto(mezclar(textoSobre(secundario), secundario, 0.3), secundario)
    }
  };
}

export function aplicarTema(tienda, raiz = document.documentElement) {
  const { tema, tamano, vars } = variablesTema(tienda);
  raiz.dataset.tema = tema;
  raiz.dataset.tamano = tamano;
  for (const [k, v] of Object.entries(vars)) raiz.style.setProperty(k, v);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = vars["--secundario"];
  // Para la próxima visita: el script del <head> la aplica antes del primer
  // pintado (sin parpadeo de claro a oscuro ni cambio de tamaño).
  try { localStorage.setItem(CLAVE_APARIENCIA, JSON.stringify({ tema, tamano, vars })); } catch { /* sin almacenamiento */ }
}

export const CLAVE_APARIENCIA = "cotizadora:apariencia";
