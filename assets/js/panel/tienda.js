// =============================================================================
// Mi tienda: país (moneda, números, zona horaria y celular), datos, redes, marca (logo con recorte, favicon, colores y tema con
// vista previa en vivo), datos de venta (entrega y garantía) y, fuera del
// formulario, las reseñas (resenas.js; se guardan solas).
// =============================================================================

import { hexValido, soloDigitos, correoValido, contraste, reducirMovimiento } from "../utils.js";
import { PAISES_TIENDA, datosPais, whatsappValido } from "../datos/paises.js";
import { PAISES_DISPONIBLES } from "../legal/paises/indice.js";
import { textoSinModulo } from "../legal/motor.js";
import { t as t_, CODIGOS_IDIOMA, IDIOMAS, idiomaActual } from "../i18n/i18n.js";
import { variablesTema, aplicarTema, FONDOS } from "../tema.js";
import { logoGenericoSVG } from "../ilustracion.js";
import { $, $$, esc, avisar, conBoton, campoTexto, marcarError, enfocarPrimerError } from "./ui.js";
import { cargarImagen, codificar } from "./imagenes.js";

const TAMANOS = ["compacto", "normal", "grande"];
const VISTAS = ["cuadricula", "carrusel"];
// Valor por defecto guardado en la base (dato, en español); en pantalla se
// muestra traducido y, si se guarda tal cual, vuelve a ser "Precio".
const PRECIO_POR_DEFECTO = "Precio";

export async function dibujar(vista, ctx) {
  const { api } = ctx;
  const t = await ctx.recargarTienda();
  let logo = t.logo;
  let favicon = t.favicon;
  const nuevos = [];     // archivos subidos en esta edición
  const viejos = [];     // archivos a borrar al guardar
  const precioMostrado = t.etiqueta_precio === PRECIO_POR_DEFECTO ? t_("panel.tienda.precio.defecto") : t.etiqueta_precio;
  const paises = Object.keys(PAISES_TIENDA).map((c) => [c, datosPais(c).nombre]).sort((a, b) => a[1].localeCompare(b[1], idiomaActual()));

  vista.innerHTML = `
    <div class="vista-cabecera"><h1>${esc(t_("panel.tienda.titulo"))}</h1><p>${esc(t_("panel.tienda.intro"))}</p></div>
    <form id="form-tienda" novalidate>
      <section class="bloque" aria-labelledby="t-pais">
        <h2 id="t-pais">${esc(t_("panel.tienda.pais.titulo"))}</h2>
        <div class="campo">
          <label for="pais">${esc(t_("panel.tienda.pais.etiqueta"))}</label>
          <select class="entrada" id="pais" aria-describedby="pais-ayuda">
            ${paises.map(([c, nombre]) => `<option value="${c}" ${c === (t.pais || "co") ? "selected" : ""}>${esc(nombre)}</option>`).join("")}
          </select>
          <p class="ayuda" id="pais-ayuda"></p>
        </div>
        <div class="campo">
          <label for="idioma">${esc(t_("panel.tienda.idioma.etiqueta"))}</label>
          <select class="entrada" id="idioma" aria-describedby="idioma-ayuda">
            ${CODIGOS_IDIOMA.map((c) => `<option value="${c}" lang="${IDIOMAS[c].lang}" ${c === (t.idioma || "es") ? "selected" : ""}>${esc(t_(`idioma.${c}`))}</option>`).join("")}
          </select>
          <p class="ayuda" id="idioma-ayuda">${esc(t_("panel.tienda.idioma.ayuda"))}</p>
        </div>
      </section>

      <section class="bloque" aria-labelledby="t-datos">
        <h2 id="t-datos">${esc(t_("panel.tienda.datos.titulo"))}</h2>
        <div class="grilla-2">
          ${campoTexto({ id: "nombre", etiqueta: t_("panel.tienda.datos.nombre"), valor: t.nombre, atributos: 'maxlength="80"' })}
          ${campoTexto({ id: "ciudad", etiqueta: t_("panel.tienda.datos.ciudad"), valor: t.ciudad, atributos: 'maxlength="80"' })}
        </div>
        ${campoTexto({ id: "direccion", etiqueta: t_("panel.tienda.datos.direccion"), valor: t.direccion, ayuda: esc(t_("panel.tienda.datos.direccion_ayuda")), atributos: 'maxlength="160"' })}
        ${campoTexto({ id: "horario_texto", etiqueta: t_("panel.tienda.datos.horario"), valor: t.horario_texto, ayuda: esc(t_("panel.tienda.datos.horario_ayuda")), multilinea: true, atributos: 'rows="3" maxlength="300"' })}
        <div class="grilla-2">
          ${campoTexto({ id: "whatsapp", etiqueta: t_("panel.tienda.datos.whatsapp"), valor: t.whatsapp, ayuda: esc(ayudaWhatsapp(t.pais)), atributos: 'inputmode="numeric" autocomplete="off"' })}
          ${campoTexto({ id: "correo_contacto", etiqueta: t_("panel.tienda.datos.correo"), valor: t.correo_contacto, tipo: "email" })}
        </div>
      </section>

      <section class="bloque" aria-labelledby="t-redes">
        <h2 id="t-redes">${esc(t_("panel.tienda.redes.titulo"))}</h2>
        ${campoTexto({ id: "instagram_url", etiqueta: "Instagram", valor: t.instagram_url, tipo: "url", ayuda: esc(t_("panel.tienda.redes.ayuda")) })}
        ${campoTexto({ id: "facebook_url", etiqueta: "Facebook", valor: t.facebook_url, tipo: "url" })}
        ${campoTexto({ id: "tiktok_url", etiqueta: "TikTok", valor: t.tiktok_url, tipo: "url" })}
      </section>

      <section class="bloque" aria-labelledby="t-marca">
        <h2 id="t-marca">${esc(t_("panel.tienda.marca.titulo"))}</h2>
        ${campoTexto({ id: "titulo_sitio", etiqueta: t_("panel.tienda.marca.titulo_sitio"), valor: t.titulo_sitio || "",
          ayuda: t_("panel.tienda.marca.titulo_sitio_ayuda", { defecto: t_("sitio.titulo") }), atributos: `maxlength="80" placeholder="${esc(t_("sitio.titulo"))}"` })}
        <div class="campo">
          <span class="etiqueta">${esc(t_("panel.tienda.marca.logo"))}</span>
          <div class="logo-actual" id="logo-actual"></div>
          <input class="oculto-visual" type="file" id="logo-archivo" accept="image/png,image/jpeg,image/webp">
          <p class="ayuda">${esc(t_("panel.tienda.marca.logo_ayuda"))}</p>
          <div id="recorte" hidden></div>
          <p class="error-campo" id="logo-error" role="alert"></p>
        </div>
        <div class="campo">
          <span class="etiqueta">${esc(t_("panel.tienda.marca.favicon"))}</span>
          <div class="logo-actual" id="favicon-actual"></div>
          <input class="oculto-visual" type="file" id="favicon-archivo" accept="image/png,image/jpeg,image/webp">
        </div>
        <div class="grilla-2">
          ${selectorColor("color_primario", t_("panel.tienda.color.primario"), t.color_primario)}
          ${selectorColor("color_secundario", t_("panel.tienda.color.secundario"), t.color_secundario)}
        </div>
        <fieldset class="campo">
          <legend>${esc(t_("panel.tienda.tema.titulo"))}</legend>
          <div class="opciones-chip">
            ${["claro", "oscuro"].map((v) => `<label class="opcion-chip"><input type="radio" name="tema" value="${v}" ${t.tema === v ? "checked" : ""}><span>${esc(t_(`panel.tienda.tema.${v}`))}</span></label>`).join("")}
          </div>
        </fieldset>
        <fieldset class="campo" aria-describedby="tamano-ayuda">
          <legend>${esc(t_("panel.tienda.tamano.titulo"))}</legend>
          <div class="opciones-chip">
            ${TAMANOS.map((v) => `<label class="opcion-chip"><input type="radio" name="tamano_texto" value="${v}" ${(t.tamano_texto || "normal") === v ? "checked" : ""}><span>${esc(t_(`panel.tienda.tamano.${v}`))}</span></label>`).join("")}
          </div>
          <p class="ayuda" id="tamano-ayuda">${esc(t_("panel.tienda.tamano.ayuda"))}</p>
        </fieldset>
        <div>
          <p class="etiqueta" style="font-weight:600;margin-bottom:6px">${esc(t_("panel.tienda.vista.titulo"))}</p>
          <div class="vista-previa" id="vista-previa" aria-hidden="true"></div>
          <p class="contraste-nota" id="contraste-nota"></p>
        </div>
      </section>

      <section class="bloque" aria-labelledby="t-diseno">
        <h2 id="t-diseno">${esc(t_("panel.tienda.diseno.titulo"))}</h2>
        <fieldset class="campo">
          <legend>${esc(t_("panel.tienda.diseno.equipos"))}</legend>
          <div class="opciones-vista">
            ${VISTAS.map((v) => `<label class="opcion-vista"><input type="radio" name="vista_equipos" value="${v}" aria-describedby="vista-${v}-ayuda" ${(t.vista_equipos || "cuadricula") === v ? "checked" : ""}>
              <span class="opcion-vista-nombre">${esc(t_(`panel.tienda.diseno.${v}`))}</span>
              <span class="ayuda" id="vista-${v}-ayuda">${esc(t_(`panel.tienda.diseno.${v}_ayuda`))}</span>
            </label>`).join("")}
          </div>
        </fieldset>
      </section>

      <section class="bloque" aria-labelledby="t-venta">
        <h2 id="t-venta">${esc(t_("panel.tienda.venta.titulo"))}</h2>
        ${campoTexto({ id: "etiqueta_precio", etiqueta: t_("panel.tienda.precio.etiqueta"), valor: precioMostrado, ayuda: esc(t_("panel.tienda.precio.ayuda")), atributos: 'maxlength="40"' })}
        <p class="ayuda">${t_("panel.tienda.venta.pagos", { enlace: `<a href="#/catalogo/pagos">${esc(t_("panel.tienda.venta.pagos_enlace"))}</a>` })}</p>
        ${campoTexto({ id: "texto_entrega", etiqueta: t_("panel.tienda.venta.entrega"), valor: t.texto_entrega, ayuda: esc(t_("panel.tienda.venta.entrega_ayuda")), multilinea: true, atributos: 'rows="2" maxlength="300"' })}
        ${campoTexto({ id: "texto_garantia_nuevos", etiqueta: t_("panel.tienda.venta.garantia_nuevos"), valor: t.texto_garantia_nuevos, multilinea: true, atributos: 'rows="2" maxlength="400"' })}
        ${campoTexto({ id: "texto_garantia_usados", etiqueta: t_("panel.tienda.venta.garantia_usados"), valor: t.texto_garantia_usados, multilinea: true, atributos: 'rows="2" maxlength="400"' })}
      </section>

      <div class="acciones-formulario">
        <button type="submit" class="boton boton--primario" id="guardar-tienda">${esc(t_("panel.tienda.guardar"))}</button>
      </div>
    </form>
    <div id="seccion-resenas"></div>`;

  const form = $("#form-tienda");
  // --- País: moneda, prefijo y zona horaria ---
  function pintarPais() {
    const p = datosPais($("#pais").value);
    $("#pais-ayuda").textContent = `${t_("panel.tienda.pais.ayuda", { moneda: p.moneda, simbolo: p.simbolo, prefijo: p.celular.internacional, zona: p.zona })}${PAISES_DISPONIBLES.includes(p.codigo) ? "" : ` ${textoSinModulo(p.codigo)}`}`;
    $("#whatsapp-ayuda").textContent = ayudaWhatsapp(p.codigo);
  }
  $("#pais").addEventListener("change", () => { ctx.sucio = true; pintarPais(); });
  pintarPais();

  // --- Vista previa de colores ---
  function datosColores() {
    return {
      color_primario: $("#color_primario").value.trim().toUpperCase(),
      color_secundario: $("#color_secundario").value.trim().toUpperCase(),
      tema: $('input[name="tema"]:checked').value,
      tamano_texto: $('input[name="tamano_texto"]:checked').value
    };
  }
  function pintarVista() {
    const c = datosColores();
    if (!hexValido(c.color_primario) || !hexValido(c.color_secundario)) return;
    const { vars, tema, tamano } = variablesTema(c);
    $("#vista-previa").dataset.tamano = tamano;
    const fondo = FONDOS[tema];
    const logoUrl = logo ? api.urlArchivo("marca", logo) : "";
    $("#vista-previa").innerHTML = `
      <div class="vista-previa-encabezado" style="background:${vars["--secundario"]};color:${vars["--sobre-secundario"]}">
        <span class="vista-previa-marca">${logoUrl ? `<img src="${esc(logoUrl)}" alt="">` : logoGenericoSVG()}${esc($("#nombre").value || t_("panel.tienda.vista.nombre"))}</span>
        <span class="vista-previa-titulo">${esc(t_("panel.tienda.vista.lema"))}</span>
      </div>
      <div class="vista-previa-cuerpo" style="background:${fondo};color:${tema === "oscuro" ? "#F2F4F7" : "#0F1115"}">
        <span class="boton boton--primario" style="background:${vars["--primario"]};color:${vars["--sobre-primario"]}">${esc(t_("panel.tienda.vista.comprar"))}</span>
        <span style="color:${vars["--primario-texto"]};font-weight:700;text-decoration:underline">${esc(t_("panel.tienda.vista.limpiar"))}</span>
      </div>`;
    const r1 = contraste(vars["--primario"], vars["--sobre-primario"]).toFixed(2).replace(".", ",");
    const r2 = contraste(vars["--secundario"], vars["--sobre-secundario"]).toFixed(2).replace(".", ",");
    $("#contraste-nota").textContent = t_("panel.tienda.vista.contraste", { boton: r1, encabezado: r2 });
  }

  // --- Logo y favicon ---
  function pintarLogo() {
    const url = logo ? api.urlArchivo("marca", logo) : "";
    $("#logo-actual").innerHTML = `${url ? `<img src="${esc(url)}" alt="${esc(t_("panel.tienda.marca.logo_actual"))}">` : `<span class="ayuda">${esc(t_("panel.tienda.marca.sin_logo"))}</span>`}
      <label class="boton boton--secundario" for="logo-archivo">${esc(t_(url ? "panel.tienda.marca.cambiar_logo" : "panel.tienda.marca.subir_logo"))}</label>
      ${url ? `<button type="button" class="boton boton--enlace" id="quitar-logo">${esc(t_("panel.tienda.marca.quitar"))}</button>` : ""}`;
    $("#quitar-logo")?.addEventListener("click", () => { if (logo) viejos.push(logo); logo = ""; ctx.sucio = true; pintarLogo(); pintarVista(); });
    const fav = favicon ? api.urlArchivo("marca", favicon) : "";
    $("#favicon-actual").innerHTML = `${fav ? `<img src="${esc(fav)}" alt="${esc(t_("panel.tienda.marca.favicon_actual"))}" style="max-height:40px">` : ""}
      <label class="boton boton--secundario" for="favicon-archivo">${esc(t_(fav ? "panel.tienda.marca.cambiar_favicon" : "panel.tienda.marca.subir_favicon"))}</label>
      ${fav ? `<button type="button" class="boton boton--enlace" id="quitar-favicon">${esc(t_("panel.tienda.marca.quitar"))}</button>` : ""}`;
    $("#quitar-favicon")?.addEventListener("click", () => { if (favicon) viejos.push(favicon); favicon = ""; ctx.sucio = true; pintarLogo(); });
  }

  $("#logo-archivo").addEventListener("change", async (e) => {
    const archivo = e.target.files[0];
    e.target.value = "";
    if (!archivo) return;
    $("#logo-error").textContent = "";
    try {
      const img = await cargarImagen(archivo);
      abrirRecorte(img);
    } catch (err) { $("#logo-error").textContent = err.message; }
  });

  $("#favicon-archivo").addEventListener("change", async (e) => {
    const archivo = e.target.files[0];
    e.target.value = "";
    if (!archivo) return;
    try {
      const img = await cargarImagen(archivo);
      const lado = Math.min(img.width, img.height);
      const c = document.createElement("canvas");
      c.width = c.height = 128;
      c.getContext("2d").drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 128, 128);
      const blob = await new Promise((r) => c.toBlob(r, "image/png"));
      const ruta = `favicon-${Date.now()}.png`;
      await conBoton(null, () => api.subirArchivo("marca", ruta, blob), { exito: t_("panel.tienda.marca.favicon_listo") });
      if (favicon) viejos.push(favicon);
      favicon = ruta; nuevos.push(ruta); ctx.sucio = true;
      pintarLogo();
    } catch (err) { avisar(err.message, "error"); }
  });

  // Recorte: marco cuadrado u horizontal; se arrastra la imagen y se ajusta el zoom.
  function abrirRecorte(img) {
    const caja = $("#recorte");
    caja.hidden = false;
    caja.innerHTML = `<div class="recorte bloque">
      <h3>${esc(t_("panel.tienda.recorte.titulo"))}</h3>
      <div class="opciones-chip" role="radiogroup" aria-label="${esc(t_("panel.tienda.recorte.forma"))}">
        <label class="opcion-chip"><input type="radio" name="forma" value="3" checked><span>${esc(t_("panel.tienda.recorte.horizontal"))}</span></label>
        <label class="opcion-chip"><input type="radio" name="forma" value="1"><span>${esc(t_("panel.tienda.recorte.cuadrado"))}</span></label>
      </div>
      <div class="recorte-marco" id="marco" tabindex="0" aria-label="${esc(t_("panel.tienda.recorte.marco"))}"></div>
      <div class="campo"><label for="zoom">${esc(t_("panel.tienda.recorte.zoom"))}</label><input id="zoom" type="range" min="1" max="4" step="0.01" value="1"></div>
      <div class="confirmar-botones">
        <button type="button" class="boton boton--secundario" id="cancelar-recorte">${esc(t_("panel.tienda.recorte.cancelar"))}</button>
        <button type="button" class="boton boton--primario" id="usar-recorte">${esc(t_("panel.tienda.recorte.usar"))}</button>
      </div>
    </div>`;
    const marco = $("#marco");
    const fuente = document.createElement("canvas");
    fuente.width = img.width; fuente.height = img.height;
    fuente.getContext("2d").drawImage(img, 0, 0);
    const vistaImg = new Image();
    vistaImg.src = fuente.toDataURL();
    marco.appendChild(vistaImg);
    let proporcion = 3;
    let zoom = 1;
    let x = 0;
    let y = 0;
    let base = 1;

    function limitar() {
      const W = marco.clientWidth;
      const H = marco.clientHeight;
      const w = img.width * base * zoom;
      const h = img.height * base * zoom;
      x = w <= W ? (W - w) / 2 : Math.min(0, Math.max(W - w, x));
      y = h <= H ? (H - h) / 2 : Math.min(0, Math.max(H - h, y));
    }
    function pintar() {
      limitar();
      vistaImg.style.transform = `translate(${x}px, ${y}px) scale(${base * zoom})`;
    }
    function reiniciar() {
      marco.style.aspectRatio = `${proporcion} / 1`;
      requestAnimationFrame(() => {
        // Escala base: la imagen entra completa en el marco.
        base = Math.min(marco.clientWidth / img.width, marco.clientHeight / img.height);
        zoom = 1; $("#zoom").value = "1";
        x = 0; y = 0;
        pintar();
      });
    }
    let arrastre = null;
    marco.addEventListener("pointerdown", (e) => { arrastre = { px: e.clientX, py: e.clientY, x, y }; marco.setPointerCapture(e.pointerId); });
    marco.addEventListener("pointermove", (e) => {
      if (!arrastre) return;
      x = arrastre.x + e.clientX - arrastre.px;
      y = arrastre.y + e.clientY - arrastre.py;
      pintar();
    });
    marco.addEventListener("pointerup", () => { arrastre = null; });
    marco.addEventListener("keydown", (e) => {
      const paso = e.shiftKey ? 20 : 4;
      const d = { ArrowLeft: [paso, 0], ArrowRight: [-paso, 0], ArrowUp: [0, paso], ArrowDown: [0, -paso] }[e.key];
      if (d) { e.preventDefault(); x += d[0]; y += d[1]; pintar(); }
    });
    $("#zoom").addEventListener("input", (e) => {
      const cx = marco.clientWidth / 2;
      const cy = marco.clientHeight / 2;
      const nuevo = Number(e.target.value);
      x = cx - ((cx - x) * nuevo) / zoom;
      y = cy - ((cy - y) * nuevo) / zoom;
      zoom = nuevo;
      pintar();
    });
    caja.querySelectorAll('input[name="forma"]').forEach((r) => r.addEventListener("change", () => { proporcion = Number(r.value); reiniciar(); }));
    $("#cancelar-recorte").addEventListener("click", () => { caja.hidden = true; caja.innerHTML = ""; });
    $("#usar-recorte").addEventListener("click", async (e) => {
      // Se dibuja la imagen entera con la misma posición y escala de la vista
      // previa; el lienzo recorta lo que queda fuera del marco. Salida: la
      // resolución natural del recorte, con un máximo de 600 px de ancho.
      const escala = base * zoom;
      const W = marco.clientWidth;
      const c = document.createElement("canvas");
      c.width = Math.max(1, Math.min(600, Math.round(W / escala)));
      c.height = Math.max(1, Math.round(c.width / proporcion));
      const k = c.width / W;
      c.getContext("2d").drawImage(fuente, x * k, y * k, img.width * escala * k, img.height * escala * k);
      try {
        const { blob, ext } = await codificar(c, { conTransparencia: true });
        const ruta = `logo-${Date.now()}.${ext}`;
        await conBoton(e.currentTarget, () => api.subirArchivo("marca", ruta, blob), { exito: t_("panel.tienda.marca.logo_listo") });
        if (logo) viejos.push(logo);
        logo = ruta; nuevos.push(ruta); ctx.sucio = true;
        caja.hidden = true; caja.innerHTML = "";
        pintarLogo(); pintarVista();
      } catch { /* el aviso ya se mostró */ }
    });
    if (reducirMovimiento()) vistaImg.style.transition = "none";
    reiniciar();
  }

  // --- Colores ---
  for (const id of ["color_primario", "color_secundario"]) {
    $(`#${id}-picker`).addEventListener("input", (e) => { $(`#${id}`).value = e.target.value.toUpperCase(); pintarVista(); });
    $(`#${id}`).addEventListener("input", (e) => { if (hexValido(e.target.value.trim())) { $(`#${id}-picker`).value = e.target.value.trim().toLowerCase(); pintarVista(); } });
  }
  form.addEventListener("change", (e) => { if (e.target.name === "tema" || e.target.name === "tamano_texto") pintarVista(); });
  $("#nombre").addEventListener("input", pintarVista);
  form.addEventListener("input", () => { ctx.sucio = true; });

  // --- Guardar ---
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = (id) => $(`#${id}`).value.trim();
    const whatsapp = soloDigitos(v("whatsapp"));
    const pais = $("#pais").value;
    marcarError(form, "whatsapp", !whatsapp || whatsappValido(whatsapp, pais) ? "" : `${t_("panel.tienda.error.whatsapp", { pais: datosPais(pais).nombre })} ${ayudaWhatsapp(pais)}`);
    marcarError(form, "correo_contacto", !v("correo_contacto") || correoValido(v("correo_contacto")) ? "" : t_("panel.tienda.error.correo"));
    for (const id of ["instagram_url", "facebook_url", "tiktok_url"]) {
      marcarError(form, id, !v(id) || /^https?:\/\/\S+\.\S+/i.test(v(id)) ? "" : t_("panel.tienda.error.enlace"));
    }
    for (const id of ["color_primario", "color_secundario"]) {
      marcarError(form, id, hexValido(v(id)) ? "" : t_("panel.tienda.error.color"));
    }
    if (enfocarPrimerError(form)) return;
    const cambios = {
      nombre: v("nombre"), titulo_sitio: v("titulo_sitio"), pais, idioma: $("#idioma").value, ciudad: v("ciudad"), direccion: v("direccion"), horario_texto: v("horario_texto"),
      whatsapp, correo_contacto: v("correo_contacto"),
      instagram_url: v("instagram_url"), facebook_url: v("facebook_url"), tiktok_url: v("tiktok_url"),
      logo, favicon, ...datosColores(),
      vista_equipos: $('input[name="vista_equipos"]:checked').value,
      // Vacío o igual al texto por defecto mostrado: se guarda el valor por defecto.
      etiqueta_precio: !v("etiqueta_precio") || v("etiqueta_precio") === t_("panel.tienda.precio.defecto") ? PRECIO_POR_DEFECTO : v("etiqueta_precio"),
      texto_entrega: v("texto_entrega"), texto_garantia_nuevos: v("texto_garantia_nuevos"), texto_garantia_usados: v("texto_garantia_usados")
    };
    try {
      await conBoton($("#guardar-tienda"), () => api.guardarTienda(cambios));
    } catch { return; }
    if (viejos.length) api.borrarArchivos("marca", viejos.splice(0)).catch(() => {});
    nuevos.length = 0;
    ctx.sucio = false;
    $("#whatsapp").value = whatsapp;
    $("#etiqueta_precio").value = cambios.etiqueta_precio === PRECIO_POR_DEFECTO ? t_("panel.tienda.precio.defecto") : cambios.etiqueta_precio;
    // Otro idioma: el panel se vuelve a dibujar entero en ese idioma.
    if (cambios.idioma !== idiomaActual()) { location.reload(); return; }
    await ctx.recargarTienda();
    aplicarTema(ctx.tienda);
  });

  ctx.alSalir = () => {
    // Archivos subidos y no guardados
    const sinUsar = nuevos.filter((r) => r !== ctx.tienda.logo && r !== ctx.tienda.favicon);
    if (sinUsar.length) api.borrarArchivos("marca", sinUsar).catch(() => {});
  };

  pintarLogo();
  pintarVista();
  const { dibujar: dibujarResenas } = await import("./resenas.js");
  await dibujarResenas($("#seccion-resenas"), ctx, t);
}

// El WhatsApp de la tienda, en formato internacional y sin "+".
function ayudaWhatsapp(codigo) {
  const c = datosPais(codigo).celular;
  return c.verificado
    ? t_("panel.tienda.whatsapp.ayuda", { prefijo: c.internacional, ejemplo: `${c.internacional}${c.ejemplo.replace(/\s/g, "")}` })
    : t_("panel.tienda.whatsapp.ayuda_sin_ejemplo", { prefijo: c.internacional });
}

function selectorColor(id, etiqueta, valor) {
  return `<div class="campo">
    <label for="${id}">${esc(etiqueta)}</label>
    <div class="selector-color">
      <input type="color" id="${id}-picker" value="${esc(valor.toLowerCase())}" aria-label="${esc(t_("panel.tienda.color.paleta", { etiqueta }))}">
      <input class="entrada cifras" id="${id}" value="${esc(valor)}" maxlength="7" spellcheck="false" aria-describedby="${id}-error">
    </div>
    <p class="error-campo" id="${id}-error"></p>
  </div>`;
}
