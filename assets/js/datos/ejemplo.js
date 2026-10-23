// =============================================================================
// Tienda de ejemplo (0037, pedido de Jared): la instalación nueva queda
// preconfigurada para Argentina y con datos de ejemplo en Legales, para que la
// demostración funcione entera (el pop-up envía y las páginas legales se ven)
// mientras se personaliza. Es una marca blanca: nada de esto es de una tienda
// real. Los mismos valores están en 0037_tienda_ejemplo_ar.sql (y en
// datos_fabrica(); tests/sql/probar.sh compara las dos instalaciones).
//
// - TIENDA_EJEMPLO: lo que la instalación nueva cambia de los valores
//   iniciales de cada columna.
// - LEGAL_PUBLICADO_EJEMPLO (legales-ejemplo.js): los documentos ya
//   publicados con estos datos (generados con el motor; las pruebas revisan que
//   el motor dé lo mismo).
// - TIENDA_VITRINA (0041): lo que agrega la vitrina completa (vitrina.js):
//   promos y dólar de ejemplo. tiendaNueva(fecha, { modo: "basica" }) no lo
//   lleva (el restablecer básico).
// - camposDeEjemplo(t): los datos que siguen siendo los de ejemplo. Mientras
//   haya alguno, no se quita la demostración (como datos_de_ejemplo() del SQL)
//   y el panel avisa.
// =============================================================================

import { LEGAL_INICIAL, TITULO_RESENAS } from "./comun.js";
import { ENVIOS_INICIAL } from "./envios.js";
import { USD_INICIAL, PROMOS_INICIAL } from "./precios.js";
import { LEGAL_PUBLICADO_EJEMPLO } from "./legales-ejemplo.js";
import { PIXEL_EJEMPLO } from "../legal/herramientas.js";

export const VIGENCIA_EJEMPLO = "2026-10-23";

// Un WhatsApp con formato válido de Argentina que no es de nadie.
export const WHATSAPP_EJEMPLO = "5491100000000";

export const TIENDA_EJEMPLO = {
  nombre: "Tienda de demostración",
  pais: "ar",
  ciudad: "Ciudad Autónoma de Buenos Aires",
  direccion: "Calle de Ejemplo 123",
  whatsapp: WHATSAPP_EJEMPLO,
  // Envíos: a domicilio a todo el país, se paga al recibir, de 2 a 5 días
  // (con Argentina el plazo es obligatorio).
  envio_domicilio: true, envio_todo_el_pais: true, envio_costo: "al_recibir",
  envio_plazo_desde: 2, envio_plazo_hasta: 5,
  // Legales: el asistente completo, con datos de ejemplo.
  legal_paso: 6,
  legal_perfil: "no_oficial",
  legal_tipo_persona: "natural",
  legal_nombre: "Nombre y apellido de ejemplo",
  legal_doc_tipo: "cuit",
  legal_doc_numero: "20-12345678-6",
  legal_direccion: "Calle de Ejemplo 123",
  legal_ciudad: "Ciudad Autónoma de Buenos Aires",
  legal_correo: "legales@example.com",
  legal_telefono: WHATSAPP_EJEMPLO,
  legal_direccion_local: "Calle de Ejemplo 123",
  legal_rnbd_numero: "00000000",
  legal_data_fiscal_url: "https://example.com/data-fiscal",
  legal_paises: ["ar"],
  legal_impuestos: [{ nombre: "IVA", porcentaje: 21, incluido: true }],
  legal_garantia_nuevos: 6,
  legal_garantia_usados: "con",
  legal_garantia_usados_meses: 3,
  legal_retracto_canal: "correo",
  legal_homologados: "si",
  // 0041: horario y formas de pago de ejemplo (también van a los términos).
  horario_texto: "Lunes a viernes de 10 a 19 h. Sábados de 10 a 14 h.",
  pagos_medios: ["transferencia", "efectivo", "debito", "credito"],
  pagos_cuotas: true, pagos_cuotas_max: 12, pagos_sin_interes: true, pagos_sin_interes_max: 3,
  pagos_pasarelas: ["mercado_pago"],
  pagos_descuentos: { "medio:efectivo": 10, "medio:transferencia": 5 },
  // Un ID con formato válido que no es de nadie: el sitio no carga el píxel con él.
  meta_pixel_id: PIXEL_EJEMPLO
};

// Restablecer de fábrica (0041): "completa" (la vitrina) o "basica".
export const MODOS_FABRICA = ["completa", "basica"];
// La instalación nueva (tests/tienda-prueba-co.js lo cambia para las pruebas).
export const MODO_INICIAL = "completa";

// Lo que la vitrina completa cambia de la tienda de ejemplo (en el modo básico
// quedan los valores iniciales de cada columna: USD_INICIAL y PROMOS_INICIAL).
// La fecha de la cotización la pone el servidor (usd_actualizado_en).
export const TIENDA_VITRINA = {
  usd_modo: "apoyo",
  usd_cotizacion: 1500,
  usd_redondeo: "arriba",
  promo_banner_activo: true,
  promo_banner_texto: "Promoción de ejemplo: hasta 20 % off en modelos seleccionados",
  promo_descuentos_activos: true,
  promo_descuentos_modelo: { "iphone-15": 15, "iphone-15-plus": 15, "iphone-16e": 10 },
  promo_combinar: "mayor"
};

// Los datos que la tienda tiene que cambiar por los suyos.
export const CAMPOS_EJEMPLO = [
  "whatsapp", "legal_nombre", "legal_doc_numero", "legal_direccion", "legal_correo",
  "legal_telefono", "legal_rnbd_numero", "legal_data_fiscal_url", "meta_pixel_id"
];

export function camposDeEjemplo(t) {
  return CAMPOS_EJEMPLO.filter((k) => String(t?.[k] ?? "") === TIENDA_EJEMPLO[k]);
}
export const tieneDatosDeEjemplo = (t) => camposDeEjemplo(t).length > 0;
export const legalesDeEjemplo = (t) => camposDeEjemplo(t).some((k) => k !== "whatsapp");

// Valores por defecto de las formas de pago estructuradas (0013).
export const PAGOS_VACIOS = {
  pagos_medios: [], pagos_cuotas: false, pagos_cuotas_max: null, pagos_sin_interes: false, pagos_sin_interes_max: null,
  pagos_cripto: false, pagos_cripto_cuales: "", pagos_pasarelas: [], pagos_pasarelas_otras: [], pagos_descuentos: {}
};

// La tienda de una instalación nueva (demo.js; en el SQL, los valores
// iniciales de cada columna más 0037 y 0041). conLegales = false: sin los
// documentos publicados (para generarlos, tests/legal/ejemplo.mjs). modo:
// "completa" (la vitrina, con TIENDA_VITRINA) o "basica".
export function tiendaNueva(fecha, { conLegales = true, modo = "completa" } = {}) {
  return structuredClone({
    id: 1, nombre: "", pais: "ar", idioma: "es", ciudad: "", direccion: "", horario_texto: "", whatsapp: "",
    correo_contacto: "", instagram_url: "", facebook_url: "", tiktok_url: "", logo: "", favicon: "",
    color_primario: "#1A73E8", color_secundario: "#0F172A", tema: "claro", texto_entrega: "",
    pagos_otras: [], ...PAGOS_VACIOS, texto_garantia_nuevos: "", texto_garantia_usados: "", etiqueta_precio: "Precio",
    ...LEGAL_INICIAL, ...ENVIOS_INICIAL, ...USD_INICIAL, ...PROMOS_INICIAL,
    precios_actualizados_en: fecha, modo_demo: true, tamano_texto: "normal", vista_equipos: "cuadricula",
    mostrar_ficha: true, ficha_ocultas: [], mostrar_resenas: false, titulo_resenas: TITULO_RESENAS, titulo_sitio: "",
    actualizado_en: fecha,
    ...TIENDA_EJEMPLO,
    ...(modo === "completa" ? { ...TIENDA_VITRINA, usd_actualizado_en: fecha } : {}),
    legal_publicado: conLegales ? LEGAL_PUBLICADO_EJEMPLO : null
  });
}
