-- Roles y esquemas que Supabase ya trae. Solo para el entorno local de pruebas.
create role anon nologin noinherit;
create role authenticated nologin noinherit;
create role service_role nologin noinherit bypassrls;
create role authenticator login noinherit;
grant anon, authenticated, service_role to authenticator;
create role supabase_auth_admin login noinherit createrole;
create schema auth authorization supabase_auth_admin;
grant create on database postgres to supabase_auth_admin;
grant usage on schema public to anon, authenticated, service_role;
