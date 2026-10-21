// Pruebas de los datos de país (assets/js/datos/paises.js), sin navegador:
//   node tests/paises.test.mjs
import assert from "node:assert/strict";
import {
  PAISES_TIENDA, datosPais, formatearPrecio, fechaCortaPais, fechaConZona,
  celularNacionalValido, celularInternacional, agruparCelular, whatsappValido
} from "../assets/js/datos/paises.js";
import { CODIGOS_PAISES } from "../assets/js/legal/paises/indice.js";

let casos = 0;
const caso = (nombre, fn) => { fn(); casos++; console.log(`ok   ${nombre}`); };

caso("los 19 países de la tienda son los del índice legal", () => {
  assert.deepEqual(Object.keys(PAISES_TIENDA).sort(), [...CODIGOS_PAISES].sort());
  for (const [c, p] of Object.entries(PAISES_TIENDA)) {
    assert.match(p.moneda, /^[A-Z]{3}$/, c);
    assert.ok(p.simbolo && p.zona.startsWith("America/") && /^\d{1,3}$/.test(p.prefijo), c);
  }
});

caso("precio por moneda: ARS, COP, BRL y MXN, sin decimales", () => {
  assert.equal(formatearPrecio(5299000, "ar"), "$5.299.000");
  assert.equal(formatearPrecio(5299000, "co"), "$5.299.000");
  assert.equal(formatearPrecio(5299000, "br"), "R$ 5.299.000");
  assert.equal(formatearPrecio(5299000, "mx"), "$5,299,000");
  assert.equal(formatearPrecio(999, "mx"), "$999");
  assert.deepEqual(["ar", "co", "br", "mx"].map((c) => datosPais(c).moneda), ["ARS", "COP", "BRL", "MXN"]);
});

caso("fecha corta y fecha con zona según el país", () => {
  const d = "2026-03-05T04:30:00Z";
  assert.equal(fechaCortaPais(d, "co"), "4/3/2026");
  assert.equal(fechaCortaPais(d, "ar"), "5/3/2026");
  assert.equal(fechaConZona(new Date(d), "co"), "2026-03-04T23:30:00-05:00");
  assert.equal(fechaConZona(new Date(d), "ar"), "2026-03-05T01:30:00-03:00");
  assert.equal(fechaConZona(new Date(d), "mx"), "2026-03-04T22:30:00-06:00");
});

caso("celular del cliente por país: prefijo, validación, agrupado y número internacional", () => {
  assert.equal(datosPais("ar").celular.visible, "+54 9");
  assert.equal(datosPais("co").celular.visible, "+57");
  assert.ok(celularNacionalValido("1123456789", "ar"));
  assert.ok(!celularNacionalValido("01123456789", "ar"), "Argentina: sin el 0");
  assert.ok(!celularNacionalValido("111523456789", "ar"), "Argentina: sin el 15 (queda largo)");
  assert.equal(celularInternacional("1123456789", "ar"), "5491123456789");
  assert.ok(celularNacionalValido("3001234567", "co") && !celularNacionalValido("2001234567", "co"));
  assert.ok(celularNacionalValido("11912345678", "br") && !celularNacionalValido("1112345678", "br"), "Brasil: nono dígito");
  assert.ok(celularNacionalValido("5512345678", "mx") && !celularNacionalValido("15512345678", "mx"), "México: 10 dígitos, sin el 1");
  assert.ok(celularNacionalValido("912345678", "cl") && celularNacionalValido("912345678", "pe"));
  assert.ok(celularNacionalValido("12345678", "gt") && !celularNacionalValido("1234", "gt"), "general: 8 a 15 en total");
  assert.equal(agruparCelular("1123456789", "ar"), "11 2345 6789");
  assert.equal(agruparCelular("300123", "co"), "300 123");
  assert.equal(agruparCelular("11912345678", "br"), "11 91234 5678");
});

caso("WhatsApp de la tienda por país", () => {
  assert.ok(whatsappValido("5491123456789", "ar") && !whatsappValido("541123456789", "ar"));
  assert.ok(whatsappValido("573001234567", "co") && !whatsappValido("573001234567", "ar"));
  assert.ok(whatsappValido("50212345678", "gt") && !whatsappValido("502", "gt"));
});

console.log(`\nOK: ${casos} casos de datos de país`);
