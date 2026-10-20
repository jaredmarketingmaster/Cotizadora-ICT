// =============================================================================
// Inventario: lista con filtros y edición rápida (precio, stock sí/no, publicado),
// formulario por pasos para agregar, edición completa, duplicar y borrar.
// =============================================================================

import { formatearCOP, formatearMiles, leerPrecio, CAPACIDADES_SUGERIDAS, capacidadEnGB } from "../utils.js";
import { rutaMiniatura, ESTADOS_ESTETICOS, nombreColor } from "../datos/comun.js";
import { telefonoSVG } from "../ilustracion.js";
import { etiquetaGeneracion } from "../sitio/catalogo.js";
import { $, $$, esc, avisar, confirmar, conBoton, campoTexto, interruptor, marcarError, enfocarPrimerError } from "./ui.js";
import { comprimirFoto } from "./imagenes.js";
import { validarVideo } from "./video.js";

const MAX_FOTOS = 6;

function nombreModelo(modelos, id) {
  return modelos.find((m) => m.id === id)?.nombre || "Modelo borrado";
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

function rutasDeFotos(fotos) {
  return (fotos || []).flatMap((r) => [r, rutaMiniatura(r)]);
}

export async function dibujar(vista, ctx, resto, params) {
  if (resto[0] === "nuevo") return formulario(vista, ctx, { modo: params.get("desde") ? "duplicar" : "nuevo", desde: params.get("desde") });
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
      <h1>Inventario</h1>
      <a class="boton boton--primario" href="#/inventario/nuevo">Agregar equipo</a>
    </div>
    <div class="barra-filtros">
      <div class="campo"><label for="b-texto">Buscar</label><input class="entrada" id="b-texto" type="search" placeholder="Modelo, color o capacidad"></div>
      <div class="campo"><label for="b-modelo">Modelo</label><select class="entrada" id="b-modelo"><option value="">Todos</option>${conEquipos.map((m) => `<option value="${m.id}">${esc(m.nombre)}</option>`).join("")}</select></div>
      <div class="campo"><label for="b-condicion">Condición</label><select class="entrada" id="b-condicion"><option value="">Todas</option><option value="nuevo">Nuevo</option><option value="usado">Usado</option></select></div>
      <div class="campo"><label for="b-publicado">Publicado</label><select class="entrada" id="b-publicado"><option value="">Todos</option><option value="si">Sí</option><option value="no">No</option></select></div>
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
      q.es_demo && "DEMO",
      !activos.has(q.modelo_id) && "modelo inactivo: no se ve",
      !q.en_stock && "sin stock: no se ve",
      q.condicion === "usado" && q.bateria_porcentaje != null && `batería ${q.bateria_porcentaje}%`
    ].filter(Boolean);
    return `<li class="fila-equipo" data-id="${q.id}">
      <span class="fila-foto">${miniatura(api, q, colores)}</span>
      <div class="fila-info">
        <span class="fila-nombre">${esc(nombre)}</span>
        <span class="fila-sub">${[q.condicion === "usado" ? "Usado" : "Nuevo", q.capacidad, colorDe(q, colores)].filter(Boolean).map(esc).join(" · ")}</span>
        ${notas.length ? `<span class="fila-sub">${esc(notas.join(" · "))}</span>` : ""}
      </div>
      <div class="fila-edicion">
        <div class="campo"><label for="p-${q.id}">Precio</label><input class="entrada cifras" id="p-${q.id}" data-campo="precio" inputmode="numeric" value="${formatearMiles(q.precio)}"></div>
        ${interruptor({ id: `s-${q.id}`, etiqueta: "Stock", marcado: q.en_stock, atributos: 'data-campo="en_stock"', estados: ["Con stock", "Sin stock"] })}
        ${interruptor({ id: `v-${q.id}`, etiqueta: "Publicado", marcado: q.publicado, atributos: 'data-campo="publicado"' })}
      </div>
      <div class="fila-acciones">
        <a class="boton boton--suave boton--chico" href="#/inventario/${q.id}">Editar</a>
        <a class="boton boton--suave boton--chico" href="#/inventario/nuevo?desde=${q.id}">Duplicar</a>
        <button type="button" class="boton boton--peligro boton--chico" data-borrar>Borrar</button>
      </div>
      <p class="error-campo fila-error" role="alert"></p>
    </li>`;
  }

  function pintar() {
    const lista = filtrados();
    const especial = $("#filtro-especial");
    especial.hidden = !estado.especial;
    especial.innerHTML = estado.especial
      ? `<span>Mostrando solo ${estado.especial === "sin-stock" ? "equipos sin stock" : "equipos sin foto"}.</span> <button type="button" class="boton boton--enlace" id="quitar-especial">Ver todos</button>`
      : "";
    $("#quitar-especial")?.addEventListener("click", () => { estado.especial = ""; pintar(); });
    $("#cuenta").textContent = `${lista.length} de ${equipos.length} equipos`;
    $("#lista").innerHTML = lista.length
      ? lista.map(fila).join("")
      : `<li class="vacio-panel">${equipos.length ? "No hay equipos con esos filtros." : "Todavía no hay equipos. Toque «Agregar equipo» para cargar el primero."}</li>`;
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
      if (valor == null) { error.textContent = "El precio debe ser un número entero mayor que 0."; input.setAttribute("aria-invalid", "true"); return; }
      if (valor === q.precio) { input.value = formatearMiles(q.precio); return; }
    } else {
      valor = input.checked;
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
      titulo: "¿Borrar este equipo?",
      texto: `${nombreModelo(modelos, q.modelo_id)} ${q.capacidad}${colorDe(q, colores) ? ` ${colorDe(q, colores)}` : ""}. Se borran también sus fotos y su video. Si solo quiere ocultarlo, márquelo «Sin stock» o desmarque «Publicado».`,
      aceptar: "Borrar", peligro: true
    });
    if (!ok) return;
    await conBoton(null, async () => {
      await api.borrarEquipo(q.id);
      await api.borrarArchivos("fotos", rutasDeFotos(q.fotos)).catch(() => {});
      if (q.video) await api.borrarArchivos("videos", [q.video]).catch(() => {});
    }, { exito: "Equipo borrado" });
    equipos.splice(equipos.indexOf(q), 1);
    pintar();
  });

  pintar();
}

// --- Formulario (por pasos al agregar; completo al editar o duplicar) -----------

const PASOS = [
  ["modelo", "Modelo"],
  ["condicion", "Condición"],
  ["capacidad", "Capacidad"],
  ["color", "Color"],
  ["precio", "Precio y stock"],
  ["fotos", "Fotos y video"],
  ["usado", "Datos del usado"],
  ["publicar", "Publicar"]
];

async function formulario(vista, ctx, { modo, id, desde }) {
  const { api } = ctx;
  const [equipos, modelos, listaColores] = await Promise.all([api.listarEquipos(), api.listarModelos(), api.listarColores()]);
  const original = id ? equipos.find((q) => q.id === id) : null;
  if (modo === "editar" && !original) {
    vista.innerHTML = '<p class="popup-alerta">Ese equipo ya no existe.</p><a class="volver" href="#/inventario">← Volver al inventario</a>';
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
    bateria_porcentaje: fuente?.bateria_porcentaje ?? null, estado_estetico: fuente?.estado_estetico ?? null,
    detalles: fuente?.detalles ?? "", incluye: fuente?.incluye ?? ""
  };
  const porPasos = modo === "nuevo";
  let paso = 0;
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
  const titulo = { nuevo: "Agregar equipo", editar: "Editar equipo", duplicar: "Duplicar equipo" }[modo];

  vista.innerHTML = `
    <a class="volver" href="#/inventario">← Inventario</a>
    <div class="vista-cabecera"><h1>${titulo}</h1>
      ${modo === "duplicar" ? "<p>Se copiaron los datos del equipo. Cambie el color o la capacidad y cargue sus fotos.</p>" : ""}
    </div>
    <form id="form-equipo" novalidate>
      ${porPasos ? `<div class="pasos-progreso" aria-hidden="true">${PASOS.map(() => "<span></span>").join("")}</div><p class="paso-titulo" id="paso-titulo" aria-live="polite"></p>` : ""}

      <fieldset class="bloque" data-paso="modelo">
        <legend class="oculto-visual">Modelo</legend>
        <div class="campo">
          <label for="e-modelo">Modelo</label>
          <select class="entrada" id="e-modelo" aria-describedby="e-modelo-error">
            <option value="">Elija el modelo</option>
            ${generaciones.map((g) => `<optgroup label="${esc(etiquetaGeneracion(g.nombre))}">${g.modelos.map((m) => `<option value="${m.id}" ${m.id === q.modelo_id ? "selected" : ""}>${esc(m.nombre)}${m.activo ? "" : " (inactivo)"}</option>`).join("")}</optgroup>`).join("")}
          </select>
          <p class="error-campo" id="e-modelo-error"></p>
        </div>
        <div id="aviso-inactivo" hidden>
          <p class="ayuda">Este modelo está inactivo en el catálogo: sus equipos no se ven en el sitio.</p>
          ${interruptor({ id: "e-activar", etiqueta: "Activar el modelo al guardar", marcado: true })}
        </div>
      </fieldset>

      <fieldset class="bloque" data-paso="condicion" aria-describedby="e-condicion-error">
        <legend>Condición</legend>
        <div class="opciones-chip">
          ${["nuevo", "usado"].map((c) => `<label class="opcion-chip"><input type="radio" name="e-condicion" value="${c}" ${q.condicion === c ? "checked" : ""}><span>${c === "nuevo" ? "Nuevo" : "Usado"}</span></label>`).join("")}
        </div>
        <p class="ayuda">Un nuevo es una variante (modelo, capacidad y color). Un usado es una sola unidad física.</p>
        <p class="error-campo" id="e-condicion-error"></p>
      </fieldset>

      <fieldset class="bloque" data-paso="capacidad" aria-describedby="e-capacidad-error">
        <legend>Capacidad</legend>
        <div class="opciones-chip">
          ${CAPACIDADES_SUGERIDAS.map((c) => `<label class="opcion-chip"><input type="radio" name="e-capacidad" value="${c}" ${q.capacidad === c ? "checked" : ""}><span>${c}</span></label>`).join("")}
          <label class="opcion-chip"><input type="radio" name="e-capacidad" value="otra" ${!capsSugeridas ? "checked" : ""}><span>Otra</span></label>
        </div>
        <div class="campo" id="caja-otra" ${capsSugeridas ? "hidden" : ""}>
          <label for="e-capacidad-otra">Escriba la capacidad</label>
          <input class="entrada" id="e-capacidad-otra" value="${capsSugeridas ? "" : esc(q.capacidad)}" placeholder="Ej. 32 GB">
        </div>
        <p class="error-campo" id="e-capacidad-error"></p>
      </fieldset>

      <fieldset class="bloque" data-paso="color" aria-describedby="e-color-error">
        <legend>Color</legend>
        <p class="ayuda">Los colores oficiales del modelo. Para agregar o completar colores, vaya a Catálogo.</p>
        <div class="opciones-color" id="opciones-color"></div>
        <p class="error-campo" id="e-color-error"></p>
        ${campoTexto({ id: "e-color-mostrar", etiqueta: "Nombre que verá el cliente (opcional)", valor: q.color_nombre_mostrar, ayuda: "Por ejemplo, el nombre en español. Si lo deja vacío, se muestra el nombre oficial en inglés.", atributos: 'maxlength="40"' })}
      </fieldset>

      <fieldset class="bloque" data-paso="precio">
        <legend>Precio y stock</legend>
        ${campoTexto({ id: "e-precio", etiqueta: "Precio en pesos", valor: q.precio ? formatearMiles(q.precio) : "", ayuda: "Número entero, sin decimales. Ej. 5.299.000", atributos: 'inputmode="numeric" autocomplete="off"' })}
        ${interruptor({ id: "e-stock", etiqueta: "Stock", marcado: q.en_stock, estados: ["Con stock", "Sin stock"] })}
        <p class="ayuda">Sin stock, el equipo deja de verse en el sitio, sin borrarse.</p>
      </fieldset>

      <fieldset class="bloque" data-paso="fotos">
        <legend>Fotos</legend>
        <p class="ayuda">Hasta ${MAX_FOTOS}. La primera es la principal. Se comprimen solas (WebP, máx. 1600 px). JPG, PNG, WebP o HEIC de hasta 10 MB.</p>
        <ul class="fotos-lista" id="fotos-lista"></ul>
        <div class="zona-subida" id="zona-subida">
          <p>Arrastre las fotos aquí o</p>
          <div class="zona-subida-botones">
            <label class="boton boton--secundario" for="e-fotos">Elegir fotos</label>
            <label class="boton boton--secundario" for="e-camara">Usar la cámara</label>
          </div>
          <input class="oculto-visual" id="e-fotos" type="file" accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif" multiple>
          <input class="oculto-visual" id="e-camara" type="file" accept="image/*" capture="environment">
        </div>
        <p class="subiendo" id="subiendo" role="status" hidden></p>
        <p class="error-campo" id="e-fotos-error" role="alert"></p>
        <div class="campo bloque-video">
          <span class="etiqueta" id="e-video-titulo">Video (opcional)</span>
          <p class="ayuda" id="e-video-ayuda">Un video corto del equipo: MP4 o WebM, de hasta 15 segundos y 20 MB. Se sube tal cual, sin comprimir. En el sitio solo se descarga si el cliente lo toca.</p>
          <div id="video-actual"></div>
          <input class="oculto-visual" id="e-video" type="file" accept="video/mp4,video/webm,.mp4,.webm" aria-describedby="e-video-ayuda e-video-error">
          <p class="subiendo" id="subiendo-video" role="status" hidden></p>
          <p class="error-campo" id="e-video-error" role="alert"></p>
        </div>
      </fieldset>

      <fieldset class="bloque" data-paso="usado">
        <legend>Datos del usado</legend>
        <div class="grilla-2">
          ${campoTexto({ id: "e-bateria", etiqueta: "Batería (%)", valor: q.bateria_porcentaje ?? "", tipo: "number", ayuda: "De 0 a 100.", atributos: 'inputmode="numeric" min="0" max="100"' })}
          <div class="campo">
            <label for="e-estado">Estado estético</label>
            <select class="entrada" id="e-estado" aria-describedby="e-estado-error">
              <option value="">Elija el estado</option>
              ${ESTADOS_ESTETICOS.map((s) => `<option ${q.estado_estetico === s ? "selected" : ""}>${s}</option>`).join("")}
            </select>
            <p class="error-campo" id="e-estado-error"></p>
          </div>
        </div>
        ${campoTexto({ id: "e-detalles", etiqueta: "Detalles", valor: q.detalles, ayuda: "Ej. rayón leve en el marco.", multilinea: true, atributos: 'rows="3" maxlength="500"' })}
        ${campoTexto({ id: "e-incluye", etiqueta: "Qué incluye", valor: q.incluye, ayuda: "Ej. caja y cable.", atributos: 'maxlength="200"' })}
      </fieldset>

      <fieldset class="bloque" data-paso="publicar">
        <legend>Publicar</legend>
        ${interruptor({ id: "e-publicado", etiqueta: "Publicado (se ve en el sitio si tiene stock)", marcado: q.publicado })}
        ${interruptor({ id: "e-destacado", etiqueta: "Destacado (sale primero en la galería)", marcado: q.destacado })}
        ${campoTexto({ id: "e-descripcion", etiqueta: "Descripción extra (opcional)", valor: q.descripcion_extra, ayuda: "Se muestra en la ficha, debajo de la descripción del modelo.", multilinea: true, atributos: 'rows="3" maxlength="800"' })}
        <div id="resumen-equipo" class="ayuda"></div>
      </fieldset>

      <div class="acciones-formulario">
        ${porPasos ? `
          <button type="button" class="boton boton--secundario" id="anterior">Anterior</button>
          <button type="button" class="boton boton--primario" id="siguiente">Siguiente</button>` : ""}
        <button type="submit" class="boton boton--primario" id="guardar">${modo === "editar" ? "Guardar cambios" : "Guardar equipo"}</button>
      </div>
    </form>`;

  const form = $("#form-equipo");
  const valor = (sel) => $(sel, form).value.trim();
  const condicion = () => $('input[name="e-condicion"]:checked', form)?.value || "";
  const modeloSel = () => modelos.find((m) => m.id === Number(valor("#e-modelo")));
  const pasosVisibles = () => PASOS.filter(([k]) => k !== "usado" || condicion() === "usado");

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
      ? '<p class="ayuda">Elija primero el modelo.</p>'
      : lista.length
        ? lista.map((c) => `<label class="opcion-color"><input type="radio" name="e-color" value="${c.id}" ${q.color_id === c.id ? "checked" : ""}>
            <span class="muestra-color${c.hex ? "" : " muestra-color--vacia"}" ${c.hex ? `style="background:${esc(c.hex)}"` : ""} aria-hidden="true"></span>
            <span class="opcion-color-nombres"><span>${esc(c.nombre_en || c.nombre_es)}</span>${c.nombre_en ? `<span class="ayuda">${esc(c.nombre_es)}</span>` : ""}</span>
          </label>`).join("")
        : '<p class="ayuda">Este modelo no tiene colores cargados. Puede guardar el equipo sin color o agregar los colores en Catálogo.</p>';
  }
  const colorSel = () => {
    const v = $('input[name="e-color"]:checked', form)?.value;
    return v ? Number(v) : null;
  };

  function actualizarVisibles() {
    const m = modeloSel();
    $("#aviso-inactivo").hidden = !m || m.activo;
    const usado = condicion() === "usado";
    $('[data-paso="usado"]', form).hidden = porPasos ? pasosVisibles()[paso]?.[0] !== "usado" : !usado;
    $("#caja-otra").hidden = $('input[name="e-capacidad"]:checked', form)?.value !== "otra";
  }

  function mostrarPaso() {
    const visibles = pasosVisibles();
    paso = Math.min(paso, visibles.length - 1);
    const actual = visibles[paso][0];
    $$("[data-paso]", form).forEach((f) => { f.hidden = f.dataset.paso !== actual; });
    $$(".pasos-progreso span", form).forEach((s, i) => s.classList.toggle("hecho", i <= Math.round((paso / (visibles.length - 1)) * (PASOS.length - 1))));
    $("#paso-titulo").textContent = `Paso ${paso + 1} de ${visibles.length}: ${visibles[paso][1]}`;
    $("#anterior").hidden = paso === 0;
    const ultimo = paso === visibles.length - 1;
    $("#siguiente").hidden = ultimo;
    $("#guardar").hidden = !ultimo;
    if (actual === "publicar") dibujarResumen();
    const primero = $(`[data-paso="${actual}"]`, form).querySelector("input:not([type=hidden]):not(.oculto-visual), select, textarea");
    primero?.focus();
  }

  function dibujarResumen() {
    const m = modeloSel();
    const precio = leerPrecio(valor("#e-precio"));
    const color = nombreColor(listaColores.find((c) => c.id === colorSel()), valor("#e-color-mostrar"));
    $("#resumen-equipo").innerHTML = `Resumen: <strong>${esc([m?.nombre, condicion() === "usado" ? "Usado" : "Nuevo", capacidad(), color].filter(Boolean).join(" · "))}</strong>
      ${precio ? ` · ${formatearCOP(precio)}` : ""} · ${$("#e-stock").checked ? "con stock" : "sin stock"} · ${fotos.length} foto${fotos.length === 1 ? "" : "s"}${video ? " · con video" : ""}`;
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
    modelo: () => marcarError(form, "e-modelo", modeloSel() ? "" : "Elija el modelo."),
    condicion: () => errorGrupo("e-condicion", condicion() ? "" : "Elija si es nuevo o usado."),
    capacidad: () => errorGrupo("e-capacidad", capacidad() ? "" : "Elija o escriba la capacidad."),
    color: () => {
      const hay = Boolean(modeloSel()) && listaColores.some((c) => c.modelo_id === modeloSel().id);
      return errorGrupo("e-color", hay && !colorSel() ? "Elija el color." : "");
    },
    precio: () => {
      return marcarError(form, "e-precio", leerPrecio(valor("#e-precio")) ? "" : "El precio debe ser un número entero mayor que 0.");
    },
    fotos: () => !subiendo && !subiendoVideo,
    usado: () => {
      if (condicion() !== "usado") return true;
      const b = valor("#e-bateria");
      const n = Number(b);
      const a = marcarError(form, "e-bateria", b !== "" && Number.isInteger(n) && n >= 0 && n <= 100 ? "" : "La batería debe ser un número entero de 0 a 100.");
      const c = marcarError(form, "e-estado", valor("#e-estado") ? "" : "Elija el estado estético.");
      return a && c;
    },
    publicar: () => true
  };

  // --- Fotos ---
  let fotos = [...q.fotos];
  let subiendo = false;
  let arrastrada = -1;

  function pintarFotos() {
    $("#fotos-lista").innerHTML = fotos.map((r, i) => {
      const url = api.urlArchivo("fotos", rutaMiniatura(r)) || api.urlArchivo("fotos", r);
      return `<li class="foto-item" draggable="true" data-i="${i}">
        ${i === 0 ? '<span class="principal">Principal</span>' : ""}
        <img src="${esc(url)}" alt="Foto ${i + 1}">
        <div class="foto-botones">
          <button type="button" class="boton-icono" data-mover="-1" aria-label="Mover la foto ${i + 1} antes" ${i === 0 ? "disabled" : ""}>←</button>
          <button type="button" class="boton-icono" data-quitar aria-label="Quitar la foto ${i + 1}">✕</button>
          <button type="button" class="boton-icono" data-mover="1" aria-label="Mover la foto ${i + 1} después" ${i === fotos.length - 1 ? "disabled" : ""}>→</button>
        </div>
      </li>`;
    }).join("");
    $("#zona-subida").hidden = fotos.length >= MAX_FOTOS;
  }

  async function agregarArchivos(archivos) {
    const errorEl = $("#e-fotos-error");
    errorEl.textContent = "";
    const lista = [...archivos].slice(0, MAX_FOTOS - fotos.length);
    if (archivos.length > lista.length) errorEl.textContent = `Máximo ${MAX_FOTOS} fotos por equipo.`;
    if (!lista.length) return;
    subiendo = true;
    const estadoEl = $("#subiendo");
    estadoEl.hidden = false;
    let i = 0;
    for (const archivo of lista) {
      estadoEl.innerHTML = `<span class="spinner" aria-hidden="true"></span>Subiendo ${++i} de ${lista.length}…`;
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
      ? `<video class="video-vista" src="${esc(url)}" controls preload="metadata" playsinline aria-label="Video del equipo"></video>
         <div class="zona-subida-botones"><label class="boton boton--secundario" for="e-video">Cambiar video</label>
         <button type="button" class="boton boton--enlace" id="quitar-video">Quitar video</button></div>`
      : '<label class="boton boton--secundario" for="e-video">Elegir video</label>';
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
    estadoEl.innerHTML = '<span class="spinner" aria-hidden="true"></span>Revisando el video…';
    try {
      // Se valida antes de subir: no se sube nada que no sirva.
      const { ext } = await validarVideo(archivo);
      estadoEl.innerHTML = '<span class="spinner" aria-hidden="true"></span>Subiendo el video…';
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
    if (porPasos && e.target.name === "e-condicion") mostrarPaso();
  });
  $("#e-precio").addEventListener("blur", (e) => { const p = leerPrecio(e.target.value); if (p) e.target.value = formatearMiles(p); });

  if (porPasos) {
    $("#siguiente").addEventListener("click", () => {
      const actual = pasosVisibles()[paso][0];
      if (!VALIDAR[actual]()) { enfocarPrimerError(form); return; }
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
  }

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const malos = pasosVisibles().map(([k]) => k).filter((k) => !VALIDAR[k]());
    if (malos.length) {
      if (porPasos) { paso = pasosVisibles().findIndex(([k]) => k === malos[0]); mostrarPaso(); }
      enfocarPrimerError(form);
      if (subiendo || subiendoVideo) avisar("Espere a que terminen de subir las fotos y el video.", "error");
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
      descripcion_extra: valor("#e-descripcion"),
      bateria_porcentaje: usado ? Number(valor("#e-bateria")) : null,
      estado_estetico: usado ? valor("#e-estado") : null,
      detalles: usado ? valor("#e-detalles") : "",
      incluye: usado ? valor("#e-incluye") : ""
    };
    try {
      await conBoton($("#guardar"), async () => {
        if (modo === "editar") await api.actualizarEquipo(original.id, datos);
        else await api.crearEquipo(datos);
        const m = modeloSel();
        if (!m.activo && $("#e-activar").checked) await api.guardarModelo(m.id, { activo: true });
      });
    } catch { return; }
    await api.borrarArchivos("fotos", rutasDeFotos(quitadas)).catch(() => {});
    if (videosQuitados.length) await api.borrarArchivos("videos", videosQuitados.filter((r) => r !== video)).catch(() => {});
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
  if (porPasos) mostrarPaso();
}
