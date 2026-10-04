# API de `organigrama.js`

Módulo ES sin dependencias. Importar desde donde se copie (`wwwroot/js/organigrama.js`, `src/organigrama.js`…):

```js
import { organigramaPersonas, organigramaEquipos, arbolEquipos, visorOrganigrama } from './organigrama.js';
```

Requisitos en la página: `organigrama.css` y la fuente de íconos Phosphor (`<script src="https://cdn.jsdelivr.net/npm/@phosphor-icons/web@2.1.1"></script>`),
o pasar `icono` propio en las opciones.

## Datos

| Tipo | Forma | Notas |
|---|---|---|
| Persona | `{ id, nombre, cargo?, jefeId?, email?, etiqueta? }` | `jefeId` es el `id` de otra persona. `etiqueta` se muestra si no hay cargo (p. ej. el rol). `nombre`, `cargo` y `email` alimentan el buscador |
| Equipo | `{ id, nombre, padreId?, tipo?: 'area' \| 'transversal', integrantes: [idPersona] }` | `integrantes` son los directos; los heredados se calculan |

Pasar solo las personas a mostrar (p. ej. las activas). La jefatura cuenta si la jefa está en el mismo conjunto: así el mismo
componente sirve para toda la empresa y para el organigrama interno de un equipo.

## `organigramaPersonas(personas, opciones)` → `HTMLElement`

Árbol por jefatura. Quienes no tienen jefatura ni reportes en el conjunto van en "Sin jefatura asignada" (como pares);
si nadie tiene jefatura, todos van como "Integrantes" con una ayuda.

| Opción | Uso |
|---|---|
| `onPersona(persona)` | Clic en una persona (abrir su ficha en panel o modal). Sin esto los nodos no son clicables |
| `icono(nombre)` | Fábrica de íconos (por defecto Phosphor: `<i class="ph ph-{nombre}">`) |
| `vacio` | Texto si no hay personas |
| `ayudaSinJefaturas` | Texto cuando nadie tiene jefatura |

## `organigramaEquipos(equipos, opciones)` → `HTMLElement`

Árbol de áreas (equipos con `tipo !== 'transversal'`, sus raíces y descendientes) y los transversales aparte, en tarjetas.
Cada nodo muestra personas (con subequipos) y cantidad de subequipos.

| Opción | Uso |
|---|---|
| `hrefEquipo(equipo)` | El nodo es un enlace (p. ej. a la página del equipo) |
| `onEquipo(equipo)` | El nodo es un botón (si no hay `hrefEquipo`) |
| `icono`, `vacio` | Igual que arriba |

## `arbolEquipos(equipos)`

`{ porId, hijos, raices, orden, debajo(id), integrantes(id), ruta(id) }`:
`integrantes(id)` = `Set` de ids directos y de todos los subequipos (para el organigrama interno de un equipo);
`ruta(id)` = equipos desde la raíz (migas de pan); `orden` = `{ g, nivel }` en profundidad (selects con sangría).

## `visorOrganigrama(contenido, opciones)` → `HTMLElement`

Envuelve cualquiera de los anteriores.

| Opción | Uso |
|---|---|
| `nombre` | Empresa o "Equipo · Empresa"; va en la marca y en el nombre del archivo |
| `eyebrow` | Línea superior de la marca (`'Organigrama'` por defecto; p. ej. `'Organigrama de equipos'`) |
| `firma` | `['Producto', 'Marca']` → "por Producto · Marca" en la marca de agua. Sin firma, solo eyebrow y nombre |
| `avisar(texto)` | Errores de descarga (por defecto `console.error`) |
| `icono` | Igual que arriba |

Herramientas: buscador (resalta y centra; Enter / Shift+Enter), zoom −/+ con porcentaje, Ajustar al ancho, Tamaño real,
Ctrl+rueda y teclas `+ - 0` con el lienzo enfocado, arrastre con el mouse, pantalla completa, Descargar (todo: PNG o PDF;
una parte: nodo + Descendente | Ascendente [+ Incluir pares] + "Descargar como" PNG/PDF; Esc cancela).

La copia exportada se monta fuera de pantalla en `.orgv.orgv--export`; el PDF la imprime con `#org-impresion` y
`body.org-imprimiendo` (reglas `@media print` en el CSS). El nombre del archivo es `"<eyebrow> <nombre>[ - <parte>]"`.

## Tokens CSS (`organigrama.css`)

Por defecto en `:where(:root)` (especificidad cero) con modo oscuro. El sitio los apunta a su marca:

```css
:root {
  --org-bg: var(--bg); --org-surface: var(--surface); --org-hover: var(--cream); --org-line: var(--line);
  --org-ink: var(--ink); --org-ink-2: var(--ink-2); --org-muted: var(--muted);
  --org-accent: var(--accent); --org-on-accent: var(--on-accent);
  --org-radius: var(--radius); --org-shadow: var(--shadow); --org-mono: "Geist Mono", monospace;
}
```

Revisar contraste ≥ 4.5:1 de `--org-muted`, `--org-accent` y `--org-ink-2` sobre `--org-surface` y `--org-bg` en ambos modos.
