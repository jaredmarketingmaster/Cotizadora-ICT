// =============================================================================
// Tema de la tienda: variables CSS a partir de color_primario,
// color_secundario y tema (claro u oscuro). El color del texto sobre cada color
// se calcula para cumplir contraste AA (4,5:1).
// =============================================================================

import { hexValido, textoSobre, ajustarParaTexto } from "./utils.js";

export const FONDOS = { claro: "#FFFFFF", oscuro: "#0E1117" };

export function variablesTema(tienda) {
  const tema = tienda?.tema === "oscuro" ? "oscuro" : "claro";
  const fondo = FONDOS[tema];
  const primario = hexValido(tienda?.color_primario) ? tienda.color_primario.toUpperCase() : "#1A73E8";
  const secundario = hexValido(tienda?.color_secundario) ? tienda.color_secundario.toUpperCase() : "#0F172A";
  return {
    tema,
    vars: {
      "--primario": primario,
      "--sobre-primario": textoSobre(primario),
      // El primario usado como texto, enlace o borde sobre el fondo de la página
      "--primario-texto": ajustarParaTexto(primario, fondo),
      "--secundario": secundario,
      "--sobre-secundario": textoSobre(secundario)
    }
  };
}

export function aplicarTema(tienda, raiz = document.documentElement) {
  const { tema, vars } = variablesTema(tienda);
  raiz.dataset.tema = tema;
  for (const [k, v] of Object.entries(vars)) raiz.style.setProperty(k, v);
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.content = vars["--secundario"];
}
