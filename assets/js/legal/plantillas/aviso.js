// =============================================================================
// Plantilla: aviso de privacidad corto (dentro del pop-up, arriba de las
// casilla). Dos o tres líneas, con el enlace a la política completa.
// =============================================================================

export function secciones(ctx) {
  const r = ctx.responsable;
  const quien = r.nombre === ctx.tienda ? `${ctx.tienda} (${r.documento})` : `${ctx.tienda} (${r.nombre}, ${r.documento})`;
  return [{
    titulo: "",
    lineas: [
      `${quien} es responsable de sus datos. Los usamos para atender su cotización y contactarlo sobre ella por WhatsApp y correo. Usted puede conocer, actualizar, rectificar y suprimir sus datos. [Ver la Política de privacidad](privacidad/).`
    ]
  }];
}
