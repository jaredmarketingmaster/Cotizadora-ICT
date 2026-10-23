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
  "iphone-7": { "Negro": "negro", "Oro": "oro", "Negro brillante": "negro-brillante", "(PRODUCT)RED": "product-red", "Oro rosa": "oro-rosa", "Plata": "plata" },
  "iphone-7-plus": { "Negro": "negro", "Oro": "oro", "(PRODUCT)RED": "product-red", "Oro rosa": "oro-rosa", "Plata": "plata", "Negro brillante": "negro-brillante" },
  "iphone-11": { "Morado": "morado", "(PRODUCT)RED": "product-red", "Blanco": "blanco", "Negro": "negro", "Verde": "verde", "Amarillo": "amarillo" },
  "iphone-11-pro": { "Verde noche": "verde-noche", "Plata": "plata", "Gris espacial": "gris-espacial", "Oro": "oro" },
  "iphone-11-pro-max": { "Verde noche": "verde-noche", "Plata": "plata", "Gris espacial": "gris-espacial", "Oro": "oro" },
  // 12 y 12 mini: se ven iguales (cambia el tamaño). Jared pasó dos juegos: el
  // primero quedó en el 12 y el segundo en el 12 mini ((PRODUCT)RED, todavía la del 12).
  "iphone-12": { "Blanco": "blanco", "Negro": "negro", "Morado": "morado", "(PRODUCT)RED": "product-red", "Azul": "azul", "Verde": "verde" },
  "iphone-12-mini": { "Blanco": "blanco", "Negro": "negro", "Morado": "morado", "(PRODUCT)RED": "product-red", "Azul": "azul", "Verde": "verde" },
  "iphone-se-2": { "Negro": "negro", "(PRODUCT)RED": "product-red", "Blanco": "blanco" },
  "iphone-8": { "Oro": "oro", "Gris espacial": "gris-espacial", "(PRODUCT)RED": "product-red", "Plata": "plata" },
  "iphone-8-plus": { "(PRODUCT)RED": "product-red", "Plata": "plata", "Gris espacial": "gris-espacial", "Oro": "oro" },
  "iphone-x": { "Plata": "plata", "Gris espacial": "gris-espacial" },
  // XS y XS Max: Oro y Plata con la misma imagen (se ven iguales; cambia el tamaño). Gris espacial: cada uno la suya.
  // Plata lleva la marca de agua de otra empresa: Jared decidió dejarla así (23/10/2026).
  "iphone-xs": { "Gris espacial": "gris-espacial", "Oro": "oro", "Plata": "plata" },
  "iphone-xs-max": { "Gris espacial": "gris-espacial", "Oro": "oro", "Plata": "plata" },
  "iphone-xr": { "Negro": "negro", "Azul": "azul", "Coral": "coral", "Amarillo": "amarillo", "(PRODUCT)RED": "product-red", "Blanco": "blanco" }
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
