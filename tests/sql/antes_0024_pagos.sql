-- Antes de 0024: la tienda tenía PSE y "Otra" pasarela con su nombre. 0024
-- pasa el nombre a pagos_pasarelas_otras y quita la clave 'otra'.
update public.tienda set pagos_pasarelas = '{pse,otra}', pagos_pasarela_otra = 'Addi';
