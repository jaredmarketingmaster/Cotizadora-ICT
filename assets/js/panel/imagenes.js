// =============================================================================
// Fotos: validación, compresión a WebP (máx. 1600 px de lado) y miniatura de
// 640 px, en el navegador y sin librerías. Si el navegador no sabe codificar
// WebP (Safari viejo), se usa JPEG.
// HEIC: el iPhone suele convertirlo a JPEG al elegir la foto; Safari además lo
// decodifica. En otros navegadores un .heic se rechaza con un aviso claro.
// =============================================================================

import { ErrorDatos, LADO_GRANDE, LADO_MINIATURA } from "../datos/comun.js";

export const MAX_BYTES = 10 * 1024 * 1024;
const TIPOS = /^image\/(jpeg|png|webp|heic|heif)$/i;
const EXTENSIONES = /\.(jpe?g|png|webp|heic|heif)$/i;

export function validarArchivo(archivo) {
  if (!TIPOS.test(archivo.type) && !EXTENSIONES.test(archivo.name)) {
    throw new ErrorDatos(`"${archivo.name}" no es una foto JPG, PNG, WebP o HEIC.`);
  }
  if (archivo.size > MAX_BYTES) {
    throw new ErrorDatos(`"${archivo.name}" pesa más de 10 MB.`);
  }
}

async function decodificar(archivo) {
  try {
    return await createImageBitmap(archivo, { imageOrientation: "from-image" });
  } catch {
    // Respaldo con <img> (algunos navegadores no aceptan opciones o el tipo)
    const url = URL.createObjectURL(archivo);
    try {
      const img = new Image();
      img.decoding = "async";
      img.src = url;
      await img.decode();
      return img;
    } catch {
      const heic = /heic|heif/i.test(archivo.type) || /\.(heic|heif)$/i.test(archivo.name);
      throw new ErrorDatos(heic
        ? `Este navegador no puede leer "${archivo.name}" (HEIC). Súbala desde el iPhone o guárdela como JPG.`
        : `No pudimos leer "${archivo.name}". Pruebe con otra foto.`);
    } finally {
      URL.revokeObjectURL(url);
    }
  }
}

function aBlob(canvas, tipo, calidad) {
  return new Promise((r) => canvas.toBlob(r, tipo, calidad));
}

export async function codificar(canvas, { conTransparencia = false } = {}) {
  let blob = await aBlob(canvas, "image/webp", 0.82);
  if (blob && blob.type === "image/webp") return { blob, ext: "webp" };
  blob = conTransparencia ? await aBlob(canvas, "image/png") : await aBlob(canvas, "image/jpeg", 0.85);
  if (!blob) throw new ErrorDatos("No pudimos procesar la foto. Pruebe con otra.");
  return { blob, ext: conTransparencia ? "png" : "jpg" };
}

function lienzo(fuente, lado) {
  const w = fuente.width;
  const h = fuente.height;
  const escala = Math.min(1, lado / Math.max(w, h));
  const c = document.createElement("canvas");
  c.width = Math.max(1, Math.round(w * escala));
  c.height = Math.max(1, Math.round(h * escala));
  const ctx = c.getContext("2d");
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(fuente, 0, 0, c.width, c.height);
  return c;
}

// Devuelve { grande, miniatura, ext } listos para subir.
export async function comprimirFoto(archivo) {
  validarArchivo(archivo);
  const fuente = await decodificar(archivo);
  const grande = await codificar(lienzo(fuente, LADO_GRANDE));
  const miniatura = await codificar(lienzo(fuente, LADO_MINIATURA));
  fuente.close?.();
  return { grande: grande.blob, miniatura: miniatura.blob, ext: grande.ext };
}

export async function cargarImagen(archivo) {
  validarArchivo(archivo);
  return decodificar(archivo);
}
