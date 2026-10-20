-- =============================================================================
-- 0004 — El stock pasa de número a sí/no ("Con stock" / "Sin stock")
-- -----------------------------------------------------------------------------
-- - Nueva columna en_stock (verdadero por defecto).
-- - Lo que tenía stock > 0 queda con stock; lo que tenía 0, sin stock.
-- - Se quitan la columna stock y la restricción usado_es_una_unidad (ya no
--   hay cantidades que limitar).
-- - El público sigue viendo solo lo publicado, con stock y de modelo activo.
-- =============================================================================

alter table public.equipos add column en_stock boolean not null default true;
update public.equipos set en_stock = stock > 0;

-- La política y la función pública usan la columna vieja: se rehacen antes de
-- borrarla.
drop policy equipos_leer on public.equipos;
create policy equipos_leer on public.equipos for select to anon, authenticated
  using (public.es_staff() or (publicado and en_stock and exists (
    select 1 from public.modelos m where m.id = equipos.modelo_id and m.activo)));

create or replace function public.datos_publicos()
returns jsonb
language sql stable security invoker set search_path = public
as $$
  select jsonb_build_object(
    'tienda',  (select to_jsonb(t) from public.tienda t where id = 1),
    'modelos', coalesce((select jsonb_agg(to_jsonb(m) order by m.orden) from public.modelos m where m.activo), '[]'::jsonb),
    'fichas',  coalesce((select jsonb_agg(to_jsonb(f)) from public.fichas f
                          join public.modelos m on m.id = f.modelo_id and m.activo), '[]'::jsonb),
    'equipos', coalesce((select jsonb_agg(to_jsonb(e)) from public.equipos e
                          join public.modelos m on m.id = e.modelo_id and m.activo
                          where e.publicado and e.en_stock), '[]'::jsonb)
  )
$$;

alter table public.equipos drop constraint usado_es_una_unidad;
drop index public.equipos_publicos_idx;
alter table public.equipos drop column stock;
create index equipos_publicos_idx on public.equipos (publicado, en_stock);
