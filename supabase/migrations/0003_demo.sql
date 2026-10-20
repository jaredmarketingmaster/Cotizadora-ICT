-- =============================================================================
-- Datos de demostración (es_demo = true)
-- -----------------------------------------------------------------------------
-- 6 equipos sin fotos (el sitio dibuja una ilustración genérica) y con la
-- palabra DEMO junto al precio. Los precios son redondos y de ejemplo: no son
-- precios reales. Mientras tienda.modo_demo = true, el sitio muestra la franja
-- "Sitio en preparación".
--
-- Para que se vean, se activan los 4 modelos que usan (activo_por_demo = true).
-- "Borrar datos de demostración" (función borrar_datos_demo) borra estos
-- equipos, vuelve a apagar esos modelos y apaga el modo demo.
--
-- Debe coincidir con DEMO_EQUIPOS de assets/js/datos/semilla.js (lo revisa
-- tests/sql/probar.sh).
-- =============================================================================

update public.tienda set nombre = 'Tienda de demostración', modo_demo = true where id = 1;

update public.modelos set activo = true, activo_por_demo = true
where slug in ('iphone-18-pro-max', 'iphone-18-pro', 'iphone-15-pro', 'iphone-13')
  and not activo;

insert into public.equipos
  (modelo_id, condicion, capacidad, color_nombre, color_hex, precio, stock,
   publicado, destacado, es_demo, bateria_porcentaje, estado_estetico, detalles, incluye)
select m.id, d.condicion, d.capacidad, d.color_nombre, d.color_hex, d.precio, d.stock,
       true, d.destacado, true, d.bateria, d.estado, d.detalles, d.incluye
from (values
  ('iphone-18-pro-max', 'nuevo', '256 GB', 'Negro',           '#1C1C1E', 6000000, 3, true,  null::smallint, null::text,  '',                       ''),
  ('iphone-18-pro-max', 'nuevo', '256 GB', 'Plata',           '#D9DADC', 6200000, 2, true,  null,           null,        '',                       ''),
  ('iphone-18-pro-max', 'nuevo', '512 GB', 'Burgundy',        '#6E1F2E', 7000000, 1, false, null,           null,        '',                       ''),
  ('iphone-18-pro',     'nuevo', '256 GB', 'Glacier',         '#CFE0EA', 5500000, 2, false, null,           null,        '',                       ''),
  ('iphone-15-pro',     'usado', '128 GB', 'Titanio natural', '#BAB4A9', 3000000, 1, false, 88,             'Excelente', 'Rayón leve en el marco', 'Caja y cable'),
  ('iphone-13',         'usado', '128 GB', 'Medianoche',      '#232A31', 1800000, 1, false, 84,             'Muy bueno', '',                       'Solo el equipo')
) as d (slug, condicion, capacidad, color_nombre, color_hex, precio, stock, destacado, bateria, estado, detalles, incluye)
join public.modelos m on m.slug = d.slug;
