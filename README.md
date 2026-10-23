# Cotizadora I.C.T.

Plantilla de cotizadora para tiendas de iPhone. Se clona una vez por tienda.

- **Sitio público:** la persona filtra por condición, modelo y almacenamiento y ve los equipos en una galería. Después recorre los colores en un carrusel, ve la ficha y el precio y toca "Comprar por WhatsApp". Un pop-up pide nombre, correo y WhatsApp, manda el contacto a GHL con el origen del anuncio y abre WhatsApp con el pedido ya escrito.
- **Panel `/admin`:** la tienda inicia sesión y gestiona su marca, sus datos, el inventario, las fotos, las fichas técnicas y los textos legales, sin tocar código.

Nada de la tienda va en el código: todo sale de la base de datos y se edita desde el panel. Lo único que cambia entre una tienda y otra es `config.js`.

> **Documentación completa:** [`DOCUMENTACION.md`](DOCUMENTACION.md) explica todo el proyecto: historia, arquitectura, cada archivo, datos, flujos, pruebas, decisiones, pendientes y registro de cambios. Se actualiza con cada cambio y sirve para pasarle el proyecto a otra persona o a otro LLM.

> **Por qué no está en AI Studio de GHL.** El prompt v2 era para el AI Studio de GHL. Desde aquí no tengo acceso a esa herramienta, así que construí lo mismo como código, con [Supabase](https://supabase.com) en lugar de AI Studio Cloud. Supabase da lo mismo: base de datos con seguridad a nivel de fila, usuarios y archivos. El prompt sigue sirviendo si se prefiere armarlo en AI Studio.

## Estructura

```
index.html                 Sitio público (una página)
privacidad/  terminos/  cookies/   Páginas legales (documentos que genera el asistente de Legales)
legal/FUENTES.md           Fuentes de lo que los textos legales afirman como requisito legal
admin/                     Panel de administración
config.js                  ← lo único que cambia por tienda
assets/
  css/base.css             Variables, botones y campos (sitio y panel)
  css/sitio.css · panel.css
  js/utils.js              Formatos ($5.299.000, D/M/AAAA), código COT-, contraste
  js/tema.js               Colores de la tienda → variables CSS (texto con contraste AA)
  js/ilustracion.js        Teléfono genérico en SVG (sin manzana)
  js/datos/                Capa de datos: api.js elige demo.js o supabase.js
  js/legal/                Motor legal, plantillas, módulos por país (Colombia) y herramientas
  js/sitio/                Filtros, galería, detalle con carrusel, pop-up, consentimiento de cookies, píxel, atribución
  js/panel/                Inicio, inventario, mi tienda (y reseñas), catálogo (modelos, ficha técnica, formas de pago), legales (asistente), usuarios
supabase/
  migrations/0001_esquema.sql   Tablas, seguridad a nivel de fila, disparadores, almacenamiento
  migrations/0002_catalogo.sql  Catálogo maestro: 32 modelos, todos inactivos
  migrations/0003_demo.sql      6 equipos de demostración
  migrations/0004_en_stock.sql  El stock pasa a sí/no ("Con stock" / "Sin stock")
  migrations/0005_tamano_texto.sql  Tamaño del texto del sitio (Compacto, Normal, Grande)
  migrations/0006_catalogo_colores.sql  Catálogo desde el iPhone 7 (42 modelos) y colores oficiales
  migrations/0007_roles.sql     Roles administrador (accesos) y gestor (todo lo demás)
  migrations/0008_color_oficial.sql  Cada equipo usa un color oficial de su modelo (+ nombre a mostrar)
  migrations/0009_video.sql     Un video corto opcional por equipo (bucket "videos")
  migrations/0010_mas_vendido.sql  "Más vendido" (hasta 3 equipos)
  migrations/0011_vista_equipos.sql  Vista de los equipos: cuadrícula o carrusel
  migrations/0012_fichas.sql    Ficha técnica: interruptores y fichas precargadas de la fuente
  migrations/0013_formas_pago.sql  Formas de pago estructuradas (medios, cuotas, cripto, pasarelas)
  migrations/0014_resenas.sql   Reseñas (tabla, bucket "resenas" y RLS)
  migrations/0015_legales.sql   Textos legales base (los reemplaza 0016)
  migrations/0016_legales_asistente.sql  Asistente de legales, documentos publicados con versión
  migrations/0017_bloqueo_legal.sql      Sin legales publicados, la demo no se quita
  migrations/0018_pais.sql               País de la tienda y WhatsApp según el país
  migrations/0019_legal_pais_tienda.sql  Los legales se publican solo si el país de la tienda tiene módulo
  migrations/0020_idioma.sql             Idioma del sitio y del panel (español o portugués)
  migrations/0021_titulo_sitio.sql       Título del sitio editable
  migrations/0022_hex_aproximado.sql     Muestra aproximada para los colores sin hexadecimal
  migrations/0023_envios.sql             Envíos (retiro, envío a domicilio, gratis con condición, plazo)
  migrations/0024_pagos.sql              Pasarelas por país, otras con nombre y descuentos informativos
  migrations/0025_url_sitio.sql          Dirección del sitio (para el archivo XML de productos; la quita 0027)
  migrations/0026_lote.sql               Carga de equipos en lote (todo o nada) y archivos compartidos
  migrations/0027_quitar_url_sitio.sql   Sin archivo XML de productos: borra la dirección del sitio
  migrations/0028_colores_apple.sql      Colores y nombres según Apple (17 Pro, 18 Pro, Duo y otros)
  migrations/0029_fichas_apple.sql       Fichas según Apple: batería, cámaras y medidas que faltaban
  migrations/0030_garantia_usados_co.sql Colombia: usados "con garantía" de 3 meses o más
  migrations/0031_legal_ar.sql           Módulo legal de Argentina (RNBD, Data Fiscal, DNI y CUIT)
  migrations/0032_pasarelas_pais.sql     Pasarelas por país (19 listas, regionales donde operan, sin dLocal)
  migrations/0033_whatsapp.sql           WhatsApp de la tienda: 4 celulares verificados y fijos
  migrations/0034_resenas_autorizacion.sql Reseñas: canal, fecha y alcance de la autorización
  functions/enviar-lead/        Reenvía el pedido a GHL (la URL va en los secretos)
  functions/usuarios/           Invitar, desactivar y reactivar (solo administrador)
tests/                     Pruebas (no se usan en producción)
```

No hay build, ni npm, ni frameworks. Las dependencias externas son tres:

- Google Fonts (Inter).
- En el panel, `supabase-js` desde jsDelivr, con versión fija.
- Las herramientas de medición y publicidad de la tienda (píxel de Meta y, si las activa, GA4, GTM, Clarity, TikTok y Google Ads), **solo si la persona las acepta** en el banner de cookies.

## Probarlo ya, sin back-end (modo demo)

Con `backend: "demo"` en `config.js`, que es el valor por defecto, todo vive en el navegador (localStorage e IndexedDB) con los datos de demostración.

```bash
python3 -m http.server 8080
```

- Sitio: <http://localhost:8080/?utm_source=meta&utm_campaign=test&ad_id=123&fbclid=prueba>
- Panel: <http://localhost:8080/admin/>
  - Gestor (tienda, inventario, catálogo, modo demo): `gestor@demo.co`, clave `demo1234`.
  - Administrador (solo Usuarios): `administrador@demo.co`, clave `demo1234`.

### Roles

| Rol | Qué hace |
|---|---|
| **Administrador** | Solo gestiona los accesos: invita, asigna roles, desactiva y reactiva usuarios. No ve ni edita la tienda, el inventario ni el catálogo. |
| **Gestor** | Todo lo demás: Mi tienda, Inventario, Catálogo completo (modelos y colores, y ficha técnica), Legales, modo demo y "Borrar datos de demostración". No ve Usuarios. |

Siempre queda al menos un administrador activo, y nadie puede cambiarse su propio rol ni desactivarse. Todo esto lo exige la base de datos (RLS y disparadores), no solo el panel. Si la misma persona necesita las dos cosas, usa dos usuarios.

En demo no sale ningún dato del navegador. El pedido que se mandaría a GHL queda en la consola y en `sessionStorage["cotizadora-demo:ultimo-lead"]`. Cada navegador tiene su propia copia, así que el modo demo no sirve para producción.

### Verlo en GitHub Pages

El repo ya está listo para Pages: rutas relativas y `.nojekyll`. La suite pasa también servida bajo `/Cotizadora-ICT/`, como la sirve Pages.

1. En GitHub, ir a **Settings → Pages**.
2. En **Source**, elegir *Deploy from a branch*.
3. Elegir la rama y la carpeta `/ (root)`. Guardar.
4. Esperar uno o dos minutos. Queda en:
   - Sitio: <https://jaredmarketingmaster.github.io/Cotizadora-ICT/>
   - Panel: <https://jaredmarketingmaster.github.io/Cotizadora-ICT/admin/>

Para probar:

- **El paso a WhatsApp:** entrar al panel, poner un WhatsApp propio en **Mi tienda** (ej. `573001234567`) y guardar. Sin número, el pop-up avisa que la tienda no lo tiene configurado.
- **Que el panel cambia el sitio:** el panel y el sitio comparten los datos solo en el mismo navegador. Un cambio de precio en el panel se ve al recargar el sitio en ese navegador; en otro celular o computador se ven los datos de demostración iniciales.
- **Volver al inicio:** con el usuario gestor, ir a **Inicio → Volver a los datos iniciales**.

## Poner una tienda en producción

### 1. Supabase (un proyecto por tienda)

1. Crear el proyecto en <https://supabase.com/dashboard>. Conviene la región São Paulo, la más cercana a Colombia.
2. En **SQL Editor**, correr **todas** las migraciones de `supabase/migrations/`, una por una y en orden de número, desde `0001_esquema.sql` hasta la última (hoy `0034_resenas_autorizacion.sql`):
   `0001` esquema → `0002` catálogo → `0003` demo → `0004` stock sí/no → `0005` tamaño del texto → `0006` catálogo y colores → `0007` roles → `0008` color oficial → `0009` video → `0010` más vendido → `0011` vista de equipos → `0012` fichas → `0013` formas de pago → `0014` reseñas → `0015` legales → `0016` asistente de legales → `0017` bloqueo hasta publicar → `0018` país de la tienda → `0019` legales según el país de la tienda → `0020` idioma → `0021` título del sitio → `0022` hexadecimal aproximado → `0023` envíos → `0024` pasarelas y descuentos → `0025` dirección del sitio → `0026` carga en lote.

   Saltarse una rompe las siguientes. Con la CLI, `supabase db push` las corre en orden. Las migraciones crean también los buckets de Storage (`fotos` y `marca` en `0001`, `videos` en `0009`, `resenas` en `0014`) y sus reglas: no hay que crearlos a mano.

   Más adelante, para actualizar una tienda que ya está en producción, se corren solo las migraciones nuevas, en orden. Nunca se edita una migración que ya se corrió.
3. En **Authentication → Sign In / Providers**, apagar **Allow new users to sign up**. No hay registro público: solo se entra por invitación.

   Igual, un usuario sin perfil no puede escribir nada: lo bloquean las reglas de la base.
4. En **Authentication → URL Configuration**, poner:
   - **Site URL:** `https://dominio-de-la-tienda/admin/`
   - **Redirect URLs:** `https://dominio-de-la-tienda/admin/**`
5. **Correo:** el correo que trae Supabase tiene un límite de envíos muy bajo y es para pruebas. Para las invitaciones y la recuperación de contraseña, configurar un SMTP propio en **Authentication → Emails → SMTP Settings**.

   Supabase trae las plantillas en inglés. Pegar las de `supabase/correos/` (invitación y recuperación, en español y con "usted") en **Authentication → Emails → Templates**; si la tienda está en portugués, las de `supabase/correos/pt/` ("você"). El `LEAME.md` de esa carpeta dice qué asunto y qué archivo va en cada una.
6. **Primer administrador:**
   1. En **Authentication → Users → Add user**, crearlo con contraseña y "Auto Confirm User".
   2. En el SQL Editor, correr:
      ```sql
      insert into public.perfiles (user_id, correo, rol)
      select id, email, 'administrador' from auth.users where email = 'correo@agencia.com';
      ```
   Desde ahí, los demás usuarios (el gestor de la tienda, por ejemplo) se invitan desde el panel, en **Usuarios**. El administrador no edita la tienda: para cargar datos hace falta un usuario gestor.
7. **Funciones**, con la [CLI de Supabase](https://supabase.com/docs/guides/cli):
   ```bash
   supabase link --project-ref <ref-del-proyecto>
   supabase functions deploy enviar-lead --no-verify-jwt
   supabase functions deploy usuarios
   supabase secrets set GHL_WEBHOOK_URL="https://services.leadconnectorhq.com/hooks/…" \
                        ORIGENES_PERMITIDOS="https://dominio-de-la-tienda"
   ```

   - `enviar-lead` va sin verificación de JWT porque la llama el público.
   - `usuarios` usa la clave de servicio que Supabase ya pone en las funciones. Esa clave nunca llega al navegador.

### 2. `config.js`

```js
backend: "supabase",
supabase: { url: "https://<ref>.supabase.co", anonKey: "<clave anon o publishable>" },
```

El ID del píxel de Meta ya no va aquí: se carga en el panel, **Legales → Herramientas** (junto con GA4, GTM, Clarity, TikTok y Google Ads). Si una tienda vieja tiene `metaPixelId` en `config.js`, el panel lo copia una vez.

La clave anon o publishable es pública por diseño: lo que protege los datos son las reglas de seguridad a nivel de fila.

### 3. Publicar

Sirve cualquier hosting estático: Hostinger, Netlify, Cloudflare Pages o GitHub Pages. Se suben los archivos tal cual.

Las rutas `/privacidad/`, `/terminos/`, `/cookies/` y `/admin/` son carpetas, así que funcionan sin reglas de reescritura.

### 4. Antes de abrir al público

Todo con el usuario **gestor** (el administrador solo ve Usuarios):

1. **Mi tienda:** nombre, ciudad, dirección, correo, WhatsApp y logo.
2. **Catálogo:** activar los modelos que vende; revisar la **Ficha técnica** (viene precargada; completar lo que falta, como la batería) y cargar las **Formas de pago**.
3. **Legales:** completar los seis pasos del asistente y tocar **Publicar textos legales**. Mientras no estén publicados, el pop-up no envía pedidos, las páginas legales dicen "Página en preparación." y la demo no se puede quitar.
4. **Inventario:** cargar los equipos con sus fotos.
5. **Inicio → Lo que falta** debe decir "Todo está completo.".
6. Tocar **Inicio → Borrar datos de demostración**.

## Integración con GHL

**Lo que pedía el prompt:** usar el formulario nativo "Cotizadora I.C.T." y que el código lo complete y lo envíe.

**Por qué no se puede así:** fuera de AI Studio, un formulario nativo de GHL solo se puede incrustar en un iframe de otro dominio. El código de la página no puede completarlo ni enviarlo, y no voy a usar endpoints sin documentar. El prompt pide, en ese caso, avisar y proponer la alternativa más cercana dentro de GHL. Es esta:

**1. Inbound Webhook (el camino principal, probado).** El pop-up manda el pedido a la función `enviar-lead`, que lo reenvía al **Inbound Webhook** de un workflow de GHL y espera la respuesta. En GHL:

1. Crear un workflow con el disparador **Inbound Webhook** y copiar su URL al secreto `GHL_WEBHOOK_URL`.
2. Agregar la acción **Create/Update Contact** y mapear:
   - Los campos estándar: `name`, `email` y `phone` (formato `+57XXXXXXXXXX`).
   - Los campos personalizados: `modelo`, `condicion`, `capacidad`, `color`, `precio_cotizado`, `equipo_id`, `tipo_consulta` (`compra` / `sin stock`), `codigo_cotizacion`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `ad_id` y `fbclid`.
3. El webhook también trae `event_id` (igual al código de cotización y al `eventID` del Lead del píxel), `pagina` y `enviado_en`.
4. Y los **campos de consentimiento** (crearlos como campos personalizados): `consentimiento_datos`, `consentimiento_promociones`, `consentimiento_medicion`, `consentimiento_publicidad` (sí/no), `version_politica` (número) y `fecha_consentimiento` (fecha y hora con zona). Ver "Legales" más abajo.

Así el contacto queda con todos los datos del anuncio en sus campos personalizados. Lo que **no** puedo asegurar es que GHL llene por este camino su reporte nativo de atribución (Attribution Source): eso lo registran sus formularios y su script de seguimiento.

**2. Script de seguimiento externo de GHL (opcional, sin probar).** GHL tiene un script de seguimiento externo, en *External Tracking*. Según su centro de ayuda, registra visitas y envíos de formularios HTML en sitios externos con su atribución. También según esa ayuda, no registra formularios dentro de iframes ni ventanas emergentes sin un `<form>` real.

Por eso el pop-up es un `<form>` real, con campos con nombre (`name`, `email`, `phone` y los campos ocultos con los nombres de arriba). El evento `submit` se dispara solo con los datos ya validados.

Para activarlo, poner `src` y `id` en `config.ghlSeguimiento`.

**[PENDIENTE] probarlo en la subcuenta**:

- Si captura el pop-up como un `<dialog>`.
- Si toma los campos ocultos.
- Si duplica contactos o disparos del workflow junto con el webhook.

No pude abrir la documentación de GHL desde este entorno: su dominio está bloqueado. Lo de arriba sale del resumen de búsqueda de su artículo de ayuda.

**Si el envío a GHL falla:**

- Se muestra "No pudimos guardar sus datos. Inténtelo de nuevo." con un botón para reintentar.
- Al segundo fallo aparece igual "Abrir WhatsApp", para no perder al cliente. Ese contacto no queda en GHL.

## Legales

La tienda no escribe sus textos legales: llena el **asistente** (panel → Legales) y el sitio publica cuatro documentos generados desde plantillas:

- **Política de tratamiento de datos** (`/privacidad/`), **Términos y condiciones** (`/terminos/`), **Política de cookies** (`/cookies/`) y el **aviso de privacidad corto** del pop-up.
- Cada uno termina en "Vigente desde D/M/AAAA · versión N.". La versión sube solo cuando cambia algún texto; después de publicar, los cambios se vuelven a publicar solos.
- **Asistente, seis pasos que se guardan solos:** perfil, identificación, países (Colombia y Argentina; Brasil necesita el sitio en portugués), condiciones de venta, herramientas y vista previa con "Publicar textos legales" (solo con todo completo). Cada documento admite una cláusula propia al final.
- **Motor y módulos por país:** `assets/js/legal/` (ver la sección 9.6 de `DOCUMENTACION.md`, que explica también cómo sumar un país). Las fuentes de lo que se afirma como requisito legal están en `legal/FUENTES.md`.
- **Banner de cookies:** en la primera visita, sin tapar el título ni los filtros: "Aceptar todas", "Rechazar todas" y "Configurar" (necesarias, medición y publicidad). Nada de medición ni publicidad se carga antes de aceptar. Google con Consent Mode v2 básico; la señal Global Privacy Control rechaza la publicidad. La elección dura 6 meses y se cambia desde "Preferencias de cookies" en el pie.
- **Pop-up:** el aviso corto y dos casillas sin marcar: la obligatoria ("Soy mayor de 18 años y autorizo el tratamiento de mis datos…") y la opcional de promociones. El lead lleva los campos de consentimiento.

### Guía corta para GHL

1. Crear los campos de consentimiento (lista de arriba) y mapearlos en Create/Update Contact.
2. **API de Conversiones:** antes de enviar el evento a Meta, revisar `consentimiento_publicidad` (si la tienda dejó "Sí" en el paso 5, solo con `true`).
3. **Promociones:** solo a contactos con `consentimiento_promociones` en `true`.
4. **Horarios** de los workflows de promociones (Ley 2300 de 2023): lunes a viernes de 7:00 a 19:00 y sábados de 8:00 a 15:00; nunca domingos ni festivos. Las franjas no se pudieron verificar en la fuente (ver `legal/FUENTES.md`).
5. **Conservación:** borrar o anonimizar a los 2 meses del último contacto a quien no compró.

## Píxel de Meta

- El ID sale de la tienda (Legales → Herramientas) y solo se carga si la persona acepta las cookies de publicidad.
- Eventos:
  - `PageView` al cargar.
  - `ViewContent` al abrir un detalle.
  - `Lead` al confirmarse el envío, con `eventID` = código de cotización.

  `ViewContent` y `Lead` llevan `content_name`, `content_ids`, `value` y `currency: "COP"`.
- No se dispara `Purchase` ni se manda a Meta ningún dato personal.

## Decisiones que tomé (revisar)

- **Back-end Supabase** en lugar de AI Studio Cloud: ver arriba.
- **"Cantidad disponible"** (contador y lista de modelos) = **cantidad de equipos con stock**. El stock es sí/no ("Con stock" / "Sin stock"), así que no hay unidades que sumar.
- **El detalle se abre solo debajo** cuando los **tres** filtros están elegidos y queda una sola tarjeta. Así lo leo en el prompt.
- **Los filtros de la URL se respetan aunque no haya stock.** Un anuncio de un equipo agotado lleva al estado vacío con "Consultar por WhatsApp". Un `modelo` que no existe o está inactivo se ignora.
- **Datos demo:** para que se vean, `0003_demo.sql` activa los 4 modelos que usan. Quedan marcados con `activo_por_demo`. El resto del catálogo (`0002` y `0006`) queda inactivo, como pide el prompt.

  "Borrar datos de demostración" vuelve a apagar esos 4 modelos, salvo que la tienda los haya tocado. Los precios demo son redondos y no son reales.
- **Generación más nueva** = la que tiene el mayor "orden" en el catálogo. Así el iPhone Duo (Plegable) queda primero y los modelos nuevos se ordenan solos.
- **Los usados piden batería y estado estético obligatorios**, porque van en la ficha y en el mensaje. El nombre del color también es obligatorio.
- **Al renombrar un modelo no cambia su slug**, para no romper enlaces de anuncios ya publicados.
- **Legales (`0016`):** lo que la tienda había escrito en sus textos pasa a la cláusula propia de cada documento; el demo empieza sin publicar (muestra el bloqueo); el ID del píxel es obligatorio para publicar; la devolución del retracto dice 15 días calendario (no 30), por la Ley 2439 de 2024; Clarity en modo estricto se elige en su panel (el sitio además marca el formulario para que no lo grabe). Más en la sección 16 de `DOCUMENTACION.md`.
- **Si la tienda no tiene WhatsApp:** el pop-up avisa "Esta tienda todavía no tiene WhatsApp configurado." y no ofrece el botón.
- **HEIC:** el iPhone normalmente lo convierte a JPEG al elegir la foto, y Safari también lo lee. En otros navegadores, un `.heic` se rechaza con un aviso. No agregué un conversor, porque pesa cerca de 1 MB.
- **Ficha técnica:** viene precargada con lo que traen los archivos de Jared (migración `0012`); lo que no traen queda vacío. En el sitio, "Ver ficha técnica" solo aparece si la tienda la muestra, y solo con las categorías encendidas que tienen valor.

## Pruebas

Todas corren en este repo sin Docker. La última corrida pasó completa.

| Prueba | Qué cubre | Cómo correrla |
|---|---|---|
| `tests/sql/probar.sh` | Migraciones en un Postgres local:<br>- Seguridad a nivel de fila por rol (público, sin perfil, inactivo, gestor, administrador), siempre un administrador activo, catálogo y colores<br>- Validaciones<br>- Fecha de precios<br>- Borrar demo<br>- La semilla del SQL coincide con la del modo demo<br>- Legales: migración, publicación con versión del servidor, bloqueo, y lo que falta igual en SQL y JS | `bash tests/sql/probar.sh` |
| `tests/paises.test.mjs` | Los datos de país sin navegador: precio por moneda, fechas por zona horaria, celular y WhatsApp por país | `node tests/paises.test.mjs` |
| `tests/pagos.test.mjs` | Formas de pago (3 casos): claves del check, grupos por país, descuentos y frases | `node tests/pagos.test.mjs` |
| `tests/envios.test.mjs` | Envíos (3 casos): reglas con sus mensajes y frases del sitio, también en portugués | `node tests/envios.test.mjs` |
| `tests/i18n.test.mjs` | Diccionarios es/pt (5 casos): mismas claves y variables, ninguna vacía, toda clave del código existe, el HTML igual al español, usted / você | `node tests/i18n.test.mjs` |
| `tests/legal/motor.test.mjs` | El motor legal sin navegador (15 casos): faltantes por perfil y tipo de persona, validaciones, países, datos y plazos en los textos, sin marcas, relación con Apple, herramientas, versión | `node tests/legal/motor.test.mjs` |
| `tests/verificar.cjs` | 84 casos en modo demo (85 con `ICT_CAPTURAS`; la lista completa está en la sección 14.2 de `DOCUMENTACION.md`):<br>- Las 11 pruebas de aceptación de la sección 12<br>- Pop-up: errores, reintento y fallo doble<br>- Panel: validaciones<br>- Ancho de 320 a 1440 px<br>- Carrusel con dedo, flechas, puntos y teclado<br>- Contraste AA en 4 combinaciones de colores<br>- Textos de 16 px o más y zonas táctiles de 44 px<br>- Teclado en la lista<br>- `prefers-reduced-motion`<br>- Píxel y formatos<br>- Espacios, más vendido, pestañas de Catálogo, ficha técnica, formas de pago y reseñas<br>- Legales: asistente, bloqueo sin publicar, documentos, republicación, banner de cookies (red, GPC, preferencias) y las casillas del pop-up<br>- Página de solicitudes (PQR con radicado)<br>- Tienda de Argentina (pie, casilla de la transferencia, solicitudes y paso 4) | `python3 -m http.server 8080 &`<br>`NODE_PATH="$(npm root -g)" node tests/verificar.cjs` |
| `tests/funciones/probar.sh` | `enviar-lead` con Deno contra un webhook de GHL simulado (14 casos):<br>- Campos, también los de consentimiento<br>- Validaciones (sin autorización de datos, sin versión o con fecha sin zona: 400)<br>- GHL caído<br>- Falta de secreto<br>- Orígenes | `DENO=/ruta/deno bash tests/funciones/probar.sh` |
| `tests/verificar-supabase.cjs` | 13 casos del modo Supabase de punta a punta contra un "Supabase local": Postgres, el servidor de auth oficial (GoTrue v2.180.0), PostgREST 12.2.3, las dos funciones en Deno, un SMTP simulado que guarda los correos y Storage **simulado**. Cubre:<br>- Sitio y pop-up → función → webhook<br>- Permisos del panel<br>- Precio → sitio, foto y borrar demo<br>- Invitar por el panel → correo en español → enlace → "Cree su contraseña" → entra<br>- Recuperar la contraseña con el enlace del correo<br>- Desactivar (no puede entrar) y reactivar<br>- Ficha técnica y formas de pago por la RPC, reseñas con Storage, y legales (bloqueo, publicación con versión y fecha del servidor, consentimiento en el lead) | `BIN=/carpeta/con/postgrest,auth,deno bash tests/supabase-local/levantar.sh`<br>`NODE_PATH=… node tests/verificar-supabase.cjs` |

Variables útiles:

- `ICT_SOLO="carrusel|pop-up"`: corre solo los casos que coinciden.
- `ICT_CAPTURAS=1`: guarda capturas en `tests/capturas/`.
- `HTTPS_PROXY`: si la red sale por proxy.
- `ICT_SUPABASE_JS=/ruta/supabase-js.mjs`: sirve un paquete local de supabase-js si el CDN no está disponible.

**Lo que no pude probar aquí:**

- El Storage real de Supabase: sus reglas sí están probadas en SQL.
- Los correos y la función `usuarios` en un Supabase real (en el local, con el servidor de auth oficial, sí funcionan).
- La conexión real con GHL.
- El script de seguimiento de GHL.

**Lighthouse móvil** (cierre de la ronda 3, 3 corridas con un servidor que comprime, `tests/lighthouse/medir.sh`; legales publicados, banner de cookies y globo de ayuda):

- Rendimiento: 99–100.
- Accesibilidad: 100.
- Buenas prácticas: 100.
- LCP: 1,3–1,6 s.
- CLS: 0,045.

Con la franja de modo demo el rendimiento es 91 y el CLS 0,19, porque la franja aparece al cargar los datos. Sin modo demo es lo que ve el público de una tienda real.

**Peso del sitio público:** unos 153 KB sin comprimir y unos 37 KB con gzip en modo Supabase, sin contar fuentes ni fotos.

## Pendientes

Del documento del prompt:

- [ ] [PENDIENTE: fuentes legales que no se pudieron abrir desde el entorno; la lista y su estado están en legal/FUENTES.md.]
- [ ] [PENDIENTE: crear en GHL los campos de consentimiento y seguir la guía corta de Legales.]
- [ ] [PENDIENTE: cookies del script de seguimiento externo de GHL, si se activa: no están verificadas ni en la Política de cookies.]
- [ ] [PENDIENTE: confirmar en apple.com/co los nombres del catálogo maestro, en especial del 11 al 17, iPhone Air e iPhone Duo.]
- [ ] [PENDIENTE: completar en las fichas técnicas lo que la fuente no trae (batería en todos, y otros datos que lista la sección 17 de DOCUMENTACION.md).]
- [ ] [PENDIENTE: confirmar con cada tienda si su precio es de contado, para configurar etiqueta_precio.]
- [ ] [PENDIENTE: crear en GHL los campos personalizados (condicion, equipo_id, tipo_consulta y los demás) y el workflow con Inbound Webhook.]

Nuevos por este cambio de plataforma:

- [ ] [PENDIENTE: decidir el plan de Supabase por tienda y quién lo paga. Ver precios en supabase.com/pricing. El plan gratuito tiene límites y pausa proyectos sin actividad: verificar las condiciones vigentes antes de usarlo con una tienda real.]
- [ ] [PENDIENTE: SMTP propio para los correos de Supabase.]
- [ ] [PENDIENTE: probar el script de seguimiento externo de GHL con el pop-up, si se quiere la atribución nativa.]
