# CLAUDE.md — Cotizadora I.C.T. (Marketing Masters Group)

Guía para las próximas sesiones de Claude Code en este repo. Leer completa, y el README, antes de tocar nada.

## Documentación obligatoria: `DOCUMENTACION.md`

`DOCUMENTACION.md` es la documentación completa del proyecto. Jared la usa para pasarle el proyecto a otros LLM. **Todo cambio en el repo se acompaña, en el mismo trabajo, de su actualización.**

Qué actualizar (sección 18 del documento):
- La sección 5 (mapa de archivos).
- La sección temática que corresponda.
- Los pendientes, si cambiaron.
- La fecha de arriba.
- Una entrada nueva arriba en la sección 19 (registro de cambios).

Cómo se hace cumplir:
- El hook `Stop` de `.claude/settings.json` (`.claude/hooks/documentacion.sh`) no deja terminar con cambios sin documentar.
- `node tests/documentacion.mjs` falla si algún archivo no figura en el documento.

## Qué es

- Plantilla de cotizadora para tiendas de iPhone: sitio público con filtros, galería, carrusel por color y pop-up a WhatsApp, más el panel `/admin`.
- Se clona por tienda: un proyecto de Supabase y un `config.js` por tienda.
- Es HTML, CSS y JS vanilla con ES modules. **Sin build ni npm en producción.**
- Nació del "Prompt de la cotizadora I.C.T. v2", pensado para el AI Studio de GHL. Se construyó como código con Supabase. El README explica por qué.

## Reglas que no se rompen (del prompt)

1. Español de Colombia y trato de **"usted"** en todo: sitio, panel, errores, `aria-label`. Nada de "tú" ni voseo.
2. Sin logo, imágenes, íconos ni tipografías de Apple. Los marcadores de posición son el SVG genérico de `ilustracion.js`.
3. No inventar especificaciones, precios, colores, garantías, plazos ni promesas. Lo que no cargó la tienda no se muestra.
4. Moneda: `$5.299.000`, con `formatearCOP`. Fechas: D/M/AAAA, hora de Colombia, con `fechaCorta`. No usar `Intl` para números.
5. Nada de la tienda en el código: todo sale de la base y se edita desde el panel. `config.js` solo lleva la conexión, el píxel y el script de GHL.
6. Datos personales de clientes: **nunca** en Supabase ni en el píxel. Solo van a GHL por la función `enviar-lead`.
7. No disparar `Purchase`. No abrir pop-ups que nadie pidió.
8. Textos de 16 px o más, zonas táctiles de 44 px o más, contraste AA y `prefers-reduced-motion` respetado. La suite lo revisa.

## Textos literales del prompt (no reescribir)

- "Elija su iPhone y cómprelo por WhatsApp."
- "¿Nuevo o usado?", "¿Qué modelo?", "¿Qué almacenamiento?"
- "Antes de pasar a WhatsApp" / "Así sabemos que usted es una persona y no un bot."
- "Su nombre", "Su correo", "Su WhatsApp", "Continuar a WhatsApp".
- "Se abrirá WhatsApp con su pedido escrito. Solo toque Enviar."
- Mensajes de error, "Su pedido está listo" y el mensaje de WhatsApp.

Están en `popup.js` y `catalogo.js`, y la suite compara el mensaje de WhatsApp letra por letra.

## Arquitectura

- `assets/js/datos/api.js` elige el back-end:
  - `demo.js`: localStorage e IndexedDB, con usuarios `gestor@demo.co` / `administrador@demo.co` y clave `demo1234`.
  - `supabase.js`: fetch directo en el sitio público, supabase-js desde el CDN en el panel.

  **Los dos tienen la misma interfaz y las mismas reglas.** Si se cambia una regla del SQL (permisos, validaciones, fecha de precios), hay que cambiarla también en `demo.js`.
- La semilla está dos veces: en `supabase/migrations/0006_catalogo_colores.sql` (catálogo y colores) y `0003_demo.sql`, y en `assets/js/datos/semilla.js`. `tests/sql/probar.sh` revisa que coincidan.
- El catálogo y los colores salen solo de los archivos de Jared. Lo que no está queda vacío: nunca completar de memoria.
- Roles: **administrador** solo gestiona accesos (Usuarios); **gestor** hace todo lo demás (incluido el catálogo completo y el modo demo). Siempre queda un administrador activo.
- La seguridad real está en el SQL: RLS con `es_gestor()` / `es_administrador()`, disparadores (`modelos_proteger`, `tienda_proteger`, `perfiles_proteger`, `colores_proteger`) y `borrar_datos_demo` solo para el gestor. La función `usuarios` solo acepta administradores activos. El panel solo oculta lo que el rol no puede hacer.
- Fotos:
  - Se guardan dos tamaños: `ruta.webp` (máx. 1600 px) y `ruta-640.webp`. Usar `rutaMiniatura`.
  - Las rutas van en `equipos.fotos`.
  - Al borrar un equipo o quitar una foto se borran los dos archivos.
- Video (opcional, uno por equipo): bucket `videos`, ruta en `equipos.video`, validado en `panel/video.js` antes de subir (MP4 H.264 o WebM, 15 s, 20 MB), sin comprimir. Se borra al quitarlo o al borrar el equipo.
- Cambios a la base: siempre una migración nueva (`0004_…sql`). Nunca editar una ya corrida en producción.

## Cómo verificar antes de cada commit

```bash
node tests/documentacion.mjs                               # DOCUMENTACION.md cubre todos los archivos
bash tests/sql/probar.sh                                   # SQL y RLS (Postgres local)
python3 -m http.server 8080 &
NODE_PATH="$(npm root -g)" node tests/verificar.cjs        # 34 casos, modo demo
ICT_CAPTURAS=1 NODE_PATH="$(npm root -g)" node tests/verificar.cjs   # + capturas en tests/capturas/
```

Si se tocan las funciones, correr también `tests/funciones/probar.sh`, que necesita Deno.

Si se toca `supabase.js` o el SQL, levantar el Supabase local y correr `tests/verificar-supabase.cjs`. El README explica cómo; necesita los binarios de PostgREST, auth (GoTrue) y Deno.

Después de correr la suite:

- **Mirar las capturas** a 360, 768 y 1440 px.
- Revisar el tuteo a mano:
  ```bash
  grep -rniE "\btú\b|\bvos\b|tienes|puedes" --include=*.html --include=*.js .
  ```

## Lo que falta y no se puede resolver desde el código

Está en la sección "Pendientes" del README:

- Textos legales.
- Confirmar los nombres del catálogo.
- Fuente de las fichas técnicas.
- Plan de Supabase.
- SMTP.
- Probar en GHL el webhook y, si se quiere, el script de seguimiento externo.
