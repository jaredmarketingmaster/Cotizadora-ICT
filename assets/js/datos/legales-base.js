// =============================================================================
// Textos legales base (0015_legales.sql tiene los mismos; tests/sql/probar.sh
// revisa que coincidan). Son un borrador para que lo revise un abogado: el
// panel lo avisa y "Lo que falta" lo recuerda hasta que se marque "Un abogado
// ya revisó estos textos".
// - {{nombre}}, {{ciudad}}, {{direccion}}, {{correo}} y {{herramientas}} se
//   reemplazan por los datos de Mi tienda y Legales (prepararLegal, comun.js).
// - [PENDIENTE: …] marca lo que debe confirmar el abogado o completar la
//   tienda. El sitio nunca lo muestra: lo quita y avisa "Texto en revisión.".
// Solo se cargan donde el texto estaba vacío.
// =============================================================================

export const PRIVACIDAD_BASE = "## Quién es responsable de sus datos\n\nEl responsable de los datos personales que usted deja en este sitio es la tienda:\n\n- Nombre: {{nombre}}\n- Razón social y NIT: [PENDIENTE: razón social y NIT]\n- Ciudad: {{ciudad}}\n- Dirección: {{direccion}}\n- Correo: {{correo}}\n\n## Qué datos recogemos\n\nCuando usted pide una cotización en el formulario:\n\n- Su nombre, su correo y su número de WhatsApp.\n- El equipo que cotizó: modelo, condición (nuevo o usado), capacidad, color y precio.\n- El código de la cotización.\n\nAdemás, de forma automática:\n\n- De dónde llegó al sitio: los parámetros del anuncio (UTM), el identificador del anuncio (ad_id) y el identificador de clic de Facebook (fbclid). Se guardan en su navegador mientras dura la visita y se envían con su cotización.\n- Datos técnicos de su navegador y de su dispositivo que usa el píxel de Meta para medir los anuncios. El píxel puede guardar sus propias cookies en su navegador (por ejemplo, _fbp y _fbc).\n\nEn su navegador también se guardan los colores y el tamaño de letra del sitio, para mostrarlo igual en su próxima visita. Eso no es un dato personal.\n\n## Para qué los usamos\n\nSolo para fines comerciales y de mercadeo:\n\n- Atender su cotización.\n- Contactarlo por WhatsApp.\n- Hacer el seguimiento comercial de su compra.\n- Medir cómo funcionan nuestros anuncios.\n\n## Con quién los compartimos\n\nPara atenderlo usamos estas herramientas, que tratan los datos por cuenta nuestra:\n\n{{herramientas}}\n\n## Cuánto tiempo los guardamos\n\n- En el CRM guardamos sus datos máximo 2 meses, o hasta que la compra se complete o se pierda, lo que pase primero.\n- Excepciones: [PENDIENTE: confirmar con el abogado si alguna norma obliga a guardar datos por más tiempo]\n\n## Sus derechos\n\nSegún la Ley 1581 de 2012, usted puede:\n\n- Conocer los datos que tenemos de usted.\n- Actualizarlos y rectificarlos.\n- Pedir que los suprimamos.\n- Revocar la autorización que nos dio.\n\nPara hacerlo, escríbanos con su nombre, su número de WhatsApp y lo que necesita:\n\n- Correo: {{correo}}\n- Plazos de respuesta: [PENDIENTE: confirmar con el abogado]\n\n## Cambios a esta política\n\nLa versión vigente es la que aparece en esta página.";

export const TERMINOS_BASE = "## Qué es este sitio\n\nEste sitio muestra los equipos que vende {{nombre}} y sus precios, para que usted los cotice y los compre por WhatsApp. En el sitio no se paga ni se cierra la compra: la compra se acuerda por WhatsApp con la tienda.\n\n## Precios y disponibilidad\n\n- Los precios están en pesos colombianos. Al pie de la página aparece la fecha de su última actualización.\n- El precio y la disponibilidad de cada equipo se confirman por WhatsApp antes de la compra.\n- Cuando un equipo no tiene foto, se muestra un dibujo genérico.\n\n## Equipos usados\n\nLa batería, el estado y los detalles de cada equipo usado son los que la tienda informa en el sitio.\n\n## Garantía, entrega y formas de pago\n\nSon las que aparecen en el detalle de cada equipo.\n\n- Cambios, devoluciones y garantía legal: [PENDIENTE: confirmar con el abogado]\n\n## Datos personales\n\nLos datos que usted deja en el formulario se tratan según la política de privacidad.\n\n## Marcas\n\nLas marcas y los nombres de productos que aparecen en el sitio pertenecen a sus dueños.\n\n## Ley aplicable\n\n- [PENDIENTE: confirmar con el abogado la ley y la jurisdicción aplicables]\n\n## Contacto\n\n- Correo: {{correo}}\n- Dirección: {{direccion}}\n- Ciudad: {{ciudad}}";

export const AUTORIZACION_BASE = "Autorizo a {{nombre}} a tratar mis datos personales (nombre, correo y WhatsApp) para atender mi cotización, contactarme por WhatsApp y hacer el seguimiento comercial, según su política de privacidad.";

export const HERRAMIENTAS_BASE = [
  "GoHighLevel: el CRM donde quedan su cotización y el seguimiento.",
  "Píxel de Meta y API de Conversiones de Meta: miden los anuncios.",
  "WhatsApp: el canal por el que lo contactamos.",
  "El proveedor del sitio y de la base de datos.",
  "Marketing Masters Group, como encargado del tratamiento."
];
