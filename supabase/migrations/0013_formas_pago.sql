-- =============================================================================
-- 0013 — Formas de pago estructuradas (Catálogo → Formas de pago)
-- -----------------------------------------------------------------------------
-- - Cuotas: pagos_cuotas (sí/no), pagos_cuotas_max (2 a 48),
--   pagos_sin_interes (sí/no) y pagos_sin_interes_max (2 a 48, no más que
--   pagos_cuotas_max). Sin cuotas, los demás campos de cuotas quedan vacíos.
-- - Medios: pagos_medios (transferencia, efectivo, debito, credito).
-- - Criptomonedas: pagos_cripto (sí/no) y pagos_cripto_cuales (texto).
-- - Pasarelas: pagos_pasarelas (mercado_pago, pse, nequi, daviplata, wompi,
--   bold, otra) y pagos_pasarela_otra (el nombre de "Otra").
-- - "Otras formas de pago": la lista libre de siempre. formas_pago pasa a
--   llamarse pagos_otras (se conservan los valores) y sale de Mi tienda.
-- validar_pagos da los mensajes; el adaptador demo repite las mismas reglas.
-- =============================================================================

alter table public.tienda rename column formas_pago to pagos_otras;

alter table public.tienda
  add column pagos_medios text[] not null default '{}'
    check (pagos_medios <@ array['transferencia', 'efectivo', 'debito', 'credito']),
  add column pagos_cuotas boolean not null default false,
  add column pagos_cuotas_max smallint,
  add column pagos_sin_interes boolean not null default false,
  add column pagos_sin_interes_max smallint,
  add column pagos_cripto boolean not null default false,
  add column pagos_cripto_cuales text not null default '',
  add column pagos_pasarelas text[] not null default '{}'
    check (pagos_pasarelas <@ array['mercado_pago', 'pse', 'nequi', 'daviplata', 'wompi', 'bold', 'otra']),
  add column pagos_pasarela_otra text not null default '';

create or replace function public.validar_pagos()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.pagos_cuotas then
    if new.pagos_cuotas_max is null or new.pagos_cuotas_max not between 2 and 48 then
      raise exception 'Indique hasta cuántas cuotas acepta: de 2 a 48.' using errcode = '23514';
    end if;
    if new.pagos_sin_interes then
      if new.pagos_sin_interes_max is null or new.pagos_sin_interes_max not between 2 and 48 then
        raise exception 'Indique hasta cuántas cuotas sin interés ofrece: de 2 a 48.' using errcode = '23514';
      end if;
      if new.pagos_sin_interes_max > new.pagos_cuotas_max then
        raise exception 'Las cuotas sin interés no pueden ser más que el máximo de cuotas.' using errcode = '23514';
      end if;
    elsif new.pagos_sin_interes_max is not null then
      raise exception 'Sin cuotas sin interés, deje vacío hasta cuántas.' using errcode = '23514';
    end if;
  elsif new.pagos_cuotas_max is not null or new.pagos_sin_interes or new.pagos_sin_interes_max is not null then
    raise exception 'Sin pagos a cuotas, los datos de cuotas quedan vacíos.' using errcode = '23514';
  end if;
  if not new.pagos_cripto and new.pagos_cripto_cuales <> '' then
    raise exception 'Sin criptomonedas, deje vacío cuáles.' using errcode = '23514';
  end if;
  if length(new.pagos_cripto_cuales) > 120 or length(new.pagos_pasarela_otra) > 60 then
    raise exception 'Algún dato no tiene el formato correcto. Revise los campos.' using errcode = '23514';
  end if;
  if 'otra' = any (new.pagos_pasarelas) then
    if btrim(new.pagos_pasarela_otra) = '' then
      raise exception 'Escriba el nombre de la otra pasarela.' using errcode = '23514';
    end if;
  elsif new.pagos_pasarela_otra <> '' then
    raise exception 'Sin «Otra» pasarela, deje vacío el nombre.' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger tienda_validar_pagos before insert or update on public.tienda
  for each row execute function public.validar_pagos();
