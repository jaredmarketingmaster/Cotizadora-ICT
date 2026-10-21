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
9. [Pop-up, WhatsApp, atribución, píxel y legales](#9-pop-up-whatsapp-atribución-píxel-y-legales)
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

### 2.12 Módulo legal (0016 y 0017)

- Jared pidió reemplazar los textos legales base de `0015` por un módulo listo para usar: la tienda solo llena su perfil, su identificación, sus países y sus condiciones de venta, y los documentos salen de plantillas por país.
- Fases A a H: motor, módulo de Colombia y plantillas (A); asistente de seis pasos y migración `0016` (B); páginas `/privacidad/`, `/terminos/` y la nueva `/cookies/` (C); banner de cookies con consentimiento previo y las dos casillas del pop-up (D); `consentimiento.js` como único cargador de herramientas y el ID del píxel en la tienda (E); bloqueo hasta publicar, `0017` (F); documentación y `legal/FUENTES.md` (G); pruebas y mediciones (H).
- Ver la sección 9.6 a 9.9.

---

## 3. Reglas que no se rompen

Vienen del prompt y de las decisiones de Jared. Cualquier cambio debe respetarlas.

1. **Idioma:** español de Colombia y trato de **"usted"** en todo el texto visible: sitio, panel, errores, `aria-label` y correos. Nada de "tú" ni voseo.
2. **Marca:** sin logo, imágenes, renders, íconos ni tipografías de Apple. Los marcadores de posición son una silueta genérica de teléfono en SVG (`assets/js/ilustracion.js`), sin manzana, sin cámaras y sin copiar ningún modelo.
3. **Datos:** no inventar especificaciones, precios, colores, garantías, plazos ni tiempos de respuesta. **Si un campo está vacío, no se muestra.** Tampoco se escriben promesas que la tienda no cargó, como "envío gratis" o "garantía de 12 meses".
4. **Moneda:** pesos colombianos con el formato `$5.299.000` (punto de miles, sin decimales). Se guardan como enteros. Para formatear se usa `formatearCOP`; **no** se usa `Intl`, que en español puede no agrupar los números de 4 cifras.
5. **Fechas:** D/M/AAAA en hora de Colombia, con `fechaCorta`.
6. **Nada de la tienda en el código.** Todo sale de la base y se edita desde el panel. `config.js` solo lleva la conexión y el script de GHL (desde `0016`, los ID de las herramientas, incluido el del píxel, van en Legales).
6b. **Legales:** la tienda es la responsable del tratamiento; el proveedor tecnológico es el encargado y en los textos públicos se nombra solo como "nuestro proveedor tecnológico, ubicado en Argentina" (nunca su nombre, documento ni domicilio, en ningún archivo). Nada se afirma como requisito legal si no está en `legal/FUENTES.md`. Ninguna herramienta de medición o publicidad se carga sin consentimiento. Sin avisos de "borrador" ni de "revisión de un abogado".
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
| `index.html` (≈162) | Sitio público, una sola página: <ul><li>En el `<head>`, un script en línea aplica la **apariencia de la visita anterior** (`localStorage["cotizadora:apariencia"]`: tema, tamaño y colores) antes del primer pintado; valida cada valor. Las páginas legales tienen el mismo script.</li><li>La lista de equipos va dentro de `#vista-equipos`, con las flechas y el indicador del carrusel (ocultos en cuadrícula).</li><li>Franja demo, encabezado con logo, nombre y título, y tarjeta de filtros (segmentado, lista desplegable y chips).</li><li>Contador y "Limpiar filtros", galería, estado vacío y detalle en línea.</li><li>Sección `#resenas` (oculta hasta que haya reseñas para mostrar) entre los equipos y la información de la tienda, y `<dialog id="visor-resena">` (visor a pantalla completa).</li><li>Información de la tienda, pie (enlaces a las tres políticas y el botón "Preferencias de cookies", oculto hasta que carga el consentimiento), `<dialog id="hoja-detalle">` (detalle del equipo), barra fija de compra y `<dialog id="popup">`.</li><li>Carga Google Fonts (Inter) sin bloquear el pintado, `modulepreload` de los módulos y `assets/js/sitio/principal.js`.</li></ul> |
| `config.js` (≈36) | **Único archivo que cambia por tienda.** Contiene:<ul><li>`backend`: `"demo"` o `"supabase"`.</li><li>`supabase.url` y `supabase.anonKey`.</li><li>`metaPixelId`: **ya no se usa** (desde `0016` el ID va en Legales → Herramientas). Si una tienda vieja tiene uno aquí, el panel lo copia una vez a la tienda al entrar el gestor (`copiarPixelViejo` en `panel.js`).</li><li>`ghlSeguimiento.src` y `ghlSeguimiento.id`, del script de seguimiento externo de GHL (opcional; se carga solo con permiso de medición).</li></ul>Nada de lo que contiene es secreto. |
| `README.md` | Guía para personas: probar en demo, GitHub Pages, poner una tienda en producción, GHL, píxel, decisiones, pruebas y pendientes. |
| `CLAUDE.md` | Reglas y guía para las próximas sesiones de Claude Code: cómo verificar antes de cada commit y la obligación de mantener este documento. |
| `DOCUMENTACION.md` | Este documento. |
| `legal/FUENTES.md` | Fuentes de todo lo que los textos legales afirman como requisito legal (Colombia) y de las cookies de cada herramienta, con el estado de verificación de cada una y las decisiones (plazo de devolución del retracto, Argentina en la lista de la SIC). |
| `.gitignore` | Ignora `tests/capturas/`, `node_modules/`, `deno.lock`, `.env` y las carpetas temporales de la CLI de Supabase. |
| `.nojekyll` | Archivo vacío. Le dice a GitHub Pages que publique los archivos tal cual, sin procesarlos con Jekyll (que ignora carpetas que empiezan con `_`). |

### 5.2 Páginas

| Archivo | Qué es |
|---|---|
| `admin/index.html` (≈59) | Cáscara del panel. Tiene:<ul><li>Pantalla de carga y bloque `#acceso` (login, recuperar y crear contraseña).</li><li>`#app` con barra superior (tienda, usuario, "Ver mi sitio" y "Salir"), navegación por pestañas y `#vista` (contenido de la ruta).</li><li>Aviso flotante "Guardado" y `<dialog id="confirmar">`.</li><li>`noindex`.</li></ul> |
| `privacidad/index.html` (≈44) | Página `/privacidad/`: "Política de tratamiento de datos personales". Muestra el documento publicado (`tienda.legal_publicado.documentos.privacidad`) con su vigencia; sin publicar, "Página en preparación.". Pie con las tres políticas y "Preferencias de cookies". Script: `legal.js`. |
| `terminos/index.html` (≈44) | Página `/terminos/`: "Términos y condiciones". Igual que la de privacidad, con `documentos.terminos`. |
| `cookies/index.html` (≈44) | Página `/cookies/` (nueva con `0016`): "Política de cookies". Igual que las otras, con `documentos.cookies`. |

### 5.3 Estilos (`assets/css/`)

| Archivo | Qué es |
|---|---|
| `assets/css/base.css` (≈264) | Base compartida por el sitio y el panel: <ul><li>**Variables de diseño** (`--primario`, `--sobre-primario`, `--primario-texto`, `--secundario`, `--sobre-secundario`, superficies, bordes, textos, error, éxito, aviso, radios, sombras y curvas), con su versión `[data-tema="oscuro"]`.</li><li>Reinicio y foco visible.</li><li>Botones (`.boton--primario`, `--secundario`, `--suave`, `--peligro`, `--enlace`, `.boton-icono`), campos (`.entrada`, `.campo`, `.error-campo`, `.casilla`) y etiquetas (`.etiqueta-pildora`, `.etiqueta-demo`).</li><li>Spinner y reglas de `prefers-reduced-motion`.</li></ul> |
| `assets/css/sitio.css` (≈969) | Sitio público: <ul><li>Franja demo y encabezado (el brillo decorativo va en `::before` para no tocar el contraste).</li><li>Filtros: segmentado, lista desplegable propia y chips.</li><li>Galería (1 → 2 → 3 → 4 columnas) y tarjetas.</li><li>Detalle y carrusel (scroll-snap).</li><li>Hoja: pantalla completa desde abajo en celular, ventana centrada en escritorio desde 900 px.</li><li>Barras de compra (apiladas por debajo de 480 px).</li><li>Información de la tienda, pop-up y **pie con el color secundario** de la tienda (texto `--sobre-secundario` y `--sobre-secundario-suave`).</li><li>Animaciones de apertura y páginas legales (con `.tabla-legal` para las tablas de la Política de cookies).</li><li>**Banner de cookies** (`.banner-cookies`): fijo abajo (no mueve nada: sin CLS), caja de 760 px como máximo, tres botones iguales en una grilla de 3 columnas, interruptores por categoría (`.interruptor-cookie`); botón "Preferencias de cookies" del pie (`.pie-boton`); aviso corto del pop-up (`.popup-aviso-legal`).</li><li>**Tamaño del texto** (`data-tamano` en `<html>`): variables `--t-titulo` y `--t-espacio`; Grande pone la raíz en 112,5 %.</li><li>**Aire entre secciones** (todo multiplicado por `--t-espacio`): pie con 48 px arriba y abajo en celular y 72 px en escritorio (`--pie-aire`) y bloques separados 18–24 px; 52–72 px entre el título y los filtros; 40–64 px arriba y abajo de la zona de equipos (las dos vistas).</li></ul> |
| `assets/css/panel.css` (≈453) | Panel, pensado primero para celular: <ul><li>Acceso y barra superior pegajosa.</li><li>Navegación en pastillas desplazables.</li><li>Bloques, estadísticas, avisos e interruptor.</li><li>Lista de inventario: tarjetas en celular, filas desde 1000 px.</li><li>Formulario por pasos y acciones pegajosas.</li><li>Fotos, filas de ficha, catálogo, vista previa de marca y recorte del logo.</li><li>Lista editable, usuarios, aviso flotante y ventana de confirmación.</li><li>**Asistente de Legales:** progreso, pasos (`.pasos-legales`, `aria-current="step"`, ✓ en los completos), opciones (`.opciones-legales`), filas de impuestos, texto fijo (`.texto-fijo`), estado del guardado, vista previa con tablas y botones Anterior / Siguiente.</li></ul> |

### 5.4 JavaScript compartido (`assets/js/`)

| Archivo | Exporta y para qué |
|---|---|
| `assets/js/utils.js` (≈278) | Utilidades sin dependencias: <ul><li>**Números:** `formatearMiles`, `formatearCOP`, `leerPrecio` ("5.299.000" → 5299000).</li><li>**Fechas:** `fechaCorta` (D/M/AAAA en America/Bogota).</li><li>**Texto:** `escaparHTML`, `plural`, `formatoBasico` (mini-markdown seguro para los legales: `##`, `###`, `**`, listas, enlaces https/mailto (nueva pestaña) y rutas relativas como `../cookies/` (misma pestaña), y tablas con `|` que salen como `<div class="tabla-legal"><table>` con la primera columna en `<th scope="row">`).</li><li>**Capacidades:** `CAPACIDADES_SUGERIDAS`, `slugCapacidad`, `capacidadDeSlug`, `capacidadEnGB`.</li><li>**Contacto:** `soloDigitos`, `celularValido` (10 dígitos que empiezan por 3), `formatearCelular` ("300 123 4567"), `correoValido`, `whatsappTiendaValido` (12 dígitos que empiezan por 57).</li><li>**Código:** `generarCodigo`, `codigoValido`. "COT-" más 4 caracteres de un alfabeto de 32 sin O, 0, I ni 1, con `crypto.getRandomValues`; como 256 % 32 = 0, el sorteo no tiene sesgo.</li><li>**Contraste WCAG:** `hexValido`, `luminancia`, `contraste`, `textoSobre` (blanco o casi negro, garantiza al menos 4,5:1), `ajustarParaTexto` (oscurece o aclara un color hasta 4,5:1 sobre uno o varios fondos; si en una dirección no alcanza, prueba la otra) y `mezclar`.</li><li>**Varios:** `sesion` (sessionStorage seguro), `seguro`, `reducirMovimiento`, `esperar`, `idEvento`.</li></ul> |
| `assets/js/tema.js` (≈45) | `variablesTema(tienda)` y `aplicarTema(tienda)`: pasan `color_primario`, `color_secundario` y `tema` a variables CSS y calculan el texto con contraste AA. También ponen `data-tamano` (`tamano_texto`) en `<html>`, que solo lee `sitio.css`, y `--sobre-secundario-suave` (texto suave del pie, 4,5:1 o más sobre el secundario). `--primario-texto` se ajusta contra **todas** las superficies del tema. También exporta `FONDOS`. |
| `assets/js/ilustracion.js` (≈51) | `telefonoSVG(colorHex, titulo)`: teléfono genérico con el marco del color del equipo. `logoGenericoSVG()`: ícono para cuando no hay logo. |
| `assets/js/legal/motor.js` (≈227) | **Motor legal, puro (sin DOM ni red).** <ul><li>`DOCUMENTOS` (privacidad, términos, cookies y aviso, cada uno con su campo de cláusula propia), `PERFILES` (seis perfiles de tienda, con `apple` y `local`), `ENTREGAS`, `PASOS` del asistente y `PLATAFORMA_POR_DEFECTO`.</li><li>`faltantes(tienda)`: lista `{paso, campo, texto}` de lo que falta o no es válido; cambia con el perfil, el tipo de persona y los países.</li><li>`contexto(tienda)`: datos limpios para las plantillas (`limpio` quita `[ ] * _` y `#`, para que la tienda no meta formato).</li><li>`generar(tienda)`: los cuatro documentos en Markdown; falla con "Faltan datos para generar los textos legales." si falta algo.</li><li>`MARCAS` (`[PENDIENTE` o `{{`: una cláusula propia con eso falta corregirla, paso 6), `huella` (FNV-1a de los textos), `hoyColombia`, `publicar(tienda, anterior, hoy)` (sube la versión solo si cambió algún texto) y vuelve a exportar `fechaDMA` y `conVigencia` de `vigencia.js`.</li></ul> |
| `assets/js/legal/vigencia.js` (≈16) | `fechaDMA(iso)` y `conVigencia(publicado, clave)`: el documento con "Vigente desde D/M/AAAA · versión N." al pie. Separado del motor para que el sitio no cargue las plantillas. |
| `assets/js/legal/herramientas.js` (≈69) | Herramientas de medición y publicidad: `CATEGORIAS`, `HERRAMIENTAS` (píxel de Meta siempre; GA4, GTM, Clarity, TikTok y Google Ads opcionales), cada una con su campo, patrón del ID, proveedor, categoría, cookies (duración solo si está verificada en `legal/FUENTES.md`) y política. `OPCIONALES`, `activas(tienda)` e `idValido`. |
| `assets/js/legal/paises/indice.js` (≈48) | `PAISES`: los 18 países de Hispanoamérica y Brasil (19). Solo Colombia está `disponible`; Brasil queda en `portugues` ("Necesita el sitio en portugués."); el resto, `proximamente`. `PAISES_DISPONIBLES`, `CODIGOS_PAISES`, `modulosDe` y `documentosDe`. Para sumar un país se copia `co.js` con los datos del otro país y se agrega su módulo aquí. |
| `assets/js/legal/paises/co.js` (≈115) | Módulo de Colombia: autoridad (SIC), documentos (C.C., NIT con dígito de verificación, C.E.), plazos de la Ley 1581 (consultas 10 + 5 días hábiles, reclamos 15 + 8, completar en 5), derechos del artículo 8, transmisión (Decreto 1074), retracto (5 días hábiles, devolución en máximo 15 días calendario), garantía mínima de 12 meses para nuevos, reclamos de garantía en 15 días hábiles, horarios de la Ley 2300 y las secciones propias del país en privacidad y términos. Cada dato tiene su fuente en `legal/FUENTES.md`. |
| `assets/js/legal/plantillas/privacidad.js` (≈104) | `secciones(ctx)` de la Política de tratamiento de datos: 12 secciones (responsable, datos, finalidades, encargados y transmisión, API de Conversiones, conservación, derechos, cómo ejercerlos, mayoría de edad, seguridad, cambios y la sección por país). El proveedor tecnológico se nombra solo como "nuestro proveedor tecnológico, ubicado en Argentina". |
| `assets/js/legal/plantillas/terminos.js` (≈80) | `independiente(tienda)`: el texto fijo de los perfiles que no son oficiales ni autorizados (lo usa también el paso 4 del asistente). `secciones(ctx)` de los Términos y condiciones: quién vende y relación con Apple (según el perfil), cotizador, precios e impuestos, garantía, retracto, entrega, homologados (si aplica), mayoría de edad, marcas, proveedor tecnológico, ley aplicable, datos personales y cambios. |
| `assets/js/legal/plantillas/cookies.js` (≈64) | `secciones(ctx)` de la Política de cookies: qué son, categorías (necesarias, medición, publicidad), una tabla por herramienta activa, Global Privacy Control y cómo cambiar la elección ("Preferencias de cookies"). |
| `assets/js/legal/plantillas/aviso.js` (≈15) | `secciones(ctx)` del aviso de privacidad corto del pop-up: quién es responsable, para qué se usan los datos, los derechos y el enlace a la política. |

### 5.5 Capa de datos (`assets/js/datos/`)

| Archivo | Qué es |
|---|---|
| `assets/js/datos/api.js` (≈17) | `api()`: devuelve, una sola vez, el adaptador `demo` o `supabase` según `config.js`. Si se pide Supabase sin URL o clave, usa demo y avisa en la consola. |
| `assets/js/datos/comun.js` (≈291) | Reglas compartidas por los dos adaptadores: <ul><li>`ErrorDatos`.</li><li>`equipoEsPublico`: publicado, con stock (`en_stock`) y de un modelo activo.</li><li>`LADO_GRANDE` = 1600 y `LADO_MINIATURA` = 640.</li><li>`rutaMiniatura`: `x.webp` → `x-640.webp`.</li><li>`CAMPOS_TIENDA`, `CAMPOS_EQUIPO`, `CAMPOS_COLOR`, `MAX_MAS_VENDIDOS` y `MENSAJE_MAS_VENDIDOS`, `nombreColor(color, mostrar)` (nombre que ve el cliente: el elegido por la tienda o el oficial en inglés, o el de la fuente), `TAMANOS_TEXTO`, `ESTADOS_ESTETICOS` y `elegir`.</li><li>**Ficha técnica (0012):** `CATEGORIAS_FICHA` (las 10 categorías fijas con su clave y nombre, en orden, más `otras` para las filas de la tienda), `MAX_ETIQUETA_FICHA` (60) y `MAX_VALOR_FICHA` (600), `especificacionesValidas` (las reglas de `validar_ficha`) y `filasVisiblesFicha(ficha, tienda)`: lo que muestra el sitio (nada si `mostrar_ficha` está apagado; si no, las categorías encendidas con valor en el orden fijo y al final las filas de la tienda).</li><li>**Legales (0016):** `LEGAL_INICIAL` (los campos del asistente con sus valores iniciales, iguales a los defaults del SQL; `CAMPOS_TIENDA` los incluye), `CAMPOS_LEGALES`, `PLATAFORMA_POR_DEFECTO` ("HighLevel (GoHighLevel)"), `CODIGOS_PAISES_SQL` (la lista del check de `legal_paises`; la prueba del motor la compara con `indice.js`) y `errorLegales(tienda)`: los checks de `0016` (largos, opciones, países, entregas, meses de 1 a 120, interruptores, `legal_publicado` objeto o vacío).</li><li>**Formas de pago (0013):** `MEDIOS_PAGO`, `PASARELAS_PAGO`, `MIN_CUOTAS` / `MAX_CUOTAS`, `errorPagos(tienda)` (las reglas de `validar_pagos`, con sus mensajes) y `frasesPagos(tienda)`: las frases del sitio ("Transferencia bancaria.", "Tarjeta de crédito: hasta 12 cuotas, hasta 6 sin interés.", "Pago a cuotas: …" si no marcó crédito, "Criptomonedas: USDT.", "Pago en línea con PSE, Nequi y Addi." y cada una de las otras, tal cual).</li><li>`mensajeDeError`: traduce los errores de Postgres al español; los mensajes de los disparadores (ya en español) pasan tal cual.</li></ul> |
| `assets/js/datos/semilla.js` (≈115) | `CATALOGO`: los **42 modelos** desde el iPhone 7, con slug, generación y orden de 10 en 10 por fecha de lanzamiento. `COLORES`: los 183 colores oficiales por slug (`[nombre_es, nombre_en, hex]`, vacío si la fuente no lo da). `DEMO_EQUIPOS`: los 6 equipos demo. `FICHAS`: las fichas técnicas de los 42 modelos, solo con lo que trae la fuente (`[clave, valor]` o `[null, valor, etiqueta]`), y `filasDeFuente(slug)`, que las devuelve como quedan en la base. `slugDe`. **Debe coincidir** con `0006_catalogo_colores.sql`, `0003_demo.sql` y `0012_fichas.sql`; la prueba SQL lo revisa. |
| `assets/js/datos/demo.js` (≈822) | Back-end de demostración. Ver sección 7.2. |
| `assets/js/datos/supabase.js` (≈304) | Back-end Supabase. Ver sección 7.3. |

### 5.6 Sitio público (`assets/js/sitio/`)

| Archivo | Qué es |
|---|---|
| `assets/js/sitio/principal.js` (≈388) | **Orquestador del sitio.** Sus tareas: <ul><li>Captura la atribución.</li><li>Carga los datos y aplica el tema.</li><li>Dibuja marca, información y pie.</li><li>Inicia el **consentimiento** (`iniciarConsentimiento`, con los filtros como zona que el banner no tapa); el script de seguimiento de GHL se carga solo con permiso de medición (`cargarSeguimientoGHL`, una vez, también si la persona acepta después).</li><li>Arma los filtros y lee y escribe la URL.</li><li>Actualiza contador y galería, y decide el detalle en línea.</li><li>Abre la hoja de detalle (con gesto de deslizar para cerrar) y conecta la barra fija.</li><li>En demo, recarga si otra pestaña cambió los datos (evento `storage`).</li></ul> |
| `assets/js/sitio/catalogo.js` (≈163) | **Lógica pura, sin DOM:** <ul><li>`prepararCatalogo`, que calcula la recencia de cada generación como el mayor `orden` de sus modelos.</li><li>`filtrar`, `contarEquipos` (cantidad de equipos: el stock es sí/no), `opcionesModelo` (agrupadas por generación, de la más nueva a la más vieja), `etiquetaGeneracion` ("Generación 11", "Generación XS y XR"; "Plegable" queda igual; el panel usa la misma) y `opcionesCapacidad`.</li><li>`prepararCatalogo` guarda también los colores (`cat.colores`, por id) y le pone a cada equipo `color` (el oficial), `color_nombre` (el que ve el cliente, con `nombreColor`) y `color_hex` (la muestra oficial o vacío). El resto del sitio (tarjetas, muestras, detalle, texto alternativo, WhatsApp y píxel) usa esos dos campos.</li><li>`encadenar`: limpia las elecciones que un cambio deja inválidas.</li><li>`tarjetas`: nuevos por modelo y capacidad, usados por unidad; orden: destacados, generación más nueva y precio. Cada tarjeta lleva `masVendido` si cualquiera de sus equipos tiene `mas_vendido` (no cambia el orden); `TEXTO_MAS_VENDIDO` es la etiqueta.</li><li>`diapositivas`, `textoCondicion`, `textoAlternativo` y `describirBusqueda`.</li><li>`mensajeCompra`, `mensajeSinStock` y `enlaceWhatsApp`.</li></ul> |
| `assets/js/sitio/filtros.js` (≈189) | Controles de los filtros: <ul><li>`iniciarSegmentado`: Nuevo/Usado, donde un segundo toque desmarca; pone `--i` y `--visible` para el indicador que se desliza.</li><li>`iniciarChips`: almacenamiento.</li><li>`iniciarDesplegable`: lista propia con `role="listbox"`, grupos por generación, "Todos los modelos", cantidad por modelo, buscador si hay más de 8, teclado (flechas, Inicio/Fin, Enter, Escape, Tab) y cierre al tocar afuera.</li><li>`marcarLimpiado`: destello cuando un filtro se limpia solo.</li></ul> |
| `assets/js/sitio/galeria.js` (≈125) | `crearGaleria(lista, api)`: tarjetas con clave estable. Al filtrar, las que salen se desvanecen y las que quedan se reacomodan con **FLIP** (Web Animations API). Sin animación si hay `prefers-reduced-motion`. Con `usarCarrusel(c)`, dibuja las tarjetas y le pasa el movimiento al carrusel. **Más vendido:** la tarjeta lleva la clase `tarjeta--mas-vendido`, la etiqueta y `span.tarjeta-brillo` (decorativo); un `IntersectionObserver` pone `data-en-pantalla` en las 3 primeras como máximo, y solo en esas corre la luz. |
| `assets/js/sitio/carrusel-equipos.js` (≈250) | Vista **Carrusel** de los equipos: `crearCarruselEquipos(region, lista)` → `{reconstruir, mover, actual}`. Posición continua `pos`; cada tarjeta se dibuja a la distancia más corta del bucle (transform, opacidad y escala). Bucle infinito; arrastre con inercia y ajuste; flechas; ← →; trackpad horizontal; toque en vecina = centrarla; indicador "N de M"; altura de la tarjeta más alta; con 2 tarjetas, una sola vecina (con fundido si cambia de lado); con 1, sin flechas ni bucle; `data-moviendo` en la región mientras se mueve. Sin animación con `prefers-reduced-motion`. |
| `assets/js/sitio/detalle.js` (≈219) | `crearDetalle(...)`: carrusel y ficha. <ul><li>El carrusel usa scroll-snap y se mueve con el dedo, flechas, puntos, muestras de color y teclado; con varias fotos muestra miniaturas.</li><li>La ficha tiene nombre, etiqueta (y "Más vendido", quieta, si el modelo y capacidad lo es en un nuevo, o la unidad en un usado), variante, `etiqueta_precio` y precio (el elemento más grande), datos de usado, descripciones, "Ver ficha técnica" (solo filas con valor), pagos, entrega, garantía y el botón.</li><li>También exporta `htmlBarraCompra` e `ICONO_WA`.</li></ul> |
| `assets/js/sitio/resenas.js` (≈100) | **Reseñas del sitio** (`0014`). `dibujarResenas({seccion, dialogo, api, tienda, resenas})`: solo si `mostrar_resenas` y hay alguna (si no, la sección queda oculta). Celular: fila con scroll-snap; desde 900 px: mosaico. Cada reseña es un botón con la imagen (miniatura de 640 px, carga diferida) o un recuadro "Video", el texto (4 líneas) y el origen en texto. El visor: título "Reseña N de M", imagen grande o `<video controls playsinline preload="none">` creado al abrir (no se descarga nada hasta que el cliente toca reproducir; sin reproducción automática), texto, origen, "Anterior" / "Siguiente", ← y →, Escape, el botón o tocar afuera para cerrar, y el foco vuelve a la reseña. `principal.js` lo importa **solo si hay reseñas para mostrar**. |
| `assets/js/sitio/transiciones.js` (≈80) | Apertura y cierre de los diálogos del sitio: `abrirConTransicion(dialogo, mostrar, {origen, destino})` usa la **View Transitions API** (la foto de la tarjeta viaja al detalle; el diálogo lleva `data-vt` mientras dura) y, sin ella o con reduced-motion, abre directo con la animación de CSS de siempre. `cerrarConTransicion` hace una salida corta (baja en celular; se achica y desvanece en pantallas grandes) y después `close()`; `cerrarConEscape` lo usa con Escape. |
| `assets/js/sitio/popup.js` (≈314) | `crearPopup(...)`: el pop-up "Antes de pasar a WhatsApp" completo, con el aviso corto, las dos casillas y los campos de consentimiento del pedido; sin textos legales publicados no pide datos (`dibujarSinLegales`). `fechaConZona()`: fecha y hora de Colombia con `-05:00`. Ver sección 9. |
| `assets/js/sitio/fotos.js` (≈19) | `htmlFoto`: `<img>` con `srcset` 640w/1600w, `loading="lazy"` o `fetchpriority="high"`. `htmlMedio`: la foto principal o la ilustración. |
| `assets/js/sitio/atribucion.js` (≈31) | `CLAVES_ATRIBUCION` (`utm_source`, `utm_medium`, `utm_campaign`, `utm_term`, `utm_content`, `ad_id`, `fbclid`), `capturarAtribucion` y `leerAtribucion`. Guarda en `sessionStorage["cotizadora:atribucion"]` el **primer valor por clave** de la sesión. |
| `assets/js/sitio/pixel.js` (≈46) | Píxel de Meta. Lo llama solo `consentimiento.js`: `iniciarPixel(id)` (con publicidad aceptada; carga y manda `PageView`, o `consent grant` si ya estaba) y `retirarPixel()` (`fbq("consent", "revoke")`; desde ahí no sale nada). `evento(nombre, parametros, eventID)` solo con el píxel activo. `parametrosEquipo(q)`: `content_name`, `content_ids`, `content_type`, `value` y `currency: "COP"`. |
| `assets/js/sitio/legal.js` (≈26) | Script de `/privacidad/`, `/terminos/` y `/cookies/`: carga la tienda, aplica el tema, muestra el logo y el documento publicado con `conVigencia` (sin publicar: "Página en preparación.") e inicia el consentimiento **sin cargar herramientas ni mostrar el banner** (solo el botón "Preferencias de cookies" del pie). |
| `assets/js/sitio/consentimiento.js` (≈276) | **Consentimiento de cookies: el único módulo que decide qué se carga.** <ul><li>`iniciarConsentimiento({tienda, cargar, protegido, rutaCookies, preguntar})`, `estado()` (`{elegido, medicion, publicidad, fecha}`, lo que va en el lead), `permitido(categoria)`, `alCambiar(fn)` y `gpc()`.</li><li>Elección en `localStorage["cotizadora:cookies"]` por 6 meses (183 días); vencida, se vuelve a preguntar.</li><li>Cargadores por herramienta (IDs de la tienda): Meta (vía `pixel.js`), GA4 y Google Ads (`gtag.js` una vez), GTM, Clarity (`consentv2`) y TikTok (código base). Google con **Consent Mode v2 básico**: todo `denied` por defecto y `update` según la elección, y el script solo después de aceptar.</li><li>Al retirar una categoría: Meta `consent revoke`, Google `consent update` en `denied`, Clarity `consentv2` en `denied`, y se borran las cookies propias de esa categoría (`_ga*`, `_clck`, `_clsk` o `_fbp`, `_fbc`, `_gcl_*`, `_ttp`). Lo ya cargado en la página no se descarga; desde la próxima no se carga.</li><li>**GPC** (`navigator.globalPrivacyControl`): publicidad rechazada y su interruptor deshabilitado.</li><li>**Banner:** región con título "Cookies", texto corto con enlace a la Política de cookies, "Aceptar todas", "Rechazar todas" y "Configurar" (iguales); Configurar muestra Necesarias (siempre activas), Medición y Publicidad (solo las categorías con herramientas activas, con sus nombres) y "Guardar mi elección". Escape lo cierra si ya había elección; el foco vuelve al botón del pie.</li><li>`mostrarSinTapar`: la primera vez, el banner aparece solo si cabe debajo de los filtros; si no (360 × 800), espera a que la persona baje.</li></ul> |

### 5.7 Panel (`assets/js/panel/`)

| Archivo | Qué es |
|---|---|
| `assets/js/panel/panel.js` (≈317) | Arranque, acceso y rutas. <ul><li>**Acceso:** vistas de login, recuperación y "Cree su contraseña" o "Contraseña nueva", según `tipoDeEnlace()`.</li><li>Al arrancar, `republicarAlGuardar(ctx.api)` (de `legales.js`) envuelve `guardarTienda` para volver a publicar los legales después de cada cambio; al entrar, `copiarPixelViejo` (ID de `config.js` → tienda, una vez).</li><li>`entrar()` y el router `enrutar()` por hash, que pregunta si hay cambios sin guardar (`ctx.sucio`) y llama `ctx.alSalir`.</li><li>La vista **Inicio**: estadísticas, fecha de precios, avisos de "Lo que falta" (**primero los legales**: "Faltan los textos legales: el pop-up no envía pedidos hasta publicarlos" con enlace al primer paso incompleto, o "Faltan datos legales: los textos publicados no se actualizan"; después nombre, ciudad, correo, formas de pago, etc.) y modo demo (gestor; sin legales publicados, el interruptor y "Borrar datos de demostración" quedan deshabilitados con el aviso y el enlace).</li><li>`ctx.marcarRuta(ruta)`: cambia la dirección sin volver a dibujar (pestañas y pasos).</li><li>Rutas por rol: el administrador solo llega a Usuarios; el gestor, a todo lo demás. La navegación muestra solo los enlaces de su rol (`data-rol`).</li><li>Define `ctx`, que tiene: `api`, `usuario`, `tienda`, `sucio`, `alSalir`, `esAdministrador()`, `esGestor()`, `inicio()`, `recargarTienda()` e `ir()`.</li></ul> |
| `assets/js/panel/ui.js` (≈82) | Piezas de interfaz: `$`, `$$`, `esc`, `avisar` ("Guardado" o error), `confirmar` (promesa sobre `<dialog>`), `conBoton` (botón en espera más aviso), `campoTexto`, `interruptor`, `marcarError` y `enfocarPrimerError`. |
| `assets/js/panel/inventario.js` (≈605) | Inventario. <ul><li>**Lista** con buscador y filtros (modelo, condición, publicado y los especiales "sin stock" y "sin foto").</li><li>**Edición rápida** de precio, el interruptor **Stock** ("Con stock" / "Sin stock"), publicado y **Más vendido** (máximo 3; el cuarto avisa sin llamar a la base): se guarda al salir del campo, con Enter o al mover el interruptor.</li><li>Borrar con confirmación (borra también las fotos).</li><li>**Formulario** por pasos para agregar, completo para editar y duplicar, con validaciones.</li><li>**Fotos:** subir, cámara, arrastrar y soltar, reordenar, quitar y máximo 6.</li><li>**Color:** el paso Color muestra solo los colores oficiales del modelo (muestra y nombre en inglés, o el de la fuente) y el campo opcional "Nombre que verá el cliente". No se crean colores ni se escribe un hexadecimal desde el equipo. Cambiar el modelo borra el color elegido. Si el modelo no tiene colores, se puede guardar sin color.</li><li>Opción de activar el modelo si estaba inactivo.</li><li>Limpia las fotos subidas si se sale sin guardar.</li></ul> |
| `assets/js/panel/tienda.js` (≈359) | Mi tienda: <ul><li>Datos de la tienda y redes.</li><li>Marca: logo con **recorte** (horizontal 3:1 o cuadrado, arrastrar, zoom y teclado), favicon de 128 px, colores con selector y hexadecimal, tema, **tamaño del texto** (Compacto, Normal o Grande) y **vista previa en vivo** con el contraste calculado.</li><li>**Diseño del sitio:** cómo se ven los equipos, "Cuadrícula" o "Carrusel", cada una con su explicación.</li><li>Venta: etiqueta del precio, entrega y garantías. Las formas de pago pasaron a Catálogo → Formas de pago (hay un enlace).</li></ul> |
| `assets/js/panel/pagos.js` (≈175) | **Pestaña "Formas de pago" de Catálogo** (`#/catalogo/pagos`, `0013`): medios (chips), cuotas (interruptor; hasta cuántas, de 2 a 48; interruptor de sin interés y hasta cuántas, no más que el máximo), criptomonedas (interruptor y "¿Cuáles?"), pasarelas (chips; "Otra" pide el nombre) y "Otras formas de pago" (la lista libre que antes estaba en Mi tienda). Lo que depende de un interruptor se esconde si está apagado y se guarda vacío. Valida con mensajes en cada campo y foco al primer error; abajo, "Así se ve en el sitio" con `frasesPagos`. |
| `assets/js/panel/fichas.js` (≈170) | **Pestaña "Ficha técnica" de Catálogo** (`#/catalogo/ficha` y `#/catalogo/ficha/<modeloId>`; los títulos son `h2`, el `h1` es "Catálogo"). <ul><li>**Lista:** interruptor "Mostrar la ficha técnica en el sitio" (`tienda.mostrar_ficha`), un interruptor por categoría (`tienda.ficha_ocultas`; se guardan al moverlos y se deshabilitan con la ficha apagada) y los modelos activos con cuántos datos tiene su ficha.</li><li>**Editor de un modelo:** descripción, un campo por categoría fija (precargado de la fuente; la tienda lo corrige o completa) y "Otras filas de la tienda" (agregar, editar, subir, bajar y borrar, con etiquetas sugeridas). "Copiar ficha de otro modelo" copia todo.</li></ul> |
| `assets/js/panel/catalogo.js` (≈275) | **Catálogo con pestañas** (`role="tablist"`, flechas con vuelta, Inicio y Fin; el foco queda en la pestaña; cambiar de pestaña no recarga la vista, cambia la dirección con `ctx.marcarRuta` y pregunta si hay cambios sin guardar). Cada pestaña dibuja en un contenedor nuevo, así una que termina de cargar tarde no pisa a la actual. Pestaña **Modelos y colores**: agrupada por generación con interruptor activo/inactivo; renombra (el slug no cambia), reordena (intercambia el `orden`) y agrega modelos al final. **Colores** de cada modelo (desplegable): muestra, nombre en español y en inglés (solo lectura), hexadecimal de la fuente fijo y campo para completar el que falta; en modelos sin colores oficiales, el gestor agrega y borra colores de la tienda. |
| `assets/js/panel/legales.js` (≈512) | **Asistente de Legales** (`#/legales` y `#/legales/<1 a 6>`, con `?campo=` para enfocar un campo). Ver sección 9.6. <ul><li>Progreso (`<progress>` y "N de 6 pasos completos"), lista de pasos con ✓, Anterior / Siguiente.</li><li>Pasos: 1 Perfil, 2 Identificación, 3 Países, 4 Condiciones de venta, 5 Herramientas, 6 Vista previa y publicación.</li><li>Guardado automático: texto a los 700 ms de dejar de escribir, lo demás al cambiarlo, con "Guardando…" / "Guardado." en un `role="status"`; un guardado que termina fuera de Legales no pinta nada.</li><li>Errores por campo después de tocarlo (`mensajeError`), con `aria-invalid` en el control.</li><li>Paso 6: "Lo que falta" con "Resolver" (lleva al paso y enfoca el campo), pestañas de los 4 documentos con flechas, "Agregar una cláusula propia" por documento y "Publicar textos legales" (solo con todo completo).</li><li>`republicarAlGuardar(api)`: después de cada guardado, si ya hay textos publicados y no falta nada, vuelve a generar y publicar; la versión sube solo si cambió algún texto.</li></ul> |
| `assets/js/panel/usuarios.js` (≈100) | Solo administrador: invitar (correo y rol), **asignar rol** (selector por usuario), desactivar con confirmación y reactivar. Su propia fila no tiene controles. |
| `assets/js/panel/imagenes.js` (≈85) | Fotos en el navegador, sin librerías: <ul><li>`validarArchivo`: jpg, png, webp o heic de hasta 10 MB.</li><li>`comprimirFoto`: devuelve `{grande ≤1600px, miniatura ≤640px, ext}` en WebP, o JPEG si el navegador no codifica WebP.</li><li>`codificar`, `cargarImagen` y `MAX_BYTES`.</li></ul>El HEIC se rechaza con un aviso claro si el navegador no lo lee. |
| `assets/js/panel/resenas.js` (≈210) | **Reseñas en Mi tienda** (`0014`), fuera del formulario: todo se guarda solo. Interruptor "Mostrar reseñas en el sitio" y "Título de la sección"; lista (hasta 12) con miniatura, texto y origen editables, subir, bajar y borrar (borra también sus archivos); "Agregar una reseña" con el **aviso fijo** "Las capturas pueden tener datos personales de sus clientes. Tápelos o pida autorización antes de publicarlas." arriba de la carga, archivo (imagen comprimida como las fotos, en dos tamaños, o video validado con `validarVideo(archivo, {maxSegundos: 30})`), texto y origen opcionales (Instagram, WhatsApp, Google u Otro con "¿Cuál?") y la casilla **obligatoria** "Tengo autorización de esta persona o tapé su nombre, foto y número.". Si algo falla después de subir, borra lo subido. Con 12, "Agregar reseña" queda deshabilitado. |
| `assets/js/panel/video.js` (≈110) | Video corto del equipo, validado en el navegador antes de subir y **sin comprimir**: <ul><li>`validarVideo(archivo, {maxSegundos})`: MP4 o WebM; hasta 20 MB; hasta 15 s por defecto (equipos) o el máximo que se pida (reseñas: 30), con 0,1 s de margen. Devuelve `{ext, segundos}`.</li><li>MP4: `leerMp4` lee la caja `mvhd` (duración) y busca `avc1`/`avc3` en `moov` (H.264); no hace falta que el navegador sepa reproducirlo.</li><li>WebM: la duración que informa `<video>` (si dice Infinity, busca el final).</li><li>.mov, MP4 en HEVC u otro formato: "Este formato puede no verse en todos los celulares. Súbalo en MP4." (`MENSAJE_FORMATO`).</li></ul> |

### 5.8 Supabase (`supabase/`)

| Archivo | Qué es |
|---|---|
| `supabase/migrations/0001_esquema.sql` (≈351) | Tablas, funciones de rol, disparadores, RLS, `datos_publicos()`, `borrar_datos_demo()`, buckets y reglas de almacenamiento. Ver sección 6. |
| `supabase/migrations/0002_catalogo.sql` (≈42) | Inserta los **32 modelos** del catálogo maestro, en el orden del prompt, todos inactivos (`orden` 10, 20, …, 320). Cada modelo recibe su ficha vacía por disparador. |
| `supabase/migrations/0003_demo.sql` (≈36) | Pone el nombre "Tienda de demostración" y `modo_demo = true`, activa los 4 modelos que usa la demo (con `activo_por_demo = true`) e inserta los 6 equipos demo. |
| `supabase/migrations/0011_vista_equipos.sql` (≈12) | `tienda.vista_equipos`: `cuadricula` (por defecto) o `carrusel`. |
| `supabase/migrations/0017_bloqueo_legal.sql` (≈39) | Sin `legal_publicado`: `proteger_tienda` no deja apagar el modo demo ("Publique los textos legales antes de quitar el modo demo.") y `borrar_datos_demo` no corre ("Publique los textos legales antes de borrar los datos de demostración."), con cualquier sesión. |
| `supabase/migrations/0016_legales_asistente.sql` (≈203) | Legales con asistente: los campos `legal_*`, de herramientas (`meta_pixel_id`, `ga4_*`, `gtm_*`, `clarity_*`, `tiktok_*`, `gads_*`), `capi_solo_consentimiento`, `plataforma_sitio` y `legal_publicado`; pasa los textos propios de la tienda a las cláusulas y borra las columnas de `0015`; `legal_faltantes(tienda)` y el disparador `tienda_publicar_legales` (`publicar_legales`). Ver sección 6. |
| `supabase/migrations/0015_legales.sql` (≈125) | Textos legales base (privacidad, términos y casilla del pop-up) solo donde estaban vacíos; `tienda.legales_revisados` y `tienda.legales_herramientas`. **Reemplazada por `0016`**, que descarta esos textos base (por su md5) y borra las columnas; no se edita porque ya corrió en producción. |
| `supabase/migrations/0014_resenas.sql` (≈110) | Reseñas: `tienda.mostrar_resenas` (no por defecto) y `tienda.titulo_resenas`; tabla `resenas` (hasta 12 con `resenas_limitar`, imagen o video, texto, origen, `autorizado` obligatorio, orden) con RLS (el público lee solo con el interruptor encendido; el gestor escribe); bucket `resenas` (20 MB, imágenes y videos) y las políticas de archivos con él; `datos_publicos()` suma `resenas`. **No crea ninguna reseña.** |
| `supabase/migrations/0013_formas_pago.sql` (≈65) | Formas de pago estructuradas en `tienda` (medios, cuotas, criptomonedas, pasarelas); `formas_pago` pasa a `pagos_otras` con sus valores; disparador `tienda_validar_pagos`. |
| `supabase/migrations/0012_fichas.sql` (≈110) | Ficha técnica: `tienda.mostrar_ficha` (sí por defecto) y `tienda.ficha_ocultas` (categorías apagadas, con check); clave opcional por fila y disparador `fichas_validar`; precarga de las fichas de los 42 modelos **solo con lo que trae la fuente** y solo en fichas sin filas. |
| `supabase/migrations/0010_mas_vendido.sql` (≈30) | `equipos.mas_vendido` y el disparador `equipos_mas_vendido` (`limitar_mas_vendidos`): no deja marcar un cuarto, con un candado por transacción para que dos marcas a la vez no pasen de 3. Todavía no se muestra en el sitio. |
| `supabase/migrations/0009_video.sql` (≈40) | Un video opcional por equipo: `equipos.video` (ruta con check) y bucket propio `videos` (público, 20 MB, `video/mp4` y `video/webm`); las reglas de Storage suman ese bucket (lee todo el mundo; sube, cambia y borra el gestor). |
| `supabase/migrations/0008_color_oficial.sql` (≈85) | Cada equipo usa un color oficial de su modelo: `equipos.color_id` (FK a `colores`) y `color_nombre_mostrar`; migra los equipos existentes por nombre (español o inglés; "Glacier" → Glaciar) conservando el nombre que veía el cliente; borra `color_nombre` y `color_hex`; disparador `equipos_color` (`validar_color_equipo`). |
| `supabase/migrations/0007_roles.sql` (≈200) | Roles **administrador** y **gestor** en lugar de agencia y tienda: convierte los perfiles, crea `es_administrador()` y `es_gestor()`, rehace todas las políticas (tablas y Storage), `proteger_catalogo`, `proteger_tienda`, `proteger_perfil` (siempre un administrador activo) y `borrar_datos_demo`, y borra `es_agencia()` y `es_staff()`. |
| `supabase/migrations/0006_catalogo_colores.sql` (≈415) | Catálogo desde el iPhone 7: agrega los 10 modelos que faltaban (por slug), renumera el `orden` de los 42 por fecha de lanzamiento (los de la agencia quedan al final) y crea `colores` con los 183 colores oficiales, el disparador `colores_proteger`, su RLS y `datos_publicos()` con colores. Ver sección 6. |
| `supabase/migrations/0005_tamano_texto.sql` (≈13) | Agrega `tienda.tamano_texto`: `compacto`, `normal` (por defecto) o `grande`. |
| `supabase/migrations/0004_en_stock.sql` (≈40) | El stock pasa de número a sí/no: agrega `equipos.en_stock` (verdadero por defecto), convierte `stock > 0` en verdadero y 0 en falso, rehace `equipos_leer` y `datos_publicos()` con `en_stock`, y quita `stock` y `usado_es_una_unidad`. |
| `supabase/functions/_compartido/lead.ts` (≈67) | `armarLead(datos)`: valida y arma el pedido que va a GHL. Desde `0016` exige `consentimiento_datos: true`, `version_politica` entero ≥ 1 y `fecha_consentimiento` ISO con zona horaria; los otros tres consentimientos van como `true` solo si llegan `true`. Exporta también `CAMPOS_ATRIBUCION`, `CAMPOS_OCULTOS` y `CAMPOS_CONSENTIMIENTO`. No depende de Deno. |
| `supabase/functions/enviar-lead/index.ts` (≈73) | Función pública, sin JWT: valida y reenvía al Inbound Webhook de GHL. Ver sección 11.1. |
| `supabase/functions/usuarios/index.ts` (≈75) | Función solo para administradores activos: invitar (con rol), desactivar y reactivar con la clave de servicio. Ver sección 11.2. |
| `supabase/correos/invitacion.html` | Plantilla en español del correo de invitación. Usa `{{ .ConfirmationURL }}`. |
| `supabase/correos/recuperacion.html` | Plantilla en español del correo de recuperación. Usa `{{ .ConfirmationURL }}` y `{{ .Email }}`. |
| `supabase/correos/LEAME.md` | Dónde pegar cada plantilla y con qué asunto. |

### 5.9 Pruebas y herramientas (`tests/` y `.claude/`)

| Archivo | Qué es |
|---|---|
| `tests/verificar.cjs` (≈2386) | Suite de aceptación en **modo demo** con Playwright: **63 casos** (64 con `ICT_CAPTURAS`, que suma el caso de capturas de diseño). Publica los textos legales de prueba al abrir el sitio o el panel (`nueva(..., {legales})`) y empieza con las cookies rechazadas (`{cookies}`; `null` = sin elegir). `ICT_LINEAS` muestra más líneas de cada falla. | Ver sección 14. |
| `tests/verificar-supabase.cjs` (≈534) | Suite de punta a punta del **modo Supabase** contra el Supabase local: **12 casos**. Reemplaza `config.js` en el navegador, puede servir un supabase-js local (`ICT_SUPABASE_JS`) y empieza con las cookies rechazadas. |
| `tests/legal/motor.test.mjs` | Pruebas del motor legal sin navegador (`node tests/legal/motor.test.mjs`): faltantes por perfil y tipo de persona, validaciones, países, datos y plazos en los textos, sin corchetes ni marcadores vacíos, relación con Apple por perfil, herramientas activas e inactivas, versión y vigencia. |
| `tests/legal/datos-prueba.mjs` | `TIENDA_LEGAL_PRUEBA`: una tienda inventada con todos los datos legales completos, para las pruebas. No es de ninguna tienda real. |
| `tests/documentacion.mjs` | Verificador de este documento: falla si algún archivo versionado no aparece en la sección 5. |
| `tests/sql/probar.sh` | Crea un Postgres temporal, carga la imitación de Supabase y todas las migraciones en orden, compara la semilla con `semilla.js` (y los valores legales iniciales con `LEGAL_INICIAL`), compara `legal_faltantes()` con `faltantes()` del motor (`comparar-faltantes.mjs`) y corre `pruebas.sql`. Antes de cada migración corre `tests/sql/antes_<migración>.sql` si existe. |
| `tests/sql/antes_0007_roles.sql` | Los usuarios de prueba con los roles viejos (agencia y tienda), para probar que `0007` los convierte. `pruebas.sql` los sigue usando. |
| `tests/sql/antes_0006_catalogo_colores.sql` | Un modelo de la agencia (orden 330) antes de `0006`, para probar que queda al final. |
| `tests/sql/antes_0015_legales.sql` | Unos términos que la tienda ya había escrito, para probar que `0015` no los pisa. |
| `tests/sql/antes_0013_formas_pago.sql` | Una lista vieja de formas de pago, para probar que `0013` la pasa a `pagos_otras`. |
| `tests/sql/antes_0012_fichas.sql` | Una ficha que la tienda ya había cargado (iPhone 13), para probar que la precarga de `0012` no la pisa. |
| `tests/sql/antes_0004_en_stock.sql` | Datos con el esquema viejo (stock 4 y stock 0) para probar que `0004` los convierte bien. `pruebas.sql` los revisa y los borra. |
| `tests/sql/supabase_simulado.sql` | Roles `anon`, `authenticated` y `service_role`, esquema `auth` con `auth.uid()`, y `storage.buckets` y `storage.objects` mínimos. |
| `tests/sql/pruebas.sql` | Asserts de catálogo y semilla, y de RLS por rol (anon, sin perfil, inactivo, gestor, administrador). También validaciones, fecha de precios, colores, modo demo, perfiles (nadie se quita a sí mismo; siempre un administrador activo, también sin sesión) y borrar demo. **Legales:** migración de `0016` (columnas viejas fuera, textos propios en las cláusulas, valores iniciales), checks, publicar incompleto o con marcas rechazado, versión y fecha que pone el disparador, sin despublicar, el administrador no edita, y el bloqueo de `0017`. |
| `tests/sql/comparar-semilla.mjs` | Compara el JSON de la semilla del SQL con `semilla.js`: catálogo, colores, equipos demo, las fichas precargadas (filas, orden y textos) y los valores legales iniciales con `LEGAL_INICIAL` (`comun.js`). |
| `tests/sql/comparar-faltantes.mjs` | Arma 27 variantes de la tienda de prueba (completa, vacía, cada regla rota) y compara `legal_faltantes()` del SQL con `faltantes()` de `motor.js`. |
| `tests/sql/antes_0016_legales_asistente.sql` | Un aviso de marca de la tienda, para probar que `0016` lo pasa a la cláusula de los términos después de sus términos (`antes_0015`). |
| `tests/funciones/probar.sh` | Revisa los tipos de las dos funciones y prueba `enviar-lead` contra webhooks simulados: 14 casos (con los de consentimiento). |
| `tests/funciones/servir.ts` | Corre una función de Supabase en un puerto fijo (`Deno.serve` no lee `PORT`). |
| `tests/funciones/webhook-simulado.mjs` | Webhook de GHL falso: guarda el último cuerpo recibido y responde con el código de `ESTADO`. |
| `tests/supabase-local/levantar.sh` | Levanta el "Supabase local" completo (ver sección 14.3) y deja `/tmp/cotizadora-supabase-local/entorno`. Con el argumento `detener`, lo apaga. |
| `tests/supabase-local/pasarela.mjs` | Pasarela en el puerto 54321 que imita las rutas de Supabase. Tiene Storage en memoria (lee la parte del archivo de los envíos multipart de supabase-js y exige el límite y los tipos de cada bucket: 413 y 415), sirve las plantillas de correo y agrega `Authorization` desde la `apikey`. |
| `tests/videos/corto.mp4`, `tests/videos/largo.mp4`, `tests/videos/corto.webm`, `tests/videos/hevc.mp4`, `tests/videos/clip.mov` | Videos de prueba hechos con ffmpeg (patrón de prueba, sin personas ni marcas): H.264 de 3 s y de 16 s, WebM VP8 de 3 s, HEVC de 3 s y .mov de 3 s. Pesan entre 15 y 75 KB. |
| `tests/videos/20s.mp4`, `tests/videos/31s.mp4` | Videos H.264 de 20 s y 31 s (gris liso, 64 × 64, hechos con ffmpeg) para el límite de 30 s de las reseñas. Pesan unos 4 y 6 KB. |
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
  - `mostrar_resenas` (no por defecto) y `titulo_resenas` ("Lo que dicen nuestros clientes" por defecto, hasta 80), desde `0014`.
  - `mostrar_ficha` (sí por defecto) y `ficha_ocultas` (`text[]`, claves de categorías apagadas; solo las de `CATEGORIAS_FICHA`), desde `0012`.
- **Venta:**
  - `texto_entrega`.
  - Formas de pago (desde `0013`; `validar_pagos` y checks):
    - `pagos_medios`: `text[]` de `transferencia`, `efectivo`, `debito`, `credito`.
    - `pagos_cuotas` (sí/no), `pagos_cuotas_max` (2 a 48), `pagos_sin_interes` (sí/no) y `pagos_sin_interes_max` (2 a 48, no más que el máximo). Sin cuotas, los otros tres quedan vacíos (`null` / no).
    - `pagos_cripto` (sí/no) y `pagos_cripto_cuales` (texto, vacío si no acepta).
    - `pagos_pasarelas`: `text[]` de `mercado_pago`, `pse`, `nequi`, `daviplata`, `wompi`, `bold`, `otra`; `pagos_pasarela_otra` (obligatorio con `otra`, vacío sin ella).
    - `pagos_otras`: `text[]`, la lista libre (antes `formas_pago`; `0013` la renombró y conservó los valores).
  - `texto_garantia_nuevos`, `texto_garantia_usados`.
  - `etiqueta_precio`: por defecto "Precio".
- **Legales (desde `0016`; los de `0015` ya no existen):**
  - Asistente: `legal_paso` (1–6), `legal_perfil` (`oficial`, `autorizado`, `electronica`, `no_oficial`, `emprendedor`, `particular`), `legal_tipo_persona` (`natural` / `juridica`), `legal_nombre`, `legal_doc_tipo` (`cc`, `nit`, `ce`) y `legal_doc_numero`, `legal_direccion`, `legal_ciudad`, `legal_correo`, `legal_telefono`, `legal_representante`, `legal_matricula_numero`, `legal_matricula_camara`, `legal_direccion_local`, `legal_rnbd` (`si` / `no` / vacío), `legal_paises` (`text[]` de los 19 códigos), `legal_impuestos` (`jsonb`: `[{nombre, porcentaje, incluido}]`, por defecto IVA vacío), `legal_garantia_nuevos` y `legal_garantia_usados_meses` (1–120), `legal_garantia_usados` (`con` / `sin`), `legal_retracto_canal` (`correo` / `whatsapp`), `legal_entrega` (`retiro`, `transportadora`, `personal`), `legal_entrega_zonas`, `legal_apple_detalle`, `legal_homologados` (`si` / `no`) y las cuatro `legal_clausula_*` (hasta 4000 caracteres).
  - Herramientas: `meta_pixel_id`; `ga4_activo`/`ga4_id`, `gtm_activo`/`gtm_id`, `clarity_activo`/`clarity_id`, `tiktok_activo`/`tiktok_id`, `gads_activo`/`gads_id`; `capi_solo_consentimiento` (sí por defecto); `plataforma_sitio` ("HighLevel (GoHighLevel)" por defecto).
  - `legal_publicado` (`jsonb`): `{version, vigente_desde, huella, documentos: {privacidad, terminos, cookies, aviso}}`. Vacío = sin publicar.
  - Se guardan incompletos (los checks solo limitan largos y opciones); los formatos y lo obligatorio los revisa `legal_faltantes(tienda)` → `text[]` con las claves que faltan, el mismo criterio de `faltantes()` en `motor.js`.
  - Disparador `tienda_publicar_legales` (`publicar_legales`): solo publica con `legal_faltantes` vacío y los cuatro documentos no vacíos y sin `[PENDIENTE` ni `{{`; no deja volver a `null`; **la versión y la fecha las pone él**: si los documentos son iguales a los publicados, deja lo publicado; si no, versión + 1 y la fecha de hoy en Colombia.
  - `0016` pasó lo que la tienda había escrito a la cláusula propia de su documento (`texto_privacidad` → privacidad, `texto_terminos` y `aviso_marca` → términos, `texto_autorizacion_datos` → aviso) y descartó los textos base de `0015` sin cambios (por su md5).
  - `0017`: sin `legal_publicado`, el modo demo no se apaga y `borrar_datos_demo` no corre.
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

**`resenas`** (desde `0014`): hasta 12.

- `id` (uuid), `tipo` (`imagen` o `video`), `ruta` (`resenas/<uuid>.webp|jpg|png` para imágenes, `resenas/<uuid>.mp4|webm` para videos; lo exige un check).
- `texto` (hasta 300), `origen` (`''`, `instagram`, `whatsapp`, `google` u `otro`) y `origen_otro` (hasta 40, solo con `otro`).
- `autorizado`: siempre verdadero (check): es la casilla obligatoria del panel.
- `orden`, `creado_en`.

**`fichas`**: una por modelo.

- `modelo_id`: PK y FK, con `on delete cascade`.
- `descripcion`.
- `especificaciones`: JSONB, siempre un **array** de `{clave?, etiqueta, valor}`. `clave` (desde `0012`) es una de las categorías fijas: `lanzamiento`, `procesador`, `pantalla`, `camaras_traseras`, `camara_frontal`, `bateria`, `versiones`, `materiales`, `puertos`, `dimensiones`; sin clave, la fila es de la tienda. `fichas_validar` exige texto en etiqueta (≤60) y valor (≤600), claves conocidas y sin repetir.
- Desde `0012` vienen **precargadas** de la fuente (ver sección 17 para lo que falta).
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
| `resenas_limitar` | Antes de agregar una reseña, si ya hay 12: "Ya tiene 12 reseñas. Borre una para agregar otra." (`23514`). Usa `pg_advisory_xact_lock`. |
| `tienda_validar_pagos` | Formas de pago (`0013`), con estos mensajes (`23514`): "Indique hasta cuántas cuotas acepta: de 2 a 48.", "Indique hasta cuántas cuotas sin interés ofrece: de 2 a 48.", "Las cuotas sin interés no pueden ser más que el máximo de cuotas.", "Sin cuotas sin interés, deje vacío hasta cuántas.", "Sin pagos a cuotas, los datos de cuotas quedan vacíos.", "Sin criptomonedas, deje vacío cuáles.", "Escriba el nombre de la otra pasarela." y "Sin «Otra» pasarela, deje vacío el nombre." |
| `fichas_validar` | Formato de las filas de la ficha (`0012`); error `23514` "Alguna fila de la ficha técnica no tiene el formato correcto." |
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
| `resenas` (desde `0014`) | lee **solo con `mostrar_resenas` encendido** | lee todas, agrega, edita y borra | como el público |
| `storage.objects` (`fotos`, `marca`, `videos` y `resenas`) | lee | sube, cambia y borra | lee |

Un usuario autenticado **sin perfil o con el perfil inactivo** ve lo mismo que el público y no escribe nada.

### 6.5 Funciones SQL de la API

- **`datos_publicos()`** (`security invoker`, respeta la RLS): devuelve en **una sola llamada** `{tienda, modelos activos, fichas y colores de modelos activos, equipos publicados con stock, resenas}` (`resenas` desde `0014`: solo con el interruptor encendido, en orden y sin `autorizado`). El sitio público la usa por `POST /rest/v1/rpc/datos_publicos`.
- **`borrar_datos_demo()`** (solo gestor):
  1. Borra los equipos con `es_demo`.
  2. Apaga los modelos con `activo_por_demo`.
  3. Pone `modo_demo = false`.

### 6.6 Almacenamiento

- **Buckets públicos:**
  - `fotos`: webp, jpeg o png, hasta 10 MB.
  - `marca`: además svg e ico.
  - `videos` (desde `0009`): `video/mp4` y `video/webm`, hasta 20 MB. Es un bucket propio para no ampliar los tipos ni el límite de `fotos`.
  - `resenas` (desde `0014`): imágenes (webp, jpeg, png) y videos (mp4, webm), hasta 20 MB.
- **Rutas de videos:** `equipos/<uuid>.mp4|webm` (lo exige el check de `equipos.video`).
- **Rutas de reseñas:** `resenas/<uuid>.webp` y `resenas/<uuid>-640.webp` (imágenes) o `resenas/<uuid>.mp4|webm`.
- **Rutas de fotos:** `equipos/<uuid>.webp` y `equipos/<uuid>-640.webp`.
- **Logo:** `logo-<timestamp>.webp|png`. **Favicon:** `favicon-<timestamp>.png`.

---

## 7. Capa de datos del front-end (demo y Supabase)

### 7.1 Interfaz común

Los dos adaptadores la implementan. El sitio y el panel solo usan esto.

| Método | Uso |
|---|---|
| `iniciar()` | Prepara el adaptador. En demo carga las fotos de IndexedDB; en Supabase crea el cliente. |
| `cargarPublico()` | Devuelve `{tienda, modelos, fichas, colores, equipos, resenas}` filtrados como para el público. |
| `urlArchivo(bucket, ruta)` | Da la URL pública de un archivo. |
| `enviarLead(payload)` | Devuelve `{ok}`. |
| `sesionActual()`, `iniciarSesion(correo, clave)`, `cerrarSesion()`, `recuperarClave(correo)`, `cambiarClave(nueva)`, `tipoDeEnlace()`, `alCambiarSesion(fn)` | Autenticación. `tipoDeEnlace()` devuelve `"invite"` o `"recovery"` si se llegó desde un correo. |
| `leerTienda()`, `guardarTienda(cambios)` | La tienda. |
| `listarModelos()`, `guardarModelo(id, cambios)`, `agregarModelo(datos)` | El catálogo. |
| `listarColores()`, `guardarColor(id, cambios)`, `agregarColor(datos)`, `borrarColor(id)` | Colores del catálogo, con las reglas de `colores_proteger`. |
| `listarFichas()`, `guardarFicha(modeloId, {descripcion, especificaciones})` | Las fichas. |
| `listarEquipos()`, `crearEquipo(datos)`, `actualizarEquipo(id, cambios)`, `borrarEquipo(id)` | El inventario. |
| `listarResenas()`, `agregarResena(datos)`, `guardarResena(id, cambios)`, `borrarResena(id)` | Reseñas (`0014`), con las reglas del SQL (máximo 12, casilla, rutas, origen). |
| `subirArchivo(bucket, ruta, blob)`, `borrarArchivos(bucket, rutas)` | Los archivos. |
| `borrarDatosDemo()` | Solo gestor. |
| `listarUsuarios()`, `invitarUsuario(correo, rol)`, `cambiarEstadoUsuario(userId, activo)`, `cambiarRolUsuario(userId, rol)` | Solo administrador (`listarUsuarios` devuelve a los demás solo su propio perfil). El rol se cambia directo en `perfiles`; invitar y el estado van por la función `usuarios`. |
| `reiniciarDemo()` | **Solo en demo:** vuelve a los datos iniciales. |

### 7.2 `demo.js` — todo en el navegador

- **Estado:** `localStorage["cotizadora-demo:v1"]`, un JSON con `tienda`, `modelos`, `fichas`, `equipos` y `perfiles`. Se comparte entre pestañas del mismo navegador.
- **Fotos:** IndexedDB, base `cotizadora-demo`, almacén `archivos`. Se exponen como `blob:` URLs.
- **Usuarios de prueba:** `gestor@demo.co` y `administrador@demo.co`, clave `demo1234` (desde la versión 5 de los datos; antes `tienda@demo.co` y `agencia@demo.co`, que `migrar()` convierte). La sesión va en `sessionStorage["cotizadora-demo:sesion"]`.
- **Versión de los datos:** el JSON lleva `version` (hoy 14; la 14 es `0016_legales_asistente.sql`: los campos del asistente con `LEGAL_INICIAL`, los textos propios a las cláusulas, los textos base de `0015` descartados por su huella FNV-1a y las columnas viejas borradas; la 13 es `0015_legales.sql`: textos base donde estaban vacíos, herramientas y revisión en no; la 12 es `0014_resenas.sql`: interruptor apagado, título por defecto y lista vacía; la 10 es `0012_fichas.sql`, interruptores de la ficha y precarga de la fuente en las fichas sin filas; la 11 es `0013_formas_pago.sql`, `formas_pago` → `pagos_otras` y los campos nuevos vacíos). Si el navegador tiene una versión vieja, `migrar()` repite la migración SQL del mismo número (por ejemplo `stock` → `en_stock`) sin perder lo cargado.
- **Repite las reglas del SQL:**
  - Legales: `errorLegales` (checks de `0016`), la publicación de `publicar_legales` (`publicarLegales`, que carga el motor solo al publicar: faltantes, documentos sin marcas, sin despublicar, versión y fecha) y el bloqueo de `0017` (modo demo y borrar la demo).
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
- **Ficha técnica** ("Ver ficha técnica", plegada): solo si la tienda la muestra (`mostrar_ficha`); solo las categorías encendidas que tienen dato, en el orden fijo (año de lanzamiento, procesador, pantalla, cámaras traseras, cámara frontal, batería, versiones del modelo, materiales, puertos y carga, dimensiones y peso) y al final las filas de la tienda. En celular, el nombre de la categoría arriba y el dato abajo; desde 480 px, dos columnas. Los datos de varias líneas conservan sus saltos.
- **Barra de compra fija en celular,** con el precio y "Comprar por WhatsApp":
  - Dentro de la hoja.
  - Sobre la página mientras el detalle en línea está en pantalla (IntersectionObserver).
- Abrir un detalle dispara `ViewContent` en el píxel.

**Video del equipo (B3):** si el equipo tiene video, aparece como una miniatura más, al final, con el ícono de reproducir (si el equipo no tiene fotos, también aparece la miniatura de la ilustración). El `<video>` recién se crea al tocarla, con `controls`, `playsinline` y `preload="none"`, y se reproduce porque el cliente lo tocó; no hay reproducción automática al cargar. Volver a una foto o cambiar de color lo quita.

### 8.5 Reseñas, información de la tienda y pie

- **Reseñas** (`0014`, `resenas.js`): entre los equipos y la información de la tienda, solo si la tienda las muestra y hay alguna; si no, la sección no existe y su módulo ni se carga. Ver el mapa de archivos para el visor. No hay reseñas de ejemplo, tampoco en el modo demo.

- **Información:**
  - Dirección y ciudad, y horario.
  - "Cómo llegar": `https://www.google.com/maps/search/?api=1&query=<dirección, ciudad>`.
  - Redes: solo enlaces http(s).
  - Se oculta si no hay datos.
- **Pie:**
  - "Nombre · ciudad".
  - "Precios actualizados al D/M/AAAA".
  - Enlaces "Política de privacidad", "Términos y condiciones" y "Política de cookies", y el botón "Preferencias de cookies".
  - (El aviso de marca ya no va en el pie: desde `0016` la relación con Apple está en los términos.)

---

## 9. Pop-up, WhatsApp, atribución, píxel y legales

> Los textos legales, el asistente, el banner de cookies y el bloqueo hasta publicar están en las secciones 9.6 a 9.9.

### 9.1 El pop-up (`popup.js`)

- **Contenido:**
  - Título "Antes de pasar a WhatsApp" y texto "Así sabemos que usted es una persona y no un bot."
  - Un **resumen** del equipo (miniatura, modelo, condición, capacidad, color y precio) o de la búsqueda, si es una consulta sin stock.
- **Campos**, todos con etiqueta visible y obligatorios:
  - "Su nombre": `name="name"`.
  - "Su correo": `name="email"`.
  - "Su WhatsApp": con el prefijo **+57 fijo**. Se formatea mientras se escribe ("300 123 4567") y el cursor se conserva en el dígito.
  - Arriba de las casillas, el **aviso de privacidad corto** publicado (`documentos.aviso`), con el enlace a la política (se abre en otra pestaña).
  - Casilla **obligatoria**, sin marcar: "Soy mayor de 18 años y autorizo el tratamiento de mis datos para recibir mi cotización y ser contactado sobre ella por WhatsApp y correo, según la Política de privacidad." (`name="autorizacion_datos"`, con enlace).
  - Casilla **opcional**, sin marcar: "Quiero recibir promociones y novedades de [nombre de la tienda] por WhatsApp y correo." (`name="promociones"`). No bloquea el envío.
  - El formulario y el resumen llevan `data-clarity-mask="true"` (Clarity no los graba).
  - Sin textos legales publicados, el pop-up solo dice "Esta tienda todavía no completó su información legal." y no envía nada.
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
   1. Dispara el evento `Lead` del píxel con `eventID` = el código, **solo si la persona aceptó las cookies de publicidad**.
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
  "event_id": "COT-AB2C", "pagina", "enviado_en",
  "consentimiento_datos": true, "consentimiento_promociones": false,
  "consentimiento_medicion": false, "consentimiento_publicidad": false,
  "version_politica": 1, "fecha_consentimiento": "2026-10-21T14:03:05-05:00" }
```

`consentimiento_medicion` y `consentimiento_publicidad` son lo elegido en el banner (sin elegir = `false`); `version_politica`, la versión publicada que vio la persona.

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

- El ID sale de la tienda (`meta_pixel_id`, Legales → Herramientas), no de `config.js`.
- Solo se carga si la persona **aceptó las cookies de publicidad** (lo decide `consentimiento.js`).
- **Eventos:**
  - `PageView` al cargar.
  - `ViewContent` al abrir un detalle, con `content_name` = modelo, capacidad y color; `content_ids` = [equipo_id]; `value` = precio; `currency` = "COP".
  - `Lead` al confirmarse el envío, con los mismos parámetros y `eventID`. Si es una consulta sin stock, solo lleva `content_name`.
- Si la persona retira el permiso, `fbq("consent", "revoke")` y no sale nada más.
- **Nunca** `Purchase`, nunca datos personales. La suite lo verifica.

### 9.6 Legales: motor, plantillas y módulos por país

Los textos legales **no se escriben a mano**: la tienda llena el asistente y el motor los genera.

- **Motor** (`assets/js/legal/motor.js`): `faltantes(tienda)` dice qué falta (con el paso); `generar(tienda)` arma los cuatro documentos en el Markdown de `formatoBasico`; `publicar(tienda, anterior, hoy)` devuelve la versión que se publica (la misma si los textos no cambiaron). Nunca deja marcadores ni datos vacíos: si falta algo, no genera.
- **Plantillas** (`assets/js/legal/plantillas/`): `privacidad.js` (12 secciones: responsable; datos; finalidades; encargados y transmisión —"nuestro proveedor tecnológico, ubicado en Argentina", la plataforma del sitio, Meta y las herramientas activas—; API de Conversiones; conservación —máximo 2 meses desde el último contacto para quien no compra; para quien compra, lo que exijan las normas contables, tributarias y de protección al consumidor—; derechos; cómo ejercerlos con plazos y la SIC; mayoría de edad; seguridad; cambios y vigencia; sección del país), `terminos.js` (quién vende y relación con Apple según el perfil, cotizador, precios e impuestos, garantía, retracto, entrega, homologados si aplica, mayoría de edad, marcas, proveedor tecnológico, ley aplicable, datos personales, cambios), `cookies.js` (qué son, necesarias, medición y publicidad con una tabla por herramienta activa, GPC, cómo cambiar) y `aviso.js` (2–3 líneas con el enlace).
- **Cláusula propia:** cada documento puede llevar una al final, en "Condiciones adicionales de la tienda".
- **Módulos por país** (`assets/js/legal/paises/`): `indice.js` lista los 18 países de Hispanoamérica y Brasil; solo Colombia está disponible (`co.js`: SIC, tipos de documento, plazos de la Ley 1581, derechos, transmisión, retracto, garantía, horarios de la Ley 2300). Brasil queda en "Necesita el sitio en portugués.".
- **Cómo sumar un país:** 1) copiar `co.js` con los datos del otro país (con sus fuentes en `legal/FUENTES.md`); 2) importarlo en `indice.js` y ponerle `estado: "disponible"` y `modulo`; 3) migración nueva que cambie `legal_faltantes()` (países permitidos y sus tipos de documento) y, si hace falta, el check de `legal_doc_tipo`; 4) `errorLegales` y `faltantes()` iguales; 5) pruebas (motor y `comparar-faltantes.mjs`).
- **Herramientas** (`assets/js/legal/herramientas.js`): Meta siempre; GA4, GTM, Clarity, TikTok y Google Ads opcionales. Cada una con categoría (medición o publicidad), formato del ID, cookies y política. Solo se escriben duraciones verificadas en la documentación del proveedor.
- **Versión y vigencia:** cada documento termina en "Vigente desde D/M/AAAA · versión N.". La versión sube solo cuando cambia algún texto.
- **Fuentes:** todo lo que los textos afirman como requisito legal está en `legal/FUENTES.md`, con su estado de verificación.

### 9.7 El asistente de Legales (panel)

Seis pasos que se guardan solos, con progreso y la lista de pasos con ✓:

1. **Perfil:** tienda oficial de Apple, revendedor autorizado, tienda de electrónica en general, revendedor no oficial, emprendedor sin local físico o revendedor particular.
2. **Identificación:** persona natural o jurídica; nombre completo o razón social; tipo y número de documento (C.C., NIT con dígito de verificación o C.E.); dirección para notificaciones y ciudad; correo para temas de datos personales; teléfono. Jurídica: representante legal, número de matrícula mercantil y cámara de comercio. Dirección del local salvo emprendedor y particular. Registro Nacional de Bases de Datos opcional, con la explicación.
3. **Países:** solo los disponibles se pueden marcar; los demás dicen "Próximamente" y Brasil "Necesita el sitio en portugués.".
4. **Condiciones de venta:** impuestos (lista editable; por defecto IVA con el porcentaje vacío y "¿Incluido en el precio?"); garantía de nuevos en meses ("Si no indica un término mayor, la ley colombiana fija un año para productos nuevos."; con Colombia, 12 o más); usados con garantía (meses) o sin garantía (aviso: "Solo puede vender sin garantía un usado cuya garantía legal ya venció, y el cliente debe aceptarlo por escrito al comprar."); canal del retracto (correo o WhatsApp de Mi tienda); entrega (retiro, transportadora, personal) y zonas; relación con Apple (perfiles no oficiales: el texto fijo "[Tienda] es un comercio independiente. No está afiliado, patrocinado ni autorizado por Apple Inc. iPhone es una marca de Apple Inc."; oficial o autorizado: detalle obligatorio y la declaración bajo su responsabilidad); homologados sí o no.
5. **Herramientas:** píxel de Meta y API de Conversiones siempre (ID obligatorio para publicar); GA4, GTM, Clarity, TikTok y Google Ads con interruptor e ID validado (Clarity con la ayuda para elegir el enmascarado "Strict"); "¿Enviar a la API de Conversiones solo si la persona aceptó las cookies de publicidad?" (sí por defecto) con "Configure su workflow de GoHighLevel para revisar el campo consentimiento_publicidad antes de enviar el evento."; plataforma del sitio.
6. **Vista previa y publicación:** "Lo que falta" con "Resolver"; pestañas de los cuatro documentos; "Agregar una cláusula propia"; "Publicar textos legales", habilitado solo con todo completo.

Después de publicar, cada cambio (en Legales, Mi tienda o Formas de pago) vuelve a generar y publicar los textos; la versión sube solo si cambió algún texto. Si un cambio deja datos incompletos, queda la versión publicada e Inicio lo avisa.

### 9.8 Banner de cookies

- Primera visita (o elección de más de 6 meses): aparece abajo, sin tapar el título ni los filtros. Tres botones del mismo tamaño: "Aceptar todas", "Rechazar todas" y "Configurar".
- **Nada de medición ni publicidad se carga antes de aceptar** (ni se precarga). Rechazar = no se carga nada.
- Configurar: Necesarias (siempre activas), Medición y Publicidad con sus herramientas, y "Guardar mi elección".
- Google con Consent Mode v2 básico; GPC = publicidad rechazada.
- Se cambia desde "Preferencias de cookies" en el pie de todas las páginas. Retirar un permiso detiene desde ese momento lo de esa categoría y borra sus cookies.
- Es fijo y aparece después del primer pintado: no mueve nada (CLS).

### 9.9 Bloqueo hasta publicar

Mientras `legal_publicado` esté vacío:

- El pop-up dice "Esta tienda todavía no completó su información legal." y no envía.
- `/privacidad/`, `/terminos/` y `/cookies/` dicen "Página en preparación.".
- El modo demo no se puede apagar ni se pueden borrar los datos de demostración (SQL `0017`, demo y panel).
- Inicio pone "Faltan los textos legales…" primero en "Lo que falta", con el enlace al paso pendiente.

Al publicar, todo se habilita. En el sitio, el panel y los textos no hay avisos de "borrador" ni de "revisión de un abogado".

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
| `#/inicio` | Inicio, con estas partes:<ul><li>**Estadísticas:** publicados visibles y en borrador. Cada una es un enlace al inventario filtrado.</li><li>**Fecha** de la última actualización de precios.</li><li>**"Lo que falta":** falta el nombre de la tienda, la ciudad, el correo de contacto, el logo o el WhatsApp (llevan a Mi tienda), faltan las formas de pago (lleva a Catálogo → Formas de pago; cuenta cualquier cosa marcada o escrita), faltan los textos legales, hay equipos sin foto, equipos ocultos por modelo inactivo. Si no falta nada: "Todo está completo.".</li><li>**Botón** "Ver mi sitio".</li><li>**Gestor:** interruptor del modo demo, "Borrar datos de demostración" y, en demo, "Volver a los datos iniciales".</li></ul> |
| `#/inventario` | Lista, filtros y edición rápida. Acepta `?publicado=si|no`, `?stock=0` y `?fotos=sin`. |
| `#/inventario/nuevo` | Formulario **por pasos**: modelo → condición → capacidad → color → precio y stock (interruptor) → fotos → datos del usado (solo si es usado) → publicar (con resumen). |
| `#/inventario/nuevo?desde=<id>` | **Duplicar**: copia todo menos las fotos. |
| `#/inventario/<id>` | Editar el equipo (formulario completo). |
| `#/tienda` | Mi tienda (al final, la sección **Reseñas**, que se guarda sola). |
| `#/catalogo` | Catálogo, pestaña **Modelos y colores**. |
| `#/catalogo/ficha` y `#/catalogo/ficha/<modeloId>` | Catálogo, pestaña **Ficha técnica** (lista y editor de un modelo). |
| `#/catalogo/pagos` | Catálogo, pestaña **Formas de pago**. |
| `#/fichas` y `#/fichas/<modeloId>` | Enlaces viejos: llevan a `#/catalogo/ficha…`. "Fichas técnicas" ya no está en el menú. |
| `#/legales` y `#/legales/<1 a 6>` | Asistente de Legales (sigue en el último paso; `?campo=<campo>` enfoca ese campo). |
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
3. Valida con `armarLead`: nombre de 2 caracteres o más, correo, teléfono `^\+573\d{9}$`, `tipo_consulta` igual a `compra` o `sin stock`, código con el formato `COT-XXXX`, `consentimiento_datos` en `true`, `version_politica` entero de 1 o más y `fecha_consentimiento` ISO con zona horaria. Si algo falla, responde 400 con el campo.
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
  "event_id", "pagina", "enviado_en",
  "consentimiento_datos", "consentimiento_promociones", "consentimiento_medicion", "consentimiento_publicidad",
  "version_politica", "fecha_consentimiento" }
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
   - **Campos de consentimiento (nuevos con `0016`):** `consentimiento_datos`, `consentimiento_promociones`, `consentimiento_medicion` y `consentimiento_publicidad` (sí/no), `version_politica` (número) y `fecha_consentimiento` (fecha y hora con zona).

**Límite:** no se garantiza que GHL llene su reporte nativo de atribución por este camino, aunque todos los datos del anuncio quedan en campos del contacto.

### 12.2 Camino opcional (sin probar)

- **Qué es:** el script de seguimiento externo de GHL (*External Tracking*). Se activa con `config.ghlSeguimiento.src` y `config.ghlSeguimiento.id`.
- **Lo que dice la ayuda de GHL** (resumen de búsqueda; el dominio estaba bloqueado): registra formularios HTML reales en sitios externos, pero no los que están dentro de iframes ni ventanas emergentes sin un `<form>` real.
- **Por eso el pop-up está preparado:** es un `<form>` real, con campos con nombre.
- **Falta probar en la subcuenta:**
  - Si captura el `<dialog>`.
  - Si toma los campos ocultos.
  - Si duplica contactos junto con el webhook.
- **Consentimiento:** el sitio lo carga solo si la persona acepta las cookies de **medición**. No figura en la Política de cookies porque sus cookies no se verificaron (pendiente, sección 17).

### 12.3 Guía corta: consentimiento en los workflows

1. **Crear los campos** de la lista de arriba en la subcuenta (Settings → Custom Fields) y mapearlos en Create/Update Contact.
2. **API de Conversiones:** antes de enviar el evento a Meta, una condición *If/Else* que revise `consentimiento_publicidad`. Si la tienda eligió "Sí" en el paso 5 (por defecto), solo se envía con `true`; así lo dice la política de datos.
3. **Promociones y novedades:** solo a contactos con `consentimiento_promociones` en `true`. Los mensajes de la cotización (`consentimiento_datos`) no autorizan promociones.
4. **Horarios** de los workflows de promociones (Ley 2300 de 2023, según el pedido de Jared; las franjas no se pudieron verificar, ver `legal/FUENTES.md`): de lunes a viernes de 7:00 a 19:00 y los sábados de 8:00 a 15:00; nunca domingos ni festivos.
5. **Conservación:** un workflow que borre o anonimice, a los **2 meses** del último contacto, a quien no compró. A quien compró se lo conserva lo que exijan las normas contables, tributarias y de protección al consumidor.
6. Si la tienda cambia sus textos legales, `version_politica` sube: sirve para saber qué versión aceptó cada contacto.

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
  - **Más vendido** (ronda 2, punto B): etiqueta "Más vendido" con el primario de fondo y `--sobre-primario` (AA con cualquier color), halo suave del primario y un anillo de 2 px con una luz que recorre el contorno: un cono que gira (solo `transform`) dentro de un anillo recortado con máscara. Corre solo en las tarjetas que se ven y en 3 como máximo. En el carrusel, la del centro igual y las vecinas atenuadas por la capa de siempre. Sin soporte de máscara o con reduced-motion: anillo quieto. En el detalle, solo la etiqueta.
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

  **Ronda 2 (A a F)**, mismas condiciones; antes = commit `735b4e7`, después = `9a69a67`:

  | Escenario | Antes | Después |
  |---|---|---|
  | Con franja demo | 91 / 100 / 100 · LCP 1,4–1,5 s · CLS 0,19 | 91 / 100 / 100 · LCP 1,3–1,4 s · CLS 0,19 |
  | Sin franja, cuadrícula | 99–100 / 100 / 100 · LCP 1,2–1,6 s · CLS 0,049 | 100 / 100 / 100 · LCP 1,1–1,4 s · CLS 0,045 |
  | Sin franja, carrusel | 100 / 100 / 100 · LCP 1,2–1,5 s · CLS 0,049 | 99–100 / 100 / 100 · LCP 1,4 s · CLS 0,045 |

  **Legales (banner de cookies)**, mismas condiciones, tienda con legales publicados, sin franja y **sin elección de cookies** (primera visita). En el celular de Lighthouse (412 × 823) los filtros llegan casi al borde, así que el banner espera a que la persona baje; por eso se midió además con un **flujo** de Lighthouse (`startFlow`): navegación en frío, desplazamiento hasta que aparece el banner (timespan) e instantánea con el banner visible:

  | Paso | Corrida 1 | Corrida 2 | Corrida 3 |
  |---|---|---|---|
  | Navegación (`lighthouse` normal) | 100 / 100 / 100 · LCP 1,4 s · CLS 0,045 | 100 / 100 / 100 · LCP 1,4 s · CLS 0,045 | 100 / 100 / 100 · LCP 1,4 s · CLS 0,045 |
  | Navegación (dentro del flujo) | 99 / 100 / 100 · LCP 1,6 s · CLS 0,045 | 100 / 100 / 100 · LCP 1,5 s · CLS 0,045 | 99 / 100 / 100 · LCP 1,4 s · CLS 0,045 |
  | Desplazamiento hasta el banner | CLS 0 | sin métrica de CLS (Lighthouse no la dio) | CLS 0 |
  | Con el banner visible (instantánea) | — / 100 / 100 | — / 100 / 100 | — / 100 / 100 |

  La instantánea no mide rendimiento (Lighthouse muestra 0 en ese modo). La primera medición encontró un error real: el banner se mostraba antes de que se dibujaran las capacidades y tapaba los filtros; se corrigió midiendo el banner de verdad después de la fuente (`mostrarSinTapar`).

  (rendimiento / accesibilidad / buenas prácticas). El CLS de 0,19 lo causa solo la franja de modo demo, que aparece cuando llegan los datos. Para medir sin franja, el Chromium de la medición se abre con el modo demo apagado en `localStorage` y Lighthouse corre con `--disable-storage-reset`.
- **Peso del sitio público:** unos 170 KB sin comprimir y unos 56 KB con gzip (suma de cada archivo comprimido por separado, sin `demo.js` ni `semilla.js`, sin fuentes ni fotos). La fase C sumó unos 4 KB con gzip (el límite era 30 KB). La ronda 2 lo llevó a unos 198 KB sin comprimir y 65 KB con gzip (+8 KB); de eso, `resenas.js` (2 KB con gzip) solo se descarga si la tienda muestra reseñas. El módulo legal suma en el sitio unos 10 KB con gzip (`consentimiento.js` 4,8 KB, `herramientas.js` 1,4 KB, `vigencia.js` 0,4 KB y lo agregado a `popup.js`, `comun.js`, `utils.js`, `principal.js`, `pixel.js` y `sitio.css`); el motor y las plantillas solo los carga el panel.

---

## 14. Pruebas

### 14.1 Cómo correrlas

```bash
bash tests/sql/probar.sh                                   # SQL y RLS en un Postgres local (sin Docker)
python3 -m http.server 8080 &
node tests/legal/motor.test.mjs                            # motor legal (10 casos, sin navegador)
NODE_PATH="$(npm root -g)" node tests/verificar.cjs        # 63 casos en modo demo (Playwright + Chromium)
ICT_CAPTURAS=1 NODE_PATH="$(npm root -g)" node tests/verificar.cjs   # + capturas en tests/capturas/
DENO=/ruta/deno bash tests/funciones/probar.sh             # función enviar-lead (14 casos) + tipos
node tests/documentacion.mjs                               # este documento cubre todos los archivos
```

**Variables:**

- `ICT_SOLO="regex"`: corre solo los casos cuyo nombre coincide.
- `ICT_BASE=URL`: por ejemplo `http://localhost:8081/Cotizadora-ICT`, para simular GitHub Pages.
- `HTTPS_PROXY`: Chromium la usa para cargar Google Fonts.
- `ICT_CAPTURAS=1`: además guarda capturas en `tests/capturas/` y corre el caso **capturas de diseño**: 360 y 1440 px × claro y oscuro × cuadrícula y carrusel × color por defecto y primario amarillo, más el detalle y el pop-up, en `tests/capturas/diseno/<etapa>-….png`. `ICT_CAPTURAS_ETAPA` pone la etapa (por ejemplo `antes` o `despues`). La carpeta no se sube al repo.

### 14.2 Qué cubre `tests/verificar.cjs` (63 casos, agrupados por tema)

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
11. Validaciones del panel. **Más vendido:** tres se marcan en la lista; el cuarto avisa y no se guarda (también en la capa de datos y en el formulario); desmarcando uno, se puede; Duplicar no lo copia. **En el sitio** (3 casos): etiqueta "Más vendido" con 4,5:1 o más, anillo con luz y halo en la tarjeta (por cualquier color del grupo o por la unidad usada), mismo orden de tarjetas, la luz anima solo `transform`, corre en pantalla y se pausa fuera, en 3 tarjetas como máximo aunque haya más marcadas; en el carrusel, la del centro igual y las vecinas bajo la capa que las desvanece; el detalle muestra la etiqueta sin animación; con reduced-motion, etiqueta y anillo quietos y ninguna animación. Probado en claro, oscuro y primario amarillo. **Video:** .mov, MP4 en HEVC, 16 s y más de 20 MB se rechazan antes de subir (no queda nada guardado); MP4 de 3 s y WebM se aceptan; quitar el video, reemplazarlo o borrar el equipo borra el archivo; la capa de datos repite los límites de Storage. **Color oficial:** el paso Color ofrece solo los colores del modelo (sin crear colores ni escribir hexadecimales), cambiar el modelo borra el color, la capa de datos rechaza un color de otro modelo, y el nombre a mostrar ("Lila") llega a la tarjeta, el detalle, el texto alternativo, el mensaje de WhatsApp y el `content_name` del píxel; sin nombre a mostrar se ve el oficial ("Lavender").
12. A 320, 360, 768 y 1440 px: sin scroll horizontal, un `h1` y sin errores en sitio, las tres páginas legales y todo el panel (incluidas las pestañas de Catálogo y el editor de una ficha).
12b. **Pestañas de Catálogo:** "Fichas técnicas" ya no está en el menú; `#/fichas` y `#/fichas/<id>` llevan a la pestaña Ficha técnica; roles ARIA (`tablist`, `tab`, `tabpanel`, `aria-controls`, `aria-selected`, `tabindex` móvil); flechas con vuelta, Inicio y Fin con el foco en la pestaña; contorno de foco de 3 px; con cambios sin guardar, pregunta antes de cambiar de pestaña.
12c. **Ficha técnica** (2 casos): las 42 fichas del demo son iguales a la fuente y el sitio las muestra tal cual, en el orden fijo y con sus saltos de línea; apagar "Mostrar la ficha técnica en el sitio" la saca del sitio; apagar categorías las saca; el editor muestra los valores de la fuente (batería vacía), corrige una categoría, completa otra y agrega una fila propia que va al final; "Otras filas de la tienda" apagada la oculta; la capa de datos rechaza una categoría inexistente o repetida, un valor de más de 600 caracteres y una categoría oculta que no existe. La migración de datos viejos del demo precarga las fichas vacías y no toca la que cargó la tienda.
12d. **Formas de pago:** Inicio avisa ciudad, correo y formas de pago; Mi tienda ya no tiene la lista; la pestaña esconde lo que depende de un interruptor apagado, marca "no más que el máximo" y el nombre de "Otra" con foco al primer error, muestra la vista previa y guarda; el detalle muestra exactamente las frases de lo marcado; sin cuotas se guardan vacías y la tarjeta de crédito va sola; la capa de datos repite las reglas. La migración de datos viejos pasa la lista a `pagos_otras`.
12e. **Reseñas** (2 casos): el demo no trae ninguna; apagadas o sin reseñas, la sección no aparece, `resenas.js` no se carga y `cargarPublico` no las da. En el panel: aviso fijo arriba de la carga y texto exacto de la casilla; sin la casilla no se sube nada (foco en la casilla); videos de 31 s, .mov y más de 20 MB rechazados sin subir nada; una imagen (dos tamaños) y un video de 20 s se agregan; editar texto, mover, encender y cambiar el título; en el sitio, el orden de las secciones, el título, el orden, las imágenes diferidas, ningún `<video>` antes de tocar, AA; el visor con `preload="none"`, sin reproducción automática, ← y Escape, y el foco vuelve; borrar quita la reseña y sus archivos; la 13.ª se rechaza y "Agregar" queda deshabilitado; `autorizado: false` se rechaza.
12f. **Legales** (8 casos): el **asistente** (campos según perfil y tipo de persona —emprendedor sin local, jurídica con representante y matrícula, oficial con detalle de Apple—, validaciones al salir del campo con sus mensajes, guardado automático, países con solo Colombia y Brasil "Necesita el sitio en portugués.", garantía de 12 meses con Colombia y los avisos literales, herramientas con su ID, la pregunta de la API de Conversiones con su ayuda, "Lo que falta" que lleva al campo, publicar deshabilitado hasta completar, pestañas con flechas, cláusula propia, versión 1 e Inicio sin el aviso); el **bloqueo** sin publicar (pop-up, "Página en preparación." en las tres páginas, modo demo y borrar demo en panel y capa de datos, publicar incompleto rechazado); los **documentos** (datos de la tienda, secciones, plazos, vigencia, sin corchetes ni marcas, herramientas activas sí e inactivas no, AA, pie); la **republicación** (un cambio en Legales o en Mi tienda sube la versión; incompleto, queda la publicada e Inicio avisa); el **banner** en 360 px y en 412 × 823 (espera a que bajen los filtros, nada se carga antes de aceptar ni al rechazar —medido en la red—, botones iguales de 44 px o más, AA, la elección se guarda, Preferencias desde el pie por categoría, carga solo lo permitido, borra las cookies de lo retirado, vence a los 6 meses) y en 1440 px con **GPC**; y el **pop-up** (aviso corto, las dos casillas literales sin marcar, la obligatoria bloquea y la opcional no, `data-clarity-mask`, los campos de consentimiento del lead, sin píxel ni Lead sin publicidad). La migración de datos viejos del demo pasa los textos propios a las cláusulas.
13. Carrusel: dedo, flechas, puntos, muestras, teclado y Escape. **Video en el detalle:** miniatura con ícono; sin `<video>` en la página hasta tocarla; al tocarla, `preload="none"`, `controls`, sin `autoplay` y se reproduce; volver a la foto lo quita.
14. Gesto táctil real en el carrusel y cierre de la hoja con el gesto.
14b. **Vista Carrusel** (8 casos): elegirla en Mi tienda cambia el sitio (mismas tarjetas, orden, contador y detalle; tocar una vecina la centra, la del centro abre el detalle; flechas de 44 px o más con foco visible); bucle en los dos sentidos con flechas, teclado, mouse, trackpad y dedo; 1 tarjeta sin flechas ni bucle, 2 tarjetas con una sola vecina, el filtro vuelve a la primera y el estado vacío; sin scroll horizontal y con altura estable a 320, 360, 768 y 1440 px; con reduced-motion, sin animaciones.
15. Sin Apple: ni imágenes en el repo, ni la manzana U+F8FF, ni referencias (salvo las frases fijas de los términos que pidió Jared), y solo recursos externos de Google Fonts.
15b. **Espacios** (2 casos, 360 y 1440 px): mide en píxeles el relleno del pie y la separación de sus bloques, el aire entre el título y los filtros y arriba y abajo de la zona de equipos, en cuadrícula y carrusel, con tamaño Normal y Compacto (72 %), sin scroll horizontal.
16. Contraste AA en 4 combinaciones: claro, oscuro, amarillo sobre blanco, y primario oscuro en tema oscuro. **Pie:** el fondo es el secundario y todo su texto pasa AA en claro y oscuro con 6 secundarios (incluidos gris medio, amarillo y azul).
17. Textos de 16 px o más y zonas táctiles de 44 px, en el sitio, el pop-up y las legales, con los **tres tamaños de texto**. Compacto deja el cuerpo en 16 px y achica títulos y precios; Grande pone el cuerpo en 18 px. Elegir el tamaño en Mi tienda lo cambia en el sitio y no en el panel.
18. Lista de modelos con teclado y buscador cuando hay más de 8.
19. `prefers-reduced-motion`: sin animaciones en curso y todo funciona.
20. Copy: sin tuteo ni promesas (también en los textos legales), sin `Purchase`, y sin "borrador", "abogado" ni "en revisión" en lo que ve el cliente.
21. Píxel (con publicidad aceptada): `PageView`, `ViewContent` y `Lead` con `eventID`, sin datos personales.
22. Formatos: `$5.299.000`, fecha D/M/AAAA y código sin O/0/I/1.

### 14.3 "Supabase local" y `tests/verificar-supabase.cjs` (12 casos)

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

**Los 12 casos:**

1. El sitio carga con la RPC; sin legales publicados, el pop-up no envía y las tres páginas dicen "Página en preparación.".
1c. **Legales:** el servidor no deja borrar la demo ni apagarla sin publicar, rechaza publicar incompleto y un perfil inválido; el gestor publica y el servidor pone versión 1 y la fecha de hoy (aunque le manden otra); un cambio sube a la versión 2 y `/terminos/` lo muestra.
2. El pop-up pasa por la función y llega al webhook con todos los campos, también los de consentimiento.
3. Permisos del panel: el gestor no ve Usuarios y el servidor (función y tabla) le niega gestionarlos; colores.
4. Un precio cambiado en el panel se ve en el sitio, con la fecha.
4b. **Ficha técnica y formas de pago:** el gestor guarda cuotas en Catálogo → Formas de pago; el servidor rechaza "sin interés" mayor que el máximo con el mismo mensaje del panel; el sitio muestra la frase y la ficha precargada por la RPC, en el orden fijo.
4c. **Reseñas:** el gestor sube una imagen y un video de 20 s al bucket `resenas` desde el panel; apagadas, la tabla no las da al público (REST) ni el sitio las muestra; encendidas, sí; la miniatura se sirve desde Storage; el video **no se pide al abrir el visor** y sí al reproducirlo; Storage rechaza un .mov en `resenas`.
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
2. **Migraciones:** correr **todas** las de `supabase/migrations/`, en orden de número, de `0001` a la última (hoy `0017`): `0001` esquema, `0002` catálogo, `0003` demo, `0004` stock sí/no, `0005` tamaño del texto, `0006` catálogo y colores, `0007` roles, `0008` color oficial, `0009` video, `0010` más vendido, `0011` vista de equipos, `0012` fichas, `0013` formas de pago, `0014` reseñas, `0015` legales (textos base, reemplazados por la siguiente), `0016` asistente de legales y `0017` bloqueo hasta publicar. Saltarse una rompe las siguientes (con la CLI, `supabase db push` las corre en orden). Crean también los buckets (`fotos` y `marca` en `0001`, `videos` en `0009`, `resenas` en `0014`) con sus reglas. Para actualizar una tienda ya publicada se corren solo las nuevas, en orden; nunca se edita una ya corrida. (El comentario de `0001_esquema.sql` que dice "0001 → 0002 → 0003" es de cuando eran tres; no se edita porque esa migración ya corrió.)
3. **Registro:** apagar "Allow new users to sign up".
4. **Direcciones:** Site URL y Redirect URLs apuntando a `/admin/`.
5. **Correo:** SMTP propio y las plantillas de `supabase/correos/`.
6. **Primer administrador:** crearlo en Authentication y luego `insert into perfiles … 'administrador'`. El SQL exacto está en el README. Para cargar datos hace falta además un gestor (se invita desde Usuarios).
7. **Funciones:**
   - `supabase functions deploy enviar-lead --no-verify-jwt` y `supabase functions deploy usuarios`.
   - `supabase secrets set GHL_WEBHOOK_URL=… ORIGENES_PERMITIDOS=https://dominio`.
8. **`config.js`:** `backend: "supabase"`, la URL y la clave anon o publishable. El ID del píxel ya no va aquí: va en Legales → Herramientas.
9. **Publicar** en cualquier hosting estático.
10. **Antes de abrir al público** (todo con el usuario **gestor**; el administrador solo ve Usuarios):
    1. Mi tienda: nombre, ciudad, dirección, correo, WhatsApp y logo.
    2. Catálogo: activar los modelos, revisar la ficha técnica precargada (completar lo que falta) y cargar las formas de pago.
    3. Legales: completar los seis pasos del asistente y "Publicar textos legales" (sin eso, el pop-up no envía y la demo no se puede quitar). En GHL, los campos de consentimiento y la guía de la sección 12.3.
    4. Inventario con fotos.
    5. Inicio → "Lo que falta" debe decir "Todo está completo.".
    6. Tocar "Borrar datos de demostración".

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
| Fichas técnicas precargadas de la fuente | Pedido de Jared (ronda 2, C2), que cambia la regla del prompt original ("se crean vacías"). Solo se carga lo que traen sus tres archivos; se usó el HTML para el iPhone 7 a 16 Pro Max (es el más completo; `info_complementaria_2.md` resume los mismos modelos con menos detalle) e `info_complementaria.md` para el resto. Se respeta el texto de la fuente (también "4.7\"" o "2,000 nits"); solo se separó la cámara frontal de las traseras, se pasaron "Sep" / "Feb" a "Septiembre" / "Febrero" y se partieron las líneas de almacenamiento y de dimensiones. |
| "Versiones del modelo" = opciones de almacenamiento | Propuesta aprobada por Jared: la fuente no tiene otra columna que sirva. Los colores no van en la ficha (ya están en el detalle). |
| Textos que no son datos quedan vacíos | "Datos de catálogo en consolidación", "Lanzamiento reciente" y "Diseño tipo libro (\"Fold\")" (columna de dimensiones) no son medidas: la categoría queda vacía y se anota en la sección 17. |
| Filas de la tienda al final, con su propio interruptor | Las categorías fijas tienen orden; lo que agrega la tienda no tiene categoría, así que va después y se apaga junto ("Otras filas de la tienda"). |
| Reseñas fuera del formulario de Mi tienda | Cada una lleva un archivo que se sube al elegirlo; guardarlas solas evita archivos huérfanos y el "Guardar" de Mi tienda no espera subidas largas. |
| Origen "Otro" con "¿Cuál?" | "Otro" solo no le dice nada al cliente: se muestra el nombre que escriba la tienda; sin nombre, no se muestra origen. Sin logos (pedido). |
| Los videos de reseñas sin imagen de portada | Con `preload="none"` el navegador no baja ni un cuadro; generar una portada al subir obligaría a decodificar el video en el panel (y no todos los navegadores pueden con H.264). Se muestra un recuadro "Video". |
| `resenas.js` se carga solo si hay reseñas | Las tiendas que no las usan no pagan ese peso. |
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
| Textos legales generados, no escritos a mano (`0016`) | Pedido de Jared: la tienda solo llena datos; las plantillas y los módulos por país ponen lo que exige la ley, con sus fuentes. Reemplaza los textos base de `0015`. |
| Los textos propios de la tienda pasan a la cláusula propia | Propuesta aprobada por Jared: no se pierde nada de lo que la tienda escribió; los textos base sin cambios se descartan (por su huella). |
| El demo empieza sin legales publicados | Propuesta aprobada: el demo muestra el bloqueo real. Las pruebas publican con la tienda de prueba. |
| El ID del píxel de Meta es obligatorio para publicar | Propuesta aprobada: la política nombra el píxel y la API de Conversiones como siempre activos. |
| La versión y la fecha las pone el servidor | Así no se pueden falsear desde el navegador; el panel las calcula igual para la vista previa. |
| Devolución del retracto en 15 días calendario (no 30) | La Ley 2439 de 2024 bajó el plazo a 15 (ver `legal/FUENTES.md`); 15 cumple también la norma anterior. |
| Solo Estados Unidos en la lista de países adecuados | Argentina no se pudo confirmar en la lista de la SIC; la transmisión al proveedor se apoya en el contrato de transmisión. |
| Duraciones de cookies solo si están verificadas | Pedido de Jared. Meta y Clarity van sin duración. |
| El banner espera a que bajen los filtros en celular | Pedido: no tapar el título ni los filtros. En 360 × 800 los filtros llegan casi al borde. |
| Clarity con `consentv2` y TikTok sin métodos de consentimiento | `consentv2` es el que recomienda Microsoft; los de TikTok no se encontraron en su documentación oficial, así que TikTok simplemente no se carga sin permiso. |
| El script de seguimiento de GHL con permiso de medición | Mide visitas: no se carga antes de aceptar. |
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

- [ ] **Fuentes legales que no se pudieron abrir** desde el entorno (se verificaron con el buscador o se usaron como las dio Jared): ver `legal/FUENTES.md` (transmisión, cookies, Ley 2300, garantía, RNBD, plazo de devolución del retracto, Argentina en la lista de la SIC).
- [ ] **Cookies del script de seguimiento externo de GHL:** no se verificaron; si se activa, agregarlo a la Política de cookies.
- [ ] Probar en GHL los campos de consentimiento y la guía de la sección 12.3.
- [ ] Que el abogado confirme si publicar capturas de clientes (aun tapadas) necesita autorización por escrito; el panel pide la casilla en cada reseña, pero no guarda la autorización.
- [ ] Confirmar en apple.com/co los nombres del catálogo (desde el iPhone 7, iPhone Air e iPhone Duo).
- [ ] **Datos que faltan en la fuente del catálogo** (quedaron vacíos; no se completaron de memoria):
  - Hexadecimal de **todos** los colores de: iPhone 7, 7 Plus, 8, 8 Plus, X, XS, XS Max, XR, 11, 11 Pro, 11 Pro Max, SE (2.ª), 12 mini, 12, 12 Pro, 12 Pro Max, 13 mini, 13, 13 Pro, 13 Pro Max, SE (3.ª), 14, 14 Plus, 14 Pro, 14 Pro Max, 15, 15 Plus, 15 Pro, 15 Pro Max, 16 Pro, 16 Pro Max y Duo. Solo 32 de 183 colores tienen hexadecimal.
  - Hexadecimal de Visón, Oliva, Azul nítido y Magenta del 18 Pro y 18 Pro Max.
  - Nombre en inglés de: Blanco y Negro (17 y 17e); Negro, Visón, Oliva, Azul nítido, Magenta y Plata (18 Pro y 18 Pro Max); Titanio (Duo).
  - Colores del iPhone 17 Pro y 17 Pro Max: la fuente no los lista (la tienda puede agregar los suyos).
  - El hexadecimal de Borgoña y Glaciar viene marcado "aproximado" en la fuente.
- [ ] **Fichas técnicas: datos que la fuente no trae** (quedaron vacíos; la tienda los puede completar en Catálogo → Ficha técnica):
  - **Batería:** ningún modelo (la fuente no tiene esa columna; del Duo solo dice "Sistema de doble batería", dentro de Puertos y carga).
  - **Cámara frontal:** iPhone 17, 17 Pro, 17 Pro Max, 18 Pro, 18 Pro Max y Duo.
  - **Cámaras traseras:** Duo (la fuente da "Sist. Multi-cámara: Incluye cámara frontal oculta bajo la pantalla interior. Funciones Smart Take y Kid Cue.", que quedó como fila propia "Sistema de cámaras").
  - **Dimensiones y peso:** 17 Pro y 17 Pro Max ("Datos de catálogo en consolidación"), 18 Pro y 18 Pro Max ("Lanzamiento reciente") y Duo ("Diseño tipo libro (\"Fold\")").
  - **Descripción:** ningún modelo (la fuente no trae).
  - Los datos del 18 Pro, 18 Pro Max y Duo son de modelos de lanzamiento reciente o futuro según la fuente: conviene revisarlos antes de publicar.
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

### 21/10/2026 · Legales H: mediciones, capturas y un arreglo del banner

- **Lighthouse móvil** (3 corridas, con el banner): navegación 100 / 100 / 100 (LCP 1,4 s, CLS 0,045); con el banner visible, accesibilidad 100 y buenas prácticas 100; el desplazamiento hasta el banner, CLS 0. Tabla en la sección 13.
- **Arreglo:** en 412 × 823 el banner se medía antes de que se dibujaran las capacidades y tapaba los filtros. Ahora `iniciarConsentimiento` corre después de dibujar los filtros y `mostrarSinTapar` espera la fuente y mide el banner real (oculto con `hidden` hasta que haya lugar). Caso nuevo en `verificar.cjs` a 412 × 823 (63 casos).
- **Capturas:** `tests/capturas/legales/` (asistente, cuatro documentos y banner a 360 y 1440 px; no se suben al repo).
- **Verificación:** las suites en verde; `node tests/documentacion.mjs` OK.

### 21/10/2026 · Legales B a G: asistente, documentos, banner de cookies, pop-up y bloqueo (0016 y 0017)

- **Pedido de Jared (módulo legal):** asistente de seis pasos con guardado automático y vista previa; documentos generados (privacidad, términos, cookies y aviso del pop-up) con versión; banner con consentimiento previo; dos casillas en el pop-up y el consentimiento en cada lead; bloqueo hasta publicar; guía para GHL.
- **Hecho:** `0016_legales_asistente.sql` (campos, `legal_faltantes`, publicación con versión y fecha del servidor, textos propios a las cláusulas, columnas de `0015` fuera) y `0017_bloqueo_legal.sql`; demo versión 14 con las mismas reglas; `panel/legales.js` (asistente), `panel.js` (Inicio, republicación, copia única del píxel de `config.js`); `sitio/consentimiento.js` (banner y cargadores), `pixel.js`, `principal.js`, `popup.js` (aviso, casillas, consentimiento, bloqueo), `legal.js`, `cookies/index.html` y pie de las páginas legales; `lead.ts` (campos de consentimiento); `legal/vigencia.js`; CSS; se borró `datos/legales-base.js`.
- **Decisiones:** las de la sección 16 (textos propios a las cláusulas, demo sin publicar, píxel obligatorio, versión del servidor, 15 días de devolución, Clarity `consentv2`, GHL con medición).
- **Pruebas:** `tests/sql` (migración, checks, publicación, bloqueo y `comparar-faltantes.mjs` con 27 variantes), `tests/legal/motor.test.mjs` (10), `tests/funciones/probar.sh` (14), `tests/verificar.cjs` (62; 7 casos nuevos de legales y los que usan el pop-up publican con la tienda de prueba) y `tests/verificar-supabase.cjs` (12).
- **Verificación:** todas las suites pasan; `node tests/documentacion.mjs` OK.

### 21/10/2026 · Legales A: motor legal, módulo de Colombia y plantillas

- **Pedido de Jared (módulo legal, reemplaza la sección E de la ronda 2):** textos legales generados desde plantillas con los datos de la tienda, por país; solo Colombia disponible; versión que sube cuando cambia el texto; nada de marcadores vacíos en el sitio.
- **Hecho:** `assets/js/legal/` (motor, herramientas, índice de países, módulo de Colombia y cuatro plantillas), `formatoBasico` con `###`, rutas relativas y tablas, `legal/FUENTES.md` con cada fuente y su estado, y `tests/legal/` (9 casos). Todavía no está conectado al panel ni al sitio (fases B a F).
- **Decisiones:** la devolución del dinero del retracto dice "en máximo 15 días calendario" y no 30 (la Ley 2439 de 2024 la bajó a 15; ver `legal/FUENTES.md`). Solo se afirma que Estados Unidos está en la lista de países adecuados de la SIC; Argentina no se pudo confirmar.
- **Verificación:** `node tests/legal/motor.test.mjs` OK (9 casos); `node tests/documentacion.mjs` OK.

### 21/10/2026 · Cierre de la ronda 2 (A a F): verificación final

- **Suites:** `tests/sql/probar.sh` OK (semilla, fichas y textos legales iguales en SQL y JS); `tests/funciones/probar.sh` OK; `tests/verificar.cjs` 57/57 dos veces seguidas y 58/58 con `ICT_CAPTURAS`; `tests/verificar-supabase.cjs` 11/11; `node tests/documentacion.mjs` OK; revisión de tuteo sin resultados.
- **Lighthouse móvil** (3 corridas por escenario): ver la tabla de la sección 13. Sin franja: 100 / 100 / 100, LCP 1,1–1,4 s (antes 1,2–1,6 s), CLS 0,045 (antes 0,049).
- **Capturas:** `tests/capturas/diseno/antes-*.png`, `a-despues-*.png` (después de A) y `despues-*.png` (final), a 360 y 1440 px, claro y oscuro, cuadrícula y carrusel, color por defecto y amarillo, más detalle y pop-up. No se suben al repo.

### 21/10/2026 · F: instrucciones de despliegue al día

- **Pedido de Jared (ronda 2, punto F):** corregir la sección 15.2 y el README: en producción se corren todas las migraciones, de `0001` a la última, en orden (decía "0001, 0002 y 0003"), y revisar otras instrucciones viejas (usuarios demo, roles, buckets).
- **Hecho:** sección 15.2 (todas las migraciones con su tema, buckets que crean, actualizar una tienda ya publicada, lista de "antes de abrir al público" con el rol que hace cada cosa); `README.md` (mapa de archivos con `0012`–`0015` y las pestañas del panel, paso 2 de producción, "Antes de abrir al público", datos demo, cantidad de casos de las suites); `CLAUDE.md` (cantidad de casos y videos de reseñas).
- **Revisado y correcto, sin cambios:** usuarios demo (`gestor@demo.co` / `administrador@demo.co`, `demo1234`), tabla de roles del README y 15.1 (GitHub Pages).
- **Verificación:** `node tests/documentacion.mjs` OK (solo cambian textos).

### 21/10/2026 · E: textos legales base para revisión del abogado

- **Pedido de Jared (ronda 2, punto E):** redactar y precargar (migración y demo) la política de privacidad, los términos y el texto de la casilla del pop-up, describiendo exactamente cómo funciona el proyecto (datos que se recogen, para qué, herramientas, plazo de 2 meses en el CRM, derechos de la Ley 1581 de 2012, cómo ejercerlos, responsable con los datos del panel), con `[PENDIENTE: …]` donde lo debe confirmar el abogado; aviso fijo en el panel; `legales_revisados` con su interruptor y aviso en "Lo que falta"; el sitio nunca muestra `[PENDIENTE]` y avisa "Texto en revisión."; precarga solo si el campo está vacío.
- **Hecho:** `supabase/migrations/0015_legales.sql` y `assets/js/datos/legales-base.js` (nuevos, generados de los mismos textos); `README.md` y `CLAUDE.md` (pendientes); `comun.js` (`expandirLegal`, `prepararLegal`, campos); `demo.js` versión 13; panel `legales.js` y `panel.js` (Inicio); sitio `legal.js`, `popup.js` y `sitio.css` (`.legal-revision`).
- **Decisiones:** ver la sección 16 (marcas y datos, aviso que se esconde con la revisión, sessionStorage y cookies del píxel, API de Conversiones en la lista editable).
- **Pruebas:** `pruebas.sql` (marcas, términos de la tienda intactos, revisión y herramientas), `comparar-semilla.mjs` (textos del SQL = `legales-base.js`, términos de `antes_0015`), `verificar.cjs` (2 casos nuevos; el de migración de datos viejos suma reseñas y legales) y `verificar-supabase.cjs` (el caso de la RPC revisa las páginas legales).
- **Para el abogado:** la lista de marcas está en la sección 17.
- **Verificación:** `tests/sql/probar.sh` OK, `tests/verificar.cjs` 57/57, `tests/verificar-supabase.cjs` 11/11 y `node tests/documentacion.mjs` OK.

### 21/10/2026 · D: reseñas en Mi tienda y en el sitio

- **Pedido de Jared (ronda 2, punto D):** en Mi tienda, interruptor "Mostrar reseñas en el sitio" (apagado por defecto), título editable ("Lo que dicen nuestros clientes" por defecto), hasta 12 reseñas ordenables, cada una imagen (comprimida como las fotos) o video (MP4/WebM, 30 s, 20 MB, misma validación que los videos de equipos, que siguen en 15 s), texto y origen opcionales (Instagram, WhatsApp, Google, Otro; en texto, sin logos), casilla obligatoria "Tengo autorización de esta persona o tapé su nombre, foto y número." y el aviso fijo "Las capturas pueden tener datos personales de sus clientes. Tápelos o pida autorización antes de publicarlas.". Bucket "resenas" con las reglas de las fotos y tabla con RLS (el público lee solo con el interruptor). En el sitio, debajo de los equipos y antes de la información de la tienda: carrusel o mosaico, visor a pantalla completa con Escape, imágenes diferidas, videos con `preload="none"` que se reproducen solo al tocarlos; sin sección si no hay o está apagado. **Sin reseñas, testimonios, nombres ni textos de ejemplo, tampoco en demo.**
- **Hecho:** `supabase/migrations/0014_resenas.sql`, `assets/js/panel/resenas.js` y `assets/js/sitio/resenas.js` (nuevos); `comun.js` (campos, límites, orígenes, `textoOrigen`, bucket); `demo.js` versión 12 y `supabase.js` (métodos de reseñas); `video.js` (`maxSegundos`); `tienda.js` (sección al final); `index.html` (sección y visor); `principal.js` y `catalogo.js` del sitio; `panel.css` y `sitio.css`; `tests/supabase-local/pasarela.mjs` (bucket simulado `resenas`); videos de prueba `tests/videos/20s.mp4` y `31s.mp4`.
- **Decisiones:** ver la sección 16 (fuera del formulario, "Otro" con nombre, sin portada de video, módulo bajo demanda).
- **Pruebas:** `pruebas.sql` (ninguna de ejemplo, bucket, límite de 12 con su mensaje, casilla, rutas, origen, RLS por rol y con el interruptor, `datos_publicos`); `verificar.cjs` (2 casos nuevos, ver 14.2, 12e); `verificar-supabase.cjs` (caso nuevo, ver 14.3, 4c). Ninguna prueba se quitó ni se debilitó.
- **Verificación:** `tests/sql/probar.sh` OK, `tests/verificar.cjs` 55/55, `tests/verificar-supabase.cjs` 11/11 y `node tests/documentacion.mjs` OK.

### 21/10/2026 · C3: formas de pago estructuradas

- **Pedido de Jared (ronda 2, punto C3):** en Catálogo → Formas de pago, cuotas (acepta sí/no; hasta cuántas, de 2 a 48; sin interés sí/no; hasta cuántas sin interés, no más que el máximo), medios (transferencia, efectivo, débito, crédito), criptomonedas sí/no y "¿Cuáles?", pasarelas (Mercado Pago, PSE, Nequi, Daviplata, Wompi, Bold y "Otra" con texto) y "Otras formas de pago" = la lista libre de Mi tienda (la migración mueve los valores y Mi tienda deja de mostrarla). Validaciones en el SQL y en el demo; el detalle del sitio arma frases cortas solo con lo marcado; Inicio avisa lo que falta de Mi tienda y de Formas de pago.
- **Hecho:** `supabase/migrations/0013_formas_pago.sql` (nuevo); `comun.js` (`errorPagos`, `frasesPagos`, constantes y campos); `demo.js` versión 11; panel `pagos.js` (nuevo), `catalogo.js` (tercera pestaña; la pestaña elegida se desplaza a la vista en celular), `tienda.js` (sin la lista; enlace a la pestaña), `panel.js` (avisos de Inicio) y `panel.css`; sitio `detalle.js`.
- **Decisiones:** las cuotas se dicen junto a "Tarjeta de crédito" si está marcada; si no, como "Pago a cuotas: …". Con el mismo número de cuotas y de cuotas sin interés: "hasta 12 cuotas sin interés". En "Lo que falta" se suman nombre, ciudad y correo (dirección, horario y redes son opcionales). Las cuotas sin interés empiezan en 2, como las cuotas.
- **Pruebas:** `pruebas.sql` (la lista pasa a `pagos_otras`, los 10 mensajes de `validar_pagos`, checks de medios y pasarelas), `verificar.cjs` (caso nuevo de formas de pago; el de migración de datos viejos suma la lista; el recorrido del panel suma `catalogo/pagos`) y `verificar-supabase.cjs` (caso nuevo: el servidor rechaza con el mismo mensaje y el sitio muestra la frase y la ficha precargada por la RPC).
- **Verificación:** `tests/sql/probar.sh` OK, `tests/verificar.cjs` 53/53, `tests/verificar-supabase.cjs` 10/10 y `node tests/documentacion.mjs` OK.

### 21/10/2026 · C2: ficha técnica precargada de la fuente, con interruptores

- **Pedido de Jared (ronda 2, punto C2):** interruptor general "Mostrar la ficha técnica en el sitio" (sí por defecto) y uno por categoría (año de lanzamiento, procesador, pantalla, cámaras traseras, cámara frontal, batería y versiones del modelo, más las demás categorías de la fuente con su nombre); precargar las fichas de los 42 modelos **solo con el texto de la fuente** (lo que falta queda vacío y se anota); editor por modelo dentro de la pestaña; en el sitio, "Ver ficha técnica" solo con el interruptor encendido, solo categorías activas con valor, en orden, con estilo premium.
- **Hecho:** `supabase/migrations/0012_fichas.sql` (nuevo); `README.md` y `CLAUDE.md` (la ficha ya no nace vacía); `comun.js` (`CATEGORIAS_FICHA`, `especificacionesValidas`, `filasVisiblesFicha`, campos de la tienda); `semilla.js` (`FICHAS`, `filasDeFuente`); `demo.js` versión 10 (misma migración y mismas reglas); panel `fichas.js` y `panel.css`; sitio `detalle.js` y `sitio.css`.
- **Fuente:** los tres archivos de Jared (aprobado: "usa los tres archivos y aplica tus propuestas"). HTML para el iPhone 7 a 16 Pro Max, `info_complementaria.md` para el 16e, 17, Air, 17 Pro, 17 Pro Max, 17e, 18 Pro, 18 Pro Max y Duo. 367 filas en total. Las decisiones de formato están en la sección 16 y lo que falta, en la 17.
- **Pruebas cambiadas y por qué:** `pruebas.sql` exigía "fichas vacías" (regla del prompt original). Este pedido la reemplaza: ahora exige que no haya descripciones de la fuente y, en un bloque nuevo, que haya 41 fichas precargadas, que la de la tienda (`antes_0012_fichas.sql`) no se toque, que no haya batería y las reglas de `validar_ficha` y de `ficha_ocultas`. `comparar-semilla.mjs` compara además las fichas del SQL con `semilla.js`. En `verificar.cjs`: 2 casos nuevos y el de migración de datos viejos suma las fichas.
- **Verificación:** `tests/sql/probar.sh` OK, `tests/verificar.cjs` 52/52, `tests/verificar-supabase.cjs` 9/9 y `node tests/documentacion.mjs` OK.

### 21/10/2026 · C1: "Fichas técnicas" pasa a una pestaña de Catálogo

- **Pedido de Jared (ronda 2, punto C1):** unir Fichas técnicas con Catálogo en pestañas ("Modelos y colores", "Ficha técnica" y "Formas de pago"), quitar Fichas del menú, que `#/fichas` lleve a la pestaña nueva y que las pestañas sean accesibles (`role="tablist"`, flechas, foco visible).
- **Hecho:** `assets/js/panel/catalogo.js` (cáscara con pestañas y la de Modelos y colores), `fichas.js` (ahora una pestaña: `h2`, enlaces `#/catalogo/ficha…`), `panel.js` (redirección de `#/fichas` y `ctx.marcarRuta`), `admin/index.html` (sin el enlace) y `panel.css` (pestañas). La pestaña "Formas de pago" llega con C3, que es la que le da contenido.
- **Encontrado en el camino:** al cambiar rápido de pestaña o de sección, una pestaña que terminaba de cargar tarde podía dibujar sobre otra (error en consola). Ahora cada pestaña dibuja en un contenedor nuevo y las vistas no dibujan si ya no están en la página.
- **Pruebas:** caso nuevo de pestañas (ver 14.2, punto 12b); el recorrido del panel a 320–1440 px cambia `fichas` por `catalogo/ficha` y suma el editor de una ficha. El caso de roles sigue pidiendo que el administrador que entra a `#/fichas` termine en Usuarios, y pasa.
- **Verificación:** `tests/verificar.cjs` 50/50 y `node tests/documentacion.mjs` OK.

### 21/10/2026 · B: "Más vendido" en la tarjeta y el detalle

- **Pedido de Jared (ronda 2, punto B):** la tarjeta es "más vendido" si cualquiera de sus equipos lo es; etiqueta visible con AA; borde con una luz que recorre el contorno (con respaldo quieto) y halo suave; en el carrusel, la del centro igual y las vecinas atenuadas con la capa existente; en el detalle, la etiqueta sin animación; sin cambiar el orden; reduced-motion quieto; como mucho 3 tarjetas animadas, solo propiedades baratas y en pausa fuera de la pantalla; reemplazar la prueba que exigía que no se viera.
- **Hecho:** `catalogo.js` (`masVendido` por tarjeta y `TEXTO_MAS_VENDIDO`), `galeria.js` (clase, etiqueta, `span.tarjeta-brillo` y el observador que pone `data-en-pantalla` en 3 como máximo), `detalle.js` (etiqueta) y `sitio.css` (ver sección 13). La luz anima solo `transform` y se pausa con `animation-play-state` cuando la tarjeta no se ve.
- **Decisión:** en el detalle de un nuevo, la etiqueta se ve con cualquier color elegido, igual que en la tarjeta (la tarjeta agrupa modelo y capacidad); en un usado, es de esa unidad.
- **Pruebas cambiadas y por qué:** el caso de A8 terminaba comprobando que el sitio **no** mostraba "más vendido". Esa comprobación dejó de tener sentido con este pedido: se quitó y el caso se renombró ("… Duplicar no lo copia"); todo lo demás del caso queda igual. La reemplazan 3 casos nuevos (ver sección 14.2, punto 11).
- **Verificación:** `tests/verificar.cjs` 49/49 y `node tests/documentacion.mjs` OK.

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
