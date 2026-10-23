// =============================================================================
// Vitrina completa (0041, pedido de Jared para la versión publicada): la
// instalación nueva y el restablecer de fábrica "completo" dejan la tienda de
// ejemplo de Argentina (ejemplo.js) mostrando todas las funciones:
// - Inventario: todos los iPhone nuevos del 15 al 18 y el Duo, con todos sus
//   colores y capacidades (las de la ficha, "versiones"), con la imagen
//   predeterminada de cada color y precios de ejemplo en pesos argentinos.
//   Ningún usado. Todos son de demostración (es_demo): "Borrar datos de
//   demostración" los quita.
// - Promos con el banner y descuentos de ejemplo, el dólar como moneda de
//   apoyo con una cotización de ejemplo, stock contado (algunos con pocas
//   unidades, para que se vea el cartel), destacados y más vendidos.
// El restablecer "básico" deja la tienda de ejemplo como antes de 0041: los 6
// equipos de DEMO_EQUIPOS (semilla.js), sin promos ni dólar.
// Los precios NO son reales: son de ejemplo, para la demostración.
// El SQL tiene lo mismo: 0041_vitrina.sql (generado con
// node tests/sql/vitrina.mjs sql) y datos_fabrica(); tests/sql/probar.sh
// compara las dos instalaciones.
// =============================================================================

// Lo que la vitrina cambia de la tienda (promos y dólar) está en ejemplo.js
// (TIENDA_VITRINA), que el panel carga sin la semilla.

import { CATALOGO, COLORES, FICHAS } from "./semilla.js";
import { rutaPredeterminada } from "./predeterminadas.js";

// Precio de ejemplo de la capacidad más chica de cada modelo; cada capacidad
// siguiente suma PASO_CAPACIDAD.
export const PRECIOS_VITRINA = {
  "iphone-15": 1200000, "iphone-15-plus": 1400000, "iphone-15-pro": 1650000, "iphone-15-pro-max": 1900000,
  "iphone-16": 1450000, "iphone-16-plus": 1600000, "iphone-16-pro": 2000000, "iphone-16-pro-max": 2300000, "iphone-16e": 1150000,
  "iphone-17": 1700000, "iphone-air": 2050000, "iphone-17-pro": 2400000, "iphone-17-pro-max": 2700000, "iphone-17e": 1350000,
  "iphone-18-pro": 2800000, "iphone-18-pro-max": 3100000, "iphone-duo": 4500000
};
export const PASO_CAPACIDAD = 300000;
const STOCK = 8;

// Los modelos de la vitrina, del más viejo al más nuevo (orden del catálogo).
export const MODELOS_VITRINA = CATALOGO.filter((m) => m.slug in PRECIOS_VITRINA)
  .sort((a, b) => a.orden - b.orden).map((m) => m.slug);

// Las capacidades de la ficha de un modelo ("versiones").
export function capacidadesDe(slug) {
  const fila = (FICHAS[slug] || []).find(([clave]) => clave === "versiones");
  return fila ? fila[1].split("\n").map((s) => s.trim()).filter(Boolean) : [];
}

// Los toques de la vitrina, por modelo, capacidad y color ("" = cualquiera).
const DESTACADOS = [["iphone-18-pro-max", 0], ["iphone-duo", 0]];
const MAS_VENDIDOS = [["iphone-17-pro-max", 0, 0], ["iphone-17", 0, 0], ["iphone-16", 0, 0]];
const DESCUENTOS = [["iphone-16-pro-max", "1 TB", "Titanio del desierto", 20]];
// Pocas unidades (el cartel): por capacidad, cuántas de cada color.
const POCAS = [["iphone-duo", "2 TB", 1], ["iphone-18-pro-max", "2 TB", 1], ["iphone-air", "1 TB", 1]];

// Los equipos de la vitrina, con el modelo y el color por nombre (slug y
// nombre_es del color oficial): demo.js y el SQL los resuelven a sus ids.
export function equiposVitrina() {
  const lista = [];
  for (const slug of MODELOS_VITRINA) {
    const capacidades = capacidadesDe(slug);
    const colores = COLORES[slug] || [];
    capacidades.forEach((capacidad, i) => {
      colores.forEach(([nombreEs, nombreEn], j) => {
        const pocas = POCAS.find(([s, c]) => s === slug && c === capacidad);
        const descuento = DESCUENTOS.find(([s, c, n]) => s === slug && c === capacidad && n === nombreEs);
        lista.push({
          slug, condicion: "nuevo", capacidad, color: nombreEs,
          color_nombre_mostrar: nombreEs !== nombreEn ? nombreEs : "",
          precio: PRECIOS_VITRINA[slug] + i * PASO_CAPACIDAD,
          en_stock: true,
          destacado: DESTACADOS.some(([s, c]) => s === slug && c === i),
          mas_vendido: MAS_VENDIDOS.some(([s, c, k]) => s === slug && c === i && k === j),
          promo_descuento: descuento ? descuento[3] : null,
          contar_stock: true,
          stock_cantidad: pocas ? pocas[2] : STOCK,
          fotos: [rutaPredeterminada(slug, nombreEs)].filter(Boolean)
        });
      });
    });
  }
  return lista;
}
