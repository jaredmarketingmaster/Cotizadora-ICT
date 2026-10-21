-- =============================================================================
-- 0018 — País de la tienda (ronda 3, B1)
-- -----------------------------------------------------------------------------
-- - tienda.pais: uno de los 19 países de assets/js/datos/paises.js. Por
--   defecto, Argentina para las tiendas nuevas. Una tienda que ya tenía datos
--   de Colombia (WhatsApp con 57, Colombia en los países legales o textos
--   publicados) queda en Colombia.
-- - El país define la moneda, el formato de los números, la zona horaria y el
--   prefijo del celular (en el navegador, paises.js).
-- - whatsapp_valido(pais, numero): el WhatsApp de la tienda según su país. Los
--   países con formato verificado tienen su patrón; los demás, prefijo + número
--   de 8 a 15 dígitos en total. Igual a whatsappValido() de paises.js
--   (tests/sql/comparar-paises.mjs lo compara).
-- - El check del WhatsApp (solo 57) pasa a depender del país, y
--   legal_faltantes() usa la misma regla.
-- =============================================================================

alter table public.tienda
  add column pais text not null default 'ar'
    check (pais in ('ar', 'bo', 'br', 'cl', 'co', 'cr', 'cu', 'ec', 'sv', 'gt', 'hn', 'mx', 'ni', 'pa', 'py', 'pe', 'do', 'uy', 've'));

update public.tienda set pais = 'co'
where id = 1 and (whatsapp ~ '^57' or 'co' = any (legal_paises) or legal_publicado is not null);

create or replace function public.whatsapp_valido(pais text, numero text)
returns boolean language sql immutable set search_path = public as $$
  select case pais
    when 'ar' then numero ~ '^549[1-9][0-9]{9}$'
    when 'br' then numero ~ '^55[1-9]{2}9[1-9][0-9]{7}$'
    when 'cl' then numero ~ '^569[0-9]{8}$'
    when 'co' then numero ~ '^573[0-9]{9}$'
    when 'mx' then numero ~ '^52[1-9][0-9]{9}$'
    when 'pe' then numero ~ '^519[0-9]{8}$'
    else numero ~ '^[0-9]{8,15}$' and numero like (case pais
      when 'bo' then '591' when 'cr' then '506' when 'cu' then '53' when 'ec' then '593'
      when 'sv' then '503' when 'gt' then '502' when 'hn' then '504' when 'ni' then '505'
      when 'pa' then '507' when 'py' then '595' when 'do' then '1' when 'uy' then '598'
      when 've' then '58' end) || '%'
      -- El prefijo solo no es un número: tiene que haber algo después.
      and length(numero) > length(case pais
      when 'bo' then '591' when 'cr' then '506' when 'cu' then '53' when 'ec' then '593'
      when 'sv' then '503' when 'gt' then '502' when 'hn' then '504' when 'ni' then '505'
      when 'pa' then '507' when 'py' then '595' when 'do' then '1' when 'uy' then '598'
      when 've' then '58' end)
  end
$$;

alter table public.tienda drop constraint tienda_whatsapp_check;
alter table public.tienda add constraint tienda_whatsapp_pais
  check (whatsapp = '' or public.whatsapp_valido(pais, whatsapp));

-- legal_faltantes(): igual que en 0016, con el WhatsApp según el país.
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
  if cardinality(t.legal_entrega) = 0 then f := array_append(f, 'legal_entrega'); end if;
  if t.legal_entrega_zonas ~ b then f := array_append(f, 'legal_entrega_zonas'); end if;
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

