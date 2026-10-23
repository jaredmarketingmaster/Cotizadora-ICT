-- =============================================================================
-- 0032 — Pasarelas de pago por país
-- -----------------------------------------------------------------------------
-- Punto 7 de la investigación de Jared con Gemini (aprobado el 23/10/2026).
-- assets/js/datos/pasarelas.js tiene las listas:
-- - Listas propias para los 13 países que no tenían (Bolivia, Costa Rica, Cuba,
--   Ecuador, El Salvador, Guatemala, Honduras, Nicaragua, Panamá, Paraguay,
--   República Dominicana, Uruguay y Venezuela), sin pasarelas genéricas.
-- - Regionales según el país: PayPal en todos menos Cuba; PayU en Argentina,
--   Brasil, Chile, Colombia, México, Panamá y Perú; Stripe en Brasil y México.
-- - dLocal sale: no abre cuentas a tiendas. Una tienda que la había elegido la
--   conserva como "otra pasarela" con el nombre "dLocal" (y su descuento, si
--   tenía), para que no se pierda lo que ya muestra el sitio.
-- =============================================================================

update public.tienda
set pagos_pasarelas_otras = case
      when exists (select 1 from unnest(pagos_pasarelas_otras) x where lower(x) = 'dlocal') or cardinality(pagos_pasarelas_otras) >= 10
        then pagos_pasarelas_otras
      else pagos_pasarelas_otras || array['dLocal'] end,
    pagos_descuentos = case
      when pagos_descuentos ? 'pasarela:dlocal' and not exists (select 1 from unnest(pagos_pasarelas_otras) x where lower(x) = 'dlocal') and cardinality(pagos_pasarelas_otras) < 10
        then (pagos_descuentos - 'pasarela:dlocal') || jsonb_build_object('otra:dLocal', pagos_descuentos -> 'pasarela:dlocal')
      else pagos_descuentos - 'pasarela:dlocal' end,
    pagos_pasarelas = array_remove(pagos_pasarelas, 'dlocal')
where 'dlocal' = any (pagos_pasarelas);

alter table public.tienda drop constraint tienda_pagos_pasarelas_check;
alter table public.tienda add constraint tienda_pagos_pasarelas_check
  check (pagos_pasarelas <@ array['mercado_pago', 'modo', 'cuenta_dni', 'uala', 'naranja_x', 'pix', 'pagbank', 'picpay', 'spei', 'oxxo_pay', 'clip', 'pse', 'nequi', 'daviplata', 'wompi', 'bold', 'epayco', 'payu', 'webpay', 'khipu', 'yape', 'plin', 'niubiz', 'izipay', 'paypal', 'stripe', 'qr_simple', 'tigo_money', 'libelula', 'sinpe_movil', 'compra_click', 'wink', 'transfermovil', 'enzona', 'tropipay', 'deuna', 'payphone', 'peigo', 'kushki', 'transfer365', 'wompi_sv', 'chivo_wallet', 'pagadito', 'fri', 'visa_en_link', 'qpaypro', 'ach_pronto', 'tengo', 'pixelpay', 'billetera_banpro', 'yappy', 'ach_xpress', 'nequi_pa', 'cuanto', 'zimple', 'bancard_vpos', 'billetera_personal', 'tpago', 'azul', 'cardnet', 'prex', 'midinero', 'paganza', 'redpagos_abitab', 'pago_movil', 'zinli', 'binance_pay', 'biopago_bdv']);
