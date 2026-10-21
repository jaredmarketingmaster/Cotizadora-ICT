// =============================================================================
// Módulo legal de Colombia. Todo lo que dice sale de legal/FUENTES.md (leyes,
// autoridad, plazos, retracto, garantía, horarios y documentos). Las
// plantillas lo usan a través de motor.js; para sumar un país se copia este
// archivo con los datos del otro país y se agrega una fila en indice.js.
// =============================================================================

const SIC = "Superintendencia de Industria y Comercio (SIC)";
const SITIO_SIC = "https://www.sic.gov.co";

export const CO = {
  codigo: "co",
  nombre: "Colombia",
  autoridad: { nombre: SIC, corto: "SIC", sitio: SITIO_SIC },

  // Tipos de documento de identificación (paso 2). El número se guarda sin
  // puntos ni espacios; el NIT lleva su dígito de verificación.
  documentos: [
    { clave: "cc", nombre: "Cédula de ciudadanía", corto: "C.C.", patron: /^\d{6,10}$/, ejemplo: "1020304050" },
    { clave: "nit", nombre: "NIT", corto: "NIT", patron: /^\d{6,10}-\d$/, ejemplo: "900123456-7" },
    { clave: "ce", nombre: "Cédula de extranjería", corto: "C.E.", patron: /^[0-9A-Z]{4,12}$/, ejemplo: "1234567" }
  ],

  // FUENTES 1, 2 y 11: Ley 1581 de 2012 (arts. 8, 14 y 15) y Decreto 1377 de 2013.
  datos: {
    leyes: "la Ley 1581 de 2012 y el Decreto 1377 de 2013 (compilado en el Decreto 1074 de 2015)",
    consulta: { dias: 10, prorroga: 5 },
    reclamo: { dias: 15, prorroga: 8, completar: 5 },
    derechos: [
      "Conocer, actualizar y rectificar sus datos.",
      "Pedir prueba de la autorización que nos dio.",
      "Ser informado, si lo pide, del uso que les damos a sus datos.",
      "Presentar quejas ante la Superintendencia de Industria y Comercio.",
      "Revocar la autorización o pedir que suprimamos sus datos.",
      "Acceder gratis a sus datos."
    ],
    // FUENTE 3: transmisión a encargados con contrato de transmisión.
    transmision: "el Decreto 1074 de 2015 (artículo 2.2.2.25.5.2)",
    // FUENTE 4: Estados Unidos (Circular 005 de 2017) y Argentina (declarada
    // adecuada por la Comisión Europea, que la lista de la SIC incluye).
    paisesAdecuados: ["Argentina", "Estados Unidos"],
    // FUENTE 10
    rnbd: "solo están obligadas las sociedades y entidades sin ánimo de lucro con activos de más de 100.000 UVT y las personas jurídicas públicas"
  },

  // FUENTES 7, 8 y 9: Ley 1480 de 2011 (Estatuto del Consumidor).
  consumo: {
    ley: "la Ley 1480 de 2011 (Estatuto del Consumidor)",
    leyNumero: "Ley 1480 de 2011",
    // FUENTES 7 y 12: Ley 2439 de 2024 (art. 3, que modifica el art. 47) y
    // sentencia C-192 de 2026.
    retracto: { diasHabiles: 5, devolucionDias: 15 },
    // FUENTE 13: sin plazo pactado, entrega en máximo 30 días calendario.
    entregaMaxDias: 30,
    garantiaNuevosMinMeses: 12,
    garantiaReclamoDias: 15
  },

  // FUENTE 6: Ley 2300 de 2023 (para la guía de GHL y las promociones).
  horariosPromociones: {
    ley: "la Ley 2300 de 2023",
    texto: "de lunes a viernes de 7:00 a 19:00 y los sábados de 8:00 a 15:00; nunca los domingos ni los festivos"
  },

  homologacion: "homologados y con el IMEI registrado según la regulación de Colombia",
  moneda: "pesos colombianos",

  // Secciones propias del país en cada documento (ctx: ver motor.js).
  privacidad: {
    derechos: () => [
      "Según la Ley 1581 de 2012 (artículo 8), usted puede:",
      "",
      ...CO.datos.derechos.map((d) => `- ${d}`)
    ],
    ejercerlos: (ctx) => [
      `Escríbanos a ${ctx.responsable.correo}, con su nombre, su número de WhatsApp y lo que necesita.`,
      "",
      `- **Consultas:** le respondemos en máximo ${CO.datos.consulta.dias} días hábiles. Si no alcanzamos, le avisamos el motivo y le respondemos en máximo ${CO.datos.consulta.prorroga} días hábiles más.`,
      `- **Reclamos** (corregir, actualizar o suprimir datos, o revocar la autorización): le respondemos en máximo ${CO.datos.reclamo.dias} días hábiles. Si no alcanzamos, le avisamos el motivo y le respondemos en máximo ${CO.datos.reclamo.prorroga} días hábiles más.`,
      `- Si a su reclamo le falta información, se la pedimos dentro de los ${CO.datos.reclamo.completar} días siguientes para que lo complete.`,
      `- Si no queda conforme, puede presentar una queja ante la ${SIC}: [${SITIO_SIC.replace("https://", "")}](${SITIO_SIC}).`
    ],
    transmision: () => [
      `Esto es una transmisión de datos a encargados: ellos los tratan por cuenta nuestra y siguiendo nuestras instrucciones. Nuestro proveedor tecnológico (Argentina) y HighLevel (Estados Unidos) están en países con un nivel adecuado de protección de datos según la lista de la SIC. Además, hacemos la transmisión con un contrato de transmisión de datos, como lo permite ${CO.datos.transmision}.`
    ],
    seccion: (ctx) => [
      `En Colombia, el tratamiento de sus datos se rige por ${CO.datos.leyes}. La autoridad es la ${SIC}: [${SITIO_SIC.replace("https://", "")}](${SITIO_SIC}).`,
      ...(ctx.venta.rnbd === "si"
        ? ["", "Estamos obligados a inscribir nuestras bases de datos en el Registro Nacional de Bases de Datos de la SIC."]
        : ctx.venta.rnbd === "no"
          ? ["", `No estamos obligados a inscribirnos en el Registro Nacional de Bases de Datos: ${CO.datos.rnbd}.`]
          : [])
    ]
  },

  terminos: {
    garantia: (ctx) => {
      const v = ctx.venta;
      const nuevos = v.garantiaNuevos === 12 ? "12 meses (un año)" : `${v.garantiaNuevos} meses`;
      return [
        `- **Equipos nuevos:** ${nuevos} desde la entrega.`,
        v.garantiaUsados === "con"
          ? `- **Equipos usados:** ${v.garantiaUsadosMeses} ${v.garantiaUsadosMeses === 1 ? "mes" : "meses"} desde la entrega.`
          : "- **Equipos usados:** se venden sin garantía. Solo podemos vender sin garantía un usado cuya garantía legal ya venció; se lo informamos antes de la compra y usted debe aceptarlo por escrito.",
        `- Si un equipo falla dentro de la garantía, escríbanos. Le respondemos el reclamo en máximo ${CO.consumo.garantiaReclamoDias} días hábiles.`
      ];
    },
    retracto: (ctx) => [
      `Como la compra se hace a distancia, usted puede retractarse dentro de los ${CO.consumo.retracto.diasHabiles} días hábiles siguientes a la entrega del equipo, según el artículo 47 de la ${CO.consumo.leyNumero}.`,
      "",
      `- **Cómo pedirlo:** ${ctx.venta.retractoCanal}.`,
      `- **Devolución del dinero:** sin descuentos ni retenciones, en máximo ${CO.consumo.retracto.devolucionDias} días calendario, según la Ley 2439 de 2024.`,
      "- **Medio de la devolución:** al mismo medio de pago que usted usó o por el medio que acordemos con usted. Le informamos las opciones disponibles."
    ],
    // ctx.venta.plazoEntrega: { desde, hasta } en días hábiles (pestaña
    // Envíos), o null. Sin plazo, va el máximo legal.
    entrega: (ctx) => (ctx.venta.plazoEntrega
      ? []
      : [`Si no acordamos otro plazo con usted, entregamos el pedido en máximo ${CO.consumo.entregaMaxDias} días calendario, contados desde el día siguiente a su pedido, según la Ley 2439 de 2024. Si no lo entregamos a tiempo, usted puede terminar la compra y le devolvemos el dinero sin descuentos ni retenciones en máximo ${CO.consumo.retracto.devolucionDias} días calendario.`]),
    leyAplicable: () => [
      `Las ventas a personas en Colombia se rigen por las leyes de Colombia, en especial ${CO.consumo.ley}. La autoridad de protección al consumidor es la ${SIC}: [${SITIO_SIC.replace("https://", "")}](${SITIO_SIC}).`
    ]
  }
};

export default CO;
