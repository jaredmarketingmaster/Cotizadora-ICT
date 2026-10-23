// Pruebas del motor legal (assets/js/legal/), sin navegador:
//   node tests/legal/motor.test.mjs
import assert from "node:assert/strict";
import { faltantes, generar, publicar, conVigencia, contexto, PERFILES } from "../../assets/js/legal/motor.js";
import { PAISES, PAISES_DISPONIBLES, CODIGOS_PAISES } from "../../assets/js/legal/paises/indice.js";
import { CODIGOS_PAISES_SQL, LEGAL_INICIAL, errorLegales } from "../../assets/js/datos/comun.js";
import { formatoBasico } from "../../assets/js/utils.js";
import { TIENDA_LEGAL_PRUEBA } from "./datos-prueba.mjs";

let casos = 0;
const caso = (nombre, fn) => { fn(); casos++; console.log(`ok   ${nombre}`); };
const base = () => structuredClone(TIENDA_LEGAL_PRUEBA);
// Texto visible de un documento (lo que ve el cliente, sin etiquetas).
const visible = (md) => formatoBasico(md).replace(/<[^>]+>/g, " ").replace(/&amp;/g, "&").replace(/\s+/g, " ");
const claves = (t) => faltantes(t).map((f) => f.campo);

caso("una tienda completa no tiene faltantes; una vacía tiene uno por cada dato, con su paso", () => {
  assert.deepEqual(faltantes(base()), []);
  const f = faltantes({ legal_paises: [], legal_impuestos: [] });
  const pasos = new Set(f.map((x) => x.paso));
  for (const p of [0, 1, 2, 3, 4, 5]) assert.ok(pasos.has(p), `paso ${p}`);
  assert.throws(() => generar({}), /Faltan datos/);
});

caso("los campos obligatorios cambian con el perfil y el tipo de persona", () => {
  const t = base();
  t.legal_tipo_persona = "juridica";
  assert.deepEqual(claves(t).sort(), ["legal_matricula_camara", "legal_matricula_numero", "legal_representante"]);
  const e = base();
  e.legal_perfil = "emprendedor";
  e.legal_direccion_local = "";
  assert.deepEqual(claves(e), [], "sin local físico no pide la dirección del local");
  e.legal_perfil = "no_oficial";
  assert.deepEqual(claves(e), ["legal_direccion_local"]);
  const o = base();
  o.legal_perfil = "oficial";
  assert.deepEqual(claves(o), ["legal_apple_detalle"], "oficial o autorizado: el detalle es obligatorio");
});

caso("validaciones: garantía de 12 meses o más con Colombia, IVA con porcentaje, documento e IDs con formato", () => {
  const t = base();
  t.legal_garantia_nuevos = 6;
  assert.ok(claves(t).includes("legal_garantia_nuevos"));
  t.legal_garantia_nuevos = 12;
  t.legal_impuestos = [{ nombre: "IVA", porcentaje: null, incluido: true }];
  assert.deepEqual(claves(t), ["legal_impuestos.0.porcentaje"]);
  t.legal_impuestos = [{ nombre: "IVA", porcentaje: 19, incluido: null }];
  assert.deepEqual(claves(t), ["legal_impuestos.0.incluido"]);
  const d = base();
  d.legal_doc_tipo = "nit";
  d.legal_doc_numero = "900123456";
  assert.deepEqual(claves(d), ["legal_doc_numero"], "el NIT lleva dígito de verificación");
  const h = base();
  h.ga4_activo = true; h.ga4_id = "UA-123";
  h.clarity_activo = true; h.clarity_id = "abc123def4";
  h.meta_pixel_id = "12a";
  assert.deepEqual(claves(h).sort(), ["ga4_id", "meta_pixel_id"]);
  const u = base();
  u.legal_garantia_usados = "con"; u.legal_garantia_usados_meses = null;
  assert.deepEqual(claves(u), ["legal_garantia_usados_meses"]);
  const w = base();
  w.legal_retracto_canal = "whatsapp"; w.whatsapp = "";
  assert.deepEqual(claves(w), ["whatsapp"]);
});

caso("países: Colombia y Argentina están disponibles; Brasil necesita portugués", () => {
  assert.deepEqual(CODIGOS_PAISES_SQL, CODIGOS_PAISES, "la lista del check de 0016 (comun.js) es la del índice");
  assert.deepEqual(PAISES_DISPONIBLES, ["ar", "co"]);
  assert.equal(PAISES.find((p) => p.codigo === "br").estado, "portugues");
  assert.equal(PAISES.length, 19);
  const t = base();
  t.legal_paises = ["co", "mx"];
  assert.ok(claves(t).includes("legal_paises"));
});

caso("los documentos llevan los datos de la tienda y los plazos exactos, sin corchetes ni marcadores vacíos", () => {
  const d = generar(base());
  const p = visible(d.privacidad);
  for (const x of ["Celulares La 70 S.A.S.", "NIT 900123456-7", "Calle 70 # 45-10, Medellín", "datos@lasetenta.co", "+57 300 123 4567",
    "Ley 1581 de 2012", "Decreto 1377 de 2013", "Decreto 1074 de 2015", "máximo 10 días hábiles", "máximo 5 días hábiles más",
    "máximo 15 días hábiles", "máximo 8 días hábiles más", "dentro de los 5 días siguientes", "www.sic.gov.co",
    "Nuestro proveedor tecnológico, ubicado en Argentina", "HighLevel (GoHighLevel), en Estados Unidos",
    "Pedir prueba de la autorización", "Presentar quejas ante la Superintendencia de Industria y Comercio", "Acceder gratis a sus datos",
    "máximo 2 meses desde el último contacto", "normas contables, tributarias y de protección al consumidor",
    "mayores de 18 años", "No le pedimos datos sensibles", "cifrados (hash)", "fbc", "fbp"]) assert.ok(p.includes(x), `privacidad: ${x}`);
  const t = visible(d.terminos);
  for (const x of ["5 días hábiles siguientes a la entrega", "artículo 47 de la Ley 1480 de 2011", "pesos colombianos", "sin descuentos ni retenciones, en máximo 15 días calendario",
    "12 meses (un año) desde la entrega", "en máximo 15 días hábiles", "IVA (19 %)", "está incluido en el precio publicado",
    "Ley 1480 de 2011", "Retiro en el local", "Medellín y su área metropolitana", "No vende los equipos ni responde por la compraventa",
    "Apple e iPhone son marcas de Apple Inc.", "Las fotos de los equipos son de la tienda", "mayor de 18 años",
    "se acuerda y se confirma por WhatsApp"]) assert.ok(t.includes(x), `términos: ${x}`);
  const todos = Object.values(d).map(visible).join(" ");
  assert.ok(!/[[\]{}]|undefined|null|NaN|\(\s*\)|:\s*\./.test(todos), "sin corchetes, llaves ni datos vacíos");
  assert.ok(!/\bborrador\b|\babogad[oa]\b|\ben revisi[oó]n\b|\[PENDIENTE/i.test(todos), "sin avisos de borrador ni de abogado");
  const a = visible(d.aviso);
  assert.ok(a.includes("Celulares La 70") && a.includes("Ver la Política de privacidad") && a.length < 420, "aviso corto");
});

caso("A1: la devolución del retracto dice su plazo, su ley y el medio de pago", () => {
  const t = visible(generar(base()).terminos);
  assert.ok(t.includes("en máximo 15 días calendario, según la Ley 2439 de 2024"), "plazo de la devolución con su ley");
  assert.ok(t.includes("al mismo medio de pago que usted usó o por el medio que acordemos con usted. Le informamos las opciones disponibles."), "medio de la devolución");
});

caso("Colombia (0030 y FUENTES 8, 9, 14 y 15): usados con garantía de 3 meses o más; plazos de la garantía, transporte de la devolución y reversión del pago", () => {
  const u = base();
  u.legal_garantia_usados = "con";
  u.legal_garantia_usados_meses = 2;
  assert.deepEqual(claves(u), ["legal_garantia_usados_meses"], "con Colombia, 2 meses no alcanza");
  u.legal_garantia_usados_meses = 3;
  assert.deepEqual(claves(u), [], "3 meses sí");
  const t = visible(generar(u).terminos);
  for (const x of ["Equipos usados: 3 meses desde la entrega.",
    "Le respondemos el reclamo en máximo 15 días hábiles, según el artículo 58 de la Ley 1480 de 2011.",
    "Reparación: en máximo 30 días hábiles (60 si le prestamos un equipo mientras tanto).",
    "le cambiamos el equipo en máximo 10 días hábiles o le devolvemos el dinero en máximo 15 días hábiles.",
    "Devolución del equipo: el transporte y los demás costos de la devolución los paga usted, según el mismo artículo 47.",
    "Reversión del pago Si pagó con tarjeta de crédito o débito, PSE, un link de pago", "según el artículo 51 de la Ley 1480 de 2011",
    "Plazo: 5 días hábiles desde que supo del fraude o de la compra que no hizo, o desde que debió recibir el equipo.",
    "y, en el mismo plazo, pídasela también a la entidad que emitió su medio de pago"]) assert.ok(t.includes(x), `términos: ${x}`);
});

caso("A2: sin plazo de entrega, los términos dicen el máximo legal de 30 días calendario", () => {
  const t = visible(generar(base()).terminos);
  assert.ok(t.includes("Si no acordamos otro plazo con usted, entregamos el pedido en máximo 30 días calendario, contados desde el día siguiente a su pedido, según la Ley 2439 de 2024."));
  assert.ok(t.includes("usted puede terminar la compra y le devolvemos el dinero sin descuentos ni retenciones en máximo 15 días calendario"));
});

caso("A3: el proveedor (Argentina) y HighLevel (Estados Unidos) van a países adecuados según la SIC, además del contrato", () => {
  const p = visible(generar(base()).privacidad);
  assert.ok(p.includes("Nuestro proveedor tecnológico (Argentina) y HighLevel (Estados Unidos) están en países con un nivel adecuado de protección de datos según la lista de la SIC."));
  assert.ok(p.includes("Además, hacemos la transmisión con un contrato de transmisión de datos, como lo permite el Decreto 1074 de 2015"));
});

caso("la relación con Apple sigue al perfil", () => {
  const t = base();
  const indep = "es un comercio independiente. No está afiliado, patrocinado ni autorizado por Apple Inc. iPhone es una marca de Apple Inc.";
  for (const p of PERFILES) {
    const x = base();
    x.legal_perfil = p.clave;
    x.legal_apple_detalle = p.apple ? "Somos revendedor autorizado de Apple según el contrato 123." : "";
    if (!p.local) x.legal_direccion_local = "";
    const term = visible(generar(x).terminos);
    assert.equal(term.includes(indep), !p.apple, p.clave);
    assert.equal(term.includes("declara, bajo su responsabilidad, que esta información es cierta"), p.apple, p.clave);
  }
  assert.ok(visible(generar(t).terminos).includes(`La 70 ${indep}`));
});

caso("herramientas: las activas aparecen y las inactivas no; la regla de la API de Conversiones cambia el texto", () => {
  const t = base();
  let c = visible(generar(t).cookies);
  assert.ok(c.includes("Píxel de Meta") && c.includes("_fbp"));
  for (const x of ["Google Analytics 4", "Microsoft Clarity", "TikTok", "Google Ads", "Tag Manager"]) assert.ok(!c.includes(x), x);
  Object.assign(t, { ga4_activo: true, ga4_id: "G-ABC123XYZ9", clarity_activo: true, clarity_id: "abc123def4", tiktok_activo: true, tiktok_id: "C1A2B3C4D5E6F7G8H9I0", gads_activo: true, gads_id: "AW-123456789", gtm_activo: true, gtm_id: "GTM-ABC1234" });
  const d = generar(t);
  c = visible(d.cookies);
  for (const x of ["Google Analytics 4", "_ga (2 años)", "Microsoft Clarity", "_clck", "Píxel de TikTok", "_ttp (13 meses desde su último uso)", "Google Ads", "_gcl_au (90 días)", "Google Tag Manager"]) assert.ok(c.includes(x), x);
  assert.ok(visible(d.privacidad).includes("Microsoft Corporation"));
  assert.ok(visible(d.privacidad).includes("Solo enviamos ese evento si usted aceptó las cookies de publicidad."));
  t.capi_solo_consentimiento = false;
  assert.ok(visible(generar(t).privacidad).includes("aunque usted no haya aceptado las cookies de publicidad"));
  assert.ok(formatoBasico(d.cookies).includes("<table>"), "una tabla por herramienta");
});

caso("versión: sube solo si cambia un texto; la vigencia va al pie", () => {
  const t = base();
  const v1 = publicar(t, null, "2026-10-21");
  assert.equal(v1.version, 1);
  assert.equal(publicar(t, v1, "2026-11-01"), v1, "sin cambios, la misma versión");
  t.legal_garantia_nuevos = 24;
  const v2 = publicar(t, v1, "2026-11-01");
  assert.deepEqual([v2.version, v2.vigente_desde], [2, "2026-11-01"]);
  assert.match(conVigencia(v2, "terminos"), /Vigente desde 1\/11\/2026 · versión 2\.$/);
  t.legal_clausula_terminos = "Los equipos se entregan con su caja original.";
  const v3 = publicar(t, v2, "2026-11-02");
  assert.ok(visible(v3.documentos.terminos).includes("Condiciones adicionales de la tienda Los equipos se entregan con su caja original."));
});

caso("el contexto no deja pasar formato de la tienda a los textos", () => {
  const t = base();
  t.envio_zonas = ["[Medellín] **todo**"];
  assert.deepEqual(contexto(t).venta.envio.domicilio.zonas, ["Medellín todo"]);
});

caso("los valores iniciales se pueden guardar y los checks de 0016 rechazan lo que no corresponde", () => {
  assert.equal(errorLegales(LEGAL_INICIAL), "");
  assert.equal(errorLegales({ ...LEGAL_INICIAL, ...base() }), "");
  for (const malo of [{ legal_perfil: "otro" }, { legal_paises: ["us"] }, { legal_garantia_nuevos: 0 },
    { ga4_activo: "si" }, { legal_clausula_terminos: "x".repeat(4001) }, { legal_publicado: [] }, { legal_paso: 7 }]) {
    assert.notEqual(errorLegales({ ...LEGAL_INICIAL, ...malo }), "", JSON.stringify(malo).slice(0, 60));
  }
});

caso("B3: si el país de la tienda no tiene módulo legal, falta en el paso 3 y no se genera", () => {
  for (const [pais, nombre] of [["cl", "Chile"], ["br", "Brasil"], ["mx", "México"]]) {
    const t = { ...base(), pais };
    const f = faltantes(t).filter((x) => x.campo === "pais");
    assert.deepEqual(f, [{ paso: 3, campo: "pais", texto: `Los textos legales para ${nombre} todavía no están disponibles.` }]);
    assert.throws(() => generar(t), /Faltan datos/);
  }
  assert.ok(!claves(base()).includes("pais"), "Colombia tiene módulo");
  assert.ok(claves({ ...base(), pais: undefined }).includes("pais"), "sin país también falta");
});

// Argentina (0031 y legal/FUENTES.md, AR1 a AR16).
const baseAr = () => ({
  ...base(), pais: "ar", legal_paises: ["ar"], legal_doc_tipo: "cuit", legal_doc_numero: "20-30123456-3",
  legal_telefono: "+5491123456789", whatsapp: "5491123456789", legal_garantia_nuevos: 6, legal_garantia_usados: "con", legal_garantia_usados_meses: 3,
  envio_plazo_desde: 1, envio_plazo_hasta: 3, legal_rnbd_numero: "12345678", legal_data_fiscal_url: "https://servicios1.afip.gob.ar/clavefiscal/qr/response.aspx?qr=prueba"
});

caso("Argentina: faltantes propios (CUIT, garantías, plazo de entrega, RNBD y Data Fiscal) y documentos con sus fuentes", () => {
  assert.deepEqual(claves(baseAr()), []);
  const c = baseAr(); c.legal_doc_numero = "20-30123456-4";
  assert.deepEqual(claves(c), ["legal_doc_numero"], "CUIT con dígito verificador");
  const d = baseAr(); d.legal_doc_tipo = "dni"; d.legal_doc_numero = "30123456";
  assert.deepEqual(claves(d), []);
  const g = baseAr(); g.legal_garantia_nuevos = 5; g.legal_garantia_usados = "sin";
  assert.deepEqual(claves(g).sort(), ["legal_garantia_nuevos", "legal_garantia_usados"], "6 meses los nuevos; los usados con garantía");
  const e = baseAr(); e.envio_plazo_desde = null; e.envio_plazo_hasta = null; e.legal_rnbd_numero = " "; e.legal_data_fiscal_url = "afip.gob.ar";
  assert.deepEqual(claves(e).sort(), ["envio_plazo", "legal_data_fiscal_url", "legal_rnbd_numero"]);
  const n = baseAr(); n.legal_doc_tipo = "nit";
  assert.deepEqual(claves(n), ["legal_doc_tipo"], "solo los documentos de Argentina");
  const docs = generar(baseAr());
  const p = visible(docs.privacidad);
  for (const x of ["CUIT 20-30123456-3", "+54 9 11 2345 6789", "Ley 25.326", "máximo 10 días corridos (artículo 14", "máximo 5 días hábiles (artículo 16",
    "consentimiento expreso en una casilla aparte", "con el número 12345678",
    "LA AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales."
  ]) assert.ok(p.includes(x), `privacidad: ${x}`);
  const t = visible(docs.terminos);
  for (const x of ["pesos argentinos", "Equipos nuevos: 6 meses desde la entrega.", "Equipos usados: 3 meses desde la entrega.",
    "dentro de los 10 días corridos desde que recibe el equipo o desde la compra, lo que ocurra último", "artículo 34 de la Ley 24.240",
    "botón de arrepentimiento", "los gastos de la devolución los pagamos nosotros", "RAMATEL del ENACOM",
    "Defensa de las y los consumidores. Para reclamos ingrese aquí"]) assert.ok(t.includes(x), `términos: ${x}`);
  assert.ok(!t.includes("Reversión del pago") && !t.includes("Superintendencia"), "nada de Colombia");
  assert.ok(!t.includes("dentro de las 24 horas"), "con plazo de Envíos, sin texto de respaldo");
  // Colombia y Argentina juntas: las secciones de los dos y el mínimo mayor (12 meses).
  const ambas = { ...baseAr(), legal_paises: ["co", "ar"], legal_garantia_nuevos: 6 };
  assert.deepEqual(claves(ambas), ["legal_garantia_nuevos"]);
  ambas.legal_garantia_nuevos = 12;
  const pa = visible(generar(ambas).privacidad);
  assert.ok(pa.includes("Ley 1581 de 2012") && pa.includes("Ley 25.326"));
});

caso("C2: los términos arman la entrega desde Envíos; con plazo, sin el máximo legal; sin ninguna forma de entrega, falta", () => {
  const t = visible(generar(base()).terminos);
  for (const x of ["Retiro en el local: Carrera 70 # 44-20, local 3, Medellín, Lunes a sábado de 9 a. m. a 7 p. m.",
    "Envío a domicilio: a Medellín y su área metropolitana.", "Costo del envío: $15.000."]) assert.ok(t.includes(x), x);
  const conPlazo = { ...base(), envio_plazo_desde: 2, envio_plazo_hasta: 4, envio_costo: "zona", envio_costo_fijo: null,
    envio_costos_zona: { "Medellín y su área metropolitana": 0 }, envio_gratis: false };
  const c = visible(generar(conPlazo).terminos);
  assert.ok(c.includes("Plazo de entrega: de 2 a 4 días hábiles."));
  assert.ok(c.includes("Costo del envío a Medellín y su área metropolitana: gratis."));
  assert.ok(!c.includes("Si no acordamos otro plazo con usted"), "con plazo, no va el máximo legal");
  const sinEnvios = { ...base(), envio_retiro: false, envio_domicilio: false, envio_zonas: [], envio_costo: "", envio_costo_fijo: null };
  assert.deepEqual(faltantes(sinEnvios).map((f) => [f.paso, f.campo]), [[4, "envio"]]);
  assert.deepEqual(faltantes({ ...base(), direccion: "" }).map((f) => [f.paso, f.campo]), [[0, "direccion"]], "retiro sin dirección");
  assert.deepEqual(claves({ ...base(), envio_costo: "" }), ["envio_costo"]);
});

const { tiendaNueva, camposDeEjemplo, CAMPOS_EJEMPLO } = await import("../../assets/js/datos/ejemplo.js");
const { LEGAL_PUBLICADO_EJEMPLO } = await import("../../assets/js/datos/legales-ejemplo.js");
const { publicadoEjemplo } = await import("./ejemplo.mjs");
caso("tienda de ejemplo (0037): Argentina completa, sin faltantes, y legales-ejemplo.js es lo que da el motor", () => {
  const t = tiendaNueva(null);
  assert.equal(t.pais, "ar");
  assert.deepEqual(faltantes(t), []);
  assert.deepEqual(publicadoEjemplo(), LEGAL_PUBLICADO_EJEMPLO, "volver a generar con: node tests/legal/ejemplo.mjs js");
  assert.deepEqual(camposDeEjemplo(t), CAMPOS_EJEMPLO);
  // Cambiar un dato lo saca de la lista; los documentos dicen los datos de ejemplo.
  assert.deepEqual(camposDeEjemplo({ ...t, whatsapp: "5491123456789" }), CAMPOS_EJEMPLO.filter((k) => k !== "whatsapp"));
  assert.match(LEGAL_PUBLICADO_EJEMPLO.documentos.privacidad, /Nombre y apellido de ejemplo/);
});

console.log(`\nOK: ${casos} casos del motor legal`);
