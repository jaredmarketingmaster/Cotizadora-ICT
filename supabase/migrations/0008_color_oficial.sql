-- =============================================================================
-- 0008 — Cada equipo usa un color oficial de su modelo
-- -----------------------------------------------------------------------------
-- - equipos.color_id: el color (tabla colores) elegido en el panel. Debe ser
--   del mismo modelo. Si el modelo tiene colores, es obligatorio al crear un
--   equipo o al cambiarle el modelo.
-- - equipos.color_nombre_mostrar: opcional; el nombre que verá el cliente (por
--   ejemplo, en español). Vacío = el nombre oficial en inglés (o el de la
--   fuente si no hay nombre en inglés).
-- - La muestra (hexadecimal) sale siempre del color oficial: el equipo ya no
--   guarda nombre ni hexadecimal propios (se borran color_nombre y color_hex).
--
-- Migración de los equipos que ya existen: se busca el color de su modelo por
-- nombre (español o inglés, sin importar mayúsculas), más estos equivalentes
-- de los datos de demostración: "Glacier" → Glaciar. Si el nombre que tenía no
-- es el que se mostraría ahora, se guarda en color_nombre_mostrar, así el
-- cliente sigue viendo lo mismo. Si no se encuentra el color, color_id queda
-- vacío y el nombre se conserva en color_nombre_mostrar (aviso NOTICE).
-- =============================================================================

alter table public.equipos
  add column color_id bigint references public.colores (id) on delete restrict,
  add column color_nombre_mostrar text not null default '' check (char_length(color_nombre_mostrar) <= 40);

create index equipos_color_idx on public.equipos (color_id);

-- Equivalentes de nombres viejos (solo los que usan los datos de demostración).
with equivalentes (viejo, nuevo) as (values ('glacier', 'glaciar')),
candidatos as (
  select e.id as equipo_id, c.id as color_id,
         row_number() over (partition by e.id order by c.orden) as n
  from public.equipos e
  join public.colores c on c.modelo_id = e.modelo_id
  left join equivalentes q on q.viejo = lower(btrim(e.color_nombre))
  where btrim(e.color_nombre) <> ''
    and (lower(c.nombre_es) = lower(btrim(e.color_nombre))
         or (c.nombre_en <> '' and lower(c.nombre_en) = lower(btrim(e.color_nombre)))
         or lower(c.nombre_es) = q.nuevo)
)
update public.equipos e set color_id = k.color_id
from candidatos k
where k.equipo_id = e.id and k.n = 1;

-- Conservar el nombre que veía el cliente cuando no coincide con el oficial.
update public.equipos e
set color_nombre_mostrar = btrim(e.color_nombre)
from public.colores c
where c.id = e.color_id
  and btrim(e.color_nombre) <> coalesce(nullif(c.nombre_en, ''), c.nombre_es);

update public.equipos set color_nombre_mostrar = left(btrim(color_nombre), 40)
where color_id is null and btrim(color_nombre) <> '';

do $$
declare r record;
begin
  for r in select e.id, m.nombre, e.color_nombre from public.equipos e join public.modelos m on m.id = e.modelo_id
           where e.color_id is null and btrim(e.color_nombre) <> '' loop
    raise notice 'Equipo % (%): no se encontró el color oficial «%». Quedó como nombre a mostrar; elija el color en el panel.', r.id, r.nombre, r.color_nombre;
  end loop;
end $$;

alter table public.equipos drop column color_nombre, drop column color_hex;

-- El color debe ser del modelo del equipo, y es obligatorio si el modelo
-- tiene colores (al crear o al cambiar el modelo o el color).
create or replace function public.validar_color_equipo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.color_id is not null then
    if not exists (select 1 from public.colores c where c.id = new.color_id and c.modelo_id = new.modelo_id) then
      raise exception 'El color elegido no es de este modelo.' using errcode = '23514';
    end if;
  elsif (tg_op = 'INSERT' or new.modelo_id is distinct from old.modelo_id or old.color_id is not null)
        and exists (select 1 from public.colores c where c.modelo_id = new.modelo_id) then
    raise exception 'Elija el color.' using errcode = '23514';
  end if;
  new.color_nombre_mostrar := btrim(new.color_nombre_mostrar);
  return new;
end $$;

create trigger equipos_color before insert or update of modelo_id, color_id, color_nombre_mostrar on public.equipos
  for each row execute function public.validar_color_equipo();
