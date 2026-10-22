-- Antes de 0023: la tienda eligió en el asistente de legales retiro y entrega
-- personal, con sus zonas. 0023 lo pasa a Envíos.
update public.tienda set legal_entrega = '{retiro,personal}', legal_entrega_zonas = 'Medellín y su área metropolitana';
