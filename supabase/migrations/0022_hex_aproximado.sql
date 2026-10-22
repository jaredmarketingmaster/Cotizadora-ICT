-- =============================================================================
-- 0022: hexadecimal aproximado para los colores sin hexadecimal (ronda 3, C1).
--   colores.hex_aproximado: el hexadecimal no es de la fuente; lo puso esta
--   migración, por nombre, para pintar la muestra. No cambia los de la fuente
--   (hex_de_fuente) ni los nombres. Donde otro modelo trae en la fuente el
--   hexadecimal del mismo nombre, se usa ese (Negro, Blanco, Rosa, Plata, Negro
--   espacial). iPhone 17 Pro y 17 Pro Max siguen sin colores.
--   El gestor los puede cambiar en Catálogo; al cambiarlo deja de ser
--   aproximado (es el de la tienda). La misma lista está en
--   assets/js/datos/semilla.js (HEX_APROXIMADOS) y en catalogo/FALTANTES.md.
-- =============================================================================

alter table public.colores add column hex_aproximado boolean not null default false;

update public.colores c set hex = v.hex, hex_aproximado = true
from (values
  ('Negro brillante', '#0B0B0C'),
  ('Negro', '#2C2D30'),
  ('Plata', '#E3E4E6'),
  ('Oro', '#F2DCC5'),
  ('Oro rosa', '#E8C1B5'),
  ('(PRODUCT)RED', '#BA0C2F'),
  ('Gris espacial', '#5C5E62'),
  ('Blanco', '#F5F6F8'),
  ('Azul', '#4A7CA8'),
  ('Amarillo', '#F6E27A'),
  ('Coral', '#FF6E5A'),
  ('Verde', '#A7C8A1'),
  ('Morado', '#C9B8E0'),
  ('Verde noche', '#4E5851'),
  ('Púrpura', '#B7A6D6'),
  ('Grafito', '#52514F'),
  ('Azul pacífico', '#2E4A5E'),
  ('Blanco estelar', '#F2EDE4'),
  ('Medianoche', '#232A31'),
  ('Rosa', '#EEA7B7'),
  ('Azul sierra', '#9BB5CE'),
  ('Verde alpino', '#576856'),
  ('Negro espacial', '#333333'),
  ('Morado oscuro', '#594F63'),
  ('Titanio negro', '#3C3C3D'),
  ('Titanio blanco', '#F2F1EC'),
  ('Titanio azul', '#3F4A58'),
  ('Titanio natural', '#BAB4A9'),
  ('Titanio del desierto', '#BFA48F'),
  ('Visón', '#8B7B6E'),
  ('Oliva', '#6B6E4E'),
  ('Azul nítido', '#3A6FD8'),
  ('Magenta', '#B0306A'),
  ('Titanio', '#BAB4A9')
) as v (nombre_es, hex)
where c.oficial and c.hex = '' and not c.hex_de_fuente and c.nombre_es = v.nombre_es;

-- proteger_color(): igual que en 0006, y además hex_aproximado no lo cambia el
-- panel: un color nuevo no es aproximado y, si se cambia el hexadecimal, deja de serlo.
create or replace function public.proteger_color()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    return case when tg_op = 'DELETE' then old else new end;
  end if;
  if tg_op = 'INSERT' then
    if new.oficial or new.hex_de_fuente then
      raise exception 'Los colores oficiales vienen de la fuente: no se pueden crear desde el panel.' using errcode = '42501';
    end if;
    if exists (select 1 from public.colores c where c.modelo_id = new.modelo_id and c.oficial) then
      raise exception 'Este modelo tiene colores oficiales: no se le pueden agregar otros.' using errcode = '42501';
    end if;
    new.hex_aproximado := false;
    return new;
  end if;
  if tg_op = 'DELETE' then
    if old.oficial and exists (select 1 from public.modelos m where m.id = old.modelo_id) then
      raise exception 'Un color oficial no se puede borrar.' using errcode = '42501';
    end if;
    return old;
  end if;
  if new.modelo_id is distinct from old.modelo_id or new.oficial is distinct from old.oficial
     or new.hex_de_fuente is distinct from old.hex_de_fuente
     or (old.oficial and (new.nombre_es is distinct from old.nombre_es
                          or new.nombre_en is distinct from old.nombre_en
                          or new.orden is distinct from old.orden)) then
    raise exception 'El nombre de un color oficial no se puede cambiar.' using errcode = '42501';
  end if;
  if old.hex_de_fuente and new.hex is distinct from old.hex then
    raise exception 'El hexadecimal de este color viene de la fuente y no se puede cambiar.' using errcode = '42501';
  end if;
  new.hex_aproximado := old.hex_aproximado and new.hex is not distinct from old.hex;
  return new;
end $$;
