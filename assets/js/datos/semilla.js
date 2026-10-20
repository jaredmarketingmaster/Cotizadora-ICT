// =============================================================================
// Semilla del adaptador demo (localStorage). Es la misma de las migraciones
// 0006_catalogo_colores.sql (catálogo y colores) y 0003_demo.sql (equipos
// demo): tests/sql/probar.sh revisa que coincidan.
//
// Catálogo y colores: fuente única, el inventario de Jared (desde el iPhone 7)
// y sus archivos complementarios. Nada se completó de memoria: lo que la
// fuente no da (nombre en inglés o hexadecimal) queda vacío ("").
// =============================================================================

export function slugDe(texto) {
  return texto.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

// En orden de lanzamiento. "orden" va de 10 en 10 para poder intercalar.
export const CATALOGO = [
  { nombre: "iPhone 7", slug: "iphone-7", generacion: "7", orden: 10 },
  { nombre: "iPhone 7 Plus", slug: "iphone-7-plus", generacion: "7", orden: 20 },
  { nombre: "iPhone 8", slug: "iphone-8", generacion: "8", orden: 30 },
  { nombre: "iPhone 8 Plus", slug: "iphone-8-plus", generacion: "8", orden: 40 },
  { nombre: "iPhone X", slug: "iphone-x", generacion: "8", orden: 50 },
  { nombre: "iPhone XS", slug: "iphone-xs", generacion: "XS y XR", orden: 60 },
  { nombre: "iPhone XS Max", slug: "iphone-xs-max", generacion: "XS y XR", orden: 70 },
  { nombre: "iPhone XR", slug: "iphone-xr", generacion: "XS y XR", orden: 80 },
  { nombre: "iPhone 11", slug: "iphone-11", generacion: "11", orden: 90 },
  { nombre: "iPhone 11 Pro", slug: "iphone-11-pro", generacion: "11", orden: 100 },
  { nombre: "iPhone 11 Pro Max", slug: "iphone-11-pro-max", generacion: "11", orden: 110 },
  { nombre: "iPhone SE (2.ª generación)", slug: "iphone-se-2", generacion: "11", orden: 120 },
  { nombre: "iPhone 12 mini", slug: "iphone-12-mini", generacion: "12", orden: 130 },
  { nombre: "iPhone 12", slug: "iphone-12", generacion: "12", orden: 140 },
  { nombre: "iPhone 12 Pro", slug: "iphone-12-pro", generacion: "12", orden: 150 },
  { nombre: "iPhone 12 Pro Max", slug: "iphone-12-pro-max", generacion: "12", orden: 160 },
  { nombre: "iPhone 13 mini", slug: "iphone-13-mini", generacion: "13", orden: 170 },
  { nombre: "iPhone 13", slug: "iphone-13", generacion: "13", orden: 180 },
  { nombre: "iPhone 13 Pro", slug: "iphone-13-pro", generacion: "13", orden: 190 },
  { nombre: "iPhone 13 Pro Max", slug: "iphone-13-pro-max", generacion: "13", orden: 200 },
  { nombre: "iPhone SE (3.ª generación)", slug: "iphone-se-3", generacion: "13", orden: 210 },
  { nombre: "iPhone 14", slug: "iphone-14", generacion: "14", orden: 220 },
  { nombre: "iPhone 14 Plus", slug: "iphone-14-plus", generacion: "14", orden: 230 },
  { nombre: "iPhone 14 Pro", slug: "iphone-14-pro", generacion: "14", orden: 240 },
  { nombre: "iPhone 14 Pro Max", slug: "iphone-14-pro-max", generacion: "14", orden: 250 },
  { nombre: "iPhone 15", slug: "iphone-15", generacion: "15", orden: 260 },
  { nombre: "iPhone 15 Plus", slug: "iphone-15-plus", generacion: "15", orden: 270 },
  { nombre: "iPhone 15 Pro", slug: "iphone-15-pro", generacion: "15", orden: 280 },
  { nombre: "iPhone 15 Pro Max", slug: "iphone-15-pro-max", generacion: "15", orden: 290 },
  { nombre: "iPhone 16", slug: "iphone-16", generacion: "16", orden: 300 },
  { nombre: "iPhone 16 Plus", slug: "iphone-16-plus", generacion: "16", orden: 310 },
  { nombre: "iPhone 16 Pro", slug: "iphone-16-pro", generacion: "16", orden: 320 },
  { nombre: "iPhone 16 Pro Max", slug: "iphone-16-pro-max", generacion: "16", orden: 330 },
  { nombre: "iPhone 16e", slug: "iphone-16e", generacion: "16", orden: 340 },
  { nombre: "iPhone 17", slug: "iphone-17", generacion: "17", orden: 350 },
  { nombre: "iPhone Air", slug: "iphone-air", generacion: "17", orden: 360 },
  { nombre: "iPhone 17 Pro", slug: "iphone-17-pro", generacion: "17", orden: 370 },
  { nombre: "iPhone 17 Pro Max", slug: "iphone-17-pro-max", generacion: "17", orden: 380 },
  { nombre: "iPhone 17e", slug: "iphone-17e", generacion: "17", orden: 390 },
  { nombre: "iPhone 18 Pro", slug: "iphone-18-pro", generacion: "18", orden: 400 },
  { nombre: "iPhone 18 Pro Max", slug: "iphone-18-pro-max", generacion: "18", orden: 410 },
  { nombre: "iPhone Duo", slug: "iphone-duo", generacion: "Plegable", orden: 420 }
];

// Colores oficiales por modelo, en el orden de la fuente: [nombre_es, nombre_en, hex].
// Sin colores en la fuente: iPhone 17 Pro y 17 Pro Max (la tienda puede
// agregar los suyos desde el Catálogo).
export const COLORES = {
  "iphone-7": [["Negro brillante", "Jet Black", ""], ["Negro", "Black", ""], ["Plata", "Silver", ""], ["Oro", "Gold", ""], ["Oro rosa", "Rose Gold", ""], ["(PRODUCT)RED", "(PRODUCT)RED", ""]],
  "iphone-7-plus": [["Negro brillante", "Jet Black", ""], ["Negro", "Black", ""], ["Plata", "Silver", ""], ["Oro", "Gold", ""], ["Oro rosa", "Rose Gold", ""], ["(PRODUCT)RED", "(PRODUCT)RED", ""]],
  "iphone-8": [["Plata", "Silver", ""], ["Gris espacial", "Space Gray", ""], ["Oro", "Gold", ""], ["(PRODUCT)RED", "(PRODUCT)RED", ""]],
  "iphone-8-plus": [["Plata", "Silver", ""], ["Gris espacial", "Space Gray", ""], ["Oro", "Gold", ""], ["(PRODUCT)RED", "(PRODUCT)RED", ""]],
  "iphone-x": [["Gris espacial", "Space Gray", ""], ["Plata", "Silver", ""]],
  "iphone-xs": [["Oro", "Gold", ""], ["Gris espacial", "Space Gray", ""], ["Plata", "Silver", ""]],
  "iphone-xs-max": [["Oro", "Gold", ""], ["Gris espacial", "Space Gray", ""], ["Plata", "Silver", ""]],
  "iphone-xr": [["Negro", "Black", ""], ["Blanco", "White", ""], ["Azul", "Blue", ""], ["Amarillo", "Yellow", ""], ["Coral", "Coral", ""], ["(PRODUCT)RED", "(PRODUCT)RED", ""]],
  "iphone-11": [["Negro", "Black", ""], ["Verde", "Green", ""], ["Amarillo", "Yellow", ""], ["Morado", "Purple", ""], ["(PRODUCT)RED", "(PRODUCT)RED", ""], ["Blanco", "White", ""]],
  "iphone-11-pro": [["Gris espacial", "Space Gray", ""], ["Plata", "Silver", ""], ["Verde noche", "Midnight Green", ""], ["Oro", "Gold", ""]],
  "iphone-11-pro-max": [["Gris espacial", "Space Gray", ""], ["Plata", "Silver", ""], ["Verde noche", "Midnight Green", ""], ["Oro", "Gold", ""]],
  "iphone-se-2": [["Blanco", "White", ""], ["Negro", "Black", ""], ["(PRODUCT)RED", "(PRODUCT)RED", ""]],
  "iphone-12-mini": [["Negro", "Black", ""], ["Blanco", "White", ""], ["(PRODUCT)RED", "(PRODUCT)RED", ""], ["Verde", "Green", ""], ["Azul", "Blue", ""], ["Púrpura", "Purple", ""]],
  "iphone-12": [["Negro", "Black", ""], ["Blanco", "White", ""], ["(PRODUCT)RED", "(PRODUCT)RED", ""], ["Verde", "Green", ""], ["Azul", "Blue", ""], ["Púrpura", "Purple", ""]],
  "iphone-12-pro": [["Grafito", "Graphite", ""], ["Plata", "Silver", ""], ["Oro", "Gold", ""], ["Azul pacífico", "Pacific Blue", ""]],
  "iphone-12-pro-max": [["Grafito", "Graphite", ""], ["Plata", "Silver", ""], ["Oro", "Gold", ""], ["Azul pacífico", "Pacific Blue", ""]],
  "iphone-13-mini": [["Blanco estelar", "Starlight", ""], ["Medianoche", "Midnight", ""], ["Azul", "Blue", ""], ["Rosa", "Pink", ""], ["(PRODUCT)RED", "(PRODUCT)RED", ""], ["Verde", "Green", ""]],
  "iphone-13": [["Blanco estelar", "Starlight", ""], ["Medianoche", "Midnight", ""], ["Azul", "Blue", ""], ["Rosa", "Pink", ""], ["(PRODUCT)RED", "(PRODUCT)RED", ""], ["Verde", "Green", ""]],
  "iphone-13-pro": [["Grafito", "Graphite", ""], ["Oro", "Gold", ""], ["Plata", "Silver", ""], ["Azul sierra", "Sierra Blue", ""], ["Verde alpino", "Alpine Green", ""]],
  "iphone-13-pro-max": [["Grafito", "Graphite", ""], ["Oro", "Gold", ""], ["Plata", "Silver", ""], ["Azul sierra", "Sierra Blue", ""], ["Verde alpino", "Alpine Green", ""]],
  "iphone-se-3": [["Medianoche", "Midnight", ""], ["Blanco estelar", "Starlight", ""], ["(PRODUCT)RED", "(PRODUCT)RED", ""]],
  "iphone-14": [["Medianoche", "Midnight", ""], ["Blanco estelar", "Starlight", ""], ["Azul", "Blue", ""], ["Púrpura", "Purple", ""], ["(PRODUCT)RED", "(PRODUCT)RED", ""], ["Amarillo", "Yellow", ""]],
  "iphone-14-plus": [["Medianoche", "Midnight", ""], ["Blanco estelar", "Starlight", ""], ["Azul", "Blue", ""], ["Púrpura", "Purple", ""], ["(PRODUCT)RED", "(PRODUCT)RED", ""], ["Amarillo", "Yellow", ""]],
  "iphone-14-pro": [["Negro espacial", "Space Black", ""], ["Plata", "Silver", ""], ["Oro", "Gold", ""], ["Morado oscuro", "Deep Purple", ""]],
  "iphone-14-pro-max": [["Negro espacial", "Space Black", ""], ["Plata", "Silver", ""], ["Oro", "Gold", ""], ["Morado oscuro", "Deep Purple", ""]],
  "iphone-15": [["Negro", "Black", ""], ["Azul", "Blue", ""], ["Verde", "Green", ""], ["Amarillo", "Yellow", ""], ["Rosa", "Pink", ""]],
  "iphone-15-plus": [["Negro", "Black", ""], ["Azul", "Blue", ""], ["Verde", "Green", ""], ["Amarillo", "Yellow", ""], ["Rosa", "Pink", ""]],
  "iphone-15-pro": [["Titanio negro", "Black Titanium", ""], ["Titanio blanco", "White Titanium", ""], ["Titanio azul", "Blue Titanium", ""], ["Titanio natural", "Natural Titanium", ""]],
  "iphone-15-pro-max": [["Titanio negro", "Black Titanium", ""], ["Titanio blanco", "White Titanium", ""], ["Titanio azul", "Blue Titanium", ""], ["Titanio natural", "Natural Titanium", ""]],
  "iphone-16": [["Negro", "Black", "#2C2D30"], ["Blanco", "White", "#F5F6F8"], ["Rosa", "Pink", "#EEA7B7"], ["Verde azulado", "Teal", "#87B4A8"], ["Azul ultramar", "Ultramarine", "#546CA3"]],
  "iphone-16-plus": [["Negro", "Black", "#2C2D30"], ["Blanco", "White", "#F5F6F8"], ["Rosa", "Pink", "#EEA7B7"], ["Verde azulado", "Teal", "#87B4A8"], ["Azul ultramar", "Ultramarine", "#546CA3"]],
  "iphone-16-pro": [["Titanio negro", "Black Titanium", ""], ["Titanio blanco", "White Titanium", ""], ["Titanio natural", "Natural Titanium", ""], ["Titanio del desierto", "Desert Titanium", ""]],
  "iphone-16-pro-max": [["Titanio negro", "Black Titanium", ""], ["Titanio blanco", "White Titanium", ""], ["Titanio natural", "Natural Titanium", ""], ["Titanio del desierto", "Desert Titanium", ""]],
  "iphone-16e": [["Negro", "Black", "#2C2D30"], ["Blanco", "White", "#F5F6F8"]],
  "iphone-17": [["Lavanda", "Lavender", "#C6BFE6"], ["Verde salvia", "Sage Green", "#9BADA1"], ["Azul niebla", "Mist Blue", "#90A5BB"], ["Blanco", "", "#F5F6F8"], ["Negro", "", "#2C2D30"]],
  "iphone-air": [["Azul cielo", "Sky Blue", "#A1C6DB"], ["Dorado claro", "Light Gold", "#EBD5A9"], ["Blanco de nube", "Cloud White", "#F4F5F0"], ["Negro espacial", "Space Black", "#333333"]],
  "iphone-17-pro": [],
  "iphone-17-pro-max": [],
  "iphone-17e": [["Negro", "", "#2C2D30"], ["Blanco", "", "#F5F6F8"], ["Rosa pálido", "Soft Pink", "#EBCBD2"]],
  "iphone-18-pro": [["Negro", "", "#1C1C1E"], ["Visón", "", ""], ["Oliva", "", ""], ["Azul nítido", "", ""], ["Magenta", "", ""], ["Borgoña", "Burgundy", "#632432"], ["Glaciar", "Glacier Blue", "#B9C6D2"], ["Plata", "", "#E3E4E6"]],
  "iphone-18-pro-max": [["Negro", "", "#1C1C1E"], ["Visón", "", ""], ["Oliva", "", ""], ["Azul nítido", "", ""], ["Magenta", "", ""], ["Borgoña", "Burgundy", "#632432"], ["Glaciar", "Glacier Blue", "#B9C6D2"], ["Plata", "", "#E3E4E6"]],
  "iphone-duo": [["Titanio", "", ""]]
};

// Precios redondos de ejemplo: NO son precios reales.
export const DEMO_EQUIPOS = [
  { slug: "iphone-18-pro-max", condicion: "nuevo", capacidad: "256 GB", color_nombre: "Negro", color_hex: "#1C1C1E", precio: 6000000, en_stock: true, destacado: true },
  { slug: "iphone-18-pro-max", condicion: "nuevo", capacidad: "256 GB", color_nombre: "Plata", color_hex: "#D9DADC", precio: 6200000, en_stock: true, destacado: true },
  { slug: "iphone-18-pro-max", condicion: "nuevo", capacidad: "512 GB", color_nombre: "Burgundy", color_hex: "#6E1F2E", precio: 7000000, en_stock: true, destacado: false },
  { slug: "iphone-18-pro", condicion: "nuevo", capacidad: "256 GB", color_nombre: "Glacier", color_hex: "#CFE0EA", precio: 5500000, en_stock: true, destacado: false },
  { slug: "iphone-15-pro", condicion: "usado", capacidad: "128 GB", color_nombre: "Titanio natural", color_hex: "#BAB4A9", precio: 3000000, en_stock: true, destacado: false,
    bateria_porcentaje: 88, estado_estetico: "Excelente", detalles: "Rayón leve en el marco", incluye: "Caja y cable" },
  { slug: "iphone-13", condicion: "usado", capacidad: "128 GB", color_nombre: "Medianoche", color_hex: "#232A31", precio: 1800000, en_stock: true, destacado: false,
    bateria_porcentaje: 84, estado_estetico: "Muy bueno", detalles: "", incluye: "Solo el equipo" }
];
