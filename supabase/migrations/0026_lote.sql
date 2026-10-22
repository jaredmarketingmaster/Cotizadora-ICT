-- =============================================================================
-- 0026: carga de equipos en lote (ronda 3, D).
--   - crear_equipos_lote(lote jsonb): crea todos los equipos de una lista en
--     una sola transacción. Si uno falla, no se crea ninguno, y el mensaje
--     dice qué variante falló: "Variante 3: Elija el color.".
--     Corre con los permisos de quien llama (security invoker): vale la RLS
--     (solo el gestor agrega equipos) y todos los disparadores de siempre
--     (color oficial 0008, más vendido 0010, fecha de precios). Hasta 200
--     equipos por lote.
--   - archivos_en_uso(bucket, rutas): de esas rutas, las que algún equipo
--     todavía usa (en fotos o en video). Un lote reparte las mismas fotos y
--     el mismo video entre los equipos de un color: el panel solo borra de
--     Storage un archivo que ningún equipo usa.
-- demo.js repite las dos (crearEquiposLote y archivosEnUso).
-- =============================================================================

create or replace function public.crear_equipos_lote(lote jsonb)
returns setof public.equipos
language plpgsql security invoker set search_path = public as $$
declare
  i integer;
  d jsonb;
  fila public.equipos;
begin
  if jsonb_typeof(lote) is distinct from 'array' or jsonb_array_length(lote) = 0 then
    raise exception 'El lote no tiene equipos.' using errcode = '22023';
  end if;
  if jsonb_array_length(lote) > 200 then
    raise exception 'Un lote puede tener hasta 200 equipos.' using errcode = '22023';
  end if;
  for i in 0 .. jsonb_array_length(lote) - 1 loop
    d := lote -> i;
    begin
      if jsonb_typeof(d) is distinct from 'object' then
        raise exception 'Algún dato no tiene el formato correcto. Revise los campos.' using errcode = '22023';
      end if;
      -- El mismo mensaje que demo.js (el check de la tabla solo diría "formato").
      if jsonb_typeof(d -> 'precio') is distinct from 'number' or (d ->> 'precio')::numeric <= 0
         or (d ->> 'precio')::numeric <> trunc((d ->> 'precio')::numeric) then
        raise exception 'El precio debe ser un número entero mayor que 0.' using errcode = '23514';
      end if;
      insert into public.equipos (
        modelo_id, condicion, capacidad, color_id, color_nombre_mostrar, precio, en_stock,
        fotos, video, publicado, destacado, mas_vendido, descripcion_extra,
        bateria_porcentaje, estado_estetico, detalles, incluye
      ) values (
        (d ->> 'modelo_id')::bigint,
        d ->> 'condicion',
        d ->> 'capacidad',
        (d ->> 'color_id')::bigint,
        coalesce(d ->> 'color_nombre_mostrar', ''),
        (d ->> 'precio')::bigint,
        coalesce((d ->> 'en_stock')::boolean, true),
        case when jsonb_typeof(d -> 'fotos') = 'array'
             then array(select jsonb_array_elements_text(d -> 'fotos')) else '{}' end,
        coalesce(d ->> 'video', ''),
        coalesce((d ->> 'publicado')::boolean, false),
        coalesce((d ->> 'destacado')::boolean, false),
        coalesce((d ->> 'mas_vendido')::boolean, false),
        coalesce(d ->> 'descripcion_extra', ''),
        (d ->> 'bateria_porcentaje')::smallint,
        d ->> 'estado_estetico',
        coalesce(d ->> 'detalles', ''),
        coalesce(d ->> 'incluye', '')
      ) returning * into fila;
    exception when others then
      -- Volver a lanzar el error revierte todo el lote (también lo ya insertado).
      raise exception using message = format('Variante %s: %s', i + 1, sqlerrm), errcode = sqlstate;
    end;
    return next fila;
  end loop;
end $$;

revoke execute on function public.crear_equipos_lote(jsonb) from public, anon;
grant execute on function public.crear_equipos_lote(jsonb) to authenticated;

create or replace function public.archivos_en_uso(bucket text, rutas text[])
returns setof text
language sql stable security invoker set search_path = public as $$
  select distinct r from unnest(rutas) as r
  where (bucket = 'fotos' and exists (select 1 from public.equipos e where r = any (e.fotos)))
     or (bucket = 'videos' and exists (select 1 from public.equipos e where e.video = r));
$$;

revoke execute on function public.archivos_en_uso(text, text[]) from public, anon;
grant execute on function public.archivos_en_uso(text, text[]) to authenticated;
