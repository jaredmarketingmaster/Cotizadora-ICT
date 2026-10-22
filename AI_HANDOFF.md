# 🤖 AI SYSTEM STATE & HANDOFF CONTEXT
> LECTURA OBLIGATORIA PARA OPENAI CODEX: Lee este documento antes de ejecutar comandos o proponer código.

## 1. 🚦 ESTADO ACTUAL (METADATA)
- **Último Agente:** Claude Code 3 (tomó la directiva de la sección 5: hizo los puntos 1 y 2; los puntos 3 y 4 quedan bloqueados por información externa, ver abajo).
- **Timestamp:** 2026-10-22 (actualizado por Claude Code 3; el traspaso original es de las 14:48 UTC).
- **Rama Actual:** `claude/gallant-euler-ezco6g` (punto 1 en `b08bb1f`, punto 2 en `d2d6222` y este cierre encima; árbol limpio y sincronizado con `origin` al terminar). `main` solo tiene el README inicial: **no** trabajar sobre `main` ni abrir PR sin que Jared lo pida.
- **Estado del Build:** VERDE. No hay build ni `package.json`: es un sitio estático sin npm ni compilación, a propósito. "Verde" significa que pasan todas las suites del 22/10/2026: SQL OK, 6 suites sin navegador OK (1152 claves), funciones Deno OK, `tests/i18n.test.mjs` 6 casos, `tests/verificar.cjs` 80/80 (81 con `ICT_CAPTURAS=1`; el caso nuevo es B4b), `tests/verificar-supabase.cjs` 13/13 y `tests/documentacion.mjs` OK. Lighthouse móvil sin la franja de modo demo: 99–100 / 100 / 100, CLS 0,045; con una tienda en portugués y el idioma guardado (`ICT_LH_IDIOMA=pt`), 99 / 100 / 100, LCP 1,7–1,8 s.
- **Comando de Verificación:**
  ```bash
  python3 -m http.server 8080 & \
  node tests/documentacion.mjs && bash tests/sql/probar.sh && \
  node tests/legal/motor.test.mjs && node tests/paises.test.mjs && node tests/i18n.test.mjs && \
  node tests/envios.test.mjs && node tests/pagos.test.mjs && \
  NODE_PATH="$(npm root -g)" node tests/verificar.cjs
  ```
  Requisitos: Postgres 15+ local (`/usr/lib/postgresql/*/bin`) y Playwright con Chromium. Para filtrar casos: `ICT_SOLO="regex" ICT_LINEAS=10`.
  - Si se tocan las funciones: `DENO=/ruta/deno bash tests/funciones/probar.sh`.
  - Si se toca el SQL o `supabase.js`: levantar `tests/supabase-local/levantar.sh` y correr `tests/verificar-supabase.cjs`, con `ICT_SUPABASE_JS` si el CDN está bloqueado (ver sección 14.3 de `DOCUMENTACION.md`).

## 2. 🧠 MEMORIA ARQUITECTÓNICA (INMUTABLE)
1. **Sitio estático sin build.** HTML, CSS y JavaScript con ES modules y **rutas relativas** (funciona bajo `/Cotizadora-ICT/` en GitHub Pages). No agregar npm, `package.json`, bundlers, TypeScript en el front ni frameworks. Las únicas dependencias externas son Google Fonts (sitio) y supabase-js 2.117.2 desde jsDelivr (solo el panel).
2. **Dos back-ends con la misma interfaz y las mismas reglas.** `assets/js/datos/api.js` elige `demo.js` (localStorage e IndexedDB) o `supabase.js` según `config.js`. Toda regla nueva va **en el SQL (migración nueva) y en `demo.js`**, con mensajes iguales. La seguridad real está en el SQL (RLS con `es_gestor()` / `es_administrador()` y disparadores). Las migraciones de `supabase/migrations/` son inmutables; la próxima libre es **`0028_…sql`**. Si cambia la forma de los datos del demo, se sube `VERSION` en `demo.js` (hoy 22) con su `MIGRACIONES[n]`.
3. **Idioma y textos.** Español de Colombia con **"usted"** (nunca "tú" ni voseo) y portugués de Brasil con "você". **Ningún texto visible suelto en el código:** todo va en `assets/js/i18n/es.js` y `pt.js`, con las mismas claves y variables, y se usa con `t(clave)` / `tn(clave, n)`. `t()` se llama al usar el texto, nunca al cargar el módulo. Los textos literales del prompt (en `popup.js` y `catalogo.js`, ver `CLAUDE.md`) no se reescriben.
4. **Reglas de producto que la suite hace cumplir:**
   - No inventar datos (especificaciones, colores, precios, plazos ni promesas): lo que la fuente no trae queda vacío.
   - Nada de la marca Apple: sin logo, imágenes ni tipografías; solo `apple.com/co` como referencia de texto.
   - Datos personales de clientes **solo a GHL** por `enviar-lead`: nunca en Supabase ni en el píxel. Nunca `Purchase`.
   - Ninguna herramienta de medición o publicidad sin consentimiento (`sitio/consentimiento.js`).
   - Nada se afirma como requisito legal si no está en `legal/FUENTES.md`. El proveedor tecnológico se nombra solo como "nuestro proveedor tecnológico, ubicado en Argentina".
   - Textos de 16 px o más, zonas táctiles de 44 px o más, contraste AA y `prefers-reduced-motion` respetado.
5. **Documentación obligatoria.** Todo cambio actualiza `DOCUMENTACION.md` en el mismo commit:
   - Sección 5 (mapa de archivos), la sección temática, la 16 (decisiones), la 17 (pendientes) y una entrada nueva arriba en la 19.
   - `node tests/documentacion.mjs` falla si un archivo del repo no figura en el documento.
   - Las pruebas no se debilitan ni se borran: si una cambia, se explica con la palabra **cambiado** en la sección 19.
   - Un commit por punto, con el mensaje en español.

## 3. 🛠️ TRABAJO COMPLETADO (EL 90%)
- **Sitio público** (`index.html`, `assets/js/sitio/`):
  - Filtros encadenados, galería en cuadrícula o carrusel, detalle con carrusel por color, video y ficha técnica, y reseñas.
  - Pop-up con consentimiento que envía el pedido a GHL y abre WhatsApp con el mensaje exacto.
  - Banner de cookies con consentimiento previo, atribución UTM y píxel de Meta sin datos personales.
  - Globo de ayuda (`ayuda.js`).
  - País, moneda e idioma (es / pt-BR) según la tienda, y `?equipo=<id>`.
- **Panel `/admin`** (`assets/js/panel/`):
  - Roles: administrador (solo Usuarios) y gestor (todo lo demás).
  - Inicio con "Lo que falta" y "Ver intro".
  - Inventario con edición rápida, Editar y Duplicar, y **"Agregar equipo" como asistente de carga en lote** (`lote.js`, todo o nada, archivos compartidos).
  - Mi tienda (marca, logo, colores, título, país e idioma, reseñas).
  - Catálogo con cuatro pestañas: modelos y colores, ficha técnica, formas de pago y envíos. (El archivo XML de productos se quitó el 22/10/2026 a pedido de Jared: no se habilita por ahora.)
  - Asistente de Legales de 6 pasos que genera y publica los 4 documentos, con el módulo de Colombia.
  - Usuarios: invitar, cambiar el rol, desactivar y reactivar.
- **Base de datos**:
  - Migraciones `0001` a `0027` (la `0027` quita la columna del archivo XML), con RLS, disparadores, `datos_publicos()`, `borrar_datos_demo()`, `legal_faltantes()`, `crear_equipos_lote()` y `archivos_en_uso()`.
  - Funciones Deno: `enviar-lead` y `usuarios`.
- **Pruebas e infraestructura de prueba:**
  - Suites SQL, unitarias, de funciones, demo (Playwright), Supabase local y Lighthouse (`tests/lighthouse/`), todas en verde.
- **Documentos de apoyo:**
  - `DOCUMENTACION.md` (completa), `README.md`, `CLAUDE.md`, `legal/FUENTES.md`, `assets/videos/LEAME.md` y `catalogo/FALTANTES.md`.

Nada de esto requiere cambios. En particular, D a I de la ronda 3 están cerradas: commits `06c39fb`, `b211b96`, `0b669e9`, `1e5f61b`, `f531b97` y `d198071`.

## 4. 🚧 CONTEXTO DE ERRORES CONOCIDOS Y LIMITACIONES
No hay tests fallando ni configuraciones a medias. El código actual funciona y todas las suites están en verde. Limitaciones y pendientes conocidos (detalle en la sección 17 de `DOCUMENTACION.md`):
- **Bloqueante para tiendas fuera de Colombia:**
  - Solo existe el módulo legal de Colombia (`assets/js/legal/paises/co.js`).
  - Las tiendas nuevas nacen en Argentina (`PAIS_POR_DEFECTO = "ar"`): sin módulo, no pueden publicar sus legales y el pop-up no envía pedidos.
- **Primera visita en portugués:** sin idioma guardado (la primera vez en ese navegador), una tienda en portugués se ve en español hasta que llegan los datos. Desde la segunda visita sale en portugués (punto 1 hecho); el LCP en portugués es de 1,7–1,8 s simulado y 2,5 s con estrangulamiento real (sección 13 de `DOCUMENTACION.md`).
- **Correos por tienda:** los de invitación y recuperación están en español (`supabase/correos/`) y en portugués (`supabase/correos/pt/`, punto 2 hecho); se pegan a mano en el proyecto de Supabase de cada tienda, en su idioma.
- **CLS de 0,19 solo con la franja de modo demo** (rendimiento 91). Sin la franja, 0,045. Es una limitación aceptada: no hay que corregirla.
- **Datos de catálogo que faltan en la fuente:** colores, nombres en inglés, hexadecimales reales y fichas, listados en `catalogo/FALTANTES.md`. Esperan respuesta de Jared y **no se completan de memoria**.
- **Sin verificar con fuentes:** formatos de celular de 13 países, pasarelas por país y las traducciones al portugués ("cotizador" quedó "cotador").
- **Fuera del código:** Supabase real, GHL real, SMTP y GitHub Pages no están conectados (los hace el equipo de Jared).
- **Entorno:** en este contenedor el proxy bloquea jsDelivr, unpkg y esm.sh. Para la suite de Supabase local se usa un supabase-js armado con esbuild (`ICT_SUPABASE_JS`). **Nunca** usar `pkill -f` con un texto que aparezca en el mismo comando: mata la propia shell.

## 5. 🎯 DIRECTIVA EXACTA PARA OPENAI CODEX (NEXT ACTION)
1. ✅ **HECHO (Claude Code, 22/10/2026; ver la sección 19 de `DOCUMENTACION.md`).** **Primer pintado en portugués (sin información externa; hacerlo primero).**
   - En `assets/js/i18n/i18n.js`, `cargarIdioma()` ya guarda el idioma en `localStorage` (`idiomaGuardado()`).
   - En el sitio, antes de pedir los datos, cargar el idioma guardado: en `assets/js/sitio/principal.js` y `assets/js/sitio/legal.js`, llamar `await cargarIdioma(idiomaGuardado()); traducirDom();` al empezar, como ya hace `assets/js/panel/panel.js`. Después, si el idioma de la tienda difiere, recargar como hoy.
   - Agregar al script en línea del `<head>` de `index.html` y de las tres páginas legales que ponga `lang="pt-BR"` si el idioma guardado es `pt`.
   - Prueba nueva en `tests/verificar.cjs` (caso B4b): con el idioma guardado en `pt`, el primer `h1` pintado ya está en portugués. No romper el LCP: medir con `tests/lighthouse/medir.sh`.
2. ✅ **HECHO (Claude Code, 22/10/2026; ver la sección 19 de `DOCUMENTACION.md`).** **Correos en portugués (sin información externa).**
   - Crear `supabase/correos/pt/invitacion.html` y `supabase/correos/pt/recuperacion.html`, traducidos con "você" y las mismas variables de GoTrue que los de español.
   - Documentar en `supabase/correos/LEAME.md` cuándo cargar cada idioma (las plantillas son por proyecto de Supabase, es decir, por tienda).
   - Si `tests/supabase-local/levantar.sh` carga las plantillas, agregar el idioma por variable de entorno sin cambiar el comportamiento por defecto.
3. ⛔ **BLOQUEADO (revisado por Claude Code 3, 22/10/2026): `legal/FUENTES.md` no tiene ninguna fuente argentina y Jared no aprobó ninguna. No se construyó nada.** Para destrabarlo, Jared tiene que pasar o aprobar las fuentes oficiales (texto vigente de la Ley 25.326 y su decreto reglamentario, la disposición de la AAIP que corresponda y la Ley 24.240 con el arrepentimiento y la garantía), y alguien anotarlas en `legal/FUENTES.md` antes de escribir `ar.js`. **Módulo legal de Argentina, SOLO con fuentes oficiales verificadas y aprobadas por Jared.**
   - Si no hay fuentes oficiales abiertas y anotadas, no construirlo: dejarlo en pendientes. Las fuentes serían, por ejemplo, la Ley 25.326 y la Disposición AAIP aplicable, y la Ley 24.240 de defensa del consumidor (arrepentimiento y garantía).
   - Archivos a crear o editar: `assets/js/legal/paises/ar.js` (copiar la forma de `co.js`), `assets/js/legal/paises/indice.js` (`ar` en estado `disponible`), las plantillas de `assets/js/legal/plantillas/` solo si hace falta una sección por país, y `legal/FUENTES.md` (cada dato con su fuente).
   - Base de datos: una migración nueva **`supabase/migrations/0028_legal_ar.sql`** (la `0027` ya se usó para quitar el archivo XML) que actualice `legal_faltantes()` (lo que hacen hoy `0016` y `0019`).
   - Pruebas: `tests/legal/motor.test.mjs`, `tests/sql/pruebas.sql` y `tests/sql/comparar-faltantes.mjs` (el SQL y el JS deben coincidir).
4. ⛔ **BLOQUEADO (revisado por Claude Code 3, 22/10/2026): Jared todavía no respondió `catalogo/FALTANTES.md`. No se tocó el catálogo.** **Completar el catálogo cuando Jared responda `catalogo/FALTANTES.md`. No antes.**
   - Una migración nueva (la siguiente libre) con los colores, los nombres en inglés, los hexadecimales con fuente (que dejan de ser `hex_aproximado`) y las filas de ficha.
   - El mismo cambio en `assets/js/datos/semilla.js` (`COLORES`, `FICHAS`, `HEX_APROXIMADOS`), en la migración del demo (`demo.js`: `VERSION` 23 y `MIGRACIONES[22]`) y en `tests/sql/comparar-semilla.mjs`.
   - Nada se completa de memoria.
5. **Cierre de cada punto.**
   - Actualizar `DOCUMENTACION.md`: sección 5, sección temática, 16, 17 (quitar lo resuelto), entrada nueva en la 19 y la fecha.
   - Al día también los conteos de `README.md` y `CLAUDE.md` (casos de la suite y próxima migración).
   - Correr el comando de verificación completo; `tests/verificar-supabase.cjs` si se tocó el SQL o `supabase.js`.
   - Un commit por punto en español, con push a `claude/gallant-euler-ezco6g`.

**Prohibido tocar:**
- `supabase/migrations/0001` a `0027`: son inmutables; los cambios van en migraciones nuevas.
- Los textos literales del prompt en `assets/js/sitio/popup.js` y `assets/js/sitio/catalogo.js`, y el mensaje de WhatsApp.
- `config.js`: solo lleva la conexión y el script de GHL; nunca datos de la tienda ni claves.
- Las pruebas existentes: no se debilitan ni se borran.
- Los colores y las fichas: no se inventan, y `COLORES` de `semilla.js` no se cambia sin fuente.
- Lo ya cerrado y estable, salvo un bug comprobado con una prueba que falle: `assets/js/panel/lote.js`, `assets/js/panel/inventario.js`, `assets/js/sitio/ayuda.js`, `assets/js/sitio/consentimiento.js`, `assets/js/legal/paises/co.js` y `supabase/functions/`.
- No crear `package.json` ni agregar build o dependencias npm al proyecto.
- No abrir PR ni escribir en `main` sin pedido explícito de Jared.
