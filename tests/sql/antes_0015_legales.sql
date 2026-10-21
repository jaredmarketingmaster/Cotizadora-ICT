-- Unos términos que la tienda ya había escrito antes de 0015, para probar que
-- el texto base solo se carga donde estaba vacío.
update public.tienda set texto_terminos = 'Términos que ya escribió la tienda.' where id = 1;
