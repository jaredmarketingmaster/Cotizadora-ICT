-- Pruebas de las migraciones y de la seguridad a nivel de fila.
-- Las corre tests/sql/probar.sh sobre un Postgres local. Cada bloque falla con
-- una excepción si algo no se cumple.
\set ON_ERROR_STOP on

-- Los usuarios de prueba los carga antes_0007_roles.sql con los roles viejos:
--   ...0a admin@prueba.co (agencia), ...0b gestor@prueba.co (tienda),
--   ...0c inactivo@prueba.co (tienda, inactivo), ...0d sin perfil.

-- 0c. Migración 0007: agencia → administrador y tienda → gestor.
do $$
begin
  assert (select string_agg(correo || ':' || rol, ',' order by correo) from public.perfiles)
    = 'admin@prueba.co:administrador,gestor@prueba.co:gestor,inactivo@prueba.co:gestor', 'roles convertidos';
  assert not exists (select 1 from pg_proc where proname in ('es_agencia', 'es_staff')), 'funciones viejas borradas';
end $$;

-- 0. Migración 0004: stock > 0 pasó a en_stock verdadero y 0 a falso
-- (datos de tests/sql/antes_0004_en_stock.sql).
do $$
begin
  assert (select en_stock from public.equipos where capacidad = 'MIGRACION' and color_nombre_mostrar = 'Stock 4'), 'stock 4 → con stock';
  assert not (select en_stock from public.equipos where capacidad = 'MIGRACION' and color_nombre_mostrar = 'Stock 0'), 'stock 0 → sin stock';
  -- 0008: estos colores no existen en la fuente: color_id vacío y el nombre se conserva
  assert (select count(*) from public.equipos where capacidad = 'MIGRACION' and color_id is null) = 2, 'colores no encontrados quedan sin color_id';
  assert (select count(*) from public.equipos where es_demo and not en_stock) = 0, 'los demo quedan con stock';
  assert not exists (select 1 from information_schema.columns where table_name = 'equipos' and column_name = 'stock'), 'ya no hay columna stock';
  delete from public.equipos where capacidad = 'MIGRACION';
end $$;

-- 0d. Migración 0008: los equipos demo quedaron con su color oficial; el
-- nombre que veía el cliente se conserva si no es el oficial.
do $$
begin
  assert (select string_agg(m.slug || ':' || c.nombre_es || ':' || e.color_nombre_mostrar, '|' order by m.orden desc, e.precio)
          from public.equipos e join public.modelos m on m.id = e.modelo_id join public.colores c on c.id = e.color_id where e.es_demo)
    = 'iphone-18-pro-max:Negro:|iphone-18-pro-max:Plata:|iphone-18-pro-max:Borgoña:|iphone-18-pro:Glaciar:Glacier|iphone-15-pro:Titanio natural:Titanio natural|iphone-13:Medianoche:Medianoche',
    'colores de los equipos demo';
  assert not exists (select 1 from information_schema.columns where table_name = 'equipos' and column_name in ('color_nombre', 'color_hex')), 'sin color propio en equipos';
end $$;

-- 0e. Migración 0012: fichas precargadas desde la fuente (las compara con
-- semilla.js comparar-semilla.mjs) sin pisar lo que la tienda ya tenía, y las
-- reglas de validar_ficha y de la tienda.
do $$
begin
  assert (select descripcion || '|' || especificaciones::text from public.fichas f join public.modelos m on m.id = f.modelo_id where m.slug = 'iphone-13')
    = 'Descripción de la tienda|[{"valor": "Dato de la tienda", "etiqueta": "Pantalla"}]', 'la ficha de la tienda no se toca';
  assert (select count(*) from public.fichas f join public.modelos m on m.id = f.modelo_id
          where m.slug <> 'iphone-13' and m.slug <> 'iphone-prueba' and jsonb_array_length(f.especificaciones) > 0) = 41, '41 fichas precargadas';
  assert (select f.especificaciones -> 0 ->> 'valor' from public.fichas f join public.modelos m on m.id = f.modelo_id where m.slug = 'iphone-7') = 'Septiembre 2016', 'iPhone 7: lanzamiento';
  assert not exists (select 1 from public.fichas, jsonb_array_elements(especificaciones) x where x ->> 'clave' = 'bateria'), 'la fuente no trae batería';
  assert (select mostrar_ficha and ficha_ocultas = '{}' from public.tienda), 'ficha visible y sin categorías ocultas por defecto';
end $$;
do $$ begin
  update public.fichas set especificaciones = '[{"clave": "color", "etiqueta": "Color", "valor": "x"}]' where modelo_id = (select id from public.modelos where slug = 'iphone-7');
  raise exception 'clave que no es una categoría';
exception when check_violation then null; end $$;
do $$ begin
  update public.fichas set especificaciones = '[{"clave": "pantalla", "etiqueta": "Pantalla", "valor": "a"}, {"clave": "pantalla", "etiqueta": "Pantalla", "valor": "b"}]' where modelo_id = (select id from public.modelos where slug = 'iphone-7');
  raise exception 'clave repetida';
exception when check_violation then null; end $$;
do $$ begin
  update public.fichas set especificaciones = '[{"etiqueta": "Pantalla", "valor": 6}]' where modelo_id = (select id from public.modelos where slug = 'iphone-7');
  raise exception 'valor que no es texto';
exception when check_violation then null; end $$;
do $$ begin
  update public.fichas set especificaciones = jsonb_build_array(jsonb_build_object('etiqueta', 'Pantalla', 'valor', repeat('x', 601))) where modelo_id = (select id from public.modelos where slug = 'iphone-7');
  raise exception 'valor de más de 600';
exception when check_violation then null; end $$;
do $$ begin
  update public.tienda set ficha_ocultas = '{colores}';
  raise exception 'categoría oculta que no existe';
exception when check_violation then null; end $$;
do $$ begin
  -- Válidas: filas de la tienda sin clave (o con clave null) y categorías conocidas
  update public.fichas set especificaciones = especificaciones || '[{"etiqueta": "Desbloqueo", "valor": "Face ID"}, {"clave": null, "etiqueta": "Otra", "valor": "x"}]'::jsonb
    where modelo_id = (select id from public.modelos where slug = 'iphone-16');
  update public.tienda set ficha_ocultas = '{pantalla,otras}', mostrar_ficha = false;
  update public.tienda set ficha_ocultas = '{}', mostrar_ficha = true;
end $$;

-- 0f. Migración 0013: formas_pago pasó a pagos_otras con sus valores, y las
-- reglas de validar_pagos y de los checks.
do $$
begin
  assert (select pagos_otras from public.tienda) = '{Addi,Sistecrédito}', 'la lista vieja pasó a pagos_otras';
  assert not exists (select 1 from information_schema.columns where table_name = 'tienda' and column_name = 'formas_pago'), 'ya no hay formas_pago';
  assert (select not pagos_cuotas and pagos_cuotas_max is null and pagos_medios = '{}' and pagos_pasarelas = '{}' from public.tienda), 'campos nuevos vacíos';
  -- Una configuración completa y válida
  update public.tienda set pagos_medios = '{transferencia,credito}', pagos_cuotas = true, pagos_cuotas_max = 12,
    pagos_sin_interes = true, pagos_sin_interes_max = 6, pagos_cripto = true, pagos_cripto_cuales = 'USDT',
    pagos_pasarelas = '{pse,otra}', pagos_pasarela_otra = 'Addi';
  update public.tienda set pagos_sin_interes_max = 12;  -- igual al máximo: vale
end $$;
do $$
declare
  casos text[][] := array[
    ['pagos_sin_interes_max = 13', 'Las cuotas sin interés no pueden ser más que el máximo de cuotas.'],
    ['pagos_cuotas_max = 49, pagos_sin_interes_max = 6', 'Indique hasta cuántas cuotas acepta: de 2 a 48.'],
    ['pagos_cuotas_max = 1, pagos_sin_interes = false, pagos_sin_interes_max = null', 'Indique hasta cuántas cuotas acepta: de 2 a 48.'],
    ['pagos_cuotas_max = null', 'Indique hasta cuántas cuotas acepta: de 2 a 48.'],
    ['pagos_sin_interes_max = null', 'Indique hasta cuántas cuotas sin interés ofrece: de 2 a 48.'],
    ['pagos_sin_interes = false', 'Sin cuotas sin interés, deje vacío hasta cuántas.'],
    ['pagos_cuotas = false', 'Sin pagos a cuotas, los datos de cuotas quedan vacíos.'],
    ['pagos_cripto = false', 'Sin criptomonedas, deje vacío cuáles.'],
    ['pagos_pasarela_otra = ''''', 'Escriba el nombre de la otra pasarela.'],
    ['pagos_pasarelas = ''{pse}''', 'Sin «Otra» pasarela, deje vacío el nombre.']
  ];
  i int;
begin
  for i in 1 .. array_length(casos, 1) loop
    begin
      execute 'update public.tienda set ' || casos[i][1];
      raise exception 'debió fallar: %', casos[i][1];
    exception when check_violation then
      assert sqlerrm = casos[i][2], format('%s → %s', casos[i][1], sqlerrm);
    end;
  end loop;
end $$;
do $$ begin
  update public.tienda set pagos_medios = '{cheque}';
  raise exception 'medio que no existe';
exception when check_violation then null; end $$;
do $$ begin
  update public.tienda set pagos_pasarelas = '{paypal}', pagos_pasarela_otra = '';
  raise exception 'pasarela que no existe';
exception when check_violation then null; end $$;
do $$ begin
  -- Sin cuotas y todo vacío, otra vez válido
  update public.tienda set pagos_cuotas = false, pagos_cuotas_max = null, pagos_sin_interes = false, pagos_sin_interes_max = null,
    pagos_cripto = false, pagos_cripto_cuales = '', pagos_pasarelas = '{}', pagos_pasarela_otra = '', pagos_medios = '{}';
end $$;

-- Un equipo no publicado, uno sin stock y uno de un modelo inactivo.
insert into public.equipos (modelo_id, condicion, capacidad, color_id, color_nombre_mostrar, precio, en_stock, publicado)
select m.id, 'nuevo', '128 GB', c.id, 'Borrador', 1000000, true, false from public.modelos m join public.colores c on c.modelo_id = m.id and c.nombre_es = 'Visón' where m.slug = 'iphone-18-pro';
insert into public.equipos (modelo_id, condicion, capacidad, color_id, color_nombre_mostrar, precio, en_stock, publicado)
select m.id, 'nuevo', '128 GB', c.id, 'Agotado', 1000000, false, true from public.modelos m join public.colores c on c.modelo_id = m.id and c.nombre_es = 'Oliva' where m.slug = 'iphone-18-pro';
insert into public.equipos (modelo_id, condicion, capacidad, color_id, color_nombre_mostrar, precio, en_stock, publicado)
select m.id, 'nuevo', '128 GB', c.id, 'Inactivo', 1000000, true, true from public.modelos m join public.colores c on c.modelo_id = m.id and c.nombre_es = 'Rosa' where m.slug = 'iphone-16';

-- 0b. Migración 0006: el modelo que agregó la agencia (antes_0006) quedó al
-- final, después del Duo, en el orden que tenía.
do $$
begin
  assert (select orden from public.modelos where slug = 'iphone-prueba') = 10330, 'modelo de la agencia al final';
  assert (select slug from public.modelos order by orden desc limit 1) = 'iphone-prueba', 'después del Duo';
  delete from public.modelos where slug = 'iphone-prueba';
end $$;

-- 1. Catálogo y semilla
do $$
begin
  -- 42 modelos desde el iPhone 7, en orden de lanzamiento
  assert (select count(*) from public.modelos) = 42, 'deben ser 42 modelos';
  assert (select count(*) from public.fichas) = 42, 'cada modelo con su ficha';
  assert (select string_agg(slug, ',' order by orden) from public.modelos where orden <= 80)
    = 'iphone-7,iphone-7-plus,iphone-8,iphone-8-plus,iphone-x,iphone-xs,iphone-xs-max,iphone-xr', 'los primeros, del 7 al XR';
  assert (select count(*) from public.modelos where slug in ('iphone-7','iphone-se-2','iphone-se-3') and not activo) = 3, 'los nuevos, inactivos';
  assert (select generacion from public.modelos where slug = 'iphone-se-2') = '11', 'SE 2 en la generación de su lanzamiento';
  assert (select count(distinct orden) from public.modelos) = 42, 'orden sin repetir';
  -- Colores: 183 oficiales; solo 32 con hexadecimal de la fuente
  assert (select count(*) from public.colores) = 183, '183 colores oficiales';
  assert (select count(*) from public.colores where hex <> '') = 32, '32 con hexadecimal';
  assert (select count(*) from public.colores where hex <> '' and not hex_de_fuente) = 0, 'hex de la fuente marcado';
  assert (select count(*) from public.colores c join public.modelos m on m.id = c.modelo_id where m.slug in ('iphone-17-pro', 'iphone-17-pro-max')) = 0, '17 Pro sin colores en la fuente';
  assert (select string_agg(nombre_es || '/' || nombre_en || '/' || hex, '|' order by c.orden) from public.colores c join public.modelos m on m.id = c.modelo_id where m.slug = 'iphone-17e')
    = 'Negro//#2C2D30|Blanco//#F5F6F8|Rosa pálido/Soft Pink/#EBCBD2', 'colores del 17e tal como la fuente';
  -- Antes de 0012 las fichas nacían vacías; ahora llevan lo que trae la fuente
  -- (ver 0e). La fuente no trae descripciones: la única es la de antes_0012.
  assert (select count(*) from public.fichas where descripcion <> '') = 1, 'sin descripciones de la fuente';
  assert (select count(*) from public.modelos where activo and not activo_por_demo) = 0, 'solo activos por demo';
  assert (select count(*) from public.equipos where es_demo) = 6, '6 equipos demo';
  -- Por fecha de lanzamiento, el 17e (marzo de 2026) va después del 17 Pro Max.
  assert (select string_agg(nombre, '|' order by orden) from public.modelos where generacion = '17')
    = 'iPhone 17|iPhone Air|iPhone 17 Pro|iPhone 17 Pro Max|iPhone 17e', 'generación 17';
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
  -- Colores solo de los 4 modelos activos: 18 Pro Max (8), 18 Pro (8), 15 Pro (4) y 13 (6)
  assert (select count(*) from public.colores) = 26, 'anon ve solo colores de modelos activos';
  assert jsonb_array_length(public.datos_publicos() -> 'colores') = 26, 'datos_publicos colores';
end $$;
do $$ begin
  update public.colores set hex = '#000000' where hex = '';
  raise exception 'anon no debería completar colores';
exception when insufficient_privilege then null; end $$;
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
  insert into storage.objects (bucket_id, name) values ('videos', 'equipos/x.mp4');
  raise exception 'anon no debería subir videos';
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

-- 4. Rol gestor: todo menos los accesos
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$
declare antes timestamptz; despues timestamptz;
begin
  assert (select count(*) from public.equipos) = 9, 'gestor ve todo el inventario';
  assert (select count(*) from public.modelos) = 42, 'gestor ve todo el catálogo';
  assert (select count(*) from public.colores) = 183, 'gestor ve todos los colores';
  assert (select count(*) from public.perfiles) = 1, 'gestor ve solo su perfil';

  update public.tienda set nombre = 'Mi tienda', whatsapp = '573001234567';
  assert (select nombre from public.tienda) = 'Mi tienda', 'gestor edita la tienda';

  -- Cambiar un precio actualiza la fecha del pie
  select precios_actualizados_en into antes from public.tienda;
  perform pg_sleep(0.01);
  update public.equipos set precio = precio + 1 where color_id in (select id from public.colores where nombre_es = 'Negro');
  select precios_actualizados_en into despues from public.tienda;
  assert despues > antes, 'cambiar precio actualiza la fecha';
  -- Cambiar el stock no la toca
  update public.equipos set en_stock = not en_stock where color_id in (select id from public.colores where nombre_es = 'Negro');
  update public.equipos set en_stock = not en_stock where color_id in (select id from public.colores where nombre_es = 'Negro');
  assert (select precios_actualizados_en from public.tienda) = despues, 'stock no toca la fecha';

  -- Catálogo completo: activar, renombrar, reordenar y agregar
  update public.modelos set activo = true where slug = 'iphone-16';
  assert (select activo from public.modelos where slug = 'iphone-16'), 'gestor activa modelos';
  update public.modelos set activo = false where slug = 'iphone-18-pro';
  update public.modelos set activo = true where slug = 'iphone-18-pro';
  assert not (select activo_por_demo from public.modelos where slug = 'iphone-18-pro'), 'tocar un modelo lo saca de demo';
  update public.modelos set nombre = 'iPhone 16 (renombrado)' where slug = 'iphone-16';
  assert (select nombre from public.modelos where slug = 'iphone-16') = 'iPhone 16 (renombrado)', 'gestor renombra';
  insert into public.modelos (nombre, slug, generacion, orden) values ('iPhone 19', 'iphone-19', '19', 999);
  assert (select count(*) from public.fichas f join public.modelos m on m.id = f.modelo_id where m.slug = 'iphone-19') = 1, 'modelo nuevo con ficha';

  update public.fichas set descripcion = 'Prueba' where modelo_id = (select id from public.modelos where slug = 'iphone-16');
  assert (select descripcion from public.fichas f join public.modelos m on m.id = f.modelo_id where m.slug = 'iphone-16') = 'Prueba', 'gestor edita fichas';

  -- Modo demo
  update public.tienda set modo_demo = false;
  update public.tienda set modo_demo = true;
  assert (select modo_demo from public.tienda), 'gestor cambia el modo demo';
end $$;
do $$ begin
  update public.perfiles set rol = 'administrador';
  assert (select rol from public.perfiles) = 'gestor', 'gestor no se sube de rol';
end $$;
do $$ begin
  insert into storage.objects (bucket_id, name) values ('fotos', 'equipo/1.webp');
  assert (select count(*) from storage.objects) = 1, 'gestor sube fotos';
  -- Video (0009): bucket propio de 20 MB, solo MP4 y WebM
  assert (select file_size_limit from storage.buckets where id = 'videos') = 20971520, 'videos: 20 MB';
  assert (select allowed_mime_types from storage.buckets where id = 'videos') = array['video/mp4', 'video/webm'], 'videos: MP4 y WebM';
  assert (select file_size_limit from storage.buckets where id = 'fotos') = 10485760, 'fotos sigue en 10 MB';
  insert into storage.objects (bucket_id, name) values ('videos', 'equipos/v1.mp4');
  update public.equipos set video = 'equipos/v1.mp4' where color_nombre_mostrar = 'Borrador';
  assert (select video from public.equipos where color_nombre_mostrar = 'Borrador') = 'equipos/v1.mp4', 'gestor pone un video';
  update public.equipos set video = '' where color_nombre_mostrar = 'Borrador';
  delete from storage.objects where bucket_id = 'videos';
end $$;
-- Más vendido (0010): hasta 3
do $$ begin
  update public.equipos set mas_vendido = true where es_demo and modelo_id = (select id from public.modelos where slug = 'iphone-18-pro-max');
  assert (select count(*) from public.equipos where mas_vendido) = 3, 'gestor marca 3 más vendidos';
end $$;
do $$ begin
  update public.equipos set mas_vendido = true where color_nombre_mostrar = 'Glacier';
  raise exception 'un cuarto más vendido no vale';
exception when check_violation then
  assert sqlerrm = 'Ya tiene 3 equipos marcados como más vendidos. Desmarque uno para marcar este.', sqlerrm;
end $$;
do $$ begin
  insert into public.equipos (modelo_id, condicion, capacidad, precio, mas_vendido) values ((select id from public.modelos where slug = 'iphone-17-pro'), 'nuevo', '1 TB', 5, true);
  raise exception 'un equipo nuevo marcado como cuarto más vendido no vale';
exception when check_violation then null; end $$;
do $$ begin
  -- Desmarcar uno deja marcar otro; volver a guardar uno marcado no cuenta doble
  update public.equipos set mas_vendido = false where es_demo and capacidad = '512 GB';
  update public.equipos set mas_vendido = true where color_nombre_mostrar = 'Glacier';
  update public.equipos set mas_vendido = true where color_nombre_mostrar = 'Glacier';
  assert (select count(*) from public.equipos where mas_vendido) = 3, 'siguen 3';
  update public.equipos set mas_vendido = false;
end $$;
do $$ begin
  update public.equipos set video = 'equipos/v1.mov' where color_nombre_mostrar = 'Borrador';
  raise exception 'un video .mov no vale';
exception when check_violation then null; end $$;
do $$ begin
  update public.equipos set video = '../otro/v1.mp4' where color_nombre_mostrar = 'Borrador';
  raise exception 'una ruta de video rara no vale';
exception when check_violation then null; end $$;
-- Color del equipo: debe ser de su modelo; obligatorio si el modelo tiene colores.
do $$ begin
  insert into public.equipos (modelo_id, condicion, capacidad, precio, color_id)
  values ((select id from public.modelos where slug = 'iphone-13'), 'usado', '64 GB', 100,
          (select c.id from public.colores c join public.modelos m on m.id = c.modelo_id where m.slug = 'iphone-14' and c.nombre_es = 'Azul'));
  raise exception 'un color de otro modelo no vale';
exception when check_violation then null; end $$;
do $$ begin
  insert into public.equipos (modelo_id, condicion, capacidad, precio) values ((select id from public.modelos where slug = 'iphone-13'), 'usado', '64 GB', 100);
  raise exception 'sin color no vale si el modelo tiene colores';
exception when check_violation then null; end $$;
do $$ begin
  -- Cambiar el modelo obliga a elegir de nuevo el color
  update public.equipos set modelo_id = (select id from public.modelos where slug = 'iphone-14') where color_nombre_mostrar = 'Borrador';
  raise exception 'al cambiar el modelo, el color viejo no vale';
exception when check_violation then null; end $$;
do $$ begin
  -- Un modelo sin colores (17 Pro) acepta un equipo sin color, y el nombre a mostrar se recorta
  insert into public.equipos (modelo_id, condicion, capacidad, precio, color_nombre_mostrar) values ((select id from public.modelos where slug = 'iphone-17-pro'), 'nuevo', '256 GB', 100, '  Naranja  ');
  assert (select color_nombre_mostrar from public.equipos where capacidad = '256 GB' and precio = 100) = 'Naranja', 'nombre a mostrar sin espacios';
  delete from public.equipos where capacidad = '256 GB' and precio = 100;
end $$;
do $$ begin
  update public.equipos set color_nombre_mostrar = repeat('x', 41) where color_nombre_mostrar = 'Borrador';
  raise exception 'nombre a mostrar de más de 40 no vale';
exception when check_violation then null; end $$;
-- (en el 17 Pro, que no tiene colores, para probar solo cada regla)
do $$ begin
  insert into public.equipos (modelo_id, condicion, capacidad, precio, en_stock)
  values ((select id from public.modelos where slug = 'iphone-17-pro'), 'usado', '64 GB', 100, null);
  raise exception 'el stock no puede quedar vacío';
exception when not_null_violation then null; end $$;
do $$ begin
  insert into public.equipos (modelo_id, condicion, capacidad, precio, bateria_porcentaje)
  values ((select id from public.modelos where slug = 'iphone-17-pro'), 'usado', '64 GB', 100, 101);
  raise exception 'batería 101 no vale';
exception when check_violation then null; end $$;
do $$ begin
  insert into public.equipos (modelo_id, condicion, capacidad, precio) values ((select id from public.modelos where slug = 'iphone-17-pro'), 'nuevo', '64 GB', 0);
  raise exception 'precio 0 no vale';
exception when check_violation then null; end $$;
do $$ begin
  assert (select tamano_texto from public.tienda) = 'normal', 'tamaño del texto normal por defecto';
  update public.tienda set tamano_texto = 'grande';
  assert (select tamano_texto from public.tienda) = 'grande', 'gestor elige el tamaño del texto';
  update public.tienda set tamano_texto = 'normal';
end $$;
-- Colores con el gestor: completa el hexadecimal que falta; no toca lo que vino
-- de la fuente; agrega y borra colores de la tienda solo donde no hay oficiales.
do $$ begin
  update public.colores set hex = '#5A5D3C' where nombre_es = 'Oliva' and modelo_id = (select id from public.modelos where slug = 'iphone-18-pro');
  assert (select hex from public.colores where nombre_es = 'Oliva' and modelo_id = (select id from public.modelos where slug = 'iphone-18-pro')) = '#5A5D3C', 'gestor completa el hex que falta';
  insert into public.colores (modelo_id, nombre_es, hex) values ((select id from public.modelos where slug = 'iphone-17-pro'), 'Naranja', '#E8772E');
  assert (select count(*) from public.colores c join public.modelos m on m.id = c.modelo_id where m.slug = 'iphone-17-pro' and not c.oficial) = 1, 'gestor agrega un color al 17 Pro';
  update public.colores set hex = '#E87730', nombre_es = 'Naranja cósmico' where nombre_es = 'Naranja';
  -- Un color en uso no se borra
  insert into public.equipos (modelo_id, condicion, capacidad, precio, color_id)
  values ((select id from public.modelos where slug = 'iphone-17-pro'), 'nuevo', '2 TB', 100, (select id from public.colores where nombre_es = 'Naranja cósmico'));
  begin
    delete from public.colores where nombre_es = 'Naranja cósmico';
    raise exception 'un color en uso no se borra';
  exception when foreign_key_violation then null; end;
  delete from public.equipos where capacidad = '2 TB';
  delete from public.colores where nombre_es = 'Naranja cósmico';
  assert (select count(*) from public.colores where nombre_es like 'Naranja%') = 0, 'gestor borra un color de la tienda';
end $$;
do $$ begin
  update public.colores set hex = '#000000' where nombre_en = 'Burgundy' and modelo_id = (select id from public.modelos where slug = 'iphone-18-pro');
  raise exception 'el hex de la fuente no se cambia';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.colores set nombre_en = 'Olive' where nombre_es = 'Oliva';
  raise exception 'el nombre de un color oficial no se cambia';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.colores (modelo_id, nombre_es) values ((select id from public.modelos where slug = 'iphone-16'), 'Otro');
  raise exception 'no se agregan colores a un modelo con colores oficiales';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.colores (modelo_id, nombre_es, oficial) values ((select id from public.modelos where slug = 'iphone-17-pro'), 'Falso', true);
  raise exception 'no se crean colores oficiales desde el panel';
exception when insufficient_privilege then null; end $$;
do $$ begin
  delete from public.colores where nombre_es = 'Visón';
  raise exception 'un color oficial no se borra';
exception when insufficient_privilege then null; end $$;
do $$ begin
  assert (select vista_equipos from public.tienda) = 'cuadricula', 'vista en cuadrícula por defecto';
  update public.tienda set vista_equipos = 'carrusel';
  assert ((public.datos_publicos() -> 'tienda' ->> 'vista_equipos') = 'carrusel'), 'el sitio recibe la vista';
  update public.tienda set vista_equipos = 'cuadricula';
end $$;
do $$ begin
  update public.tienda set vista_equipos = 'lista';
  raise exception 'vista fuera de la lista no vale';
exception when check_violation then null; end $$;
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

-- 5. Rol administrador: solo los accesos
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  assert (select count(*) from public.perfiles) = 3, 'administrador ve todos los perfiles';
  -- Ve lo mismo que el público
  assert (select count(*) from public.modelos) = 5, 'administrador ve el catálogo como el público';
  assert (select count(*) from public.equipos where not publicado) = 0, 'administrador no ve borradores';
  -- No edita nada fuera de los accesos (las políticas filtran: 0 filas)
  update public.tienda set nombre = 'x';
  assert (select nombre from public.tienda) = 'Mi tienda', 'administrador no edita la tienda';
  update public.equipos set precio = 1;
  assert (select count(*) from public.equipos where precio = 1) = 0, 'administrador no edita equipos';
  update public.modelos set activo = false where slug = 'iphone-16';
  assert (select activo from public.modelos where slug = 'iphone-16'), 'administrador no toca el catálogo';
  -- Asigna roles, desactiva y reactiva
  update public.perfiles set rol = 'administrador' where correo = 'gestor@prueba.co';
  assert (select rol from public.perfiles where correo = 'gestor@prueba.co') = 'administrador', 'administrador asigna roles';
  update public.perfiles set rol = 'gestor' where correo = 'gestor@prueba.co';
  update public.perfiles set activo = false where correo = 'gestor@prueba.co';
  assert not (select activo from public.perfiles where correo = 'gestor@prueba.co'), 'administrador desactiva';
  update public.perfiles set activo = true where correo = 'gestor@prueba.co';
end $$;
do $$ begin
  insert into public.modelos (nombre, slug, generacion, orden) values ('iPhone 20', 'iphone-20', '20', 1999);
  raise exception 'administrador no debería agregar modelos';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into public.colores (modelo_id, nombre_es) values ((select id from public.modelos where slug = 'iphone-16'), 'Prueba');
  raise exception 'administrador no debería agregar colores';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into storage.objects (bucket_id, name) values ('fotos', 'equipo/2.webp');
  raise exception 'administrador no debería subir fotos';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into storage.objects (bucket_id, name) values ('videos', 'equipos/v2.mp4');
  raise exception 'administrador no debería subir videos';
exception when insufficient_privilege then null; end $$;
do $$ begin
  perform public.borrar_datos_demo();
  raise exception 'administrador no debería borrar demo';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.perfiles set activo = false where correo = 'admin@prueba.co';
  raise exception 'el administrador no debería poder desactivarse a sí mismo';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.perfiles set rol = 'gestor' where correo = 'admin@prueba.co';
  raise exception 'el administrador no debería poder quitarse el rol';
exception when insufficient_privilege then null; end $$;
reset role;

-- 5b. Siempre queda al menos un administrador activo (también con la clave de
-- servicio, que usa la función "usuarios"; aquí, sin sesión).
set request.jwt.claim.sub = '';
do $$ begin
  update public.perfiles set activo = false where correo = 'admin@prueba.co';
  raise exception 'no se puede desactivar al último administrador';
exception when insufficient_privilege then null; end $$;
do $$ begin
  update public.perfiles set rol = 'gestor' where correo = 'admin@prueba.co';
  raise exception 'no se le puede quitar el rol al último administrador';
exception when insufficient_privilege then null; end $$;
do $$ begin
  -- Con otro administrador activo, sí
  update public.perfiles set rol = 'administrador' where correo = 'gestor@prueba.co';
  update public.perfiles set activo = false where correo = 'admin@prueba.co';
  assert (select count(*) from public.perfiles where rol = 'administrador' and activo) = 1, 'queda uno';
  update public.perfiles set activo = true where correo = 'admin@prueba.co';
  update public.perfiles set rol = 'gestor' where correo = 'gestor@prueba.co';
end $$;

-- 5c. El gestor borra los datos de demostración
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  perform public.borrar_datos_demo();
  assert (select count(*) from public.equipos where es_demo) = 0, 'demo borrado';
  assert not (select modo_demo from public.tienda), 'modo demo apagado';
  -- iphone-18-pro-max, iphone-15-pro, iphone-13 vuelven a inactivos; iphone-18-pro lo tocó el gestor y queda activo
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

-- 7b. Textos legales (0015): marcas para el abogado en el texto base y la
-- regla de "solo donde estaba vacío" (la compara también comparar-semilla).
do $$
begin
  assert (select texto_privacidad like '%[PENDIENTE: razón social y NIT]%' and texto_privacidad like '%{{herramientas}}%' from public.tienda), 'privacidad con sus marcas';
  assert (select texto_terminos from public.tienda) = 'Términos que ya escribió la tienda.', 'los términos de la tienda no se tocan';
  assert (select not legales_revisados and array_length(legales_herramientas, 1) = 5 from public.tienda), 'sin revisar y con 5 herramientas';
end $$;

-- 7. Reseñas (0014): ninguna de ejemplo; hasta 12; casilla obligatoria; el
-- público solo las ve con el interruptor encendido; solo el gestor escribe.
do $$
begin
  assert (select count(*) from public.resenas) = 0, 'no se crean reseñas de ejemplo';
  assert (select not mostrar_resenas and titulo_resenas = 'Lo que dicen nuestros clientes' from public.tienda), 'apagadas y con el título por defecto';
  assert (select file_size_limit = 20971520 and allowed_mime_types = array['image/webp', 'image/jpeg', 'image/png', 'video/mp4', 'video/webm'] and public
          from storage.buckets where id = 'resenas'), 'bucket resenas: 20 MB, imágenes y videos, público';
end $$;
-- (antes de llegar a 12: si no, el límite respondería primero)
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000a';
do $$ begin
  insert into public.resenas (tipo, ruta, autorizado) values ('imagen', 'resenas/admin.webp', true);
  raise exception 'el administrador no debería agregar reseñas';
exception when insufficient_privilege then null; end $$;
do $$ begin
  insert into storage.objects (bucket_id, name) values ('resenas', 'resenas/admin.webp');
  raise exception 'el administrador no debería subir al bucket resenas';
exception when insufficient_privilege then null; end $$;
reset role;
set role anon;
set request.jwt.claim.sub = '';
do $$ begin
  insert into public.resenas (tipo, ruta, autorizado) values ('imagen', 'resenas/anon.webp', true);
  raise exception 'el público no debería agregar reseñas';
exception when insufficient_privilege then null; end $$;
reset role;
set role authenticated;
set request.jwt.claim.sub = '00000000-0000-0000-0000-00000000000b';
do $$
declare i int;
begin
  for i in 1 .. 12 loop
    insert into public.resenas (tipo, ruta, texto, autorizado, orden)
    values (case when i % 2 = 0 then 'video' else 'imagen' end,
            'resenas/r' || i || case when i % 2 = 0 then '.mp4' else '.webp' end, 'Texto ' || i, true, i);
  end loop;
  begin
    insert into public.resenas (tipo, ruta, autorizado) values ('imagen', 'resenas/r13.webp', true);
    raise exception 'la 13 debió fallar';
  exception when check_violation then
    assert sqlerrm = 'Ya tiene 12 reseñas. Borre una para agregar otra.', sqlerrm;
  end;
  -- Borrando una, se puede agregar otra
  delete from public.resenas where ruta = 'resenas/r12.mp4';
  insert into public.resenas (tipo, ruta, texto, autorizado, orden, origen, origen_otro) values ('video', 'resenas/r12.webm', 'Texto 12', true, 12, 'otro', 'Facebook');
end $$;
do $$ begin
  insert into public.resenas (tipo, ruta, autorizado) values ('imagen', 'resenas/sin.webp', false);
  raise exception 'sin la casilla debió fallar';
exception when check_violation then null; end $$;
do $$ begin
  insert into public.resenas (tipo, ruta, autorizado) values ('video', 'resenas/x.webp', true);
  raise exception 'un video con ruta de imagen debió fallar';
exception when check_violation then null; end $$;
do $$ begin
  insert into public.resenas (tipo, ruta, autorizado, origen, origen_otro) values ('imagen', 'resenas/y.webp', true, 'instagram', 'Algo');
  raise exception 'origen_otro sin "otro" debió fallar';
exception when check_violation then null; end $$;
do $$ begin
  insert into storage.objects (bucket_id, name) values ('resenas', 'resenas/r1.webp');
  assert (select count(*) from public.resenas) = 12, 'el gestor ve las 12 aunque estén apagadas';
end $$;
reset role;
set role anon;
set request.jwt.claim.sub = '';
do $$ begin
  assert (select count(*) from public.resenas) = 0, 'apagadas: el público no las lee';
  assert public.datos_publicos() -> 'resenas' = '[]'::jsonb, 'apagadas: datos_publicos sin reseñas';
  assert (select count(*) from storage.objects where bucket_id = 'resenas') = 1, 'los archivos se leen igual (como las fotos)';
end $$;
reset role;
update public.tienda set mostrar_resenas = true;
set role anon;
do $$ begin
  assert (select count(*) from public.resenas) = 12, 'encendidas: el público las lee';
  assert jsonb_array_length(public.datos_publicos() -> 'resenas') = 12, 'encendidas: datos_publicos las trae';
  assert (public.datos_publicos() -> 'resenas' -> 0 ->> 'texto') = 'Texto 1', 'en orden';
  assert not (public.datos_publicos() -> 'resenas' -> 0 ? 'autorizado'), 'sin datos internos';
end $$;
reset role;
delete from public.resenas;
delete from storage.objects where bucket_id = 'resenas';
update public.tienda set mostrar_resenas = false;

\echo 'OK: todas las pruebas SQL pasaron'
