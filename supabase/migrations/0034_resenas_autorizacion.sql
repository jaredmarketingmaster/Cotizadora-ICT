-- =============================================================================
-- 0034 — Reseñas: cómo autorizó cada cliente la publicación
-- -----------------------------------------------------------------------------
-- Punto 9 de la investigación de Jared con Gemini (opción "a", aprobada el
-- 23/10/2026). Por reseña se guarda cómo, cuándo y para qué autorizó la
-- persona, SIN ningún dato de ella (regla 6: los datos de clientes no van a
-- Supabase):
-- - autorizacion_canal: whatsapp, correo, presencial (por escrito, en
--   persona), otro, o datos_tapados (no hizo falta: la tienda tapó nombre,
--   foto y número). Las reseñas que ya existían quedan en "sin_registrar" y el
--   panel pide completarlas; una reseña nueva no puede quedar así, ni volver a
--   "sin_registrar".
-- - autorizacion_fecha y autorizacion_alcance (sitio, o sitio_y_redes): con un
--   canal de autorización son obligatorias; con datos_tapados o sin_registrar,
--   vacías. La fecha no puede ser futura (con un día de margen por las zonas
--   horarias).
-- - El público no lee estas columnas (permiso por columna para anon);
--   datos_publicos() ya arma las reseñas con sus campos públicos.
-- assets/js/datos/demo.js repite las mismas reglas.
-- =============================================================================

alter table public.resenas
  add column autorizacion_canal text not null default 'sin_registrar'
    check (autorizacion_canal in ('sin_registrar', 'datos_tapados', 'whatsapp', 'correo', 'presencial', 'otro')),
  add column autorizacion_fecha date,
  add column autorizacion_alcance text not null default '' check (autorizacion_alcance in ('', 'sitio', 'sitio_y_redes')),
  add constraint resenas_autorizacion_completa check (
    (autorizacion_canal in ('sin_registrar', 'datos_tapados') and autorizacion_fecha is null and autorizacion_alcance = '')
    or (autorizacion_canal in ('whatsapp', 'correo', 'presencial', 'otro') and autorizacion_fecha is not null and autorizacion_alcance <> ''));

create or replace function public.validar_autorizacion_resena()
returns trigger language plpgsql set search_path = public as $$
begin
  if new.autorizacion_canal = 'sin_registrar' and (tg_op = 'INSERT' or old.autorizacion_canal <> 'sin_registrar') then
    raise exception 'Diga cómo autorizó esta persona la publicación.' using errcode = '23514';
  end if;
  if new.autorizacion_fecha > current_date + 1 then
    raise exception 'La fecha de la autorización no puede ser futura.' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger resenas_autorizacion before insert or update on public.resenas
  for each row execute function public.validar_autorizacion_resena();

-- El público lee solo los campos que se muestran.
revoke select on public.resenas from anon;
grant select (id, tipo, ruta, texto, origen, origen_otro, autorizado, orden, creado_en) on public.resenas to anon;
