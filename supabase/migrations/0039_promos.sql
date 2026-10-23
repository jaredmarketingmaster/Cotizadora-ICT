-- =============================================================================
-- 0039 — Promos: banner y descuentos
-- -----------------------------------------------------------------------------
-- Pedido de Jared (23/10/2026). Sección nueva del panel (Promos):
-- - promo_banner_activo y promo_banner_texto: un banner fijo arriba del sitio
--   con un texto que corre sin parar (ej. "Cyber Sale · hasta el 30/10 · 15 %
--   off"). Una línea, hasta 120 caracteres.
-- - promo_descuentos_activos: el interruptor de todos los descuentos.
-- - promo_descuento_tienda: % para toda la tienda (1 a 90).
-- - promo_descuentos_modelo: % por modelo, { "<slug del modelo>": 1 a 90 }.
-- - equipos.promo_descuento: % de un equipo (1 a 90).
-- - promo_combinar: si a un equipo le tocan varios, 'mayor' (el más alto),
--   'especifico' (el del equipo, si no el del modelo, si no el de la tienda)
--   o 'suma' (hasta 90 %).
-- El precio con descuento lo calcula el sitio (assets/js/datos/precios.js) y
-- es el que va al mensaje de WhatsApp y a GHL. assets/js/datos/demo.js repite
-- las mismas reglas.
-- =============================================================================

alter table public.tienda
  add column promo_banner_activo boolean not null default false,
  add column promo_banner_texto text not null default ''
    check (char_length(promo_banner_texto) <= 120 and promo_banner_texto = btrim(promo_banner_texto) and promo_banner_texto !~ '[\r\n]'),
  add column promo_descuentos_activos boolean not null default false,
  add column promo_descuento_tienda smallint check (promo_descuento_tienda between 1 and 90),
  add column promo_descuentos_modelo jsonb not null default '{}'::jsonb check (jsonb_typeof(promo_descuentos_modelo) = 'object'),
  add column promo_combinar text not null default 'mayor' check (promo_combinar in ('mayor', 'especifico', 'suma'));

alter table public.equipos
  add column promo_descuento smallint check (promo_descuento between 1 and 90);

create or replace function public.validar_promos()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.promo_banner_activo and new.promo_banner_texto = '' then
    raise exception 'Escriba el texto del banner para activarlo.' using errcode = '23514';
  end if;
  if (select count(*) from jsonb_object_keys(new.promo_descuentos_modelo)) > 100
     or exists (select 1 from jsonb_each(new.promo_descuentos_modelo) d
                where d.key !~ '^[a-z0-9-]{1,60}$' or jsonb_typeof(d.value) <> 'number'
                   or (d.value #>> '{}')::numeric <> trunc((d.value #>> '{}')::numeric)
                   or (d.value #>> '{}')::numeric not between 1 and 90) then
    raise exception 'Cada descuento debe ser un número entero de 1 a 90.' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger tienda_promos before insert or update on public.tienda
  for each row execute function public.validar_promos();
