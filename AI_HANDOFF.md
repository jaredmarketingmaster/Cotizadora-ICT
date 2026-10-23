# 🤖 AI SYSTEM STATE & HANDOFF CONTEXT
> LECTURA OBLIGATORIA PARA EL AGENTE ENTRANTE (Codex, Claude u otro): Lee este documento antes de ejecutar comandos o proponer código.

## 1. 🚦 ESTADO ACTUAL (METADATA)
- **Último Agente:** Claude Code 4. Quitó el archivo XML, preparó la investigación con Gemini y ejecutó el plan de 9 puntos de la sección 5: **los 9 puntos están hechos**. La sesión se cortó una vez al 83 % y siguió con tokens renovados. Después: roles corregidos (`0035`) y, en curso, la v1.1 con las imágenes predeterminadas (punto 11 de la sección 5). Lo demás que queda está en "Siguiente".
- **Timestamp:** 2026-10-23 (actualizado por Claude Code 4).
- **Rama Actual:** `claude/gallant-euler-ezco6g` (último commit de esta tanda: ver `git log`; árbol limpio y sincronizado con `origin` al cerrar cada punto). `main` solo tiene el README inicial: **no** trabajar sobre `main` ni abrir PR sin que Jared lo pida.
- **Estado del Build:** VERDE. No hay build ni `package.json`: es un sitio estático sin npm ni compilación, a propósito. "Verde" significa que pasan todas las suites del 23/10/2026 (después del punto 9): SQL OK, las 6 suites sin navegador OK (1178 claves), funciones Deno OK, `tests/verificar.cjs` 85/85 (86 con `ICT_CAPTURAS=1`), `tests/verificar-supabase.cjs` OK y `tests/documentacion.mjs` OK. Una corrida de `verificar.cjs` tuvo 1 falla intermitente que no se repitió ni se identificó: si aparece, mirar qué caso es antes de tocar nada. Lighthouse móvil del 23/10, después del plan: 100 / 100 / 100.
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
2. **Dos back-ends con la misma interfaz y las mismas reglas.** `assets/js/datos/api.js` elige `demo.js` (localStorage e IndexedDB) o `supabase.js` según `config.js`. Toda regla nueva va **en el SQL (migración nueva) y en `demo.js`**, con mensajes iguales. La seguridad real está en el SQL (RLS con `es_gestor()` / `es_administrador()` y disparadores). Las migraciones de `supabase/migrations/` son inmutables; la próxima libre es **`0036_…sql`**. Si cambia la forma de los datos del demo, se sube `VERSION` en `demo.js` (hoy 27) con su `MIGRACIONES[n]`.
3. **Idioma y textos.** Español de Colombia con **"usted"** (nunca "tú" ni voseo) y portugués de Brasil con "você". **Ningún texto visible suelto en el código:** todo va en `assets/js/i18n/es.js` y `pt.js`, con las mismas claves y variables, y se usa con `t(clave)` / `tn(clave, n)`. `t()` se llama al usar el texto, nunca al cargar el módulo. Los textos literales del prompt (en `popup.js` y `catalogo.js`, ver `CLAUDE.md`) no se reescriben.
4. **Reglas de producto que la suite hace cumplir** (la suite demo tiene hoy 85 casos):
   - No inventar datos (especificaciones, colores, precios, plazos ni promesas): lo que la fuente no trae queda vacío.
   - Nada de la marca Apple: sin logo, íconos ni tipografías; solo `apple.com/co` como referencia de texto. **Excepción v1.1:** las imágenes predeterminadas de `assets/img/predeterminadas/` (solo WebP, de Jared).
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
  - Roles (desde `0035`): el administrador hace todo lo del gestor y, además, Usuarios; el gestor no ve Usuarios.
  - Inicio con "Lo que falta" y "Ver intro".
  - Inventario con edición rápida, Editar y Duplicar, y **"Agregar equipo" como asistente de carga en lote** (`lote.js`, todo o nada, archivos compartidos).
  - Mi tienda (marca, logo, colores, título, país e idioma, reseñas).
  - Catálogo con cuatro pestañas: modelos y colores, ficha técnica, formas de pago y envíos. (El archivo XML de productos se quitó el 22/10/2026 a pedido de Jared: no se habilita por ahora.)
  - Asistente de Legales de 6 pasos que genera y publica los 4 documentos, con los módulos de Colombia y Argentina.
  - Página `/solicitudes/` (PQR con radicado en Colombia; botón de arrepentimiento en Argentina).
  - Usuarios: invitar, cambiar el rol, desactivar y reactivar.
- **Base de datos**:
  - Migraciones `0001` a `0031` (la `0027` quita la columna del archivo XML; la `0028`, colores según Apple; la `0029`, fichas según Apple; la `0030`, mínimo de garantía de usados en Colombia; la `0031`, módulo legal de Argentina; la `0032`, pasarelas por país; la `0033`, WhatsApp de la tienda; la `0034`, autorización de las reseñas; la `0035`, el administrador también gestiona la tienda), con RLS, disparadores, `datos_publicos()`, `borrar_datos_demo()`, `legal_faltantes()`, `crear_equipos_lote()` y `archivos_en_uso()`.
  - Funciones Deno: `enviar-lead` y `usuarios`.
- **Pruebas e infraestructura de prueba:**
  - Suites SQL, unitarias, de funciones, demo (Playwright), Supabase local y Lighthouse (`tests/lighthouse/`), todas en verde.
- **Documentos de apoyo:**
  - `DOCUMENTACION.md` (completa), `README.md`, `CLAUDE.md`, `legal/FUENTES.md`, `assets/videos/LEAME.md` y `catalogo/FALTANTES.md`.

Nada de esto requiere cambios. En particular, D a I de la ronda 3 están cerradas: commits `06c39fb`, `b211b96`, `0b669e9`, `1e5f61b`, `f531b97` y `d198071`.

## 4. 🚧 CONTEXTO DE ERRORES CONOCIDOS Y LIMITACIONES
No hay tests fallando ni configuraciones a medias. El código actual funciona y todas las suites están en verde. Limitaciones y pendientes conocidos (detalle en la sección 17 de `DOCUMENTACION.md`):
- **Tiendas fuera de Colombia y Argentina:** solo existen esos dos módulos legales (`co.js` y `ar.js`). Una tienda de otro país no puede publicar sus legales y su pop-up no envía pedidos. Las tiendas nuevas nacen en Argentina (`PAIS_POR_DEFECTO = "ar"`), que ya tiene módulo.
- **Primera visita en portugués:** sin idioma guardado (la primera vez en ese navegador), una tienda en portugués se ve en español hasta que llegan los datos. Desde la segunda visita sale en portugués (punto 1 hecho); el LCP en portugués es de 1,7–1,8 s simulado y 2,5 s con estrangulamiento real (sección 13 de `DOCUMENTACION.md`).
- **Correos por tienda:** los de invitación y recuperación están en español (`supabase/correos/`) y en portugués (`supabase/correos/pt/`, punto 2 hecho); se pegan a mano en el proyecto de Supabase de cada tienda, en su idioma.
- **CLS de 0,19 solo con la franja de modo demo** (rendimiento 91). Sin la franja, 0,045. Es una limitación aceptada: no hay que corregirla.
- **Datos de catálogo que faltan:** la descripción de los modelos y los hexadecimales oficiales, que Apple no publica (`catalogo/FALTANTES.md`). **No se completan de memoria**.
- **Sin verificar contra el original:** todo lo que vino de los informes de Gemini (fuentes legales de Colombia y Argentina, fichas, colores y pasarelas) se revisó por coherencia, no contra las páginas oficiales: el proxy del entorno bloquea infoleg, el Boletín Oficial, el sitio de Apple y las páginas de las pasarelas. Tampoco están verificados los formatos de celular de 9 países (Cuba, Guatemala, Honduras, Nicaragua, Panamá, Paraguay, República Dominicana, Uruguay y Venezuela) ni las traducciones al portugués ("cotizador" quedó "cotador").
- **Prueba intermitente:** una corrida de `tests/verificar.cjs` (durante el punto 5) tuvo 1 falla que no mostró qué caso era y no se repitió en las corridas completas que siguieron (todas las fallas posteriores fueron pruebas que había que ajustar por un cambio, y se ajustaron). Si vuelve a aparecer, guardar la salida completa y mirar el caso antes de tocar nada.
- **Lighthouse:** medido el 23/10/2026, después del plan: 100 / 100 / 100, LCP 1,2–1,4 s, CLS 0,045 (sección 13 de `DOCUMENTACION.md`).
- **Fuera del código:** Supabase real, GHL real, SMTP y GitHub Pages no están conectados (los hace el equipo de Jared).
- **Entorno:** en este contenedor el proxy bloquea jsDelivr, unpkg y esm.sh. Para la suite de Supabase local se usa un supabase-js armado con esbuild (`ICT_SUPABASE_JS`). **Nunca** usar `pkill -f` con un texto que aparezca en el mismo comando: mata la propia shell.

## 5. 🎯 DIRECTIVA EXACTA PARA EL PRÓXIMO AGENTE (NEXT ACTION)

> **Origen (23/10/2026):** Jared investigó con Gemini Deep Research (prompts en el artefacto «Investigación con Gemini», dos rondas, 13 informes). Claude Code 4 revisó los informes con criterio, descartó lo incoherente y propuso un plan de 9 puntos. Jared respondió **"1. sí 2. borgoña 3. no lo sé"**: aprobó los 9 puntos, eligió "Borgoña" para el 18 Pro y no sabe si hay cláusulas de transferencia de la AAIP firmadas con HighLevel. Por eso, en Argentina el pop-up pide **consentimiento expreso para la transferencia a EE. UU.** (sirve haya o no cláusulas). **Los datos aceptados están copiados abajo, en cada punto.** Los informes no están en el repo. Lo que no está acá no se acepta: no completar de memoria.
>
> **Regla de cierre de Jared:** al llegar al 90 % del límite de la sesión (Claude Code 4 cerró al 83 %, cuando Jared avisó), terminar el punto en curso, documentarlo en `DOCUMENTACION.md` y dejar este archivo al día para que el siguiente agente siga como si fuera el mismo.
>
> **Antes de tocar nada:** ya hecho en esta tanda: el archivo XML se quitó (`aec4c38`), punto 1 (`9ba61be`), punto 2 (`6932c64`) punto 3 (`68b3421`) punto 4 (`1247ac2`) punto 5 (`55c3af7`), punto 6 (`f18ab69`) punto 7 (`81b3519`), punto 8 (`2674e2a`) y punto 9 (ver `git log`: "punto 9"). **El plan está terminado: seguir con "Siguiente", al final de esta sección.** Antes de empezar, correr el comando de verificación para confirmar que todo sigue en verde.

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
4. ✅ **HECHO (`0030_garantia_usados_co.sql`; detalle en la sección 19 de `DOCUMENTACION.md`). Queda como registro.** **Colombia: términos y enlace a la SIC** (fuentes 8, 9, 14, 15 y 16 de `legal/FUENTES.md`). El enlace va por `AUTORIDAD_CONSUMIDOR` de `paises.js` (en el punto 6, agregar `ar`), y la reversión del pago, por `terminos.reversion` del módulo del país.
   - Plantillas de términos (`assets/js/legal/plantillas/` y `paises/co.js`): el transporte de la devolución por retracto lo paga el consumidor (Ley 1480 art. 47); plazos de la garantía como en la fuente 9 (respuesta 15 días hábiles; reparación 30, o 60 con equipo de préstamo; cambio 10; devolución del dinero 15); cláusula de reversión del pago (art. 51; 5 días hábiles para pedirla; se debe informar).
   - Usados vendidos "con garantía": mínimo 3 meses (Decreto 735 art. 12). Validarlo en el SQL (migración nueva) y en `demo.js`.
   - Enlace a la SIC en el pie del sitio solo para tiendas de Colombia (art. 50 lit. d), con su texto en `i18n/es.js` y `pt.js`.
   - RNE (Ley 2300, Res. CRC 7120/2023): solo en la guía de GHL (sección 12.3 de `DOCUMENTACION.md`), no en el código.
5. ✅ **HECHO (página `/solicitudes/`; detalle en la sección 19 de `DOCUMENTACION.md`).** Para Argentina, en el punto 6: agregar `ar: ["arrepentimiento"]` (y los que correspondan) a `SOLICITUDES` de `paises.js`, la clave `solicitudes.titulo.ar` en `es.js` y `pt.js` y, si la Disp. 954/2025 lo pide, un enlace "BOTÓN DE ARREPENTIMIENTO" visible en la portada (`index.html` / `principal.js`). La función `enviar-lead` ya acepta `arrepentimiento`. **Formulario de solicitudes con código.** PQR con radicado en Colombia (fuente 17, para que la revise el abogado) y "BOTÓN DE ARREPENTIMIENTO" en Argentina (Disp. 954/2025: en la portada, sin registrarse, da un código en 24 h). Los datos van **solo a GHL por `enviar-lead`** (nunca a Supabase). El código se arma con `generarCodigo` (ya existe) y se muestra al cliente.
6. ✅ **HECHO (`0031_legal_ar.sql`, `ar.js`; detalle en la sección 19 de `DOCUMENTACION.md`). Queda como registro. Pendientes del módulo (sección 17): revisión de un abogado argentino, la imagen del Data Fiscal, los datos de inscripción de personas jurídicas argentinas y el formato de los fijos argentinos.** **Módulo legal de Argentina** (`paises/ar.js` con la forma de `co.js`, `indice.js` con `ar` disponible, migración nueva para `legal_faltantes()`, `motor.test.mjs`, `pruebas.sql`, `comparar-faltantes.mjs`, y una sección de Argentina en `legal/FUENTES.md` con cada dato y su fuente).
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
7. ✅ **HECHO (`0032_pasarelas_pais.sql`, `assets/js/datos/pasarelas.js`, demo `VERSION` 26; detalle en la sección 19 de `DOCUMENTACION.md`). Queda como registro.** **Pagos por país.**
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
8. ✅ **HECHO (`0033_whatsapp.sql`; detalle en la sección 19 de `DOCUMENTACION.md`). Queda como registro. Se hizo con `whatsappValido()` como validación del WhatsApp de la tienda (celular o fijo) y `celularNacionalValido()` para el cliente (solo celular, con `sinCeroInicial()`).** **WhatsApp: México, formatos verificados, 0 inicial y fijos de la tienda.** Datos aceptados de los informes (ronda 2, celulares): solo estos; el resto del informe se descartó por decir "CONFIRMADO" sin fuente.
   - **Dónde está hoy:**
     - En `assets/js/datos/paises.js`: `PAISES_TIENDA[c].celular` (`internacional`, `visible`, `nacional`, `grupos`, `ejemplo`, `verificado`), `celularNacionalValido()`, `celularInternacional()`, `agruparCelular()` y `whatsappValido(numero, pais)`. `whatsappValido` valida el WhatsApp **de la tienda** (Mi tienda) y el del cliente pasa por `celularNacionalValido`.
     - En el SQL, `whatsapp_valido()` está en `supabase/migrations/0018_pais.sql`.
     - `tests/sql/comparar-paises.mjs` (lo corre `probar.sh`) compara JS y SQL con 285 casos.
     - `enlaceWhatsApp(numero, mensaje)` está en `assets/js/sitio/catalogo.js` (línea ~180). Ese archivo tiene textos literales del prompt: tocar **solo** el armado del enlace.
   - **Qué hacer:**
     1. **México:** en el enlace `wa.me` va un "1" después del 52 (`https://wa.me/521XXXXXXXXXX`). El número guardado sigue siendo 52 + 10 dígitos, y la validación no cambia. Hacerlo en `enlaceWhatsApp` (recibe el número internacional guardado): si empieza por `52` y tiene 12 dígitos, insertar el `1`.
     2. **Formatos verificados** (nacional, sin prefijo; marcar `verificado: true` con su `ejemplo` y sus `grupos`): El Salvador `^[67]\d{7}$` (prefijo 503), Bolivia `^[67]\d{7}$` (591), Costa Rica `^[5-8]\d{7}$` (506) y Ecuador `^9\d{8}$` (593).
     3. **0 inicial (prefijo troncal):** en Ecuador, Paraguay, Uruguay y Venezuela, si la persona escribe el número con un 0 adelante, quitarlo antes de validar y de armar el internacional (en `celularNacionalValido` / `celularInternacional`, y lo mismo en el SQL).
     4. **Fijos en el WhatsApp de la tienda** (WhatsApp Business admite fijos): el informe **no** da el formato de los fijos de cada país. No inventarlo. Lo prudente es que el WhatsApp de la tienda acepte, además del celular, el prefijo del país + un número de 8 a 15 dígitos en total (la regla general que ya usan los países sin verificar). El del cliente no cambia. Si se hace, es una función o un parámetro aparte (por ejemplo `whatsappTiendaValido`) y su par en el SQL, y el disparador de `tienda` que hoy llama a `whatsapp_valido()` pasa a usar la nueva.
   - **Base de datos:** una migración nueva (`0033_whatsapp.sql`) que redefina `whatsapp_valido()` y, si corresponde, la de la tienda. Una tienda ya guardada con un número que antes valía tiene que seguir valiendo: probarlo con un `tests/sql/antes_0033_….sql`.
   - **Pruebas:** casos nuevos en `tests/paises.test.mjs`. Revisar `comparar-paises.mjs` (que sume los casos de los 4 países y del 0 inicial), `pruebas.sql` y el caso B1 de `verificar.cjs` si cambian las ayudas de Mi tienda. Un caso del enlace de México en `verificar.cjs`: crear la tienda con `pais: "mx"` y revisar el `href` de "Abrir WhatsApp".
   - **Documentar:** la sección 9.10 de `DOCUMENTACION.md` (formatos de celular), la 17 (quitar lo resuelto) y la 19.
9. ✅ **HECHO (`0034_resenas_autorizacion.sql`, demo `VERSION` 27; detalle en la sección 19 de `DOCUMENTACION.md`). Queda como registro. Se eligió: las reseñas de antes quedan "sin registrar" (visibles) y se completan en su fila; las columnas no se publican (permiso por columna).** **Reseñas: registrar la autorización** (opción "a" que aprobó Jared). Por reseña se guarda **cómo** el cliente autorizó su publicación, **sin ningún dato del cliente** (nada de nombre ni teléfono: regla 6).
   - **Dónde está hoy:**
     - La tabla `public.resenas` se crea en `supabase/migrations/0014_resenas.sql`. Tiene `autorizado boolean not null check (autorizado)`: la casilla "tengo la autorización" es obligatoria, pero no se guarda nada más.
     - Campos en el JS: `CAMPOS_RESENA` en `assets/js/datos/comun.js`.
     - Panel: Mi tienda → Reseñas (buscar `resena` en `assets/js/panel/`).
     - Demo: `assets/js/datos/demo.js`. Las reglas tienen que ser las mismas que en el SQL.
   - **Propuesta (confirmar los valores con Jared si hay duda; no inventar textos legales):**
     - Columnas `autorizacion_fecha date not null` (no futura).
     - `autorizacion_canal text not null check (in ('whatsapp', 'correo', 'presencial', 'otro'))`.
     - `autorizacion_alcance text not null check (in ('sitio', 'sitio_y_redes'))`.
     - Las reseñas ya cargadas: migración nueva (`0034_…sql`) con valores que el panel marque como "a completar". Por ejemplo, las columnas aceptan `null` solo en las viejas y el panel pide completarlas, o una fecha por defecto igual a `creado_en` y canal `otro`. Elegir una opción y documentarla en la sección 16.
     - Con los mismos campos: el formulario del panel (con sus textos en `es.js` y `pt.js`), `CAMPOS_RESENA`, `demo.js` (`VERSION` siguiente) y `datos_publicos()`.
     - **Ojo con `datos_publicos()`:** hoy arma las reseñas con una lista explícita de campos. Las columnas nuevas **no** se publican: son del panel.
   - **Pruebas:** `pruebas.sql` (checks y que el público no vea las columnas), `verificar.cjs` (el panel pide los tres datos y la capa de datos los valida) y `verificar-supabase.cjs`, que tiene un caso de reseñas.
   - **Nunca** crear reseñas de ejemplo, tampoco en el demo.
   - **Al terminar:** quitar de la sección 17 de `DOCUMENTACION.md` el pendiente "el panel pide la casilla en cada reseña, pero no guarda la autorización". Que el abogado confirme si alcanza.
10. **Siguiente (después del plan).** No hay tareas de código aprobadas pendientes. Lo que falta, todo en la sección 17 de `DOCUMENTACION.md`, necesita a Jared o a terceros:
    - **Lighthouse:** medido después del plan: 100 / 100 / 100, LCP 1,2–1,4 s, CLS 0,045. Volver a medir si cambia algo del sitio público.
    - **Revisión de abogados:**
      - Colombia: PQR con radicado y la Ley 2300.
      - Argentina: todo el módulo `ar.js`.
      - Reseñas: si alcanza lo que guarda `0034`.
    - **Pendientes de Argentina:**
      - La imagen oficial del Data Fiscal (hoy es un enlace de texto).
      - Los datos de inscripción de las personas jurídicas argentinas (el asistente pide matrícula mercantil y cámara de comercio, de Colombia).
      - El formato de los fijos argentinos en los documentos (`formatearTelefono` de `motor.js`).

      Cualquiera de estas cosas necesita fuente en `legal/FUENTES.md` y el visto bueno de Jared.
    - **Datos que no están:**
      - La descripción de cada modelo.
      - Los hexadecimales oficiales (Apple no los publica).
      - Los formatos de celular de 9 países.
      - La confirmación de las pasarelas por alguien de cada país.
      - Las traducciones al portugués, que tiene que revisar una persona de Brasil.

      **No completar de memoria.**
    - **Fuera del código:** Supabase real, GHL (campos personalizados, workflow, `consentimiento_transferencia`, `detalle`, `cotizacion_relacionada`, RNE), SMTP, GitHub Pages y los videos de ayuda.
11. ⏳ **EN CURSO (v1.1): imágenes predeterminadas por modelo y color.** Jared las pasa en tandas de 5 PNG, sin nombre: el agente mira cada imagen y la ubica (modelo y color).
    - **Cómo se hace una tanda:**
      1. Identificar cada imagen.
         - Modelo: por la cámara y la forma.
         - Color: con la lista de `COLORES` de `assets/js/datos/semilla.js`, usando el `nombre_es` exacto.
         - Si una imagen no se puede ubicar con certeza (por ejemplo Negro y Gris espacial, o dos tonos parecidos), **preguntar a Jared** antes de cargarla.
      2. Convertir cada imagen: `python3 -I catalogo/convertir_imagen.py <png> <slug> <archivo>`. El archivo es el color en minúsculas, sin tildes y con guiones (ej. `negro-brillante`, `product-red`, `titanio-azul`).
      3. Sumar la fila en `IMAGENES_PREDETERMINADAS` de `assets/js/datos/predeterminadas.js` (slug → `nombre_es` → archivo).
      4. Correr `node tests/documentacion.mjs`. La carpeta ya está cubierta por `assets/img/predeterminadas/*`.
      5. Correr el caso "v1.1: imágenes" y el 11 (sin marca) de `verificar.cjs`.
      6. Actualizar en `DOCUMENTACION.md` la cuenta de la sección 17 ("Van N de 182") y la entrada de la 19.
      7. Commit y push.
    - **Cargadas hasta ahora (35 de 182):** completos el iPhone 7, 7 Plus, XR, 11, 11 Pro, 11 Pro Max y SE (2.ª generación). Faltan todos los demás modelos. Criterio: si dos modelos se ven iguales y solo cambia el tamaño (Pro y Pro Max, por ejemplo), la misma imagen va en los dos y se le avisa a Jared.
    - **Mecanismo** (ya hecho; no cambia por tanda):
      - En `equipos.fotos` va la ruta `predeterminadas/<slug>/<archivo>.webp`.
      - `urlArchivo()` (demo y Supabase) la sirve desde el sitio y `borrarArchivos()` no la borra.
      - `panel/lote.js` la pone al empezar en cada color.
      - Sin migración.
12. **Cierre de cada punto.**
    - Actualizar `DOCUMENTACION.md`: sección 5, sección temática, 16, 17 (quitar lo resuelto), entrada nueva en la 19 y la fecha.
    - Mantener al día los conteos de `README.md`, `CLAUDE.md` y este archivo (próxima migración, `VERSION` del demo, punto ✅ con su commit).
    - Correr el comando de verificación. Si se tocó el SQL o `supabase.js`, correr también `tests/verificar-supabase.cjs`.
    - Un commit por punto en español, con push a `claude/gallant-euler-ezco6g`.

**Prohibido tocar:**
- `supabase/migrations/0001` a `0035`: son inmutables; los cambios van en migraciones nuevas.
- Los textos literales del prompt en `assets/js/sitio/popup.js` y `assets/js/sitio/catalogo.js`, y el mensaje de WhatsApp.
- `config.js`: solo lleva la conexión y el script de GHL; nunca datos de la tienda ni claves.
- Las pruebas existentes: no se debilitan ni se borran.
- Los colores y las fichas: no se inventan, y `COLORES` de `semilla.js` no se cambia sin fuente.
- Lo ya cerrado y estable, salvo un bug comprobado con una prueba que falle (o un pedido de Jared, como las imágenes predeterminadas en `lote.js`): `assets/js/panel/lote.js`, `assets/js/panel/inventario.js`, `assets/js/sitio/ayuda.js`, `assets/js/sitio/consentimiento.js`, `assets/js/legal/paises/co.js` y `supabase/functions/` (los puntos 4 y 5 ya los tocaron; no hace falta más).
- No crear `package.json` ni agregar build o dependencias npm al proyecto.
- No abrir PR ni escribir en `main` sin pedido explícito de Jared.
