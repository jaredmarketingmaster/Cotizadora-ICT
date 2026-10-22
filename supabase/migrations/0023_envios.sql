-- =============================================================================
-- 0023: Envíos (ronda 3, C2): una pestaña nueva de Catálogo.
--   - envio_retiro: retiro en el local (con la dirección y el horario de Mi tienda).
--   - envio_domicilio: envío a domicilio, a envio_zonas o a todo el país
--     (envio_todo_el_pais), con su costo (envio_costo): gratis, fijo
--     (envio_costo_fijo), según la zona (envio_costos_zona: {zona: monto}) o
--     lo paga el cliente al recibir (al_recibir).
--   - envio_gratis: envío gratis con condición, en algunas zonas
--     (envio_gratis_zonas) y/o desde un monto (envio_gratis_minimo).
--   - envio_plazo_desde / envio_plazo_hasta: plazo opcional en días hábiles.
-- Los montos son enteros, en la moneda de la tienda.
-- Reemplaza a legal_entrega y legal_entrega_zonas (0016): sus valores pasan a
-- Envíos (retiro → retiro; transportadora o entrega personal → envío a
-- domicilio, con las zonas escritas como una zona; el costo queda por elegir)
-- y las columnas se borran. legal_faltantes() pide al menos una forma de
-- entrega. validar_envios() da los mensajes; demo.js repite las reglas
-- (assets/js/datos/envios.js).
-- =============================================================================

alter table public.tienda
  add column envio_retiro boolean not null default false,
  add column envio_domicilio boolean not null default false,
  add column envio_todo_el_pais boolean not null default false,
  add column envio_zonas text[] not null default '{}',
  add column envio_costo text not null default '' check (envio_costo in ('', 'gratis', 'fijo', 'zona', 'al_recibir')),
  add column envio_costo_fijo integer,
  add column envio_costos_zona jsonb not null default '{}'::jsonb,
  add column envio_gratis boolean not null default false,
  add column envio_gratis_zonas text[] not null default '{}',
  add column envio_gratis_minimo integer,
  add column envio_plazo_desde integer,
  add column envio_plazo_hasta integer;

-- Los valores del asistente de legales pasan a Envíos.
update public.tienda set
  envio_retiro = 'retiro' = any (legal_entrega),
  envio_domicilio = legal_entrega && array['transportadora', 'personal'],
  envio_zonas = case when legal_entrega && array['transportadora', 'personal'] and btrim(legal_entrega_zonas) <> ''
                     then array[btrim(legal_entrega_zonas)] else '{}' end;

create or replace function public.validar_envios()
returns trigger language plpgsql set search_path = public as $$
declare
  formato constant text := 'Algún dato no tiene el formato correcto. Revise los campos.';
  z text;
begin
  if not new.envio_domicilio then
    if new.envio_todo_el_pais or cardinality(new.envio_zonas) > 0 or new.envio_costo <> '' or new.envio_costo_fijo is not null
       or new.envio_costos_zona <> '{}'::jsonb or new.envio_gratis or cardinality(new.envio_gratis_zonas) > 0
       or new.envio_gratis_minimo is not null then
      raise exception 'Sin envío a domicilio, los datos del envío quedan vacíos.' using errcode = '23514';
    end if;
  else
    if cardinality(new.envio_zonas) > 30
       or exists (select 1 from unnest(new.envio_zonas) x where x is null or btrim(x) = '' or x <> btrim(x) or length(x) > 200)
       or (select count(distinct lower(x)) from unnest(new.envio_zonas) x) <> cardinality(new.envio_zonas) then
      raise exception 'Revise las zonas: sin repetir, de hasta 200 caracteres y 30 como máximo.' using errcode = '23514';
    end if;
    if new.envio_todo_el_pais and cardinality(new.envio_zonas) > 0 then
      raise exception 'Elija «Todo el país» o escriba las zonas, no las dos.' using errcode = '23514';
    end if;
    if new.envio_costo = 'fijo' then
      if new.envio_costo_fijo is null or new.envio_costo_fijo <= 0 then
        raise exception 'Escriba el costo fijo del envío.' using errcode = '23514';
      end if;
    elsif new.envio_costo_fijo is not null then
      raise exception '%', formato using errcode = '23514';
    end if;
    if new.envio_costo = 'zona' then
      if new.envio_todo_el_pais or jsonb_typeof(new.envio_costos_zona) <> 'object'
         or (select count(*) from jsonb_object_keys(new.envio_costos_zona)) <> cardinality(new.envio_zonas) then
        raise exception 'Escriba el costo del envío de cada zona.' using errcode = '23514';
      end if;
      foreach z in array new.envio_zonas loop
        if jsonb_typeof(new.envio_costos_zona -> z) is distinct from 'number'
           or (new.envio_costos_zona ->> z)::numeric < 0 or (new.envio_costos_zona ->> z)::numeric <> trunc((new.envio_costos_zona ->> z)::numeric) then
          raise exception 'Escriba el costo del envío de cada zona.' using errcode = '23514';
        end if;
      end loop;
    elsif new.envio_costos_zona <> '{}'::jsonb then
      raise exception '%', formato using errcode = '23514';
    end if;
    if new.envio_gratis then
      if new.envio_costo = 'gratis' then
        raise exception 'Si el envío ya es gratis, no hace falta una condición.' using errcode = '23514';
      end if;
      if (cardinality(new.envio_gratis_zonas) = 0 and new.envio_gratis_minimo is null)
         or (new.envio_gratis_minimo is not null and new.envio_gratis_minimo <= 0) then
        raise exception 'Indique en qué zonas o desde qué monto el envío es gratis.' using errcode = '23514';
      end if;
      if not (new.envio_gratis_zonas <@ new.envio_zonas)
         or (select count(distinct x) from unnest(new.envio_gratis_zonas) x) <> cardinality(new.envio_gratis_zonas) then
        raise exception 'Las zonas con envío gratis tienen que estar en la lista de zonas.' using errcode = '23514';
      end if;
    elsif cardinality(new.envio_gratis_zonas) > 0 or new.envio_gratis_minimo is not null then
      raise exception '%', formato using errcode = '23514';
    end if;
  end if;
  if new.envio_plazo_desde is not null or new.envio_plazo_hasta is not null then
    if new.envio_plazo_desde is null or new.envio_plazo_hasta is null
       or new.envio_plazo_desde not between 1 and 60 or new.envio_plazo_hasta not between 1 and 60
       or new.envio_plazo_desde > new.envio_plazo_hasta then
      raise exception 'El plazo de entrega va de 1 a 60 días hábiles, y el primero no puede ser mayor que el segundo.' using errcode = '23514';
    end if;
  end if;
  return new;
end $$;

create trigger tienda_validar_envios before insert or update on public.tienda
  for each row execute function public.validar_envios();

-- legal_faltantes(): igual que en 0019, con la entrega de Envíos. Se
-- recrea antes de borrar las columnas viejas, que la versión anterior usaba.
create or replace function public.legal_faltantes(t public.tienda)
returns text[] language plpgsql immutable set search_path = public as $$
declare
  f text[] := '{}';
  i record;
  minimo int := 1;
  patron text;
  paises text[] := coalesce(t.legal_paises, '{}');
  apple boolean := t.legal_perfil in ('oficial', 'autorizado');
  sin_local boolean := t.legal_perfil in ('emprendedor', 'particular');
  b text := '^\s*$';
begin
  if t.nombre ~ b then f := array_append(f, 'nombre'); end if;
  -- Paso 1
  if t.legal_perfil = '' then f := array_append(f, 'legal_perfil'); end if;
  -- Paso 2
  if t.legal_tipo_persona = '' then f := array_append(f, 'legal_tipo_persona'); end if;
  if t.legal_nombre ~ b then f := array_append(f, 'legal_nombre'); end if;
  -- Sin países elegidos, los documentos de los disponibles (Colombia).
  patron := case when 'co' = any (paises) or cardinality(paises) = 0 then
    case t.legal_doc_tipo when 'cc' then '^\d{6,10}$' when 'nit' then '^\d{6,10}-\d$' when 'ce' then '^[0-9A-Z]{4,12}$' end end;
  if patron is null then f := array_append(f, 'legal_doc_tipo');
  elsif btrim(t.legal_doc_numero) !~ patron then f := array_append(f, 'legal_doc_numero'); end if;
  if t.legal_direccion ~ b then f := array_append(f, 'legal_direccion'); end if;
  if t.legal_ciudad ~ b then f := array_append(f, 'legal_ciudad'); end if;
  if btrim(t.legal_correo) !~ '^[^\s@]+@[^\s@]+\.[^\s@]{2,}$' then f := array_append(f, 'legal_correo'); end if;
  if btrim(t.legal_telefono) !~ '^\+?\d{7,15}$' then f := array_append(f, 'legal_telefono'); end if;
  if t.legal_tipo_persona = 'juridica' then
    if t.legal_representante ~ b then f := array_append(f, 'legal_representante'); end if;
    if t.legal_matricula_numero ~ b then f := array_append(f, 'legal_matricula_numero'); end if;
    if t.legal_matricula_camara ~ b then f := array_append(f, 'legal_matricula_camara'); end if;
  end if;
  if t.legal_perfil <> '' and not sin_local and t.legal_direccion_local ~ b then f := array_append(f, 'legal_direccion_local'); end if;
  -- Paso 3
  if cardinality(paises) = 0 or not (paises <@ array['co']) then f := array_append(f, 'legal_paises'); end if;
  -- El país de la tienda tiene que tener su módulo legal (hoy solo Colombia).
  if t.pais is distinct from 'co' then f := array_append(f, 'pais'); end if;
  -- Paso 4
  if jsonb_array_length(t.legal_impuestos) = 0 then f := array_append(f, 'legal_impuestos'); end if;
  for i in select e, n - 1 as k from jsonb_array_elements(t.legal_impuestos) with ordinality as x(e, n) loop
    if jsonb_typeof(i.e) <> 'object' or coalesce(i.e->>'nombre', '') ~ b then f := array_append(f, format('legal_impuestos.%s.nombre', i.k)); end if;
    if not coalesce(case when jsonb_typeof(i.e->'porcentaje') = 'number' then (i.e->>'porcentaje')::numeric between 0 and 100 end, false) then
      f := array_append(f, format('legal_impuestos.%s.porcentaje', i.k));
    end if;
    if jsonb_typeof(i.e->'incluido') is distinct from 'boolean' then f := array_append(f, format('legal_impuestos.%s.incluido', i.k)); end if;
  end loop;
  if 'co' = any (paises) then minimo := 12; end if;
  if t.legal_garantia_nuevos is null or t.legal_garantia_nuevos < minimo then f := array_append(f, 'legal_garantia_nuevos'); end if;
  if t.legal_garantia_usados = 'con' then
    if t.legal_garantia_usados_meses is null then f := array_append(f, 'legal_garantia_usados_meses'); end if;
  elsif t.legal_garantia_usados <> 'sin' then f := array_append(f, 'legal_garantia_usados'); end if;
  if t.legal_retracto_canal = 'whatsapp' then
    if not public.whatsapp_valido(t.pais, t.whatsapp) then f := array_append(f, 'whatsapp'); end if;
  elsif t.legal_retracto_canal <> 'correo' then f := array_append(f, 'legal_retracto_canal'); end if;
  -- Entrega: de la pestaña Envíos (0023).
  if not (t.envio_retiro or t.envio_domicilio) then f := array_append(f, 'envio'); end if;
  if t.envio_domicilio and not t.envio_todo_el_pais and cardinality(t.envio_zonas) = 0 then f := array_append(f, 'envio_zonas'); end if;
  if t.envio_domicilio and t.envio_costo = '' then f := array_append(f, 'envio_costo'); end if;
  if t.envio_retiro and t.direccion ~ b then f := array_append(f, 'direccion'); end if;
  if apple and t.legal_apple_detalle ~ b then f := array_append(f, 'legal_apple_detalle'); end if;
  if t.legal_homologados = '' then f := array_append(f, 'legal_homologados'); end if;
  -- Paso 5 (los patrones de assets/js/legal/herramientas.js)
  if btrim(t.meta_pixel_id) !~ '^\d{5,20}$' then f := array_append(f, 'meta_pixel_id'); end if;
  if t.ga4_activo and btrim(t.ga4_id) !~ '^G-[A-Z0-9]{4,15}$' then f := array_append(f, 'ga4_id'); end if;
  if t.gtm_activo and btrim(t.gtm_id) !~ '^GTM-[A-Z0-9]{4,10}$' then f := array_append(f, 'gtm_id'); end if;
  if t.clarity_activo and btrim(t.clarity_id) !~ '^[a-z0-9]{6,15}$' then f := array_append(f, 'clarity_id'); end if;
  if t.tiktok_activo and btrim(t.tiktok_id) !~ '^[A-Z0-9]{15,25}$' then f := array_append(f, 'tiktok_id'); end if;
  if t.gads_activo and btrim(t.gads_id) !~ '^AW-\d{6,15}$' then f := array_append(f, 'gads_id'); end if;
  if t.plataforma_sitio ~ b then f := array_append(f, 'plataforma_sitio'); end if;
  -- Paso 6: una cláusula propia que trae marcas del texto anterior.
  if t.legal_clausula_privacidad ~ '\[PENDIENTE|\{\{' then f := array_append(f, 'legal_clausula_privacidad'); end if;
  if t.legal_clausula_terminos ~ '\[PENDIENTE|\{\{' then f := array_append(f, 'legal_clausula_terminos'); end if;
  if t.legal_clausula_cookies ~ '\[PENDIENTE|\{\{' then f := array_append(f, 'legal_clausula_cookies'); end if;
  if t.legal_clausula_aviso ~ '\[PENDIENTE|\{\{' then f := array_append(f, 'legal_clausula_aviso'); end if;
  return f;
end $$;


alter table public.tienda drop column legal_entrega, drop column legal_entrega_zonas;
