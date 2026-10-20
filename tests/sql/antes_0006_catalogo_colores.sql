-- Con el catálogo de antes de 0006: un modelo que agregó la agencia (no está
-- en la fuente) debe quedar al final, después del Duo. pruebas.sql lo revisa y
-- lo borra.
insert into public.modelos (nombre, slug, generacion, orden) values ('iPhone Prueba', 'iphone-prueba', 'Prueba', 330);
