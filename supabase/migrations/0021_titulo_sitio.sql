-- =============================================================================
-- 0021: título del sitio editable (ronda 3, B5).
--   tienda.titulo_sitio: el título grande del sitio (h1), hasta 80 caracteres.
--   Vacío = el del idioma de la tienda ("Elija su iPhone y cómprelo por
--   WhatsApp." en español; su traducción en portugués). Se edita en Mi tienda
--   → Marca.
-- =============================================================================

alter table public.tienda
  add column titulo_sitio text not null default '' check (char_length(titulo_sitio) <= 80);
