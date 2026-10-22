// Prepara el demo en el Chrome que va a medir Lighthouse (tests/lighthouse/medir.sh):
// legales publicados con la tienda de prueba, WhatsApp (globo de ayuda), modo
// demo según el argumento y sin elección de cookies (banner). Con
// ICT_LH_IDIOMA=pt, la tienda y el idioma guardado quedan en portugués (mide
// el primer pintado de una visita que vuelve a una tienda en portugués).
//   node preparar.cjs <puerto de depuración> <modo demo: true|false> <url>
const { chromium } = require("playwright");

(async () => {
  const [puerto, demo, url = "http://localhost:8090/"] = process.argv.slice(2);
  const b = await chromium.connectOverCDP(`http://127.0.0.1:${puerto}`);
  const p = await b.contexts()[0].newPage();
  await p.goto(url, { waitUntil: "networkidle" });
  await p.waitForFunction(() => localStorage.getItem("cotizadora-demo:v1"));
  await p.evaluate(async ([demo, base, idioma]) => {
    const { publicar } = await import(new URL("assets/js/legal/motor.js", base).href);
    const { TIENDA_LEGAL_PRUEBA } = await import(new URL("tests/legal/datos-prueba.mjs", base).href);
    const e = JSON.parse(localStorage.getItem("cotizadora-demo:v1"));
    const legales = Object.entries(TIENDA_LEGAL_PRUEBA).filter(([k]) => /^(legal_|meta_pixel_id|capi_|plataforma_|envio_)/.test(k));
    Object.assign(e.tienda, Object.fromEntries(legales), { envio_retiro: false, whatsapp: "573001234567", modo_demo: demo === "true" });
    e.tienda.legal_publicado = publicar(e.tienda, null, "2026-10-22");
    if (idioma) { e.tienda.idioma = idioma; localStorage.setItem("cotizadora:idioma", idioma); }
    localStorage.setItem("cotizadora-demo:v1", JSON.stringify(e));
    localStorage.removeItem("cotizadora:cookies");
  }, [demo, url, process.env.ICT_LH_IDIOMA || ""]);
  await p.close();
  await b.close();
})();
