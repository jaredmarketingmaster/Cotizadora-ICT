// =============================================================================
// Pasarelas de pago por país (ronda 3, C3). La lista la dio Jared; es de
// conocimiento general y NO está verificada con fuentes (ver DOCUMENTACION.md,
// sección de pendientes). En el panel se muestran primero las del país de la
// tienda y después las regionales; una pasarela ya elegida que no está en
// ninguna de las dos (por ejemplo, si la tienda cambió de país) se sigue
// mostrando para que se pueda quitar.
// Las claves son las del check de tienda.pagos_pasarelas (0024_pagos.sql): las
// de antes (mercado_pago, pse, nequi, daviplata, wompi, bold) no cambian.
// Los nombres son marcas: no se traducen.
// =============================================================================

export const PASARELAS = {
  mercado_pago: "Mercado Pago", modo: "MODO", cuenta_dni: "Cuenta DNI", uala: "Ualá", naranja_x: "Naranja X",
  pix: "Pix", pagbank: "PagBank", picpay: "PicPay",
  spei: "SPEI", oxxo_pay: "OXXO Pay", clip: "Clip",
  pse: "PSE", nequi: "Nequi", daviplata: "Daviplata", wompi: "Wompi", bold: "Bold", epayco: "ePayco", payu: "PayU",
  webpay: "Webpay", khipu: "Khipu",
  yape: "Yape", plin: "Plin", niubiz: "Niubiz", izipay: "Izipay",
  paypal: "PayPal", dlocal: "dLocal", stripe: "Stripe"
};
export const CLAVES_PASARELAS = Object.keys(PASARELAS);

export const PASARELAS_POR_PAIS = {
  ar: ["mercado_pago", "modo", "cuenta_dni", "uala", "naranja_x"],
  br: ["pix", "mercado_pago", "pagbank", "picpay"],
  mx: ["mercado_pago", "spei", "oxxo_pay", "clip"],
  co: ["pse", "nequi", "daviplata", "wompi", "bold", "epayco", "payu"],
  cl: ["webpay", "khipu", "mercado_pago"],
  pe: ["yape", "plin", "niubiz", "izipay"]
};
export const PASARELAS_REGIONALES = ["paypal", "payu", "dlocal", "stripe"];

// Grupos para el panel: [{ grupo: "pais" | "regionales" | "otras", claves }].
export function gruposPasarelas(pais, elegidas = []) {
  const delPais = PASARELAS_POR_PAIS[pais] || [];
  const regionales = PASARELAS_REGIONALES.filter((c) => !delPais.includes(c));
  const sueltas = elegidas.filter((c) => PASARELAS[c] && !delPais.includes(c) && !regionales.includes(c));
  return [
    { grupo: "pais", claves: delPais },
    { grupo: "regionales", claves: regionales },
    { grupo: "otras", claves: sueltas }
  ].filter((g) => g.claves.length);
}
