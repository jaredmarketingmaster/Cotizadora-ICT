# Documentación completa — Cotizadora I.C.T.

> **Para cualquier persona o LLM que reciba este archivo:** aquí está todo el proyecto: qué es, por qué está hecho así, cómo está organizado el código archivo por archivo, cómo fluyen los datos, cómo se prueba, qué falta y qué cambió en cada etapa. Si solo lee una sección, lea la **1** (resumen) y la **3** (reglas). Si va a tocar código, lea también la **5** (mapa de archivos) y la **18** (cómo mantener este documento).
>
> **Este documento se mantiene al día con cada cambio.** El verificador (`node tests/documentacion.mjs`) falla si algún archivo del repo no figura en la sección 5, y el hook de Claude Code (`.claude/hooks/documentacion.sh`) no deja terminar un trabajo con cambios sin actualizarlo. Ver sección 18.

**Última actualización:** 20/10/2026 · **Rama de trabajo:** `claude/gallant-euler-ezco6g` · **Repo:** <https://github.com/jaredmarketingmaster/Cotizadora-ICT> (público)

---

## Índice

1. [Resumen en 30 segundos](#1-resumen-en-30-segundos)
2. [Historia del proyecto: qué se hizo y en qué orden](#2-historia-del-proyecto-qué-se-hizo-y-en-qué-orden)
3. [Reglas que no se rompen](#3-reglas-que-no-se-rompen)
4. [Arquitectura general](#4-arquitectura-general)
5. [Mapa de archivos (todos, uno por uno)](#5-mapa-de-archivos-todos-uno-por-uno)
6. [Modelo de datos y seguridad (Supabase / Postgres)](#6-modelo-de-datos-y-seguridad-supabase--postgres)
7. [Capa de datos del front-end (demo y Supabase)](#7-capa-de-datos-del-front-end-demo-y-supabase)
8. [Sitio público: cómo funciona por dentro](#8-sitio-público-cómo-funciona-por-dentro)
9. [Pop-up, WhatsApp, atribución y píxel](#9-pop-up-whatsapp-atribución-y-píxel)
10. [Panel de administración](#10-panel-de-administración)
11. [Funciones del servidor (Edge Functions)](#11-funciones-del-servidor-edge-functions)
12. [Integración con GoHighLevel (GHL)](#12-integración-con-gohighlevel-ghl)
13. [Diseño, tema, accesibilidad y rendimiento](#13-diseño-tema-accesibilidad-y-rendimiento)
14. [Pruebas](#14-pruebas)
15. [Despliegue: GitHub Pages (demo) y producción por tienda](#15-despliegue-github-pages-demo-y-producción-por-tienda)
16. [Decisiones tomadas y su porqué](#16-decisiones-tomadas-y-su-porqué)
17. [Limitaciones conocidas y pendientes](#17-limitaciones-conocidas-y-pendientes)
18. [Cómo mantener este documento](#18-cómo-mantener-este-documento)
19. [Registro de cambios](#19-registro-de-cambios)
20. [Glosario](#20-glosario)

---

## 1. Resumen en 30 segundos

- **Qué es:** una **plantilla de cotizadora web para tiendas de iPhone** (de Marketing Masters Group, para su sistema I.C.T.). Se clona **una vez por tienda**.
- **El público** llega desde un anuncio de Instagram/Facebook:
  1. Filtra por condición (nuevo/usado), modelo y almacenamiento.
  2. Ve los equipos en una galería y recorre los colores en un carrusel.
  3. Ve la ficha y el precio y toca **"Comprar por WhatsApp"**.
  4. Un pop-up pide nombre, correo y WhatsApp, manda el contacto a **GHL** (el CRM) con el origen del anuncio y abre WhatsApp con el pedido ya escrito.
- **La tienda** gestiona marca, datos, inventario, fotos, fichas técnicas y textos legales desde un **panel privado `/admin`**, sin tocar código.
- **Tecnología:** HTML + CSS + JavaScript vanilla con ES modules. **Sin build, sin npm, sin frameworks** en producción. Tiene dos back-ends intercambiables:
  - **Modo demo:** todo vive en el navegador (localStorage + IndexedDB). Es el modo actual en GitHub Pages.
  - **Modo Supabase:** base de datos Postgres con seguridad a nivel de fila, usuarios, archivos y dos funciones de servidor en Deno. Es el modo de producción.
- **Origen:** nació del documento *"Prompt de la cotizadora I.C.T. v2"* (20/10/2026, de Jared Ezequiel Farfán Borges). Ese prompt era para el **AI Studio de GoHighLevel**. Como no había acceso a AI Studio, se construyó como código con Supabase en lugar de "AI Studio Cloud".
- **Estado (20/10/2026):**
  - Completo y probado en modo demo y contra un "Supabase local".
  - **No conectado todavía** a un Supabase real ni a GHL real.
  - Listo para verse en GitHub Pages una vez que el dueño lo active en Settings → Pages.

---

## 2. Historia del proyecto: qué se hizo y en qué orden

Todo ocurrió el 20/10/2026 en sesiones de Claude Code sobre el repo `jaredmarketingmaster/Cotizadora-ICT`. Al empezar, el repo solo tenía un `README.md` de una línea, del commit inicial `f4c6579` de Jared.

En la misma cuenta existe otro repo, `ICT-MMG`: la landing de venta de I.C.T. Es independiente de este, pero de ahí se tomaron convenciones: trato de "usted", formato colombiano y sitio estático sin build.

### 2.1 Pedido inicial

Jared subió el archivo *Prompt de la cotizadora I.C.T. v2* y pidió: **"crea de 0 a 100% este proyecto"**.

El prompt tiene 13 secciones:

- 0 · Rol
- 1 · Reglas
- 2 · Arquitectura
- 3 · Modelo de datos
- 4 · Sitio público
- 5 · Pop-up y WhatsApp
- 6 · GHL
- 7 · Píxel
- 8 · Panel
- 9 · Diseño
- 10 · Seguridad
- 11 · Fases
- 12 · Pruebas de aceptación
- 13 · Lo que no se debe hacer

### 2.2 Decisiones de arranque

1. **AI Studio → código.** No había acceso a AI Studio de GHL. Se construyó como sitio estático más **Supabase**, que ofrece lo mismo que AI Studio Cloud: base de datos con RLS, usuarios y archivos.
2. **Formulario nativo de GHL → no es posible fuera de AI Studio.** Un formulario de GHL solo se puede incrustar en un iframe de otro dominio; el código de la página no puede llenarlo ni enviarlo. El prompt pide "avisar y proponer la alternativa más cercana dentro de GHL", y la alternativa fue:
   - **Inbound Webhook** de un workflow de GHL, llamado desde una función de servidor.
   - Además, el pop-up es un `<form>` HTML real para que el **script de seguimiento externo** de GHL pueda registrarlo (opcional, sin probar).

   No se pudo leer la ayuda oficial de GHL: el dominio `help.gohighlevel.com` estaba bloqueado en el contenedor. Lo que se sabe salió del resumen de búsqueda de ese artículo.
3. **Dos back-ends con la misma interfaz:**
   - **Demo:** se puede ver y probar todo sin servidor.
   - **Supabase:** es la producción.

### 2.3 Fase 1 — Base de datos

- Se escribieron `supabase/migrations/0001_esquema.sql`, `0002_catalogo.sql` y `0003_demo.sql`:
  - Tablas, RLS, disparadores y la función `datos_publicos()`.
  - Buckets de almacenamiento.
  - Catálogo de 32 modelos y 6 equipos demo.
- Se probaron en un **Postgres 16 local** con una imitación mínima de Supabase (roles `anon` y `authenticated`, `auth.uid()` y `storage`). Lo hace `tests/sql/probar.sh`.
- Durante las pruebas se corrigió:
  - Un disparador que habría revertido la fecha de precios.
  - Una prueba mal planteada sobre `activo_por_demo`.

### 2.4 Capa de datos y sitio público

- **Capa de datos:**
  - Utilidades: `utils.js`, `tema.js`, `ilustracion.js`.
  - Datos: `datos/comun.js`, `demo.js`, `supabase.js` y `api.js`.
- **Sitio público:**
  - `index.html` y los estilos `base.css` y `sitio.css`.
  - Los módulos de `assets/js/sitio/`.
  - Las páginas legales `/privacidad/` y `/terminos/`.
- **Revisión visual con capturas de Chromium a 360 y 1440 px.** Se corrigió:
  - La sección "información de la tienda", que aparecía vacía.
  - La barra fija de compra, que apretaba el botón a 360 px.

### 2.5 Fase 2 — Panel

- Se construyó el panel completo: `admin/index.html`, `panel.css` y los módulos de `assets/js/panel/`.
- La prueba en el navegador (login, crear un equipo con 2 fotos y verlo en el sitio) funcionó a la primera.
- Se corrigió a 360 px:
  - El precio cortado en la edición rápida.
  - Los botones de las fotos, que se desbordaban.

### 2.6 Fase 4 — Funciones del servidor

- Se escribieron `supabase/functions/enviar-lead/index.ts`, `usuarios/index.ts` y `_compartido/lead.ts`.
- Se instaló **Deno** (vía npm, en una carpeta temporal) para revisar los tipos y probar `enviar-lead` contra un webhook de GHL simulado: 10 casos.
- `Deno.serve` no lee la variable `PORT`. Por eso se creó `tests/funciones/servir.ts`, que fija el puerto.

### 2.7 "Supabase local" para probar el modo producción

- Docker no funcionaba en el contenedor. Se armó un Supabase mínimo sin Docker:
  - **Postgres 16.**
  - El **servidor de auth oficial de Supabase, GoTrue v2.180.0**, descargado como binario.
  - **PostgREST 12.2.3.**
  - La función en Deno.
  - Una **pasarela** Node en el puerto 54321 que imita las rutas de Supabase.
  - Un **Storage simulado** en memoria.

  Todo vive en `tests/supabase-local/`.
- El proxy del contenedor bloquea los CDN (jsDelivr, unpkg, esm.sh). Por eso la prueba sirve un **paquete local de supabase-js 2.117.2**, armado con esbuild desde npm, en lugar del CDN. El código de producción sigue cargando el CDN.
- Resultado: 6 de 6 casos de punta a punta.

### 2.8 Fase 5 — Suite de aceptación, accesibilidad y rendimiento

- `tests/verificar.cjs` reúne **26 casos**: las 11 pruebas de la sección 12 del prompt, más accesibilidad y formatos.
- **Fallas reales que encontró y que se corrigieron:**
  - Textos de 14–15 px (el prompt exige 16 px o más).
  - Puntos del carrusel de 28 px (exige 44 px).
  - Un `h1` oculto que quedaba en el DOM del panel.
  - Contraste de 4,18:1 de enlaces en tema oscuro (debe ser 4,5:1).
  - El botón cerrar del pop-up, que se encogía a 33 px.
- **Falsos positivos** (fallas de la prueba, no del sitio):
  - El "gesto táctil" de la prueba empezaba sobre la flecha del carrusel.
  - La prueba de "tuteo" marcaba "si nos escribe" y "se elige", que están bien en usted.
- **Lighthouse móvil:** la hoja de Google Fonts bloqueaba el primer pintado. Se cargó sin bloquear y el LCP pasó de **2,7 s a 1,4 s**. Puntajes: rendimiento 91, accesibilidad 100 y buenas prácticas 100.

  El CLS es 0,19 solo con la franja de modo demo, porque aparece al cargar los datos. Sin modo demo es 0,049.
- **Bug del script de pruebas:** `levantar.sh` guardaba el PID de una subshell. Quedaban servidores de auth huérfanos, que causaban el error "Database error querying schema". Se corrigió.
- Documentación inicial: `README.md` y `CLAUDE.md`.

### 2.9 Sesión 2 — Usuarios y correos

- Se probó la función `usuarios` contra el Supabase local, con un **SMTP simulado** que guarda los correos (`tests/supabase-local/smtp-simulado.mjs`).
- **Bug real corregido:** invitar dos veces el mismo correo, antes de que la persona aceptara, hacía que GoTrue reenviara la invitación. La función fallaba con un 500 al crear un perfil duplicado. Ahora responde "Ese correo ya tiene usuario.".
- Los correos de Supabase vienen en inglés. Se agregaron **plantillas en español** en `supabase/correos/` y se cargan en el GoTrue local para probarlas.
- `flowType: "implicit"` quedó **explícito** en supabase-js, para que los enlaces del correo funcionen aunque se abran en otro navegador o celular.
- Se agregaron tres casos de punta a punta: invitar y crear la contraseña, recuperar la contraseña, y desactivar y reactivar. Resultado: **9 de 9 en dos corridas seguidas.**

### 2.10 GitHub Pages

- Se agregó `.nojekyll`.
- Las pruebas que usaban rutas absolutas pasaron a relativas.
- Se verificó la suite completa servida bajo `/Cotizadora-ICT/`, como lo hace Pages: 26 de 26.
- Activar Pages lo debe hacer el dueño en Settings → Pages: las herramientas de Claude no pueden cambiar esa configuración.

### 2.11 Este documento

- Jared pidió un archivo con "absolutamente todo el proceso", que se actualice con cada cambio y sirva para pasárselo a otros LLM. Se creó este `DOCUMENTACION.md`.
- Para mantenerlo al día se agregaron:
  - El verificador `tests/documentacion.mjs`.
  - El hook `.claude/hooks/documentacion.sh`, configurado en `.claude/settings.json`.
  - La regla en `CLAUDE.md`.

---

## 3. Reglas que no se rompen

Vienen del prompt y de las decisiones de Jared. Cualquier cambio debe respetarlas.

1. **Idioma:** español de Colombia y trato de **"usted"** en todo el texto visible: sitio, panel, errores, `aria-label` y correos. Nada de "tú" ni voseo.
2. **Marca:** sin logo, imágenes, renders, íconos ni tipografías de Apple. Los marcadores de posición son una silueta genérica de teléfono en SVG (`assets/js/ilustracion.js`), sin manzana, sin cámaras y sin copiar ningún modelo.
3. **Datos:** no inventar especificaciones, precios, colores, garantías, plazos ni tiempos de respuesta. **Si un campo está vacío, no se muestra.** Tampoco se escriben promesas que la tienda no cargó, como "envío gratis" o "garantía de 12 meses".
4. **Moneda:** pesos colombianos con el formato `$5.299.000` (punto de miles, sin decimales). Se guardan como enteros. Para formatear se usa `formatearCOP`; **no** se usa `Intl`, que en español puede no agrupar los números de 4 cifras.
5. **Fechas:** D/M/AAAA en hora de Colombia, con `fechaCorta`.
6. **Nada de la tienda en el código.** Todo sale de la base y se edita desde el panel. `config.js` solo lleva la conexión, el píxel y el script de GHL.
7. **Datos personales de clientes** (nombre, correo, WhatsApp): **nunca** en Supabase ni en el píxel de Meta. Solo van a GHL, a través de la función `enviar-lead`.
8. **Píxel:** nunca `Purchase`; la venta se registra en el CRM.
9. **No abrir pop-ups que nadie pidió.**
10. **Accesibilidad:**
    - Textos de 16 px o más.
    - Zonas táctiles de 44 px o más.
    - Contraste AA (4,5:1; 3:1 en texto grande).
    - Foco visible y navegación con teclado.
    - `prefers-reduced-motion` respetado.
11. **Textos literales del prompt** (no se reescriben). Están en `popup.js` y `catalogo.js`, y la suite compara el mensaje de WhatsApp letra por letra:
    - "Elija su iPhone y cómprelo por WhatsApp."
    - "¿Nuevo o usado?", "¿Qué modelo?", "¿Qué almacenamiento?"
    - "Antes de pasar a WhatsApp" / "Así sabemos que usted es una persona y no un bot."
    - "Su nombre", "Su correo", "Su WhatsApp", "Continuar a WhatsApp", "Se abrirá WhatsApp con su pedido escrito. Solo toque Enviar."
    - Los mensajes de error, "Su pedido está listo", "Si WhatsApp no se abrió, toque el botón.", "Su código: X. Si nos escribe desde otro número, menciónelo."
    - "En este momento no tenemos ese equipo publicado." y "Consultar por WhatsApp".
    - "Sitio en preparación: los equipos y precios son de demostración."
12. **Seguridad:** ningún token ni clave en el navegador. La "anon key" de Supabase es pública por diseño: lo que protege los datos son las reglas RLS.

---

## 4. Arquitectura general

```
                       ┌───────────────────────── NAVEGADOR ─────────────────────────┐
                       │                                                             │
  Anuncio Meta ───────►│  index.html (sitio público)        admin/ (panel privado)   │
  ?utm_…&fbclid=…      │   └ assets/js/sitio/principal.js    └ assets/js/panel/panel.js
                       │            │                                │                │
                       │            └──────────► datos/api.js ◄──────┘                │
                       │                     elige según config.js                    │
                       │               ┌────────────┴─────────────┐                   │
                       │          datos/demo.js             datos/supabase.js         │
                       │      (localStorage+IndexedDB)    (fetch + supabase-js CDN)   │
                       └───────────────────────────────────────┬──────────────────────┘
                                                               │ HTTPS
                     ┌────────────────────── SUPABASE (un proyecto por tienda) ─────────┐
                     │  /rest/v1  PostgREST → Postgres (tablas + RLS + datos_publicos())│
                     │  /auth/v1  GoTrue (login, invitación, recuperación)              │
                     │  /storage  buckets "fotos" y "marca" (lectura pública)           │
                     │  /functions/v1/enviar-lead ──► Inbound Webhook de GHL ──► CRM    │
                     │  /functions/v1/usuarios   (invitar/desactivar; clave de servicio)│
                     └──────────────────────────────────────────────────────────────────┘
  Después del envío a GHL, el navegador abre  https://wa.me/<whatsapp>?text=<pedido>
```

**Principios:**

- **Sin build.** Cada archivo `.js` es un ES module que el navegador carga tal cual. Las rutas son **relativas**, así el sitio funciona en cualquier subcarpeta (por ejemplo `/Cotizadora-ICT/` en GitHub Pages).
- **Interfaz única de datos.** El sitio y el panel solo hablan con `api()`, que devuelve el adaptador demo o el de Supabase con **los mismos métodos y las mismas reglas**.
- **La seguridad real está en el SQL**: RLS, disparadores y funciones. El panel solo oculta lo que un rol no puede hacer; el modo demo repite esas reglas en JS.
- **Robustez:**
  - Cada inicialización del sitio corre dentro de `seguro(fn, nombre)`: si una falla, las demás siguen.
  - Sin datos, el sitio muestra un aviso en lugar de romperse.

---

## 5. Mapa de archivos (todos, uno por uno)

Rutas relativas a la raíz del repo. Entre paréntesis, el número aproximado de líneas.

### 5.1 Raíz

| Archivo | Qué es |
|---|---|
| `index.html` (≈130) | Sitio público, una sola página: <ul><li>Franja demo, encabezado con logo, nombre y título, y tarjeta de filtros (segmentado, lista desplegable y chips).</li><li>Contador y "Limpiar filtros", galería, estado vacío y detalle en línea.</li><li>Información de la tienda, pie, `<dialog id="hoja-detalle">` (detalle del equipo), barra fija de compra y `<dialog id="popup">`.</li><li>Carga Google Fonts (Inter) sin bloquear el pintado, `modulepreload` de los módulos y `assets/js/sitio/principal.js`.</li></ul> |
| `config.js` (≈34) | **Único archivo que cambia por tienda.** Contiene:<ul><li>`backend`: `"demo"` o `"supabase"`.</li><li>`supabase.url` y `supabase.anonKey`.</li><li>`metaPixelId`.</li><li>`ghlSeguimiento.src` y `ghlSeguimiento.id`, del script de seguimiento externo de GHL (opcional).</li></ul>Nada de lo que contiene es secreto. |
| `README.md` | Guía para personas: probar en demo, GitHub Pages, poner una tienda en producción, GHL, píxel, decisiones, pruebas y pendientes. |
| `CLAUDE.md` | Reglas y guía para las próximas sesiones de Claude Code: cómo verificar antes de cada commit y la obligación de mantener este documento. |
| `DOCUMENTACION.md` | Este documento. |
| `.gitignore` | Ignora `tests/capturas/`, `node_modules/`, `deno.lock`, `.env` y las carpetas temporales de la CLI de Supabase. |
| `.nojekyll` | Archivo vacío. Le dice a GitHub Pages que publique los archivos tal cual, sin procesarlos con Jekyll (que ignora carpetas que empiezan con `_`). |

### 5.2 Páginas

| Archivo | Qué es |
|---|---|
| `admin/index.html` (≈59) | Cáscara del panel. Tiene:<ul><li>Pantalla de carga y bloque `#acceso` (login, recuperar y crear contraseña).</li><li>`#app` con barra superior (tienda, usuario, "Ver mi sitio" y "Salir"), navegación por pestañas y `#vista` (contenido de la ruta).</li><li>Aviso flotante "Guardado" y `<dialog id="confirmar">`.</li><li>`noindex`.</li></ul> |
| `privacidad/index.html` (≈32) | Página legal `/privacidad/`. Muestra `tienda.texto_privacidad` con formato básico. |
| `terminos/index.html` (≈32) | Página legal `/terminos/`. Muestra `tienda.texto_terminos`. |

### 5.3 Estilos (`assets/css/`)

| Archivo | Qué es |
|---|---|
| `assets/css/base.css` (≈264) | Base compartida por el sitio y el panel: <ul><li>**Variables de diseño** (`--primario`, `--sobre-primario`, `--primario-texto`, `--secundario`, `--sobre-secundario`, superficies, bordes, textos, error, éxito, aviso, radios, sombras y curvas), con su versión `[data-tema="oscuro"]`.</li><li>Reinicio y foco visible.</li><li>Botones (`.boton--primario`, `--secundario`, `--suave`, `--peligro`, `--enlace`, `.boton-icono`), campos (`.entrada`, `.campo`, `.error-campo`, `.casilla`) y etiquetas (`.etiqueta-pildora`, `.etiqueta-demo`).</li><li>Spinner y reglas de `prefers-reduced-motion`.</li></ul> |
| `assets/css/sitio.css` (≈610) | Sitio público: <ul><li>Franja demo y encabezado (el brillo decorativo va en `::before` para no tocar el contraste).</li><li>Filtros: segmentado, lista desplegable propia y chips.</li><li>Galería (1 → 2 → 3 → 4 columnas) y tarjetas.</li><li>Detalle y carrusel (scroll-snap).</li><li>Hoja: pantalla completa desde abajo en celular, ventana centrada en escritorio desde 900 px.</li><li>Barras de compra (apiladas por debajo de 480 px).</li><li>Información de la tienda, pie y pop-up.</li><li>Animaciones de apertura y páginas legales.</li></ul> |
| `assets/css/panel.css` (≈307) | Panel, pensado primero para celular: <ul><li>Acceso y barra superior pegajosa.</li><li>Navegación en pastillas desplazables.</li><li>Bloques, estadísticas, avisos e interruptor.</li><li>Lista de inventario: tarjetas en celular, filas desde 1000 px.</li><li>Formulario por pasos y acciones pegajosas.</li><li>Fotos, filas de ficha, catálogo, vista previa de marca y recorte del logo.</li><li>Lista editable, usuarios, aviso flotante y ventana de confirmación.</li></ul> |

### 5.4 JavaScript compartido (`assets/js/`)

| Archivo | Exporta y para qué |
|---|---|
| `assets/js/utils.js` (≈241) | Utilidades sin dependencias: <ul><li>**Números:** `formatearMiles`, `formatearCOP`, `leerPrecio` ("5.299.000" → 5299000).</li><li>**Fechas:** `fechaCorta` (D/M/AAAA en America/Bogota).</li><li>**Texto:** `escaparHTML`, `plural`, `formatoBasico` (mini-markdown seguro para los legales: `##`, `**`, listas y enlaces http/mailto).</li><li>**Capacidades:** `CAPACIDADES_SUGERIDAS`, `slugCapacidad`, `capacidadDeSlug`, `capacidadEnGB`.</li><li>**Contacto:** `soloDigitos`, `celularValido` (10 dígitos que empiezan por 3), `formatearCelular` ("300 123 4567"), `correoValido`, `whatsappTiendaValido` (12 dígitos que empiezan por 57).</li><li>**Código:** `generarCodigo`, `codigoValido`. "COT-" más 4 caracteres de un alfabeto de 32 sin O, 0, I ni 1, con `crypto.getRandomValues`; como 256 % 32 = 0, el sorteo no tiene sesgo.</li><li>**Contraste WCAG:** `hexValido`, `luminancia`, `contraste`, `textoSobre` (blanco o casi negro, garantiza al menos 4,5:1) y `ajustarParaTexto` (oscurece o aclara un color hasta 4,5:1 sobre uno o varios fondos).</li><li>**Varios:** `sesion` (sessionStorage seguro), `seguro`, `reducirMovimiento`, `esperar`, `idEvento`.</li></ul> |
| `assets/js/tema.js` (≈40) | `variablesTema(tienda)` y `aplicarTema(tienda)`: pasan `color_primario`, `color_secundario` y `tema` a variables CSS y calculan el texto con contraste AA. `--primario-texto` se ajusta contra **todas** las superficies del tema. También exporta `FONDOS`. |
| `assets/js/ilustracion.js` (≈51) | `telefonoSVG(colorHex, titulo)`: teléfono genérico con el marco del color del equipo. `logoGenericoSVG()`: ícono para cuando no hay logo. |

### 5.5 Capa de datos (`assets/js/datos/`)

| Archivo | Qué es |
|---|---|
| `assets/js/datos/api.js` (≈17) | `api()`: devuelve, una sola vez, el adaptador `demo` o `supabase` según `config.js`. Si se pide Supabase sin URL o clave, usa demo y avisa en la consola. |
| `assets/js/datos/comun.js` (≈62) | Reglas compartidas por los dos adaptadores: <ul><li>`ErrorDatos`.</li><li>`equipoEsPublico`: publicado, con stock mayor que 0 y de un modelo activo.</li><li>`LADO_GRANDE` = 1600 y `LADO_MINIATURA` = 640.</li><li>`rutaMiniatura`: `x.webp` → `x-640.webp`.</li><li>`CAMPOS_TIENDA`, `CAMPOS_EQUIPO`, `ESTADOS_ESTETICOS` y `elegir`.</li><li>`mensajeDeError`: traduce los errores de Postgres al español.</li></ul> |
| `assets/js/datos/semilla.js` (≈47) | `CATALOGO`: los 32 modelos con slug, generación y orden de 10 en 10. `DEMO_EQUIPOS`: los 6 equipos demo. `slugDe`. **Debe coincidir** con `0002_catalogo.sql` y `0003_demo.sql`; la prueba SQL lo revisa. |
| `assets/js/datos/demo.js` (≈436) | Back-end de demostración. Ver sección 7.2. |
| `assets/js/datos/supabase.js` (≈304) | Back-end Supabase. Ver sección 7.3. |

### 5.6 Sitio público (`assets/js/sitio/`)

| Archivo | Qué es |
|---|---|
| `assets/js/sitio/principal.js` (≈328) | **Orquestador del sitio.** Sus tareas: <ul><li>Captura la atribución, inicia el píxel y el script de GHL.</li><li>Carga los datos y aplica el tema.</li><li>Dibuja marca, información y pie.</li><li>Arma los filtros y lee y escribe la URL.</li><li>Actualiza contador y galería, y decide el detalle en línea.</li><li>Abre la hoja de detalle (con gesto de deslizar para cerrar) y conecta la barra fija.</li><li>En demo, recarga si otra pestaña cambió los datos (evento `storage`).</li></ul> |
| `assets/js/sitio/catalogo.js` (≈163) | **Lógica pura, sin DOM:** <ul><li>`prepararCatalogo`, que calcula la recencia de cada generación como el mayor `orden` de sus modelos.</li><li>`filtrar`, `contarUnidades` (suma de stock), `opcionesModelo` (agrupadas por generación, de la más nueva a la más vieja), `etiquetaGeneracion` y `opcionesCapacidad`.</li><li>`encadenar`: limpia las elecciones que un cambio deja inválidas.</li><li>`tarjetas`: nuevos por modelo y capacidad, usados por unidad; orden: destacados, generación más nueva y precio.</li><li>`diapositivas`, `textoCondicion`, `textoAlternativo` y `describirBusqueda`.</li><li>`mensajeCompra`, `mensajeSinStock` y `enlaceWhatsApp`.</li></ul> |
| `assets/js/sitio/filtros.js` (≈189) | Controles de los filtros: <ul><li>`iniciarSegmentado`: Nuevo/Usado, donde un segundo toque desmarca.</li><li>`iniciarChips`: almacenamiento.</li><li>`iniciarDesplegable`: lista propia con `role="listbox"`, grupos por generación, "Todos los modelos", cantidad por modelo, buscador si hay más de 8, teclado (flechas, Inicio/Fin, Enter, Escape, Tab) y cierre al tocar afuera.</li><li>`marcarLimpiado`: destello cuando un filtro se limpia solo.</li></ul> |
| `assets/js/sitio/galeria.js` (≈117) | `crearGaleria(lista, api)`: tarjetas con clave estable. Al filtrar, las que salen se desvanecen y las que quedan se reacomodan con **FLIP** (Web Animations API). Sin animación si hay `prefers-reduced-motion`. |
| `assets/js/sitio/detalle.js` (≈219) | `crearDetalle(...)`: carrusel y ficha. <ul><li>El carrusel usa scroll-snap y se mueve con el dedo, flechas, puntos, muestras de color y teclado; con varias fotos muestra miniaturas.</li><li>La ficha tiene nombre, etiqueta, variante, `etiqueta_precio` y precio (el elemento más grande), datos de usado, descripciones, "Ver ficha técnica" (solo filas con valor), pagos, entrega, garantía y el botón.</li><li>También exporta `htmlBarraCompra` e `ICONO_WA`.</li></ul> |
| `assets/js/sitio/popup.js` (≈272) | `crearPopup(...)`: el pop-up "Antes de pasar a WhatsApp" completo. Ver sección 9. |
| `assets/js/sitio/fotos.js` (≈19) | `htmlFoto`: `<img>` con `srcset` 640w/1600w, `loading="lazy"` o `fetchpriority="high"`. `htmlMedio`: la foto principal o la ilustración. |
| `assets/js/sitio/atribucion.js` (≈31) | `CLAVES_ATRIBUCION` (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `ad_id`, `fbclid`), `capturarAtribucion` y `leerAtribucion`. Guarda en `sessionStorage["cotizadora:atribucion"]` el **primer valor por clave** de la sesión. |
| `assets/js/sitio/pixel.js` (≈40) | `iniciarPixel`: carga el píxel solo si hay un ID válido y manda `PageView`. `evento(nombre, parametros, eventID)`. `parametrosEquipo(q)`: `content_name`, `content_ids`, `content_type`, `value` y `currency: "COP"`. |
| `assets/js/sitio/legal.js` (≈22) | Script de `/privacidad/` y `/terminos/`: carga la tienda, aplica el tema, muestra el logo y el texto con `formatoBasico`. Si no hay texto: "La tienda todavía no publicó este texto." |

### 5.7 Panel (`assets/js/panel/`)

| Archivo | Qué es |
|---|---|
| `assets/js/panel/panel.js` (≈283) | Arranque, acceso y rutas. <ul><li>**Acceso:** vistas de login, recuperación y "Cree su contraseña" o "Contraseña nueva", según `tipoDeEnlace()`.</li><li>`entrar()` y el router `enrutar()` por hash, que pregunta si hay cambios sin guardar (`ctx.sucio`) y llama `ctx.alSalir`.</li><li>La vista **Inicio**: estadísticas, fecha de precios, avisos de "Lo que falta" y modo demo para la agencia.</li><li>Define `ctx`, que tiene: `api`, `usuario`, `tienda`, `sucio`, `alSalir`, `esAgencia()`, `recargarTienda()` e `ir()`.</li></ul> |
| `assets/js/panel/ui.js` (≈82) | Piezas de interfaz: `$`, `$$`, `esc`, `avisar` ("Guardado" o error), `confirmar` (promesa sobre `<dialog>`), `conBoton` (botón en espera más aviso), `campoTexto`, `interruptor`, `marcarError` y `enfocarPrimerError`. |
| `assets/js/panel/inventario.js` (≈605) | Inventario. <ul><li>**Lista** con buscador y filtros (modelo, condición, publicado y los especiales "sin stock" y "sin foto").</li><li>**Edición rápida** de precio, stock y publicado: se guarda al salir del campo o con Enter.</li><li>Borrar con confirmación (borra también las fotos).</li><li>**Formulario** por pasos para agregar, completo para editar y duplicar, con validaciones.</li><li>**Fotos:** subir, cámara, arrastrar y soltar, reordenar, quitar y máximo 6.</li><li>Opción de activar el modelo si estaba inactivo.</li><li>Limpia las fotos subidas si se sale sin guardar.</li></ul> |
| `assets/js/panel/tienda.js` (≈359) | Mi tienda: <ul><li>Datos de la tienda y redes.</li><li>Marca: logo con **recorte** (horizontal 3:1 o cuadrado, arrastrar, zoom y teclado), favicon de 128 px, colores con selector y hexadecimal, tema y **vista previa en vivo** con el contraste calculado.</li><li>Venta: etiqueta del precio, **lista editable** de formas de pago, entrega y garantías.</li></ul> |
| `assets/js/panel/fichas.js` (≈120) | Fichas técnicas: lista de modelos activos y editor por modelo. Tiene descripción, filas etiqueta/valor (agregar, editar, subir, bajar y borrar, con etiquetas sugeridas) y "Copiar ficha de otro modelo". |
| `assets/js/panel/catalogo.js` (≈119) | Catálogo agrupado por generación con interruptor activo/inactivo. La **agencia** además renombra (el slug no cambia), reordena (intercambia el `orden`) y agrega modelos al final. |
| `assets/js/panel/legales.js` (≈52) | Editores de privacidad, términos, autorización de datos y aviso de marca, con aviso si están vacíos y vista previa del formato básico. |
| `assets/js/panel/usuarios.js` (≈66) | Solo agencia: invitar (correo y rol), desactivar con confirmación y reactivar. |
| `assets/js/panel/imagenes.js` (≈85) | Fotos en el navegador, sin librerías: <ul><li>`validarArchivo`: jpg, png, webp o heic de hasta 10 MB.</li><li>`comprimirFoto`: devuelve `{grande ≤1600px, miniatura ≤640px, ext}` en WebP, o JPEG si el navegador no codifica WebP.</li><li>`codificar`, `cargarImagen` y `MAX_BYTES`.</li></ul>El HEIC se rechaza con un aviso claro si el navegador no lo lee. |

### 5.8 Supabase (`supabase/`)

| Archivo | Qué es |
|---|---|
| `supabase/migrations/0001_esquema.sql` (≈351) | Tablas, funciones de rol, disparadores, RLS, `datos_publicos()`, `borrar_datos_demo()`, buckets y reglas de almacenamiento. Ver sección 6. |
| `supabase/migrations/0002_catalogo.sql` (≈42) | Inserta los **32 modelos** del catálogo maestro, en el orden del prompt, todos inactivos (`orden` 10, 20, …, 320). Cada modelo recibe su ficha vacía por disparador. |
| `supabase/migrations/0003_demo.sql` (≈36) | Pone el nombre "Tienda de demostración" y `modo_demo = true`, activa los 4 modelos que usa la demo (con `activo_por_demo = true`) e inserta los 6 equipos demo. |
| `supabase/functions/_compartido/lead.ts` (≈53) | `armarLead(datos)`: valida y arma el pedido que va a GHL. Exporta también `CAMPOS_ATRIBUCION` y `CAMPOS_OCULTOS`. No depende de Deno. |
| `supabase/functions/enviar-lead/index.ts` (≈73) | Función pública, sin JWT: valida y reenvía al Inbound Webhook de GHL. Ver sección 11.1. |
| `supabase/functions/usuarios/index.ts` (≈72) | Función solo para agencia: invitar, desactivar y reactivar con la clave de servicio. Ver sección 11.2. |
| `supabase/correos/invitacion.html` | Plantilla en español del correo de invitación. Usa `{{ .ConfirmationURL }}`. |
| `supabase/correos/recuperacion.html` | Plantilla en español del correo de recuperación. Usa `{{ .ConfirmationURL }}` y `{{ .Email }}`. |
| `supabase/correos/LEAME.md` | Dónde pegar cada plantilla y con qué asunto. |

### 5.9 Pruebas y herramientas (`tests/` y `.claude/`)

| Archivo | Qué es |
|---|---|
| `tests/verificar.cjs` (≈689) | Suite de aceptación en **modo demo** con Playwright: **26 casos**. Ver sección 14. |
| `tests/verificar-supabase.cjs` (≈311) | Suite de punta a punta del **modo Supabase** contra el Supabase local: **9 casos**. Reemplaza `config.js` en el navegador y puede servir un supabase-js local (`ICT_SUPABASE_JS`). |
| `tests/documentacion.mjs` | Verificador de este documento: falla si algún archivo versionado no aparece en la sección 5. |
| `tests/sql/probar.sh` | Crea un Postgres temporal, carga la imitación de Supabase y las 3 migraciones, compara la semilla con `semilla.js` y corre `pruebas.sql`. |
| `tests/sql/supabase_simulado.sql` | Roles `anon`, `authenticated` y `service_role`, esquema `auth` con `auth.uid()`, y `storage.buckets` y `storage.objects` mínimos. |
| `tests/sql/pruebas.sql` | Asserts de catálogo y semilla, y de RLS por rol (anon, sin perfil, inactivo, tienda, agencia). También validaciones, fecha de precios, protecciones de catálogo, modo demo y perfiles, y borrar demo. |
| `tests/sql/comparar-semilla.mjs` | Compara el JSON de la semilla del SQL con `semilla.js`. |
| `tests/funciones/probar.sh` | Revisa los tipos de las dos funciones y prueba `enviar-lead` contra webhooks simulados: 10 casos. |
| `tests/funciones/servir.ts` | Corre una función de Supabase en un puerto fijo (`Deno.serve` no lee `PORT`). |
| `tests/funciones/webhook-simulado.mjs` | Webhook de GHL falso: guarda el último cuerpo recibido y responde con el código de `ESTADO`. |
| `tests/supabase-local/levantar.sh` | Levanta el "Supabase local" completo (ver sección 14.3) y deja `/tmp/cotizadora-supabase-local/entorno`. Con el argumento `detener`, lo apaga. |
| `tests/supabase-local/pasarela.mjs` | Pasarela en el puerto 54321 que imita las rutas de Supabase. Tiene Storage en memoria, sirve las plantillas de correo y agrega `Authorization` desde la `apikey`. |
| `tests/supabase-local/roles.sql` | Roles y esquema `auth` que Supabase ya trae. |
| `tests/supabase-local/despues_de_auth.sql` | Permisos y Storage simulado, después de las migraciones de GoTrue. |
| `tests/supabase-local/jwt.mjs` | Firma JWT HS256 (`anon` o `service_role`) para el entorno local. |
| `tests/supabase-local/smtp-simulado.mjs` | SMTP falso que guarda cada correo como JSON, decodificando quoted-printable y encabezados RFC 2047. |
| `.claude/settings.json` | Configuración de Claude Code del proyecto: registra el hook `Stop` que exige actualizar este documento. |
| `.claude/hooks/documentacion.sh` | El hook. Si hay archivos cambiados después de la última actualización de `DOCUMENTACION.md`, o si el verificador falla, bloquea el fin del turno y pide actualizar el documento. |

---

## 6. Modelo de datos y seguridad (Supabase / Postgres)

### 6.1 Tablas (`0001_esquema.sql`)

**`tienda`**: una sola fila (`id = 1`, con `check (id = 1)`).

- **Datos:** `nombre`, `ciudad`, `direccion`, `horario_texto`.
- **Contacto:**
  - `whatsapp`: vacío o `^57[0-9]{10}$`.
  - `correo_contacto`, `instagram_url`, `facebook_url`, `tiktok_url`.
- **Marca:**
  - `logo` y `favicon`: rutas en el bucket "marca".
  - `color_primario` (por defecto `#1A73E8`) y `color_secundario` (`#0F172A`), ambos hexadecimales.
  - `tema`: `claro` u `oscuro`.
- **Venta:**
  - `texto_entrega`.
  - `formas_pago`: `text[]`.
  - `texto_garantia_nuevos`, `texto_garantia_usados`.
  - `etiqueta_precio`: por defecto "Precio".
- **Legales:** `texto_privacidad`, `texto_terminos`, `texto_autorizacion_datos`, `aviso_marca`.
- **Sistema:**
  - `precios_actualizados_en`: lo pone el disparador.
  - `modo_demo`: por defecto `true`.
  - `actualizado_en`.

**`modelos`**: el catálogo maestro.

- `id`: identity.
- `nombre` y `slug`: únicos. El slug va en minúsculas con guiones.
- `generacion`: texto, ej. "18", "17" o "Plegable".
- `orden`: entero. Define la recencia.
- `activo`.
- `activo_por_demo`: lo pone la demo; se borra si alguien toca `activo`.
- `creado_en`.

**`fichas`**: una por modelo.

- `modelo_id`: PK y FK, con `on delete cascade`.
- `descripcion`.
- `especificaciones`: JSONB, siempre un **array** de `{etiqueta, valor}`.
- `actualizado_en`.

**`equipos`**: el inventario.

- `id`: uuid.
- `modelo_id`: FK `on delete restrict`. No se puede borrar un modelo que tenga equipos.
- `condicion`: `nuevo` o `usado`.
- `capacidad`: texto no vacío.
- `color_nombre`, `color_hex`: hexadecimal.
- `precio`: bigint mayor que 0.
- `stock`: entero de 0 o más.
- `fotos`: `text[]` de hasta 6 rutas.
- `publicado`, `destacado`, `descripcion_extra`, `es_demo`.
- **Solo usados:**
  - `bateria_porcentaje`: de 0 a 100.
  - `estado_estetico`: Como nuevo, Excelente, Muy bueno o Bueno.
  - `detalles`, `incluye`.
- `creado_en`, `actualizado_en`.
- Restricción **`usado_es_una_unidad`**: un usado tiene `stock ≤ 1`.

**`perfiles`**: quién puede entrar al panel.

- `user_id`: PK y FK a `auth.users`.
- `correo`.
- `rol`: `agencia` o `tienda`.
- `activo`, `creado_en`.

### 6.2 Funciones de rol

Las tres son `security definer`:

- `rol_actual()`: devuelve el rol del perfil **activo** de `auth.uid()`.
- `es_staff()`: tiene un perfil activo.
- `es_agencia()`: tiene rol agencia.

### 6.3 Disparadores

| Disparador | Qué hace |
|---|---|
| `tienda_actualizado`, `fichas_actualizado`, `equipos_actualizado` | Ponen `actualizado_en = now()`. |
| `equipos_precio` | Al insertar o cambiar el `precio` de un equipo, actualiza `tienda.precios_actualizados_en`. Cambiar el stock no la toca. |
| `modelos_ficha` | Cada modelo nuevo nace con su ficha vacía. |
| `modelos_proteger` | Si hay sesión y no es agencia, bloquea los cambios de `nombre`, `slug`, `generacion` y `orden` (error 42501). Si alguien cambia `activo`, pone `activo_por_demo = false`. |
| `tienda_proteger` | Solo la agencia cambia `modo_demo`. |
| `perfiles_proteger` | Nadie cambia su propio rol ni se desactiva a sí mismo. |

### 6.4 Seguridad a nivel de fila (RLS) por rol

| Tabla | Público (`anon`) | Tienda | Agencia |
|---|---|---|---|
| `tienda` | lee | lee y edita (no `modo_demo`) | lee y edita todo |
| `modelos` | lee **solo activos** | lee todos; cambia `activo` | lee, edita, agrega y borra |
| `fichas` | lee las de modelos activos | lee y edita | lee y edita |
| `equipos` | lee solo **publicados, con stock > 0 y de modelo activo** | todo | todo |
| `perfiles` | sin acceso (permiso revocado) | lee el suyo | lee y edita todos |
| `storage.objects` (`fotos` y `marca`) | lee | sube, cambia y borra | sube, cambia y borra |

Un usuario autenticado **sin perfil o con el perfil inactivo** ve lo mismo que el público y no escribe nada.

### 6.5 Funciones SQL de la API

- **`datos_publicos()`** (`security invoker`, respeta la RLS): devuelve en **una sola llamada** `{tienda, modelos activos, fichas de modelos activos, equipos publicados con stock}`. El sitio público la usa por `POST /rest/v1/rpc/datos_publicos`.
- **`borrar_datos_demo()`** (solo agencia):
  1. Borra los equipos con `es_demo`.
  2. Apaga los modelos con `activo_por_demo`.
  3. Pone `modo_demo = false`.

### 6.6 Almacenamiento

- **Buckets públicos:**
  - `fotos`: webp, jpeg o png, hasta 10 MB.
  - `marca`: además svg e ico.
- **Rutas de fotos:** `equipos/<uuid>.webp` y `equipos/<uuid>-640.webp`.
- **Logo:** `logo-<timestamp>.webp|png`. **Favicon:** `favicon-<timestamp>.png`.

---

## 7. Capa de datos del front-end (demo y Supabase)

### 7.1 Interfaz común

Los dos adaptadores la implementan. El sitio y el panel solo usan esto.

| Método | Uso |
|---|---|
| `iniciar()` | Prepara el adaptador. En demo carga las fotos de IndexedDB; en Supabase crea el cliente. |
| `cargarPublico()` | Devuelve `{tienda, modelos, fichas, equipos}` filtrados como para el público. |
| `urlArchivo(bucket, ruta)` | Da la URL pública de un archivo. |
| `enviarLead(payload)` | Devuelve `{ok}`. |
| `sesionActual()`, `iniciarSesion(correo, clave)`, `cerrarSesion()`, `recuperarClave(correo)`, `cambiarClave(nueva)`, `tipoDeEnlace()`, `alCambiarSesion(fn)` | Autenticación. `tipoDeEnlace()` devuelve `"invite"` o `"recovery"` si se llegó desde un correo. |
| `leerTienda()`, `guardarTienda(cambios)` | La tienda. |
| `listarModelos()`, `guardarModelo(id, cambios)`, `agregarModelo(datos)` | El catálogo. |
| `listarFichas()`, `guardarFicha(modeloId, {descripcion, especificaciones})` | Las fichas. |
| `listarEquipos()`, `crearEquipo(datos)`, `actualizarEquipo(id, cambios)`, `borrarEquipo(id)` | El inventario. |
| `subirArchivo(bucket, ruta, blob)`, `borrarArchivos(bucket, rutas)` | Los archivos. |
| `borrarDatosDemo()` | Solo agencia. |
| `listarUsuarios()`, `invitarUsuario(correo, rol)`, `cambiarEstadoUsuario(userId, activo)` | Solo agencia. |
| `reiniciarDemo()` | **Solo en demo:** vuelve a los datos iniciales. |

### 7.2 `demo.js` — todo en el navegador

- **Estado:** `localStorage["cotizadora-demo:v1"]`, un JSON con `tienda`, `modelos`, `fichas`, `equipos` y `perfiles`. Se comparte entre pestañas del mismo navegador.
- **Fotos:** IndexedDB, base `cotizadora-demo`, almacén `archivos`. Se exponen como `blob:` URLs.
- **Usuarios de prueba:** `agencia@demo.co` y `tienda@demo.co`, clave `demo1234`. La sesión va en `sessionStorage["cotizadora-demo:sesion"]`.
- **Repite las reglas del SQL:**
  - Permisos por rol.
  - Las restricciones CHECK.
  - La fecha de precios al cambiar un precio.
  - Borrar demo.
- **Envío del lead:** no sale nada del navegador. El pedido queda en la consola y en `sessionStorage["cotizadora-demo:ultimo-lead"]`.

  Para probar errores, `sessionStorage["cotizadora-demo:fallos-lead"] = "2"` hace fallar los próximos 2 envíos.
- Simula 120 ms de red, para que se vean los estados de carga.

### 7.3 `supabase.js` — producción

- **Sitio público:** usa `fetch` directo, **sin cargar supabase-js**, para que pese poco:
  - `POST /rest/v1/rpc/datos_publicos` con el encabezado `apikey`.
  - `POST /functions/v1/enviar-lead`, con un tiempo máximo de 12 s.
  - URLs públicas de Storage: `/storage/v1/object/public/<bucket>/<ruta>`.
- **Panel:** carga **supabase-js 2.117.2** desde `https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.117.2/+esm`.
  - Cliente con `persistSession`, `autoRefreshToken` y `detectSessionInUrl`.
  - **`flowType: "implicit"`**: los enlaces del correo funcionan en otro navegador o celular. Con PKCE solo funcionarían en el mismo navegador.
  - Antes de crear el cliente, anota el `type` del enlace (`invite` o `recovery`). También escucha el evento `PASSWORD_RECOVERY`.
  - Traduce los errores de auth al español: credenciales, usuario desactivado ("banned"), límite de intentos, etc.
  - Al iniciar sesión, si no hay perfil activo, cierra la sesión y avisa.
  - Los usuarios se gestionan con `functions.invoke("usuarios", …)`.
  - `recuperarClave` y `invitarUsuario` usan como `redirectTo` la carpeta `/admin/` actual.

---

## 8. Sitio público: cómo funciona por dentro

### 8.1 Arranque (`principal.js → iniciar()`)

1. `capturarAtribucion()`, `iniciarPixel()` y `cargarSeguimientoGHL()`. Cada una corre dentro de `seguro`.
2. `api.cargarPublico()`. Si falla, muestra un aviso y deja de cargar.
3. `prepararCatalogo(datos)`, después `aplicarTema` y el dibujo de marca, información y pie.
4. Crea la galería, el pop-up y los controles de los filtros.
5. **Lee los filtros de la URL** (`?condicion=nuevo&modelo=iphone-18-pro-max&capacidad=256-gb`):
   - Se respetan **aunque no tengan stock**, así un anuncio de un equipo agotado lleva al estado vacío.
   - Un modelo desconocido o inactivo se ignora.
6. `actualizar()`.

### 8.2 Filtros encadenados

- **"¿Nuevo o usado?"**: segmentado sin selección inicial. Un segundo toque desmarca.
- **"¿Qué modelo?"**: lista propia que muestra **solo los modelos activos con stock para la condición elegida**.
  - Va agrupada por generación, de la más nueva a la más vieja. La recencia es el mayor `orden` de la generación, así "Plegable" (iPhone Duo) queda primero.
  - Muestra la cantidad por modelo (suma de stock).
  - Si hay más de 8 modelos, aparece un buscador.
- **"¿Qué almacenamiento?"**: chips con las capacidades que existen para lo ya elegido, ordenadas por tamaño (`capacidadEnGB`).
- **Encadenado:** si un cambio deja inválida una elección posterior, `encadenar()` la limpia y `marcarLimpiado()` hace un destello.
- **Contador:** "N equipos disponibles" o "1 equipo disponible", contando **unidades** (suma de stock).
- **"Limpiar filtros"** solo aparece si hay algún filtro.
- **La URL se actualiza con `history.replaceState`.** Solo cambian `condicion`, `modelo` y `capacidad`; los UTM y demás parámetros se quedan.

### 8.3 Galería

- **Tarjetas:**
  - **Nuevos:** una por **modelo + capacidad**, con las muestras de color y el precio, o "Desde $X" si los colores tienen precios distintos.
  - **Usados:** una por **unidad**, con capacidad, color, batería y estado.
- **Orden:** destacados primero, después la generación más nueva y después el precio de menor a mayor.
- Lleva la etiqueta DEMO si es un equipo demo.
- **Animación FLIP:**
  1. Las tarjetas que salen se desvanecen (170 ms).
  2. Se miden las posiciones, se reordena el DOM reutilizando los nodos y las que quedan se desplazan (320 ms).
  3. Las nuevas aparecen escalonadas.
- **Estado vacío:** "En este momento no tenemos ese equipo publicado." y el botón "Consultar por WhatsApp", que abre el pop-up como consulta "sin stock".

### 8.4 Detalle y carrusel

- **Al tocar una tarjeta:**
  - **Celular:** hoja de pantalla completa que sube desde abajo, con botón cerrar y **gesto de deslizar hacia abajo** sobre la agarradera (más de 110 px cierra).
  - **Escritorio (900 px o más):** ventana centrada con el carrusel a la izquierda y la ficha a la derecha.
- **Detalle en línea:** si los **tres** filtros están elegidos y queda **una sola tarjeta**, el detalle se despliega solo debajo de la galería.
- **Diapositivas:**
  - **Nuevos:** una por color del grupo.
  - **Usados:** todas las unidades del mismo modelo y capacidad, empezando por la elegida.
- **El carrusel se mueve con:**
  - Scroll-snap, con inercia nativa del dedo.
  - Flechas (ocultas en los extremos) y puntos de 44 px.
  - Muestras de color sincronizadas.
  - Teclado: ←, →, Inicio y Fin.
  - Contador "1/2".
- **Si un color tiene varias fotos,** se ven como miniaturas.
- **Al cambiar de diapositiva** se actualizan la ficha, el precio y la barra.
- **Barra de compra fija en celular,** con el precio y "Comprar por WhatsApp":
  - Dentro de la hoja.
  - Sobre la página mientras el detalle en línea está en pantalla (IntersectionObserver).
- Abrir un detalle dispara `ViewContent` en el píxel.

### 8.5 Información de la tienda y pie

- **Información:**
  - Dirección y ciudad, y horario.
  - "Cómo llegar": `https://www.google.com/maps/search/?api=1&query=<dirección, ciudad>`.
  - Redes: solo enlaces http(s).
  - Se oculta si no hay datos.
- **Pie:**
  - "Nombre · ciudad".
  - "Precios actualizados al D/M/AAAA".
  - Enlaces "Política de privacidad" y "Términos y condiciones".
  - `aviso_marca`, si existe.

---

## 9. Pop-up, WhatsApp, atribución y píxel

### 9.1 El pop-up (`popup.js`)

- **Contenido:**
  - Título "Antes de pasar a WhatsApp" y texto "Así sabemos que usted es una persona y no un bot."
  - Un **resumen** del equipo (miniatura, modelo, condición, capacidad, color y precio) o de la búsqueda, si es una consulta sin stock.
- **Campos**, todos con etiqueta visible y obligatorios:
  - "Su nombre": `name="name"`.
  - "Su correo": `name="email"`.
  - "Su WhatsApp": con el prefijo **+57 fijo**. Se formatea mientras se escribe ("300 123 4567") y el cursor se conserva en el dígito.
  - La casilla con `texto_autorizacion_datos` y el enlace a `privacidad/`.
  - Si ese texto está vacío, la casilla dice "Autorizo el tratamiento de mis datos personales.". Es una propuesta: la casilla no puede quedar sin texto.
- **Errores**, al salir del campo o al enviar; el foco va al primer error:
  - "Escriba su nombre."
  - "Revise su correo."
  - "Escriba un celular de 10 dígitos que empiece por 3, sin el +57."
  - "Para continuar, acepte la autorización de datos."
- **Campos ocultos:** `phone` (+57…) y los campos personalizados de GHL, para el script de seguimiento externo.
- **Trampa anti-bots:** un campo `sitio_web` invisible.
- **El botón es `type="button"`.** Solo después de validar llama `form.requestSubmit()`, así el evento `submit` real ocurre con los datos ya validados.
- **Si la tienda no tiene WhatsApp válido,** el pop-up avisa "Esta tienda todavía no tiene WhatsApp configurado." y no ofrece el botón.

### 9.2 Orden al enviar

1. **Código:** genera `codigo_cotizacion` (`COT-` y 4 caracteres) y lo conserva entre reintentos.
2. **Envío:** arma el pedido y llama `api.enviarLead(datos)`. Espera la confirmación.
3. **Si sale bien:**
   1. Dispara el evento `Lead` del píxel con `eventID` = el código.
   2. Muestra la pantalla "Su pedido está listo", con el botón "Abrir WhatsApp" y "Su código: X. Si nos escribe desde otro número, menciónelo."
   3. Intenta `window.open(wa.me…)`. El navegador puede bloquearlo después de la espera; por eso el botón siempre está.
4. **Si falla:**
   - Muestra "No pudimos guardar sus datos. Inténtelo de nuevo." y el botón pasa a "Reintentar".
   - **Al segundo fallo**, aparece igual "Abrir WhatsApp", para no perder al cliente. Ese contacto no queda en GHL.

**El pedido** que el navegador manda (`armarDatos`):

```json
{ "nombre", "correo", "telefono": "+573001234567",
  "modelo", "condicion": "Nuevo|Usado", "capacidad", "color",
  "precio_cotizado": 6200000, "equipo_id", "tipo_consulta": "compra|sin stock",
  "codigo_cotizacion": "COT-AB2C",
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ad_id", "fbclid",
  "event_id": "COT-AB2C", "pagina", "enviado_en" }
```

### 9.3 Mensajes de WhatsApp (exactos)

Se abre `https://wa.me/<tienda.whatsapp>?text=<encodeURIComponent(mensaje)>`.

**Compra:**

```
Hola, quiero comprar este equipo:
iPhone 15 Pro Usado
128 GB · Titanio natural
Precio: $3.000.000
Batería 88% · Estado: Excelente      ← solo usados
Código: COT-XXXX
Soy Juan Pérez.
```

**Sin stock:**

```
Hola, busco un iPhone 18 Pro nuevo de 1 TB. ¿Lo tienen disponible? Código: COT-XXXX. Soy Juan Pérez.
```

La búsqueda se arma con `describirBusqueda`: el modelo o "iPhone", la condición en minúscula y "de <capacidad>".

### 9.4 Atribución

- Al cargar la página se leen de la URL `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `ad_id` y `fbclid`.
- Se guardan en `sessionStorage["cotizadora:atribucion"]`. **Por cada clave se conserva el primer valor de la sesión.**
- Los filtros de la URL no los borran.
- Viajan en el pedido y en los campos ocultos del formulario.

### 9.5 Píxel de Meta

- Solo se carga si `config.metaPixelId` tiene de 5 a 20 dígitos.
- **Eventos:**
  - `PageView` al cargar.
  - `ViewContent` al abrir un detalle, con `content_name` = modelo, capacidad y color; `content_ids` = [equipo_id]; `value` = precio; `currency` = "COP".
  - `Lead` al confirmarse el envío, con los mismos parámetros y `eventID`. Si es una consulta sin stock, solo lleva `content_name`.
- **Nunca** `Purchase`, nunca datos personales. La suite lo verifica.

---

## 10. Panel de administración

### 10.1 Acceso

- **Ruta:** `/admin/`. Sin sesión muestra el login; en demo también muestra las credenciales de prueba.
- **"¿Olvidó su contraseña?":** se escribe el correo y llega un enlace. Al abrirlo (`type=recovery`) aparece "Contraseña nueva".
- **Invitación por correo:** el enlace (`type=invite`) lleva a "Cree su contraseña", con mínimo 8 caracteres y confirmación.
- Después de guardar la contraseña, entra al panel y **limpia el token de la URL**.
- **Roles:**
  - **Agencia:** todo, incluidos Usuarios, renombrar, reordenar y agregar modelos, y el modo demo.
  - **Tienda:** Mi tienda, Inventario, Fichas, Legales y activar modelos.
- Si se cierra la sesión mientras se navega, vuelve al login con un aviso.

### 10.2 Rutas (hash)

| Ruta | Vista |
|---|---|
| `#/inicio` | Inicio, con estas partes:<ul><li>**Estadísticas:** publicados visibles y en borrador. Cada una es un enlace al inventario filtrado.</li><li>**Fecha** de la última actualización de precios.</li><li>**"Lo que falta":** falta el logo, falta el WhatsApp, faltan los textos legales, hay equipos sin foto, equipos ocultos por modelo inactivo. Si no falta nada: "Todo está completo.".</li><li>**Botón** "Ver mi sitio".</li><li>**Solo agencia:** interruptor del modo demo, "Borrar datos de demostración" y, en demo, "Volver a los datos iniciales".</li></ul> |
| `#/inventario` | Lista, filtros y edición rápida. Acepta `?publicado=si|no`, `?stock=0` y `?fotos=sin`. |
| `#/inventario/nuevo` | Formulario **por pasos**: modelo → condición → capacidad → color → precio y stock → fotos → datos del usado (solo si es usado) → publicar (con resumen). |
| `#/inventario/nuevo?desde=<id>` | **Duplicar**: copia todo menos las fotos. |
| `#/inventario/<id>` | Editar el equipo (formulario completo). |
| `#/tienda` | Mi tienda. |
| `#/fichas` y `#/fichas/<modeloId>` | Fichas técnicas. |
| `#/catalogo` | Catálogo. |
| `#/legales` | Textos legales. |
| `#/usuarios` | Usuarios (solo agencia; si no, va a Inicio). |

### 10.3 Validaciones del panel

Son las mismas que exige el SQL:

- **Precio:** entero mayor que 0. Acepta "5.299.000".
- **Stock:** entero de 0 o más. Un usado tiene 0 o 1.
- **Usados:** batería obligatoria de 0 a 100 y estado estético obligatorio.
- **Color:** nombre obligatorio y hexadecimal `#RRGGBB`.
- **Tienda:** WhatsApp de 12 dígitos que empiece por 57; correo válido; redes con `https://`.

**Cambios sin guardar:**

- Si se cambia de sección, pide confirmación ("Hay cambios sin guardar").
- Al cerrar la pestaña, avisa con `beforeunload`.

### 10.4 Fotos

- **Cómo se suben:** "Elegir fotos", "Usar la cámara" (`capture="environment"`) o arrastrar y soltar. Máximo 6.
- **Se comprimen** en el navegador: grande de 1600 px y miniatura de 640 px, en WebP o JPEG.
- **La primera es la principal.** Se reordena con ← → o arrastrando, y se quita con ✕.
- **Al guardar** se borran del almacenamiento las fotos quitadas.
- **Al salir sin guardar** se borran las que se subieron en esa edición.

---

## 11. Funciones del servidor (Edge Functions)

### 11.1 `enviar-lead`

Se publica **sin verificación de JWT** (`--no-verify-jwt`), porque la llama el público.

**Funcionamiento:**

1. Atiende CORS y solo acepta `POST`.
2. Si `ORIGENES_PERMITIDOS` está definido y el origen no está en la lista, responde 403.
3. Valida con `armarLead`: nombre de 2 caracteres o más, correo, teléfono `^\+573\d{9}$`, `tipo_consulta` igual a `compra` o `sin stock`, y código con el formato `COT-XXXX`. Si algo falla, responde 400 con el campo.
4. Hace `POST` a `GHL_WEBHOOK_URL`, con un tiempo máximo de 10 s.
5. **Responde:**
   - `{ok: true}` si GHL respondió 2xx.
   - 502 si GHL falló.
   - 500 si falta el secreto.
6. **No guarda nada.** Los registros solo llevan el estado y el código, sin datos personales.

**Lo que llega a GHL:**

```json
{ "name", "email", "phone",
  "modelo", "condicion", "capacidad", "color", "precio_cotizado", "equipo_id",
  "tipo_consulta", "codigo_cotizacion",
  "utm_source", "utm_medium", "utm_campaign", "utm_term", "utm_content", "ad_id", "fbclid",
  "event_id", "pagina", "enviado_en" }
```

**Secretos:** `GHL_WEBHOOK_URL` (obligatorio) y `ORIGENES_PERMITIDOS` (opcional, separados por coma).

### 11.2 `usuarios`

Se publica con verificación de JWT. Usa `SUPABASE_URL` y `SUPABASE_SERVICE_ROLE_KEY`, que Supabase pone en las funciones.

**Funcionamiento:**

1. Identifica a quien llama con su token. Si no es una **agencia activa**, responde 403.
2. **`invitar {correo, rol, redirectTo}`:**
   1. Si el correo ya tiene perfil, responde 400 "Ese correo ya tiene usuario." (corrección de la sesión 2).
   2. Si no, llama `inviteUserByEmail` y crea el perfil.
3. **`desactivar` y `reactivar {user_id}`:**
   - No se puede aplicar a sí mismo.
   - Cambia `perfiles.activo` y bloquea o desbloquea el inicio de sesión (`ban_duration` de `876000h` o `none`).

---

## 12. Integración con GoHighLevel (GHL)

### 12.1 Camino principal (probado contra un webhook simulado)

1. En GHL, crear un workflow con el disparador **Inbound Webhook**.
2. Copiar la URL del webhook al secreto `GHL_WEBHOOK_URL` de Supabase.
3. Agregar la acción **Create/Update Contact** y mapear:
   - **Campos estándar:** `name`, `email` y `phone`.
   - **Campos personalizados:** `modelo`, `condicion`, `capacidad`, `color`, `precio_cotizado`, `equipo_id`, `tipo_consulta`, `codigo_cotizacion`, `utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `ad_id` y `fbclid`.

**Límite:** no se garantiza que GHL llene su reporte nativo de atribución por este camino, aunque todos los datos del anuncio quedan en campos del contacto.

### 12.2 Camino opcional (sin probar)

- **Qué es:** el script de seguimiento externo de GHL (*External Tracking*). Se activa con `config.ghlSeguimiento.src` y `config.ghlSeguimiento.id`.
- **Lo que dice la ayuda de GHL** (resumen de búsqueda; el dominio estaba bloqueado): registra formularios HTML reales en sitios externos, pero no los que están dentro de iframes ni ventanas emergentes sin un `<form>` real.
- **Por eso el pop-up está preparado:** es un `<form>` real, con campos con nombre.
- **Falta probar en la subcuenta:**
  - Si captura el `<dialog>`.
  - Si toma los campos ocultos.
  - Si duplica contactos junto con el webhook.

---

## 13. Diseño, tema, accesibilidad y rendimiento

- **Tipografía:** Inter de Google Fonts (400 a 800), cargada **sin bloquear** el pintado (`preload` + `onload`). Los precios usan cifras tabulares.
- **Colores de la tienda:**
  - `--primario`: botones y elementos marcados.
  - `--secundario`: fondo del encabezado.
  - El texto sobre cada color se elige solo (`textoSobre`).
  - `--primario-texto`: el primario ajustado para usarlo como texto o enlace sobre todas las superficies del tema.
- **Temas:** claro y oscuro, con `data-tema` en `<html>`. Superficies:
  - Claro: `#FFFFFF`, `#F4F5F7` y `#E9EBEF`.
  - Oscuro: `#0E1117`, `#161A22` y `#202631`.
- **Accesibilidad:**
  - Foco visible: contorno del color del texto más un halo.
  - Etiquetas en todos los campos y textos alternativos en las fotos (ej. "iPhone 18 Pro Max, 256 GB, color Negro").
  - `aria-live` en el contador y `role="listbox"` en la lista de modelos.
  - Diálogos nativos (`<dialog>`) con foco y Escape.
  - Texto de 16 px o más y zonas táctiles de 44 px o más.
- **Movimiento:**
  - Microinteracciones en filtros, galería (FLIP), carrusel y aperturas.
  - Con `prefers-reduced-motion` no hay animaciones ni desplazamientos, pero todo funciona igual.
- **Rendimiento:**
  - Sin librerías en el sitio público.
  - Una sola llamada de datos (`datos_publicos`).
  - Imágenes con `srcset` y carga diferida.
  - `modulepreload` de los módulos.
- **Mediciones** (Lighthouse móvil, 3 corridas con servidor que comprime):
  - Rendimiento 91, accesibilidad 100 y buenas prácticas 100.
  - LCP de 1,3 a 1,4 s.
  - CLS de 0,19 con la franja demo y 0,049 sin ella.
- **Peso del sitio público:** unos 153 KB sin comprimir y unos 37 KB con gzip en modo Supabase, sin fuentes ni fotos.

---

## 14. Pruebas

### 14.1 Cómo correrlas

```bash
bash tests/sql/probar.sh                                   # SQL y RLS en un Postgres local (sin Docker)
python3 -m http.server 8080 &
NODE_PATH="$(npm root -g)" node tests/verificar.cjs        # 26 casos en modo demo (Playwright + Chromium)
ICT_CAPTURAS=1 NODE_PATH="$(npm root -g)" node tests/verificar.cjs   # + capturas en tests/capturas/
DENO=/ruta/deno bash tests/funciones/probar.sh             # función enviar-lead (10 casos) + tipos
node tests/documentacion.mjs                               # este documento cubre todos los archivos
```

**Variables:**

- `ICT_SOLO="regex"`: corre solo los casos cuyo nombre coincide.
- `ICT_BASE=URL`: por ejemplo `http://localhost:8081/Cotizadora-ICT`, para simular GitHub Pages.
- `HTTPS_PROXY`: Chromium la usa para cargar Google Fonts.

### 14.2 Qué cubre `tests/verificar.cjs` (26 casos, agrupados por tema)

1. Modo demo: la franja y DEMO aparecen; al borrar los datos demo, desaparecen.
2. Nuevo + iPhone 18 Pro Max + 256 GB: queda una tarjeta, el detalle en línea y el carrusel con exactamente Negro y Plata.
3. Los filtros solo ofrecen opciones con stock; al encadenar, se limpian solos; un segundo toque desmarca.
4. Un equipo con stock 0 o sin publicar no aparece.
5. Cambiar un precio en el panel lo cambia en el sitio y actualiza la fecha del pie.
6. Con UTM, el pedido lleva todos los campos.
7. WhatsApp abre con el mensaje exacto. Un usado lleva batería y estado (casos 7 y 8). La consulta sin stock lleva su mensaje (7b).
8. Pop-up: errores, foco, formato del celular, reintento y "Abrir WhatsApp" tras dos fallos.
9. `/admin` sin sesión pide login. La tienda no ve Usuarios, no renombra, y la capa de datos también se lo impide.
10. La agencia invita y desactiva usuarios.
11. Validaciones del panel.
12. A 320, 360, 768 y 1440 px: sin scroll horizontal, un `h1` y sin errores en sitio, legales y todo el panel.
13. Carrusel: dedo, flechas, puntos, muestras, teclado y Escape.
14. Gesto táctil real en el carrusel y cierre de la hoja con el gesto.
15. Sin Apple: ni imágenes en el repo, ni la manzana U+F8FF, ni referencias, y solo recursos externos de Google Fonts.
16. Contraste AA en 4 combinaciones: claro, oscuro, amarillo sobre blanco, y primario oscuro en tema oscuro.
17. Textos de 16 px o más y zonas táctiles de 44 px, en el sitio y en el pop-up.
18. Lista de modelos con teclado y buscador cuando hay más de 8.
19. `prefers-reduced-motion`: sin animaciones en curso y todo funciona.
20. Copy: sin tuteo ni promesas, sin `Purchase`.
21. Píxel: `PageView`, `ViewContent` y `Lead` con `eventID`, sin datos personales.
22. Formatos: `$5.299.000`, fecha D/M/AAAA y código sin O/0/I/1.

### 14.3 "Supabase local" y `tests/verificar-supabase.cjs` (9 casos)

**Cómo levantarlo y probarlo:**

```bash
BIN=/carpeta/con/postgrest,auth(+migrations/),deno bash tests/supabase-local/levantar.sh
NODE_PATH="$(npm root -g)" ICT_SUPABASE_JS=/ruta/supabase-js.mjs node tests/verificar-supabase.cjs
bash tests/supabase-local/levantar.sh detener
```

**Puertos:**

| Puerto | Servicio |
|---|---|
| 54330 | Postgres |
| 9999 | GoTrue v2.180.0 (con las plantillas en español y el SMTP 2525) |
| 9998 | PostgREST 12.2.3 |
| 9100 | `enviar-lead` |
| 9101 | Webhook de GHL simulado |
| 9102 | `usuarios` |
| 2525 | SMTP simulado |
| 54321 | Pasarela |

**Los 9 casos:**

1. El sitio carga con la RPC.
2. El pop-up pasa por la función y llega al webhook con todos los campos.
3. Permisos del panel.
4. Un precio cambiado en el panel se ve en el sitio, con la fecha.
5. Crear un equipo con foto (Storage simulado).
6. La agencia borra la demo.
7. **Invitación:** el correo en español, el enlace, "Cree su contraseña" y el ingreso.
8. **Recuperación:** el enlace y la contraseña nueva.
9. **Desactivar** (no puede entrar) y **reactivar**.

### 14.4 Lo que no se pudo probar

- El Storage **real** de Supabase. Sus reglas sí están probadas en SQL.
- Supabase real: correos reales y la función `usuarios` en la nube.
- GHL real.
- El script de seguimiento de GHL.

---

## 15. Despliegue: GitHub Pages (demo) y producción por tienda

### 15.1 GitHub Pages (modo demo)

**Activarlo** (lo debe hacer el dueño, porque Claude no tiene acceso a esa configuración):

1. Ir a **Settings → Pages** del repo.
2. En **Source**, elegir **Deploy from a branch**.
3. Elegir la rama `claude/gallant-euler-ezco6g` y la carpeta `/ (root)`, y guardar. `main` todavía solo tiene el README inicial.

**URLs:**

- Sitio: `https://jaredmarketingmaster.github.io/Cotizadora-ICT/`
- Panel: `…/admin/`, con `agencia@demo.co` o `tienda@demo.co` y la clave `demo1234`.

**Ojo:**

- En demo los datos viven solo en ese navegador.
- Para probar el paso a WhatsApp, cargar un número en **Mi tienda**.

### 15.2 Producción, una tienda

1. **Proyecto de Supabase.** Conviene la región São Paulo.
2. **Migraciones:** correr `0001`, `0002` y `0003`, en ese orden.
3. **Registro:** apagar "Allow new users to sign up".
4. **Direcciones:** Site URL y Redirect URLs apuntando a `/admin/`.
5. **Correo:** SMTP propio y las plantillas de `supabase/correos/`.
6. **Primer usuario de agencia:** crearlo en Authentication y luego `insert into perfiles …`. El SQL exacto está en el README.
7. **Funciones:**
   - `supabase functions deploy enviar-lead --no-verify-jwt` y `supabase functions deploy usuarios`.
   - `supabase secrets set GHL_WEBHOOK_URL=… ORIGENES_PERMITIDOS=https://dominio`.
8. **`config.js`:** `backend: "supabase"`, la URL, la clave anon o publishable y el `metaPixelId`.
9. **Publicar** en cualquier hosting estático.
10. **Antes de abrir al público:**
    1. Cargar logo, WhatsApp, legales e inventario, y activar los modelos.
    2. Con el usuario de agencia, tocar "Borrar datos de demostración".

---

## 16. Decisiones tomadas y su porqué

| Decisión | Por qué |
|---|---|
| Código + Supabase en vez de AI Studio | No había acceso a AI Studio. Supabase da lo mismo: base de datos con RLS, usuarios y archivos. |
| Inbound Webhook en vez del formulario nativo | El formulario nativo no se puede completar ni enviar desde código fuera de GHL (iframe de otro dominio). No se usan endpoints sin documentar. |
| Back-end demo en el navegador | Permite ver, probar y presentar todo sin servidor (GitHub Pages) y correr la suite sin red. |
| "Cantidad disponible" = suma de stock | Es el significado literal de "cantidad disponible". |
| El detalle se abre solo con los **tres** filtros y una tarjeta | Lectura literal del prompt. |
| Los filtros de la URL se respetan sin stock | Un anuncio de un equipo agotado lleva a "Consultar por WhatsApp". |
| La demo activa 4 modelos (`activo_por_demo`) | El catálogo debe quedar todo inactivo, pero los equipos demo deben verse. Borrar la demo los vuelve a apagar, salvo que la tienda los haya tocado. |
| Precios demo redondos | No son precios reales; van marcados como DEMO. |
| Recencia de la generación = mayor `orden` | Ordena "Plegable" y los modelos futuros sin escribir las generaciones en el código. |
| Usados con batería y estado obligatorios | Van en la ficha y en el mensaje. |
| El slug no cambia al renombrar | No rompe los enlaces de anuncios ya publicados. |
| Texto de relleno en la casilla de autorización | La casilla obligatoria no puede quedar sin texto. El texto real lo redacta el abogado. |
| Sin conversor de HEIC | Pesa cerca de 1 MB. El iPhone convierte a JPEG al elegir la foto y Safari lee HEIC. |
| `flowType: "implicit"` | Los enlaces de invitación y recuperación funcionan en otro navegador o celular. |
| Google Fonts sin bloquear | El LCP bajó de 2,7 s a 1,4 s. |
| Rutas relativas y `.nojekyll` | El sitio funciona en cualquier subcarpeta, como `/Cotizadora-ICT/` en GitHub Pages. |

---

## 17. Limitaciones conocidas y pendientes

**Limitaciones:**

- En modo demo los datos viven solo en ese navegador.
- CLS de 0,19 solo con la franja de modo demo.
- Un deslizamiento que empieza **sobre la flecha** del carrusel no mueve el carrusel. La flecha es un botón encima de la foto; eso es lo esperado.
- No se garantiza la atribución nativa de GHL por el webhook.
- El paso a WhatsApp con `window.open` puede ser bloqueado por el navegador después de la espera. Por eso existe el botón "Abrir WhatsApp".

**Pendientes del documento del prompt:**

- [ ] Textos de privacidad, términos y autorización de datos (Ley 1581). Los redacta el abogado.
- [ ] Confirmar en apple.com/co los nombres del catálogo maestro (del 11 al 17, iPhone Air e iPhone Duo).
- [ ] Definir quién carga las fichas técnicas y desde qué fuente verificada.
- [ ] Confirmar con cada tienda si su precio es de contado, para `etiqueta_precio`.
- [ ] Crear en GHL los campos personalizados y el workflow con Inbound Webhook.

**Pendientes por el cambio de plataforma:**

- [ ] Plan de Supabase por tienda y quién lo paga. Verificar los límites y la pausa del plan gratuito.
- [ ] SMTP propio para los correos de Supabase.
- [ ] Probar el script de seguimiento externo de GHL, si se quiere la atribución nativa.
- [ ] Activar GitHub Pages (Settings → Pages).

---

## 18. Cómo mantener este documento

**Regla:** todo cambio en el repo (código, estilos, SQL, pruebas o configuración) se acompaña, en el mismo trabajo, de la actualización de este archivo.

**Qué actualizar:**

1. **Sección 5 (mapa de archivos):** agregar, quitar o redescribir los archivos que cambiaron.
2. **La sección temática afectada:** datos (6–7), sitio (8–9), panel (10), funciones (11), GHL (12), diseño (13), pruebas (14), despliegue (15) o decisiones (16).
3. **Sección 17:** si cambia una limitación o un pendiente.
4. **Sección 19:** agregar **una entrada nueva arriba**, con la fecha, qué se pidió, qué se hizo, qué archivos se tocaron y cómo se verificó. El hash del commit puede agregarse en la entrada siguiente.
5. **Fecha:** actualizar "Última actualización" al inicio.

**Cómo se hace cumplir:**

- **`tests/documentacion.mjs`** falla si algún archivo versionado no aparece mencionado, entre comillas invertidas, en el documento.
- **`.claude/hooks/documentacion.sh`** (hook `Stop` de Claude Code, en `.claude/settings.json`) bloquea el fin del turno y pide actualizar el documento en dos casos:
  - Hay archivos cambiados (confirmados, sin confirmar o nuevos) **después** del último cambio a `DOCUMENTACION.md`.
  - El verificador falla.

  Para no entrar en un bucle, no bloquea dos veces seguidas (`stop_hook_active`).
- **`CLAUDE.md`** lo exige como regla para toda sesión de Claude Code.

Otros LLM o herramientas que no ejecuten hooks deben seguir la misma regla a mano.

---

## 19. Registro de cambios

> La entrada más nueva va arriba. Formato: **fecha · título** — pedido → qué se hizo → archivos → verificación.

### 20/10/2026 · A1: Inicio solo con "Publicados" y "En borrador"

- **Pedido de Jared (fase A, punto A1):** quitar "Sin stock" y su enlace de la tarjeta de inventario de Inicio.
- **Hecho:** se quitaron la estadística y su enlace en `assets/js/panel/panel.js`, y la grilla de `assets/css/panel.css` pasó a 2 columnas. El resto de Inicio no cambia.
- **Verificación:** el caso 9 de `tests/verificar.cjs` comprueba que solo aparecen "Publicados" y "En borrador".

### 20/10/2026 · Documentación completa y mantenimiento automático

- **Pedido de Jared:** un archivo Markdown con todo el proceso, que se actualice con cada cambio y sirva para pasárselo a otros LLM.
- **Hecho:**
  - Se creó `DOCUMENTACION.md` (este archivo).
  - Se creó el verificador `tests/documentacion.mjs`.
  - Se creó el hook `Stop` (`.claude/hooks/documentacion.sh`) y se registró en `.claude/settings.json`.
  - Se agregó la regla en `CLAUDE.md` y un enlace en `README.md`.
- **Verificación:** el verificador pasa; el hook se probó con un cambio sin documentar (bloquea) y con el documento actualizado (deja terminar).

### 20/10/2026 · Pregunta: cómo acceder al panel — commit: sin cambios de código

- **Pedido:** cómo entrar al panel para gestionar descripciones, precios e imágenes.
- **Hecho:** se explicaron la ruta `/admin/`, los usuarios demo y dónde se edita cada cosa (secciones 10.2 y 10.4). No hubo cambios en el repo.

### 20/10/2026 · Preparar GitHub Pages — commit `175d1d7`

- **Pedido:** dejar todo listo para verlo en GitHub Pages.
- **Hecho:**
  - Se agregó `.nojekyll`.
  - Las dos importaciones de `tests/verificar.cjs` pasaron de rutas absolutas a relativas.
  - Se agregó al README la guía "Verlo en GitHub Pages".
- **Verificación:** 26 de 26 servido bajo `/Cotizadora-ICT/` y 2 de 2 de los casos tocados en la raíz. El repo es público y Pages no estaba activado (`has_pages: false`).

### 20/10/2026 · Usuarios y correos — commit `8b6ab75`

- **Pedido:** continuar.
- **Hecho:** se probó la función `usuarios` contra el Supabase local con un SMTP simulado.
  - **Bug corregido:** la doble invitación respondía 500 y mandaba otro correo.
  - Se agregaron las plantillas de correo en español.
  - `flowType: "implicit"` quedó explícito.
  - Se agregaron tres casos de punta a punta: invitar, recuperar y desactivar o reactivar.
- **Archivos:** `supabase/functions/usuarios/index.ts`, `assets/js/datos/supabase.js`, `supabase/correos/*`, `tests/supabase-local/{levantar.sh,pasarela.mjs,smtp-simulado.mjs}`, `tests/verificar-supabase.cjs` y `README.md`.
- **Verificación:** 9 de 9 en dos corridas, 26 de 26 en demo, la prueba SQL y la de la función.

### 20/10/2026 · Pruebas de aceptación, accesibilidad y documentación — commit `118985f`

- **Hecho:**
  - Suite de 26 casos en demo y de 6 casos en Supabase (ver sección 2.8).
  - Correcciones: textos de 16 px, puntos de 44 px, `h1` oculto, contraste en tema oscuro y botón de ícono.
  - Google Fonts sin bloquear.
  - Corrección del PID en `levantar.sh`.
  - `README.md` y `CLAUDE.md`.
- **Verificación:** todas las suites en verde. Lighthouse 91/100/100.

### 20/10/2026 · Construcción inicial (en progreso) — commit `9ec575b`

- **Pedido:** "crea de 0 a 100% este proyecto" a partir del *Prompt de la cotizadora I.C.T. v2*.
- **Hecho:** esquema SQL con RLS, capa de datos, sitio público, panel, funciones y pruebas SQL (ver secciones 2.2 a 2.7).

### 20/10/2026 · Commit inicial — `f4c6579`

- **Autor:** Jared. Repo vacío, con un `README.md` de una línea.

---

## 20. Glosario

| Término | Significado |
|---|---|
| **I.C.T.** | Sistema de Marketing Masters Group para tiendas de iPhone: **I**nterrupción (anuncios en Meta), **C**aptura (esta cotizadora + WhatsApp + CRM) y **T**racking (cada venta atribuida a su campaña). |
| **GHL** | GoHighLevel, el CRM donde llegan los contactos. |
| **Inbound Webhook** | Disparador de un workflow de GHL que recibe un `POST` JSON desde afuera. |
| **Supabase** | Plataforma con Postgres, autenticación (GoTrue), API REST (PostgREST), Storage y funciones de servidor (Deno). |
| **RLS** | *Row Level Security*: reglas de Postgres que deciden qué filas puede leer o escribir cada rol. |
| **anon / authenticated / service_role** | Roles de Supabase: público, usuario con sesión, y clave de servicio (salta la RLS; nunca va al navegador). |
| **Modo demo** | Back-end en el navegador con datos de ejemplo y la franja "Sitio en preparación". |
| **`activo_por_demo`** | Marca de los modelos que activó la demo, para apagarlos al borrarla. |
| **Código de cotización** | `COT-` y 4 caracteres sin O, 0, I ni 1. Une el lead de GHL, el evento del píxel y el chat de WhatsApp. |
| **FLIP** | Técnica de animación: *First, Last, Invert, Play*. Se usa para reacomodar la galería. |
| **LCP / CLS** | Métricas de Core Web Vitals: cuánto tarda en aparecer el contenido principal y cuánto se mueve la página al cargar. |
| **Slug** | Versión de un nombre para la URL, ej. `iphone-18-pro-max`. |
