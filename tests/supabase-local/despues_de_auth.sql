-- Después de las migraciones del servidor de auth: permisos y Storage simulado.
grant usage on schema auth to anon, authenticated, service_role;
grant select on auth.users to service_role;
create schema storage;
create table storage.buckets (id text primary key, name text, public boolean, file_size_limit bigint, allowed_mime_types text[]);
create table storage.objects (id uuid primary key default gen_random_uuid(), bucket_id text references storage.buckets (id), name text, owner uuid);
alter table storage.objects enable row level security;
grant usage on schema storage to anon, authenticated, service_role;
grant select, insert, update, delete on storage.objects to anon, authenticated;
grant select on storage.buckets to anon, authenticated;
-- PostgREST: los roles que puede asumir y todo lo de public para service_role
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;
