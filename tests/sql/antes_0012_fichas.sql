-- Una ficha que la tienda ya había cargado antes de 0012 (iPhone 13), para
-- probar que la precarga de la fuente no la pisa.
update public.fichas set descripcion = 'Descripción de la tienda',
  especificaciones = '[{"etiqueta": "Pantalla", "valor": "Dato de la tienda"}]'::jsonb
where modelo_id = (select id from public.modelos where slug = 'iphone-13');
