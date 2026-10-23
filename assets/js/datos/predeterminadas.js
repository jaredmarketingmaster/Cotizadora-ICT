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
  // 12 y 12 mini: se ven iguales (cambia el tamaño). Jared pasó un juego para
  // cada uno: el primero quedó en el 12 y el segundo en el 12 mini.
  "iphone-12": { "Blanco": "blanco", "Negro": "negro", "Morado": "morado", "(PRODUCT)RED": "product-red", "Azul": "azul", "Verde": "verde" },
  "iphone-12-mini": { "Blanco": "blanco", "Negro": "negro", "Morado": "morado", "(PRODUCT)RED": "product-red", "Azul": "azul", "Verde": "verde" },
  // 12 Pro y 12 Pro Max: cada uno con sus imágenes (las del Pro Max se ven más grandes).
  "iphone-12-pro": { "Grafito": "grafito", "Azul pacífico": "azul-pacifico", "Oro": "oro", "Plata": "plata" },
  "iphone-12-pro-max": { "Grafito": "grafito", "Azul pacífico": "azul-pacifico", "Oro": "oro", "Plata": "plata" },
  // 13 y 13 mini: cada uno con su juego completo.
  "iphone-13": { "Blanco estelar": "blanco-estelar", "Medianoche": "medianoche", "Azul": "azul", "Rosa": "rosa", "Verde": "verde", "(PRODUCT)RED": "product-red" },
  "iphone-13-mini": { "Blanco estelar": "blanco-estelar", "Medianoche": "medianoche", "Azul": "azul", "Rosa": "rosa", "Verde": "verde", "(PRODUCT)RED": "product-red" },
  // 13 Pro y 13 Pro Max: las mismas imágenes hasta que Jared pase un juego para cada uno.
  "iphone-13-pro": { "Azul sierra": "azul-sierra", "Grafito": "grafito", "Oro": "oro", "Plata": "plata", "Verde alpino": "verde-alpino" },
  "iphone-13-pro-max": { "Azul sierra": "azul-sierra", "Grafito": "grafito", "Oro": "oro", "Plata": "plata", "Verde alpino": "verde-alpino" },
  // 18 Pro y 18 Pro Max: las mismas imágenes hasta que Jared pase un juego para cada uno.
  "iphone-18-pro": { "Borgoña": "borgona", "Glaciar": "glaciar", "Plata": "plata", "Negro": "negro" },
  "iphone-18-pro-max": { "Borgoña": "borgona", "Glaciar": "glaciar", "Plata": "plata", "Negro": "negro" },
  // 17 Pro y 17 Pro Max: las mismas imágenes hasta que Jared pase un juego para cada uno.
  "iphone-17-pro": { "Naranja cósmico": "naranja-cosmico", "Azul profundo": "azul-profundo", "Plata": "plata" },
  "iphone-17-pro-max": { "Naranja cósmico": "naranja-cosmico", "Azul profundo": "azul-profundo", "Plata": "plata" },
  // 14 y 14 Plus: las mismas imágenes hasta que Jared pase un juego para cada uno.
  "iphone-14": { "Amarillo": "amarillo", "Azul": "azul", "Medianoche": "medianoche", "Morado": "morado", "(PRODUCT)RED": "product-red" },
  "iphone-14-plus": { "Amarillo": "amarillo", "Azul": "azul", "Medianoche": "medianoche", "Morado": "morado", "(PRODUCT)RED": "product-red" },
  // 14 Pro y 14 Pro Max: las mismas imágenes hasta que Jared pase un juego para cada uno.
  "iphone-14-pro": { "Negro espacial": "negro-espacial", "Morado oscuro": "morado-oscuro", "Oro": "oro", "Plata": "plata" },
  "iphone-14-pro-max": { "Negro espacial": "negro-espacial", "Morado oscuro": "morado-oscuro", "Oro": "oro", "Plata": "plata" },
  // 15 y 15 Plus, 15 Pro y 15 Pro Max: cada par con las mismas imágenes hasta que Jared pase un juego para cada uno.
  "iphone-15": { "Amarillo": "amarillo", "Negro": "negro", "Azul": "azul", "Verde": "verde", "Rosa": "rosa" },
  "iphone-15-plus": { "Amarillo": "amarillo", "Negro": "negro", "Azul": "azul", "Verde": "verde", "Rosa": "rosa" },
  "iphone-15-pro": { "Titanio negro": "titanio-negro", "Titanio azul": "titanio-azul", "Titanio natural": "titanio-natural", "Titanio blanco": "titanio-blanco" },
  "iphone-15-pro-max": { "Titanio negro": "titanio-negro", "Titanio azul": "titanio-azul", "Titanio natural": "titanio-natural", "Titanio blanco": "titanio-blanco" },
  // 16 y 16 Plus, 16 Pro y 16 Pro Max: cada par con las mismas imágenes hasta que Jared pase un juego para cada uno.
  "iphone-16": { "Verde azulado": "verde-azulado", "Ultramarino": "ultramarino", "Blanco": "blanco", "Negro": "negro", "Rosa": "rosa" },
  "iphone-16-plus": { "Verde azulado": "verde-azulado", "Ultramarino": "ultramarino", "Blanco": "blanco", "Negro": "negro", "Rosa": "rosa" },
  "iphone-16-pro": { "Titanio blanco": "titanio-blanco", "Titanio negro": "titanio-negro", "Titanio del desierto": "titanio-del-desierto", "Titanio natural": "titanio-natural" },
  "iphone-16-pro-max": { "Titanio blanco": "titanio-blanco", "Titanio negro": "titanio-negro", "Titanio del desierto": "titanio-del-desierto", "Titanio natural": "titanio-natural" },
  "iphone-16e": { "Blanco": "blanco", "Negro": "negro" },
  "iphone-17": { "Blanco": "blanco", "Lavanda": "lavanda", "Azul neblina": "azul-neblina", "Salvia": "salvia", "Negro": "negro" },
  "iphone-17e": { "Rosa pálido": "rosa-palido", "Blanco": "blanco", "Negro": "negro" },
  "iphone-air": { "Blanco nube": "blanco-nube", "Oro claro": "oro-claro", "Azul cielo": "azul-cielo", "Negro espacial": "negro-espacial" },
  "iphone-duo": { "Cielo nocturno": "cielo-nocturno", "Blanco estrella": "blanco-estrella" },
  "iphone-se-3": { "Medianoche": "medianoche", "(PRODUCT)RED": "product-red", "Blanco estelar": "blanco-estelar" },
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
