-- Estado de la base que restablecer_fabrica() (0036) debe dejar igual al de una
-- instalación nueva: la tienda, el catálogo (modelos, colores y fichas), los
-- equipos y las reseñas. Sin los ids de los equipos ni las fechas, que cambian
-- en cada instalación. Lo usan tests/sql/probar.sh (para comparar) y
-- tests/sql/fabrica.mjs (para generar datos_fabrica()).
select jsonb_build_object(
  'tienda', (select to_jsonb(t) - '{id,actualizado_en,precios_actualizados_en,usd_actualizado_en}'::text[] from public.tienda t),
  -- 0041: la fecha de la cotización la pone el disparador al instalar o restablecer.
  'usd_con_fecha', (select (usd_cotizacion is null) = (usd_actualizado_en is null) from public.tienda),
  'modelos', (select jsonb_agg(to_jsonb(m) - 'creado_en' order by m.id) from public.modelos m),
  'colores', (select jsonb_agg(to_jsonb(c) order by c.id) from public.colores c),
  'fichas', (select jsonb_agg(to_jsonb(f) - 'actualizado_en' order by f.modelo_id) from public.fichas f),
  'equipos', (select coalesce(jsonb_agg(to_jsonb(e) - '{id,creado_en,actualizado_en}'::text[]
                order by e.modelo_id, e.condicion, e.capacidad, e.color_id), '[]') from public.equipos e),
  'resenas', (select coalesce(jsonb_agg(to_jsonb(r) - '{id,creado_en}'::text[] order by r.orden, r.ruta), '[]') from public.resenas r),
  -- 0037: los datos que siguen siendo de ejemplo.
  'ejemplo', (select to_jsonb(public.datos_de_ejemplo(t)) from public.tienda t)
);
