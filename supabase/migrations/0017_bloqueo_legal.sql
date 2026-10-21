-- =============================================================================
-- 0017 — Bloqueo hasta publicar los textos legales
-- -----------------------------------------------------------------------------
-- Mientras tienda.legal_publicado esté vacío (Legales sin publicar):
-- - El modo demo no se puede apagar.
-- - "Borrar datos de demostración" no corre.
-- (El pop-up no envía pedidos y las páginas legales dicen "Página en
-- preparación": eso lo hace el sitio, que lee legal_publicado.)
-- Vale con cualquier sesión, también con la clave de servicio.
-- =============================================================================

create or replace function public.proteger_tienda()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is not null and not public.es_gestor()
     and new.modo_demo is distinct from old.modo_demo then
    raise exception 'Solo el gestor puede cambiar el modo demo.' using errcode = '42501';
  end if;
  if old.modo_demo and not new.modo_demo and new.legal_publicado is null then
    raise exception 'Publique los textos legales antes de quitar el modo demo.' using errcode = '23514';
  end if;
  return new;
end $$;

create or replace function public.borrar_datos_demo()
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.es_gestor() then
    raise exception 'Solo el gestor puede borrar los datos de demostración.' using errcode = '42501';
  end if;
  if (select legal_publicado is null from public.tienda where id = 1) then
    raise exception 'Publique los textos legales antes de borrar los datos de demostración.' using errcode = '23514';
  end if;
  delete from public.equipos where es_demo;
  update public.modelos set activo = false, activo_por_demo = false where activo_por_demo;
  update public.tienda set modo_demo = false where id = 1;
end $$;
