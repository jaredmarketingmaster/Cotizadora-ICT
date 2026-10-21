-- Un aviso de marca que la tienda había escrito antes de 0016, para probar que
-- pasa a la cláusula propia de los términos, después de sus términos
-- (antes_0015). La política y la casilla quedan con el texto base de 0015,
-- que se descarta.
update public.tienda set aviso_marca = 'Aviso de marca propio.' where id = 1;
