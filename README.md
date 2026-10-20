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
privacidad/  terminos/     Páginas legales (texto cargado en el panel)
admin/                     Panel de administración
config.js                  ← lo único que cambia por tienda
assets/
  css/base.css             Variables, botones y campos (sitio y panel)
  css/sitio.css · panel.css
  js/utils.js              Formatos ($5.299.000, D/M/AAAA), código COT-, contraste
  js/tema.js               Colores de la tienda → variables CSS (texto con contraste AA)
  js/ilustracion.js        Teléfono genérico en SVG (sin manzana)
  js/datos/                Capa de datos: api.js elige demo.js o supabase.js
  js/sitio/                Filtros, galería, detalle con carrusel, pop-up, píxel, atribución
  js/panel/                Inicio, inventario, mi tienda, fichas, catálogo, legales, usuarios
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
  functions/enviar-lead/        Reenvía el pedido a GHL (la URL va en los secretos)
  functions/usuarios/           Invitar, desactivar y reactivar (solo administrador)
tests/                     Pruebas (no se usan en producción)
```

No hay build, ni npm, ni frameworks. Las dependencias externas son tres:

- Google Fonts (Inter).
- En el panel, `supabase-js` desde jsDelivr, con versión fija.
- El píxel de Meta, solo si se configura.

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
| **Gestor** | Todo lo demás: Mi tienda, Inventario, Fichas, Catálogo completo, Legales, modo demo y "Borrar datos de demostración". No ve Usuarios. |

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
2. En **SQL Editor**, correr en orden:
   - `supabase/migrations/0001_esquema.sql`
   - `0002_catalogo.sql`
   - `0003_demo.sql`

   Con la CLI se puede usar `supabase db push`.
3. En **Authentication → Sign In / Providers**, apagar **Allow new users to sign up**. No hay registro público: solo se entra por invitación.

   Igual, un usuario sin perfil no puede escribir nada: lo bloquean las reglas de la base.
4. En **Authentication → URL Configuration**, poner:
   - **Site URL:** `https://dominio-de-la-tienda/admin/`
   - **Redirect URLs:** `https://dominio-de-la-tienda/admin/**`
5. **Correo:** el correo que trae Supabase tiene un límite de envíos muy bajo y es para pruebas. Para las invitaciones y la recuperación de contraseña, configurar un SMTP propio en **Authentication → Emails → SMTP Settings**.

   Supabase trae las plantillas en inglés. Pegar las de `supabase/correos/` (invitación y recuperación, en español y con "usted") en **Authentication → Emails → Templates**. El `LEAME.md` de esa carpeta dice qué asunto y qué archivo va en cada una.
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
metaPixelId: "<ID del píxel de la tienda>",
```

La clave anon o publishable es pública por diseño: lo que protege los datos son las reglas de seguridad a nivel de fila.

### 3. Publicar

Sirve cualquier hosting estático: Hostinger, Netlify, Cloudflare Pages o GitHub Pages. Se suben los archivos tal cual.

Las rutas `/privacidad/`, `/terminos/` y `/admin/` son carpetas, así que funcionan sin reglas de reescritura.

### 4. Antes de abrir al público

1. Cargar el logo, el WhatsApp y los textos legales.
2. Cargar el inventario y activar los modelos en **Catálogo**.
3. Con el usuario gestor, tocar **Inicio → Borrar datos de demostración**.

## Integración con GHL

**Lo que pedía el prompt:** usar el formulario nativo "Cotizadora I.C.T." y que el código lo complete y lo envíe.

**Por qué no se puede así:** fuera de AI Studio, un formulario nativo de GHL solo se puede incrustar en un iframe de otro dominio. El código de la página no puede completarlo ni enviarlo, y no voy a usar endpoints sin documentar. El prompt pide, en ese caso, avisar y proponer la alternativa más cercana dentro de GHL. Es esta:

**1. Inbound Webhook (el camino principal, probado).** El pop-up manda el pedido a la función `enviar-lead`, que lo reenvía al **Inbound Webhook** de un workflow de GHL y espera la respuesta. En GHL:

1. Crear un workflow con el disparador **Inbound Webhook** y copiar su URL al secreto `GHL_WEBHOOK_URL`.
2. Agregar la acción **Create/Update Contact** y mapear:
   - Los campos estándar: `name`, `email` y `phone` (formato `+57XXXXXXXXXX`).
   - Los campos personalizados: `modelo`, `condicion`, `capacidad`, `color`, `precio_cotizado`, `equipo_id`, `tipo_consulta` (`compra` / `sin stock`), `codigo_cotizacion`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `ad_id` y `fbclid`.
3. El webhook también trae `event_id` (igual al código de cotización y al `eventID` del Lead del píxel), `pagina` y `enviado_en`.

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

## Píxel de Meta

- El ID sale de `config.js`. Si queda vacío, no se carga nada.
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
- **Datos demo:** para que se vean, `0003_demo.sql` activa los 4 modelos que usan. Quedan marcados con `activo_por_demo`. El catálogo de `0002` sí queda todo inactivo, como pide el prompt.

  "Borrar datos de demostración" vuelve a apagar esos 4 modelos, salvo que la tienda los haya tocado. Los precios demo son redondos y no son reales.
- **Generación más nueva** = la que tiene el mayor "orden" en el catálogo. Así el iPhone Duo (Plegable) queda primero y los modelos nuevos se ordenan solos.
- **Los usados piden batería y estado estético obligatorios**, porque van en la ficha y en el mensaje. El nombre del color también es obligatorio.
- **Al renombrar un modelo no cambia su slug**, para no romper enlaces de anuncios ya publicados.
- **Textos de relleno:** si la tienda no cargó la autorización de datos, la casilla dice "Autorizo el tratamiento de mis datos personales." más el enlace a la política. La casilla no puede quedar sin texto. Es propuesta mía: el texto real lo redacta el abogado.
- **Si la tienda no tiene WhatsApp:** el pop-up avisa "Esta tienda todavía no tiene WhatsApp configurado." y no ofrece el botón.
- **HEIC:** el iPhone normalmente lo convierte a JPEG al elegir la foto, y Safari también lo lee. En otros navegadores, un `.heic` se rechaza con un aviso. No agregué un conversor, porque pesa cerca de 1 MB.
- **El texto de "Ver ficha técnica"** y las especificaciones solo se muestran si tienen valor. No se precarga ninguna.

## Pruebas

Todas corren en este repo sin Docker. La última corrida pasó completa.

| Prueba | Qué cubre | Cómo correrla |
|---|---|---|
| `tests/sql/probar.sh` | Migraciones en un Postgres local:<br>- Seguridad a nivel de fila por rol (público, sin perfil, inactivo, gestor, administrador), siempre un administrador activo, catálogo y colores<br>- Validaciones<br>- Fecha de precios<br>- Borrar demo<br>- La semilla del SQL coincide con la del modo demo | `bash tests/sql/probar.sh` |
| `tests/verificar.cjs` | 44 casos en modo demo:<br>- Las 11 pruebas de aceptación de la sección 12<br>- Pop-up: errores, reintento y fallo doble<br>- Panel: validaciones<br>- Ancho de 320 a 1440 px<br>- Carrusel con dedo, flechas, puntos y teclado<br>- Contraste AA en 4 combinaciones de colores<br>- Textos de 16 px o más y zonas táctiles de 44 px<br>- Teclado en la lista<br>- `prefers-reduced-motion`<br>- Píxel y formatos | `python3 -m http.server 8080 &`<br>`NODE_PATH="$(npm root -g)" node tests/verificar.cjs` |
| `tests/funciones/probar.sh` | `enviar-lead` con Deno contra un webhook de GHL simulado:<br>- Campos<br>- Validaciones<br>- GHL caído<br>- Falta de secreto<br>- Orígenes | `DENO=/ruta/deno bash tests/funciones/probar.sh` |
| `tests/verificar-supabase.cjs` | 9 casos del modo Supabase de punta a punta contra un "Supabase local": Postgres, el servidor de auth oficial (GoTrue v2.180.0), PostgREST 12.2.3, las dos funciones en Deno, un SMTP simulado que guarda los correos y Storage **simulado**. Cubre:<br>- Sitio y pop-up → función → webhook<br>- Permisos del panel<br>- Precio → sitio, foto y borrar demo<br>- Invitar por el panel → correo en español → enlace → "Cree su contraseña" → entra<br>- Recuperar la contraseña con el enlace del correo<br>- Desactivar (no puede entrar) y reactivar | `BIN=/carpeta/con/postgrest,auth,deno bash tests/supabase-local/levantar.sh`<br>`NODE_PATH=… node tests/verificar-supabase.cjs` |

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

**Lighthouse móvil** (3 corridas con un servidor que comprime):

- Rendimiento: 91.
- Accesibilidad: 100.
- Buenas prácticas: 100.
- LCP: 1,3–1,4 s.

El CLS es 0,19 con la franja de modo demo, porque aparece al cargar los datos. Sin modo demo, que es lo que ve el público de una tienda real, medí 0,049.

**Peso del sitio público:** unos 153 KB sin comprimir y unos 37 KB con gzip en modo Supabase, sin contar fuentes ni fotos.

## Pendientes

Del documento del prompt:

- [ ] [PENDIENTE: textos de privacidad, términos y autorización de datos (Ley 1581). Los redacta el abogado.]
- [ ] [PENDIENTE: confirmar en apple.com/co los nombres del catálogo maestro, en especial del 11 al 17, iPhone Air e iPhone Duo.]
- [ ] [PENDIENTE: definir quién carga las fichas técnicas y desde qué fuente verificada.]
- [ ] [PENDIENTE: confirmar con cada tienda si su precio es de contado, para configurar etiqueta_precio.]
- [ ] [PENDIENTE: crear en GHL los campos personalizados (condicion, equipo_id, tipo_consulta y los demás) y el workflow con Inbound Webhook.]

Nuevos por este cambio de plataforma:

- [ ] [PENDIENTE: decidir el plan de Supabase por tienda y quién lo paga. Ver precios en supabase.com/pricing. El plan gratuito tiene límites y pausa proyectos sin actividad: verificar las condiciones vigentes antes de usarlo con una tienda real.]
- [ ] [PENDIENTE: SMTP propio para los correos de Supabase.]
- [ ] [PENDIENTE: probar el script de seguimiento externo de GHL con el pop-up, si se quiere la atribución nativa.]
