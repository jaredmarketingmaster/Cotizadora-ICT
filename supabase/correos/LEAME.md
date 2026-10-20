# Plantillas de correo en español

Supabase trae los correos en inglés. Estas dos se pegan en **Authentication → Emails → Templates** de cada proyecto:

| Plantilla de Supabase | Asunto | Cuerpo |
|---|---|---|
| Invite user | `Su acceso al panel de la tienda` | `invitacion.html` |
| Reset Password | `Contraseña nueva para el panel de la tienda` | `recuperacion.html` |

Usan las variables `{{ .ConfirmationURL }}` y `{{ .Email }}` de Supabase. El panel no usa las demás plantillas (Confirm signup, Magic Link, Change Email), porque no hay registro público.

`tests/supabase-local/levantar.sh` carga estas mismas plantillas en el servidor de auth local, así que la prueba de punta a punta verifica que funcionan.
