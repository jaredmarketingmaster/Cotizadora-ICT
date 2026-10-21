// =============================================================================
// Píxel de Meta. Lo carga solo consentimiento.js, cuando la persona acepta las
// cookies de publicidad, con el ID de la tienda (Legales → Herramientas).
// Eventos: PageView al cargar, ViewContent al abrir un detalle y Lead al
// confirmarse el envío. Sin permiso de publicidad no sale ningún evento.
// Nunca Purchase (la venta se registra en el CRM). Nunca se mandan a Meta
// nombre, correo ni teléfono.
// =============================================================================

import { datosPais, paisActual } from "../datos/paises.js";

let activo = false;

export function iniciarPixel(id) {
  if (!/^\d{5,20}$/.test(String(id || ""))) return;
  if (typeof window.fbq === "function") { window.fbq("consent", "grant"); activo = true; return; }
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

// La persona retiró el permiso de publicidad: desde ahora no sale nada.
export function retirarPixel() {
  if (typeof window.fbq === "function") window.fbq("consent", "revoke");
  activo = false;
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
    currency: datosPais(paisActual()).moneda
  };
}
