// =============================================================================
// Usuarios (solo agencia): invitar por correo y desactivar o reactivar.
// Sin registro público: los usuarios solo entran por invitación.
// =============================================================================

import { correoValido } from "../utils.js";
import { $, esc, conBoton, confirmar, campoTexto, marcarError, enfocarPrimerError } from "./ui.js";

export async function dibujar(vista, ctx) {
  if (!ctx.esAgencia()) { vista.innerHTML = '<p class="popup-alerta">Solo la agencia ve esta sección.</p>'; return; }
  const { api } = ctx;
  let usuarios = await api.listarUsuarios();

  vista.innerHTML = `
    <div class="vista-cabecera"><h1>Usuarios</h1><p>«Agencia» puede todo. «Tienda» gestiona Mi tienda, Inventario, Fichas, Legales y activa modelos.</p></div>
    <section class="bloque" aria-labelledby="t-invitar">
      <h2 id="t-invitar">Invitar</h2>
      <form id="form-invitar" class="grilla-2" novalidate>
        ${campoTexto({ id: "u-correo", etiqueta: "Correo", tipo: "email", atributos: 'inputmode="email" autocomplete="off"' })}
        <div class="campo">
          <label for="u-rol">Rol</label>
          <select class="entrada" id="u-rol"><option value="tienda">Tienda</option><option value="agencia">Agencia</option></select>
        </div>
        <div><button type="submit" class="boton boton--primario">Enviar invitación</button></div>
      </form>
      <p class="ayuda">La persona recibe un correo con un enlace para crear su contraseña.${api.tipo === "demo" ? " En modo demo no se envía nada: el usuario entra con la contraseña demo1234." : ""}</p>
    </section>
    <section class="bloque" aria-labelledby="t-lista"><h2 id="t-lista">Con acceso</h2><div id="lista-usuarios" style="display:grid;gap:8px"></div></section>`;

  function pintar() {
    $("#lista-usuarios").innerHTML = usuarios.map((u) => `<div class="usuario-fila" data-id="${esc(u.user_id)}">
      <div><p class="correo">${esc(u.correo)}</p><p class="rol">${u.rol === "agencia" ? "Agencia" : "Tienda"}${u.activo ? "" : ' · <span class="estado-inactivo">Desactivado</span>'}</p></div>
      ${u.user_id === ctx.usuario.id ? '<span class="ayuda">Usted</span>' : `<button type="button" class="boton ${u.activo ? "boton--peligro" : "boton--secundario"} boton--chico" data-estado="${u.activo ? "0" : "1"}">${u.activo ? "Desactivar" : "Reactivar"}</button>`}
    </div>`).join("");
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
      usuarios = await api.listarUsuarios();
      pintar();
    } catch { /* aviso mostrado */ }
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
      usuarios = await api.listarUsuarios();
      pintar();
    } catch { /* aviso mostrado */ }
  });

  pintar();
}
