---
name: Imágenes dinámicas de eventos
description: Regla para mantener dinámicos los nombres en las imágenes de entrada y salida de grupos.
---

Las imágenes de eventos deben conservar una capa de texto dinámica independiente de la carga de la foto de perfil; un fallo del avatar no debe restaurar una plantilla con texto fijo.

**Why:** Cuando el procesamiento combinado falla y devuelve la plantilla original, el bot parece funcionar pero vuelve a mostrar el marcador de posición.

**How to apply:** Procesa el texto primero, maneja el avatar en un bloque separado y usa SVG con namespace explícito y un tamaño adaptable para nombres de distinta longitud.