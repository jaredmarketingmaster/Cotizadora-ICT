#!/usr/bin/env bash
# =============================================================================
# Levanta un "Supabase local" mínimo para probar el modo supabase de punta a
# punta, sin Docker:
#   Postgres + servidor de auth de Supabase (GoTrue) + PostgREST + la función
#   enviar-lead (Deno) + un webhook de GHL simulado + una pasarela en :54321
#   con Storage simulado en memoria.
#
# Necesita: binarios de Postgres 15+, y en $BIN: postgrest, auth (con su
# carpeta migrations/) y deno. Ver README, "Pruebas".
#
#   BIN=/ruta/binarios bash tests/supabase-local/levantar.sh   # deja todo corriendo
#   bash tests/supabase-local/levantar.sh detener
#
# Deja en $DIR/entorno: URL, ANON y el archivo donde cae el último lead.
# =============================================================================
set -euo pipefail
AQUI="$(cd "$(dirname "$0")" && pwd)"
RAIZ="$(cd "$AQUI/../.." && pwd)"
DIR="${DIR:-/tmp/cotizadora-supabase-local}"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
BIN="${BIN:?Defina BIN con la carpeta de postgrest, auth y deno}"
PGPORT=54330
COMO=()
[ "$(id -u)" = "0" ] && COMO=(runuser -u postgres --)

detener() {
  if [ -f "$DIR/pids" ]; then xargs -r kill < "$DIR/pids" 2>/dev/null || true; fi
  [ -d "$DIR/datos" ] && "${COMO[@]}" "$PGBIN/pg_ctl" -D "$DIR/datos" -m immediate stop >/dev/null 2>&1 || true
  rm -rf "$DIR"
}
if [ "${1:-}" = "detener" ]; then detener; echo "detenido"; exit 0; fi
detener
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
export GOTRUE_LOG_LEVEL=error
(cd "$BIN" && ./auth migrate >"$DIR/auth-migrar.log" 2>&1)
(cd "$BIN" && ./auth >"$DIR/auth.log" 2>&1 & echo $! >> "$DIR/pids")

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

# --- Pasarela -------------------------------------------------------------------
node "$AQUI/pasarela.mjs" 54321 9998 9999 9100 & echo $! >> "$DIR/pids"

esperar() { for _ in $(seq 100); do curl -s -o /dev/null "$1" && return 0; sleep 0.2; done; echo "no arrancó: $1"; exit 1; }
esperar "http://127.0.0.1:9999/health"
esperar "http://127.0.0.1:9998/"
esperar "http://127.0.0.1:9100/"
esperar "http://127.0.0.1:54321/"

# --- Usuarios de prueba -----------------------------------------------------------
crear() { # correo, rol
  local id
  id=$(curl -s -X POST "http://127.0.0.1:9999/admin/users" -H "Authorization: Bearer $SERVICIO" -H "content-type: application/json" \
    -d "{\"email\":\"$1\",\"password\":\"clave-de-prueba-1\",\"email_confirm\":true}" | node -e 'let s="";process.stdin.on("data",c=>s+=c).on("end",()=>process.stdout.write(JSON.parse(s).id||""))')
  [ -n "$id" ] || { echo "no se pudo crear $1"; exit 1; }
  "${PSQL[@]}" -c "insert into public.perfiles (user_id, correo, rol) values ('$id', '$1', '$2');"
}
crear agencia@local.co agencia
crear tienda@local.co tienda

cat > "$DIR/entorno" <<EOT
URL=http://127.0.0.1:54321
ANON=$ANON
LEAD=$DIR/ultimo-lead.json
PSQL_PUERTO=$PGPORT
EOT
echo "Supabase local listo en http://127.0.0.1:54321 (usuarios agencia@local.co y tienda@local.co, clave clave-de-prueba-1)"
