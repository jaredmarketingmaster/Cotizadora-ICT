// =============================================================================
// Semilla del adaptador demo (localStorage). Es la misma de las migraciones
// 0006_catalogo_colores.sql (catálogo y colores) y 0003_demo.sql (equipos
// demo): tests/sql/probar.sh revisa que coincidan.
//
// Catálogo y colores: fuente única, el inventario de Jared (desde el iPhone 7)
// y sus archivos complementarios. Nada se completó de memoria: lo que la
// fuente no da (nombre en inglés o hexadecimal) queda vacío ("").
//
// Fichas técnicas (FICHAS): las mismas de 0012_fichas.sql, también solo de la
// fuente.
// =============================================================================

import { CATEGORIAS_FICHA } from "./comun.js";

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

// Fichas técnicas de la fuente (archivos de Jared: el HTML del inventario para
// el iPhone 7 al 16 Pro Max e info_complementaria.md para el resto). Cada fila es
// [clave, valor] de una categoría fija (CATEGORIAS_FICHA) o [null, valor, etiqueta].
// Lo que la fuente no trae no está: la batería en todos, y lo que se anota en
// la sección 17 de DOCUMENTACION.md. 0012_fichas.sql tiene lo mismo.
export const FICHAS = {
  "iphone-7": [
    ["lanzamiento", "Septiembre 2016"],
    ["procesador", "Apple A10 Fusion\n(4 núcleos CPU, 64-bit)\nCoprocesador M10"],
    ["pantalla", "4.7\" Retina HD (LCD IPS)\n1334 × 750 px (326 ppi)\n60 Hz\nGama P3, 3D Touch"],
    ["camaras_traseras", "12 MP (f/1.8, OIS)\nZoom: Digital hasta 5x (sin zoom óptico)"],
    ["camara_frontal", "7 MP FaceTime HD (f/2.2)"],
    ["versiones", "32 GB\n128 GB\n256 GB"],
    ["materiales", "Carcasa unibody de aluminio serie 7000\nFrontal de vidrio reforzado\nIP67"],
    ["puertos", "Conector Lightning\nCarga por cable (5W)\nSin carga inalámbrica\nSin MagSafe"],
    ["dimensiones", "138.3 × 67.1 × 7.1 mm\n138 g"]
  ],
  "iphone-7-plus": [
    ["lanzamiento", "Septiembre 2016"],
    ["procesador", "Apple A10 Fusion\n(4 núcleos CPU, 64-bit)\nCoprocesador M10"],
    ["pantalla", "5.5\" Retina HD (LCD IPS)\n1920 × 1080 px (401 ppi)\n60 Hz\nGama P3, 3D Touch"],
    ["camaras_traseras", "Trasera doble:\n• Principal: 12 MP (f/1.8, OIS)\n• Teleobjetivo: 12 MP (f/2.8)\nZoom: Óptico 2x hacia adentro; digital hasta 10x"],
    ["camara_frontal", "7 MP FaceTime HD (f/2.2)"],
    ["versiones", "32 GB\n128 GB\n256 GB"],
    ["materiales", "Carcasa unibody de aluminio serie 7000\nFrontal de vidrio reforzado\nIP67"],
    ["puertos", "Conector Lightning\nCarga por cable (5W)\nSin carga inalámbrica\nSin MagSafe"],
    ["dimensiones", "158.2 × 77.9 × 7.3 mm\n188 g"]
  ],
  "iphone-8": [
    ["lanzamiento", "Septiembre 2017"],
    ["procesador", "Apple A11 Bionic\n(6 núcleos CPU: 2 + 4)\nNeural Engine (2 núcleos)"],
    ["pantalla", "4.7\" Retina HD (LCD IPS)\n1334 × 750 px (326 ppi)\n60 Hz\nTrue Tone, 3D Touch"],
    ["camaras_traseras", "12 MP (f/1.8, OIS)\nZoom: Digital hasta 5x (sin zoom óptico)"],
    ["camara_frontal", "7 MP FaceTime HD (f/2.2)"],
    ["versiones", "64 GB\n128 GB\n256 GB"],
    ["materiales", "Marco de aluminio serie 7000 aeroespacial\nParte trasera de vidrio\nFrontal de vidrio\nIP67"],
    ["puertos", "Conector Lightning\nCarga rápida por cable (hasta 50% en 30 min)\nCarga inalámbrica Qi (7.5W)\nSin MagSafe"],
    ["dimensiones", "138.4 × 67.3 × 7.3 mm\n148 g"]
  ],
  "iphone-8-plus": [
    ["lanzamiento", "Septiembre 2017"],
    ["procesador", "Apple A11 Bionic\n(6 núcleos CPU: 2 + 4)\nNeural Engine (2 núcleos)"],
    ["pantalla", "5.5\" Retina HD (LCD IPS)\n1920 × 1080 px (401 ppi)\n60 Hz\nTrue Tone, 3D Touch"],
    ["camaras_traseras", "Trasera doble:\n• Principal: 12 MP (f/1.8, OIS)\n• Teleobjetivo: 12 MP (f/2.8)\nZoom: Óptico 2x hacia adentro; digital hasta 10x"],
    ["camara_frontal", "7 MP FaceTime HD (f/2.2)"],
    ["versiones", "64 GB\n128 GB\n256 GB"],
    ["materiales", "Marco de aluminio serie 7000 aeroespacial\nParte trasera de vidrio\nFrontal de vidrio\nIP67"],
    ["puertos", "Conector Lightning\nCarga rápida por cable\nCarga inalámbrica Qi (7.5W)\nSin MagSafe"],
    ["dimensiones", "158.4 × 78.1 × 7.5 mm\n202 g"]
  ],
  "iphone-x": [
    ["lanzamiento", "Septiembre 2017"],
    ["procesador", "Apple A11 Bionic\n(6 núcleos CPU)\nNeural Engine (2 núcleos)"],
    ["pantalla", "5.8\" Super Retina HD (OLED)\n2436 × 1125 px (458 ppi)\n60 Hz\nHDR, True Tone, 3D Touch"],
    ["camaras_traseras", "Trasera doble:\n• Principal: 12 MP (f/1.8, OIS)\n• Teleobjetivo: 12 MP (f/2.4, OIS dual)\nZoom: Óptico 2x hacia adentro; digital hasta 10x"],
    ["camara_frontal", "7 MP TrueDepth (f/2.2)"],
    ["versiones", "64 GB\n256 GB"],
    ["materiales", "Marco de acero inoxidable de grado quirúrgico\nParte trasera de vidrio\nIP67"],
    ["puertos", "Conector Lightning\nCarga rápida por cable\nCarga inalámbrica Qi (7.5W)\nSin MagSafe"],
    ["dimensiones", "143.6 × 70.9 × 7.7 mm\n174 g"]
  ],
  "iphone-xs": [
    ["lanzamiento", "Septiembre 2018"],
    ["procesador", "Apple A12 Bionic\n(7 nm, 6 núcleos CPU, GPU 4 núcleos)\nNeural Engine (8 núcleos)"],
    ["pantalla", "5.8\" Super Retina HD (OLED)\n2436 × 1125 px (458 ppi)\n60 Hz\nHDR10, Dolby Vision, 3D Touch"],
    ["camaras_traseras", "Trasera doble:\n• Principal: 12 MP (f/1.8, OIS)\n• Teleobjetivo: 12 MP (f/2.4, OIS dual)\nZoom: Óptico 2x hacia adentro; digital hasta 10x"],
    ["camara_frontal", "7 MP TrueDepth (f/2.2)"],
    ["versiones", "64 GB\n256 GB\n512 GB"],
    ["materiales", "Marco de acero inoxidable quirúrgico\nParte trasera de vidrio\nIP68 (hasta 2 m por 30 min)"],
    ["puertos", "Conector Lightning\nCarga rápida por cable\nCarga inalámbrica Qi (7.5W)\nSin MagSafe"],
    ["dimensiones", "143.6 × 70.9 × 7.7 mm\n177 g"]
  ],
  "iphone-xs-max": [
    ["lanzamiento", "Septiembre 2018"],
    ["procesador", "Apple A12 Bionic\n(7 nm, 6 núcleos CPU, GPU 4 núcleos)\nNeural Engine (8 núcleos)"],
    ["pantalla", "6.5\" Super Retina HD (OLED)\n2688 × 1242 px (458 ppi)\n60 Hz\nHDR10, Dolby Vision, 3D Touch"],
    ["camaras_traseras", "Trasera doble:\n• Principal: 12 MP (f/1.8, OIS)\n• Teleobjetivo: 12 MP (f/2.4, OIS dual)\nZoom: Óptico 2x hacia adentro; digital hasta 10x"],
    ["camara_frontal", "7 MP TrueDepth (f/2.2)"],
    ["versiones", "64 GB\n256 GB\n512 GB"],
    ["materiales", "Marco de acero inoxidable quirúrgico\nParte trasera de vidrio\nIP68 (hasta 2 m por 30 min)"],
    ["puertos", "Conector Lightning\nCarga rápida por cable\nCarga inalámbrica Qi (7.5W)\nSin MagSafe"],
    ["dimensiones", "157.5 × 77.4 × 7.7 mm\n208 g"]
  ],
  "iphone-xr": [
    ["lanzamiento", "Septiembre 2018"],
    ["procesador", "Apple A12 Bionic\n(7 nm, 6 núcleos CPU, GPU 4 núcleos)\nNeural Engine (8 núcleos)"],
    ["pantalla", "6.1\" Liquid Retina HD (LCD IPS)\n1792 × 828 px (326 ppi)\n60 Hz\nTrue Tone, Haptic Touch"],
    ["camaras_traseras", "12 MP (f/1.8, OIS)\nZoom: Digital hasta 5x (sin zoom óptico)"],
    ["camara_frontal", "7 MP TrueDepth (f/2.2)"],
    ["versiones", "64 GB\n128 GB\n256 GB"],
    ["materiales", "Marco de aluminio serie 7000 aeroespacial\nParte trasera de vidrio\nIP67 (hasta 1 m por 30 min)"],
    ["puertos", "Conector Lightning\nCarga rápida por cable\nCarga inalámbrica Qi (7.5W)\nSin MagSafe"],
    ["dimensiones", "150.9 × 75.7 × 8.3 mm\n194 g"]
  ],
  "iphone-11": [
    ["lanzamiento", "Septiembre 2019"],
    ["procesador", "Apple A13 Bionic\n(7 nm+, 6 núcleos CPU, GPU 4 núcleos)\nNeural Engine (8 núcleos)"],
    ["pantalla", "6.1\" Liquid Retina HD (LCD IPS)\n1792 × 828 px (326 ppi)\n60 Hz\nTrue Tone, Haptic Touch"],
    ["camaras_traseras", "Trasera doble:\n• Principal: 12 MP (f/1.8, OIS)\n• Ultra gran angular: 12 MP (f/2.4, 120°)\nZoom: Óptico 2x hacia afuera (0.5x); digital hasta 5x"],
    ["camara_frontal", "12 MP TrueDepth (f/2.2)"],
    ["versiones", "64 GB\n128 GB\n256 GB"],
    ["materiales", "Marco de aluminio de grado aeroespacial\nParte trasera de vidrio brillante\nIP68 (hasta 2 m por 30 min)"],
    ["puertos", "Conector Lightning\nCarga rápida por cable (18W+)\nCarga inalámbrica Qi (7.5W)\nSin MagSafe"],
    ["dimensiones", "150.9 × 75.7 × 8.3 mm\n194 g"]
  ],
  "iphone-11-pro": [
    ["lanzamiento", "Septiembre 2019"],
    ["procesador", "Apple A13 Bionic\n(7 nm+, 6 núcleos CPU, GPU 4 núcleos)\nNeural Engine (8 núcleos)"],
    ["pantalla", "5.8\" Super Retina XDR (OLED)\n2436 × 1125 px (458 ppi)\n60 Hz\nBrillo máx. 800 nits / pico 1,200 nits"],
    ["camaras_traseras", "Trasera triple:\n• Principal: 12 MP (f/1.8, OIS)\n• Ultra gran angular: 12 MP (f/2.4, 120°)\n• Teleobjetivo: 12 MP (f/2.0, OIS)\nZoom: Óptico 2x hacia adentro, 2x hacia afuera (rango 4x); digital hasta 10x"],
    ["camara_frontal", "12 MP TrueDepth (f/2.2)"],
    ["versiones", "64 GB\n256 GB\n512 GB"],
    ["materiales", "Marco de acero inoxidable de grado quirúrgico\nParte trasera de vidrio mate texturizado\nIP68 (hasta 4 m por 30 min)"],
    ["puertos", "Conector Lightning\nCarga rápida por cable (cargador 18W incluido)\nCarga inalámbrica Qi (7.5W)\nSin MagSafe"],
    ["dimensiones", "144.0 × 71.4 × 8.1 mm\n188 g"]
  ],
  "iphone-11-pro-max": [
    ["lanzamiento", "Septiembre 2019"],
    ["procesador", "Apple A13 Bionic\n(7 nm+, 6 núcleos CPU, GPU 4 núcleos)\nNeural Engine (8 núcleos)"],
    ["pantalla", "6.5\" Super Retina XDR (OLED)\n2688 × 1242 px (458 ppi)\n60 Hz\nBrillo máx. 800 nits / pico 1,200 nits"],
    ["camaras_traseras", "Trasera triple:\n• Principal: 12 MP (f/1.8, OIS)\n• Ultra gran angular: 12 MP (f/2.4, 120°)\n• Teleobjetivo: 12 MP (f/2.0, OIS)\nZoom: Rango óptico 4x (2x hacia adentro / 2x hacia afuera); digital hasta 10x"],
    ["camara_frontal", "12 MP TrueDepth (f/2.2)"],
    ["versiones", "64 GB\n256 GB\n512 GB"],
    ["materiales", "Marco de acero inoxidable de grado quirúrgico\nParte trasera de vidrio mate texturizado\nIP68 (hasta 4 m por 30 min)"],
    ["puertos", "Conector Lightning\nCarga rápida por cable (cargador 18W incluido)\nCarga inalámbrica Qi (7.5W)\nSin MagSafe"],
    ["dimensiones", "158.0 × 77.8 × 8.1 mm\n226 g"]
  ],
  "iphone-se-2": [
    ["lanzamiento", "Abril 2020"],
    ["procesador", "Apple A13 Bionic\n(6 núcleos CPU, GPU 4 núcleos)\nNeural Engine (8 núcleos)"],
    ["pantalla", "4.7\" Retina HD (LCD IPS)\n1334 × 750 px (326 ppi)\n60 Hz\nTrue Tone, Touch ID físico"],
    ["camaras_traseras", "12 MP (f/1.8, OIS, Smart HDR)\nZoom: Digital hasta 5x (sin zoom óptico)"],
    ["camara_frontal", "7 MP FaceTime HD (f/2.2)"],
    ["versiones", "64 GB\n128 GB\n256 GB"],
    ["materiales", "Marco de aluminio serie 7000 aeroespacial\nParte trasera y frontal de vidrio\nIP67 (hasta 1 m por 30 min)"],
    ["puertos", "Conector Lightning\nCarga rápida con cable (18W+)\nCarga inalámbrica Qi (7.5W)\nSin MagSafe"],
    ["dimensiones", "138.4 × 67.3 × 7.3 mm\n148 g"]
  ],
  "iphone-12-mini": [
    ["lanzamiento", "Octubre 2020"],
    ["procesador", "Apple A14 Bionic\n(5 nm, 6 núcleos CPU, GPU 4 núcleos)\nNeural Engine (16 núcleos)"],
    ["pantalla", "5.4\" Super Retina XDR (OLED)\n2340 × 1080 px (476 ppi)\n60 Hz\nCeramic Shield, HDR"],
    ["camaras_traseras", "Trasera doble:\n• Principal: 12 MP (f/1.6, OIS)\n• Ultra gran angular: 12 MP (f/2.4, 120°)\nZoom: Óptico 2x hacia afuera; digital hasta 5x"],
    ["camara_frontal", "12 MP TrueDepth (f/2.2)"],
    ["versiones", "64 GB\n128 GB\n256 GB"],
    ["materiales", "Marco de aluminio aeroespacial plano\nParte trasera de vidrio brillante\nFrontal Ceramic Shield\nIP68 (6 m por 30 min)"],
    ["puertos", "Conector Lightning\nMagSafe inalámbrico (hasta 12W en mini)\nCarga inalámbrica Qi (7.5W)"],
    ["dimensiones", "131.5 × 64.2 × 7.4 mm\n133 g"]
  ],
  "iphone-12": [
    ["lanzamiento", "Octubre 2020"],
    ["procesador", "Apple A14 Bionic\n(5 nm, 6 núcleos CPU, GPU 4 núcleos)\nNeural Engine (16 núcleos)"],
    ["pantalla", "6.1\" Super Retina XDR (OLED)\n2532 × 1170 px (460 ppi)\n60 Hz\nCeramic Shield, HDR"],
    ["camaras_traseras", "Trasera doble:\n• Principal: 12 MP (f/1.6, OIS)\n• Ultra gran angular: 12 MP (f/2.4, 120°)\nZoom: Óptico 2x hacia afuera; digital hasta 5x"],
    ["camara_frontal", "12 MP TrueDepth (f/2.2)"],
    ["versiones", "64 GB\n128 GB\n256 GB"],
    ["materiales", "Marco de aluminio aeroespacial plano\nParte trasera de vidrio brillante\nFrontal Ceramic Shield\nIP68 (6 m por 30 min)"],
    ["puertos", "Conector Lightning\nMagSafe inalámbrico (hasta 15W)\nCarga inalámbrica Qi (7.5W)"],
    ["dimensiones", "146.7 × 71.5 × 7.4 mm\n162 g"]
  ],
  "iphone-12-pro": [
    ["lanzamiento", "Octubre 2020"],
    ["procesador", "Apple A14 Bionic\n(5 nm, 6 núcleos CPU, GPU 4 núcleos)\nNeural Engine (16 núcleos)"],
    ["pantalla", "6.1\" Super Retina XDR (OLED)\n2532 × 1170 px (460 ppi)\n60 Hz\nCeramic Shield, pico 1,200 nits"],
    ["camaras_traseras", "Trasera triple + LiDAR:\n• Principal: 12 MP (f/1.6, OIS)\n• Ultra gran angular: 12 MP (f/2.4, 120°)\n• Teleobjetivo: 12 MP (f/2.0, OIS)\nZoom: Óptico 2x hacia adentro, 2x hacia afuera (rango 4x); digital hasta 10x"],
    ["camara_frontal", "12 MP TrueDepth (f/2.2)"],
    ["versiones", "128 GB\n256 GB\n512 GB"],
    ["materiales", "Marco de acero inoxidable quirúrgico\nParte trasera de vidrio mate texturizado\nFrontal Ceramic Shield\nIP68 (6 m por 30 min)"],
    ["puertos", "Conector Lightning\nMagSafe inalámbrico (hasta 15W)\nCarga inalámbrica Qi (7.5W)"],
    ["dimensiones", "146.7 × 71.5 × 7.4 mm\n187 g"]
  ],
  "iphone-12-pro-max": [
    ["lanzamiento", "Octubre 2020"],
    ["procesador", "Apple A14 Bionic\n(5 nm, 6 núcleos CPU, GPU 4 núcleos)\nNeural Engine (16 núcleos)"],
    ["pantalla", "6.7\" Super Retina XDR (OLED)\n2778 × 1284 px (458 ppi)\n60 Hz\nCeramic Shield, pico 1,200 nits"],
    ["camaras_traseras", "Trasera triple + LiDAR:\n• Principal: 12 MP (f/1.6, sensor-shift OIS)\n• Ultra gran angular: 12 MP (f/2.4, 120°)\n• Teleobjetivo: 12 MP (f/2.2, OIS, 65 mm)\nZoom: Óptico 2.5x hacia adentro, 2x hacia afuera (rango 5x); digital hasta 12x"],
    ["camara_frontal", "12 MP TrueDepth (f/2.2)"],
    ["versiones", "128 GB\n256 GB\n512 GB"],
    ["materiales", "Marco de acero inoxidable quirúrgico\nParte trasera de vidrio mate texturizado\nFrontal Ceramic Shield\nIP68 (6 m por 30 min)"],
    ["puertos", "Conector Lightning\nMagSafe inalámbrico (hasta 15W)\nCarga inalámbrica Qi (7.5W)"],
    ["dimensiones", "160.8 × 78.1 × 7.4 mm\n226 g"]
  ],
  "iphone-13-mini": [
    ["lanzamiento", "Septiembre 2021"],
    ["procesador", "Apple A15 Bionic\n(5 nm, 6 núcleos CPU, GPU 4 núcleos)\nNeural Engine (16 núcleos)"],
    ["pantalla", "5.4\" Super Retina XDR (OLED)\n2340 × 1080 px (476 ppi)\n60 Hz\nCeramic Shield, pico 1,200 nits"],
    ["camaras_traseras", "Trasera doble (en diagonal):\n• Principal: 12 MP (f/1.6, sensor-shift OIS)\n• Ultra gran angular: 12 MP (f/2.4, 120°)\nZoom: Óptico 2x hacia afuera; digital hasta 5x"],
    ["camara_frontal", "12 MP TrueDepth (f/2.2)"],
    ["versiones", "128 GB\n256 GB\n512 GB"],
    ["materiales", "Marco de aluminio aeroespacial plano\nParte trasera de vidrio brillante\nFrontal Ceramic Shield\nIP68 (6 m por 30 min)"],
    ["puertos", "Conector Lightning\nMagSafe inalámbrico (hasta 12W en mini)\nCarga inalámbrica Qi (7.5W)"],
    ["dimensiones", "131.5 × 64.2 × 7.65 mm\n140 g"]
  ],
  "iphone-13": [
    ["lanzamiento", "Septiembre 2021"],
    ["procesador", "Apple A15 Bionic\n(5 nm, 6 núcleos CPU, GPU 4 núcleos)\nNeural Engine (16 núcleos)"],
    ["pantalla", "6.1\" Super Retina XDR (OLED)\n2532 × 1170 px (460 ppi)\n60 Hz\nCeramic Shield, pico 1,200 nits"],
    ["camaras_traseras", "Trasera doble (en diagonal):\n• Principal: 12 MP (f/1.6, sensor-shift OIS)\n• Ultra gran angular: 12 MP (f/2.4, 120°)\nZoom: Óptico 2x hacia afuera; digital hasta 5x"],
    ["camara_frontal", "12 MP TrueDepth (f/2.2)"],
    ["versiones", "128 GB\n256 GB\n512 GB"],
    ["materiales", "Marco de aluminio aeroespacial plano\nParte trasera de vidrio brillante\nFrontal Ceramic Shield\nIP68 (6 m por 30 min)"],
    ["puertos", "Conector Lightning\nMagSafe inalámbrico (hasta 15W)\nCarga inalámbrica Qi (7.5W)"],
    ["dimensiones", "146.7 × 71.5 × 7.65 mm\n173 g"]
  ],
  "iphone-13-pro": [
    ["lanzamiento", "Septiembre 2021"],
    ["procesador", "Apple A15 Bionic\n(5 nm, 6 núcleos CPU, GPU 5 núcleos)\nNeural Engine (16 núcleos)"],
    ["pantalla", "6.1\" Super Retina XDR con ProMotion\nOLED adaptativo (10-120 Hz)\n2532 × 1170 px (460 ppi)\nBrillo máx. 1,000 / pico 1,200 nits"],
    ["camaras_traseras", "Trasera triple + LiDAR:\n• Principal: 12 MP (f/1.5, sensor-shift OIS)\n• Ultra gran angular: 12 MP (f/1.8, 120°, macro)\n• Teleobjetivo: 12 MP (f/2.8, OIS, 77 mm)\nZoom: Óptico 3x hacia adentro, 2x hacia afuera (rango 6x); digital hasta 15x"],
    ["camara_frontal", "12 MP TrueDepth (f/2.2)"],
    ["versiones", "128 GB\n256 GB\n512 GB\n1 TB"],
    ["materiales", "Marco de acero inoxidable quirúrgico\nParte trasera de vidrio mate texturizado\nFrontal Ceramic Shield\nIP68 (6 m por 30 min)"],
    ["puertos", "Conector Lightning\nMagSafe inalámbrico (hasta 15W)\nCarga inalámbrica Qi (7.5W)"],
    ["dimensiones", "146.7 × 71.5 × 7.65 mm\n203 g"]
  ],
  "iphone-13-pro-max": [
    ["lanzamiento", "Septiembre 2021"],
    ["procesador", "Apple A15 Bionic\n(5 nm, 6 núcleos CPU, GPU 5 núcleos)\nNeural Engine (16 núcleos)"],
    ["pantalla", "6.7\" Super Retina XDR con ProMotion\nOLED adaptativo (10-120 Hz)\n2778 × 1284 px (458 ppi)\nBrillo máx. 1,000 / pico 1,200 nits"],
    ["camaras_traseras", "Trasera triple + LiDAR:\n• Principal: 12 MP (f/1.5, sensor-shift OIS)\n• Ultra gran angular: 12 MP (f/1.8, 120°, macro)\n• Teleobjetivo: 12 MP (f/2.8, OIS, 77 mm)\nZoom: Óptico 3x hacia adentro, 2x hacia afuera (rango 6x); digital hasta 15x"],
    ["camara_frontal", "12 MP TrueDepth (f/2.2)"],
    ["versiones", "128 GB\n256 GB\n512 GB\n1 TB"],
    ["materiales", "Marco de acero inoxidable quirúrgico\nParte trasera de vidrio mate texturizado\nFrontal Ceramic Shield\nIP68 (6 m por 30 min)"],
    ["puertos", "Conector Lightning\nMagSafe inalámbrico (hasta 15W)\nCarga inalámbrica Qi (7.5W)"],
    ["dimensiones", "160.8 × 78.1 × 7.65 mm\n238 g"]
  ],
  "iphone-se-3": [
    ["lanzamiento", "Marzo 2022"],
    ["procesador", "Apple A15 Bionic\n(5 nm, 6 núcleos CPU, GPU 4 núcleos)\nNeural Engine (16 núcleos)\nMódem 5G"],
    ["pantalla", "4.7\" Retina HD (LCD IPS)\n1334 × 750 px (326 ppi)\n60 Hz\nTrue Tone, Touch ID físico"],
    ["camaras_traseras", "12 MP (f/1.8, OIS, Smart HDR 4, Deep Fusion)\nZoom: Digital hasta 5x (sin zoom óptico)"],
    ["camara_frontal", "7 MP FaceTime HD (f/2.2)"],
    ["versiones", "64 GB\n128 GB\n256 GB"],
    ["materiales", "Marco de aluminio serie 7000 aeroespacial\nVidrio delantero y trasero reforzado\nIP67 (hasta 1 m por 30 min)"],
    ["puertos", "Conector Lightning\nCarga rápida por cable (20W+)\nCarga inalámbrica Qi (7.5W)\nSin MagSafe"],
    ["dimensiones", "138.4 × 67.3 × 7.3 mm\n144 g"]
  ],
  "iphone-14": [
    ["lanzamiento", "Septiembre 2022"],
    ["procesador", "Apple A15 Bionic\n(5 nm, 6 núcleos CPU, GPU 5 núcleos)\nNeural Engine (16 núcleos)"],
    ["pantalla", "6.1\" Super Retina XDR (OLED)\n2532 × 1170 px (460 ppi)\n60 Hz\nCeramic Shield, pico 1,200 nits"],
    ["camaras_traseras", "Trasera doble:\n• Principal: 12 MP (f/1.5, sensor-shift OIS)\n• Ultra gran angular: 12 MP (f/2.4, 120°)\nZoom: Óptico 2x hacia afuera; digital hasta 5x"],
    ["camara_frontal", "12 MP TrueDepth (f/1.9, autofoco)"],
    ["versiones", "128 GB\n256 GB\n512 GB"],
    ["materiales", "Marco de aluminio aeroespacial\nParte trasera de vidrio extraíble\nFrontal Ceramic Shield\nIP68 (6 m por 30 min)"],
    ["puertos", "Conector Lightning\nMagSafe inalámbrico (hasta 15W)\nCarga inalámbrica Qi (7.5W)"],
    ["dimensiones", "146.7 × 71.5 × 7.80 mm\n172 g"]
  ],
  "iphone-14-plus": [
    ["lanzamiento", "Septiembre 2022"],
    ["procesador", "Apple A15 Bionic\n(5 nm, 6 núcleos CPU, GPU 5 núcleos)\nNeural Engine (16 núcleos)"],
    ["pantalla", "6.7\" Super Retina XDR (OLED)\n2778 × 1284 px (458 ppi)\n60 Hz\nCeramic Shield, pico 1,200 nits"],
    ["camaras_traseras", "Trasera doble:\n• Principal: 12 MP (f/1.5, sensor-shift OIS)\n• Ultra gran angular: 12 MP (f/2.4, 120°)\nZoom: Óptico 2x hacia afuera; digital hasta 5x"],
    ["camara_frontal", "12 MP TrueDepth (f/1.9, autofoco)"],
    ["versiones", "128 GB\n256 GB\n512 GB"],
    ["materiales", "Marco de aluminio aeroespacial\nParte trasera de vidrio extraíble\nFrontal Ceramic Shield\nIP68 (6 m por 30 min)"],
    ["puertos", "Conector Lightning\nMagSafe inalámbrico (hasta 15W)\nCarga inalámbrica Qi (7.5W)"],
    ["dimensiones", "160.8 × 78.1 × 7.80 mm\n203 g"]
  ],
  "iphone-14-pro": [
    ["lanzamiento", "Septiembre 2022"],
    ["procesador", "Apple A16 Bionic\n(4 nm, 6 núcleos CPU, GPU 5 núcleos)\nNeural Engine (16 núcleos)"],
    ["pantalla", "6.1\" Super Retina XDR con ProMotion\nOLED adaptativo (1-120 Hz)\n2556 × 1179 px (460 ppi)\nAlways-On, Dynamic Island, pico 2,000 nits"],
    ["camaras_traseras", "Trasera triple + LiDAR:\n• Principal: 48 MP quad-pixel (f/1.78, sensor-shift OIS 2.ª gen, 24 mm)\n• Ultra gran angular: 12 MP (f/2.2, 120°, macro)\n• Teleobjetivo: 12 MP 3x (f/2.8, OIS, 77 mm)\n• Teleobjetivo 2x óptico integrado (12 MP, f/1.78)\nZoom: Óptico 3x, 2x, 0.5x (rango 6x); digital hasta 15x"],
    ["camara_frontal", "12 MP TrueDepth (f/1.9, autofoco)"],
    ["versiones", "128 GB\n256 GB\n512 GB\n1 TB"],
    ["materiales", "Marco de acero inoxidable quirúrgico\nParte trasera de vidrio mate texturizado\nFrontal Ceramic Shield\nIP68 (6 m por 30 min)"],
    ["puertos", "Conector Lightning\nMagSafe inalámbrico (hasta 15W)\nCarga inalámbrica Qi (7.5W)"],
    ["dimensiones", "147.5 × 71.5 × 7.85 mm\n206 g"]
  ],
  "iphone-14-pro-max": [
    ["lanzamiento", "Septiembre 2022"],
    ["procesador", "Apple A16 Bionic\n(4 nm, 6 núcleos CPU, GPU 5 núcleos)\nNeural Engine (16 núcleos)"],
    ["pantalla", "6.7\" Super Retina XDR con ProMotion\nOLED adaptativo (1-120 Hz)\n2796 × 1290 px (460 ppi)\nAlways-On, Dynamic Island, pico 2,000 nits"],
    ["camaras_traseras", "Trasera triple + LiDAR:\n• Principal: 48 MP quad-pixel (f/1.78, sensor-shift OIS 2.ª gen)\n• Ultra gran angular: 12 MP (f/2.2, 120°, macro)\n• Teleobjetivo: 12 MP 3x (f/2.8, OIS, 77 mm)\n• Teleobjetivo 2x óptico integrado (12 MP, f/1.78)\nZoom: Rango óptico 6x (3x, 2x, 0.5x); digital hasta 15x"],
    ["camara_frontal", "12 MP TrueDepth (f/1.9, autofoco)"],
    ["versiones", "128 GB\n256 GB\n512 GB\n1 TB"],
    ["materiales", "Marco de acero inoxidable quirúrgico\nParte trasera de vidrio mate texturizado\nFrontal Ceramic Shield\nIP68 (6 m por 30 min)"],
    ["puertos", "Conector Lightning\nMagSafe inalámbrico (hasta 15W)\nCarga inalámbrica Qi (7.5W)"],
    ["dimensiones", "160.7 × 77.6 × 7.85 mm\n240 g"]
  ],
  "iphone-15": [
    ["lanzamiento", "Septiembre 2023"],
    ["procesador", "Apple A16 Bionic\n(4 nm, 6 núcleos CPU, GPU 5 núcleos)\nNeural Engine (16 núcleos)"],
    ["pantalla", "6.1\" Super Retina XDR (OLED)\n2556 × 1179 px (460 ppi)\n60 Hz\nDynamic Island, pico 2,000 nits"],
    ["camaras_traseras", "Trasera doble:\n• Principal: 48 MP (f/1.6, sensor-shift OIS, fotos 24/48 MP)\n• Teleobjetivo 2x integrado: 12 MP (f/1.6)\n• Ultra gran angular: 12 MP (f/2.4, 120°)\nZoom: Óptico 2x hacia adentro, 2x hacia afuera (rango 4x); digital hasta 10x"],
    ["camara_frontal", "12 MP TrueDepth (f/1.9, autofoco)"],
    ["versiones", "128 GB\n256 GB\n512 GB"],
    ["materiales", "Marco de aluminio aeroespacial redondeado\nParte trasera de vidrio con infusión de color mate\nFrontal Ceramic Shield\nIP68 (6 m por 30 min)"],
    ["puertos", "Conector USB-C (USB 2.0 hasta 480 Mb/s, DisplayPort)\nMagSafe (hasta 15W)\nCarga inalámbrica Qi2 (15W)\nCarga inversa por cable (4.5W)"],
    ["dimensiones", "147.6 × 71.6 × 7.80 mm\n171 g"]
  ],
  "iphone-15-plus": [
    ["lanzamiento", "Septiembre 2023"],
    ["procesador", "Apple A16 Bionic\n(4 nm, 6 núcleos CPU, GPU 5 núcleos)\nNeural Engine (16 núcleos)"],
    ["pantalla", "6.7\" Super Retina XDR (OLED)\n2796 × 1290 px (460 ppi)\n60 Hz\nDynamic Island, pico 2,000 nits"],
    ["camaras_traseras", "Trasera doble:\n• Principal: 48 MP (f/1.6, sensor-shift OIS)\n• Teleobjetivo 2x integrado: 12 MP (f/1.6)\n• Ultra gran angular: 12 MP (f/2.4, 120°)\nZoom: Rango óptico 4x (2x hacia adentro / 2x hacia afuera); digital hasta 10x"],
    ["camara_frontal", "12 MP TrueDepth (f/1.9, autofoco)"],
    ["versiones", "128 GB\n256 GB\n512 GB"],
    ["materiales", "Marco de aluminio aeroespacial redondeado\nParte trasera de vidrio con infusión de color mate\nFrontal Ceramic Shield\nIP68 (6 m por 30 min)"],
    ["puertos", "Conector USB-C (USB 2.0 hasta 480 Mb/s, DisplayPort)\nMagSafe (hasta 15W)\nCarga inalámbrica Qi2 (15W)\nCarga inversa por cable (4.5W)"],
    ["dimensiones", "160.9 × 77.8 × 7.80 mm\n201 g"]
  ],
  "iphone-15-pro": [
    ["lanzamiento", "Septiembre 2023"],
    ["procesador", "Apple A17 Pro\n(3 nm, 6 núcleos CPU, GPU Pro 6 núcleos con Ray Tracing)\nNeural Engine (16 núcleos)"],
    ["pantalla", "6.1\" Super Retina XDR con ProMotion\nOLED adaptativo (1-120 Hz)\n2556 × 1179 px (460 ppi)\nAlways-On, Dynamic Island, pico 2,000 nits"],
    ["camaras_traseras", "Trasera triple + LiDAR:\n• Principal: 48 MP (f/1.78, sensor-shift OIS 2.ª gen, distancias 24/28/35 mm)\n• Ultra gran angular: 12 MP (f/2.2, 120°, macro)\n• Teleobjetivo: 12 MP 3x (f/2.8, OIS, 77 mm)\n• Video espacial\nZoom: Rango óptico 6x (3x, 2x, 0.5x); digital hasta 15x"],
    ["camara_frontal", "12 MP TrueDepth (f/1.9, autofoco)"],
    ["versiones", "128 GB\n256 GB\n512 GB\n1 TB"],
    ["materiales", "Estructura de titanio Grado 5 con subestructura interna de aluminio reciclado\nVidrio trasero mate texturizado\nBotón de Acción\nIP68"],
    ["puertos", "Conector USB-C (USB 3 hasta 10 Gb/s, DisplayPort)\nMagSafe (hasta 15W)\nCarga inalámbrica Qi2 (15W)\nCarga inversa con cable (4.5W)"],
    ["dimensiones", "146.6 × 70.6 × 8.25 mm\n187 g"]
  ],
  "iphone-15-pro-max": [
    ["lanzamiento", "Septiembre 2023"],
    ["procesador", "Apple A17 Pro\n(3 nm, 6 núcleos CPU, GPU Pro 6 núcleos con Ray Tracing)\nNeural Engine (16 núcleos)"],
    ["pantalla", "6.7\" Super Retina XDR con ProMotion\nOLED adaptativo (1-120 Hz)\n2796 × 1290 px (460 ppi)\nAlways-On, Dynamic Island, pico 2,000 nits"],
    ["camaras_traseras", "Trasera triple + LiDAR:\n• Principal: 48 MP (f/1.78, sensor-shift OIS 3D 2.ª gen)\n• Ultra gran angular: 12 MP (f/2.2, 120°, macro)\n• Teleobjetivo tetraprisma: 12 MP 5x (f/2.8, OIS 3D, 120 mm)\n• Video espacial\nZoom: Zoom óptico 5x hacia adentro, 2x hacia adentro, 2x hacia afuera (rango 10x); digital hasta 25x"],
    ["camara_frontal", "12 MP TrueDepth (f/1.9, autofoco)"],
    ["versiones", "256 GB\n512 GB\n1 TB"],
    ["materiales", "Estructura de titanio Grado 5 con subestructura interna de aluminio reciclado\nVidrio trasero mate texturizado\nBotón de Acción\nIP68"],
    ["puertos", "Conector USB-C (USB 3 hasta 10 Gb/s, DisplayPort)\nMagSafe (hasta 15W)\nCarga inalámbrica Qi2 (15W)\nCarga inversa con cable (4.5W)"],
    ["dimensiones", "159.9 × 76.7 × 8.25 mm\n221 g"]
  ],
  "iphone-16": [
    ["lanzamiento", "Septiembre 2024"],
    ["procesador", "Apple A18\n(3 nm N3E, 6 núcleos CPU, GPU 5 núcleos Ray Tracing)\nNeural Engine (16 núcleos, 8 GB RAM para Apple Intelligence)"],
    ["pantalla", "6.1\" Super Retina XDR (OLED)\n2556 × 1179 px (460 ppi)\n60 Hz\nCeramic Shield última generación, 1 a 2,000 nits"],
    ["camaras_traseras", "Trasera doble vertical (Foto/Video Espacial):\n• Cámara Fusion: 48 MP (f/1.6, sensor-shift OIS, 26 mm)\n• Teleobjetivo 2x óptico integrado: 12 MP (f/1.6, 52 mm)\n• Ultra gran angular: 12 MP (f/2.2, 120°, macro con PDAF)\nZoom: Óptico 2x hacia adentro, 2x hacia afuera (rango 4x); digital hasta 10x"],
    ["camara_frontal", "12 MP TrueDepth (f/1.9, autofoco)"],
    ["versiones", "128 GB\n256 GB\n512 GB"],
    ["materiales", "Marco de aluminio aeroespacial\nVidrio trasero con infusión de color\nBotón de Acción\nControl de Cámara (Camera Control) háptico\nIP68"],
    ["puertos", "Conector USB-C (USB 2.0 hasta 480 Mb/s, DisplayPort)\nMagSafe mejorado (hasta 25W con adaptador de 30W+)\nQi2 (15W), Qi (7.5W)"],
    ["dimensiones", "147.6 × 71.6 × 7.80 mm\n170 g"]
  ],
  "iphone-16-plus": [
    ["lanzamiento", "Septiembre 2024"],
    ["procesador", "Apple A18\n(3 nm N3E, 6 núcleos CPU, GPU 5 núcleos Ray Tracing)\nNeural Engine (16 núcleos, 8 GB RAM para Apple Intelligence)"],
    ["pantalla", "6.7\" Super Retina XDR (OLED)\n2796 × 1290 px (460 ppi)\n60 Hz\nCeramic Shield última generación, 1 a 2,000 nits"],
    ["camaras_traseras", "Trasera doble vertical (Foto/Video Espacial):\n• Cámara Fusion: 48 MP (f/1.6, sensor-shift OIS)\n• Teleobjetivo 2x óptico integrado: 12 MP (f/1.6)\n• Ultra gran angular: 12 MP (f/2.2, 120°, macro con PDAF)\nZoom: Rango óptico 4x (2x hacia adentro / 2x hacia afuera); digital hasta 10x"],
    ["camara_frontal", "12 MP TrueDepth (f/1.9, autofoco)"],
    ["versiones", "128 GB\n256 GB\n512 GB"],
    ["materiales", "Marco de aluminio aeroespacial\nVidrio trasero con infusión de color\nBotón de Acción\nControl de Cámara (Camera Control) háptico\nIP68"],
    ["puertos", "Conector USB-C (USB 2.0 hasta 480 Mb/s, DisplayPort)\nMagSafe mejorado (hasta 25W con adaptador de 30W+)\nQi2 (15W), Qi (7.5W)"],
    ["dimensiones", "160.9 × 77.8 × 7.80 mm\n199 g"]
  ],
  "iphone-16-pro": [
    ["lanzamiento", "Septiembre 2024"],
    ["procesador", "Apple A18 Pro\n(3 nm N3E, 6 núcleos CPU, GPU Pro 6 núcleos)\nNeural Engine (16 núcleos, 8 GB RAM para Apple Intelligence)"],
    ["pantalla", "6.3\" Super Retina XDR con ProMotion\nOLED adaptativo (1-120 Hz)\nBordes ultrafinos\n2622 × 1206 px (460 ppi)\nAlways-On, Dynamic Island, 1 a 2,000 nits"],
    ["camaras_traseras", "Trasera triple Pro + LiDAR:\n• Cámara Fusion: 48 MP (f/1.78, sensor-shift OIS 2.ª gen, 4K120 Dolby Vision/ProRes)\n• Ultra gran angular: 48 MP quad-pixel (f/2.2, 120°, macro 48 MP)\n• Teleobjetivo tetraprisma: 12 MP 5x (f/2.8, OIS 3D, 120 mm)\n• 4 micrófonos de estudio con mezcla de audio (Audio Mix)\nZoom: Óptico 5x hacia adentro, 2x hacia adentro, 2x hacia afuera (rango 10x); digital hasta 25x"],
    ["camara_frontal", "12 MP TrueDepth (f/1.9, autofoco)"],
    ["versiones", "128 GB\n256 GB\n512 GB\n1 TB"],
    ["materiales", "Estructura de titanio Grado 5 microgranallado con subestructura térmica de aluminio y grafito\nVidrio trasero mate texturizado\nBotón de Acción y Control de Cámara en zafiro\nIP68"],
    ["puertos", "Conector USB-C (USB 3 hasta 10 Gb/s, DisplayPort)\nMagSafe mejorado (hasta 25W con adaptador de 30W+)\nQi2 (15W), Qi (7.5W)"],
    ["dimensiones", "149.6 × 71.5 × 8.25 mm\n199 g"]
  ],
  "iphone-16-pro-max": [
    ["lanzamiento", "Septiembre 2024"],
    ["procesador", "Apple A18 Pro\n(3 nm N3E, 6 núcleos CPU, GPU Pro 6 núcleos)\nNeural Engine (16 núcleos, 8 GB RAM para Apple Intelligence)"],
    ["pantalla", "6.9\" Super Retina XDR con ProMotion\nOLED adaptativo (1-120 Hz)\nBordes ultrafinos\n2868 × 1320 px (460 ppi)\nAlways-On, Dynamic Island, 1 a 2,000 nits"],
    ["camaras_traseras", "Trasera triple Pro + LiDAR:\n• Cámara Fusion: 48 MP (f/1.78, sensor-shift OIS 3D 2.ª gen, 4K120 Dolby Vision/ProRes)\n• Ultra gran angular: 48 MP quad-pixel (f/2.2, 120°, macro 48 MP)\n• Teleobjetivo tetraprisma: 12 MP 5x (f/2.8, OIS 3D, 120 mm)\n• 4 micrófonos de estudio con mezcla de audio (Audio Mix)\nZoom: Zoom óptico 5x hacia adentro, 2x hacia adentro, 2x hacia afuera (rango 10x); digital hasta 25x"],
    ["camara_frontal", "12 MP TrueDepth (f/1.9, autofoco)"],
    ["versiones", "256 GB\n512 GB\n1 TB"],
    ["materiales", "Estructura de titanio Grado 5 microgranallado con subestructura térmica de aluminio y grafito\nVidrio trasero mate texturizado\nBotón de Acción y Control de Cámara en zafiro\nIP68"],
    ["puertos", "Conector USB-C (USB 3 hasta 10 Gb/s, DisplayPort)\nMagSafe mejorado (hasta 25W con adaptador de 30W+)\nQi2 (15W), Qi (7.5W)"],
    ["dimensiones", "163.0 × 77.6 × 8.25 mm\n227 g"]
  ],
  "iphone-16e": [
    ["lanzamiento", "Febrero 2025"],
    ["procesador", "Apple A18 (GPU 4 núcleos, 8 GB RAM)"],
    ["pantalla", "6.1\" Super Retina XDR (OLED) 60 Hz Brillo pico 1,200 nits"],
    ["camaras_traseras", "Única Fusion 48 MP (f/1.6)\nZoom: Óptico 2x integrado, digital 10x"],
    ["camara_frontal", "12 MP"],
    ["versiones", "128 GB\n256 GB\n512 GB"],
    ["materiales", "Marco de aluminio Parte trasera de vidrio"],
    ["puertos", "USB-C Carga Qi (Sin MagSafe)"],
    ["dimensiones", "146.7 × 71.5 × 7.8 mm\n167 g"]
  ],
  "iphone-17": [
    ["lanzamiento", "Septiembre 2025"],
    ["procesador", "Apple A19 (GPU 5 núcleos, 8 GB RAM)"],
    ["pantalla", "6.3\" OLED ProMotion 120 Hz adaptativo Brillo pico 3,000 nits"],
    ["camaras_traseras", "Trasera doble: Fusion 48 MP + Ultra gran angular 48 MP"],
    ["versiones", "128 GB\n256 GB\n512 GB"],
    ["materiales", "Marco de aluminio Chip de red N1 propio"],
    ["puertos", "USB-C MagSafe, Qi2"],
    ["dimensiones", "149.6 × 71.5 × 7.95 mm\n177 g"]
  ],
  "iphone-air": [
    ["lanzamiento", "Septiembre 2025"],
    ["procesador", "Apple A19 Pro (12 GB RAM)"],
    ["pantalla", "6.5\" OLED ProMotion 120 Hz adaptativo Brillo pico 3,000 nits"],
    ["camaras_traseras", "Única Fusion 48 MP"],
    ["camara_frontal", "18 MP (Center Stage cuadrado)"],
    ["versiones", "256 GB\n512 GB\n1 TB"],
    ["materiales", "Titanio Grado 5 Ultrafino (Reemplaza variante Plus)"],
    ["puertos", "USB-C MagSafe, Qi2 Solo eSIM a nivel global"],
    ["dimensiones", "156.2 × 74.7 × 5.6 mm\n165 g"]
  ],
  "iphone-17-pro": [
    ["lanzamiento", "Septiembre 2025"],
    ["procesador", "Apple A19 Pro (12 GB RAM)"],
    ["pantalla", "6.3\" OLED ProMotion 1-120 Hz Brillo pico 3,000 nits"],
    ["camaras_traseras", "Trasera triple (Módulo horizontal): Fusion 48 MP + Ultra gran angular 48 MP + Teleobjetivo 4x (48 MP tetraprisma)"],
    ["versiones", "256 GB\n512 GB\n1 TB\n2 TB"],
    ["materiales", "Chasis monocasco térmico (Cámara de vapor)"],
    ["puertos", "USB-C MagSafe (25W), Qi2"]
  ],
  "iphone-17-pro-max": [
    ["lanzamiento", "Septiembre 2025"],
    ["procesador", "Apple A19 Pro (12 GB RAM)"],
    ["pantalla", "6.9\" OLED ProMotion 1-120 Hz Brillo pico 3,000 nits"],
    ["camaras_traseras", "Trasera triple (Módulo horizontal): Fusion 48 MP + Ultra gran angular 48 MP + Teleobjetivo 4x (48 MP tetraprisma)"],
    ["versiones", "256 GB\n512 GB\n1 TB\n2 TB"],
    ["materiales", "Chasis monocasco térmico (Cámara de vapor)"],
    ["puertos", "USB-C MagSafe (25W), Qi2"]
  ],
  "iphone-17e": [
    ["lanzamiento", "Marzo 2026"],
    ["procesador", "Apple A19 (GPU 4 núcleos, 8 GB RAM)"],
    ["pantalla", "6.1\" OLED 60 Hz Ceramic Shield 2"],
    ["camaras_traseras", "Única Fusion 48 MP (f/1.6)"],
    ["camara_frontal", "12 MP"],
    ["versiones", "256 GB\n512 GB"],
    ["materiales", "Marco de aluminio Módem propio C1X"],
    ["puertos", "USB-C MagSafe (15W), Qi2"],
    ["dimensiones", "146.7 × 71.5 × 7.8 mm\n169 g"]
  ],
  "iphone-18-pro": [
    ["lanzamiento", "Septiembre 2026"],
    ["procesador", "Apple A20 Pro Doble Neural Engine"],
    ["pantalla", "6.3\" Super Retina XDR OLED 2622 × 1206 px"],
    ["camaras_traseras", "Trasera triple: Fusion 48 MP (Apertura variable f/1.48 a f/4.0) + Ultra gran angular 48 MP + Teleobjetivo 48 MP (Hasta 40x digital)"],
    ["versiones", "256 GB\n512 GB\n1 TB\n2 TB"],
    ["materiales", "Acabado premium Módem C2 (IA celular)"],
    ["puertos", "USB-C Carga rápida y MagSafe optimizado"]
  ],
  "iphone-18-pro-max": [
    ["lanzamiento", "Septiembre 2026"],
    ["procesador", "Apple A20 Pro Doble Neural Engine"],
    ["pantalla", "6.9\" Super Retina XDR OLED 2868 × 1320 px"],
    ["camaras_traseras", "Trasera triple: Fusion 48 MP (Apertura variable) + Ultra gran angular 48 MP + Teleobjetivo 48 MP"],
    ["versiones", "256 GB\n512 GB\n1 TB\n2 TB"],
    ["materiales", "Acabado premium Módem C2 (IA celular)"],
    ["puertos", "USB-C Carga rápida y MagSafe optimizado"]
  ],
  "iphone-duo": [
    ["lanzamiento", "Octubre 2026"],
    ["procesador", "Apple A20 Pro (Fabricación 2 nm)"],
    ["pantalla", "Exterior: 5.4\" OLED Interior (plegable): 7.6\" OLED con acabado nanotexturizado (3,000 nits)"],
    ["versiones", "256 GB\n512 GB\n1 TB\n2 TB"],
    ["materiales", "Marco de titanio Cámara de vapor"],
    ["puertos", "USB-C Sistema de doble batería"],
    [null, "Sist. Multi-cámara: Incluye cámara frontal oculta bajo la pantalla interior. Funciones Smart Take y Kid Cue.", "Sistema de cámaras"]
  ]
};

// Filas de la ficha de un modelo, como quedan en la base ({clave, etiqueta, valor}).
export function filasDeFuente(slug) {
  return (FICHAS[slug] || []).map(([clave, valor, etiqueta]) => (clave
    ? { clave, etiqueta: CATEGORIAS_FICHA.find((c) => c.clave === clave).etiqueta, valor }
    : { etiqueta, valor }));
}

// Precios redondos de ejemplo: NO son precios reales.
// color: nombre_es del color oficial del modelo (0008_color_oficial.sql lo
// resuelve desde el nombre viejo de 0003_demo.sql y guarda en
// color_nombre_mostrar el nombre que ya veía el cliente).
export const DEMO_EQUIPOS = [
  { slug: "iphone-18-pro-max", condicion: "nuevo", capacidad: "256 GB", color: "Negro", color_nombre_mostrar: "", precio: 6000000, en_stock: true, destacado: true },
  { slug: "iphone-18-pro-max", condicion: "nuevo", capacidad: "256 GB", color: "Plata", color_nombre_mostrar: "", precio: 6200000, en_stock: true, destacado: true },
  { slug: "iphone-18-pro-max", condicion: "nuevo", capacidad: "512 GB", color: "Borgoña", color_nombre_mostrar: "", precio: 7000000, en_stock: true, destacado: false },
  { slug: "iphone-18-pro", condicion: "nuevo", capacidad: "256 GB", color: "Glaciar", color_nombre_mostrar: "Glacier", precio: 5500000, en_stock: true, destacado: false },
  { slug: "iphone-15-pro", condicion: "usado", capacidad: "128 GB", color: "Titanio natural", color_nombre_mostrar: "Titanio natural", precio: 3000000, en_stock: true, destacado: false,
    bateria_porcentaje: 88, estado_estetico: "Excelente", detalles: "Rayón leve en el marco", incluye: "Caja y cable" },
  { slug: "iphone-13", condicion: "usado", capacidad: "128 GB", color: "Medianoche", color_nombre_mostrar: "Medianoche", precio: 1800000, en_stock: true, destacado: false,
    bateria_porcentaje: 84, estado_estetico: "Muy bueno", detalles: "", incluye: "Solo el equipo" }
];
