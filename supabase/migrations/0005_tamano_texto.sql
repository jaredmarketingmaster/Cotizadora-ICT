-- =============================================================================
-- 0005 — Tamaño del texto del sitio público
-- -----------------------------------------------------------------------------
-- "compacto", "normal" (por defecto) o "grande". Se elige en Mi tienda → Marca
-- y se aplica al sitio, al pop-up y a las páginas legales (no al panel).
-- Ningún texto baja de 16 px: "compacto" solo achica títulos, precios grandes
-- y espacios; "grande" agranda todo el texto cerca de un 12 %.
-- =============================================================================

alter table public.tienda
  add column tamano_texto text not null default 'normal'
    check (tamano_texto in ('compacto', 'normal', 'grande'));
