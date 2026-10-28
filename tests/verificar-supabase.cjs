// =============================================================================
// Prueba de punta a punta del modo "supabase" contra el Supabase local
// (tests/supabase-local/levantar.sh). Reemplaza config.js en el navegador.
//
//   python3 -m http.server 8080 &
//   BIN=... bash tests/supabase-local/levantar.sh
//   NODE_PATH="$(npm root -g)" node tests/verificar-supabase.cjs
//
// supabase-js se carga del CDN: si la red sale por proxy, exportar HTTPS_PROXY.
// Si el CDN no está disponible, ICT_SUPABASE_JS=/ruta/supabase-js.mjs sirve en
// su lugar un paquete local de la MISMA versión (ver README, "Pruebas").
// =============================================================================
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");

const BASE = process.env.ICT_BASE || "http://localhost:8080";
const ENTORNO = Object.fromEntries(fs.readFileSync(process.env.ICT_ENTORNO || "/tmp/cotizadora-supabase-local/entorno", "utf8")
  .trim().split("\n").map((l) => l.split(/=(.*)/s).slice(0, 2)));
const CONFIG = `export const CONFIG = {
  backend: "supabase",
  supabase: { url: "${ENTORNO.URL}", anonKey: "${ENTORNO.ANON}" },
  ghlSeguimiento: { src: "", id: "" }
};`;

let navegador;
let fallas = 0;
async function caso(nombre, fn) {
  // ICT_LINEAS muestra más líneas de cada falla (como tests/verificar.cjs).
  try { await fn(); console.log(`ok   ${nombre}`); } catch (e) { fallas++; console.log(`FALLA ${nombre}\n     ${e.message.split("\n").slice(0, +(process.env.ICT_LINEAS || 1)).join("\n     ")}`); }
}

async function pagina(ancho = 1280) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 900 } });
  await ctx.route("**/config.js", (r) => r.fulfill({ contentType: "text/javascript", body: CONFIG }));
  if (process.env.ICT_SUPABASE_JS) {
    await ctx.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@*/+esm", (r) =>
      r.fulfill({ contentType: "text/javascript", headers: { "access-control-allow-origin": "*" }, body: fs.readFileSync(process.env.ICT_SUPABASE_JS, "utf8") }));
  }
  // Cookies ya elegidas (todo rechazado): el banner no tapa nada.
  await ctx.addInitScript(() => {
    try { if (!localStorage.getItem("cotizadora:cookies")) localStorage.setItem("cotizadora:cookies", JSON.stringify({ medicion: false, publicidad: false, fecha: new Date().toISOString() })); } catch { /* nada */ }
  });
  const p = await ctx.newPage();
  p.errores = [];
  p.on("pageerror", (e) => p.errores.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errores.push(m.text()); });
  return p;
}

async function entrar(p, correo, clave = "clave-de-prueba-1") {
  await p.goto(`${BASE}/admin/`);
  await p.fill("#l-correo", correo);
  await p.fill("#l-clave", clave);
  await p.click("#form-login [type=submit]");
  // Entra a la sección del enlace (o a Inicio si no había ninguna).
  try {
    await p.waitForSelector("#app:not([hidden]) #vista h1", { timeout: 15000 });
  } catch (e) {
    const estado = await p.evaluate(() => ({ hash: location.hash, acceso: document.querySelector("#acceso").innerText.trim().slice(0, 160), vista: document.querySelector("#vista").innerText.trim().slice(0, 160) }));
    throw new Error(`no entró al panel: ${JSON.stringify(estado)}`);
  }
}

// Último correo que recibió una dirección (SMTP simulado) y su enlace.
function ultimoCorreo(para) {
  const carpeta = ENTORNO.CORREOS;
  const archivos = fs.existsSync(carpeta) ? fs.readdirSync(carpeta).sort() : [];
  for (const f of archivos.reverse()) {
    const c = JSON.parse(fs.readFileSync(`${carpeta}/${f}`, "utf8"));
    if (c.para.includes(para)) {
      const enlace = (c.crudo.match(/href="([^"]+)"/) || [])[1]?.replace(/&amp;/g, "&");
      const asunto = (c.crudo.match(/^Subject: (.*)$/m) || [])[1];
      return { ...c, enlace, asunto };
    }
  }
  return null;
}

async function esperarCorreo(para, cuantos) {
  for (let i = 0; i < 50; i++) {
    const n = fs.existsSync(ENTORNO.CORREOS) ? fs.readdirSync(ENTORNO.CORREOS).length : 0;
    if (n >= cuantos) return ultimoCorreo(para);
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`no llegó el correo para ${para}`);
}

const contarCorreos = () => (fs.existsSync(ENTORNO.CORREOS) ? fs.readdirSync(ENTORNO.CORREOS).length : 0);

(async () => {
  const args = [];
  if (process.env.HTTPS_PROXY) args.push(`--proxy-server=${process.env.HTTPS_PROXY}`, "--proxy-bypass-list=127.0.0.1;localhost");
  navegador = await chromium.launch({ args });

  // (cambiado en 0037: la tienda nueva es la de ejemplo de Argentina, con los
  // legales publicados; "sin legales" lo sigue probando tests/verificar.cjs)
  await caso("sitio: carga los datos públicos con la RPC; la tienda nueva (0037) es la de ejemplo de Argentina, con los legales de ejemplo publicados y el pop-up listo", async () => {
    const p = await pagina();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    // 0018 y 0037: una tienda nueva es de Argentina
    assert.equal(await p.evaluate(async (base) => (await (await import(`${base}/assets/js/datos/paises.js`)).paisActual()), BASE), "ar");
    // (cambiado en 0041: la vitrina completa, con promos y el dólar de apoyo)
    assert.equal(await p.textContent("#contador"), "219 equipos disponibles");
    assert.equal(await p.locator(".galeria > .tarjeta").count(), 57);
    assert.ok(await p.isVisible("#franja-demo"));
    assert.ok(await p.isVisible("#promo-banner"));
    assert.match(await p.textContent("#pie-cambio"), /^Cambio actualizado el \d{1,2}\/\d{1,2}\/\d{4} · U\$D 1 = \$1\.500$/);
    assert.deepEqual(await p.locator(".stock-bajo").allTextContents(), ["¡Quedan 2!", "¡Quedan 4!", "¡Quedan 4!"]);
    await p.goto(`${BASE}/?condicion=nuevo&modelo=iphone-18-pro-max&capacidad=512-gb`, { waitUntil: "networkidle" });
    await p.click("#detalle-en-linea [data-comprar]");
    await p.waitForSelector("#p-nombre");
    for (const ruta of ["/privacidad/", "/terminos/", "/cookies/"]) {
      await p.goto(`${BASE}${ruta}`, { waitUntil: "networkidle" });
      await p.waitForFunction(() => !document.querySelector("#legal-texto[aria-busy]"));
      // Los documentos publicados (las cookies no nombran a la tienda).
      assert.notEqual((await p.textContent("#legal-texto")).trim(), "Página en preparación.", ruta);
    }
    await p.goto(`${BASE}/privacidad/`, { waitUntil: "networkidle" });
    await p.waitForFunction(() => !document.querySelector("#legal-texto[aria-busy]"));
    assert.match(await p.textContent("#legal-texto"), /Nombre y apellido de ejemplo[\s\S]*CUIT 20-12345678-6/);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  // (nuevo en 0041) Las pruebas que siguen se escribieron para la tienda de
  // ejemplo con los 6 equipos de demostración: el administrador la deja en el
  // modo básico (como la tienda de prueba de tests/verificar.cjs). La última
  // vuelve a la vitrina.
  await caso("restablecer en modo básico (0041): la tienda de ejemplo con los 6 equipos de demostración, sin promos ni dólar", async () => {
    const p = await pagina(1280);
    await entrar(p, "administrador@local.co");
    const r = await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      try { await (await api()).restablecerFabrica("basica"); return "ok"; } catch (e) { return e.message; }
    });
    assert.equal(r, "ok");
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    assert.equal(await p.textContent("#contador"), "6 equipos disponibles");
    assert.equal(await p.locator(".galeria > .tarjeta").count(), 5);
    assert.equal(await p.isVisible("#promo-banner"), false);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("legales (0016 y 0017): el servidor no deja quitar la demo ni publicar incompleto; el gestor publica y el servidor pone versión y fecha", async () => {
    const p = await pagina(1280);
    await entrar(p, "gestor@local.co");
    await p.waitForSelector(".estadisticas");
    assert.equal(await p.isDisabled("#borrar-demo"), true);
    const r = await p.evaluate(async (base) => {
      const a = await (await import(`${base}/assets/js/datos/api.js`)).api();
      const { publicar, generar } = await import(`${base}/assets/js/legal/motor.js`);
      const { TIENDA_LEGAL_PRUEBA } = await import(`${base}/tests/legal/datos-prueba.mjs`);
      const intentar = async (fn) => { try { await fn(); return "ok"; } catch (e) { return e.message; } };
      const r = [];
      r.push(await intentar(() => a.borrarDatosDemo()));
      r.push(await intentar(() => a.guardarTienda({ modo_demo: false })));
      const legales = Object.fromEntries(Object.entries(TIENDA_LEGAL_PRUEBA).filter(([k]) => /^(legal_|meta_pixel_id|ga4_|gtm_|clarity_|tiktok_|gads_|capi_|plataforma_|envio_)/.test(k)));
      legales.envio_retiro = false; // C2: solo el envío a domicilio (el retiro pide la dirección de Mi tienda)
      // La tienda local nace en Argentina (0018); la de prueba es de Colombia.
      let t = await a.guardarTienda({ ...legales, pais: "co", whatsapp: "573001234567", meta_pixel_id: "" });
      r.push(await intentar(() => a.guardarTienda({ legal_publicado: { version: 9, vigente_desde: "2020-01-01", huella: "x", documentos: generar({ ...t, meta_pixel_id: "123456789012345" }) } })));
      r.push(await intentar(() => a.guardarTienda({ legal_perfil: "distribuidor" })));
      t = await a.guardarTienda({ meta_pixel_id: "123456789012345" });
      t = await a.guardarTienda({ legal_publicado: { ...publicar(t, null), version: 9, vigente_desde: "2020-01-01" } });
      r.push(t.legal_publicado.version, t.legal_publicado.vigente_desde);
      // El panel vuelve a publicar solo cuando un cambio toca los textos
      t = await a.guardarTienda({ legal_garantia_nuevos: 24 });
      r.push(t.legal_publicado.version);
      return r;
    }, BASE);
    const hoy = new Date(Date.now() - 5 * 3600 * 1000).toISOString().slice(0, 10);
    // (cambiado en 0037: la tienda nueva trae datos de ejemplo y la versión 1 publicada)
    const ejemplo = "Cambie los datos de ejemplo (el WhatsApp y los de Legales) antes de quitar la demostración.";
    assert.deepEqual(r, [ejemplo, ejemplo,
      "Faltan datos para publicar los textos legales.", "Algún dato no tiene el formato correcto. Revise los campos.", 2, hoy, 3]);
    await p.goto(`${BASE}/terminos/`, { waitUntil: "networkidle" });
    await p.waitForFunction(() => !document.querySelector("#legal-texto[aria-busy]"));
    assert.match(await p.textContent("#legal-texto"), /24 meses desde la entrega[\s\S]*versión 3\./);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("pop-up: la función enviar-lead entrega todos los campos al webhook de GHL", async () => {
    try { fs.unlinkSync(ENTORNO.LEAD); } catch { /* no había */ }
    const p = await pagina(390);
    await p.goto(`${BASE}/?utm_source=meta&utm_campaign=test&ad_id=123&fbclid=prueba`, { waitUntil: "networkidle" });
    await p.click(".segmento[data-valor='usado']");
    await p.click(".tarjeta-boton >> nth=0");
    await p.click(".hoja-barra [data-comprar]");
    await p.fill("#p-nombre", "Ana Gómez");
    await p.fill("#p-correo", "ana@correo.co");
    await p.fill("#p-telefono", "3109876543");
    // (cambiado en 0042: una sola casilla, sin la de promociones)
    await p.check("#p-autorizacion");
    await p.click("[data-enviar]");
    await p.waitForSelector("text=Su pedido está listo", { timeout: 15000 });
    const lead = JSON.parse(fs.readFileSync(ENTORNO.LEAD, "utf8"));
    assert.deepEqual([lead.consentimiento_datos, lead.consentimiento_promociones, lead.consentimiento_medicion, lead.consentimiento_publicidad, lead.version_politica],
      // (cambiado en 0037: la versión 1 es la de ejemplo; el caso de Legales publicó la 2 y la 3;
      // en 0042: sin casilla de promociones, siempre false)
      [true, false, false, false, 3]);
    assert.match(lead.fecha_consentimiento, /-05:00$/);
    const codigo = (await p.textContent(".popup-estado .codigo")).trim();
    assert.equal(lead.name, "Ana Gómez");
    assert.equal(lead.email, "ana@correo.co");
    assert.equal(lead.phone, "+573109876543");
    assert.equal(lead.condicion, "Usado");
    assert.equal(lead.tipo_consulta, "compra");
    assert.equal(lead.codigo_cotizacion, codigo);
    assert.equal(lead.utm_source, "meta");
    assert.equal(lead.utm_campaign, "test");
    assert.equal(lead.ad_id, "123");
    assert.equal(lead.fbclid, "prueba");
    for (const k of ["modelo", "capacidad", "color", "precio_cotizado", "equipo_id", "utm_medium", "utm_term", "utm_content"]) assert.ok(k in lead, `falta ${k}`);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("panel: sin sesión pide login; el gestor no ve Usuarios y el servidor le niega gestionarlos; colores del catálogo", async () => {
    const p = await pagina(390);
    await p.goto(`${BASE}/admin/#/inventario`);
    await p.waitForSelector("#form-login");
    await entrar(p, "gestor@local.co");
    assert.equal(await p.isVisible('[data-ruta="usuarios"]'), false);
    // Intento directo contra el servidor: la función "usuarios" y la tabla
    // perfiles rechazan al gestor.
    const directo = await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const a = await api();
      const r = [];
      try { await a.invitarUsuario("intruso@local.co", "administrador"); r.push("invitó"); } catch (e) { r.push(e.message); }
      const yo = await a.sesionActual();
      const otros = (await a.listarUsuarios()).filter((u) => u.user_id !== yo.id);
      r.push(otros.length);
      try { await a.cambiarRolUsuario(yo.id, "administrador"); r.push("cambió"); } catch (e) { r.push(e.message); }
      return r;
    });
    assert.equal(directo[0], "Solo el administrador puede gestionar usuarios.");
    assert.equal(directo[1], 0, "el gestor no ve a los demás usuarios");
    assert.match(directo[2], /permiso|propio rol/);
    await p.goto(`${BASE}/admin/#/catalogo`);
    await p.waitForSelector(".modelo-fila");
    assert.equal(await p.locator("[data-renombrar]").count(), 42);
    // Colores: completa la muestra que falta en el panel; el servidor rechaza
    // cambiar un hexadecimal de la fuente y agregar colores (rol tienda).
    // (Desde 0028 el 18 Pro ya no tiene muestras aproximadas: se usa el Titanio azul del 15 Pro.)
    const fila = p.locator('.modelo-fila:has(input[value="iPhone 15 Pro"])');
    await fila.locator(".colores-modelo > summary").click();
    await fila.locator('li:has-text("Titanio azul") input[data-hex]').fill("#8B7765");
    await fila.locator('li:has-text("Titanio azul") input[data-hex]').press("Enter");
    await p.waitForSelector("#aviso-flotante.visible");
    const r = await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const a = await api();
      const colores = await a.listarColores();
      const vison = colores.find((c) => c.nombre_es === "Titanio azul" && c.hex === "#8B7765");
      const burgundy = colores.find((c) => c.nombre_en === "Burgundy");
      const salida = { vison: vison.hex };
      try { await a.guardarColor(burgundy.id, { hex: "#000000" }); salida.fuente = "cambió"; } catch (e) { salida.fuente = e.message; }
      try { await a.agregarColor({ modelo_id: burgundy.modelo_id, nombre_es: "Falso" }); salida.agregar = "agregó"; } catch (e) { salida.agregar = e.message; }
      return salida;
    });
    assert.equal(r.vison, "#8B7765");
    assert.match(r.fuente, /viene de la fuente/);
    assert.match(r.agregar, /colores oficiales/);
    await p.goto(`${BASE}/admin/#/usuarios`);
    await p.waitForSelector(".estadisticas");
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("panel → sitio: cambiar un precio lo cambia en el sitio y actualiza la fecha", async () => {
    const p = await pagina(1280);
    await entrar(p, "gestor@local.co");
    await p.goto(`${BASE}/admin/#/inventario`);
    const fila = p.locator(".fila-equipo", { hasText: "Glacier" });
    await fila.locator('[data-campo="precio"]').fill("5.123.000");
    await fila.locator('[data-campo="precio"]').press("Enter");
    await p.waitForSelector("#aviso-flotante.visible");
    assert.equal(await p.textContent("#aviso-flotante"), "Guardado");
    const s = await p.context().newPage();
    await s.goto(`${BASE}/?condicion=nuevo&modelo=iphone-18-pro&capacidad=256-gb`, { waitUntil: "networkidle" });
    assert.match(await s.textContent("#detalle-en-linea .precio-valor"), /\$5\.123\.000/);
    const hoy = new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", day: "numeric", month: "numeric", year: "numeric" }).formatToParts(new Date());
    const f = Object.fromEntries(hoy.map((x) => [x.type, x.value]));
    assert.equal(await s.textContent("#pie-precios"), `Precios actualizados al ${f.day}/${f.month}/${f.year}`);
    await p.context().close();
  });

  await caso("panel → sitio: ficha técnica precargada y formas de pago (0012 y 0013), con las reglas del servidor", async () => {
    const p = await pagina(1280);
    await entrar(p, "gestor@local.co");
    // (cambiado en 0041: la tienda de ejemplo trae formas de pago; la prueba empieza sin ellas)
    await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const { PAGOS_VACIOS } = await import(new URL("../assets/js/datos/ejemplo.js", location.href).href);
      await (await api()).guardarTienda(PAGOS_VACIOS);
    });
    await p.goto(`${BASE}/admin/#/catalogo/pagos`);
    await p.waitForSelector("#form-pagos");
    await p.check('input[name="medio"][value="credito"]');
    await p.click('label[for="p-cuotas"]');
    await p.fill("#p-cuotas-max", "12");
    await p.click('label[for="p-sin-interes"]');
    await p.fill("#p-sin-interes-max", "6");
    await p.click("#guardar-pagos");
    await p.waitForSelector("#aviso-flotante.visible");
    assert.equal(await p.textContent("#aviso-flotante"), "Guardado");
    // El servidor rechaza lo mismo que el panel (validar_pagos) con su mensaje.
    const error = await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const a = await api();
      try { await a.guardarTienda({ pagos_cuotas: true, pagos_cuotas_max: 6, pagos_sin_interes: true, pagos_sin_interes_max: 12 }); return ""; } catch (e) { return e.message; }
    });
    assert.equal(error, "Las cuotas sin interés no pueden ser más que el máximo de cuotas.");
    const s = await p.context().newPage();
    await s.goto(`${BASE}/?condicion=nuevo&modelo=iphone-18-pro-max&capacidad=512-gb`, { waitUntil: "networkidle" });
    await s.waitForSelector("#detalle-en-linea .info-compra");
    assert.deepEqual(await s.$$eval("#detalle-en-linea .info-compra section:first-of-type li", (xs) => xs.map((x) => x.textContent)), ["Tarjeta de crédito: hasta 12 cuotas, hasta 6 sin interés."]);
    const filas = await s.$$eval("#detalle-en-linea .ficha-tecnica dt", (xs) => xs.map((x) => x.textContent));
    // Con las filas de 0029 (cámara frontal, batería y dimensiones), en el orden fijo.
    assert.deepEqual(filas, ["Año de lanzamiento", "Procesador", "Pantalla", "Cámaras traseras", "Cámara frontal", "Batería", "Versiones del modelo", "Materiales", "Puertos y carga", "Dimensiones y peso"]);
    await p.context().close();
  });

  await caso("reseñas (0014): el gestor sube imagen y video al bucket resenas; el público las ve solo encendidas; el video no se pide hasta reproducirlo", async () => {
    const p = await pagina(1280);
    await entrar(p, "gestor@local.co");
    await p.goto(`${BASE}/admin/#/tienda`);
    await p.waitForSelector("#form-resena");
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
    const agregar = async (archivo, texto) => {
      await p.setInputFiles("#r-archivo", archivo);
      await p.fill("#r-texto", texto);
      await p.check("#r-autorizado");
      // 0034: cómo autorizó la persona (cambiado: antes no se pedía).
      await p.selectOption("#r-canal", "correo");
      await p.fill("#r-fecha", "2026-10-01");
      await p.selectOption("#r-alcance", "sitio");
      await p.click("#r-agregar");
      await p.waitForFunction((n) => document.querySelectorAll(".resena-fila").length === n, texto === "Imagen" ? 1 : 2, { timeout: 15000 });
    };
    await agregar({ name: "a.png", mimeType: "image/png", buffer: png }, "Imagen");
    await agregar(path.join(__dirname, "videos", "20s.mp4"), "Video");
    // Apagadas: ni la RPC ni la tabla las dan al público.
    const anon = async () => {
      const r = await fetch(`${ENTORNO.URL}/rest/v1/resenas?select=id`, { headers: { apikey: ENTORNO.ANON } });
      return (await r.json()).length;
    };
    assert.equal(await anon(), 0, "apagadas: el público no las lee");
    // 0034: el público no puede pedir las columnas de la autorización.
    const privada = await fetch(`${ENTORNO.URL}/rest/v1/resenas?select=autorizacion_canal`, { headers: { apikey: ENTORNO.ANON } });
    assert.ok(!privada.ok, `la autorización no es pública (HTTP ${privada.status})`);
    const s = await p.context().newPage();
    const pedidos = [];
    s.on("request", (r) => { if (/\/storage\/v1\/object\/public\/resenas\/.+\.mp4/.test(r.url())) pedidos.push(r.url()); });
    await s.goto(`${BASE}/`, { waitUntil: "networkidle" });
    assert.equal(await s.isHidden("#resenas"), true);
    // Encendidas
    await p.click('label[for="r-mostrar"]');
    await p.waitForSelector("#aviso-flotante.visible");
    assert.equal(await anon(), 2, `encendidas: el público las lee (aviso: ${await p.textContent("#aviso-flotante")})`);
    await s.goto(`${BASE}/`, { waitUntil: "networkidle" });
    await s.waitForSelector("#resenas:not([hidden]) .resena-boton");
    const img = await s.getAttribute("#resenas .resena-boton img", "src");
    assert.match(img, /\/storage\/v1\/object\/public\/resenas\/resenas\/[\w-]+-640\.\w+$/);
    assert.equal((await s.request.get(img)).status(), 200);
    await s.click("#resenas .resena-boton >> nth=1");
    await s.waitForSelector("#visor-resena video");
    await s.waitForTimeout(600);
    assert.equal(pedidos.length, 0, "el video no se pide al abrir el visor");
    await s.$eval("#visor-resena video", (v) => v.play().catch(() => {}));
    await s.waitForTimeout(800);
    assert.ok(pedidos.length >= 1, "al reproducirlo, se pide");
    // Storage rechaza en "resenas" un tipo no permitido aunque se salte el panel.
    const subida = await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const a = await api();
      return a.subirArchivo("resenas", "resenas/intruso.mov", new Blob(["x"], { type: "video/quicktime" })).then(() => "subió", (e) => e.message);
    });
    assert.notEqual(subida, "subió");
    // Se dejan como estaban: apagadas y sin reseñas.
    await p.click('label[for="r-mostrar"]');
    for (let i = 0; i < 2; i++) {
      await p.click(".resena-fila [data-borrar] >> nth=0");
      await p.click('#confirmar [value="si"]');
      await p.waitForFunction((n) => document.querySelectorAll(".resena-fila").length === n, 1 - i);
    }
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("panel: agregar un equipo con foto (Storage simulado) y verlo en el sitio", async () => {
    const p = await pagina(390);
    await entrar(p, "gestor@local.co");
    // "Agregar equipo" es el asistente de carga en lote (un lote de 1).
    await p.goto(`${BASE}/admin/#/inventario/nuevo`);
    await p.waitForSelector("#form-lote");
    await p.selectOption("#l-modelo", { label: "iPhone 17 Pro (inactivo)" });
    await p.click("#siguiente");
    await p.check('input[name="l-condicion"][value="nuevo"]', { force: true }); await p.click("#siguiente");
    await p.check('[data-cap="1 TB"]', { force: true }); await p.click("#siguiente");
    // Desde 0028 el 17 Pro tiene sus 3 colores oficiales: queda solo Plata, con un nombre a mostrar.
    assert.deepEqual(await p.locator(".grilla-lote tbody th .opcion-color-nombres > span:first-child").allTextContents(), ["Silver", "Cosmic Orange", "Deep Blue"]);
    for (const fila of ["1", "2"]) {
      await p.$eval(`[data-fila="${fila}"]`, (el) => el.scrollIntoView({ block: "center", behavior: "instant" }));
      await p.uncheck(`[data-fila="${fila}"]`, { force: true });
    }
    await p.fill("#l-nombre-0", "Prueba"); await p.click("#siguiente");
    await p.fill("#l-precio", "9000000"); await p.click("#siguiente");
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
    await p.setInputFiles("#l-fotos-0", { name: "a.png", mimeType: "image/png", buffer: png });
    await p.waitForSelector(".foto-item", { timeout: 15000 });
    // Video: el panel lo valida y lo sube al bucket "videos".
    await p.setInputFiles("#l-video-0", path.join(__dirname, "videos", "corto.mp4"));
    await p.waitForSelector("[data-video-actual] video", { timeout: 15000 });
    assert.equal((await p.textContent("[data-error-video]")).trim(), "");
    await p.click("#siguiente");
    await p.check("#l-publicado", { force: true });
    await p.click("#siguiente");
    await p.click("#guardar");
    await p.waitForURL(/#\/inventario$/, { timeout: 15000 });
    const s = await p.context().newPage();
    const pedidosVideo = [];
    s.on("request", (r) => { if (/\/storage\/v1\/object\/public\/videos\//.test(r.url())) pedidosVideo.push(r.url()); });
    await s.goto(`${BASE}/?condicion=nuevo&modelo=iphone-17-pro&capacidad=1-tb`, { waitUntil: "networkidle" });
    // El video no se descarga hasta tocar su miniatura.
    await s.waitForSelector("#detalle-en-linea .miniatura--video");
    await s.waitForTimeout(500);
    assert.equal(pedidosVideo.length, 0, "el video se pidió antes de tocarlo");
    await s.click("#detalle-en-linea .miniatura--video");
    await s.waitForFunction(() => document.querySelector("#detalle-en-linea video"));
    await s.waitForTimeout(800);
    assert.ok(pedidosVideo.length >= 1, "al tocarlo, el video se pide");
    assert.match(await s.textContent("#detalle-en-linea .precio-valor"), /\$9\.000\.000/);
    assert.match(await s.textContent("#detalle-en-linea .detalle-variante"), /1 TB · Prueba/);
    // (cambiado en v1.1: primero va la imagen predeterminada del color, que sirve el sitio; después, la subida)
    await s.click('#detalle-en-linea .miniatura[data-f="0"]');
    assert.match(await s.getAttribute("#detalle-en-linea .diapositiva img", "src"), /\/assets\/img\/predeterminadas\/iphone-17-pro\/plata\.webp$/);
    await s.click('#detalle-en-linea .miniatura[data-f="1"]');
    await s.waitForFunction(() => /\/storage\//.test(document.querySelector("#detalle-en-linea .diapositiva img")?.getAttribute("src") || ""));
    const src = await s.getAttribute("#detalle-en-linea .diapositiva img", "src");
    assert.match(src, /\/storage\/v1\/object\/public\/fotos\/equipos\//);
    const r = await s.request.get(src);
    assert.equal(r.status(), 200);
    // El video quedó guardado y se sirve desde Storage.
    const video = await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const a = await api();
      const q = (await a.listarEquipos()).find((x) => x.capacidad === "1 TB");
      const subida = await a.subirArchivo("videos", "equipos/intruso.mp4", new Blob(["x"], { type: "video/quicktime" })).then(() => "subió", (e) => e.message);
      return { url: a.urlArchivo("videos", q.video), subida };
    });
    assert.match(video.url, /\/storage\/v1\/object\/public\/videos\/equipos\/[\w-]+\.mp4$/);
    const rv = await s.request.get(video.url);
    assert.equal(rv.status(), 200);
    assert.equal(rv.headers()["content-type"], "video/mp4");
    // Storage rechaza un tipo no permitido aunque se salte el panel.
    assert.equal(video.subida, "Este formato puede no verse en todos los celulares. Súbalo en MP4.");
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("lote por la RPC: todo o nada con la variante que falló, y un archivo compartido no se borra mientras se use", async () => {
    const p = await pagina(1280);
    await entrar(p, "gestor@local.co");
    const r = await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const a = await api();
      const antes = (await a.listarEquipos()).length;
      const m = (await a.listarModelos()).find((x) => x.slug === "iphone-17-pro").id;
      // Desde 0028 el 17 Pro tiene colores: cada equipo lleva el suyo (Plata).
      const color = (await a.listarColores()).find((c) => c.modelo_id === m && c.nombre_es === "Plata").id;
      const q = (capacidad, extra = {}) => ({ modelo_id: m, condicion: "nuevo", capacidad, precio: 100, color_id: color, fotos: ["equipos/compartida.webp"], ...extra });
      const fallo = await a.crearEquiposLote([q("128 GB"), q("256 GB"), q("512 GB", { precio: 0 })]).then(() => "", (e) => e.message);
      const despuesFallo = (await a.listarEquipos()).length;
      const creados = await a.crearEquiposLote([q("128 GB"), q("256 GB")]);
      const usoDos = await a.archivosEnUso("fotos", ["equipos/compartida.webp", "equipos/otra.webp"]);
      await a.borrarEquipo(creados[0].id);
      const usoUno = await a.archivosEnUso("fotos", ["equipos/compartida.webp"]);
      await a.borrarEquipo(creados[1].id);
      const usoNinguno = await a.archivosEnUso("fotos", ["equipos/compartida.webp"]);
      return { antes, fallo, despuesFallo, creados: creados.length, usoDos, usoUno, usoNinguno };
    });
    assert.equal(r.fallo, "Variante 3: El precio debe ser un número entero mayor que 0.");
    assert.equal(r.despuesFallo, r.antes, "no se creó ninguno");
    assert.equal(r.creados, 2);
    assert.deepEqual(r.usoDos, ["equipos/compartida.webp"]);
    assert.deepEqual(r.usoUno, ["equipos/compartida.webp"]);
    assert.deepEqual(r.usoNinguno, []);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("gestor: borrar los datos de demostración quita la franja y DEMO del sitio", async () => {
    const p = await pagina(1280);
    await entrar(p, "gestor@local.co");
    await p.waitForSelector(".estadisticas");
    assert.equal(await p.isVisible('[data-ruta="usuarios"]'), false);
    p.once("dialog", (d) => d.accept());
    await p.click("#borrar-demo");
    await p.click('#confirmar [value="si"]');
    await p.waitForSelector("text=Datos de demostración borrados", { timeout: 15000 });
    const s = await p.context().newPage();
    await s.goto(`${BASE}/`, { waitUntil: "networkidle" });
    assert.equal(await s.isVisible("#franja-demo"), false);
    assert.equal(await s.locator(".etiqueta-demo").count(), 0);
    assert.equal(await s.locator(".galeria > .tarjeta").count(), 1);
    await p.context().close();
  });

  await caso("invitación: el administrador invita, el enlace del correo pide crear la contraseña y entra", async () => {
    const p = await pagina(390);
    await entrar(p, "administrador@local.co");
    // Cambiado con 0035: el administrador ve todo (también Usuarios) y el servidor
    // lo deja gestionar la tienda.
    assert.deepEqual(await p.locator(".navegacion a:visible").allTextContents(), ["Inicio", "Inventario", "Mi tienda", "Catálogo", "Promos", "Legales", "Usuarios"]);  // (cambiado en 0039: Promos)
    const guardado = await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const a = await api();
      const antes = (await a.leerTienda()).nombre;
      try { await a.guardarTienda({ nombre: "Hecho por el administrador" }); } catch (e) { return e.message; }
      const despues = (await a.leerTienda()).nombre;
      await a.guardarTienda({ nombre: antes });
      return despues;
    });
    assert.equal(guardado, "Hecho por el administrador");
    await p.goto(`${BASE}/admin/#/usuarios`);
    await p.waitForSelector("#form-invitar");
    const antes = contarCorreos();
    await p.fill("#u-correo", "invitado@local.co");
    await p.click("#form-invitar [type=submit]");
    await p.waitForSelector('.usuario-fila:has-text("invitado@local.co")', { timeout: 15000 });
    const correo = await esperarCorreo("invitado@local.co", antes + 1);
    assert.equal(correo.asunto, "Su acceso al panel de la tienda");
    assert.match(correo.crudo, /cree su contraseña/i);
    // Invitar otra vez el mismo correo no manda otro correo
    await p.fill("#u-correo", "invitado@local.co");
    await p.click("#form-invitar [type=submit]");
    assert.equal(await p.textContent("#u-correo-error"), "Ese correo ya tiene usuario.");
    await p.context().close();

    // La persona invitada abre el enlace en otro navegador.
    const q = await pagina(390);
    await q.goto(correo.enlace);
    await q.waitForSelector("#form-clave", { timeout: 15000 });
    assert.equal(await q.textContent("#acceso h1"), "Cree su contraseña");
    await q.fill("#c-clave", "clave-invitado-1");
    await q.fill("#c-clave2", "otra-cosa-123");
    await q.click("#form-clave [type=submit]");
    assert.equal(await q.textContent("#c-clave2-error"), "Las dos contraseñas no coinciden.");
    await q.fill("#c-clave2", "clave-invitado-1");
    await q.click("#form-clave [type=submit]");
    await q.waitForSelector("#app:not([hidden]) .estadisticas", { timeout: 15000 });
    assert.match(await q.textContent("#barra-usuario"), /invitado@local\.co · Gestor/);
    assert.ok(!/access_token/.test(q.url()), "el token quedó en la URL");
    // Sale y vuelve a entrar con la contraseña que creó.
    await q.click("#salir");
    await q.waitForSelector("#form-login");
    await entrar(q, "invitado@local.co", "clave-invitado-1");
    assert.deepEqual(q.errores, []);
    await q.context().close();
  });

  await caso("recuperación: el enlace del correo pide la contraseña nueva y entra", async () => {
    const p = await pagina(390);
    await p.goto(`${BASE}/admin/`);
    await p.click("#ir-recuperar");
    const antes = contarCorreos();
    await p.fill("#r-correo", "invitado@local.co");
    await p.click("#form-recuperar [type=submit]");
    await p.waitForSelector("text=le llegará un enlace");
    const correo = await esperarCorreo("invitado@local.co", antes + 1);
    assert.equal(correo.asunto, "Contraseña nueva para el panel de la tienda");
    await p.context().close();

    const q = await pagina(1280);
    await q.goto(correo.enlace);
    await q.waitForSelector("#form-clave", { timeout: 15000 });
    assert.equal(await q.textContent("#acceso h1"), "Contraseña nueva");
    await q.fill("#c-clave", "clave-invitado-2");
    await q.fill("#c-clave2", "clave-invitado-2");
    await q.click("#form-clave [type=submit]");
    await q.waitForSelector("#app:not([hidden]) .estadisticas", { timeout: 15000 });
    await q.context().close();

    const r = await pagina(390);
    await r.goto(`${BASE}/admin/`);
    await r.fill("#l-correo", "invitado@local.co");
    await r.fill("#l-clave", "clave-invitado-1");
    await r.click("#form-login [type=submit]");
    await r.waitForSelector("#l-alerta:not([hidden])");
    assert.equal(await r.textContent("#l-alerta"), "El correo o la contraseña no coinciden.");
    await entrar(r, "invitado@local.co", "clave-invitado-2");
    await r.context().close();
  });

  await caso("usuarios: el administrador asigna roles, desactiva (no puede entrar) y reactiva (vuelve a entrar)", async () => {
    const p = await pagina(1280);
    await entrar(p, "administrador@local.co");
    await p.goto(`${BASE}/admin/#/usuarios`);
    await p.waitForSelector("#form-invitar");
    const fila = '.usuario-fila:has-text("invitado@local.co")';
    await p.waitForSelector(fila, { timeout: 15000 });
    // Asignar rol: a administrador y de vuelta a gestor (directo en perfiles).
    await p.locator(`${fila} [data-rol]`).selectOption("administrador");
    await p.waitForFunction(() => [...document.querySelectorAll(".usuario-fila")].some((f) => f.textContent.includes("invitado@local.co") && f.querySelector(".rol").textContent.trim() === "Administrador"), null, { timeout: 15000 });
    await p.locator(`${fila} [data-rol]`).selectOption("gestor");
    await p.waitForFunction(() => [...document.querySelectorAll(".usuario-fila")].some((f) => f.textContent.includes("invitado@local.co") && f.querySelector(".rol").textContent.trim() === "Gestor"), null, { timeout: 15000 });
    await p.click(`${fila} [data-estado]`);
    await p.click('#confirmar [value="si"]');
    await p.waitForSelector(`${fila} .estado-inactivo`, { timeout: 15000 });

    const q = await pagina(390);
    await q.goto(`${BASE}/admin/`);
    await q.fill("#l-correo", "invitado@local.co");
    await q.fill("#l-clave", "clave-invitado-2");
    await q.click("#form-login [type=submit]");
    await q.waitForSelector("#l-alerta:not([hidden])", { timeout: 15000 });
    assert.equal(await q.textContent("#l-alerta"), "Este usuario está desactivado. Hable con el administrador.");

    await p.click(`${fila} [data-estado]`);
    await p.locator(`${fila} .estado-inactivo`).waitFor({ state: "detached", timeout: 15000 });
    await entrar(q, "invitado@local.co", "clave-invitado-2");
    assert.deepEqual(p.errores, []);
    await p.context().close();
    await q.context().close();
  });

  await caso("precios (0038 a 0040): dólar, promos y stock contado con las reglas del servidor; el público no lee la cantidad y ve el cartel", async () => {
    const p = await pagina(390);
    await entrar(p, "gestor@local.co");
    const r = await p.evaluate(async (base) => {
      const a = await (await import(`${base}/assets/js/datos/api.js`)).api();
      const intentar = async (fn) => { try { await fn(); return "ok"; } catch (e) { return e.message; } };
      const out = [];
      out.push(await intentar(() => a.guardarTienda({ usd_modo: "apoyo" })));
      out.push(await intentar(() => a.guardarTienda({ promo_banner_activo: true })));
      const t = await a.guardarTienda({ usd_modo: "apoyo", usd_cotizacion: 1000, usd_redondeo: "abajo", promo_banner_activo: true,
        promo_banner_texto: "Cyber Sale", promo_descuentos_activos: true, promo_descuento_tienda: 10 });
      out.push(Boolean(t.usd_actualizado_en), Number(t.usd_cotizacion));
      const q = (await a.listarEquipos())[0];
      await a.actualizarEquipo(q.id, { publicado: true, en_stock: true });
      out.push(await intentar(() => a.actualizarEquipo(q.id, { contar_stock: true })));
      const q2 = await a.actualizarEquipo(q.id, { contar_stock: true, stock_cantidad: 2 });
      out.push(q2.en_stock, q2.stock_cantidad);
      const publico = (await a.cargarPublico()).equipos.find((x) => x.id === q.id);
      out.push("stock_cantidad" in publico, publico.stock_bajo);
      return { out, id: q.id, precio: q.precio, modelo: q.modelo_id };
    }, BASE);
    assert.deepEqual(r.out, ["Cargue la cotización del dólar: cuánto vale 1 U$D en la moneda de su país.", "Escriba el texto del banner para activarlo.",
      true, 1000, "Escriba cuántas unidades tiene (0 o más).", true, 2, false, 2]);
    // El público no puede leer la cantidad por REST.
    const rest = await fetch(`${ENTORNO.URL}/rest/v1/equipos?select=stock_cantidad&limit=1`, { headers: { apikey: ENTORNO.ANON, authorization: `Bearer ${ENTORNO.ANON}` } });
    assert.ok(!rest.ok, `REST respondió ${rest.status}`);
    // El sitio: banner, precio con 10 % y el de U$D, y el cartel.
    const s = await p.context().newPage();
    await s.goto(`${BASE}/?equipo=${r.id}`, { waitUntil: "networkidle" });
    assert.ok(await s.isVisible("#promo-banner"));
    const bloque = s.locator("#detalle-en-linea .precio-bloque");
    assert.equal(await bloque.locator(".stock-bajo").textContent(), "¡Quedan 2!");
    assert.match(await bloque.locator(".precio-tachado").textContent(), /^Antes: /);
    assert.match(await bloque.textContent(), /U\$D\s\d/);
    assert.match(await s.textContent("#pie-cambio"), /^Cambio actualizado el \d+\/\d+\/\d{4} · U\$D 1 = \$1\.000$/);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  // Al final: deja la base como recién instalada.
  await caso("restablecer de fábrica (0036; cambiado en 0041: vitrina completa o básica): el gestor no puede; el administrador deja la base como nueva, vacía los buckets y los usuarios siguen", async () => {
    const usarApi = (p, fn, arg) => p.evaluate(async ([cuerpo, arg]) => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      try { return await new Function("a", "arg", `return (${cuerpo})(a, arg)`)(await api(), arg); } catch (e) { return `error: ${e.message}`; }
    }, [fn.toString(), arg]);
    const publico = (bucket, ruta) => fetch(`${ENTORNO.URL}/storage/v1/object/public/${bucket}/${ruta}`).then((r) => r.status);

    const g = await pagina(1280);
    await entrar(g, "gestor@local.co");
    await g.waitForSelector(".estadisticas");
    assert.equal(await g.locator("#restablecer-fabrica").count(), 0, "el gestor no ve el botón");
    assert.equal(await usarApi(g, (a) => a.restablecerFabrica()), "error: Solo el administrador puede restablecer el cotizador de fábrica.");
    await usarApi(g, async (a) => {
      await a.guardarTienda({ nombre: "Tienda real", vista_equipos: "carrusel" });
      await a.subirArchivo("fotos", "equipos/fabrica.webp", new Blob(["x"], { type: "image/webp" }));
      await a.subirArchivo("marca", "logo-fabrica.png", new Blob(["x"], { type: "image/png" }));
    });
    assert.equal(await publico("fotos", "equipos/fabrica.webp"), 200);
    await g.context().close();

    const p = await pagina(1280);
    await entrar(p, "administrador@local.co");
    await p.waitForSelector("#restablecer-fabrica");
    await p.click("#restablecer-fabrica");
    await p.fill("#confirmar-palabra", "RESTABLECER");
    await Promise.all([p.waitForEvent("load"), p.click('#confirmar [value="si"]')]);
    await p.waitForSelector(".estadisticas", { timeout: 15000 });
    assert.equal(await p.textContent("#aviso-flotante"), "Listo: el cotizador quedó como recién instalado.");
    const tienda = await usarApi(p, (a) => a.leerTienda());
    // (cambiado en 0037: la tienda nueva es la de ejemplo de Argentina, con la versión 1 de los legales de ejemplo)
    assert.deepEqual([tienda.nombre, tienda.pais, tienda.vista_equipos, tienda.modo_demo, tienda.legal_publicado?.version, tienda.whatsapp],
      ["Tienda de demostración", "ar", "cuadricula", true, 1, "5491100000000"]);
    for (const [bucket, ruta] of [["fotos", "equipos/fabrica.webp"], ["marca", "logo-fabrica.png"]]) {
      assert.equal(await publico(bucket, ruta), 404, `${bucket}/${ruta} borrado`);
    }
    // Los cuatro buckets quedan vacíos (también lo que subieron los casos anteriores).
    const quedan = await p.evaluate(async ([url, anon]) => {
      const n = [];
      for (const b of ["fotos", "videos", "marca", "resenas"]) {
        const r = await fetch(`${url}/storage/v1/object/list/${b}`, { method: "POST", headers: { "content-type": "application/json", apikey: anon }, body: JSON.stringify({ prefix: "", limit: 100, offset: 0 }) });
        n.push((await r.json()).length);
      }
      return n;
    }, [ENTORNO.URL, ENTORNO.ANON]);
    assert.deepEqual(quedan, [0, 0, 0, 0]);
    // El sitio vuelve a la demo (sin legales publicados) y los usuarios siguen entrando.
    const s = await p.context().newPage();
    await s.goto(`${BASE}/`, { waitUntil: "networkidle" });
    assert.equal(await s.isVisible("#franja-demo"), true);
    assert.equal(await s.locator(".galeria > .tarjeta").count(), 57);
    // (nuevo en 0041) El modo básico: los 6 equipos de demostración, sin promos ni dólar.
    assert.equal(await usarApi(p, (a) => a.restablecerFabrica("basica")), undefined);
    await s.reload({ waitUntil: "networkidle" });
    assert.equal(await s.locator(".galeria > .tarjeta").count(), 5);
    assert.equal(await s.isVisible("#promo-banner"), false);
    assert.equal(await s.isVisible("#pie-cambio"), false);
    // Y otra vez la vitrina, como queda una instalación nueva.
    assert.equal(await usarApi(p, (a) => a.restablecerFabrica()), undefined);
    await s.reload({ waitUntil: "networkidle" });
    assert.equal(await s.locator(".galeria > .tarjeta").count(), 57);
    const g2 = await pagina(390);
    await entrar(g2, "gestor@local.co");
    assert.deepEqual(p.errores, []);
    await p.context().close();
    await g2.context().close();
  });

  await navegador.close();
  console.log(fallas ? `\n${fallas} falla(s)` : "\nOK: modo supabase de punta a punta");
  process.exit(fallas ? 1 : 0);
})();
