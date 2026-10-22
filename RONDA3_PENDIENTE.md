# Ronda 3: lo que falta (D y E–I). Traspaso a otro constructor de código

> **Para el LLM que siga:** este archivo dice exactamente qué falta de la ronda 3 de la Cotizadora I.C.T., cómo está hecho lo que ya existe y cómo trabajar en este repo. Antes de tocar nada, lea `CLAUDE.md` completo, el `README.md` y las secciones 1, 3, 5 y 18 de `DOCUMENTACION.md`.
> Cuando termine todo, borre este archivo, sáquelo de la sección 5 de `DOCUMENTACION.md` y anótelo en el registro de cambios (sección 19).

Fecha: 22/10/2026 · Repo: `jaredmarketingmaster/Cotizadora-ICT` · Rama: `claude/gallant-euler-ezco6g` (subir con `git push -u origin claude/gallant-euler-ezco6g`; **no abrir PR**).

---

## 0. Estado: lo que ya está hecho y subido

Un commit por punto, todos con las pruebas pasando:

| Punto | Commit | Qué |
|---|---|---|
| A1 | `7816fbb` | Retracto: medio de la devolución (Ley 2439 de 2024). |
| A2 | `99eef0d` | Sin plazo de entrega, los términos dicen el máximo legal de 30 días. |
| A3 | `2047ba2` | Argentina en la lista de países adecuados de la SIC. |
| B1 | `b942886` | `tienda.pais` (0018) y WhatsApp según el país. |
| B2 | `374c4fc` | Precios, fechas, celular, WhatsApp y píxel según el país. |
| B3 | `78fd40b` | Legales solo con el módulo del país de la tienda (0019). |
| B4 | `5ce3d33` | Idioma es / pt-BR (0020): `assets/js/i18n/` (es.js, pt.js, i18n.js). |
| B5 | `eaa51be` | Título del sitio editable (0021). |
| C1 | `c12d7a6` | Hex aproximado para colores sin hex (0022). |
| C2 | `7e589b8` | Pestaña Envíos (0023). |
| C3 | `2919a8d` | Pasarelas por país, otras con nombre, descuentos (0024). |
| C4 | `3260fab` | Archivo XML de productos y función `catalogo-feed` (0025). |
| D | `06c39fb` | Carga de equipos en lote (0026): `panel/lote.js`, `crear_equipos_lote`, `archivos_en_uso`. |
| E | `b211b96` | Botón "Ver intro" en Inicio (`prepararIntro` en `panel.js`). |
| F | (este commit) | Globo de ayuda en el sitio (`sitio/ayuda.js`). |

**Falta:** G (`assets/videos/LEAME.md`), H (`catalogo/FALTANTES.md`), I (pruebas finales, Lighthouse, documentación y reporte final).

Números al día de hoy:
- Próxima migración: **`0027_…sql`**.
- Versión del demo: **21** (`VERSION` en `assets/js/datos/demo.js`). La próxima migración del demo es `MIGRACIONES[21]` y sube `VERSION` a 22.
- Suite demo: **79 casos**. Suite Supabase: **13 casos**.
- Diccionarios: **1152 claves**.

---

## 1. Cómo se trabaja en este repo (obligatorio)

### 1.1 Reglas que no se rompen

Son las de la sección 3 de `DOCUMENTACION.md` y las de `CLAUDE.md`:
- Español de Colombia con **"usted"**, y portugués de Brasil con "você".
- **Ningún texto visible suelto en el código:** todo va en `assets/js/i18n/es.js` y `pt.js` (mismas claves) y se usa con `t(clave, vars)` / `tn(clave, n)` de `assets/js/i18n/i18n.js`. `t()` se llama al usar el texto, nunca al cargar el módulo.
- Nada gráfico de Apple: sin logo, sin imágenes, sin íconos.
- No inventar datos, especificaciones, colores, precios ni plazos.
- Textos de 16 px o más y zonas táctiles de 44 px o más.
- Contraste AA y `prefers-reduced-motion` respetado.
- Sin librerías en el sitio público; sin build ni npm en producción.
- Datos personales de clientes **nunca** en Supabase ni en el píxel.
- No disparar `Purchase`. No abrir pop-ups que nadie pidió.

### 1.2 Base de datos

- Siempre una migración nueva, numerada desde la siguiente libre (`0026`).
- El demo (`demo.js`) repite **las mismas reglas** y sube `VERSION`, con su `MIGRACIONES[n]` que repite la migración SQL.
- Si cambia la semilla, se actualizan `semilla.js` y `tests/sql/comparar-semilla.mjs`.
- Las pruebas SQL viven en `tests/sql/pruebas.sql`, con bloques `do $$ … $$`. Si hace falta probar una migración con datos de antes, se pone el archivo `tests/sql/antes_<migración>.sql`.

### 1.3 Commits

- Un commit por punto, con mensaje en español: "Ronda 3, D: …".
- Terminar el mensaje con:
  ```
  Co-Authored-By: Claude Opus 5.5 <noreply@anthropic.com>
  Claude-Session: https://claude.ai/code/session_019w7KJWrdJhb2V8RMpaRDzK
  ```
  (O la atribución que corresponda al LLM que siga.)

### 1.4 DOCUMENTACION.md

Va en el **mismo commit** que el cambio. El hook `Stop` y `node tests/documentacion.mjs` lo exigen. En cada commit:
- Sección 5: todo archivo nuevo.
- La sección temática que corresponda.
- Pendientes (17).
- La fecha de arriba.
- Una entrada nueva arriba de todo en la sección 19 (pedido → hecho → decisiones → pruebas (nuevas y cambiadas, y por qué) → verificación).

Hay que actualizar también los conteos en `README.md` y `CLAUDE.md` (casos de la suite, próxima migración).

### 1.5 Pruebas

No se debilitan ni se borran. Si una prueba deja de tener sentido, se reemplaza por una equivalente y se explica en la sección 19 con la palabra **cambiado**.

### 1.6 Arquitectura que hay que conocer para D–F

**Capa de datos.** `assets/js/datos/api.js` elige `demo.js` (localStorage `cotizadora-demo:v1` + IndexedDB para los archivos) o `supabase.js`. Las dos tienen la misma interfaz:

```
iniciar cargarPublico enviarLead sesionActual iniciarSesion cerrarSesion recuperarClave cambiarClave tipoDeEnlace
leerTienda guardarTienda listarModelos guardarModelo agregarModelo listarColores guardarColor agregarColor borrarColor
listarFichas guardarFicha listarResenas agregarResena guardarResena borrarResena
listarEquipos crearEquipo actualizarEquipo borrarEquipo subirArchivo borrarArchivos borrarDatosDemo reiniciarDemo
listarUsuarios invitarUsuario cambiarEstadoUsuario cambiarRolUsuario   + urlArchivo(bucket, ruta), tipo ("demo"|"supabase")
```

**Equipos.**
- Campos (`CAMPOS_EQUIPO` en `comun.js`): `modelo_id, condicion, capacidad, color_id, color_nombre_mostrar, precio, en_stock, fotos, video, publicado, destacado, mas_vendido, descripcion_extra, es_demo, bateria_porcentaje, estado_estetico, detalles, incluye`.
- Validaciones del demo: `validarEquipo`, `validarColorEquipo` y `validarMasVendido` en `demo.js`.
- En el SQL: `0001`, `0008` (color oficial), `0009` (video), `0010` (`limitar_mas_vendidos`, máximo 3).

**Archivos.**
- Fotos en el bucket `fotos`, en dos tamaños: `ruta.webp` (máx. 1600 px) y `ruta-640.webp` (`rutaMiniatura`), comprimidas con `comprimirFoto` (`panel/imagenes.js`).
- Video en el bucket `videos`, validado con `validarVideo` (`panel/video.js`: MP4 H.264 o WebM, 15 s, 20 MB).
- Al borrar un equipo o quitar una foto se llama `api.borrarArchivos(bucket, rutas)` (`panel/inventario.js`, líneas ≈190 y ≈670).

**Formulario de un equipo** (`panel/inventario.js` → `formulario(vista, ctx, {modo, id, desde})`):
- Va por pasos al agregar. Los pasos son `PASOS = ["modelo", "condicion", "capacidad", "color", "precio", "fotos", "usado", "publicar"]`.
- Es completo al editar o duplicar. **Editar y Duplicar no cambian** en D.

**Panel.**
- Rutas por hash (`#/inventario`, `#/inventario/nuevo`, `#/inicio`…) en `panel/panel.js`.
- Ayudantes en `panel/ui.js`: `$, $$, esc, avisar, confirmar, conBoton, campoTexto, marcarError, enfocarPrimerError, interruptor`.

**Sitio.**
- Arranque en `assets/js/sitio/principal.js` → `iniciar()`.
- Barra fija de compra en celular: `#barra-compra`.
- Banner de cookies en `sitio/consentimiento.js` (`.banner-cookies`, `.banner-cookies-caja`).
- WhatsApp de la tienda válido según `whatsappValido(tienda.whatsapp, tienda.pais)` (`assets/js/datos/paises.js`).
- Enlace de WhatsApp con `enlaceWhatsApp` (`sitio/catalogo.js`).

### 1.7 Cómo verificar

```bash
python3 -m http.server 8080 &                                   # servidor para la suite
node tests/documentacion.mjs
bash tests/sql/probar.sh                                        # necesita Postgres 15+ local
node tests/legal/motor.test.mjs && node tests/paises.test.mjs && node tests/i18n.test.mjs
node tests/envios.test.mjs && node tests/pagos.test.mjs && node tests/feed.test.mjs
NODE_PATH="$(npm root -g)" node tests/verificar.cjs             # 70 casos (Playwright + Chromium)
ICT_SOLO="C4|B4" ICT_LINEAS=20 ICT_PILA=1 NODE_PATH="$(npm root -g)" node tests/verificar.cjs   # filtrar, más líneas, pila
DENO=/ruta/deno bash tests/funciones/probar.sh                  # funciones enviar-lead y catalogo-feed
# Supabase local (README, "Probar el modo Supabase en local"): tests/supabase-local/levantar.sh + tests/verificar-supabase.cjs (12 casos)
```

**Ayudantes de `tests/verificar.cjs`:**
- `nueva(ancho, alto, {legales, cookies, ...})`: con `cookies: null` aparece el banner.
- `ir(p, ruta)`, `editarDemo(p, fn)`, `entrarPanel(p, "gestor@demo.co")`, `publicarLegales`, `publicarLegalesCon`, `llenarPopup`, `textoLegal`, `captura`, `contrasteMalo`.
- `p.errores`: la suite falla si hay errores en la consola. Una clave i18n que falta da `console.error`.
- El caso B4 recorre el sitio y el panel en portugués buscando palabras de la interfaz en español: **sume ahí las rutas o pantallas nuevas** (lote, intro, globo).

---

## 2. D. "Agregar equipo" pasa a ser un asistente de carga en lote

### 2.1 Pedido de Jared

"Agregar equipo" deja de crear un equipo y pasa a ser un asistente que crea **varios equipos de una vez**.

**Pasos:**
1. **Modelo.**
2. **Condición** (nuevo o usado).
3. **Capacidades:** se pueden elegir varias, más "Otra" (escrita a mano).
4. **Grilla de capacidades × colores.**
   - Interruptores, todos encendidos al empezar.
   - Marcar o desmarcar una fila o una columna entera.
   - Contador en vivo: "Se crearán N equipos."
   - Modelo sin colores (iPhone 17 Pro y 17 Pro Max): un equipo por capacidad.
   - Usados: "Unidades", de 1 a 20 por combinación.
   - Por color, un nombre opcional para el cliente (`color_nombre_mostrar`).
5. **Precio.**
   - "Mismo precio para todas las variantes", encendido por defecto.
   - Apagado: una tabla con un precio por variante y el botón "Copiar a toda la capacidad".
   - Stock: un valor general y excepciones.
6. **Fotos y video por color**, compartidos entre las capacidades: 6 fotos y 1 video por color.
7. **Usados:** batería, estado estético, etc.
   - "Aplicar lo mismo a todo el lote", o bloques por unidad.
8. **Publicación:**
   - publicado y destacado;
   - más vendido, solo si el total del lote es de 3 o menos;
   - descripción extra.
9. **Resumen final:** la lista de lo que se va a crear.

**Reglas:**
- **Todo o nada.** En SQL, una función que crea el lote en una transacción; en el demo, lo mismo. Si falla, se borran los archivos ya subidos.
- **Archivos compartidos.** Un archivo que usa más de un equipo se borra de Storage solo si ningún otro equipo lo usa. Vale también para la edición individual de un equipo y para el demo.
- **Validaciones.** Las mismas de un equipo, para cada equipo del lote. El error dice qué variante falló.
- **Rendimiento.** Un lote de 36 equipos no congela el panel.
- **Editar y Duplicar** no cambian.

### 2.2 Cómo hacerlo (propuesta coherente con el código)

**Migración `0026_lote.sql`:**
- `create function public.crear_equipos_lote(equipos jsonb) returns setof public.equipos`, `security invoker`.
  - Inserta todos en la misma transacción (una función SQL ya es atómica): si un insert falla, no queda ninguno.
  - Respeta RLS (solo el gestor) y los disparadores existentes (color oficial `0008`, video `0009`, `limitar_mas_vendidos` `0010`, fecha de precios).
  - Devuelve los creados.
  - Para que el mensaje diga qué variante falló, recorrer con `for i in 0..jsonb_array_length-1` y capturar la excepción con `exception when others then raise exception '%', format('Variante %s: %s', i + 1, sqlerrm) using errcode = sqlstate;`. Si captura y vuelve a lanzar, la transacción se revierte igual.
  - `grant execute … to authenticated`.
- **Archivos compartidos:** una función `public.archivo_en_uso(ruta text) returns boolean` (si hay otro equipo cuyas `fotos` contienen la ruta, o cuyo `video` es la ruta), o la consulta directa desde `supabase.js` antes de `borrarArchivos`.

**Demo (`demo.js`):**
- `crearEquiposLote(lista)` (agregarla también a `supabase.js` con la RPC):
  1. Valida **todos** los equipos sobre una copia (`validarEquipo`, `validarColorEquipo`, `validarMasVendido` contando los ya marcados más los del lote).
  2. Si alguno falla, lanza `ErrorDatos` con "Variante N: …" y no escribe nada.
  3. Si todos pasan, hace un solo `escribir(e)`.
- Subir `VERSION` a 22 solo si cambia la forma de los datos. Si no cambia, no hace falta migración del demo.

**Panel:**
- Archivo nuevo `panel/lote.js`, cargado por la ruta `#/inventario/nuevo`. `inventario.js` conserva `formulario` para editar y duplicar.
- Las fotos se suben **una sola vez por color**, con `comprimirFoto` y `subirArchivo`, y su ruta se repite en todos los equipos de ese color.
- Si la creación falla, `api.borrarArchivos` de lo subido en este lote.
- Al borrar un equipo o quitar una foto (en `inventario.js`, también en edición), antes de `borrarArchivos` se filtran las rutas que **otro equipo todavía usa** (`listarEquipos()` y la comparación en el demo; la RPC o la consulta en Supabase).
- Para no congelar con 36 equipos:
  - una sola llamada a la RPC;
  - pintar la grilla con `innerHTML` de una vez;
  - comprimir las fotos de a una con `await` (ya es así) y mostrar el progreso;
  - nada de un `crearEquipo` por variante en serie con re-render.
- Contador "Se crearán N equipos." con `tn("panel.lote.contador", n)` en un `role="status"`.

**Textos:** todos en es.js y pt.js (prefijo sugerido `panel.lote.`), con "usted" y "você".

### 2.3 Pruebas que pide Jared (punto I)

- La grilla y el contador.
- Las unidades de los usados.
- Un mismo precio para todas las variantes y un precio por variante ("Copiar a toda la capacidad").
- Las fotos compartidas por color.
- Todo o nada: forzar un fallo, por ejemplo una variante con precio 0 o una cuarta "más vendido" → no se crea ninguno y los archivos subidos se borran.
- Un archivo compartido no se borra mientras otro equipo lo use, tampoco desde la edición individual.
- Más vendido solo con 3 o menos.
- 36 equipos sin congelar: medir el tiempo de la creación y que la página responda, por ejemplo con un `evaluate` durante la creación.
- En `pruebas.sql`: la función del lote, todo o nada y el mensaje con la variante.
- El caso B4 en portugués con el asistente.

---

## 3. E. Botón "Ver intro" en Inicio

**Pedido:**
- Botón "Ver intro" en Inicio, al lado de "Ver mi sitio".
- Color violeta, con el texto en contraste AA.
- Abre un `<dialog>` con `assets/videos/intro-panel.mp4`: `controls`, sin autoplay, `preload="none"`, se cierra con Escape.
- **Si el archivo no existe, el botón no aparece.**

**Cómo:**
- "Ver mi sitio" hoy está en la barra superior (`admin/index.html`) e Inicio se dibuja en `panel/panel.js` → `vistaInicio`. Ponga el botón donde quede al lado de "Ver mi sitio".
- Para saber si el video existe: un `fetch(url, { method: "HEAD" })` liviano al dibujar Inicio (decisión aprobada en el plan). Si responde `ok`, se muestra.
- Agregar un token de color violeta en `assets/css/base.css`, con su versión para el tema oscuro, y medir el contraste con `contraste()` de `utils.js`.
- El `<dialog>` lleva título accesible, foco atrapado nativo y botón "Cerrar". Al cerrarlo, se pausa el video y se devuelve el foco al botón.
- Textos en es.js y pt.js.

**Pruebas:**
- Sin el video, el botón no está y no hay errores.
- Con un video simulado (`p.route` del `.mp4` respondiendo 200 a HEAD y GET), el botón aparece y el diálogo abre con `preload="none"`, `controls` y sin `autoplay`.
- Escape cierra el diálogo.
- El contraste del botón es AA (hay un caso de contraste en la suite: sumarlo ahí).

---

## 4. F. Globo de ayuda en el sitio público

### 4.1 Pedido de Jared

**Posición y aspecto:**
- Fijo abajo a la derecha, círculo de 56 px con "?" y `aria-label` "Ayuda para comprar".
- **No tapa** la barra fija de compra (queda arriba de ella) ni los botones del banner de cookies (queda arriba o se oculta mientras el banner está abierto).
- **Onda de radar** cada 3 s, solo con `transform` y `opacity`; nada con `prefers-reduced-motion`.
- **Nunca se abre solo.**

**Diálogo:**
- Diálogo accesible (Escape y foco atrapado) con el título "¿Tiene problemas para comprar o no encuentra el modelo que busca?".
- Pregunta "¿Está en el celular o en la computadora?" con los botones "Celular" y "Computadora":
  - "Celular" → video `assets/videos/ayuda-celular.mp4` (vertical);
  - "Computadora" → `assets/videos/ayuda-computadora.mp4` (horizontal).
  - `controls`, `preload="none"`, sin autoplay.
  - **Si el video no existe, se pasa directo al texto.**
- Texto: "Si el cotizador no funciona o ningún botón responde, escríbale directamente a la tienda."
- Botón "Escribir a la tienda por WhatsApp" → `wa.me` con el mensaje **exacto** "Hola, el cotizador está roto y no pude utilizarlo. Quiero comprar directamente por aquí."

**Reglas:**
- No pide datos. **No dispara eventos del píxel.**
- **Si la tienda no tiene un WhatsApp válido, el globo no aparece.**
- Textos en es.js y pt.js. El mensaje de WhatsApp en portugués es la traducción fiel del español.

### 4.2 Cómo hacerlo

- Archivo nuevo `assets/js/sitio/ayuda.js` (`iniciarAyuda({ tienda })`), llamado desde `principal.js` después del consentimiento, dentro de `seguro(...)`.
- Que sea liviano y no cambie el LCP ni el CLS: el botón con `position: fixed`, sin empujar nada.
- Para no tapar la barra: medir `#barra-compra` cuando está visible y subir el globo con una variable CSS (`--ayuda-abajo`). Para el banner: mientras `.banner-cookies` esté visible, ocultar el globo o subirlo arriba de la caja.
  - `consentimiento.js` ya tiene `mostrarSinTapar`, que mide el banner: se puede reutilizar la idea, o escuchar sus cambios con un `MutationObserver` sobre el `hidden` del banner.
- Radar: un `::after` con `@keyframes` de `transform: scale()` y `opacity`, con `animation-duration: 3s; animation-iteration-count: infinite`. Dentro de `@media (prefers-reduced-motion: no-preference)`.
- Existencia del video: comprobarla al elegir "Celular" o "Computadora" (decisión del plan: el globo siempre visible y el video se revisa al elegir), con un HEAD o con el evento `error` del `<video>`. Si falla, se muestra el texto.
- El mensaje de WhatsApp va con `encodeURIComponent` al `wa.me/<whatsapp de la tienda>?text=…`.

### 4.3 Pruebas

- Sin video no se rompe nada.
- `preload="none"`.
- No tapa la barra de compra (rectángulos sin superposición en 360×800 con la barra visible) ni los botones del banner.
- La animación dura 3 s (`getComputedStyle(…, "::after").animationDuration === "3s"`).
- Con `reducedMotion: "reduce"` no hay animación.
- El mensaje de WhatsApp exacto (comparar el `wa.me` capturado: `nueva()` ya captura los `wa.me` que se intentan abrir).
- Nunca se abre solo (esperar varios segundos y que el diálogo siga cerrado).
- Sin WhatsApp válido, no aparece.
- No hay eventos nuevos en `window.fbq.queue`.
- Zona táctil de 56 px y contraste.
- En portugués (caso B4).

---

## 5. G. `assets/videos/LEAME.md`

**Pedido:**
- El archivo lista los videos que se pueden subir: `intro-panel.mp4`, `ayuda-celular.mp4` (vertical) y `ayuda-computadora.mp4` (horizontal).
- Formato MP4 H.264 y el tamaño sugerido (por ejemplo, 1080×1920 el vertical, 1920×1080 el horizontal, de menos de 20 MB cada uno).
- Aclara que **nada se rompe hasta que existan**.

Agregarlo a la sección 5 de DOCUMENTACION. Los `.mp4` **no** se suben al repo.

---

## 6. H. `catalogo/FALTANTES.md`

**Pedido:** una lista, modelo por modelo, con preguntas concretas para Jared sobre lo que falta en el catálogo. La salen de `assets/js/datos/semilla.js` (`CATALOGO`, `COLORES`, `FICHAS`) y de la sección 17 de DOCUMENTACION.

**Contenido:**

**1. Por modelo:**
- Colores sin nombre en inglés: por ejemplo, iPhone 17 (Blanco, Negro), 17e (Negro, Blanco), 18 Pro / Pro Max (Negro, Visón, Oliva, Azul nítido, Magenta, Plata) y Duo (Titanio). Están los que tienen `nombre_en: ""` en `COLORES`.
- iPhone 17 Pro y 17 Pro Max **sin colores**: preguntar cuáles son.
- Batería: ninguna ficha la trae.
- Cámara frontal, dimensiones y peso, y descripción, donde falten (revisar las claves de `FICHAS` por modelo frente a `CATEGORIAS_FICHA`).
- Cámaras del iPhone Duo.
- Lo que anota la sección 17.

**2. Conflicto de colores del iPhone 18 Pro:**
- Outlook Business dice negro, plata, glaciar y borgoña:
  <https://www.outlookbusiness.com/corporate/apple-iphone-18-pro-iphone-18-pro-max-to-be-available-in-india-from-sep-18>
- La fuente de Jared agrega Visón, Oliva, Azul nítido y Magenta.
- Preguntar cuál vale.

**3. Hexadecimales aproximados de C1:** la lista completa de `HEX_APROXIMADOS` (`semilla.js`: 34 nombres, 151 colores), aclarando que no son oficiales y pidiendo los reales.

**4. Tabla en blanco** con el formato exacto para devolver las respuestas y armar una migración nueva. Por ejemplo:

```
| slug del modelo | color (nombre_es) | nombre_en | hex (#RRGGBB) | fuente (URL) |
|---|---|---|---|---|
| iphone-17-pro |  |  |  |  |

| slug del modelo | categoría de ficha (clave) | valor | fuente (URL) |
|---|---|---|---|
| iphone-17 | bateria |  |  |
```

Agregarlo a la sección 5 de DOCUMENTACION. En el reporte final, dar su ruta: `catalogo/FALTANTES.md`.

---

## 7. I. Pruebas, Lighthouse y cierre

### 7.1 Lo que pidió Jared que cubran las pruebas

| Pedido | Estado |
|---|---|
| País y moneda (ARS, COP, BRL, MXN); celular por país; moneda del píxel; zona horaria | **Ya cubierto** (B1/B2, `tests/paises.test.mjs`). |
| Idioma pt en sitio, pop-up, banner y panel; mismas claves; sin tuteo en español | **Ya cubierto** (B4, `tests/i18n.test.mjs`). |
| Título editable y sus valores por defecto | **Ya cubierto** (B5). |
| Colores: los que no tienen hex llevan aproximado, salvo los modelos sin colores; la fuente sin cambios; `hex_aproximado` | **Ya cubierto** (C1). |
| Envíos: validaciones, migración, frases, plazo en los términos | **Ya cubierto** (C2, `tests/envios.test.mjs`). |
| Pagos: claves migradas, pasarelas por país, descuentos que no cambian precios | **Ya cubierto** (C3, `tests/pagos.test.mjs`). |
| XML: válido, solo públicos con foto, precio con moneda, `?equipo=`, descarga en demo | **Ya cubierto** (C4, `tests/feed.test.mjs`, `tests/funciones/probar.sh`). |
| A1–A3 en los textos generados | **Ya cubierto** (`tests/legal/motor.test.mjs`). |
| **Lote:** ver 2.3 | **Falta.** |
| **Intro y globo:** sin video no se rompe nada, `preload="none"`, el globo no tapa la barra ni el banner, radar de 3 s, quieto con reduced-motion, mensaje de WhatsApp exacto, nunca se abre solo | **Falta.** |

### 7.2 Al final, correr todo

- `tests/sql/probar.sh`.
- El motor legal.
- `tests/funciones/probar.sh` (Deno).
- La suite demo completa.
- `tests/verificar-supabase.cjs` contra el Supabase local.
- `node tests/documentacion.mjs`.
- Los tests `.mjs` sin navegador.

### 7.3 Lighthouse móvil

- **3 corridas.** Metas: rendimiento ≥ 90, accesibilidad 100, buenas prácticas 100, CLS < 0,1.
- Medir con un servidor que comprima: `npx serve -l 8090 .`, no con `python3 -m http.server`.
- Chromium del contenedor: `CHROME_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome` (puede variar; buscar en `/opt/pw-browsers`).
- Antes de medir, preparar el demo en ese navegador. En la ronda anterior se hizo con un script de Playwright que:
  1. publica los legales con `tests/legal/datos-prueba.mjs` (copiando las claves `legal_|meta_pixel_id|capi_|plataforma_|envio_`, con `envio_retiro: false`);
  2. borra `cotizadora:cookies` para que se mida con el banner.
  
  Ese script estaba en una carpeta temporal y no está en el repo: hay que rehacerlo.
- El CLS de 0,19 con la franja de modo demo es una limitación conocida (sección 17). Medir también el flujo con la franja y anotarlo.
- **Cuidado en el contenedor:** no poner el texto literal `remote-debugging-port=…` en el mismo comando que un `pkill -f`, porque mata la propia shell. Usar un script aparte o el patrón `[r]emote`.

### 7.4 Cierre de DOCUMENTACION.md

- Secciones, decisiones (16), pendientes (17) y registro de cambios (19).
- Borrar este archivo y sacarlo de la sección 5.

### 7.5 Reporte final para Jared (en español)

- Los commits de la ronda.
- Las decisiones tomadas.
- **Lo que no se pudo verificar:**
  - formatos de celular en 13 países y si México necesita `521`;
  - los campos del XML (Google y Meta), verificados solo con el buscador;
  - políticas de Google y Meta para revendedores no oficiales y usados;
  - pasarelas por país (conocimiento general);
  - hexadecimales aproximados;
  - el despliegue de `catalogo-feed`;
  - las traducciones al portugués (revisar con una persona de Brasil);
  - las fuentes legales no abiertas.
- Las pruebas nuevas y las cambiadas, y por qué (están en la sección 19).
- Los resultados de Lighthouse.
- La ruta de `catalogo/FALTANTES.md`.

---

## 8. Decisiones del plan aprobado que siguen valiendo

- **Tiendas nuevas:** Argentina por defecto. Como no hay módulo legal de Argentina, una tienda de Argentina no puede publicar sus legales y el pop-up queda bloqueado.
- **Tiendas que ya existían:** las que tienen datos de Colombia quedan en `co`. El demo es de Colombia.
- **Precios:** sin decimales en todas las monedas; el XML usa "5299.00 BRL".
- **Celulares sin formato verificado:** validación general de 8 a 15 dígitos, y queda como pendiente.
- **Intro:** "Ver intro" con un HEAD liviano en Inicio.
- **Globo:** siempre visible (con WhatsApp válido); el video se revisa al elegir.
- **Archivos compartidos:** antes de borrar de Storage se revisa si otro equipo los usa, también en la edición individual y en el demo.
- **Pruebas cambiadas en la ronda (ya hechas):**
  - el título literal pasa a ser el título por defecto de cada idioma;
  - el tuteo no se revisa en pt.js;
  - `$5.299.000` pasa a depender de la moneda;
  - más los cambios anotados en cada entrada de la sección 19.
