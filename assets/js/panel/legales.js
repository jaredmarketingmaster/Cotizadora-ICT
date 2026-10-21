// =============================================================================
// Legales: asistente de seis pasos (0016). La tienda llena sus datos y el
// motor (assets/js/legal/motor.js) arma la Política de tratamiento de datos,
// los Términos, la Política de cookies y el aviso del pop-up.
// - Rutas: #/legales (sigue en el último paso) y #/legales/<1 a 6>. Con
//   ?campo=<campo>, ese campo se enfoca y muestra su error (la lista de lo que
//   falta enlaza así).
// - Todo se guarda solo: los textos al dejar de escribir, lo demás al
//   cambiarlo. Los errores de un campo se ven después de tocarlo.
// - Paso 6: vista previa en pestañas, cláusula propia por documento, lo que
//   falta y "Publicar textos legales" (solo con todo completo).
// - Después de publicar, cada cambio vuelve a generar y publicar los textos
//   (republicarAlGuardar, que usa panel.js); la versión sube solo si cambió
//   algún texto.
// =============================================================================

import { formatoBasico } from "../utils.js";
import { PASOS, PERFILES, ENTREGAS, DOCUMENTOS, MARCAS, textoSinModulo, faltantes, generar, publicar, conVigencia, perfilDe, declaraApple, necesitaLocal, fechaDMA, hoyColombia, contexto } from "../legal/motor.js";
import { PAISES, PAISES_DISPONIBLES, documentosDe, modulosDe } from "../legal/paises/indice.js";
import { HERRAMIENTAS, OPCIONALES, idValido } from "../legal/herramientas.js";
import { independiente } from "../legal/plantillas/terminos.js";
import { $, $$, esc, avisar, conBoton } from "./ui.js";

const META = HERRAMIENTAS[0];
const AYUDA_GARANTIA = "Si no indica un término mayor, la ley colombiana fija un año para productos nuevos.";
const AVISO_SIN_GARANTIA = "Solo puede vender sin garantía un usado cuya garantía legal ya venció, y el cliente debe aceptarlo por escrito al comprar.";
const AYUDA_CAPI = "Configure su workflow de GoHighLevel para revisar el campo consentimiento_publicidad antes de enviar el evento.";
const AYUDA_CLARITY = "En Clarity, elija el enmascarado «Strict» (Settings → Masking): así las grabaciones ocultan todo el texto del sitio. Además, el pop-up marca sus campos para que Clarity no los grabe.";
const ESPERA_TEXTO = 700;

// Lo que publica después de cada guardado, si ya hay textos publicados y no
// falta nada. Si falta algo, queda la versión publicada (no se bloquea nada).
export function republicarAlGuardar(api) {
  const guardar = api.guardarTienda.bind(api);
  api.guardarTienda = async (cambios) => {
    const t = await guardar(cambios);
    if (!t.legal_publicado || "legal_publicado" in cambios || faltantes(t).length) return t;
    const nuevo = publicar(t, t.legal_publicado);
    return nuevo === t.legal_publicado ? t : guardar({ legal_publicado: nuevo });
  };
}

// Estado de un paso: completo si no le falta nada (el 6, si lo publicado está
// al día con los datos).
function pasoCompleto(t, n, lista = faltantes(t)) {
  if (n < 6) return !lista.some((f) => f.paso === n);
  if (!t.legal_publicado || lista.length) return false;
  return publicar(t, t.legal_publicado) === t.legal_publicado;
}

const numero = (v) => {
  const s = String(v ?? "").trim().replace(/\s/g, "").replace(",", ".");
  if (s === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : NaN;
};

export async function dibujar(vista, ctx, resto = [], params = new URLSearchParams()) {
  let t = await ctx.recargarTienda();
  let paso = Number(resto[0]) >= 1 && Number(resto[0]) <= 6 ? Number(resto[0]) : t.legal_paso || 1;
  const tocados = new Set();
  const pendientes = {};
  let reloj = 0;
  let guardando = Promise.resolve();
  let documento = "privacidad";

  vista.innerHTML = `
    <div class="vista-cabecera"><h1>Legales</h1>
      <p>Complete los seis pasos. Con estos datos se arman la Política de tratamiento de datos, los Términos y condiciones, la Política de cookies y el aviso del pop-up. Todo se guarda solo.</p></div>
    <section class="bloque" aria-labelledby="t-progreso">
      <h2 id="t-progreso" class="oculto-visual">Progreso</h2>
      <p class="estado-legales" id="l-estado"></p>
      <div class="progreso-legales"><progress id="l-progreso" max="6" aria-labelledby="l-progreso-texto"></progress><span id="l-progreso-texto" class="cifras"></span></div>
      <ol class="pasos-legales" id="l-pasos"></ol>
    </section>
    <form id="form-legales" novalidate>
      <section class="bloque" id="l-paso" aria-labelledby="l-titulo"></section>
      <p class="estado-guardado" id="l-guardado" role="status" aria-live="polite"></p>
      <div class="acciones-pasos">
        <button type="button" class="boton boton--secundario" id="l-anterior">Anterior</button>
        <button type="button" class="boton boton--primario" id="l-siguiente">Siguiente</button>
      </div>
    </form>`;

  const form = $("#form-legales");
  const caja = $("#l-paso");

  // --- Piezas de los pasos -------------------------------------------------------
  const err = (campo) => `<p class="error-campo" id="l-${campo}-error"></p>`;
  const describir = (campo, ayuda) => `aria-describedby="${[ayuda && `l-${campo}-ayuda`, `l-${campo}-error`].filter(Boolean).join(" ")}"`;

  function texto(campo, etiqueta, { ayuda = "", max = 160, tipo = "text", atributos = "", multilinea = false } = {}) {
    const valor = t[campo] ?? "";
    const control = multilinea
      ? `<textarea class="entrada" id="l-${campo}" data-campo="${campo}" rows="4" maxlength="${max}" ${describir(campo, ayuda)} ${atributos}>${esc(valor)}</textarea>`
      : `<input class="entrada" id="l-${campo}" data-campo="${campo}" type="${tipo}" value="${esc(valor)}" maxlength="${max}" ${describir(campo, ayuda)} ${atributos}>`;
    return `<div class="campo"><label for="l-${campo}">${esc(etiqueta)}</label>
      ${ayuda ? `<p class="ayuda" id="l-${campo}-ayuda">${ayuda}</p>` : ""}${control}${err(campo)}</div>`;
  }
  function entero(campo, etiqueta, { ayuda = "", sufijo = "meses" } = {}) {
    return `<div class="campo"><label for="l-${campo}">${esc(etiqueta)}</label>
      ${ayuda ? `<p class="ayuda" id="l-${campo}-ayuda">${ayuda}</p>` : ""}
      <div class="entrada-con-sufijo"><input class="entrada cifras" id="l-${campo}" data-campo="${campo}" data-tipo="entero" inputmode="numeric" maxlength="3" value="${t[campo] ?? ""}" ${describir(campo, ayuda)}><span aria-hidden="true">${sufijo}</span></div>
      ${err(campo)}</div>`;
  }
  function opciones(campo, leyenda, lista, { ayuda = "", multiple = false } = {}) {
    const elegido = (o) => o.marcado ?? (multiple ? (t[campo] || []).includes(o.valor) : t[campo] === o.valor);
    return `<fieldset class="opciones-legales" id="l-${campo}" ${describir(campo, ayuda)}>
      <legend>${esc(leyenda)}</legend>
      ${ayuda ? `<p class="ayuda" id="l-${campo}-ayuda">${ayuda}</p>` : ""}
      ${lista.map((o, i) => `<label class="casilla" for="l-${campo}-${i}">
        <input type="${multiple ? "checkbox" : "radio"}" name="l-${campo}" id="l-${campo}-${i}" value="${esc(o.valor)}" data-campo="${campo}" ${multiple ? 'data-tipo="lista"' : ""}
          ${elegido(o) ? "checked" : ""} ${o.desactivado ? "disabled" : ""} ${o.nota ? `aria-describedby="l-${campo}-${i}-nota"` : ""}>
        <span>${esc(o.texto)}${o.nota ? ` <span class="ayuda" id="l-${campo}-${i}-nota">${esc(o.nota)}</span>` : ""}</span></label>`).join("")}
      ${err(campo)}</fieldset>`;
  }
  const siNo = (campo, leyenda, ayuda = "") => opciones(campo, leyenda, [{ valor: "si", texto: "Sí" }, { valor: "no", texto: "No" }], { ayuda });
  const interruptorLegal = (campo, etiqueta, describe = "") => `<label class="interruptor" for="l-${campo}"><input type="checkbox" role="switch" id="l-${campo}" data-campo="${campo}" data-tipo="bool" ${t[campo] ? "checked" : ""} ${describe ? `aria-describedby="${describe}"` : ""}><span>${esc(etiqueta)}</span></label>`;

  // --- Los pasos ---------------------------------------------------------------
  const PINTAR = {
    1: () => `<h2 id="l-titulo">1. Perfil de la tienda</h2>
      ${opciones("legal_perfil", "¿Cómo vende la tienda?", PERFILES.map((p) => ({ valor: p.clave, texto: p.nombre })),
        { ayuda: "Cambia lo que dicen los términos sobre su relación con Apple y si se pide la dirección de un local." })}`,

    2: () => {
      const juridica = t.legal_tipo_persona === "juridica";
      const docs = documentosDe(t.legal_paises);
      const doc = docs.find((d) => d.clave === t.legal_doc_tipo);
      const perfil = perfilDe(t);
      const pais = modulosDe(t.legal_paises)[0] || modulosDe(["co"])[0];
      return `<h2 id="l-titulo">2. Identificación</h2>
      <p class="ayuda">Son los datos del responsable de los datos personales de sus clientes: la persona o la empresa dueña de la tienda.</p>
      ${opciones("legal_tipo_persona", "Tipo de persona", [{ valor: "natural", texto: "Persona natural" }, { valor: "juridica", texto: "Persona jurídica (empresa)" }])}
      ${texto("legal_nombre", juridica ? "Razón social" : "Nombre completo", { atributos: 'autocomplete="off"' })}
      <div class="grilla-2">
        <div class="campo"><label for="l-legal_doc_tipo">Tipo de documento</label>
          <select class="entrada" id="l-legal_doc_tipo" data-campo="legal_doc_tipo" ${describir("legal_doc_tipo")}>
            <option value="">Elija una opción</option>
            ${docs.map((d) => `<option value="${d.clave}" ${d.clave === t.legal_doc_tipo ? "selected" : ""}>${esc(d.nombre)}</option>`).join("")}
          </select>${err("legal_doc_tipo")}</div>
        ${texto("legal_doc_numero", "Número de documento", { max: 20, ayuda: `Sin puntos ni espacios.${doc ? ` Ej.: ${doc.ejemplo}.` : ""}${doc?.clave === "nit" ? " Con el dígito de verificación después del guion." : ""}`, atributos: 'autocomplete="off" spellcheck="false"' })}
      </div>
      <div class="grilla-2">
        ${texto("legal_direccion", "Dirección para notificaciones", { atributos: 'autocomplete="street-address"' })}
        ${texto("legal_ciudad", "Ciudad", { max: 80, atributos: 'autocomplete="address-level2"' })}
      </div>
      <div class="grilla-2">
        ${texto("legal_correo", "Correo para temas de datos personales", { tipo: "email", ayuda: "Aquí le escriben sus clientes para consultar, corregir o borrar sus datos.", atributos: 'inputmode="email" autocomplete="email"' })}
        ${texto("legal_telefono", "Teléfono de contacto", { tipo: "tel", max: 20, ayuda: "Con el indicativo del país, solo números. Ej.: 573001234567.", atributos: 'inputmode="tel" autocomplete="tel"' })}
      </div>
      ${juridica ? `${texto("legal_representante", "Representante legal")}
      <div class="grilla-2">
        ${texto("legal_matricula_numero", "Número de matrícula mercantil", { max: 40 })}
        ${texto("legal_matricula_camara", "Cámara de comercio", { max: 80, ayuda: "La de la matrícula. Ej.: Cámara de Comercio de Medellín para Antioquia." })}
      </div>` : ""}
      ${!perfil || necesitaLocal(t) ? texto("legal_direccion_local", "Dirección del local", { ayuda: perfil ? "" : "Si la tienda no tiene local, elija en el paso 1 «Emprendedor sin local físico» o «Revendedor particular»." }) : ""}
      ${opciones("legal_rnbd", "Registro Nacional de Bases de Datos (opcional)", [
        { valor: "si", texto: "Estamos obligados a inscribir nuestras bases de datos" },
        { valor: "no", texto: "No estamos obligados" },
        { valor: "", texto: "No indicarlo" }
      ], { ayuda: `Es el registro de la ${esc(pais.autoridad.corto)}. Según la norma, ${esc(pais.datos.rnbd)}. Si lo indica, la política lo dice.` })}`;
    },

    3: () => `<h2 id="l-titulo">3. Países donde vende</h2>
      ${PAISES_DISPONIBLES.includes(t.pais) ? "" : `<div class="aviso-legal" id="l-pais" tabindex="-1" role="note">
        <p>${esc(textoSinModulo(t.pais))}</p>
        <p>El país de la tienda se elige en <a href="#/tienda">Mi tienda</a>. Mientras tanto no se pueden publicar los textos legales.</p></div>`}
      ${opciones("legal_paises", "Elija los países", PAISES.map((p) => ({
        valor: p.codigo, texto: p.nombre, desactivado: p.estado !== "disponible" && !(t.legal_paises || []).includes(p.codigo),
        nota: p.estado === "disponible" ? "" : p.nota || "Próximamente"
      })), { multiple: true, ayuda: "Por ahora los textos están listos para Colombia. Los demás países se habilitan a medida que estén sus módulos." })}`,

    4: () => {
      const tienda = contexto(t).tienda || "La tienda";
      return `<h2 id="l-titulo">4. Condiciones de venta</h2>
      <fieldset class="opciones-legales" id="l-legal_impuestos" ${describir("legal_impuestos", "imp")}>
        <legend>Impuestos</legend>
        <p class="ayuda" id="l-legal_impuestos-ayuda">Los que aplican al precio publicado. Indique si ya están incluidos.</p>
        <ul class="lista-impuestos">${(t.legal_impuestos || []).map((i, n) => `<li class="fila-impuesto">
          <div class="campo"><label for="imp-${n}-nombre">Impuesto ${n + 1}</label><input class="entrada" id="imp-${n}-nombre" data-imp="${n}" data-imp-campo="nombre" value="${esc(i?.nombre ?? "")}" maxlength="40" aria-describedby="l-legal_impuestos.${n}.nombre-error">${err(`legal_impuestos.${n}.nombre`)}</div>
          <div class="campo"><label for="imp-${n}-porcentaje">Porcentaje</label><div class="entrada-con-sufijo"><input class="entrada cifras" id="imp-${n}-porcentaje" data-imp="${n}" data-imp-campo="porcentaje" inputmode="decimal" maxlength="6" value="${i?.porcentaje == null ? "" : String(i.porcentaje).replace(".", ",")}" aria-describedby="l-legal_impuestos.${n}.porcentaje-error"><span aria-hidden="true">%</span></div>${err(`legal_impuestos.${n}.porcentaje`)}</div>
          <fieldset class="opciones-legales" aria-describedby="l-legal_impuestos.${n}.incluido-error"><legend>¿Incluido en el precio?</legend>
            ${[["si", "Sí", true], ["no", "No", false]].map(([v, txt, b]) => `<label class="casilla" for="imp-${n}-${v}"><input type="radio" name="imp-${n}" id="imp-${n}-${v}" data-imp="${n}" data-imp-campo="incluido" value="${v}" ${i?.incluido === b ? "checked" : ""}><span>${txt}</span></label>`).join("")}
            ${err(`legal_impuestos.${n}.incluido`)}</fieldset>
          <button type="button" class="boton boton--secundario" data-quitar-impuesto="${n}">Quitar impuesto ${n + 1}</button>
        </li>`).join("")}</ul>
        ${err("legal_impuestos")}
        <button type="button" class="boton boton--secundario" id="l-agregar-impuesto" ${(t.legal_impuestos || []).length >= 6 ? "disabled" : ""}>Agregar impuesto</button>
      </fieldset>
      ${entero("legal_garantia_nuevos", "Garantía de los equipos nuevos", { ayuda: AYUDA_GARANTIA })}
      ${opciones("legal_garantia_usados", "Garantía de los equipos usados", [{ valor: "con", texto: "Con garantía" }, { valor: "sin", texto: "Sin garantía" }])}
      ${t.legal_garantia_usados === "con" ? entero("legal_garantia_usados_meses", "Meses de garantía de los usados") : ""}
      ${t.legal_garantia_usados === "sin" ? `<p class="aviso-datos" role="note">${AVISO_SIN_GARANTIA}</p>` : ""}
      ${opciones("legal_retracto_canal", "¿Por dónde pide el cliente el retracto?", [
        { valor: "correo", texto: `Por correo${t.legal_correo ? ` (${t.legal_correo})` : ""}` },
        { valor: "whatsapp", texto: "Por WhatsApp (el de Mi tienda)" }
      ], { ayuda: "En las compras a distancia, el cliente puede retractarse dentro de los 5 días hábiles siguientes a la entrega." })}
      ${t.legal_retracto_canal === "whatsapp" && !/^57\d{10}$/.test(t.whatsapp || "") ? '<p class="aviso-datos" role="note">Falta el WhatsApp de la tienda. <a href="#/tienda">Complételo en Mi tienda</a>.</p>' : ""}
      ${opciones("legal_entrega", "¿Cómo entrega los equipos?", ENTREGAS.map((e) => ({ valor: e.clave, texto: e.nombre })), { multiple: true })}
      ${texto("legal_entrega_zonas", "Zonas de entrega", { max: 200, ayuda: "Ej.: Medellín y su área metropolitana; el resto del país con transportadora." })}
      <section class="sub-bloque" aria-labelledby="t-apple">
        <h3 id="t-apple">Relación con Apple</h3>
        ${declaraApple(t)
          ? texto("legal_apple_detalle", "Detalle de su relación con Apple", { multilinea: true, max: 400, ayuda: `Ej.: el tipo de autorización y desde cuándo. Los términos agregan: «${esc(tienda)} declara, bajo su responsabilidad, que esta información es cierta.»` })
          : `<p class="ayuda">${perfilDe(t) ? "Con su perfil, los términos dicen, sin cambios:" : "Si no es tienda oficial ni revendedor autorizado, los términos dicen, sin cambios:"}</p>
             <blockquote class="texto-fijo">${esc(independiente(tienda))}</blockquote>`}
      </section>
      ${siNo("legal_homologados", "¿Los equipos están homologados y con el IMEI registrado?", "Si responde que sí, los términos lo declaran.")}`;
    },

    5: () => `<h2 id="l-titulo">5. Herramientas de medición y publicidad</h2>
      <p class="ayuda">Cambian la Política de cookies, la de datos y el banner de cookies. Ninguna se carga antes de que la persona acepte su categoría.</p>
      <section class="sub-bloque" aria-labelledby="t-meta">
        <h3 id="t-meta">${esc(META.nombre)} y API de Conversiones</h3>
        <p class="ayuda">Siempre activos. ${esc(META.para)}</p>
        ${texto(META.campo, META.etiquetaId, { max: 30, ayuda: `Solo números. Ej.: ${META.ejemplo}.`, atributos: 'inputmode="numeric" spellcheck="false" autocomplete="off"' })}
        ${opciones("capi_solo_consentimiento", "¿Enviar a la API de Conversiones solo si la persona aceptó las cookies de publicidad?",
          [{ valor: "si", texto: "Sí", marcado: t.capi_solo_consentimiento !== false }, { valor: "no", texto: "No", marcado: t.capi_solo_consentimiento === false }], { ayuda: AYUDA_CAPI })}
      </section>
      ${OPCIONALES.map((h) => `<section class="sub-bloque" aria-labelledby="t-${h.clave}">
        <h3 id="t-${h.clave}">${esc(h.nombre)}</h3>
        <p class="ayuda" id="l-${h.activo}-ayuda">${esc(h.para)}</p>
        ${interruptorLegal(h.activo, `Usar ${h.nombre}`, `l-${h.activo}-ayuda`)}
        ${t[h.activo] ? texto(h.campo, h.etiquetaId, { max: 30, ayuda: `Ej.: ${h.ejemplo}.${h.clave === "clarity" ? ` ${AYUDA_CLARITY}` : ""}`, atributos: 'spellcheck="false" autocomplete="off"' }) : ""}
      </section>`).join("")}
      ${texto("plataforma_sitio", "Plataforma del sitio", { max: 80, ayuda: "Donde está alojado el CRM que recibe las cotizaciones. Aparece en la política de datos." })}`,

    6: () => `<h2 id="l-titulo">6. Vista previa y publicación</h2>
      <div id="l-faltan"></div>
      <div class="pestanas" role="tablist" aria-label="Documentos">
        ${DOCUMENTOS.map((d) => `<button type="button" class="pestana" role="tab" id="pestana-${d.clave}" data-documento="${d.clave}" aria-controls="panel-${d.clave}" aria-selected="${d.clave === documento}" tabindex="${d.clave === documento ? 0 : -1}">${esc(d.clave === "aviso" ? "Aviso del pop-up" : d.titulo)}</button>`).join("")}
      </div>
      ${DOCUMENTOS.map((d) => `<div class="panel-pestana" role="tabpanel" id="panel-${d.clave}" aria-labelledby="pestana-${d.clave}" tabindex="0" ${d.clave === documento ? "" : "hidden"}>
        <div class="vista-previa-legal" data-previa="${d.clave}"></div>
        ${t[d.clausula] || tocados.has(d.clausula)
          ? texto(d.clausula, `Cláusula propia: ${d.clave === "aviso" ? "aviso del pop-up" : d.titulo}`, { multilinea: true, max: 4000, ayuda: "Va al final del documento, en «Condiciones adicionales de la tienda». Mismo formato: ## para títulos y - para listas." })
          : `<button type="button" class="boton boton--secundario" data-agregar-clausula="${d.clausula}">Agregar una cláusula propia</button>`}
      </div>`).join("")}
      <div class="publicar-legales">
        <button type="button" class="boton boton--primario boton--grande" id="l-publicar" aria-describedby="l-publicar-ayuda">Publicar textos legales</button>
        <p class="ayuda" id="l-publicar-ayuda"></p>
      </div>`
  };

  // Paso 6: lo que cambia con cada guardado (sin tocar las cláusulas que se
  // están escribiendo).
  function pintarPublicacion(lista = faltantes(t)) {
    if (paso !== 6) return;
    const docs = lista.length ? null : generar(t);
    const pub = t.legal_publicado;
    const alDia = pasoCompleto(t, 6, lista);
    $("#l-faltan").innerHTML = lista.length ? `<h3 id="t-faltan">Lo que falta</h3>
      <ul class="avisos" aria-labelledby="t-faltan">${lista.map((f) => `<li><span>${esc(f.texto)}</span><a href="${f.paso === 0 ? "#/tienda" : `#/legales/${f.paso}?campo=${encodeURIComponent(f.campo)}`}">Resolver</a></li>`).join("")}</ul>` : "";
    for (const d of DOCUMENTOS) {
      $(`[data-previa="${d.clave}"]`, caja).innerHTML = docs
        ? formatoBasico(pub && alDia ? conVigencia(pub, d.clave) : `${docs[d.clave]}\n\nVigente desde ${fechaDMA(hoyColombia())} · versión ${(pub?.version || 0) + 1}.`)
        : "<p>La vista previa aparece cuando no falte ningún dato.</p>";
    }
    $("#l-publicar").disabled = Boolean(lista.length || alDia);
    $("#l-publicar-ayuda").textContent = lista.length ? "Se habilita cuando no falte ningún dato." : alDia ? "Los textos publicados están al día." : pub ? "Hay cambios sin publicar." : "Todavía no hay textos publicados.";
  }

  // --- Errores por campo ----------------------------------------------------------
  function mensajeError(campo) {
    const v = campo.startsWith("legal_impuestos.") ? null : t[campo];
    const vacio = v === null || v === undefined || String(v).trim() === "" || (Array.isArray(v) && !v.length);
    if (campo === "legal_doc_numero" && !vacio) {
      const d = documentosDe(t.legal_paises).find((x) => x.clave === t.legal_doc_tipo);
      return `Revise el número: sin puntos ni espacios${d ? `, como ${d.ejemplo}` : ""}.`;
    }
    if (campo === "legal_correo" && !vacio) return "Revise el correo.";
    if (campo === "legal_telefono" && !vacio) return "Escriba solo números, con el indicativo del país. Ej.: 573001234567.";
    if (campo === "legal_garantia_nuevos" && !vacio) {
      const min = Math.max(1, ...modulosDe(t.legal_paises).map((m) => m.consumo.garantiaNuevosMinMeses));
      return min > 1 ? `Con Colombia, la garantía de los equipos nuevos debe ser de ${min} meses o más.` : "Escriba los meses de garantía.";
    }
    if (campo === "legal_paises") return vacio ? "Elija al menos un país." : "Solo se pueden elegir países disponibles.";
    if (/^legal_impuestos\.\d+\.porcentaje$/.test(campo)) return "Escriba un porcentaje entre 0 y 100.";
    if (/^legal_impuestos\.\d+\.incluido$/.test(campo)) return "Indique si está incluido.";
    if (campo === "legal_impuestos") return "Agregue al menos un impuesto.";
    if (DOCUMENTOS.some((d) => d.clausula === campo)) return "Quite las marcas del texto anterior ([PENDIENTE: …] y {{…}}).";
    const h = HERRAMIENTAS.find((x) => x.campo === campo);
    if (h && !vacio) return `Revise el ${h.etiquetaId}. Ej.: ${h.ejemplo}.`;
    if (["legal_perfil", "legal_tipo_persona", "legal_doc_tipo", "legal_garantia_usados", "legal_retracto_canal", "legal_homologados", "legal_entrega"].includes(campo)) return "Elija una opción.";
    return "Complete este dato.";
  }

  function pintarErrores(lista = faltantes(t)) {
    const malos = new Map(lista.map((f) => [f.campo, f]));
    $$(".error-campo", caja).forEach((p) => {
      const campo = p.id.replace(/^l-/, "").replace(/-error$/, "");
      const mostrar = malos.has(campo) && tocados.has(campo);
      p.textContent = mostrar ? mensajeError(campo) : "";
      const [, n, c] = campo.split(".");
      const control = document.getElementById(n ? `imp-${n}-${c}` : `l-${campo}`);
      if (control?.matches("input:not([type=radio]):not([type=checkbox]), select, textarea")) control.setAttribute("aria-invalid", String(mostrar));
    });
  }

  function pintarEstado(lista = faltantes(t)) {
    const pub = t.legal_publicado;
    const completos = [1, 2, 3, 4, 5, 6].filter((n) => pasoCompleto(t, n, lista));
    $("#l-estado").innerHTML = pub
      ? `Publicados: <strong>versión ${pub.version}</strong>, vigentes desde <strong class="cifras">${fechaDMA(pub.vigente_desde)}</strong>.`
      : "Todavía no están publicados. Mientras tanto, el pop-up no envía pedidos y las páginas legales dicen «Página en preparación».";
    $("#l-progreso").value = completos.length;
    $("#l-progreso-texto").textContent = `${completos.length} de 6 pasos completos`;
    $("#l-pasos").innerHTML = PASOS.map((nombre, i) => {
      const n = i + 1;
      const hecho = completos.includes(n);
      return `<li><a href="#/legales/${n}" class="paso-legal${hecho ? " paso-legal--hecho" : ""}" ${n === paso ? 'aria-current="step"' : ""}>
        <span class="paso-legal-numero" aria-hidden="true">${hecho ? "✓" : n}</span><span>${esc(nombre)}<span class="oculto-visual">${hecho ? ", completo" : ", falta completar"}</span></span></a></li>`;
    }).join("");
  }

  function pintarPaso(enfocar = null) {
    caja.innerHTML = PINTAR[paso]();
    $("#l-anterior").hidden = paso === 1;
    $("#l-siguiente").hidden = paso === 6;
    pintarEstado();
    pintarErrores();
    pintarPublicacion();
    if (enfocar) document.getElementById(enfocar)?.focus();
  }

  // --- Guardado ---------------------------------------------------------------
  const aviso = (txt) => { if (form.isConnected) $("#l-guardado").textContent = txt; };
  function guardar() {
    clearTimeout(reloj);
    const cambios = { ...pendientes };
    for (const k of Object.keys(pendientes)) delete pendientes[k];
    if (!Object.keys(cambios).length) return guardando;
    aviso("Guardando…");
    guardando = guardando.then(async () => {
      try {
        const antes = t.legal_publicado?.version;
        t = { ...t, ...(await ctx.api.guardarTienda(cambios)), ...pendientes };
        ctx.tienda = t;
        aviso(t.legal_publicado && t.legal_publicado.version !== antes && antes
          ? `Guardado. Textos legales actualizados: versión ${t.legal_publicado.version}.`
          : "Guardado.");
      } catch (e) {
        aviso("");
        avisar(e?.message || "No se pudo guardar. Inténtelo de nuevo.", "error");
        t = { ...(await ctx.api.leerTienda()), ...pendientes };
      }
      // Si la persona ya salió de Legales, el guardado terminó y no hay qué pintar.
      if (!form.isConnected) return;
      const lista = faltantes(t);
      pintarEstado(lista);
      pintarErrores(lista);
      pintarPublicacion(lista);
    });
    return guardando;
  }
  function cambiar(campo, valor, { esperar = false } = {}) {
    t[campo] = valor;
    pendientes[campo] = valor;
    tocados.add(campo);
    clearTimeout(reloj);
    if (esperar) reloj = setTimeout(guardar, ESPERA_TEXTO); else guardar();
  }
  // Saca la lista de impuestos del formulario (al escribir, sin redibujar).
  function impuestoDe(el) {
    const n = Number(el.dataset.imp);
    const lista = structuredClone(t.legal_impuestos || []);
    const fila = { nombre: "", porcentaje: null, incluido: null, ...lista[n] };
    const c = el.dataset.impCampo;
    if (c === "nombre") fila.nombre = el.value;
    if (c === "porcentaje") { const p = numero(el.value); fila.porcentaje = Number.isFinite(p) ? p : p === null ? null : el.value; }
    if (c === "incluido") fila.incluido = el.value === "si";
    lista[n] = fila;
    tocados.add(`legal_impuestos.${n}.${c}`);
    return lista;
  }

  form.addEventListener("input", (e) => {
    const el = e.target;
    if (el.dataset.imp !== undefined && el.type !== "radio") { cambiar("legal_impuestos", impuestoDe(el), { esperar: true }); return; }
    if (!el.dataset.campo || el.type === "radio" || el.type === "checkbox" || el.tagName === "SELECT") return;
    const v = el.dataset.tipo === "entero" ? (numero(el.value) === null ? null : Number.isInteger(numero(el.value)) ? numero(el.value) : el.value) : el.value;
    // Un entero mal escrito no se guarda (el SQL lo rechazaría): queda el error.
    if (el.dataset.tipo === "entero" && v !== null && (!Number.isInteger(v) || v < 1 || v > 120)) {
      t[el.dataset.campo] = v; tocados.add(el.dataset.campo); pintarErrores(); return;
    }
    cambiar(el.dataset.campo, v, { esperar: true });
  });
  form.addEventListener("change", (e) => {
    const el = e.target;
    if (el.dataset.imp !== undefined) {
      if (el.type === "radio") cambiar("legal_impuestos", impuestoDe(el)); else guardar();
      return;
    }
    const campo = el.dataset.campo;
    if (!campo) return;
    if (el.type === "text" || el.type === "email" || el.type === "tel" || el.tagName === "TEXTAREA" || el.dataset.tipo === "entero") {
      tocados.add(campo); guardar(); pintarErrores(); return;
    }
    let v;
    if (el.dataset.tipo === "lista") v = $$(`[name="l-${campo}"]:checked`, caja).map((x) => x.value);
    else if (el.dataset.tipo === "bool") v = el.checked;
    else if (campo === "capi_solo_consentimiento") v = el.value === "si";
    else v = el.value;
    cambiar(campo, v);
    // Lo que cambia la forma del paso (perfil, tipo de persona, garantía, etc.)
    pintarPaso(el.id);
  });
  form.addEventListener("focusout", (e) => {
    const campo = e.target.dataset?.campo;
    if (campo && !tocados.has(campo) && e.target.type !== "radio" && e.target.type !== "checkbox") { tocados.add(campo); pintarErrores(); }
  });
  form.addEventListener("submit", (e) => e.preventDefault());

  caja.addEventListener("click", async (e) => {
    const quitar = e.target.closest("[data-quitar-impuesto]");
    if (quitar) {
      const lista = structuredClone(t.legal_impuestos || []);
      lista.splice(Number(quitar.dataset.quitarImpuesto), 1);
      cambiar("legal_impuestos", lista);
      pintarPaso("l-agregar-impuesto");
      return;
    }
    if (e.target.closest("#l-agregar-impuesto")) {
      cambiar("legal_impuestos", [...structuredClone(t.legal_impuestos || []), { nombre: "", porcentaje: null, incluido: null }]);
      pintarPaso(`imp-${t.legal_impuestos.length - 1}-nombre`);
      return;
    }
    const clausula = e.target.closest("[data-agregar-clausula]");
    if (clausula) { tocados.add(clausula.dataset.agregarClausula); pintarPaso(`l-${clausula.dataset.agregarClausula}`); return; }
    const pestana = e.target.closest("[data-documento]");
    if (pestana) { elegirDocumento(pestana.dataset.documento); return; }
    if (e.target.closest("#l-publicar")) {
      await guardar();
      if (faltantes(t).length) return pintarPaso();
      try {
        const nuevo = publicar(t, t.legal_publicado);
        t = await conBoton($("#l-publicar"), () => ctx.api.guardarTienda({ legal_publicado: nuevo }), { exito: "Textos legales publicados" });
        ctx.tienda = t;
        aviso(`Publicados: versión ${t.legal_publicado.version}.`);
        pintarPaso("l-titulo");
      } catch { /* aviso mostrado */ }
    }
  });
  function elegirDocumento(clave, enfocar = true) {
    documento = clave;
    $$("[data-documento]", caja).forEach((b) => {
      const si = b.dataset.documento === clave;
      b.setAttribute("aria-selected", String(si));
      b.tabIndex = si ? 0 : -1;
      if (si && enfocar) b.focus();
    });
    $$('[role="tabpanel"]', caja).forEach((p) => { p.hidden = p.id !== `panel-${clave}`; });
  }
  caja.addEventListener("keydown", (e) => {
    const b = e.target.closest("[data-documento]");
    if (!b) return;
    const claves = DOCUMENTOS.map((d) => d.clave);
    const i = claves.indexOf(b.dataset.documento);
    const n = claves.length;
    const destino = { ArrowRight: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, Home: 0, End: n - 1 }[e.key];
    if (destino === undefined) return;
    e.preventDefault();
    elegirDocumento(claves[destino]);
  });

  // --- Navegación entre pasos ---------------------------------------------------
  async function irA(n, enfocar = "l-titulo") {
    await guardar();
    paso = n;
    ctx.marcarRuta(`legales/${n}`);
    if (t.legal_paso !== n) { t.legal_paso = n; pendientes.legal_paso = n; guardar(); }
    pintarPaso(enfocar);
    window.scrollTo(0, 0);
  }
  $("#l-anterior").addEventListener("click", () => irA(paso - 1));
  $("#l-siguiente").addEventListener("click", () => irA(paso + 1));
  $("#l-pasos").addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='#/legales/']");
    if (!a) return;
    e.preventDefault();
    irA(Number(a.getAttribute("href").split("/")[2]));
  });
  // La lista de lo que falta: lleva al paso y enfoca el campo.
  caja.addEventListener("click", (e) => {
    const a = e.target.closest("a[href^='#/legales/']");
    if (!a) return;
    e.preventDefault();
    const [ruta, query] = a.getAttribute("href").split("?");
    const campo = new URLSearchParams(query).get("campo");
    if (campo) tocados.add(campo);
    irA(Number(ruta.split("/")[2]), idDeCampo(campo));
  });
  const idDeCampo = (campo) => {
    if (!campo) return "l-titulo";
    const m = campo.match(/^legal_impuestos\.(\d+)\.(\w+)$/);
    if (m) return m[2] === "incluido" ? `imp-${m[1]}-si` : `imp-${m[1]}-${m[2]}`;
    const h = OPCIONALES.find((x) => x.campo === campo);
    if (h && !t[h.activo]) return `l-${h.activo}`;
    return document.getElementById(`l-${campo}`)?.matches("fieldset") ? `l-${campo}-0` : `l-${campo}`;
  };

  ctx.alSalir = () => { guardar(); };
  const campo = params.get("campo");
  if (campo) tocados.add(campo);
  if (String(resto[0] || "") !== String(paso)) ctx.marcarRuta(`legales/${paso}${campo ? `?campo=${encodeURIComponent(campo)}` : ""}`);
  pintarPaso();
  if (campo) {
    const id = idDeCampo(campo);
    // Un fieldset se enfoca por su primera opción (el id se calcula después de pintar)
    (document.getElementById(id) || document.getElementById(`${id}-0`) || $("#l-titulo"))?.focus();
  }
}

export { MARCAS, idValido };
