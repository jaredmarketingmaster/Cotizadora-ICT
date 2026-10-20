-- =============================================================================
-- 0007 — Roles "administrador" y "gestor" (reemplazan a "agencia" y "tienda")
-- -----------------------------------------------------------------------------
-- - administrador: solo gestiona los accesos (Usuarios: invitar, desactivar,
--   reactivar y asignar roles). No edita la tienda, el inventario ni el
--   catálogo.
-- - gestor: todo lo demás, incluido el catálogo completo, el modo demo y
--   "Borrar datos de demostración". No ve Usuarios.
-- - Siempre queda al menos un administrador activo.
--
-- Los perfiles existentes pasan así: agencia → administrador, tienda → gestor.
-- Las funciones es_agencia() y es_staff() se reemplazan por es_administrador()
-- y es_gestor(), y se rehacen todas las políticas que las usaban.
-- =============================================================================

-- 1. Perfiles ---------------------------------------------------------------------

alter table public.perfiles drop constraint perfiles_rol_check;
update public.perfiles set rol = case rol when 'agencia' then 'administrador' else 'gestor' end;
alter table public.perfiles add constraint perfiles_rol_check check (rol in ('administrador', 'gestor'));

-- 2. Funciones de rol (security definer para leer perfiles desde las políticas) --

create or replace function public.es_administrador()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.rol_actual() = 'administrador', false)
$$;

create or replace function public.es_gestor()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.rol_actual() = 'gestor', false)
$$;

-- 3. Políticas: todo lo que no es acceso, solo el gestor -------------------------

drop policy tienda_editar on public.tienda;
create policy tienda_editar on public.tienda for update to authenticated
  using (public.es_gestor()) with check (public.es_gestor());

drop policy modelos_leer on public.modelos;
drop policy modelos_editar on public.modelos;
drop policy modelos_agregar on public.modelos;
drop policy modelos_borrar on public.modelos;
create policy modelos_leer on public.modelos for select to anon, authenticated
  using (activo or public.es_gestor());
create policy modelos_editar on public.modelos for update to authenticated
  using (public.es_gestor()) with check (public.es_gestor());
create policy modelos_agregar on public.modelos for insert to authenticated
  with check (public.es_gestor());
create policy modelos_borrar on public.modelos for delete to authenticated
  using (public.es_gestor());

drop policy fichas_leer on public.fichas;
drop policy fichas_agregar on public.fichas;
drop policy fichas_editar on public.fichas;
drop policy fichas_borrar on public.fichas;
create policy fichas_leer on public.fichas for select to anon, authenticated
  using (public.es_gestor() or exists (
    select 1 from public.modelos m where m.id = fichas.modelo_id and m.activo));
create policy fichas_agregar on public.fichas for insert to authenticated
  with check (public.es_gestor());
create policy fichas_editar on public.fichas for update to authenticated
  using (public.es_gestor()) with check (public.es_gestor());
create policy fichas_borrar on public.fichas for delete to authenticated
  using (public.es_gestor());

drop policy equipos_leer on public.equipos;
drop policy equipos_agregar on public.equipos;
drop policy equipos_editar on public.equipos;
drop policy equipos_borrar on public.equipos;
create policy equipos_leer on public.equipos for select to anon, authenticated
  using (public.es_gestor() or (publicado and en_stock and exists (
    select 1 from public.modelos m where m.id = equipos.modelo_id and m.activo)));
create policy equipos_agregar on public.equipos for insert to authenticated
  with check (public.es_gestor());
create policy equipos_editar on public.equipos for update to authenticated
  using (public.es_gestor()) with check (public.es_gestor());
create policy equipos_borrar on public.equipos for delete to authenticated
  using (public.es_gestor());

drop policy colores_leer on public.colores;
drop policy colores_editar on public.colores;
drop policy colores_agregar on public.colores;
drop policy colores_borrar on public.colores;
create policy colores_leer on public.colores for select to anon, authenticated
  using (public.es_gestor() or exists (
    select 1 from public.modelos m where m.id = colores.modelo_id and m.activo));
create policy colores_editar on public.colores for update to authenticated
  using (public.es_gestor()) with check (public.es_gestor());
create policy colores_agregar on public.colores for insert to authenticated
  with check (public.es_gestor());
create policy colores_borrar on public.colores for delete to authenticated
  using (public.es_gestor());

-- Perfiles: cada uno ve el suyo; el administrador ve todos y cambia rol y estado.
drop policy perfiles_leer on public.perfiles;
drop policy perfiles_editar on public.perfiles;
create policy perfiles_leer on public.perfiles for select to authenticated
  using (user_id = auth.uid() or public.es_administrador());
create policy perfiles_editar on public.perfiles for update to authenticated
  using (public.es_administrador()) with check (public.es_administrador());

-- Archivos (fotos y marca): solo el gestor sube, cambia y borra.
drop policy archivos_subir on storage.objects;
drop policy archivos_cambiar on storage.objects;
drop policy archivos_borrar on storage.objects;
create policy archivos_subir on storage.objects for insert to authenticated
  with check (bucket_id in ('fotos', 'marca') and public.es_gestor());
create policy archivos_cambiar on storage.objects for update to authenticated
  using (bucket_id in ('fotos', 'marca') and public.es_gestor())
  with check (bucket_id in ('fotos', 'marca') and public.es_gestor());
create policy archivos_borrar on storage.objects for delete to authenticated
  using (bucket_id in ('fotos', 'marca') and public.es_gestor());

-- 4. Disparadores y funciones ---------------------------------------------------

-- modelos_proteger: el gestor tiene el catálogo completo; solo queda la marca
-- de demo (si alguien cambia "activo", el modelo deja de ser de la demo).
create or replace function public.proteger_catalogo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.es_gestor() then
    raise exception 'Solo el gestor puede cambiar el catálogo.' using errcode = '42501';
  end if;
  if auth.uid() is not null and new.activo is distinct from old.activo then
    new.activo_por_demo := false;
  end if;
  return new;
end $$;

-- tienda_proteger: el modo demo solo lo cambia el gestor.
create or replace function public.proteger_tienda()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.es_gestor()
     and new.modo_demo is distinct from old.modo_demo then
    raise exception 'Solo el gestor puede cambiar el modo demo.' using errcode = '42501';
  end if;
  return new;
end $$;

-- perfiles_proteger:
-- - Con sesión, nadie cambia su propio rol ni se desactiva a sí mismo.
-- - Siempre (también con la clave de servicio de la función "usuarios") debe
--   quedar al menos un administrador activo. El "for update" bloquea las filas
--   de los otros administradores para que dos cambios a la vez no dejen cero.
create or replace function public.proteger_perfil()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and old.user_id = auth.uid()
     and (new.rol is distinct from old.rol or new.activo is distinct from old.activo) then
    raise exception 'No puede cambiar su propio rol ni desactivarse.' using errcode = '42501';
  end if;
  if old.rol = 'administrador' and old.activo and (new.rol <> 'administrador' or not new.activo) then
    perform 1 from public.perfiles p
      where p.rol = 'administrador' and p.activo and p.user_id <> old.user_id
      for update;
    if not found then
      raise exception 'Debe quedar al menos un administrador activo.' using errcode = '42501';
    end if;
  end if;
  return new;
end $$;

-- Borrar datos de demostración: solo el gestor.
create or replace function public.borrar_datos_demo()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.es_gestor() then
    raise exception 'Solo el gestor puede borrar los datos de demostración.' using errcode = '42501';
  end if;
  delete from public.equipos where es_demo;
  update public.modelos set activo = false, activo_por_demo = false where activo_por_demo;
  update public.tienda set modo_demo = false where id = 1;
end $$;

-- 5. Las funciones viejas ya no las usa nadie -------------------------------------

drop function public.es_agencia();
drop function public.es_staff();
