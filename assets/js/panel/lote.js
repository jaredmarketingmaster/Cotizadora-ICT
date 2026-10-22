// =============================================================================
// Agregar equipos en lote (ronda 3, D): un asistente que crea de una vez todas
// las variantes de un modelo (capacidades × colores; en usados, también las
// unidades de cada combinación).
//   1 Modelo · 2 Condición · 3 Capacidades · 4 Variantes (grilla) ·
//   5 Precio y stock · 6 Fotos y video por color · 7 Usados · 8 Publicar ·
//   9 Resumen
// Todo o nada: una sola llamada a api.crearEquiposLote (crear_equipos_lote en
// el SQL). Si falla, no se crea ninguno y se borran los archivos subidos aquí.
// Las fotos y el video de un color se suben una vez y se repiten en todos los
// equipos de ese color. Editar y Duplicar siguen en inventario.js.
// =============================================================================

import { formatearPrecio, formatearMiles, leerPrecio, CAPACIDADES_SUGERIDAS } from "../utils.js";
import { datosPais, paisActual } from "../datos/paises.js";
import { rutaMiniatura, ESTADOS_ESTETICOS, nombreColor, MAX_MAS_VENDIDOS, MAX_LOTE } from "../datos/comun.js";
import { etiquetaGeneracion } from "../sitio/catalogo.js";
import { $, $$, esc, avisar, conBoton, campoTexto, interruptor, marcarError, enfocarPrimerError } from "./ui.js";
import { comprimirFoto } from "./imagenes.js";
import { validarVideo } from "./video.js";
import { nombreEstado, nombreCondicion, rutasDeFotos } from "./inventario.js";
import { t as tr, tn } from "../i18n/i18n.js";

const MAX_FOTOS = 6;
const MAX_UNIDADES = 20;
const PASOS = ["modelo", "condicion", "capacidades", "grilla", "precio", "fotos", "usado", "publicar", "resumen"];
const ACEPTA_FOTOS = "image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif";
const usadoVacio = () => ({ bateria: "", estado: "", detalles: "", incluye: "" });
const nuevaRuta = (ext) => `equipos/${crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)}.${ext}`;

export async function dibujar(vista, ctx) {
  const { api } = ctx;
  const [equipos, modelos, listaColores] = await Promise.all([api.listarEquipos(), api.listarModelos(), api.listarColores()]);

  // Estado del asistente. Las claves de una variante son "<color>|<capacidad>"
  // (color = id del color, o "sin" si el modelo no tiene colores) y las de una
  // unidad de usado, "<variante>#<n>".
  const s = {
    modeloId: null, condicion: "", caps: new Set(), otraMarcada: false, otra: "", activar: true,
    apagadas: new Set(), unidades: new Map(), nombres: new Map(),
    mismoPrecio: true, precio: "", precios: new Map(), stock: true, excepciones: new Set(),
    medios: new Map(),
    usadoIgual: true, usado: usadoVacio(), usados: new Map(),
    publicado: false, destacado: false, masVendido: false, descripcion: ""
  };
  let paso = 0;
  let subiendo = 0;

  const generaciones = [];
  for (const m of [...modelos].sort((a, b) => b.orden - a.orden)) {
    let g = generaciones.find((x) => x.nombre === m.generacion);
    if (!g) { g = { nombre: m.generacion, modelos: [] }; generaciones.push(g); }
    g.modelos.push(m);
  }

  vista.innerHTML = `
    <a class="volver" href="#/inventario">${esc(tr("panel.inventario.volver"))}</a>
    <div class="vista-cabecera"><h1>${esc(tr("panel.lote.titulo"))}</h1><p>${esc(tr("panel.lote.intro"))}</p></div>
    <form id="form-lote" novalidate>
      <div class="pasos-progreso" id="lote-progreso" aria-hidden="true"></div>
      <p class="paso-titulo" id="paso-titulo" aria-live="polite"></p>

      <fieldset class="bloque" data-paso="modelo">
        <legend class="oculto-visual">${esc(tr("panel.inventario.modelo"))}</legend>
        <div class="campo">
          <label for="l-modelo">${esc(tr("panel.inventario.modelo"))}</label>
          <select class="entrada" id="l-modelo" aria-describedby="l-modelo-error">
            <option value="">${esc(tr("panel.inventario.elija_modelo"))}</option>
            ${generaciones.map((g) => `<optgroup label="${esc(etiquetaGeneracion(g.nombre))}">${g.modelos.map((m) => `<option value="${m.id}">${esc(m.nombre)}${m.activo ? "" : ` ${esc(tr("panel.inventario.inactivo"))}`}</option>`).join("")}</optgroup>`).join("")}
          </select>
          <p class="error-campo" id="l-modelo-error"></p>
        </div>
        <div id="aviso-inactivo" hidden>
          <p class="ayuda">${esc(tr("panel.inventario.aviso_inactivo"))}</p>
          ${interruptor({ id: "l-activar", etiqueta: tr("panel.inventario.activar_modelo"), marcado: true })}
        </div>
      </fieldset>

      <fieldset class="bloque" data-paso="condicion" aria-describedby="l-condicion-error">
        <legend>${esc(tr("panel.inventario.condicion"))}</legend>
        <div class="opciones-chip">
          ${["nuevo", "usado"].map((c) => `<label class="opcion-chip"><input type="radio" name="l-condicion" value="${c}"><span>${esc(nombreCondicion(c))}</span></label>`).join("")}
        </div>
        <p class="ayuda">${esc(tr("panel.lote.condicion_ayuda"))}</p>
        <p class="error-campo" id="l-condicion-error"></p>
      </fieldset>

      <fieldset class="bloque" data-paso="capacidades" aria-describedby="l-capacidades-ayuda l-capacidades-error">
        <legend>${esc(tr("panel.lote.paso.capacidades"))}</legend>
        <p class="ayuda" id="l-capacidades-ayuda">${esc(tr("panel.lote.capacidades_ayuda"))}</p>
        <div class="opciones-chip">
          ${CAPACIDADES_SUGERIDAS.map((c) => `<label class="opcion-chip"><input type="checkbox" name="l-cap" data-cap="${esc(c)}"><span>${esc(c)}</span></label>`).join("")}
          <label class="opcion-chip"><input type="checkbox" name="l-cap" id="l-otra-marcada"><span>${esc(tr("panel.inventario.otra"))}</span></label>
        </div>
        <div class="campo" id="caja-otra" hidden>
          <label for="l-otra">${esc(tr("panel.inventario.escriba_capacidad"))}</label>
          <input class="entrada" id="l-otra" maxlength="20" placeholder="${esc(tr("panel.inventario.capacidad_placeholder"))}" aria-describedby="l-otra-error">
          <p class="error-campo" id="l-otra-error"></p>
        </div>
        <p class="error-campo" id="l-capacidades-error"></p>
      </fieldset>

      <fieldset class="bloque" data-paso="grilla"><legend>${esc(tr("panel.lote.paso.grilla"))}</legend><div data-cuerpo="grilla"></div></fieldset>
      <fieldset class="bloque" data-paso="precio"><legend>${esc(tr("panel.lote.paso.precio"))}</legend><div data-cuerpo="precio"></div></fieldset>
      <fieldset class="bloque" data-paso="fotos"><legend>${esc(tr("panel.lote.paso.fotos"))}</legend><div data-cuerpo="fotos"></div></fieldset>
      <fieldset class="bloque" data-paso="usado"><legend>${esc(tr("panel.lote.paso.usado"))}</legend><div data-cuerpo="usado"></div></fieldset>
      <fieldset class="bloque" data-paso="publicar"><legend>${esc(tr("panel.lote.paso.publicar"))}</legend><div data-cuerpo="publicar"></div></fieldset>
      <fieldset class="bloque" data-paso="resumen"><legend>${esc(tr("panel.lote.paso.resumen"))}</legend><div data-cuerpo="resumen"></div>
        <p class="popup-alerta" id="l-error-lote" role="alert" hidden></p>
      </fieldset>

      <div class="acciones-formulario">
        <button type="button" class="boton boton--secundario" id="anterior">${esc(tr("panel.inventario.anterior"))}</button>
        <button type="button" class="boton boton--primario" id="siguiente">${esc(tr("panel.inventario.siguiente"))}</button>
        <button type="submit" class="boton boton--primario" id="guardar"></button>
      </div>
    </form>`;

  const form = $("#form-lote");
  const cuerpo = (k) => $(`[data-cuerpo="${k}"]`, form);

  // --- Datos derivados ---------------------------------------------------------

  const modelo = () => modelos.find((m) => m.id === s.modeloId);
  const esUsado = () => s.condicion === "usado";
  const pasosVisibles = () => PASOS.filter((k) => k !== "usado" || esUsado());

  function capacidades() {
    const lista = CAPACIDADES_SUGERIDAS.filter((c) => s.caps.has(c));
    const otra = s.otra.trim();
    if (s.otraMarcada && otra && !lista.some((c) => c.toLowerCase() === otra.toLowerCase())) lista.push(otra);
    return lista;
  }

  // Filas de la grilla: los colores oficiales del modelo, o una sola fila
  // "Sin color" si el modelo no tiene colores (un equipo por capacidad).
  function colores() {
    const m = modelo();
    if (!m) return [];
    const lista = listaColores.filter((c) => c.modelo_id === m.id).sort((a, b) => a.orden - b.orden);
    return lista.length
      ? lista.map((c) => ({ clave: String(c.id), id: c.id, color: c, nombre: c.nombre_en || c.nombre_es, sub: c.nombre_en ? c.nombre_es : "" }))
      : [{ clave: "sin", id: null, color: null, nombre: tr("panel.lote.sin_color"), sub: "" }];
  }

  const clave = (c, cap) => `${c.clave}|${cap}`;
  const unidadesDe = (k) => {
    const n = Number(s.unidades.get(k) ?? 1);
    return Number.isInteger(n) && n >= 1 ? Math.min(n, MAX_UNIDADES) : 1;
  };

  // Las combinaciones encendidas, en el orden de la grilla.
  function variantes() {
    const caps = capacidades();
    const lista = [];
    for (const c of colores()) {
      for (const cap of caps) {
        const k = clave(c, cap);
        if (!s.apagadas.has(k)) lista.push({ clave: k, c, cap, unidades: esUsado() ? unidadesDe(k) : 1 });
      }
    }
    return lista;
  }

  // Un equipo por variante (en usados, uno por unidad).
  function equiposDelLote() {
    const lista = [];
    for (const v of variantes()) for (let u = 1; u <= v.unidades; u++) lista.push({ v, u, clave: `${v.clave}#${u}` });
    return lista;
  }

  // Nombre del color que verá el cliente (el escrito aquí o el oficial).
  const nombreVisible = (c) => (c.color ? nombreColor(c.color, s.nombres.get(c.clave)) : (s.nombres.get(c.clave) || "").trim());
  const textoVariante = (v) => [v.c.color ? v.c.nombre : (s.nombres.get(v.c.clave) || "").trim() || v.c.nombre, v.cap].join(" · ");
  const coloresUsados = () => { const usados = new Set(variantes().map((v) => v.c.clave)); return colores().filter((c) => usados.has(c.clave)); };
  const medios = (k) => { if (!s.medios.has(k)) s.medios.set(k, { fotos: [], video: "" }); return s.medios.get(k); };
  const precioDe = (v) => leerPrecio(s.mismoPrecio ? s.precio : s.precios.get(v.clave) ?? "");
  const stockDe = (v) => s.stock !== s.excepciones.has(v.clave);
  const muestra = (c) => `<span class="muestra-color${c.color?.hex ? "" : " muestra-color--vacia"}" ${c.color?.hex ? `style="background:${esc(c.color.hex)}"` : ""} aria-hidden="true"></span>`;

  // --- 1 a 3: modelo, condición y capacidades (fijos) ---------------------------

  // Cambiar el modelo empieza de nuevo la grilla: los colores son otros. Las
  // fotos ya subidas eran de los colores del modelo anterior: se borran.
  function cambiarModelo(id) {
    if (id === s.modeloId) return;
    s.modeloId = id;
    for (const m of [s.apagadas, s.unidades, s.nombres, s.precios, s.excepciones, s.usados]) m.clear();
    borrarMedios();
    const m = modelo();
    $("#aviso-inactivo").hidden = !m || m.activo;
  }

  // --- 4: grilla de variantes -------------------------------------------------

  function dibujarGrilla() {
    const caps = capacidades();
    const filas = colores();
    const sinColores = filas[0]?.clave === "sin";
    cuerpo("grilla").innerHTML = `
      <p class="ayuda">${esc(tr(esUsado() ? "panel.lote.grilla_ayuda_usado" : "panel.lote.grilla_ayuda"))}</p>
      ${sinColores ? `<p class="ayuda">${esc(tr("panel.lote.sin_colores_ayuda"))}</p>` : ""}
      <div class="grilla-lote-caja">
        <table class="grilla-lote">
          <caption class="oculto-visual">${esc(tr("panel.lote.grilla_titulo"))}</caption>
          <thead><tr>
            <th scope="col">${esc(tr("panel.inventario.color"))}</th>
            ${caps.map((cap, j) => `<th scope="col"><label class="lote-encabezado"><input type="checkbox" data-columna="${j}" aria-label="${esc(tr("panel.lote.toda_la_columna", { capacidad: cap }))}"><span>${esc(cap)}</span></label></th>`).join("")}
          </tr></thead>
          <tbody>
            ${filas.map((c, i) => `<tr>
              <th scope="row"><label class="lote-encabezado lote-encabezado--fila"><input type="checkbox" data-fila="${i}" aria-label="${esc(tr("panel.lote.toda_la_fila", { color: c.nombre }))}">${muestra(c)}<span class="opcion-color-nombres"><span>${esc(c.nombre)}</span>${c.sub ? `<span class="ayuda">${esc(c.sub)}</span>` : ""}</span></label></th>
              ${caps.map((cap) => `<td><label class="interruptor interruptor--celda"><input type="checkbox" role="switch" data-celda="${esc(clave(c, cap))}"><span class="oculto-visual">${esc(tr("panel.lote.celda", { color: c.nombre, capacidad: cap }))}</span></label></td>`).join("")}
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
      <p class="lote-contador" id="lote-contador" role="status"></p>
      <p class="error-campo" id="l-grilla-error" role="alert"></p>
      <div id="lote-unidades"></div>
      <div class="lote-nombres">
        <h3>${esc(tr("panel.inventario.color_mostrar"))}</h3>
        <p class="ayuda">${esc(tr(sinColores ? "panel.lote.nombre_sin_color_ayuda" : "panel.inventario.color_mostrar_ayuda"))}</p>
        <div class="grilla-2">
          ${filas.map((c, i) => campoTexto({ id: `l-nombre-${i}`, etiqueta: c.nombre, valor: s.nombres.get(c.clave) || "", atributos: `maxlength="40" data-nombre="${esc(c.clave)}"` })).join("")}
        </div>
      </div>`;
    sincronizarGrilla();
  }

  // Pone cada interruptor, cada fila y cada columna según el estado (sin volver
  // a dibujar la tabla: el foco no se mueve).
  function sincronizarGrilla() {
    const caps = capacidades();
    const filas = colores();
    for (const el of $$("[data-celda]", form)) el.checked = !s.apagadas.has(el.dataset.celda);
    const marcar = (el, claves) => {
      const encendidas = claves.filter((k) => !s.apagadas.has(k)).length;
      el.checked = encendidas === claves.length;
      el.indeterminate = encendidas > 0 && encendidas < claves.length;
    };
    for (const el of $$("[data-fila]", form)) marcar(el, caps.map((cap) => clave(filas[Number(el.dataset.fila)], cap)));
    for (const el of $$("[data-columna]", form)) marcar(el, filas.map((c) => clave(c, caps[Number(el.dataset.columna)])));
    dibujarUnidades();
    contar();
  }

  function contar() {
    const el = $("#lote-contador");
    if (el) el.textContent = tn("panel.lote.contador", equiposDelLote().length);
  }

  // Usados: cuántas unidades hay de cada combinación (1 a 20).
  function dibujarUnidades() {
    const caja = $("#lote-unidades");
    if (!caja) return;
    if (!esUsado()) { caja.innerHTML = ""; return; }
    const lista = variantes();
    caja.innerHTML = lista.length ? `
      <h3>${esc(tr("panel.lote.unidades"))}</h3>
      <p class="ayuda" id="l-unidades-ayuda">${esc(tr("panel.lote.unidades_ayuda", { n: MAX_UNIDADES }))}</p>
      <div class="grilla-unidades">
        ${lista.map((v, i) => `<div class="campo">
          <label for="l-unidades-${i}">${esc(textoVariante(v))}</label>
          <input class="entrada cifras" id="l-unidades-${i}" type="number" inputmode="numeric" min="1" max="${MAX_UNIDADES}" value="${esc(s.unidades.get(v.clave) ?? 1)}" data-unidades="${esc(v.clave)}" aria-describedby="l-unidades-ayuda l-unidades-${i}-error">
          <p class="error-campo" id="l-unidades-${i}-error"></p>
        </div>`).join("")}
      </div>` : "";
  }

  // --- 5: precio y stock --------------------------------------------------------

  function dibujarPrecio() {
    const lista = variantes();
    const moneda = datosPais(paisActual()).moneda;
    const caps = capacidades().filter((cap) => lista.some((v) => v.cap === cap));
    cuerpo("precio").innerHTML = `
      ${interruptor({ id: "l-mismo-precio", etiqueta: tr("panel.lote.mismo_precio"), marcado: s.mismoPrecio })}
      ${s.mismoPrecio
        ? campoTexto({ id: "l-precio", etiqueta: tr("panel.inventario.precio_moneda", { moneda }), valor: s.precio, ayuda: esc(tr("panel.inventario.precio_ayuda")), atributos: 'inputmode="numeric" autocomplete="off"' })
        : `<p class="ayuda" id="l-precios-ayuda">${esc(tr("panel.lote.precios_ayuda", { moneda }))}</p>
           <div class="precios-lote">
           ${caps.map((cap) => `<fieldset class="precios-capacidad">
              <legend>${esc(cap)}</legend>
              ${lista.filter((v) => v.cap === cap).map((v) => {
                const i = lista.indexOf(v);
                return campoTexto({ id: `l-precio-${i}`, etiqueta: v.c.color ? v.c.nombre : textoVariante(v), valor: s.precios.get(v.clave) ?? "", atributos: `inputmode="numeric" autocomplete="off" data-precio="${esc(v.clave)}"` });
              }).join("")}
              <button type="button" class="boton boton--suave" data-copiar="${esc(cap)}" aria-label="${esc(tr("panel.lote.copiar_aria", { capacidad: cap }))}">${esc(tr("panel.lote.copiar"))}</button>
            </fieldset>`).join("")}
           </div>
           <p class="error-campo" id="l-precios-error" role="alert"></p>`}
      <div class="bloque-stock">
        ${interruptor({ id: "l-stock", etiqueta: tr("panel.lote.stock_general"), marcado: s.stock, estados: [tr("panel.inventario.con_stock"), tr("panel.inventario.sin_stock")] })}
        <p class="ayuda">${esc(tr("panel.inventario.stock_ayuda"))}</p>
        <details class="excepciones-stock" ${s.excepciones.size ? "open" : ""}>
          <summary id="l-excepciones-titulo">${esc(tr("panel.lote.excepciones", { n: lista.filter((v) => s.excepciones.has(v.clave)).length }))}</summary>
          <p class="ayuda">${esc(tr("panel.lote.excepciones_ayuda"))}</p>
          <div class="lista-excepciones">
            ${lista.map((v, i) => interruptor({ id: `l-stock-${i}`, etiqueta: textoVariante(v), marcado: stockDe(v), atributos: `data-stock="${esc(v.clave)}"`, estados: [tr("panel.inventario.con_stock"), tr("panel.inventario.sin_stock")] })).join("")}
          </div>
        </details>
      </div>`;
  }

  // "Copiar a toda la capacidad": el primer precio escrito de esa capacidad
  // pasa a todos sus colores.
  function copiarCapacidad(cap) {
    const lista = variantes().filter((v) => v.cap === cap);
    const primero = lista.map((v) => s.precios.get(v.clave)).find((p) => leerPrecio(p ?? ""));
    if (!primero) return;
    const texto = formatearMiles(leerPrecio(primero));
    for (const v of lista) s.precios.set(v.clave, texto);
    for (const el of $$("[data-precio]", form)) if (lista.some((v) => v.clave === el.dataset.precio)) el.value = texto;
  }

  // --- 6: fotos y video por color ------------------------------------------------

  function dibujarFotos() {
    const usados = coloresUsados();
    cuerpo("fotos").innerHTML = `
      <p class="ayuda">${esc(tr("panel.lote.fotos_ayuda", { n: MAX_FOTOS }))}</p>
      <p class="ayuda">${esc(tr("panel.inventario.fotos_ayuda", { n: MAX_FOTOS }))}</p>
      ${usados.map((c, i) => {
        const n = equiposDelLote().filter((e) => e.v.c.clave === c.clave).length;
        return `<section class="medios-color" data-color="${esc(c.clave)}" aria-labelledby="l-medios-${i}">
          <h3 class="medios-color-titulo" id="l-medios-${i}">${muestra(c)}<span>${esc(nombreVisible(c) || c.nombre)}</span> <span class="ayuda">${esc(tn("panel.lote.equipos_color", n))}</span></h3>
          <ul class="fotos-lista" data-lista-fotos="${esc(c.clave)}"></ul>
          <div class="zona-subida" data-zona="${esc(c.clave)}">
            <p>${esc(tr("panel.inventario.arrastre"))}</p>
            <div class="zona-subida-botones">
              <label class="boton boton--secundario" for="l-fotos-${i}">${esc(tr("panel.inventario.elegir_fotos"))}</label>
              <label class="boton boton--secundario" for="l-camara-${i}">${esc(tr("panel.inventario.usar_camara"))}</label>
            </div>
            <input class="oculto-visual" id="l-fotos-${i}" type="file" accept="${ACEPTA_FOTOS}" multiple data-fotos="${esc(c.clave)}">
            <input class="oculto-visual" id="l-camara-${i}" type="file" accept="image/*" capture="environment" data-fotos="${esc(c.clave)}">
          </div>
          <p class="subiendo" data-subiendo="${esc(c.clave)}" role="status" hidden></p>
          <p class="error-campo" data-error-fotos="${esc(c.clave)}" role="alert"></p>
          <div class="campo bloque-video">
            <span class="etiqueta" id="l-video-titulo-${i}">${esc(tr("panel.inventario.video"))}</span>
            <p class="ayuda" id="l-video-ayuda-${i}">${esc(tr("panel.inventario.video_ayuda"))}</p>
            <div data-video-actual="${esc(c.clave)}" data-indice="${i}"></div>
            <input class="oculto-visual" id="l-video-${i}" type="file" accept="video/mp4,video/webm,.mp4,.webm" data-video="${esc(c.clave)}" aria-describedby="l-video-ayuda-${i}">
            <p class="subiendo" data-subiendo-video="${esc(c.clave)}" role="status" hidden></p>
            <p class="error-campo" data-error-video="${esc(c.clave)}" role="alert"></p>
          </div>
        </section>`;
      }).join("")}`;
    for (const c of usados) { pintarFotos(c.clave); pintarVideo(c.clave); }
  }

  const porClave = (atributo, k) => $$(`[${atributo}]`, form).find((el) => el.getAttribute(atributo) === k);

  function pintarFotos(k) {
    const lista = porClave("data-lista-fotos", k);
    if (!lista) return;
    const fotos = medios(k).fotos;
    lista.innerHTML = fotos.map((r, i) => `<li class="foto-item" data-i="${i}">
      ${i === 0 ? `<span class="principal">${esc(tr("panel.inventario.principal"))}</span>` : ""}
      <img src="${esc(api.urlArchivo("fotos", rutaMiniatura(r)) || api.urlArchivo("fotos", r))}" alt="${esc(tr("panel.inventario.foto_alt", { n: i + 1 }))}">
      <div class="foto-botones">
        <button type="button" class="boton-icono" data-mover="-1" aria-label="${esc(tr("panel.inventario.foto_antes", { n: i + 1 }))}" ${i === 0 ? "disabled" : ""}>←</button>
        <button type="button" class="boton-icono" data-quitar aria-label="${esc(tr("panel.inventario.foto_quitar", { n: i + 1 }))}">✕</button>
        <button type="button" class="boton-icono" data-mover="1" aria-label="${esc(tr("panel.inventario.foto_despues", { n: i + 1 }))}" ${i === fotos.length - 1 ? "disabled" : ""}>→</button>
      </div>
    </li>`).join("");
    porClave("data-zona", k).hidden = fotos.length >= MAX_FOTOS;
  }

  function pintarVideo(k) {
    const caja = porClave("data-video-actual", k);
    if (!caja) return;
    const i = caja.dataset.indice;
    const video = medios(k).video;
    caja.innerHTML = video
      ? `<video class="video-vista" src="${esc(api.urlArchivo("videos", video))}" controls preload="metadata" playsinline aria-label="${esc(tr("panel.inventario.video_aria"))}"></video>
         <div class="zona-subida-botones"><label class="boton boton--secundario" for="l-video-${i}">${esc(tr("panel.inventario.cambiar_video"))}</label>
         <button type="button" class="boton boton--enlace" data-quitar-video="${esc(k)}">${esc(tr("panel.inventario.quitar_video"))}</button></div>`
      : `<label class="boton boton--secundario" for="l-video-${i}">${esc(tr("panel.inventario.elegir_video"))}</label>`;
  }

  // Cada foto se comprime y se sube una sola vez; su ruta se repite en todos
  // los equipos de ese color.
  async function agregarFotos(k, archivos) {
    const errorEl = porClave("data-error-fotos", k);
    errorEl.textContent = "";
    const m = medios(k);
    const lista = [...archivos].slice(0, MAX_FOTOS - m.fotos.length);
    if (archivos.length > lista.length) errorEl.textContent = tr("panel.inventario.max_fotos", { n: MAX_FOTOS });
    if (!lista.length) return;
    const estadoEl = porClave("data-subiendo", k);
    subiendo++;
    estadoEl.hidden = false;
    let i = 0;
    for (const archivo of lista) {
      estadoEl.innerHTML = `<span class="spinner" aria-hidden="true"></span>${esc(tr("panel.inventario.subiendo_fotos", { n: ++i, total: lista.length }))}`;
      try {
        const { grande, miniatura, ext } = await comprimirFoto(archivo);
        const ruta = nuevaRuta(ext);
        await api.subirArchivo("fotos", ruta, grande);
        await api.subirArchivo("fotos", rutaMiniatura(ruta), miniatura);
        m.fotos.push(ruta);
        ctx.sucio = true;
        pintarFotos(k);
      } catch (e) {
        errorEl.textContent = e.message;
      }
    }
    subiendo--;
    estadoEl.hidden = true;
  }

  async function agregarVideo(k, archivo) {
    const errorEl = porClave("data-error-video", k);
    const estadoEl = porClave("data-subiendo-video", k);
    errorEl.textContent = "";
    subiendo++;
    estadoEl.hidden = false;
    estadoEl.innerHTML = `<span class="spinner" aria-hidden="true"></span>${esc(tr("panel.inventario.revisando_video"))}`;
    try {
      // Se valida antes de subir: no se sube nada que no sirva.
      const { ext } = await validarVideo(archivo);
      estadoEl.innerHTML = `<span class="spinner" aria-hidden="true"></span>${esc(tr("panel.inventario.subiendo_video"))}`;
      const ruta = nuevaRuta(ext);
      await api.subirArchivo("videos", ruta, archivo);
      const m = medios(k);
      if (m.video) api.borrarArchivos("videos", [m.video]).catch(() => {});
      m.video = ruta;
      ctx.sucio = true;
      pintarVideo(k);
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      subiendo--;
      estadoEl.hidden = true;
    }
  }

  // Los archivos de este asistente no los usa ningún equipo hasta crear el
  // lote: se pueden borrar directo.
  function todosLosMedios() {
    const fotos = [];
    const videos = [];
    for (const m of s.medios.values()) { fotos.push(...m.fotos); if (m.video) videos.push(m.video); }
    return { fotos, videos };
  }
  async function borrarMedios() {
    const { fotos, videos } = todosLosMedios();
    s.medios.clear();
    await Promise.all([
      fotos.length && api.borrarArchivos("fotos", rutasDeFotos(fotos)).catch(() => {}),
      videos.length && api.borrarArchivos("videos", videos).catch(() => {})
    ]);
  }

  // --- 7: datos de los usados -----------------------------------------------------

  function camposUsado(sufijo, datos, unidad) {
    const id = (c) => `l-${c}${sufijo}`;
    const attr = (c) => `data-usado="${c}" data-unidad="${esc(unidad)}"`;
    return `<div class="grilla-2">
        ${campoTexto({ id: id("bateria"), etiqueta: tr("panel.inventario.bateria"), valor: datos.bateria, tipo: "number", ayuda: esc(tr("panel.inventario.bateria_ayuda")), atributos: `inputmode="numeric" min="0" max="100" ${attr("bateria")}` })}
        <div class="campo">
          <label for="${id("estado")}">${esc(tr("panel.inventario.estado_estetico"))}</label>
          <select class="entrada" id="${id("estado")}" aria-describedby="${id("estado")}-error" ${attr("estado")}>
            <option value="">${esc(tr("panel.inventario.elija_estado"))}</option>
            ${ESTADOS_ESTETICOS.map((e) => `<option value="${esc(e)}" ${datos.estado === e ? "selected" : ""}>${esc(nombreEstado(e))}</option>`).join("")}
          </select>
          <p class="error-campo" id="${id("estado")}-error"></p>
        </div>
      </div>
      ${campoTexto({ id: id("detalles"), etiqueta: tr("panel.inventario.detalles"), valor: datos.detalles, ayuda: esc(tr("panel.inventario.detalles_ayuda")), multilinea: true, atributos: `rows="2" maxlength="500" ${attr("detalles")}` })}
      ${campoTexto({ id: id("incluye"), etiqueta: tr("panel.inventario.incluye"), valor: datos.incluye, ayuda: esc(tr("panel.inventario.incluye_ayuda")), atributos: `maxlength="200" ${attr("incluye")}` })}`;
  }

  const datosUsado = (k) => { if (!s.usados.has(k)) s.usados.set(k, { ...s.usado }); return s.usados.get(k); };

  function dibujarUsado() {
    const lista = equiposDelLote();
    cuerpo("usado").innerHTML = `
      ${interruptor({ id: "l-usado-igual", etiqueta: tr("panel.lote.usado_igual"), marcado: s.usadoIgual })}
      ${s.usadoIgual
        ? camposUsado("", s.usado, "todos")
        : lista.map((e, i) => `<fieldset class="bloque-unidad"><legend>${esc(tr("panel.lote.unidad", { u: e.u, variante: textoVariante(e.v) }))}</legend>${camposUsado(`-${i}`, datosUsado(e.clave), e.clave)}</fieldset>`).join("")}`;
  }

  // --- 8 y 9: publicar y resumen ----------------------------------------------------

  function dibujarPublicar() {
    const total = equiposDelLote().length;
    const puede = total <= MAX_MAS_VENDIDOS;
    if (!puede) s.masVendido = false;
    cuerpo("publicar").innerHTML = `
      ${interruptor({ id: "l-publicado", etiqueta: tr("panel.inventario.publicado_ayuda"), marcado: s.publicado })}
      ${interruptor({ id: "l-destacado", etiqueta: tr("panel.inventario.destacado"), marcado: s.destacado })}
      ${interruptor({ id: "l-mas-vendido", etiqueta: tr("panel.inventario.mas_vendido_hasta", { n: MAX_MAS_VENDIDOS }), marcado: s.masVendido, atributos: `aria-describedby="l-mas-vendido-ayuda l-mas-vendido-error" ${puede ? "" : "disabled"}` })}
      <p class="ayuda" id="l-mas-vendido-ayuda">${esc(tr("panel.lote.mas_vendido_ayuda", { n: MAX_MAS_VENDIDOS }))}</p>
      <p class="error-campo" id="l-mas-vendido-error" role="alert"></p>
      ${campoTexto({ id: "l-descripcion", etiqueta: tr("panel.inventario.descripcion"), valor: s.descripcion, ayuda: esc(tr("panel.lote.descripcion_ayuda")), multilinea: true, atributos: 'rows="3" maxlength="800"' })}`;
  }

  function dibujarResumen() {
    const m = modelo();
    const lista = equiposDelLote();
    cuerpo("resumen").innerHTML = `
      <p class="lote-total"><strong>${esc(tn("panel.lote.contador", lista.length))}</strong></p>
      <p class="ayuda">${esc(tr("panel.lote.resumen_ayuda"))}</p>
      <ol class="lista-resumen-lote">
        ${lista.map((e) => {
          const md = medios(e.v.c.clave);
          const partes = [m.nombre, nombreCondicion(s.condicion), e.v.cap, nombreVisible(e.v.c)].filter(Boolean);
          const extra = [
            formatearPrecio(precioDe(e.v)),
            tr(stockDe(e.v) ? "panel.inventario.resumen_con_stock" : "panel.inventario.resumen_sin_stock"),
            tn("panel.inventario.resumen_fotos", md.fotos.length),
            md.video && tr("panel.inventario.resumen_video"),
            esUsado() && e.v.unidades > 1 && tr("panel.lote.unidad_n", { u: e.u })
          ].filter(Boolean);
          return `<li><strong>${esc(partes.join(" · "))}</strong> <span class="ayuda">${esc(extra.join(" · "))}</span></li>`;
        }).join("")}
      </ol>`;
  }

  // --- Pasos ---------------------------------------------------------------------

  const DIBUJAR = { grilla: dibujarGrilla, precio: dibujarPrecio, fotos: dibujarFotos, usado: dibujarUsado, publicar: dibujarPublicar, resumen: dibujarResumen };

  function mostrarPaso() {
    const visibles = pasosVisibles();
    paso = Math.min(paso, visibles.length - 1);
    const actual = visibles[paso];
    DIBUJAR[actual]?.();
    $$("[data-paso]", form).forEach((f) => { f.hidden = f.dataset.paso !== actual; });
    $("#lote-progreso").innerHTML = visibles.map((_, i) => `<span class="${i <= paso ? "hecho" : ""}"></span>`).join("");
    $("#paso-titulo").textContent = tr("panel.inventario.paso_de", { n: paso + 1, total: visibles.length, paso: tr(`panel.lote.paso.${actual}`) });
    $("#anterior").hidden = paso === 0;
    const ultimo = paso === visibles.length - 1;
    $("#siguiente").hidden = ultimo;
    $("#guardar").hidden = !ultimo;
    $("#guardar").textContent = tn("panel.lote.crear", equiposDelLote().length);
    if (actual !== "resumen") $("#l-error-lote").hidden = true;
    const primero = $(`[data-paso="${actual}"]`, form).querySelector("input:not([type=hidden]):not(.oculto-visual):not(:disabled), select, textarea");
    primero?.focus();
  }

  function errorGrupo(nombre, mensaje, error = `${nombre}-error`) {
    $(`#${error}`, form).textContent = mensaje;
    const primera = $(`input[name="${nombre}"]`, form);
    if (mensaje) primera?.setAttribute("aria-invalid", "true"); else primera?.removeAttribute("aria-invalid");
    return !mensaje;
  }

  const VALIDAR = {
    modelo: () => marcarError(form, "l-modelo", modelo() ? "" : tr("panel.inventario.error_modelo")),
    condicion: () => errorGrupo("l-condicion", s.condicion ? "" : tr("panel.inventario.error_condicion")),
    capacidades: () => {
      const otra = !s.otraMarcada || s.otra.trim() ? "" : tr("panel.lote.error_otra");
      marcarError(form, "l-otra", otra);
      const ninguna = capacidades().length || otra ? "" : tr("panel.lote.error_capacidades");
      errorGrupo("l-cap", ninguna, "l-capacidades-error");
      return !otra && !ninguna;
    },
    grilla: () => {
      let bien = true;
      variantes().forEach((v, i) => {
        if (!esUsado()) return;
        const n = Number(s.unidades.get(v.clave) ?? 1);
        if (!marcarError(form, `l-unidades-${i}`, Number.isInteger(n) && n >= 1 && n <= MAX_UNIDADES ? "" : tr("panel.lote.error_unidades", { n: MAX_UNIDADES }))) bien = false;
      });
      const total = equiposDelLote().length;
      const mensaje = !total ? tr("panel.lote.error_grilla") : total > MAX_LOTE ? tr("datos.error.lote_grande") : "";
      $("#l-grilla-error").textContent = mensaje;
      return bien && !mensaje;
    },
    precio: () => {
      if (s.mismoPrecio) return marcarError(form, "l-precio", leerPrecio(s.precio) ? "" : tr("panel.inventario.precio_invalido"));
      let bien = true;
      variantes().forEach((v, i) => { if (!marcarError(form, `l-precio-${i}`, precioDe(v) ? "" : tr("panel.inventario.precio_invalido"))) bien = false; });
      $("#l-precios-error").textContent = bien ? "" : tr("panel.lote.error_precios");
      return bien;
    },
    fotos: () => !subiendo,
    usado: () => {
      if (!esUsado()) return true;
      const revisar = (sufijo, d) => {
        const n = Number(d.bateria);
        const a = marcarError(form, `l-bateria${sufijo}`, d.bateria !== "" && Number.isInteger(n) && n >= 0 && n <= 100 ? "" : tr("panel.inventario.error_bateria"));
        const b = marcarError(form, `l-estado${sufijo}`, d.estado ? "" : tr("panel.inventario.error_estado"));
        return a && b;
      };
      if (s.usadoIgual) return revisar("", s.usado);
      return equiposDelLote().map((e, i) => revisar(`-${i}`, datosUsado(e.clave))).every(Boolean);
    },
    publicar: () => {
      // Hasta 3 "más vendidos", contando los que ya están marcados.
      const ya = equipos.filter((x) => x.mas_vendido).length;
      return marcarError(form, "l-mas-vendido", s.masVendido && ya + equiposDelLote().length > MAX_MAS_VENDIDOS ? tr("panel.inventario.max_mas_vendidos", { n: MAX_MAS_VENDIDOS }) : "");
    },
    resumen: () => true
  };

  // --- Eventos ----------------------------------------------------------------------

  form.addEventListener("input", (e) => {
    ctx.sucio = true;
    const el = e.target;
    if (el.id === "l-otra") s.otra = el.value;
    else if (el.dataset.unidades) { s.unidades.set(el.dataset.unidades, el.value); contar(); }
    else if (el.dataset.nombre) s.nombres.set(el.dataset.nombre, el.value);
    else if (el.id === "l-precio") s.precio = el.value;
    else if (el.dataset.precio) s.precios.set(el.dataset.precio, el.value);
    else if (el.dataset.usado) {
      const d = el.dataset.unidad === "todos" ? s.usado : datosUsado(el.dataset.unidad);
      d[el.dataset.usado] = el.value;
    } else if (el.id === "l-descripcion") s.descripcion = el.value;
  });

  form.addEventListener("change", (e) => {
    ctx.sucio = true;
    const el = e.target;
    if (el.id === "l-modelo") cambiarModelo(Number(el.value) || null);
    else if (el.id === "l-activar") s.activar = el.checked;
    else if (el.name === "l-condicion") { s.condicion = el.value; errorGrupo("l-condicion", ""); }
    else if (el.dataset.cap) { if (el.checked) s.caps.add(el.dataset.cap); else s.caps.delete(el.dataset.cap); }
    else if (el.id === "l-otra-marcada") { s.otraMarcada = el.checked; $("#caja-otra").hidden = !el.checked; if (el.checked) $("#l-otra").focus(); }
    else if (el.dataset.celda) { if (el.checked) s.apagadas.delete(el.dataset.celda); else s.apagadas.add(el.dataset.celda); sincronizarGrilla(); }
    else if (el.dataset.fila || el.dataset.columna) {
      const caps = capacidades();
      const filas = colores();
      const claves = el.dataset.fila
        ? caps.map((cap) => clave(filas[Number(el.dataset.fila)], cap))
        : filas.map((c) => clave(c, caps[Number(el.dataset.columna)]));
      for (const k of claves) { if (el.checked) s.apagadas.delete(k); else s.apagadas.add(k); }
      sincronizarGrilla();
    }
    else if (el.id === "l-mismo-precio") { s.mismoPrecio = el.checked; dibujarPrecio(); $("#l-mismo-precio").focus(); }
    else if (el.id === "l-stock") {
      s.stock = el.checked;
      variantes().forEach((v, i) => { const x = $(`#l-stock-${i}`); if (x) x.checked = stockDe(v); });
    }
    else if (el.dataset.stock) {
      if (s.excepciones.has(el.dataset.stock)) s.excepciones.delete(el.dataset.stock); else s.excepciones.add(el.dataset.stock);
      $("#l-excepciones-titulo").textContent = tr("panel.lote.excepciones", { n: variantes().filter((v) => s.excepciones.has(v.clave)).length });
    }
    else if (el.dataset.fotos) { agregarFotos(el.dataset.fotos, el.files); el.value = ""; }
    else if (el.dataset.video) { const archivo = el.files[0]; el.value = ""; if (archivo) agregarVideo(el.dataset.video, archivo); }
    else if (el.id === "l-usado-igual") { s.usadoIgual = el.checked; dibujarUsado(); $("#l-usado-igual").focus(); }
    else if (el.id === "l-publicado") s.publicado = el.checked;
    else if (el.id === "l-destacado") s.destacado = el.checked;
    else if (el.id === "l-mas-vendido") { s.masVendido = el.checked; marcarError(form, "l-mas-vendido", ""); }
  });

  form.addEventListener("click", (e) => {
    const copiar = e.target.closest("[data-copiar]");
    if (copiar) { copiarCapacidad(copiar.dataset.copiar); return; }
    const quitarVideo = e.target.closest("[data-quitar-video]");
    if (quitarVideo) {
      const k = quitarVideo.dataset.quitarVideo;
      const m = medios(k);
      if (m.video) api.borrarArchivos("videos", [m.video]).catch(() => {});
      m.video = "";
      pintarVideo(k);
      $(`label[for="${porClave("data-video", k).id}"]`, form)?.focus();
      return;
    }
    const li = e.target.closest(".foto-item");
    const seccion = e.target.closest("[data-color]");
    if (!li || !seccion) return;
    const k = seccion.dataset.color;
    const fotos = medios(k).fotos;
    const i = Number(li.dataset.i);
    if (e.target.closest("[data-quitar]")) {
      const [r] = fotos.splice(i, 1);
      api.borrarArchivos("fotos", rutasDeFotos([r])).catch(() => {});
      pintarFotos(k);
      ($(`.foto-item[data-i="${Math.min(i, fotos.length - 1)}"] [data-quitar]`, seccion) || $(".zona-subida label", seccion))?.focus();
    }
    const mover = e.target.closest("[data-mover]");
    if (mover) {
      const j = i + Number(mover.dataset.mover);
      [fotos[i], fotos[j]] = [fotos[j], fotos[i]];
      pintarFotos(k);
      ($(`.foto-item[data-i="${j}"] [data-mover="${mover.dataset.mover}"]:not(:disabled)`, seccion) || $(`.foto-item[data-i="${j}"] [data-quitar]`, seccion))?.focus();
    }
  });

  // Arrastrar fotos a la zona de un color.
  form.addEventListener("dragover", (e) => {
    const zona = e.target.closest("[data-zona]");
    if (zona && e.dataTransfer.types.includes("Files")) { e.preventDefault(); zona.classList.add("encima"); }
  });
  form.addEventListener("dragleave", (e) => e.target.closest("[data-zona]")?.classList.remove("encima"));
  form.addEventListener("drop", (e) => {
    const zona = e.target.closest("[data-zona]");
    if (!zona) return;
    e.preventDefault();
    zona.classList.remove("encima");
    agregarFotos(zona.dataset.zona, e.dataTransfer.files);
  });

  $("#siguiente").addEventListener("click", () => {
    const actual = pasosVisibles()[paso];
    if (!VALIDAR[actual]()) {
      if (actual === "fotos") avisar(tr("panel.inventario.espere_subidas"), "error");
      enfocarPrimerError(form);
      return;
    }
    paso++;
    mostrarPaso();
  });
  $("#anterior").addEventListener("click", () => { paso = Math.max(0, paso - 1); mostrarPaso(); });
  form.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.matches("input:not([type=checkbox]):not([type=radio])") && !$("#siguiente").hidden) {
      e.preventDefault();
      $("#siguiente").click();
    }
  });

  // Los equipos del lote, listos para la capa de datos.
  function armarLote() {
    const m = modelo();
    return equiposDelLote().map((e) => {
      const md = medios(e.v.c.clave);
      const u = esUsado() ? (s.usadoIgual ? s.usado : datosUsado(e.clave)) : null;
      return {
        modelo_id: m.id,
        condicion: s.condicion,
        capacidad: e.v.cap,
        color_id: e.v.c.id,
        color_nombre_mostrar: (s.nombres.get(e.v.c.clave) || "").trim(),
        precio: precioDe(e.v),
        en_stock: stockDe(e.v),
        fotos: [...md.fotos],
        video: md.video,
        publicado: s.publicado,
        destacado: s.destacado,
        mas_vendido: s.masVendido,
        descripcion_extra: s.descripcion.trim(),
        bateria_porcentaje: u ? Number(u.bateria) : null,
        estado_estetico: u ? u.estado : null,
        detalles: u ? u.detalles.trim() : "",
        incluye: u ? u.incluye.trim() : ""
      };
    });
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    // Al resumen solo se llega pasando por "Siguiente": los pasos ya se
    // validaron. Solo falta que terminen las subidas.
    if (subiendo) { avisar(tr("panel.inventario.espere_subidas"), "error"); return; }
    const lote = armarLote();
    const alerta = $("#l-error-lote");
    alerta.hidden = true;
    try {
      await conBoton($("#guardar"), () => api.crearEquiposLote(lote), { exito: tn("panel.lote.creados", lote.length) });
    } catch (err) {
      // Todo o nada: no se creó ninguno. Los archivos subidos aquí se borran.
      await borrarMedios();
      alerta.textContent = `${err.message} ${tr("panel.lote.no_se_creo")}`;
      alerta.hidden = false;
      return;
    }
    s.medios.clear();
    const m = modelo();
    if (!m.activo && s.activar) await api.guardarModelo(m.id, { activo: true }).catch((err) => avisar(err.message, "error"));
    ctx.sucio = false;
    ctx.ir("inventario");
  });

  // Si se sale sin crear el lote, se borran las fotos y los videos subidos.
  ctx.alSalir = () => { borrarMedios(); };

  mostrarPaso();
}
