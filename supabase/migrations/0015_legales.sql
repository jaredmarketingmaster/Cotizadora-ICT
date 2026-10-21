-- =============================================================================
-- 0015 — Textos legales base (borrador para revisión de un abogado)
-- -----------------------------------------------------------------------------
-- - Política de privacidad, términos y texto de la casilla del pop-up: se
--   cargan SOLO donde el texto estaba vacío (lo que ya escribió la tienda no
--   se toca). Describen cómo funciona el proyecto: qué datos se recogen, para
--   qué, con qué herramientas, cuánto tiempo y los derechos de la Ley 1581 de
--   2012. assets/js/datos/legales-base.js tiene los mismos textos.
-- - {{nombre}}, {{ciudad}}, {{direccion}}, {{correo}} y {{herramientas}} se
--   reemplazan al mostrarlos con los datos de la tienda (comun.js,
--   prepararLegal). [PENDIENTE: …] marca lo que debe confirmar el abogado: el
--   sitio nunca lo muestra (lo quita y avisa "Texto en revisión.").
-- - tienda.legales_herramientas: la lista de herramientas, editable en
--   Legales.
-- - tienda.legales_revisados: "Un abogado ya revisó estos textos" (no por
--   defecto). Mientras sea no, Inicio lo muestra en "Lo que falta".
-- =============================================================================

alter table public.tienda
  add column legales_revisados boolean not null default false,
  add column legales_herramientas text[] not null default array['GoHighLevel: el CRM donde quedan su cotización y el seguimiento.', 'Píxel de Meta y API de Conversiones de Meta: miden los anuncios.', 'WhatsApp: el canal por el que lo contactamos.', 'El proveedor del sitio y de la base de datos.', 'Marketing Masters Group, como encargado del tratamiento.'];

update public.tienda set texto_privacidad = $legal$## Quién es responsable de sus datos

El responsable de los datos personales que usted deja en este sitio es la tienda:

- Nombre: {{nombre}}
- Razón social y NIT: [PENDIENTE: razón social y NIT]
- Ciudad: {{ciudad}}
- Dirección: {{direccion}}
- Correo: {{correo}}

## Qué datos recogemos

Cuando usted pide una cotización en el formulario:

- Su nombre, su correo y su número de WhatsApp.
- El equipo que cotizó: modelo, condición (nuevo o usado), capacidad, color y precio.
- El código de la cotización.

Además, de forma automática:

- De dónde llegó al sitio: los parámetros del anuncio (UTM), el identificador del anuncio (ad_id) y el identificador de clic de Facebook (fbclid). Se guardan en su navegador mientras dura la visita y se envían con su cotización.
- Datos técnicos de su navegador y de su dispositivo que usa el píxel de Meta para medir los anuncios. El píxel puede guardar sus propias cookies en su navegador (por ejemplo, _fbp y _fbc).

En su navegador también se guardan los colores y el tamaño de letra del sitio, para mostrarlo igual en su próxima visita. Eso no es un dato personal.

## Para qué los usamos

Solo para fines comerciales y de mercadeo:

- Atender su cotización.
- Contactarlo por WhatsApp.
- Hacer el seguimiento comercial de su compra.
- Medir cómo funcionan nuestros anuncios.

## Con quién los compartimos

Para atenderlo usamos estas herramientas, que tratan los datos por cuenta nuestra:

{{herramientas}}

## Cuánto tiempo los guardamos

- En el CRM guardamos sus datos máximo 2 meses, o hasta que la compra se complete o se pierda, lo que pase primero.
- Excepciones: [PENDIENTE: confirmar con el abogado si alguna norma obliga a guardar datos por más tiempo]

## Sus derechos

Según la Ley 1581 de 2012, usted puede:

- Conocer los datos que tenemos de usted.
- Actualizarlos y rectificarlos.
- Pedir que los suprimamos.
- Revocar la autorización que nos dio.

Para hacerlo, escríbanos con su nombre, su número de WhatsApp y lo que necesita:

- Correo: {{correo}}
- Plazos de respuesta: [PENDIENTE: confirmar con el abogado]

## Cambios a esta política

La versión vigente es la que aparece en esta página.$legal$
where id = 1 and btrim(texto_privacidad) = '';

update public.tienda set texto_terminos = $legal$## Qué es este sitio

Este sitio muestra los equipos que vende {{nombre}} y sus precios, para que usted los cotice y los compre por WhatsApp. En el sitio no se paga ni se cierra la compra: la compra se acuerda por WhatsApp con la tienda.

## Precios y disponibilidad

- Los precios están en pesos colombianos. Al pie de la página aparece la fecha de su última actualización.
- El precio y la disponibilidad de cada equipo se confirman por WhatsApp antes de la compra.
- Cuando un equipo no tiene foto, se muestra un dibujo genérico.

## Equipos usados

La batería, el estado y los detalles de cada equipo usado son los que la tienda informa en el sitio.

## Garantía, entrega y formas de pago

Son las que aparecen en el detalle de cada equipo.

- Cambios, devoluciones y garantía legal: [PENDIENTE: confirmar con el abogado]

## Datos personales

Los datos que usted deja en el formulario se tratan según la política de privacidad.

## Marcas

Las marcas y los nombres de productos que aparecen en el sitio pertenecen a sus dueños.

## Ley aplicable

- [PENDIENTE: confirmar con el abogado la ley y la jurisdicción aplicables]

## Contacto

- Correo: {{correo}}
- Dirección: {{direccion}}
- Ciudad: {{ciudad}}$legal$
where id = 1 and btrim(texto_terminos) = '';

update public.tienda set texto_autorizacion_datos = $legal$Autorizo a {{nombre}} a tratar mis datos personales (nombre, correo y WhatsApp) para atender mi cotización, contactarme por WhatsApp y hacer el seguimiento comercial, según su política de privacidad.$legal$
where id = 1 and btrim(texto_autorizacion_datos) = '';
