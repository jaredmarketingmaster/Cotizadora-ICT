// =============================================================================
// Vigencia de los textos publicados: la usan el sitio (páginas legales y
// pop-up) sin cargar el motor completo, y motor.js.
// =============================================================================

export function fechaDMA(iso) {
  const [a, m, d] = String(iso).split("-").map(Number);
  return `${d}/${m}/${a}`;
}

// El texto que se muestra: el documento y, al pie, su vigencia.
export function conVigencia(publicado, clave) {
  const doc = publicado?.documentos?.[clave];
  if (!doc) return "";
  return `${doc}\n\nVigente desde ${fechaDMA(publicado.vigente_desde)} · versión ${publicado.version}.`;
}
