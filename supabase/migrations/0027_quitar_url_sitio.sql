-- =============================================================================
-- 0027: se quita el archivo XML de productos (pedido de Jared, 22/10/2026).
--   El archivo para Google Merchant Center y el catálogo de Meta (ronda 3, C4:
--   la función catalogo-feed y la pestaña Catálogo → Archivo XML) no se
--   habilita por ahora. tienda.url_sitio (0025) solo la usaba ese archivo, así
--   que se borra con su check. El enlace ?equipo=<id> del sitio sigue.
--   Para volver a tenerlo: una migración nueva que la agregue otra vez.
-- =============================================================================

alter table public.tienda drop column if exists url_sitio;
