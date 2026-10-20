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

  await caso("sitio: carga los datos públicos con la RPC", async () => {
    const p = await pagina();
    await p.goto(`${BASE}/`, { waitUntil: "networkidle" });
    assert.equal(await p.textContent("#contador"), "6 equipos disponibles");
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
    const fila = p.locator('.modelo-fila:has(input[value="iPhone 18 Pro"])');
    await fila.locator(".colores-modelo > summary").click();
    await fila.locator('li:has-text("Visón") input[data-hex]').fill("#8B7765");
    await fila.locator('li:has-text("Visón") input[data-hex]').press("Enter");
    await p.waitForSelector("#aviso-flotante.visible");
    const r = await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const a = await api();
      const colores = await a.listarColores();
      const vison = colores.find((c) => c.nombre_es === "Visón");
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

  await caso("panel: agregar un equipo con foto (Storage simulado) y verlo en el sitio", async () => {
    const p = await pagina(390);
    await entrar(p, "gestor@local.co");
    await p.goto(`${BASE}/admin/#/inventario/nuevo`);
    await p.selectOption("#e-modelo", { label: "iPhone 17 Pro (inactivo)" });
    await p.click("#siguiente");
    await p.check('input[name="e-condicion"][value="nuevo"]', { force: true }); await p.click("#siguiente");
    await p.check('input[name="e-capacidad"][value="1 TB"]', { force: true }); await p.click("#siguiente");
    // El 17 Pro no tiene colores en la fuente: se guarda sin color y con un nombre a mostrar.
    assert.match(await p.textContent("#opciones-color"), /no tiene colores cargados/);
    await p.fill("#e-color-mostrar", "Prueba"); await p.click("#siguiente");
    await p.fill("#e-precio", "9000000"); await p.click("#siguiente");
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
    assert.match(await s.textContent("#detalle-en-linea .detalle-variante"), /1 TB · Prueba/);
    const src = await s.getAttribute("#detalle-en-linea .diapositiva img", "src");
    assert.match(src, /\/storage\/v1\/object\/public\/fotos\/equipos\//);
    const r = await s.request.get(src);
    assert.equal(r.status(), 200);
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
    // El administrador solo ve Usuarios, y el servidor le niega lo demás.
    assert.deepEqual(await p.locator(".navegacion a:visible").allTextContents(), ["Usuarios"]);
    const negado = await p.evaluate(async () => {
      const { api } = await import(new URL("../assets/js/datos/api.js", location.href).href);
      const a = await api();
      try { await a.guardarTienda({ nombre: "x" }); return "guardó"; } catch (e) { return e.message; }
    });
    assert.notEqual(negado, "guardó");
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
    const fila = '.usuario-fila:has-text("invitado@local.co")';
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

  await navegador.close();
  console.log(fallas ? `\n${fallas} falla(s)` : "\nOK: modo supabase de punta a punta");
  process.exit(fallas ? 1 : 0);
})();
