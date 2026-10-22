# Plantillas de correo (español y portugués)

Supabase trae los correos en inglés. Estas dos se pegan en **Authentication → Emails → Templates** de cada proyecto, en el idioma de la tienda:

| Plantilla de Supabase | Español (`tienda.idioma = 'es'`) | Portugués de Brasil (`tienda.idioma = 'pt'`) |
|---|---|---|
| Invite user | Asunto `Su acceso al panel de la tienda`, cuerpo `invitacion.html` | Asunto `Seu acesso ao painel da loja`, cuerpo `pt/invitacion.html` |
| Reset Password | Asunto `Contraseña nueva para el panel de la tienda`, cuerpo `recuperacion.html` | Asunto `Nova senha para o painel da loja`, cuerpo `pt/recuperacion.html` |

## Cuándo cargar cada idioma

- Las plantillas son **por proyecto de Supabase**, y cada tienda tiene su proyecto: se cargan las del idioma que la tienda eligió en Mi tienda → "País, moneda e idioma".
- Una tienda nueva empieza en español: se cargan las de español al crear el proyecto.
- Si la tienda cambia de idioma, hay que volver a pegar las dos plantillas y los dos asuntos del otro idioma. El panel no puede cambiarlas (las guarda Supabase, no la base de la tienda).
- No hay un correo por persona: todas las personas del panel de esa tienda reciben los correos en el mismo idioma.

## Variables

Los dos idiomas usan las mismas variables de Supabase: `{{ .ConfirmationURL }}` (las dos) y `{{ .Email }}` (recuperación). `node tests/i18n.test.mjs` revisa que coincidan. El panel no usa las demás plantillas (Confirm signup, Magic Link, Change Email), porque no hay registro público.

## Prueba local

`tests/supabase-local/levantar.sh` carga estas mismas plantillas en el servidor de auth local, así que la prueba de punta a punta verifica que funcionan. Por defecto carga las de español; con `CORREOS_IDIOMA=pt` carga las de portugués y sus asuntos (la suite `tests/verificar-supabase.cjs` espera los asuntos en español).
