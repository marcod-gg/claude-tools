# claude-tools

Skills propias para Claude Code, publicadas como marketplace de plugins.

| Plugin | Qué hace |
|---|---|
| `vistas-de-datos` | Tablas de datos con TanStack Table (React + Vite): vistas guardadas tipo Notion, tabla, tablero kanban y tarjetas, filtros y/o con grupos, segmentos, orden personalizado arrastrando, descarga Excel/PDF y estilo por espacio de trabajo. Ejemplo en [`plugins/vistas-de-datos/examples/demo/`](plugins/vistas-de-datos/examples/demo/). |
| `organigrama` | Organigramas interactivos sin dependencias: por jefatura directa, de equipos anidados (áreas y transversales) e interno por equipo. Marca de agua, zoom, buscador, arrastre, pantalla completa y descarga PNG/PDF de todo o de una parte (descendente, ascendente, con pares). Modelo opcional Postgres/Supabase. Ejemplo en [`plugins/organigrama/examples/demo/`](plugins/organigrama/examples/demo/). |
| `consola-multicuenta` | Estructura de consola multicuenta al estilo del dashboard de Cloudflare, sin dependencias: página para elegir cuenta, selector de cuenta en el sidebar, grupos desplegables, riel de íconos con vista rápida al pasar el cursor, menú que se desliza al entrar a un recurso, recientes, búsqueda Ctrl K y menú de usuario. Ejemplo en [`plugins/consola-multicuenta/examples/demo/`](plugins/consola-multicuenta/examples/demo/). |
| `accesibilidad` | Accesibilidad de apps web de la auditoría a la verificación: Playwright + axe en las 12 combinaciones de tema (daltonismo, alto contraste), skip link, título y foco al cambiar de ruta en SPAs, foco con el contraste de Windows, reflow a 320 px con letra al 150 %, página Accesibilidad estilo GitHub, CSS base y conversión de px a rem. Fallos reales y su arreglo en [`plugins/accesibilidad/references/patrones.md`](plugins/accesibilidad/references/patrones.md). |
| `parrilla-widgets` | Parrilla de widgets personalizable sin dependencias: 12 columnas con filas cuadradas, mover arrastrando con animación FLIP y espacio de destino, estirar desde la esquina (doble clic: alto automático), teclado, bandeja de widgets para agregar con clic o arrastre, zona para quitar, autodesplazamiento y una columna en el celular. Ejemplo en [`plugins/parrilla-widgets/examples/demo/`](plugins/parrilla-widgets/examples/demo/). |
| `ancho-ajustable` | Columnas de tabla con ancho ajustable: arrastrar el borde del encabezado, doble clic para ajustar al contenido (texto, chips e íconos), cursor fijo y línea de acento, y anchos guardados. Script sin dependencias para cualquier `<table>` y receta para TanStack Table. Ejemplo en [`plugins/ancho-ajustable/examples/demo/`](plugins/ancho-ajustable/examples/demo/). |

## Estilo compartido

Todas las skills usan el mismo estilo predeterminado, sin marca (grises neutros y azul, con claro, oscuro, daltonismo y
alto contraste), y dos opcionales: **Cálido** (arena y terracota) y **Pizarra** (gris pizarra y verde azulado). Al
implementar, cada skill pregunta qué estilo toma (los colores de la página donde se despliega, el predeterminado o uno de
los opcionales) y qué marca y logo lleva (los de la página o los que indique el usuario). Fuente única en
[`shared/default-theme/`](shared/default-theme/); cada plugin lleva una copia en `assets/default-theme/`.

```bash
python scripts/check-contrast.py        # contraste WCAG de los tres estilos
python scripts/sync-default-theme.py    # copia shared/default-theme/ a cada plugin (--check solo revisa)
```

## Instalar

```bash
claude plugin marketplace add marcod-gg/claude-tools
claude plugin install vistas-de-datos@claude-tools
claude plugin install organigrama@claude-tools
claude plugin install consola-multicuenta@claude-tools
claude plugin install accesibilidad@claude-tools
claude plugin install parrilla-widgets@claude-tools
claude plugin install ancho-ajustable@claude-tools
```

Para un proyecto concreto, agregar `--scope project` (queda en su `.claude/settings.json`).

## Actualizar

```bash
claude plugin marketplace update claude-tools
```

Para que se actualice solo: `claude plugin marketplace enable-auto-update claude-tools`.

### Nombres anteriores

Dos plugins cambiaron de nombre. Si los tienes instalados con el nombre viejo, desinstálalos e instala el nuevo:

| Antes | Ahora |
|---|---|
| `advanced-tanstack` | `vistas-de-datos` |
| `cloudflare-like-layout` | `consola-multicuenta` |

```bash
claude plugin marketplace update claude-tools
claude plugin uninstall advanced-tanstack@claude-tools
claude plugin uninstall cloudflare-like-layout@claude-tools
claude plugin install vistas-de-datos@claude-tools
claude plugin install consola-multicuenta@claude-tools
```

## Agregar una skill nueva

1. Crear `plugins/<nombre>/.claude-plugin/plugin.json` (nombre, descripción, versión) y su `SKILL.md`.
2. Sumarla a `plugins` en `.claude-plugin/marketplace.json`.
3. Si tiene interfaz: crear `plugins/<nombre>/assets/default-theme/`, correr `python scripts/sync-default-theme.py`, mapear
   sus tokens a `--dt-*` en un archivo de alias y agregar a su `SKILL.md` las preguntas de estilo y de marca/logo
   (ver `shared/default-theme/README.md`). Sin marca propia: nada de nombres, colores ni logos de una empresa.
4. Validar: `claude plugin validate plugins/<nombre>` y `claude plugin validate .`

**Nombre:** en kebab-case y en español, de 1 a 3 palabras, y que diga lo que entrega, no la librería que usa ni la marca
que imita (`vistas-de-datos`, no `advanced-tanstack`). Es el mismo en la carpeta, en `plugin.json`, en el `name` del
`SKILL.md` y en `marketplace.json`.

**Descripción del `SKILL.md`:** como máximo 1024 caracteres, en este orden: qué entrega (una frase), las piezas clave,
"Antes de implementar pregunta…" (solo los temas; el detalle va en el cuerpo) y "Úsala cuando el usuario pida…, aunque
no nombre esta skill".

Al cambiar una skill, subir su `version` en `plugin.json`: quien la tiene instalada sigue en su versión hasta que cambia.
