// =============================================================================
// Herramientas de medición y publicidad (paso 5 del asistente). De cada una:
// proveedor, categoría del banner, formato del ID, sus cookies y el enlace a
// su política. Solo se escriben duraciones verificadas en la documentación
// del proveedor (ver legal/FUENTES.md); si no, solo el nombre de la cookie.
// El píxel de Meta y la API de Conversiones están siempre activos.
// =============================================================================

export const CATEGORIAS = {
  necesarias: "Necesarias",
  medicion: "Medición",
  publicidad: "Publicidad"
};

export const HERRAMIENTAS = [
  {
    clave: "meta", nombre: "Píxel de Meta", proveedor: "Meta Platforms, Inc.", categoria: "publicidad", siempre: true,
    campo: "meta_pixel_id", etiquetaId: "ID del píxel", patron: /^\d{5,20}$/, ejemplo: "123456789012345",
    para: "Mide qué anuncios de Facebook e Instagram llevan a una cotización y muestra anuncios a quienes visitaron el sitio.",
    cookies: [{ nombre: "_fbp" }, { nombre: "_fbc" }],
    politica: "https://www.facebook.com/privacy/policy/"
  },
  {
    clave: "ga4", nombre: "Google Analytics 4", proveedor: "Google LLC", categoria: "medicion",
    campo: "ga4_id", activo: "ga4_activo", etiquetaId: "ID de medición", patron: /^G-[A-Z0-9]{4,15}$/, ejemplo: "G-ABC123XYZ9",
    para: "Mide cuántas personas visitan el sitio y qué páginas ven.",
    cookies: [{ nombre: "_ga", duracion: "2 años" }, { nombre: "_ga_<ID>", duracion: "2 años" }],
    politica: "https://policies.google.com/privacy"
  },
  {
    clave: "gtm", nombre: "Google Tag Manager", proveedor: "Google LLC", categoria: "medicion",
    campo: "gtm_id", activo: "gtm_activo", etiquetaId: "ID de contenedor", patron: /^GTM-[A-Z0-9]{4,10}$/, ejemplo: "GTM-ABC1234",
    para: "Administra las etiquetas de medición del sitio.",
    cookies: [],
    politica: "https://policies.google.com/privacy"
  },
  {
    clave: "clarity", nombre: "Microsoft Clarity", proveedor: "Microsoft Corporation", categoria: "medicion",
    campo: "clarity_id", activo: "clarity_activo", etiquetaId: "ID de proyecto", patron: /^[a-z0-9]{6,15}$/, ejemplo: "abc123def4",
    para: "Muestra cómo se usa el sitio (clics, desplazamiento y grabaciones de la sesión con los datos personales ocultos).",
    cookies: [{ nombre: "_clck" }, { nombre: "_clsk" }],
    politica: "https://privacy.microsoft.com/es-es/privacystatement"
  },
  {
    clave: "tiktok", nombre: "Píxel de TikTok", proveedor: "TikTok", categoria: "publicidad",
    campo: "tiktok_id", activo: "tiktok_activo", etiquetaId: "ID del píxel", patron: /^[A-Z0-9]{15,25}$/, ejemplo: "C1A2B3C4D5E6F7G8H9I0",
    para: "Mide qué anuncios de TikTok llevan a una cotización.",
    cookies: [{ nombre: "_ttp", duracion: "13 meses desde su último uso" }],
    politica: "https://www.tiktok.com/legal/page/global/privacy-policy/es"
  },
  {
    clave: "gads", nombre: "Google Ads", proveedor: "Google LLC", categoria: "publicidad",
    campo: "gads_id", activo: "gads_activo", etiquetaId: "ID de conversión", patron: /^AW-\d{6,15}$/, ejemplo: "AW-123456789",
    para: "Mide qué anuncios de Google llevan a una cotización.",
    cookies: [{ nombre: "_gcl_au", duracion: "90 días" }],
    politica: "https://policies.google.com/privacy"
  }
];

export const OPCIONALES = HERRAMIENTAS.filter((h) => !h.siempre);

// Las herramientas en uso: Meta siempre; las opcionales si están activas.
export function activas(tienda) {
  return HERRAMIENTAS.filter((h) => h.siempre || tienda?.[h.activo]);
}

export function idValido(h, valor) {
  return h.patron.test(String(valor || "").trim());
}
