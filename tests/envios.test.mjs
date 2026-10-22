// Envíos (assets/js/datos/envios.js, ronda 3, C2), sin navegador:
//   node tests/envios.test.mjs
// Las reglas (iguales a validar_envios() de 0023, que prueba tests/sql) y las
// frases cortas del detalle del sitio.
import assert from "node:assert/strict";
import { errorEnvios, frasesEnvio, ENVIOS_INICIAL, tieneEnvios } from "../assets/js/datos/envios.js";
import { fijarPais } from "../assets/js/datos/paises.js";
import { cargarIdioma } from "../assets/js/i18n/i18n.js";

let casos = 0;
const caso = async (nombre, fn) => { await fn(); casos++; console.log(`ok   ${nombre}`); };
const con = (cambios) => ({ ...structuredClone(ENVIOS_INICIAL), ...cambios });
const dom = (cambios) => con({ envio_domicilio: true, envio_zonas: ["Palermo", "Belgrano"], envio_costo: "fijo", envio_costo_fijo: 3500, ...cambios });
fijarPais("ar");

await caso("reglas: lo válido pasa; cada regla rota da su mensaje (los mismos de validar_envios)", () => {
  assert.equal(errorEnvios(con({})), "");
  assert.equal(errorEnvios(con({ envio_retiro: true })), "");
  assert.equal(errorEnvios(dom({})), "");
  assert.equal(errorEnvios(con({ envio_zonas: ["Palermo"] })), "Sin envío a domicilio, los datos del envío quedan vacíos.");
  assert.equal(errorEnvios(dom({ envio_zonas: ["Palermo", "palermo"] })), "Revise las zonas: sin repetir, de hasta 200 caracteres y 30 como máximo.");
  assert.equal(errorEnvios(dom({ envio_zonas: [" Palermo"] })), "Revise las zonas: sin repetir, de hasta 200 caracteres y 30 como máximo.");
  assert.equal(errorEnvios(dom({ envio_todo_el_pais: true })), "Elija «Todo el país» o escriba las zonas, no las dos.");
  assert.equal(errorEnvios(dom({ envio_costo_fijo: 0 })), "Escriba el costo fijo del envío.");
  assert.equal(errorEnvios(dom({ envio_costo: "zona", envio_costo_fijo: null, envio_costos_zona: { Palermo: 0 } })), "Escriba el costo del envío de cada zona.");
  assert.equal(errorEnvios(dom({ envio_costo: "zona", envio_costo_fijo: null, envio_costos_zona: { Palermo: 0, Belgrano: 1.5 } })), "Escriba el costo del envío de cada zona.");
  assert.equal(errorEnvios(dom({ envio_costo: "gratis", envio_costo_fijo: null, envio_gratis: true, envio_gratis_minimo: 100 })), "Si el envío ya es gratis, no hace falta una condición.");
  assert.equal(errorEnvios(dom({ envio_gratis: true })), "Indique en qué zonas o desde qué monto el envío es gratis.");
  assert.equal(errorEnvios(dom({ envio_gratis: true, envio_gratis_zonas: ["Núñez"] })), "Las zonas con envío gratis tienen que estar en la lista de zonas.");
  assert.equal(errorEnvios(dom({ envio_plazo_desde: 4, envio_plazo_hasta: 2 })), "El plazo de entrega va de 1 a 60 días hábiles, y el primero no puede ser mayor que el segundo.");
  assert.equal(errorEnvios(con({ envio_plazo_desde: 2, envio_plazo_hasta: null })), "El plazo de entrega va de 1 a 60 días hábiles, y el primero no puede ser mayor que el segundo.");
  assert.equal(errorEnvios(dom({ envio_plazo_desde: 61, envio_plazo_hasta: 61 })), "El plazo de entrega va de 1 a 60 días hábiles, y el primero no puede ser mayor que el segundo.");
  assert.ok(!tieneEnvios(con({})) && tieneEnvios(con({ envio_retiro: true })) && tieneEnvios(dom({})));
});

await caso("frases del sitio: las del pedido, solo con lo que cargó la tienda", () => {
  assert.deepEqual(frasesEnvio(con({})), []);
  assert.deepEqual(frasesEnvio(con({ envio_retiro: true })), ["Retiro en el local."]);
  assert.deepEqual(frasesEnvio(dom({ envio_zonas: [], envio_todo_el_pais: true, envio_costo_fijo: 15000 })), ["Envío a todo el país: $15.000."]);
  assert.deepEqual(frasesEnvio(dom({ envio_gratis: true, envio_gratis_zonas: ["Palermo", "Belgrano"], envio_plazo_desde: 2, envio_plazo_hasta: 4 })),
    ["Envío a Palermo y Belgrano: $3.500.", "Envío gratis en Palermo y Belgrano.", "Entrega en 2 a 4 días hábiles."]);
  assert.deepEqual(frasesEnvio(dom({ envio_gratis: true, envio_gratis_minimo: 300000 })), ["Envío a Palermo y Belgrano: $3.500.", "Envío gratis en compras desde $300.000."]);
  assert.deepEqual(frasesEnvio(dom({ envio_costo: "zona", envio_costo_fijo: null, envio_costos_zona: { Palermo: 0, Belgrano: 2500 } })),
    ["Envío gratis a Palermo.", "Envío a Belgrano: $2.500."]);
  assert.deepEqual(frasesEnvio(dom({ envio_costo: "al_recibir", envio_costo_fijo: null, envio_zonas: ["CABA"] })), ["Envío a CABA: lo paga al recibir."]);
  assert.deepEqual(frasesEnvio(dom({ envio_costo: "gratis", envio_costo_fijo: null, envio_zonas: ["Palermo", "Belgrano", "Núñez"] })), ["Envío gratis a Palermo, Belgrano y Núñez."]);
  assert.deepEqual(frasesEnvio(con({ envio_retiro: true, envio_plazo_desde: 1, envio_plazo_hasta: 1 })), ["Retiro en el local.", "Entrega en 1 día hábil."]);
  assert.deepEqual(frasesEnvio(con({ envio_plazo_desde: 2, envio_plazo_hasta: 4 })), [], "sin forma de entrega no se muestra el plazo");
});

await caso("frases en portugués y con la moneda del país", async () => {
  await cargarIdioma("pt");
  fijarPais("br");
  assert.deepEqual(frasesEnvio(dom({ envio_gratis: true, envio_gratis_zonas: ["Centro"], envio_zonas: ["Centro"], envio_costo_fijo: 20 })),
    ["Envio para Centro: R$ 20.", "Frete grátis em Centro."]);
  await cargarIdioma("es");
  fijarPais("ar");
});

console.log(`\nOK: ${casos} casos de envíos`);
