// =============================================================================
// La vitrina completa (0041, assets/js/datos/vitrina.js y ejemplo.js).
//
//   node tests/sql/vitrina.mjs sql
//       Escribe el bloque de 0041_vitrina.sql que pasa la tienda de ejemplo
//       sin tocar (como la dejó 0037) a la vitrina: los datos de ejemplo de
//       hoy (con el horario, las formas de pago y los legales nuevos), las
//       promos y el dólar de ejemplo, y los equipos de la vitrina en lugar de
//       los 6 de demostración. Una tienda que ya se personalizó no cambia.
//       La misma condición tiene la migración 28 de assets/js/datos/demo.js.
// Si cambian los datos de ejemplo, la vitrina o las plantillas legales, la
// instalación nueva del SQL se pone al día con una migración nueva que repita
// este bloque (con su condición) y vuelva a crear datos_fabrica().
// =============================================================================
import { TIENDA_EJEMPLO, TIENDA_VITRINA, CAMPOS_EJEMPLO } from "../../assets/js/datos/ejemplo.js";
import { equiposVitrina } from "../../assets/js/datos/vitrina.js";
import { DEMO_EQUIPOS } from "../../assets/js/datos/semilla.js";
import { publicadoEjemplo } from "../legal/ejemplo.mjs";

const json = (v, tag) => {
  const s = JSON.stringify(v);
  if (s.includes(`$${tag}$`)) throw new Error(`los datos no pueden contener $${tag}$`);
  return `$${tag}$${s}$${tag}$::jsonb`;
};

if (process.argv[2] === "sql") {
  const valores = { ...TIENDA_EJEMPLO, ...TIENDA_VITRINA, legal_publicado: publicadoEjemplo() };
  const columnas = Object.keys(valores);
  // Una fila por equipo: el diff de una migración futura se puede leer.
  if (equiposVitrina().some((e) => JSON.stringify(e).includes("$equipos$"))) throw new Error("los datos no pueden contener $equipos$");
  const equipos = equiposVitrina().map(({ slug, color, capacidad, condicion, color_nombre_mostrar, precio, en_stock, destacado, mas_vendido, promo_descuento, contar_stock, stock_cantidad, fotos }) =>
    JSON.stringify({ slug, color, capacidad, condicion, color_nombre_mostrar, precio, en_stock, destacado, mas_vendido, promo_descuento, contar_stock, stock_cantidad, fotos }));
  process.stdout.write(`-- GENERADO con node tests/sql/vitrina.mjs sql: no editar a mano.
alter table public.tienda disable trigger tienda_publicar_legales;
do $vitrina$
begin
  -- La tienda de ejemplo sin tocar (la condición de tiendaIntacta() de demo.js).
  if not exists (
    select 1 from public.tienda t
    where t.id = 1 and t.nombre = 'Tienda de demostración' and t.modo_demo and t.logo = '' and t.correo_contacto = ''
      and t.horario_texto = '' and cardinality(public.datos_de_ejemplo(t)) = ${CAMPOS_EJEMPLO.length}
      and (t.legal_publicado ->> 'version') = '1'
      and t.pagos_medios = '{}' and t.pagos_pasarelas = '{}' and t.pagos_pasarelas_otras = '{}' and t.pagos_descuentos = '{}'::jsonb
      and not t.pagos_cuotas and not t.pagos_sin_interes and not t.pagos_cripto
      and t.usd_modo = 'no' and not t.promo_banner_activo and not t.promo_descuentos_activos)
    or (select count(*) from public.equipos) <> ${DEMO_EQUIPOS.length}
    or exists (select 1 from public.equipos where not es_demo) then
    return;
  end if;

  update public.tienda t set (${columnas.join(", ")})
    = (select ${columnas.map((c) => `x.${c}`).join(", ")}
       from jsonb_populate_record(t, ${json(valores, "ejemplo")}) x)
  where t.id = 1;

  delete from public.equipos where es_demo;
  update public.modelos set activo = false, activo_por_demo = false where activo_por_demo;
  insert into public.equipos (modelo_id, condicion, capacidad, color_id, color_nombre_mostrar, precio, en_stock,
    destacado, mas_vendido, promo_descuento, contar_stock, stock_cantidad, fotos, publicado, es_demo)
  select m.id, e.condicion, e.capacidad, c.id, e.color_nombre_mostrar, e.precio, e.en_stock,
    e.destacado, e.mas_vendido, e.promo_descuento, e.contar_stock, e.stock_cantidad, e.fotos, true, true
  from jsonb_to_recordset($equipos$[\n${equipos.join(",\n")}\n]$equipos$::jsonb)
    as e (slug text, color text, capacidad text, condicion text, color_nombre_mostrar text, precio bigint, en_stock boolean,
          destacado boolean, mas_vendido boolean, promo_descuento smallint, contar_stock boolean, stock_cantidad integer, fotos text[])
  join public.modelos m on m.slug = e.slug
  join public.colores c on c.modelo_id = m.id and c.oficial and c.nombre_es = e.color;
  update public.modelos set activo = true, activo_por_demo = true
  where not activo and id in (select modelo_id from public.equipos where es_demo);
end
$vitrina$;
alter table public.tienda enable trigger tienda_publicar_legales;
`);
} else {
  console.error("Uso: node tests/sql/vitrina.mjs sql");
  process.exit(2);
}
