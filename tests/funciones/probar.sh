#!/usr/bin/env bash
# Prueba las funciones enviar-lead (contra un webhook de GHL simulado) y
# catalogo-feed (contra un PostgREST simulado) con Deno.
#   DENO=/ruta/a/deno bash tests/funciones/probar.sh
set -euo pipefail
RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
DENO="${DENO:-deno}"
TMP="$(mktemp -d)"
PIDS=()
limpiar() { for p in "${PIDS[@]}"; do kill "$p" 2>/dev/null || true; done; rm -rf "$TMP"; }
trap limpiar EXIT

"$DENO" check "$RAIZ/supabase/functions/enviar-lead/index.ts" "$RAIZ/supabase/functions/usuarios/index.ts" "$RAIZ/supabase/functions/catalogo-feed/index.ts"

node "$RAIZ/tests/funciones/webhook-simulado.mjs" 18081 "$TMP/ok.json" & PIDS+=($!)
ESTADO=500 node "$RAIZ/tests/funciones/webhook-simulado.mjs" 18082 "$TMP/mal.json" & PIDS+=($!)

srv() { # puerto, archivo de la función (variables de entorno delante)
  "$DENO" run --allow-net --allow-env --allow-read --no-prompt "$RAIZ/tests/funciones/servir.ts" "$1" "$RAIZ/supabase/functions/enviar-lead/index.ts" >/dev/null 2>&1 &
  PIDS+=($!)
}
GHL_WEBHOOK_URL="http://127.0.0.1:18081" srv 18090
GHL_WEBHOOK_URL="http://127.0.0.1:18082" srv 18091
GHL_WEBHOOK_URL="" srv 18092
GHL_WEBHOOK_URL="http://127.0.0.1:18081" ORIGENES_PERMITIDOS="https://tienda.co" srv 18093
for p in 18090 18091 18092 18093; do
  for _ in $(seq 50); do curl -s -o /dev/null "http://127.0.0.1:$p" && break; sleep 0.2; done
done

BUENO='{"nombre":"Juan Pérez","correo":"juan@correo.co","telefono":"+573001234567","modelo":"iPhone 18 Pro Max","condicion":"Nuevo","capacidad":"256 GB","color":"Plata","precio_cotizado":6200000,"equipo_id":"abc","tipo_consulta":"compra","codigo_cotizacion":"COT-AB2C","utm_source":"meta","utm_medium":"","utm_campaign":"test","utm_term":"","utm_content":"","ad_id":"123","fbclid":"prueba","pagina":"https://tienda.co/","enviado_en":"2026-10-20T00:00:00Z","consentimiento_datos":true,"consentimiento_promociones":false,"consentimiento_medicion":true,"consentimiento_publicidad":false,"version_politica":2,"fecha_consentimiento":"2026-10-20T09:30:00-05:00"}'
fallas=0
probar() { # nombre, puerto, cuerpo, estado esperado, [origen]
  local estado
  estado=$(curl -s --max-time 15 -o "$TMP/r.json" -w "%{http_code}" -X POST "http://127.0.0.1:$2" -H "content-type: application/json" ${5:+-H "origin: $5"} -d "$3" || true)
  if [ "$estado" = "$4" ]; then echo "ok   $1 ($estado)"; else echo "FALLA $1: esperaba $4, dio $estado $(cat "$TMP/r.json")"; fallas=$((fallas+1)); fi
}
probar "lead válido" 18090 "$BUENO" 200
node -e '
const r = JSON.parse(require("fs").readFileSync(process.argv[1], "utf8"));
const esperado = { name: "Juan Pérez", email: "juan@correo.co", phone: "+573001234567", modelo: "iPhone 18 Pro Max", condicion: "Nuevo", capacidad: "256 GB", color: "Plata", precio_cotizado: 6200000, equipo_id: "abc", tipo_consulta: "compra", codigo_cotizacion: "COT-AB2C", utm_source: "meta", utm_campaign: "test", ad_id: "123", fbclid: "prueba", event_id: "COT-AB2C", consentimiento_datos: true, consentimiento_promociones: false, consentimiento_medicion: true, consentimiento_publicidad: false, version_politica: 2, fecha_consentimiento: "2026-10-20T09:30:00-05:00" };
for (const [k, v] of Object.entries(esperado)) if (r[k] !== v) { console.log("FALLA campo " + k + ": " + JSON.stringify(r[k])); process.exit(1); }
for (const k of ["utm_medium", "utm_term", "utm_content"]) if (!(k in r)) { console.log("FALLA falta " + k); process.exit(1); }
console.log("ok   el webhook recibió todos los campos");' "$TMP/ok.json" || fallas=$((fallas+1))
probar "teléfono inválido (corto)" 18090 "${BUENO/+573001234567/+5730012}" 400
probar "teléfono sin +" 18090 "${BUENO/+573001234567/573001234567}" 400
probar "teléfono de Argentina" 18090 "${BUENO/+573001234567/+5491123456789}" 200
probar "correo inválido" 18090 "${BUENO/juan@correo.co/juan}" 400
probar "código inválido" 18090 "${BUENO/COT-AB2C/COT-AB1C}" 400
probar "JSON roto" 18090 "{" 400
probar "sin autorización de datos" 18090 "${BUENO/\"consentimiento_datos\":true/\"consentimiento_datos\":false}" 400
probar "sin versión de la política" 18090 "${BUENO/\"version_politica\":2/\"version_politica\":0}" 400
probar "fecha sin zona horaria" 18090 "${BUENO/2026-10-20T09:30:00-05:00/2026-10-20 09:30}" 400
probar "promociones como texto: no" 18090 "${BUENO/\"consentimiento_promociones\":false/\"consentimiento_promociones\":\"si\"}" 200
probar "GHL responde 500" 18091 "$BUENO" 502
probar "sin GHL_WEBHOOK_URL" 18092 "$BUENO" 500
probar "origen no permitido" 18093 "$BUENO" 403 "https://otro.co"
probar "origen permitido" 18093 "$BUENO" 200 "https://tienda.co"

# --- catalogo-feed (C4) ---------------------------------------------------------
node "$RAIZ/tests/funciones/datos-simulados.mjs" 18084 & PIDS+=($!)
node "$RAIZ/tests/funciones/datos-simulados.mjs" 18085 sin_url & PIDS+=($!)
feed() { # puerto de la función, puerto del PostgREST simulado
  SUPABASE_URL="http://127.0.0.1:$2" SUPABASE_ANON_KEY="anon-de-prueba" "$DENO" run --allow-net --allow-env --allow-read --no-prompt "$RAIZ/tests/funciones/servir.ts" "$1" "$RAIZ/supabase/functions/catalogo-feed/index.ts" >/dev/null 2>&1 &
  PIDS+=($!)
}
feed 18094 18084
feed 18095 18085
for p in 18094 18095; do
  for _ in $(seq 50); do curl -s -o /dev/null "http://127.0.0.1:$p" && break; sleep 0.2; done
done
pedir() { # nombre, url, estado esperado
  local estado
  estado=$(curl -s --max-time 15 -o "$TMP/feed.xml" -D "$TMP/cab.txt" -w "%{http_code}" "$2" || true)
  if [ "$estado" = "$3" ]; then echo "ok   $1 ($estado)"; else echo "FALLA $1: esperaba $3, dio $estado $(head -c 200 "$TMP/feed.xml")"; fallas=$((fallas+1)); fi
}
pedir "XML para Google" "http://127.0.0.1:18094/?formato=google" 200
node -e '
const fs = require("fs");
const xml = fs.readFileSync(process.argv[1], "utf8");
const cab = fs.readFileSync(process.argv[2], "utf8").toLowerCase();
const ok = [
  ["content-type XML", /content-type: application\/xml/.test(cab)],
  ["caché corta", /cache-control: public, max-age=900/.test(cab)],
  ["un solo equipo (el de foto)", (xml.match(/<item>/g) || []).length === 1],
  ["enlace ?equipo=", xml.includes("<link>https://tienda.com.ar/?equipo=e1</link>")],
  ["foto pública", xml.includes("<g:image_link>http://127.0.0.1:18084/storage/v1/object/public/fotos/equipos/e1.webp</g:image_link>")],
  ["precio en pesos argentinos", xml.includes("<g:price>1500000.00 ARS</g:price>")],
  ["in_stock", xml.includes("<g:availability>in_stock</g:availability>")]
];
const malos = ok.filter(([, v]) => !v).map(([n]) => n);
if (malos.length) { console.log("FALLA XML: " + malos.join(", ")); process.exit(1); }
console.log("ok   el XML trae lo esperado");' "$TMP/feed.xml" "$TMP/cab.txt" || fallas=$((fallas+1))
pedir "XML para Meta" "http://127.0.0.1:18094/?formato=meta" 200
grep -q "<g:availability>in stock</g:availability>" "$TMP/feed.xml" && echo "ok   Meta: in stock" || { echo "FALLA Meta: availability"; fallas=$((fallas+1)); }
pedir "formato que no existe" "http://127.0.0.1:18094/?formato=amazon" 400
pedir "sin la dirección del sitio" "http://127.0.0.1:18095/?formato=google" 409

[ "$fallas" = 0 ] && echo "OK: funciones enviar-lead y catalogo-feed" || { echo "$fallas fallas"; exit 1; }
