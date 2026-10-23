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
# pruebas cambien los datos; "iphone-prueba" es un dato de antes_0006 y la
# ficha del iPhone 13 la cargó la tienda en antes_0012 y antes_0029; los términos y el aviso
# de marca, en antes_0015 y antes_0016; los colores de la tienda, en antes_0028:
# por eso se comparan solo los oficiales).
"${PSQL[@]}" -At -c "
  select json_build_object(
    'modelos', (select json_agg(json_build_object('nombre', nombre, 'slug', slug, 'generacion', generacion, 'orden', orden) order by orden) from public.modelos where slug <> 'iphone-prueba'),
    'colores', (select json_agg(json_build_object('slug', m.slug, 'nombre_es', c.nombre_es, 'nombre_en', c.nombre_en, 'hex', c.hex, 'orden', c.orden, 'oficial', c.oficial, 'hex_de_fuente', c.hex_de_fuente, 'hex_aproximado', c.hex_aproximado) order by m.orden, c.orden)
      from public.colores c join public.modelos m on m.id = c.modelo_id where c.oficial),
    'demo', (select json_agg(json_build_object('slug', m.slug, 'condicion', e.condicion, 'capacidad', e.capacidad,
      'color', c.nombre_es, 'color_nombre_mostrar', e.color_nombre_mostrar, 'precio', e.precio, 'en_stock', e.en_stock, 'destacado', e.destacado,
      'bateria_porcentaje', e.bateria_porcentaje, 'estado_estetico', e.estado_estetico, 'detalles', e.detalles, 'incluye', e.incluye))
      from public.equipos e join public.modelos m on m.id = e.modelo_id left join public.colores c on c.id = e.color_id where e.es_demo),
    'fichas', (select json_object_agg(m.slug, f.especificaciones order by m.orden) from public.fichas f join public.modelos m on m.id = f.modelo_id
      where m.slug not in ('iphone-prueba', 'iphone-13')),
    'legales', (select to_jsonb(t) from public.tienda t))" > "$DIR/semilla.json"
node "$RAIZ/tests/sql/comparar-semilla.mjs" "$RAIZ" "$DIR/semilla.json"
# El WhatsApp de la tienda según su país: el mismo criterio en SQL y en JS.
node "$RAIZ/tests/sql/comparar-paises.mjs" sql "$RAIZ" > "$DIR/paises.sql"
"${PSQL[@]}" -At -f "$DIR/paises.sql" > "$DIR/paises.json"
node "$RAIZ/tests/sql/comparar-paises.mjs" comparar "$RAIZ" "$DIR/paises.json"
# Lo que falta para publicar los legales: el mismo criterio en SQL y en JS.
node "$RAIZ/tests/sql/comparar-faltantes.mjs" sql "$RAIZ" > "$DIR/faltantes.sql"
"${PSQL[@]}" -At -f "$DIR/faltantes.sql" > "$DIR/faltantes.json"
node "$RAIZ/tests/sql/comparar-faltantes.mjs" comparar "$RAIZ" "$DIR/faltantes.json"

"${PSQL[@]}" -f "$RAIZ/tests/sql/pruebas.sql"

# Restablecer de fábrica (0036): la base con datos (los de antes_*.sql y los
# de las pruebas) restablecida debe quedar igual a una instalación nueva, que
# se arma aparte en la base "instalacion" (sin los antes_*.sql).
"${PSQL[@]}" -c "create database instalacion"
PSQL_NUEVA=(psql -h "$DIR" -p "$PUERTO" -U postgres -d instalacion -q -v ON_ERROR_STOP=1)
# Los roles son del servidor: ya existen (se crean una sola vez).
grep -v '^create role ' "$RAIZ/tests/sql/supabase_simulado.sql" | "${PSQL_NUEVA[@]}"
for f in "$RAIZ"/supabase/migrations/*.sql; do "${PSQL_NUEVA[@]}" -f "$f"; done
"${PSQL_NUEVA[@]}" -At -f "$RAIZ/tests/sql/estado_fabrica.sql" > "$DIR/instalacion.json"
# ICT_FABRICA=/ruta/instalacion.json guarda ese estado, para volver a generar
# datos_fabrica() en una migración nueva (ver tests/sql/fabrica.mjs).
if [ -n "${ICT_FABRICA:-}" ]; then cp "$DIR/instalacion.json" "$ICT_FABRICA"; fi
"${PSQL[@]}" -f "$RAIZ/tests/sql/restablecer.sql"
"${PSQL[@]}" -At -f "$RAIZ/tests/sql/estado_fabrica.sql" > "$DIR/restablecida.json"
node "$RAIZ/tests/sql/fabrica.mjs" comparar "$DIR/instalacion.json" "$DIR/restablecida.json"
