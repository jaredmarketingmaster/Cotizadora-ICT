// =============================================================================
// Inventario: lista con filtros y edición rápida (precio, stock sí/no,
// publicado y más vendido),
// formulario por pasos para agregar, edición completa, duplicar y borrar.
// =============================================================================

import { formatearMiles, leerPrecio, CAPACIDADES_SUGERIDAS, capacidadEnGB } from "../utils.js";
import { datosPais, paisActual } from "../datos/paises.js";
import { rutaMiniatura, ESTADOS_ESTETICOS, nombreColor, MAX_MAS_VENDIDOS } from "../datos/comun.js";
import { telefonoSVG } from "../ilustracion.js";
import { etiquetaGeneracion } from "../sitio/catalogo.js";
import { $, esc, avisar, confirmar, conBoton, campoTexto, interruptor, marcarError, enfocarPrimerError } from "./ui.js";
import { comprimirFoto } from "./imagenes.js";
import { validarVideo } from "./video.js";
import { t as tr } from "../i18n/i18n.js";

// El estado estético se guarda en español (la base lo valida); se muestra traducido.
const CLAVES_ESTADO = { "Como nuevo": "como_nuevo", "Excelente": "excelente", "Muy bueno": "muy_bueno", "Bueno": "bueno" };
export const nombreEstado = (s) => (CLAVES_ESTADO[s] ? tr(`panel.inventario.estado.${CLAVES_ESTADO[s]}`) : s);
export const nombreCondicion = (c) => tr(c === "usado" ? "panel.inventario.usado" : "panel.inventario.nuevo");
const mensajeMasVendidos = () => tr("panel.inventario.max_mas_vendidos", { n: MAX_MAS_VENDIDOS });

const MAX_FOTOS = 6;

function nombreModelo(modelos, id) {
  return modelos.find((m) => m.id === id)?.nombre || tr("panel.inventario.modelo_borrado");
}

function miniatura(api, q, colores, alt = "") {
  const ruta = q.fotos?.[0];
  const url = ruta && (api.urlArchivo("fotos", rutaMiniatura(ruta)) || api.urlArchivo("fotos", ruta));
  return url ? `<img src="${esc(url)}" alt="${esc(alt)}" loading="lazy">` : telefonoSVG(colores.get(q.color_id)?.hex);
}

// Nombre del color que verá el cliente (el elegido o el oficial).
function colorDe(q, colores) {
  return nombreColor(colores.get(q.color_id), q.color_nombre_mostrar);
}

export function rutasDeFotos(fotos) {
  return (fotos || []).flatMap((r) => [r, rutaMiniatura(r)]);
}

// Un archivo puede ser de varios equipos (las fotos y el video de un color en
// un lote): solo se borra de Storage si ningún equipo lo usa (archivos_en_uso).
export async function borrarSinUso(api, bucket, rutas) {
  const lista = [...new Set((rutas || []).filter(Boolean))];
  if (!lista.length) return;
  const enUso = new Set(await api.archivosEnUso(bucket, lista));
  const libres = lista.filter((r) => !enUso.has(r));
  if (libres.length) await api.borrarArchivos(bucket, bucket === "fotos" ? rutasDeFotos(libres) : libres);
}

export async function dibujar(vista, ctx, resto, params) {
  // "Agregar equipo" es el asistente de carga en lote (lote.js); Duplicar sigue aquí.
  if (resto[0] === "nuevo" && !params.get("desde")) return (await import("./lote.js")).dibujar(vista, ctx);
  if (resto[0] === "nuevo") return formulario(vista, ctx, { modo: "duplicar", desde: params.get("desde") });
  if (resto[0]) return formulario(vista, ctx, { modo: "editar", id: resto[0] });
  return lista(vista, ctx, params);
}

// --- Lista ---------------------------------------------------------------------

async function lista(vista, ctx, params) {
  const { api } = ctx;
  const [equipos, modelos, listaColores] = await Promise.all([api.listarEquipos(), api.listarModelos(), api.listarColores()]);
  const colores = new Map(listaColores.map((c) => [c.id, c]));
  const activos = new Set(modelos.filter((m) => m.activo).map((m) => m.id));
  const conEquipos = modelos.filter((m) => equipos.some((q) => q.modelo_id === m.id));
  const estado = {
    texto: "", modelo: "", condicion: "",
    publicado: params.get("publicado") || "",
    especial: params.get("stock") === "0" ? "sin-stock" : params.get("fotos") === "sin" ? "sin-foto" : ""
  };

  vista.innerHTML = `
    <div class="vista-cabecera">
      <h1>${esc(tr("panel.inventario.titulo"))}</h1>
      <a class="boton boton--primario" href="#/inventario/nuevo">${esc(tr("panel.inventario.agregar_equipo"))}</a>
    </div>
    <div class="barra-filtros">
      <div class="campo"><label for="b-texto">${esc(tr("panel.inventario.buscar"))}</label><input class="entrada" id="b-texto" type="search" placeholder="${esc(tr("panel.inventario.buscar_placeholder"))}"></div>
      <div class="campo"><label for="b-modelo">${esc(tr("panel.inventario.modelo"))}</label><select class="entrada" id="b-modelo"><option value="">${esc(tr("panel.inventario.todos"))}</option>${conEquipos.map((m) => `<option value="${m.id}">${esc(m.nombre)}</option>`).join("")}</select></div>
      <div class="campo"><label for="b-condicion">${esc(tr("panel.inventario.condicion"))}</label><select class="entrada" id="b-condicion"><option value="">${esc(tr("panel.inventario.todas"))}</option><option value="nuevo">${esc(tr("panel.inventario.nuevo"))}</option><option value="usado">${esc(tr("panel.inventario.usado"))}</option></select></div>
      <div class="campo"><label for="b-publicado">${esc(tr("panel.inventario.publicado"))}</label><select class="entrada" id="b-publicado"><option value="">${esc(tr("panel.inventario.todos"))}</option><option value="si">${esc(tr("panel.inventario.si"))}</option><option value="no">${esc(tr("panel.inventario.no"))}</option></select></div>
    </div>
    <p id="filtro-especial" class="avisos" hidden></p>
    <p class="ayuda" id="cuenta" role="status"></p>
    <ul class="lista-equipos" id="lista"></ul>`;
  $("#b-publicado").value = estado.publicado;

  function filtrados() {
    const t = estado.texto.toLowerCase();
    return equipos.filter((q) =>
      (!estado.modelo || q.modelo_id === Number(estado.modelo)) &&
      (!estado.condicion || q.condicion === estado.condicion) &&
      (!estado.publicado || q.publicado === (estado.publicado === "si")) &&
      (estado.especial !== "sin-stock" || !q.en_stock) &&
      (estado.especial !== "sin-foto" || (!q.es_demo && !(q.fotos || []).length)) &&
      (!t || [nombreModelo(modelos, q.modelo_id), colorDe(q, colores), q.capacidad, q.condicion].join(" ").toLowerCase().includes(t)))
      .sort((a, b) => {
        const ma = modelos.find((m) => m.id === a.modelo_id)?.orden ?? 0;
        const mb = modelos.find((m) => m.id === b.modelo_id)?.orden ?? 0;
        return mb - ma || capacidadEnGB(a.capacidad) - capacidadEnGB(b.capacidad) || a.precio - b.precio;
      });
  }

  function fila(q) {
    const nombre = nombreModelo(modelos, q.modelo_id);
    const notas = [
      q.es_demo && tr("panel.inventario.nota_demo"),
      !activos.has(q.modelo_id) && tr("panel.inventario.nota_inactivo"),
      !q.en_stock && tr("panel.inventario.nota_sin_stock"),
      q.condicion === "usado" && q.bateria_porcentaje != null && tr("panel.inventario.nota_bateria", { n: q.bateria_porcentaje })
    ].filter(Boolean);
    return `<li class="fila-equipo" data-id="${q.id}">
      <span class="fila-foto">${miniatura(api, q, colores)}</span>
      <div class="fila-info">
        <span class="fila-nombre">${esc(nombre)}</span>
        <span class="fila-sub">${[nombreCondicion(q.condicion), q.capacidad, colorDe(q, colores)].filter(Boolean).map(esc).join(" · ")}</span>
        ${notas.length ? `<span class="fila-sub">${esc(notas.join(" · "))}</span>` : ""}
      </div>
      <div class="fila-edicion">
        <div class="campo"><label for="p-${q.id}">${esc(tr("panel.inventario.precio"))}</label><input class="entrada cifras" id="p-${q.id}" data-campo="precio" inputmode="numeric" value="${formatearMiles(q.precio)}"></div>
        ${interruptor({ id: `s-${q.id}`, etiqueta: tr("panel.inventario.stock"), marcado: q.en_stock, atributos: 'data-campo="en_stock"', estados: [tr("panel.inventario.con_stock"), tr("panel.inventario.sin_stock")] })}
        ${interruptor({ id: `v-${q.id}`, etiqueta: tr("panel.inventario.publicado"), marcado: q.publicado, atributos: 'data-campo="publicado"' })}
        ${interruptor({ id: `mv-${q.id}`, etiqueta: tr("panel.inventario.mas_vendido"), marcado: q.mas_vendido, atributos: 'data-campo="mas_vendido"' })}
      </div>
      <div class="fila-acciones">
        <a class="boton boton--suave boton--chico" href="#/inventario/${q.id}">${esc(tr("panel.inventario.editar"))}</a>
        <a class="boton boton--suave boton--chico" href="#/inventario/nuevo?desde=${q.id}">${esc(tr("panel.inventario.duplicar"))}</a>
        <button type="button" class="boton boton--peligro boton--chico" data-borrar>${esc(tr("panel.inventario.borrar"))}</button>
      </div>
      <p class="error-campo fila-error" role="alert"></p>
    </li>`;
  }

  function pintar() {
    const lista = filtrados();
    const especial = $("#filtro-especial");
    especial.hidden = !estado.especial;
    especial.innerHTML = estado.especial
      ? `<span>${esc(tr(estado.especial === "sin-stock" ? "panel.inventario.solo_sin_stock" : "panel.inventario.solo_sin_foto"))}</span> <button type="button" class="boton boton--enlace" id="quitar-especial">${esc(tr("panel.inventario.ver_todos"))}</button>`
      : "";
    $("#quitar-especial")?.addEventListener("click", () => { estado.especial = ""; pintar(); });
    $("#cuenta").textContent = tr("panel.inventario.cuenta", { m: lista.length, n: equipos.length });
    $("#lista").innerHTML = lista.length
      ? lista.map(fila).join("")
      : `<li class="vacio-panel">${esc(tr(equipos.length ? "panel.inventario.sin_resultados" : "panel.inventario.vacio"))}</li>`;
  }

  $("#b-texto").addEventListener("input", (e) => { estado.texto = e.target.value.trim(); pintar(); });
  $("#b-modelo").addEventListener("change", (e) => { estado.modelo = e.target.value; pintar(); });
  $("#b-condicion").addEventListener("change", (e) => { estado.condicion = e.target.value; pintar(); });
  $("#b-publicado").addEventListener("change", (e) => { estado.publicado = e.target.value; pintar(); });

  // Edición rápida: se guarda al salir del campo, con Enter o al mover el interruptor.
  async function guardarCampo(input) {
    const li = input.closest(".fila-equipo");
    const q = equipos.find((x) => x.id === li.dataset.id);
    const error = $(".fila-error", li);
    const campo = input.dataset.campo;
    let valor;
    if (campo === "precio") {
      valor = leerPrecio(input.value);
      if (valor == null) { error.textContent = tr("panel.inventario.precio_invalido"); input.setAttribute("aria-invalid", "true"); return; }
      if (valor === q.precio) { input.value = formatearMiles(q.precio); return; }
    } else {
      valor = input.checked;
      // Hasta 3 "más vendidos": se avisa antes de ir a la base (que igual lo exige).
      if (campo === "mas_vendido" && valor && equipos.filter((x) => x.mas_vendido && x.id !== q.id).length >= MAX_MAS_VENDIDOS) {
        error.textContent = mensajeMasVendidos();
        input.checked = false;
        return;
      }
    }
    error.textContent = "";
    input.removeAttribute("aria-invalid");
    try {
      const nuevo = await conBoton(null, () => api.actualizarEquipo(q.id, { [campo]: valor }));
      Object.assign(q, nuevo);
      if (campo === "precio") input.value = formatearMiles(nuevo.precio);
    } catch (e) {
      error.textContent = e.message;
      if (input.type === "checkbox") input.checked = !valor;
    }
  }
  const listaEl = $("#lista");
  listaEl.addEventListener("change", (e) => { if (e.target.dataset.campo) guardarCampo(e.target); });
  listaEl.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && e.target.dataset.campo && e.target.type !== "checkbox") { e.preventDefault(); e.target.blur(); }
  });
  listaEl.addEventListener("click", async (e) => {
    if (!e.target.closest("[data-borrar]")) return;
    const li = e.target.closest(".fila-equipo");
    const q = equipos.find((x) => x.id === li.dataset.id);
    const ok = await confirmar({
      titulo: tr("panel.inventario.borrar_titulo"),
      texto: tr("panel.inventario.borrar_texto", { equipo: `${nombreModelo(modelos, q.modelo_id)} ${q.capacidad}${colorDe(q, colores) ? ` ${colorDe(q, colores)}` : ""}` }),
      aceptar: tr("panel.inventario.borrar"), peligro: true
    });
    if (!ok) return;
    await conBoton(null, async () => {
      await api.borrarEquipo(q.id);
      await borrarSinUso(api, "fotos", q.fotos).catch(() => {});
      await borrarSinUso(api, "videos", [q.video]).catch(() => {});
    }, { exito: tr("panel.inventario.borrado") });
    equipos.splice(equipos.indexOf(q), 1);
    pintar();
  });

  pintar();
}

// --- Formulario de un equipo (editar y duplicar) --------------------------------
// Agregar equipos va por el asistente de carga en lote (lote.js).

const SECCIONES = ["modelo", "condicion", "capacidad", "color", "precio", "fotos", "usado", "publicar"];

async function formulario(vista, ctx, { modo, id, desde }) {
  const { api } = ctx;
  const [equipos, modelos, listaColores] = await Promise.all([api.listarEquipos(), api.listarModelos(), api.listarColores()]);
  const original = id ? equipos.find((q) => q.id === id) : null;
  if (modo === "editar" && !original) {
    vista.innerHTML = `<p class="popup-alerta">${esc(tr("panel.inventario.no_existe"))}</p><a class="volver" href="#/inventario">${esc(tr("panel.inventario.volver_inventario"))}</a>`;
    return;
  }
  const fuente = modo === "duplicar" ? equipos.find((q) => q.id === desde) : original;
  const q = {
    modelo_id: fuente?.modelo_id ?? "", condicion: fuente?.condicion ?? "", capacidad: fuente?.capacidad ?? "",
    color_id: fuente?.color_id ?? null, color_nombre_mostrar: fuente?.color_nombre_mostrar ?? "",
    precio: fuente?.precio ?? null, en_stock: fuente?.en_stock ?? true,
    fotos: modo === "editar" ? [...(fuente?.fotos || [])] : [],
    video: modo === "editar" ? fuente?.video || "" : "",
    publicado: modo === "editar" ? fuente.publicado : false,
    destacado: fuente?.destacado ?? false, descripcion_extra: fuente?.descripcion_extra ?? "",
    // Duplicar no copia "Más vendido": es otra variante y el máximo es 3.
    mas_vendido: modo === "editar" ? Boolean(fuente?.mas_vendido) : false,
    bateria_porcentaje: fuente?.bateria_porcentaje ?? null, estado_estetico: fuente?.estado_estetico ?? null,
    detalles: fuente?.detalles ?? "", incluye: fuente?.incluye ?? ""
  };
  const subidas = [];   // rutas subidas en esta edición (se borran si se cancela)
  const quitadas = [];  // rutas a borrar cuando se guarde
  const videosSubidos = [];  // igual, para el bucket "videos"
  const videosQuitados = [];

  const generaciones = [];
  for (const m of [...modelos].sort((a, b) => b.orden - a.orden)) {
    let g = generaciones.find((x) => x.nombre === m.generacion);
    if (!g) { g = { nombre: m.generacion, modelos: [] }; generaciones.push(g); }
    g.modelos.push(m);
  }
  const capsSugeridas = CAPACIDADES_SUGERIDAS.includes(q.capacidad) || !q.capacidad;
  const titulo = tr(modo === "editar" ? "panel.inventario.editar_equipo" : "panel.inventario.duplicar_equipo");

  vista.innerHTML = `
    <a class="volver" href="#/inventario">${esc(tr("panel.inventario.volver"))}</a>
    <div class="vista-cabecera"><h1>${esc(titulo)}</h1>
      ${modo === "duplicar" ? `<p>${esc(tr("panel.inventario.duplicar_ayuda"))}</p>` : ""}
    </div>
    <form id="form-equipo" novalidate>

      <fieldset class="bloque" data-paso="modelo">
        <legend class="oculto-visual">${esc(tr("panel.inventario.modelo"))}</legend>
        <div class="campo">
          <label for="e-modelo">${esc(tr("panel.inventario.modelo"))}</label>
          <select class="entrada" id="e-modelo" aria-describedby="e-modelo-error">
            <option value="">${esc(tr("panel.inventario.elija_modelo"))}</option>
            ${generaciones.map((g) => `<optgroup label="${esc(etiquetaGeneracion(g.nombre))}">${g.modelos.map((m) => `<option value="${m.id}" ${m.id === q.modelo_id ? "selected" : ""}>${esc(m.nombre)}${m.activo ? "" : ` ${esc(tr("panel.inventario.inactivo"))}`}</option>`).join("")}</optgroup>`).join("")}
          </select>
          <p class="error-campo" id="e-modelo-error"></p>
        </div>
        <div id="aviso-inactivo" hidden>
          <p class="ayuda">${esc(tr("panel.inventario.aviso_inactivo"))}</p>
          ${interruptor({ id: "e-activar", etiqueta: tr("panel.inventario.activar_modelo"), marcado: true })}
        </div>
      </fieldset>

      <fieldset class="bloque" data-paso="condicion" aria-describedby="e-condicion-error">
        <legend>${esc(tr("panel.inventario.condicion"))}</legend>
        <div class="opciones-chip">
          ${["nuevo", "usado"].map((c) => `<label class="opcion-chip"><input type="radio" name="e-condicion" value="${c}" ${q.condicion === c ? "checked" : ""}><span>${esc(nombreCondicion(c))}</span></label>`).join("")}
        </div>
        <p class="ayuda">${esc(tr("panel.inventario.condicion_ayuda"))}</p>
        <p class="error-campo" id="e-condicion-error"></p>
      </fieldset>

      <fieldset class="bloque" data-paso="capacidad" aria-describedby="e-capacidad-error">
        <legend>${esc(tr("panel.inventario.capacidad"))}</legend>
        <div class="opciones-chip">
          ${CAPACIDADES_SUGERIDAS.map((c) => `<label class="opcion-chip"><input type="radio" name="e-capacidad" value="${c}" ${q.capacidad === c ? "checked" : ""}><span>${c}</span></label>`).join("")}
          <label class="opcion-chip"><input type="radio" name="e-capacidad" value="otra" ${!capsSugeridas ? "checked" : ""}><span>${esc(tr("panel.inventario.otra"))}</span></label>
        </div>
        <div class="campo" id="caja-otra" ${capsSugeridas ? "hidden" : ""}>
          <label for="e-capacidad-otra">${esc(tr("panel.inventario.escriba_capacidad"))}</label>
          <input class="entrada" id="e-capacidad-otra" value="${capsSugeridas ? "" : esc(q.capacidad)}" placeholder="${esc(tr("panel.inventario.capacidad_placeholder"))}">
        </div>
        <p class="error-campo" id="e-capacidad-error"></p>
      </fieldset>

      <fieldset class="bloque" data-paso="color" aria-describedby="e-color-error">
        <legend>${esc(tr("panel.inventario.color"))}</legend>
        <p class="ayuda">${esc(tr("panel.inventario.color_ayuda"))}</p>
        <div class="opciones-color" id="opciones-color"></div>
        <p class="error-campo" id="e-color-error"></p>
        ${campoTexto({ id: "e-color-mostrar", etiqueta: tr("panel.inventario.color_mostrar"), valor: q.color_nombre_mostrar, ayuda: esc(tr("panel.inventario.color_mostrar_ayuda")), atributos: 'maxlength="40"' })}
      </fieldset>

      <fieldset class="bloque" data-paso="precio">
        <legend>${esc(tr("panel.inventario.paso.precio"))}</legend>
        ${campoTexto({ id: "e-precio", etiqueta: tr("panel.inventario.precio_moneda", { moneda: datosPais(paisActual()).moneda }), valor: q.precio ? formatearMiles(q.precio) : "", ayuda: esc(tr("panel.inventario.precio_ayuda")), atributos: 'inputmode="numeric" autocomplete="off"' })}
        ${interruptor({ id: "e-stock", etiqueta: tr("panel.inventario.stock"), marcado: q.en_stock, estados: [tr("panel.inventario.con_stock"), tr("panel.inventario.sin_stock")] })}
        <p class="ayuda">${esc(tr("panel.inventario.stock_ayuda"))}</p>
      </fieldset>

      <fieldset class="bloque" data-paso="fotos">
        <legend>${esc(tr("panel.inventario.fotos"))}</legend>
        <p class="ayuda">${esc(tr("panel.inventario.fotos_ayuda", { n: MAX_FOTOS }))}</p>
        <ul class="fotos-lista" id="fotos-lista"></ul>
        <div class="zona-subida" id="zona-subida">
          <p>${esc(tr("panel.inventario.arrastre"))}</p>
          <div class="zona-subida-botones">
            <label class="boton boton--secundario" for="e-fotos">${esc(tr("panel.inventario.elegir_fotos"))}</label>
            <label class="boton boton--secundario" for="e-camara">${esc(tr("panel.inventario.usar_camara"))}</label>
          </div>
          <input class="oculto-visual" id="e-fotos" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple>
          <input class="oculto-visual" id="e-camara" type="file" accept="image/*" capture="environment">
        </div>
        <p class="subiendo" id="subiendo" role="status" hidden></p>
        <p class="error-campo" id="e-fotos-error" role="alert"></p>
        <div class="campo bloque-video">
          <span class="etiqueta" id="e-video-titulo">${esc(tr("panel.inventario.video"))}</span>
          <p class="ayuda" id="e-video-ayuda">${esc(tr("panel.inventario.video_ayuda"))}</p>
          <div id="video-actual"></div>
          <input class="oculto-visual" id="e-video" type="file" accept="video/mp4,video/webm,.mp4,.webm" aria-describedby="e-video-ayuda e-video-error">
          <p class="subiendo" id="subiendo-video" role="status" hidden></p>
          <p class="error-campo" id="e-video-error" role="alert"></p>
        </div>
      </fieldset>

      <fieldset class="bloque" data-paso="usado">
        <legend>${esc(tr("panel.inventario.paso.usado"))}</legend>
        <div class="grilla-2">
          ${campoTexto({ id: "e-bateria", etiqueta: tr("panel.inventario.bateria"), valor: q.bateria_porcentaje ?? "", tipo: "number", ayuda: esc(tr("panel.inventario.bateria_ayuda")), atributos: 'inputmode="numeric" min="0" max="100"' })}
          <div class="campo">
            <label for="e-estado">${esc(tr("panel.inventario.estado_estetico"))}</label>
            <select class="entrada" id="e-estado" aria-describedby="e-estado-error">
              <option value="">${esc(tr("panel.inventario.elija_estado"))}</option>
              ${ESTADOS_ESTETICOS.map((s) => `<option value="${esc(s)}" ${q.estado_estetico === s ? "selected" : ""}>${esc(nombreEstado(s))}</option>`).join("")}
            </select>
            <p class="error-campo" id="e-estado-error"></p>
          </div>
        </div>
        ${campoTexto({ id: "e-detalles", etiqueta: tr("panel.inventario.detalles"), valor: q.detalles, ayuda: esc(tr("panel.inventario.detalles_ayuda")), multilinea: true, atributos: 'rows="3" maxlength="500"' })}
        ${campoTexto({ id: "e-incluye", etiqueta: tr("panel.inventario.incluye"), valor: q.incluye, ayuda: esc(tr("panel.inventario.incluye_ayuda")), atributos: 'maxlength="200"' })}
      </fieldset>

      <fieldset class="bloque" data-paso="publicar">
        <legend>${esc(tr("panel.inventario.paso.publicar"))}</legend>
        ${interruptor({ id: "e-publicado", etiqueta: tr("panel.inventario.publicado_ayuda"), marcado: q.publicado })}
        ${interruptor({ id: "e-destacado", etiqueta: tr("panel.inventario.destacado"), marcado: q.destacado })}
        ${interruptor({ id: "e-mas-vendido", etiqueta: tr("panel.inventario.mas_vendido_hasta", { n: MAX_MAS_VENDIDOS }), marcado: q.mas_vendido, atributos: 'aria-describedby="e-mas-vendido-error"' })}
        <p class="error-campo" id="e-mas-vendido-error" role="alert"></p>
        ${campoTexto({ id: "e-descripcion", etiqueta: tr("panel.inventario.descripcion"), valor: q.descripcion_extra, ayuda: esc(tr("panel.inventario.descripcion_ayuda")), multilinea: true, atributos: 'rows="3" maxlength="800"' })}
      </fieldset>

      <div class="acciones-formulario">
        <button type="submit" class="boton boton--primario" id="guardar">${esc(tr(modo === "editar" ? "panel.inventario.guardar_cambios" : "panel.inventario.guardar_equipo"))}</button>
      </div>
    </form>`;

  const form = $("#form-equipo");
  const valor = (sel) => $(sel, form).value.trim();
  const condicion = () => $('input[name="e-condicion"]:checked', form)?.value || "";
  const modeloSel = () => modelos.find((m) => m.id === Number(valor("#e-modelo")));
  const seccionesVisibles = () => SECCIONES.filter((k) => k !== "usado" || condicion() === "usado");

  function capacidad() {
    const v = $('input[name="e-capacidad"]:checked', form)?.value || "";
    return v === "otra" ? valor("#e-capacidad-otra") : v;
  }

  // Colores oficiales del modelo elegido (radios con muestra). Cambiar el
  // modelo borra el color elegido.
  let modeloColores = q.modelo_id;
  function pintarColores() {
    const m = modeloSel();
    if (m?.id !== modeloColores) { q.color_id = null; modeloColores = m?.id; }
    const lista = m ? listaColores.filter((c) => c.modelo_id === m.id).sort((a, b) => a.orden - b.orden) : [];
    $("#opciones-color").innerHTML = !m
      ? `<p class="ayuda">${esc(tr("panel.inventario.elija_modelo_primero"))}</p>`
      : lista.length
        ? lista.map((c) => `<label class="opcion-color"><input type="radio" name="e-color" value="${c.id}" ${q.color_id === c.id ? "checked" : ""}>
            <span class="muestra-color${c.hex ? "" : " muestra-color--vacia"}" ${c.hex ? `style="background:${esc(c.hex)}"` : ""} aria-hidden="true"></span>
            <span class="opcion-color-nombres"><span>${esc(c.nombre_en || c.nombre_es)}</span>${c.nombre_en ? `<span class="ayuda">${esc(c.nombre_es)}</span>` : ""}</span>
          </label>`).join("")
        : `<p class="ayuda">${esc(tr("panel.inventario.sin_colores"))}</p>`;
  }
  const colorSel = () => {
    const v = $('input[name="e-color"]:checked', form)?.value;
    return v ? Number(v) : null;
  };

  function actualizarVisibles() {
    const m = modeloSel();
    $("#aviso-inactivo").hidden = !m || m.activo;
    const usado = condicion() === "usado";
    $('[data-paso="usado"]', form).hidden = !usado;
    $("#caja-otra").hidden = $('input[name="e-capacidad"]:checked', form)?.value !== "otra";
  }

  // Error de un grupo de opciones: el foco va a la primera opción.
  function errorGrupo(nombre, mensaje) {
    $(`#${nombre}-error`, form).textContent = mensaje;
    const primera = $(`input[name="${nombre}"]`, form);
    if (mensaje) primera?.setAttribute("aria-invalid", "true"); else primera?.removeAttribute("aria-invalid");
    return !mensaje;
  }

  // Validación por sección
  const VALIDAR = {
    modelo: () => marcarError(form, "e-modelo", modeloSel() ? "" : tr("panel.inventario.error_modelo")),
    condicion: () => errorGrupo("e-condicion", condicion() ? "" : tr("panel.inventario.error_condicion")),
    capacidad: () => errorGrupo("e-capacidad", capacidad() ? "" : tr("panel.inventario.error_capacidad")),
    color: () => {
      const hay = Boolean(modeloSel()) && listaColores.some((c) => c.modelo_id === modeloSel().id);
      return errorGrupo("e-color", hay && !colorSel() ? tr("panel.inventario.error_color") : "");
    },
    precio: () => {
      return marcarError(form, "e-precio", leerPrecio(valor("#e-precio")) ? "" : tr("panel.inventario.precio_invalido"));
    },
    fotos: () => !subiendo && !subiendoVideo,
    usado: () => {
      if (condicion() !== "usado") return true;
      const b = valor("#e-bateria");
      const n = Number(b);
      const a = marcarError(form, "e-bateria", b !== "" && Number.isInteger(n) && n >= 0 && n <= 100 ? "" : tr("panel.inventario.error_bateria"));
      const c = marcarError(form, "e-estado", valor("#e-estado") ? "" : tr("panel.inventario.error_estado"));
      return a && c;
    },
    publicar: () => {
      const otros = equipos.filter((x) => x.mas_vendido && x.id !== original?.id).length;
      return marcarError(form, "e-mas-vendido", $("#e-mas-vendido").checked && otros >= MAX_MAS_VENDIDOS ? mensajeMasVendidos() : "");
    }
  };

  // --- Fotos ---
  let fotos = [...q.fotos];
  let subiendo = false;
  let arrastrada = -1;

  function pintarFotos() {
    $("#fotos-lista").innerHTML = fotos.map((r, i) => {
      const url = api.urlArchivo("fotos", rutaMiniatura(r)) || api.urlArchivo("fotos", r);
      return `<li class="foto-item" draggable="true" data-i="${i}">
        ${i === 0 ? `<span class="principal">${esc(tr("panel.inventario.principal"))}</span>` : ""}
        <img src="${esc(url)}" alt="${esc(tr("panel.inventario.foto_alt", { n: i + 1 }))}">
        <div class="foto-botones">
          <button type="button" class="boton-icono" data-mover="-1" aria-label="${esc(tr("panel.inventario.foto_antes", { n: i + 1 }))}" ${i === 0 ? "disabled" : ""}>←</button>
          <button type="button" class="boton-icono" data-quitar aria-label="${esc(tr("panel.inventario.foto_quitar", { n: i + 1 }))}">✕</button>
          <button type="button" class="boton-icono" data-mover="1" aria-label="${esc(tr("panel.inventario.foto_despues", { n: i + 1 }))}" ${i === fotos.length - 1 ? "disabled" : ""}>→</button>
        </div>
      </li>`;
    }).join("");
    $("#zona-subida").hidden = fotos.length >= MAX_FOTOS;
  }

  async function agregarArchivos(archivos) {
    const errorEl = $("#e-fotos-error");
    errorEl.textContent = "";
    const lista = [...archivos].slice(0, MAX_FOTOS - fotos.length);
    if (archivos.length > lista.length) errorEl.textContent = tr("panel.inventario.max_fotos", { n: MAX_FOTOS });
    if (!lista.length) return;
    subiendo = true;
    const estadoEl = $("#subiendo");
    estadoEl.hidden = false;
    let i = 0;
    for (const archivo of lista) {
      estadoEl.innerHTML = `<span class="spinner" aria-hidden="true"></span>${esc(tr("panel.inventario.subiendo_fotos", { n: ++i, total: lista.length }))}`;
      try {
        const { grande, miniatura: mini, ext } = await comprimirFoto(archivo);
        const ruta = `equipos/${crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)}.${ext}`;
        await api.subirArchivo("fotos", ruta, grande);
        await api.subirArchivo("fotos", rutaMiniatura(ruta), mini);
        subidas.push(ruta);
        fotos.push(ruta);
        ctx.sucio = true;
        pintarFotos();
      } catch (e) {
        errorEl.textContent = e.message;
      }
    }
    subiendo = false;
    estadoEl.hidden = true;
  }

  $("#e-fotos").addEventListener("change", (e) => { agregarArchivos(e.target.files); e.target.value = ""; });
  $("#e-camara").addEventListener("change", (e) => { agregarArchivos(e.target.files); e.target.value = ""; });
  const zona = $("#zona-subida");
  zona.addEventListener("dragover", (e) => { if (e.dataTransfer.types.includes("Files")) { e.preventDefault(); zona.classList.add("encima"); } });
  zona.addEventListener("dragleave", () => zona.classList.remove("encima"));
  zona.addEventListener("drop", (e) => { e.preventDefault(); zona.classList.remove("encima"); agregarArchivos(e.dataTransfer.files); });

  const listaFotos = $("#fotos-lista");
  listaFotos.addEventListener("click", (e) => {
    const li = e.target.closest(".foto-item");
    if (!li) return;
    const i = Number(li.dataset.i);
    if (e.target.closest("[data-quitar]")) {
      const [r] = fotos.splice(i, 1);
      quitadas.push(r);
      ctx.sucio = true;
      pintarFotos();
      ($(`.foto-item[data-i="${Math.min(i, fotos.length - 1)}"] [data-quitar]`) || $("#e-fotos").labels?.[0])?.focus?.();
    }
    const mover = e.target.closest("[data-mover]");
    if (mover) {
      const j = i + Number(mover.dataset.mover);
      [fotos[i], fotos[j]] = [fotos[j], fotos[i]];
      ctx.sucio = true;
      pintarFotos();
      $(`.foto-item[data-i="${j}"] [data-mover="${mover.dataset.mover}"]`)?.focus() || $(`.foto-item[data-i="${j}"] [data-quitar]`)?.focus();
    }
  });
  listaFotos.addEventListener("dragstart", (e) => { const li = e.target.closest(".foto-item"); if (li) { arrastrada = Number(li.dataset.i); li.classList.add("arrastrando"); } });
  listaFotos.addEventListener("dragend", () => { arrastrada = -1; pintarFotos(); });
  listaFotos.addEventListener("dragover", (e) => { if (arrastrada >= 0) e.preventDefault(); });
  listaFotos.addEventListener("drop", (e) => {
    const li = e.target.closest(".foto-item");
    if (arrastrada < 0 || !li) return;
    e.preventDefault();
    const destino = Number(li.dataset.i);
    const [r] = fotos.splice(arrastrada, 1);
    fotos.splice(destino, 0, r);
    arrastrada = -1;
    ctx.sucio = true;
    pintarFotos();
  });

  // --- Video ---
  let video = q.video;
  let subiendoVideo = false;
  function pintarVideo() {
    const url = video ? api.urlArchivo("videos", video) : "";
    $("#video-actual").innerHTML = video
      ? `<video class="video-vista" src="${esc(url)}" controls preload="metadata" playsinline aria-label="${esc(tr("panel.inventario.video_aria"))}"></video>
         <div class="zona-subida-botones"><label class="boton boton--secundario" for="e-video">${esc(tr("panel.inventario.cambiar_video"))}</label>
         <button type="button" class="boton boton--enlace" id="quitar-video">${esc(tr("panel.inventario.quitar_video"))}</button></div>`
      : `<label class="boton boton--secundario" for="e-video">${esc(tr("panel.inventario.elegir_video"))}</label>`;
    $("#quitar-video")?.addEventListener("click", () => {
      videosQuitados.push(video);
      video = "";
      ctx.sucio = true;
      pintarVideo();
      $('label[for="e-video"]').focus();
    });
  }
  $("#e-video").addEventListener("change", async (e) => {
    const archivo = e.target.files[0];
    e.target.value = "";
    if (!archivo) return;
    const errorEl = $("#e-video-error");
    const estadoEl = $("#subiendo-video");
    errorEl.textContent = "";
    subiendoVideo = true;
    estadoEl.hidden = false;
    estadoEl.innerHTML = `<span class="spinner" aria-hidden="true"></span>${esc(tr("panel.inventario.revisando_video"))}`;
    try {
      // Se valida antes de subir: no se sube nada que no sirva.
      const { ext } = await validarVideo(archivo);
      estadoEl.innerHTML = `<span class="spinner" aria-hidden="true"></span>${esc(tr("panel.inventario.subiendo_video"))}`;
      const ruta = `equipos/${crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2)}.${ext}`;
      await api.subirArchivo("videos", ruta, archivo);
      if (video) videosQuitados.push(video);
      videosSubidos.push(ruta);
      video = ruta;
      ctx.sucio = true;
      pintarVideo();
    } catch (err) {
      errorEl.textContent = err.message;
    } finally {
      subiendoVideo = false;
      estadoEl.hidden = true;
    }
  });

  // --- Eventos del formulario ---
  form.addEventListener("input", () => { ctx.sucio = true; });
  form.addEventListener("change", (e) => {
    ctx.sucio = true;
    if (e.target.name === "e-capacidad" || e.target.name === "e-condicion" || e.target.id === "e-modelo") actualizarVisibles();
    if (e.target.id === "e-modelo") pintarColores();
    if (e.target.name === "e-color") { q.color_id = colorSel(); errorGrupo("e-color", ""); }
  });
  $("#e-precio").addEventListener("blur", (e) => { const p = leerPrecio(e.target.value); if (p) e.target.value = formatearMiles(p); });

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const malos = seccionesVisibles().filter((k) => !VALIDAR[k]());
    if (malos.length) {
      enfocarPrimerError(form);
      if (subiendo || subiendoVideo) avisar(tr("panel.inventario.espere_subidas"), "error");
      return;
    }
    const usado = condicion() === "usado";
    const datos = {
      modelo_id: modeloSel().id,
      condicion: condicion(),
      capacidad: capacidad(),
      color_id: colorSel(),
      color_nombre_mostrar: valor("#e-color-mostrar"),
      precio: leerPrecio(valor("#e-precio")),
      en_stock: $("#e-stock").checked,
      fotos,
      video,
      publicado: $("#e-publicado").checked,
      destacado: $("#e-destacado").checked,
      mas_vendido: $("#e-mas-vendido").checked,
      descripcion_extra: valor("#e-descripcion"),
      bateria_porcentaje: usado ? Number(valor("#e-bateria")) : null,
      estado_estetico: usado ? valor("#e-estado") : null,
      detalles: usado ? valor("#e-detalles") : "",
      incluye: usado ? valor("#e-incluye") : ""
    };
    try {
      await conBoton($("#guardar"), async () => {
        if (modo === "editar") await api.actualizarEquipo(original.id, datos);
        else await api.crearEquipo(datos);  // duplicar
        const m = modeloSel();
        if (!m.activo && $("#e-activar").checked) await api.guardarModelo(m.id, { activo: true });
      });
    } catch { return; }
    await borrarSinUso(api, "fotos", quitadas).catch(() => {});
    await borrarSinUso(api, "videos", videosQuitados.filter((r) => r !== video)).catch(() => {});
    subidas.length = 0;
    videosSubidos.length = 0;
    ctx.sucio = false;
    ctx.ir("inventario");
  });

  // Si se sale sin guardar, se borran las fotos subidas en esta edición.
  ctx.alSalir = () => {
    if (subidas.length) api.borrarArchivos("fotos", rutasDeFotos(subidas)).catch(() => {});
    if (videosSubidos.length) api.borrarArchivos("videos", videosSubidos).catch(() => {});
  };

  pintarFotos();
  pintarVideo();
  pintarColores();
  actualizarVisibles();
}
