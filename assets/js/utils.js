// =============================================================================
// Utilidades compartidas por el sitio y el panel. La única dependencia es
// datos/paises.js (el país de la tienda define los formatos).
// =============================================================================

import { formatearNumero, formatearPrecio, fechaCortaPais } from "./datos/paises.js";

// --- Números y moneda --------------------------------------------------------
// Con el separador de miles del país de la tienda y sin decimales (ver paises.js).
export const formatearMiles = (n) => formatearNumero(n);
export { formatearPrecio };

// "5.299.000", "$ 5299000" o "5,299,000" → 5299000. null si no es un entero > 0.
export function leerPrecio(texto) {
  const limpio = String(texto ?? "").replace(/[\s$.,]/g, "");
  if (!/^\d+$/.test(limpio)) return null;
  const n = Number(limpio);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

// --- Fechas ------------------------------------------------------------------
// D/M/AAAA en la zona horaria del país de la tienda.
export const fechaCorta = (fecha) => fechaCortaPais(fecha);

// --- Texto -------------------------------------------------------------------
export function escaparHTML(texto) {
  return String(texto ?? "").replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c]);
}

export function plural(n, uno, varios) {
  return `${formatearMiles(n)} ${n === 1 ? uno : varios}`;
}

// Formato básico para los textos legales, sin HTML del usuario:
//   ## Título · ### Subtítulo · **negrita** · - viñeta · 1. lista ·
//   [texto](https://…, mailto:… o una ruta relativa como ../cookies/) ·
//   tablas con | (la segunda fila, | --- |, separa el encabezado) · párrafos
export function formatoBasico(texto) {
  const lineas = String(texto ?? "").replace(/\r\n?/g, "\n").split("\n");
  const html = [];
  let lista = null;
  let parrafo = [];
  let tabla = null;

  // Los enlaces externos abren en otra pestaña; los relativos (páginas del
  // mismo sitio), en la misma. Una ruta con otro esquema (javascript:) no es enlace.
  const enLinea = (t) => escaparHTML(t)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+|(?:\.\.?\/|[a-z0-9-]+\/)[^\s):]*)\)/gi,
      (_, txt, url) => /^(https?:|mailto:)/i.test(url)
        ? `<a href="${url}" rel="noopener" target="_blank">${txt}</a>`
        : `<a href="${url}">${txt}</a>`);
  const cerrarParrafo = () => {
    if (parrafo.length) html.push(`<p>${parrafo.map(enLinea).join("<br>")}</p>`);
    parrafo = [];
  };
  const celdas = (l) => l.replace(/^\|/, "").replace(/\|$/, "").split("|").map((c) => c.trim());
  const cerrarTabla = () => {
    if (tabla) {
      const [cab, ...filas] = tabla;
      html.push(`<div class="tabla-legal"><table><thead><tr>${cab.map((c) => `<th scope="col">${enLinea(c)}</th>`).join("")}</tr></thead>`
        + `<tbody>${filas.map((f) => `<tr>${f.map((c, i) => (i === 0 ? `<th scope="row">${enLinea(c)}</th>` : `<td>${enLinea(c)}</td>`)).join("")}</tr>`).join("")}</tbody></table></div>`);
    }
    tabla = null;
  };
  const cerrarLista = () => {
    if (lista) html.push(`<${lista.tipo}>${lista.items.map((i) => `<li>${enLinea(i)}</li>`).join("")}</${lista.tipo}>`);
    lista = null;
  };

  for (const cruda of lineas) {
    const linea = cruda.trim();
    let m;
    if (!linea) { cerrarParrafo(); cerrarLista(); cerrarTabla(); continue; }
    if (linea.startsWith("|")) {
      cerrarParrafo(); cerrarLista();
      if (/^\|(\s*:?-{3,}:?\s*\|)+$/.test(linea)) continue;
      (tabla ??= []).push(celdas(linea));
      continue;
    }
    cerrarTabla();
    if ((m = linea.match(/^(#{2,3})\s+(.*)$/))) {
      cerrarParrafo(); cerrarLista();
      const nivel = m[1].length;
      html.push(`<h${nivel}>${enLinea(m[2])}</h${nivel}>`);
    } else if ((m = linea.match(/^[-*]\s+(.*)$/)) || (m = linea.match(/^\d+[.)]\s+(.*)$/))) {
      cerrarParrafo();
      const tipo = /^\d/.test(linea) ? "ol" : "ul";
      if (lista && lista.tipo !== tipo) cerrarLista();
      if (!lista) lista = { tipo, items: [] };
      lista.items.push(m[1]);
    } else {
      cerrarLista();
      parrafo.push(linea);
    }
  }
  cerrarParrafo(); cerrarLista(); cerrarTabla();
  return html.join("\n");
}

// --- Capacidades -------------------------------------------------------------
export const CAPACIDADES_SUGERIDAS = ["64 GB", "128 GB", "256 GB", "512 GB", "1 TB", "2 TB"];

export function slugCapacidad(capacidad) {
  return String(capacidad).toLowerCase().replace(/\s+/g, "-");
}

// "256-gb" → "256 GB"
export function capacidadDeSlug(slug) {
  const m = String(slug || "").match(/^(\d+)-(gb|tb)$/i);
  return m ? `${m[1]} ${m[2].toUpperCase()}` : "";
}

// Valor en GB para ordenar ("1 TB" = 1024).
export function capacidadEnGB(capacidad) {
  const m = String(capacidad).match(/(\d+(?:[.,]\d+)?)\s*(GB|TB)/i);
  if (!m) return Number.MAX_SAFE_INTEGER;
  const n = Number(m[1].replace(",", "."));
  return m[2].toUpperCase() === "TB" ? n * 1024 : n;
}

// --- Contacto ----------------------------------------------------------------
export function soloDigitos(texto) {
  return String(texto ?? "").replace(/\D/g, "");
}

// El celular del cliente y el WhatsApp de la tienda dependen del país: ver
// celularNacionalValido, agruparCelular y whatsappValido en datos/paises.js.

export function correoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(correo ?? "").trim());
}

// --- Código de cotización ----------------------------------------------------
// "COT-" + 4 caracteres sin O, 0, I ni 1. El alfabeto tiene 32 símbolos, así
// que 256 % 32 = 0 y el sorteo no tiene sesgo.
const ALFABETO_CODIGO = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generarCodigo() {
  const bytes = new Uint8Array(4);
  crypto.getRandomValues(bytes);
  return "COT-" + Array.from(bytes, (b) => ALFABETO_CODIGO[b % ALFABETO_CODIGO.length]).join("");
}

export function codigoValido(codigo) {
  return /^COT-[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{4}$/.test(codigo);
}

// --- Color y contraste (WCAG 2.x) ---------------------------------------------
export function hexValido(hex) {
  return /^#[0-9A-Fa-f]{6}$/.test(String(hex ?? ""));
}

function rgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function hex(r, g, b) {
  return "#" + [r, g, b].map((v) => Math.round(Math.min(255, Math.max(0, v))).toString(16).padStart(2, "0")).join("").toUpperCase();
}

// Mezcla dos colores: t = 0 da "a" y t = 1 da "b".
export function mezclar(a, b, t) {
  const [r1, g1, b1] = rgb(a);
  const [r2, g2, b2] = rgb(b);
  return hex(r1 + (r2 - r1) * t, g1 + (g2 - g1) * t, b1 + (b2 - b1) * t);
}

export function luminancia(color) {
  const [r, g, b] = rgb(color).map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contraste(a, b) {
  const [l1, l2] = [luminancia(a), luminancia(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

// Blanco o casi negro, el que mejor contraste dé sobre el color de fondo.
// Con negro puro, para cualquier color uno de los dos llega al menos a
// √21 ≈ 4,58:1; el casi negro se usa solo si también cumple 4,5:1.
export function textoSobre(fondo) {
  const claro = "#FFFFFF";
  const cBlanco = contraste(fondo, claro);
  for (const oscuro of ["#0B0D12", "#000000"]) {
    const cOscuro = contraste(fondo, oscuro);
    if (Math.max(cBlanco, cOscuro) >= 4.5) return cBlanco >= cOscuro ? claro : oscuro;
  }
  return contraste(fondo, "#000000") >= cBlanco ? "#000000" : claro;
}

// Oscurece o aclara el color hasta llegar a 4,5:1 sobre el fondo, o sobre
// todos los fondos si se pasa una lista (para usarlo como texto o enlace).
// Si ya cumple, lo devuelve igual. Los fondos de una lista deben ser todos
// claros o todos oscuros.
// Si en esa dirección no alcanza (fondos de luminancia media, como #777777),
// prueba la otra; y si ninguna alcanza, el polo con más contraste.
export function ajustarParaTexto(color, fondos, minimo = 4.5) {
  const lista = [].concat(fondos);
  const cumple = (c) => lista.every((f) => contraste(c, f) >= minimo);
  if (cumple(color)) return color.toUpperCase();
  const [r, g, b] = rgb(color);
  const negro = [0, 0, 0];
  const blanco = [255, 255, 255];
  const direcciones = luminancia(lista[0]) > 0.5 ? [negro, blanco] : [blanco, negro];
  for (const hacia of direcciones) {
    for (let t = 0.05; t <= 1.0001; t += 0.05) {
      const c = hex(r + (hacia[0] - r) * t, g + (hacia[1] - g) * t, b + (hacia[2] - b) * t);
      if (cumple(c)) return c;
    }
  }
  const peor = (c) => Math.min(...lista.map((f) => contraste(c, f)));
  return peor("#000000") >= peor("#FFFFFF") ? "#000000" : "#FFFFFF";
}

// --- Almacenamiento seguro (modo privado, cookies bloqueadas) -----------------
export const sesion = {
  leer(clave) { try { return sessionStorage.getItem(clave); } catch { return null; } },
  guardar(clave, valor) { try { sessionStorage.setItem(clave, valor); } catch { /* sin almacenamiento */ } },
  borrar(clave) { try { sessionStorage.removeItem(clave); } catch { /* sin almacenamiento */ } }
};

// --- Varios ------------------------------------------------------------------
export function seguro(fn, nombre) {
  try {
    const r = fn();
    if (r && typeof r.catch === "function") r.catch((e) => console.error(`[${nombre}]`, e));
    return r;
  } catch (e) {
    console.error(`[${nombre}]`, e);
    return undefined;
  }
}

export function reducirMovimiento() {
  return window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
}

export function esperar(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

export function idEvento() {
  return (crypto.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(16).slice(2)}`);
}
