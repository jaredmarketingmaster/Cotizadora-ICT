-- =============================================================================
-- 0016 — Legales: asistente y textos generados (reemplaza los textos de 0015)
-- -----------------------------------------------------------------------------
-- - La tienda ya no escribe sus textos legales: llena los datos del asistente
--   (Legales, seis pasos) y el panel genera la Política de tratamiento de
--   datos, los Términos, la Política de cookies y el aviso corto del pop-up
--   con assets/js/legal/motor.js.
-- - Campos legal_*: perfil, identificación, países, condiciones de venta y
--   cláusulas propias. Las herramientas de medición (meta_pixel_id, ga4_*,
--   gtm_*, clarity_*, tiktok_*, gads_*), capi_solo_consentimiento y
--   plataforma_sitio van en tienda también: cambian los textos y el banner.
-- - Se guardan aunque estén incompletos (el asistente guarda solo). Lo que
--   falta lo dice legal_faltantes(), con el mismo criterio de faltantes() en
--   motor.js (tests/sql/probar.sh compara los dos).
-- - legal_publicado: { version, vigente_desde, huella, documentos }. Solo se
--   publica con legal_faltantes() vacío. La versión y la fecha las pone el
--   disparador: suben solo si cambió algún documento.
-- - Los textos que la tienda había escrito pasan a la cláusula propia de su
--   documento (los textos base de 0015 sin cambios se descartan, por su md5).
--   El aviso de marca pasa a la cláusula de los términos.
-- - Mismas políticas que tienda (RLS de 0007): lee cualquiera, edita el gestor.
-- =============================================================================

alter table public.tienda
  add column legal_paso smallint not null default 1 check (legal_paso between 1 and 6),
  add column legal_perfil text not null default ''
    check (legal_perfil in ('', 'oficial', 'autorizado', 'electronica', 'no_oficial', 'emprendedor', 'particular')),
  add column legal_tipo_persona text not null default '' check (legal_tipo_persona in ('', 'natural', 'juridica')),
  add column legal_nombre text not null default '' check (length(legal_nombre) <= 160),
  add column legal_doc_tipo text not null default '' check (legal_doc_tipo in ('', 'cc', 'nit', 'ce')),
  add column legal_doc_numero text not null default '' check (length(legal_doc_numero) <= 20),
  add column legal_direccion text not null default '' check (length(legal_direccion) <= 160),
  add column legal_ciudad text not null default '' check (length(legal_ciudad) <= 80),
  add column legal_correo text not null default '' check (length(legal_correo) <= 160),
  add column legal_telefono text not null default '' check (length(legal_telefono) <= 20),
  add column legal_representante text not null default '' check (length(legal_representante) <= 160),
  add column legal_matricula_numero text not null default '' check (length(legal_matricula_numero) <= 40),
  add column legal_matricula_camara text not null default '' check (length(legal_matricula_camara) <= 80),
  add column legal_direccion_local text not null default '' check (length(legal_direccion_local) <= 160),
  add column legal_rnbd text not null default '' check (legal_rnbd in ('', 'si', 'no')),
  add column legal_paises text[] not null default '{}'
    check (legal_paises <@ array['ar', 'bo', 'br', 'cl', 'co', 'cr', 'cu', 'ec', 'sv', 'gt', 'hn', 'mx', 'ni', 'pa', 'py', 'pe', 'do', 'uy', 've']),
  add column legal_impuestos jsonb not null default '[{"nombre": "IVA", "porcentaje": null, "incluido": null}]'
    check (jsonb_typeof(legal_impuestos) = 'array' and jsonb_array_length(legal_impuestos) <= 6),
  add column legal_garantia_nuevos smallint check (legal_garantia_nuevos between 1 and 120),
  add column legal_garantia_usados text not null default '' check (legal_garantia_usados in ('', 'con', 'sin')),
  add column legal_garantia_usados_meses smallint check (legal_garantia_usados_meses between 1 and 120),
  add column legal_retracto_canal text not null default '' check (legal_retracto_canal in ('', 'correo', 'whatsapp')),
  add column legal_entrega text[] not null default '{}' check (legal_entrega <@ array['retiro', 'transportadora', 'personal']),
  add column legal_entrega_zonas text not null default '' check (length(legal_entrega_zonas) <= 200),
  add column legal_apple_detalle text not null default '' check (length(legal_apple_detalle) <= 400),
  add column legal_homologados text not null default '' check (legal_homologados in ('', 'si', 'no')),
  add column legal_clausula_privacidad text not null default '' check (length(legal_clausula_privacidad) <= 4000),
  add column legal_clausula_terminos text not null default '' check (length(legal_clausula_terminos) <= 4000),
  add column legal_clausula_cookies text not null default '' check (length(legal_clausula_cookies) <= 4000),
  add column legal_clausula_aviso text not null default '' check (length(legal_clausula_aviso) <= 4000),
  add column meta_pixel_id text not null default '' check (length(meta_pixel_id) <= 30),
  add column ga4_activo boolean not null default false,
  add column ga4_id text not null default '' check (length(ga4_id) <= 30),
  add column gtm_activo boolean not null default false,
  add column gtm_id text not null default '' check (length(gtm_id) <= 30),
  add column clarity_activo boolean not null default false,
  add column clarity_id text not null default '' check (length(clarity_id) <= 30),
  add column tiktok_activo boolean not null default false,
  add column tiktok_id text not null default '' check (length(tiktok_id) <= 30),
  add column gads_activo boolean not null default false,
  add column gads_id text not null default '' check (length(gads_id) <= 30),
  add column capi_solo_consentimiento boolean not null default true,
  add column plataforma_sitio text not null default 'HighLevel (GoHighLevel)' check (length(plataforma_sitio) <= 80),
  add column legal_publicado jsonb check (legal_publicado is null or jsonb_typeof(legal_publicado) = 'object');

-- Los textos que escribió la tienda pasan a su cláusula propia. md5 de los
-- textos base de 0015 (iguales a los de assets/js/datos/legales-base.js, que
-- se borra con esta migración).
update public.tienda set
  legal_clausula_privacidad = case when md5(texto_privacidad) = '6ba042ee7eeed7ecbef2f998899938e3' then '' else left(btrim(texto_privacidad), 4000) end,
  legal_clausula_terminos = left(btrim(concat_ws(E'\n\n',
    case when md5(texto_terminos) = '366897a48f8771e96942b5bd72fb111e' then null else nullif(btrim(texto_terminos), '') end,
    nullif(btrim(aviso_marca), ''))), 4000),
  legal_clausula_aviso = case when md5(texto_autorizacion_datos) = '7df521d7d607cbf79f1fcbfcb29a132b' then '' else left(btrim(texto_autorizacion_datos), 4000) end
where id = 1;

alter table public.tienda
  drop column texto_privacidad,
  drop column texto_terminos,
  drop column texto_autorizacion_datos,
  drop column aviso_marca,
  drop column legales_revisados,
  drop column legales_herramientas;

-- Lo que falta para publicar: las claves de los campos (como faltantes() de
-- motor.js; los pasos y los textos los pone el panel). Solo Colombia está
-- disponible: sus tipos de documento y su garantía mínima van fijos aquí.
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
    if t.whatsapp !~ '^57\d{10}$' then f := array_append(f, 'whatsapp'); end if;
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

grant execute on function public.legal_faltantes(public.tienda) to authenticated;

-- Publicación: solo completa, con los cuatro documentos sin marcas, y nunca
-- se despublica. La versión sube solo si cambió algún documento.
create or replace function public.publicar_legales()
returns trigger language plpgsql set search_path = public as $$
declare
  d text;
  hoy date := (now() at time zone 'America/Bogota')::date;
begin
  if new.legal_publicado is not distinct from old.legal_publicado then return new; end if;
  if new.legal_publicado is null then
    raise exception 'Los textos legales publicados no se pueden quitar.' using errcode = '23514';
  end if;
  if cardinality(public.legal_faltantes(new)) > 0 then
    raise exception 'Faltan datos para publicar los textos legales.' using errcode = '23514';
  end if;
  foreach d in array array['privacidad', 'terminos', 'cookies', 'aviso'] loop
    if jsonb_typeof(new.legal_publicado->'documentos'->d) is distinct from 'string'
       or btrim(new.legal_publicado->'documentos'->>d) = ''
       or new.legal_publicado->'documentos'->>d ~ '\[PENDIENTE|\{\{' then
      raise exception 'Algún dato no tiene el formato correcto. Revise los campos.' using errcode = '23514';
    end if;
  end loop;
  if old.legal_publicado is not null and old.legal_publicado->'documentos' = new.legal_publicado->'documentos' then
    new.legal_publicado := old.legal_publicado;
  else
    new.legal_publicado := jsonb_build_object(
      'version', coalesce((old.legal_publicado->>'version')::int, 0) + 1,
      'vigente_desde', to_char(hoy, 'YYYY-MM-DD'),
      'huella', coalesce(new.legal_publicado->>'huella', ''),
      'documentos', new.legal_publicado->'documentos');
  end if;
  return new;
end $$;

create trigger tienda_publicar_legales before update of legal_publicado on public.tienda
  for each row execute function public.publicar_legales();
