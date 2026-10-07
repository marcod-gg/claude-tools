# DataViews · configuración y API interna

`assets/src/dataviews/` es el componente de referencia; si un proyecto mejora una pieza, llevar el cambio
aquí sin perder lo existente (no copiar la carpeta de un proyecto encima).

## Versiones

| Paquete | Versión |
|---|---|
| @tanstack/react-table (+ table-core) | 8.21.3 |
| react / react-dom | 19.3.0 |
| vite | 8.3.2 |
| @vitejs/plugin-react | 6.1.1 |
| typescript | 7.0.2 |
| vitest | 5.0.3 |

Sin otras dependencias: sin librería de drag and drop, sin CSS-in-JS, sin router, sin estado global.

## Build y carga

- `vite.config.ts`: entrada `src/main.tsx`, salida `../Content/dataviews/` con nombres fijos
  `dataviews.js` y `dataviews.css` (`cssCodeSplit: false`, `emptyOutDir: true`). Nombres fijos porque
  Razor los referencia a mano; la caché se rompe con `?v=` = `GetLastWriteTimeUtc(...).Ticks` del js.
- **El build se commitea** (`Content/dataviews/*` está en git y en el `.csproj` como `<Content Include>`):
  Jenkins solo tiene MSBuild, sin Node. Flujo: `cd ClientApp && npm run build` (= `tsc --noEmit && vite build`)
  → commitear el código y el build juntos.
- `node_modules/` en `.gitignore`. `ClientApp/` no entra al `.csproj`.
- Razor: `<link href="~/Content/dataviews/dataviews.css?v=@v">` + `<div id="dataviews-root" data-...>` +
  `<script type="module" src="~/Content/dataviews/dataviews.js?v=@v">`. Datos del servidor
  (alcances, email) por `data-*`; el JS los lee en `el.dataset`.
- `html { scrollbar-gutter: stable; }` en la vista: sin eso, al aparecer/desaparecer el scroll el tablero
  cambia de ancho y `fitColumns` alterna columnas en bucle.

## Modelo: `Fields`

```ts
type FieldType = 'text' | 'select' | 'number' | 'date';
interface FieldDef { label; type; options?: { value; color?; icon? }[]; copy?: boolean; size?: number }
```
- Orden de claves = orden de columnas. `options` de un select = orden de grupos, columnas del tablero y sort.
- `color`: cualquier CSS, normalmente un token de estado (`var(--c-nuevo)`); `icon`: clase Font Awesome
  para el encabezado de columna del tablero.
- `copy: true` agrega botón de copia junto al valor. `size`: ancho inicial en px (defecto 150, mín. 70).
- `fields` debe ser **constante de módulo** (referencia estable; `buildColumns` va en `useMemo`).
- Fechas: acepta ISO y `dd-mm-yyyy` / `dd/mm/yyyy` (formato es-CL de los SP); se muestran con
  `Intl.DateTimeFormat('es-CL', …, timeZone: 'UTC')`. Números con `toLocaleString('es-CL')`.

## `<DataViews>` props

| Prop | Uso |
|---|---|
| `fields`, `idField`, `titleField` | Esquema; `titleField` es la columna obligatoria (enlace al detalle + copiar; no se oculta) |
| `boardField` | Select por defecto para las columnas del tablero |
| `sumField?` | Único campo con agregado `sum` (se muestra Σ en el encabezado de grupo) |
| `sources` | Alcances de datos `{id,label}[]`; cada vista guarda uno; el primero es el respaldo |
| `load(source)` | `Promise<{ rows, note? }>`; caché por alcance; `note` va al pie. El servidor valida acceso |
| `storageKey` | Clave de `localStorage` |
| `defaultViews()` | Vistas iniciales si no hay nada guardado |
| `rowHref?` | URL de detalle del título |
| `onMove?` / `validateMove?` | Arrastrar tarjetas del tablero (optimista, revierte si rechaza). Apagado por defecto: el estado se cambia en el detalle |
| `boardLayout?` | **Obsoleto**: usar el diseño `type: 'cards'`. Con `'explorer'` las vistas `board` también se muestran como tarjetas agrupadas (compatibilidad con montajes anteriores) |
| `groupActions?(value, rows)` / `showEmptyGroups?` / `onRenameGroup?(value, name)` | Diseño Tarjetas (`cards`): doble clic en el nombre del grupo para renombrarlo (Enter guarda, Esc cancela); botones propios en el encabezado de cada grupo (p. ej. Editar/Eliminar sección) y listar grupos sin registros (para poder soltar tarjetas). Con `onMove`, las tarjetas se arrastran a un subtítulo o a un segmento de la lista |
| (tabla) mismas acciones de grupo | Si la tabla está agrupada por `boardField`, su encabezado de grupo recibe `groupActions` y `onRenameGroup` (doble clic renombra; el clic simple espera 220 ms para no colapsar) y sus filas se arrastran a otro grupo con `onMove` |
| `boardMaxColumns?` | Tope de columnas abiertas del tablero (3 por defecto): las demás van colapsadas a la barra lateral aunque quepan |
| `rowActions?(row)` / `rowActionsWidth?` | Celda final de la tabla con botones (Editar/Eliminar, clases `.rp-act`). No es columna: no se ordena, filtra ni oculta. Ancho 96 px (íconos); 130 px con "Editar" de texto |
| `cardActions?(row)` | Acciones al pie de la tarjeta por defecto (`RecordCard`) en Tablero y Tarjetas; usar las clases `.rp-act` |
| `renderCard?(row, {source, visible})` | Reemplaza la tarjeta por defecto (Tablero y Tarjetas); debe respetar `visible` (Propiedades). Preferir la por defecto + `cardActions` |
| `viewTypes?` | Tope de diseños (`['table','board','cards']` por defecto) para "Nueva vista" y "Configuración". Cada vista elige los suyos (`ViewConfig.types`); con uno solo se oculta el selector de diseño; una vista guardada con otro diseño se muestra con el primero |
| `tools?` | Tope `{ search, filter, sort, group, props, export, summary, config }`: todas encendidas; pasar en `false` las que el montaje no ofrece. Dentro del tope, cada vista apaga las suyas (`ViewConfig.tools`, Configuración) |
| `exportTitle?` | Muestra **Descargar** (Excel .xlsx / PDF por impresión) con lo que cumple filtros y búsqueda; el título va en el archivo y en el nombre (`título - vista - fecha`) |
| `toolbarEnd?` | Botones propios al final de la barra tras un separador (p. ej. Pantalla completa). Usar `<span className="dv-tool"><button className="dv-btn">` + `dv-tool__label` para que se vean igual |
| `forcePageSize?` | Filas por página forzadas sin tocar la vista guardada (`0` = todas, en pantalla completa) |
| `hideRefresh?` | Oculta el botón Actualizar del pie (si la página tiene su propia actualización automática) |
| `onOpenRecord?(row, mode)` | La página abre el registro con su propia ficha en **vista previa a la derecha** (`mode: 'side'`, sin bloquear el listado) o **modal** (`'modal'`). El clic simple en el título lo llama; Ctrl/Cmd/Shift/clic central siguen el `rowHref`. Sin esto, DataViews usa su vista previa propia (`RecordPreview`: `<dialog>` modal centrado o panel no modal a la derecha, con todos los campos con valor, Esc y × para cerrar y "Abrir en una pestaña nueva" si hay `rowHref`) |
| `openModes?` | Tope de modos de abrir que ofrece Configuración (`'page' \| 'tab' \| 'side' \| 'modal'`). Por defecto: `page` y `tab` si hay `rowHref`; `side` y `modal` siempre (`openModesFor`). Cada vista guarda el suyo en `ViewConfig.open`; sin elegir, `resolveOpenMode`: `modal` si hay `onOpenRecord`, si no `page` con `rowHref` (como antes de la vista previa propia), si no `modal` |
| `bulkActions?` | Acciones masivas `BulkAction[]`: casillas en Tabla y en las tarjetas por defecto, y una barra con lo elegido. `BulkAction = { id, label, icon?, danger?, when?(row), run(rows) }`: `when` filtra a qué registros aplica (el botón muestra cuántos y se deshabilita si a ninguno); `run` recibe solo esos, resuelve con el aviso (o vacío para el genérico) y rechaza con el error o `null` (cancelado). Tras `run` se limpia la selección y se recarga en segundo plano (también si falla: pudo aplicarse a una parte). La selección dura mientras no cambien la vista ni el alcance; "todos" del encabezado elige lo que cumple filtros, búsqueda y segmento, no solo la página |

**Recargar desde fuera** (p. ej. tras guardar en un modal de la página): `window.dispatchEvent(new Event('dataviews:refresh'))`
vacía la caché y vuelve a llamar `load`.

**Recargar en segundo plano** (auto-refresh de pantallas): `window.dispatchEvent(new Event('dataviews:reload'))`
vuelve a llamar `load` del alcance activo y reemplaza las filas sin vaciar la vista ni mostrar "Cargando"; si
falla, se conservan las anteriores (`assets/screen/board-header.js`).

**Opciones de un select que vienen de los datos** (p. ej. secciones): pedir las filas **antes** de montar, armar
`FIELDS` una vez con esas opciones (orden = orden de grupos) y pasárselo al componente; `load` devuelve esas
mismas filas la primera vez. Así sigue siendo una referencia estable. Ver `assets/src/main.explorer.tsx`.

## Vistas guardadas (`useViews`)

- `ViewConfig`: `{ id, name, type: 'table'|'board'|'cards', types?, tools?, source, filters (reglas y grupos), groupBy, railBy?, groupOrder?, boardOpen?, sorting, order?, sizes?,
  hidden, search, pageSize?, style?, open? }`. Todo JSON: orden de columnas (`columnOrder`), anchos (`columnSizing`),
  ocultas (`columnVisibility`), búsqueda, filas por página y columnas abiertas del tablero (`boardOpen`, por campo) se persisten por vista.
- Se guarda `{ views, activeId }` en `localStorage[storageKey]` con debounce de 400 ms; JSON corrupto o
  storage bloqueado → `defaultViews()`.
- Clave: `<app>-dataviews:v2:${email}:${scopes.join(',')}` → un set por usuario y por
  combinación de alcances ("Ver como" no mezcla vistas de admin). Subir `v2` si cambia el esquema.
- Acciones: crear (hereda el alcance de la pestaña activa), renombrar (doble clic o F2), duplicar,
  eliminar (queda al menos una). Una vista con alcance no permitido cae al primero permitido.
- `newId()` usa `Math.random` porque `crypto.randomUUID` exige https.

## TanStack (`useReactTable`)

Modelos: core, filtered, grouped, sorted. **Sin** `getPaginationRowModel`: la paginación se hace sobre la
lista aplanada (encabezados de grupo + filas) con `paginate()`, que repite el encabezado del grupo si una
página empieza a mitad de grupo. Opciones: `groupedColumnMode: false`,
`autoResetExpanded/PageIndex: false`, `enableColumnResizing`, `columnResizeMode: 'onChange'`. El estado
entero es controlado desde la vista activa (sin `globalFilter`: la búsqueda va antes, con `matchSearch`); los `on*Change` escriben en la vista. Grupos ordenados por
índice de opción (`compareValues`); colapsado de grupos fuera de TanStack.

## Filtros y orden (`rules.ts`)

- Operadores por tipo: text (contiene, no contiene, es, vacío, no vacío) · select (es, no es, vacío, no
  vacío) · number (= > < ≥ ≤) · date (antes, después, es, entre `desde|hasta`, ± días de hoy, vacía, no vacía).
- `view.filters: FilterItem[]` = reglas (`FilterRule`) y **grupos** (`FilterGroup { id, rules, join? }`, un
  nivel). Cada uno guarda `join: 'and'|'or'` con el anterior; "y" pesa más que "o" (A y B o C = (A y B) o C);
  un grupo se evalúa entero con la misma regla y cuenta como una condición.
- `matchFilters` filtra las filas **antes** de TanStack (sus `columnFilters` solo combinan con "y"). Regla
  incompleta = no filtra; grupo sin reglas completas = no filtra (`isActive`). `describeFilter` arma el
  texto del resumen y de la descarga ("Grupo (A o B)").
- Editor (`FilterEditor`): una línea por regla, "Agregar filtro" y "Agregar grupo de filtros"; dentro del grupo
  "Agregar filtro al grupo"; si se borra la última regla de un grupo, el grupo desaparece.
- `compareValues`: select por índice de opción (desconocidos al final), number numérico, date por ISO,
  text `localeCompare('es', {sensitivity:'base'})`. Multi-orden con Shift+clic en el encabezado.
- `PAGE_SIZES = [25, 50, 100, 0]` (0 = todos).

## Diseños

- **Tabla**: columnas arrastrables con animación FLIP, redimensionables por el borde, `aria-sort`,
  agrupado colapsable, copia rápida, paginación al pie.
- **Tablero**: columnas = opciones del select (+ "Otros" si hay valores fuera). `fitColumns(width, n)`
  decide cuántas caben (mín. 240 px, gap 14, tope `boardMaxColumns` = 3); `openColumns` elige cuáles (las guardadas en
  `boardOpen[campo]`, la más reciente primero, o las primeras). El resto va colapsado a la barra lateral (o arriba si
  < 560 px). Botón » en el encabezado colapsa; clic en la barra abre (`openColumn`: si se pasa del tope se colapsa la
  abierta hace más tiempo). Abrir y colapsar usan View Transitions.
- **Segmentos** (`GroupRail`, los tres diseños): a la izquierda, "Todos" + un botón por segmento (ícono de
  la opción, nombre, cantidad); el diseño recibe solo las filas del elegido. Un solo `railBy` por vista para
  los tres diseños (`railGroups`/`railKey` en `rules.ts`: select por orden de opción, fechas por día, sin valor
  al final; `withEmpty` suma las opciones vacías). El elegido vive en DataViews: se mantiene al cambiar de
  diseño y vuelve a "Todos" al cambiar de vista o de `railBy`, o si un filtro lo deja vacío. Bajo 768 px:
  barra arriba con scroll horizontal, ícono y cantidad; el nombre solo en el elegido (los demás lo dejan
  visualmente oculto y en `title`).
- **Tarjetas** (`cards`, `ExplorerView`): encabezado con el segmento elegido (o "Todos") y la cantidad, y un
  subtítulo + cuadrícula por grupo de un select (`groupBy` o `boardField`), sin paginar (`RecordCard`, o `renderCard` si se
  pasa). Con `onMove` las tarjetas se arrastran a un subtítulo o a un segmento de la lista (select).
  `showEmptyGroups` lista los grupos vacíos solo en "Todos" (dentro de un segmento se mueve con la lista).
- **Orden personalizado de grupos** (`groupOrder[campo] = valores`): `withGroupOrder` reordena las `options` del select
  antes de pasar `fields` a las vistas, así segmentos (`railGroups`), secciones (`compareValues`), columnas y subtítulos
  lo respetan sin código propio. Se edita en Ordenar → Orden de grupos (`GroupOrderEditor`: flechas y arrastre) o
  arrastrando el grupo en la vista (`groupDrag.ts`: `groupDragSource` en lo que se toma, `groupDropTarget` donde se
  suelta, `mergeDrag` para convivir con el arrastre de tarjetas/filas). El arrastre de grupos usa el tipo
  `application/x-dv-group`, distinto del de registros, así no se confunden. Solo selects; "Todos" no se mueve.
- **Resumen de la vista** (`.dv-fsum`, `tools.summary`): se arma en DataViews como categorías `{ cat, short, chips }`
  (Filtros, Búsqueda, Segmentos, Secciones/Columnas/Subtítulos, Orden, Ocultas); la cabecera une los `short` y
  cada chip trae su `remove`. Nueva categoría → agregarla ahí.
- Pestañas (`ViewTabs`, `role="tablist"`) con «+ Vista» y el menú «…» (Configuración, que abre el panel de diseños y
  herramientas dentro del mismo menú y vuelve a la lista al cerrarse; Renombrar, Duplicar, Eliminar), barra de herramientas (diseño, buscar, filtrar, ordenar,
  agrupar/columnas, propiedades, descargar, `toolbarEnd`) con popovers `<details>` nativos (Escape y clic
  fuera cierran). El panel de filtros (`.dv-pop--filters`) mide lo que la regla más larga.

## Descarga (`exportData.ts`)

- `downloadExcel(data)`: .xlsx armado a mano (zip sin compresión + XML), sin dependencias: encabezado en
  negrita, autofiltro, anchos por columna, números y fechas como celdas reales.
- `printPdf(data)`: abre una ventana con la tabla (encabezados de grupo, filtros activos, fecha de
  generación) y el diálogo de impresión; el usuario guarda como PDF.
- `ExportData` sale de la vista: filas que cumplen filtros y búsqueda, sin paginar ni contraer grupos, en
  el orden de la vista y con las columnas visibles.
- Cambios de filtro/orden/diseño/página envueltos en `document.startViewTransition` (si existe).

## Estilos

`dataviews.css` usa solo tokens `--c-*`, así hereda claro/oscuro,
daltonismo y alto contraste. Con el tema por defecto (`assets/default-theme/`, tokens `--dt-*`) cargar
`assets/dataviews-tokens.css` (alias). Prefijo de clases `dv-`. Anula el `margin-bottom` de Bootstrap en
`label`. Tags de select: `--tag` + `color-mix(… 16%, transparent)`.

## Transiciones y barras fijas de la página

Durante una View Transition el navegador pinta las capturas en una capa sobre toda la página. Si la app tiene barras
fijas o botones flotantes que deben quedar encima de la tabla (topbar, menú de módulos, botón "nuevo"), darles nombre
propio y sin animación en el CSS de la app, no en el componente:

```css
.mi-topbar { view-transition-name: app-topbar; }
::view-transition-group(app-topbar), ::view-transition-old(app-topbar), ::view-transition-new(app-topbar) { animation: none; }
```

## Estilo (`StyleMenu.tsx`)

Estilo de cada vista: se guarda en `ViewConfig.style` (parcial; lo que falta sale de `STYLE_DEFAULTS`) y se persiste con
las vistas. Se abre desde el menú «…» de las pestañas (`ViewTabs`, prop `style`), en un panel dentro del mismo menú como
Configuración. Se aplica como atributos del contenedor `.dv` (`styleAttrs`): no toca `<html>` ni el resto de la página.

- Lectura (`data-tb-*` sobre `.dv`, reglas en `dataviews.css` con tokens `--c-*`): `striped` (filas pares de datos con
  `:nth-child(even of :not(.dv-grouprow))`), `bold`, `lines`, `underline`, `density`, `wrap`, `size` (`zoom` sobre `.dv`)
  y `motion` (`reduce` apaga transiciones; `reduceMotion(el)` lo respeta en `tx` y el tablero).
- Apariencia (solo si hay tokens `--dt-*`, `hasScopedThemes`): el `.dv` lleva `.dt-thp` + `data-theme` + `data-contrast`
  + `data-vision`, y default-theme redefine sus `--dt-*` solo ahí; `dataviews-tokens.css` declara los alias en
  `:root, .dt-thp` para que se recalculen. Tema por defecto: **Sistema** = el tema de la propia web (`useSiteTheme`:
  `data-theme` o `data-bs-theme` en `<html>`, con `data-vision` y `data-contrast`, seguido con un `MutationObserver`).
  Sin tema en la web, "Sistema" se bloquea ("No disponible") y el espacio de trabajo va en claro.

## Accesibilidad (ya incluida)

`aria-live` en contador y paginación, `role="alert"` en error, `role="status"` en avisos, `aria-pressed`
en el selector de diseño, `aria-label` en botones de ícono, `:focus-visible` con `--c-brand`, y
`prefers-reduced-motion` desactiva View Transitions y animaciones de herramientas. Estados siempre con
texto (tag con nombre), nunca solo color.

## Tests

`npx vitest run` (`environment: 'node'`, sin DOM): `rules.test.ts` cubre matchRule, matchFilters (y/o,
grupos, reglas incompletas), matchSearch, railGroups, toISODate, compareValues, paginate, fitColumns, openColumns/openColumn, withGroupOrder, moveKey y moveTo; `exportData.test.ts` el .xlsx
y el HTML del PDF.
Lógica nueva de reglas → test ahí.
