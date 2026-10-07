# API de `app-shell.js`

Script clásico sin dependencias (abre desde `file://` y no necesita bundler). Expone `window.AppShell`:

```html
<link rel="stylesheet" href="app-shell.css">
<script src="app-shell.js"></script>
<script>
  const shell = AppShell.mount(document.getElementById('app'), config);
  shell.main.replaceChildren(miPagina);          // la app pinta su contenido en shell.main
  addEventListener('popstate', () => shell.update({ path: location.pathname, scope: scopeDe(location.pathname) }));
</script>
```

Con bundler: `import './app-shell.js'` y usar `window.AppShell`. Íconos de los ítems: clase de una fuente de íconos
(`'ph ph-house'` con Phosphor) o un `<svg>` como string. Los íconos propios del shell (chevron, búsqueda, etc.) van incluidos.

## Config

| Clave | Uso |
|---|---|
| `accounts` | `[{ id, name, org? }]`. Requerida. El selector y Ctrl K buscan por `name` |
| `account` | Id de la cuenta actual. `null` → página **Cuentas** (selector) en `main` y sin sidebar |
| `path` | Ruta actual tal como aparecen los `href` (pathname o `#/…`). Marca el ítem activo y abre sus grupos |
| `scope` | Recurso abierto, `{ type, id, label? }` (p. ej. un dominio) o `null`. Desliza el sidebar a `scopes[type]` |
| `nav` | Árbol de la cuenta (ver Nodos). Los `href` pueden llevar `:account` y `:scope` |
| `scopes` | `{ [type]: { nav, back: { label, href } } }`: menú propio del recurso y la fila "← Volver a …" |
| `accountHome` | Destino al cambiar de cuenta (por defecto `'/:account/home'`) |
| `onAccount(id)` | Reemplaza la navegación por defecto al cambiar de cuenta (p. ej. llamar al servidor antes) |
| `onCreateAccount()` | Muestra "Crear cuenta" en el selector y en la página Cuentas |
| `navigate(href)` | Router SPA: los enlaces del shell y Ctrl K lo llaman en vez de recargar. Sin esto, enlaces normales |
| `brand` | `{ name, logo?, href? }`. Sin `logo`, un cuadro con la inicial del nombre |
| `user` | `{ email }`: va en la página Cuentas y arriba del menú de usuario |
| `actions` | Botones de la barra superior: `[{ label, icon?, href? \| onClick? }]` (en móvil, solo el ícono) |
| `userMenu` | `[{ label, icon?, href? \| onClick?, danger? } \| { separator: true }]`. "Apariencia" (Claro/Oscuro/Sistema) va siempre arriba |
| `searchTips` | Prefijos de Ctrl K: `[{ prefix: 'ask:', label: 'Preguntar a la IA', icon? }]` |
| `search(q, prefix)` | Resultados del servidor (Promise o array) `[{ label, hint?, icon?, href? \| onSelect? }]`. `prefix` es el del consejo usado o `null` |
| `searchLabel` | Título del grupo de resultados de `search` (por defecto "Recursos") |
| `footer`, `copyright` | Enlaces del pie `[{ label, href }]` y texto final |
| `storageKey` | Prefijo en localStorage (uno por app): contraído, grupos abiertos, recientes por cuenta y tema |
| `recentsMax` | Recientes por cuenta (5) |
| `t` | Textos a reemplazar (ver `T` al inicio del script): `{ search: 'Quick search...', … }` |

### Nodos de `nav`

| Forma | Qué es |
|---|---|
| `{ label, icon, href, badge? }` | Enlace. `badge`: "Nuevo", "Beta" |
| `{ label, icon, children: [...] }` | Grupo desplegable (botón con chevron). Hasta tres niveles; el ícono solo en el primero |
| `{ recents: true, label, icon? }` | Grupo "Recientes": las últimas páginas de la cuenta ("ejemplo.cl / Registros") |
| `{ section: 'Desarrollo' }` | Título de sección. En el riel se ve como una línea |
| `{ separator: true }` | Línea divisoria |
| `id?` | Clave estable del nodo para recordar si está abierto (por defecto `label`) |
| `recent: false` | La página no entra a Recientes |

## API devuelta

| Miembro | Uso |
|---|---|
| `main` | `<main id="as-main">` donde la app pinta la página (el shell solo lo usa para la página Cuentas) |
| `update(parcial)` | Cambia `account`, `path` y/o `scope` y repinta: activo, recientes, vista deslizante, selector. Llamarla en cada cambio de ruta |
| `state` | `{ account, path, scope, collapsed }` |
| `setCollapsed(bool)`, `openSearch()`, `destroy()` | Contraer/expandir, abrir Ctrl K, desmontar (quita el atajo global) |

Eventos (`CustomEvent` en el elemento montado): `as:account` `{ id }` y `as:collapse` `{ collapsed }`.

## Tokens `--as-*`

| Token | Uso |
|---|---|
| `--as-bg`, `--as-surface` | Fondo de página/sidebar; tarjetas, popovers, buscador |
| `--as-hover`, `--as-active` | Fila al pasar el cursor; ítem activo y opción marcada |
| `--as-line`, `--as-line-strong` | Bordes; bordes de botones, `kbd` e insignias |
| `--as-ink`, `--as-ink-2`, `--as-muted` | Títulos y activo; texto normal; secundario (≥ 4.5:1) |
| `--as-brand`, `--as-brand-bg`, `--as-on-brand` | Acento de texto; botón primario; texto sobre él |
| `--as-danger`, `--as-focus`, `--as-shadow`, `--as-backdrop` | Cerrar sesión; anillo de foco; sombra; fondo de Ctrl K y del cajón móvil |
| `--as-font`, `--as-r`, `--as-r-lg` | Fuente; radios |
| `--as-w`, `--as-rail`, `--as-top` | Ancho del sidebar (216 px), del riel (56 px) y alto de la barra superior (48 px) |

## Clases para las páginas

`.as-page` (contenedor de 1200 px) · `.as-page-head` (título + descripción a la izquierda, acciones a la derecha) ·
`.as-h1` · `.as-btn` / `.as-btn--primary` · `.as-input-wrap` + `.as-input` · `.as-table` · `.as-muted`.
