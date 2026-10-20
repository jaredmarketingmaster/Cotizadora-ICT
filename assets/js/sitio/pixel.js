// =============================================================================
// Píxel de Meta. El ID sale de config.js; si está vacío no se carga nada.
// Eventos: PageView al cargar, ViewContent al abrir un detalle y Lead al
// confirmarse el envío. Nunca Purchase (la venta se registra en el CRM).
// Nunca se mandan a Meta nombre, correo ni teléfono.
// =============================================================================

import { CONFIG } from "../../../config.js";

let activo = false;

export function iniciarPixel() {
  const id = String(CONFIG.metaPixelId || "").trim();
  if (!/^\d{5,20}$/.test(id)) return;
  /* eslint-disable */
  !function (f, b, e, v, n, t, s) {
    if (f.fbq) return; n = f.fbq = function () { n.callMethod ? n.callMethod.apply(n, arguments) : n.queue.push(arguments); };
    if (!f._fbq) f._fbq = n; n.push = n; n.loaded = !0; n.version = "2.0"; n.queue = [];
    t = b.createElement(e); t.async = !0; t.src = v; s = b.getElementsByTagName(e)[0]; s.parentNode.insertBefore(t, s);
  }(window, document, "script", "https://connect.facebook.net/en_US/fbevents.js");
  /* eslint-enable */
  window.fbq("init", id);
  window.fbq("track", "PageView");
  activo = true;
}

export function evento(nombre, parametros, eventID) {
  if (!activo || typeof window.fbq !== "function") return;
  window.fbq("track", nombre, parametros, eventID ? { eventID } : undefined);
}

export function parametrosEquipo(q) {
  return {
    content_name: [q.modelo.nombre, q.capacidad, q.color_nombre].filter(Boolean).join(" "),
    content_ids: [q.id],
    content_type: "product",
    value: q.precio,
    currency: "COP"
  };
}
