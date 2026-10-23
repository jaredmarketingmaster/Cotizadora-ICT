-- =============================================================================
-- 0035 — El administrador también gestiona la tienda
-- -----------------------------------------------------------------------------
-- Corrección de Jared (23/10/2026): el administrador tiene todas las funciones
-- del gestor y, además, las suyas (Usuarios). El gestor sigue sin Usuarios.
-- Hasta aquí (0007) el administrador solo gestionaba accesos.
-- - es_gestor() pasa a decir "puede gestionar la tienda": gestor o
--   administrador activo. Todas las políticas, disparadores y funciones que la
--   usan (tienda, catálogo, equipos, fotos, videos, reseñas, legales, lote,
--   modo demo) quedan abiertas al administrador sin tocarlas.
-- - es_administrador() no cambia: Usuarios y la función "usuarios" siguen
--   siendo solo del administrador.
-- assets/js/datos/demo.js y el panel repiten la misma regla.
-- =============================================================================

create or replace function public.es_gestor()
returns boolean
language sql stable security definer set search_path = public
as $$
  select coalesce(public.rol_actual() in ('gestor', 'administrador'), false)
$$;
