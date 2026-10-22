// =============================================================================
// Suite de aceptación (sección 12 del prompt) + accesibilidad, en modo demo.
//
//   python3 -m http.server 8080 &
//   NODE_PATH="$(npm root -g)" node tests/verificar.cjs
//   ICT_SOLO="carrusel|pop-up" ...   solo los casos cuyo nombre coincida
//   ICT_CAPTURAS=1 ...               además guarda capturas en tests/capturas/
//
// Si la red sale por proxy, exportar HTTPS_PROXY (Google Fonts).
// =============================================================================
const { chromium } = require("playwright");
const fs = require("fs");
const path = require("path");
const assert = require("assert/strict");

const BASE = process.env.ICT_BASE || "http://localhost:8080";
const SOLO = process.env.ICT_SOLO ? new RegExp(process.env.ICT_SOLO, "i") : null;
const CAPTURAS = process.env.ICT_CAPTURAS ? path.join(__dirname, "capturas") : null;
const RAIZ = path.join(__dirname, "..");
const CLAVE_DEMO = "cotizadora-demo:v1";

let navegador;
let fallas = 0;
let corridos = 0;

async function caso(nombre, fn) {
  if (SOLO && !SOLO.test(nombre)) return;
  corridos++;
  try { await fn(); console.log(`ok   ${nombre}`); } catch (e) { fallas++; console.log(`FALLA ${nombre}\n     ${String(e.message).split("\n").slice(0, +(process.env.ICT_LINEAS || 3)).join("\n     ")}`); }
}

// legales: true publica los textos legales con la tienda de prueba
// (tests/legal/datos-prueba.mjs) la primera vez que se abre el sitio o el
// panel. cookies: la elección guardada al empezar (null = sin elegir: aparece
// el banner); por defecto, todo rechazado.
const COOKIES_RECHAZADAS = { medicion: false, publicidad: false };
async function nueva(ancho = 1280, alto = 900, { legales = true, cookies = COOKIES_RECHAZADAS, ...opciones } = {}) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto }, ...opciones });
  const p = await ctx.newPage();
  p.legales = legales;
  if (cookies) {
    await ctx.addInitScript((c) => {
      try { if (!localStorage.getItem("cotizadora:cookies")) localStorage.setItem("cotizadora:cookies", JSON.stringify({ ...c, fecha: new Date().toISOString() })); } catch { /* nada */ }
    }, cookies);
  }
  p.errores = [];
  p.on("pageerror", (e) => p.errores.push(e.message));
  p.on("console", (m) => {
    if (m.type() === "error" && !/Failed to load resource|ERR_TUNNEL|fonts\.g/.test(m.text())) p.errores.push(m.text());
  });
  // Captura los wa.me que se intenten abrir.
  await ctx.addInitScript(() => {
    window.__abiertos = [];
    window.open = (u) => { window.__abiertos.push(String(u)); return null; };
  });
  return p;
}

// Publica los textos legales de prueba en el estado demo (una vez por página).
async function publicarLegales(p) {
  await p.evaluate(async ([clave, base]) => {
    const { publicar } = await import(`${base}/assets/js/legal/motor.js`);
    const { TIENDA_LEGAL_PRUEBA } = await import(`${base}/tests/legal/datos-prueba.mjs`);
    const e = JSON.parse(localStorage.getItem(clave));
    const legales = Object.entries(TIENDA_LEGAL_PRUEBA).filter(([k]) => /^(legal_|meta_pixel_id|ga4_|gtm_|clarity_|tiktok_|gads_|capi_|plataforma_)/.test(k));
    Object.assign(e.tienda, Object.fromEntries(legales));
    e.tienda.legal_publicado = publicar(e.tienda, null, "2026-10-21");
    localStorage.setItem(clave, JSON.stringify(e));
  }, [CLAVE_DEMO, BASE]);
}
// Vuelve a publicar con cambios (ej. más herramientas): sube la versión.
async function publicarLegalesCon(p, cambios) {
  await p.evaluate(async ([clave, base, cambios]) => {
    const { publicar } = await import(`${base}/assets/js/legal/motor.js`);
    const e = JSON.parse(localStorage.getItem(clave));
    Object.assign(e.tienda, cambios);
    e.tienda.legal_publicado = publicar(e.tienda, e.tienda.legal_publicado, "2026-10-21");
    localStorage.setItem(clave, JSON.stringify(e));
  }, [CLAVE_DEMO, BASE, cambios]);
}
async function asegurarLegales(p) {
  if (!p.legales || p.legalesListos) return false;
  p.legalesListos = true;
  await p.waitForFunction((clave) => localStorage.getItem(clave), CLAVE_DEMO);
  await publicarLegales(p);
  return true;
}

async function ir(p, ruta = "/") {
  await p.goto(BASE + ruta, { waitUntil: "networkidle" });
  if (await asegurarLegales(p)) await p.goto(BASE + ruta, { waitUntil: "networkidle" });
  await p.waitForFunction(() => !document.querySelector("#lista-equipos[aria-busy]") || !document.querySelector("#lista-equipos"));
  await p.waitForTimeout(150);
}

// Cambia el estado del back-end demo directamente (como si lo hiciera el panel).
// fn se pasa como texto: los valores de afuera van en "arg".
async function editarDemo(p, fn, arg = null) {
  await p.evaluate(([clave, cuerpo, arg]) => {
    const e = JSON.parse(localStorage.getItem(clave));
    new Function("e", "arg", cuerpo)(e, arg);
    localStorage.setItem(clave, JSON.stringify(e));
  }, [CLAVE_DEMO, `(${fn.toString()})(e, arg)`, arg]);
}

async function captura(p, nombre) {
  if (!CAPTURAS) return;
  fs.mkdirSync(CAPTURAS, { recursive: true });
  await p.screenshot({ path: path.join(CAPTURAS, `${nombre}.png`), fullPage: true });
}

// El gestor entra a Inicio; el administrador, a Usuarios.
async function entrarPanel(p, correo) {
  await p.goto(`${BASE}/admin/`);
  await asegurarLegales(p);
  await p.fill("#l-correo", correo);
  await p.fill("#l-clave", "demo1234");
  await p.click("#form-login [type=submit]");
  await p.waitForSelector(correo.startsWith("administrador") ? "#form-invitar" : ".estadisticas");
}

async function llenarPopup(p) {
  await p.fill("#p-nombre", "Juan Pérez");
  await p.fill("#p-correo", "juan@correo.co");
  await p.click("#p-telefono");
  await p.keyboard.type("3001234567");
  await p.check("#p-autorizacion");
}

(async () => {
  const args = [];
  if (process.env.HTTPS_PROXY) args.push(`--proxy-server=${process.env.HTTPS_PROXY}`, "--proxy-bypass-list=127.0.0.1;localhost");
  navegador = await chromium.launch({ args });

  // ---------------------------------------------------------------- 12.1
  await caso("1. modo demo: franja y DEMO; al borrar los datos demo desaparecen", async () => {
    const p = await nueva();
    await ir(p);
    assert.ok(await p.isVisible("#franja-demo"));
    assert.equal(await p.textContent("#franja-demo").then((t) => t.trim()), "Sitio en preparación: los equipos y precios son de demostración.");
    assert.equal(await p.locator(".tarjeta .etiqueta-demo").count(), 5);
    await entrarPanel(p, "gestor@demo.co");
    await p.click("#borrar-demo");
    await p.click('#confirmar [value="si"]');
    await p.waitForSelector("text=Datos de demostración borrados");
    await ir(p);
    assert.equal(await p.isVisible("#franja-demo"), false);
    assert.equal(await p.locator(".etiqueta-demo").count(), 0);
    assert.equal(await p.isVisible("#vacio"), true);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  // ---------------------------------------------------------------- 12.2
  await caso("2. Nuevo + iPhone 18 Pro Max + 256 GB: solo eso, y el carrusel con exactamente sus colores", async () => {
    const p = await nueva(390, 844);
    await ir(p);
    await p.click(".segmento[data-valor='nuevo']");
    await p.click("#f-modelo-boton");
    await p.click('[role="option"][data-valor="iphone-18-pro-max"]');
    await p.click(".chip[data-valor='256 GB']");
    await p.waitForTimeout(600);
    assert.equal(new URL(p.url()).search, "?condicion=nuevo&modelo=iphone-18-pro-max&capacidad=256-gb");
    assert.equal(await p.locator(".galeria > .tarjeta").count(), 1);
    // El stock es sí/no: el contador cuenta equipos (Negro y Plata), no unidades.
    assert.equal(await p.textContent("#contador"), "2 equipos disponibles");
    // Una sola tarjeta con los tres filtros: el detalle se abre solo debajo.
    assert.ok(await p.isVisible("#detalle-en-linea .detalle"));
    const colores = await p.locator("#detalle-en-linea .color-boton").allTextContents();
    assert.deepEqual(colores.map((c) => c.trim()), ["Negro", "Plata"]);
    assert.equal(await p.locator("#detalle-en-linea .diapositiva").count(), 2);
    await captura(p, "02-filtros-360");
    await p.context().close();
  });

  // ---------------------------------------------------------------- 12.3
  await caso("3. filtros: solo opciones con stock, y un cambio que invalida una elección la limpia", async () => {
    const p = await nueva();
    await ir(p);
    await p.click(".segmento[data-valor='usado']");
    await p.click("#f-modelo-boton");
    const opciones = await p.locator('[role="option"]').evaluateAll((els) => els.map((e) => e.dataset.valor));
    assert.deepEqual(opciones, ["", "iphone-15-pro", "iphone-13"]);
    await p.click('[role="option"][data-valor="iphone-15-pro"]');
    assert.deepEqual(await p.locator(".chip").allTextContents(), ["128 GB"]);
    await p.click(".chip[data-valor='128 GB']");
    // Cambiar a Nuevo deja inválidos el modelo y la capacidad: se limpian.
    await p.click(".segmento[data-valor='nuevo']");
    await p.waitForTimeout(100);
    assert.equal((await p.textContent("#f-modelo-boton .valor")).trim(), "Todos los modelos");
    assert.equal(await p.locator('.chip[aria-pressed="true"]').count(), 0);
    assert.deepEqual(await p.locator(".chip").allTextContents(), ["256 GB", "512 GB"]);
    assert.equal(new URL(p.url()).search, "?condicion=nuevo");
    // Un segundo toque desmarca
    await p.click(".segmento[data-valor='nuevo']");
    assert.equal(await p.locator('.segmento[aria-pressed="true"]').count(), 0);
    assert.equal(await p.textContent("#contador"), "6 equipos disponibles");
    await p.context().close();
  });

  // ---------------------------------------------------------------- 12.4
  await caso("4. un equipo sin stock o sin publicar no aparece", async () => {
    const p = await nueva();
    await ir(p);
    await editarDemo(p, (e) => {
      e.equipos.find((q) => q.color_nombre_mostrar === "Glacier").en_stock = false;
      e.equipos.find((q) => q.capacidad === "512 GB").publicado = false;
    });
    await ir(p);
    const texto = await p.textContent("#lista-equipos");
    assert.ok(!/iPhone 18 Pro\b(?! Max)/.test(texto), "el 18 Pro sin stock sigue visible");
    assert.equal(await p.locator(".galeria > .tarjeta").count(), 3);
    assert.equal(await p.textContent("#contador"), "4 equipos disponibles");
    await p.click("#f-modelo-boton");
    assert.equal(await p.locator('[role="option"][data-valor="iphone-18-pro"]').count(), 0);
    await p.context().close();
  });

  await caso("stock: el interruptor de la lista oculta y vuelve a mostrar el equipo en el sitio", async () => {
    const p = await nueva();
    await entrarPanel(p, "gestor@demo.co");
    await p.goto(`${BASE}/admin/#/inventario`);
    await p.waitForSelector(".fila-equipo");
    const fila = p.locator('.fila-equipo:has-text("Glacier")');
    const estado = () => fila.locator(".interruptor-estado").innerText().then((t) => t.trim());
    assert.equal(await estado(), "Con stock");
    await fila.locator('[data-campo="en_stock"]').uncheck();
    const glacierEnStock = () => p.evaluate((clave) => JSON.parse(localStorage.getItem(clave)).equipos.find((q) => q.color_nombre_mostrar === "Glacier").en_stock, CLAVE_DEMO);
    await p.waitForFunction((clave) => JSON.parse(localStorage.getItem(clave)).equipos.some((q) => !q.en_stock), CLAVE_DEMO);
    assert.equal(await glacierEnStock(), false);
    assert.equal(await estado(), "Sin stock");
    await ir(p);
    assert.equal(await p.textContent("#contador"), "5 equipos disponibles");
    assert.ok(!/iPhone 18 Pro\b(?! Max)/.test(await p.textContent("#lista-equipos")));
    // El filtro especial de la lista muestra solo los equipos sin stock.
    await p.goto(`${BASE}/admin/#/inventario?stock=0`);
    await p.waitForSelector("#filtro-especial:not([hidden])");
    assert.equal(await p.locator(".fila-equipo").count(), 1);
    await p.locator('.fila-equipo [data-campo="en_stock"]').check();
    assert.ok((await p.textContent(".fila-equipo")).includes("sin stock: no se ve"));
    await p.waitForFunction((clave) => JSON.parse(localStorage.getItem(clave)).equipos.every((q) => q.en_stock), CLAVE_DEMO);
    await ir(p);
    assert.equal(await p.textContent("#contador"), "6 equipos disponibles");
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  // ---------------------------------------------------------------- 12.5
  await caso("5. cambiar un precio en el panel lo cambia en el sitio y actualiza la fecha del pie", async () => {
    const p = await nueva();
    await ir(p);
    await editarDemo(p, (e) => { e.tienda.precios_actualizados_en = "2026-01-02T15:00:00Z"; });
    await ir(p);
    assert.equal(await p.textContent("#pie-precios"), "Precios actualizados al 2/1/2026");
    await entrarPanel(p, "gestor@demo.co");
    await p.goto(`${BASE}/admin/#/inventario`);
    const fila = p.locator(".fila-equipo", { hasText: "Medianoche" });
    await fila.locator('[data-campo="precio"]').fill("1.750.000");
    await fila.locator('[data-campo="precio"]').press("Enter");
    await p.waitForSelector("#aviso-flotante.visible");
    await ir(p, "/?condicion=usado&modelo=iphone-13&capacidad=128-gb");
    assert.match(await p.textContent("#lista-equipos"), /\$1\.750\.000/);
    const f = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: "America/Bogota", day: "numeric", month: "numeric", year: "numeric" }).formatToParts(new Date()).map((x) => [x.type, x.value]));
    assert.equal(await p.textContent("#pie-precios"), `Precios actualizados al ${f.day}/${f.month}/${f.year}`);
    await p.context().close();
  });

  // ---------------------------------------------------------------- 12.6
  await caso("6. UTM: el envío lleva nombre, correo, teléfono y todos los campos ocultos", async () => {
    const p = await nueva(390, 844);
    await ir(p, "/?utm_source=meta&utm_campaign=test&ad_id=123&fbclid=prueba");
    // Los filtros cambian la URL pero no borran la atribución guardada.
    await p.click(".segmento[data-valor='nuevo']");
    await p.click(".tarjeta-boton >> nth=0");
    await p.click(".hoja-barra [data-comprar]");
    await llenarPopup(p);
    await p.click("[data-enviar]");
    await p.waitForSelector("text=Su pedido está listo");
    const lead = JSON.parse(await p.evaluate(() => sessionStorage.getItem("cotizadora-demo:ultimo-lead")));
    assert.equal(lead.nombre, "Juan Pérez");
    assert.equal(lead.correo, "juan@correo.co");
    assert.equal(lead.telefono, "+573001234567");
    assert.equal(lead.utm_source, "meta");
    assert.equal(lead.utm_campaign, "test");
    assert.equal(lead.ad_id, "123");
    assert.equal(lead.fbclid, "prueba");
    for (const k of ["modelo", "condicion", "capacidad", "color", "precio_cotizado", "equipo_id", "tipo_consulta", "codigo_cotizacion", "utm_medium", "utm_term", "utm_content"]) {
      assert.ok(k in lead, `falta ${k}`);
    }
    assert.equal(lead.tipo_consulta, "compra");
    assert.match(lead.codigo_cotizacion, /^COT-[ABCDEFGHJKLMNPQRSTUVWXYZ2-9]{4}$/);
    // Los campos ocultos del <form> real quedan completos (para el script de GHL)
    await p.context().close();
  });

  // ---------------------------------------------------------------- 12.7 y 12.8
  await caso("7 y 8. WhatsApp con el mensaje exacto; un usado lleva batería y estado en la ficha y en el mensaje", async () => {
    const p = await nueva(390, 844);
    await ir(p);
    await editarDemo(p, (e) => { e.tienda.whatsapp = "573001234567"; });
    await ir(p, "/?condicion=usado&modelo=iphone-15-pro&capacidad=128-gb");
    const ficha = await p.textContent("#detalle-en-linea .detalle-ficha");
    assert.match(ficha, /Batería88%/);
    assert.match(ficha, /Estado estéticoExcelente/);
    await p.click("#detalle-en-linea [data-comprar]");
    await llenarPopup(p);
    await p.click("[data-enviar]");
    await p.waitForSelector("text=Su pedido está listo");
    const codigo = (await p.textContent(".popup-estado .codigo")).trim();
    const abierto = (await p.evaluate(() => window.__abiertos))[0];
    assert.ok(abierto, "no se intentó abrir WhatsApp");
    const url = new URL(abierto);
    assert.equal(url.origin + url.pathname, "https://wa.me/573001234567");
    assert.equal(url.searchParams.get("text"), [
      "Hola, quiero comprar este equipo:",
      "iPhone 15 Pro Usado",
      "128 GB · Titanio natural",
      "Precio: $3.000.000",
      "Batería 88% · Estado: Excelente",
      `Código: ${codigo}`,
      "Soy Juan Pérez."
    ].join("\n"));
    assert.equal(await p.getAttribute("[data-abrir-wa]", "href"), abierto);
    assert.match(await p.textContent(".popup-estado"), new RegExp(`Su código: ${codigo}\\. Si nos escribe desde otro número, menciónelo\\.`));
    await p.context().close();
  });

  await caso("7b. sin stock: consulta con el mensaje de búsqueda", async () => {
    const p = await nueva();
    await ir(p);
    await editarDemo(p, (e) => { e.tienda.whatsapp = "573001234567"; });
    // Un anuncio que apunta a un modelo activo sin esa capacidad
    await ir(p, "/?condicion=nuevo&modelo=iphone-18-pro&capacidad=1-tb");
    assert.ok(await p.isVisible("#vacio"));
    assert.equal((await p.textContent(".vacio-texto")).trim(), "En este momento no tenemos ese equipo publicado.");
    await p.click("#consultar-sin-stock");
    await llenarPopup(p);
    await p.click("[data-enviar]");
    await p.waitForSelector("text=Su pedido está listo");
    const codigo = (await p.textContent(".popup-estado .codigo")).trim();
    const texto = new URL((await p.evaluate(() => window.__abiertos))[0]).searchParams.get("text");
    assert.equal(texto, `Hola, busco un iPhone 18 Pro nuevo de 1 TB. ¿Lo tienen disponible? Código: ${codigo}. Soy Juan Pérez.`);
    const lead = JSON.parse(await p.evaluate(() => sessionStorage.getItem("cotizadora-demo:ultimo-lead")));
    assert.equal(lead.tipo_consulta, "sin stock");
    await p.context().close();
  });

  await caso("pop-up: errores, foco al primer error, reintento y WhatsApp tras dos fallos", async () => {
    const p = await nueva(390, 844);
    await ir(p);
    await editarDemo(p, (e) => { e.tienda.whatsapp = "573001234567"; });
    await ir(p);
    await p.click(".tarjeta-boton >> nth=0");
    await p.click(".hoja-barra [data-comprar]");
    assert.equal(await p.textContent("#popup-titulo"), "Antes de pasar a WhatsApp");
    await p.click("[data-enviar]");
    assert.equal(await p.textContent("#p-nombre-error"), "Escriba su nombre.");
    assert.equal(await p.textContent("#p-correo-error"), "Revise su correo.");
    assert.equal(await p.textContent("#p-telefono-error"), "Escriba un celular de 10 dígitos que empiece por 3, sin el +57.");
    assert.equal(await p.textContent("#p-autorizacion-error"), "Para continuar, acepte la autorización de datos.");
    assert.equal(await p.evaluate(() => document.activeElement.id), "p-nombre");
    await p.click("#p-telefono");
    await p.keyboard.type("2001234567");
    await p.click("#p-nombre");
    assert.equal(await p.inputValue("#p-telefono"), "200 123 4567");
    assert.equal(await p.getAttribute("#p-telefono", "aria-invalid"), "true");
    await p.evaluate(() => sessionStorage.setItem("cotizadora-demo:fallos-lead", "2"));
    await p.fill("#p-telefono", "");
    await llenarPopup(p);
    await p.click("[data-enviar]");
    await p.waitForSelector("text=No pudimos guardar sus datos. Inténtelo de nuevo.");
    assert.equal(await p.isVisible("[data-wa-respaldo]"), false);
    await p.click("[data-enviar]");
    await p.waitForFunction(() => !document.querySelector("[data-wa-respaldo]").hidden);
    assert.match(await p.getAttribute("[data-wa-respaldo]", "href"), /^https:\/\/wa\.me\/573001234567\?text=/);
    assert.equal((await p.evaluate(() => window.__abiertos)).length, 0);
    await p.click("[data-enviar]");
    await p.waitForSelector("text=Su pedido está listo");
    await p.context().close();
  });

  // ---------------------------------------------------------------- 12.9
  await caso("9. /admin sin sesión pide login; el gestor no ve Usuarios (ni por la interfaz ni en la capa de datos)", async () => {
    const p = await nueva(390, 844);
    await p.goto(`${BASE}/admin/#/usuarios`);
    await p.waitForSelector("#form-login");
    await p.fill("#l-correo", "gestor@demo.co");
    await p.fill("#l-clave", "mala");
    await p.click("#form-login [type=submit]");
    await p.waitForSelector("#l-alerta:not([hidden])");
    assert.equal(await p.textContent("#l-alerta"), "El correo o la contraseña no coinciden.");
    await entrarPanel(p, "gestor@demo.co");
    // Inicio: la tarjeta de inventario muestra solo Publicados y En borrador.
    assert.deepEqual(await p.locator(".estadistica span").allTextContents(), ["Publicados", "En borrador"]);
    assert.equal(await p.isVisible('[data-ruta="usuarios"]'), false);
    await p.goto(`${BASE}/admin/#/usuarios`);
    await p.waitForSelector(".estadisticas"); // vuelve a Inicio
    // El gestor tiene el modo demo y el catálogo completo (renombrar y ordenar).
    assert.equal(await p.isVisible("#borrar-demo"), true);
    assert.equal(await p.textContent("#barra-usuario"), "gestor@demo.co · Gestor");
    await p.goto(`${BASE}/admin/#/catalogo`);
    await p.waitForSelector(".modelo-fila");
    assert.equal(await p.locator("[data-renombrar]").count(), 42);
    // La capa de datos también lo impide (no solo la interfaz): un intento
    // directo de gestionar usuarios falla.
    const errores = await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const a = await api();
      const r = [];
      try { await a.invitarUsuario("otro@tienda.co", "administrador"); r.push(""); } catch (e) { r.push(e.message); }
      try { await a.cambiarEstadoUsuario("demo-1", false); r.push(""); } catch (e) { r.push(e.message); }
      try { await a.cambiarRolUsuario("demo-2", "administrador"); r.push(""); } catch (e) { r.push(e.message); }
      r.push((await a.listarUsuarios()).length);
      return r;
    });
    assert.deepEqual(errores, ["Solo el administrador puede gestionar usuarios.", "Solo el administrador puede gestionar usuarios.", "Solo el administrador puede gestionar usuarios.", 1]);
    await captura(p, "09-panel-catalogo-360");
    await p.context().close();
  });

  await caso("catálogo: 42 modelos desde el iPhone 7 y sus colores oficiales (completar la muestra, colores de la tienda)", async () => {
    const p = await nueva();
    await entrarPanel(p, "gestor@demo.co");
    await p.goto(`${BASE}/admin/#/catalogo`);
    await p.waitForSelector(".modelo-fila");
    assert.equal(await p.locator(".modelo-fila").count(), 42);
    const h2 = await p.locator(".grupo-catalogo h2").allTextContents();
    assert.deepEqual(h2, ["Plegable", "Generación 18", "Generación 17", "Generación 16", "Generación 15", "Generación 14", "Generación 13", "Generación 12", "Generación 11", "Generación XS y XR", "Generación 8", "Generación 7"]);
    const fila = p.locator('.modelo-fila:has(input[value="iPhone 18 Pro"])');
    await fila.locator(".colores-modelo > summary").click();
    // El hexadecimal de la fuente es de solo lectura; el que falta se completa.
    const burdeos = fila.locator('li:has-text("Borgoña")');
    assert.equal((await burdeos.locator(".color-hex").textContent()).trim(), "#632432");
    assert.equal(await burdeos.locator("input").count(), 0);
    // C1 (0022): el que no trae hexadecimal tiene uno aproximado, marcado, que se puede cambiar.
    // (Antes este caso esperaba la muestra vacía; ahora espera la aproximada.)
    const oliva = fila.locator('li:has-text("Oliva")');
    assert.equal(await oliva.locator(".muestra-color--vacia").count(), 0);
    assert.equal(await oliva.locator("input[data-hex]").inputValue(), "#6B6E4E");
    assert.ok((await oliva.textContent()).includes("Muestra aproximada"));
    assert.match(await p.textContent("#nota-hex"), /^El hexadecimal solo pinta la muestra del color en el sitio/);
    assert.equal(await p.evaluate((clave) => JSON.parse(localStorage.getItem(clave)).colores.filter((c) => c.hex_aproximado).length, CLAVE_DEMO), 151);
    await oliva.locator("input[data-hex]").fill("5a5d3c");
    await oliva.locator("input[data-hex]").press("Enter");
    assert.match(await oliva.locator(".error-campo").textContent(), /#RRGGBB/);
    await oliva.locator("input[data-hex]").fill("#5a5d3c");
    await oliva.locator("input[data-hex]").press("Enter");
    await p.waitForFunction((clave) => JSON.parse(localStorage.getItem(clave)).colores.find((c) => c.nombre_es === "Oliva").hex === "#5A5D3C", CLAVE_DEMO);
    assert.deepEqual(await p.evaluate((clave) => { const c = JSON.parse(localStorage.getItem(clave)).colores.find((x) => x.nombre_es === "Oliva"); return [c.hex, c.hex_aproximado]; }, CLAVE_DEMO), ["#5A5D3C", false], "cambiado por el gestor, ya no es aproximado");
    // En un modelo con colores oficiales no se agregan otros, y la capa de
    // datos tampoco deja cambiar un hex de la fuente.
    assert.equal(await fila.locator("[data-agregar-color]").count(), 0);
    const error = await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const a = await api();
      const c = (await a.listarColores()).find((x) => x.nombre_en === "Burgundy");
      try { await a.guardarColor(c.id, { hex: "#000000" }); return ""; } catch (e) { return e.message; }
    });
    assert.match(error, /viene de la fuente/);

    // Colores de la tienda: solo en modelos sin colores oficiales (17 Pro)
    const q = p;
    const pro = q.locator('.modelo-fila:has(.nombre:text-is("iPhone 17 Pro")), .modelo-fila:has(input[value="iPhone 17 Pro"])');
    assert.match(await pro.locator(".colores-modelo > summary").textContent(), /no tiene colores oficiales/);
    await pro.locator(".colores-modelo > summary").click();
    await pro.locator("[data-nombre-color]").fill("Naranja");
    await pro.locator("[data-hex-nuevo]").fill("#E8772E");
    await pro.locator('[data-agregar-color] [type="submit"]').click();
    await q.waitForSelector('li:has-text("Naranja") >> text=De la tienda');
    const dieciseis = q.locator('.modelo-fila:has(input[value="iPhone 16"])');
    assert.equal(await dieciseis.locator("[data-agregar-color]").count(), 0);
    assert.deepEqual(q.errores, []);
    await q.context().close();
  });

  await caso("color oficial: el equipo elige un color del modelo y el nombre a mostrar llega al sitio, WhatsApp y el píxel", async () => {
    const p = await nueva(390, 844, { cookies: { medicion: false, publicidad: true } });
    await p.route("https://connect.facebook.net/**", (r) => r.fulfill({ contentType: "text/javascript", body: "" }));
    await entrarPanel(p, "gestor@demo.co");
    await p.goto(`${BASE}/admin/#/inventario/nuevo`);
    await p.waitForSelector("#form-equipo");
    await p.selectOption("#e-modelo", { label: "iPhone 17 (inactivo)" });
    await p.click("#siguiente");
    await p.check('input[name="e-condicion"][value="nuevo"]', { force: true }); await p.click("#siguiente");
    await p.check('input[name="e-capacidad"][value="256 GB"]', { force: true }); await p.click("#siguiente");
    // No hay forma de crear colores ni de escribir un hexadecimal desde el equipo:
    // solo los 5 colores oficiales del iPhone 17 y el nombre a mostrar.
    assert.deepEqual(await p.locator(".opcion-color .opcion-color-nombres > span:first-child").allTextContents(), ["Lavender", "Sage Green", "Mist Blue", "Blanco", "Negro"]);
    assert.equal(await p.locator('[data-paso="color"] input:not([type=radio])').count(), 1);
    assert.equal(await p.locator('[data-paso="color"] input[type=color]').count(), 0);
    await p.check('.opcion-color:has-text("Lavender") input', { force: true });
    await p.fill("#e-color-mostrar", "Lila");
    // Cambiar el modelo borra el color elegido
    await p.click("#anterior"); await p.click("#anterior"); await p.click("#anterior");
    await p.selectOption("#e-modelo", { label: "iPhone Air (inactivo)" });
    await p.click("#siguiente"); await p.click("#siguiente"); await p.click("#siguiente");
    assert.equal(await p.locator('input[name="e-color"]:checked').count(), 0);
    assert.deepEqual(await p.locator(".opcion-color .opcion-color-nombres > span:first-child").allTextContents(), ["Sky Blue", "Light Gold", "Cloud White", "Space Black"]);
    await p.click("#anterior"); await p.click("#anterior"); await p.click("#anterior");
    await p.selectOption("#e-modelo", { label: "iPhone 17 (inactivo)" });
    await p.click("#siguiente"); await p.click("#siguiente"); await p.click("#siguiente");
    await p.check('.opcion-color:has-text("Lavender") input', { force: true });
    await p.click("#siguiente");
    await p.fill("#e-precio", "4.500.000"); await p.click("#siguiente");
    await p.click("#siguiente"); // fotos
    await p.check("#e-publicado");
    assert.match(await p.textContent("#resumen-equipo"), /iPhone 17 · Nuevo · 256 GB · Lila/);
    await p.click("#guardar");
    await p.waitForURL(/#\/inventario$/);
    assert.match(await p.textContent('.fila-equipo:has-text("iPhone 17")'), /Lila/);
    // La capa de datos tampoco acepta un color de otro modelo.
    const error = await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const a = await api();
      const colores = await a.listarColores();
      const modelos = await a.listarModelos();
      const m17 = modelos.find((m) => m.slug === "iphone-17").id;
      const ajeno = colores.find((c) => c.modelo_id !== m17).id;
      try { await a.crearEquipo({ modelo_id: m17, condicion: "nuevo", capacidad: "512 GB", precio: 1, color_id: ajeno }); return ""; } catch (e) { return e.message; }
    });
    assert.equal(error, "El color elegido no es de este modelo.");

    // En el sitio: tarjeta, detalle, texto alternativo, WhatsApp y píxel con "Lila".
    await editarDemo(p, (e) => { e.tienda.whatsapp = "573001234567"; });
    await ir(p, "/?condicion=nuevo&modelo=iphone-17&capacidad=256-gb");
    assert.equal((await p.textContent("#detalle-en-linea [data-color-actual]")).trim(), "Lila");
    assert.match(await p.textContent("#detalle-en-linea .detalle-variante"), /256 GB · Lila/);
    // Sin foto, la ilustración lleva el texto alternativo en aria-label.
    assert.equal(await p.getAttribute('#detalle-en-linea .diapositiva [role="img"]', "aria-label"), "iPhone 17, 256 GB, color Lila");
    assert.equal(await p.getAttribute('.tarjeta:has-text("iPhone 17") .muestra', "style"), "--c:#C6BFE6");
    await p.click("#detalle-en-linea [data-comprar]");
    await llenarPopup(p);
    await p.click("[data-enviar]");
    await p.waitForSelector("text=Su pedido está listo");
    const wa = new URL((await p.evaluate(() => window.__abiertos))[0]).searchParams.get("text");
    assert.match(wa, /^256 GB · Lila$/m);
    const cola = await p.evaluate(() => window.fbq.queue.map((a) => JSON.parse(JSON.stringify([...a]))));
    assert.equal(cola.find((a) => a[1] === "Lead")[2].content_name, "iPhone 17 256 GB Lila");
    // Sin nombre a mostrar, se ve el oficial en inglés.
    await editarDemo(p, (e) => { e.equipos.find((q) => q.color_nombre_mostrar === "Lila").color_nombre_mostrar = ""; });
    await ir(p, "/?condicion=nuevo&modelo=iphone-17&capacidad=256-gb");
    assert.equal((await p.textContent("#detalle-en-linea [data-color-actual]")).trim(), "Lavender");
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("video: se valida antes de subir (formato, H.264, 15 s, 20 MB) y se borra al quitarlo o al borrar el equipo", async () => {
    const p = await nueva();
    await entrarPanel(p, "gestor@demo.co");
    const videos = path.join(RAIZ, "tests", "videos");
    // Archivos guardados en el navegador (IndexedDB del modo demo)
    const guardados = () => p.evaluate(() => new Promise((r) => {
      const pedido = indexedDB.open("cotizadora-demo");
      pedido.onsuccess = () => { const k = pedido.result.transaction("archivos").objectStore("archivos").getAllKeys(); k.onsuccess = () => r(k.result.filter((x) => /\.(mp4|webm|mov)$/.test(x))); };
    }));
    const glaciar = await p.evaluate((clave) => JSON.parse(localStorage.getItem(clave)).equipos.find((q) => q.color_nombre_mostrar === "Glacier").id, CLAVE_DEMO);
    await p.goto(`${BASE}/admin/#/inventario/${glaciar}`);
    await p.waitForSelector("#form-equipo");
    const subir = async (nombre, opciones) => {
      await p.setInputFiles("#e-video", opciones || path.join(videos, nombre));
      await p.waitForFunction(() => document.querySelector("#subiendo-video").hidden);
      return (await p.textContent("#e-video-error")).trim();
    };
    const formato = "Este formato puede no verse en todos los celulares. Súbalo en MP4.";
    assert.equal(await subir("clip.mov"), formato);
    assert.equal(await subir("hevc.mp4"), formato, "un MP4 en HEVC no es H.264");
    assert.equal(await subir("largo.mp4"), "El video dura más de 15 segundos. Súbalo más corto.");
    assert.equal(await subir("", { name: "pesado.mp4", mimeType: "video/mp4", buffer: Buffer.alloc(20 * 1024 * 1024 + 1) }), "El video pesa más de 20 MB.");
    // Nada de eso se subió.
    assert.deepEqual(await guardados(), []);
    // Un MP4 H.264 de 3 s y un WebM sí.
    assert.equal(await subir("corto.webm"), "");
    assert.equal(await subir("corto.mp4"), "");
    assert.equal(await p.locator("#video-actual video").count(), 1);
    await p.click("#guardar");
    await p.waitForURL(/#\/inventario$/);
    let e = await p.evaluate((clave) => JSON.parse(localStorage.getItem(clave)), CLAVE_DEMO);
    const ruta = e.equipos.find((q) => q.id === glaciar).video;
    assert.match(ruta, /^equipos\/[\w-]+\.mp4$/);
    // El WebM que se reemplazó se borró al guardar; queda solo el MP4.
    assert.deepEqual(await guardados(), [ruta]);
    // Quitar el video y guardar borra el archivo.
    await p.goto(`${BASE}/admin/#/inventario/${glaciar}`);
    await p.waitForSelector("#quitar-video");
    await p.click("#quitar-video");
    await p.click("#guardar");
    await p.waitForURL(/#\/inventario$/);
    e = await p.evaluate((clave) => JSON.parse(localStorage.getItem(clave)), CLAVE_DEMO);
    assert.equal(e.equipos.find((q) => q.id === glaciar).video, "");
    assert.deepEqual(await guardados(), []);
    // Borrar el equipo borra también su video.
    await p.goto(`${BASE}/admin/#/inventario/${glaciar}`);
    await p.waitForSelector("#form-equipo");
    assert.equal(await subir("corto.mp4"), "");
    await p.click("#guardar");
    await p.waitForURL(/#\/inventario$/);
    assert.equal((await guardados()).length, 1);
    await p.click('.fila-equipo:has-text("Glacier") [data-borrar]');
    await p.click('#confirmar [value="si"]');
    await p.waitForSelector("text=Equipo borrado");
    assert.deepEqual(await guardados(), []);
    // La capa de datos repite los límites de Storage.
    const r = await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const a = await api();
      try { await a.subirArchivo("videos", "equipos/x.mov", new Blob(["x"], { type: "video/quicktime" })); return ""; } catch (err) { return err.message; }
    });
    assert.equal(r, formato);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("más vendido: hasta 3 en la lista y en el formulario; el cuarto se rechaza; Duplicar no lo copia", async () => {
    const p = await nueva(1280, 900);
    await entrarPanel(p, "gestor@demo.co");
    await p.goto(`${BASE}/admin/#/inventario`);
    await p.waitForSelector(".fila-equipo");
    const marcados = () => p.evaluate((clave) => JSON.parse(localStorage.getItem(clave)).equipos.filter((q) => q.mas_vendido).length, CLAVE_DEMO);
    const filas = p.locator(".fila-equipo");
    for (let i = 0; i < 3; i++) {
      await filas.nth(i).locator('[data-campo="mas_vendido"]').check();
      await p.waitForFunction(([clave, n]) => JSON.parse(localStorage.getItem(clave)).equipos.filter((q) => q.mas_vendido).length === n, [CLAVE_DEMO, i + 1]);
    }
    // El cuarto: aviso, el interruptor vuelve a apagado y no se guarda.
    const cuarta = filas.nth(3);
    await cuarta.locator('[data-campo="mas_vendido"]').click();
    assert.equal((await cuarta.locator(".fila-error").textContent()).trim(), "Ya tiene 3 equipos marcados como más vendidos. Desmarque uno para marcar este.");
    assert.equal(await cuarta.locator('[data-campo="mas_vendido"]').isChecked(), false);
    assert.equal(await marcados(), 3);
    // La capa de datos también lo impide.
    const error = await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const a = await api();
      const q = (await a.listarEquipos()).find((x) => !x.mas_vendido);
      try { await a.actualizarEquipo(q.id, { mas_vendido: true }); return ""; } catch (e) { return e.message; }
    });
    assert.equal(error, "Ya tiene 3 equipos marcados como más vendidos. Desmarque uno para marcar este.");
    // En el formulario: no deja guardar el cuarto; desmarcando uno, sí.
    const libre = await p.evaluate((clave) => JSON.parse(localStorage.getItem(clave)).equipos.find((q) => !q.mas_vendido).id, CLAVE_DEMO);
    await p.goto(`${BASE}/admin/#/inventario/${libre}`);
    await p.waitForSelector("#form-equipo");
    await p.check("#e-mas-vendido");
    await p.click("#guardar");
    assert.equal(await p.textContent("#e-mas-vendido-error"), "Ya tiene 3 equipos marcados como más vendidos. Desmarque uno para marcar este.");
    assert.equal(await p.evaluate(() => document.activeElement.id), "e-mas-vendido");
    await p.goto(`${BASE}/admin/#/inventario`);
    await p.click('#confirmar [value="si"]');
    await p.waitForSelector(".fila-equipo");
    await filas.nth(0).locator('[data-campo="mas_vendido"]').uncheck();
    await p.waitForFunction((clave) => JSON.parse(localStorage.getItem(clave)).equipos.filter((q) => q.mas_vendido).length === 2, CLAVE_DEMO);
    await p.goto(`${BASE}/admin/#/inventario/${libre}`);
    await p.waitForSelector("#form-equipo");
    await p.check("#e-mas-vendido");
    await p.click("#guardar");
    await p.waitForURL(/#\/inventario$/);
    assert.equal(await marcados(), 3);
    // Duplicar no copia "Más vendido".
    await p.goto(`${BASE}/admin/#/inventario/nuevo?desde=${libre}`);
    await p.waitForSelector("#form-equipo");
    assert.equal(await p.isChecked("#e-mas-vendido"), false);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  // "Más vendido" en el sitio (reemplaza la comprobación vieja "no se ve en
  // el sitio", que dejó de tener sentido con la fase B de la ronda 2).
  const marcarMasVendido = (p, ids) => editarDemo(p, (e, x) => { for (const q of e.equipos) q.mas_vendido = x.includes(q.id); }, ids);
  const estadoMasVendido = (p) => p.evaluate(() => [...document.querySelectorAll("#lista-equipos > .tarjeta")].map((li) => {
    const luz = li.querySelector(".tarjeta-brillo > span");
    const anim = luz?.getAnimations()[0];
    return {
      clave: li.dataset.clave,
      marcada: li.classList.contains("tarjeta--mas-vendido"),
      etiqueta: li.querySelector(".etiqueta-pildora--mas-vendido")?.textContent || "",
      anillo: Boolean(li.querySelector(".tarjeta-brillo")),
      corre: anim?.playState === "running",
      propiedades: anim ? [...new Set(anim.effect.getKeyframes().flatMap((k) => Object.keys(k).filter((x) => !["offset", "computedOffset", "easing", "composite"].includes(x))))] : []
    };
  }));
  const contrasteDe = (p, selector) => p.evaluate((sel) => {
    const el = document.querySelector(sel);
    const rgb = (c) => c.match(/[\d.]+/g).map(Number);
    const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
    const st = getComputedStyle(el);
    const [a, b] = [lum(rgb(st.color)), lum(rgb(st.backgroundColor))].sort((x, y) => y - x);
    return (a + 0.05) / (b + 0.05);
  }, selector);

  await caso("más vendido en el sitio: etiqueta, borde con luz y halo en la tarjeta; etiqueta en el detalle; AA; mismo orden", async () => {
    const p = await nueva(360, 800);
    await ir(p);
    const antes = (await estadoMasVendido(p)).map((t) => t.clave);
    assert.ok(antes.length >= 5);
    // Un color del primer grupo de nuevos (iPhone 18 Pro Max 256 GB) y un usado.
    const ids = await p.evaluate((clave) => {
      const e = JSON.parse(localStorage.getItem(clave));
      const nuevo = e.equipos.find((q) => q.condicion === "nuevo" && q.capacidad === "256 GB" && q.modelo_id === e.equipos[0].modelo_id);
      return [nuevo.id, e.equipos.find((q) => q.condicion === "usado").id];
    }, CLAVE_DEMO);
    for (const [tema, primario] of [["claro", "#1A73E8"], ["oscuro", "#1A73E8"], ["claro", "#FFD60A"]]) {
      await marcarMasVendido(p, ids);
      await editarDemo(p, (e, x) => Object.assign(e.tienda, { tema: x[0], color_primario: x[1] }), [tema, primario]);
      await ir(p);
      const t = await estadoMasVendido(p);
      assert.deepEqual(t.map((x) => x.clave), antes, "el orden no cambia");
      const marcadas = t.filter((x) => x.marcada);
      assert.equal(marcadas.length, 2, "una tarjeta de nuevos (por cualquier color) y la del usado");
      for (const x of marcadas) {
        assert.equal(x.etiqueta, "Más vendido");
        assert.ok(x.anillo, "borde con luz");
        assert.deepEqual(x.propiedades, ["transform"], "la luz solo anima transform");
      }
      assert.ok(t.filter((x) => !x.marcada).every((x) => !x.etiqueta && !x.anillo), "las demás no cambian");
      const ratio = await contrasteDe(p, ".tarjeta .etiqueta-pildora--mas-vendido");
      assert.ok(ratio >= 4.5, `${tema} ${primario}: la etiqueta tiene ${ratio.toFixed(2)}:1`);
      assert.deepEqual(await p.evaluate(contrasteMalo), [], `${tema} ${primario}`);
      const halo = await p.$eval(".tarjeta--mas-vendido", (el) => getComputedStyle(el).boxShadow);
      assert.ok((halo.match(/rgb/g) || []).length >= 2, "halo además de la sombra");
    }
    // La luz corre en la que se ve y se pausa fuera de la pantalla.
    await p.evaluate(() => scrollTo(0, 0));
    await p.$eval(".tarjeta--mas-vendido", (el) => el.scrollIntoView({ block: "center" }));
    await p.waitForFunction(() => document.querySelector(".tarjeta--mas-vendido").hasAttribute("data-en-pantalla"));
    assert.equal((await estadoMasVendido(p)).find((x) => x.marcada).corre, true, "corre en pantalla");
    await p.evaluate(() => scrollTo(0, document.body.scrollHeight));
    await p.waitForFunction(() => !document.querySelector(".tarjeta--mas-vendido").hasAttribute("data-en-pantalla"));
    assert.equal((await estadoMasVendido(p)).find((x) => x.marcada).corre, false, "en pausa fuera de la pantalla");
    // Detalle: la etiqueta, quieta.
    await p.evaluate(() => scrollTo(0, 0));
    await p.click(".tarjeta--mas-vendido .tarjeta-boton");
    await p.waitForFunction(() => document.querySelector("#hoja-detalle").open && !document.querySelector("#hoja-detalle[data-vt]"));
    const det = await p.$eval("#hoja-detalle .etiqueta-pildora--mas-vendido", (el) => ({ texto: el.textContent, anims: el.getAnimations({ subtree: true }).length, anillo: Boolean(el.closest("dialog").querySelector(".tarjeta-brillo")) }));
    assert.deepEqual(det, { texto: "Más vendido", anims: 0, anillo: false });
    assert.ok(await contrasteDe(p, "#hoja-detalle .etiqueta-pildora--mas-vendido") >= 4.5);
    // En un nuevo, cambiar de color no la quita (es del modelo y capacidad).
    if (await p.locator("#hoja-detalle .color-boton").count() > 1) {
      await p.click("#hoja-detalle .color-boton >> nth=1");
      await p.waitForTimeout(400);
      assert.equal(await p.locator("#hoja-detalle .etiqueta-pildora--mas-vendido").count(), 1);
    }
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("más vendido en el carrusel y con muchas: la del centro igual, las vecinas atenuadas; luz en 3 como máximo", async () => {
    const p = await nueva(1440, 900);
    await ir(p);
    // Se fuerzan 5 marcadas (saltando el límite de la capa de datos) para
    // comprobar que la luz corre en 3 como máximo.
    const todos = await p.evaluate((clave) => JSON.parse(localStorage.getItem(clave)).equipos.map((q) => q.id), CLAVE_DEMO);
    await marcarMasVendido(p, todos);
    await ir(p);
    await p.waitForTimeout(300);
    const t = await estadoMasVendido(p);
    assert.ok(t.filter((x) => x.marcada).length >= 4);
    assert.equal(t.filter((x) => x.corre).length, 3, "la luz corre en 3");
    // Carrusel: la del centro con etiqueta y anillo; las vecinas, con la capa que las desvanece encima.
    await marcarMasVendido(p, todos.slice(0, 1));
    await editarDemo(p, (e) => { e.tienda.vista_equipos = "carrusel"; });
    await ir(p);
    const c = await p.evaluate(() => {
      const centro = document.querySelector(".galeria--carrusel > .tarjeta[data-centro]");
      const vecina = document.querySelector(".galeria--carrusel > .tarjeta--mas-vendido:not([data-centro])");
      return {
        centro: centro.classList.contains("tarjeta--mas-vendido") && Boolean(centro.querySelector(".etiqueta-pildora--mas-vendido")),
        capaCentro: +getComputedStyle(centro, "::after").opacity,
        vecina: Boolean(vecina)
      };
    });
    assert.ok(c.centro, "la del centro es la más vendida");
    assert.equal(c.capaCentro, 0);
    await p.click(".ce-siguiente");
    await p.waitForFunction(() => !document.querySelector("#vista-equipos[data-moviendo]"));
    const capaVecina = await p.$eval(".galeria--carrusel > .tarjeta--mas-vendido", (el) => +getComputedStyle(el, "::after").opacity);
    assert.ok(capaVecina > 0.2, `la vecina queda atenuada (${capaVecina})`);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("más vendido con reduced-motion: etiqueta y anillo quietos, sin animaciones", async () => {
    const p = await nueva(390, 844, { reducedMotion: "reduce" });
    await ir(p);
    const id = await p.evaluate((clave) => JSON.parse(localStorage.getItem(clave)).equipos[0].id, CLAVE_DEMO);
    await marcarMasVendido(p, [id]);
    await ir(p);
    const r = await p.$eval(".tarjeta--mas-vendido", (li) => ({
      etiqueta: li.querySelector(".etiqueta-pildora--mas-vendido").textContent,
      anillo: getComputedStyle(li.querySelector(".tarjeta-brillo")).backgroundColor,
      luz: +getComputedStyle(li.querySelector(".tarjeta-brillo > span")).opacity
    }));
    assert.equal(r.etiqueta, "Más vendido");
    assert.notEqual(r.anillo, "rgba(0, 0, 0, 0)", "el anillo quieto se ve");
    assert.equal(r.luz, 0, "sin luz que gira");
    assert.equal(await p.evaluate(() => document.getAnimations().length), 0);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  // Reseñas (0014)
  const PNG = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
  const archivosResenas = (p) => p.evaluate(() => new Promise((r) => {
    const pedido = indexedDB.open("cotizadora-demo");
    pedido.onsuccess = () => { const k = pedido.result.transaction("archivos").objectStore("archivos").getAllKeys(); k.onsuccess = () => r(k.result.filter((x) => x.startsWith("resenas/")).sort()); };
  }));
  await caso("reseñas: ninguna de ejemplo; sin reseñas o con el interruptor apagado, la sección no existe y su módulo no se carga", async () => {
    const p = await nueva(390, 844);
    await ir(p);
    const e = await p.evaluate((clave) => JSON.parse(localStorage.getItem(clave)), CLAVE_DEMO);
    assert.deepEqual([e.resenas, e.tienda.mostrar_resenas, e.tienda.titulo_resenas], [[], false, "Lo que dicen nuestros clientes"]);
    const sinModulo = () => p.evaluate(() => !performance.getEntriesByType("resource").some((x) => /sitio\/resenas\.js/.test(x.name)));
    assert.equal(await p.isHidden("#resenas"), true);
    assert.ok(await sinModulo(), "no se carga resenas.js");
    await editarDemo(p, (e) => { e.tienda.mostrar_resenas = true; });
    await ir(p);
    assert.equal(await p.isHidden("#resenas"), true, "encendida pero sin reseñas: no se ve");
    assert.ok(await sinModulo());
    // Con una reseña y el interruptor apagado, tampoco (ni en los datos públicos).
    await editarDemo(p, (e) => { e.tienda.mostrar_resenas = false; e.resenas = [{ id: "r1", tipo: "imagen", ruta: "resenas/a.webp", texto: "x", origen: "", origen_otro: "", autorizado: true, orden: 0, creado_en: "2026-01-01T00:00:00Z" }]; });
    await ir(p);
    assert.equal(await p.isHidden("#resenas"), true);
    const publicas = await p.evaluate(async () => (await (await import(new URL("assets/js/datos/api.js", location.href).href)).api()).cargarPublico().then((d) => d.resenas));
    assert.deepEqual(publicas, []);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("reseñas: el panel exige la casilla, valida (30 s, formato), agrega, edita, ordena y borra; el sitio las muestra y el visor abre y cierra con Escape", async () => {
    const p = await nueva(1280, 900);
    await entrarPanel(p, "gestor@demo.co");
    await p.goto(`${BASE}/admin/#/tienda`);
    await p.waitForSelector("#form-resena");
    // El aviso fijo va arriba de la carga.
    const aviso = "Las capturas pueden tener datos personales de sus clientes. Tápelos o pida autorización antes de publicarlas.";
    assert.equal(await p.textContent("#form-resena .aviso-datos"), aviso);
    assert.ok(await p.evaluate(() => document.querySelector("#form-resena .aviso-datos").compareDocumentPosition(document.querySelector("#r-archivo")) & Node.DOCUMENT_POSITION_FOLLOWING));
    assert.equal((await p.textContent('label[for="r-autorizado"]')).trim(), "Tengo autorización de esta persona o tapé su nombre, foto y número.");
    const agregar = async (archivo, { casilla = true, texto = "", origen = "" } = {}) => {
      await p.setInputFiles("#r-archivo", archivo);
      if (texto) await p.fill("#r-texto", texto);
      if (origen) await p.selectOption("#r-origen", origen);
      if (casilla) await p.check("#r-autorizado"); else await p.uncheck("#r-autorizado");
      await p.click("#r-agregar");
      await p.waitForFunction(() => document.querySelector("#r-subiendo").hidden);
      await p.waitForTimeout(150);
      return [(await p.textContent("#r-archivo-error")).trim(), (await p.textContent("#r-autorizado-error")).trim()];
    };
    const videos = path.join(RAIZ, "tests", "videos");
    const imagen = { name: "captura.png", mimeType: "image/png", buffer: PNG };
    // Sin la casilla no se sube nada.
    assert.deepEqual(await agregar(imagen, { casilla: false }), ["", "Marque la casilla para poder publicarla."]);
    assert.equal(await p.evaluate(() => document.activeElement.id), "r-autorizado");
    assert.deepEqual(await archivosResenas(p), []);
    // Videos: más de 30 s, .mov y más de 20 MB no; uno de 20 s sí (el límite de los equipos es 15).
    assert.equal((await agregar(path.join(videos, "31s.mp4")))[0], "El video dura más de 30 segundos. Súbalo más corto.");
    assert.equal((await agregar(path.join(videos, "clip.mov")))[0], "Este formato puede no verse en todos los celulares. Súbalo en MP4.");
    assert.equal((await agregar({ name: "pesado.mp4", mimeType: "video/mp4", buffer: Buffer.alloc(20 * 1024 * 1024 + 1) }))[0], "El video pesa más de 20 MB.");
    assert.deepEqual(await archivosResenas(p), [], "nada de eso se subió");
    assert.deepEqual(await agregar(imagen, { texto: "Me atendieron muy bien.", origen: "whatsapp" }), ["", ""]);
    assert.deepEqual(await agregar(path.join(videos, "20s.mp4"), { texto: "Video de la entrega", origen: "instagram" }), ["", ""]);
    assert.equal(await p.textContent("#r-cuenta"), "(2 de 12)");
    const guardadas = await archivosResenas(p);
    assert.equal(guardadas.length, 3, "imagen en dos tamaños y el video");
    assert.ok(guardadas.some((x) => /-640\.(webp|jpg|png)$/.test(x)));
    // Editar el texto y el origen; mover el video arriba.
    const [idImagen, idVideo] = await p.evaluate((clave) => JSON.parse(localStorage.getItem(clave)).resenas.sort((a, b) => a.orden - b.orden).map((r) => r.id), CLAVE_DEMO);
    await p.fill(`#rt-${idImagen}`, "Me atendieron muy bien y rápido.");
    await p.press(`#rt-${idImagen}`, "Tab");
    await p.waitForFunction(([clave, id]) => JSON.parse(localStorage.getItem(clave)).resenas.find((r) => r.id === id).texto.endsWith("rápido."), [CLAVE_DEMO, idImagen]);
    await p.click(`.resena-fila[data-id="${idVideo}"] [data-mover="-1"]`);
    await p.waitForFunction(([clave, id]) => JSON.parse(localStorage.getItem(clave)).resenas.find((r) => r.id === id).orden === 0, [CLAVE_DEMO, idVideo]);
    // Encender y cambiar el título.
    await p.click('label[for="r-mostrar"]');
    await p.fill("#r-titulo", "Clientes felices");
    await p.press("#r-titulo", "Tab");
    await p.waitForFunction((clave) => { const t = JSON.parse(localStorage.getItem(clave)).tienda; return t.mostrar_resenas && t.titulo_resenas === "Clientes felices"; }, CLAVE_DEMO);
    // Sitio: debajo de los equipos y antes de la información de la tienda.
    await editarDemo(p, (e) => { e.tienda.ciudad = "Medellín"; });
    await ir(p);
    await p.waitForSelector("#resenas:not([hidden]) .resena-boton");
    const orden = await p.evaluate(() => [...document.querySelectorAll("#galeria, #resenas, #info-tienda")].map((x) => x.id));
    assert.deepEqual(orden, ["galeria", "resenas", "info-tienda"]);
    assert.equal(await p.textContent("#resenas-titulo"), "Clientes felices");
    const tarjetas = await p.$$eval("#resenas .resena-boton", (bs) => bs.map((b) => [b.querySelector(".resena-texto")?.textContent, b.querySelector(".resena-origen")?.textContent, b.querySelector("img")?.getAttribute("loading") || "video"]));
    assert.deepEqual(tarjetas, [["Video de la entrega", "Instagram", "video"], ["Me atendieron muy bien y rápido.", "WhatsApp", "lazy"]]);
    assert.equal(await p.locator("video").count(), 0, "ningún video en la página antes de tocar");
    assert.deepEqual(await p.evaluate(contrasteMalo), []);
    // Visor: abre a pantalla completa, el video sin descargar ni reproducirse solo; ← → y Escape.
    await p.click("#resenas .resena-boton >> nth=0");
    await p.waitForFunction(() => document.querySelector("#visor-resena").open);
    assert.equal(await p.textContent("#visor-titulo"), "Reseña 1 de 2");
    const v = await p.$eval("#visor-resena video", (x) => ({ preload: x.getAttribute("preload"), autoplay: x.autoplay, pausado: x.paused, controles: x.controls }));
    assert.deepEqual(v, { preload: "none", autoplay: false, pausado: true, controles: true });
    await p.keyboard.press("ArrowRight");
    assert.equal(await p.textContent("#visor-titulo"), "Reseña 2 de 2");
    assert.equal(await p.locator("#visor-resena video").count(), 0);
    assert.equal(await p.textContent("#visor-resena .visor-origen"), "WhatsApp");
    await p.keyboard.press("Escape");
    await p.waitForFunction(() => !document.querySelector("#visor-resena").open);
    assert.equal(await p.evaluate(() => document.activeElement.classList.contains("resena-boton")), true, "el foco vuelve a la reseña");
    // Borrar: sale de la lista y se borran sus archivos.
    await p.goto(`${BASE}/admin/#/tienda`);
    await p.waitForSelector(".resena-fila");
    await p.click(`.resena-fila[data-id="${idImagen}"] [data-borrar]`);
    await p.click('#confirmar [value="si"]');
    await p.waitForFunction(() => document.querySelectorAll(".resena-fila").length === 1);
    await p.waitForFunction(() => new Promise((r) => { const q = indexedDB.open("cotizadora-demo"); q.onsuccess = () => { const k = q.result.transaction("archivos").objectStore("archivos").getAllKeys(); k.onsuccess = () => r(k.result.filter((x) => x.startsWith("resenas/")).length === 1); }; }));
    // Hasta 12: la capa de datos rechaza la 13.ª y el panel deshabilita "Agregar".
    const r = await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const a = await api();
      for (let i = 0; i < 11; i++) await a.agregarResena({ tipo: "imagen", ruta: `resenas/x${i}.webp`, autorizado: true, orden: 10 + i });
      const errores = [];
      try { await a.agregarResena({ tipo: "imagen", ruta: "resenas/x99.webp", autorizado: true, orden: 99 }); } catch (e) { errores.push(e.message); }
      try { await a.guardarResena((await a.listarResenas())[0].id, { autorizado: false }); } catch (e) { errores.push(e.message); }
      return errores;
    });
    assert.deepEqual(r, ["Ya tiene 12 reseñas. Borre una para agregar otra.", "Algún dato no tiene el formato correcto. Revise los campos."]);
    await p.goto(`${BASE}/admin/#/inicio`);
    await p.goto(`${BASE}/admin/#/tienda`);
    await p.waitForSelector(".resena-fila");
    assert.equal(await p.isDisabled("#r-agregar"), true);
    assert.equal(await p.textContent("#r-cuenta"), "(12 de 12)");
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("video en el detalle: miniatura con ícono, no se descarga hasta tocarla, se reproduce con controles y sin reproducción automática", async () => {
    const p = await nueva(1280, 900);
    await entrarPanel(p, "gestor@demo.co");
    const glaciar = await p.evaluate((clave) => JSON.parse(localStorage.getItem(clave)).equipos.find((q) => q.color_nombre_mostrar === "Glacier").id, CLAVE_DEMO);
    await p.goto(`${BASE}/admin/#/inventario/${glaciar}`);
    await p.waitForSelector("#form-equipo");
    await p.setInputFiles("#e-video", path.join(RAIZ, "tests", "videos", "corto.webm"));
    await p.waitForSelector("#video-actual video");
    await p.click("#guardar");
    await p.waitForURL(/#\/inventario$/);
    await ir(p, "/?condicion=nuevo&modelo=iphone-18-pro&capacidad=256-gb");
    const det = "#detalle-en-linea";
    // La miniatura del video está, con el ícono; todavía no hay ningún <video>.
    assert.equal(await p.locator(`${det} .miniatura--video .icono-play`).count(), 1);
    assert.equal(await p.getAttribute(`${det} .miniatura--video`, "aria-label"), "Ver el video");
    assert.equal(await p.locator(`${det} video`).count(), 0, "el video no está en la página antes de tocarlo");
    await p.click(`${det} .miniatura--video`);
    const v = p.locator(`${det} video.detalle-video`);
    assert.equal(await v.getAttribute("preload"), "none");
    assert.equal(await v.getAttribute("controls"), "");
    assert.equal(await v.getAttribute("autoplay"), null);
    assert.equal(await v.getAttribute("aria-label"), "Video de iPhone 18 Pro, 256 GB, color Glacier");
    await p.waitForFunction((sel) => { const x = document.querySelector(sel); return x && !x.paused && x.currentTime > 0; }, `${det} video`);
    assert.equal(await p.getAttribute(`${det} .miniatura--video`, "aria-current"), "true");
    // Volver a la imagen quita el video.
    await p.click(`${det} .miniatura[data-f="0"]`);
    assert.equal(await p.locator(`${det} video`).count(), 0);
    // Un equipo sin video no tiene la miniatura.
    await ir(p, "/?condicion=nuevo&modelo=iphone-18-pro-max&capacidad=512-gb");
    assert.equal(await p.locator(`${det} .miniatura--video`).count(), 0);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("roles: el administrador solo ve Usuarios; la capa de datos le impide lo demás", async () => {
    const p = await nueva(390, 844);
    await entrarPanel(p, "administrador@demo.co");
    assert.equal(await p.textContent("#barra-usuario"), "administrador@demo.co · Administrador");
    const visibles = await p.locator(".navegacion a:visible").allTextContents();
    assert.deepEqual(visibles, ["Usuarios"]);
    for (const r of ["inicio", "inventario", "tienda", "catalogo", "fichas", "legales"]) {
      await p.goto(`${BASE}/admin/#/${r}`);
      await p.waitForSelector("#form-invitar");
      assert.equal(new URL(p.url()).hash, "#/usuarios", r);
    }
    const errores = await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const a = await api();
      const r = [];
      for (const f of [() => a.guardarModelo(1, { nombre: "x" }), () => a.guardarTienda({ nombre: "x" }), () => a.borrarDatosDemo(), () => a.agregarColor({ modelo_id: 1, nombre_es: "x" })]) {
        try { await f(); r.push(""); } catch (e) { r.push(e.message); }
      }
      r.push((await a.listarEquipos()).length, (await a.listarModelos()).length);
      return r;
    });
    assert.deepEqual(errores.slice(0, 4).map((m) => /^Solo el gestor puede/.test(m)), [true, true, true, true], JSON.stringify(errores));
    // Ve inventario y catálogo como el público: solo lo publicado y lo activo.
    assert.deepEqual(errores.slice(4), [6, 4]);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("demo: los datos guardados de una versión vieja se migran (stock, tamaño, catálogo, colores, roles, fichas, pagos, reseñas y legales)", async () => {
    const p = await nueva();
    await ir(p);
    // Arma un estado como el de la versión 1: 32 modelos, stock numérico, sin colores.
    await editarDemo(p, (e) => {
      const nuevos = ["iphone-7", "iphone-7-plus", "iphone-8", "iphone-8-plus", "iphone-x", "iphone-xs", "iphone-xs-max", "iphone-xr", "iphone-se-2", "iphone-se-3"];
      const fuera = new Set(e.modelos.filter((m) => nuevos.includes(m.slug)).map((m) => m.id));
      e.modelos = e.modelos.filter((m) => !fuera.has(m.id));
      e.fichas = e.fichas.filter((f) => !fuera.has(f.modelo_id));
      e.modelos.forEach((m, i) => { m.orden = (i + 1) * 10; });
      e.equipos.forEach((q, i) => { q.stock = i === 0 ? 0 : 2; delete q.en_stock; });
      // Colores con nombre y hexadecimal propios, como antes de 0008
      const viejos = ["Negro", "Plata", "Burgundy", "Glacier", "Titanio natural", "Medianoche"];
      e.equipos.forEach((q, i) => { q.color_nombre = viejos[i]; q.color_hex = "#123456"; delete q.color_id; delete q.color_nombre_mostrar; });
      e.equipos[2].color_nombre = "Color que no existe";
      delete e.colores;
      delete e.tienda.tamano_texto;
      // Fichas vacías como antes de 0012, salvo una que cargó la tienda
      const id13 = e.modelos.find((m) => m.slug === "iphone-13").id;
      e.fichas.forEach((f) => { f.especificaciones = f.modelo_id === id13 ? [{ etiqueta: "Pantalla", valor: "Dato de la tienda" }] : []; });
      delete e.tienda.mostrar_ficha; delete e.tienda.ficha_ocultas;
      // Formas de pago como antes de 0013: solo la lista libre
      for (const k of Object.keys(e.tienda)) if (k.startsWith("pagos_")) delete e.tienda[k];
      e.tienda.formas_pago = ["Addi", "Sistecrédito"];
      // Reseñas y legales como antes de 0014: una política propia, un aviso de
      // marca y lo demás vacío (sin los campos de 0016)
      delete e.resenas; delete e.tienda.mostrar_resenas; delete e.tienda.titulo_resenas;
      for (const k of Object.keys(e.tienda)) if (/^(legal_|meta_pixel_id|ga4_|gtm_|clarity_|tiktok_|gads_|capi_|plataforma_)/.test(k)) delete e.tienda[k];
      Object.assign(e.tienda, { texto_privacidad: "Mi política propia.", texto_terminos: "", texto_autorizacion_datos: "", aviso_marca: "Mi aviso de marca." });
      e.perfiles[0].rol = "agencia"; e.perfiles[0].correo = "agencia@demo.co";
      e.perfiles[1].rol = "tienda"; e.perfiles[1].correo = "tienda@demo.co";
      e.version = 1;
    });
    await ir(p);
    const e = await p.evaluate((clave) => JSON.parse(localStorage.getItem(clave)), CLAVE_DEMO);
    assert.equal(e.version >= 10, true);
    assert.deepEqual(e.perfiles.map((x) => `${x.correo}:${x.rol}`), ["administrador@demo.co:administrador", "gestor@demo.co:gestor"]);
    // 0008: color oficial por nombre; el nombre viejo queda si no es el oficial;
    // sin coincidencia, sin color y con el nombre conservado.
    const nombreDe = (q) => e.colores.find((c) => c.id === q.color_id)?.nombre_es ?? null;
    assert.deepEqual(e.equipos.map((q) => [nombreDe(q), q.color_nombre_mostrar]), [
      ["Negro", ""], ["Plata", ""], [null, "Color que no existe"], ["Glaciar", "Glacier"], ["Titanio natural", "Titanio natural"], ["Medianoche", "Medianoche"]
    ]);
    assert.ok(e.equipos.every((q) => !("color_hex" in q) && !("color_nombre" in q)));
    assert.equal(e.modelos.length, 42);
    assert.equal(e.colores.length, 183);
    assert.equal(e.tienda.tamano_texto, "normal");
    // 0012: fichas de la fuente donde estaban vacías; la de la tienda no se toca
    const fichaDe = (slug) => e.fichas.find((f) => f.modelo_id === e.modelos.find((m) => m.slug === slug).id);
    assert.deepEqual(fichaDe("iphone-13").especificaciones, [{ etiqueta: "Pantalla", valor: "Dato de la tienda" }]);
    assert.equal(fichaDe("iphone-7").especificaciones[0].valor, "Septiembre 2016");
    assert.equal(e.fichas.filter((f) => f.especificaciones.length).length, 42);
    assert.equal(e.tienda.mostrar_ficha, true);
    assert.deepEqual(e.tienda.ficha_ocultas, []);
    // 0013: la lista vieja pasa a pagos_otras; lo demás, vacío
    assert.deepEqual(e.tienda.pagos_otras, ["Addi", "Sistecrédito"]);
    assert.ok(!("formas_pago" in e.tienda));
    assert.deepEqual([e.tienda.pagos_cuotas, e.tienda.pagos_cuotas_max, e.tienda.pagos_medios], [false, null, []]);
    // 0014: sin reseñas y apagadas. 0016: los campos del asistente con sus
    // valores iniciales, sin publicar; lo propio pasa a la cláusula de su
    // documento (el aviso de marca, a la de los términos) y los textos viejos no quedan.
    assert.deepEqual([e.resenas, e.tienda.mostrar_resenas], [[], false]);
    const { LEGAL_INICIAL } = await p.evaluate(async (base) => ({ ...(await import(`${base}/assets/js/datos/comun.js`)) }), BASE);
    assert.deepEqual(Object.fromEntries(Object.keys(LEGAL_INICIAL).map((k) => [k, e.tienda[k]])),
      { ...LEGAL_INICIAL, legal_clausula_privacidad: "Mi política propia.", legal_clausula_terminos: "Mi aviso de marca." });
    for (const k of ["texto_privacidad", "texto_terminos", "texto_autorizacion_datos", "aviso_marca", "legales_revisados", "legales_herramientas"]) assert.ok(!(k in e.tienda), k);
    assert.equal(e.version, 18);
    const sinFuente = e.colores.filter((c) => c.oficial && !c.hex_de_fuente);
    assert.ok(sinFuente.length && sinFuente.every((c) => c.hex_aproximado === Boolean(c.hex)) && e.colores.every((c) => !(c.hex_de_fuente && c.hex_aproximado)),
      `0022: los oficiales sin hex de la fuente, aproximados: ${JSON.stringify(sinFuente.filter((c) => c.hex_aproximado !== Boolean(c.hex)).slice(0, 3))}`);
    assert.equal(e.tienda.titulo_sitio, "", "0021: vacío = el título del idioma");
    assert.equal(e.tienda.pais, "co", "0018: los datos viejos del demo son de Colombia");
    assert.equal(e.tienda.idioma, "es", "0020: las tiendas que ya existían quedan en español");
    assert.deepEqual(e.equipos.map((q) => q.en_stock), [false, true, true, true, true, true]);
    assert.equal(new Set(e.modelos.map((m) => m.orden)).size, 42);
    assert.equal(e.modelos.find((m) => m.slug === "iphone-17e").orden > e.modelos.find((m) => m.slug === "iphone-17-pro-max").orden, true);
    // Los equipos siguen en su modelo
    assert.equal(e.modelos.find((m) => m.id === e.equipos[0].modelo_id).slug, "iphone-18-pro-max");
    assert.equal(await p.textContent("#contador"), "5 equipos disponibles");
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("panel: el administrador invita con rol, asigna roles, desactiva y no puede quitarse a sí mismo", async () => {
    const p = await nueva();
    await entrarPanel(p, "administrador@demo.co");
    await p.fill("#u-correo", "nuevo@tienda.co");
    assert.equal(await p.inputValue("#u-rol"), "gestor");
    await p.click("#form-invitar [type=submit]");
    await p.waitForSelector(".usuario-fila >> text=nuevo@tienda.co");
    const fila = p.locator('.usuario-fila:has-text("nuevo@tienda.co")');
    assert.equal((await fila.locator(".rol").textContent()).trim(), "Gestor");
    // Asignar el rol de administrador y volver a gestor
    await fila.locator("[data-rol]").selectOption("administrador");
    await p.waitForFunction(() => document.querySelector('.usuario-fila:has([data-rol]) .rol')?.textContent.includes("Administrador") || [...document.querySelectorAll(".usuario-fila")].some((f) => f.textContent.includes("nuevo@tienda.co") && f.querySelector(".rol").textContent.trim() === "Administrador"));
    await fila.locator("[data-rol]").selectOption("gestor");
    await p.waitForFunction(() => [...document.querySelectorAll(".usuario-fila")].some((f) => f.textContent.includes("nuevo@tienda.co") && f.querySelector(".rol").textContent.trim() === "Gestor"));
    await fila.locator("[data-estado]").click();
    await p.click('#confirmar [value="si"]');
    await p.waitForSelector('.usuario-fila:has-text("nuevo@tienda.co") .estado-inactivo');
    // Su propia fila no tiene controles, y la capa de datos tampoco lo deja.
    assert.equal(await p.locator('.usuario-fila:has-text("administrador@demo.co") [data-estado], .usuario-fila:has-text("administrador@demo.co") [data-rol]').count(), 0);
    const r = await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const a = await api();
      const yo = await a.sesionActual();
      const salida = [];
      try { await a.cambiarEstadoUsuario(yo.id, false); salida.push(""); } catch (e) { salida.push(e.message); }
      try { await a.cambiarRolUsuario(yo.id, "gestor"); salida.push(""); } catch (e) { salida.push(e.message); }
      return salida;
    });
    assert.deepEqual(r, ["No puede desactivarse a sí mismo.", "No puede cambiar su propio rol ni desactivarse."]);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("catálogo: pestañas con teclado y foco visible; #/fichas lleva a Ficha técnica; Fichas ya no está en el menú", async () => {
    const p = await nueva(1280, 900);
    await entrarPanel(p, "gestor@demo.co");
    const menu = await p.locator(".navegacion a:visible").allTextContents();
    assert.ok(menu.includes("Catálogo") && !menu.some((t) => /ficha/i.test(t)), menu.join(", "));
    const estado = () => p.evaluate(() => ({
      hash: location.hash,
      tabs: [...document.querySelectorAll("[role=tablist] [role=tab]")].map((t) => `${t.textContent}:${t.getAttribute("aria-selected")}:${t.tabIndex}`),
      foco: document.activeElement.textContent,
      panel: document.querySelector("[role=tabpanel]").getAttribute("aria-labelledby"),
      controla: [...document.querySelectorAll("[role=tab]")].every((t) => document.getElementById(t.getAttribute("aria-controls"))?.getAttribute("role") === "tabpanel"),
      h1: document.querySelectorAll("h1").length,
      actual: document.querySelector('.navegacion [aria-current="page"]')?.textContent
    }));
    // #/fichas (enlaces viejos) → Catálogo, pestaña Ficha técnica.
    await p.goto(`${BASE}/admin/#/fichas`);
    await p.waitForSelector('a[href^="#/catalogo/ficha/"]');
    let e = await estado();
    assert.equal(e.hash, "#/catalogo/ficha");
    assert.deepEqual(e.tabs.slice(0, 2), ["Modelos y colores:false:-1", "Ficha técnica:true:0"]);
    assert.equal(e.panel, "pestana-ficha");
    assert.ok(e.controla);
    assert.equal(e.h1, 1);
    assert.equal(e.actual, "Catálogo");
    const id = await p.evaluate(() => document.querySelector('a[href^="#/catalogo/ficha/"]').getAttribute("href").split("/").pop());
    await p.goto(`${BASE}/admin/#/fichas/${id}`);
    await p.waitForSelector("#form-ficha");
    assert.equal(new URL(p.url()).hash, `#/catalogo/ficha/${id}`);
    assert.equal(await p.locator("h1").count(), 1);
    // Teclado: flechas (con vuelta), Inicio y Fin; el foco sigue en la pestaña.
    await p.goto(`${BASE}/admin/#/catalogo`);
    await p.waitForSelector("#lista-catalogo .modelo-fila");
    await p.focus("#pestana-modelos");
    await p.keyboard.press("ArrowRight");
    await p.waitForSelector('a[href^="#/catalogo/ficha/"]');
    e = await estado();
    assert.equal(e.hash, "#/catalogo/ficha");
    assert.equal(e.foco, "Ficha técnica");
    assert.equal(e.panel, "pestana-ficha");
    await p.keyboard.press("Home");
    await p.waitForSelector("#lista-catalogo .modelo-fila");
    assert.equal((await estado()).foco, "Modelos y colores");
    await p.keyboard.press("ArrowLeft");
    assert.equal((await estado()).foco, (await p.locator("[role=tab]").last().textContent()), "ArrowLeft en la primera va a la última");
    await p.keyboard.press("End");
    await p.keyboard.press("ArrowRight");
    e = await estado();
    assert.equal(e.foco, "Modelos y colores", "ArrowRight en la última vuelve a la primera");
    assert.equal(e.hash, "#/catalogo");
    // Foco visible: contorno de 3 px.
    const contorno = await p.evaluate(() => { const s = getComputedStyle(document.activeElement); return `${s.outlineStyle} ${s.outlineWidth}`; });
    assert.equal(contorno, "solid 3px");
    // Cambios sin guardar: pregunta antes de cambiar de pestaña.
    await p.goto(`${BASE}/admin/#/catalogo/ficha/${id}`);
    await p.waitForSelector("#form-ficha");
    await p.fill("#f-descripcion", "Texto de prueba");
    await p.click("#pestana-modelos");
    await p.waitForSelector("#confirmar[open]");
    await p.click('#confirmar [value="no"]');
    assert.equal((await estado()).hash, `#/catalogo/ficha/${id}`);
    assert.equal(await p.inputValue("#f-descripcion"), "Texto de prueba");
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  // Ficha técnica (0012): precargada de la fuente, interruptores y editor.
  const filasSitio = (p) => p.$$eval("#hoja-detalle .ficha-tecnica dl > div", (ds) => ds.map((d) => [d.dataset.clave || "", d.querySelector("dt").textContent, d.querySelector("dd").textContent]));
  const abrirFicha = async (p) => {
    await ir(p, "/?condicion=nuevo&modelo=iphone-18-pro-max&capacidad=512-gb");
    await p.click(".tarjeta-boton >> nth=0");
    await p.waitForFunction(() => document.querySelector("#hoja-detalle").open && !document.querySelector("#hoja-detalle[data-vt]"));
  };
  await caso("ficha técnica: precargada tal cual la fuente, en el orden fijo; el interruptor general y los de categoría cambian el sitio", async () => {
    const p = await nueva(390, 844);
    await ir(p);
    const fuente = await p.evaluate(async () => (await import(new URL("assets/js/datos/semilla.js", location.href).href)).filasDeFuente("iphone-18-pro-max"));
    await abrirFicha(p);
    await p.click("#hoja-detalle .ficha-tecnica summary");
    assert.equal((await p.textContent("#hoja-detalle .ficha-tecnica summary")).trim(), "Ver ficha técnica");
    assert.deepEqual(await filasSitio(p), fuente.map((f) => [f.clave, f.etiqueta, f.valor]), "las filas de la fuente, sin cambios");
    assert.deepEqual(fuente.map((f) => f.clave), ["lanzamiento", "procesador", "pantalla", "camaras_traseras", "versiones", "materiales", "puertos"],
      "18 Pro Max: sin cámara frontal, batería ni dimensiones en la fuente");
    assert.equal(await p.locator("#hoja-detalle .ficha-tecnica dd").first().evaluate((el) => getComputedStyle(el).whiteSpace), "pre-line");
    // Todas las fichas del demo coinciden con la fuente
    const iguales = await p.evaluate(async (clave) => {
      const { filasDeFuente } = await import(new URL("assets/js/datos/semilla.js", location.href).href);
      const e = JSON.parse(localStorage.getItem(clave));
      return e.modelos.every((m) => JSON.stringify(e.fichas.find((f) => f.modelo_id === m.id).especificaciones) === JSON.stringify(filasDeFuente(m.slug)));
    }, CLAVE_DEMO);
    assert.ok(iguales, "fichas del demo = fuente");
    // Panel: apagar la ficha la saca del sitio; apagar una categoría la saca de la lista.
    await entrarPanel(p, "gestor@demo.co");
    await p.goto(`${BASE}/admin/#/catalogo/ficha`);
    await p.waitForSelector("#i-mostrar-ficha");
    assert.equal(await p.isChecked("#i-mostrar-ficha"), true);
    assert.deepEqual(await p.$$eval("#categorias-ficha [data-categoria]", (xs) => xs.map((x) => x.checked)), Array(11).fill(true));
    await p.click('label[for="i-mostrar-ficha"]');
    await p.waitForFunction((clave) => JSON.parse(localStorage.getItem(clave)).tienda.mostrar_ficha === false, CLAVE_DEMO);
    assert.equal(await p.locator("#categorias-ficha").evaluate((f) => f.disabled), true);
    await abrirFicha(p);
    assert.equal(await p.locator("#hoja-detalle .ficha-tecnica").count(), 0, "sin ficha en el sitio");
    await p.goto(`${BASE}/admin/#/catalogo/ficha`);
    await p.waitForSelector("#i-mostrar-ficha");
    await p.click('label[for="i-mostrar-ficha"]');
    await p.click('label[for="i-cat-pantalla"]');
    await p.click('label[for="i-cat-lanzamiento"]');
    await p.waitForFunction((clave) => JSON.parse(localStorage.getItem(clave)).tienda.ficha_ocultas.join() === "lanzamiento,pantalla", CLAVE_DEMO);
    await abrirFicha(p);
    assert.deepEqual((await filasSitio(p)).map((f) => f[0]), ["procesador", "camaras_traseras", "versiones", "materiales", "puertos"]);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("ficha técnica: el editor corrige una categoría y agrega filas propias (al final); la capa de datos valida el formato", async () => {
    const p = await nueva(1280, 900);
    await entrarPanel(p, "gestor@demo.co");
    const id = await p.evaluate((clave) => JSON.parse(localStorage.getItem(clave)).modelos.find((m) => m.slug === "iphone-18-pro-max").id, CLAVE_DEMO);
    await p.goto(`${BASE}/admin/#/catalogo/ficha/${id}`);
    await p.waitForSelector("#form-ficha");
    const fuente = await p.evaluate(async () => (await import(new URL("../assets/js/datos/semilla.js", location.href).href)).filasDeFuente("iphone-18-pro-max"));
    for (const f of fuente) assert.equal(await p.inputValue(`#fc-${f.clave}`), f.valor, f.clave);
    assert.equal(await p.inputValue("#fc-bateria"), "", "batería vacía: la fuente no la trae");
    await p.fill("#fc-procesador", "Procesador corregido por la tienda");
    await p.fill("#fc-camara_frontal", "Dato que agregó la tienda");
    await p.click("#agregar-fila");
    await p.fill("#fe-0", "Desbloqueo");
    await p.fill("#fv-0", "Face ID");
    await p.click("#guardar-ficha");
    await p.waitForSelector("text=Guardado");
    await abrirFicha(p);
    const filas = await filasSitio(p);
    assert.deepEqual(filas.map((f) => f[0]), ["lanzamiento", "procesador", "pantalla", "camaras_traseras", "camara_frontal", "versiones", "materiales", "puertos", ""]);
    assert.deepEqual(filas[1].slice(1), ["Procesador", "Procesador corregido por la tienda"]);
    assert.deepEqual(filas.at(-1).slice(1), ["Desbloqueo", "Face ID"], "las filas de la tienda van al final");
    // "Otras filas de la tienda" apagada: la fila propia no se ve.
    await editarDemo(p, (e) => { e.tienda.ficha_ocultas = ["otras"]; });
    await abrirFicha(p);
    assert.ok(!(await filasSitio(p)).some((f) => f[1] === "Desbloqueo"));
    // La capa de datos rechaza una categoría que no existe o repetida, y un valor muy largo.
    await p.goto(`${BASE}/admin/#/inicio`);
    await p.waitForSelector(".estadisticas");
    const errores = await p.evaluate(async (id) => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const a = await api();
      const r = [];
      for (const especificaciones of [[{ clave: "colores", etiqueta: "Colores", valor: "x" }], [{ clave: "pantalla", etiqueta: "P", valor: "a" }, { clave: "pantalla", etiqueta: "P", valor: "b" }], [{ etiqueta: "X", valor: "x".repeat(601) }]]) {
        try { await a.guardarFicha(id, { descripcion: "", especificaciones }); r.push("guardó"); } catch (e) { r.push(e.message); }
      }
      try { await a.guardarTienda({ ficha_ocultas: ["colores"] }); r.push("guardó"); } catch (e) { r.push(e.message); }
      return r;
    }, id);
    assert.deepEqual(errores, [...Array(3).fill("Alguna fila de la ficha técnica no tiene el formato correcto."), "Algún dato no tiene el formato correcto. Revise los campos."]);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("formas de pago: la pestaña valida y guarda; el detalle las muestra en frases solo con lo marcado; Mi tienda ya no tiene la lista; Inicio avisa", async () => {
    const p = await nueva(1280, 900);
    await entrarPanel(p, "gestor@demo.co");
    const avisos = () => p.$$eval(".avisos li span", (xs) => xs.map((x) => x.textContent));
    let a = await avisos();
    for (const t of ["Falta la ciudad", "Falta el correo de contacto", "Faltan las formas de pago"]) assert.ok(a.includes(t), `Inicio: ${t}`);
    await p.goto(`${BASE}/admin/#/tienda`);
    await p.waitForSelector("#form-tienda");
    assert.equal(await p.locator("#pagos, #agregar-pago").count(), 0, "Mi tienda sin la lista de formas de pago");
    assert.equal(await p.locator('#form-tienda a[href="#/catalogo/pagos"]').count(), 1);
    await p.goto(`${BASE}/admin/#/catalogo/pagos`);
    await p.waitForSelector("#form-pagos");
    assert.equal(await p.getAttribute("#pestana-pagos", "aria-selected"), "true");
    assert.equal(await p.isHidden("#caja-cuotas"), true, "sin cuotas, los campos de cuotas no se ven");
    await p.check('input[name="medio"][value="transferencia"]');
    await p.check('input[name="medio"][value="credito"]');
    await p.click('label[for="p-cuotas"]');
    await p.fill("#p-cuotas-max", "12");
    await p.click('label[for="p-sin-interes"]');
    await p.fill("#p-sin-interes-max", "13");
    await p.click('label[for="p-cripto"]');
    await p.fill("#p-cripto-cuales", "USDT, Bitcoin");
    for (const v of ["pse", "nequi", "otra"]) await p.check(`input[name="pasarela"][value="${v}"]`);
    await p.click("#agregar-pago");
    await p.fill("#pago-0", "Contraentrega en Bogotá");
    await p.click("#guardar-pagos");
    assert.equal(await p.textContent("#p-sin-interes-max-error"), "No pueden ser más que el máximo de cuotas.");
    assert.equal(await p.textContent("#p-pasarela-otra-error"), "Escriba el nombre de la pasarela.");
    assert.equal(await p.evaluate(() => document.activeElement.id), "p-sin-interes-max", "foco al primer error");
    await p.fill("#p-sin-interes-max", "6");
    await p.fill("#p-pasarela-otra", "Addi");
    const esperadas = ["Transferencia bancaria.", "Tarjeta de crédito: hasta 12 cuotas, hasta 6 sin interés.", "Criptomonedas: USDT, Bitcoin.", "Pago en línea con PSE, Nequi y Addi.", "Contraentrega en Bogotá"];
    assert.deepEqual(await p.$$eval("#vista-pagos li", (xs) => xs.map((x) => x.textContent)), esperadas, "vista previa");
    await p.click("#guardar-pagos");
    await p.waitForSelector("text=Guardado");
    const pagosSitio = async () => {
      await ir(p, "/?condicion=nuevo&modelo=iphone-18-pro-max&capacidad=512-gb");
      await p.click(".tarjeta-boton >> nth=0");
      await p.waitForFunction(() => document.querySelector("#hoja-detalle").open && !document.querySelector("#hoja-detalle[data-vt]"));
      return p.$$eval("#hoja-detalle .info-compra section", (ss) => {
        const s = ss.find((x) => x.querySelector("h3")?.textContent === "Formas de pago");
        return s ? [...s.querySelectorAll("li")].map((li) => li.textContent) : [];
      });
    };
    assert.deepEqual(await pagosSitio(), esperadas, "el detalle refleja lo marcado");
    // Sin cuotas: los datos de cuotas quedan vacíos y la tarjeta de crédito va sola.
    await p.goto(`${BASE}/admin/#/catalogo/pagos`);
    await p.waitForSelector("#form-pagos");
    assert.equal(await p.inputValue("#p-cuotas-max"), "12");
    await p.click('label[for="p-cuotas"]');
    await p.click("#guardar-pagos");
    await p.waitForSelector("text=Guardado");
    const t = await p.evaluate((clave) => JSON.parse(localStorage.getItem(clave)).tienda, CLAVE_DEMO);
    assert.deepEqual([t.pagos_cuotas, t.pagos_cuotas_max, t.pagos_sin_interes, t.pagos_sin_interes_max], [false, null, false, null]);
    assert.deepEqual((await pagosSitio()).slice(0, 2), ["Transferencia bancaria.", "Tarjeta de crédito."]);
    // La capa de datos repite las reglas del SQL.
    await p.goto(`${BASE}/admin/#/inicio`);
    await p.waitForSelector(".estadisticas");
    assert.ok(!(await avisos()).includes("Faltan las formas de pago"), "Inicio ya no avisa");
    const errores = await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const a = await api();
      const r = [];
      for (const c of [
        { pagos_cuotas: true, pagos_cuotas_max: 6, pagos_sin_interes: true, pagos_sin_interes_max: 12 },
        { pagos_cuotas: false, pagos_cuotas_max: 6 },
        { pagos_cuotas: true, pagos_cuotas_max: 60 },
        { pagos_medios: ["cheque"] }
      ]) { try { await a.guardarTienda(c); r.push("guardó"); } catch (e) { r.push(e.message); } }
      return r;
    });
    assert.deepEqual(errores, ["Las cuotas sin interés no pueden ser más que el máximo de cuotas.", "Sin pagos a cuotas, los datos de cuotas quedan vacíos.",
      "Indique hasta cuántas cuotas acepta: de 2 a 48.", "Algún dato no tiene el formato correcto. Revise los campos."]);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  // Textos legales (0015)
  const textoLegal = async (p, ruta) => { await p.goto(BASE + ruta, { waitUntil: "networkidle" }); await p.waitForFunction(() => !document.querySelector("#legal-texto[aria-busy]")); return p.textContent("#legal-texto"); };
  // Datos legales de prueba en el estado demo (sin publicar), con cambios.
  const datosLegales = (p, cambios = {}) => p.evaluate(async ([clave, base, cambios]) => {
    const { TIENDA_LEGAL_PRUEBA } = await import(`${base}/tests/legal/datos-prueba.mjs`);
    const e = JSON.parse(localStorage.getItem(clave));
    const legales = Object.entries(TIENDA_LEGAL_PRUEBA).filter(([k]) => /^(legal_|meta_pixel_id|ga4_|gtm_|clarity_|tiktok_|gads_|capi_|plataforma_)/.test(k));
    Object.assign(e.tienda, Object.fromEntries(legales), cambios);
    localStorage.setItem(clave, JSON.stringify(e));
  }, [CLAVE_DEMO, BASE, cambios]);
  const tiendaDemo = (p) => p.evaluate((clave) => JSON.parse(localStorage.getItem(clave)).tienda, CLAVE_DEMO);
  // Deja pasar la espera del guardado al escribir (700 ms) y espera "Guardado".
  const esperarGuardado = async (p) => { await p.waitForTimeout(800); await p.waitForFunction(() => /^Guardado/.test(document.querySelector("#l-guardado")?.textContent || "")); };
  const MARCAS = /[[\]{}]|undefined|null|NaN|PENDIENTE/;
  const INDEPENDIENTE = "es un comercio independiente. No está afiliado, patrocinado ni autorizado por Apple Inc. iPhone es una marca de Apple Inc.";

  await caso("legales: el asistente cambia los campos según el perfil y el tipo de persona, valida, guarda solo y publica solo con todo completo", async () => {
    const p = await nueva(1280, 900, { legales: false });
    await entrarPanel(p, "gestor@demo.co");
    const avisos = () => p.$$eval(".avisos li span", (xs) => xs.map((x) => x.textContent));
    assert.equal((await avisos())[0], "Faltan los textos legales: el pop-up no envía pedidos hasta publicarlos", "primero en Lo que falta");
    assert.equal(await p.getAttribute(".avisos li a >> nth=0", "href"), "#/legales/1");
    await p.click(".avisos li a >> nth=0");
    await p.waitForSelector("#l-titulo");
    assert.equal(await p.textContent("#l-titulo"), "1. Perfil de la tienda");
    assert.equal(await p.textContent("#l-progreso-texto"), "0 de 6 pasos completos");
    // Emprendedor sin local: sin dirección del local
    await p.check("#l-legal_perfil-4");
    await esperarGuardado(p);
    await p.click("#l-siguiente");
    await p.waitForSelector("#l-legal_tipo_persona");
    assert.equal(await p.locator("#l-legal_direccion_local").count(), 0, "emprendedor: sin local");
    assert.equal(await p.locator("#l-legal_representante").count(), 0, "persona natural: sin representante");
    assert.equal(await p.textContent('label[for="l-legal_nombre"]'), "Nombre completo");
    // Jurídica: razón social, representante y matrícula
    await p.check("#l-legal_tipo_persona-1");
    await esperarGuardado(p);
    assert.equal(await p.textContent('label[for="l-legal_nombre"]'), "Razón social");
    for (const c of ["legal_representante", "legal_matricula_numero", "legal_matricula_camara"]) assert.equal(await p.locator(`#l-${c}`).count(), 1, c);
    // Validaciones al salir del campo
    await p.selectOption("#l-legal_doc_tipo", "nit");
    await p.fill("#l-legal_doc_numero", "900123456");
    await p.fill("#l-legal_correo", "datos@");
    await p.focus("#l-legal_ciudad");
    assert.match(await p.textContent("#l-legal_doc_numero-error"), /^Revise el número: sin puntos ni espacios, como 900123456-7\.$/);
    assert.equal(await p.textContent("#l-legal_correo-error"), "Revise el correo.");
    assert.equal(await p.getAttribute("#l-legal_correo", "aria-invalid"), "true");
    await esperarGuardado(p);
    let t = await tiendaDemo(p);
    assert.deepEqual([t.legal_perfil, t.legal_tipo_persona, t.legal_doc_tipo, t.legal_doc_numero], ["emprendedor", "juridica", "nit", "900123456"], "se guarda solo");
    // Revendedor no oficial: pide el local
    await p.click("#l-pasos a >> nth=0");
    await p.check("#l-legal_perfil-3");
    await p.click("#l-siguiente");
    await p.waitForSelector("#l-legal_direccion_local");
    // Países: solo Colombia; Brasil necesita portugués
    await p.click("#l-siguiente");
    await p.waitForSelector("#l-legal_paises");
    const paises = await p.$$eval("#l-legal_paises input", (xs) => xs.map((x) => [x.closest("label").textContent.replace(/\s+/g, " ").trim(), x.disabled]));
    assert.equal(paises.length, 19);
    assert.deepEqual(paises.filter(([, d]) => !d).map(([n]) => n), ["Colombia"]);
    assert.ok(paises.some(([n]) => n === "Brasil Necesita el sitio en portugués."));
    assert.ok(paises.filter(([n]) => / Próximamente$/.test(n)).length === 17);
    await p.check("#l-legal_paises-4");
    await esperarGuardado(p);
    // Condiciones de venta: garantía mínima con Colombia y los avisos literales
    await p.click("#l-siguiente");
    await p.waitForSelector("#l-legal_garantia_nuevos");
    assert.equal(await p.textContent("#l-legal_garantia_nuevos-ayuda"), "Si no indica un término mayor, la ley colombiana fija un año para productos nuevos.");
    await p.fill("#l-legal_garantia_nuevos", "6");
    await p.focus("#imp-0-nombre");
    assert.equal(await p.textContent("#l-legal_garantia_nuevos-error"), "Con Colombia, la garantía de los equipos nuevos debe ser de 12 meses o más.");
    await p.check("#l-legal_garantia_usados-1");
    assert.equal(await p.textContent(".aviso-datos"), "Solo puede vender sin garantía un usado cuya garantía legal ya venció, y el cliente debe aceptarlo por escrito al comprar.");
    await p.check("#l-legal_garantia_usados-0");
    assert.equal(await p.locator("#l-legal_garantia_usados_meses").count(), 1, "con garantía: pide los meses");
    assert.match(await p.textContent(".texto-fijo"), new RegExp(`^Tienda de demostración ${INDEPENDIENTE.replace(/\./g, "\\.")}$`));
    // Herramientas: Meta siempre; las opcionales piden su ID al encenderlas
    await p.click("#l-siguiente");
    await p.waitForSelector("#l-meta_pixel_id");
    assert.equal(await p.locator("#l-ga4_id").count(), 0);
    await p.check("#l-ga4_activo");
    await p.waitForSelector("#l-ga4_id");
    assert.equal(await p.isChecked("#l-capi_solo_consentimiento-0"), true, "API de Conversiones: sí por defecto");
    assert.equal(await p.textContent("#l-capi_solo_consentimiento-ayuda"), "Configure su workflow de GoHighLevel para revisar el campo consentimiento_publicidad antes de enviar el evento.");
    assert.equal(await p.inputValue("#l-plataforma_sitio"), "HighLevel (GoHighLevel)");
    await p.uncheck("#l-ga4_activo");
    await esperarGuardado(p);
    // Oficial: el detalle de Apple es obligatorio (y no va el texto de independiente)
    await p.click("#l-pasos a >> nth=0");
    await p.check("#l-legal_perfil-0");
    await esperarGuardado(p);
    await p.click("#l-pasos a >> nth=3");
    await p.waitForSelector("#l-legal_apple_detalle");
    assert.equal(await p.locator(".texto-fijo").count(), 0);
    // Publicar: deshabilitado mientras falte algo; la lista lleva al campo
    await datosLegales(p, { legal_perfil: "no_oficial", meta_pixel_id: "" });
    await p.goto(`${BASE}/admin/#/legales/6`);
    await p.waitForSelector("#l-publicar");
    assert.equal(await p.isDisabled("#l-publicar"), true);
    assert.deepEqual(await p.$$eval("#l-faltan li span", (xs) => xs.map((x) => x.textContent)), ["El ID del píxel de Meta"]);
    assert.equal(await p.textContent("[data-previa='privacidad']"), "La vista previa aparece cuando no falte ningún dato.");
    await p.click("#l-faltan a");
    await p.waitForFunction(() => document.activeElement?.id === "l-meta_pixel_id");
    assert.equal(await p.textContent("#l-meta_pixel_id-error"), "Complete este dato.");
    await p.fill("#l-meta_pixel_id", "12a");
    await p.focus("#l-plataforma_sitio");
    assert.equal(await p.textContent("#l-meta_pixel_id-error"), "Revise el ID del píxel. Ej.: 123456789012345.");
    await p.fill("#l-meta_pixel_id", "123456789012345");
    await esperarGuardado(p);
    await p.click("#l-siguiente");
    await p.waitForSelector("#l-publicar:not([disabled])");
    assert.equal(await p.textContent("#l-progreso-texto"), "5 de 6 pasos completos");
    // Vista previa en pestañas, con flechas
    assert.match(await p.textContent("[data-previa='privacidad']"), /Celulares La 70 S\.A\.S\./);
    await p.focus("#pestana-privacidad");
    await p.keyboard.press("ArrowRight");
    assert.equal(await p.getAttribute("#pestana-terminos", "aria-selected"), "true");
    assert.match(await p.textContent("[data-previa='terminos']"), new RegExp(INDEPENDIENTE.replace(/\./g, "\\.")));
    // Cláusula propia de los términos
    await p.click("[data-agregar-clausula='legal_clausula_terminos']");
    await p.fill("#l-legal_clausula_terminos", "Los equipos se entregan con su caja original.");
    await esperarGuardado(p);
    assert.match(await p.textContent("[data-previa='terminos']"), /Condiciones adicionales de la tienda\s*Los equipos se entregan con su caja original\./);
    await p.click("#l-publicar");
    await p.waitForSelector("text=Textos legales publicados");
    assert.match(await p.textContent("#l-estado"), /^Publicados: versión 1, vigentes desde \d{1,2}\/\d{1,2}\/\d{4}\.$/);
    assert.equal(await p.textContent("#l-progreso-texto"), "6 de 6 pasos completos");
    assert.equal(await p.isDisabled("#l-publicar"), true, "al día: no hay nada que publicar");
    t = await tiendaDemo(p);
    assert.equal(t.legal_publicado.version, 1);
    await p.goto(`${BASE}/admin/#/inicio`);
    await p.waitForSelector(".estadisticas");
    assert.ok(!(await avisos()).some((a) => /legales/.test(a)));
    assert.equal(await p.isDisabled("#i-modo-demo"), false, "publicados: el modo demo se puede apagar");
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("legales: sin publicar, el pop-up no envía, las páginas dicen \"Página en preparación.\" y la demo no se puede quitar (sitio, panel y capa de datos)", async () => {
    const p = await nueva(390, 844, { legales: false });
    await ir(p);
    for (const ruta of ["/privacidad/", "/terminos/", "/cookies/"]) assert.equal((await textoLegal(p, ruta)).trim(), "Página en preparación.", ruta);
    await ir(p, "/?condicion=nuevo&modelo=iphone-18-pro-max&capacidad=512-gb");
    await p.click("#detalle-en-linea [data-comprar]");
    await p.waitForSelector("#popup[open]");
    assert.equal(await p.textContent("#popup .popup-alerta"), "Esta tienda todavía no completó su información legal.");
    assert.equal(await p.locator("#p-nombre, [data-enviar]").count(), 0, "sin formulario ni botón de envío");
    assert.equal(await p.evaluate(() => sessionStorage.getItem("cotizadora-demo:ultimo-lead")), null);
    await entrarPanel(p, "gestor@demo.co");
    assert.equal(await p.isDisabled("#i-modo-demo"), true);
    assert.equal(await p.isDisabled("#borrar-demo"), true);
    assert.match(await p.textContent("#demo-sin-legales"), /primero publique los textos legales/);
    const r = await p.evaluate(async (base) => {
      const a = await (await import(`${base}/assets/js/datos/api.js`)).api();
      const intentar = async (fn) => { try { await fn(); return "ok"; } catch (e) { return e.message; } };
      return [await intentar(() => a.borrarDatosDemo()), await intentar(() => a.guardarTienda({ modo_demo: false })),
        await intentar(() => a.guardarTienda({ legal_publicado: { documentos: { privacidad: "a", terminos: "b", cookies: "c", aviso: "d" } } }))];
    }, BASE);
    assert.deepEqual(r, ["Publique los textos legales antes de borrar los datos de demostración.", "Publique los textos legales antes de quitar el modo demo.", "Faltan datos para publicar los textos legales."]);
    assert.equal((await tiendaDemo(p)).modo_demo, true);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("legales: los documentos publicados llevan los datos de la tienda, sus secciones y la vigencia, sin marcas; las herramientas activas aparecen y las inactivas no", async () => {
    const p = await nueva(390, 844);
    await ir(p);
    const priv = await textoLegal(p, "/privacidad/");
    assert.equal(await p.textContent("h1"), "Política de tratamiento de datos personales");
    for (const x of ["Celulares La 70 S.A.S.", "NIT 900123456-7", "Nuestro proveedor tecnológico, ubicado en Argentina", "HighLevel (GoHighLevel), en Estados Unidos",
      "máximo 10 días hábiles", "máximo 15 días hábiles", "máximo 2 meses desde el último contacto", "mayores de 18 años", "Vigente desde 21/10/2026 · versión 1."]) assert.ok(priv.includes(x), `privacidad: ${x}`);
    const term = await textoLegal(p, "/terminos/");
    assert.ok(term.includes(`Tienda de demostración ${INDEPENDIENTE}`), "términos: relación con Apple");
    assert.ok(term.includes("5 días hábiles siguientes a la entrega"));
    const cook = await textoLegal(p, "/cookies/");
    assert.ok(cook.includes("Píxel de Meta") && cook.includes("_fbp"));
    for (const x of ["Google Analytics", "Microsoft Clarity", "TikTok", "Google Ads", "Tag Manager"]) assert.ok(!cook.includes(x), `inactiva: ${x}`);
    assert.equal(await p.locator("#legal-texto table").count(), 1, "una tabla por herramienta activa");
    for (const x of [priv, term, cook]) assert.ok(!MARCAS.test(x), `marcas o datos vacíos: ${x.match(MARCAS)}`);
    assert.ok(await p.isVisible("[data-preferencias-cookies]"), "el pie de las páginas legales permite cambiar las cookies");
    assert.deepEqual(await p.evaluate(contrasteMalo), []);
    // Con más herramientas, la política de cookies las suma
    await publicarLegalesCon(p, { ga4_activo: true, ga4_id: "G-ABC123XYZ9", clarity_activo: true, clarity_id: "abc123def4" });
    const cook2 = await textoLegal(p, "/cookies/");
    assert.ok(cook2.includes("Google Analytics 4") && cook2.includes("_ga (2 años)") && cook2.includes("Microsoft Clarity"));
    assert.ok(cook2.includes("versión 2."), "otro texto, otra versión");
    // Pie del sitio: los tres documentos y las preferencias
    await ir(p);
    assert.deepEqual(await p.$$eval(".pie-enlaces a", (xs) => xs.map((x) => [x.textContent, x.getAttribute("href")])),
      [["Política de privacidad", "privacidad/"], ["Términos y condiciones", "terminos/"], ["Política de cookies", "cookies/"]]);
    assert.ok(await p.isVisible(".pie [data-preferencias-cookies]"));
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("legales: después de publicar, un cambio en Legales o en Mi tienda regenera y sube la versión; con datos incompletos queda la publicada", async () => {
    const p = await nueva(1280, 900);
    await entrarPanel(p, "gestor@demo.co");
    await p.goto(`${BASE}/admin/#/legales/4`);
    await p.waitForSelector("#l-legal_garantia_nuevos");
    await p.fill("#l-legal_garantia_nuevos", "24");
    await p.waitForFunction(() => document.querySelector("#l-guardado")?.textContent === "Guardado. Textos legales actualizados: versión 2.");
    assert.match(await textoLegal(p, "/terminos/"), /24 meses desde la entrega[\s\S]*versión 2\./);
    // Incompleto: se guarda, pero lo publicado queda
    await p.goto(`${BASE}/admin/#/legales/4`);
    await p.waitForSelector("#l-legal_entrega_zonas");
    await p.fill("#l-legal_entrega_zonas", "");
    await esperarGuardado(p);
    assert.equal((await tiendaDemo(p)).legal_publicado.version, 2);
    await p.goto(`${BASE}/admin/#/inicio`);
    await p.waitForSelector(".estadisticas");
    assert.ok((await p.$$eval(".avisos li span", (xs) => xs.map((x) => x.textContent))).includes("Faltan datos legales: los textos publicados no se actualizan"));
    // Completo otra vez y un cambio de nombre en Mi tienda: versión 3
    const v = await p.evaluate(async (base) => {
      const a = await (await import(`${base}/assets/js/datos/api.js`)).api();
      await a.guardarTienda({ legal_entrega_zonas: "Medellín" });
      const t = await a.guardarTienda({ nombre: "La 70 Celulares" });
      return [t.legal_publicado.version, t.legal_publicado.documentos.terminos.includes("La 70 Celulares es un comercio independiente")];
    }, BASE);
    assert.deepEqual(v, [4, true], "zonas (3) y nombre (4)");
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("banner de cookies: nada se carga antes de aceptar; rechazar no carga nada; por categoría; tres botones iguales; no tapa los filtros; se cambia desde el pie", async () => {
    const p = await nueva(360, 800, { cookies: null });
    const externas = [];
    await p.route(/connect\.facebook\.net|googletagmanager\.com|clarity\.ms|analytics\.tiktok\.com/, (r) => { externas.push(new URL(r.request().url()).host); r.fulfill({ contentType: "text/javascript", body: "" }); });
    await ir(p);
    await publicarLegalesCon(p, { ga4_activo: true, ga4_id: "G-ABC123XYZ9", clarity_activo: true, clarity_id: "abc123def4", tiktok_activo: true, tiktok_id: "C1A2B3C4D5E6F7G8H9I0" });
    await ir(p);
    // En 360 × 800 los filtros llegan casi al borde: el banner espera a que la persona baje
    await p.waitForTimeout(500);
    assert.equal(await p.isVisible(".banner-cookies"), false, "no tapa los filtros");
    await p.mouse.wheel(0, 600);
    await p.waitForSelector(".banner-cookies", { state: "visible" });
    const filtros = await p.$eval("#filtros", (f) => f.getBoundingClientRect().bottom);
    const banner = await p.$eval(".banner-cookies-caja", (b) => b.getBoundingClientRect().top);
    assert.ok(filtros <= banner, "el banner queda debajo de los filtros");
    assert.deepEqual(externas, [], "nada antes de aceptar");
    assert.equal(await p.getAttribute(".banner-cookies", "aria-labelledby"), "cookies-titulo");
    const cajas = await p.$$eval(".banner-cookies-botones .boton", (bs) => bs.map((b) => { const r = b.getBoundingClientRect(); return [b.textContent, Math.round(r.width), Math.round(r.height)]; }));
    assert.deepEqual(cajas.map((c) => c[0]), ["Aceptar todas", "Rechazar todas", "Configurar"]);
    assert.equal(new Set(cajas.map((c) => `${c[1]}x${c[2]}`)).size, 1, `los tres del mismo tamaño: ${JSON.stringify(cajas)}`);
    assert.ok(cajas[0][2] >= 44);
    assert.deepEqual(await p.evaluate(contrasteMalo), []);
    await p.click("[data-cookies='rechazar']");
    assert.equal(await p.locator(".banner-cookies").count(), 0);
    await ir(p);
    await p.mouse.wheel(0, 600);
    await p.waitForTimeout(600);
    assert.equal(await p.locator(".banner-cookies").count(), 0, "la elección queda guardada");
    assert.deepEqual(externas, [], "rechazar no carga nada");
    // Desde el pie: solo medición
    await p.click(".pie [data-preferencias-cookies]");
    await p.waitForSelector("#cookies-config");
    assert.equal(await p.isChecked("#ck-necesarias"), true);
    assert.equal(await p.isDisabled("#ck-necesarias"), true);
    assert.match(await p.textContent("#ck-medicion-texto"), /Google Analytics 4, Microsoft Clarity\.$/);
    assert.match(await p.textContent("#ck-publicidad-texto"), /Píxel de Meta, Píxel de TikTok\.$/);
    await p.check("#ck-medicion");
    await p.click(".banner-cookies-guardar");
    await p.waitForFunction(() => document.activeElement?.matches("[data-preferencias-cookies]"));
    await p.waitForTimeout(300);
    assert.deepEqual([...new Set(externas)].sort(), ["www.clarity.ms", "www.googletagmanager.com"]);
    // Ahora solo publicidad: desde ahora se carga Meta y TikTok; se borran las cookies de medición
    await p.evaluate(() => { document.cookie = "_ga=GA1.1.1; path=/"; });
    await p.click(".pie [data-preferencias-cookies]");
    await p.uncheck("#ck-medicion");
    await p.check("#ck-publicidad");
    await p.click(".banner-cookies-guardar");
    await p.waitForTimeout(300);
    assert.ok(externas.includes("connect.facebook.net") && externas.includes("analytics.tiktok.com"));
    assert.ok(!/_ga=/.test(await p.evaluate(() => document.cookie)), "se borran las cookies de medición");
    const c = await p.evaluate(() => JSON.parse(localStorage.getItem("cotizadora:cookies")));
    assert.deepEqual([c.medicion, c.publicidad], [false, true]);
    externas.length = 0;
    await ir(p);
    assert.deepEqual([...new Set(externas)], ["connect.facebook.net", "analytics.tiktok.com"].filter((h) => externas.includes(h)), "medición retirada: no se carga");
    assert.ok(!externas.includes("www.googletagmanager.com") && !externas.includes("www.clarity.ms"));
    // Seis meses: una elección vieja vuelve a preguntar
    await p.evaluate(() => { const c = JSON.parse(localStorage.getItem("cotizadora:cookies")); c.fecha = new Date(Date.now() - 190 * 864e5).toISOString(); localStorage.setItem("cotizadora:cookies", JSON.stringify(c)); });
    externas.length = 0;
    await ir(p);
    await p.mouse.wheel(0, 600);
    await p.waitForSelector(".banner-cookies", { state: "visible" });
    assert.deepEqual(externas, [], "vencida: nada hasta volver a elegir");
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("banner de cookies: en 412 × 823 (el celular de Lighthouse) no tapa los filtros ya dibujados, ni al cargar ni al bajar", async () => {
    const p = await nueva(412, 823, { cookies: null, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true });
    await ir(p);
    await p.waitForTimeout(800);
    const tapa = () => p.evaluate(() => {
      const b = document.querySelector(".banner-cookies:not([hidden]) .banner-cookies-caja");
      return Boolean(b) && document.querySelector("#filtros").getBoundingClientRect().bottom > b.getBoundingClientRect().top;
    });
    assert.equal(await tapa(), false, "al cargar");
    for (let i = 0; i < 6; i++) { await p.mouse.wheel(0, 120); await p.waitForTimeout(120); assert.equal(await tapa(), false, `al bajar (${i})`); }
    await p.waitForSelector(".banner-cookies", { state: "visible" });
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("banner de cookies: en escritorio aparece sin tapar los filtros; con Global Privacy Control la publicidad queda rechazada", async () => {
    const p = await nueva(1440, 900, { cookies: null });
    await p.addInitScript(() => Object.defineProperty(Navigator.prototype, "globalPrivacyControl", { get: () => true }));
    const externas = [];
    await p.route(/connect\.facebook\.net|googletagmanager\.com|clarity\.ms|analytics\.tiktok\.com/, (r) => { externas.push(new URL(r.request().url()).host); r.fulfill({ contentType: "text/javascript", body: "" }); });
    await ir(p);
    await publicarLegalesCon(p, { ga4_activo: true, ga4_id: "G-ABC123XYZ9" });
    await ir(p);
    await p.waitForSelector(".banner-cookies", { state: "visible" });
    const [filtros, banner, titulo] = await p.evaluate(() => [document.querySelector("#filtros").getBoundingClientRect().bottom, document.querySelector(".banner-cookies-caja").getBoundingClientRect().top, document.querySelector(".titulo").getBoundingClientRect().bottom]);
    assert.ok(filtros <= banner && titulo <= banner, "no tapa el título ni los filtros");
    await p.click("[data-cookies='configurar']");
    assert.equal(await p.isDisabled("#ck-publicidad"), true);
    assert.match(await p.textContent("#ck-publicidad-texto"), /Global Privacy Control/);
    await p.click("[data-cookies='aceptar']");
    await p.waitForTimeout(300);
    const c = await p.evaluate(() => JSON.parse(localStorage.getItem("cotizadora:cookies")));
    assert.deepEqual([c.medicion, c.publicidad], [true, false], "GPC: publicidad rechazada");
    assert.deepEqual([...new Set(externas)], ["www.googletagmanager.com"], "solo medición");
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("pop-up: aviso corto y dos casillas sin marcar; la obligatoria bloquea y la opcional no; el lead lleva el consentimiento; Lead del píxel solo con publicidad", async () => {
    const p = await nueva(390, 844, { cookies: { medicion: true, publicidad: false } });
    await ir(p, "/?condicion=nuevo&modelo=iphone-18-pro-max&capacidad=512-gb");
    await p.click("#detalle-en-linea [data-comprar]");
    await p.waitForSelector("#p-autorizacion");
    const aviso = (await p.textContent("#p-aviso")).replace(/\s+/g, " ").trim();
    assert.match(aviso, /^Tienda de demostración \(Celulares La 70 S\.A\.S\., NIT 900123456-7\) es responsable de sus datos\./);
    assert.ok(aviso.endsWith("Ver la Política de privacidad."));
    assert.equal(await p.getAttribute("#p-aviso a", "target"), "_blank");
    assert.equal((await p.textContent('label[for="p-autorizacion"]')).replace(/\s+/g, " ").trim(),
      "Soy mayor de 18 años y autorizo el tratamiento de mis datos para recibir mi cotización y ser contactado sobre ella por WhatsApp y correo, según la Política de privacidad.");
    assert.equal((await p.textContent('label[for="p-promociones"]')).replace(/\s+/g, " ").trim(), "Quiero recibir promociones y novedades de Tienda de demostración por WhatsApp y correo.");
    assert.deepEqual([await p.isChecked("#p-autorizacion"), await p.isChecked("#p-promociones")], [false, false], "las dos sin marcar");
    assert.equal(await p.getAttribute("#form-cotizacion", "data-clarity-mask"), "true");
    assert.equal(await p.getAttribute("#popup .resumen", "data-clarity-mask"), "true");
    await p.fill("#p-nombre", "Juan Pérez");
    await p.fill("#p-correo", "juan@correo.co");
    await p.click("#p-telefono");
    await p.keyboard.type("3001234567");
    await p.click("[data-enviar]");
    assert.equal(await p.textContent("#p-autorizacion-error"), "Para continuar, acepte la autorización de datos.");
    assert.equal(await p.evaluate(() => document.activeElement.id), "p-autorizacion");
    assert.equal(await p.evaluate(() => sessionStorage.getItem("cotizadora-demo:ultimo-lead")), null, "sin la obligatoria no se envía");
    await p.check("#p-autorizacion");
    await p.click("[data-enviar]");
    await p.waitForSelector("text=Su pedido está listo");
    const lead = JSON.parse(await p.evaluate(() => sessionStorage.getItem("cotizadora-demo:ultimo-lead")));
    assert.deepEqual([lead.consentimiento_datos, lead.consentimiento_promociones, lead.consentimiento_medicion, lead.consentimiento_publicidad, lead.version_politica],
      [true, false, true, false, 1]);
    assert.match(lead.fecha_consentimiento, /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}-05:00$/);
    assert.equal(await p.evaluate(() => typeof window.fbq), "undefined", "sin publicidad no hay píxel ni Lead");
    // Con promociones marcadas
    await p.click("[data-cerrar]");
    await p.click("#detalle-en-linea [data-comprar]");
    await llenarPopup(p);
    await p.check("#p-promociones");
    await p.click("[data-enviar]");
    await p.waitForSelector("text=Su pedido está listo");
    assert.equal(JSON.parse(await p.evaluate(() => sessionStorage.getItem("cotizadora-demo:ultimo-lead"))).consentimiento_promociones, true);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("B1 y B3: Mi tienda elige el país; el WhatsApp sigue su formato (y la capa de datos lo exige); sin módulo legal, el paso 3 lo dice", async () => {
    const p = await nueva(1280, 900);
    await entrarPanel(p, "gestor@demo.co");
    await p.goto(`${BASE}/admin/#/tienda`);
    await p.waitForSelector("#pais");
    assert.equal(await p.inputValue("#pais"), "co", "el demo es de Colombia");
    assert.equal(await p.locator("#pais option").count(), 19);
    assert.match(await p.textContent("#pais-ayuda"), /^Moneda: COP \(\$\)\. Prefijo del celular: \+57\. Zona horaria: America\/Bogota\./);
    await p.selectOption("#pais", "ar");
    assert.match(await p.textContent("#pais-ayuda"), /^Moneda: ARS \(\$\)\. Prefijo del celular: \+549\. Zona horaria: America\/Argentina\/Buenos_Aires\./);
    assert.equal(await p.textContent("#whatsapp-ayuda"), "Formato internacional sin «+»: 549 y el número. Ej. 5491123456789.");
    await p.fill("#whatsapp", "573001234567");
    await p.click("#guardar-tienda");
    assert.equal(await p.textContent("#whatsapp-error"), "No tiene el formato de Argentina. Formato internacional sin «+»: 549 y el número. Ej. 5491123456789.");
    await p.fill("#whatsapp", "5491123456789");
    await p.click("#guardar-tienda");
    await p.waitForSelector("text=Guardado");
    let t = await p.evaluate((c) => JSON.parse(localStorage.getItem(c)).tienda, CLAVE_DEMO);
    assert.deepEqual([t.pais, t.whatsapp], ["ar", "5491123456789"]);
    // B3: Argentina no tiene módulo legal: lo dicen Mi tienda y el paso 3, y falta para publicar
    assert.match(await p.textContent("#pais-ayuda"), / Los textos legales para Argentina todavía no están disponibles\.$/);
    await p.goto(`${BASE}/admin/#/legales/3`);
    await p.waitForSelector("#l-pais");
    assert.equal(await p.textContent("#l-pais p"), "Los textos legales para Argentina todavía no están disponibles.");
    assert.equal(await p.getAttribute("#l-pais a", "href"), "#/tienda");
    await p.goto(`${BASE}/admin/#/legales/6`);
    await p.waitForSelector("#l-faltan li");
    assert.ok((await p.locator("#l-faltan li").allTextContents()).some((x) => x.startsWith("Los textos legales para Argentina todavía no están disponibles.")));
    await p.goto(`${BASE}/admin/#/tienda`);
    await p.waitForSelector("#pais");
    // Un país sin formato verificado: prefijo y número de 8 a 15 dígitos
    await p.selectOption("#pais", "gt");
    assert.equal(await p.textContent("#whatsapp-ayuda"), "Formato internacional sin «+»: 502 y el número, de 8 a 15 dígitos en total.");
    // La capa de datos repite la regla del SQL
    const r = await p.evaluate(async (base) => {
      const a = await (await import(`${base}/assets/js/datos/api.js`)).api();
      try { await a.guardarTienda({ pais: "co" }); return "ok"; } catch (e) { return e.message; }
    }, BASE);
    assert.equal(r, "El WhatsApp no tiene el formato del país de la tienda.");
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("B4: con la tienda en portugués cambian el sitio, el pop-up, el banner de cookies, las páginas legales y el panel (sin texto en español suelto)", async () => {
    const PT = (await import(require("url").pathToFileURL(path.join(RAIZ, "assets/js/i18n/pt.js")).href)).default;
    // Palabras de la interfaz en español que no deben quedar con la tienda en portugués
    // (los datos de la tienda y del catálogo, como las fichas técnicas, sí quedan como se cargaron).
    const ESPANOL = /\b(usted|Elija|Guardar|Agregar|Cargando|Limpiar|Cerrar|Aceptar|Rechazar|Salir|Mi tienda|Inventario|Su|Sus|equipos?|disponibles|Precio|Continuar a)\b/;
    const sinDatos = (p, sel = "body") => p.$eval(sel, (b) => {
      const c = b.cloneNode(true);
      c.querySelectorAll(".ficha dd, .marca-nombre, script, style, [lang='es'], option:not(:checked)").forEach((x) => x.remove());
      return c.innerText;
    });
    const sinEspanol = (texto, donde) => { const m = texto.match(ESPANOL); assert.ok(!m, `${donde}: queda «${m?.[0]}» en español: …${m ? texto.slice(Math.max(0, m.index - 60), m.index + 40).replace(/\s+/g, " ") : ""}…`); };
    const p = await nueva(1280, 900, { cookies: null });
    await ir(p);
    await editarDemo(p, (e) => { e.tienda.idioma = "pt"; });
    await ir(p);
    assert.equal(await p.getAttribute("html", "lang"), "pt-BR");
    assert.equal(await p.textContent("h1"), PT["sitio.titulo"]);
    assert.equal(await p.textContent("#f-condicion-titulo"), PT["sitio.filtros.condicion"]);
    assert.equal(await p.textContent("#f-modelo-titulo"), PT["sitio.filtros.modelo"]);
    assert.ok((await p.title()).endsWith(PT["sitio.titulo_pagina"]), await p.title());
    // Banner de cookies
    await p.mouse.wheel(0, 600);
    await p.waitForSelector(".banner-cookies", { state: "visible" });
    assert.equal(await p.textContent("#cookies-titulo"), PT["cookies.titulo"]);
    sinEspanol(await sinDatos(p, ".banner-cookies"), "banner");
    await p.click(".banner-cookies button >> nth=0");
    sinEspanol(await sinDatos(p), "sitio");
    // Pop-up
    await p.click(".tarjeta-boton >> nth=0");
    await p.locator("[data-comprar]:visible").first().click();
    await p.waitForSelector("#popup[open]");
    assert.equal(await p.textContent("#popup-titulo"), PT["popup.titulo"]);
    sinEspanol(await sinDatos(p, "#popup"), "pop-up");
    await p.keyboard.press("Escape");
    // Página legal: el marco en portugués y la línea que avisa que el documento está en español
    await p.goto(`${BASE}/privacidad/`, { waitUntil: "networkidle" });
    await p.waitForSelector("#legal-texto:not([aria-busy])");
    assert.ok((await p.textContent("body")).includes(PT["legalpag.solo_espanol"]));
    assert.equal(await p.getAttribute("#legal-texto", "lang"), "es");
    sinEspanol(await sinDatos(p), "página legal");
    // Panel completo
    await p.goto(`${BASE}/admin/`);
    await p.waitForSelector("#l-correo");
    sinEspanol(await sinDatos(p), "acceso al panel");
    await p.fill("#l-correo", "gestor@demo.co");
    await p.fill("#l-clave", "demo1234");
    await p.click("#form-login [type=submit]");
    await p.waitForSelector(".estadisticas");
    assert.equal(await p.textContent('[data-ruta="inventario"]'), PT["panel.nav.inventario"]);
    for (const ruta of ["inicio", "inventario", "inventario/nuevo", "tienda", "catalogo", "catalogo/fichas", "catalogo/pagos", "legales/1", "legales/2", "legales/3", "legales/4", "legales/5", "legales/6"]) {
      await p.goto(`${BASE}/admin/#/${ruta}`);
      await p.waitForTimeout(400);
      await p.waitForSelector("#vista h1, #vista h2");
      sinEspanol(await sinDatos(p), `panel #/${ruta}`);
    }
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("B5: el título del sitio se edita en Mi tienda → Marca; vacío, el del idioma (español o portugués)", async () => {
    const PT = (await import(require("url").pathToFileURL(path.join(RAIZ, "assets/js/i18n/pt.js")).href)).default;
    const p = await nueva(1280, 900);
    await ir(p);
    assert.equal(await p.textContent("h1"), "Elija su iPhone y cómprelo por WhatsApp.", "por defecto, el literal del prompt");
    await entrarPanel(p, "gestor@demo.co");
    await p.goto(`${BASE}/admin/#/tienda`);
    await p.waitForSelector("#titulo_sitio");
    assert.equal(await p.getAttribute("#titulo_sitio", "maxlength"), "80");
    assert.equal(await p.getAttribute("#titulo_sitio", "placeholder"), "Elija su iPhone y cómprelo por WhatsApp.");
    await p.fill("#titulo_sitio", "Los mejores iPhone de Palermo.");
    await p.click("#guardar-tienda");
    await p.waitForSelector("text=Guardado");
    await ir(p);
    assert.equal(await p.textContent("h1"), "Los mejores iPhone de Palermo.");
    assert.equal(await p.title(), "Tienda de demostración · Los mejores iPhone de Palermo");
    // Vacío y en portugués: el del idioma
    await editarDemo(p, (e) => { e.tienda.titulo_sitio = ""; e.tienda.idioma = "pt"; });
    await ir(p);
    assert.equal(await p.textContent("h1"), PT["sitio.titulo"]);
    // La capa de datos repite el check de 0021
    const r = await p.evaluate(async (base) => {
      const a = await (await import(`${base}/assets/js/datos/api.js`)).api();
      try { await a.guardarTienda({ titulo_sitio: "x".repeat(81) }); return "ok"; } catch (e) { return e.message; }
    }, BASE);
    assert.notEqual(r, "ok", "más de 80 caracteres no se guarda");
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("B2: con la tienda en Argentina, Brasil o México cambian el precio, el prefijo y el celular del pop-up, el lead, la moneda del píxel y la fecha", async () => {
    const p = await nueva(390, 844, { cookies: { medicion: false, publicidad: true } });
    await p.route("https://connect.facebook.net/**", (r) => r.fulfill({ contentType: "text/javascript", body: "" }));
    await ir(p);
    await editarDemo(p, (e) => Object.assign(e.tienda, { pais: "ar", whatsapp: "5491123456789", precios_actualizados_en: "2026-03-05T02:30:00Z" }));
    await ir(p, "/?condicion=nuevo&modelo=iphone-18-pro-max&capacidad=512-gb");
    assert.equal((await p.textContent("#detalle-en-linea .precio-valor")).replace(/DEMO/, "").trim(), "$7.000.000");
    // 02:30 UTC del 5/3 es el 4/3 en Buenos Aires (UTC-3)
    assert.equal(await p.textContent("#pie-precios"), "Precios actualizados al 4/3/2026");
    await p.click("#detalle-en-linea [data-comprar]");
    await p.waitForSelector("#p-telefono");
    assert.equal(await p.textContent(".telefono .prefijo"), "+54 9");
    assert.equal(await p.getAttribute("#p-telefono", "placeholder"), "11 2345 6789");
    assert.equal(await p.textContent("#p-telefono-prefijo"), "Número de Argentina, con el prefijo +54 9 ya puesto.");
    await p.fill("#p-nombre", "Juan Pérez");
    await p.fill("#p-correo", "juan@correo.co");
    await p.check("#p-autorizacion");
    await p.click("#p-telefono");
    await p.keyboard.type("011");
    await p.click("[data-enviar]");
    assert.equal(await p.textContent("#p-telefono-error"), "Revise su celular: escríbalo sin el +54 9, como 11 2345 6789.");
    await p.fill("#p-telefono", "");
    await p.keyboard.type("1123456789");
    assert.equal(await p.inputValue("#p-telefono"), "11 2345 6789");
    await p.click("[data-enviar]");
    await p.waitForSelector("text=Su pedido está listo");
    const lead = JSON.parse(await p.evaluate(() => sessionStorage.getItem("cotizadora-demo:ultimo-lead")));
    assert.equal(lead.telefono, "+5491123456789");
    assert.match(lead.fecha_consentimiento, /-03:00$/);
    assert.ok((await p.getAttribute("[data-abrir-wa]", "href")).startsWith("https://wa.me/5491123456789?text="));
    const cola = await p.evaluate(() => window.fbq.queue.map((a) => JSON.parse(JSON.stringify([...a]))));
    assert.equal(cola.find((a) => a[1] === "Lead")[2].currency, "ARS");
    // Brasil y México: símbolo y separador de miles
    for (const [pais, whatsapp, precio] of [["br", "5511912345678", "R$\u00A07.000.000"], ["mx", "525512345678", "$7,000,000"]]) {
      await editarDemo(p, (e, x) => Object.assign(e.tienda, { pais: x[0], whatsapp: x[1] }), [pais, whatsapp]);
      await ir(p, "/?condicion=nuevo&modelo=iphone-18-pro-max&capacidad=512-gb");
      assert.equal((await p.textContent("#detalle-en-linea .precio-valor")).replace(/DEMO/, "").trim(), precio, pais);
    }
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("panel: validaciones (precio, batería, WhatsApp de la tienda, color)", async () => {
    const p = await nueva(390, 844);
    await entrarPanel(p, "gestor@demo.co");
    await p.goto(`${BASE}/admin/#/tienda`);
    await p.waitForSelector("#form-tienda");
    await p.fill("#whatsapp", "3001234567");
    await p.fill("#color_primario", "azul");
    await p.click("#guardar-tienda");
    assert.equal(await p.textContent("#whatsapp-error"), "No tiene el formato de Colombia. Formato internacional sin «+»: 57 y el número. Ej. 573001234567.");
    assert.equal(await p.textContent("#color_primario-error"), "Use el formato #RRGGBB, ej. #1A73E8.");
    await p.goto(`${BASE}/admin/#/inventario/nuevo`);
    // Hay cambios sin guardar en Mi tienda: el panel pregunta antes de salir.
    await p.click('#confirmar [value="si"]');
    await p.selectOption("#e-modelo", { label: "iPhone 13" });
    await p.click("#siguiente");
    await p.check('input[name="e-condicion"][value="usado"]', { force: true }); await p.click("#siguiente");
    await p.check('input[name="e-capacidad"][value="64 GB"]', { force: true }); await p.click("#siguiente");
    // Color: solo los oficiales del modelo; sin elegir, avisa.
    await p.click("#siguiente");
    assert.equal(await p.textContent("#e-color-error"), "Elija el color.");
    await p.check('input[name="e-color"] >> nth=0', { force: true }); await p.click("#siguiente");
    // El stock es un interruptor que arranca en «Con stock».
    assert.equal(await p.isChecked("#e-stock"), true);
    assert.equal((await p.innerText('label[for="e-stock"] .interruptor-estado')).trim(), "Con stock");
    await p.fill("#e-precio", "0"); await p.click("#siguiente");
    assert.equal(await p.textContent("#e-precio-error"), "El precio debe ser un número entero mayor que 0.");
    await p.fill("#e-precio", "1.200.000"); await p.click("#siguiente");
    await p.click("#siguiente"); // fotos
    await p.fill("#e-bateria", "101"); await p.click("#siguiente");
    assert.equal(await p.textContent("#e-bateria-error"), "La batería debe ser un número entero de 0 a 100.");
    assert.equal(await p.textContent("#e-estado-error"), "Elija el estado estético.");
    await p.context().close();
  });

  // ---------------------------------------------------------------- 12.10
  for (const [ancho, alto] of [[320, 640], [360, 800], [768, 1024], [1440, 900]]) {
    await caso(`10. ${ancho}px: sin scroll horizontal, un h1 y sin errores (sitio, legales y panel)`, async () => {
      const p = await nueva(ancho, alto);
      for (const ruta of ["/", "/privacidad/", "/terminos/", "/cookies/"]) {
        await ir(p, ruta);
        assert.equal(await p.locator("h1").count(), 1, `${ruta}: h1`);
        const desborde = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
        assert.ok(desborde <= 0, `${ruta}: desborda ${desborde}px`);
      }
      await ir(p);
      await captura(p, `10-inicio-${ancho}`);
      await p.click(".tarjeta-boton >> nth=0");
      await p.waitForTimeout(500);
      await captura(p, `10-detalle-${ancho}`);
      await p.click("#cerrar-detalle");
      for (const [correo, rutas] of [["gestor@demo.co", ["inicio", "inventario", "inventario/nuevo", "tienda", "catalogo", "catalogo/ficha", "catalogo/ficha/1", "catalogo/pagos", "legales"]], ["administrador@demo.co", ["usuarios"]]]) {
        await p.evaluate(() => sessionStorage.removeItem("cotizadora-demo:sesion"));
        await entrarPanel(p, correo);
        for (const r of rutas) {
          await p.goto(`${BASE}/admin/#/${r}`);
          await p.waitForTimeout(350);
          const desborde = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          assert.ok(desborde <= 0, `panel ${r}: desborda ${desborde}px`);
          assert.equal(await p.locator("h1").count(), 1, `panel ${r}: h1`);
          if (ancho === 360) await captura(p, `10-panel-${r.replace("/", "-")}-360`);
        }
      }
      assert.deepEqual(p.errores, []);
      await p.context().close();
    });
  }

  await caso("10. carrusel: con el dedo (scroll), flechas, puntos, muestras y teclado", async () => {
    const p = await nueva(1280, 900);
    await ir(p);
    await p.click(".tarjeta-boton >> nth=0"); // 18 Pro Max 256: Negro y Plata
    await p.waitForFunction(() => document.querySelector("#hoja-detalle").open && !document.querySelector("#hoja-detalle[data-vt]"));
    await p.waitForTimeout(400);
    const color = () => p.textContent("#hoja-detalle [data-color-actual]");
    const precio = () => p.textContent("#hoja-detalle .precio-valor");
    assert.equal(await color(), "Negro");
    await p.click("#hoja-detalle .carrusel-flecha--sig");
    await p.waitForTimeout(600);
    assert.equal(await color(), "Plata");
    assert.match(await precio(), /\$6\.200\.000/);
    await p.focus("#hoja-detalle .carrusel-pista");
    await p.keyboard.press("ArrowLeft");
    await p.waitForTimeout(600);
    assert.equal(await color(), "Negro");
    await p.click('#hoja-detalle .punto[data-i="1"]');
    await p.waitForTimeout(600);
    assert.equal(await color(), "Plata");
    await p.click('#hoja-detalle .color-boton[data-i="0"]');
    await p.waitForTimeout(600);
    assert.equal(await color(), "Negro");
    // Deslizar con el dedo = desplazar la pista; scroll-snap ajusta la diapositiva.
    await p.$eval("#hoja-detalle .carrusel-pista", (el) => { el.style.scrollBehavior = "auto"; el.scrollLeft = el.clientWidth * 0.8; });
    await p.waitForTimeout(800);
    assert.equal(await color(), "Plata");
    // Escape cierra (con una salida corta de ~180 ms).
    await p.keyboard.press("Escape");
    await p.waitForFunction(() => !document.querySelector("#hoja-detalle").open, null, { timeout: 2000 });
    await p.context().close();
  });

  await caso("10. carrusel táctil en celular (gesto de deslizar) y cierre de la hoja con el gesto", async () => {
    const p = await nueva(390, 844, { hasTouch: true, isMobile: true });
    await ir(p);
    await p.tap(".tarjeta-boton >> nth=0");
    // La hoja está lista cuando terminó la transición de apertura (data-vt).
    await p.waitForFunction(() => document.querySelector("#hoja-detalle").open && !document.querySelector("#hoja-detalle[data-vt]"));
    await p.waitForTimeout(500);
    const caja = await p.locator("#hoja-detalle .carrusel-pista").boundingBox();
    const cdp = await p.context().newCDPSession(p);
    // Dedo que se desliza 240 px hacia la izquierda (eventos táctiles reales,
    // espaciados como un gesto humano).
    const y = caja.y + caja.height / 2;
    const x0 = caja.x + caja.width / 2 + 60; // sobre la foto, no sobre la flecha
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y }] });
    for (let i = 1; i <= 20; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 - i * 12, y }] });
      await p.waitForTimeout(16);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await p.waitForTimeout(900);
    assert.equal(await p.textContent("#hoja-detalle [data-color-actual]"), "Plata");
    // Arrastrar la agarradera hacia abajo cierra la hoja.
    const agarre = await p.locator("#hoja-agarre").boundingBox();
    await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: agarre.x + 60, y: agarre.y + 20 }] });
    for (let i = 1; i <= 8; i++) {
      await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: agarre.x + 60, y: agarre.y + 20 + i * 25 }] });
      await p.waitForTimeout(16);
    }
    await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
    await p.waitForTimeout(400);
    assert.equal(await p.evaluate(() => document.querySelector("#hoja-detalle").open), false);
    await p.context().close();
  });

  // ------------------------------------------------- B2: vista "Carrusel"
  const ponerCarrusel = (p) => editarDemo(p, (e) => { e.tienda.vista_equipos = "carrusel"; });
  const indicador = (p) => p.textContent(".ce-indicador").then((t) => t.trim());
  const centro = (p) => p.locator(".galeria--carrusel > .tarjeta[data-centro] .tarjeta-nombre").textContent();
  // Quieto: sin data-moviendo (lo pone el carrusel mientras se mueve) y con la
  // tarjeta del centro exactamente al centro.
  const esperarQuieto = (p) => p.waitForFunction(() => {
    const li = document.querySelector(".galeria--carrusel > .tarjeta[data-centro]");
    return li && !document.querySelector("#vista-equipos[data-moviendo]") && !document.getAnimations().length &&
      Math.abs(parseFloat(li.style.getPropertyValue("--distancia"))) < 0.001;
  });

  await caso("carrusel: elegirlo en Mi tienda cambia el sitio; mismas tarjetas, orden, contador y detalle", async () => {
    const p = await nueva(1280, 900);
    await ir(p);
    const ordenCuadricula = await p.locator(".galeria > .tarjeta .tarjeta-nombre").allTextContents();
    await entrarPanel(p, "gestor@demo.co");
    await p.goto(`${BASE}/admin/#/tienda`);
    await p.waitForSelector("#form-tienda");
    assert.equal(await p.isChecked('input[name="vista_equipos"][value="cuadricula"]'), true);
    assert.match(await p.textContent("#vista-carrusel-ayuda"), /con el dedo, las flechas o el teclado/);
    await p.check('input[name="vista_equipos"][value="carrusel"]');
    await p.click("#guardar-tienda");
    await p.waitForSelector("text=Guardado");
    await ir(p);
    const region = p.locator("#vista-equipos");
    assert.equal(await region.getAttribute("aria-roledescription"), "carrusel");
    assert.deepEqual(await p.locator(".galeria--carrusel > .tarjeta .tarjeta-nombre").allTextContents(), ordenCuadricula, "mismas tarjetas y mismo orden");
    assert.deepEqual(await p.locator(".galeria--carrusel > .tarjeta").evaluateAll((els) => els.map((e) => e.getAttribute("aria-label"))), ["1 de 5", "2 de 5", "3 de 5", "4 de 5", "5 de 5"]);
    // Siguen siendo ítems de una lista (sin roles que un <li> no admite).
    assert.deepEqual(await p.locator(".galeria--carrusel > .tarjeta[role]").count(), 0);
    assert.equal(await indicador(p), "1 de 5");
    assert.equal(await p.textContent("#contador"), "6 equipos disponibles");
    // Flechas de 44 px o más, con foco visible.
    for (const sel of [".ce-anterior", ".ce-siguiente"]) {
      const caja = await p.locator(sel).boundingBox();
      assert.ok(caja.width >= 44 && caja.height >= 44, `${sel}: ${caja.width}x${caja.height}`);
    }
    await p.focus(".ce-siguiente");
    await p.keyboard.press("Tab"); await p.keyboard.press("Shift+Tab");
    assert.notEqual(await p.evaluate(() => getComputedStyle(document.activeElement).outlineStyle), "none");
    // Tocar una vecina la trae al centro (no abre el detalle); tocar la del centro abre el detalle.
    const vecina = p.locator(".galeria--carrusel > .tarjeta").nth(1);
    await vecina.locator(".tarjeta-boton").click({ force: true });
    await esperarQuieto(p);
    assert.equal(await indicador(p), "2 de 5");
    assert.equal(await p.evaluate(() => document.querySelector("#hoja-detalle").open), false);
    await p.locator(".galeria--carrusel > .tarjeta[data-centro] .tarjeta-boton").click();
    await p.waitForSelector("#hoja-detalle[open]");
    assert.match(await p.textContent("#hoja-detalle .detalle-nombre"), /iPhone 18 Pro\b/);
    await p.click("#cerrar-detalle");
    // Volver a cuadrícula
    await editarDemo(p, (e) => { e.tienda.vista_equipos = "cuadricula"; });
    await ir(p);
    assert.equal(await p.locator(".galeria--carrusel").count(), 0);
    assert.equal(await p.locator("#vista-equipos").getAttribute("aria-roledescription"), null);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("carrusel: bucle en los dos sentidos con flechas, teclado, mouse, trackpad y dedo", async () => {
    const p = await nueva(1280, 900);
    await ir(p);
    await ponerCarrusel(p);
    await ir(p);
    // Hacia atrás desde la primera: la última (bucle)
    await p.click(".ce-anterior"); await esperarQuieto(p);
    assert.equal(await indicador(p), "5 de 5");
    // Hacia adelante desde la última: la primera
    await p.click(".ce-siguiente"); await esperarQuieto(p);
    assert.equal(await indicador(p), "1 de 5");
    // Cinco adelante dan la vuelta completa
    for (let i = 0; i < 5; i++) { await p.click(".ce-siguiente"); }
    await esperarQuieto(p);
    assert.equal(await indicador(p), "1 de 5");
    // Teclado: ← y → con el foco en la tarjeta del centro (el foco la sigue)
    await p.focus(".galeria--carrusel > .tarjeta[data-centro] .tarjeta-boton");
    await p.keyboard.press("ArrowLeft"); await esperarQuieto(p);
    assert.equal(await indicador(p), "5 de 5");
    assert.equal(await p.evaluate(() => document.activeElement.closest(".tarjeta")?.hasAttribute("data-centro")), true);
    await p.keyboard.press("ArrowRight"); await p.keyboard.press("ArrowRight"); await esperarQuieto(p);
    assert.equal(await indicador(p), "2 de 5");
    // Mouse: arrastrar hacia la izquierda avanza (y no abre el detalle)
    const v = await p.locator(".ce-ventana").boundingBox();
    const y = v.y + v.height / 2;
    await p.mouse.move(v.x + v.width / 2, y);
    await p.mouse.down();
    for (let i = 1; i <= 10; i++) { await p.mouse.move(v.x + v.width / 2 - i * 22, y); await p.waitForTimeout(30); }
    await p.mouse.up();
    await esperarQuieto(p);
    assert.equal(await indicador(p), "3 de 5");
    assert.equal(await p.evaluate(() => document.querySelector("#hoja-detalle").open), false);
    // Trackpad: desplazamiento horizontal
    await p.mouse.move(v.x + v.width / 2, y);
    for (let i = 0; i < 6; i++) { await p.mouse.wheel(-60, 0); await p.waitForTimeout(16); }
    await esperarQuieto(p);
    assert.equal(await indicador(p), "2 de 5", "trackpad");
    assert.deepEqual(p.errores, []);
    await p.context().close();

    // Dedo, en celular: deslizar hacia la izquierda avanza; hacia la derecha retrocede con bucle
    const q = await nueva(390, 844, { hasTouch: true, isMobile: true });
    await ir(q);
    await ponerCarrusel(q);
    await ir(q);
    await q.locator(".ce-ventana").scrollIntoViewIfNeeded();
    const caja = await q.locator(".ce-ventana").boundingBox();
    const cdp = await q.context().newCDPSession(q);
    const deslizar = async (sentido) => {
      const yy = caja.y + caja.height / 2;
      const x0 = caja.x + caja.width / 2;
      await cdp.send("Input.dispatchTouchEvent", { type: "touchStart", touchPoints: [{ x: x0, y: yy }] });
      for (let i = 1; i <= 14; i++) {
        await cdp.send("Input.dispatchTouchEvent", { type: "touchMove", touchPoints: [{ x: x0 + sentido * i * 10, y: yy }] });
        await q.waitForTimeout(20);
      }
      await cdp.send("Input.dispatchTouchEvent", { type: "touchEnd", touchPoints: [] });
      await esperarQuieto(q);
    };
    await deslizar(-1);
    assert.equal(await indicador(q), "2 de 5", "dedo hacia la izquierda");
    await deslizar(1);
    await deslizar(1);
    assert.equal(await indicador(q), "5 de 5");
    assert.deepEqual(q.errores, []);
    await q.context().close();
  });

  await caso("carrusel: 1 tarjeta sin flechas ni bucle; 2 tarjetas sin la misma a los dos lados; el filtro vuelve a la primera", async () => {
    const p = await nueva(1280, 900);
    await ir(p);
    await ponerCarrusel(p);
    await ir(p);
    await p.click(".ce-siguiente"); await p.click(".ce-siguiente"); await esperarQuieto(p);
    assert.equal(await indicador(p), "3 de 5");
    // Filtrar reconstruye y vuelve a la primera
    await p.click(".segmento[data-valor='usado']");
    await esperarQuieto(p);
    assert.equal(await p.locator(".galeria--carrusel > .tarjeta").count(), 2);
    assert.equal(await indicador(p), "1 de 2");
    // Con 2: una sola vecina visible, y nunca la misma tarjeta a los dos lados
    const lados = () => p.evaluate(() => [...document.querySelectorAll(".galeria--carrusel > .tarjeta")]
      .filter((li) => li.style.visibility !== "hidden" && !li.hasAttribute("data-centro"))
      .map((li) => Math.sign(new DOMMatrixReadOnly(getComputedStyle(li).transform).m41 - 0)));
    assert.equal((await lados()).length, 1);
    await p.click(".ce-siguiente"); await esperarQuieto(p);
    assert.equal(await indicador(p), "2 de 2");
    assert.equal((await lados()).length, 1);
    await p.click(".ce-siguiente"); await esperarQuieto(p);
    assert.equal(await indicador(p), "1 de 2");
    // Con 1: sin flechas, sin indicador y sin moverse
    await ir(p, "/?condicion=usado&modelo=iphone-13");
    assert.equal(await p.locator(".galeria--carrusel > .tarjeta").count(), 1);
    assert.equal(await p.isVisible(".ce-anterior"), false);
    assert.equal(await p.isVisible(".ce-siguiente"), false);
    assert.equal(await p.isVisible(".ce-indicador"), false);
    await p.focus(".galeria--carrusel .tarjeta-boton");
    await p.keyboard.press("ArrowRight");
    assert.equal(await p.locator(".galeria--carrusel > .tarjeta[data-centro]").count(), 1);
    // Sin equipos: el estado vacío de siempre
    await ir(p, "/?condicion=usado&modelo=iphone-18-pro");
    assert.equal(await p.isVisible("#vacio"), true);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  for (const ancho of [320, 360, 768, 1440]) {
    await caso(`carrusel: ${ancho}px sin scroll horizontal y con altura estable`, async () => {
      const p = await nueva(ancho, 900);
      await ir(p);
      await ponerCarrusel(p);
      await ir(p);
      const alto = await p.locator("#lista-equipos").evaluate((el) => el.offsetHeight);
      for (let i = 0; i < 3; i++) { await p.click(".ce-siguiente"); await esperarQuieto(p); }
      assert.equal(await p.locator("#lista-equipos").evaluate((el) => el.offsetHeight), alto, "la altura no cambia al moverse");
      const desborde = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
      assert.ok(desborde <= 0, `desborda ${desborde}px`);
      if (ancho === 360 || ancho === 1440) await captura(p, `b2-carrusel-${ancho}`);
      await p.context().close();
    });
  }

  await caso("carrusel con reduced-motion: se mueve sin animaciones", async () => {
    const p = await nueva(390, 844, { reducedMotion: "reduce" });
    await ir(p);
    await ponerCarrusel(p);
    await ir(p);
    await p.click(".ce-siguiente");
    assert.equal(await indicador(p), "2 de 5", "el cambio es directo");
    assert.equal(await p.evaluate(() => document.getAnimations().length), 0);
    await p.context().close();
  });

  // Capturas de diseño (solo con ICT_CAPTURAS): 360 y 1440 px × claro y oscuro
  // × cuadrícula y carrusel × color por defecto y primario amarillo. Van a
  // tests/capturas/diseno/<etapa>-…png (ICT_CAPTURAS_ETAPA, ej. "antes").
  if (CAPTURAS) {
    await caso("capturas de diseño (360 y 1440, claro y oscuro, cuadrícula y carrusel, color por defecto y amarillo)", async () => {
      const etapa = process.env.ICT_CAPTURAS_ETAPA || "actual";
      const dir = path.join(CAPTURAS, "diseno");
      fs.mkdirSync(dir, { recursive: true });
      for (const ancho of [360, 1440]) {
        const p = await nueva(ancho, ancho === 360 ? 800 : 900);
        await ir(p);
        for (const tema of ["claro", "oscuro"]) {
          for (const vista of ["cuadricula", "carrusel"]) {
            for (const [color, primario] of [["defecto", "#1A73E8"], ["amarillo", "#FFD60A"]]) {
              await editarDemo(p, (e, x) => Object.assign(e.tienda, { tema: x[0], vista_equipos: x[1], color_primario: x[2], whatsapp: "573001234567" }), [tema, vista, primario]);
              await ir(p);
              await p.waitForTimeout(700);
              await p.screenshot({ path: path.join(dir, `${etapa}-${ancho}-${tema}-${vista}-${color}.png`), fullPage: true });
            }
          }
          // Detalle abierto (hoja) y pop-up, en cuadrícula y color por defecto
          await editarDemo(p, (e, x) => Object.assign(e.tienda, { tema: x, vista_equipos: "cuadricula", color_primario: "#1A73E8" }), tema);
          await ir(p);
          await p.click(".tarjeta-boton >> nth=0");
          await p.waitForFunction(() => document.querySelector("#hoja-detalle").open && !document.querySelector("#hoja-detalle[data-vt]"));
          await p.waitForTimeout(500);
          await p.screenshot({ path: path.join(dir, `${etapa}-${ancho}-${tema}-detalle.png`) });
          await p.click(ancho === 360 ? ".hoja-barra [data-comprar]" : "#hoja-detalle .detalle-cta [data-comprar]");
          await p.waitForTimeout(700);
          await p.screenshot({ path: path.join(dir, `${etapa}-${ancho}-${tema}-popup.png`) });
          await p.keyboard.press("Escape");
          await p.waitForTimeout(300);
        }
        await p.context().close();
      }
    });
  }

  // ---------------------------------------------------------------- 12.11
  await caso("11. sin marca de Apple: ni manzana, ni imágenes, ni textos de la marca", async () => {
    const archivos = [];
    const recorrer = (d) => {
      for (const f of fs.readdirSync(d, { withFileTypes: true })) {
        if ([".git", "node_modules", "capturas", "tests"].includes(f.name)) continue;
        const r = path.join(d, f.name);
        if (f.isDirectory()) recorrer(r); else archivos.push(r);
      }
    };
    recorrer(RAIZ);
    for (const a of archivos) {
      assert.ok(!/\.(png|jpe?g|gif|webp|avif|ico)$/i.test(a), `imagen en el repo: ${a}`);
      if (!/\.(html|js|css|svg|sql|ts|md)$/.test(a)) continue;
      const t = fs.readFileSync(a, "utf8");
      assert.ok(!t.includes(""), `manzana en ${a}`);
      // "Apple Inc." solo en las frases fijas de los términos (pedido de Jared)
      const sinFrases = t.replace(/No está afiliado, patrocinado ni autorizado por Apple Inc\. iPhone es una marca de Apple Inc\.|Apple e iPhone son marcas de Apple Inc\./g, "");
      assert.ok(!/apple\.com|SF Pro|San Francisco|apple-logo|Apple Inc/i.test(sinFrases.replace(/apple\.com\/co/g, "")), `referencia a Apple en ${a}`);
    }
    const p = await nueva();
    await ir(p);
    const externas = await p.evaluate(() => performance.getEntriesByType("resource").map((r) => new URL(r.name).host).filter((h) => !/localhost|127\.0\.0\.1/.test(h)));
    assert.ok(externas.every((h) => /fonts\.(googleapis|gstatic)\.com/.test(h)), `recursos externos: ${externas}`);
    await p.context().close();
  });

  // ---------------------------------------------------------------- Accesibilidad y reglas
  await caso("a11y: contraste AA del texto visible (claro, oscuro y colores extremos)", async () => {
    const temas = [
      ["claro por defecto", null],
      ["oscuro", { tema: "oscuro" }],
      ["amarillo claro + blanco", { color_primario: "#FFE45C", color_secundario: "#F4F4F4" }],
      ["oscuro con primario oscuro", { tema: "oscuro", color_primario: "#1B1F3B", color_secundario: "#000000" }]
    ];
    for (const [nombre, cambios] of temas) {
      const p = await nueva(390, 844);
      await ir(p);
      if (cambios) { await editarDemo(p, new Function("e", `Object.assign(e.tienda, ${JSON.stringify(cambios)})`)); }
      await ir(p, "/?condicion=nuevo&modelo=iphone-18-pro-max&capacidad=256-gb");
      await p.click(".segmento[data-valor='usado']"); // un botón marcado y otro no
      await p.click(".segmento[data-valor='nuevo']");
      await p.click(".chip[data-valor='256 GB']");
      await p.waitForTimeout(500);
      const malos = await p.evaluate(contrasteMalo);
      assert.deepEqual(malos, [], `${nombre}: ${JSON.stringify(malos.slice(0, 4))}`);
      await p.context().close();
    }
  });

  // Aire entre secciones: el pie, el encabezado (título → filtros) y la zona de
  // equipos, en las dos vistas. Celular: 48 px en el pie, 52 entre el título y
  // los filtros, 40 arriba de los equipos y 56 abajo. Escritorio: 72, 72, 64 y
  // 80. Todo sale de --t-espacio, así que en "compacto" baja al 72 %.
  for (const [ancho, alto, m] of [[360, 800, { pie: 48, gap: 18, titulo: 52, arriba: 40, abajo: 56 }], [1440, 900, { pie: 72, gap: 24, titulo: 72, arriba: 64, abajo: 80 }]]) {
    await caso(`espacios: ${ancho}px, pie, encabezado y zona de equipos (cuadrícula y carrusel, normal y compacto)`, async () => {
      const p = await nueva(ancho, alto);
      await ir(p);
      for (const vista of ["cuadricula", "carrusel"]) {
        for (const [tamano, k] of [["normal", 1], ["compacto", 0.72]]) {
          await editarDemo(p, (e, x) => Object.assign(e.tienda, { vista_equipos: x[0], tamano_texto: x[1], ciudad: "Medellín" }), [vista, tamano]);
          await ir(p);
          const r = await p.evaluate(() => {
            const caja = (s) => document.querySelector(s).getBoundingClientRect();
            const pie = getComputedStyle(document.querySelector(".pie"));
            const equipos = caja("#vista-equipos");
            return {
              pieArriba: parseFloat(pie.paddingTop), pieAbajo: parseFloat(pie.paddingBottom),
              gap: parseFloat(getComputedStyle(document.querySelector(".pie-grilla")).rowGap),
              titulo: caja(".filtros").top - caja(".titulo").bottom,
              arriba: equipos.top - caja(".filtros").bottom,
              abajo: caja("#info-tienda").top - equipos.bottom,
              infoVisible: !document.querySelector("#info-tienda").hidden,
              carrusel: document.querySelector("#vista-equipos").classList.contains("carrusel-equipos"),
            };
          });
          const donde = `${vista} ${tamano}`;
          assert.equal(r.carrusel, vista === "carrusel", `${donde}: vista`);
          assert.ok(r.infoVisible, `${donde}: la información de la tienda se ve`);
          const cerca = (v, esperado, que) => assert.ok(Math.abs(v - esperado) <= 1.5, `${donde}: ${que} = ${v.toFixed(1)} px (se esperaba ${esperado.toFixed(1)})`);
          cerca(r.pieArriba, m.pie * k, "pie arriba");
          cerca(r.pieAbajo, m.pie * k, "pie abajo");
          cerca(r.gap, m.gap * k, "separación entre bloques del pie");
          cerca(r.titulo, m.titulo * k, "título → filtros");
          cerca(r.arriba, m.arriba * k, "filtros → equipos");
          // Abajo: el padding de la zona más el margen de la información de la
          // tienda (en carrusel, debajo del indicador "N de M").
          cerca(r.abajo, m.abajo * k, "equipos → información de la tienda");
          const desborde = await p.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
          assert.ok(desborde <= 0, `${donde}: desborda ${desborde}px`);
        }
      }
      assert.deepEqual(p.errores, []);
      await p.context().close();
    });
  }

  await caso("pie: fondo con el color secundario y texto AA en claro y oscuro, con cualquier color", async () => {
    const p = await nueva(390, 844);
    await ir(p);
    for (const tema of ["claro", "oscuro"]) {
      for (const secundario of ["#0F172A", "#FFFFFF", "#777777", "#FFD60A", "#1A73E8", "#7A7A00"]) {
        await editarDemo(p, (e, x) => Object.assign(e.tienda, { tema: x[0], color_secundario: x[1], nombre: "Tienda Prueba", ciudad: "Medellín", aviso_marca: "iPhone es una marca de su fabricante." }), [tema, secundario]);
        await ir(p);
        const r = await p.evaluate(() => {
          const pie = document.querySelector(".pie");
          const textos = [...pie.querySelectorAll("p, a")].filter((el) => el.textContent.trim() && !el.hidden);
          return { fondo: getComputedStyle(pie).backgroundColor, n: textos.length };
        });
        const esperado = `rgb(${parseInt(secundario.slice(1, 3), 16)}, ${parseInt(secundario.slice(3, 5), 16)}, ${parseInt(secundario.slice(5, 7), 16)})`;
        assert.equal(r.fondo, esperado, `${tema} ${secundario}: fondo del pie`);
        assert.ok(r.n >= 4, "el pie tiene sus textos");
        const malos = (await p.evaluate(contrasteMalo)).filter((m) => /^(P|A)\.pie|pie-/.test(m));
        assert.deepEqual(malos, [], `${tema} ${secundario}`);
      }
    }
    await p.context().close();
  });

  await caso("a11y: textos de 16 px o más y zonas táctiles de 44 px", async () => {
    const p = await nueva(390, 844);
    await ir(p, "/?condicion=nuevo&modelo=iphone-18-pro-max&capacidad=256-gb");
    const revisar = () => p.evaluate(() => {
      const chicos = [];
      const tactiles = [];
      for (const el of document.querySelectorAll("body *")) {
        const st = getComputedStyle(el);
        const r = el.getBoundingClientRect();
        if (!r.width || !r.height || st.visibility === "hidden" || el.closest(".oculto-visual,[hidden]")) continue;
        const propio = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim());
        if (propio && parseFloat(st.fontSize) < 16) chicos.push(`${el.tagName}.${el.className} ${st.fontSize}`);
        if (el.matches("button, a, input:not([type=hidden]), select, [role=option]") && !el.closest("p, li.vacio, .casilla span, label.casilla")) {
          const objetivo = el.matches("input[type=checkbox]") ? el.closest("label") || el : el;
          const rr = objetivo.getBoundingClientRect();
          if (rr.width < 44 || rr.height < 44) tactiles.push(`${el.tagName}.${el.className || el.id} ${Math.round(rr.width)}x${Math.round(rr.height)}`);
        }
      }
      return { chicos, tactiles };
    });
    // Los tres tamaños de texto de la tienda: nada baja de 16 px.
    const medidas = {};
    for (const tamano of ["normal", "compacto", "grande"]) {
      await editarDemo(p, (e, t) => { e.tienda.tamano_texto = t; }, tamano);
      await ir(p, "/?condicion=nuevo&modelo=iphone-18-pro-max&capacidad=256-gb");
      assert.equal(await p.getAttribute("html", "data-tamano"), tamano);
      let r = await revisar();
      assert.deepEqual(r.chicos, [], `sitio (${tamano}): textos chicos`);
      assert.deepEqual(r.tactiles, [], `sitio (${tamano}): zonas táctiles`);
      medidas[tamano] = await p.evaluate(() => ({
        cuerpo: parseFloat(getComputedStyle(document.body).fontSize),
        titulo: parseFloat(getComputedStyle(document.querySelector(".titulo")).fontSize),
        precio: parseFloat(getComputedStyle(document.querySelector("#detalle-en-linea .precio-valor")).fontSize)
      }));
      await p.click("#detalle-en-linea [data-comprar]");
      r = await revisar();
      assert.deepEqual(r.chicos, [], `pop-up (${tamano}): textos chicos`);
      assert.deepEqual(r.tactiles, [], `pop-up (${tamano}): zonas táctiles`);
      await ir(p, "/privacidad/");
      r = await revisar();
      assert.deepEqual(r.chicos, [], `legales (${tamano}): textos chicos`);
    }
    // Compacto: el cuerpo sigue en 16 px y achica títulos y precios.
    assert.equal(medidas.compacto.cuerpo, 16);
    assert.ok(medidas.compacto.titulo < medidas.normal.titulo && medidas.compacto.precio < medidas.normal.precio, JSON.stringify(medidas));
    // Grande: todo el texto ≈ +12 % (16 → 18 px).
    assert.equal(medidas.normal.cuerpo, 16);
    assert.equal(medidas.grande.cuerpo, 18);
    assert.ok(medidas.grande.titulo > medidas.normal.titulo, JSON.stringify(medidas));
    await p.context().close();
  });

  await caso("tamaño del texto: elegirlo en Mi tienda lo cambia en el sitio (el panel no cambia)", async () => {
    const p = await nueva();
    await entrarPanel(p, "gestor@demo.co");
    await p.goto(`${BASE}/admin/#/tienda`);
    await p.waitForSelector("#form-tienda");
    assert.equal(await p.isChecked('input[name="tamano_texto"][value="normal"]'), true);
    await p.check('input[name="tamano_texto"][value="grande"]', { force: true });
    assert.equal(await p.getAttribute("#vista-previa", "data-tamano"), "grande");
    await p.click("#guardar-tienda");
    await p.waitForSelector("text=Guardado");
    assert.equal(await p.evaluate(() => getComputedStyle(document.body).fontSize), "16px", "el panel no cambia de tamaño");
    await ir(p);
    assert.equal(await p.getAttribute("html", "data-tamano"), "grande");
    assert.equal(await p.evaluate(() => getComputedStyle(document.body).fontSize), "18px");
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("a11y: lista de modelos con teclado (flechas, Enter, Escape) y buscador si hay más de 8", async () => {
    const p = await nueva();
    await ir(p);
    await p.focus("#f-modelo-boton");
    await p.keyboard.press("ArrowDown");
    assert.equal(await p.getAttribute("#f-modelo-boton", "aria-expanded"), "true");
    assert.equal(await p.isVisible("#f-modelo-buscar"), false);
    await p.keyboard.press("ArrowDown");
    await p.keyboard.press("Enter");
    assert.equal((await p.textContent("#f-modelo-boton .valor")).trim(), "iPhone 18 Pro");
    assert.equal(await p.evaluate(() => document.activeElement.id), "f-modelo-boton");
    await p.keyboard.press("ArrowDown");
    await p.keyboard.press("Escape");
    assert.equal(await p.getAttribute("#f-modelo-boton", "aria-expanded"), "false");
    // Con más de 8 modelos aparece el buscador
    await editarDemo(p, (e) => {
      const t = new Date().toISOString();
      // 9 modelos más: del iPhone 11 al 13 (el catálogo ahora empieza en el 7)
      e.modelos.filter((m) => /^iphone-1[123]/.test(m.slug)).slice(0, 9).forEach((m, i) => {
        m.activo = true;
        e.equipos.push({ id: `x${i}`, modelo_id: m.id, condicion: "nuevo", capacidad: "128 GB", color_id: e.colores.find((c) => c.modelo_id === m.id)?.id ?? null, color_nombre_mostrar: "", precio: 1000000 + i, en_stock: true, fotos: [], publicado: true, destacado: false, descripcion_extra: "", es_demo: false, bateria_porcentaje: null, estado_estetico: null, detalles: "", incluye: "", creado_en: t, actualizado_en: t });
      });
    });
    await ir(p);
    await p.click("#f-modelo-boton");
    assert.ok(await p.isVisible("#f-modelo-buscar"));
    await p.keyboard.type("12 pro max");
    assert.deepEqual(await p.locator('[role="option"]').evaluateAll((els) => els.map((e) => e.dataset.valor)), ["iphone-12-pro-max"]);
    const grupos = await p.evaluate(() => { document.querySelector("#f-modelo-buscar").value = ""; document.querySelector("#f-modelo-buscar").dispatchEvent(new Event("input")); return [...document.querySelectorAll(".desplegable-grupo")].map((g) => g.textContent); });
    assert.deepEqual(grupos.slice(0, 3), ["Generación 18", "Generación 15", "Generación 13"]);
    await p.context().close();
  });

  await caso("reduced-motion: el sitio se ve completo y funciona sin animaciones", async () => {
    const p = await nueva(390, 844, { reducedMotion: "reduce" });
    await ir(p);
    await p.click(".segmento[data-valor='usado']");
    assert.equal(await p.locator(".galeria > .tarjeta").count(), 2);
    const animadas = await p.evaluate(() => document.getAnimations().filter((a) => a.playState === "running").length);
    assert.equal(animadas, 0);
    await p.click(".tarjeta-boton >> nth=0");
    assert.ok(await p.isVisible("#hoja-detalle .precio-valor"));
    await p.context().close();
  });

  await caso("copy: usted, sin tú/vos ni promesas, sin \"Purchase\" en el píxel", async () => {
    const legal = ["assets/js/legal", "assets/js/legal/paises", "assets/js/legal/plantillas"]
      .flatMap((d) => fs.readdirSync(path.join(RAIZ, d)).filter((f) => f.endsWith(".js")).map((f) => `${d}/${f}`));
    const sitio = ["index.html", "privacidad/index.html", "terminos/index.html", "cookies/index.html", ...legal]
      .concat(fs.readdirSync(path.join(RAIZ, "assets/js/sitio")).map((f) => `assets/js/sitio/${f}`))
      .map((f) => fs.readFileSync(path.join(RAIZ, f), "utf8")).join("\n");
    // Desde B4 los textos están en assets/js/i18n/es.js: las claves del sitio
    // (sitio., popup., cookies., legalpag.) cuentan como sitio y todas, como
    // panel. pt.js no se revisa aquí (portugués con "você", ver tests/i18n.test.mjs).
    const ES = (await import(require("url").pathToFileURL(path.join(RAIZ, "assets/js/i18n/es.js")).href)).default;
    const esSitio = Object.entries(ES).filter(([k]) => /^(sitio|popup|cookies|legalpag)\./.test(k)).map(([, v]) => v).join("\n");
    const esTodo = Object.values(ES).join("\n");
    // Ni borradores ni "revise con un abogado" en lo que ve el cliente
    assert.ok(!/\bborrador\b|\babogad[oa]\b|\ben revisi[oó]n\b|revise con/i.test(sitio.replace(/\/\/.*$/gm, "") + esSitio), "aviso de borrador o de abogado en el sitio");
    const t = ["index.html", "admin/index.html", "privacidad/index.html", "terminos/index.html", "cookies/index.html"]
      .concat(fs.readdirSync(path.join(RAIZ, "assets/js/sitio")).map((f) => `assets/js/sitio/${f}`))
      .concat(fs.readdirSync(path.join(RAIZ, "assets/js/panel")).map((f) => `assets/js/panel/${f}`))
      .map((f) => fs.readFileSync(path.join(RAIZ, f), "utf8")).join("\n") + "\n" + esTodo;
    // El tuteo se revisa también en los textos legales; las promesas, no (los
    // plazos de la ley sí van en ellos).
    const sinComentarios = (t + legal.map((f) => fs.readFileSync(path.join(RAIZ, f), "utf8")).join("\n")).replace(/\/\/.*$/gm, "")
      // Los nombres de las claves de i18n ("panel.pagos.cripto.acepta") no son texto visible.
      .replace(/(["'`])[a-z0-9_]+(?:\.[a-z0-9_]+)+\1/g, '""');
    const tuteo = sinComentarios.match(/\b(tú|vos|tienes|puedes|quieres|tu pedido|tus datos|tu nombre|tu correo|tu whatsapp)\b|(^|[>"'.!?]\s*)(Elige|Escribe|Toca|Revisa|Acepta|Ingresa|Llena)\b/i);
    assert.ok(!tuteo, `aparece tuteo o voseo: ${tuteo?.[0]}`);
    assert.ok(!/envío gratis|garantía de 12 meses|respondemos en/i.test(t), "promesa no cargada por la tienda");
    assert.ok(!/["']Purchase["']/.test(fs.readFileSync(path.join(RAIZ, "assets/js/sitio/pixel.js"), "utf8")), "dispara Purchase");
  });

  await caso("píxel: PageView, ViewContent y Lead con eventID y sin datos personales (con publicidad aceptada)", async () => {
    const p = await nueva(390, 844, { cookies: { medicion: false, publicidad: true } });
    await p.route("https://connect.facebook.net/**", (r) => r.fulfill({ contentType: "text/javascript", body: "" }));
    await ir(p);
    await p.click(".tarjeta-boton >> nth=0");
    await p.click(".hoja-barra [data-comprar]");
    await llenarPopup(p);
    await p.click("[data-enviar]");
    await p.waitForSelector("text=Su pedido está listo");
    const cola = await p.evaluate(() => window.fbq.queue.map((a) => JSON.parse(JSON.stringify([...a]))));
    const eventos = cola.filter((a) => a[0] === "track").map((a) => a[1]);
    assert.deepEqual(eventos, ["PageView", "ViewContent", "Lead"]);
    const lead = cola.find((a) => a[1] === "Lead");
    assert.equal(lead[2].currency, "COP");
    assert.equal(lead[2].value, 6000000);
    assert.match(lead[3].eventID, /^COT-/);
    assert.ok(!/Juan|juan@|3001234567/.test(JSON.stringify(cola)), "datos personales en el píxel");
    await p.context().close();
  });

  await caso("formatos: $ con punto de miles (demo de Colombia), fecha D/M/AAAA, código sin O/0/I/1", async () => {
    const pf = await nueva();
    await ir(pf);
    const r = await pf.evaluate(async () => {
      const u = await import(new URL("assets/js/utils.js", location.href).href);
      const codigos = Array.from({ length: 3000 }, () => u.generarCodigo());
      return {
        cop: [u.formatearPrecio(5299000), u.formatearPrecio(1000), u.formatearPrecio(999)],
        fecha: u.fechaCorta("2026-03-05T04:59:00Z"),
        malos: codigos.filter((c) => /[O0I1]/.test(c.slice(4)) || !/^COT-[A-Z2-9]{4}$/.test(c)).length
      };
    });
    assert.deepEqual(r.cop, ["$5.299.000", "$1.000", "$999"]);
    assert.equal(r.fecha, "4/3/2026");
    assert.equal(r.malos, 0);
  });

  await navegador.close();
  console.log(fallas ? `\n${fallas} de ${corridos} con fallas` : `\nOK: ${corridos} casos`);
  process.exit(fallas ? 1 : 0);
})();

// Se ejecuta en la página: texto visible con contraste menor a 4,5:1
// (3:1 si es grande). El fondo se busca subiendo hasta uno opaco.
function contrasteMalo() {
  // "rgb(r, g, b[, a])" o "color(srgb r g b[ / a])" (lo que da color-mix), en 0–255.
  const rgb = (c) => {
    const m = c.match(/[\d.]+/g);
    if (!m) return [0, 0, 0, 0];
    const v = m.map(Number);
    return /^color\(srgb/.test(c) ? [v[0] * 255, v[1] * 255, v[2] * 255, v[3] ?? 1] : v;
  };
  const lum = ([r, g, b]) => { const f = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4; }; return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b); };
  const mezclar = (a, b) => { const al = a[3] ?? 1; return [0, 1, 2].map((i) => a[i] * al + b[i] * (1 - al)); };
  function fondo(el) {
    const capas = [];
    for (let n = el; n; n = n.parentElement) {
      const st = getComputedStyle(n);
      if (st.backgroundImage !== "none" && !n.matches(".encabezado, body, html")) return null; // degradado: no se mide
      const c = rgb(st.backgroundColor);
      if ((c[3] ?? 1) > 0) { capas.push(c); if ((c[3] ?? 1) >= 1) break; }
      if (n.tagName === "DIALOG" && n.open) break;
    }
    let base = [255, 255, 255];
    for (const c of capas.reverse()) base = mezclar(c, base);
    return base;
  }
  const malos = [];
  for (const el of document.querySelectorAll("body *")) {
    if (![...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim())) continue;
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    if (!r.width || st.visibility === "hidden" || +st.opacity === 0 || el.closest(".oculto-visual, [hidden], [aria-hidden=true]")) continue;
    if (el.closest("dialog:not([open])")) continue;
    const bg = fondo(el);
    if (!bg) continue;
    const fg = mezclar(rgb(st.color), bg);
    const [a, b] = [lum(fg), lum(bg)].sort((x, y) => y - x);
    const ratio = (a + 0.05) / (b + 0.05);
    const grande = parseFloat(st.fontSize) >= 24 || (parseFloat(st.fontSize) >= 18.66 && +st.fontWeight >= 700);
    if (ratio < (grande ? 3 : 4.5)) malos.push(`${el.tagName}.${el.className}: ${ratio.toFixed(2)} "${el.textContent.trim().slice(0, 30)}"`);
  }
  return malos;
}
