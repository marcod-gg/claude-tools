---
name: ancho-ajustable
description: Columnas de tabla con ancho ajustable. Se arrastra el borde del encabezado y el doble clic en el borde ajusta la columna a su contenido visible (título, texto, chips e íconos, entre 60 y 640 px). El cursor se mantiene fijo mientras se arrastra, aparece una línea de acento sobre el borde y el ajuste se anima. Los anchos se guardan por columna. Hay dos versiones: un script sin dependencias para cualquier <table> y la receta para TanStack Table (React), que convive con ordenar al hacer clic y reordenar columnas arrastrando. Antes de implementar pregunta dónde se guardan los anchos y el estilo. Úsala cuando el usuario pida columnas redimensionables, cambiar el ancho de las columnas, "ajustar columna al contenido", doble clic en el borde como en Excel o anchos de columna que se recuerden, aunque no nombre esta skill.
---

# Ancho ajustable

Dos formas, la misma experiencia. Sale de las tablas de Tuesday (DataViews).

| Pieza | Para qué |
|---|---|
| `assets/ancho-ajustable.js` → `anchoAjustable(tabla, op)` | Cualquier `<table>` (HTML, Razor, Blade, jQuery): agrega los bordes, arrastre, doble clic y guardado |
| `assets/ancho-ajustable.css` | Bordes, línea de acento, cursor fijo, transición; tokens `--aa-*` |
| `references/tanstack.md` | La receta para TanStack Table (React): `columnSizing`, el borde en el `<th>` y `autofit` con `setColumnSizing` |

Ejemplo funcionando: `examples/demo/demo.html` (abre con doble clic).

## Cuándo sí / cuándo no

- **Sí**: tablas de datos donde los textos varían (nombres, descripciones) y la persona quiere ver más de una columna o menos de otra.
- **No**: tablas cortas de lectura (3–4 columnas fijas) → anchos en CSS. Una tabla de datos completa con vistas, filtros y
  agrupado → `vistas-de-datos`, que ya trae esto.

## Lo que entrega

- **Borde de 12 px centrado entre dos columnas**: al pasar por la cabecera se ve una línea fina; sobre el borde, una franja
  tenue y una línea de acento de 3 px a todo el alto.
- **Arrastrar** cambia solo esa columna: la tabla crece o se achica (`table-layout: fixed`, ancho = suma de columnas)
  y las demás no se aprietan. Mínimo 60 px.
- **Doble clic**: ancho del contenido visible más largo de la columna (encabezado y celdas), entre 60 y 640 px, animado.
- **Cursor fijo** en "ajustar ancho" mientras se arrastra, aunque el mouse salga de la franja.
- **No interfiere**: el borde no ordena la columna al hacer clic ni inicia el reordenamiento por arrastre.
- **Guardado**: `clave` (localStorage) u `onCambio(anchos)` para guardarlos donde la app quiera; se identifican por `data-col`.
- Sin animaciones con `prefers-reduced-motion`.

## Antes de implementar: preguntar (AskUserQuestion)

Una sola llamada, salvo lo que el pedido ya responda (sin preferencia, la opción A):

1. **¿Dónde se guardan los anchos?** A: **en las preferencias o la vista guardada del usuario en el servidor** (lo siguen
   entre equipos). B: `localStorage` (solo ese navegador). C: no se guardan (vuelven al recargar).
2. **¿Qué estilo toma?** Antes de preguntar, revisar si la página tiene estilo propio y decirlo. A: **los colores de la página**
   (recomendado si los tiene): apuntar `--aa-line` y `--aa-accent` a sus variables. B: **Predeterminado** de claude-tools
   (`assets/default-theme/` + `assets/ancho-ajustable-tokens.css`). C: **Cálido** (B + `estilos/calido.css`). D: **Pizarra**
   (B + `estilos/pizarra.css`).

No lleva marca ni logo: no preguntar por ellos. La versión (script o TanStack) se deduce: si la tabla ya es TanStack Table, la receta; si no, el script.

## Flujo

**Script (cualquier tabla)**
1. Copiar `ancho-ajustable.js` y `.css` (script clásico, sin build).
2. Poner `data-col` estable en cada `<th>` (si no, se usa el texto del encabezado, que cambia con el idioma).
3. Envolver la tabla en un contenedor con `overflow-x: auto`.
4. `const aa = anchoAjustable(tabla, { clave: "app-tabla-anchos" })` u `onCambio: anchos => guardar(anchos)` con `anchos` iniciales del servidor.
5. Si la tabla se vuelve a dibujar entera (p. ej. DataTables), montar de nuevo después de cada dibujo con los anchos guardados.

**TanStack Table**: seguir `references/tanstack.md`.

**Verificar**: `node --check` o el build siempre. En el navegador (Playwright), **solo con confirmación previa**: arrastrar,
doble clic en una columna angosta y en una ancha, que el clic en el borde no ordene, recargar y ver los anchos, claro y oscuro.

## Errores ya resueltos (no repetir)

- **El doble clic mide de más o de menos**: medir los bloques da el ancho de la celda, no el del contenido. Hay que medir los nodos de
  texto (con `Range`) y las piezas en línea (chips, íconos), y sumar el relleno de la celda.
- **Cada columna crece 24 px al iniciar o al ajustar**: el `width` del `<th>` se aplicaba sin el relleno. Usar `box-sizing: border-box` en los `<th>`.
- **La última letra cortada al iniciar**: el ancho medido se redondeaba hacia abajo. Redondear hacia arriba (`Math.ceil`).
- **Celdas con varias líneas**: el ajuste mide el texto ya partido y no ensancha. Las celdas deben ser de una línea (`white-space: nowrap` + elipsis).
- **El borde no recibe el mouse sobre la mitad de la columna siguiente**: cada `<th>` con `z-index` decreciente (la de la izquierda encima).
- **El clic en el borde ordena la columna, o arrastrarlo reordena columnas**: `stopPropagation` en `pointerdown`/`mousedown`, `click` y
  `dblclick`, `dragstart` con `preventDefault`, y en TanStack `draggable={!resizing}` en el `<th>`.
- **El cursor parpadea al arrastrar rápido**: una clase en `<html>` mientras dura el arrastre fuerza `cursor: col-resize` en todo.
- **La columna va detrás del mouse**: la transición de `width` debe apagarse mientras se arrastra (`:not(.aa-resizing)`); solo el doble clic se anima.
- **Scroll horizontal por el borde de la última columna**: en la última va pegado adentro (`right: 0`), no sobresale.

## Archivos

| Archivo | Uso |
|---|---|
| `assets/ancho-ajustable.js` | `window.anchoAjustable(tabla, { clave, anchos, onCambio, min, minAuto, maxAuto })` → `{ anchos, ajustar, ajustarTodas, restablecer }` |
| `assets/ancho-ajustable.css` | Estilos con tokens `--aa-line`, `--aa-accent` en `:where(:root)` con oscuro |
| `assets/ancho-ajustable-tokens.css` | Alias `--aa-*` → `--dt-*` para el estilo compartido |
| `assets/default-theme/` | Estilo compartido de claude-tools (copia de `shared/default-theme/`, no editar aquí) |
| `references/tanstack.md` | Receta para TanStack Table (React) |
| `examples/demo/demo.html` | Demo de un archivo (abre con doble clic) |
