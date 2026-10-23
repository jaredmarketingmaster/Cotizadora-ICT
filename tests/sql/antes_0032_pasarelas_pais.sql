-- La tienda había elegido dLocal, con 5 % de descuento, antes de 0032: debe
-- quedar como otra pasarela "dLocal" con su descuento.
update public.tienda
set pagos_pasarelas = pagos_pasarelas || array['dlocal'],
    pagos_descuentos = pagos_descuentos || '{"pasarela:dlocal": 5}'::jsonb;
