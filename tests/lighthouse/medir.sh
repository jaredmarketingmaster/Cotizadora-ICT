#!/usr/bin/env bash
# =============================================================================
# Lighthouse móvil del sitio en modo demo, como una tienda real: legales
# publicados, WhatsApp cargado (con el globo de ayuda) y sin elección de
# cookies (aparece el banner). Ronda 3, I.
#
#   npx serve -l 8090 . &                         # servidor que comprime
#   bash tests/lighthouse/medir.sh corrida1        # sin la franja de modo demo
#   bash tests/lighthouse/medir.sh franja true     # con la franja
#   ICT_LH_IDIOMA=pt bash tests/lighthouse/medir.sh portugues   # tienda en portugués, idioma guardado
#
# Necesita Lighthouse (LIGHTHOUSE=/ruta/al/bin, o npx lighthouse) y Playwright
# (NODE_PATH="$(npm root -g)"). CHROME: el Chromium de /opt/pw-browsers.
# El informe queda en tests/capturas/lighthouse-<nombre>.json (ignorado por git).
# =============================================================================
set -uo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(cd "$AQUI/../.." && pwd)"
NOMBRE="${1:-corrida}"; DEMO="${2:-false}"
URL="${ICT_LH_URL:-http://localhost:8090/}"
CHROME="${CHROME:-$(ls -d /opt/pw-browsers/chromium-*/chrome-linux/chrome 2>/dev/null | sort -V | tail -1)}"
LH="${LIGHTHOUSE:-npx lighthouse}"
PUERTO=9333
SALIDA="$RAIZ/tests/capturas"; mkdir -p "$SALIDA"
PERFIL="$(mktemp -d)"
PROXY=(); [ -n "${HTTPS_PROXY:-}" ] && PROXY=(--proxy-server="$HTTPS_PROXY" --proxy-bypass-list="127.0.0.1;localhost")
# Se detiene por PID: nunca con pkill y el texto de la línea de comandos, que
# puede coincidir con la propia shell.
"$CHROME" --headless=new --no-sandbox --disable-gpu --user-data-dir="$PERFIL" --remote-debugging-port=$PUERTO "${PROXY[@]}" about:blank >/dev/null 2>&1 &
PID=$!
trap 'kill $PID 2>/dev/null; wait $PID 2>/dev/null; rm -rf "$PERFIL"' EXIT
for _ in $(seq 50); do curl -s "http://127.0.0.1:$PUERTO/json/version" >/dev/null && break; sleep 0.2; done
node "$AQUI/preparar.cjs" "$PUERTO" "$DEMO" "$URL"
$LH "$URL" --port=$PUERTO --disable-storage-reset --only-categories=performance,accessibility,best-practices --output=json --output-path="$SALIDA/lighthouse-$NOMBRE.json" --quiet
node -e '
const r = require(process.argv[1]); const c = r.categories, a = r.audits;
console.log(process.argv[2], "rendimiento", Math.round(c.performance.score * 100), "accesibilidad", Math.round(c.accessibility.score * 100), "buenas prácticas", Math.round(c["best-practices"].score * 100),
  "LCP", a["largest-contentful-paint"].displayValue, "CLS", a["cumulative-layout-shift"].displayValue, "TBT", a["total-blocking-time"].displayValue);
' "$SALIDA/lighthouse-$NOMBRE.json" "$NOMBRE"
