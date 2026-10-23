# Catálogo: lo que falta (preguntas para Jared)

> Lista, modelo por modelo, de lo que la fuente del catálogo no trae. Sale de `assets/js/datos/semilla.js` (`CATALOGO`, `COLORES`, `FICHAS`, `HEX_APROXIMADOS`) y de la sección 17 de `DOCUMENTACION.md`. Nada de esto se completó de memoria: lo que falta quedó vacío (o, en los hexadecimales, con una muestra aproximada marcada como tal).
>
> **Cómo responder:** complete las tablas de la sección 4 con el dato y la URL de la fuente (idealmente la ficha de soporte de Apple con su número de artículo). Con eso se arma una migración nueva (la próxima libre) y se actualiza `semilla.js`; las tiendas ya publicadas reciben el cambio al correrla.

Generado el 23/10/2026, después de `0029_fichas_apple.sql`.

## 1. Resuelto con la investigación de Jared (Gemini, 22/10/2026)

Aplicado en `0028_colores_apple.sql` con las fichas de soporte de Apple en español:

- **Nombres del catálogo:** confirmados (Apple anunció el 17e, 18 Pro, 18 Pro Max y Duo).
- **Nombres de colores:** "Púrpura" pasa a "Morado" (12 mini, 12, 14 y 14 Plus); "Azul ultramar" a "Ultramarino" (16 y 16 Plus); 17: Lavanda, Salvia, Azul neblina, Blanco y Negro; Air: Azul cielo, Oro claro, Blanco nube y Negro espacial.
- **Nombres en inglés que faltaban:** 17, 17e, 18 Pro y 18 Pro Max.
- **17 Pro y 17 Pro Max:** Plata, Naranja cósmico y Azul profundo.
- **18 Pro y 18 Pro Max:** Negro, Borgoña, Glaciar y Plata (Jared eligió "Borgoña"). Visón, Oliva, Azul nítido y Magenta salen del catálogo.
- **Duo:** Cielo nocturno y Blanco estrella (en lugar de "Titanio").
- **Hexadecimales de terceros por modelo** del iPhone 7 al SE (3.ª generación). Los que dio Gemini para el 14 en adelante eran incoherentes y no se cargaron.

Aplicado en `0029_fichas_apple.sql` con las fichas de soporte de Apple:

- **Batería** de los 42 modelos (horas de video, video en streaming y audio, y la carga rápida). Sin mAh: Apple no los publica.
- **Cámara frontal** del 17, 17 Pro, 17 Pro Max, 18 Pro, 18 Pro Max y Duo; **cámaras traseras** del Duo; **dimensiones y peso** del 17 Pro, 17 Pro Max, 18 Pro, 18 Pro Max y Duo.

## 2. Por modelo

Valen para **todos** los modelos y no se repiten abajo:

- **Descripción del modelo:** vacía en los 42 (la fuente no trae). ¿Quiere un texto corto por modelo? Si lo pasa, va en la ficha de cada uno.
- **Hexadecimales oficiales:** Apple no los publica; las muestras aproximadas de la sección 3 solo se pueden cambiar por otras medidas o elegidas por la tienda.

### iPhone 7 (`iphone-7`)

- **Colores sin hexadecimal de la fuente** (6 de 6; llevan la muestra aproximada de la sección 3): Negro brillante, Negro, Plata, Oro, Oro rosa, (PRODUCT)RED.

### iPhone 7 Plus (`iphone-7-plus`)

- **Colores sin hexadecimal de la fuente** (6 de 6; llevan la muestra aproximada de la sección 3): Negro brillante, Negro, Plata, Oro, Oro rosa, (PRODUCT)RED.

### iPhone 8 (`iphone-8`)

- **Colores sin hexadecimal de la fuente** (4 de 4; llevan la muestra aproximada de la sección 3): Plata, Gris espacial, Oro, (PRODUCT)RED.

### iPhone 8 Plus (`iphone-8-plus`)

- **Colores sin hexadecimal de la fuente** (4 de 4; llevan la muestra aproximada de la sección 3): Plata, Gris espacial, Oro, (PRODUCT)RED.

### iPhone X (`iphone-x`)

- **Colores sin hexadecimal de la fuente** (2 de 2; llevan la muestra aproximada de la sección 3): Gris espacial, Plata.

### iPhone XS (`iphone-xs`)

- **Colores sin hexadecimal de la fuente** (3 de 3; llevan la muestra aproximada de la sección 3): Oro, Gris espacial, Plata.

### iPhone XS Max (`iphone-xs-max`)

- **Colores sin hexadecimal de la fuente** (3 de 3; llevan la muestra aproximada de la sección 3): Oro, Gris espacial, Plata.

### iPhone XR (`iphone-xr`)

- **Colores sin hexadecimal de la fuente** (6 de 6; llevan la muestra aproximada de la sección 3): Negro, Blanco, Azul, Amarillo, Coral, (PRODUCT)RED.

### iPhone 11 (`iphone-11`)

- **Colores sin hexadecimal de la fuente** (6 de 6; llevan la muestra aproximada de la sección 3): Negro, Verde, Amarillo, Morado, (PRODUCT)RED, Blanco.

### iPhone 11 Pro (`iphone-11-pro`)

- **Colores sin hexadecimal de la fuente** (4 de 4; llevan la muestra aproximada de la sección 3): Gris espacial, Plata, Verde noche, Oro.

### iPhone 11 Pro Max (`iphone-11-pro-max`)

- **Colores sin hexadecimal de la fuente** (4 de 4; llevan la muestra aproximada de la sección 3): Gris espacial, Plata, Verde noche, Oro.

### iPhone SE (2.ª generación) (`iphone-se-2`)

- **Colores sin hexadecimal de la fuente** (3 de 3; llevan la muestra aproximada de la sección 3): Blanco, Negro, (PRODUCT)RED.

### iPhone 12 mini (`iphone-12-mini`)

- **Colores sin hexadecimal de la fuente** (6 de 6; llevan la muestra aproximada de la sección 3): Negro, Blanco, (PRODUCT)RED, Verde, Azul, Morado.

### iPhone 12 (`iphone-12`)

- **Colores sin hexadecimal de la fuente** (6 de 6; llevan la muestra aproximada de la sección 3): Negro, Blanco, (PRODUCT)RED, Verde, Azul, Morado.

### iPhone 12 Pro (`iphone-12-pro`)

- **Colores sin hexadecimal de la fuente** (4 de 4; llevan la muestra aproximada de la sección 3): Grafito, Plata, Oro, Azul pacífico.

### iPhone 12 Pro Max (`iphone-12-pro-max`)

- **Colores sin hexadecimal de la fuente** (4 de 4; llevan la muestra aproximada de la sección 3): Grafito, Plata, Oro, Azul pacífico.

### iPhone 13 mini (`iphone-13-mini`)

- **Colores sin hexadecimal de la fuente** (6 de 6; llevan la muestra aproximada de la sección 3): Blanco estelar, Medianoche, Azul, Rosa, (PRODUCT)RED, Verde.

### iPhone 13 (`iphone-13`)

- **Colores sin hexadecimal de la fuente** (6 de 6; llevan la muestra aproximada de la sección 3): Blanco estelar, Medianoche, Azul, Rosa, (PRODUCT)RED, Verde.

### iPhone 13 Pro (`iphone-13-pro`)

- **Colores sin hexadecimal de la fuente** (5 de 5; llevan la muestra aproximada de la sección 3): Grafito, Oro, Plata, Azul sierra, Verde alpino.

### iPhone 13 Pro Max (`iphone-13-pro-max`)

- **Colores sin hexadecimal de la fuente** (5 de 5; llevan la muestra aproximada de la sección 3): Grafito, Oro, Plata, Azul sierra, Verde alpino.

### iPhone SE (3.ª generación) (`iphone-se-3`)

- **Colores sin hexadecimal de la fuente** (3 de 3; llevan la muestra aproximada de la sección 3): Medianoche, Blanco estelar, (PRODUCT)RED.

### iPhone 14 (`iphone-14`)

- **Colores sin hexadecimal de la fuente** (6 de 6; llevan la muestra aproximada de la sección 3): Medianoche, Blanco estelar, Azul, Morado, (PRODUCT)RED, Amarillo.

### iPhone 14 Plus (`iphone-14-plus`)

- **Colores sin hexadecimal de la fuente** (6 de 6; llevan la muestra aproximada de la sección 3): Medianoche, Blanco estelar, Azul, Morado, (PRODUCT)RED, Amarillo.

### iPhone 14 Pro (`iphone-14-pro`)

- **Colores sin hexadecimal de la fuente** (4 de 4; llevan la muestra aproximada de la sección 3): Negro espacial, Plata, Oro, Morado oscuro.

### iPhone 14 Pro Max (`iphone-14-pro-max`)

- **Colores sin hexadecimal de la fuente** (4 de 4; llevan la muestra aproximada de la sección 3): Negro espacial, Plata, Oro, Morado oscuro.

### iPhone 15 (`iphone-15`)

- **Colores sin hexadecimal de la fuente** (5 de 5; llevan la muestra aproximada de la sección 3): Negro, Azul, Verde, Amarillo, Rosa.

### iPhone 15 Plus (`iphone-15-plus`)

- **Colores sin hexadecimal de la fuente** (5 de 5; llevan la muestra aproximada de la sección 3): Negro, Azul, Verde, Amarillo, Rosa.

### iPhone 15 Pro (`iphone-15-pro`)

- **Colores sin hexadecimal de la fuente** (4 de 4; llevan la muestra aproximada de la sección 3): Titanio negro, Titanio blanco, Titanio azul, Titanio natural.

### iPhone 15 Pro Max (`iphone-15-pro-max`)

- **Colores sin hexadecimal de la fuente** (4 de 4; llevan la muestra aproximada de la sección 3): Titanio negro, Titanio blanco, Titanio azul, Titanio natural.

### iPhone 16 Pro (`iphone-16-pro`)

- **Colores sin hexadecimal de la fuente** (4 de 4; llevan la muestra aproximada de la sección 3): Titanio negro, Titanio blanco, Titanio natural, Titanio del desierto.

### iPhone 16 Pro Max (`iphone-16-pro-max`)

- **Colores sin hexadecimal de la fuente** (4 de 4; llevan la muestra aproximada de la sección 3): Titanio negro, Titanio blanco, Titanio natural, Titanio del desierto.

### iPhone 17 Pro (`iphone-17-pro`)

- **Colores sin hexadecimal de la fuente** (3 de 3; llevan la muestra aproximada de la sección 3): Plata, Naranja cósmico, Azul profundo.

### iPhone 17 Pro Max (`iphone-17-pro-max`)

- **Colores sin hexadecimal de la fuente** (3 de 3; llevan la muestra aproximada de la sección 3): Plata, Naranja cósmico, Azul profundo.

### iPhone Duo (`iphone-duo`)

- **Colores sin hexadecimal de la fuente** (2 de 2; llevan la muestra aproximada de la sección 3): Cielo nocturno, Blanco estrella.
- La fuente da "Sist. Multi-cámara: Incluye cámara frontal oculta bajo la pantalla interior. Funciones Smart Take y Kid Cue.", que quedó como fila propia "Sistema de cámaras" (las cámaras ya están en sus categorías desde 0029: la tienda puede borrar esa fila).

Además, en la fuente el hexadecimal de **Borgoña** y **Glaciar** viene marcado como "aproximado".

## 3. Hexadecimales aproximados (C1 y `0028`)

Los colores sin hexadecimal en la fuente (150 de 182) llevan una **muestra aproximada** (`colores.hex_aproximado`). Solo pinta la muestra del panel y del sitio; **ninguno es oficial**. Del iPhone 7 al SE (3.ª generación) son de terceros, por modelo (informe de Gemini); en los demás, donde otro modelo traía en la fuente el hexadecimal del mismo nombre, se usó ese (Negro, Blanco, Rosa, Plata y Negro espacial), y el resto lo eligió el asistente por el nombre. La tienda puede cambiarlos en Catálogo.

| Nombre (español) | Hexadecimal aproximado | Origen | Modelos donde se usa |
|---|---|---|---|
| (PRODUCT)RED | `#A50011` | de terceros, por modelo | iPhone 13 mini, iPhone 13, iPhone SE (3.ª generación) |
| (PRODUCT)RED | `#BA0C2E` | de terceros, por modelo | iPhone 7, iPhone 7 Plus, iPhone 8, iPhone 8 Plus, iPhone XR, iPhone 11, iPhone SE (2.ª generación) |
| (PRODUCT)RED | `#BA0C2F` | por nombre | iPhone 14, iPhone 14 Plus |
| (PRODUCT)RED | `#E23636` | de terceros, por modelo | iPhone 12 mini, iPhone 12 |
| Amarillo | `#F6E27A` | por nombre | iPhone 14, iPhone 14 Plus, iPhone 15, iPhone 15 Plus |
| Amarillo | `#FFE681` | de terceros, por modelo | iPhone XR, iPhone 11 |
| Azul pacífico | `#2E4755` | de terceros, por modelo | iPhone 12 Pro, iPhone 12 Pro Max |
| Azul profundo | `#2F3B55` | por nombre | iPhone 17 Pro, iPhone 17 Pro Max |
| Azul sierra | `#9BB5CE` | de terceros, por modelo | iPhone 13 Pro, iPhone 13 Pro Max |
| Azul | `#043458` | de terceros, por modelo | iPhone 12 mini, iPhone 12 |
| Azul | `#215E7C` | de terceros, por modelo | iPhone 13 mini, iPhone 13 |
| Azul | `#4A7CA8` | por nombre | iPhone 14, iPhone 14 Plus, iPhone 15, iPhone 15 Plus |
| Azul | `#5EB0E5` | de terceros, por modelo | iPhone XR |
| Blanco estelar | `#F2EDE4` | por nombre | iPhone 14, iPhone 14 Plus |
| Blanco estelar | `#F9F3EE` | de terceros, por modelo | iPhone 13 mini, iPhone 13, iPhone SE (3.ª generación) |
| Blanco estrella | `#F2F0EB` | por nombre | iPhone Duo |
| Blanco | `#F9F6EF` | de terceros, por modelo | iPhone XR, iPhone 11, iPhone SE (2.ª generación) |
| Blanco | `#FBF7F4` | de terceros, por modelo | iPhone 12 mini, iPhone 12 |
| Cielo nocturno | `#2B3240` | por nombre | iPhone Duo |
| Coral | `#EE7762` | de terceros, por modelo | iPhone XR |
| Grafito | `#4C4A46` | de terceros, por modelo | iPhone 12 Pro, iPhone 12 Pro Max |
| Grafito | `#5C5B57` | de terceros, por modelo | iPhone 13 Pro, iPhone 13 Pro Max |
| Gris espacial | `#535150` | de terceros, por modelo | iPhone 8, iPhone 8 Plus, iPhone X, iPhone XS, iPhone XS Max, iPhone 11 Pro, iPhone 11 Pro Max |
| Medianoche | `#171E27` | de terceros, por modelo | iPhone 13 mini, iPhone 13, iPhone SE (3.ª generación) |
| Medianoche | `#232A31` | por nombre | iPhone 14, iPhone 14 Plus |
| Morado oscuro | `#594F63` | por nombre | iPhone 14 Pro, iPhone 14 Pro Max |
| Morado | `#B7A6D6` | de terceros, por modelo | iPhone 14, iPhone 14 Plus |
| Morado | `#B8AFE6` | de terceros, por modelo | iPhone 11, iPhone 12 mini, iPhone 12 |
| Naranja cósmico | `#E2722F` | por nombre | iPhone 17 Pro, iPhone 17 Pro Max |
| Negro brillante | `#0A0A0A` | de terceros, por modelo | iPhone 7, iPhone 7 Plus |
| Negro espacial | `#333333` | por nombre | iPhone 14 Pro, iPhone 14 Pro Max |
| Negro | `#1F2020` | de terceros, por modelo | iPhone 7, iPhone 7 Plus, iPhone XR, iPhone 11, iPhone SE (2.ª generación) |
| Negro | `#201D24` | de terceros, por modelo | iPhone 12 mini, iPhone 12 |
| Negro | `#2C2D30` | por nombre | iPhone 15, iPhone 15 Plus |
| Oro rosa | `#E6C7C2` | de terceros, por modelo | iPhone 7, iPhone 7 Plus |
| Oro | `#E6BE86` | de terceros, por modelo | iPhone 7, iPhone 7 Plus |
| Oro | `#F2DCC5` | por nombre | iPhone 14 Pro, iPhone 14 Pro Max |
| Oro | `#F9E5C9` | de terceros, por modelo | iPhone 13 Pro, iPhone 13 Pro Max |
| Oro | `#FAD7BD` | de terceros, por modelo | iPhone 11 Pro, iPhone 11 Pro Max |
| Oro | `#FEEDD8` | de terceros, por modelo | iPhone 8, iPhone 8 Plus, iPhone XS, iPhone XS Max, iPhone 12 Pro, iPhone 12 Pro Max |
| Plata | `#E3E4E6` | por nombre | iPhone 14 Pro, iPhone 14 Pro Max, iPhone 17 Pro, iPhone 17 Pro Max |
| Plata | `#EBEBE3` | de terceros, por modelo | iPhone 7, iPhone 7 Plus, iPhone 8, iPhone 8 Plus, iPhone X, iPhone XS, iPhone XS Max, iPhone 11 Pro, iPhone 11 Pro Max |
| Plata | `#F1F2ED` | de terceros, por modelo | iPhone 12 Pro, iPhone 12 Pro Max |
| Plata | `#F5F5F0` | de terceros, por modelo | iPhone 13 Pro, iPhone 13 Pro Max |
| Rosa | `#EEA7B7` | por nombre | iPhone 15, iPhone 15 Plus |
| Rosa | `#FAE0D8` | de terceros, por modelo | iPhone 13 mini, iPhone 13 |
| Titanio azul | `#3F4A58` | por nombre | iPhone 15 Pro, iPhone 15 Pro Max |
| Titanio blanco | `#F2F1EC` | por nombre | iPhone 15 Pro, iPhone 15 Pro Max, iPhone 16 Pro, iPhone 16 Pro Max |
| Titanio del desierto | `#BFA48F` | por nombre | iPhone 16 Pro, iPhone 16 Pro Max |
| Titanio natural | `#BAB4A9` | por nombre | iPhone 15 Pro, iPhone 15 Pro Max, iPhone 16 Pro, iPhone 16 Pro Max |
| Titanio negro | `#3C3C3D` | por nombre | iPhone 15 Pro, iPhone 15 Pro Max, iPhone 16 Pro, iPhone 16 Pro Max |
| Verde alpino | `#505F4E` | de terceros, por modelo | iPhone 13 Pro, iPhone 13 Pro Max |
| Verde noche | `#4E5851` | de terceros, por modelo | iPhone 11 Pro, iPhone 11 Pro Max |
| Verde | `#364935` | de terceros, por modelo | iPhone 13 mini, iPhone 13 |
| Verde | `#A7C8A1` | por nombre | iPhone 15, iPhone 15 Plus |
| Verde | `#AEE1CD` | de terceros, por modelo | iPhone 11 |
| Verde | `#E1F8DC` | de terceros, por modelo | iPhone 12 mini, iPhone 12 |

## 4. Tablas en blanco para responder

Una fila por dato. El **slug** es el de la sección 2 (por ejemplo `iphone-17-pro`). Deje la fuente siempre: sin fuente, el dato no se carga.

**Colores** (nuevos o hexadecimal medido):

| slug del modelo | color (nombre_es) | nombre_en | hex (#RRGGBB) | fuente (URL) |
|---|---|---|---|---|
|  |  |  |  |  |

**Ficha técnica** (claves: `lanzamiento`, `procesador`, `pantalla`, `camaras_traseras`, `camara_frontal`, `bateria`, `versiones`, `materiales`, `puertos`, `dimensiones`; o `descripcion` para el texto del modelo):

| slug del modelo | categoría de ficha (clave) | valor | fuente (URL) |
|---|---|---|---|
|  |  |  |  |
