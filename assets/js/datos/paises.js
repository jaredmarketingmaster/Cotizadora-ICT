// =============================================================================
// Datos de cada país para la tienda (tienda.pais): moneda, formato de números,
// zona horaria, prefijo telefónico y celular. Los mismos 19 países de
// legal/paises/indice.js (que los importa para los nombres).
//
// - Moneda: código ISO 4217 y símbolo. Los precios se guardan enteros y se
//   muestran sin decimales en todas las monedas (decisión de la ronda 3).
// - Separador de miles: el uso habitual de cada país (convención de CLDR).
// - Celular: los países con `verificado: true` tienen su formato confirmado en
//   las fuentes de DOCUMENTACION.md (sección 9.10). En los demás se usa una
//   validación general (prefijo + número, de 8 a 15 dígitos en total) y queda
//   como pendiente.
//   - `nacional`: el patrón de lo que escribe la persona, sin el prefijo.
//   - `internacional`: lo que va delante en el número internacional (wa.me).
//     En Argentina es 54 9: el 9 va antes del código de área (sin el 0) y el
//     número va sin el 15.
//   - `grupos`: cómo se agrupan los dígitos al mostrarlos.
// Debe coincidir con whatsapp_valido() del SQL (0018; desde 0033 con SV, BO, CR
// y EC verificados y los fijos de la tienda). Las pruebas lo comparan.
// - Nombre: `PAISES_TIENDA[c].nombre` es el nombre en español (dato fijo);
//   datosPais(c).nombre es el que se muestra, en el idioma en uso (clave i18n
//   "pais.<código>").
// =============================================================================

import { t } from "../i18n/i18n.js";

export const PAISES_TIENDA = {
  ar: { nombre: "Argentina", moneda: "ARS", simbolo: "$", miles: ".", zona: "America/Argentina/Buenos_Aires", prefijo: "54",
    celular: { verificado: true, internacional: "549", visible: "+54 9", nacional: /^[1-9]\d{9}$/, grupos: [2, 4, 4], ejemplo: "11 2345 6789" } },
  bo: { nombre: "Bolivia", moneda: "BOB", simbolo: "Bs", espacio: true, miles: ".", zona: "America/La_Paz", prefijo: "591",
    celular: { verificado: true, internacional: "591", nacional: /^[67]\d{7}$/, grupos: [4, 4], ejemplo: "7123 4567" } },
  br: { nombre: "Brasil", moneda: "BRL", simbolo: "R$", espacio: true, miles: ".", zona: "America/Sao_Paulo", prefijo: "55",
    celular: { verificado: true, internacional: "55", nacional: /^[1-9]{2}9[1-9]\d{7}$/, grupos: [2, 5, 4], ejemplo: "11 91234 5678" } },
  cl: { nombre: "Chile", moneda: "CLP", simbolo: "$", miles: ".", zona: "America/Santiago", prefijo: "56",
    celular: { verificado: true, internacional: "56", nacional: /^9\d{8}$/, grupos: [1, 4, 4], ejemplo: "9 1234 5678" } },
  co: { nombre: "Colombia", moneda: "COP", simbolo: "$", miles: ".", zona: "America/Bogota", prefijo: "57",
    celular: { verificado: true, internacional: "57", nacional: /^3\d{9}$/, grupos: [3, 3, 4], ejemplo: "300 123 4567" } },
  cr: { nombre: "Costa Rica", moneda: "CRC", simbolo: "₡", miles: " ", zona: "America/Costa_Rica", prefijo: "506",
    celular: { verificado: true, internacional: "506", nacional: /^[5-8]\d{7}$/, grupos: [4, 4], ejemplo: "8312 3456" } },
  cu: { nombre: "Cuba", moneda: "CUP", simbolo: "$", miles: ".", zona: "America/Havana", prefijo: "53" },
  ec: { nombre: "Ecuador", moneda: "USD", simbolo: "$", miles: ".", zona: "America/Guayaquil", prefijo: "593",
    celular: { verificado: true, internacional: "593", nacional: /^9\d{8}$/, grupos: [2, 3, 4], ejemplo: "99 123 4567" } },
  sv: { nombre: "El Salvador", moneda: "USD", simbolo: "$", miles: ",", zona: "America/El_Salvador", prefijo: "503",
    celular: { verificado: true, internacional: "503", nacional: /^[67]\d{7}$/, grupos: [4, 4], ejemplo: "7012 3456" } },
  gt: { nombre: "Guatemala", moneda: "GTQ", simbolo: "Q", miles: ",", zona: "America/Guatemala", prefijo: "502" },
  hn: { nombre: "Honduras", moneda: "HNL", simbolo: "L", espacio: true, miles: ",", zona: "America/Tegucigalpa", prefijo: "504" },
  mx: { nombre: "México", moneda: "MXN", simbolo: "$", miles: ",", zona: "America/Mexico_City", prefijo: "52",
    celular: { verificado: true, internacional: "52", nacional: /^[1-9]\d{9}$/, grupos: [2, 4, 4], ejemplo: "55 1234 5678" } },
  ni: { nombre: "Nicaragua", moneda: "NIO", simbolo: "C$", miles: ",", zona: "America/Managua", prefijo: "505" },
  pa: { nombre: "Panamá", moneda: "USD", simbolo: "$", miles: ",", zona: "America/Panama", prefijo: "507" },
  py: { nombre: "Paraguay", moneda: "PYG", simbolo: "₲", espacio: true, miles: ".", zona: "America/Asuncion", prefijo: "595" },
  pe: { nombre: "Perú", moneda: "PEN", simbolo: "S/", espacio: true, miles: ",", zona: "America/Lima", prefijo: "51",
    celular: { verificado: true, internacional: "51", nacional: /^9\d{8}$/, grupos: [3, 3, 3], ejemplo: "912 345 678" } },
  do: { nombre: "República Dominicana", moneda: "DOP", simbolo: "RD$", miles: ",", zona: "America/Santo_Domingo", prefijo: "1" },
  uy: { nombre: "Uruguay", moneda: "UYU", simbolo: "$", miles: ".", zona: "America/Montevideo", prefijo: "598" },
  ve: { nombre: "Venezuela", moneda: "VES", simbolo: "Bs.", espacio: true, miles: ".", zona: "America/Caracas", prefijo: "58" }
};

export const CODIGOS_PAIS_TIENDA = Object.keys(PAISES_TIENDA);

// Enlace a la autoridad de protección al consumidor que el pie del sitio
// muestra según el país de la tienda (texto: "sitio.pie.consumidor.<código>").
// Solo los países con fuente en legal/FUENTES.md: Colombia, fuente 16 (Ley
// 1480, art. 50, literal d); Argentina, AR11 (Resolución SCI 271/2020, con su
// leyenda textual).
export const AUTORIDAD_CONSUMIDOR = {
  co: "https://www.sic.gov.co",
  ar: "https://www.argentina.gob.ar/iniciar-un-reclamo-ante-defensa-de-las-y-los-consumidores"
};

// Página de solicitudes (/solicitudes/): los tipos que ofrece según el país de
// la tienda (textos: "solicitudes.tipo.<tipo>"; título y enlace del pie:
// "solicitudes.titulo.<código>" y "sitio.pie.solicitudes.<código>"). Colombia:
// peticiones, quejas y reclamos con radicado (legal/FUENTES.md, fuente 17).
// Argentina: sin tipos desde 0041 (Jared quitó el botón de arrepentimiento:
// la compra no se hace entera en el sitio). Sin tipos, no se ofrece.
// Los mismos tipos acepta enviar-lead (TIPOS_SOLICITUD de lead.ts).
export const SOLICITUDES = {
  co: ["peticion", "queja", "reclamo"]
};
export const PAIS_POR_DEFECTO = "ar";

// Los que no tienen formato verificado: prefijo + número, de 8 a 15 dígitos.
const GENERAL = { verificado: false, nacional: null, grupos: [3, 3, 4], ejemplo: "" };
export function datosPais(codigo) {
  const p = PAISES_TIENDA[codigo] || PAISES_TIENDA.co;
  const celular = { ...GENERAL, internacional: p.prefijo, ...p.celular };
  celular.visible = celular.visible || `+${celular.internacional}`;
  const c = PAISES_TIENDA[codigo] ? codigo : "co";
  return { codigo: c, ...p, nombre: t(`pais.${c}`), celular };
}

// --- País de la tienda en uso ---------------------------------------------------
// El sitio y el panel lo fijan al cargar la tienda; los formatos lo usan por
// defecto. Antes de cargar, Colombia (el demo).
let actual = "co";
export function fijarPais(codigo) { actual = PAISES_TIENDA[codigo] ? codigo : "co"; }
export const paisActual = () => actual;

// --- Números y precios ----------------------------------------------------------
// Separador de miles del país; sin decimales (los precios son enteros). No se
// usa Intl porque en español puede no agrupar los números de 4 cifras.
export function formatearNumero(n, codigo = actual) {
  const entero = Math.round(Number(n) || 0);
  const signo = entero < 0 ? "-" : "";
  const miles = datosPais(codigo).miles === " " ? "\u00A0" : datosPais(codigo).miles;
  return signo + String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, miles);
}

// "$5.299.000" (Colombia y Argentina), "R$ 5.299.000" (Brasil), "$5,299,000" (México).
export function formatearPrecio(n, codigo = actual) {
  const p = datosPais(codigo);
  return p.simbolo + (p.espacio ? "\u00A0" : "") + formatearNumero(n, codigo);
}

// --- Fechas ------------------------------------------------------------------------
// D/M/AAAA en la zona horaria del país.
export function fechaCortaPais(fecha, codigo = actual) {
  if (!fecha) return "";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "";
  const p = partesFecha(d, datosPais(codigo).zona);
  return `${Number(p.day)}/${Number(p.month)}/${p.year}`;
}

// Fecha y hora del país con su zona: "2026-10-21T14:03:05-05:00".
export function fechaConZona(ahora = new Date(), codigo = actual) {
  const p = partesFecha(ahora, datosPais(codigo).zona);
  const desfase = (p.timeZoneName || "GMT").replace("GMT", "") || "+00:00";
  return `${p.year}-${p.month}-${p.day}T${p.hour === "24" ? "00" : p.hour}:${p.minute}:${p.second}${desfase}`;
}

function partesFecha(d, zona) {
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: zona, year: "numeric", month: "2-digit", day: "2-digit",
    hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false, timeZoneName: "longOffset"
  }).formatToParts(d);
  return Object.fromEntries(partes.map((x) => [x.type, x.value]));
}

// --- Celular de un cliente (lo que escribe en el pop-up, sin el prefijo) ----------
// Prefijo troncal (0033): en Ecuador, Paraguay, Uruguay y Venezuela el número
// nacional se escribe con un 0 adelante ("099 123 4567"); se quita antes de
// validar y de armar el internacional.
export const PAISES_CERO_INICIAL = ["ec", "py", "uy", "ve"];
export function sinCeroInicial(digitos, codigo) {
  const d = String(digitos ?? "");
  return PAISES_CERO_INICIAL.includes(codigo) && d.startsWith("0") ? d.slice(1) : d;
}

function nacionalValido(d, codigo) {
  const c = datosPais(codigo).celular;
  if (c.nacional) return c.nacional.test(d);
  const total = c.internacional.length + d.length;
  return /^\d+$/.test(d) && total >= 8 && total <= 15;
}

export function celularNacionalValido(digitos, codigo) {
  return nacionalValido(sinCeroInicial(digitos, codigo), codigo);
}

// Número internacional (sin "+") para wa.me y para el lead.
export function celularInternacional(digitos, codigo) {
  return datosPais(codigo).celular.internacional + sinCeroInicial(digitos, codigo);
}

// "1123456789" → "11 2345 6789" (también a medio escribir). Lo que pase de los
// grupos va al final, sin cortar.
export function agruparCelular(digitos, codigo) {
  const d = String(digitos ?? "").replace(/\D/g, "").slice(0, 15);
  const partes = [];
  let i = 0;
  for (const n of datosPais(codigo).celular.grupos) {
    if (i >= d.length) break;
    partes.push(d.slice(i, i + n));
    i += n;
  }
  if (i < d.length) partes.push(d.slice(i));
  return partes.join(" ");
}

// --- WhatsApp de la tienda (formato internacional, sin "+") -----------------------
// El celular del país o, desde 0033, un fijo con WhatsApp Business: el prefijo
// del país y el número, de 8 a 15 dígitos en total, sin el 0 troncal. Como
// whatsapp_valido() del SQL (tests/sql/comparar-paises.mjs lo compara).
export function whatsappValido(numero, codigo) {
  const n = String(numero ?? "");
  const c = datosPais(codigo).celular;
  const prefijo = (PAISES_TIENDA[codigo] || PAISES_TIENDA.co).prefijo;
  if (n[prefijo.length] === "0") return false; // el 0 troncal no va en el formato internacional
  if (n.startsWith(c.internacional) && nacionalValido(n.slice(c.internacional.length), codigo)) return true;
  return /^\d{8,15}$/.test(n) && n.startsWith(prefijo) && n.length > prefijo.length;
}
