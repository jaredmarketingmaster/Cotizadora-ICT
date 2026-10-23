-- La tienda ya cargó su propia batería en la ficha del iPhone 13 (la que dejó
-- antes_0012), para probar que 0029 no agrega otra fila de batería ni toca las
-- de la tienda.
update public.fichas
set especificaciones = especificaciones || '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Dato de batería de la tienda"}]'::jsonb
where modelo_id = (select id from public.modelos where slug = 'iphone-13');
