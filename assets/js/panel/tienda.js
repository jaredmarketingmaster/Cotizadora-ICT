// =============================================================================
// Mi tienda: datos, redes, marca (logo con recorte, favicon, colores y tema con
// vista previa en vivo) y datos de venta (formas de pago, entrega, garantía).
// =============================================================================

import { hexValido, soloDigitos, whatsappTiendaValido, correoValido, contraste, reducirMovimiento } from "../utils.js";
import { variablesTema, aplicarTema, FONDOS } from "../tema.js";
import { logoGenericoSVG } from "../ilustracion.js";
import { $, $$, esc, avisar, conBoton, campoTexto, marcarError, enfocarPrimerError } from "./ui.js";
import { cargarImagen, codificar } from "./imagenes.js";

const TAMANOS = [["compacto", "Compacto"], ["normal", "Normal"], ["grande", "Grande"]];
const VISTAS = [
  ["cuadricula", "Cuadrícula", "Todas las tarjetas a la vista, en filas. Es la más rápida para comparar precios."],
  ["carrusel", "Carrusel", "Una tarjeta al centro y las vecinas a los lados. El cliente pasa de una a otra con el dedo, las flechas o el teclado."]
];

export async function dibujar(vista, ctx) {
  const { api } = ctx;
  const t = await ctx.recargarTienda();
  let logo = t.logo;
  let favicon = t.favicon;
  const nuevos = [];     // archivos subidos en esta edición
  const viejos = [];     // archivos a borrar al guardar

  vista.innerHTML = `
    <div class="vista-cabecera"><h1>Mi tienda</h1><p>Todo lo que se ve en el sitio. Los campos vacíos no se muestran.</p></div>
    <form id="form-tienda" novalidate>
      <section class="bloque" aria-labelledby="t-datos">
        <h2 id="t-datos">Datos de la tienda</h2>
        <div class="grilla-2">
          ${campoTexto({ id: "nombre", etiqueta: "Nombre de la tienda", valor: t.nombre, atributos: 'maxlength="80"' })}
          ${campoTexto({ id: "ciudad", etiqueta: "Ciudad", valor: t.ciudad, atributos: 'maxlength="80"' })}
        </div>
        ${campoTexto({ id: "direccion", etiqueta: "Dirección", valor: t.direccion, ayuda: "Se usa también para el botón «Cómo llegar».", atributos: 'maxlength="160"' })}
        ${campoTexto({ id: "horario_texto", etiqueta: "Horario", valor: t.horario_texto, ayuda: "Ej. Lunes a sábado, 9:00 a. m. a 7:00 p. m.", multilinea: true, atributos: 'rows="3" maxlength="300"' })}
        <div class="grilla-2">
          ${campoTexto({ id: "whatsapp", etiqueta: "WhatsApp de ventas", valor: t.whatsapp, ayuda: "Formato internacional sin «+»: 12 dígitos que empiezan por 57. Ej. 573001234567.", atributos: 'inputmode="numeric" autocomplete="off"' })}
          ${campoTexto({ id: "correo_contacto", etiqueta: "Correo de contacto (opcional)", valor: t.correo_contacto, tipo: "email" })}
        </div>
      </section>

      <section class="bloque" aria-labelledby="t-redes">
        <h2 id="t-redes">Redes sociales (opcionales)</h2>
        ${campoTexto({ id: "instagram_url", etiqueta: "Instagram", valor: t.instagram_url, tipo: "url", ayuda: "Enlace completo, ej. https://instagram.com/sutienda" })}
        ${campoTexto({ id: "facebook_url", etiqueta: "Facebook", valor: t.facebook_url, tipo: "url" })}
        ${campoTexto({ id: "tiktok_url", etiqueta: "TikTok", valor: t.tiktok_url, tipo: "url" })}
      </section>

      <section class="bloque" aria-labelledby="t-marca">
        <h2 id="t-marca">Marca</h2>
        <div class="campo">
          <span class="etiqueta">Logo</span>
          <div class="logo-actual" id="logo-actual"></div>
          <input class="oculto-visual" type="file" id="logo-archivo" accept="image/png,image/jpeg,image/webp">
          <p class="ayuda">PNG con fondo transparente, idealmente. Después de elegirlo puede recortarlo.</p>
          <div id="recorte" hidden></div>
          <p class="error-campo" id="logo-error" role="alert"></p>
        </div>
        <div class="campo">
          <span class="etiqueta">Ícono de la pestaña (opcional)</span>
          <div class="logo-actual" id="favicon-actual"></div>
          <input class="oculto-visual" type="file" id="favicon-archivo" accept="image/png,image/jpeg,image/webp">
        </div>
        <div class="grilla-2">
          ${selectorColor("color_primario", "Color primario (botones)", t.color_primario)}
          ${selectorColor("color_secundario", "Color secundario (encabezado)", t.color_secundario)}
        </div>
        <fieldset class="campo">
          <legend>Tema</legend>
          <div class="opciones-chip">
            ${["claro", "oscuro"].map((v) => `<label class="opcion-chip"><input type="radio" name="tema" value="${v}" ${t.tema === v ? "checked" : ""}><span>${v === "claro" ? "Claro" : "Oscuro"}</span></label>`).join("")}
          </div>
        </fieldset>
        <fieldset class="campo" aria-describedby="tamano-ayuda">
          <legend>Tamaño del texto</legend>
          <div class="opciones-chip">
            ${TAMANOS.map(([v, nombre]) => `<label class="opcion-chip"><input type="radio" name="tamano_texto" value="${v}" ${(t.tamano_texto || "normal") === v ? "checked" : ""}><span>${nombre}</span></label>`).join("")}
          </div>
          <p class="ayuda" id="tamano-ayuda">Se aplica al sitio, al pop-up y a las páginas legales. Compacto achica títulos, precios y espacios; Grande agranda todo el texto. Ningún texto queda por debajo de 16 px.</p>
        </fieldset>
        <div>
          <p class="etiqueta" style="font-weight:600;margin-bottom:6px">Vista previa</p>
          <div class="vista-previa" id="vista-previa" aria-hidden="true"></div>
          <p class="contraste-nota" id="contraste-nota"></p>
        </div>
      </section>

      <section class="bloque" aria-labelledby="t-diseno">
        <h2 id="t-diseno">Diseño del sitio</h2>
        <fieldset class="campo">
          <legend>Cómo se ven los equipos</legend>
          <div class="opciones-vista">
            ${VISTAS.map(([v, nombre, ayuda]) => `<label class="opcion-vista"><input type="radio" name="vista_equipos" value="${v}" aria-describedby="vista-${v}-ayuda" ${(t.vista_equipos || "cuadricula") === v ? "checked" : ""}>
              <span class="opcion-vista-nombre">${nombre}</span>
              <span class="ayuda" id="vista-${v}-ayuda">${ayuda}</span>
            </label>`).join("")}
          </div>
        </fieldset>
      </section>

      <section class="bloque" aria-labelledby="t-venta">
        <h2 id="t-venta">Venta</h2>
        ${campoTexto({ id: "etiqueta_precio", etiqueta: "Etiqueta del precio", valor: t.etiqueta_precio, ayuda: "Por defecto «Precio». Puede ser, por ejemplo, «Precio de contado».", atributos: 'maxlength="40"' })}
        <p class="ayuda">Las formas de pago se configuran en <a href="#/catalogo/pagos">Catálogo → Formas de pago</a>.</p>
        ${campoTexto({ id: "texto_entrega", etiqueta: "Entrega", valor: t.texto_entrega, ayuda: "Ej. Retiro en tienda o envío a todo Colombia.", multilinea: true, atributos: 'rows="2" maxlength="300"' })}
        ${campoTexto({ id: "texto_garantia_nuevos", etiqueta: "Garantía de los nuevos (opcional)", valor: t.texto_garantia_nuevos, multilinea: true, atributos: 'rows="2" maxlength="400"' })}
        ${campoTexto({ id: "texto_garantia_usados", etiqueta: "Garantía de los usados (opcional)", valor: t.texto_garantia_usados, multilinea: true, atributos: 'rows="2" maxlength="400"' })}
      </section>

      <div class="acciones-formulario">
        <button type="submit" class="boton boton--primario" id="guardar-tienda">Guardar</button>
      </div>
    </form>`;

  const form = $("#form-tienda");
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
        <span class="vista-previa-marca">${logoUrl ? `<img src="${esc(logoUrl)}" alt="">` : logoGenericoSVG()}${esc($("#nombre").value || "Su tienda")}</span>
        <span class="vista-previa-titulo">Elija su iPhone y cómprelo por WhatsApp.</span>
      </div>
      <div class="vista-previa-cuerpo" style="background:${fondo};color:${tema === "oscuro" ? "#F2F4F7" : "#0F1115"}">
        <span class="boton boton--primario" style="background:${vars["--primario"]};color:${vars["--sobre-primario"]}">Comprar por WhatsApp</span>
        <span style="color:${vars["--primario-texto"]};font-weight:700;text-decoration:underline">Limpiar filtros</span>
      </div>`;
    const r1 = contraste(vars["--primario"], vars["--sobre-primario"]).toFixed(2).replace(".", ",");
    const r2 = contraste(vars["--secundario"], vars["--sobre-secundario"]).toFixed(2).replace(".", ",");
    $("#contraste-nota").textContent = `El color del texto se elige solo para que se lea bien (contraste ${r1}:1 en el botón y ${r2}:1 en el encabezado; el mínimo es 4,5:1).`;
  }

  // --- Logo y favicon ---
  function pintarLogo() {
    const url = logo ? api.urlArchivo("marca", logo) : "";
    $("#logo-actual").innerHTML = `${url ? `<img src="${esc(url)}" alt="Logo actual">` : '<span class="ayuda">Sin logo: se muestra un ícono genérico.</span>'}
      <label class="boton boton--secundario" for="logo-archivo">${url ? "Cambiar logo" : "Subir logo"}</label>
      ${url ? '<button type="button" class="boton boton--enlace" id="quitar-logo">Quitar</button>' : ""}`;
    $("#quitar-logo")?.addEventListener("click", () => { if (logo) viejos.push(logo); logo = ""; ctx.sucio = true; pintarLogo(); pintarVista(); });
    const fav = favicon ? api.urlArchivo("marca", favicon) : "";
    $("#favicon-actual").innerHTML = `${fav ? `<img src="${esc(fav)}" alt="Ícono actual" style="max-height:40px">` : ""}
      <label class="boton boton--secundario" for="favicon-archivo">${fav ? "Cambiar ícono" : "Subir ícono"}</label>
      ${fav ? '<button type="button" class="boton boton--enlace" id="quitar-favicon">Quitar</button>' : ""}`;
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
      await conBoton(null, () => api.subirArchivo("marca", ruta, blob), { exito: "Ícono listo. Toque «Guardar»." });
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
      <h3>Recortar el logo</h3>
      <div class="opciones-chip" role="radiogroup" aria-label="Forma del recorte">
        <label class="opcion-chip"><input type="radio" name="forma" value="3" checked><span>Horizontal</span></label>
        <label class="opcion-chip"><input type="radio" name="forma" value="1"><span>Cuadrado</span></label>
      </div>
      <div class="recorte-marco" id="marco" tabindex="0" aria-label="Arrastre para mover el logo; use las flechas del teclado para moverlo"></div>
      <div class="campo"><label for="zoom">Zoom</label><input id="zoom" type="range" min="1" max="4" step="0.01" value="1"></div>
      <div class="confirmar-botones">
        <button type="button" class="boton boton--secundario" id="cancelar-recorte">Cancelar</button>
        <button type="button" class="boton boton--primario" id="usar-recorte">Usar este recorte</button>
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
        await conBoton(e.currentTarget, () => api.subirArchivo("marca", ruta, blob), { exito: "Logo listo. Toque «Guardar»." });
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
    marcarError(form, "whatsapp", !whatsapp || whatsappTiendaValido(whatsapp) ? "" : "Debe tener 12 dígitos y empezar por 57. Ej. 573001234567.");
    marcarError(form, "correo_contacto", !v("correo_contacto") || correoValido(v("correo_contacto")) ? "" : "Revise el correo.");
    for (const id of ["instagram_url", "facebook_url", "tiktok_url"]) {
      marcarError(form, id, !v(id) || /^https?:\/\/\S+\.\S+/i.test(v(id)) ? "" : "Pegue el enlace completo, empezando por https://");
    }
    for (const id of ["color_primario", "color_secundario"]) {
      marcarError(form, id, hexValido(v(id)) ? "" : "Use el formato #RRGGBB, ej. #1A73E8.");
    }
    if (enfocarPrimerError(form)) return;
    const cambios = {
      nombre: v("nombre"), ciudad: v("ciudad"), direccion: v("direccion"), horario_texto: v("horario_texto"),
      whatsapp, correo_contacto: v("correo_contacto"),
      instagram_url: v("instagram_url"), facebook_url: v("facebook_url"), tiktok_url: v("tiktok_url"),
      logo, favicon, ...datosColores(),
      vista_equipos: $('input[name="vista_equipos"]:checked').value,
      etiqueta_precio: v("etiqueta_precio") || "Precio",
      texto_entrega: v("texto_entrega"), texto_garantia_nuevos: v("texto_garantia_nuevos"), texto_garantia_usados: v("texto_garantia_usados")
    };
    try {
      await conBoton($("#guardar-tienda"), () => api.guardarTienda(cambios));
    } catch { return; }
    if (viejos.length) api.borrarArchivos("marca", viejos.splice(0)).catch(() => {});
    nuevos.length = 0;
    ctx.sucio = false;
    $("#whatsapp").value = whatsapp;
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
}

function selectorColor(id, etiqueta, valor) {
  return `<div class="campo">
    <label for="${id}">${esc(etiqueta)}</label>
    <div class="selector-color">
      <input type="color" id="${id}-picker" value="${esc(valor.toLowerCase())}" aria-label="${esc(etiqueta)}: elegir en la paleta">
      <input class="entrada cifras" id="${id}" value="${esc(valor)}" maxlength="7" spellcheck="false" aria-describedby="${id}-error">
    </div>
    <p class="error-campo" id="${id}-error"></p>
  </div>`;
}
