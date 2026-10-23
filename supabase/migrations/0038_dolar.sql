-- =============================================================================
-- 0038 — Dólar como moneda de apoyo o de reemplazo
-- -----------------------------------------------------------------------------
-- Pedido de Jared (23/10/2026). La tienda elige (Mi tienda → Moneda):
-- - usd_modo: 'no', 'apoyo' (el precio en U$D al lado del de la moneda del
--   país) o 'reemplazo' (solo el de U$D). Los países cuya moneda ya es el dólar
--   (Ecuador, El Salvador y Panamá) no lo ofrecen.
-- - usd_cotizacion: cuánto vale 1 U$D en la moneda del país (hasta 2
--   decimales). Obligatoria con el dólar encendido.
-- - usd_actualizado_en: cuándo cambió la cotización. La pone este disparador;
--   el sitio muestra "Cambio actualizado el …".
-- - usd_redondeo: el precio calculado con la cotización se redondea al 0 o al
--   5, hacia arriba ('arriba': 237 → 240) o hacia abajo ('abajo': 237 → 235),
--   o al entero ('no').
-- - equipos.precio_usd: el precio en U$D de un equipo. Si está, gana sobre la
--   cotización (y no se redondea).
-- El cálculo lo hace el sitio (assets/js/datos/precios.js); el precio que se
-- guarda y se manda a GHL sigue siendo el de la moneda del país.
-- assets/js/datos/demo.js repite las mismas reglas.
-- =============================================================================

alter table public.tienda
  add column usd_modo text not null default 'no' check (usd_modo in ('no', 'apoyo', 'reemplazo')),
  add column usd_cotizacion numeric(14, 2) check (usd_cotizacion is null or (usd_cotizacion > 0 and usd_cotizacion <= 1000000000)),
  add column usd_actualizado_en timestamptz,
  add column usd_redondeo text not null default 'no' check (usd_redondeo in ('no', 'arriba', 'abajo'));

alter table public.equipos
  add column precio_usd bigint check (precio_usd is null or precio_usd > 0);

create or replace function public.validar_usd()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.usd_modo <> 'no' then
    if new.pais in ('ec', 'sv', 'pa') then
      raise exception 'La moneda de su país ya es el dólar: no hace falta mostrarlo aparte.' using errcode = '23514';
    end if;
    if new.usd_cotizacion is null then
      raise exception 'Cargue la cotización del dólar: cuánto vale 1 U$D en la moneda de su país.' using errcode = '23514';
    end if;
  end if;
  -- La fecha de la cotización la pone el servidor.
  if tg_op = 'UPDATE' and new.usd_cotizacion is not distinct from old.usd_cotizacion then
    new.usd_actualizado_en := old.usd_actualizado_en;
  elsif tg_op = 'UPDATE' or new.usd_actualizado_en is null then
    new.usd_actualizado_en := case when new.usd_cotizacion is null then null else now() end;
  end if;
  return new;
end $$;

create trigger tienda_usd before insert or update on public.tienda
  for each row execute function public.validar_usd();

-- "Precios actualizados al ...": también cuando cambia el precio en U$D.
create or replace function public.marcar_precios_actualizados()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if tg_op = 'INSERT' or new.precio is distinct from old.precio or new.precio_usd is distinct from old.precio_usd then
    update public.tienda set precios_actualizados_en = now() where id = 1;
  end if;
  return null;
end $$;

drop trigger equipos_precio on public.equipos;
create trigger equipos_precio after insert or update of precio, precio_usd on public.equipos
  for each row execute function public.marcar_precios_actualizados();
