# 🤖 AI SYSTEM STATE & HANDOFF CONTEXT
> LECTURA OBLIGATORIA PARA EL AGENTE ENTRANTE (Codex, Claude u otro): Lee este documento antes de ejecutar comandos o proponer código.

## 1. 🚦 ESTADO ACTUAL (METADATA)
- **Último Agente:** Claude Code 4 (quitó el archivo XML, preparó la investigación con Gemini y ejecuta el plan de 9 puntos de la sección 5: puntos 1 a 3 hechos; sigue el 4).
- **Timestamp:** 2026-10-23 (actualizado por Claude Code 4).
- **Rama Actual:** `claude/gallant-euler-ezco6g` (último commit de esta tanda: ver `git log`; árbol limpio y sincronizado con `origin` al cerrar cada punto). `main` solo tiene el README inicial: **no** trabajar sobre `main` ni abrir PR sin que Jared lo pida.
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
2. **Dos back-ends con la misma interfaz y las mismas reglas.** `assets/js/datos/api.js` elige `demo.js` (localStorage e IndexedDB) o `supabase.js` según `config.js`. Toda regla nueva va **en el SQL (migración nueva) y en `demo.js`**, con mensajes iguales. La seguridad real está en el SQL (RLS con `es_gestor()` / `es_administrador()` y disparadores). Las migraciones de `supabase/migrations/` son inmutables; la próxima libre es **`0030_…sql`**. Si cambia la forma de los datos del demo, se sube `VERSION` en `demo.js` (hoy 24) con su `MIGRACIONES[n]`.
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
  - Migraciones `0001` a `0029` (la `0027` quita la columna del archivo XML; la `0028`, colores según Apple; la `0029`, fichas según Apple), con RLS, disparadores, `datos_publicos()`, `borrar_datos_demo()`, `legal_faltantes()`, `crear_equipos_lote()` y `archivos_en_uso()`.
  - Funciones Deno: `enviar-lead` y `usuarios`.
- **Pruebas e infraestructura de prueba:**
  - Suites SQL, unitarias, de funciones, demo (Playwright), Supabase local y Lighthouse (`tests/lighthouse/`), todas en verde.
- **Documentos de apoyo:**
  - `DOCUMENTACION.md` (completa), `README.md`, `CLAUDE.md`, `legal/FUENTES.md`, `assets/videos/LEAME.md` y `catalogo/FALTANTES.md`.

Nada de esto requiere cambios. En particular, D a I de la ronda 3 están cerradas: commits `06c39fb`, `b211b96`, `0b669e9`, `1e5f61b`, `f531b97` y `d198071`.

## 4. 🚧 CONTEXTO DE ERRORES CONOCIDOS Y LIMITACIONES
No hay tests fallando ni configuraciones a medias. El código actual funciona y todas las suites están en verde. Limitaciones y pendientes conocidos (detalle en la sección 17 de `DOCUMENTACION.md`):
- **Bloqueante para tiendas fuera de Colombia** (el punto 6 lo resuelve para Argentina):
  - Solo existe el módulo legal de Colombia (`assets/js/legal/paises/co.js`).
  - Las tiendas nuevas nacen en Argentina (`PAIS_POR_DEFECTO = "ar"`): sin módulo, no pueden publicar sus legales y el pop-up no envía pedidos.
- **Primera visita en portugués:** sin idioma guardado (la primera vez en ese navegador), una tienda en portugués se ve en español hasta que llegan los datos. Desde la segunda visita sale en portugués (punto 1 hecho); el LCP en portugués es de 1,7–1,8 s simulado y 2,5 s con estrangulamiento real (sección 13 de `DOCUMENTACION.md`).
- **Correos por tienda:** los de invitación y recuperación están en español (`supabase/correos/`) y en portugués (`supabase/correos/pt/`, punto 2 hecho); se pegan a mano en el proyecto de Supabase de cada tienda, en su idioma.
- **CLS de 0,19 solo con la franja de modo demo** (rendimiento 91). Sin la franja, 0,045. Es una limitación aceptada: no hay que corregirla.
- **Datos de catálogo que faltan:** la descripción de los modelos y los hexadecimales oficiales, que Apple no publica (`catalogo/FALTANTES.md`). **No se completan de memoria**.
- **Sin verificar con fuentes:** los formatos de celular y las pasarelas por país se corrigen en los puntos 7 y 8. Siguen sin verificar las traducciones al portugués ("cotizador" quedó "cotador").
- **Fuera del código:** Supabase real, GHL real, SMTP y GitHub Pages no están conectados (los hace el equipo de Jared).
- **Entorno:** en este contenedor el proxy bloquea jsDelivr, unpkg y esm.sh. Para la suite de Supabase local se usa un supabase-js armado con esbuild (`ICT_SUPABASE_JS`). **Nunca** usar `pkill -f` con un texto que aparezca en el mismo comando: mata la propia shell.

## 5. 🎯 DIRECTIVA EXACTA PARA EL PRÓXIMO AGENTE (NEXT ACTION)

> **Origen (23/10/2026):** Jared investigó con Gemini Deep Research (prompts en el artefacto «Investigación con Gemini», dos rondas, 13 informes). Claude Code 4 revisó los informes con criterio, descartó lo incoherente y propuso un plan de 9 puntos. Jared respondió **"1. sí 2. borgoña 3. no lo sé"**: aprobó los 9 puntos, eligió "Borgoña" para el 18 Pro y no sabe si hay cláusulas de transferencia de la AAIP firmadas con HighLevel. Por eso, en Argentina el pop-up pide **consentimiento expreso para la transferencia a EE. UU.** (sirve haya o no cláusulas). **Los datos aceptados están copiados abajo, en cada punto.** Los informes no están en el repo. Lo que no está acá no se acepta: no completar de memoria.
>
> **Regla de cierre de Jared:** al llegar al 90 % del límite de la sesión, terminar el punto en curso, documentarlo en `DOCUMENTACION.md` y dejar este archivo al día para que el siguiente agente siga como si fuera el mismo.
>
> **Antes de tocar nada:** ya hecho en esta tanda: el archivo XML se quitó (`aec4c38`), punto 1 (`9ba61be`), punto 2 (`6932c64`) y punto 3 (ver `git log`: "punto 3"). **Sigue el punto 4.**

1. ✅ **HECHO (`9ba61be`).** `legal/FUENTES.md` corregido y completado: fuentes de Colombia 14 a 18 (transporte de la devolución, reversión del pago, enlace a la SIC, PQR con radicado, RNE) y estados al día.
2. ✅ **HECHO (`6932c64`).** Colores según Apple: `0028_colores_apple.sql`, `semilla.js` y `demo.js` (`VERSION` 23).
3. ✅ **HECHO (`0029_fichas_apple.sql`, `FICHAS_APPLE` en `semilla.js`, demo `VERSION` 24).** Lo que sigue es el registro de lo que se cargó. **Fichas: batería, cámaras y medidas.**
   - Una migración nueva (`0029_fichas_apple.sql`) que **agregue la fila de una categoría solo si la ficha del modelo no tiene esa clave**: lo que cargó la tienda no se toca.
   - Lo mismo en `FICHAS` de `semilla.js` (filas en el orden de `CATEGORIAS_FICHA`) y en `demo.js` (`VERSION` 24 y `MIGRACIONES[23]`, misma regla). `tests/sql/comparar-semilla.mjs` compara SQL y JS; agregar una prueba en `pruebas.sql` de que una ficha con la clave ya cargada no cambia.
   - **No cargar los mAh** (Apple no los publica; los de Gemini son de terceros).
   - Fuente: fichas de soporte de Apple (número de artículo entre paréntesis). Valores aceptados (video / video en streaming / audio, en horas; "carga" = 50 % con el adaptador indicado):
     - 7 (111943): video 13, audio 40. 7 Plus (111953): video 14, audio 60. 8 (111976): video 13, audio 40, carga 30 min. 8 Plus (111950): video 14, audio 60, carga 30 min con 18 W. X: video 13, audio 60, carga 30 min. XS: video 14, audio 60, carga 30 min con 18 W. XS Max (111880): video 15, audio 65, carga 30 min con 18 W. XR (111868): video 16, audio 65, carga 30 min con 20 W.
     - 11 (111865): 17/10/65. 11 Pro (111879): 18/11/65. 11 Pro Max (111878): 20/12/80. SE 2.ª (111882): 13/8/40. Todos con carga 30 min con 18 W (11: 20 W).
     - 12 mini (111877): 15/10/50. 12 (111876): 17/11/65. 12 Pro (111875): 17/11/65. 12 Pro Max (111874): 20/12/80. 13 mini (111873): 17/13/55. 13 (111872): 19/15/75. 13 Pro (111871): 22/20/75. 13 Pro Max (111870): 28/25/95, carga 35 min. SE 3.ª: 15/10/50. Todos con carga 30 min con 20 W salvo lo indicado.
     - 14 (111850): 20/16/80. 14 Plus (111851): 26/20/100, 35 min. 14 Pro (111849): 23/20/75. 14 Pro Max (111848): 29/25/95, 35 min. 15 (111831): 20/16/80. 15 Plus (111830): 26/20/100, 35 min. 15 Pro (111829): 23/20/75. 15 Pro Max (111828): 29/25/95, 35 min. Carga con 20 W.
     - 16 (121029): 22/18/80. 16 Plus (120281): 27/24/100. 16 Pro (120283): 27/22/85. 16 Pro Max (120284): 33/29/105, 35 min. 16e (122208): 26/21/90. Carga 30 min con 20 W.
     - 17 (125089): video 30, streaming 27, carga 20 min con 40 W. Air (125092): video 27 (40 con la batería MagSafe del iPhone Air), streaming 22 (35 con esa batería), carga 30 min con 20 W. 17 Pro (125090): streaming 28, carga 20 min con 40 W. 17 Pro Max (125091): streaming 35, carga 20 min con 40 W. 17e (126470): video 26, streaming 21, carga 30 min con 20 W.
     - 18 Pro (148590): streaming 33, carga 50 % en unos 15 min con 60 W. 18 Pro Max (148591): streaming 40, misma carga. (El informe de la ronda 1 daba otros números para el 18 Pro con el artículo del Max: **descartado**.)
     - Duo (148588): uso típico hasta 24 h; video 44 (pantalla exterior) / 31 (interior); streaming 37 / 26; doble batería; carga 50 % en 20 min con 60 W.
   - **Cámara frontal:** 17: 18 MP Center Stage (sensor cuadrado). 17 Pro, 17 Pro Max, 18 Pro y 18 Pro Max: 18 MP Center Stage, ƒ/1.9, autoenfoque con Focus Pixels. Duo: 18 MP Center Stage en la pantalla exterior y cámara FaceTime bajo la pantalla interior.
   - **Cámaras traseras del Duo:** Fusion principal de 48 MP (teleobjetivo 2x de calidad óptica) y Fusion ultra gran angular de 48 MP. La fila de la tienda "Sistema de cámaras" ya existe: no se borra.
   - **Dimensiones:** 17 Pro 150.0 × 71.9 × 8.75 mm, 206 g. 17 Pro Max 163.4 × 78.0 × 8.75 mm, 231 g. 18 Pro 150.0 × 71.9 × 8.75 mm, 211 g. 18 Pro Max 163.4 × 78.0 × 8.75 mm, 249 g. Duo abierto 117.8 × 164.6 × 5.2 mm, cerrado 117.8 × 84.1 × 11.3 mm, 254 g.
   - Al terminar: regenerar `catalogo/FALTANTES.md` (quedan la descripción de los modelos y los hexadecimales oficiales).
4. **Colombia: términos y enlace a la SIC** (fuentes 8, 9, 14, 15 y 16 de `legal/FUENTES.md`).
   - Plantillas de términos (`assets/js/legal/plantillas/` y `paises/co.js`): el transporte de la devolución por retracto lo paga el consumidor (Ley 1480 art. 47); plazos de la garantía como en la fuente 9 (respuesta 15 días hábiles; reparación 30, o 60 con equipo de préstamo; cambio 10; devolución del dinero 15); cláusula de reversión del pago (art. 51; 5 días hábiles para pedirla; se debe informar).
   - Usados vendidos "con garantía": mínimo 3 meses (Decreto 735 art. 12). Validarlo en el SQL (migración nueva) y en `demo.js`.
   - Enlace a la SIC en el pie del sitio solo para tiendas de Colombia (art. 50 lit. d), con su texto en `i18n/es.js` y `pt.js`.
   - RNE (Ley 2300, Res. CRC 7120/2023): solo en la guía de GHL (sección 12.3 de `DOCUMENTACION.md`), no en el código.
5. **Formulario de solicitudes con código.** PQR con radicado en Colombia (fuente 17, para que la revise el abogado) y "BOTÓN DE ARREPENTIMIENTO" en Argentina (Disp. 954/2025: en la portada, sin registrarse, da un código en 24 h). Los datos van **solo a GHL por `enviar-lead`** (nunca a Supabase). El código se arma con `generarCodigo` (ya existe) y se muestra al cliente.
6. **Módulo legal de Argentina** (`paises/ar.js` con la forma de `co.js`, `indice.js` con `ar` disponible, migración nueva para `legal_faltantes()`, `motor.test.mjs`, `pruebas.sql`, `comparar-faltantes.mjs`, y una sección de Argentina en `legal/FUENTES.md` con cada dato y su fuente).
   - **Arrepentimiento:** 10 días corridos desde la entrega o el contrato (lo último); la devolución la paga el proveedor (Ley 24.240 art. 34; CCyC arts. 1110 a 1116).
   - **Garantía:** 6 meses los nuevos y 3 los usados; un usado no se puede vender sin garantía.
   - **Entrega:** sin plazo pactado son 24 h (CCyC art. 1147). Pedir el plazo de la tienda.
   - **Edad mínima:** 18 años.
   - **Autoridad de consumo:** Subsecretaría de Defensa del Consumidor y Lealtad Comercial.
   - **Datos personales:** autoridad AAIP. Acceso en 10 días corridos; rectificación y supresión en 5 hábiles.
   - **Leyenda de la AAIP (Res. AAIP 14/2018, Anexo II), textual:** «LA AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.»
   - **RNBD:** la inscripción es obligatoria y gratuita. Pedir el número en el asistente y mostrarlo.
   - **Transferencia a EE. UU. (GHL):** Res. AAIP 159/2018. Decisión: consentimiento expreso en el pop-up de Argentina, en una casilla aparte.
   - **Data Fiscal (RG AFIP 3377 arts. 26 y 27):** el enlace y la imagen del QR los carga la tienda. Sin imágenes de otros dominios.
   - **Pie del sitio:** «Defensa de las y los consumidores. Para reclamos ingrese aquí» (Res. SCI 271/2020), con enlace a https://www.argentina.gob.ar/iniciar-un-reclamo-ante-defensa-de-las-y-los-consumidores.
   - **Precios:** finales con IVA. No hace falta cambiar nada.
   - **Equipos:** homologación ENACOM (RAMATEL) e IMEI fuera de la Base Negativa (Res. ENACOM 2459/2016). Va como texto en los términos.
   - **Documentos:** DNI de 7 u 8 dígitos. CUIT/CUIL de 11 dígitos, con prefijos 20, 23, 24, 27, 30, 33 o 34 y dígito verificador módulo 11 con pesos [5,4,3,2,7,6,5,4,3,2].
7. **Pagos por país** (migración nueva para el check de `pagos_pasarelas` y `assets/js/datos/pagos.js` o donde estén las listas; `tests/pagos.test.mjs`).
   - **Pasarelas:** quitar dLocal. Stripe solo en BR y MX. PayU solo en AR, BR, CL, CO, MX, PA y PE. PayPal en todos menos Cuba.
   - **Métodos que se mantienen o se anotan:** PSE y OXXO Pay se mantienen. Agregar la nota de Cuenta DNI (solo CABA y PBA).
   - **Listas por país** (sin genéricos):
     - BO: QR Simple, Tigo Money, Libélula.
     - CR: SINPE Móvil, Compra-Click, Wink.
     - CU: Transfermóvil, EnZona, Tropipay.
     - EC: Deuna!, Payphone, Peigo, Kushki.
     - SV: Transfer365, Wompi SV, Chivo Wallet, Tigo Money, Pagadito.
     - GT: Fri, Visa en Link, QPayPro.
     - HN: ACH Pronto, Tengo, Tigo Money, Compra-Click, PixelPay.
     - NI: Billetera Banpro, Compra-Click, Pagadito.
     - PA: Yappy, ACH Xpress, Nequi Panamá, Cuanto, Compra-Click.
     - PY: Tigo Money, Zimple, Bancard vPOS, Billetera Personal.
     - DO: tPago, Azul, CardNET.
     - UY: Prex, MiDinero, Paganza, Mercado Pago, Redpagos/Abitab.
     - VE: Pago Móvil, Zinli, Binance Pay, BiopagoBDV.
8. **WhatsApp** (SQL `whatsapp_valido` en una migración nueva + `assets/js/datos/paises.js`; `tests/paises.test.mjs` y `comparar-paises` deben coincidir).
   - México: en el enlace `wa.me` va "1" después de 52 (`enlaceWhatsApp` en `sitio/catalogo.js`). El número guardado sigue siendo 52 + 10 dígitos.
   - Formatos verificados: SV `^[67]\d{7}$`, BO `^[67]\d{7}$`, CR `^[5-8]\d{7}$`, EC `^9\d{8}$`.
   - EC, PY, UY y VE: quitar el 0 inicial (prefijo troncal).
   - El WhatsApp de la tienda acepta fijos (WhatsApp Business); el del cliente no cambia.
9. **Reseñas: registrar la autorización** (opción a). Por reseña, la fecha, el canal y el alcance de la autorización del cliente, sin datos del cliente. Va en una migración nueva, `demo.js` y el panel (`assets/js/panel/`), con textos en `i18n`.
10. **Cierre de cada punto.**
    - Actualizar `DOCUMENTACION.md`: sección 5, sección temática, 16, 17 (quitar lo resuelto), entrada nueva en la 19 y la fecha.
    - Mantener al día los conteos de `README.md`, `CLAUDE.md` y este archivo (próxima migración, `VERSION` del demo, punto ✅ con su commit).
    - Correr el comando de verificación. Si se tocó el SQL o `supabase.js`, correr también `tests/verificar-supabase.cjs`.
    - Un commit por punto en español, con push a `claude/gallant-euler-ezco6g`.

**Prohibido tocar:**
- `supabase/migrations/0001` a `0029`: son inmutables; los cambios van en migraciones nuevas.
- Los textos literales del prompt en `assets/js/sitio/popup.js` y `assets/js/sitio/catalogo.js`, y el mensaje de WhatsApp.
- `config.js`: solo lleva la conexión y el script de GHL; nunca datos de la tienda ni claves.
- Las pruebas existentes: no se debilitan ni se borran.
- Los colores y las fichas: no se inventan, y `COLORES` de `semilla.js` no se cambia sin fuente.
- Lo ya cerrado y estable, salvo un bug comprobado con una prueba que falle: `assets/js/panel/lote.js`, `assets/js/panel/inventario.js`, `assets/js/sitio/ayuda.js`, `assets/js/sitio/consentimiento.js`, `assets/js/legal/paises/co.js` (salvo lo que piden los puntos 4 y 5 de la sección 5) y `supabase/functions/` (salvo lo que pide el punto 5).
- No crear `package.json` ni agregar build o dependencias npm al proyecto.
- No abrir PR ni escribir en `main` sin pedido explícito de Jared.
