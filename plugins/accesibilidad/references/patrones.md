# Patrones y fallos reales

Cada patrón viene de un fallo encontrado auditando una SPA real (React + rutas hash, shell propio) con
`scripts/audit.cjs`. axe solo detectó 3 de los 15; el resto los encontró la parte del script que va más allá de axe.

## Skip link con rutas hash (WCAG 2.4.1)

**Fallo:** `<a href="#main">Saltar al contenido</a>` cambia `location.hash` a `#main`; el enrutador no conoce esa ruta y la
página queda vacía.

```js
// El foco se mueve por JS; el href queda para que siga siendo un enlace.
skip.addEventListener('click', e => { e.preventDefault(); document.getElementById('main').focus() })
// <main id="main" tabindex="-1"> (tabindex para poder recibir el foco)
```

## Cambio de ruta en una SPA (WCAG 2.4.2, 2.4.3, 4.1.3)

**Fallo:** el título del documento nunca cambiaba y, tras navegar, el foco quedaba en `<body>`, así que el lector de
pantalla no anunciaba nada.

`assets/route-focus.js`: `dtRouteFocus(contenedorDeLaPagina, ' · Mi app')`. Pone el título según el `h1` y, al
cambiar la URL, pasa el foco al `h1`. Espera al `h1` real con un `MutationObserver`, porque muchas páginas muestran
«Cargando…» antes. En React: `useEffect(() => dtRouteFocus(ref.current, ' · App'), [])`.

- **Toda página necesita su `h1`**, también las de error, vacío y «no encontrado»: un `<h2>` suelto no da título.
- **El contenedor es la página**, no el documento: así, abrir un modal o el menú no mueve el foco.
- **No agregar además una región `aria-live`:** el foco en el `h1` ya anuncia la página, y con las dos se oye dos veces.

## Foco con el contraste de Windows (forced-colors)

**Fallo:** el anillo de foco era `outline: none; box-shadow: 0 0 0 2px …`. Con el contraste de Windows el sistema
**borra box-shadow** y el foco desaparece en toda la app. Lo mismo pasa con la opción elegida que solo se marca con
un fondo.

`assets/a11y-base.css` trae el bloque `@media (forced-colors: active)` con `outline` en `CanvasText` y `Highlight`.
Las vistas previas de tema llevan `forced-color-adjust: none`; sin eso, las tarjetas se ven en blanco.
Para probarlo: `newPage({ forcedColors: 'active' })` en Playwright, o Configuración → Accesibilidad → Temas de contraste.

## Controles de selección: radios nativos

**Fallo:** `<button role="radio" aria-checked aria-pressed>`: tenía dos estados que se contradecían, no respondía a las
flechas y cada opción era una parada de Tab (11 en una escala de 0 a 10).

```html
<span class="dt-seg" role="radiogroup" aria-label="Tu nota de 0 a 10">
  <label><input type="radio" name="nota" value="0">0</label> …
</span>
```

El radio queda oculto a la vista, pero no al teclado ni al lector. La etiqueta hace de botón, y `label:has(:checked)` y
`label:has(:focus-visible)` le dan el estilo (ver `.dt-seg` en `a11y-base.css`).

**Si elegir guarda en el servidor**, hay que esperar una pausa: con las flechas, cada paso es un `change`.

```js
function elegir(v) {
  if (!pausa) previa = valor          // si falla, se vuelve a la de antes de recorrer
  setValor(v); clearTimeout(pausa)
  pausa = setTimeout(() => { pausa = null; guardar(v, previa) }, 500)
}
// Cualquier otra acción que guarde (p. ej. «Quitar») cancela la pausa primero.
```

**Dos botones que alternan un modo** (Escribir / Vista previa) no son pestañas si no hay `tabpanel`. Lo correcto es un
`role="group"` con `aria-pressed`.

## Etiqueta que coincide con el texto (WCAG 2.5.3)

**Fallo:** un botón mostraba «Biblioteca pública», pero su `aria-label` era «Cambiar de biblioteca». Con control por
voz, decir lo que se ve no funciona. El nombre accesible debe **empezar** con el texto visible:
`aria-label="Biblioteca pública, cambiar de biblioteca"`. Si el texto cambia, el `aria-label` se actualiza con él.

## ARIA donde no se permite

- `aria-label` en un `<div>` o un `<i>` sin `role` está prohibido y el lector lo ignora:
  - indicador de carga: `role="status" aria-label="Cargando"`;
  - ícono con significado: `role="img" aria-label="…"`;
  - ícono decorativo: `aria-hidden="true"`.

## Reflow a 320 px (WCAG 1.4.10)

- **Un `.sr` absoluto dentro de una tabla con scroll se escapa:** su bloque contenedor está fuera del contenedor con
  `overflow-x: auto`, y crea scroll horizontal en toda la página. El contenedor lleva `position: relative`
  (`.dt-scroll-x`).
- **Un `<input>` dentro de un flex no se encoge** por su ancho intrínseco: `min-width: 0`.
- **Una grilla `1fr 1fr` con palabras largas se desborda** a 150 %: `minmax(0, 1fr)` y `overflow-wrap: anywhere` en el
  valor.
- Un `<select>` junto a su etiqueta: `flex-wrap: wrap` en la fila y `max-width: 100%` en el select.
- **En grillas de tarjetas, el mínimo tiene que ceder:** `minmax(min(13rem, 100%), 1fr)`, no `minmax(13rem, 1fr)`. Con
  letra al 150 %, 13rem son 312 px y no caben en 320. Lo encontró el audit en un diseño recién hecho.

## Tamaño de letra que escale todo

**Fallo:** el texto estaba en `rem`, pero los altos de botones, los íconos y el ancho del menú lateral estaban en px. A
150 % la letra crecía dentro de cajas fijas y el menú cortaba «Volver a Recu…».

`scripts/px_to_rem.py` convierte 1:1, así que a 100 % nada cambia. Después hay que revisar las regresiones: al pasar a
rem aparecieron dos desbordes a 320 px con letra al 150 %, y el script de auditoría los encontró.

- **Letra base:** al menos 14 px (`.875rem`). Nada bajo 12 px, ni chips, ni insignias, ni `kbd`.
- **Si sube la letra base, revisar los anchos fijos:** el nombre de la cuenta pasó a cortarse en un menú lateral de
  216 px. Se subió a 240 px (`15rem`).

## Área táctil de 24 px (WCAG 2.5.8)

- **Chips interactivos:** al menos `1.5rem` de alto.
- **Enlaces de 16 px en tablas:** `padding-block: .25rem; margin-block: -.25rem`. El padding agranda lo que se puede
  tocar y el margen negativo lo compensa. Solo con padding, la fila crece y el «1» del índice queda desalineado del
  título.

## Auditar sin engañarse

- **Un `goto` que solo cambia el hash no recarga la página:** el script del `<head>` no vuelve a correr y las
  preferencias no se aplican. El audit recarga cada ruta. Sin eso, la prueba de las 12 combinaciones revisa siempre el
  tema claro.
- **Git Bash convierte `"#/ruta"` en una ruta de Windows:** usar `MSYS_NO_PATHCONV=1`.
- **Que el foco no se mueva al hacer clic no es un fallo:** al hacer clic con el mouse se arranca desde ese punto, no
  desde el skip link. Probar con Tab desde la carga.
- **Lo que no es un fallo y no se reporta:**
  - texto en un submenú plegado a propósito o en un `.sr` de 1 px;
  - el corte intencional de texto (elipsis, `line-clamp`): el texto completo está en otra parte;
  - una tabla que se sale dentro de su propio contenedor con scroll.
- **El chequeo de tokens no basta:** `check_theme.py` decía «sin estados» y no revisaba los colores que cambian los
  temas de daltonismo. Ahora, si no hay `--*-state-*`, compara éxito, aviso y peligro.
