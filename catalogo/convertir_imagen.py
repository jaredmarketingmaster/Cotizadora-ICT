# =============================================================================
# Convierte una imagen PNG de un modelo y color a las imágenes predeterminadas
# del sitio (v1.1): assets/img/predeterminadas/<slug>/<archivo>.webp (lado
# mayor hasta 1600 px) y <archivo>-640.webp (lado mayor hasta 640 px), con la
# transparencia. Después hay que sumar la fila en IMAGENES_PREDETERMINADAS de
# assets/js/datos/predeterminadas.js (slug → nombre_es del color → archivo).
#   python3 -I catalogo/convertir_imagen.py <png> <slug-modelo> <archivo-color>
#   ej.: python3 -I catalogo/convertir_imagen.py negro.png iphone-7 negro
# Necesita Pillow con WebP. No es parte del sitio (no se publica nada de esto).
# =============================================================================
import os
import sys

from PIL import Image

png, slug, archivo = sys.argv[1:4]
raiz = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "assets", "img", "predeterminadas", slug)
os.makedirs(raiz, exist_ok=True)
imagen = Image.open(png).convert("RGBA")
for lado, sufijo in [(1600, ""), (640, "-640")]:
    copia = imagen.copy()
    copia.thumbnail((lado, lado), Image.LANCZOS)
    copia.save(os.path.join(raiz, f"{archivo}{sufijo}.webp"), "WEBP", quality=85, method=6)
print(slug, archivo, imagen.size)
