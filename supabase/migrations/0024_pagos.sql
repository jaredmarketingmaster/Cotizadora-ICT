-- =============================================================================
-- 0024: pasarelas por país, varias "otras" con su nombre y descuentos
-- informativos (ronda 3, C3).
--   - pagos_pasarelas: las claves de assets/js/datos/pasarelas.js (por país y
--     regionales; la lista es de conocimiento general, sin verificar). Las de
--     antes (mercado_pago, pse, nequi, daviplata, wompi, bold) no cambian.
--   - pagos_pasarelas_otras: los nombres de las otras pasarelas (antes, una
--     sola en pagos_pasarela_otra con la clave 'otra'; pasa sin perderse).
--   - pagos_descuentos: {"medio:transferencia": 10, "cripto": 5,
--     "pasarela:pse": 3, "otra:Addi": 2}; de 1 a 90 %, solo en formas de pago
--     que la tienda acepta. Es informativo: se muestra en el sitio, no cambia
--     los precios ni el valor que se manda al píxel.
-- validar_pagos() se recrea con las reglas nuevas (demo: errorPagos de comun.js).
-- =============================================================================

alter table public.tienda
  add column pagos_pasarelas_otras text[] not null default '{}',
  add column pagos_descuentos jsonb not null default '{}'::jsonb;

update public.tienda set
  pagos_pasarelas_otras = case when 'otra' = any (pagos_pasarelas) and btrim(pagos_pasarela_otra) <> '' then array[btrim(pagos_pasarela_otra)] else '{}' end,
  pagos_pasarelas = array_remove(pagos_pasarelas, 'otra'),
  pagos_pasarela_otra = '';  -- (la regla vieja de validar_pagos todavía corre aquí)

alter table public.tienda drop constraint tienda_pagos_pasarelas_check;
alter table public.tienda add constraint tienda_pagos_pasarelas_check
  check (pagos_pasarelas <@ array['mercado_pago', 'modo', 'cuenta_dni', 'uala', 'naranja_x', 'pix', 'pagbank', 'picpay', 'spei', 'oxxo_pay', 'clip', 'pse', 'nequi', 'daviplata', 'wompi', 'bold', 'epayco', 'payu', 'webpay', 'khipu', 'yape', 'plin', 'niubiz', 'izipay', 'paypal', 'dlocal', 'stripe']);

create or replace function public.validar_pagos()
returns trigger language plpgsql set search_path = public as $$
declare
  validas text[];
  k text;
  v jsonb;
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
  if length(new.pagos_cripto_cuales) > 120 then
    raise exception 'Algún dato no tiene el formato correcto. Revise los campos.' using errcode = '23514';
  end if;
  if cardinality(new.pagos_pasarelas_otras) > 10
     or exists (select 1 from unnest(new.pagos_pasarelas_otras) x where x is null or btrim(x) = '' or x <> btrim(x) or length(x) > 60)
     or (select count(distinct lower(x)) from unnest(new.pagos_pasarelas_otras) x) <> cardinality(new.pagos_pasarelas_otras) then
    raise exception 'Revise las otras pasarelas: hasta 10, sin repetir y de hasta 60 caracteres.' using errcode = '23514';
  end if;
  if jsonb_typeof(new.pagos_descuentos) <> 'object' then
    raise exception 'Algún dato no tiene el formato correcto. Revise los campos.' using errcode = '23514';
  end if;
  validas := array(select 'medio:' || m from unnest(new.pagos_medios) m)
    || array(select 'pasarela:' || p from unnest(new.pagos_pasarelas) p)
    || array(select 'otra:' || o from unnest(new.pagos_pasarelas_otras) o)
    || case when new.pagos_cripto then array['cripto'] else '{}'::text[] end;
  for k, v in select * from jsonb_each(new.pagos_descuentos) loop
    if not (k = any (validas)) or jsonb_typeof(v) <> 'number' or v::numeric <> trunc(v::numeric) or v::numeric not between 1 and 90 then
      raise exception 'Revise los descuentos: de 1 a 90 %%, y solo en formas de pago que acepta.' using errcode = '23514';
    end if;
  end loop;
  return new;
end $$;

alter table public.tienda drop column pagos_pasarela_otra;
