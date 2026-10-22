// =============================================================================
// Video corto del equipo: validación en el navegador, sin comprimir ni
// convertir (se sube tal cual).
// - Formatos: MP4 con H.264 o WebM. Un .mov, un MP4 en HEVC u otro formato se
//   rechaza: puede no verse en todos los celulares.
// - Hasta 15 segundos (equipos) o el máximo que se pida (reseñas: 30) y 20 MB.
// - Duración: del MP4 se lee la caja "mvhd" de sus metadatos (no hace falta
//   que el navegador sepa reproducirlo); del WebM, la que informa <video>.
// =============================================================================

import { ErrorDatos } from "../datos/comun.js";
import { t as tr } from "../i18n/i18n.js";

export const MAX_BYTES_VIDEO = 20 * 1024 * 1024;
export const MAX_SEGUNDOS = 15;
// Los celulares graban "15 s" como 15,0x s: un margen de una décima.
const MARGEN = 0.1;
// Es una función: el idioma se carga después de importar este módulo.
export const MENSAJE_FORMATO = () => tr("panel.video.formato");

// Por el tipo; si el navegador no lo informa, por la extensión.
function tipoDe(archivo) {
  const tipo = String(archivo.type || "").toLowerCase();
  const nombre = String(archivo.name || "").toLowerCase();
  if (tipo === "video/mp4" || (!tipo && nombre.endsWith(".mp4"))) return "mp4";
  if (tipo === "video/webm" || (!tipo && nombre.endsWith(".webm"))) return "webm";
  return "";
}

// Cajas de un MP4 (ISO BMFF) entre inicio y fin: [{ tipo, inicio, datos, fin }].
function cajas(vista, inicio, fin) {
  const lista = [];
  let i = inicio;
  while (i + 8 <= fin) {
    let tam = vista.getUint32(i);
    const tipo = String.fromCharCode(vista.getUint8(i + 4), vista.getUint8(i + 5), vista.getUint8(i + 6), vista.getUint8(i + 7));
    let cabecera = 8;
    if (tam === 1) {
      if (i + 16 > fin) break;
      tam = Number(vista.getBigUint64(i + 8));
      cabecera = 16;
    } else if (tam === 0) {
      tam = fin - i;
    }
    if (tam < cabecera || i + tam > fin) break;
    lista.push({ tipo, inicio: i, datos: i + cabecera, fin: i + tam });
    i += tam;
  }
  return lista;
}

function contiene(bytes, inicio, fin, texto) {
  const c = [...texto].map((x) => x.charCodeAt(0));
  for (let i = inicio; i <= fin - c.length; i++) {
    if (bytes[i] === c[0] && bytes[i + 1] === c[1] && bytes[i + 2] === c[2] && bytes[i + 3] === c[3]) return true;
  }
  return false;
}

// Duración (segundos) y si el video es H.264, leyendo la caja "moov".
export function leerMp4(buffer) {
  const vista = new DataView(buffer);
  const bytes = new Uint8Array(buffer);
  const moov = cajas(vista, 0, buffer.byteLength).find((c) => c.tipo === "moov");
  if (!moov) throw new ErrorDatos(MENSAJE_FORMATO());
  const mvhd = cajas(vista, moov.datos, moov.fin).find((c) => c.tipo === "mvhd");
  if (!mvhd) throw new ErrorDatos(MENSAJE_FORMATO());
  const version = vista.getUint8(mvhd.datos);
  const escala = version === 1 ? vista.getUint32(mvhd.datos + 20) : vista.getUint32(mvhd.datos + 12);
  const duracion = version === 1 ? Number(vista.getBigUint64(mvhd.datos + 24)) : vista.getUint32(mvhd.datos + 16);
  if (!escala) throw new ErrorDatos(MENSAJE_FORMATO());
  const h264 = contiene(bytes, moov.datos, moov.fin, "avc1") || contiene(bytes, moov.datos, moov.fin, "avc3");
  return { segundos: duracion / escala, h264 };
}

// Duración que informa el navegador (WebM). Si dice "Infinity" (pasa con
// algunos WebM grabados en el navegador), se busca el final para conocerla.
function duracionConVideo(archivo) {
  return new Promise((resolver, rechazar) => {
    const v = document.createElement("video");
    const url = URL.createObjectURL(archivo);
    const terminar = (fn, x) => { clearTimeout(t); v.removeAttribute("src"); v.load(); URL.revokeObjectURL(url); fn(x); };
    const t = setTimeout(() => terminar(rechazar, new ErrorDatos(tr("panel.video.no_se_pudo_leer"))), 15000);
    v.preload = "metadata";
    v.muted = true;
    v.onerror = () => terminar(rechazar, new ErrorDatos(MENSAJE_FORMATO()));
    v.onloadedmetadata = () => {
      if (Number.isFinite(v.duration)) { terminar(resolver, v.duration); return; }
      v.ondurationchange = () => { if (Number.isFinite(v.duration)) terminar(resolver, v.duration); };
      v.currentTime = 1e7;
    };
    v.src = url;
  });
}

// Valida el archivo. Devuelve { ext, segundos }. Lanza ErrorDatos con un
// mensaje para el usuario si no sirve.
export async function validarVideo(archivo, { maxSegundos = MAX_SEGUNDOS } = {}) {
  const tipo = tipoDe(archivo);
  if (!tipo) throw new ErrorDatos(MENSAJE_FORMATO());
  if (archivo.size > MAX_BYTES_VIDEO) throw new ErrorDatos(tr("panel.video.muy_pesado"));
  let segundos;
  if (tipo === "mp4") {
    const info = leerMp4(await archivo.arrayBuffer());
    if (!info.h264) throw new ErrorDatos(MENSAJE_FORMATO());
    segundos = info.segundos;
  } else {
    segundos = await duracionConVideo(archivo);
  }
  if (segundos > maxSegundos + MARGEN) throw new ErrorDatos(tr("panel.video.muy_largo", { n: maxSegundos }));
  return { ext: tipo, segundos };
}
