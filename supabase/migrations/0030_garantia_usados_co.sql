-- =============================================================================
-- 0030 — Colombia: garantía mínima de los usados "con garantía"
-- -----------------------------------------------------------------------------
-- Investigación de Jared con Gemini (punto 4, 23/10/2026). legal/FUENTES.md,
-- fuente 8: el Decreto 735 de 2013, art. 12 (Decreto 1074 de 2015, art.
-- 2.2.2.32.3.2), da 3 meses de garantía a un usado que no se vende
-- expresamente sin garantía. Si la tienda vende a Colombia y elige "con
-- garantía", los meses de los usados tienen que ser 3 o más; si no, falta ese
-- dato y los legales no se publican (la versión ya publicada queda).
-- legal_faltantes() es la de 0023 con ese cambio; faltantes() de
-- assets/js/legal/motor.js hace lo mismo (garantiaUsadosMinMeses de co.js) y
-- tests/sql/comparar-faltantes.mjs revisa que coincidan.
-- =============================================================================

create or replace function public.legal_faltantes(t public.tienda)
returns text[] language plpgsql immutable set search_path = public as $$
declare
  f text[] := '{}';
  i record;
  minimo int := 1;
  minimo_usados int := 1;
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
  -- Colombia: 12 meses los nuevos; 3 los usados "con garantía" (0030).
  if 'co' = any (paises) then minimo := 12; minimo_usados := 3; end if;
  if t.legal_garantia_nuevos is null or t.legal_garantia_nuevos < minimo then f := array_append(f, 'legal_garantia_nuevos'); end if;
  if t.legal_garantia_usados = 'con' then
    if t.legal_garantia_usados_meses is null or t.legal_garantia_usados_meses < minimo_usados then f := array_append(f, 'legal_garantia_usados_meses'); end if;
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
