# Mi espacio de estudio

Web estática para repasar las unidades 10, 11 y 12 de cosmetología aplicada.

## Cómo publicarla en GitHub Pages
1. Descomprime el proyecto.
2. Sube el contenido de esta carpeta al repositorio (incluidas `index.html`, `css/` y `js/`).
3. En GitHub, abre **Settings → Pages**.
4. Selecciona la rama principal y la carpeta raíz (`/root`) y guarda.

## Funciones
- Resúmenes escritos de las tres unidades, organizados por páginas y apartados.
- Exámenes de 20 preguntas por unidad y examen global de 30 preguntas.
- Opciones de respuesta mezcladas en cada intento y distribución equilibrada de la posición correcta.
- Corrección inmediata, explicación y nota final.
- Historial de exámenes guardado en el navegador mediante `localStorage`.
- Modo claro y oscuro.

El historial y el progreso se guardan en el navegador/dispositivo donde se utiliza la web; no se sincronizan automáticamente entre dispositivos.


## Lector de temarios

Al abrir «Estudiar el temario» se muestra un lector a pantalla completa. Cada página de los resúmenes originales se presenta como una imagen WebP de alta resolución para conservar exactamente la maquetación, tablas, esquemas y fotografías del documento. Se incluyen las 22 páginas de la Unidad 10, 20 de la Unidad 11 y 10 de la Unidad 12. El lector incorpora navegación anterior/siguiente y contador de páginas.


## Lector de temarios (versión híbrida)

Los resúmenes de las unidades 10, 11 y 12 se muestran como páginas de estudio con texto HTML real e imágenes independientes extraídas de los PDF originales. En ordenador se presentan como hojas centradas; en tablet y móvil el texto se adapta al ancho disponible. Los esquemas y fotografías conservan sus proporciones y se pueden ampliar con el zoom del navegador.


## Versión actual

La web está centrada en los exámenes tipo test de las unidades 10, 11 y 12 y el examen global. Se ha retirado el lector de temarios para simplificar la navegación y evitar los problemas de maquetación.

El historial de exámenes globales permite repetir exactamente el mismo conjunto de preguntas, en el mismo orden y con las mismas opciones, sin alterar la rotación de preguntas nuevas del examen global.
