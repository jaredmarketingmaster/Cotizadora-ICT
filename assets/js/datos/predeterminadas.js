// =============================================================================
// Imágenes predeterminadas de cada modelo y color (pedido de Jared, 23/10/2026,
// versión 1.1). Las pasó Jared; los derechos de esas imágenes son
// responsabilidad suya (sección 16 de DOCUMENTACION.md).
// - Viven en el sitio, no en el Storage de cada tienda:
//   assets/img/predeterminadas/<slug del modelo>/<archivo>.webp y su
//   <archivo>-640.webp (la miniatura, como las fotos de la tienda).
// - En equipos.fotos se guardan como "predeterminadas/<slug>/<archivo>.webp":
//   urlArchivo() de demo.js y supabase.js las sirve desde el sitio, y
//   borrarArchivos() nunca las borra (son compartidas).
// - La carga en lote (panel/lote.js) las pone de entrada en cada color; la
//   tienda puede dejarlas, quitarlas o cambiarlas por sus fotos.
// IMAGENES_PREDETERMINADAS: slug del modelo → nombre_es del color oficial →
// nombre del archivo (sin extensión).
// =============================================================================

export const PREFIJO_PREDETERMINADA = "predeterminadas/";

export const IMAGENES_PREDETERMINADAS = {
  "iphone-7": { "Negro": "negro", "Oro": "oro", "Negro brillante": "negro-brillante", "(PRODUCT)RED": "product-red" },
  "iphone-7-plus": { "Negro": "negro", "Oro": "oro", "(PRODUCT)RED": "product-red", "Oro rosa": "oro-rosa", "Plata": "plata", "Negro brillante": "negro-brillante" },
  "iphone-11": { "Morado": "morado", "(PRODUCT)RED": "product-red", "Blanco": "blanco", "Negro": "negro", "Verde": "verde" }
};

export const esPredeterminada = (ruta) => String(ruta || "").startsWith(PREFIJO_PREDETERMINADA);

// Ruta para equipos.fotos, o "" si ese modelo y color no tienen imagen.
export function rutaPredeterminada(slugModelo, nombreColor) {
  const archivo = IMAGENES_PREDETERMINADAS[slugModelo]?.[nombreColor];
  return archivo ? `${PREFIJO_PREDETERMINADA}${slugModelo}/${archivo}.webp` : "";
}

// URL de la imagen en el sitio (sirve igual desde la portada, /admin/ o las páginas internas).
export function urlPredeterminada(ruta) {
  return new URL(`../../img/${ruta}`, import.meta.url).href;
}
