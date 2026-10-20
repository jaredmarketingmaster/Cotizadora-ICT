// =============================================================================
// Semilla del adaptador demo (localStorage). Es la misma de
// supabase/migrations/0002_catalogo.sql y 0003_demo.sql: tests/sql/probar.sh
// revisa que coincidan.
// =============================================================================

const NOMBRES = [
  "iPhone 11", "iPhone 11 Pro", "iPhone 11 Pro Max",
  "iPhone 12 mini", "iPhone 12", "iPhone 12 Pro", "iPhone 12 Pro Max",
  "iPhone 13 mini", "iPhone 13", "iPhone 13 Pro", "iPhone 13 Pro Max",
  "iPhone 14", "iPhone 14 Plus", "iPhone 14 Pro", "iPhone 14 Pro Max",
  "iPhone 15", "iPhone 15 Plus", "iPhone 15 Pro", "iPhone 15 Pro Max",
  "iPhone 16e", "iPhone 16", "iPhone 16 Plus", "iPhone 16 Pro", "iPhone 16 Pro Max",
  "iPhone 17e", "iPhone 17", "iPhone Air", "iPhone 17 Pro", "iPhone 17 Pro Max",
  "iPhone 18 Pro", "iPhone 18 Pro Max",
  "iPhone Duo"
];

function generacionDe(nombre) {
  if (nombre === "iPhone Air") return "17";
  if (nombre === "iPhone Duo") return "Plegable";
  return nombre.match(/\d+/)[0];
}

export function slugDe(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

export const CATALOGO = NOMBRES.map((nombre, i) => ({
  nombre,
  slug: slugDe(nombre),
  generacion: generacionDe(nombre),
  orden: (i + 1) * 10
}));

// Precios redondos de ejemplo: NO son precios reales.
export const DEMO_EQUIPOS = [
  { slug: "iphone-18-pro-max", condicion: "nuevo", capacidad: "256 GB", color_nombre: "Negro", color_hex: "#1C1C1E", precio: 6000000, stock: 3, destacado: true },
  { slug: "iphone-18-pro-max", condicion: "nuevo", capacidad: "256 GB", color_nombre: "Plata", color_hex: "#D9DADC", precio: 6200000, stock: 2, destacado: true },
  { slug: "iphone-18-pro-max", condicion: "nuevo", capacidad: "512 GB", color_nombre: "Burgundy", color_hex: "#6E1F2E", precio: 7000000, stock: 1, destacado: false },
  { slug: "iphone-18-pro", condicion: "nuevo", capacidad: "256 GB", color_nombre: "Glacier", color_hex: "#CFE0EA", precio: 5500000, stock: 2, destacado: false },
  { slug: "iphone-15-pro", condicion: "usado", capacidad: "128 GB", color_nombre: "Titanio natural", color_hex: "#BAB4A9", precio: 3000000, stock: 1, destacado: false,
    bateria_porcentaje: 88, estado_estetico: "Excelente", detalles: "Rayón leve en el marco", incluye: "Caja y cable" },
  { slug: "iphone-13", condicion: "usado", capacidad: "128 GB", color_nombre: "Medianoche", color_hex: "#232A31", precio: 1800000, stock: 1, destacado: false,
    bateria_porcentaje: 84, estado_estetico: "Muy bueno", detalles: "", incluye: "Solo el equipo" }
];
