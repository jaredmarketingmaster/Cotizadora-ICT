-- =============================================================================
-- 0010 — "Más vendido": hasta 3 equipos marcados
-- -----------------------------------------------------------------------------
-- Se marca desde el inventario del panel (lista y formulario). Todavía no se
-- muestra en el sitio público. La base no deja marcar un cuarto: el panel lo
-- avisa antes, pero la regla vale aunque alguien salte el panel.
-- =============================================================================

alter table public.equipos add column mas_vendido boolean not null default false;

create or replace function public.limitar_mas_vendidos()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.mas_vendido and (tg_op = 'INSERT' or not old.mas_vendido) then
    -- Un candado por transacción: dos marcas a la vez no pasan de 3.
    perform pg_advisory_xact_lock(hashtext('equipos.mas_vendido'));
    if (select count(*) from public.equipos where mas_vendido and id <> new.id) >= 3 then
      raise exception 'Ya tiene 3 equipos marcados como más vendidos. Desmarque uno para marcar este.'
        using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

create trigger equipos_mas_vendido before insert or update of mas_vendido on public.equipos
  for each row execute function public.limitar_mas_vendidos();
