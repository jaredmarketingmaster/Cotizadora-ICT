// =============================================================================
// Plantilla: Política de tratamiento de datos personales (/privacidad/).
// Cada sección es { titulo, lineas }; motor.js las numera y agrega la cláusula
// propia y la vigencia. Lo propio de cada país sale de su módulo (paises/).
// =============================================================================

const PROVEEDOR = "Nuestro proveedor tecnológico, ubicado en Argentina";
const CRM = "HighLevel (GoHighLevel), en Estados Unidos";

export function secciones(ctx) {
  const r = ctx.responsable;
  const opcionales = ctx.herramientas.filter((h) => !h.siempre);
  const mismaPlataforma = /highlevel|gohighlevel/i.test(ctx.plataforma);
  return [
    {
      titulo: "Quién es responsable de sus datos",
      lineas: [
        `${ctx.tienda} es responsable del tratamiento de los datos personales que usted deja en este sitio.`,
        "",
        `- **${r.juridica ? "Razón social" : "Nombre"}:** ${r.nombre}`,
        `- **Documento:** ${r.documento}`,
        `- **Dirección:** ${r.direccion}, ${r.ciudad}`,
        `- **Correo para temas de datos personales:** ${r.correo}`,
        `- **Teléfono:** ${r.telefono}`
      ]
    },
    {
      titulo: "Qué datos recogemos",
      lineas: [
        "Cuando usted pide una cotización en el formulario:",
        "",
        "- Su nombre, su correo y su número de WhatsApp.",
        "- El equipo que cotizó: modelo, condición (nuevo o usado), capacidad, color y precio.",
        "- El código de la cotización.",
        "",
        "Además, de forma automática:",
        "",
        "- El origen del anuncio que lo trajo al sitio: los parámetros UTM, el identificador del anuncio (ad_id) y el identificador de clic de Facebook (fbclid).",
        `- Los datos técnicos de navegación de las cookies que usted acepte. Ver la [Política de cookies](${ctx.rutas.cookies}).`,
        "",
        "No le pedimos datos sensibles (como su salud, su origen o sus opiniones) ni datos de niños."
      ]
    },
    {
      titulo: "Para qué usamos sus datos",
      lineas: [
        "Con la casilla del formulario, usted nos autoriza a usar sus datos para:",
        "",
        "- Atender su cotización y contactarlo sobre ella por WhatsApp y por correo.",
        "- Hacer el seguimiento comercial de esa compra.",
        "- Medir qué anuncios generan ventas.",
        "",
        "No los usamos para enviarle promociones."
      ]
    },
    {
      titulo: "Quiénes tratan sus datos por cuenta nuestra",
      lineas: [
        "Para atenderlo, estos encargados tratan sus datos por cuenta nuestra:",
        "",
        `- **${PROVEEDOR}:** provee la plataforma de esta cotizadora.`,
        mismaPlataforma
          ? `- **${CRM}:** la plataforma de este sitio y el CRM donde quedan su cotización y su seguimiento. Desde el CRM se envían los correos automáticos sobre su compra.`
          : `- **${ctx.plataforma}:** la plataforma de este sitio.\n- **${CRM}:** el CRM donde quedan su cotización y su seguimiento. Desde el CRM se envían los correos automáticos sobre su compra.`,
        "- **Meta Platforms:** el píxel de Meta, la API de Conversiones y WhatsApp, por donde sigue la conversación.",
        ...opcionales.map((h) => `- **${h.proveedor}:** ${h.nombre}. ${h.para}`),
        "",
        ...ctx.paises.flatMap((p) => p.privacidad.transmision(ctx))
      ]
    },
    {
      titulo: "API de Conversiones de Meta",
      lineas: [
        "Cuando usted pide una cotización, el CRM puede enviar a Meta un evento con su correo, su teléfono y su nombre cifrados (hash), y con los identificadores de clic (fbc) y de navegador (fbp). Meta los usa para saber qué anuncio llevó a la cotización o a la venta, y así medir los anuncios.",
        "",
        ctx.capiSoloConsentimiento
          ? "Solo enviamos ese evento si usted aceptó las cookies de publicidad."
          : "Enviamos ese evento aunque usted no haya aceptado las cookies de publicidad, porque sirve para medir qué anuncios generan ventas, una de las finalidades que usted autoriza con la casilla obligatoria."
      ]
    },
    {
      titulo: "Cuánto tiempo guardamos sus datos",
      lineas: [
        "- Si no compra: como máximo 2 meses desde el último contacto. Después los borramos o los anonimizamos.",
        "- Si compra: el tiempo que exijan las normas contables, tributarias y de protección al consumidor."
      ]
    },
    { titulo: "Sus derechos", lineas: ctx.paises.flatMap((p) => p.privacidad.derechos(ctx)) },
    { titulo: "Cómo ejercer sus derechos", lineas: ctx.paises.flatMap((p) => p.privacidad.ejercerlos(ctx)) },
    {
      titulo: "Mayoría de edad",
      lineas: ["Este sitio es solo para mayores de 18 años. No recogemos a sabiendas datos de menores de 18 años. Si nos enteramos de que recibimos datos de un menor, los borramos."]
    },
    {
      titulo: "Seguridad",
      lineas: ["Tomamos medidas razonables para proteger sus datos, como el acceso con usuario y contraseña a las herramientas donde se guardan. Ningún sistema en internet es completamente seguro."]
    },
    {
      titulo: "Cambios en esta política",
      lineas: ["Si cambiamos esta política, publicamos la versión nueva en esta página con su fecha de vigencia, que aparece al final."]
    },
    ...ctx.paises.map((p) => ({ titulo: p.nombre, lineas: p.privacidad.seccion(ctx) }))
  ];
}
