-- Una tienda que ya tenía su WhatsApp de Colombia antes de 0018: la migración
-- la deja en Colombia (sin datos de Colombia, quedaría en Argentina).
update public.tienda set whatsapp = '573001234567' where id = 1;
