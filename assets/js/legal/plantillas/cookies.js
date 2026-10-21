// =============================================================================
// Plantilla: Política de cookies (/cookies/). Una tabla por herramienta
// activa; las duraciones solo si están verificadas (herramientas.js).
// =============================================================================

import { CATEGORIAS } from "../herramientas.js";

function tabla(h) {
  const cookies = h.cookies.length
    ? h.cookies.map((c) => (c.duracion ? `${c.nombre} (${c.duracion})` : c.nombre)).join(", ")
    : "No guarda cookies propias en este sitio.";
  return [
    `### ${h.nombre}`,
    "",
    "| Dato | Detalle |",
    "| --- | --- |",
    `| Proveedor | ${h.proveedor} |`,
    `| Para qué sirve | ${h.para} |`,
    `| Cookies | ${cookies} |`,
    `| Política del proveedor | [Ver la política](${h.politica}) |`,
    ""
  ];
}

export function secciones(ctx) {
  const medicion = ctx.herramientas.filter((h) => h.categoria === "medicion");
  const publicidad = ctx.herramientas.filter((h) => h.categoria === "publicidad");
  return [
    {
      titulo: "Qué son las cookies",
      lineas: ["Las cookies son pequeños archivos que un sitio guarda en su navegador. Algunas son necesarias para que el sitio funcione; otras sirven para medir las visitas o los anuncios. Las de medición y las de publicidad solo se usan si usted las acepta en el aviso de cookies."]
    },
    {
      titulo: CATEGORIAS.necesarias,
      lineas: [
        "Siempre están activas, porque sin ellas el sitio no funciona como usted lo pidió. Se guardan en su navegador:",
        "",
        "- Su elección de cookies, durante 6 meses.",
        "- Los datos del formulario de cotización y del anuncio que lo trajo, mientras dura la visita.",
        "- Los colores y el tamaño de letra del sitio, para mostrarlo igual en su próxima visita."
      ]
    },
    medicion.length && {
      titulo: CATEGORIAS.medicion,
      lineas: ["Nos dicen cuántas personas visitan el sitio y cómo lo usan.", "", ...medicion.flatMap(tabla)]
    },
    publicidad.length && {
      titulo: CATEGORIAS.publicidad,
      lineas: [
        "Miden qué anuncios llevan a una cotización y permiten mostrar anuncios a quienes visitaron el sitio. Si su navegador envía la señal Global Privacy Control, la tomamos como un rechazo de estas cookies.",
        "",
        ...publicidad.flatMap(tabla)
      ]
    },
    {
      titulo: "Cómo cambiar su elección",
      lineas: [
        "Toque «Preferencias de cookies» al pie de cualquier página. Si retira una categoría que había aceptado, sus herramientas dejan de cargarse desde ese momento. También puede borrar las cookies desde la configuración de su navegador.",
        "",
        `Para saber cómo tratamos sus datos personales, lea la [Política de tratamiento de datos personales](${ctx.rutas.privacidad}).`
      ]
    }
  ];
}
