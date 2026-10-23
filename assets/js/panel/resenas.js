// =============================================================================
// Reseñas (Mi tienda, 0014). Va fuera del formulario de Mi tienda: cada cambio
// se guarda solo (el interruptor y el título al cambiarlos; cada reseña al
// agregarla, editarla, moverla o borrarla).
// - Hasta 12. Cada una: imagen (comprimida como las fotos) o video (MP4 o
//   WebM, hasta 30 segundos y 20 MB, validado con video.js), texto y origen
//   opcionales, y la casilla de autorización obligatoria.
// - Cómo autorizó la persona (0034): canal, fecha y alcance, sin datos de
//   ella. Las reseñas de antes quedan "sin registrar" y se completan en su fila.
// - Aviso fijo sobre los datos personales de las capturas, arriba de la carga.
// =============================================================================

import { rutaMiniatura, MAX_RESENAS, MAX_SEGUNDOS_RESENA, ORIGENES_RESENA, TITULO_RESENAS, nombreOrigenResena, CANALES_AUTORIZACION, ALCANCES_AUTORIZACION } from "../datos/comun.js";
import { $, esc, conBoton, confirmar, campoTexto, interruptor, marcarError, enfocarPrimerError } from "./ui.js";
import { comprimirFoto } from "./imagenes.js";
import { validarVideo } from "./video.js";
import { t } from "../i18n/i18n.js";

const id = () => crypto.randomUUID?.() ?? Date.now().toString(36) + Math.random().toString(36).slice(2);
const opcionesOrigen = (elegido) => `<option value="">${esc(t("panel.resenas.sin_origen"))}</option>${ORIGENES_RESENA.map((o) => `<option value="${o.clave}" ${o.clave === elegido ? "selected" : ""}>${esc(nombreOrigenResena(o.clave))}</option>`).join("")}`;
// El título por defecto se guarda en español (TITULO_RESENAS); en pantalla se
// muestra traducido y, si se deja igual, se vuelve a guardar el de la base.
const tituloMostrado = (titulo) => (!titulo || titulo === TITULO_RESENAS ? t("panel.resenas.titulo_defecto") : titulo);

// --- Autorización (0034) ---
const pideFecha = (canal) => ["whatsapp", "correo", "presencial", "otro"].includes(canal);
const hoy = () => new Date().toISOString().slice(0, 10);
// Los campos de la autorización: los del formulario nuevo (p = "r") y los de cada fila (p = "ra-<id>").
function htmlAutorizacion(p, r = {}) {
  const canal = r.autorizacion_canal && r.autorizacion_canal !== "sin_registrar" ? r.autorizacion_canal : "";
  const con = pideFecha(canal);
  return `<div class="grilla-2">
      <div class="campo">
        <label for="${p}-canal">${esc(t("panel.resenas.autorizacion.canal"))}</label>
        <select class="entrada" id="${p}-canal" data-auth-canal aria-describedby="${p}-canal-error">
          <option value="">${esc(t("panel.resenas.autorizacion.elija"))}</option>
          ${CANALES_AUTORIZACION.map((c) => `<option value="${c}" ${c === canal ? "selected" : ""}>${esc(t(`panel.resenas.autorizacion.canal.${c}`))}</option>`).join("")}
        </select>
        <p class="error-campo" id="${p}-canal-error"></p>
      </div>
      <div class="campo" data-auth-con-fecha ${con ? "" : "hidden"}>
        <label for="${p}-fecha">${esc(t("panel.resenas.autorizacion.fecha"))}</label>
        <input class="entrada cifras" type="date" id="${p}-fecha" data-auth-fecha max="${hoy()}" value="${esc(r.autorizacion_fecha || "")}" aria-describedby="${p}-fecha-error">
        <p class="error-campo" id="${p}-fecha-error"></p>
      </div>
    </div>
    <div class="campo" data-auth-con-fecha ${con ? "" : "hidden"}>
      <label for="${p}-alcance">${esc(t("panel.resenas.autorizacion.alcance"))}</label>
      <select class="entrada" id="${p}-alcance" data-auth-alcance aria-describedby="${p}-alcance-error">
        <option value="">${esc(t("panel.resenas.autorizacion.elija"))}</option>
        ${ALCANCES_AUTORIZACION.map((a) => `<option value="${a}" ${a === r.autorizacion_alcance ? "selected" : ""}>${esc(t(`panel.resenas.autorizacion.alcance.${a}`))}</option>`).join("")}
      </select>
      <p class="error-campo" id="${p}-alcance-error"></p>
    </div>`;
}

// Valida los campos de la autorización de un bloque; devuelve los datos o null.
function leerAutorizacion(raiz, p) {
  const canal = $(`#${p}-canal`, raiz).value;
  const fecha = $(`#${p}-fecha`, raiz).value;
  const alcance = $(`#${p}-alcance`, raiz).value;
  const con = pideFecha(canal);
  let bien = marcarError(raiz, `${p}-canal`, canal ? "" : t("panel.resenas.error.canal"));
  bien = marcarError(raiz, `${p}-fecha`, !con || (fecha && fecha <= hoy()) ? "" : t("panel.resenas.error.fecha")) && bien;
  bien = marcarError(raiz, `${p}-alcance`, !con || alcance ? "" : t("panel.resenas.error.alcance")) && bien;
  return bien ? { autorizacion_canal: canal, autorizacion_fecha: con ? fecha : null, autorizacion_alcance: con ? alcance : "" } : null;
}

// Muestra la fecha y el alcance solo con un canal de autorización.
function alCambiarCanal(e) {
  const sel = e.target.closest("[data-auth-canal]");
  if (!sel) return;
  const bloque = sel.closest("[data-auth-bloque]");
  bloque.querySelectorAll("[data-auth-con-fecha]").forEach((x) => { x.hidden = !pideFecha(sel.value); });
}

export async function dibujar(caja, ctx, tienda) {
  const { api } = ctx;
  let resenas = await api.listarResenas();
  if (!caja.isConnected) return;

  caja.innerHTML = `
    <section class="bloque" aria-labelledby="t-resenas">
      <h2 id="t-resenas">${esc(t("panel.resenas.titulo"))}</h2>
      <p class="ayuda">${esc(t("panel.resenas.ayuda"))}</p>
      ${interruptor({ id: "r-mostrar", etiqueta: t("panel.resenas.mostrar"), marcado: tienda.mostrar_resenas })}
      ${campoTexto({ id: "r-titulo", etiqueta: t("panel.resenas.titulo_seccion"), valor: tituloMostrado(tienda.titulo_resenas), atributos: 'maxlength="80"' })}

      <h3 id="t-resenas-lista">${esc(t("panel.resenas.cargadas"))} <span class="ayuda cifras" id="r-cuenta"></span></h3>
      <ul class="lista-resenas" id="r-lista" aria-labelledby="t-resenas-lista"></ul>

      <form class="nueva-resena" id="form-resena" novalidate aria-labelledby="t-nueva-resena">
        <h3 id="t-nueva-resena">${esc(t("panel.resenas.nueva.titulo"))}</h3>
        <p class="aviso-datos" role="note">${esc(t("panel.resenas.aviso"))}</p>
        <div class="campo">
          <label for="r-archivo">${esc(t("panel.resenas.nueva.archivo"))}</label>
          <input class="entrada" type="file" id="r-archivo" accept="image/png,image/jpeg,image/webp,video/mp4,video/webm" aria-describedby="r-archivo-ayuda r-archivo-error">
          <p class="ayuda" id="r-archivo-ayuda">${esc(t("panel.resenas.nueva.archivo_ayuda", { segundos: MAX_SEGUNDOS_RESENA }))}</p>
          <p class="error-campo" id="r-archivo-error"></p>
        </div>
        ${campoTexto({ id: "r-texto", etiqueta: t("panel.resenas.nueva.texto"), multilinea: true, ayuda: esc(t("panel.resenas.nueva.texto_ayuda")), atributos: 'rows="3" maxlength="300"' })}
        <div class="grilla-2">
          <div class="campo">
            <label for="r-origen">${esc(t("panel.resenas.nueva.origen"))}</label>
            <select class="entrada" id="r-origen">${opcionesOrigen("")}</select>
          </div>
          <div id="r-origen-otro-caja" hidden>${campoTexto({ id: "r-origen-otro", etiqueta: t("panel.resenas.origen_cual"), atributos: 'maxlength="40"' })}</div>
        </div>
        <div class="campo">
          <label class="casilla" for="r-autorizado"><input type="checkbox" id="r-autorizado" aria-describedby="r-autorizado-error"><span>${esc(t("panel.resenas.autorizacion"))}</span></label>
          <p class="error-campo" id="r-autorizado-error"></p>
        </div>
        <fieldset class="bloque-autorizacion" data-auth-bloque aria-describedby="r-autorizacion-ayuda">
          <legend>${esc(t("panel.resenas.autorizacion.titulo"))}</legend>
          <p class="ayuda" id="r-autorizacion-ayuda">${esc(t("panel.resenas.autorizacion.ayuda"))}</p>
          ${htmlAutorizacion("r")}
        </fieldset>
        <p class="subiendo" id="r-subiendo" hidden></p>
        <button type="submit" class="boton boton--primario" id="r-agregar">${esc(t("panel.resenas.nueva.agregar"))}</button>
      </form>
    </section>`;

  const lista = $("#r-lista", caja);
  const form = $("#form-resena", caja);
  const url = (r) => api.urlArchivo("resenas", r.tipo === "imagen" ? rutaMiniatura(r.ruta) : r.ruta);

  function pintar() {
    $("#r-cuenta", caja).textContent = t("panel.resenas.cuenta", { n: resenas.length, max: MAX_RESENAS });
    lista.innerHTML = resenas.length ? resenas.map((r, i) => `<li class="resena-fila" data-id="${r.id}">
      <span class="resena-medio">${r.tipo === "imagen"
        ? `<img src="${esc(url(r))}" alt="" loading="lazy">`
        : '<span class="resena-video" aria-hidden="true">▶</span>'}</span>
      <div class="resena-campos">
        <p class="resena-tipo">${esc(t(r.tipo === "imagen" ? "panel.resenas.fila.imagen" : "panel.resenas.fila.video", { n: i + 1 }))}</p>
        ${campoTexto({ id: `rt-${r.id}`, etiqueta: t("panel.resenas.fila.texto"), valor: r.texto, multilinea: true, atributos: `rows="2" maxlength="300" data-texto` })}
        <div class="grilla-2">
          <div class="campo"><label for="ro-${r.id}">${esc(t("panel.resenas.fila.origen"))}</label><select class="entrada" id="ro-${r.id}" data-origen>${opcionesOrigen(r.origen)}</select></div>
          ${r.origen === "otro" ? campoTexto({ id: `rx-${r.id}`, etiqueta: t("panel.resenas.origen_cual"), valor: r.origen_otro, atributos: 'maxlength="40" data-origen-otro' }) : ""}
        </div>
        <fieldset class="bloque-autorizacion" data-auth-bloque>
          <legend>${esc(t("panel.resenas.autorizacion.titulo"))}</legend>
          ${r.autorizacion_canal === "sin_registrar" ? `<p class="aviso-datos" role="note">${esc(t("panel.resenas.autorizacion.falta"))}</p>` : ""}
          ${htmlAutorizacion(`ra-${r.id}`, r)}
          <button type="button" class="boton boton--secundario" data-auth-guardar>${esc(t("panel.resenas.autorizacion.guardar"))}</button>
        </fieldset>
      </div>
      <div class="resena-botones">
        <button type="button" class="boton-icono" data-mover="-1" aria-label="${esc(t("panel.resenas.fila.subir", { n: i + 1 }))}" ${i === 0 ? "disabled" : ""}>↑</button>
        <button type="button" class="boton-icono" data-mover="1" aria-label="${esc(t("panel.resenas.fila.bajar", { n: i + 1 }))}" ${i === resenas.length - 1 ? "disabled" : ""}>↓</button>
        <button type="button" class="boton boton--peligro boton--chico" data-borrar>${esc(t("panel.resenas.fila.borrar"))}</button>
      </div>
    </li>`).join("") : `<li class="vacio-panel">${esc(t("panel.resenas.vacio"))}</li>`;
    const lleno = resenas.length >= MAX_RESENAS;
    $("#r-agregar", caja).disabled = lleno;
    $("#r-archivo", caja).disabled = lleno;
    if (lleno) $("#r-archivo-error", caja).textContent = t("panel.resenas.lleno", { max: MAX_RESENAS });
  }

  // --- Interruptor y título ---
  $("#r-mostrar", caja).addEventListener("change", async (e) => {
    try { await conBoton(null, () => api.guardarTienda({ mostrar_resenas: e.target.checked })); } catch { e.target.checked = !e.target.checked; }
  });
  $("#r-titulo", caja).addEventListener("change", async (e) => {
    // Vacío o igual al título por defecto mostrado: se guarda el de la base.
    const escrito = e.target.value.trim();
    const titulo = !escrito || escrito === t("panel.resenas.titulo_defecto") ? TITULO_RESENAS : escrito;
    e.target.value = tituloMostrado(titulo);
    try { await conBoton(null, () => api.guardarTienda({ titulo_resenas: titulo })); } catch { /* aviso mostrado */ }
  });

  // --- Cada reseña: texto, origen, orden y borrar ---
  lista.addEventListener("change", async (e) => {
    const fila = e.target.closest(".resena-fila");
    if (!fila) return;
    if (e.target.closest("[data-auth-bloque]")) { alCambiarCanal(e); return; } // se guarda con su botón
    const r = resenas.find((x) => x.id === fila.dataset.id);
    let cambios = null;
    if (e.target.dataset.texto !== undefined) cambios = { texto: e.target.value.trim() };
    if (e.target.dataset.origen !== undefined) cambios = { origen: e.target.value, origen_otro: "" };
    if (e.target.dataset.origenOtro !== undefined) cambios = { origen_otro: e.target.value.trim() };
    if (!cambios) return;
    try {
      Object.assign(r, await conBoton(null, () => api.guardarResena(r.id, cambios)));
      if ("origen" in cambios) { pintar(); $(`#ro-${r.id}`, caja)?.focus(); }
    } catch { pintar(); }
  });
  lista.addEventListener("click", async (e) => {
    const fila = e.target.closest(".resena-fila");
    if (!fila) return;
    const i = resenas.findIndex((x) => x.id === fila.dataset.id);
    const r = resenas[i];
    if (e.target.closest("[data-auth-guardar]")) {
      const datos = leerAutorizacion(fila, `ra-${r.id}`);
      if (!datos) { enfocarPrimerError(fila); return; }
      try {
        Object.assign(r, await conBoton(null, () => api.guardarResena(r.id, datos), { exito: t("panel.resenas.autorizacion.guardada") }));
        pintar();
        lista.querySelector(`.resena-fila[data-id="${r.id}"] [data-auth-guardar]`)?.focus();
      } catch { /* aviso mostrado */ }
      return;
    }
    if (e.target.closest("[data-borrar]")) {
      if (!(await confirmar({ titulo: t("panel.resenas.borrar.titulo"), texto: t("panel.resenas.borrar.texto"), aceptar: t("panel.resenas.fila.borrar"), peligro: true }))) return;
      try {
        await conBoton(null, () => api.borrarResena(r.id), { exito: t("panel.resenas.borrada") });
        api.borrarArchivos("resenas", r.tipo === "imagen" ? [r.ruta, rutaMiniatura(r.ruta)] : [r.ruta]).catch(() => {});
        resenas.splice(i, 1);
        $("#r-archivo-error", caja).textContent = "";
        pintar();
      } catch { /* aviso mostrado */ }
      return;
    }
    const b = e.target.closest("[data-mover]");
    if (!b) return;
    const j = i + Number(b.dataset.mover);
    if (!resenas[j]) return;
    [resenas[i], resenas[j]] = [resenas[j], resenas[i]];
    try {
      // Se guarda el orden de todas (0, 1, 2…), así queda siempre parejo.
      await conBoton(null, async () => {
        for (const [k, x] of resenas.entries()) if (x.orden !== k) Object.assign(x, await api.guardarResena(x.id, { orden: k }));
      });
    } catch { resenas = await api.listarResenas(); }
    pintar();
    lista.querySelector(`.resena-fila[data-id="${r.id}"] [data-mover="${b.dataset.mover}"]`)?.focus();
  });

  // --- Agregar ---
  $("#r-origen", caja).addEventListener("change", (e) => { $("#r-origen-otro-caja", caja).hidden = e.target.value !== "otro"; });
  form.addEventListener("change", alCambiarCanal);
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const archivo = $("#r-archivo", caja).files[0];
    const esVideo = Boolean(archivo && (/^video\//.test(archivo.type) || /\.(mp4|webm|mov)$/i.test(archivo.name)));
    marcarError(form, "r-archivo", archivo ? "" : t("panel.resenas.error.archivo"));
    marcarError(form, "r-autorizado", $("#r-autorizado", caja).checked ? "" : t("panel.resenas.error.autorizado"));
    const autorizacion = leerAutorizacion(form, "r");
    if (enfocarPrimerError(form)) return;
    const estado = $("#r-subiendo", caja);
    const boton = $("#r-agregar", caja);
    const subidas = [];
    estado.hidden = false;
    boton.disabled = true;
    try {
      let ruta;
      if (esVideo) {
        estado.innerHTML = `<span class="spinner" aria-hidden="true"></span>${esc(t("panel.resenas.estado.revisando"))}`;
        // Se valida antes de subir: no se sube nada que no sirva.
        const { ext } = await validarVideo(archivo, { maxSegundos: MAX_SEGUNDOS_RESENA });
        estado.innerHTML = `<span class="spinner" aria-hidden="true"></span>${esc(t("panel.resenas.estado.subiendo_video"))}`;
        ruta = `resenas/${id()}.${ext}`;
        await api.subirArchivo("resenas", ruta, archivo);
        subidas.push(ruta);
      } else {
        estado.innerHTML = `<span class="spinner" aria-hidden="true"></span>${esc(t("panel.resenas.estado.subiendo_imagen"))}`;
        const { grande, miniatura, ext } = await comprimirFoto(archivo);
        ruta = `resenas/${id()}.${ext}`;
        await api.subirArchivo("resenas", ruta, grande);
        subidas.push(ruta);
        await api.subirArchivo("resenas", rutaMiniatura(ruta), miniatura);
        subidas.push(rutaMiniatura(ruta));
      }
      const origen = $("#r-origen", caja).value;
      const nueva = await conBoton(null, () => api.agregarResena({
        tipo: esVideo ? "video" : "imagen", ruta, texto: $("#r-texto", caja).value.trim(),
        origen, origen_otro: origen === "otro" ? $("#r-origen-otro", caja).value.trim() : "",
        autorizado: true, orden: resenas.length ? Math.max(...resenas.map((x) => x.orden)) + 1 : 0,
        ...autorizacion
      }), { exito: t("panel.resenas.agregada") });
      resenas.push(nueva);
      form.reset();
      $("#r-origen-otro-caja", caja).hidden = true;
      form.querySelectorAll("[data-auth-con-fecha]").forEach((x) => { x.hidden = true; });
      pintar();
    } catch (err) {
      // Si algo falló después de subir, no quedan archivos sueltos.
      if (subidas.length) api.borrarArchivos("resenas", subidas).catch(() => {});
      marcarError(form, "r-archivo", err.message);
      $("#r-archivo", caja).focus();
    } finally {
      estado.hidden = true;
      boton.disabled = resenas.length >= MAX_RESENAS;
    }
  });

  pintar();
}
