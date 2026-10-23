// =============================================================================
// Pasarelas de pago por país (ronda 3, C3; corregidas con la investigación de
// Jared con Gemini, punto 7, 23/10/2026: listas de los 19 países, dónde operan
// las regionales y sin dLocal). Los informes no se pudieron contrastar con las
// páginas de cada pasarela (sección 17 de DOCUMENTACION.md). En el panel se muestran primero las del país de la
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
  paypal: "PayPal", stripe: "Stripe",
  // 0032 (investigación con Gemini, punto 7): los 13 países que no tenían lista.
  qr_simple: "QR Simple", tigo_money: "Tigo Money", libelula: "Libélula",
  sinpe_movil: "SINPE Móvil", compra_click: "Compra-Click", wink: "Wink",
  transfermovil: "Transfermóvil", enzona: "EnZona", tropipay: "Tropipay",
  deuna: "Deuna!", payphone: "Payphone", peigo: "Peigo", kushki: "Kushki",
  transfer365: "Transfer365", wompi_sv: "Wompi SV", chivo_wallet: "Chivo Wallet", pagadito: "Pagadito",
  fri: "Fri", visa_en_link: "Visa en Link", qpaypro: "QPayPro",
  ach_pronto: "ACH Pronto", tengo: "Tengo", pixelpay: "PixelPay",
  billetera_banpro: "Billetera Banpro",
  yappy: "Yappy", ach_xpress: "ACH Xpress", nequi_pa: "Nequi Panamá", cuanto: "Cuanto",
  zimple: "Zimple", bancard_vpos: "Bancard vPOS", billetera_personal: "Billetera Personal",
  tpago: "tPago", azul: "Azul", cardnet: "CardNET",
  prex: "Prex", midinero: "MiDinero", paganza: "Paganza", redpagos_abitab: "Redpagos/Abitab",
  pago_movil: "Pago Móvil", zinli: "Zinli", binance_pay: "Binance Pay", biopago_bdv: "BiopagoBDV"
};
export const CLAVES_PASARELAS = Object.keys(PASARELAS);

export const PASARELAS_POR_PAIS = {
  ar: ["mercado_pago", "modo", "cuenta_dni", "uala", "naranja_x"],
  bo: ["qr_simple", "tigo_money", "libelula"],
  br: ["pix", "mercado_pago", "pagbank", "picpay"],
  cl: ["webpay", "khipu", "mercado_pago"],
  co: ["pse", "nequi", "daviplata", "wompi", "bold", "epayco", "payu"],
  cr: ["sinpe_movil", "compra_click", "wink"],
  cu: ["transfermovil", "enzona", "tropipay"],
  ec: ["deuna", "payphone", "peigo", "kushki"],
  sv: ["transfer365", "wompi_sv", "chivo_wallet", "tigo_money", "pagadito"],
  gt: ["fri", "visa_en_link", "qpaypro"],
  hn: ["ach_pronto", "tengo", "tigo_money", "compra_click", "pixelpay"],
  mx: ["mercado_pago", "spei", "oxxo_pay", "clip"],
  ni: ["billetera_banpro", "compra_click", "pagadito"],
  pa: ["yappy", "ach_xpress", "nequi_pa", "cuanto", "compra_click"],
  py: ["tigo_money", "zimple", "bancard_vpos", "billetera_personal"],
  pe: ["yape", "plin", "niubiz", "izipay"],
  do: ["tpago", "azul", "cardnet"],
  uy: ["prex", "midinero", "paganza", "mercado_pago", "redpagos_abitab"],
  ve: ["pago_movil", "zinli", "binance_pay", "biopago_bdv"]
};

// Regionales y dónde operan (0032): PayPal en todos menos Cuba; PayU en
// Argentina, Brasil, Chile, Colombia, México, Panamá y Perú; Stripe en Brasil y
// México. dLocal salió de la lista (cobra a comercios grandes, no a tiendas).
export const PASARELAS_REGIONALES = ["paypal", "payu", "stripe"];
export const PAISES_REGIONALES = {
  paypal: (pais) => pais !== "cu",
  payu: (pais) => ["ar", "br", "cl", "co", "mx", "pa", "pe"].includes(pais),
  stripe: (pais) => ["br", "mx"].includes(pais)
};

// Pasarelas con una nota en el panel (texto "panel.pagos.pasarelas.nota.<clave>").
export const NOTAS_PASARELAS = ["cuenta_dni"];

// Grupos para el panel: [{ grupo: "pais" | "regionales" | "otras", claves }].
export function gruposPasarelas(pais, elegidas = []) {
  const delPais = PASARELAS_POR_PAIS[pais] || [];
  const regionales = PASARELAS_REGIONALES.filter((c) => PAISES_REGIONALES[c](pais) && !delPais.includes(c));
  const sueltas = elegidas.filter((c) => PASARELAS[c] && !delPais.includes(c) && !regionales.includes(c));
  return [
    { grupo: "pais", claves: delPais },
    { grupo: "regionales", claves: regionales },
    { grupo: "otras", claves: sueltas }
  ].filter((g) => g.claves.length);
}
