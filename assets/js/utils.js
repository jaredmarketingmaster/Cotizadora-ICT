// =============================================================================
// Utilidades compartidas por el sitio y el panel. Sin dependencias.
// =============================================================================

// --- Números y moneda --------------------------------------------------------
// Formato colombiano: punto de miles, sin decimales. No se usa Intl porque en
// "es" puede no agrupar los números de 4 cifras.
export function formatearMiles(n) {
  const entero = Math.round(Number(n) || 0);
  const signo = entero < 0 ? "-" : "";
  return signo + String(Math.abs(entero)).replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

export function formatearCOP(n) {
  return "$" + formatearMiles(n);
}

// "5.299.000", "$ 5299000" o "5,299,000" → 5299000. null si no es un entero > 0.
export function leerPrecio(texto) {
  const limpio = String(texto ?? "").replace(/[\s$.,]/g, "");
  if (!/^\d+$/.test(limpio)) return null;
  const n = Number(limpio);
  return Number.isSafeInteger(n) && n > 0 ? n : null;
}

// --- Fechas ------------------------------------------------------------------
// D/M/AAAA en hora de Colombia.
export function fechaCorta(fecha) {
  if (!fecha) return "";
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return "";
  const partes = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Bogota", day: "numeric", month: "numeric", year: "numeric"
  }).formatToParts(d);
  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]));
  return `${p.day}/${p.month}/${p.year}`;
}

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
//   ## Título · **negrita** · - viñeta · 1. lista · [texto](https://…) · párrafos
export function formatoBasico(texto) {
  const lineas = String(texto ?? "").replace(/\r\n?/g, "\n").split("\n");
  const html = [];
  let lista = null;
  let parrafo = [];

  const enLinea = (t) => escaparHTML(t)
    .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
    .replace(/\[([^\]]+)\]\((https?:\/\/[^\s)]+|mailto:[^\s)]+)\)/g,
      '<a href="$2" rel="noopener" target="_blank">$1</a>');
  const cerrarParrafo = () => {
    if (parrafo.length) html.push(`<p>${parrafo.map(enLinea).join("<br>")}</p>`);
    parrafo = [];
  };
  const cerrarLista = () => {
    if (lista) html.push(`<${lista.tipo}>${lista.items.map((i) => `<li>${enLinea(i)}</li>`).join("")}</${lista.tipo}>`);
    lista = null;
  };

  for (const cruda of lineas) {
    const linea = cruda.trim();
    let m;
    if (!linea) { cerrarParrafo(); cerrarLista(); continue; }
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
  cerrarParrafo(); cerrarLista();
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

// Celular colombiano: 10 dígitos que empiezan por 3.
export function celularValido(digitos) {
  return /^3\d{9}$/.test(digitos);
}

// "3001234567" → "300 123 4567" (también con el número a medio escribir)
export function formatearCelular(digitos) {
  const d = soloDigitos(digitos).slice(0, 10);
  return [d.slice(0, 3), d.slice(3, 6), d.slice(6)].filter(Boolean).join(" ");
}

export function correoValido(correo) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(correo ?? "").trim());
}

// WhatsApp de la tienda: 12 dígitos que empiezan por 57.
export function whatsappTiendaValido(numero) {
  return /^57\d{10}$/.test(String(numero ?? ""));
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

// Oscurece o aclara el color hasta llegar a 4,5:1 sobre el fondo (para usarlo
// como texto o borde de enfoque). Si ya cumple, lo devuelve igual.
export function ajustarParaTexto(color, fondo, minimo = 4.5) {
  if (contraste(color, fondo) >= minimo) return color.toUpperCase();
  const hacia = luminancia(fondo) > 0.5 ? [0, 0, 0] : [255, 255, 255];
  const [r, g, b] = rgb(color);
  for (let t = 0.05; t <= 1; t += 0.05) {
    const c = hex(r + (hacia[0] - r) * t, g + (hacia[1] - g) * t, b + (hacia[2] - b) * t);
    if (contraste(c, fondo) >= minimo) return c;
  }
  return hacia[0] === 0 ? "#000000" : "#FFFFFF";
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
