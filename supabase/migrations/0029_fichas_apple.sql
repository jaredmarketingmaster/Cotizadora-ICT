-- =============================================================================
-- 0029 — Fichas técnicas según Apple: batería, cámaras y medidas
-- -----------------------------------------------------------------------------
-- Investigación de Jared con Gemini (22/10/2026), aprobada el 23/10/2026: lo
-- que la fuente del catálogo no traía, sacado de las fichas de soporte de
-- Apple (número de artículo en la sección 17 de
-- DOCUMENTACION.md y en AI_HANDOFF.md).
-- - Batería de los 42 modelos (horas de video, video en streaming y audio, y
--   la carga rápida). Sin mAh: Apple no los publica.
-- - Cámara frontal del 17, 17 Pro, 17 Pro Max, 18 Pro, 18 Pro Max y Duo;
--   cámaras traseras del Duo; dimensiones y peso del 17 Pro, 17 Pro Max,
--   18 Pro, 18 Pro Max y Duo.
-- Una fila se agrega SOLO si la ficha del modelo no tiene esa categoría: lo
-- que cargó la tienda no se toca. Las filas van al final (el sitio las ordena
-- por categoría). assets/js/datos/semilla.js (FICHAS_APPLE) tiene lo mismo y
-- demo.js hace la misma migración.
-- =============================================================================

with nuevas (slug, filas) as (values
  ('iphone-7', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 13 h\nAudio: hasta 40 h"}]'::jsonb),
  ('iphone-7-plus', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 14 h\nAudio: hasta 60 h"}]'::jsonb),
  ('iphone-8', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 13 h\nAudio: hasta 40 h\nCarga rápida: 50% en 30 min"}]'::jsonb),
  ('iphone-8-plus', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 14 h\nAudio: hasta 60 h\nCarga rápida: 50% en 30 min (adaptador de 18 W o más)"}]'::jsonb),
  ('iphone-x', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 13 h\nAudio: hasta 60 h\nCarga rápida: 50% en 30 min"}]'::jsonb),
  ('iphone-xs', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 14 h\nAudio: hasta 60 h\nCarga rápida: 50% en 30 min (adaptador de 18 W o más)"}]'::jsonb),
  ('iphone-xs-max', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 15 h\nAudio: hasta 65 h\nCarga rápida: 50% en 30 min (adaptador de 18 W o más)"}]'::jsonb),
  ('iphone-xr', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 16 h\nAudio: hasta 65 h\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-11', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 17 h\nVideo en streaming: hasta 10 h\nAudio: hasta 65 h\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-11-pro', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 18 h\nVideo en streaming: hasta 11 h\nAudio: hasta 65 h\nCarga rápida: 50% en 30 min (adaptador de 18 W o más)"}]'::jsonb),
  ('iphone-11-pro-max', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 20 h\nVideo en streaming: hasta 12 h\nAudio: hasta 80 h\nCarga rápida: 50% en 30 min (adaptador de 18 W o más)"}]'::jsonb),
  ('iphone-se-2', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 13 h\nVideo en streaming: hasta 8 h\nAudio: hasta 40 h\nCarga rápida: 50% en 30 min (adaptador de 18 W o más)"}]'::jsonb),
  ('iphone-12-mini', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 15 h\nVideo en streaming: hasta 10 h\nAudio: hasta 50 h\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-12', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 17 h\nVideo en streaming: hasta 11 h\nAudio: hasta 65 h\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-12-pro', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 17 h\nVideo en streaming: hasta 11 h\nAudio: hasta 65 h\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-12-pro-max', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 20 h\nVideo en streaming: hasta 12 h\nAudio: hasta 80 h\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-13-mini', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 17 h\nVideo en streaming: hasta 13 h\nAudio: hasta 55 h\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-13', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 19 h\nVideo en streaming: hasta 15 h\nAudio: hasta 75 h\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-13-pro', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 22 h\nVideo en streaming: hasta 20 h\nAudio: hasta 75 h\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-13-pro-max', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 28 h\nVideo en streaming: hasta 25 h\nAudio: hasta 95 h\nCarga rápida: 50% en 35 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-se-3', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 15 h\nVideo en streaming: hasta 10 h\nAudio: hasta 50 h\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-14', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 20 h\nVideo en streaming: hasta 16 h\nAudio: hasta 80 h\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-14-plus', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 26 h\nVideo en streaming: hasta 20 h\nAudio: hasta 100 h\nCarga rápida: 50% en 35 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-14-pro', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 23 h\nVideo en streaming: hasta 20 h\nAudio: hasta 75 h\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-14-pro-max', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 29 h\nVideo en streaming: hasta 25 h\nAudio: hasta 95 h\nCarga rápida: 50% en 35 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-15', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 20 h\nVideo en streaming: hasta 16 h\nAudio: hasta 80 h\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-15-plus', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 26 h\nVideo en streaming: hasta 20 h\nAudio: hasta 100 h\nCarga rápida: 50% en 35 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-15-pro', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 23 h\nVideo en streaming: hasta 20 h\nAudio: hasta 75 h\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-15-pro-max', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 29 h\nVideo en streaming: hasta 25 h\nAudio: hasta 95 h\nCarga rápida: 50% en 35 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-16', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 22 h\nVideo en streaming: hasta 18 h\nAudio: hasta 80 h\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-16-plus', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 27 h\nVideo en streaming: hasta 24 h\nAudio: hasta 100 h\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-16-pro', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 27 h\nVideo en streaming: hasta 22 h\nAudio: hasta 85 h\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-16-pro-max', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 33 h\nVideo en streaming: hasta 29 h\nAudio: hasta 105 h\nCarga rápida: 50% en 35 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-16e', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 26 h\nVideo en streaming: hasta 21 h\nAudio: hasta 90 h\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-17', '[{"clave": "camara_frontal", "etiqueta": "Cámara frontal", "valor": "Cámara Center Stage de 18 MP (sensor cuadrado)"}, {"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 30 h\nVideo en streaming: hasta 27 h\nCarga rápida: 50% en 20 min (adaptador de 40 W o más)"}]'::jsonb),
  ('iphone-air', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 27 h (40 h con la batería MagSafe del iPhone Air)\nVideo en streaming: hasta 22 h (35 h con esa batería)\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-17-pro', '[{"clave": "camara_frontal", "etiqueta": "Cámara frontal", "valor": "Cámara Center Stage de 18 MP\nƒ/1.9\nAutoenfoque con Focus Pixels"}, {"clave": "bateria", "etiqueta": "Batería", "valor": "Video en streaming: hasta 28 h\nCarga rápida: 50% en 20 min (adaptador de 40 W o más)"}, {"clave": "dimensiones", "etiqueta": "Dimensiones y peso", "valor": "150.0 × 71.9 × 8.75 mm\n206 g"}]'::jsonb),
  ('iphone-17-pro-max', '[{"clave": "camara_frontal", "etiqueta": "Cámara frontal", "valor": "Cámara Center Stage de 18 MP\nƒ/1.9\nAutoenfoque con Focus Pixels"}, {"clave": "bateria", "etiqueta": "Batería", "valor": "Video en streaming: hasta 35 h\nCarga rápida: 50% en 20 min (adaptador de 40 W o más)"}, {"clave": "dimensiones", "etiqueta": "Dimensiones y peso", "valor": "163.4 × 78.0 × 8.75 mm\n231 g"}]'::jsonb),
  ('iphone-17e', '[{"clave": "bateria", "etiqueta": "Batería", "valor": "Video: hasta 26 h\nVideo en streaming: hasta 21 h\nCarga rápida: 50% en 30 min (adaptador de 20 W o más)"}]'::jsonb),
  ('iphone-18-pro', '[{"clave": "camara_frontal", "etiqueta": "Cámara frontal", "valor": "Cámara Center Stage de 18 MP\nƒ/1.9\nAutoenfoque con Focus Pixels"}, {"clave": "bateria", "etiqueta": "Batería", "valor": "Video en streaming: hasta 33 h\nCarga rápida: 50% en unos 15 min (adaptador de 60 W o más)"}, {"clave": "dimensiones", "etiqueta": "Dimensiones y peso", "valor": "150.0 × 71.9 × 8.75 mm\n211 g"}]'::jsonb),
  ('iphone-18-pro-max', '[{"clave": "camara_frontal", "etiqueta": "Cámara frontal", "valor": "Cámara Center Stage de 18 MP\nƒ/1.9\nAutoenfoque con Focus Pixels"}, {"clave": "bateria", "etiqueta": "Batería", "valor": "Video en streaming: hasta 40 h\nCarga rápida: 50% en unos 15 min (adaptador de 60 W o más)"}, {"clave": "dimensiones", "etiqueta": "Dimensiones y peso", "valor": "163.4 × 78.0 × 8.75 mm\n249 g"}]'::jsonb),
  ('iphone-duo', '[{"clave": "camaras_traseras", "etiqueta": "Cámaras traseras", "valor": "Trasera doble:\n• Fusion principal: 48 MP (teleobjetivo 2x de calidad óptica)\n• Fusion ultra gran angular: 48 MP"}, {"clave": "camara_frontal", "etiqueta": "Cámara frontal", "valor": "Cámara Center Stage de 18 MP (pantalla exterior)\nCámara FaceTime bajo la pantalla interior"}, {"clave": "bateria", "etiqueta": "Batería", "valor": "Uso típico: hasta 24 h\nVideo: hasta 44 h (pantalla exterior) o 31 h (interior)\nVideo en streaming: hasta 37 h (exterior) o 26 h (interior)\nDoble batería\nCarga rápida: 50% en 20 min (adaptador de 60 W o más)"}, {"clave": "dimensiones", "etiqueta": "Dimensiones y peso", "valor": "Abierto: 117.8 × 164.6 × 5.2 mm\nCerrado: 117.8 × 84.1 × 11.3 mm\n254 g"}]'::jsonb)
), agregar as (
  select f.modelo_id, (
    select coalesce(jsonb_agg(x order by o), '[]'::jsonb)
    from jsonb_array_elements(n.filas) with ordinality as e(x, o)
    where not exists (
      select 1 from jsonb_array_elements(f.especificaciones) y where y->>'clave' = x->>'clave')
  ) as filas
  from nuevas n
  join public.modelos m on m.slug = n.slug
  join public.fichas f on f.modelo_id = m.id
)
update public.fichas f
set especificaciones = f.especificaciones || a.filas
from agregar a
where f.modelo_id = a.modelo_id and jsonb_array_length(a.filas) > 0;
