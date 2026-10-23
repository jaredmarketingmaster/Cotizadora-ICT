// =============================================================================
// Plantilla: Términos y condiciones (/terminos/).
// =============================================================================

// Texto fijo para los perfiles que no son tienda oficial ni revendedor
// autorizado (no se puede cambiar).
export const independiente = (tienda) => `${tienda} es un comercio independiente. No está afiliado, patrocinado ni autorizado por Apple Inc. iPhone es una marca de Apple Inc.`;

export function secciones(ctx) {
  const r = ctx.responsable;
  const v = ctx.venta;
  const apple = v.apple.autorizado
    ? `${v.apple.detalle} ${ctx.tienda} declara, bajo su responsabilidad, que esta información es cierta.`
    : independiente(ctx.tienda);
  return [
    {
      titulo: "Quién vende",
      lineas: [
        `Los equipos de este sitio los vende ${ctx.tienda}:`,
        "",
        `- **${r.juridica ? "Razón social" : "Nombre"}:** ${r.nombre}`,
        `- **Documento:** ${r.documento}`,
        ...(r.juridica ? [`- **Representante legal:** ${r.representante}`, `- **Matrícula mercantil:** ${r.matricula}`] : []),
        `- **Dirección para notificaciones:** ${r.direccion}, ${r.ciudad}`,
        ...(r.local ? [`- **Local:** ${r.local}`] : []),
        `- **Correo:** ${r.correo}`,
        `- **Teléfono:** ${r.telefono}`,
        "",
        apple
      ]
    },
    {
      titulo: "Qué es este cotizador",
      lineas: ["El cotizador muestra el precio y la disponibilidad que la tienda tiene publicados. La compra no se cierra en el sitio: se acuerda y se confirma por WhatsApp con la tienda."]
    },
    {
      titulo: "Precios, impuestos y formas de pago",
      lineas: [
        `Los precios están en ${ctx.paises.map((p) => p.moneda).join(" o ")}. Al pie de la página aparece la fecha de su última actualización.`,
        "",
        ...v.impuestos.map((i) => `- **${i.nombre} (${i.porcentaje}):** ${i.incluido ? "está incluido en el precio publicado" : "no está incluido en el precio publicado; se suma al confirmar la compra"}.`),
        ...(v.pagos.length ? ["", "Formas de pago:", "", ...v.pagos.map((p) => `- ${p}`)] : [])
      ]
    },
    { titulo: "Garantía", lineas: ctx.paises.flatMap((p) => p.terminos.garantia(ctx)) },
    { titulo: "Derecho de retracto", lineas: ctx.paises.flatMap((p) => p.terminos.retracto(ctx)) },
    ctx.paises.some((p) => p.terminos.reversion) && {
      titulo: "Reversión del pago",
      lineas: ctx.paises.flatMap((p) => (p.terminos.reversion ? p.terminos.reversion(ctx) : []))
    },
    {
      titulo: "Entrega",
      lineas: [
        ...lineasEntrega(v.envio, v.plazoEntrega),
        ...ctx.paises.flatMap((p) => p.terminos.entrega(ctx)).flatMap((l) => ["", l])
      ]
    },
    v.homologados && {
      titulo: "Equipos homologados",
      lineas: ctx.paises.map((p) => `Los equipos que vendemos están ${p.homologacion}.`)
    },
    {
      titulo: "Mayoría de edad",
      lineas: ["Para comprar en este sitio usted debe ser mayor de 18 años."]
    },
    {
      titulo: "Marcas",
      lineas: ["Apple e iPhone son marcas de Apple Inc. Las fotos de los equipos son de la tienda o imágenes de referencia del modelo y el color."]
    },
    {
      titulo: "Nuestro proveedor tecnológico",
      lineas: ["Nuestro proveedor tecnológico, ubicado en Argentina, provee la plataforma de esta cotizadora. No vende los equipos ni responde por la compraventa, por los productos ni por la atención de la tienda."]
    },
    { titulo: "Ley aplicable y autoridad", lineas: ctx.paises.flatMap((p) => p.terminos.leyAplicable(ctx)) },
    {
      titulo: "Datos personales",
      lineas: [`Los datos que usted deja en el formulario se tratan según la [Política de tratamiento de datos personales](${ctx.rutas.privacidad}).`]
    },
    {
      titulo: "Cambios y vigencia",
      lineas: ["Si cambiamos estos términos, publicamos la versión nueva en esta página con su fecha de vigencia, que aparece al final. Cada compra se rige por los términos vigentes el día en que se confirma."]
    }
  ];
}

// La sección Entrega, desde Catálogo → Envíos (C2): retiro, envío a domicilio
// con su costo, envío gratis con condición y plazo.
const y = (l) => (l.length <= 1 ? l.join("") : `${l.slice(0, -1).join(", ")} y ${l[l.length - 1]}`);
const sinPunto = (s) => String(s).replace(/\.$/, "");
function lineasEntrega(envio, plazo) {
  const l = [];
  if (envio.retiro) {
    l.push(`- **Retiro en el local:** ${[envio.retiro.local, envio.retiro.horario].filter(Boolean).map(sinPunto).join(", ")}.`);
  }
  const d = envio.domicilio;
  if (d) {
    l.push(`- **Envío a domicilio:** ${d.todoElPais ? "a todo el país" : `a ${y(d.zonas)}`}.`);
    if (d.costo === "gratis") l.push("- **Costo del envío:** gratis.");
    if (d.costo === "fijo") l.push(`- **Costo del envío:** ${d.fijo}.`);
    if (d.costo === "al_recibir") l.push("- **Costo del envío:** lo paga usted al recibir el pedido.");
    if (d.costo === "zona") l.push(...d.porZona.map((z) => `- **Costo del envío a ${z.zona}:** ${z.gratis ? "gratis" : z.monto}.`));
    if (d.gratis) {
      const partes = [d.gratis.zonas.length ? `en ${y(d.gratis.zonas)}` : "", d.gratis.minimo ? `en compras desde ${d.gratis.minimo}` : ""].filter(Boolean);
      l.push(`- **Envío gratis:** ${partes.join(" ")}.`);
    }
  }
  if (plazo) {
    l.push(`- **Plazo de entrega:** ${plazo.desde === plazo.hasta ? `${plazo.desde} ${plazo.desde === 1 ? "día hábil" : "días hábiles"}` : `de ${plazo.desde} a ${plazo.hasta} días hábiles`}.`);
  }
  return l;
}
