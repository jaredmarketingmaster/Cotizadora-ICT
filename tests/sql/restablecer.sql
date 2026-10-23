-- Pruebas de restablecer_fabrica() (0036). Las corre tests/sql/probar.sh
-- después de pruebas.sql, sobre la base con los datos que dejaron los
-- antes_*.sql y las pruebas. Después, probar.sh compara la base restablecida
-- con una instalación nueva (tests/sql/fabrica.mjs comparar).
\set ON_ERROR_STOP on

-- Datos de una tienda en uso: marca, legales publicados, inventario propio,
-- una reseña, un modelo activado y una ficha cambiada.
-- (Legales publicados sin pasar por el asistente: sin el disparador que lo valida.)
alter table public.tienda disable trigger tienda_publicar_legales;
update public.tienda set nombre = 'Tienda real', color_primario = '#112233', vista_equipos = 'carrusel',
  logo = 'logo-1.webp', meta_pixel_id = '123456', modo_demo = false,
  legal_publicado = '{"version": 3}'::jsonb;
alter table public.tienda enable trigger tienda_publicar_legales;
update public.modelos set activo = true where slug = 'iphone-7';
update public.fichas set descripcion = 'Descripción de la tienda' where modelo_id = (select id from public.modelos where slug = 'iphone-7');
delete from public.equipos where es_demo;
insert into public.equipos (modelo_id, condicion, capacidad, color_id, precio, publicado, fotos)
select m.id, 'nuevo', '128 GB', c.id, 2500000, true, array['equipos/propio.webp']
from public.modelos m join public.colores c on c.modelo_id = m.id where m.slug = 'iphone-7' order by c.orden limit 1;
insert into public.resenas (tipo, ruta, autorizado, autorizacion_canal, autorizacion_fecha, autorizacion_alcance)
values ('imagen', 'resenas/una.webp', true, 'whatsapp', current_date, 'sitio');
create temp table perfiles_antes as select * from public.perfiles;
grant select on perfiles_antes to authenticated, anon;

-- Sin sesión, con el gestor o con un administrador inactivo: no.
set role anon;
set request.jwt.claim.sub = '';
do $$ begin
  perform public.restablecer_fabrica();
  raise exception 'el público no debería poder restablecer';
exception when insufficient_privilege then null; end $$;
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  perform public.restablecer_fabrica();
  raise exception 'el gestor no debería poder restablecer';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.datos_fabrica();
  raise exception 'datos_fabrica() es interna';
exception when insufficient_privilege then null; end $$;
reset role;
do $$ begin
  assert (select nombre from public.tienda) = 'Tienda real', 'sin permiso no se borra nada';
  assert (select count(*) from public.resenas) = 1, 'sin permiso la reseña sigue';
end $$;

-- El administrador: queda como nuevo y los usuarios no cambian.
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin perform public.restablecer_fabrica(); end $$;
do $$ begin
  assert current_setting('request.jwt.claim.sub') = '00000000-0000-0000-0000-00000000000a', 'la sesión sigue igual después';
  assert public.es_administrador(), 'el administrador sigue siéndolo';
end $$;
reset role;
do $$ begin
  assert (select count(*) from public.perfiles) = (select count(*) from perfiles_antes)
     and not exists (select * from public.perfiles except select * from perfiles_antes), 'los usuarios no se tocan';
  assert (select nombre = 'Tienda de demostración' and modo_demo and legal_publicado is null and logo = '' and meta_pixel_id = ''
          and precios_actualizados_en is not null from public.tienda), 'la tienda como nueva';
  assert (select count(*) from public.equipos) = 6 and (select bool_and(es_demo) from public.equipos), 'solo los 6 equipos de demostración';
  assert (select count(*) from public.resenas) = 0, 'sin reseñas';
  -- Las secuencias siguen desde el mayor: un modelo nuevo no choca.
  insert into public.modelos (nombre, slug, generacion, orden) values ('Prueba', 'prueba-fabrica', 'x', 999);
  delete from public.modelos where slug = 'prueba-fabrica';
end $$;
drop table perfiles_antes;

\echo 'OK: restablecer_fabrica'
