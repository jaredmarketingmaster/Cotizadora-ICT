// Primer pintado en portugués: lo carga el script en línea del <head> del
// sitio y de las páginas legales solo si el idioma guardado es "pt". Traduce
// el HTML apenas llegan los diccionarios, sin esperar a principal.js ni a
// legal.js (que después aplican el idioma de la tienda).
import { cargarIdioma, idiomaGuardado, traducirDom } from "./i18n.js";

await cargarIdioma(idiomaGuardado());
traducirDom();
