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
// - Idioma: el texto del asistente sale de los diccionarios (claves
//   panel.legales.* y legal.*). Lo que va dentro de los documentos (vista
//   previa, citas de los términos) sigue en español y se marca con lang="es".
// =============================================================================

import { formatoBasico } from "../utils.js";
import { PASOS, PERFILES, ENTREGAS, DOCUMENTOS, MARCAS, textoSinModulo, faltantes, generar, publicar, conVigencia, perfilDe, declaraApple, necesitaLocal, fechaDMA, hoyColombia, contexto } from "../legal/motor.js";
import { PAISES, PAISES_DISPONIBLES, ESTADOS, documentosDe, modulosDe } from "../legal/paises/indice.js";
import { HERRAMIENTAS, OPCIONALES, idValido } from "../legal/herramientas.js";
import { independiente } from "../legal/plantillas/terminos.js";
import { $, $$, esc, avisar, conBoton } from "./ui.js";
import { t as tr, idiomaActual } from "../i18n/i18n.js";
import { whatsappValido } from "../datos/paises.js";

const META = HERRAMIENTAS[0];
const ESPERA_TEXTO = 700;
// Nombre y etiqueta del ID de una herramienta, en el idioma en uso.
const nombreH = (h) => tr(`legal.herramienta.${h.clave}.nombre`);
const idH = (h) => tr(`legal.herramienta.${h.clave}.id`);

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
    <div class="vista-cabecera"><h1>${esc(tr("panel.legales.titulo"))}</h1>
      <p>${esc(tr("panel.legales.intro"))}</p></div>
    <section class="bloque" aria-labelledby="t-progreso">
      <h2 id="t-progreso" class="oculto-visual">${esc(tr("panel.legales.progreso"))}</h2>
      <p class="estado-legales" id="l-estado"></p>
      <div class="progreso-legales"><progress id="l-progreso" max="6" aria-labelledby="l-progreso-texto"></progress><span id="l-progreso-texto" class="cifras"></span></div>
      <ol class="pasos-legales" id="l-pasos"></ol>
    </section>
    <form id="form-legales" novalidate>
      <section class="bloque" id="l-paso" aria-labelledby="l-titulo"></section>
      <p class="estado-guardado" id="l-guardado" role="status" aria-live="polite"></p>
      <div class="acciones-pasos">
        <button type="button" class="boton boton--secundario" id="l-anterior">${esc(tr("panel.legales.anterior"))}</button>
        <button type="button" class="boton boton--primario" id="l-siguiente">${esc(tr("panel.legales.siguiente"))}</button>
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
  function entero(campo, etiqueta, { ayuda = "", sufijo = tr("panel.legales.meses") } = {}) {
    return `<div class="campo"><label for="l-${campo}">${esc(etiqueta)}</label>
      ${ayuda ? `<p class="ayuda" id="l-${campo}-ayuda">${ayuda}</p>` : ""}
      <div class="entrada-con-sufijo"><input class="entrada cifras" id="l-${campo}" data-campo="${campo}" data-tipo="entero" inputmode="numeric" maxlength="3" value="${t[campo] ?? ""}" ${describir(campo, ayuda)}><span aria-hidden="true">${esc(sufijo)}</span></div>
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
  const siNo = (campo, leyenda, ayuda = "") => opciones(campo, leyenda, [{ valor: "si", texto: tr("panel.legales.si") }, { valor: "no", texto: tr("panel.legales.no") }], { ayuda });
  const interruptorLegal = (campo, etiqueta, describe = "") => `<label class="interruptor" for="l-${campo}"><input type="checkbox" role="switch" id="l-${campo}" data-campo="${campo}" data-tipo="bool" ${t[campo] ? "checked" : ""} ${describe ? `aria-describedby="${describe}"` : ""}><span>${esc(etiqueta)}</span></label>`;
  // Un enlace a Mi tienda dentro de una frase traducida.
  const enlaceTienda = (clave) => `<a href="#/tienda">${esc(tr(clave))}</a>`;
  // Nombre de un documento en el panel (la pestaña del aviso dice "Aviso del pop-up").
  const nombreDocumento = (d, minuscula = false) => (d.clave === "aviso"
    ? tr(minuscula ? "panel.legales.aviso_popup.min" : "panel.legales.aviso_popup")
    : tr(`legal.documento.${d.clave}`));

  // --- Los pasos ---------------------------------------------------------------
  const PINTAR = {
    1: () => `<h2 id="l-titulo">${esc(tr("panel.legales.paso1.titulo"))}</h2>
      ${opciones("legal_perfil", tr("panel.legales.perfil.leyenda"), PERFILES.map((p) => ({ valor: p.clave, texto: tr(`legal.perfil.${p.clave}`) })),
        { ayuda: esc(tr("panel.legales.perfil.ayuda")) })}`,

    2: () => {
      const juridica = t.legal_tipo_persona === "juridica";
      const docs = documentosDe(t.legal_paises);
      const doc = docs.find((d) => d.clave === t.legal_doc_tipo);
      const perfil = perfilDe(t);
      const pais = modulosDe(t.legal_paises)[0] || modulosDe(["co"])[0];
      const ayudaNumero = [
        tr("panel.legales.doc_numero.ayuda"),
        doc ? tr("panel.legales.doc_numero.ejemplo", { ejemplo: doc.ejemplo }) : "",
        doc?.clave === "nit" ? tr("panel.legales.doc_numero.nit") : ""
      ].filter(Boolean).join(" ");
      return `<h2 id="l-titulo">${esc(tr("panel.legales.paso2.titulo"))}</h2>
      <p class="ayuda">${esc(tr("panel.legales.paso2.intro"))}</p>
      ${opciones("legal_tipo_persona", tr("panel.legales.tipo_persona.leyenda"), [{ valor: "natural", texto: tr("panel.legales.tipo_persona.natural") }, { valor: "juridica", texto: tr("panel.legales.tipo_persona.juridica") }])}
      ${texto("legal_nombre", juridica ? tr("panel.legales.razon_social") : tr("panel.legales.nombre_completo"), { atributos: 'autocomplete="off"' })}
      <div class="grilla-2">
        <div class="campo"><label for="l-legal_doc_tipo">${esc(tr("panel.legales.doc_tipo"))}</label>
          <select class="entrada" id="l-legal_doc_tipo" data-campo="legal_doc_tipo" ${describir("legal_doc_tipo")}>
            <option value="">${esc(tr("panel.legales.elija_opcion"))}</option>
            ${docs.map((d) => `<option value="${d.clave}" ${d.clave === t.legal_doc_tipo ? "selected" : ""}>${esc(d.nombre)}</option>`).join("")}
          </select>${err("legal_doc_tipo")}</div>
        ${texto("legal_doc_numero", tr("panel.legales.doc_numero"), { max: 20, ayuda: esc(ayudaNumero), atributos: 'autocomplete="off" spellcheck="false"' })}
      </div>
      <div class="grilla-2">
        ${texto("legal_direccion", tr("panel.legales.direccion"), { atributos: 'autocomplete="street-address"' })}
        ${texto("legal_ciudad", tr("panel.legales.ciudad"), { max: 80, atributos: 'autocomplete="address-level2"' })}
      </div>
      <div class="grilla-2">
        ${texto("legal_correo", tr("panel.legales.correo"), { tipo: "email", ayuda: esc(tr("panel.legales.correo.ayuda")), atributos: 'inputmode="email" autocomplete="email"' })}
        ${texto("legal_telefono", tr("panel.legales.telefono"), { tipo: "tel", max: 20, ayuda: esc(tr("panel.legales.telefono.ayuda")), atributos: 'inputmode="tel" autocomplete="tel"' })}
      </div>
      ${juridica ? `${texto("legal_representante", tr("panel.legales.representante"))}
      <div class="grilla-2">
        ${texto("legal_matricula_numero", tr("panel.legales.matricula_numero"), { max: 40 })}
        ${texto("legal_matricula_camara", tr("panel.legales.matricula_camara"), { max: 80, ayuda: esc(tr("panel.legales.matricula_camara.ayuda")) })}
      </div>` : ""}
      ${!perfil || necesitaLocal(t) ? texto("legal_direccion_local", tr("panel.legales.direccion_local"), {
        ayuda: perfil ? "" : esc(tr("panel.legales.direccion_local.ayuda", { emprendedor: tr("legal.perfil.emprendedor"), particular: tr("legal.perfil.particular") }))
      }) : ""}
      ${opciones("legal_rnbd", tr("panel.legales.rnbd.leyenda"), [
        { valor: "si", texto: tr("panel.legales.rnbd.si") },
        { valor: "no", texto: tr("panel.legales.rnbd.no") },
        { valor: "", texto: tr("panel.legales.rnbd.vacio") }
      ], { ayuda: esc(tr("panel.legales.rnbd.ayuda", { autoridad: pais.autoridad.corto, norma: pais.datos.rnbd })) })}`;
    },

    3: () => `<h2 id="l-titulo">${esc(tr("panel.legales.paso3.titulo"))}</h2>
      ${PAISES_DISPONIBLES.includes(t.pais) ? "" : `<div class="aviso-legal" id="l-pais" tabindex="-1" role="note">
        <p>${esc(textoSinModulo(t.pais))}</p>
        <p>${tr("panel.legales.pais.elegir", { enlace: enlaceTienda("panel.legales.mi_tienda") })}</p></div>`}
      ${opciones("legal_paises", tr("panel.legales.paises.leyenda"), PAISES.map((p) => ({
        valor: p.codigo, texto: tr(`pais.${p.codigo}`), desactivado: p.estado !== "disponible" && !(t.legal_paises || []).includes(p.codigo),
        nota: p.estado === "disponible" ? "" : p.nota || ESTADOS[p.estado] || ESTADOS.proximamente
      })), { multiple: true, ayuda: esc(tr("panel.legales.paises.ayuda")) })}`,

    4: () => {
      // La tienda tal como la nombran los términos (texto del documento: en español).
      const tienda = contexto(t).tienda || tr("legal.doc.la_tienda", undefined, "es");
      return `<h2 id="l-titulo">${esc(tr("panel.legales.paso4.titulo"))}</h2>
      <fieldset class="opciones-legales" id="l-legal_impuestos" ${describir("legal_impuestos", "imp")}>
        <legend>${esc(tr("panel.legales.impuestos.leyenda"))}</legend>
        <p class="ayuda" id="l-legal_impuestos-ayuda">${esc(tr("panel.legales.impuestos.ayuda"))}</p>
        <ul class="lista-impuestos">${(t.legal_impuestos || []).map((i, n) => `<li class="fila-impuesto">
          <div class="campo"><label for="imp-${n}-nombre">${esc(tr("panel.legales.impuesto.nombre", { n: n + 1 }))}</label><input class="entrada" id="imp-${n}-nombre" data-imp="${n}" data-imp-campo="nombre" value="${esc(i?.nombre ?? "")}" maxlength="40" aria-describedby="l-legal_impuestos.${n}.nombre-error">${err(`legal_impuestos.${n}.nombre`)}</div>
          <div class="campo"><label for="imp-${n}-porcentaje">${esc(tr("panel.legales.impuesto.porcentaje"))}</label><div class="entrada-con-sufijo"><input class="entrada cifras" id="imp-${n}-porcentaje" data-imp="${n}" data-imp-campo="porcentaje" inputmode="decimal" maxlength="6" value="${i?.porcentaje == null ? "" : String(i.porcentaje).replace(".", ",")}" aria-describedby="l-legal_impuestos.${n}.porcentaje-error"><span aria-hidden="true">%</span></div>${err(`legal_impuestos.${n}.porcentaje`)}</div>
          <fieldset class="opciones-legales" aria-describedby="l-legal_impuestos.${n}.incluido-error"><legend>${esc(tr("panel.legales.impuesto.incluido"))}</legend>
            ${[["si", tr("panel.legales.si"), true], ["no", tr("panel.legales.no"), false]].map(([v, txt, b]) => `<label class="casilla" for="imp-${n}-${v}"><input type="radio" name="imp-${n}" id="imp-${n}-${v}" data-imp="${n}" data-imp-campo="incluido" value="${v}" ${i?.incluido === b ? "checked" : ""}><span>${esc(txt)}</span></label>`).join("")}
            ${err(`legal_impuestos.${n}.incluido`)}</fieldset>
          <button type="button" class="boton boton--secundario" data-quitar-impuesto="${n}">${esc(tr("panel.legales.impuesto.quitar", { n: n + 1 }))}</button>
        </li>`).join("")}</ul>
        ${err("legal_impuestos")}
        <button type="button" class="boton boton--secundario" id="l-agregar-impuesto" ${(t.legal_impuestos || []).length >= 6 ? "disabled" : ""}>${esc(tr("panel.legales.impuesto.agregar"))}</button>
      </fieldset>
      ${entero("legal_garantia_nuevos", tr("panel.legales.garantia_nuevos"), { ayuda: esc(tr("panel.legales.garantia_nuevos.ayuda")) })}
      ${opciones("legal_garantia_usados", tr("panel.legales.garantia_usados"), [{ valor: "con", texto: tr("panel.legales.garantia_usados.con") }, { valor: "sin", texto: tr("panel.legales.garantia_usados.sin") }])}
      ${t.legal_garantia_usados === "con" ? entero("legal_garantia_usados_meses", tr("panel.legales.garantia_usados_meses")) : ""}
      ${t.legal_garantia_usados === "sin" ? `<p class="aviso-datos" role="note">${esc(tr("panel.legales.garantia_usados.sin_aviso"))}</p>` : ""}
      ${opciones("legal_retracto_canal", tr("panel.legales.retracto.leyenda"), [
        { valor: "correo", texto: t.legal_correo ? tr("panel.legales.retracto.correo_con", { correo: t.legal_correo }) : tr("panel.legales.retracto.correo") },
        { valor: "whatsapp", texto: tr("panel.legales.retracto.whatsapp") }
      ], { ayuda: esc(tr("panel.legales.retracto.ayuda")) })}
      ${t.legal_retracto_canal === "whatsapp" && !whatsappValido(t.whatsapp || "", t.pais) ? `<p class="aviso-datos" role="note">${tr("panel.legales.retracto.falta_whatsapp", { enlace: enlaceTienda("panel.legales.retracto.completar") })}</p>` : ""}
      ${opciones("legal_entrega", tr("panel.legales.entrega.leyenda"), ENTREGAS.map((e) => ({ valor: e.clave, texto: tr(`legal.entrega.${e.clave}`) })), { multiple: true })}
      ${texto("legal_entrega_zonas", tr("panel.legales.entrega_zonas"), { max: 200, ayuda: esc(tr("panel.legales.entrega_zonas.ayuda")) })}
      <section class="sub-bloque" aria-labelledby="t-apple">
        <h3 id="t-apple">${esc(tr("panel.legales.apple.titulo"))}</h3>
        ${declaraApple(t)
          ? texto("legal_apple_detalle", tr("panel.legales.apple.detalle"), { multilinea: true, max: 400, ayuda: esc(tr("panel.legales.apple.ayuda", { cita: tr("legal.doc.apple_declara", { tienda }, "es") })) })
          : `<p class="ayuda">${esc(tr(perfilDe(t) ? "panel.legales.apple.con_perfil" : "panel.legales.apple.sin_perfil"))}</p>
             <blockquote class="texto-fijo" lang="es">${esc(independiente(tienda))}</blockquote>`}
      </section>
      ${siNo("legal_homologados", tr("panel.legales.homologados.leyenda"), esc(tr("panel.legales.homologados.ayuda")))}`;
    },

    5: () => `<h2 id="l-titulo">${esc(tr("panel.legales.paso5.titulo"))}</h2>
      <p class="ayuda">${esc(tr("panel.legales.paso5.intro"))}</p>
      <section class="sub-bloque" aria-labelledby="t-meta">
        <h3 id="t-meta">${esc(tr("panel.legales.meta.titulo", { nombre: nombreH(META) }))}</h3>
        <p class="ayuda">${esc(tr("panel.legales.meta.siempre", { para: tr(`legal.herramienta.${META.clave}.para`) }))}</p>
        ${texto(META.campo, idH(META), { max: 30, ayuda: esc(tr("panel.legales.meta.id_ayuda", { ejemplo: META.ejemplo })), atributos: 'inputmode="numeric" spellcheck="false" autocomplete="off"' })}
        ${opciones("capi_solo_consentimiento", tr("panel.legales.capi.leyenda"),
          [{ valor: "si", texto: tr("panel.legales.si"), marcado: t.capi_solo_consentimiento !== false }, { valor: "no", texto: tr("panel.legales.no"), marcado: t.capi_solo_consentimiento === false }], { ayuda: esc(tr("panel.legales.capi.ayuda")) })}
      </section>
      ${OPCIONALES.map((h) => `<section class="sub-bloque" aria-labelledby="t-${h.clave}">
        <h3 id="t-${h.clave}">${esc(nombreH(h))}</h3>
        <p class="ayuda" id="l-${h.activo}-ayuda">${esc(tr(`legal.herramienta.${h.clave}.para`))}</p>
        ${interruptorLegal(h.activo, tr("panel.legales.herramienta.usar", { nombre: nombreH(h) }), `l-${h.activo}-ayuda`)}
        ${t[h.activo] ? texto(h.campo, idH(h), {
          max: 30,
          ayuda: esc([tr("panel.legales.herramienta.ejemplo", { ejemplo: h.ejemplo }), h.clave === "clarity" ? tr("panel.legales.clarity.ayuda") : ""].filter(Boolean).join(" ")),
          atributos: 'spellcheck="false" autocomplete="off"'
        }) : ""}
      </section>`).join("")}
      ${texto("plataforma_sitio", tr("panel.legales.plataforma"), { max: 80, ayuda: esc(tr("panel.legales.plataforma.ayuda")) })}`,

    6: () => `<h2 id="l-titulo">${esc(tr("panel.legales.paso6.titulo"))}</h2>
      ${idiomaActual() === "es" ? "" : `<p class="ayuda" role="note">${esc(tr("panel.legales.solo_espanol"))}</p>`}
      <div id="l-faltan"></div>
      <div class="pestanas" role="tablist" aria-label="${esc(tr("panel.legales.documentos"))}">
        ${DOCUMENTOS.map((d) => `<button type="button" class="pestana" role="tab" id="pestana-${d.clave}" data-documento="${d.clave}" aria-controls="panel-${d.clave}" aria-selected="${d.clave === documento}" tabindex="${d.clave === documento ? 0 : -1}">${esc(nombreDocumento(d))}</button>`).join("")}
      </div>
      ${DOCUMENTOS.map((d) => `<div class="panel-pestana" role="tabpanel" id="panel-${d.clave}" aria-labelledby="pestana-${d.clave}" tabindex="0" ${d.clave === documento ? "" : "hidden"}>
        <div class="vista-previa-legal" data-previa="${d.clave}" lang="es"></div>
        ${t[d.clausula] || tocados.has(d.clausula)
          ? texto(d.clausula, tr("panel.legales.clausula.etiqueta", { documento: nombreDocumento(d, true) }), { multilinea: true, max: 4000, ayuda: esc(tr("panel.legales.clausula.ayuda")) })
          : `<button type="button" class="boton boton--secundario" data-agregar-clausula="${d.clausula}">${esc(tr("panel.legales.clausula.agregar"))}</button>`}
      </div>`).join("")}
      <div class="publicar-legales">
        <button type="button" class="boton boton--primario boton--grande" id="l-publicar" aria-describedby="l-publicar-ayuda">${esc(tr("panel.legales.publicar"))}</button>
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
    $("#l-faltan").innerHTML = lista.length ? `<h3 id="t-faltan">${esc(tr("panel.legales.faltan.titulo"))}</h3>
      <ul class="avisos" aria-labelledby="t-faltan">${lista.map((f) => `<li><span>${esc(f.texto)}</span><a href="${f.paso === 0 ? "#/tienda" : `#/legales/${f.paso}?campo=${encodeURIComponent(f.campo)}`}">${esc(tr("panel.legales.faltan.resolver"))}</a></li>`).join("")}</ul>` : "";
    for (const d of DOCUMENTOS) {
      // La vista previa es el documento: en español, con su pie de vigencia.
      $(`[data-previa="${d.clave}"]`, caja).innerHTML = docs
        ? formatoBasico(pub && alDia ? conVigencia(pub, d.clave) : `${docs[d.clave]}\n\n${tr("legal.doc.vigencia", { fecha: fechaDMA(hoyColombia()), version: (pub?.version || 0) + 1 }, "es")}`)
        : `<p lang="${esc(idiomaActual())}">${esc(tr("panel.legales.previa.vacia"))}</p>`;
    }
    $("#l-publicar").disabled = Boolean(lista.length || alDia);
    $("#l-publicar-ayuda").textContent = tr(lista.length ? "panel.legales.publicar.falta" : alDia ? "panel.legales.publicar.al_dia" : pub ? "panel.legales.publicar.cambios" : "panel.legales.publicar.nunca");
  }

  // --- Errores por campo ----------------------------------------------------------
  function mensajeError(campo) {
    const v = campo.startsWith("legal_impuestos.") ? null : t[campo];
    const vacio = v === null || v === undefined || String(v).trim() === "" || (Array.isArray(v) && !v.length);
    if (campo === "legal_doc_numero" && !vacio) {
      const d = documentosDe(t.legal_paises).find((x) => x.clave === t.legal_doc_tipo);
      return d ? tr("panel.legales.error.doc_numero.ejemplo", { ejemplo: d.ejemplo }) : tr("panel.legales.error.doc_numero");
    }
    if (campo === "legal_correo" && !vacio) return tr("panel.legales.error.correo");
    if (campo === "legal_telefono" && !vacio) return tr("panel.legales.error.telefono");
    if (campo === "legal_garantia_nuevos" && !vacio) {
      const min = Math.max(1, ...modulosDe(t.legal_paises).map((m) => m.consumo.garantiaNuevosMinMeses));
      return min > 1 ? tr("panel.legales.error.garantia_minima", { min }) : tr("panel.legales.error.garantia");
    }
    if (campo === "legal_paises") return tr(vacio ? "panel.legales.error.paises" : "panel.legales.error.paises_disponibles");
    if (/^legal_impuestos\.\d+\.porcentaje$/.test(campo)) return tr("panel.legales.error.porcentaje");
    if (/^legal_impuestos\.\d+\.incluido$/.test(campo)) return tr("panel.legales.error.incluido");
    if (campo === "legal_impuestos") return tr("panel.legales.error.impuestos");
    if (DOCUMENTOS.some((d) => d.clausula === campo)) return tr("panel.legales.error.marcas");
    const h = HERRAMIENTAS.find((x) => x.campo === campo);
    if (h && !vacio) return tr("panel.legales.error.herramienta", { id: idH(h), ejemplo: h.ejemplo });
    if (["legal_perfil", "legal_tipo_persona", "legal_doc_tipo", "legal_garantia_usados", "legal_retracto_canal", "legal_homologados", "legal_entrega"].includes(campo)) return tr("panel.legales.error.elija");
    return tr("panel.legales.error.complete");
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
      ? tr("panel.legales.estado.publicados", {
        version: `<strong>${esc(tr("panel.legales.estado.version", { n: pub.version }))}</strong>`,
        fecha: `<strong class="cifras">${esc(fechaDMA(pub.vigente_desde))}</strong>`
      })
      : esc(tr("panel.legales.estado.sin_publicar"));
    $("#l-progreso").value = completos.length;
    $("#l-progreso-texto").textContent = tr("panel.legales.progreso.texto", { n: completos.length });
    $("#l-pasos").innerHTML = PASOS.map((clave, i) => {
      const n = i + 1;
      const hecho = completos.includes(n);
      return `<li><a href="#/legales/${n}" class="paso-legal${hecho ? " paso-legal--hecho" : ""}" ${n === paso ? 'aria-current="step"' : ""}>
        <span class="paso-legal-numero" aria-hidden="true">${hecho ? "✓" : n}</span><span>${esc(tr(`legal.paso.${clave}`))}<span class="oculto-visual">${esc(tr(hecho ? "panel.legales.paso.completo" : "panel.legales.paso.falta"))}</span></span></a></li>`;
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
    aviso(tr("panel.legales.guardando"));
    guardando = guardando.then(async () => {
      try {
        const antes = t.legal_publicado?.version;
        t = { ...t, ...(await ctx.api.guardarTienda(cambios)), ...pendientes };
        ctx.tienda = t;
        aviso(t.legal_publicado && t.legal_publicado.version !== antes && antes
          ? tr("panel.legales.guardado.version", { version: t.legal_publicado.version })
          : tr("panel.legales.guardado"));
      } catch (e) {
        aviso("");
        avisar(e?.message || tr("panel.legales.error.guardar"), "error");
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
        t = await conBoton($("#l-publicar"), () => ctx.api.guardarTienda({ legal_publicado: nuevo }), { exito: tr("panel.legales.publicados.exito") });
        ctx.tienda = t;
        aviso(tr("panel.legales.publicados.version", { version: t.legal_publicado.version }));
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
