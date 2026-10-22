#!/usr/bin/env bash
# =============================================================================
# Levanta un "Supabase local" mínimo para probar el modo supabase de punta a
# punta, sin Docker:
#   Postgres + servidor de auth de Supabase (GoTrue) + PostgREST + las
#   funciones enviar-lead y usuarios (Deno) + un webhook de GHL simulado + un
#   SMTP simulado (guarda los correos) + una pasarela en :54321 con Storage
#   simulado en memoria.
#
# Necesita: binarios de Postgres 15+, y en $BIN: postgrest, auth (con su
# carpeta migrations/) y deno. Ver README, "Pruebas".
#
#   BIN=/ruta/binarios bash tests/supabase-local/levantar.sh   # deja todo corriendo
#   CORREOS_IDIOMA=pt BIN=… bash tests/supabase-local/levantar.sh   # correos en portugués
#   bash tests/supabase-local/levantar.sh detener
#
# Deja en $DIR/entorno: URL, ANON, el archivo donde cae el último lead y la
# carpeta donde caen los correos.
# =============================================================================
set -euo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(cd "$AQUI/../.." && pwd)"
DIR="${DIR:-/tmp/cotizadora-supabase-local}"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
PGPORT=54330
COMO=()
[ "$(id -u)" = "0" ] && COMO=(runuser -u postgres --)

detener() {
  if [ -f "$DIR/pids" ]; then xargs -r kill < "$DIR/pids" 2>/dev/null || true; fi
  [ -d "$DIR/datos" ] && "${COMO[@]}" "$PGBIN/pg_ctl" -D "$DIR/datos" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$DIR"
}
if [ "${1:-}" = "detener" ]; then detener; echo "detenido"; exit 0; fi
# Solo para levantar (detener no lo necesita).
BIN="${BIN:?Defina BIN con la carpeta de postgrest, auth y deno}"
detener
# Esperar a que los puertos de una corrida anterior queden libres.
for p in 2525 9100 9101 9102 9998 9999 54321 "$PGPORT"; do
  for _ in $(seq 50); do (exec 3<>"/dev/tcp/127.0.0.1/$p") 2>/dev/null || break; sleep 0.2; done
done
export DENO_NO_UPDATE_CHECK=1
mkdir -p "$DIR"
[ "$(id -u)" = "0" ] && chown postgres "$DIR"

SECRETO="secreto-local-de-pruebas-de-32-caracteres-o-mas"
ANON="$(node "$AQUI/jwt.mjs" "$SECRETO" anon)"
SERVICIO="$(node "$AQUI/jwt.mjs" "$SECRETO" service_role)"

# --- Postgres ---------------------------------------------------------------
"${COMO[@]}" "$PGBIN/initdb" -D "$DIR/datos" -U postgres -A trust >/dev/null
"${COMO[@]}" "$PGBIN/pg_ctl" -D "$DIR/datos" -o "-p $PGPORT -k $DIR -c listen_addresses=127.0.0.1" -l "$DIR/pg.log" start >/dev/null
PSQL=(psql -h 127.0.0.1 -p "$PGPORT" -U postgres -d postgres -q -v ON_ERROR_STOP=1)
"${PSQL[@]}" -f "$AQUI/roles.sql"

# --- SMTP simulado (invitaciones y recuperación de contraseña) --------------------
node "$AQUI/smtp-simulado.mjs" 2525 "$DIR/correos" & echo $! >> "$DIR/pids"

# --- Auth (GoTrue) ----------------------------------------------------------
export GOTRUE_DB_DRIVER=postgres
export DATABASE_URL="postgres://supabase_auth_admin@127.0.0.1:$PGPORT/postgres?sslmode=disable&search_path=auth"
export GOTRUE_DB_DATABASE_URL="$DATABASE_URL"
export GOTRUE_DB_MIGRATIONS_PATH="$BIN/migrations"
export GOTRUE_API_HOST=127.0.0.1 PORT=9999
export API_EXTERNAL_URL="http://127.0.0.1:54321/auth/v1"
export GOTRUE_SITE_URL="http://localhost:8080/admin/"
export GOTRUE_URI_ALLOW_LIST="http://localhost:8080/**"
export GOTRUE_JWT_SECRET="$SECRETO" GOTRUE_JWT_EXP=3600 GOTRUE_JWT_AUD=authenticated
export GOTRUE_JWT_DEFAULT_GROUP_NAME=authenticated GOTRUE_JWT_ADMIN_ROLES=service_role
export GOTRUE_DISABLE_SIGNUP=true GOTRUE_EXTERNAL_EMAIL_ENABLED=true GOTRUE_MAILER_AUTOCONFIRM=true
export GOTRUE_SMTP_HOST=127.0.0.1 GOTRUE_SMTP_PORT=2525 GOTRUE_SMTP_ADMIN_EMAIL=no-responder@local.co
export GOTRUE_SMTP_SENDER_NAME="Panel local" GOTRUE_SMTP_MAX_FREQUENCY=1s GOTRUE_RATE_LIMIT_EMAIL_SENT=1000
# Las plantillas del repo (la pasarela las sirve en /plantillas/): en español
# por defecto; con CORREOS_IDIOMA=pt, las de portugués (supabase/correos/pt/).
if [ "${CORREOS_IDIOMA:-es}" = "pt" ]; then
  export GOTRUE_MAILER_TEMPLATES_INVITE="http://127.0.0.1:54321/plantillas/pt/invitacion.html"
  export GOTRUE_MAILER_TEMPLATES_RECOVERY="http://127.0.0.1:54321/plantillas/pt/recuperacion.html"
  export GOTRUE_MAILER_SUBJECTS_INVITE="Seu acesso ao painel da loja"
  export GOTRUE_MAILER_SUBJECTS_RECOVERY="Nova senha para o painel da loja"
else
  export GOTRUE_MAILER_TEMPLATES_INVITE="http://127.0.0.1:54321/plantillas/invitacion.html"
  export GOTRUE_MAILER_TEMPLATES_RECOVERY="http://127.0.0.1:54321/plantillas/recuperacion.html"
  export GOTRUE_MAILER_SUBJECTS_INVITE="Su acceso al panel de la tienda"
  export GOTRUE_MAILER_SUBJECTS_RECOVERY="Contraseña nueva para el panel de la tienda"
fi
export GOTRUE_LOG_LEVEL=error
"$BIN/auth" migrate >"$DIR/auth-migrar.log" 2>&1
# Sin subshell: así $! es el PID de auth y "detener" lo apaga de verdad.
"$BIN/auth" >"$DIR/auth.log" 2>&1 & echo $! >> "$DIR/pids"

# --- Migraciones del proyecto ------------------------------------------------
"${PSQL[@]}" -f "$AQUI/despues_de_auth.sql"
for f in "$RAIZ"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
"${PSQL[@]}" -c "grant all on all tables in schema public to service_role;"

# --- PostgREST ----------------------------------------------------------------
PGRST_DB_URI="postgres://authenticator@127.0.0.1:$PGPORT/postgres" PGRST_DB_SCHEMAS=public \
PGRST_DB_ANON_ROLE=anon PGRST_JWT_SECRET="$SECRETO" PGRST_SERVER_HOST=127.0.0.1 PGRST_SERVER_PORT=9998 \
  "$BIN/postgrest" >"$DIR/postgrest.log" 2>&1 & echo $! >> "$DIR/pids"

# --- Función enviar-lead + webhook de GHL simulado ----------------------------
node "$RAIZ/tests/funciones/webhook-simulado.mjs" 9101 "$DIR/ultimo-lead.json" & echo $! >> "$DIR/pids"
GHL_WEBHOOK_URL="http://127.0.0.1:9101" "$BIN/deno" run --allow-net --allow-env --allow-read --no-prompt \
  "$RAIZ/tests/funciones/servir.ts" 9100 "$RAIZ/supabase/functions/enviar-lead/index.ts" >"$DIR/funcion.log" 2>&1 & echo $! >> "$DIR/pids"

# --- Función usuarios (usa la clave de servicio, como en Supabase) ---------------
SUPABASE_URL="http://127.0.0.1:54321" SUPABASE_ANON_KEY="$ANON" SUPABASE_SERVICE_ROLE_KEY="$SERVICIO" \
  "$BIN/deno" run --allow-net --allow-env --allow-read --allow-sys --no-prompt \
  "$RAIZ/tests/funciones/servir.ts" 9102 "$RAIZ/supabase/functions/usuarios/index.ts" >"$DIR/usuarios.log" 2>&1 & echo $! >> "$DIR/pids"

# --- Pasarela -------------------------------------------------------------------
node "$AQUI/pasarela.mjs" 54321 9998 9999 "enviar-lead=9100,usuarios=9102" & echo $! >> "$DIR/pids"

esperar() { for _ in $(seq 100); do curl -s -o /dev/null "$1" && return 0; sleep 0.2; done; echo "no arrancó: $1"; exit 1; }
esperar "http://127.0.0.1:9999/health"
esperar "http://127.0.0.1:9998/"
esperar "http://127.0.0.1:9100/"
esperar "http://127.0.0.1:9102/"
esperar "http://127.0.0.1:54321/"

# --- Usuarios de prueba -----------------------------------------------------------
crear() { # correo, rol
  local id
  id=$(curl -s -X POST "http://127.0.0.1:9999/admin/users" -H "Authorization: Bearer $SERVICIO" -H "content-type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"clave-de-prueba-1\",\"email_confirm\":true}" | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>process.stdout.write(JSON.parse(s).id||""))')
  [ -n "$id" ] || { echo "no se pudo crear $1"; exit 1; }
  "${PSQL[@]}" -c "insert into public.perfiles (user_id, correo, rol) values ('$id', '$1', '$2');"
}
crear administrador@local.co administrador
crear gestor@local.co gestor

cat > "$DIR/entorno" <<EOT
URL=http://127.0.0.1:54321
ANON=$ANON
LEAD=$DIR/ultimo-lead.json
CORREOS=$DIR/correos
PSQL_PUERTO=$PGPORT
EOT
echo "Supabase local listo en http://127.0.0.1:54321 (usuarios administrador@local.co y gestor@local.co, clave clave-de-prueba-1)"
