// Formas de pago (assets/js/datos/comun.js y pasarelas.js, ronda 3, C3), sin navegador:
//   node tests/pagos.test.mjs
import assert from "node:assert/strict";
import fs from "node:fs";
import { errorPagos, frasesPagos, clavesDescuento } from "../assets/js/datos/comun.js";
import { PASARELAS, CLAVES_PASARELAS, PASARELAS_POR_PAIS, PASARELAS_REGIONALES, gruposPasarelas } from "../assets/js/datos/pasarelas.js";

let casos = 0;
const caso = (nombre, fn) => { fn(); casos++; console.log(`ok   ${nombre}`); };
const VACIO = { pagos_medios: [], pagos_cuotas: false, pagos_cuotas_max: null, pagos_sin_interes: false, pagos_sin_interes_max: null,
  pagos_cripto: false, pagos_cripto_cuales: "", pagos_pasarelas: [], pagos_pasarelas_otras: [], pagos_descuentos: {}, pagos_otras: [] };
const con = (c) => ({ ...structuredClone(VACIO), ...c });

caso("las claves de las pasarelas son las del check de 0024 y las de antes no cambian", () => {
  const sql = fs.readFileSync(new URL("../supabase/migrations/0024_pagos.sql", import.meta.url), "utf8");
  const check = sql.match(/check \(pagos_pasarelas <@ array\[([^\]]+)\]\)/)[1].match(/'([a-z_]+)'/g).map((x) => x.slice(1, -1));
  assert.deepEqual(check, CLAVES_PASARELAS);
  for (const c of ["mercado_pago", "pse", "nequi", "daviplata", "wompi", "bold"]) assert.ok(PASARELAS[c], c);
  for (const lista of [...Object.values(PASARELAS_POR_PAIS), PASARELAS_REGIONALES]) for (const c of lista) assert.ok(PASARELAS[c], c);
});

caso("por país: primero las del país, después las regionales (sin repetir) y las elegidas que no están", () => {
  assert.deepEqual(gruposPasarelas("ar"), [
    { grupo: "pais", claves: ["mercado_pago", "modo", "cuenta_dni", "uala", "naranja_x"] },
    { grupo: "regionales", claves: ["paypal", "payu", "dlocal", "stripe"] }]);
  assert.deepEqual(gruposPasarelas("br")[0].claves.map((c) => PASARELAS[c]), ["Pix", "Mercado Pago", "PagBank", "PicPay"]);
  assert.deepEqual(gruposPasarelas("mx")[0].claves.map((c) => PASARELAS[c]), ["Mercado Pago", "SPEI", "OXXO Pay", "Clip"]);
  assert.deepEqual(gruposPasarelas("cl")[0].claves.map((c) => PASARELAS[c]), ["Webpay", "Khipu", "Mercado Pago"]);
  assert.deepEqual(gruposPasarelas("pe")[0].claves.map((c) => PASARELAS[c]), ["Yape", "Plin", "Niubiz", "Izipay"]);
  assert.deepEqual(gruposPasarelas("co").map((g) => g.claves), [["pse", "nequi", "daviplata", "wompi", "bold", "epayco", "payu"], ["paypal", "dlocal", "stripe"]]);
  assert.deepEqual(gruposPasarelas("gt"), [{ grupo: "regionales", claves: ["paypal", "payu", "dlocal", "stripe"] }], "sin lista propia: las regionales");
  assert.deepEqual(gruposPasarelas("ar", ["pse"]).at(-1), { grupo: "otras", claves: ["pse"] }, "una elegida de otro país se sigue viendo");
});

caso("descuentos: de 1 a 90 y solo en lo que acepta; las frases los dicen sin tocar nada más", () => {
  const t = con({ pagos_medios: ["transferencia", "credito"], pagos_cuotas: true, pagos_cuotas_max: 12, pagos_cripto: true, pagos_cripto_cuales: "USDT",
    pagos_pasarelas: ["pse", "nequi"], pagos_pasarelas_otras: ["Addi"] });
  assert.deepEqual(clavesDescuento(t).map((x) => x.clave), ["medio:transferencia", "medio:credito", "cripto", "pasarela:pse", "pasarela:nequi", "otra:Addi"]);
  assert.equal(errorPagos({ ...t, pagos_descuentos: { "medio:transferencia": 10, "otra:Addi": 90 } }), "");
  for (const malo of [{ "medio:efectivo": 10 }, { "medio:transferencia": 0 }, { "medio:transferencia": 91 }, { "medio:transferencia": 2.5 }, { "otra:Sistecrédito": 5 }]) {
    assert.equal(errorPagos({ ...t, pagos_descuentos: malo }), "Revise los descuentos: de 1 a 90 %, y solo en formas de pago que acepta.", JSON.stringify(malo));
  }
  assert.equal(errorPagos({ ...t, pagos_pasarelas_otras: ["Addi", "addi"] }), "Revise las otras pasarelas: hasta 10, sin repetir y de hasta 60 caracteres.");
  assert.deepEqual(frasesPagos({ ...t, pagos_descuentos: { "medio:transferencia": 10, "medio:credito": 5, cripto: 3, "pasarela:pse": 2 } }), [
    "Transferencia bancaria: 10 % de descuento.", "Tarjeta de crédito: hasta 12 cuotas; 5 % de descuento.", "Criptomonedas: USDT; 3 % de descuento.",
    "Pago en línea con Nequi y Addi.", "PSE: 2 % de descuento."]);
  assert.deepEqual(frasesPagos(t), ["Transferencia bancaria.", "Tarjeta de crédito: hasta 12 cuotas.", "Criptomonedas: USDT.", "Pago en línea con PSE, Nequi y Addi."], "sin descuentos, como antes");
  assert.deepEqual(frasesPagos(con({ pagos_cripto: true, pagos_descuentos: { cripto: 8 } })), ["Criptomonedas: 8 % de descuento."]);
});

console.log(`\nOK: ${casos} casos de formas de pago`);
