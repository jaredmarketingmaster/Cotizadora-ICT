-- La lista libre de formas de pago de antes de 0013, para probar que pasa a
-- pagos_otras sin perder nada.
update public.tienda set formas_pago = '{Addi,"Sistecrédito"}' where id = 1;
