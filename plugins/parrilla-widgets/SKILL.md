---
name: parrilla-widgets
description: Parrilla de widgets personalizable para dashboards y páginas de inicio, sin dependencias. Tiene 12 columnas con filas cuadradas y se mueve arrastrando, con animación FLIP y un espacio que marca dónde caerá el widget. Se estira desde la esquina (doble clic vuelve al alto automático), se maneja con teclado y tiene una bandeja de widgets para agregar con clic o arrastre, una zona para quitar y autodesplazamiento. En el celular queda en una columna. La disposición se guarda como [{id, w, x, y, h}]. Antes de implementar pregunta dónde se guarda la disposición, quién puede personalizar y el estilo. Úsala cuando el usuario pida un dashboard personalizable, widgets que se mueven o cambian de tamaño, "Personalizar" la página de inicio, un tablero de paneles reordenables o algo como el Resumen de Tuesday, aunque no nombre esta skill.
---

# Parrilla de widgets

Un script clásico sin dependencias (`assets/parrilla.js`, expone `crearParrilla`), su CSS con tokens (`assets/parrilla.css`)
y el alias al estilo compartido (`assets/parrilla-tokens.css`). Sale de la parrilla del Resumen y de Mis tareas de Tuesday.

| Pieza | Para qué |
|---|---|
| `crearParrilla({ el, layout, onSave, tray, list })` | Monta la parrilla sobre los `.pz-item[data-id]` que ya están en `el` |
| `g.editar(on)` | Entra o sale del modo Personalizar (cuadrícula de fondo, herramientas, bandeja) |
| `g.layout()` / `g.setLayout(l)` | Lee la disposición o la reemplaza animando (p. ej. Restablecer, o un cambio que llega del servidor) |
| `g.fit()` | Recalcula: llamarlo si el contenedor cambia de ancho sin un `resize` de ventana |

API completa, marcado y tokens: `references/api.md`. Ejemplo funcionando: `examples/demo/demo.html` (abre con doble clic).

## Cuándo sí / cuándo no

- **Sí**: un dashboard o una página de inicio donde cada persona (o un admin para todos) elige qué widgets ver, dónde y de qué tamaño.
- **No**: una grilla fija de tarjetas que nadie reordena → CSS grid simple. Un tablero kanban de registros → `vistas-de-datos`.

## Lo que entrega

- **12 columnas, filas cuadradas**: una fila mide lo mismo que una columna, así la cuadrícula de fondo del modo edición son
  cuadros redondeados iguales a los widgets. Ancho mínimo 3 columnas.
- **Alto automático**: sin `h`, el widget toma el alto de su contenido (lo sigue con un `ResizeObserver`). Con `h` queda fijo
  y su `.pz-body` hace scroll.
- **Mover**: se arrastra el widget completo. Los demás se corren con FLIP y un espacio punteado marca dónde caerá.
  La posición guardada cambia solo al soltar.
- **Estirar**: desde la esquina inferior derecha. Si solo cambia el ancho, el alto automático se mantiene. El doble clic en la esquina vuelve al alto automático.
- **Teclado**: con el foco en ⠿, las flechas mueven un cuadro y Mayús+flechas cambian el ancho y el alto.
- **Bandeja "Widgets"**: panel fijo a la derecha con los widgets ocultos. Clic agrega; arrastrar lo mete en la parrilla
  bajo el puntero (si vuelve a la bandeja, sale). Se contrae a una pestaña y se esconde sola mientras se arrastra.
- **Quitar**: con × o soltando el widget en la zona roja que aparece abajo al arrastrar.
- **Autodesplazamiento** cerca del borde de la ventana, que se detiene al ver el final de la parrilla.
- **Celular (≤ 760 px)**: una columna en el orden de la disposición y sin estirar.
- **Animaciones** con entrada y salida, todas apagadas con `prefers-reduced-motion`.

## Antes de implementar: preguntar (AskUserQuestion)

Una sola llamada con estas preguntas, salvo las que el pedido ya responda (sin preferencia, la opción A):

1. **¿Dónde se guarda la disposición?** A: **por persona en el servidor** (sus preferencias; sigue a la persona entre
   equipos). B: `localStorage` (solo ese navegador). C: **una vista pública que edita un admin + "Mi vista" por persona**,
   con un selector Pública/Mi vista (el patrón de Tuesday).
2. **¿Quién puede personalizar?** A: cada persona su propia página. B: solo admin (y, si aplica, líderes) la vista pública.
   C: ambos, según la opción C de arriba.
3. **¿Qué estilo toma?** Antes de preguntar, revisar si la página tiene estilo propio y decirlo. A: **los colores de la página**
   (recomendado si los tiene): apuntar cada `--pz-*` a sus variables en su `:root`. B: **Predeterminado** de claude-tools
   (`assets/default-theme/` + `assets/parrilla-tokens.css`). C: **Cálido** (B + `default-theme/estilos/calido.css`).
   D: **Pizarra** (B + `estilos/pizarra.css`). En A revisar contraste ≥ 4.5:1 en claro y oscuro.

La parrilla no lleva marca ni logo: no preguntar por ellos.

Sin preguntar, se deduce del proyecto:

| Qué | De dónde | Resultado |
|---|---|---|
| **Widgets** | Paneles que ya tiene la página | Cada uno pasa a `.pz-item[data-id]` con su `h2`, `.pz-sub` (descripción en la bandeja) y `.pz-body` |
| **Disposición inicial** | Lo que se ve hoy | `DEF` con los widgets visibles y sus anchos; los demás quedan en la bandeja |
| **Cabecera fija** | ¿La página tiene topbar fija? | `topOffset: () => alto` para que el autodesplazamiento empiece debajo |

## Flujo

1. **Copiar** `parrilla.js` y `parrilla.css` a los estáticos (script clásico: sin build ni `type="module"`).
2. **Tokens** (pregunta 3): colores de la página → en su `:root` apuntar `--pz-*` a sus variables. Predeterminado, Cálido o
   Pizarra → copiar `assets/default-theme/`, pegar su `head.html` arriba en el `<head>` y cargar en orden `theme-tokens.css`,
   el estilo opcional, `parrilla.css` y `parrilla-tokens.css`.
3. **Marcado**: el contenedor `.pz` con los `.pz-item`, y la bandeja `.pz-tray` con su `.pz-list` (copiar de la demo).
4. **Montar**: `crearParrilla({ el, tray, list, layout: guardada ?? DEF, onSave })`. Botón Personalizar → `g.editar(true)`;
   Listo, × y Esc → `g.editar(false)`; Restablecer → `g.setLayout(DEF)`.
5. **Guardar** (pregunta 1): `onSave` recibe la disposición completa en cada cambio. Al servidor, con un *debounce* de
   ~600 ms y guardando el documento completo de preferencias (si comparte documento con otras claves, mezclarlas, no pisarlas).
6. **Verificar**: `node --check` siempre. En el navegador (Playwright), **solo con confirmación previa**: mover, estirar, doble
   clic en la esquina, agregar con clic y con arrastre, quitar con × y con la zona, teclado, claro y oscuro y 390 px.

## Principios

- **La posición guardada nunca cambia mientras se arrastra**: `settle()` calcula dónde se ve cada widget (POS) a partir de
  `x, y` guardados. Si uno crece, empuja a los de abajo solo en pantalla y la posición se guarda (`commit`) al soltar.
- **El que se arrastra queda fijo** (`dFixed`) y los demás suben hasta donde puedan sin chocar.
- **FLIP en todo cambio**: medir, aplicar, `fit()` y animar desde la posición anterior. La animación en curso se cancela
  **antes** de medir el destino.
- **Grid CSS real**: cada widget lleva `grid-column` y `grid-row` en línea, así el navegador hace el layout y el contenido no se re-renderiza.

## Errores ya resueltos (no repetir)

- **El soltado vuelve a quedar debajo**: hay que guardar lo que se ve con el soltado todavía fijo y recién después compactar.
  Al revés, empata en fila con el que estaba ahí y el orden lo manda abajo.
- **Widgets que saltan al reacomodarse rápido**: se medía el destino con la animación anterior viva. Cancelarla antes de medir.
- **Temblor al cruzar varios widgets**: `busy()` espera solo la primera mitad (220 ms) del desplazamiento de los demás antes del siguiente cambio.
- **La página salta al reacomodar**: el navegador corrige el scroll (*scroll anchoring*). `html:has(.pz.editing){overflow-anchor:none}`.
- **Un widget oculto se sigue viendo**: `display:flex` del ítem pisa el atributo `hidden`. Hace falta `.pz-item[hidden]{display:none}`.
- **Arrastre desde la bandeja que se corta**: la lista se vuelve a dibujar al entrar el widget. Escuchar `pointermove/up` en `window`.
- **Un cambio del servidor pisa lo que se está arrastrando**: si `g.busy()` o la parrilla está en edición, no aplicar la disposición remota (aplicarla al salir).
- **Re-render mientras se escribe en un widget**: si el foco está en un input o textarea dentro de la parrilla, posponer el re-render.
- **Estirar en el celular**: no hay espacio para la esquina. En ≤ 760 px se oculta y la parrilla es una columna.

## Archivos

| Archivo | Uso |
|---|---|
| `assets/parrilla.js` | `window.crearParrilla(opciones)` → `{ fit, apply, editar, layout, setLayout, busy }` |
| `assets/parrilla.css` | Parrilla, modo edición, herramientas, bandeja, zona para quitar; tokens `--pz-*` en `:where(:root)` con oscuro |
| `assets/parrilla-tokens.css` | Alias `--pz-*` → `--dt-*` para el estilo compartido |
| `assets/default-theme/` | Estilo compartido de claude-tools (copia de `shared/default-theme/`, no editar aquí) |
| `references/api.md` | Opciones, modelo de la disposición, marcado, clases y tokens |
| `examples/demo/demo.html` | Demo de un archivo (abre con doble clic): 5 widgets, bandeja y `localStorage` |
