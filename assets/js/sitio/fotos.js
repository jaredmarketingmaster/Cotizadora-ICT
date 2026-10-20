// Foto de un equipo con tamaños responsivos (miniatura de 640 px y grande de
// 1600 px) y carga diferida. Sin fotos, la ilustración genérica del color.

import { escaparHTML } from "../utils.js";
import { rutaMiniatura, LADO_MINIATURA, LADO_GRANDE } from "../datos/comun.js";
import { telefonoSVG } from "../ilustracion.js";

export function htmlFoto(api, ruta, alt, { sizes = "100vw", cargaInmediata = false } = {}) {
  const grande = api.urlArchivo("fotos", ruta);
  const mini = api.urlArchivo("fotos", rutaMiniatura(ruta));
  const srcset = mini ? `srcset="${escaparHTML(mini)} ${LADO_MINIATURA}w, ${escaparHTML(grande)} ${LADO_GRANDE}w" sizes="${sizes}"` : "";
  return `<img src="${escaparHTML(grande)}" ${srcset} alt="${escaparHTML(alt)}" ${cargaInmediata ? 'fetchpriority="high"' : 'loading="lazy"'} decoding="async">`;
}

export function htmlMedio(api, equipo, alt, opciones) {
  const ruta = equipo.fotos?.[0];
  if (ruta && api.urlArchivo("fotos", ruta)) return htmlFoto(api, ruta, alt, opciones);
  return telefonoSVG(equipo.color_hex, alt);
}
