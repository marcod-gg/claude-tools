---
name: consola-multicuenta
description: Cascarón de consola de administración multicuenta, sin dependencias, con la estructura del dashboard de Cloudflare (sin su marca): página para elegir cuenta, selector de cuenta en el sidebar, grupos desplegables, riel de íconos con vista rápida, menú que se desliza al entrar a un recurso, recientes, búsqueda Ctrl K, barra superior con menú de usuario y cajón en el celular. Antes de implementar pregunta estilo, marca y logo, y qué recurso tiene menú propio. Úsala cuando el usuario pida un panel de administración o consola con sidebar, una app multicuenta o multi-tenant con cambio de cuenta, un sidebar colapsable a íconos, una paleta de comandos Ctrl K o algo "como dash.cloudflare.com", aunque no nombre esta skill.
---

# Consola multicuenta

Un script sin dependencias (`assets/app-shell.js`, expone `window.AppShell`) y su CSS con tokens (`assets/app-shell.css`)
que arman el "cascarón" de una consola: sidebar, barra superior, contenido y pie. La app solo pinta sus páginas dentro de
`shell.main` y avisa los cambios de ruta con `shell.update()`. Genérico: sin nombres, colores ni logos de una empresa;
la referencia es la **estructura** del dashboard de Cloudflare, no su marca.

API completa, nodos del menú y tokens: `references/api.md`. Ejemplo funcionando: `examples/demo/demo.html` (abre con
doble clic; dos cuentas con dominios, enrutado por hash).

## Estructura de referencia (dash.cloudflare.com, 2026)

| Zona | Cómo es | En el shell |
|---|---|---|
| Rutas | `/` = selector de cuentas; `/<idCuenta>/home`, `/<idCuenta>/<producto>/<página>`; recurso: `/<idCuenta>/<dominio>/<sección>` | `:account` y `:scope` en los `href`; `account: null` muestra el selector |
| Selector de cuentas | Correo arriba, "Cuentas", "Selecciona una cuenta.", buscador + "Crear cuenta", tabla Cuenta (ordenable) / Organización | Página Cuentas en `main` |
| Encabezado del sidebar (48 px) | Logo + botón con el nombre de la cuenta truncado y ⇕; popover con "Buscar cuentas...", lista con ✓ en la actual y "+ Crea una cuenta" | `.as-acc` + popover nativo |
| Sidebar (216 px) | "Búsqueda rápida... Ctrl K", Inicio, Recientes, grupos con chevron (varios abiertos a la vez, hasta 3 niveles), títulos de sección ("Desarrollo", "Proteger y conectar"), línea y "Administrar cuenta" al final | `nav` con `section`, `separator`, `children`, `recents` |
| Contraído (56 px) | Riel solo con íconos; las secciones se ven como líneas; al pasar el cursor el panel se abre **encima** del contenido (no lo empuja); botón de contraer abajo a la izquierda | `data-state="collapsed"` + `:hover` en CSS |
| Recurso (dominio) | El menú se desliza a la izquierda: "← Back to Domains", nombre del dominio y su menú (DNS, SSL/TLS, Seguridad, Caché…) | `scopes[type]` + `scope` |
| Recientes | Grupo del sidebar y primera sección de Ctrl K: "ejemplo.cl / DNS", "Dominios" | Guardados por cuenta en localStorage |
| Ctrl K | Modal centrado arriba: input + Esc, "Recientes", "Consejos de búsqueda" (`ask:`, `d1:`…), pie "↑ ↓ para navegar ↵ para seleccionar" | `<dialog>` nativo |
| Barra superior | Solo a la derecha: "Preguntar a la IA", "Asistencia" y el ícono de usuario | `actions` + menú de usuario |
| Menú de usuario | Correo, Perfil, Facturación, Apariencia, Idioma, Zona horaria, Cerrar sesión | `userMenu` + Apariencia integrada |
| Pie | Enlaces separados por barras y "© año" | `footer`, `copyright` |
| Páginas | Título, "Ver documentación", descripción y acciones a la derecha; tablas con borde redondeado | `.as-page-head`, `.as-table`, `.as-btn--primary` |

## Antes de implementar: preguntar (AskUserQuestion)

Una sola llamada con estas preguntas, salvo las que el pedido ya responda (sin preferencia, la opción A):

1. **¿Qué estilo toma?** Antes de preguntar, revisar si la página tiene estilo propio y decirlo. A: **los colores de la
   página** (si los tiene): apuntar cada `--as-*` a sus variables. B: **Neutro del shell** (el que trae `app-shell.css`:
   negro y grises con azul, el más parecido a la referencia; claro/oscuro según el sistema o `data-theme`). C:
   **Predeterminado de claude-tools** (`assets/default-theme/` + `app-shell-tokens.css`; con daltonismo y alto contraste).
   D: **Cálido o Pizarra** (C + `default-theme/estilos/calido.css` o `pizarra.css`). Otra fuente va por "Other".
2. **¿Qué marca y logo?** Revisar si la app ya tiene nombre y archivo de logo y mostrarlos. A: los de la página.
   B: los que indique el usuario. C: sin logo (cuadro con la inicial). Nunca inventar un nombre o logo.
3. **¿Qué es un "recurso" con menú propio?** (el equivalente al dominio) A: ninguno, solo menú de cuenta. B: uno (decir
   cuál: proyecto, sitio, cliente…) con su menú. C: varios tipos. Define `scopes` y cómo se lee `scope` de la ruta.

Sin preguntar, se deduce del proyecto:

| Qué | De dónde | Resultado |
|---|---|---|
| **Cuentas** | Modelo: ¿hay tenants, organizaciones, empresas o membresías? | `accounts` = las del usuario en sesión, del servidor; si solo hay una, igual se usa (el selector muestra una) |
| **Router** | ¿SPA (React Router, Vue Router) o páginas del servidor (Razor, MVC)? | SPA → `navigate` + `update` en cada cambio; servidor → sin `navigate`, `mount` con la ruta de la página en cada carga |
| **Menú** | Rutas y permisos existentes | `nav` con las secciones de la app; esconder lo que el rol no puede ver (el servidor valida igual) |
| **Íconos** | ¿La app ya carga una fuente de íconos? | Usar esa; si no, Phosphor (`@phosphor-icons/web`) |

## Flujo

1. **Copiar** `assets/app-shell.js` y `assets/app-shell.css` a los estáticos (o importarlos desde el bundler).
2. **Estilo** (pregunta 1): A → en el `:root` del sitio apuntar `--as-*` a sus variables (`references/api.md`).
   B → nada más. C/D → copiar `assets/default-theme/`, pegar `head.html` arriba en el `<head>` (reemplazar
   `__STORAGE_KEY__`, `__LEGACY_KEY__`, `__USE_PREF__`) y cargar en orden `theme-tokens.css`, el estilo opcional,
   `app-shell.css` y `app-shell-tokens.css`. La "Apariencia" del menú de usuario usa `window.dtTheme` si existe.
3. **Layout**: un solo `<div id="app">` en el layout común; `AppShell.mount` con cuentas, `nav`, `scopes`, marca,
   usuario, acciones, menú de usuario y pie. Las páginas se pintan en `shell.main` (en Razor: mover `@RenderBody()` a
   un `<template>` y pasarlo a `shell.main`, o montar el shell y luego hacer `shell.main.append(...)` del contenido).
4. **Rutas y cuenta**: la cuenta va en la URL (`/:account/…`), no en la sesión, para que dos pestañas puedan estar en
   cuentas distintas. El servidor valida en cada pedido que el usuario pertenezca a esa cuenta.
5. **Ctrl K**: `searchTips` con los prefijos útiles y `search(q, prefix)` contra el servidor (recursos por nombre).
6. **Verificar**: `node --check` del script y build del proyecto siempre. Revisión en el navegador (Playwright) **solo con
   confirmación previa**: cambiar de cuenta, abrir grupos, contraer y pasar el cursor por el riel, entrar y salir de un
   recurso, Ctrl K con flechas y Enter, claro/oscuro y el cajón en 390 px.

## Principios

- **Plataforma antes que código**: popovers con la Popover API (cierre al hacer clic fuera y con Esc gratis), Ctrl K con
  `<dialog>` (foco atrapado y fondo), vista rápida del riel con `:hover` / `:has(:focus-visible)` / `:has(:popover-open)`
  en CSS, grupos animados con `grid-template-rows: 0fr → 1fr`, vista inactiva y grupos cerrados con `inert`.
- **El hueco y el panel van separados**: `.as-sidebar` reserva el ancho (216 ↔ 56 px) y `.as-panel` es `fixed`; así la
  vista rápida se superpone al contenido sin moverlo, como en la referencia.
- **Un solo estado de ruta**: `update({ account, path, scope })`; el ítem activo es el `href` más largo que coincide y
  sus grupos se abren solos. Los grupos abiertos, el contraído y los recientes (por cuenta) quedan en localStorage.
- **Seguridad**: el menú filtrado por rol es comodidad, no control; el servidor valida cuenta y permisos en cada pedido.

## Errores ya resueltos (no repetir)

- **`replaceChildren(array)`** no expande el array: pinta "[object HTMLElement]". Expandir (`...items`) o filtrar nulos
  antes (el helper `fill`); `undefined` también se pinta como texto.
- **Popover que se cierra al moverse el panel**: en el riel el popover del selector de cuenta vive dentro del panel, y el
  panel queda abierto mientras haya un popover abierto (`:has(:popover-open)`); si no, se cierra bajo el cursor.
- **Anillo de foco dentro de inputs** del popover y de Ctrl K: el `box-shadow` de `:focus-visible` se quita en esos inputs.
- **Contraído en el celular**: las reglas del riel van en `@media (min-width: 769px)`; en móvil el panel es un cajón completo.

## Archivos

| Archivo | Uso |
|---|---|
| `assets/app-shell.js` | `window.AppShell.mount(el, config)` → `{ main, update, state, setCollapsed, openSearch, destroy }` |
| `assets/app-shell.css` | Estilos con tokens `--as-*` (neutro casi negro/gris con azul, claro y oscuro), móvil y movimiento reducido |
| `assets/app-shell-tokens.css` | Alias `--as-*` → `--dt-*` para el estilo compartido |
| `assets/default-theme/` | Estilo compartido de claude-tools (copia de `shared/default-theme/`, no editar aquí) |
| `references/api.md` | Config, nodos del menú, API, eventos, tokens y clases de página |
| `examples/demo/demo.html` | Demo con tres cuentas, dominios como recurso, Ctrl K con `ask:` y `dom:` |
