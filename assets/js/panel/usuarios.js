// =============================================================================
// Usuarios (solo administrador): invitar por correo con su rol, asignar roles,
// desactivar y reactivar. Sin registro público: los usuarios solo entran por
// invitación. La base exige que siempre quede un administrador activo.
// =============================================================================

import { correoValido } from "../utils.js";
import { $, esc, conBoton, confirmar, campoTexto, marcarError, enfocarPrimerError } from "./ui.js";
import { t as tr } from "../i18n/i18n.js";

// El valor guardado no cambia; el nombre que se muestra sale del diccionario.
const ROLES = ["gestor", "administrador"];
const nombreRol = (rol) => (ROLES.includes(rol) ? tr(`panel.comun.rol.${rol}`) : rol);

export async function dibujar(vista, ctx) {
  if (!ctx.esAdministrador()) { vista.innerHTML = `<p class="popup-alerta">${esc(tr("panel.usuarios.solo_admin"))}</p>`; return; }
  const { api } = ctx;
  let usuarios = await api.listarUsuarios();

  vista.innerHTML = `
    <div class="vista-cabecera"><h1>${esc(tr("panel.usuarios.titulo"))}</h1><p>${esc(tr("panel.usuarios.intro"))}</p></div>
    <section class="bloque" aria-labelledby="t-invitar">
      <h2 id="t-invitar">${esc(tr("panel.usuarios.invitar"))}</h2>
      <form id="form-invitar" class="grilla-2" novalidate>
        ${campoTexto({ id: "u-correo", etiqueta: tr("panel.usuarios.correo"), tipo: "email", atributos: 'inputmode="email" autocomplete="off"' })}
        <div class="campo">
          <label for="u-rol">${esc(tr("panel.usuarios.rol"))}</label>
          <select class="entrada" id="u-rol">${ROLES.map((v) => `<option value="${v}">${esc(nombreRol(v))}</option>`).join("")}</select>
        </div>
        <div><button type="submit" class="boton boton--primario">${esc(tr("panel.usuarios.enviar_invitacion"))}</button></div>
      </form>
      <p class="ayuda">${esc(tr("panel.usuarios.ayuda_invitar"))}${api.tipo === "demo" ? ` ${esc(tr("panel.usuarios.ayuda_invitar_demo"))}` : ""}</p>
    </section>
    <section class="bloque" aria-labelledby="t-lista"><h2 id="t-lista">${esc(tr("panel.usuarios.con_acceso"))}</h2><div id="lista-usuarios" style="display:grid;gap:8px"></div></section>`;

  function pintar() {
    $("#lista-usuarios").innerHTML = usuarios.map((u) => {
      const yo = u.user_id === ctx.usuario.id;
      return `<div class="usuario-fila" data-id="${esc(u.user_id)}">
        <div><p class="correo">${esc(u.correo)}</p><p class="rol">${esc(nombreRol(u.rol))}${u.activo ? "" : ` · <span class="estado-inactivo">${esc(tr("panel.usuarios.desactivado"))}</span>`}</p></div>
        ${yo ? `<span class="ayuda">${esc(tr("panel.usuarios.usted"))}</span>` : `<div class="usuario-acciones">
          <label class="oculto-visual" for="rol-${esc(u.user_id)}">${esc(tr("panel.usuarios.rol_de", { correo: u.correo }))}</label>
          <select class="entrada" id="rol-${esc(u.user_id)}" data-rol>${ROLES.map((v) => `<option value="${v}" ${u.rol === v ? "selected" : ""}>${esc(nombreRol(v))}</option>`).join("")}</select>
          <button type="button" class="boton ${u.activo ? "boton--peligro" : "boton--secundario"} boton--chico" data-estado="${u.activo ? "0" : "1"}">${esc(tr(u.activo ? "panel.usuarios.desactivar" : "panel.usuarios.reactivar"))}</button>
        </div>`}
      </div>`;
    }).join("");
  }

  async function recargar(enfocar) {
    usuarios = await api.listarUsuarios();
    pintar();
    if (enfocar) $(`.usuario-fila[data-id="${CSS.escape(enfocar.id)}"] ${enfocar.sel}`)?.focus();
  }

  $("#lista-usuarios").addEventListener("click", async (e) => {
    const b = e.target.closest("[data-estado]");
    if (!b) return;
    const id = b.closest(".usuario-fila").dataset.id;
    const u = usuarios.find((x) => x.user_id === id);
    const activar = b.dataset.estado === "1";
    if (!activar && !(await confirmar({ titulo: tr("panel.usuarios.confirmar_desactivar", { correo: u.correo }), texto: tr("panel.usuarios.confirmar_desactivar_texto"), aceptar: tr("panel.usuarios.desactivar"), peligro: true }))) return;
    try {
      await conBoton(b, () => api.cambiarEstadoUsuario(id, activar), { exito: tr(activar ? "panel.usuarios.reactivado" : "panel.usuarios.desactivado_ok") });
      await recargar({ id, sel: "[data-estado]" });
    } catch { /* aviso mostrado */ }
  });

  $("#lista-usuarios").addEventListener("change", async (e) => {
    const sel = e.target.closest("[data-rol]");
    if (!sel) return;
    const id = sel.closest(".usuario-fila").dataset.id;
    try {
      await conBoton(null, () => api.cambiarRolUsuario(id, sel.value), { exito: tr("panel.usuarios.rol_cambiado") });
    } catch { /* aviso mostrado; se vuelve al rol guardado */ }
    await recargar({ id, sel: "[data-rol]" });
  });

  $("#form-invitar").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const correo = $("#u-correo").value.trim().toLowerCase();
    marcarError(form, "u-correo", !correoValido(correo) ? tr("panel.usuarios.revise_correo") : usuarios.some((u) => u.correo === correo) ? tr("panel.usuarios.correo_repetido") : "");
    if (enfocarPrimerError(form)) return;
    try {
      await conBoton(form.querySelector("[type=submit]"), () => api.invitarUsuario(correo, $("#u-rol").value), { exito: tr("panel.usuarios.invitacion_enviada") });
      form.reset();
      await recargar();
    } catch { /* aviso mostrado */ }
  });

  pintar();
}
