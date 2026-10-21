# Documentación completa — Cotizadora I.C.T.

> **Para cualquier persona o LLM que reciba este archivo:** aquí está todo el proyecto: qué es, por qué está hecho así, cómo está organizado el código archivo por archivo, cómo fluyen los datos, cómo se prueba, qué falta y qué cambió en cada etapa. Si solo lee una sección, lea la **1** (resumen) y la **3** (reglas). Si va a tocar código, lea también la **5** (mapa de archivos) y la **18** (cómo mantener este documento).
>
> **Este documento se mantiene al día con cada cambio.** El verificador (`node tests/documentacion.mjs`) falla si algún archivo del repo no figura en la sección 5, y el hook de Claude Code (`.claude/hooks/documentacion.sh`) no deja terminar un trabajo con cambios sin actualizarlo. Ver sección 18.

**Última actualización:** 21/10/2026 · **Rama de trabajo:** `claude/gallant-euler-ezco6g` · **Repo:** <https://github.com/jaredmarketingmaster/Cotizadora-ICT> (público)

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
  - Catálogo de 32 modelos y 6 equipos demo (desde `0006`, 42 modelos y sus colores).
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
| `index.html` (≈140) | Sitio público, una sola página: <ul><li>En el `<head>`, un script en línea aplica la **apariencia de la visita anterior** (`localStorage["cotizadora:apariencia"]`: tema, tamaño y colores) antes del primer pintado; valida cada valor. Las páginas legales tienen el mismo script.</li><li>La lista de equipos va dentro de `#vista-equipos`, con las flechas y el indicador del carrusel (ocultos en cuadrícula).</li><li>Franja demo, encabezado con logo, nombre y título, y tarjeta de filtros (segmentado, lista desplegable y chips).</li><li>Contador y "Limpiar filtros", galería, estado vacío y detalle en línea.</li><li>Información de la tienda, pie, `<dialog id="hoja-detalle">` (detalle del equipo), barra fija de compra y `<dialog id="popup">`.</li><li>Carga Google Fonts (Inter) sin bloquear el pintado, `modulepreload` de los módulos y `assets/js/sitio/principal.js`.</li></ul> |
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
| `assets/css/sitio.css` (≈610) | Sitio público: <ul><li>Franja demo y encabezado (el brillo decorativo va en `::before` para no tocar el contraste).</li><li>Filtros: segmentado, lista desplegable propia y chips.</li><li>Galería (1 → 2 → 3 → 4 columnas) y tarjetas.</li><li>Detalle y carrusel (scroll-snap).</li><li>Hoja: pantalla completa desde abajo en celular, ventana centrada en escritorio desde 900 px.</li><li>Barras de compra (apiladas por debajo de 480 px).</li><li>Información de la tienda, pop-up y **pie con el color secundario** de la tienda (texto `--sobre-secundario` y `--sobre-secundario-suave`).</li><li>Animaciones de apertura y páginas legales.</li><li>**Tamaño del texto** (`data-tamano` en `<html>`): variables `--t-titulo` y `--t-espacio`; Grande pone la raíz en 112,5 %.</li><li>**Aire entre secciones** (todo multiplicado por `--t-espacio`): pie con 48 px arriba y abajo en celular y 72 px en escritorio (`--pie-aire`) y bloques separados 18–24 px; 52–72 px entre el título y los filtros; 40–64 px arriba y abajo de la zona de equipos (las dos vistas).</li></ul> |
| `assets/css/panel.css` (≈307) | Panel, pensado primero para celular: <ul><li>Acceso y barra superior pegajosa.</li><li>Navegación en pastillas desplazables.</li><li>Bloques, estadísticas, avisos e interruptor.</li><li>Lista de inventario: tarjetas en celular, filas desde 1000 px.</li><li>Formulario por pasos y acciones pegajosas.</li><li>Fotos, filas de ficha, catálogo, vista previa de marca y recorte del logo.</li><li>Lista editable, usuarios, aviso flotante y ventana de confirmación.</li></ul> |

### 5.4 JavaScript compartido (`assets/js/`)

| Archivo | Exporta y para qué |
|---|---|
| `assets/js/utils.js` (≈241) | Utilidades sin dependencias: <ul><li>**Números:** `formatearMiles`, `formatearCOP`, `leerPrecio` ("5.299.000" → 5299000).</li><li>**Fechas:** `fechaCorta` (D/M/AAAA en America/Bogota).</li><li>**Texto:** `escaparHTML`, `plural`, `formatoBasico` (mini-markdown seguro para los legales: `##`, `**`, listas y enlaces http/mailto).</li><li>**Capacidades:** `CAPACIDADES_SUGERIDAS`, `slugCapacidad`, `capacidadDeSlug`, `capacidadEnGB`.</li><li>**Contacto:** `soloDigitos`, `celularValido` (10 dígitos que empiezan por 3), `formatearCelular` ("300 123 4567"), `correoValido`, `whatsappTiendaValido` (12 dígitos que empiezan por 57).</li><li>**Código:** `generarCodigo`, `codigoValido`. "COT-" más 4 caracteres de un alfabeto de 32 sin O, 0, I ni 1, con `crypto.getRandomValues`; como 256 % 32 = 0, el sorteo no tiene sesgo.</li><li>**Contraste WCAG:** `hexValido`, `luminancia`, `contraste`, `textoSobre` (blanco o casi negro, garantiza al menos 4,5:1), `ajustarParaTexto` (oscurece o aclara un color hasta 4,5:1 sobre uno o varios fondos; si en una dirección no alcanza, prueba la otra) y `mezclar`.</li><li>**Varios:** `sesion` (sessionStorage seguro), `seguro`, `reducirMovimiento`, `esperar`, `idEvento`.</li></ul> |
| `assets/js/tema.js` (≈45) | `variablesTema(tienda)` y `aplicarTema(tienda)`: pasan `color_primario`, `color_secundario` y `tema` a variables CSS y calculan el texto con contraste AA. También ponen `data-tamano` (`tamano_texto`) en `<html>`, que solo lee `sitio.css`, y `--sobre-secundario-suave` (texto suave del pie, 4,5:1 o más sobre el secundario). `--primario-texto` se ajusta contra **todas** las superficies del tema. También exporta `FONDOS`. |
| `assets/js/ilustracion.js` (≈51) | `telefonoSVG(colorHex, titulo)`: teléfono genérico con el marco del color del equipo. `logoGenericoSVG()`: ícono para cuando no hay logo. |

### 5.5 Capa de datos (`assets/js/datos/`)

| Archivo | Qué es |
|---|---|
| `assets/js/datos/api.js` (≈17) | `api()`: devuelve, una sola vez, el adaptador `demo` o `supabase` según `config.js`. Si se pide Supabase sin URL o clave, usa demo y avisa en la consola. |
| `assets/js/datos/comun.js` (≈62) | Reglas compartidas por los dos adaptadores: <ul><li>`ErrorDatos`.</li><li>`equipoEsPublico`: publicado, con stock (`en_stock`) y de un modelo activo.</li><li>`LADO_GRANDE` = 1600 y `LADO_MINIATURA` = 640.</li><li>`rutaMiniatura`: `x.webp` → `x-640.webp`.</li><li>`CAMPOS_TIENDA`, `CAMPOS_EQUIPO`, `CAMPOS_COLOR`, `MAX_MAS_VENDIDOS` y `MENSAJE_MAS_VENDIDOS`, `nombreColor(color, mostrar)` (nombre que ve el cliente: el elegido por la tienda o el oficial en inglés, o el de la fuente), `TAMANOS_TEXTO`, `ESTADOS_ESTETICOS` y `elegir`.</li><li>`mensajeDeError`: traduce los errores de Postgres al español; los mensajes de los disparadores (ya en español) pasan tal cual.</li></ul> |
| `assets/js/datos/semilla.js` (≈115) | `CATALOGO`: los **42 modelos** desde el iPhone 7, con slug, generación y orden de 10 en 10 por fecha de lanzamiento. `COLORES`: los 183 colores oficiales por slug (`[nombre_es, nombre_en, hex]`, vacío si la fuente no lo da). `DEMO_EQUIPOS`: los 6 equipos demo. `slugDe`. **Debe coincidir** con `0006_catalogo_colores.sql` y `0003_demo.sql`; la prueba SQL lo revisa. |
| `assets/js/datos/demo.js` (≈436) | Back-end de demostración. Ver sección 7.2. |
| `assets/js/datos/supabase.js` (≈304) | Back-end Supabase. Ver sección 7.3. |

### 5.6 Sitio público (`assets/js/sitio/`)

| Archivo | Qué es |
|---|---|
| `assets/js/sitio/principal.js` (≈328) | **Orquestador del sitio.** Sus tareas: <ul><li>Captura la atribución, inicia el píxel y el script de GHL.</li><li>Carga los datos y aplica el tema.</li><li>Dibuja marca, información y pie.</li><li>Arma los filtros y lee y escribe la URL.</li><li>Actualiza contador y galería, y decide el detalle en línea.</li><li>Abre la hoja de detalle (con gesto de deslizar para cerrar) y conecta la barra fija.</li><li>En demo, recarga si otra pestaña cambió los datos (evento `storage`).</li></ul> |
| `assets/js/sitio/catalogo.js` (≈163) | **Lógica pura, sin DOM:** <ul><li>`prepararCatalogo`, que calcula la recencia de cada generación como el mayor `orden` de sus modelos.</li><li>`filtrar`, `contarEquipos` (cantidad de equipos: el stock es sí/no), `opcionesModelo` (agrupadas por generación, de la más nueva a la más vieja), `etiquetaGeneracion` ("Generación 11", "Generación XS y XR"; "Plegable" queda igual; el panel usa la misma) y `opcionesCapacidad`.</li><li>`prepararCatalogo` guarda también los colores (`cat.colores`, por id) y le pone a cada equipo `color` (el oficial), `color_nombre` (el que ve el cliente, con `nombreColor`) y `color_hex` (la muestra oficial o vacío). El resto del sitio (tarjetas, muestras, detalle, texto alternativo, WhatsApp y píxel) usa esos dos campos.</li><li>`encadenar`: limpia las elecciones que un cambio deja inválidas.</li><li>`tarjetas`: nuevos por modelo y capacidad, usados por unidad; orden: destacados, generación más nueva y precio.</li><li>`diapositivas`, `textoCondicion`, `textoAlternativo` y `describirBusqueda`.</li><li>`mensajeCompra`, `mensajeSinStock` y `enlaceWhatsApp`.</li></ul> |
| `assets/js/sitio/filtros.js` (≈189) | Controles de los filtros: <ul><li>`iniciarSegmentado`: Nuevo/Usado, donde un segundo toque desmarca; pone `--i` y `--visible` para el indicador que se desliza.</li><li>`iniciarChips`: almacenamiento.</li><li>`iniciarDesplegable`: lista propia con `role="listbox"`, grupos por generación, "Todos los modelos", cantidad por modelo, buscador si hay más de 8, teclado (flechas, Inicio/Fin, Enter, Escape, Tab) y cierre al tocar afuera.</li><li>`marcarLimpiado`: destello cuando un filtro se limpia solo.</li></ul> |
| `assets/js/sitio/galeria.js` (≈125) | `crearGaleria(lista, api)`: tarjetas con clave estable. Al filtrar, las que salen se desvanecen y las que quedan se reacomodan con **FLIP** (Web Animations API). Sin animación si hay `prefers-reduced-motion`. Con `usarCarrusel(c)`, dibuja las tarjetas y le pasa el movimiento al carrusel. |
| `assets/js/sitio/carrusel-equipos.js` (≈250) | Vista **Carrusel** de los equipos: `crearCarruselEquipos(region, lista)` → `{reconstruir, mover, actual}`. Posición continua `pos`; cada tarjeta se dibuja a la distancia más corta del bucle (transform, opacidad y escala). Bucle infinito; arrastre con inercia y ajuste; flechas; ← →; trackpad horizontal; toque en vecina = centrarla; indicador "N de M"; altura de la tarjeta más alta; con 2 tarjetas, una sola vecina (con fundido si cambia de lado); con 1, sin flechas ni bucle; `data-moviendo` en la región mientras se mueve. Sin animación con `prefers-reduced-motion`. |
| `assets/js/sitio/detalle.js` (≈219) | `crearDetalle(...)`: carrusel y ficha. <ul><li>El carrusel usa scroll-snap y se mueve con el dedo, flechas, puntos, muestras de color y teclado; con varias fotos muestra miniaturas.</li><li>La ficha tiene nombre, etiqueta, variante, `etiqueta_precio` y precio (el elemento más grande), datos de usado, descripciones, "Ver ficha técnica" (solo filas con valor), pagos, entrega, garantía y el botón.</li><li>También exporta `htmlBarraCompra` e `ICONO_WA`.</li></ul> |
| `assets/js/sitio/transiciones.js` (≈80) | Apertura y cierre de los diálogos del sitio: `abrirConTransicion(dialogo, mostrar, {origen, destino})` usa la **View Transitions API** (la foto de la tarjeta viaja al detalle; el diálogo lleva `data-vt` mientras dura) y, sin ella o con reduced-motion, abre directo con la animación de CSS de siempre. `cerrarConTransicion` hace una salida corta (baja en celular; se achica y desvanece en pantallas grandes) y después `close()`; `cerrarConEscape` lo usa con Escape. |
| `assets/js/sitio/popup.js` (≈272) | `crearPopup(...)`: el pop-up "Antes de pasar a WhatsApp" completo. Ver sección 9. |
| `assets/js/sitio/fotos.js` (≈19) | `htmlFoto`: `<img>` con `srcset` 640w/1600w, `loading="lazy"` o `fetchpriority="high"`. `htmlMedio`: la foto principal o la ilustración. |
| `assets/js/sitio/atribucion.js` (≈31) | `CLAVES_ATRIBUCION` (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `ad_id`, `fbclid`), `capturarAtribucion` y `leerAtribucion`. Guarda en `sessionStorage["cotizadora:atribucion"]` el **primer valor por clave** de la sesión. |
| `assets/js/sitio/pixel.js` (≈40) | `iniciarPixel`: carga el píxel solo si hay un ID válido y manda `PageView`. `evento(nombre, parametros, eventID)`. `parametrosEquipo(q)`: `content_name`, `content_ids`, `content_type`, `value` y `currency: "COP"`. |
| `assets/js/sitio/legal.js` (≈22) | Script de `/privacidad/` y `/terminos/`: carga la tienda, aplica el tema, muestra el logo y el texto con `formatoBasico`. Si no hay texto: "La tienda todavía no publicó este texto." |

### 5.7 Panel (`assets/js/panel/`)

| Archivo | Qué es |
|---|---|
| `assets/js/panel/panel.js` (≈283) | Arranque, acceso y rutas. <ul><li>**Acceso:** vistas de login, recuperación y "Cree su contraseña" o "Contraseña nueva", según `tipoDeEnlace()`.</li><li>`entrar()` y el router `enrutar()` por hash, que pregunta si hay cambios sin guardar (`ctx.sucio`) y llama `ctx.alSalir`.</li><li>La vista **Inicio**: estadísticas, fecha de precios, avisos de "Lo que falta" y modo demo (gestor).</li><li>Rutas por rol: el administrador solo llega a Usuarios; el gestor, a todo lo demás. La navegación muestra solo los enlaces de su rol (`data-rol`).</li><li>Define `ctx`, que tiene: `api`, `usuario`, `tienda`, `sucio`, `alSalir`, `esAdministrador()`, `esGestor()`, `inicio()`, `recargarTienda()` e `ir()`.</li></ul> |
| `assets/js/panel/ui.js` (≈82) | Piezas de interfaz: `$`, `$$`, `esc`, `avisar` ("Guardado" o error), `confirmar` (promesa sobre `<dialog>`), `conBoton` (botón en espera más aviso), `campoTexto`, `interruptor`, `marcarError` y `enfocarPrimerError`. |
| `assets/js/panel/inventario.js` (≈605) | Inventario. <ul><li>**Lista** con buscador y filtros (modelo, condición, publicado y los especiales "sin stock" y "sin foto").</li><li>**Edición rápida** de precio, el interruptor **Stock** ("Con stock" / "Sin stock"), publicado y **Más vendido** (máximo 3; el cuarto avisa sin llamar a la base): se guarda al salir del campo, con Enter o al mover el interruptor.</li><li>Borrar con confirmación (borra también las fotos).</li><li>**Formulario** por pasos para agregar, completo para editar y duplicar, con validaciones.</li><li>**Fotos:** subir, cámara, arrastrar y soltar, reordenar, quitar y máximo 6.</li><li>**Color:** el paso Color muestra solo los colores oficiales del modelo (muestra y nombre en inglés, o el de la fuente) y el campo opcional "Nombre que verá el cliente". No se crean colores ni se escribe un hexadecimal desde el equipo. Cambiar el modelo borra el color elegido. Si el modelo no tiene colores, se puede guardar sin color.</li><li>Opción de activar el modelo si estaba inactivo.</li><li>Limpia las fotos subidas si se sale sin guardar.</li></ul> |
| `assets/js/panel/tienda.js` (≈359) | Mi tienda: <ul><li>Datos de la tienda y redes.</li><li>Marca: logo con **recorte** (horizontal 3:1 o cuadrado, arrastrar, zoom y teclado), favicon de 128 px, colores con selector y hexadecimal, tema, **tamaño del texto** (Compacto, Normal o Grande) y **vista previa en vivo** con el contraste calculado.</li><li>**Diseño del sitio:** cómo se ven los equipos, "Cuadrícula" o "Carrusel", cada una con su explicación.</li><li>Venta: etiqueta del precio, **lista editable** de formas de pago, entrega y garantías.</li></ul> |
| `assets/js/panel/fichas.js` (≈120) | Fichas técnicas: lista de modelos activos y editor por modelo. Tiene descripción, filas etiqueta/valor (agregar, editar, subir, bajar y borrar, con etiquetas sugeridas) y "Copiar ficha de otro modelo". |
| `assets/js/panel/catalogo.js` (≈215) | Catálogo (gestor) agrupado por generación con interruptor activo/inactivo; renombra (el slug no cambia), reordena (intercambia el `orden`) y agrega modelos al final. **Colores** de cada modelo (desplegable): muestra, nombre en español y en inglés (solo lectura), hexadecimal de la fuente fijo y campo para completar el que falta; en modelos sin colores oficiales, el gestor agrega y borra colores de la tienda. |
| `assets/js/panel/legales.js` (≈52) | Editores de privacidad, términos, autorización de datos y aviso de marca, con aviso si están vacíos y vista previa del formato básico. |
| `assets/js/panel/usuarios.js` (≈100) | Solo administrador: invitar (correo y rol), **asignar rol** (selector por usuario), desactivar con confirmación y reactivar. Su propia fila no tiene controles. |
| `assets/js/panel/imagenes.js` (≈85) | Fotos en el navegador, sin librerías: <ul><li>`validarArchivo`: jpg, png, webp o heic de hasta 10 MB.</li><li>`comprimirFoto`: devuelve `{grande ≤1600px, miniatura ≤640px, ext}` en WebP, o JPEG si el navegador no codifica WebP.</li><li>`codificar`, `cargarImagen` y `MAX_BYTES`.</li></ul>El HEIC se rechaza con un aviso claro si el navegador no lo lee. |
| `assets/js/panel/video.js` (≈110) | Video corto del equipo, validado en el navegador antes de subir y **sin comprimir**: <ul><li>`validarVideo(archivo)`: MP4 o WebM; hasta 20 MB; hasta 15 s (con 0,1 s de margen). Devuelve `{ext, segundos}`.</li><li>MP4: `leerMp4` lee la caja `mvhd` (duración) y busca `avc1`/`avc3` en `moov` (H.264); no hace falta que el navegador sepa reproducirlo.</li><li>WebM: la duración que informa `<video>` (si dice Infinity, busca el final).</li><li>.mov, MP4 en HEVC u otro formato: "Este formato puede no verse en todos los celulares. Súbalo en MP4." (`MENSAJE_FORMATO`).</li></ul> |

### 5.8 Supabase (`supabase/`)

| Archivo | Qué es |
|---|---|
| `supabase/migrations/0001_esquema.sql` (≈351) | Tablas, funciones de rol, disparadores, RLS, `datos_publicos()`, `borrar_datos_demo()`, buckets y reglas de almacenamiento. Ver sección 6. |
| `supabase/migrations/0002_catalogo.sql` (≈42) | Inserta los **32 modelos** del catálogo maestro, en el orden del prompt, todos inactivos (`orden` 10, 20, …, 320). Cada modelo recibe su ficha vacía por disparador. |
| `supabase/migrations/0003_demo.sql` (≈36) | Pone el nombre "Tienda de demostración" y `modo_demo = true`, activa los 4 modelos que usa la demo (con `activo_por_demo = true`) e inserta los 6 equipos demo. |
| `supabase/migrations/0011_vista_equipos.sql` (≈12) | `tienda.vista_equipos`: `cuadricula` (por defecto) o `carrusel`. |
| `supabase/migrations/0010_mas_vendido.sql` (≈30) | `equipos.mas_vendido` y el disparador `equipos_mas_vendido` (`limitar_mas_vendidos`): no deja marcar un cuarto, con un candado por transacción para que dos marcas a la vez no pasen de 3. Todavía no se muestra en el sitio. |
| `supabase/migrations/0009_video.sql` (≈40) | Un video opcional por equipo: `equipos.video` (ruta con check) y bucket propio `videos` (público, 20 MB, `video/mp4` y `video/webm`); las reglas de Storage suman ese bucket (lee todo el mundo; sube, cambia y borra el gestor). |
| `supabase/migrations/0008_color_oficial.sql` (≈85) | Cada equipo usa un color oficial de su modelo: `equipos.color_id` (FK a `colores`) y `color_nombre_mostrar`; migra los equipos existentes por nombre (español o inglés; "Glacier" → Glaciar) conservando el nombre que veía el cliente; borra `color_nombre` y `color_hex`; disparador `equipos_color` (`validar_color_equipo`). |
| `supabase/migrations/0007_roles.sql` (≈200) | Roles **administrador** y **gestor** en lugar de agencia y tienda: convierte los perfiles, crea `es_administrador()` y `es_gestor()`, rehace todas las políticas (tablas y Storage), `proteger_catalogo`, `proteger_tienda`, `proteger_perfil` (siempre un administrador activo) y `borrar_datos_demo`, y borra `es_agencia()` y `es_staff()`. |
| `supabase/migrations/0006_catalogo_colores.sql` (≈415) | Catálogo desde el iPhone 7: agrega los 10 modelos que faltaban (por slug), renumera el `orden` de los 42 por fecha de lanzamiento (los de la agencia quedan al final) y crea `colores` con los 183 colores oficiales, el disparador `colores_proteger`, su RLS y `datos_publicos()` con colores. Ver sección 6. |
| `supabase/migrations/0005_tamano_texto.sql` (≈13) | Agrega `tienda.tamano_texto`: `compacto`, `normal` (por defecto) o `grande`. |
| `supabase/migrations/0004_en_stock.sql` (≈40) | El stock pasa de número a sí/no: agrega `equipos.en_stock` (verdadero por defecto), convierte `stock > 0` en verdadero y 0 en falso, rehace `equipos_leer` y `datos_publicos()` con `en_stock`, y quita `stock` y `usado_es_una_unidad`. |
| `supabase/functions/_compartido/lead.ts` (≈53) | `armarLead(datos)`: valida y arma el pedido que va a GHL. Exporta también `CAMPOS_ATRIBUCION` y `CAMPOS_OCULTOS`. No depende de Deno. |
| `supabase/functions/enviar-lead/index.ts` (≈73) | Función pública, sin JWT: valida y reenvía al Inbound Webhook de GHL. Ver sección 11.1. |
| `supabase/functions/usuarios/index.ts` (≈75) | Función solo para administradores activos: invitar (con rol), desactivar y reactivar con la clave de servicio. Ver sección 11.2. |
| `supabase/correos/invitacion.html` | Plantilla en español del correo de invitación. Usa `{{ .ConfirmationURL }}`. |
| `supabase/correos/recuperacion.html` | Plantilla en español del correo de recuperación. Usa `{{ .ConfirmationURL }}` y `{{ .Email }}`. |
| `supabase/correos/LEAME.md` | Dónde pegar cada plantilla y con qué asunto. |

### 5.9 Pruebas y herramientas (`tests/` y `.claude/`)

| Archivo | Qué es |
|---|---|
| `tests/verificar.cjs` (≈1450) | Suite de aceptación en **modo demo** con Playwright: **46 casos** (47 con `ICT_CAPTURAS`, que suma el caso de capturas de diseño). | Ver sección 14. |
| `tests/verificar-supabase.cjs` (≈311) | Suite de punta a punta del **modo Supabase** contra el Supabase local: **9 casos**. Reemplaza `config.js` en el navegador y puede servir un supabase-js local (`ICT_SUPABASE_JS`). |
| `tests/documentacion.mjs` | Verificador de este documento: falla si algún archivo versionado no aparece en la sección 5. |
| `tests/sql/probar.sh` | Crea un Postgres temporal, carga la imitación de Supabase y todas las migraciones en orden, compara la semilla con `semilla.js` y corre `pruebas.sql`. Antes de cada migración corre `tests/sql/antes_<migración>.sql` si existe. |
| `tests/sql/antes_0007_roles.sql` | Los usuarios de prueba con los roles viejos (agencia y tienda), para probar que `0007` los convierte. `pruebas.sql` los sigue usando. |
| `tests/sql/antes_0006_catalogo_colores.sql` | Un modelo de la agencia (orden 330) antes de `0006`, para probar que queda al final. |
| `tests/sql/antes_0004_en_stock.sql` | Datos con el esquema viejo (stock 4 y stock 0) para probar que `0004` los convierte bien. `pruebas.sql` los revisa y los borra. |
| `tests/sql/supabase_simulado.sql` | Roles `anon`, `authenticated` y `service_role`, esquema `auth` con `auth.uid()`, y `storage.buckets` y `storage.objects` mínimos. |
| `tests/sql/pruebas.sql` | Asserts de catálogo y semilla, y de RLS por rol (anon, sin perfil, inactivo, gestor, administrador). También validaciones, fecha de precios, colores, modo demo, perfiles (nadie se quita a sí mismo; siempre un administrador activo, también sin sesión) y borrar demo. |
| `tests/sql/comparar-semilla.mjs` | Compara el JSON de la semilla del SQL con `semilla.js`. |
| `tests/funciones/probar.sh` | Revisa los tipos de las dos funciones y prueba `enviar-lead` contra webhooks simulados: 10 casos. |
| `tests/funciones/servir.ts` | Corre una función de Supabase en un puerto fijo (`Deno.serve` no lee `PORT`). |
| `tests/funciones/webhook-simulado.mjs` | Webhook de GHL falso: guarda el último cuerpo recibido y responde con el código de `ESTADO`. |
| `tests/supabase-local/levantar.sh` | Levanta el "Supabase local" completo (ver sección 14.3) y deja `/tmp/cotizadora-supabase-local/entorno`. Con el argumento `detener`, lo apaga. |
| `tests/supabase-local/pasarela.mjs` | Pasarela en el puerto 54321 que imita las rutas de Supabase. Tiene Storage en memoria (lee la parte del archivo de los envíos multipart de supabase-js y exige el límite y los tipos de cada bucket: 413 y 415), sirve las plantillas de correo y agrega `Authorization` desde la `apikey`. |
| `tests/videos/corto.mp4`, `tests/videos/largo.mp4`, `tests/videos/corto.webm`, `tests/videos/hevc.mp4`, `tests/videos/clip.mov` | Videos de prueba hechos con ffmpeg (patrón de prueba, sin personas ni marcas): H.264 de 3 s y de 16 s, WebM VP8 de 3 s, HEVC de 3 s y .mov de 3 s. Pesan entre 15 y 75 KB. |
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
  - `tamano_texto`: `compacto`, `normal` (por defecto) o `grande` (desde `0005`).
  - `vista_equipos`: `cuadricula` (por defecto) o `carrusel` (desde `0011`).
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
- `generacion`: texto, ej. "18", "XS y XR" o "Plegable". Los SE van en la generación de su lanzamiento (SE 2.ª en la 11, SE 3.ª en la 13), como en la fuente.
- `orden`: entero, por fecha de lanzamiento (desde `0006`). Define la recencia.
- `activo`.
- `activo_por_demo`: lo pone la demo; se borra si alguien toca `activo`.
- `creado_en`.

**`colores`** (desde `0006`): los colores de cada modelo.

- `id`, `modelo_id` (FK con `on delete cascade`), `orden`.
- `nombre_es`: como lo escribe la fuente (obligatorio). `nombre_en`: el nombre oficial en inglés, **solo si la fuente lo da**.
- `hex`: `#RRGGBB` o vacío si la fuente no lo da.
- `oficial`: vino de la fuente. Los de la tienda (`false`) solo existen en modelos sin colores oficiales.
- `hex_de_fuente`: el hexadecimal vino de la fuente y no se cambia.
- Único: `(modelo_id, nombre_es)`.

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
- `color_id` (desde `0008`): FK a `colores`, `on delete restrict`. Debe ser del modelo del equipo; obligatorio si el modelo tiene colores (al crear o al cambiar el modelo o el color).
- `color_nombre_mostrar` (desde `0008`): opcional, hasta 40 caracteres; vacío = nombre oficial en inglés (o el de la fuente).
- La muestra (hexadecimal) sale siempre del color oficial. `color_nombre` y `color_hex` se borraron en `0008`.
- `precio`: bigint mayor que 0.
- `en_stock`: sí/no, verdadero por defecto (desde `0004`; antes era un entero `stock`).
- `fotos`: `text[]` de hasta 6 rutas.
- `video` (desde `0009`): ruta en el bucket `videos` o vacío.
- `mas_vendido` (desde `0010`): sí/no; como mucho 3 equipos marcados. Todavía no se muestra en el sitio.
- `publicado`, `destacado`, `descripcion_extra`, `es_demo`.
- **Solo usados:**
  - `bateria_porcentaje`: de 0 a 100.
  - `estado_estetico`: Como nuevo, Excelente, Muy bueno o Bueno.
  - `detalles`, `incluye`.
- `creado_en`, `actualizado_en`.
- La restricción `usado_es_una_unidad` (un usado con `stock ≤ 1`) se quitó en `0004`: ya no hay cantidades.

**`perfiles`**: quién puede entrar al panel.

- `user_id`: PK y FK a `auth.users`.
- `correo`.
- `rol`: `administrador` o `gestor` (desde `0007`; antes `agencia` o `tienda`).
- `activo`, `creado_en`.

### 6.2 Funciones de rol

Son `security definer`:

- `rol_actual()`: devuelve el rol del perfil **activo** de `auth.uid()`.
- `es_administrador()` y `es_gestor()` (desde `0007`): tiene ese rol y el perfil activo. `es_agencia()` y `es_staff()` se borraron en `0007`.

### 6.3 Disparadores

| Disparador | Qué hace |
|---|---|
| `tienda_actualizado`, `fichas_actualizado`, `equipos_actualizado` | Ponen `actualizado_en = now()`. |
| `equipos_precio` | Al insertar o cambiar el `precio` de un equipo, actualiza `tienda.precios_actualizados_en`. Cambiar el stock no la toca. |
| `modelos_ficha` | Cada modelo nuevo nace con su ficha vacía. |
| `modelos_proteger` | Con sesión, solo el gestor cambia el catálogo (todo: nombre, slug, generación, orden y activo). Si alguien cambia `activo`, pone `activo_por_demo = false`. |
| `tienda_proteger` | Solo el gestor cambia `modo_demo`. |
| `perfiles_proteger` | Con sesión, nadie cambia su propio rol ni se desactiva a sí mismo. **Siempre** (también con la clave de servicio) debe quedar al menos un administrador activo; bloquea con `for update` las filas de los otros administradores para que dos cambios a la vez no dejen cero. |
| `equipos_mas_vendido` | `limitar_mas_vendidos`: al marcar un equipo, si ya hay 3 marcados, error "Ya tiene 3 equipos marcados como más vendidos. Desmarque uno para marcar este." (`23514`). Usa `pg_advisory_xact_lock`. |
| `equipos_color` | `validar_color_equipo`: el color es del modelo del equipo; si el modelo tiene colores, es obligatorio al crear o al cambiar el modelo o el color (un equipo viejo sin color puede seguir editándose); recorta `color_nombre_mostrar`. |
| `colores_proteger` | Con sesión: no se crean colores oficiales; los de la tienda solo en modelos sin colores oficiales; un oficial no cambia de nombre, modelo ni orden y no se borra (salvo en cascada al borrar el modelo); el hexadecimal de la fuente no cambia. |

### 6.4 Seguridad a nivel de fila (RLS) por rol

Desde `0007`:

| Tabla | Público (`anon`) | Gestor | Administrador |
|---|---|---|---|
| `tienda` | lee | lee y edita todo, incluido `modo_demo` | lee (como el público) |
| `modelos` | lee **solo activos** | lee, edita, agrega y borra | como el público |
| `fichas` | lee las de modelos activos | lee y edita | como el público |
| `colores` | lee los de modelos activos | lee todos; completa el hexadecimal que falta; agrega y borra los de la tienda | como el público |
| `equipos` | lee solo **publicados, con stock (`en_stock`) y de modelo activo** | todo | como el público |
| `perfiles` | sin acceso (permiso revocado) | lee el suyo | lee todos y cambia rol y estado |
| `storage.objects` (`fotos` y `marca`) | lee | sube, cambia y borra | lee |

Un usuario autenticado **sin perfil o con el perfil inactivo** ve lo mismo que el público y no escribe nada.

### 6.5 Funciones SQL de la API

- **`datos_publicos()`** (`security invoker`, respeta la RLS): devuelve en **una sola llamada** `{tienda, modelos activos, fichas y colores de modelos activos, equipos publicados con stock}`. El sitio público la usa por `POST /rest/v1/rpc/datos_publicos`.
- **`borrar_datos_demo()`** (solo gestor):
  1. Borra los equipos con `es_demo`.
  2. Apaga los modelos con `activo_por_demo`.
  3. Pone `modo_demo = false`.

### 6.6 Almacenamiento

- **Buckets públicos:**
  - `fotos`: webp, jpeg o png, hasta 10 MB.
  - `marca`: además svg e ico.
  - `videos` (desde `0009`): `video/mp4` y `video/webm`, hasta 20 MB. Es un bucket propio para no ampliar los tipos ni el límite de `fotos`.
- **Rutas de videos:** `equipos/<uuid>.mp4|webm` (lo exige el check de `equipos.video`).
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
| `listarColores()`, `guardarColor(id, cambios)`, `agregarColor(datos)`, `borrarColor(id)` | Colores del catálogo, con las reglas de `colores_proteger`. |
| `listarFichas()`, `guardarFicha(modeloId, {descripcion, especificaciones})` | Las fichas. |
| `listarEquipos()`, `crearEquipo(datos)`, `actualizarEquipo(id, cambios)`, `borrarEquipo(id)` | El inventario. |
| `subirArchivo(bucket, ruta, blob)`, `borrarArchivos(bucket, rutas)` | Los archivos. |
| `borrarDatosDemo()` | Solo gestor. |
| `listarUsuarios()`, `invitarUsuario(correo, rol)`, `cambiarEstadoUsuario(userId, activo)`, `cambiarRolUsuario(userId, rol)` | Solo administrador (`listarUsuarios` devuelve a los demás solo su propio perfil). El rol se cambia directo en `perfiles`; invitar y el estado van por la función `usuarios`. |
| `reiniciarDemo()` | **Solo en demo:** vuelve a los datos iniciales. |

### 7.2 `demo.js` — todo en el navegador

- **Estado:** `localStorage["cotizadora-demo:v1"]`, un JSON con `tienda`, `modelos`, `fichas`, `equipos` y `perfiles`. Se comparte entre pestañas del mismo navegador.
- **Fotos:** IndexedDB, base `cotizadora-demo`, almacén `archivos`. Se exponen como `blob:` URLs.
- **Usuarios de prueba:** `gestor@demo.co` y `administrador@demo.co`, clave `demo1234` (desde la versión 5 de los datos; antes `tienda@demo.co` y `agencia@demo.co`, que `migrar()` convierte). La sesión va en `sessionStorage["cotizadora-demo:sesion"]`.
- **Versión de los datos:** el JSON lleva `version` (hoy 2). Si el navegador tiene una versión vieja, `migrar()` repite la migración SQL del mismo número (por ejemplo `stock` → `en_stock`) sin perder lo cargado.
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
  - Muestra la cantidad de equipos por modelo.
  - Si hay más de 8 modelos, aparece un buscador.
- **"¿Qué almacenamiento?"**: chips con las capacidades que existen para lo ya elegido, ordenadas por tamaño (`capacidadEnGB`).
- **Encadenado:** si un cambio deja inválida una elección posterior, `encadenar()` la limpia y `marcarLimpiado()` hace un destello.
- **Contador:** "N equipos disponibles" o "1 equipo disponible", contando **equipos** (variantes nuevas y unidades usadas). Desde `0004` el stock es sí/no, así que ya no hay unidades que sumar.
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
- **Vista "Carrusel"** (`tienda.vista_equipos = "carrusel"`, desde `0011`): las mismas tarjetas, el mismo filtro y el mismo orden, una al centro y las vecinas más chicas y desvanecidas (máscara en los bordes). Ver `carrusel-equipos.js` en la sección 5.
  - Accesibilidad: la región lleva `role="region"`, `aria-roledescription="carrusel"` y `aria-label="Equipos disponibles"`; cada tarjeta sigue siendo un ítem de la lista, con `aria-label="N de M"`; las vecinas van con `aria-hidden` y fuera del orden de tabulación; flechas de 48 px con foco visible; el indicador es `aria-live`.
  - Al cambiar un filtro se reconstruye y vuelve a la primera, con una transición suave.
  - El contador, el estado vacío y el detalle en línea funcionan igual que en la cuadrícula.

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

**Video del equipo (B3):** si el equipo tiene video, aparece como una miniatura más, al final, con el ícono de reproducir (si el equipo no tiene fotos, también aparece la miniatura de la ilustración). El `<video>` recién se crea al tocarla, con `controls`, `playsinline` y `preload="none"`, y se reproduce porque el cliente lo tocó; no hay reproducción automática al cargar. Volver a una foto o cambiar de color lo quita.

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
  - **Administrador:** solo Usuarios (invitar, asignar roles, desactivar y reactivar). Entra directo a Usuarios; cualquier otra ruta lo devuelve ahí.
  - **Gestor:** Inicio, Mi tienda, Inventario, Fichas, Catálogo completo, Legales y el modo demo. No ve Usuarios.
  - Siempre queda al menos un administrador activo. Nadie se cambia su propio rol ni se desactiva.
- Si se cierra la sesión mientras se navega, vuelve al login con un aviso.

### 10.2 Rutas (hash)

| Ruta | Vista |
|---|---|
| `#/inicio` | Inicio, con estas partes:<ul><li>**Estadísticas:** publicados visibles y en borrador. Cada una es un enlace al inventario filtrado.</li><li>**Fecha** de la última actualización de precios.</li><li>**"Lo que falta":** falta el logo, falta el WhatsApp, faltan los textos legales, hay equipos sin foto, equipos ocultos por modelo inactivo. Si no falta nada: "Todo está completo.".</li><li>**Botón** "Ver mi sitio".</li><li>**Gestor:** interruptor del modo demo, "Borrar datos de demostración" y, en demo, "Volver a los datos iniciales".</li></ul> |
| `#/inventario` | Lista, filtros y edición rápida. Acepta `?publicado=si|no`, `?stock=0` y `?fotos=sin`. |
| `#/inventario/nuevo` | Formulario **por pasos**: modelo → condición → capacidad → color → precio y stock (interruptor) → fotos → datos del usado (solo si es usado) → publicar (con resumen). |
| `#/inventario/nuevo?desde=<id>` | **Duplicar**: copia todo menos las fotos. |
| `#/inventario/<id>` | Editar el equipo (formulario completo). |
| `#/tienda` | Mi tienda. |
| `#/fichas` y `#/fichas/<modeloId>` | Fichas técnicas. |
| `#/catalogo` | Catálogo. |
| `#/legales` | Textos legales. |
| `#/usuarios` | Usuarios (solo administrador; el gestor vuelve a Inicio). |

### 10.3 Validaciones del panel

Son las mismas que exige el SQL:

- **Precio:** entero mayor que 0. Acepta "5.299.000".
- **Stock:** interruptor "Stock" con "Con stock" / "Sin stock" (por defecto, con stock). Duplicar copia el estado. Sin stock, el equipo no se ve en el sitio.
- **Usados:** batería obligatoria de 0 a 100 y estado estético obligatorio.
- **Más vendido:** como mucho 3. En la lista y en el paso Publicar se avisa "Ya tiene 3 equipos marcados como más vendidos. Desmarque uno para marcar este." antes de guardar. Duplicar no lo copia.
- **Color:** uno de los colores oficiales del modelo (obligatorio si el modelo tiene colores; mensaje "Elija el color."). El nombre a mostrar es opcional, hasta 40 caracteres.
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

**Video (paso "Fotos y video", opcional):**

- Uno por equipo: MP4 (H.264) o WebM, hasta 15 segundos y 20 MB. Se valida **antes de subir** (`video.js`) y se sube tal cual, sin comprimir.
- Un .mov u otro formato se rechaza con "Este formato puede no verse en todos los celulares. Súbalo en MP4.". También un MP4 en HEVC (el formato "Alta eficiencia" del iPhone), con el mismo mensaje.
- Vista previa en el formulario, "Cambiar video" y "Quitar video". Duplicar no copia el video, igual que las fotos.
- Al guardar se borra del almacenamiento el video quitado o reemplazado; al salir sin guardar, el que se subió; al borrar el equipo, su video.

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

1. Identifica a quien llama con su token. Si no es un **administrador activo**, responde 403 "Solo el administrador puede gestionar usuarios.".
2. **`invitar {correo, rol, redirectTo}`:**
   1. Si el correo ya tiene perfil, responde 400 "Ese correo ya tiene usuario." (corrección de la sesión 2).
   2. Si no, llama `inviteUserByEmail` y crea el perfil.
3. **`desactivar` y `reactivar {user_id}`:**
   - No se puede aplicar a sí mismo.
   - Cambia `perfiles.activo` y bloquea o desbloquea el inicio de sesión (`ban_duration` de `876000h` o `none`).
   - Si el cambio dejaría sin administradores activos, la base lo rechaza y la función responde 400 con ese mensaje.
4. **El rol** no pasa por la función: el panel lo cambia directo en `perfiles` (política `perfiles_editar`, solo administrador).

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
  - `--secundario`: fondo del encabezado y del pie.
  - `--sobre-secundario-suave`: el texto sobre el secundario mezclado un 30 % con el fondo y ajustado hasta 4,5:1 (fechas y aviso del pie).
  - El texto sobre cada color se elige solo (`textoSobre`).
  - `--primario-texto`: el primario ajustado para usarlo como texto o enlace sobre todas las superficies del tema.
- **Tamaño del texto** (`tienda.tamano_texto`, `data-tamano` en `<html>`, solo sitio, pop-up y legales):
  - Normal: la base.
  - Compacto: achica solo títulos, precios grandes y espacios (`--t-titulo` 0,84 y `--t-espacio` 0,72). Los títulos usan `max(1rem, …)`: nada baja de 16 px.
  - Grande: la raíz pasa a 112,5 %, así todo el texto sube cerca de un 12 % (16 → 18 px).
  - Se aplica cuando llegan los datos, igual que los colores.
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
- **Rediseño premium (fase C, solo el sitio público):** misma estructura, mismos textos y mismos flujos; sin librerías.
  - **Encabezado:** dos brillos decorativos (`::before` y `::after`) y entrada suave del título (sube y se enfoca; la opacidad no cambia, así no retrasa el LCP).
  - **Filtros:** tarjeta de vidrio (tarjeta al 92 % con `backdrop-filter`); segmentado con un **indicador que se desliza** (el botón marcado toma su fondo al terminar, para que el contraste no dependa del indicador); lista de modelos con visto de elegido, opción activa marcada y hover; chips con visto y presión táctil.
  - **Tarjetas:** fondo de la foto con un degradado suave; elevación al pasar el mouse en escritorio; precios con cifras tabulares; muestras finas en forma de píldora.
  - **Carrusel:** profundidad con escala, desenfoque y una capa del color del fondo que desvanece a las vecinas (tarjetas inactivas); posiciones en píxeles enteros para que el texto no se vea borroso.
  - **Hoja de detalle y pop-up:** apertura con View Transitions (la foto viaja de la tarjeta al detalle) y respaldo de CSS; salida corta al cerrar (botón, fondo, Escape o gesto).
  - **Botón principal:** sombra de su color, filo de luz arriba, brillo que cruza al pasar el mouse (decorativo, detrás del texto) y presión táctil (`scale(.98)`).
  - **Carga:** tarjetas esqueleto con la forma de una tarjeta (foto y líneas) y un brillo que pasa, del mismo alto que antes (sin saltos).
  - **Pie:** el de B1.
- **Aire entre secciones** (pedido de Jared, ronda 2, punto A): sale de `--t-espacio`, así que el tamaño Compacto lo baja al 72 %.
  - Pie: 48 px arriba y abajo en celular y 72 px en escritorio (`clamp(48px, 6vw, 72px)`, más el área segura abajo); bloques separados 18 px en celular y 24 px en escritorio.
  - Encabezado: el título queda a 52 px de la tarjeta de filtros en celular y a 72 px en escritorio.
  - Zona de equipos (cuadrícula y carrusel): 40 px arriba y abajo en celular, 64 px en escritorio; la información de la tienda suma 16 px de margen.
  - Con `prefers-reduced-motion`: sin traslados ni escalas (título, presión, indicador, carrusel, aperturas y cierres son directos); se mantienen colores y sombras.
- **Rendimiento:**
  - Sin librerías en el sitio público.
  - Una sola llamada de datos (`datos_publicos`).
  - Imágenes con `srcset` y carga diferida.
  - `modulepreload` de los módulos.
- **Mediciones** (Lighthouse 12 móvil, 3 corridas por escenario, `serve` con compresión; antes = commit `9566ded`, después = fase C):

  | Escenario | Antes | Después |
  |---|---|---|
  | Con franja demo | 91 / 100 / 100 · LCP 1,2–1,4 s · CLS 0,19 | 91 / 100 / 100 · LCP 1,3–1,4 s · CLS 0,19 |
  | Sin franja, cuadrícula | 100 / 100 / 100 · LCP 1,2 s · CLS 0,049 | 99–100 / 100 / 100 · LCP 1,3–1,4 s · CLS 0,049 |
  | Sin franja, carrusel | — | 100 / 100 / 100 · LCP 1,2–1,5 s · CLS 0,049 |

  (rendimiento / accesibilidad / buenas prácticas). El CLS de 0,19 lo causa solo la franja de modo demo, que aparece cuando llegan los datos. Para medir sin franja, el Chromium de la medición se abre con el modo demo apagado en `localStorage` y Lighthouse corre con `--disable-storage-reset`.
- **Peso del sitio público:** unos 170 KB sin comprimir y unos 56 KB con gzip (suma de cada archivo comprimido por separado, sin `demo.js` ni `semilla.js`, sin fuentes ni fotos). La fase C sumó unos 4 KB con gzip (el límite era 30 KB).

---

## 14. Pruebas

### 14.1 Cómo correrlas

```bash
bash tests/sql/probar.sh                                   # SQL y RLS en un Postgres local (sin Docker)
python3 -m http.server 8080 &
NODE_PATH="$(npm root -g)" node tests/verificar.cjs        # 46 casos en modo demo (Playwright + Chromium)
ICT_CAPTURAS=1 NODE_PATH="$(npm root -g)" node tests/verificar.cjs   # + capturas en tests/capturas/
DENO=/ruta/deno bash tests/funciones/probar.sh             # función enviar-lead (10 casos) + tipos
node tests/documentacion.mjs                               # este documento cubre todos los archivos
```

**Variables:**

- `ICT_SOLO="regex"`: corre solo los casos cuyo nombre coincide.
- `ICT_BASE=URL`: por ejemplo `http://localhost:8081/Cotizadora-ICT`, para simular GitHub Pages.
- `HTTPS_PROXY`: Chromium la usa para cargar Google Fonts.
- `ICT_CAPTURAS=1`: además guarda capturas en `tests/capturas/` y corre el caso **capturas de diseño**: 360 y 1440 px × claro y oscuro × cuadrícula y carrusel × color por defecto y primario amarillo, más el detalle y el pop-up, en `tests/capturas/diseno/<etapa>-….png`. `ICT_CAPTURAS_ETAPA` pone la etapa (por ejemplo `antes` o `despues`). La carpeta no se sube al repo.

### 14.2 Qué cubre `tests/verificar.cjs` (46 casos, agrupados por tema)

1. Modo demo: la franja y DEMO aparecen; al borrar los datos demo, desaparecen.
2. Nuevo + iPhone 18 Pro Max + 256 GB: queda una tarjeta, el detalle en línea y el carrusel con exactamente Negro y Plata.
3. Los filtros solo ofrecen opciones con stock; al encadenar, se limpian solos; un segundo toque desmarca.
4. Un equipo sin stock o sin publicar no aparece. El interruptor Stock de la lista lo oculta y lo vuelve a mostrar en el sitio, y el filtro `?stock=0` muestra solo los que no tienen stock.
5. Cambiar un precio en el panel lo cambia en el sitio y actualiza la fecha del pie.
6. Con UTM, el pedido lleva todos los campos.
7. WhatsApp abre con el mensaje exacto. Un usado lleva batería y estado (casos 7 y 8). La consulta sin stock lleva su mensaje (7b).
8. Pop-up: errores, foco, formato del celular, reintento y "Abrir WhatsApp" tras dos fallos.
9. `/admin` sin sesión pide login. La tienda no ve Usuarios, no renombra, y la capa de datos también se lo impide.
10. Roles: el gestor no ve Usuarios y la capa de datos le niega gestionarlos; el administrador solo ve Usuarios y la capa de datos le niega lo demás; invita con rol, asigna roles, desactiva y no puede quitarse a sí mismo. Catálogo: 42 modelos y generaciones en orden; colores (hex de la fuente fijo, completar el que falta, colores de la tienda solo en el 17 Pro). Datos demo guardados de una versión vieja se migran (stock, tamaño, catálogo y colores).
11. Validaciones del panel. **Más vendido:** tres se marcan en la lista; el cuarto avisa y no se guarda (también en la capa de datos y en el formulario); desmarcando uno, se puede; Duplicar no lo copia; el sitio no lo muestra. **Video:** .mov, MP4 en HEVC, 16 s y más de 20 MB se rechazan antes de subir (no queda nada guardado); MP4 de 3 s y WebM se aceptan; quitar el video, reemplazarlo o borrar el equipo borra el archivo; la capa de datos repite los límites de Storage. **Color oficial:** el paso Color ofrece solo los colores del modelo (sin crear colores ni escribir hexadecimales), cambiar el modelo borra el color, la capa de datos rechaza un color de otro modelo, y el nombre a mostrar ("Lila") llega a la tarjeta, el detalle, el texto alternativo, el mensaje de WhatsApp y el `content_name` del píxel; sin nombre a mostrar se ve el oficial ("Lavender").
12. A 320, 360, 768 y 1440 px: sin scroll horizontal, un `h1` y sin errores en sitio, legales y todo el panel.
13. Carrusel: dedo, flechas, puntos, muestras, teclado y Escape. **Video en el detalle:** miniatura con ícono; sin `<video>` en la página hasta tocarla; al tocarla, `preload="none"`, `controls`, sin `autoplay` y se reproduce; volver a la foto lo quita.
14. Gesto táctil real en el carrusel y cierre de la hoja con el gesto.
14b. **Vista Carrusel** (8 casos): elegirla en Mi tienda cambia el sitio (mismas tarjetas, orden, contador y detalle; tocar una vecina la centra, la del centro abre el detalle; flechas de 44 px o más con foco visible); bucle en los dos sentidos con flechas, teclado, mouse, trackpad y dedo; 1 tarjeta sin flechas ni bucle, 2 tarjetas con una sola vecina, el filtro vuelve a la primera y el estado vacío; sin scroll horizontal y con altura estable a 320, 360, 768 y 1440 px; con reduced-motion, sin animaciones.
15. Sin Apple: ni imágenes en el repo, ni la manzana U+F8FF, ni referencias, y solo recursos externos de Google Fonts.
15b. **Espacios** (2 casos, 360 y 1440 px): mide en píxeles el relleno del pie y la separación de sus bloques, el aire entre el título y los filtros y arriba y abajo de la zona de equipos, en cuadrícula y carrusel, con tamaño Normal y Compacto (72 %), sin scroll horizontal.
16. Contraste AA en 4 combinaciones: claro, oscuro, amarillo sobre blanco, y primario oscuro en tema oscuro. **Pie:** el fondo es el secundario y todo su texto pasa AA en claro y oscuro con 6 secundarios (incluidos gris medio, amarillo y azul).
17. Textos de 16 px o más y zonas táctiles de 44 px, en el sitio, el pop-up y las legales, con los **tres tamaños de texto**. Compacto deja el cuerpo en 16 px y achica títulos y precios; Grande pone el cuerpo en 18 px. Elegir el tamaño en Mi tienda lo cambia en el sitio y no en el panel.
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
3. Permisos del panel: el gestor no ve Usuarios y el servidor (función y tabla) le niega gestionarlos; colores.
4. Un precio cambiado en el panel se ve en el sitio, con la fecha.
5. Crear un equipo con foto y **video** (Storage simulado); en el sitio, **ningún pedido al video hasta tocar su miniatura**, y al tocarla se pide; el video queda en el bucket `videos` y se sirve como `video/mp4`; Storage rechaza un tipo no permitido aunque se salte el panel.
6. El gestor borra la demo.
7. **Invitación:** el administrador (que solo ve Usuarios y al que el servidor le niega lo demás) invita; el correo en español, el enlace, "Cree su contraseña" y el ingreso como gestor.
8. **Recuperación:** el enlace y la contraseña nueva.
9. **Asignar rol**, **desactivar** (no puede entrar) y **reactivar**.

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
- Panel: `…/admin/`, con `gestor@demo.co` o `administrador@demo.co` y la clave `demo1234`.

**Ojo:**

- En demo los datos viven solo en ese navegador.
- Para probar el paso a WhatsApp, cargar un número en **Mi tienda**.

### 15.2 Producción, una tienda

1. **Proyecto de Supabase.** Conviene la región São Paulo.
2. **Migraciones:** correr `0001`, `0002` y `0003`, en ese orden.
3. **Registro:** apagar "Allow new users to sign up".
4. **Direcciones:** Site URL y Redirect URLs apuntando a `/admin/`.
5. **Correo:** SMTP propio y las plantillas de `supabase/correos/`.
6. **Primer administrador:** crearlo en Authentication y luego `insert into perfiles … 'administrador'`. El SQL exacto está en el README. Para cargar datos hace falta además un gestor (se invita desde Usuarios).
7. **Funciones:**
   - `supabase functions deploy enviar-lead --no-verify-jwt` y `supabase functions deploy usuarios`.
   - `supabase secrets set GHL_WEBHOOK_URL=… ORIGENES_PERMITIDOS=https://dominio`.
8. **`config.js`:** `backend: "supabase"`, la URL, la clave anon o publishable y el `metaPixelId`.
9. **Publicar** en cualquier hosting estático.
10. **Antes de abrir al público:**
    1. Cargar logo, WhatsApp, legales e inventario, y activar los modelos.
    2. Con el usuario gestor, tocar "Borrar datos de demostración".

---

## 16. Decisiones tomadas y su porqué

| Decisión | Por qué |
|---|---|
| Código + Supabase en vez de AI Studio | No había acceso a AI Studio. Supabase da lo mismo: base de datos con RLS, usuarios y archivos. |
| Inbound Webhook en vez del formulario nativo | El formulario nativo no se puede completar ni enviar desde código fuera de GHL (iframe de otro dominio). No se usan endpoints sin documentar. |
| Back-end demo en el navegador | Permite ver, probar y presentar todo sin servidor (GitHub Pages) y correr la suite sin red. |
| Catálogo y colores solo de los archivos de Jared | Pedido explícito: "es la ÚNICA fuente". Lo que falta queda vacío, con muestra neutra rayada en el panel. |
| `nombre_es` además de `nombre_en` | La fuente da casi siempre el nombre en español y a veces no el inglés: sin `nombre_es` habría colores sin nombre. |
| Hexadecimales del "iPhone 16 / 16e" también en el 16 Plus | La tabla de la fuente es por serie y el 16 Plus tiene exactamente los mismos colores. |
| Colores de la tienda solo en modelos sin colores oficiales | El 17 Pro y el 17 Pro Max no tienen colores en la fuente; sin esto no se podrían cargar. Los oficiales no se mezclan con inventados. |
| Duplicar no copia "Más vendido" | El duplicado es otra variante y el máximo es 3: copiarlo haría fallar el guardado. El stock sí se copia (pedido de A2). |
| View Transitions para abrir el detalle | Pedido de Jared. Se probó con cuadros grabados que la foto viaja bien aunque el diálogo esté en la capa superior; sin la API (o con reduced-motion) queda la animación de CSS. |
| Vecinas del carrusel desvanecidas con una capa (`::after`) | Bajar la opacidad del texto lo dejaba bajo 4,5:1. Las vecinas son tarjetas inactivas (`aria-hidden`, fuera del tabulado): WCAG 1.4.3 exime el texto de componentes inactivos. La tarjeta del centro, que es la que se usa, cumple AA. |
| Apariencia guardada para la próxima visita | Evita el parpadeo de claro a oscuro y el cambio de tamaño en las visitas siguientes; en la primera visita no hay dato guardado y se aplica cuando llegan los datos, como antes. |
| Bucket propio para videos | Límite (20 MB) y tipos (MP4 y WebM) propios, sin aflojar las reglas de `fotos`. |
| Duración del MP4 desde la caja `mvhd` | Funciona aunque el navegador no sepa reproducir el video (por ejemplo, Chromium sin códecs propietarios) y no descarga nada extra. |
| MP4 en HEVC rechazado | El pedido es "MP4 (H.264)": HEVC no se ve en todos los navegadores. Se usa el mismo mensaje que para .mov. |
| Color del equipo = color oficial + nombre a mostrar | Pedido de Jared (A6). La muestra siempre es la oficial; el nombre que ve el cliente lo puede poner la tienda (por ejemplo, en español). |
| `0008` conserva el nombre que veía el cliente | Si el nombre viejo no es el oficial ("Glacier", "Medianoche"), queda en `color_nombre_mostrar`: el sitio no cambia para el cliente. Si no se encuentra el color, el equipo queda sin `color_id`, con su nombre, y un NOTICE lo avisa: no se bloquea la migración. |
| El administrador no edita contenido | Pedido de Jared: el administrador solo gestiona accesos. Si una persona necesita las dos cosas, usa dos usuarios. Los perfiles viejos pasan agencia → administrador y tienda → gestor. |
| El rol se cambia directo en `perfiles` | No necesita la clave de servicio; la RLS (solo administrador) y `perfiles_proteger` lo protegen. |
| "Siempre un administrador" en el disparador | Así vale también para la clave de servicio (función `usuarios`) y para dos cambios simultáneos. |
| Modelos de la agencia al final al renumerar | `0006` no conoce su fecha de lanzamiento; quedan después del Duo en el orden que tenían. |
| "Cantidad disponible" = cantidad de equipos | Desde `0004` el stock es sí/no (pedido de Jared), así que se cuentan equipos. Antes era la suma de stock. |
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
- [ ] Confirmar en apple.com/co los nombres del catálogo (desde el iPhone 7, iPhone Air e iPhone Duo).
- [ ] **Datos que faltan en la fuente del catálogo** (quedaron vacíos; no se completaron de memoria):
  - Hexadecimal de **todos** los colores de: iPhone 7, 7 Plus, 8, 8 Plus, X, XS, XS Max, XR, 11, 11 Pro, 11 Pro Max, SE (2.ª), 12 mini, 12, 12 Pro, 12 Pro Max, 13 mini, 13, 13 Pro, 13 Pro Max, SE (3.ª), 14, 14 Plus, 14 Pro, 14 Pro Max, 15, 15 Plus, 15 Pro, 15 Pro Max, 16 Pro, 16 Pro Max y Duo. Solo 32 de 183 colores tienen hexadecimal.
  - Hexadecimal de Visón, Oliva, Azul nítido y Magenta del 18 Pro y 18 Pro Max.
  - Nombre en inglés de: Blanco y Negro (17 y 17e); Negro, Visón, Oliva, Azul nítido, Magenta y Plata (18 Pro y 18 Pro Max); Titanio (Duo).
  - Colores del iPhone 17 Pro y 17 Pro Max: la fuente no los lista (la tienda puede agregar los suyos).
  - El hexadecimal de Borgoña y Glaciar viene marcado "aproximado" en la fuente.
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

### 21/10/2026 · A: más aire entre las secciones del sitio

- **Pedido de Jared (ronda 2, punto A):** más espacio en el pie (unos 48 px arriba y abajo en celular, unos 72 px en escritorio, y más separación entre sus bloques), más margen entre el título del encabezado y la tarjeta de filtros, y más margen arriba y abajo de la zona de equipos en las dos vistas, con los tokens de espacio existentes; sin scroll horizontal a 320, 360, 768 y 1440 px; altura estable del carrusel.
- **Hecho:** solo `assets/css/sitio.css`, todo multiplicado por `--t-espacio` (ver sección 13): pie 48 → 72 px (`--pie-aire`) y bloques 18 → 24 px; título → filtros 28 → 52 px (celular) y 72 px (escritorio); zona de equipos 28 / 8 px → 40 px (celular) y 64 px (escritorio); margen de la información de la tienda 40 → 16 px, porque ahora el aire lo da la zona de equipos.
- **Pruebas:** dos casos nuevos en `verificar.cjs` ("espacios", 360 y 1440 px) que miden cada margen en las dos vistas y con tamaño Normal y Compacto. Fallan con el CSS anterior (pie de 32 px) y pasan con el nuevo. Las pruebas de scroll horizontal y altura estable del carrusel siguen igual y pasan.
- **Capturas:** `tests/capturas/diseno/antes-*.png` y `a-despues-*.png` (no se suben al repo).
- **Verificación:** `tests/verificar.cjs` 46/46 (47 con capturas) y `node tests/documentacion.mjs` OK.

### 20/10/2026 · C: rediseño premium del sitio público

- **Pedido de Jared (fase C):** rediseño premium del sitio público (index, pop-up, hoja, las dos vistas y legales; no el panel), sin secciones nuevas ni textos nuevos, mismas estructura y flujos, inspirado en Apple sin copiarlo; Inter sin bloquear; que se vea premium con cualquier color, tamaño, vista y tema (probado con primario amarillo). Piezas: entrada suave del título, filtros de vidrio, segmentado con indicador que se desliza, estados claros en la lista de modelos y los chips, tarjetas (degradado, elevación, cifras tabulares, muestras en píldora), profundidad del carrusel, aperturas y cierres refinados con View Transitions y respaldo, botón principal con presencia, presión y brillo, esqueletos en lugar de spinner y el pie de B1. Límites: Lighthouse móvil ≥90 / 100 / 100, LCP no peor que +0,2 s, CLS <0,1 sin franja, fase C ≤30 KB gzip, reduced-motion sin traslados ni escalas, AA en todas partes (también en el vidrio).
- **Referencia de calidad:** se usó la skill "adrian-saenz-hostinger-premium-website" solo como vara de calidad y robustez (contenido primero, sin depender de animaciones, `seguro()`); no se aplicó nada de lo que Jared pidió evitar (IIFE, librerías, loader, cursor propio, imágenes de stock, `.htaccess`).
- **Hecho:** `sitio.css` y `base.css` (ver sección 13), `assets/js/sitio/transiciones.js` (nuevo), `principal.js` y `popup.js` (aperturas y cierres), `filtros.js` (indicador), `carrusel-equipos.js` (posiciones en píxeles enteros; desvanecido con capa; semántica de lista), `tema.js` e `index.html` / legales (apariencia de la visita anterior).
- **Encontrado y corregido en el camino:**
  - Lighthouse marcó en el carrusel `role="group"` en `<li>` (no permitido, y rompía la regla de listas): ahora cada tarjeta es un ítem de lista con `aria-label="N de M"`.
  - El texto de las vecinas, desvanecido con opacidad, bajaba de 4,5:1: ahora las desvanece una capa encima (ver la decisión en la sección 16).
  - La tarjeta del centro se veía borrosa en celular (posición en medio píxel).
- **Pruebas cambiadas y por qué:**
  - El verificador de contraste de `verificar.cjs` leía mal los colores `color(srgb …)` que produce `color-mix` (los tomaba como casi negros y daba 1,15:1): ahora los lee bien. Es más exacto, no más permisivo.
  - Las pruebas que abrían la hoja y actuaban enseguida esperan a que termine la apertura (`data-vt`), y la de Escape espera el cierre animado en lugar de mirar a los 200 ms. Siguen exigiendo lo mismo.
  - El caso del carrusel suma una comprobación: las tarjetas no llevan rol (un `<li>` no admite `role="group"`); sigue exigiendo "N de M".
  - Caso nuevo de capturas de diseño (solo con `ICT_CAPTURAS`).
- **Mediciones:** ver la tabla de la sección 13 (antes y después). Peso agregado por la fase C: unos 4 KB con gzip.
- **Verificación:** `tests/sql/probar.sh` OK, `tests/verificar.cjs` 44/44 (tres corridas seguidas), `tests/verificar-supabase.cjs` 9/9, `tests/funciones/probar.sh` OK y `node tests/documentacion.mjs` OK.

### 20/10/2026 · B3: el video en el detalle

- **Pedido de Jared (fase B, punto B3):** el video como una miniatura más en el detalle, con ícono de reproducir; se reproduce al tocarlo, con controles; sin reproducción automática; `preload="none"`.
- **Hecho:** `detalle.js` (miniatura del video, `mostrarVideo`; la miniatura de la ilustración cuando no hay fotos) y `sitio.css` (ícono y video). El `<video>` se crea recién al tocar la miniatura, así que no se descarga nada antes.
- **Pruebas:** caso nuevo en `verificar.cjs` (DOM, atributos y reproducción) y, en `verificar-supabase.cjs`, que el navegador no pide el archivo hasta tocar la miniatura.
- **Verificación:** `tests/verificar.cjs` 44/44 y `tests/verificar-supabase.cjs` 9/9.

### 20/10/2026 · B2: vista "Carrusel" de los equipos

- **Pedido de Jared (fase B, punto B2):** `tienda.vista_equipos` ("cuadricula" por defecto o "carrusel") con selector y ayuda por opción en Mi tienda; carrusel con las mismas tarjetas, filtro y orden; tarjeta al centro y vecinas desvanecidas y más chicas; bucle infinito; arrastre con inercia y ajuste, flechas, teclado y trackpad; indicador "3 de 10"; tocar la del centro abre el detalle y una vecina la centra; altura estable sin scroll horizontal; al filtrar, vuelve a la primera con transición; 1 tarjeta sin flechas ni bucle; 2 sin repetir a los dos lados; contador, estado vacío y detalle en línea igual; accesibilidad y reduced-motion.
- **Hecho:** `supabase/migrations/0011_vista_equipos.sql`; `assets/js/sitio/carrusel-equipos.js` (nuevo); `galeria.js` (`usarCarrusel`); `principal.js` (`aplicarVista`, también al cambiar los datos en otra pestaña); `index.html` (flechas e indicador junto a la lista); `sitio.css` (vista carrusel); panel `tienda.js` y `panel.css` (sección "Diseño del sitio"); `comun.js` (`VISTAS_EQUIPOS`); `demo.js` versión 9.
- **Errores encontrados por las pruebas y corregidos:** dos toques seguidos en la flecha avanzaban una sola tarjeta (ahora se guarda el destino mientras se mueve).
- **Pruebas:** 8 casos nuevos en `verificar.cjs` y la vista en `pruebas.sql`. Ninguna prueba se debilitó.
- **Verificación:** `tests/sql/probar.sh` OK, `tests/verificar.cjs` 43/43 y `tests/verificar-supabase.cjs` 9/9.

### 20/10/2026 · B1: pie con el color secundario de la tienda

- **Pedido de Jared (fase B, punto B1):** el pie con fondo `color_secundario` y contraste AA con `textoSobre` / `ajustarParaTexto`, en claro y en oscuro.
- **Hecho:** `sitio.css` (fondo del pie, texto `--sobre-secundario` y `--sobre-secundario-suave`, foco visible); `tema.js` calcula `--sobre-secundario-suave`; `utils.js` suma `mezclar`.
- **Error encontrado y corregido:** con un secundario gris medio (#777777), `ajustarParaTexto` solo aclaraba y se quedaba en 4,48:1. Ahora, si una dirección no alcanza, prueba la otra (con #777777 da 4,55:1). La prueba nueva lo detectó.
- **Pruebas:** caso nuevo del pie en `verificar.cjs` (fondo exacto y AA de todos sus textos, 2 temas × 6 colores).
- **Verificación:** `tests/verificar.cjs` 35/35.

### 20/10/2026 · A8: "Más vendido" (hasta 3)

- **Pedido de Jared (fase A, punto A8):** `equipos.mas_vendido`, interruptor "Más vendido" en la lista del inventario y en el formulario, máximo 3 (disparador en la base y aviso en el panel) con el mensaje "Ya tiene 3 equipos marcados como más vendidos. Desmarque uno para marcar este."; todavía no se muestra en el sitio.
- **Hecho:** `supabase/migrations/0010_mas_vendido.sql`; `comun.js` (`MAX_MAS_VENDIDOS`, `MENSAJE_MAS_VENDIDOS`, campo en `CAMPOS_EQUIPO`); `demo.js` versión 8 con la misma regla; `inventario.js` (interruptor en la lista y en Publicar, aviso previo, Duplicar no lo copia); `panel.css`: la fila del inventario en escritorio pasa a dos líneas (datos y acciones arriba; precio e interruptores abajo) para que entren los tres interruptores.
- **Pruebas:** `pruebas.sql` (tres sí, el cuarto no, también al insertar; desmarcar y volver a marcar) y caso nuevo en `verificar.cjs`. Ninguna prueba se debilitó.
- **Verificación:** `tests/sql/probar.sh` OK, `tests/verificar.cjs` 34/34 y `tests/verificar-supabase.cjs` 9/9.

### 20/10/2026 · A7: un video corto opcional por equipo

- **Pedido de Jared (fase A, punto A7):** un video corto opcional por equipo; MP4 (H.264) o WebM; hasta 15 s y 20 MB; validado en el navegador (la duración, de los metadatos); .mov u otro formato rechazado con "Este formato puede no verse en todos los celulares. Súbalo en MP4."; sin compresión; bucket propio o tipos ampliados (elegir lo más limpio y explicarlo); se borra al quitarlo o al borrar el equipo.
- **Decisión:** bucket propio `videos` (ver sección 16): así `fotos` sigue aceptando solo imágenes de 10 MB y Storage exige 20 MB y MP4/WebM para los videos aunque alguien salte el panel.
- **Hecho:**
  - `supabase/migrations/0009_video.sql`: `equipos.video`, bucket `videos` y reglas de Storage.
  - `assets/js/panel/video.js` (nuevo): validación antes de subir.
  - `inventario.js`: bloque "Video (opcional)" en el paso "Fotos y video", vista previa, cambiar y quitar, y borrado del archivo al guardar, al salir sin guardar y al borrar el equipo.
  - `comun.js`: `BUCKETS`, `mensajeArchivo` y `RUTA_VIDEO`; `demo.js` versión 7 repite los límites de Storage y el check de la ruta; `supabase.js` traduce los rechazos de Storage.
  - Entorno local: Storage simulado con límites por bucket y lectura de multipart; videos de prueba en `tests/videos/`.
- **Pruebas:** `pruebas.sql` (bucket, límites, ruta del video y permisos por rol), `verificar.cjs` (caso nuevo del video) y `verificar-supabase.cjs` (video subido y servido; tipo no permitido rechazado por Storage). Ninguna prueba se debilitó.
- **Verificación:** `tests/sql/probar.sh` OK, `tests/verificar.cjs` 33/33 y `tests/verificar-supabase.cjs` 9/9.

### 20/10/2026 · A6: el equipo usa un color oficial de su modelo

- **Pedido de Jared (fase A, punto A6):** el paso de color elige uno de los colores oficiales del modelo (muestras con el nombre en inglés); no se crean colores ni se cambia el hexadecimal desde el equipo; campo opcional "Nombre que verá el cliente (opcional)" con la ayuda "Por ejemplo, el nombre en español. Si lo deja vacío, se muestra el nombre oficial en inglés."; `equipos.color_id` y `color_nombre_mostrar`; el hexadecimal sale del color oficial; migrar los equipos existentes; el color se borra al cambiar el modelo; el sitio usa el nombre a mostrar o el oficial en todas partes (tarjetas, muestras, detalle, texto alternativo, WhatsApp y píxel).
- **Hecho:**
  - `supabase/migrations/0008_color_oficial.sql` (ver sección 6).
  - `comun.js`: `nombreColor` y `CAMPOS_EQUIPO` con `color_id` y `color_nombre_mostrar`; mensajes de los disparadores (`23514`) y del color en uso (`23503`).
  - `demo.js` versión 6: la misma migración y las mismas reglas (`validarColorEquipo`); un color de la tienda en uso no se borra.
  - `semilla.js`: los equipos demo dicen su color oficial y el nombre a mostrar (lo que deja `0008`).
  - Sitio: `prepararCatalogo` resuelve el color; muestra neutra rayada cuando la fuente no tiene hexadecimal.
  - Panel: paso Color con los colores oficiales y el nombre a mostrar; la lista y el resumen usan el nombre que ve el cliente.
- **Nota:** donde la fuente no da hexadecimal (por ejemplo, el iPhone 13 "Midnight" y el 15 Pro "Natural Titanium" de la demo), la muestra se ve neutra y la ilustración gris, hasta que el gestor complete el hexadecimal en Catálogo.
- **Pruebas cambiadas y por qué:**
  - `pruebas.sql`: los equipos de prueba ya no tienen `color_nombre`: se crean con un color oficial y un nombre a mostrar; las validaciones de stock, batería y precio se hacen en el 17 Pro (sin colores) para probar solo esa regla. Nuevas: migración de los equipos demo y de colores no encontrados, color de otro modelo, color obligatorio, cambio de modelo, nombre a mostrar de más de 40, color en uso no se borra.
  - `probar.sh` y `comparar-semilla.mjs` comparan el color oficial y el nombre a mostrar en lugar del nombre y el hexadecimal.
  - `verificar.cjs`: la validación de color ya no escribe nombre y hexadecimal (ya no existen): ahora exige elegir un color oficial; las pruebas que buscaban "Glacier" y "Burgundy" por nombre los buscan por nombre a mostrar y capacidad; caso nuevo del color oficial; la migración de datos demo viejos revisa también los colores.
  - `verificar-supabase.cjs`: el equipo del 17 Pro se guarda sin color (el modelo no tiene colores) y con nombre a mostrar, y se revisa en el sitio.
- **Verificación:** `tests/sql/probar.sh` OK, `tests/verificar.cjs` 32/32 y `tests/verificar-supabase.cjs` 9/9.

### 20/10/2026 · A5: roles administrador y gestor

- **Pedido de Jared (fase A, punto A5):** roles administrador y gestor en lugar de agencia y tienda (renombrar `es_agencia` y lo que depende de ella); el administrador solo gestiona accesos (Usuarios: invitar, desactivar, reactivar y asignar roles); el gestor todo lo demás, incluidos el Catálogo completo, el modo demo y borrar la demo; exigido en el SQL (RLS, `modelos_proteger`, `tienda_proteger`, `perfiles_proteger`, `borrar_datos_demo`) y en la función `usuarios` (solo administrador activo); el modo demo repite las reglas; siempre al menos un administrador activo; usuarios demo `administrador@demo.co` y `gestor@demo.co`.
- **Hecho:**
  - `supabase/migrations/0007_roles.sql` (ver sección 6).
  - `supabase/functions/usuarios/index.ts`: solo administradores activos; invita con rol `administrador` o `gestor`; mensaje claro si se intenta dejar sin administradores.
  - `demo.js` versión 5: `exigirGestor`, `exigirAdministrador`, listados como la RLS, `cambiarRolUsuario` y la regla del último administrador; migra los perfiles y los correos de prueba. `supabase.js`: `cambiarRolUsuario`.
  - Panel: navegación y rutas por rol (`admin/index.html`, `panel.js`), Usuarios con selector de rol, Catálogo completo para el gestor.
  - `tests/supabase-local/levantar.sh`: usuarios `administrador@local.co` y `gestor@local.co`.
- **Pruebas cambiadas y por qué:**
  - `pruebas.sql`: las pruebas "la tienda no renombra / no agrega modelos / no apaga el modo demo / no borra la demo / no agrega colores" perdieron sentido (el gestor ahora puede todo eso): se reemplazaron por las mismas comprobaciones con el **administrador** (que no puede) y por pruebas de que el gestor sí puede. Nuevas: conversión de roles (`antes_0007_roles.sql`), el administrador asigna roles y no edita contenido, y nunca quedan cero administradores (también sin sesión).
  - `verificar.cjs`: el caso 9 ya no espera "no renombra" (el gestor tiene el catálogo completo): ahora prueba que el gestor no ve Usuarios y que un intento directo en la capa de datos falla. Caso nuevo del administrador (solo Usuarios). El caso de usuarios agrega asignar roles y no poder quitarse a sí mismo. La migración de datos demo viejos revisa también los roles.
  - `verificar-supabase.cjs`: los mismos cambios contra el servidor (función `usuarios` y tabla `perfiles` le niegan al gestor; el servidor le niega al administrador editar la tienda; asignar rol).
  - "No se puede desactivar al último administrador": en el panel, quien actúa es siempre un administrador activo y no puede tocarse a sí mismo, así que la regla solo se puede romper desde SQL o con la clave de servicio: se prueba en `pruebas.sql` (bloque 5b, sin sesión).
- **Verificación:** `tests/sql/probar.sh` OK, `tests/verificar.cjs` 31/31, `tests/verificar-supabase.cjs` 9/9 y `tests/funciones/probar.sh` OK.

### 20/10/2026 · A4: catálogo desde el iPhone 7 y colores oficiales

- **Pedido de Jared (fase A, punto A4):** catálogo desde el iPhone 7 con su archivo como **única fuente**; tabla `colores`; agregar los modelos que faltan por slug, inactivos y con la ficha vacía; generación y orden por fecha de lanzamiento (renumerar sin cambiar slugs); el público lee solo colores de modelos activos; la escritura sigue los permisos del catálogo; en el Catálogo se ven los colores, el nombre es de solo lectura y el hexadecimal solo se completa donde falta.
- **Hecho:**
  - `supabase/migrations/0006_catalogo_colores.sql`: 10 modelos nuevos (iPhone 7, 7 Plus, 8, 8 Plus, X, XS, XS Max, XR, SE 2.ª y SE 3.ª), 42 en orden de lanzamiento (el 16e pasa después del 16 Pro Max y el 17e después del 17 Pro Max), tabla `colores` con 183 colores, disparador `colores_proteger`, RLS y `datos_publicos()` con colores.
  - `semilla.js` generada de los mismos datos (`CATALOGO` y `COLORES`); `demo.js` versión 4 con la misma migración y los métodos de colores; `supabase.js` con los mismos métodos; `comun.js` (`CAMPOS_COLOR`, mensajes de los disparadores).
  - Panel: colores por modelo en Catálogo; `etiquetaGeneracion` compartida ("Generación XS y XR").
- **Datos que faltan en la fuente:** ver sección 17 (151 colores sin hexadecimal, nombres en inglés que faltan, 17 Pro y 17 Pro Max sin colores).
- **Pruebas cambiadas y por qué:**
  - `pruebas.sql`: 32 → 42 modelos; el orden de la generación 17 cambia (el 17e salió en marzo de 2026, después del 17 Pro Max: se reemplazó la prueba por la nueva lista); pruebas nuevas de colores (conteos, RLS, completar hex, hex de la fuente fijo, colores de la tienda, oficiales no se borran) y de la migración con un modelo de la agencia (`antes_0006_catalogo_colores.sql`).
  - `comparar-semilla.mjs` compara también los colores.
  - `verificar.cjs`: la prueba del buscador activaba "los primeros 9 modelos" (antes, del 11 al 13; ahora serían del 7 al 11): se eligen explícitamente del 11 al 13 para que siga probando lo mismo. Casos nuevos: Catálogo con colores, y migración de datos demo viejos.
  - `verificar-supabase.cjs`: completar un hex desde el panel y rechazo del servidor a cambiar un hex de la fuente y a agregar colores con el rol tienda.
- **Verificación:** `tests/sql/probar.sh` OK, `tests/verificar.cjs` 30/30 y `tests/verificar-supabase.cjs` 9/9.

### 20/10/2026 · A3: tamaño del texto (Compacto, Normal, Grande)

- **Pedido de Jared (fase A, punto A3):** `tienda.tamano_texto` con Compacto, Normal (por defecto) y Grande; selector en Marca con vista previa en vivo; se aplica al sitio, al pop-up y a las legales, no al panel; nada debajo de 16 px; Compacto achica solo títulos, precios grandes y espacios; Grande, cerca de +12 %.
- **Hecho:**
  - `supabase/migrations/0005_tamano_texto.sql` con su `check`.
  - `comun.js`: `TAMANOS_TEXTO` y el campo en `CAMPOS_TIENDA`. `demo.js`: versión 3 (migración que agrega el campo) y validación.
  - `tema.js` pone `data-tamano`; `sitio.css` define `--t-titulo` y `--t-espacio` y los usa en títulos, precios grandes y espacios principales; Grande pone la raíz en 112,5 %.
  - Panel (`tienda.js`, `panel.css`): selector "Tamaño del texto" con ayuda, y la vista previa usa las mismas escalas.
- **Pruebas:** `pruebas.sql` (valor por defecto, cambio y valor inválido); `verificar.cjs`: el caso de 16 px recorre los tres tamaños en sitio, pop-up y legales y mide cuerpo, título y precio; caso nuevo del selector del panel → sitio. Ninguna prueba se debilitó.
- **Verificación:** `tests/sql/probar.sh` OK y `tests/verificar.cjs` 28/28.

### 20/10/2026 · A2: el stock pasa a "Con stock" / "Sin stock"

- **Pedido de Jared (fase A, punto A2):** reemplazar el número de stock por un sí/no, verdadero por defecto; la migración convierte `stock > 0` en verdadero; quitar `usado_es_una_unidad`; los conteos pasan a ser cantidad de equipos con stock; interruptor "Stock" en la lista, la edición rápida y los formularios; Duplicar copia el estado; se mantiene el filtro especial "sin stock".
- **Hecho:**
  - `supabase/migrations/0004_en_stock.sql`: columna `en_stock`, conversión, política `equipos_leer`, `datos_publicos()` e índice nuevos; se borran `stock` y la restricción.
  - `demo.js`: `version` 2 con `migrar()`, que repite la conversión en los datos guardados del navegador; valida que `en_stock` sea sí/no.
  - `comun.js` (`equipoEsPublico`, `CAMPOS_EQUIPO`), `catalogo.js` (`contarEquipos`, cantidades por modelo), `principal.js`, `panel.js` (Publicados) y `semilla.js` (`en_stock: true`).
  - Panel: `interruptor()` de `ui.js` acepta `estados` y muestra "Con stock" / "Sin stock"; `inventario.js` usa el interruptor en la lista y en el formulario, y el texto de borrar dice «Sin stock».
- **Pruebas cambiadas y por qué:**
  - `pruebas.sql`: la prueba "un usado no puede tener stock 2" perdió sentido (ya no hay cantidades). Se reemplazó por "el stock no puede quedar vacío" (`not null`) y por el bloque 0, que prueba la conversión de la migración con datos viejos (`antes_0004_en_stock.sql`).
  - `verificar.cjs`: los contadores pasan de unidades a equipos (5 → 2, 10 → 6, 7 → 4); la validación "Un usado tiene stock 1" se reemplazó por la comprobación del interruptor ("Con stock" por defecto); caso nuevo del interruptor de la lista (oculta y vuelve a mostrar en el sitio, y filtro `?stock=0`).
  - `verificar-supabase.cjs`: contador 10 → 6 y el formulario ya no escribe un número de stock.
- **Verificación:** `tests/sql/probar.sh` OK, `tests/verificar.cjs` 27/27, `tests/verificar-supabase.cjs` 9/9.

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
