---
name: accesibilidad
description: Accesibilidad de apps web, de la auditoría a la verificación — auditoría en el navegador con Playwright + axe-core (WCAG 2.2 AA en las 12 combinaciones claro/oscuro × daltonismo protan-deutan/tritan × alto contraste, skip link, título y foco al cambiar de ruta en SPAs, foco visible también con el contraste de Windows/forced-colors, reflow a 320 px con letra al 150 %, texto bajo 12 px, espaciado de texto y áreas táctiles de 24 px), página "Accesibilidad" estilo GitHub (tema único o sincronizado con el sistema, daltonismo, contraste, tipo y tamaño de letra), CSS base con lo que el tema no cubre, script de foco al cambiar de ruta, conversión de px a rem para que el tamaño de letra escale toda la interfaz y verificación de contraste/ΔE de tokens. Usa el estilo compartido default-theme (12 temas y script del head). Úsala siempre que el usuario pida accesibilidad, a11y, WCAG, una auditoría de accesibilidad, daltonismo, alto contraste, modo de contraste de Windows, tamaño o tipo de letra, lector de pantalla, navegación con teclado, foco visible, skip link o "que se pueda usar sin mouse", aunque no nombre esta skill.
---

# Accesibilidad

**Esta skill no reemplaza los temas:** los 12 temas y el script que aplica las preferencias antes del primer pintado
vienen del estilo compartido `default-theme` (`assets/default-theme/`). Lo que agrega es:
- **auditar lo que se pinta**, no solo los tokens;
- la **página Accesibilidad** desde donde el usuario elige sus preferencias;
- las **reglas y patrones** que el tema no cubre;
- la **verificación** de que todo quedó bien.

Nace de auditar y arreglar una SPA real. Los fallos y su arreglo, con código, están en `references/patrones.md`. De 15
problemas, axe detectó 3; el resto los encontró `scripts/audit.cjs`.

## Antes de implementar: preguntar (AskUserQuestion)

Una sola llamada, salvo las preguntas que el pedido ya responda (sin preferencia, la opción A):

1. **¿Qué se hace?** A: **auditar y proponer**, con hallazgos por prioridad, sin tocar código. B: **auditar y
   arreglar**, por prioridad, verificando cada paso. C: **solo la página Accesibilidad y el tema**.
2. **¿Qué estilo toma?** Antes de preguntar, revisar si la app ya tiene tokens propios y decirlo.
   - A: **los tokens de la app**. Se mantienen; se agregan los bloques `[data-vision]`/`[data-contrast]` que falten y
     se revisan con `check_theme.py --prefix <suyo>`.
   - B: **predeterminado** (`default-theme`).
   - C: **Cálido** o D: **Pizarra** (`default-theme/estilos/`).
3. **¿Qué rutas son las representativas?** Hasta unas 10: la de inicio, una lista, un detalle, un formulario y la de
   lectura o uso principal. Si hay pantallas que exigen sesión, preguntar cómo entrar: una cuenta de prueba o
   `state-load` de Playwright. Nunca crear cuentas sin permiso.

## Flujo

1. **Línea base:** levantar la app y correr `node scripts/audit.cjs <url> <rutas…>` (ver *Auditar*). Correr además
   `python scripts/check_theme.py <tokens.css> --prefix <p>`.
2. **Revisar lo que el script no ve:**
   - leer la lista de abajo contra el código;
   - mirar las capturas que deja (`320-150-*.png`, `foco-forced-*.png`);
   - recorrer a mano, con teclado, un formulario y un diálogo.
3. **Ordenar los hallazgos:**
   - **P1, bloquean:** skip link roto, foco invisible, cambio de página sin anunciar, trampas de foco.
   - **P2, incumplen AA:** reflow, nombres accesibles, ARIA inválido, controles sin teclado.
   - **P3, comodidad:** texto chico, escalado a 150 %, áreas táctiles, vistas previas.

   Presentarlos con `archivo:línea`, y no tocar código si el pedido fue solo auditar.
4. **Arreglar** con los patrones de `references/patrones.md` y los assets. Si falta, instalar el tema compartido:
   `default-theme/head.html` arriba en el `<head>`, `theme-tokens.css`, y `a11y-base.css` después.
5. **Verificar:** volver a correr `audit.cjs` hasta que dé «Todo cumple» y probar en las capturas que nada se ve peor a
   100 %. Si los cambios tocan pantallas con sesión que no se pueden abrir, probar el componente aparte, con
   `setContent` y su CSS real, y decir qué quedó sin probar en la app.

## Auditar

```bash
npm i -D playwright axe-core          # o globales; usa Chrome/Edge instalado o `npx playwright install chromium`
MSYS_NO_PATHCONV=1 node <skill>/scripts/audit.cjs http://localhost:5173/ "#/inicio" "#/lista" "#/detalle/1"
```

| Revisa | Cómo |
|---|---|
| WCAG 2.2 A/AA y buenas prácticas | axe en cada ruta |
| Contraste en 12 combinaciones | Pone `data-theme/vision/contrast` en `<html>` y **recarga** cada ruta: un `goto` que solo cambia el hash no recarga |
| Skip link | El primer Tab llega a él; al activarlo la URL no cambia y el foco entra al `<main>` |
| Cambio de ruta | Con teclado: el título cambia y el foco no queda en `<body>` |
| Foco visible | 20 Tab, normal y con `forcedColors: 'active'` |
| Reflow | 320 px con letra al 100 % y al 150 %; ignora lo que se sale dentro de su propio contenedor con scroll |
| Texto | Nada bajo 12 px; espaciado WCAG 1.4.12 sin recortes |

Sale con código 1 si algo falla. El detalle queda en `a11y-audit/report.json`, junto a las capturas.

## Lista de revisión

- **Nunca solo color:** cada estado lleva nombre o ícono (WCAG 1.4.1). Los temas de daltonismo ayudan; no reemplazan la
  etiqueta.
- **Skip link** como primer elemento del `<body>` (`.dt-skip`). **Con rutas hash, mueve el foco por JS**, sin tocar el
  hash.
- **Cada página tiene un `h1`**, incluidas las de error, vacío y «no encontrado». Al cambiar de ruta, el título y el foco
  siguen al `h1`: `assets/route-focus.js`.
- **El foco se ve siempre**, también con el contraste de Windows: ahí `box-shadow` desaparece. El bloque
  `forced-colors` está en `a11y-base.css`.
- **Controles nativos antes que ARIA:**
  - selección de una opción: radios nativos (`.dt-seg`), no `button role="radio"`;
  - alternar un modo: `aria-pressed`;
  - pestañas: solo si hay `tabpanel`;
  - íconos solos: `aria-label`;
  - modales: `<dialog>`;
  - avisos: `role="status"` o `role="alert"`.
- **El nombre accesible empieza con el texto visible** (WCAG 2.5.3). Nada de `aria-label` en un `div` o un `i` sin
  `role`.
- **Tamaños en `rem`**, también altos de controles, íconos y anchos del layout: `scripts/px_to_rem.py`. Letra base de
  al menos 14 px y nada bajo 12 px.
- **A 320 px y letra al 150 %, sin scroll horizontal:**
  - las tablas, en un contenedor `.dt-scroll-x`, que lleva `position: relative` para que el `.dt-sr` no se escape;
  - `min-width: 0` en inputs dentro de un flex;
  - `minmax(0, 1fr)` en las grillas.
- **Áreas táctiles de al menos 24 px** (WCAG 2.5.8): chips de `1.5rem`; en enlaces de tabla, `.dt-target`, que agranda
  el área sin mover el diseño.
- **Movimiento reducido:** el CSS ya lo respeta. Lo que se anima por JS (scroll suave, contadores, tours) debe consultar
  `matchMedia('(prefers-reduced-motion: reduce)')`.
- **Texto decorativo vs. legible:** `--dt-text-faint` (≥ 3:1) solo para pistas secundarias. `--dt-accent*` nunca como
  texto.
- **Login sin preferencias del usuario** (`__USE_PREF__ = false` en `head.html`): el equipo puede ser compartido.

## Página Accesibilidad

`assets/accessibility-page.html` es un bloque autocontenido (estilo, marcado y script) que usa `window.dtTheme` y
`.dt-thp`. Se pega en una ruta propia, enlazada desde el menú de usuario. Trae:
- modo de tema: único, o sincronizado con el sistema (tema de día y de noche);
- tarjetas de tema con vista previa real, que siguen el contraste elegido;
- contraste;
- tipo de letra (Roboto, Atkinson Hyperlegible, Lexend, del sistema) y tamaño (87.5–150 %).

En React se puede portar a componentes manteniendo la misma preferencia. En `.cshtml`: quitar el comentario inicial,
escribir `@@media` y guardar con BOM (MVC 5).

## Archivos

| Archivo | Uso |
|---|---|
| `scripts/audit.cjs` | Auditoría en el navegador (Playwright + axe); código 1 si falla |
| `scripts/check_theme.py` | Contraste de tokens en las 12 combinaciones y ΔE entre estados con daltonismo simulado (Machado 2009); sin `state-*`, compara éxito, aviso y peligro |
| `scripts/optimize_states.py` | Genera colores de estado distinguibles con daltonismo a un contraste dado |
| `scripts/px_to_rem.py` | Pasa a rem los tamaños de controles en px (muestra los cambios; escribe con `--write`) |
| `assets/a11y-base.css` | Skip link, `.dt-sr`, `.dt-scroll-x`, `forced-colors`, `.dt-seg`, `.dt-target`, movimiento reducido |
| `assets/route-focus.js` | Título y foco al cambiar de ruta en una SPA |
| `assets/accessibility-page.html` | Página Accesibilidad |
| `assets/default-theme/` | Estilo compartido (copia de `shared/default-theme/`; no editar aquí) |
| `references/patrones.md` | Cada fallo real, su causa y el arreglo con código |

Los scripts de Python solo usan la biblioteca estándar; el de Node necesita `playwright` y `axe-core`.
