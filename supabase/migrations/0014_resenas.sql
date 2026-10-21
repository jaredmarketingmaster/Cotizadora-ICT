-- =============================================================================
-- 0014 — Reseñas (Mi tienda → Reseñas)
-- -----------------------------------------------------------------------------
-- - tienda.mostrar_resenas: "Mostrar reseñas en el sitio" (no por defecto).
-- - tienda.titulo_resenas: el título de la sección (editable).
-- - Tabla resenas: hasta 12, ordenables. Cada una es una imagen (comprimida
--   como las fotos: ruta.webp y ruta-640.webp) o un video (MP4 o WebM, hasta
--   30 segundos y 20 MB, sin comprimir), con texto y origen opcionales. La
--   casilla "Tengo autorización de esta persona o tapé su nombre, foto y
--   número." es obligatoria: autorizado siempre es verdadero.
-- - El público solo las lee con el interruptor encendido (RLS); el gestor
--   las lee siempre y es el único que escribe.
-- - Bucket propio "resenas" (20 MB, imágenes y videos), con las mismas reglas
--   que las fotos: todos leen, solo el gestor sube, cambia y borra.
-- - No se crea ninguna reseña: ni en la semilla ni en el modo demo.
-- =============================================================================

alter table public.tienda
  add column mostrar_resenas boolean not null default false,
  add column titulo_resenas text not null default 'Lo que dicen nuestros clientes'
    check (length(titulo_resenas) <= 80);

create table public.resenas (
  id           uuid primary key default gen_random_uuid(),
  tipo         text not null check (tipo in ('imagen', 'video')),
  ruta         text not null,
  texto        text not null default '' check (length(texto) <= 300),
  origen       text not null default '' check (origen in ('', 'instagram', 'whatsapp', 'google', 'otro')),
  origen_otro  text not null default '' check (length(origen_otro) <= 40 and (origen = 'otro' or origen_otro = '')),
  autorizado   boolean not null check (autorizado),
  orden        integer not null default 0,
  creado_en    timestamptz not null default now(),
  check ((tipo = 'imagen' and ruta ~ '^resenas/[A-Za-z0-9_-]+\.(webp|jpg|png)$')
      or (tipo = 'video' and ruta ~ '^resenas/[A-Za-z0-9_-]+\.(mp4|webm)$'))
);

-- Hasta 12 (el bloqueo evita que dos altas a la vez pasen de 12).
create or replace function public.limitar_resenas()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  perform pg_advisory_xact_lock(hashtext('resenas'));
  if (select count(*) from public.resenas) >= 12 then
    raise exception 'Ya tiene 12 reseñas. Borre una para agregar otra.' using errcode = '23514';
  end if;
  return new;
end $$;

create trigger resenas_limitar before insert on public.resenas
  for each row execute function public.limitar_resenas();

alter table public.resenas enable row level security;

grant select on public.resenas to anon, authenticated;
grant insert, update, delete on public.resenas to authenticated;

create policy resenas_leer on public.resenas for select to anon, authenticated
  using ((select mostrar_resenas from public.tienda where id = 1) or public.es_gestor());
create policy resenas_agregar on public.resenas for insert to authenticated
  with check (public.es_gestor());
create policy resenas_editar on public.resenas for update to authenticated
  using (public.es_gestor()) with check (public.es_gestor());
create policy resenas_borrar on public.resenas for delete to authenticated
  using (public.es_gestor());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('resenas', 'resenas', true, 20971520, array['image/webp', 'image/jpeg', 'image/png', 'video/mp4', 'video/webm'])
on conflict (id) do nothing;

drop policy archivos_leer on storage.objects;
drop policy archivos_subir on storage.objects;
drop policy archivos_cambiar on storage.objects;
drop policy archivos_borrar on storage.objects;
create policy archivos_leer on storage.objects for select to anon, authenticated
  using (bucket_id in ('fotos', 'marca', 'videos', 'resenas'));
create policy archivos_subir on storage.objects for insert to authenticated
  with check (bucket_id in ('fotos', 'marca', 'videos', 'resenas') and public.es_gestor());
create policy archivos_cambiar on storage.objects for update to authenticated
  using (bucket_id in ('fotos', 'marca', 'videos', 'resenas') and public.es_gestor())
  with check (bucket_id in ('fotos', 'marca', 'videos', 'resenas') and public.es_gestor());
create policy archivos_borrar on storage.objects for delete to authenticated
  using (bucket_id in ('fotos', 'marca', 'videos', 'resenas') and public.es_gestor());

-- datos_publicos() suma las reseñas (solo con el interruptor encendido; la
-- política resenas_leer lo exige igual).
create or replace function public.datos_publicos()
returns jsonb
language sql stable security invoker set search_path = public
as $$
  select jsonb_build_object(
    'tienda',  (select to_jsonb(t) from public.tienda t where id = 1),
    'modelos', coalesce((select jsonb_agg(to_jsonb(m) order by m.orden) from public.modelos m where m.activo), '[]'::jsonb),
    'fichas',  coalesce((select jsonb_agg(to_jsonb(f)) from public.fichas f
                          join public.modelos m on m.id = f.modelo_id and m.activo), '[]'::jsonb),
    'colores', coalesce((select jsonb_agg(to_jsonb(c) order by c.modelo_id, c.orden) from public.colores c
                          join public.modelos m on m.id = c.modelo_id and m.activo), '[]'::jsonb),
    'equipos', coalesce((select jsonb_agg(to_jsonb(e)) from public.equipos e
                          join public.modelos m on m.id = e.modelo_id and m.activo
                          where e.publicado and e.en_stock), '[]'::jsonb),
    'resenas', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'tipo', r.tipo, 'ruta', r.ruta, 'texto', r.texto,
                                                             'origen', r.origen, 'origen_otro', r.origen_otro) order by r.orden, r.creado_en)
                          from public.resenas r where (select mostrar_resenas from public.tienda where id = 1)), '[]'::jsonb)
  )
$$;
