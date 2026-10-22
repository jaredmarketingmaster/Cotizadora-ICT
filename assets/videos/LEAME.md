# Videos de ayuda (opcionales)

Esta carpeta guarda los videos que el sitio y el panel muestran **si existen**. Hasta que se suban, **nada se rompe**: el botón o el video simplemente no aparecen. Los `.mp4` no van en el repositorio de la plantilla: cada tienda sube los suyos a esta carpeta de su copia publicada.

| Archivo | Dónde se ve | Orientación y tamaño sugerido |
|---|---|---|
| `intro-panel.mp4` | Panel → Inicio: botón violeta **"Ver intro"**, al lado de "Ver mi sitio". Sin este archivo, el botón no aparece. | Horizontal, 1920 × 1080 |
| `ayuda-celular.mp4` | Sitio → globo de ayuda "?" → **"Celular"**. Sin este archivo, se pasa directo al texto y al botón de WhatsApp. | **Vertical**, 1080 × 1920 |
| `ayuda-computadora.mp4` | Sitio → globo de ayuda "?" → **"Computadora"**. Sin este archivo, se pasa directo al texto y al botón de WhatsApp. | **Horizontal**, 1920 × 1080 |

## Formato

- **MP4 con video H.264** (el que se ve en todos los navegadores y celulares). No sirven .mov ni MP4 en HEVC (H.265).
- **Menos de 20 MB** cada uno. Conviene que duren poco (menos de 2 minutos) y que se entiendan sin sonido.
- Los nombres tienen que ser **exactamente** los de la tabla (en minúscula, sin espacios).

## Cómo se cargan

- No se descargan al abrir la página: tienen `preload="none"` y solo se bajan cuando la persona toca reproducir. Tampoco se reproducen solos.
- El panel y el sitio preguntan con un pedido liviano (`HEAD`) si el archivo existe antes de mostrarlo.

## Cómo subirlos

1. Exportar el video en MP4 (H.264) con el tamaño de la tabla.
2. Copiarlo a esta carpeta (`assets/videos/`) del sitio publicado de la tienda, con el nombre exacto.
3. Abrir el panel o el sitio y recargar: el botón "Ver intro" o el video del globo aparecen solos.

Para quitarlo, basta con borrar el archivo.
