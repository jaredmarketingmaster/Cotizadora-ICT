// =============================================================================
// Usuarios (solo administrador): invitar por correo con su rol, asignar roles,
// desactivar y reactivar. Sin registro público: los usuarios solo entran por
// invitación. La base exige que siempre quede un administrador activo.
// =============================================================================

import { correoValido } from "../utils.js";
import { $, esc, conBoton, confirmar, campoTexto, marcarError, enfocarPrimerError } from "./ui.js";

const ROLES = [["gestor", "Gestor"], ["administrador", "Administrador"]];
const nombreRol = (rol) => (ROLES.find(([v]) => v === rol) || [, rol])[1];

export async function dibujar(vista, ctx) {
  if (!ctx.esAdministrador()) { vista.innerHTML = '<p class="popup-alerta">Solo el administrador ve esta sección.</p>'; return; }
  const { api } = ctx;
  let usuarios = await api.listarUsuarios();

  vista.innerHTML = `
    <div class="vista-cabecera"><h1>Usuarios</h1><p>«Administrador» gestiona los accesos: invita, asigna roles, desactiva y reactiva. «Gestor» maneja todo lo demás: Mi tienda, Inventario, Fichas, Catálogo, Legales y el modo demo. Siempre debe quedar al menos un administrador activo.</p></div>
    <section class="bloque" aria-labelledby="t-invitar">
      <h2 id="t-invitar">Invitar</h2>
      <form id="form-invitar" class="grilla-2" novalidate>
        ${campoTexto({ id: "u-correo", etiqueta: "Correo", tipo: "email", atributos: 'inputmode="email" autocomplete="off"' })}
        <div class="campo">
          <label for="u-rol">Rol</label>
          <select class="entrada" id="u-rol">${ROLES.map(([v, t]) => `<option value="${v}">${t}</option>`).join("")}</select>
        </div>
        <div><button type="submit" class="boton boton--primario">Enviar invitación</button></div>
      </form>
      <p class="ayuda">La persona recibe un correo con un enlace para crear su contraseña.${api.tipo === "demo" ? " En modo demo no se envía nada: el usuario entra con la contraseña demo1234." : ""}</p>
    </section>
    <section class="bloque" aria-labelledby="t-lista"><h2 id="t-lista">Con acceso</h2><div id="lista-usuarios" style="display:grid;gap:8px"></div></section>`;

  function pintar() {
    $("#lista-usuarios").innerHTML = usuarios.map((u) => {
      const yo = u.user_id === ctx.usuario.id;
      return `<div class="usuario-fila" data-id="${esc(u.user_id)}">
        <div><p class="correo">${esc(u.correo)}</p><p class="rol">${nombreRol(u.rol)}${u.activo ? "" : ' · <span class="estado-inactivo">Desactivado</span>'}</p></div>
        ${yo ? '<span class="ayuda">Usted</span>' : `<div class="usuario-acciones">
          <label class="oculto-visual" for="rol-${esc(u.user_id)}">Rol de ${esc(u.correo)}</label>
          <select class="entrada" id="rol-${esc(u.user_id)}" data-rol>${ROLES.map(([v, t]) => `<option value="${v}" ${u.rol === v ? "selected" : ""}>${t}</option>`).join("")}</select>
          <button type="button" class="boton ${u.activo ? "boton--peligro" : "boton--secundario"} boton--chico" data-estado="${u.activo ? "0" : "1"}">${u.activo ? "Desactivar" : "Reactivar"}</button>
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
    if (!activar && !(await confirmar({ titulo: `¿Desactivar a ${u.correo}?`, texto: "No podrá entrar al panel hasta que lo reactive.", aceptar: "Desactivar", peligro: true }))) return;
    try {
      await conBoton(b, () => api.cambiarEstadoUsuario(id, activar), { exito: activar ? "Usuario reactivado" : "Usuario desactivado" });
      await recargar({ id, sel: "[data-estado]" });
    } catch { /* aviso mostrado */ }
  });

  $("#lista-usuarios").addEventListener("change", async (e) => {
    const sel = e.target.closest("[data-rol]");
    if (!sel) return;
    const id = sel.closest(".usuario-fila").dataset.id;
    try {
      await conBoton(null, () => api.cambiarRolUsuario(id, sel.value), { exito: "Rol cambiado" });
    } catch { /* aviso mostrado; se vuelve al rol guardado */ }
    await recargar({ id, sel: "[data-rol]" });
  });

  $("#form-invitar").addEventListener("submit", async (e) => {
    e.preventDefault();
    const form = e.currentTarget;
    const correo = $("#u-correo").value.trim().toLowerCase();
    marcarError(form, "u-correo", !correoValido(correo) ? "Revise el correo." : usuarios.some((u) => u.correo === correo) ? "Ese correo ya tiene usuario." : "");
    if (enfocarPrimerError(form)) return;
    try {
      await conBoton(form.querySelector("[type=submit]"), () => api.invitarUsuario(correo, $("#u-rol").value), { exito: "Invitación enviada" });
      form.reset();
      await recargar();
    } catch { /* aviso mostrado */ }
  });

  pintar();
}
