-- =============================================================================
-- 0009 — Un video corto opcional por equipo
-- -----------------------------------------------------------------------------
-- - equipos.video: ruta en el bucket "videos" ("" = sin video).
-- - Bucket propio "videos" (en lugar de ampliar "fotos"): así tiene su propio
--   límite (20 MB) y sus propios tipos (MP4 y WebM), y el de fotos sigue
--   aceptando solo imágenes de hasta 10 MB. Storage rechaza lo demás aunque
--   alguien salte el panel.
-- - El panel valida antes de subir: MP4 con H.264 o WebM, hasta 15 segundos y
--   20 MB. No se comprime ni se convierte.
-- - Al quitar el video o borrar el equipo, el panel borra el archivo.
-- =============================================================================

alter table public.equipos
  add column video text not null default ''
    check (video = '' or video ~ '^equipos/[A-Za-z0-9_-]+\.(mp4|webm)$');

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('videos', 'videos', true, 20971520, array['video/mp4', 'video/webm'])
on conflict (id) do nothing;

-- Las reglas de archivos suman el bucket "videos": todos leen; solo el gestor
-- sube, cambia y borra.
drop policy archivos_leer on storage.objects;
drop policy archivos_subir on storage.objects;
drop policy archivos_cambiar on storage.objects;
drop policy archivos_borrar on storage.objects;
create policy archivos_leer on storage.objects for select to anon, authenticated
  using (bucket_id in ('fotos', 'marca', 'videos'));
create policy archivos_subir on storage.objects for insert to authenticated
  with check (bucket_id in ('fotos', 'marca', 'videos') and public.es_gestor());
create policy archivos_cambiar on storage.objects for update to authenticated
  using (bucket_id in ('fotos', 'marca', 'videos') and public.es_gestor())
  with check (bucket_id in ('fotos', 'marca', 'videos') and public.es_gestor());
create policy archivos_borrar on storage.objects for delete to authenticated
  using (bucket_id in ('fotos', 'marca', 'videos') and public.es_gestor());
