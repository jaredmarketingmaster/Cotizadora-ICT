// =============================================================================
// Configuración de la cotizadora I.C.T. — una por tienda
// -----------------------------------------------------------------------------
// Es el ÚNICO archivo que cambia entre una tienda y otra. Todo lo demás (marca,
// textos, inventario, precios) sale de la base de datos y se edita desde /admin.
//
// Nada de lo que va aquí es secreto: la "anon key" de Supabase es pública por
// diseño (la protegen las reglas de seguridad de la base). Las claves de GHL
// van en los secretos de las funciones de Supabase, nunca aquí.
// =============================================================================

export const CONFIG = {
  // "demo": todo vive en este navegador (localStorage), con datos de ejemplo.
  //         Sirve para ver y probar el sitio y el panel sin back-end.
  // "supabase": base de datos, usuarios y fotos en el proyecto de Supabase.
  backend: "demo",

  supabase: {
    url: "",       // [PENDIENTE] ej. https://abcdefghijkl.supabase.co
    anonKey: ""    // [PENDIENTE] Project Settings → API → anon public
  },

  // YA NO SE USA: el ID del píxel de Meta (y el de las demás herramientas) se
  // carga en el panel, Legales → Herramientas. Si una tienda vieja tiene un ID
  // aquí, el panel lo copia una vez a Legales al entrar el gestor.
  metaPixelId: "",

  // Script de seguimiento externo de GHL (Sites → External Tracking), opcional.
  // Si se completa, se carga en el sitio público para que GHL registre la
  // visita y el envío del formulario con su atribución. [PENDIENTE] probarlo
  // en la subcuenta: ver README, "Integración con GHL".
  ghlSeguimiento: {
    src: "",       // URL del script que da GHL
    id: ""         // valor de data-tracking-id
  }
};
