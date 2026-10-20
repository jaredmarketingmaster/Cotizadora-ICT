-- Usuarios con los roles de antes de 0007 ("agencia" y "tienda"), para probar
-- que la migración los convierte: agencia → administrador, tienda → gestor.
-- pruebas.sql los sigue usando.
insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@prueba.co'),
  ('00000000-0000-0000-0000-00000000000b', 'gestor@prueba.co'),
  ('00000000-0000-0000-0000-00000000000c', 'inactivo@prueba.co'),
  ('00000000-0000-0000-0000-00000000000d', 'sinperfil@prueba.co');
insert into public.perfiles (user_id, correo, rol, activo) values
  ('00000000-0000-0000-0000-00000000000a', 'admin@prueba.co', 'agencia', true),
  ('00000000-0000-0000-0000-00000000000b', 'gestor@prueba.co', 'tienda', true),
  ('00000000-0000-0000-0000-00000000000c', 'inactivo@prueba.co', 'tienda', false);
