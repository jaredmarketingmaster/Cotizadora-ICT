-- Una reseña que ya existía antes de 0034: queda con la autorización "sin
-- registrar" y se puede seguir editando (bloque 0u de pruebas.sql la borra).
insert into public.resenas (tipo, ruta, texto, autorizado, orden) values ('imagen', 'resenas/antes0034.webp', 'Vieja', true, 0);
