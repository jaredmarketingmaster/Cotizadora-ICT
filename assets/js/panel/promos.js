// =============================================================================
// Promos (0039): el banner de arriba del sitio y los descuentos.
// - Banner: interruptor, texto (una línea, hasta 120 caracteres) y vista previa.
// - Descuentos: interruptor general; % para toda la tienda, por modelo (los que
//   tienen equipos) y por equipo; y qué hacer si a un equipo le tocan varios
//   (el mayor, el más específico o la suma), en pestañas.
// Se guarda todo junto: la tienda con guardarTienda y los equipos que
// cambiaron con actualizarEquipo.
// =============================================================================

import { nombreColor } from "../datos/comun.js";
import { MAX_BANNER, MAX_DESCUENTO_PROMO, COMBINAR_PROMOS, errorPromos } from "../datos/precios.js";
import { $, $$, esc, conBoton, campoTexto, interruptor, marcarError, enfocarPrimerError } from "./ui.js";
import { nombreCondicion } from "./inventario.js";
import { t as tr } from "../i18n/i18n.js";

// "15" → 15; "" → null; otra cosa → NaN.
export function leerPorcentaje(texto) {
  const s = String(texto ?? "").replace(/[\s%]/g, "");
  if (!s) return null;
  if (!/^\d{1,2}$/.test(s)) return NaN;
  const n = Number(s);
  return n >= 1 && n <= MAX_DESCUENTO_PROMO ? n : NaN;
}

const campoPorcentaje = (id, etiqueta, valor, describe = "") => `<div class="campo campo-porcentaje">
  <label for="${id}">${esc(etiqueta)}</label>
  <div class="entrada-porcentaje"><input class="entrada cifras" id="${id}" inputmode="numeric" maxlength="2" autocomplete="off" value="${valor ?? ""}" aria-describedby="${[describe, `${id}-error`].filter(Boolean).join(" ")}"><span aria-hidden="true">%</span></div>
  <p class="error-campo" id="${id}-error"></p>
</div>`;

export async function dibujar(vista, ctx) {
  const { api } = ctx;
  const [t, equipos, modelos, colores] = await Promise.all([ctx.recargarTienda(), api.listarEquipos(), api.listarModelos(), api.listarColores()]);
  const conEquipos = new Set(equipos.map((q) => q.modelo_id));
  const modelosLista = modelos.filter((m) => conEquipos.has(m.id)).sort((a, b) => b.orden - a.orden);
  const porId = new Map(modelos.map((m) => [m.id, m]));
  const colorDe = (q) => nombreColor(colores.find((c) => c.id === q.color_id), q.color_nombre_mostrar);
  const equiposLista = [...equipos].sort((a, b) => (porId.get(b.modelo_id)?.orden ?? 0) - (porId.get(a.modelo_id)?.orden ?? 0)
    || a.capacidad.localeCompare(b.capacidad) || a.precio - b.precio);
  const descModelo = t.promo_descuentos_modelo || {};

  vista.innerHTML = `
    <div class="vista-cabecera"><h1>${esc(tr("panel.promos.titulo"))}</h1><p>${esc(tr("panel.promos.intro"))}</p></div>
    <form id="form-promos" novalidate>
      <section class="bloque" aria-labelledby="t-banner">
        <h2 id="t-banner">${esc(tr("panel.promos.banner.titulo"))}</h2>
        ${interruptor({ id: "promo_banner_activo", etiqueta: tr("panel.promos.banner.activo"), marcado: t.promo_banner_activo })}
        ${campoTexto({ id: "promo_banner_texto", etiqueta: tr("panel.promos.banner.texto"), valor: t.promo_banner_texto, ayuda: esc(tr("panel.promos.banner.texto_ayuda", { n: MAX_BANNER })), atributos: `maxlength="${MAX_BANNER}" autocomplete="off"` })}
        <p class="ayuda">${esc(tr("panel.promos.banner.vista_previa"))}</p>
        <div class="promo-vista-previa" aria-hidden="true"><span id="promo-previa"></span></div>
      </section>

      <section class="bloque" aria-labelledby="t-descuentos">
        <h2 id="t-descuentos">${esc(tr("panel.promos.descuentos.titulo"))}</h2>
        <p class="ayuda">${esc(tr("panel.promos.descuentos.ayuda"))}</p>
        ${interruptor({ id: "promo_descuentos_activos", etiqueta: tr("panel.promos.descuentos.activos"), marcado: t.promo_descuentos_activos })}
        ${campoPorcentaje("promo_descuento_tienda", tr("panel.promos.descuentos.tienda"), t.promo_descuento_tienda, "promo-tienda-ayuda")}
        <p class="ayuda" id="promo-tienda-ayuda">${esc(tr("panel.promos.descuentos.tienda_ayuda"))}</p>
        <fieldset class="campo">
          <legend>${esc(tr("panel.promos.combinar.titulo"))}</legend>
          <div class="segmentos">
            ${COMBINAR_PROMOS.map((c) => `<label class="segmento-opcion"><input type="radio" name="promo_combinar" value="${c}" ${(t.promo_combinar || "mayor") === c ? "checked" : ""}><span>${esc(tr(`panel.promos.combinar.${c}`))}</span></label>`).join("")}
          </div>
          <p class="ayuda" id="promo-combinar-ayuda" aria-live="polite"></p>
        </fieldset>
      </section>

      <section class="bloque" aria-labelledby="t-por-modelo">
        <h2 id="t-por-modelo">${esc(tr("panel.promos.modelos.titulo"))}</h2>
        ${modelosLista.length
          ? `<div class="lista-porcentajes">${modelosLista.map((m) => campoPorcentaje(`pm-${m.id}`, m.nombre, descModelo[m.slug])).join("")}</div>`
          : `<p class="ayuda">${esc(tr("panel.promos.sin_equipos"))}</p>`}
      </section>

      <section class="bloque" aria-labelledby="t-por-equipo">
        <h2 id="t-por-equipo">${esc(tr("panel.promos.equipos.titulo"))}</h2>
        ${equiposLista.length
          ? `<div class="lista-porcentajes">${equiposLista.map((q) => campoPorcentaje(`pe-${q.id}`,
              [porId.get(q.modelo_id)?.nombre, nombreCondicion(q.condicion), q.capacidad, colorDe(q)].filter(Boolean).join(" · "), q.promo_descuento)).join("")}</div>`
          : `<p class="ayuda">${esc(tr("panel.promos.sin_equipos"))}</p>`}
      </section>

      <p class="error-campo" id="promos-error" role="alert"></p>
      <div class="acciones-pasos"><button type="submit" class="boton boton--primario" id="guardar-promos">${esc(tr("panel.promos.guardar"))}</button></div>
    </form>`;

  const form = $("#form-promos");
  function pintar() {
    $("#promo-previa").textContent = $("#promo_banner_texto").value.trim() || tr("panel.promos.banner.ejemplo");
    const c = $('input[name="promo_combinar"]:checked')?.value || "mayor";
    $("#promo-combinar-ayuda").textContent = tr(`panel.promos.combinar.${c}_ayuda`);
  }
  form.addEventListener("input", () => { ctx.sucio = true; pintar(); });
  form.addEventListener("change", () => { ctx.sucio = true; pintar(); });
  pintar();

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const texto = $("#promo_banner_texto").value.trim();
    const activo = $("#promo_banner_activo").checked;
    marcarError(form, "promo_banner_texto", activo && !texto ? tr("datos.error.promo_banner_vacio") : "");
    const porcentaje = (id) => {
      const n = leerPorcentaje($(`#${id}`).value);
      marcarError(form, id, Number.isNaN(n) ? tr("datos.error.promo_descuento") : "");
      return n;
    };
    const general = porcentaje("promo_descuento_tienda");
    const porModelo = {};
    for (const m of modelosLista) { const n = porcentaje(`pm-${m.id}`); if (Number.isInteger(n)) porModelo[m.slug] = n; }
    // Los modelos sin equipos conservan su descuento (no están en la lista).
    for (const [slug, n] of Object.entries(descModelo)) if (!modelosLista.some((m) => m.slug === slug)) porModelo[slug] = n;
    const porEquipo = equiposLista.map((q) => [q, porcentaje(`pe-${q.id}`)]);
    if (enfocarPrimerError(form)) return;
    const cambios = {
      promo_banner_activo: activo, promo_banner_texto: texto,
      promo_descuentos_activos: $("#promo_descuentos_activos").checked,
      promo_descuento_tienda: general, promo_descuentos_modelo: porModelo,
      promo_combinar: $('input[name="promo_combinar"]:checked')?.value || "mayor"
    };
    const error = errorPromos({ ...t, ...cambios });
    $("#promos-error").textContent = error;
    if (error) return;
    try {
      await conBoton($("#guardar-promos"), async () => {
        await api.guardarTienda(cambios);
        for (const [q, n] of porEquipo) {
          if ((q.promo_descuento ?? null) !== n) Object.assign(q, await api.actualizarEquipo(q.id, { promo_descuento: n }));
        }
      });
    } catch { return; }
    ctx.sucio = false;
    await ctx.recargarTienda();
  });
}
