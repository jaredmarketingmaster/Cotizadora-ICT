-- =============================================================================
-- 0020: idioma del sitio y del panel (ronda 3, B4).
--   tienda.idioma: 'es' (español, por defecto) o 'pt' (portugués de Brasil).
--   Cambia todo el texto del sitio, el pop-up, el banner de cookies, el marco
--   de las páginas legales y el panel (assets/js/i18n/). Los textos legales
--   generados siguen en español mientras no haya un módulo legal en portugués.
--   Las tiendas que ya existían quedan en español (el valor por defecto).
-- =============================================================================

alter table public.tienda
  add column idioma text not null default 'es' check (idioma in ('es', 'pt'));
