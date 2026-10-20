-- =============================================================================
-- Catálogo maestro: 32 modelos, en este orden, todos inactivos.
-- La tienda activa desde el panel solo los que vende.
-- Las fichas se crean vacías (disparador modelos_ficha): no se precarga
-- ninguna especificación.
-- "orden" va de 10 en 10 para poder intercalar modelos nuevos.
-- =============================================================================

insert into public.modelos (nombre, slug, generacion, orden, activo) values
  ('iPhone 11', 'iphone-11', '11', 10, false),
  ('iPhone 11 Pro', 'iphone-11-pro', '11', 20, false),
  ('iPhone 11 Pro Max', 'iphone-11-pro-max', '11', 30, false),
  ('iPhone 12 mini', 'iphone-12-mini', '12', 40, false),
  ('iPhone 12', 'iphone-12', '12', 50, false),
  ('iPhone 12 Pro', 'iphone-12-pro', '12', 60, false),
  ('iPhone 12 Pro Max', 'iphone-12-pro-max', '12', 70, false),
  ('iPhone 13 mini', 'iphone-13-mini', '13', 80, false),
  ('iPhone 13', 'iphone-13', '13', 90, false),
  ('iPhone 13 Pro', 'iphone-13-pro', '13', 100, false),
  ('iPhone 13 Pro Max', 'iphone-13-pro-max', '13', 110, false),
  ('iPhone 14', 'iphone-14', '14', 120, false),
  ('iPhone 14 Plus', 'iphone-14-plus', '14', 130, false),
  ('iPhone 14 Pro', 'iphone-14-pro', '14', 140, false),
  ('iPhone 14 Pro Max', 'iphone-14-pro-max', '14', 150, false),
  ('iPhone 15', 'iphone-15', '15', 160, false),
  ('iPhone 15 Plus', 'iphone-15-plus', '15', 170, false),
  ('iPhone 15 Pro', 'iphone-15-pro', '15', 180, false),
  ('iPhone 15 Pro Max', 'iphone-15-pro-max', '15', 190, false),
  ('iPhone 16e', 'iphone-16e', '16', 200, false),
  ('iPhone 16', 'iphone-16', '16', 210, false),
  ('iPhone 16 Plus', 'iphone-16-plus', '16', 220, false),
  ('iPhone 16 Pro', 'iphone-16-pro', '16', 230, false),
  ('iPhone 16 Pro Max', 'iphone-16-pro-max', '16', 240, false),
  ('iPhone 17e', 'iphone-17e', '17', 250, false),
  ('iPhone 17', 'iphone-17', '17', 260, false),
  ('iPhone Air', 'iphone-air', '17', 270, false),
  ('iPhone 17 Pro', 'iphone-17-pro', '17', 280, false),
  ('iPhone 17 Pro Max', 'iphone-17-pro-max', '17', 290, false),
  ('iPhone 18 Pro', 'iphone-18-pro', '18', 300, false),
  ('iPhone 18 Pro Max', 'iphone-18-pro-max', '18', 310, false),
  ('iPhone Duo', 'iphone-duo', 'Plegable', 320, false)
on conflict (slug) do nothing;
