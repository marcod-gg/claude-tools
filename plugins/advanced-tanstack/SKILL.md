---
name: advanced-tanstack
description: Tablas de datos con TanStack Table (React 19 + Vite) — componente DataViews con vistas guardadas tipo Notion (pestañas) y diseños tabla, tablero kanban y tarjetas agrupadas, filtros por tipo con "y"/"o" y grupos de filtros, orden múltiple, agrupado, columnas arrastrables y redimensionables, propiedades visibles, búsqueda, paginación, acciones masivas con casillas, abrir el registro en pestaña nueva, panel lateral o modal (por vista), descarga Excel/PDF, pantalla completa, actualización automática para monitores, persistencia en localStorage, build Vite commiteado y montado en una vista Razor. Antes de implementar pregunta si se mueven registros arrastrando (y entonces qué acción desencadena y con qué condiciones), si se permiten acciones masivas (cuáles, a qué registros y con qué confirmación) qué estilo toma (los colores de la página donde se despliega, el predeterminado compartido o los opcionales Cálido y Pizarra) y qué marca y logo lleva (los de la página o los que indique el usuario); siempre solo lectura por registro, y diseños, segmentos y herramientas los elige el usuario en Configuración. Úsala siempre que el usuario pida TanStack, tabla de datos, grilla, "vistas tipo Notion", DataViews, tablero/kanban de registros, "tablero agrupado con tarjetas", filtros y orden guardados, exportar una tabla a Excel o PDF, una pantalla de monitoreo que se actualiza sola, o reemplazar una tabla jQuery/DataTables, aunque no mencione esta skill. Estilo predeterminado compartido (y opcionales Cálido y Pizarra) en assets/default-theme.
---

# Advanced TanStack / DataViews

Un componente genérico (`assets/src/dataviews/`) y tres montajes de referencia:

| Montaje | Para qué |
|---|---|
| `assets/src/main.tsx` | Tabla + tablero kanban, alcances, vistas por usuario |
| `assets/src/main.explorer.tsx` | Tarjetas agrupadas, acciones por registro, gestión de grupos, opciones dinámicas |
| `assets/src/main.screen.tsx` + `assets/screen/` | Pantalla de monitoreo: filtros y/o con grupos, Descargar Excel/PDF, pantalla completa, auto-refresh con indicador, tarjeta propia, ajustes de lectura |

Detalle de cada pieza (props, modelo, filtros, estilos, tests) en `references/config.md`.

Versiones fijas (exactas en `assets/package.json`, sin `^`): `@tanstack/react-table` 8.21.3, React 19.3.0, Vite 8.3.2,
TypeScript 7.0.2, Vitest 5.0.3, `@vitejs/plugin-react` 6.1.1. Subirlas a propósito y probar, nunca por rango.

## Cuándo sí / cuándo no

- **Sí**: listados que el usuario explora (filtrar, ordenar, agrupar, guardar vistas, pasar a tablero) y
  pantallas de monitoreo que se actualizan solas.
- **No**: una lista corta de portada con estado (unas pocas filas, sin explorar) → una lista simple. Una tabla fija de 10 filas → HTML.

## Catálogo

### Vistas

Pestañas guardadas, como en Notion: cada vista guarda su diseño, filtros, orden, agrupado, columnas
(orden, ancho, visibles), búsqueda y filas por página. El usuario crea, renombra, duplica y elimina las
suyas; `defaultViews` define las iniciales.

### Diseños (`viewTypes`)

Cómo muestra una vista los registros. Cada vista tiene un diseño (`type`) y el usuario lo cambia en la barra;
en **Configuración** (menú «…» junto a «+ Vista») elige qué diseños ofrece esa vista (`types`). `viewTypes` es solo el tope (por defecto los tres).

| Diseño | `type` | Qué muestra |
|---|---|---|
| **Tabla** | `table` | Columnas arrastrables y redimensionables, agrupado colapsable, paginación, copia rápida |
| **Tablero** | `board` | Kanban: una columna por opción de un select. Máximo 3 abiertas (`boardMaxColumns`); cada columna se colapsa con su botón » y se abre desde la barra lateral (abrir una cuarta colapsa la abierta hace más tiempo). Las abiertas se guardan en la vista (`boardOpen`, por campo de columnas) |
| **Tarjetas** | `cards` | Cuadrícula de tarjetas con un subtítulo por grupo de un select (`groupBy`); con segmentos, solo las del elegido |

Tablero y Tarjetas usan la misma tarjeta (`RecordCard`): título (2 líneas), selects como etiquetas de color, el
resto como "etiqueta valor" en una cuadrícula que se adapta al ancho y acciones al pie (`cardActions`). El borde
izquierdo toma el color del primer select con color (normalmente el estado); el campo que agrupa no se repite.
`renderCard` solo si la entidad necesita otra tarjeta (debe respetar `visible`).

Con un solo diseño en la vista se oculta el selector de diseño. Una vista guardada con un diseño no ofrecido se muestra con el primero.

### Segmentos (`railBy`)

Lista de segmentos a la izquierda (`GroupRail`: ícono, nombre, cantidad, "Todos" primero) y el diseño
muestra solo el segmento elegido. Bajo 768 px pasa a una barra arriba con ícono y cantidad (el nombre
solo en el elegido; en todos queda en `title` y para lectores de pantalla). **Un solo ajuste por vista** para
los tres diseños: `railBy` (cualquier propiedad, fechas por día; en la barra: Agrupar → "Segmentar según",
"Sin segmentos" lo quita). Al cambiar de diseño se mantienen la propiedad y el segmento elegido. Se combina con
`groupBy`, que depende del diseño: secciones en la tabla, columnas en el tablero, subtítulos en las tarjetas
(p. ej. segmentos por Región y columnas por Estado). En Tarjetas con `onMove` y `showEmptyGroups`, la lista
incluye los segmentos vacíos y soltar una tarjeta en un segmento la mueve. **Orden personalizado**: los segmentos, las secciones de la tabla (su encabezado), las columnas del
tablero (encabezado o barra de colapsadas) y los subtítulos de tarjetas se reordenan arrastrándolos; también
en Ordenar → Orden de grupos. Se guarda por vista y por campo (`groupOrder`), solo para selects, y lo respetan
los tres diseños. Las cantidades
cuentan filtros y búsqueda; el grupo elegido sale en la descarga como un filtro más.

### Herramientas

| Herramienta | Cómo se activa | Notas |
|---|---|---|
| **Buscar** | `tools.search` (encendida por defecto) | Texto libre en todos los campos |
| **Filtrar** | `tools.filter` (encendida) | Reglas por tipo unidas con "y"/"o" ("y" pesa más) y **grupos de filtros** (paréntesis); una línea por regla |
| **Ordenar** | `tools.sort` (encendida) | Orden múltiple; Shift+clic en el encabezado. Además **Orden de grupos**: orden personalizado de los valores de un select en segmentos, secciones, columnas del tablero y subtítulos ("Todos" siempre primero), con flechas o arrastrando en la lista |
| **Agrupar** | `tools.group` (encendida) | Segmentos en los tres diseños; además secciones en la tabla y columnas en el tablero. Vista por defecto agrupada: `railBy` en `defaultViews` |
| **Propiedades** | `tools.props` (encendida) | Columnas visibles (la del título es obligatoria) |
| **Resumen de la vista** | `tools.summary` (encendida) | Desplegable bajo la barra con todo lo aplicado, una fila por tipo: filtros y grupos, búsqueda, segmentos (propiedad y elegido), secciones/columnas/subtítulos, orden y propiedades ocultas. Cada chip se quita con su ✕ (columnas del tablero y subtítulos solo se cambian en Agrupar); "Quitar todo" limpia todo eso sin tocar diseño ni anchos. Aparece si hay algo aplicado, también en pantalla completa |
| **Configuración** | `tools.config` (encendida); opción del menú «…» de las pestañas, junto a Renombrar/Duplicar/Eliminar | Por vista: qué diseños muestra (al menos uno, `types`), qué herramientas se despliegan (Buscar, Filtrar, Ordenar, Agrupar, Propiedades, Descargar, Resumen de la vista; `tools` de la vista) y **cómo se abren los registros** (abajo). `tools`/`exportTitle` del montaje son el tope |
| **Abrir registros** | En Configuración, si el montaje ofrece más de un modo (`openModes`) | Clic en el título: **misma pestaña** o **pestaña nueva** (`rowHref`), **panel lateral** (vista previa, sin bloquear el listado) o **modal** (`onOpenRecord(row, mode)`: la página muestra el detalle). Se guarda por vista (`ViewConfig.open`); por defecto modal si hay `onOpenRecord`, si no misma pestaña. Ctrl/clic central siempre abre en otra pestaña. Con panel o modal, `rowHref` debe llevar a una **página dedicada** del registro (no a la misma lista con el modal abierto): es lo que abre "pestaña nueva" |
| **Acciones masivas** | `bulkActions` (solo si la pregunta 2 lo pide) | Casillas en Tabla (con "todos" en el encabezado: lo que cumple filtros, búsqueda y segmento) y en las tarjetas; barra con "N seleccionados", una botonera de acciones y "Quitar selección". Cada acción dice a cuántos aplica (`when`), corre `run(rows)` y al terminar limpia la selección, avisa y recarga en segundo plano |
| **Descargar Excel / PDF** | `exportTitle="…"` | Lo que cumple filtros y búsqueda, columnas visibles, sin dependencias (`exportData.ts`) |
| **Pantalla completa** | botón en `toolbarEnd` + `forcePageSize={full ? 0 : undefined}` | Sobre un contenedor con título y herramientas (`#board-screen`) |
| **Actualización automática** | `assets/screen/board-header.js` + `dataviews:reload` | Indicador "Actualizado hace Xs" (solo informa), frecuencia 1/5/15/30 min guardada, recarga sin vaciar la vista. "Actualizar ahora" va como herramienta en `toolbarEnd` (dispara `dataviews:reload`) |
| **Botón Actualizar del pie** | encendido; `hideRefresh` lo oculta | Ocultarlo con actualización automática: lo reemplaza la herramienta "Actualizar ahora" |
| **Estilo** | `tools.style` (encendida); opción del menú «…» de las pestañas, junto a Configuración | **Por vista**: se guarda en la vista (`ViewConfig.style`) como sus filtros y columnas; duplicar la copia, una vista nueva parte del estilo por defecto y "Restablecer estilo" solo afecta a la activa. **Solo cambia el espacio de trabajo**: atributos `data-tb-*` sobre `.dv`, nunca en `<html>`. Apariencia (con default-theme: el `.dv` lleva `.dt-thp` y su propio `data-theme`/`data-contrast`): Sistema (por defecto: sigue en vivo el tema de la propia web, `data-theme`/`data-bs-theme` en `<html>`, con su daltonismo y alto contraste; si la web no tiene tema queda bloqueado como "No disponible" y se usa Claro) / Claro / Oscuro y alto contraste. Lectura: filas alternadas, negrita, líneas entre columnas, subrayar enlaces, espacio entre filas, texto largo, tamaño del texto y animaciones reducidas |

Siempre incluidas (sin opción): pestañas de vistas guardadas, paginación (25/50/100/todas), columnas
arrastrables y redimensionables, copia rápida (`copy: true` en el campo).

## Antes de implementar: preguntar (AskUserQuestion)

**Siempre**, aunque el pedido no lo pida (también en demos y prototipos): una sola llamada con estas 4 preguntas,
salvo las que el pedido ya responda (si no hay preferencia, la opción A). Diseños, segmentos y herramientas
**no** se preguntan: el usuario los elige en Configuración (menú «…» de las pestañas) y Agrupar. Las **acciones por
registro tampoco**: siempre solo lectura (el título es el enlace al detalle); Editar/Eliminar (`rowActions`,
`cardActions`) solo si el pedido lo pide explícitamente. Lo mismo con **editar grupos** (renombrar con doble clic
`onRenameGroup`, switch y eliminar vacío `groupActions`, vacíos visibles `showEmptyGroups`): no se pregunta; los grupos
son fijos salvo que el pedido lo pida. **Cómo se abre el registro** (pestaña, panel lateral o modal) tampoco: si la página
puede mostrar el detalle (un modal o formulario propio), pasar `onOpenRecord` y el usuario elige el modo en Configuración.

1. **¿Los usuarios pueden mover registros entre grupos arrastrándolos?** (una tarjeta a otra columna o subtítulo, una
   fila a otra sección, una tarjeta a otro segmento). A: no, un registro cambia de grupo solo desde su detalle.
   B: sí (`onMove`, optimista: revierte si el servidor rechaza; `validateMove` para bloquear destinos). Necesita un
   endpoint de escritura del registro (p. ej. `Reports/Move(id, sectionId)`). **Con B, segunda ronda** (una llamada):
   - **¿Qué acción desencadena al soltar?** A: guarda el cambio de grupo directo. B: pide confirmación ("¿Mover X a
     Y?") y guarda. C: abre un formulario antes de guardar (p. ej. motivo, fecha o responsable del nuevo grupo).
     Las tres van en `onMove`: devuelve una promesa que resuelve al guardar; si el servidor falla, rechaza con el error
     (la tarjeta vuelve y se muestra el motivo) y si el usuario cancela, rechaza con `null` (vuelve sin aviso). La
     confirmación y el formulario son modales de la página.
   - **¿Qué condiciones tiene?** (`multiSelect`) Cualquier movimiento · Solo ciertos movimientos (transiciones
     permitidas, p. ej. no volver de "Entregado" a "Programado") · Según rol o permiso del usuario · Según datos del
     registro (p. ej. no mover si falta un campo). Todas van en `validateMove(row, field, value)`, que devuelve el
     motivo del rechazo (se muestra como aviso); si no se deducen del proyecto, pedir el detalle (qué transiciones, qué
     roles, qué campos). El servidor valida lo mismo: el cliente solo evita el intento.
2. **¿Se permiten acciones masivas?** (elegir varios registros con casillas y aplicarles una acción a la vez). A: no.
   B: sí (`bulkActions`). Proponer las que se deducen de la entidad: cambiar el estado (activar, suspender, archivar),
   cambiar un select (rol, responsable, categoría), reenviar o notificar (invitación, recordatorio), eliminar. **Con B,
   segunda ronda** (una llamada, `multiSelect`):
   - **¿Qué acciones?** Las propuestas más "otra". Cada una es `{ id, label, icon, danger?, when?, run }`.
   - **¿A qué registros aplica cada una?** Todos · según el estado o datos del registro (p. ej. reenviar solo a los
     pendientes) · según el rol del usuario (p. ej. un admin no toca owners). Van en `when(row)`: el botón muestra a cuántos
     de los elegidos aplica y `run` recibe solo esos. El servidor valida lo mismo.
   - **¿Confirmación?** Las destructivas (suspender, eliminar) piden confirmación con un modal de la página; las que piden
     un dato (cambiar rol, mover a) abren un formulario. Todo en `run`: resolver con el aviso a mostrar; rechazar con el
     error (o con `null` si el usuario cancela). Necesitan endpoints de escritura con la política de gestión.
3. **¿Qué estilo toma la tabla?** Antes de preguntar, revisar si la página donde se despliega tiene estilo propio
   (variables CSS, Bootstrap personalizado, colores de marca) y decirlo en la pregunta. A: **los colores de la página
   donde se despliega** (recomendado si los tiene): leer su CSS (variables, Bootstrap, colores de marca, radios, fuente)
   y escribir un `dataviews-tokens.css` propio que apunte cada `--c-*` a lo que ya usa la app; sin default-theme,
   Estilo muestra solo Lectura. B: **Predeterminado**, el estilo compartido de claude-tools (`assets/default-theme/`:
   `theme-tokens.css` + `head.html` + `dataviews-tokens.css`; neutro gris y azul; Estilo trae tema del espacio de trabajo
   y alto contraste). C: **Cálido** (B + `assets/default-theme/estilos/calido.css`: arena y terracota). D: **Pizarra**
   (B + `estilos/pizarra.css`: gris pizarra y verde azulado). Otra fuente (archivo CSS, design system, URL o paleta que
   indique el usuario) va por "Other": mismo mapeo de `--c-*` desde esa fuente. Si la página no tiene estilo propio y
   no hay preferencia, B. En A y en otra fuente, revisar contraste ≥ 4.5:1 de texto y estados contra su fondo.
4. **¿Qué marca y logo lleva?** Solo si la pantalla muestra marca (encabezado de `Tablero.cshtml`, título de la
   descarga). Antes de preguntar, buscar si la página ya tiene marca: nombre de la app o empresa en el layout y archivo
   de logo en los estáticos. A: **la de la página** (lo encontrado). B: **la que indique el usuario**: nombre, color
   principal (reemplaza `--dt-brand*` y `--dt-logo-bg`, con contraste revisado) y ruta o URL del logo. C: sin marca.
   Nunca inventar ni dar por hecho un nombre, color o logo que no esté en la página o que no indique el usuario.

Sin preguntar, se deduce del proyecto:

| Qué | De dónde | Resultado |
|---|---|---|
| **Stack** | `.csproj`: `Microsoft.NET.Sdk.Web` → Core; `packages.config` / `System.Web` → MVC 5 | MVC 5: salida `Content/dataviews`, `<Content Include>` en el csproj, `?v=@File.GetLastWriteTimeUtc(...).Ticks`. Core: salida `wwwroot/dataviews`, `?v=` con `Env.WebRootPath`, `<DefaultItemExcludes>$(DefaultItemExcludes);ClientApp\**</DefaultItemExcludes>` |
| **Diseños** | Los tres (sin `viewTypes`), salvo que el pedido limite | Vista inicial en Tabla (o el diseño que nombre el pedido); cada vista elige los suyos en Configuración |
| **Herramientas** | Todas las del componente encendidas (sin `tools`) y `exportTitle` con el título del listado | Cada vista apaga las que no quiera en Configuración; `tools={{ x: false }}` solo si el pedido prohíbe una |
| **Pantalla completa** | Siempre | Botón en `toolbarEnd` + `forcePageSize={full ? 0 : undefined}` sobre `#board-screen` |
| **Actualización automática** | Pantalla de monitoreo o datos que cambian solos (lo dice el pedido) | `board-header.js` + `board-tools.css`, herramienta "Actualizar ahora" en `toolbarEnd`, `hideRefresh` |
| **Segmentos** | Solo si el pedido los nombra | `railBy` en `defaultViews` (el select principal, `boardField`, si no dice cuál); si no, sin lista: el usuario la activa en Agrupar → "Segmentar según" |
| **Opciones del select que segmenta** | Código: enum o lista fija → fijas en `FIELDS`; tabla o endpoint → dinámicas | Dinámicas: pedirlas **antes** de montar y armar `FIELDS` una vez |

La 1 se traduce a `onMove` y `validateMove`; la 2, a `bulkActions`; la 3, a los tokens del paso 6. Las vistas por defecto (`defaultViews`) pueden traer `types` (diseños), `tools` (herramientas
apagadas, p. ej. `{ props: false }`) y `railBy` (segmentos, mismo campo en los tres
diseños; sin `railBy` no hay lista). Con gestión de grupos en Tarjetas, `groupBy` igual a `railBy`: los
controles (renombrar, switch, eliminar) van en los subtítulos.

Con **edición de grupos**, **mover registros**, **acciones** o **acciones masivas** pedidas, el servidor necesita endpoints de escritura con la política de
gestión (no la de lectura): p. ej. `Reports/Move(id, sectionId)`, `Sections/Delete(id)` que rechaza si el
grupo tiene registros. Error frecuente: escrituras que solo piden la política de lectura; revisarlo siempre.

## Flujo

1. **Copiar** `assets/package.json`, `vite.config.ts`, `tsconfig.json` y `assets/src/` a `ClientApp/`
   del proyecto; dejar un solo `main*.tsx` como `main.tsx` (el más parecido a lo elegido) y borrar los
   otros. Reemplazar `__APP__` en `package.json`. `npm install`. El componente se copia entero aunque no
   se usen todos los diseños o herramientas: se apagan con props.
2. **Salida**: `vite.config.ts` compila a `../Content/dataviews/` (MVC 5) o `../wwwroot/dataviews/`
   (Core), nombres fijos `dataviews.{js,css}`. **Commitear el build**: la publicación solo corre MSBuild.
   `node_modules/` al `.gitignore`.
3. **Esquema**: en `src/main.tsx` definir `FIELDS` (orden = columnas; `select` con `options` de color
   token e ícono FA), `SOURCES` (alcances), `load(source)` contra un endpoint del mismo origen que
   **valida el acceso en el servidor**, `defaultViews`, `rowHref` y las props de las respuestas.
4. **storageKey** con usuario y alcances: `<app>-dataviews:v1:${email}:${scopes}`. Subir la versión si
   cambia el esquema de `ViewConfig` o las vistas por defecto.
5. **Vista Razor**: `assets/Vista.cshtml` (o `assets/screen/Tablero.cshtml` para monitoreo): link css +
   `div#dataviews-root` con `data-*` + script `type="module"`, versionados, y `scrollbar-gutter: stable`.
   Guardar con BOM.
6. **Tokens** (según la pregunta 3): el CSS usa solo tokens `--c-*`. Predeterminado, Cálido o Pizarra: copiar
   `assets/default-theme/` al proyecto, cargar su `theme-tokens.css` (y después `estilos/calido.css` o
   `estilos/pizarra.css` si se eligió), pegar su `head.html` arriba en el `<head>` del layout (reemplazar
   `__STORAGE_KEY__`, `__LEGACY_KEY__`, `__USE_PREF__`) y `assets/dataviews-tokens.css` después de los tokens. Marca
   propia (pregunta 4): sus `--dt-brand*` y `--dt-logo-bg` en un CSS cargado al final; logo en `ViewData["Logo"]`. Estilo de la página u otra fuente: copiar
   `dataviews-tokens.css` y reemplazar cada `var(--dt-*)` por la variable o color de esa fuente (también en modo oscuro
   si la app lo tiene). Estilo vive en el menú «…» de cada vista y se aplica en el contenedor desde el primer pintado: no
   necesita script en el `<head>`, ni lugar en la página, ni toca el tema del resto de la app.
7. **Herramientas de pantalla** (si se eligieron): `assets/screen/board-header.js` + `board-tools.css`
   en la vista; `load` debe avisar `window.dispatchEvent(new CustomEvent('dataviews:loaded', { detail: { ok } }))`.
8. **Verificar**: `npm run build` (tsc + vite) y `npx vitest run` siempre. La revisión en el navegador (Playwright)
   **solo con confirmación previa**: preguntar antes de abrirlo; muchos cambios no la necesitan, el usuario puede
   preferir revisar él mismo o probar más adelante. Si confirma: cada diseño elegido en claro, oscuro y alto
   contraste; recargar y comprobar que la vista (filtros, grupos de filtros, columnas, anchos, modo de abrir)
   persiste; descargar Excel y PDF si se eligió; probar cada acción masiva con una selección mixta.

## Principios

- `fields` es constante de módulo; `load` y `defaultViews` con `useCallback`/`useMemo`: referencias
  estables o TanStack recalcula todo en cada render.
- Paginación propia sobre la lista aplanada, no `getPaginationRowModel`: así el orden de grupos por
  opción y el colapsado funcionan.
- Tablero sin arrastre por defecto (`onMove` sin pasar): el estado se cambia en el detalle. Si se activa, usar `validateMove` y dejar que `onMove` rechace para revertir.
- Vistas en `localStorage` (por navegador). Si hacen falta vistas compartidas, cambiar `load/save` de
  `useViews` por un endpoint; está marcado con `ponytail:` en el código.
- Nada de dependencias extra: drag and drop nativo, popovers con `<details>`, Excel con un .xlsx armado a
  mano, PDF con el diálogo de impresión, animaciones con View Transitions y FLIP, todo apagado con
  `prefers-reduced-motion`.

## Grupos y acciones

- Tras crear/renombrar/eliminar un **grupo** se recarga la página: los grupos son las opciones de `FIELDS`
  (referencia estable). Mover un registro no recarga: `onMove` es optimista y revierte si el servidor rechaza.
- En la tabla, el encabezado de grupo es un botón (colapsar): los controles van **fuera** del botón y el clic
  simple espera 220 ms para que el doble clic (renombrar) no colapse.
- Controles de grupo discretos: switch pequeño + papelera sin borde, a media opacidad hasta el hover.
- Acciones por registro (tarjeta y fila): **Editar** con lápiz + texto en gris y **Eliminar** como papelera **siempre
  roja** (`.rp-act`, `.rp-act--text`, `.rp-act--danger`, en `dataviews.css`), con `aria-label`; el **título es el enlace** al detalle (sin
  botón "Ver"). La celda de acciones de la tabla mide 96 px (solo íconos, defecto); con "Editar" de texto pasar `rowActionsWidth={130}`.
- Controles de grupo: `.dv-sec-switch` (label + checkbox `role="switch"`) y `.dv-sec-delete` (papelera, `disabled` si el grupo tiene registros), en `dataviews.css`; no requieren Bootstrap.
- **CSS de la página por etiqueta**: el componente usa `<section>` (columnas del tablero, tarjetas), `<header>`, `<article>`,
  `<footer>` y `<h3>`. Reglas globales como `section { padding-block: 120px }` o `header { position: fixed }` lo rompen
  (columnas con un espacio enorme arriba y abajo, encabezados flotando). Acotarlas a la página (`main > section`, `.site-header`)
  y neutralizar la tipografía display de `h1-h3` dentro de `.dv` en `dataviews-tokens.css`. Revisarlo siempre en el paso 6.
- **Ojo con la especificidad**: `dataviews.css` tiene `.dv button { color: inherit }`. Los estilos propios de botones
  dentro del componente necesitan `.dv .mi-clase` o el color no se aplica (p. ej. Eliminar no sale rojo).
- Pestañas en segundo plano: Chrome frena temporizadores y captura; al probar por JS esperar ≥ 1 s o traer la
  pestaña al frente.
- Probar arrastres con el mouse paso a paso (`mousedown` → `mousemove` → `mouseup`): el atajo `drag` de Playwright
  falla cuando el destino obliga a desplazar la página y parece un error del componente.

## Filtros, monitoreo y descarga

- **Filtros y búsqueda antes de TanStack**: `matchFilters` y `matchSearch` corren sobre las filas antes de
  `useReactTable`, porque los `columnFilters` solo combinan con "y" y los segmentos tienen que contar lo
  que cumple ambos (después se recorta al grupo elegido). Reglas y grupos guardan `join` con la regla anterior; un grupo se
  evalúa entero y cuenta como una condición. Las vistas viejas (solo reglas) siguen funcionando.
- El panel de filtros crece con la regla más larga (`.dv-pop--filters`, `width: max-content`) y cada regla
  va en una línea; en pantallas angostas hay scroll horizontal en vez de partir la regla.
- **Auto-refresh**: `dataviews:reload` recarga en segundo plano sin vaciar la vista (`dataviews:refresh`
  sí la vacía). Si una carga es lenta, `load` reutiliza la promesa en curso para no apilar pedidos.
- **Pantalla completa** sobre el contenedor que incluye el título y las herramientas, no solo la tabla;
  `forcePageSize={0}` muestra todas las filas sin tocar la vista guardada.
- Un filtro por defecto con "o" cubre "fecha en ±N días **o** sin fecha" (`within` + `empty`).
- Todo `onChange` que pasa por `tx` (View Transition) lee `e.target.value` / `checked` **antes** de llamar a `tx`:
  dentro de la transición React ya devolvió el control al valor anterior y el cambio se pierde sin error
  (pasó con filas por página y con los selects de Agrupar). Patrón: `e => { const v = e.target.value; tx(() => set({ x: v })); }`.
- Excel con columnas `date` reales y autofiltro; PDF con encabezados de grupo, filtros activos y fecha de
  generación. El nombre del archivo sale de `exportTitle` + nombre de la vista + fecha.

## Archivos

| Archivo | Uso |
|---|---|
| `assets/package.json`, `vite.config.ts`, `tsconfig.json` | Configuración base (salida MVC 5; cambiar a `wwwroot` en Core) |
| `assets/src/dataviews/` | Componente genérico, unión de las tres apps, con `rules.test.ts` y `exportData.test.ts` |
| `assets/src/main.tsx` | Esqueleto: tabla + tablero |
| `assets/src/main.explorer.tsx` | Tarjetas agrupadas, acciones, gestión de grupos, opciones dinámicas |
| `assets/src/main.screen.tsx`, `BoardCard.tsx`, `board-card.css` | Pantalla de monitoreo con tarjeta propia |
| `assets/Vista.cshtml` | Vista Razor que carga el build |
| `assets/screen/Tablero.cshtml` | Vista Razor de monitoreo: título, indicador y frecuencia |
| `assets/screen/board-header.js`, `board-tools.css` | Actualización automática (tokens `--dt-*`) |
| `assets/default-theme/theme-tokens.css`, `head.html` | Estilo predeterminado compartido de claude-tools (copia de `shared/default-theme/`, no editar aquí): tokens `--dt-*` claro/oscuro/daltonismo/alto contraste, también por elemento con `.dt-thp`, y script del `<head>` |
| `assets/default-theme/estilos/calido.css`, `pizarra.css` | Estilos opcionales (Cálido, Pizarra): cargar después de `theme-tokens.css` |
| `assets/dataviews-tokens.css` | Alias `--c-*` → `--dt-*` para el tema por defecto (default-theme) |
| `references/config.md` | Build, props, `ViewConfig`, filtros, TanStack, vistas, descarga, estilos, a11y, tests |
| `examples/demo/` | Ejemplo completo aplicado desde cero (solo lectura, tema por defecto): `demo.html` armado, su `main.tsx` y `build.py` |
