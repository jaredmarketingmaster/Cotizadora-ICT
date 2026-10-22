-- =============================================================================
-- 0025: dirección del sitio (ronda 3, C4).
--   tienda.url_sitio: la dirección pública del sitio (https://…), hasta 200
--   caracteres. La pide el archivo XML de productos (función catalogo-feed):
--   cada producto enlaza a <url_sitio>?equipo=<id>. Se edita en Catálogo →
--   Archivo XML. Vacía = no hay archivo.
-- =============================================================================

alter table public.tienda
  add column url_sitio text not null default ''
    check (url_sitio = '' or (url_sitio ~ '^https://[^\s/]+\.[^\s]+$' and length(url_sitio) <= 200));
