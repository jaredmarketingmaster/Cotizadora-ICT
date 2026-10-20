-- =============================================================================
-- 0011 — Cómo se ven los equipos en el sitio: cuadrícula o carrusel
-- -----------------------------------------------------------------------------
-- Se elige en Mi tienda → Diseño del sitio. "cuadricula" (por defecto) es la
-- de siempre; "carrusel" muestra una tarjeta al centro y las vecinas a los
-- lados, con las mismas tarjetas, el mismo filtro y el mismo orden.
-- =============================================================================

alter table public.tienda
  add column vista_equipos text not null default 'cuadricula'
    check (vista_equipos in ('cuadricula', 'carrusel'));
