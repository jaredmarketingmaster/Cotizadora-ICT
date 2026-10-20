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
  try { await fn(); console.log(`ok   ${nombre}`); } catch (e) { fallas++; console.log(`FALLA ${nombre}\n     ${String(e.message).split("\n").slice(0, 3).join("\n     ")}`); }
}

async function nueva(ancho = 1280, alto = 900, opciones = {}) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: alto }, ...opciones });
  const p = await ctx.newPage();
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

async function ir(p, ruta = "/") {
  await p.goto(BASE + ruta, { waitUntil: "networkidle" });
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
    const oliva = fila.locator('li:has-text("Oliva")');
    assert.equal(await oliva.locator(".muestra-color--vacia").count(), 1);
    await oliva.locator("input[data-hex]").fill("5a5d3c");
    await oliva.locator("input[data-hex]").press("Enter");
    assert.match(await oliva.locator(".error-campo").textContent(), /#RRGGBB/);
    await oliva.locator("input[data-hex]").fill("#5a5d3c");
    await oliva.locator("input[data-hex]").press("Enter");
    await p.waitForFunction(() => [...document.querySelectorAll("[data-color]")].some((li) => li.textContent.includes("Oliva") && li.querySelector(".muestra-color")?.style.background));
    assert.equal(await p.evaluate((clave) => JSON.parse(localStorage.getItem(clave)).colores.find((c) => c.nombre_es === "Oliva").hex, CLAVE_DEMO), "#5A5D3C");
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
    const p = await nueva(390, 844);
    await p.route("**/config.js", async (r) => {
      const cuerpo = fs.readFileSync(path.join(RAIZ, "config.js"), "utf8").replace('metaPixelId: ""', 'metaPixelId: "123456789012345"');
      await r.fulfill({ contentType: "text/javascript", body: cuerpo });
    });
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

  await caso("más vendido: hasta 3 en la lista y en el formulario; el cuarto se rechaza; no se ve en el sitio", async () => {
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
    // Todavía no se muestra en el sitio.
    await ir(p);
    assert.ok(!/más vendido/i.test(await p.textContent("body")));
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

  await caso("demo: los datos guardados de una versión vieja se migran (stock, tamaño, catálogo, colores y roles)", async () => {
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
      e.perfiles[0].rol = "agencia"; e.perfiles[0].correo = "agencia@demo.co";
      e.perfiles[1].rol = "tienda"; e.perfiles[1].correo = "tienda@demo.co";
      e.version = 1;
    });
    await ir(p);
    const e = await p.evaluate((clave) => JSON.parse(localStorage.getItem(clave)), CLAVE_DEMO);
    assert.equal(e.version >= 5, true);
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

  await caso("panel: validaciones (precio, batería, WhatsApp de la tienda, color)", async () => {
    const p = await nueva(390, 844);
    await entrarPanel(p, "gestor@demo.co");
    await p.goto(`${BASE}/admin/#/tienda`);
    await p.waitForSelector("#form-tienda");
    await p.fill("#whatsapp", "3001234567");
    await p.fill("#color_primario", "azul");
    await p.click("#guardar-tienda");
    assert.equal(await p.textContent("#whatsapp-error"), "Debe tener 12 dígitos y empezar por 57. Ej. 573001234567.");
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
      for (const ruta of ["/", "/privacidad/", "/terminos/"]) {
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
      for (const [correo, rutas] of [["gestor@demo.co", ["inicio", "inventario", "inventario/nuevo", "tienda", "fichas", "catalogo", "legales"]], ["administrador@demo.co", ["usuarios"]]]) {
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
    await p.keyboard.press("Escape");
    await p.waitForTimeout(200);
    assert.equal(await p.evaluate(() => document.querySelector("#hoja-detalle").open), false);
    await p.context().close();
  });

  await caso("10. carrusel táctil en celular (gesto de deslizar) y cierre de la hoja con el gesto", async () => {
    const p = await nueva(390, 844, { hasTouch: true, isMobile: true });
    await ir(p);
    await p.tap(".tarjeta-boton >> nth=0");
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
      assert.ok(!/apple\.com|SF Pro|San Francisco|apple-logo|Apple Inc/i.test(t.replace(/apple\.com\/co/g, "")), `referencia a Apple en ${a}`);
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
    const t = ["index.html", "admin/index.html", "privacidad/index.html", "terminos/index.html"]
      .concat(fs.readdirSync(path.join(RAIZ, "assets/js/sitio")).map((f) => `assets/js/sitio/${f}`))
      .concat(fs.readdirSync(path.join(RAIZ, "assets/js/panel")).map((f) => `assets/js/panel/${f}`))
      .map((f) => fs.readFileSync(path.join(RAIZ, f), "utf8")).join("\n");
    const sinComentarios = t.replace(/\/\/.*$/gm, "");
    const tuteo = sinComentarios.match(/\b(tú|vos|tienes|puedes|quieres|tu pedido|tus datos|tu nombre|tu correo|tu whatsapp)\b|(^|[>"'.!?]\s*)(Elige|Escribe|Toca|Revisa|Acepta|Ingresa|Llena)\b/i);
    assert.ok(!tuteo, `aparece tuteo o voseo: ${tuteo?.[0]}`);
    assert.ok(!/envío gratis|garantía de 12 meses|respondemos en/i.test(t), "promesa no cargada por la tienda");
    assert.ok(!/["']Purchase["']/.test(fs.readFileSync(path.join(RAIZ, "assets/js/sitio/pixel.js"), "utf8")), "dispara Purchase");
  });

  await caso("píxel: PageView, ViewContent y Lead con eventID y sin datos personales", async () => {
    const p = await nueva(390, 844);
    await p.route("**/config.js", async (r) => {
      const cuerpo = fs.readFileSync(path.join(RAIZ, "config.js"), "utf8").replace('metaPixelId: ""', 'metaPixelId: "123456789012345"');
      await r.fulfill({ contentType: "text/javascript", body: cuerpo });
    });
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

  await caso("formatos: $ con punto de miles, fecha D/M/AAAA, código sin O/0/I/1", async () => {
    const pf = await nueva();
    await ir(pf);
    const r = await pf.evaluate(async () => {
      const u = await import(new URL("assets/js/utils.js", location.href).href);
      const codigos = Array.from({ length: 3000 }, () => u.generarCodigo());
      return {
        cop: [u.formatearCOP(5299000), u.formatearCOP(1000), u.formatearCOP(999)],
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
  const rgb = (c) => { const m = c.match(/[\d.]+/g); return m ? m.map(Number) : [0, 0, 0, 0]; };
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
