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
# tests/sql/antes_<migración>.sql (si existe) carga datos con el esquema de
# antes de esa migración, para probar que la migración los convierte bien.
for f in "$RAIZ"/supabase/migrations/*.sql; do
  antes="$RAIZ/tests/sql/antes_$(basename "$f")"
  if [ -f "$antes" ]; then "${PSQL[@]}" -f "$antes"; fi
  "${PSQL[@]}" -f "$f"
done
# La semilla del SQL y la del adaptador demo deben coincidir (antes de que las
# pruebas cambien los datos; "iphone-prueba" es un dato de antes_0006).
"${PSQL[@]}" -At -c "
  select json_build_object(
    'modelos', (select json_agg(json_build_object('nombre', nombre, 'slug', slug, 'generacion', generacion, 'orden', orden) order by orden) from public.modelos where slug <> 'iphone-prueba'),
    'colores', (select json_agg(json_build_object('slug', m.slug, 'nombre_es', c.nombre_es, 'nombre_en', c.nombre_en, 'hex', c.hex, 'orden', c.orden, 'oficial', c.oficial, 'hex_de_fuente', c.hex_de_fuente) order by m.orden, c.orden)
      from public.colores c join public.modelos m on m.id = c.modelo_id),
    'demo', (select json_agg(json_build_object('slug', m.slug, 'condicion', e.condicion, 'capacidad', e.capacidad,
      'color', c.nombre_es, 'color_nombre_mostrar', e.color_nombre_mostrar, 'precio', e.precio, 'en_stock', e.en_stock, 'destacado', e.destacado,
      'bateria_porcentaje', e.bateria_porcentaje, 'estado_estetico', e.estado_estetico, 'detalles', e.detalles, 'incluye', e.incluye))
      from public.equipos e join public.modelos m on m.id = e.modelo_id left join public.colores c on c.id = e.color_id where e.es_demo))" > "$DIR/semilla.json"
node "$RAIZ/tests/sql/comparar-semilla.mjs" "$RAIZ" "$DIR/semilla.json"

"${PSQL[@]}" -f "$RAIZ/tests/sql/pruebas.sql"
