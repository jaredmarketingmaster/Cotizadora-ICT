-- Datos con el esquema de antes de 0004 (stock numérico), para probar que la
-- migración los convierte: stock > 0 → en_stock verdadero; 0 → falso.
-- pruebas.sql los revisa y los borra antes de seguir.
insert into public.equipos (modelo_id, condicion, capacidad, color_nombre, precio, stock, publicado)
select id, 'nuevo', 'MIGRACION', 'Stock 4', 1000000, 4, true from public.modelos where slug = 'iphone-18-pro';
insert into public.equipos (modelo_id, condicion, capacidad, color_nombre, precio, stock, publicado)
select id, 'usado', 'MIGRACION', 'Stock 0', 1000000, 0, true from public.modelos where slug = 'iphone-13';
