-- =============================================================================
-- 0028: colores según Apple (investigación con Gemini Deep Research que pasó
-- Jared, 22/10/2026; fuentes en catalogo/FALTANTES.md).
--   - Nombres de Apple en español de Latinoamérica: "Púrpura" → "Morado"
--     (iPhone 12 mini, 12, 14 y 14 Plus), "Verde salvia" → "Salvia" y
--     "Azul niebla" → "Azul neblina" (17), "Dorado claro" → "Oro claro" y
--     "Blanco de nube" → "Blanco nube" (Air), "Azul ultramar" → "Ultramarino" (16).
--   - Nombres en inglés que faltaban (17, 17e, 18 Pro y 18 Pro Max) y "Glacier"
--     en lugar de "Glacier Blue".
--   - iPhone 17 Pro y 17 Pro Max: sus 3 colores oficiales (antes, ninguno).
--   - iPhone 18 Pro y 18 Pro Max: los 4 colores de Apple (Negro, Borgoña,
--     Glaciar y Plata; Jared eligió "Borgoña"). Visón, Oliva, Azul nítido y
--     Magenta salen del catálogo.
--   - iPhone Duo: Cielo nocturno y Blanco estrella en lugar de "Titanio".
--   - Hexadecimales aproximados del iPhone 7 al SE (3.ª generación): los de
--     sitios de terceros, por modelo (siguen marcados como aproximados; solo
--     donde la tienda no cambió la muestra). Los colores nuevos sin hexadecimal
--     reciben uno aproximado por nombre, como en 0022.
-- Los equipos que ya existen siguen mostrando lo mismo: si su color recibe nombre
-- en inglés, el nombre en español pasa a ser su nombre a mostrar.
-- Un color oficial que sale del catálogo: si algún equipo lo usa, queda como
-- color de la tienda (oficial = false, con su nombre y su muestra); si no, se borra.
-- Si la tienda ya tenía un color propio con el mismo nombre que un oficial nuevo
-- (17 Pro, Duo), pasa a ser el oficial y conserva su muestra.
-- La misma lista está en assets/js/datos/semilla.js (COLORES y HEX_APROXIMADOS);
-- tests/sql/comparar-semilla.mjs revisa que coincidan.
-- =============================================================================

-- 1. Nombres de Apple en español.
update public.colores c set nombre_es = r.nuevo
from public.modelos m, (values
  ('iphone-12-mini', 'Púrpura', 'Morado'),
  ('iphone-12', 'Púrpura', 'Morado'),
  ('iphone-14', 'Púrpura', 'Morado'),
  ('iphone-14-plus', 'Púrpura', 'Morado'),
  ('iphone-16', 'Azul ultramar', 'Ultramarino'),
  ('iphone-16-plus', 'Azul ultramar', 'Ultramarino'),
  ('iphone-17', 'Verde salvia', 'Salvia'),
  ('iphone-17', 'Azul niebla', 'Azul neblina'),
  ('iphone-air', 'Dorado claro', 'Oro claro'),
  ('iphone-air', 'Blanco de nube', 'Blanco nube')
) as r (slug, viejo, nuevo)
where m.id = c.modelo_id and m.slug = r.slug and c.oficial and c.nombre_es = r.viejo;

-- 2. La lista completa de colores oficiales por modelo.
create temporary table colores_0028 (slug text, nombre_es text, nombre_en text, hex_fuente text, hex_aprox text, orden integer);
insert into colores_0028 values
  ('iphone-7', 'Negro brillante', 'Jet Black', '', '#0A0A0A', 1),
  ('iphone-7', 'Negro', 'Black', '', '#1F2020', 2),
  ('iphone-7', 'Plata', 'Silver', '', '#EBEBE3', 3),
  ('iphone-7', 'Oro', 'Gold', '', '#E6BE86', 4),
  ('iphone-7', 'Oro rosa', 'Rose Gold', '', '#E6C7C2', 5),
  ('iphone-7', '(PRODUCT)RED', '(PRODUCT)RED', '', '#BA0C2E', 6),
  ('iphone-7-plus', 'Negro brillante', 'Jet Black', '', '#0A0A0A', 1),
  ('iphone-7-plus', 'Negro', 'Black', '', '#1F2020', 2),
  ('iphone-7-plus', 'Plata', 'Silver', '', '#EBEBE3', 3),
  ('iphone-7-plus', 'Oro', 'Gold', '', '#E6BE86', 4),
  ('iphone-7-plus', 'Oro rosa', 'Rose Gold', '', '#E6C7C2', 5),
  ('iphone-7-plus', '(PRODUCT)RED', '(PRODUCT)RED', '', '#BA0C2E', 6),
  ('iphone-8', 'Plata', 'Silver', '', '#EBEBE3', 1),
  ('iphone-8', 'Gris espacial', 'Space Gray', '', '#535150', 2),
  ('iphone-8', 'Oro', 'Gold', '', '#FEEDD8', 3),
  ('iphone-8', '(PRODUCT)RED', '(PRODUCT)RED', '', '#BA0C2E', 4),
  ('iphone-8-plus', 'Plata', 'Silver', '', '#EBEBE3', 1),
  ('iphone-8-plus', 'Gris espacial', 'Space Gray', '', '#535150', 2),
  ('iphone-8-plus', 'Oro', 'Gold', '', '#FEEDD8', 3),
  ('iphone-8-plus', '(PRODUCT)RED', '(PRODUCT)RED', '', '#BA0C2E', 4),
  ('iphone-x', 'Gris espacial', 'Space Gray', '', '#535150', 1),
  ('iphone-x', 'Plata', 'Silver', '', '#EBEBE3', 2),
  ('iphone-xs', 'Oro', 'Gold', '', '#FEEDD8', 1),
  ('iphone-xs', 'Gris espacial', 'Space Gray', '', '#535150', 2),
  ('iphone-xs', 'Plata', 'Silver', '', '#EBEBE3', 3),
  ('iphone-xs-max', 'Oro', 'Gold', '', '#FEEDD8', 1),
  ('iphone-xs-max', 'Gris espacial', 'Space Gray', '', '#535150', 2),
  ('iphone-xs-max', 'Plata', 'Silver', '', '#EBEBE3', 3),
  ('iphone-xr', 'Negro', 'Black', '', '#1F2020', 1),
  ('iphone-xr', 'Blanco', 'White', '', '#F9F6EF', 2),
  ('iphone-xr', 'Azul', 'Blue', '', '#5EB0E5', 3),
  ('iphone-xr', 'Amarillo', 'Yellow', '', '#FFE681', 4),
  ('iphone-xr', 'Coral', 'Coral', '', '#EE7762', 5),
  ('iphone-xr', '(PRODUCT)RED', '(PRODUCT)RED', '', '#BA0C2E', 6),
  ('iphone-11', 'Negro', 'Black', '', '#1F2020', 1),
  ('iphone-11', 'Verde', 'Green', '', '#AEE1CD', 2),
  ('iphone-11', 'Amarillo', 'Yellow', '', '#FFE681', 3),
  ('iphone-11', 'Morado', 'Purple', '', '#B8AFE6', 4),
  ('iphone-11', '(PRODUCT)RED', '(PRODUCT)RED', '', '#BA0C2E', 5),
  ('iphone-11', 'Blanco', 'White', '', '#F9F6EF', 6),
  ('iphone-11-pro', 'Gris espacial', 'Space Gray', '', '#535150', 1),
  ('iphone-11-pro', 'Plata', 'Silver', '', '#EBEBE3', 2),
  ('iphone-11-pro', 'Verde noche', 'Midnight Green', '', '#4E5851', 3),
  ('iphone-11-pro', 'Oro', 'Gold', '', '#FAD7BD', 4),
  ('iphone-11-pro-max', 'Gris espacial', 'Space Gray', '', '#535150', 1),
  ('iphone-11-pro-max', 'Plata', 'Silver', '', '#EBEBE3', 2),
  ('iphone-11-pro-max', 'Verde noche', 'Midnight Green', '', '#4E5851', 3),
  ('iphone-11-pro-max', 'Oro', 'Gold', '', '#FAD7BD', 4),
  ('iphone-se-2', 'Blanco', 'White', '', '#F9F6EF', 1),
  ('iphone-se-2', 'Negro', 'Black', '', '#1F2020', 2),
  ('iphone-se-2', '(PRODUCT)RED', '(PRODUCT)RED', '', '#BA0C2E', 3),
  ('iphone-12-mini', 'Negro', 'Black', '', '#201D24', 1),
  ('iphone-12-mini', 'Blanco', 'White', '', '#FBF7F4', 2),
  ('iphone-12-mini', '(PRODUCT)RED', '(PRODUCT)RED', '', '#E23636', 3),
  ('iphone-12-mini', 'Verde', 'Green', '', '#E1F8DC', 4),
  ('iphone-12-mini', 'Azul', 'Blue', '', '#043458', 5),
  ('iphone-12-mini', 'Morado', 'Purple', '', '#B8AFE6', 6),
  ('iphone-12', 'Negro', 'Black', '', '#201D24', 1),
  ('iphone-12', 'Blanco', 'White', '', '#FBF7F4', 2),
  ('iphone-12', '(PRODUCT)RED', '(PRODUCT)RED', '', '#E23636', 3),
  ('iphone-12', 'Verde', 'Green', '', '#E1F8DC', 4),
  ('iphone-12', 'Azul', 'Blue', '', '#043458', 5),
  ('iphone-12', 'Morado', 'Purple', '', '#B8AFE6', 6),
  ('iphone-12-pro', 'Grafito', 'Graphite', '', '#4C4A46', 1),
  ('iphone-12-pro', 'Plata', 'Silver', '', '#F1F2ED', 2),
  ('iphone-12-pro', 'Oro', 'Gold', '', '#FEEDD8', 3),
  ('iphone-12-pro', 'Azul pacífico', 'Pacific Blue', '', '#2E4755', 4),
  ('iphone-12-pro-max', 'Grafito', 'Graphite', '', '#4C4A46', 1),
  ('iphone-12-pro-max', 'Plata', 'Silver', '', '#F1F2ED', 2),
  ('iphone-12-pro-max', 'Oro', 'Gold', '', '#FEEDD8', 3),
  ('iphone-12-pro-max', 'Azul pacífico', 'Pacific Blue', '', '#2E4755', 4),
  ('iphone-13-mini', 'Blanco estelar', 'Starlight', '', '#F9F3EE', 1),
  ('iphone-13-mini', 'Medianoche', 'Midnight', '', '#171E27', 2),
  ('iphone-13-mini', 'Azul', 'Blue', '', '#215E7C', 3),
  ('iphone-13-mini', 'Rosa', 'Pink', '', '#FAE0D8', 4),
  ('iphone-13-mini', '(PRODUCT)RED', '(PRODUCT)RED', '', '#A50011', 5),
  ('iphone-13-mini', 'Verde', 'Green', '', '#364935', 6),
  ('iphone-13', 'Blanco estelar', 'Starlight', '', '#F9F3EE', 1),
  ('iphone-13', 'Medianoche', 'Midnight', '', '#171E27', 2),
  ('iphone-13', 'Azul', 'Blue', '', '#215E7C', 3),
  ('iphone-13', 'Rosa', 'Pink', '', '#FAE0D8', 4),
  ('iphone-13', '(PRODUCT)RED', '(PRODUCT)RED', '', '#A50011', 5),
  ('iphone-13', 'Verde', 'Green', '', '#364935', 6),
  ('iphone-13-pro', 'Grafito', 'Graphite', '', '#5C5B57', 1),
  ('iphone-13-pro', 'Oro', 'Gold', '', '#F9E5C9', 2),
  ('iphone-13-pro', 'Plata', 'Silver', '', '#F5F5F0', 3),
  ('iphone-13-pro', 'Azul sierra', 'Sierra Blue', '', '#9BB5CE', 4),
  ('iphone-13-pro', 'Verde alpino', 'Alpine Green', '', '#505F4E', 5),
  ('iphone-13-pro-max', 'Grafito', 'Graphite', '', '#5C5B57', 1),
  ('iphone-13-pro-max', 'Oro', 'Gold', '', '#F9E5C9', 2),
  ('iphone-13-pro-max', 'Plata', 'Silver', '', '#F5F5F0', 3),
  ('iphone-13-pro-max', 'Azul sierra', 'Sierra Blue', '', '#9BB5CE', 4),
  ('iphone-13-pro-max', 'Verde alpino', 'Alpine Green', '', '#505F4E', 5),
  ('iphone-se-3', 'Medianoche', 'Midnight', '', '#171E27', 1),
  ('iphone-se-3', 'Blanco estelar', 'Starlight', '', '#F9F3EE', 2),
  ('iphone-se-3', '(PRODUCT)RED', '(PRODUCT)RED', '', '#A50011', 3),
  ('iphone-14', 'Medianoche', 'Midnight', '', '#232A31', 1),
  ('iphone-14', 'Blanco estelar', 'Starlight', '', '#F2EDE4', 2),
  ('iphone-14', 'Azul', 'Blue', '', '#4A7CA8', 3),
  ('iphone-14', 'Morado', 'Purple', '', '#B7A6D6', 4),
  ('iphone-14', '(PRODUCT)RED', '(PRODUCT)RED', '', '#BA0C2F', 5),
  ('iphone-14', 'Amarillo', 'Yellow', '', '#F6E27A', 6),
  ('iphone-14-plus', 'Medianoche', 'Midnight', '', '#232A31', 1),
  ('iphone-14-plus', 'Blanco estelar', 'Starlight', '', '#F2EDE4', 2),
  ('iphone-14-plus', 'Azul', 'Blue', '', '#4A7CA8', 3),
  ('iphone-14-plus', 'Morado', 'Purple', '', '#B7A6D6', 4),
  ('iphone-14-plus', '(PRODUCT)RED', '(PRODUCT)RED', '', '#BA0C2F', 5),
  ('iphone-14-plus', 'Amarillo', 'Yellow', '', '#F6E27A', 6),
  ('iphone-14-pro', 'Negro espacial', 'Space Black', '', '#333333', 1),
  ('iphone-14-pro', 'Plata', 'Silver', '', '#E3E4E6', 2),
  ('iphone-14-pro', 'Oro', 'Gold', '', '#F2DCC5', 3),
  ('iphone-14-pro', 'Morado oscuro', 'Deep Purple', '', '#594F63', 4),
  ('iphone-14-pro-max', 'Negro espacial', 'Space Black', '', '#333333', 1),
  ('iphone-14-pro-max', 'Plata', 'Silver', '', '#E3E4E6', 2),
  ('iphone-14-pro-max', 'Oro', 'Gold', '', '#F2DCC5', 3),
  ('iphone-14-pro-max', 'Morado oscuro', 'Deep Purple', '', '#594F63', 4),
  ('iphone-15', 'Negro', 'Black', '', '#2C2D30', 1),
  ('iphone-15', 'Azul', 'Blue', '', '#4A7CA8', 2),
  ('iphone-15', 'Verde', 'Green', '', '#A7C8A1', 3),
  ('iphone-15', 'Amarillo', 'Yellow', '', '#F6E27A', 4),
  ('iphone-15', 'Rosa', 'Pink', '', '#EEA7B7', 5),
  ('iphone-15-plus', 'Negro', 'Black', '', '#2C2D30', 1),
  ('iphone-15-plus', 'Azul', 'Blue', '', '#4A7CA8', 2),
  ('iphone-15-plus', 'Verde', 'Green', '', '#A7C8A1', 3),
  ('iphone-15-plus', 'Amarillo', 'Yellow', '', '#F6E27A', 4),
  ('iphone-15-plus', 'Rosa', 'Pink', '', '#EEA7B7', 5),
  ('iphone-15-pro', 'Titanio negro', 'Black Titanium', '', '#3C3C3D', 1),
  ('iphone-15-pro', 'Titanio blanco', 'White Titanium', '', '#F2F1EC', 2),
  ('iphone-15-pro', 'Titanio azul', 'Blue Titanium', '', '#3F4A58', 3),
  ('iphone-15-pro', 'Titanio natural', 'Natural Titanium', '', '#BAB4A9', 4),
  ('iphone-15-pro-max', 'Titanio negro', 'Black Titanium', '', '#3C3C3D', 1),
  ('iphone-15-pro-max', 'Titanio blanco', 'White Titanium', '', '#F2F1EC', 2),
  ('iphone-15-pro-max', 'Titanio azul', 'Blue Titanium', '', '#3F4A58', 3),
  ('iphone-15-pro-max', 'Titanio natural', 'Natural Titanium', '', '#BAB4A9', 4),
  ('iphone-16', 'Negro', 'Black', '#2C2D30', '', 1),
  ('iphone-16', 'Blanco', 'White', '#F5F6F8', '', 2),
  ('iphone-16', 'Rosa', 'Pink', '#EEA7B7', '', 3),
  ('iphone-16', 'Verde azulado', 'Teal', '#87B4A8', '', 4),
  ('iphone-16', 'Ultramarino', 'Ultramarine', '#546CA3', '', 5),
  ('iphone-16-plus', 'Negro', 'Black', '#2C2D30', '', 1),
  ('iphone-16-plus', 'Blanco', 'White', '#F5F6F8', '', 2),
  ('iphone-16-plus', 'Rosa', 'Pink', '#EEA7B7', '', 3),
  ('iphone-16-plus', 'Verde azulado', 'Teal', '#87B4A8', '', 4),
  ('iphone-16-plus', 'Ultramarino', 'Ultramarine', '#546CA3', '', 5),
  ('iphone-16-pro', 'Titanio negro', 'Black Titanium', '', '#3C3C3D', 1),
  ('iphone-16-pro', 'Titanio blanco', 'White Titanium', '', '#F2F1EC', 2),
  ('iphone-16-pro', 'Titanio natural', 'Natural Titanium', '', '#BAB4A9', 3),
  ('iphone-16-pro', 'Titanio del desierto', 'Desert Titanium', '', '#BFA48F', 4),
  ('iphone-16-pro-max', 'Titanio negro', 'Black Titanium', '', '#3C3C3D', 1),
  ('iphone-16-pro-max', 'Titanio blanco', 'White Titanium', '', '#F2F1EC', 2),
  ('iphone-16-pro-max', 'Titanio natural', 'Natural Titanium', '', '#BAB4A9', 3),
  ('iphone-16-pro-max', 'Titanio del desierto', 'Desert Titanium', '', '#BFA48F', 4),
  ('iphone-16e', 'Negro', 'Black', '#2C2D30', '', 1),
  ('iphone-16e', 'Blanco', 'White', '#F5F6F8', '', 2),
  ('iphone-17', 'Lavanda', 'Lavender', '#C6BFE6', '', 1),
  ('iphone-17', 'Salvia', 'Sage', '#9BADA1', '', 2),
  ('iphone-17', 'Azul neblina', 'Mist Blue', '#90A5BB', '', 3),
  ('iphone-17', 'Blanco', 'White', '#F5F6F8', '', 4),
  ('iphone-17', 'Negro', 'Black', '#2C2D30', '', 5),
  ('iphone-air', 'Azul cielo', 'Sky Blue', '#A1C6DB', '', 1),
  ('iphone-air', 'Oro claro', 'Light Gold', '#EBD5A9', '', 2),
  ('iphone-air', 'Blanco nube', 'Cloud White', '#F4F5F0', '', 3),
  ('iphone-air', 'Negro espacial', 'Space Black', '#333333', '', 4),
  ('iphone-17-pro', 'Plata', 'Silver', '', '#E3E4E6', 1),
  ('iphone-17-pro', 'Naranja cósmico', 'Cosmic Orange', '', '#E2722F', 2),
  ('iphone-17-pro', 'Azul profundo', 'Deep Blue', '', '#2F3B55', 3),
  ('iphone-17-pro-max', 'Plata', 'Silver', '', '#E3E4E6', 1),
  ('iphone-17-pro-max', 'Naranja cósmico', 'Cosmic Orange', '', '#E2722F', 2),
  ('iphone-17-pro-max', 'Azul profundo', 'Deep Blue', '', '#2F3B55', 3),
  ('iphone-17e', 'Negro', 'Black', '#2C2D30', '', 1),
  ('iphone-17e', 'Blanco', 'White', '#F5F6F8', '', 2),
  ('iphone-17e', 'Rosa pálido', 'Soft Pink', '#EBCBD2', '', 3),
  ('iphone-18-pro', 'Negro', 'Black', '#1C1C1E', '', 1),
  ('iphone-18-pro', 'Borgoña', 'Burgundy', '#632432', '', 2),
  ('iphone-18-pro', 'Glaciar', 'Glacier', '#B9C6D2', '', 3),
  ('iphone-18-pro', 'Plata', 'Silver', '#E3E4E6', '', 4),
  ('iphone-18-pro-max', 'Negro', 'Black', '#1C1C1E', '', 1),
  ('iphone-18-pro-max', 'Borgoña', 'Burgundy', '#632432', '', 2),
  ('iphone-18-pro-max', 'Glaciar', 'Glacier', '#B9C6D2', '', 3),
  ('iphone-18-pro-max', 'Plata', 'Silver', '#E3E4E6', '', 4),
  ('iphone-duo', 'Cielo nocturno', 'Night Sky', '', '#2B3240', 1),
  ('iphone-duo', 'Blanco estrella', 'Star White', '', '#F2F0EB', 2);

-- 3a. El cliente no ve un cambio: si el color de un equipo no tenía nombre en
-- inglés y ahora lo tiene, el sitio mostraba el nombre en español; queda como
-- nombre a mostrar del equipo (lo mismo que hizo 0008).
update public.equipos e set color_nombre_mostrar = c.nombre_es
from public.colores c, public.modelos m, colores_0028 o
where e.color_id = c.id and m.id = c.modelo_id and o.slug = m.slug and o.nombre_es = c.nombre_es
  and c.oficial and c.nombre_en = '' and o.nombre_en <> '' and e.color_nombre_mostrar = '';

-- 3b. Los que ya existen (oficiales o de la tienda con el mismo nombre).
update public.colores c set
  oficial = true,
  nombre_en = o.nombre_en,
  orden = o.orden,
  hex = case when o.hex_fuente <> '' then o.hex_fuente
             when c.hex_aproximado or c.hex = '' then o.hex_aprox
             else c.hex end,
  hex_aproximado = case when o.hex_fuente <> '' then false
                        when c.hex_aproximado or c.hex = '' then o.hex_aprox <> ''
                        else false end,
  hex_de_fuente = o.hex_fuente <> ''
from public.modelos m, colores_0028 o
where m.id = c.modelo_id and m.slug = o.slug and c.nombre_es = o.nombre_es;

-- 4. Los oficiales nuevos.
insert into public.colores (modelo_id, nombre_es, nombre_en, hex, orden, oficial, hex_de_fuente, hex_aproximado)
select m.id, o.nombre_es, o.nombre_en, case when o.hex_fuente <> '' then o.hex_fuente else o.hex_aprox end,
       o.orden, true, o.hex_fuente <> '', o.hex_fuente = '' and o.hex_aprox <> ''
from colores_0028 o join public.modelos m on m.slug = o.slug
where not exists (select 1 from public.colores c where c.modelo_id = m.id and c.nombre_es = o.nombre_es);

-- 5. Los oficiales que ya no están: de la tienda si un equipo los usa; si no, se borran.
update public.colores c set oficial = false, hex_aproximado = false, hex_de_fuente = false
from public.modelos m
where m.id = c.modelo_id and c.oficial
  and not exists (select 1 from colores_0028 o where o.slug = m.slug and o.nombre_es = c.nombre_es)
  and exists (select 1 from public.equipos e where e.color_id = c.id);
delete from public.colores c using public.modelos m
where m.id = c.modelo_id and c.oficial
  and not exists (select 1 from colores_0028 o where o.slug = m.slug and o.nombre_es = c.nombre_es);

drop table colores_0028;
