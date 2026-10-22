// =============================================================================
// Archivo XML de productos (pestaña de Catálogo, ronda 3, C4): la dirección
// del sitio (tienda.url_sitio, 0025), el enlace de cada formato (Google y
// Meta) para copiar, cuántos equipos van, los que no van y por qué, y la vista
// previa de los primeros 5. En demo, el archivo se descarga desde aquí (las
// fotos del demo no tienen una dirección pública). El archivo lo arma
// supabase/functions/_compartido/feed.js (el mismo de la función catalogo-feed).
// =============================================================================

import { CONFIG } from "../../../config.js";
import { analizarFeed, itemFeed, armarFeed, urlBase, FORMATOS_FEED } from "../../../supabase/functions/_compartido/feed.js";
import { formatearPrecio } from "../datos/paises.js";
import { t as tr, tn } from "../i18n/i18n.js";
import { $, esc, conBoton, campoTexto, marcarError, avisar } from "./ui.js";

const URL_SITIO = /^https:\/\/[^\s/]+\.[^\s]+$/;

export async function dibujar(vista, ctx) {
  const { api } = ctx;
  const [tienda, modelos, colores, equipos] = await Promise.all([api.leerTienda(), api.listarModelos(), api.listarColores(), api.listarEquipos()]);
  if (!vista.isConnected) return;
  let t = tienda;
  const datos = () => ({ tienda: t, modelos, colores, equipos });
  const urlFoto = (ruta) => api.urlArchivo("fotos", ruta);
  const enlaceFeed = (formato) => `${String(CONFIG.supabase?.url || "").replace(/\/+$/, "")}/functions/v1/catalogo-feed?formato=${formato}`;
  const nombreModelo = (q) => modelos.find((m) => m.id === q.modelo_id)?.nombre || "";

  vista.innerHTML = `
    <p>${esc(tr("panel.feed.intro"))}</p>
    <form id="form-feed" class="bloque" novalidate>
      ${campoTexto({ id: "url_sitio", etiqueta: tr("panel.feed.url"), valor: t.url_sitio || "", ayuda: esc(tr("panel.feed.url_ayuda")), atributos: 'type="url" inputmode="url" maxlength="200" placeholder="https://" spellcheck="false" autocomplete="url"' })}
      <div class="acciones-formulario"><button type="submit" class="boton boton--primario" id="guardar-feed">${esc(tr("panel.feed.guardar"))}</button></div>
    </form>
    <section class="bloque" aria-labelledby="t-feed-enlaces">
      <h2 id="t-feed-enlaces">${esc(tr("panel.feed.enlaces"))}</h2>
      <div id="feed-enlaces"></div>
    </section>
    <section class="bloque" aria-labelledby="t-feed-equipos">
      <h2 id="t-feed-equipos">${esc(tr("panel.feed.equipos"))}</h2>
      <p id="feed-cuenta" role="status"></p>
      <div id="feed-excluidos"></div>
      <h3>${esc(tr("panel.feed.vista"))}</h3>
      <div id="feed-vista"></div>
    </section>
    <section class="bloque" aria-labelledby="t-feed-notas">
      <h2 id="t-feed-notas">${esc(tr("panel.feed.notas.titulo"))}</h2>
      <ul class="vista-pagos">${["gtin", "revendedores", "usados", "cache"].map((k) => `<li>${esc(tr(`panel.feed.notas.${k}`))}</li>`).join("")}</ul>
    </section>`;

  function pintar() {
    const lista = $("#feed-enlaces", vista);
    const base = urlBase(t.url_sitio);
    if (!base) {
      lista.innerHTML = `<p class="aviso-datos" role="note">${esc(tr("panel.feed.falta_url"))}</p>`;
    } else if (api.tipo === "demo") {
      lista.innerHTML = `<p class="aviso-datos" role="note">${esc(tr("panel.feed.demo_aviso"))}</p>
        <div class="acciones-formulario">${FORMATOS_FEED.map((f) => `<button type="button" class="boton boton--secundario" data-descargar="${f}">${esc(tr(`panel.feed.descargar.${f}`))}</button>`).join("")}</div>`;
    } else {
      lista.innerHTML = FORMATOS_FEED.map((f) => `<div class="campo">
        <label for="enlace-${f}">${esc(tr(`panel.feed.formato.${f}`))}</label>
        <div class="fila-copiar"><input class="entrada cifras" id="enlace-${f}" value="${esc(enlaceFeed(f))}" readonly>
        <button type="button" class="boton boton--secundario" data-copiar="enlace-${f}">${esc(tr("panel.feed.copiar"))}</button></div></div>`).join("");
    }
    const { incluidos, excluidos } = analizarFeed(datos());
    $("#feed-cuenta", vista).textContent = tn("panel.feed.cuenta", incluidos.length);
    $("#feed-excluidos", vista).innerHTML = excluidos.length
      ? `<details><summary>${esc(tn("panel.feed.excluidos", excluidos.length))}</summary><ul class="avisos avisos--neutro">${excluidos.map(({ equipo: q, motivo }) =>
        `<li><span>${esc([nombreModelo(q), q.capacidad, q.condicion === "usado" ? tr("panel.feed.usado") : tr("panel.feed.nuevo")].join(" · "))} — ${esc(tr(`panel.feed.motivo.${motivo}`))}</span></li>`).join("")}</ul></details>`
      : "";
    const primeros = incluidos.slice(0, 5).map((q) => itemFeed(q, { ...datos(), urlFoto }));
    $("#feed-vista", vista).innerHTML = primeros.length
      ? `<div class="tabla-legal"><table><thead><tr><th scope="col">${esc(tr("panel.feed.col.titulo"))}</th><th scope="col">${esc(tr("panel.feed.col.precio"))}</th><th scope="col">${esc(tr("panel.feed.col.enlace"))}</th></tr></thead>
        <tbody>${primeros.map((i, n) => `<tr><td>${esc(i.titulo)}</td><td class="cifras">${esc(formatearPrecio(incluidos[n].precio))}</td><td>${base ? esc(i.enlace) : "—"}</td></tr>`).join("")}</tbody></table></div>`
      : `<p class="ayuda">${esc(tr("panel.feed.vacio"))}</p>`;
  }

  vista.addEventListener("click", async (e) => {
    const copiar = e.target.closest("[data-copiar]");
    if (copiar) {
      const input = $(`#${copiar.dataset.copiar}`, vista);
      try { await navigator.clipboard.writeText(input.value); avisar(tr("panel.feed.copiado")); } catch { input.select(); }
    }
    const bajar = e.target.closest("[data-descargar]");
    if (bajar) {
      const xml = armarFeed(datos(), { formato: bajar.dataset.descargar, urlFoto });
      const url = URL.createObjectURL(new Blob([xml], { type: "application/xml" }));
      const a = Object.assign(document.createElement("a"), { href: url, download: `productos-${bajar.dataset.descargar}.xml` });
      document.body.appendChild(a); a.click(); a.remove();
      setTimeout(() => URL.revokeObjectURL(url), 1000);
    }
  });

  const form = $("#form-feed", vista);
  form.addEventListener("input", () => { ctx.sucio = true; });
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const v = $("#url_sitio", form).value.trim();
    marcarError(form, "url_sitio", !v || URL_SITIO.test(v) ? "" : tr("panel.feed.error.url"));
    if (v && !URL_SITIO.test(v)) { $("#url_sitio", form).focus(); return; }
    try {
      t = await conBoton($("#guardar-feed", form), () => api.guardarTienda({ url_sitio: v }));
    } catch { return; }
    ctx.sucio = false;
    pintar();
  });

  pintar();
}
