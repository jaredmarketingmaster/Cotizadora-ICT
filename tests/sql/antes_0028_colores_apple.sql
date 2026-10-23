-- Antes de 0028: un equipo (no publicado) del 18 Pro con Visón, que sale del
-- catálogo: debe quedar como color de la tienda. Y dos colores propios del
-- 17 Pro (que no tenía oficiales): "Plata", sin muestra, pasa a ser el oficial;
-- "Rojo" queda como color de la tienda.
insert into public.colores (modelo_id, nombre_es, nombre_en, hex, orden, oficial)
select id, 'Plata', '', '', 1, false from public.modelos where slug = 'iphone-17-pro';
insert into public.colores (modelo_id, nombre_es, nombre_en, hex, orden, oficial)
select id, 'Rojo', '', '#C0392B', 2, false from public.modelos where slug = 'iphone-17-pro';
insert into public.equipos (modelo_id, condicion, capacidad, color_id, color_nombre_mostrar, precio, en_stock, publicado)
select m.id, 'nuevo', 'ANTES0028', c.id, '', 1000000, true, false
from public.modelos m join public.colores c on c.modelo_id = m.id and c.nombre_es = 'Visón' where m.slug = 'iphone-18-pro';
