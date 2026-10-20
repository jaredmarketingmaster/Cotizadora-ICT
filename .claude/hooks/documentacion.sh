#!/usr/bin/env bash
# =============================================================================
# Hook "Stop" de Claude Code: no deja terminar un trabajo con DOCUMENTACION.md
# desactualizado. Bloquea (y le pide a Claude que lo actualice) si:
#   1. hay archivos cambiados (confirmados, sin confirmar o nuevos) después del
#      último cambio a DOCUMENTACION.md, o
#   2. tests/documentacion.mjs dice que falta documentar algún archivo.
# Si DOCUMENTACION.md tiene cambios sin confirmar, se da por actualizado (se
# está escribiendo en este mismo trabajo) y solo se corre el verificador.
# Para no entrar en un bucle, no bloquea dos veces seguidas (stop_hook_active).
# Ver DOCUMENTACION.md, sección 18.
# =============================================================================
entrada="$(cat)"
if printf '%s' "$entrada" | grep -q '"stop_hook_active"[[:space:]]*:[[:space:]]*true'; then
  exit 0
fi

cd "${CLAUDE_PROJECT_DIR:-$(dirname "$0")/../..}" 2>/dev/null || exit 0
git rev-parse --is-inside-work-tree >/dev/null 2>&1 || exit 0
command -v node >/dev/null 2>&1 || exit 0

DOC="DOCUMENTACION.md"
pendientes=""
if [ -z "$(git status --porcelain -- "$DOC")" ]; then
  base="$(git log -1 --format=%H -- "$DOC" 2>/dev/null)"
  if [ -n "$base" ]; then
    pendientes="$( { git diff --name-only "$base"; git ls-files --others --exclude-standard; } | grep -vxF "$DOC" | sort -u)"
  else
    pendientes="$(git ls-files --cached --others --exclude-standard)"
  fi
fi

verificador=""
if [ -f tests/documentacion.mjs ] && ! verificador="$(node tests/documentacion.mjs 2>&1)"; then
  falla_verificador=1
fi

if [ -n "$pendientes" ] || [ -n "${falla_verificador:-}" ]; then
  motivo="DOCUMENTACION.md no está al día (regla de CLAUDE.md y sección 18 del documento)."
  if [ -n "$pendientes" ]; then
    motivo="$motivo
Archivos cambiados después de su última actualización:
$(printf '%s\n' "$pendientes" | head -n 25 | sed 's/^/  - /')"
  fi
  if [ -n "${falla_verificador:-}" ]; then
    motivo="$motivo
$verificador"
  fi
  motivo="$motivo
Actualice la sección 5 (mapa de archivos), la sección temática que corresponda, los pendientes si cambiaron, la fecha de arriba y agregue una entrada nueva arriba en la sección 19 (registro de cambios). Después confirme los cambios junto con DOCUMENTACION.md."
  node -e 'process.stdout.write(JSON.stringify({ decision: "block", reason: process.argv[1] }))' "$motivo"
fi
exit 0
