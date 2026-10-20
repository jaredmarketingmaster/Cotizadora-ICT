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
const assert = require("assert/strict");

const BASE = process.env.ICT_BASE || "http://localhost:8080";
const ENTORNO = Object.fromEntries(fs.readFileSync(process.env.ICT_ENTORNO || "/tmp/cotizadora-supabase-local/entorno", "utf8")
  .trim().split("\n").map((l) => l.split(/=(.*)/s).slice(0, 2)));
const CONFIG = `export const CONFIG = {
  backend: "supabase",
  supabase: { url: "${ENTORNO.URL}", anonKey: "${ENTORNO.ANON}" },
  metaPixelId: "",
  ghlSeguimiento: { src: "", id: "" }
};`;

let navegador;
let fallas = 0;
async function caso(nombre, fn) {
  try { await fn(); console.log(`ok   ${nombre}`); } catch (e) { fallas++; console.log(`FALLA ${nombre}\n     ${e.message.split("\n")[0]}`); }
}

async function pagina(ancho = 1280) {
  const ctx = await navegador.newContext({ viewport: { width: ancho, height: 900 } });
  await ctx.route("**/config.js", (r) => r.fulfill({ contentType: "text/javascript", body: CONFIG }));
  if (process.env.ICT_SUPABASE_JS) {
    await ctx.route("https://cdn.jsdelivr.net/npm/@supabase/supabase-js@*/+esm", (r) =>
      r.fulfill({ contentType: "text/javascript", headers: { "access-control-allow-origin": "*" }, body: fs.readFileSync(process.env.ICT_SUPABASE_JS, "utf8") }));
  }
  const p = await ctx.newPage();
  p.errores = [];
  p.on("pageerror", (e) => p.errores.push(e.message));
  p.on("console", (m) => { if (m.type() === "error" && !/Failed to load resource/.test(m.text())) p.errores.push(m.text()); });
  return p;
}

async function entrar(p, correo) {
  await p.goto(`${BASE}/admin/`);
  await p.fill("#l-correo", correo);
  await p.fill("#l-clave", "clave-de-prueba-1");
  await p.click("#form-login [type=submit]");
  // Entra a la sección del enlace (o a Inicio si no había ninguna).
  try {
    await p.waitForSelector("#app:not([hidden]) #vista h1", { timeout: 15000 });
  } catch (e) {
    const estado = await p.evaluate(() => ({ hash: location.hash, acceso: document.querySelector("#acceso").innerText.trim().slice(0, 160), vista: document.querySelector("#vista").innerText.trim().slice(0, 160) }));
    throw new Error(`no entró al panel: ${JSON.stringify(estado)}`);
  }
}

(async () => {
  const args = [];
  if (process.env.HTTPS_PROXY) args.push(`--proxy-server=${process.env.HTTPS_PROXY}`, "--proxy-bypass-list=127.0.0.1;localhost");
  navegador = await chromium.launch({ args });

  await caso("sitio: carga los datos públicos con la RPC", async () => {
    const p = await pagina();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    assert.equal(await p.textContent("#contador"), "10 equipos disponibles");
    assert.equal(await p.locator(".galeria > .tarjeta").count(), 5);
    assert.ok(await p.isVisible("#franja-demo"));
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
    await p.check("#p-autorizacion");
    await p.click("[data-enviar]");
    await p.waitForSelector("text=Su pedido está listo", { timeout: 15000 });
    const lead = JSON.parse(fs.readFileSync(ENTORNO.LEAD, "utf8"));
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

  await caso("panel: sin sesión pide login; la tienda no ve Usuarios ni renombra", async () => {
    const p = await pagina(390);
    await p.goto(`${BASE}/admin/#/inventario`);
    await p.waitForSelector("#form-login");
    await entrar(p, "tienda@local.co");
    assert.equal(await p.isVisible('[data-ruta="usuarios"]'), false);
    await p.goto(`${BASE}/admin/#/catalogo`);
    await p.waitForSelector(".modelo-fila");
    assert.equal(await p.locator("[data-renombrar]").count(), 0);
    await p.goto(`${BASE}/admin/#/usuarios`);
    await p.waitForSelector(".estadisticas");
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("panel → sitio: cambiar un precio lo cambia en el sitio y actualiza la fecha", async () => {
    const p = await pagina(1280);
    await entrar(p, "tienda@local.co");
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

  await caso("panel: agregar un equipo con foto (Storage simulado) y verlo en el sitio", async () => {
    const p = await pagina(390);
    await entrar(p, "tienda@local.co");
    await p.goto(`${BASE}/admin/#/inventario/nuevo`);
    await p.selectOption("#e-modelo", { label: "iPhone 17 Pro (inactivo)" });
    await p.click("#siguiente");
    await p.check('input[name="e-condicion"][value="nuevo"]', { force: true }); await p.click("#siguiente");
    await p.check('input[name="e-capacidad"][value="1 TB"]', { force: true }); await p.click("#siguiente");
    await p.fill("#e-color-nombre", "Prueba"); await p.fill("#e-color-hex", "#334455"); await p.click("#siguiente");
    await p.fill("#e-precio", "9000000"); await p.fill("#e-stock", "2"); await p.click("#siguiente");
    const png = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==", "base64");
    await p.setInputFiles("#e-fotos", { name: "a.png", mimeType: "image/png", buffer: png });
    await p.waitForSelector(".foto-item", { timeout: 15000 });
    await p.click("#siguiente");
    await p.check("#e-publicado");
    await p.click("#guardar");
    await p.waitForURL(/#\/inventario$/, { timeout: 15000 });
    const s = await p.context().newPage();
    await s.goto(`${BASE}/?condicion=nuevo&modelo=iphone-17-pro&capacidad=1-tb`, { waitUntil: "networkidle" });
    assert.match(await s.textContent("#detalle-en-linea .precio-valor"), /\$9\.000\.000/);
    const src = await s.getAttribute("#detalle-en-linea .diapositiva img", "src");
    assert.match(src, /\/storage\/v1\/object\/public\/fotos\/equipos\//);
    const r = await s.request.get(src);
    assert.equal(r.status(), 200);
    assert.deepEqual(p.errores, []);
    await p.context().close();
  });

  await caso("agencia: borrar los datos de demostración quita la franja y DEMO del sitio", async () => {
    const p = await pagina(1280);
    await entrar(p, "agencia@local.co");
    await p.waitForSelector(".estadisticas");
    assert.ok(await p.isVisible('[data-ruta="usuarios"]'));
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

  await navegador.close();
  console.log(fallas ? `\n${fallas} falla(s)` : "\nOK: modo supabase de punta a punta");
  process.exit(fallas ? 1 : 0);
})();
