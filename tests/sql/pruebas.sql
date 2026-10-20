-- Pruebas de las migraciones y de la seguridad a nivel de fila.
-- Las corre tests/sql/probar.sh sobre un Postgres local. Cada bloque falla con
-- una excepción si algo no se cumple.
\set ON_ERROR_STOP on

-- Usuarios de prueba
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'agencia@prueba.co'),
  ('00000000-0000-0000-0000-00000000000b', 'tienda@prueba.co'),
  ('00000000-0000-0000-0000-00000000000c', 'inactivo@prueba.co'),
  ('00000000-0000-0000-0000-00000000000d', 'sinperfil@prueba.co');
insert into public.perfiles (user_id, correo, rol, activo) values
  ('00000000-0000-0000-0000-00000000000a', 'agencia@prueba.co', 'agencia', true),
  ('00000000-0000-0000-0000-00000000000b', 'tienda@prueba.co', 'tienda', true),
  ('00000000-0000-0000-0000-00000000000c', 'inactivo@prueba.co', 'tienda', false);

-- 0. Migración 0004: stock > 0 pasó a en_stock verdadero y 0 a falso
-- (datos de tests/sql/antes_0004_en_stock.sql).
do $$
begin
  assert (select en_stock from public.equipos where capacidad = 'MIGRACION' and color_nombre = 'Stock 4'), 'stock 4 → con stock';
  assert not (select en_stock from public.equipos where capacidad = 'MIGRACION' and color_nombre = 'Stock 0'), 'stock 0 → sin stock';
  assert (select count(*) from public.equipos where es_demo and not en_stock) = 0, 'los demo quedan con stock';
  assert not exists (select 1 from information_schema.columns where table_name = 'equipos' and column_name = 'stock'), 'ya no hay columna stock';
  delete from public.equipos where capacidad = 'MIGRACION';
end $$;

-- Un equipo no publicado, uno sin stock y uno de un modelo inactivo.
insert into public.equipos (modelo_id, condicion, capacidad, color_nombre, precio, en_stock, publicado)
select id, 'nuevo', '128 GB', 'Borrador', 1000000, true, false from public.modelos where slug = 'iphone-18-pro';
insert into public.equipos (modelo_id, condicion, capacidad, color_nombre, precio, en_stock, publicado)
select id, 'nuevo', '128 GB', 'Agotado', 1000000, false, true from public.modelos where slug = 'iphone-18-pro';
insert into public.equipos (modelo_id, condicion, capacidad, color_nombre, precio, en_stock, publicado)
select id, 'nuevo', '128 GB', 'Inactivo', 1000000, true, true from public.modelos where slug = 'iphone-16';

-- 1. Catálogo y semilla
do $$
begin
  assert (select count(*) from public.modelos) = 32, 'deben ser 32 modelos';
  assert (select count(*) from public.fichas) = 32, 'cada modelo con su ficha';
  assert (select count(*) from public.fichas where descripcion <> '' or especificaciones <> '[]') = 0, 'fichas vacías';
  assert (select count(*) from public.modelos where activo and not activo_por_demo) = 0, 'solo activos por demo';
  assert (select count(*) from public.equipos where es_demo) = 6, '6 equipos demo';
  assert (select string_agg(nombre, '|' order by orden) from public.modelos where generacion = '17')
    = 'iPhone 17e|iPhone 17|iPhone Air|iPhone 17 Pro|iPhone 17 Pro Max', 'generación 17';
  assert (select generacion from public.modelos where slug = 'iphone-duo') = 'Plegable', 'Duo plegable';
  assert (select precios_actualizados_en from public.tienda) is not null, 'fecha de precios';
end $$;

-- 2. Público (anon)
set role anon;
set request.jwt.claim.sub = '';
do $$
declare n int;
begin
  select count(*) into n from public.equipos;
  assert n = 6, format('anon ve 6 equipos (publicados, con stock y de modelo activo), vio %s', n);
  assert (select count(*) from public.modelos) = 4, 'anon ve solo modelos activos';
  assert (select count(*) from public.fichas) = 4, 'anon ve solo fichas de modelos activos';
  assert jsonb_array_length(public.datos_publicos() -> 'equipos') = 6, 'datos_publicos equipos';
  assert jsonb_array_length(public.datos_publicos() -> 'modelos') = 4, 'datos_publicos modelos';
end $$;
do $$ begin
  perform count(*) from public.perfiles;
  raise exception 'anon no debería poder leer perfiles';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.tienda set nombre = 'hackeo';
  raise exception 'anon no debería poder editar la tienda';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.equipos (modelo_id, condicion, capacidad, precio) values (1, 'nuevo', '1 TB', 1);
  raise exception 'anon no debería insertar equipos';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into storage.objects (bucket_id, name) values ('fotos', 'x.webp');
  raise exception 'anon no debería subir archivos';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.borrar_datos_demo();
  raise exception 'anon no debería borrar demo';
exception when insufficient_privilege then null; end $$;
reset role;

-- 3. Usuario sin perfil y usuario inactivo: igual que el público
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000d';
do $$ begin
  assert (select count(*) from public.equipos) = 6, 'sin perfil ve como público';
  update public.tienda set nombre = 'x';
  assert (select nombre from public.tienda) = 'Tienda de demostración', 'sin perfil no edita';
end $$;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000c';
do $$ begin
  assert (select count(*) from public.equipos) = 6, 'inactivo ve como público';
  update public.equipos set precio = 1;
  assert (select count(*) from public.equipos where precio = 1) = 0, 'inactivo no edita';
end $$;

-- 4. Rol tienda
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$
declare antes timestamptz; despues timestamptz;
begin
  assert (select count(*) from public.equipos) = 9, 'tienda ve todo el inventario';
  assert (select count(*) from public.modelos) = 32, 'tienda ve todo el catálogo';
  assert (select count(*) from public.perfiles) = 1, 'tienda ve solo su perfil';

  update public.tienda set nombre = 'Mi tienda', whatsapp = '573001234567';
  assert (select nombre from public.tienda) = 'Mi tienda', 'tienda edita su información';

  -- Cambiar un precio actualiza la fecha del pie
  select precios_actualizados_en into antes from public.tienda;
  perform pg_sleep(0.01);
  update public.equipos set precio = precio + 1 where color_nombre = 'Negro';
  select precios_actualizados_en into despues from public.tienda;
  assert despues > antes, 'cambiar precio actualiza la fecha';
  -- Cambiar el stock no la toca
  update public.equipos set en_stock = not en_stock where color_nombre = 'Negro';
  update public.equipos set en_stock = not en_stock where color_nombre = 'Negro';
  assert (select precios_actualizados_en from public.tienda) = despues, 'stock no toca la fecha';

  -- Activar modelos sí; renombrar no
  update public.modelos set activo = true where slug = 'iphone-16';
  assert (select activo from public.modelos where slug = 'iphone-16'), 'tienda activa modelos';
  update public.modelos set activo = false where slug = 'iphone-18-pro';
  update public.modelos set activo = true where slug = 'iphone-18-pro';
  assert not (select activo_por_demo from public.modelos where slug = 'iphone-18-pro'), 'tocar un modelo lo saca de demo';

  update public.fichas set descripcion = 'Prueba' where modelo_id = (select id from public.modelos where slug = 'iphone-16');
  assert (select descripcion from public.fichas f join public.modelos m on m.id = f.modelo_id where m.slug = 'iphone-16') = 'Prueba', 'tienda edita fichas';
end $$;
do $$ begin
  update public.modelos set nombre = 'iPhone X' where slug = 'iphone-16';
  raise exception 'tienda no debería renombrar';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.modelos (nombre, slug, generacion, orden) values ('iPhone 19', 'iphone-19', '19', 999);
  raise exception 'tienda no debería agregar modelos';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.tienda set modo_demo = false;
  raise exception 'tienda no debería apagar el modo demo';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.borrar_datos_demo();
  raise exception 'tienda no debería borrar demo';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.perfiles set rol = 'agencia';
  assert (select rol from public.perfiles) = 'tienda', 'tienda no se sube de rol';
end $$;
do $$ begin
  insert into storage.objects (bucket_id, name) values ('fotos', 'equipo/1.webp');
  assert (select count(*) from storage.objects) = 1, 'tienda sube fotos';
end $$;
do $$ begin
  insert into public.equipos (modelo_id, condicion, capacidad, precio, en_stock)
  values ((select id from public.modelos where slug = 'iphone-13'), 'usado', '64 GB', 100, null);
  raise exception 'el stock no puede quedar vacío';
exception when not_null_violation then null; end $$;
do $$ begin
  insert into public.equipos (modelo_id, condicion, capacidad, precio, bateria_porcentaje)
  values ((select id from public.modelos where slug = 'iphone-13'), 'usado', '64 GB', 100, 101);
  raise exception 'batería 101 no vale';
exception when check_violation then null; end $$;
do $$ begin
  insert into public.equipos (modelo_id, condicion, capacidad, precio) values ((select id from public.modelos where slug = 'iphone-13'), 'nuevo', '64 GB', 0);
  raise exception 'precio 0 no vale';
exception when check_violation then null; end $$;
do $$ begin
  assert (select tamano_texto from public.tienda) = 'normal', 'tamaño del texto normal por defecto';
  update public.tienda set tamano_texto = 'grande';
  assert (select tamano_texto from public.tienda) = 'grande', 'tienda elige el tamaño del texto';
  update public.tienda set tamano_texto = 'normal';
end $$;
do $$ begin
  update public.tienda set tamano_texto = 'enorme';
  raise exception 'tamaño de texto fuera de la lista no vale';
exception when check_violation then null; end $$;
do $$ begin
  update public.tienda set whatsapp = '3001234567';
  raise exception 'whatsapp sin 57 no vale';
exception when check_violation then null; end $$;
do $$ begin
  update public.tienda set color_primario = 'azul';
  raise exception 'color no hex no vale';
exception when check_violation then null; end $$;

-- 5. Rol agencia
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.perfiles) = 3, 'agencia ve todos los perfiles';
  update public.modelos set nombre = 'iPhone 16 (renombrado)' where slug = 'iphone-16';
  assert (select nombre from public.modelos where slug = 'iphone-16') = 'iPhone 16 (renombrado)', 'agencia renombra';
  insert into public.modelos (nombre, slug, generacion, orden) values ('iPhone 19', 'iphone-19', '19', 999);
  assert (select count(*) from public.fichas f join public.modelos m on m.id = f.modelo_id where m.slug = 'iphone-19') = 1, 'modelo nuevo con ficha';
  update public.perfiles set activo = false where correo = 'tienda@prueba.co';
  assert not (select activo from public.perfiles where correo = 'tienda@prueba.co'), 'agencia desactiva';
end $$;
do $$ begin
  update public.perfiles set activo = false where correo = 'agencia@prueba.co';
  raise exception 'la agencia no debería poder desactivarse a sí misma';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.borrar_datos_demo();
  assert (select count(*) from public.equipos where es_demo) = 0, 'demo borrado';
  assert not (select modo_demo from public.tienda), 'modo demo apagado';
  -- iphone-18-pro-max, iphone-15-pro, iphone-13 vuelven a inactivos; iphone-18-pro lo tocó la tienda y queda activo
  assert (select string_agg(slug, ',' order by orden) from public.modelos where activo) = 'iphone-16,iphone-18-pro', 'modelos de demo apagados';
end $$;
reset role;

-- 6. Público después de borrar demo: nada de demo
set role anon;
set request.jwt.claim.sub = '';
do $$ begin
  assert (select count(*) from public.equipos where es_demo) = 0, 'sin demo para el público';
  assert (select count(*) from public.equipos) = 1, 'queda solo el equipo del iPhone 16, ya activo';
  assert not ((public.datos_publicos() -> 'tienda' ->> 'modo_demo')::boolean), 'tienda sin modo demo';
end $$;
reset role;

\echo 'OK: todas las pruebas SQL pasaron'
