-- =============================================================================
-- 0033 — WhatsApp: formatos verificados, fijos de la tienda y México
-- -----------------------------------------------------------------------------
-- Punto 8 de la investigación de Jared con Gemini (aprobado el 23/10/2026).
-- whatsapp_valido(pais, numero) valida el WhatsApp DE LA TIENDA (el check de
-- tienda y legal_faltantes() la usan). Desde aquí:
-- - El Salvador ^503[67]\d{7}$, Bolivia ^591[67]\d{7}$, Costa Rica
--   ^506[5-8]\d{7}$ y Ecuador ^5939\d{8}$ tienen su formato de celular.
-- - Además del celular, acepta un fijo con WhatsApp Business: el prefijo del
--   país y el número, de 8 a 15 dígitos en total, sin un 0 justo después del
--   prefijo (el 0 troncal no va en el formato internacional). Para los países
--   sin formato verificado es la misma regla de antes, más lo del 0.
-- - Lo que pasa en el navegador y no toca la base: el 0 inicial que escribe
--   el cliente en EC, PY, UY y VE se quita (paises.js), y en México el enlace
--   wa.me lleva 521 (sitio/catalogo.js).
-- Igual que whatsappValido() de assets/js/datos/paises.js
-- (tests/sql/comparar-paises.mjs lo compara).
-- =============================================================================

create or replace function public.whatsapp_valido(pais text, numero text)
returns boolean language sql immutable set search_path = public as $$
  with p(prefijo) as (
    select case pais
      when 'ar' then '54' when 'bo' then '591' when 'br' then '55' when 'cl' then '56' when 'co' then '57'
      when 'cr' then '506' when 'cu' then '53' when 'ec' then '593' when 'sv' then '503' when 'gt' then '502'
      when 'hn' then '504' when 'mx' then '52' when 'ni' then '505' when 'pa' then '507' when 'py' then '595'
      when 'pe' then '51' when 'do' then '1' when 'uy' then '598' when 've' then '58' end
  )
  select coalesce(
    case pais
      when 'ar' then numero ~ '^549[1-9][0-9]{9}$'
      when 'bo' then numero ~ '^591[67][0-9]{7}$'
      when 'br' then numero ~ '^55[1-9]{2}9[1-9][0-9]{7}$'
      when 'cl' then numero ~ '^569[0-9]{8}$'
      when 'co' then numero ~ '^573[0-9]{9}$'
      when 'cr' then numero ~ '^506[5-8][0-9]{7}$'
      when 'ec' then numero ~ '^5939[0-9]{8}$'
      when 'sv' then numero ~ '^503[67][0-9]{7}$'
      when 'mx' then numero ~ '^52[1-9][0-9]{9}$'
      when 'pe' then numero ~ '^519[0-9]{8}$'
      else false
    end, false)
    or coalesce((select numero ~ '^[0-9]{8,15}$' and left(numero, length(prefijo)) = prefijo
                   and length(numero) > length(prefijo) and substr(numero, length(prefijo) + 1, 1) <> '0' from p), false)
$$;
