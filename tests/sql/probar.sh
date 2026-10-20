#!/usr/bin/env bash
# Prueba las migraciones de supabase/migrations en un Postgres local temporal
# (necesita los binarios de Postgres 15+; no necesita Docker).
#   bash tests/sql/probar.sh
set -euo pipefail

RAIZ="$(cd "$(dirname "$0")/../.." && pwd)"
PGBIN="${PGBIN:-$(ls -d /usr/lib/postgresql/*/bin 2>/dev/null | sort -V | tail -1)}"
DIR="$(mktemp -d)"
PUERTO="${PUERTO:-54329}"

# initdb y pg_ctl no corren como root: se usa el usuario "postgres" si hace falta.
COMO=()
if [ "$(id -u)" = "0" ]; then
  chown -R postgres "$DIR"
  COMO=(runuser -u postgres --)
fi

limpiar() { "${COMO[@]}" "$PGBIN/pg_ctl" -D "$DIR/datos" -m immediate stop >/dev/null 2>&1 || true; rm -rf "$DIR"; }
trap limpiar EXIT

"${COMO[@]}" "$PGBIN/initdb" -D "$DIR/datos" -U postgres -A trust >/dev/null
"${COMO[@]}" "$PGBIN/pg_ctl" -D "$DIR/datos" -o "-p $PUERTO -k $DIR" -l "$DIR/log" start >/dev/null

PSQL=(psql -h "$DIR" -p "$PUERTO" -U postgres -d postgres -q -v ON_ERROR_STOP=1)
"${PSQL[@]}" -f "$RAIZ/tests/sql/supabase_simulado.sql"
for f in "$RAIZ"/supabase/migrations/*.sql; do "${PSQL[@]}" -f "$f"; done
# La semilla del SQL y la del adaptador demo deben coincidir (antes de que las
# pruebas cambien los datos).
"${PSQL[@]}" -At -c "
  select json_build_object(
    'modelos', (select json_agg(json_build_object('nombre', nombre, 'slug', slug, 'generacion', generacion, 'orden', orden) order by orden) from public.modelos),
    'demo', (select json_agg(json_build_object('slug', m.slug, 'condicion', e.condicion, 'capacidad', e.capacidad,
      'color_nombre', e.color_nombre, 'color_hex', e.color_hex, 'precio', e.precio, 'stock', e.stock, 'destacado', e.destacado,
      'bateria_porcentaje', e.bateria_porcentaje, 'estado_estetico', e.estado_estetico, 'detalles', e.detalles, 'incluye', e.incluye))
      from public.equipos e join public.modelos m on m.id = e.modelo_id where e.es_demo))" > "$DIR/semilla.json"
node "$RAIZ/tests/sql/comparar-semilla.mjs" "$RAIZ" "$DIR/semilla.json"

"${PSQL[@]}" -f "$RAIZ/tests/sql/pruebas.sql"
