// =============================================================================
// Módulo legal de Argentina (punto 6 de la investigación con Gemini, aprobado
// por Jared el 23/10/2026). Todo lo que dice sale de legal/FUENTES.md, sección
// Argentina (AR1 a AR16). Misma forma que co.js.
// =============================================================================

const AAIP = "Agencia de Acceso a la Información Pública (AAIP)";
const SITIO_AAIP = "https://www.argentina.gob.ar/aaip";
// AR11: el enlace de reclamos con su leyenda (Resolución SCI 271/2020).
const RECLAMOS = "https://www.argentina.gob.ar/iniciar-un-reclamo-ante-defensa-de-las-y-los-consumidores";
const LEYENDA_RECLAMOS = "Defensa de las y los consumidores. Para reclamos ingrese aquí";
// AR7: leyenda textual de la Resolución AAIP 14/2018, Anexo II.
const LEYENDA_AAIP = "LA AGENCIA DE ACCESO A LA INFORMACIÓN PÚBLICA, en su carácter de Órgano de Control de la Ley N° 25.326, tiene la atribución de atender las denuncias y reclamos que interpongan quienes resulten afectados en sus derechos por incumplimiento de las normas vigentes en materia de protección de datos personales.";

// AR15: CUIT con dígito verificador módulo 11 (pesos 5, 4, 3, 2, 7, 6, 5, 4, 3, 2).
// Lo mismo hace cuit_valido() del SQL (0031).
export function cuitValido(numero) {
  const m = /^(20|23|24|27|30|33|34)-(\d{8})-(\d)$/.exec(String(numero || ""));
  if (!m) return false;
  const d = (m[1] + m[2]).split("").map(Number);
  const suma = [5, 4, 3, 2, 7, 6, 5, 4, 3, 2].reduce((s, p, i) => s + p * d[i], 0);
  const v = 11 - (suma % 11);
  const verificador = v === 11 ? 0 : v;
  return verificador !== 10 && verificador === Number(m[3]);
}

export const AR = {
  codigo: "ar",
  nombre: "Argentina",
  autoridad: { nombre: AAIP, corto: "AAIP", sitio: SITIO_AAIP },

  // AR15. El número se guarda sin puntos; el CUIT, con sus guiones.
  documentos: [
    { clave: "dni", nombre: "DNI", corto: "DNI", patron: /^\d{7,8}$/, ejemplo: "30123456" },
    { clave: "cuit", nombre: "CUIT", corto: "CUIT", patron: /^(20|23|24|27|30|33|34)-\d{8}-\d$/, valido: cuitValido, ejemplo: "20-30123456-3" }
  ],

  // AR5 a AR9: Ley 25.326.
  datos: {
    leyes: "la Ley 25.326 de Protección de los Datos Personales",
    acceso: { diasCorridos: 10 },
    rectificacion: { diasHabiles: 5 },
    derechos: [
      "Acceder a sus datos.",
      "Pedir que los rectifiquemos, actualicemos o suprimamos.",
      "Presentar denuncias y reclamos ante la Agencia de Acceso a la Información Pública."
    ],
    leyendaAaip: LEYENDA_AAIP
  },

  // AR1 a AR3: Ley 24.240 y Código Civil y Comercial.
  consumo: {
    ley: "la Ley 24.240 de Defensa del Consumidor y el Código Civil y Comercial de la Nación",
    arrepentimiento: { diasCorridos: 10 },
    garantiaNuevosMinMeses: 6,
    garantiaUsadosMinMeses: 3,
    // AR2: un usado no se vende "sin garantía" (0031 y faltantes() lo exigen).
    usadosSinGarantia: false,
    // AR3: sin plazo pactado son 24 horas; con Argentina el plazo de Envíos es obligatorio.
    plazoEntregaObligatorio: true
  },

  // AR11: lo que el sitio muestra (paises.js). AR12 (botón de arrepentimiento)
  // se quitó en 0041 por decisión de Jared.
  reclamos: { url: RECLAMOS, leyenda: LEYENDA_RECLAMOS },

  homologacion: "inscriptos en el RAMATEL del ENACOM y con un IMEI que no figura en la Base Negativa, según la Resolución ENACOM 2459/2016",
  moneda: "pesos argentinos",

  privacidad: {
    derechos: () => [
      "Según la Ley 25.326, usted puede:",
      "",
      ...AR.datos.derechos.map((d) => `- ${d}`)
    ],
    ejercerlos: (ctx) => [
      `Escríbanos a ${ctx.responsable.correo}, con su nombre, su número de WhatsApp y lo que necesita.`,
      "",
      `- **Acceso:** le respondemos en máximo ${AR.datos.acceso.diasCorridos} días corridos (artículo 14 de la Ley 25.326).`,
      `- **Rectificación, actualización o supresión:** la hacemos en máximo ${AR.datos.rectificacion.diasHabiles} días hábiles (artículo 16 de la Ley 25.326).`
    ],
    // AR9: HighLevel está en Estados Unidos; decisión: consentimiento expreso
    // nombrado en la única casilla del pop-up (desde el 28/10/2026; antes, en
    // una casilla aparte).
    transmision: () => [
      "HighLevel está en Estados Unidos. Para enviarle sus datos le pedimos su consentimiento expreso en la casilla del formulario, que nombra ese envío, según el artículo 12 de la Ley 25.326. Nuestro proveedor tecnológico está en Argentina."
    ],
    seccion: (ctx) => [
      `En Argentina, el tratamiento de sus datos se rige por ${AR.datos.leyes}. La autoridad de control es la ${AAIP}: [${SITIO_AAIP.replace("https://www.", "")}](${SITIO_AAIP}).`,
      "",
      `Nuestra base de datos está inscripta en el Registro Nacional de Bases de Datos de la AAIP con el número ${ctx.venta.rnbdNumero}.`,
      "",
      `«${LEYENDA_AAIP}»`
    ]
  },

  terminos: {
    garantia: (ctx) => {
      const v = ctx.venta;
      return [
        `- **Equipos nuevos:** ${v.garantiaNuevos} meses desde la entrega.`,
        `- **Equipos usados:** ${v.garantiaUsadosMeses} ${v.garantiaUsadosMeses === 1 ? "mes" : "meses"} desde la entrega.`,
        "- Según la Ley 24.240 (artículos 11 y 37), la garantía legal es de 6 meses para los equipos nuevos y de 3 meses para los usados, y no se puede renunciar a ella.",
        `- Si un equipo falla dentro de la garantía, ${v.retractoCanal}.`
      ];
    },
    retracto: (ctx) => [
      `Como la compra se hace a distancia, usted puede arrepentirse y revocarla dentro de los ${AR.consumo.arrepentimiento.diasCorridos} días corridos desde que recibe el equipo o desde la compra, lo que ocurra último, según el artículo 34 de la Ley 24.240 y los artículos 1110 a 1116 del Código Civil y Comercial.`,
      "",
      // Sin botón de arrepentimiento (decisión de Jared, 0041): la compra no se
      // hace entera en este sitio. Se pide por el canal de Legales.
      `- **Cómo pedirlo:** ${ctx.venta.retractoCanal}.`,
      "- **Devolución del equipo:** los gastos de la devolución los pagamos nosotros."
    ],
    // Con Argentina el plazo de entrega es obligatorio (AR3): no hay texto de respaldo.
    entrega: () => [],
    leyAplicable: () => [
      `Las ventas a personas en Argentina se rigen por las leyes de Argentina, en especial ${AR.consumo.ley}. La autoridad de aplicación es la Subsecretaría de Defensa del Consumidor y Lealtad Comercial: [${LEYENDA_RECLAMOS}](${RECLAMOS}).`
    ]
  }
};

export default AR;
