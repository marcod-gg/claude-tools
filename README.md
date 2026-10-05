# claude-tools

Skills propias para Claude Code, publicadas como marketplace de plugins.

| Plugin | Qué hace |
|---|---|
| `advanced-tanstack` | Tablas de datos con TanStack Table (React + Vite): vistas guardadas tipo Notion, tabla, tablero kanban y tarjetas, filtros y/o con grupos, segmentos, orden personalizado arrastrando, descarga Excel/PDF y estilo por espacio de trabajo. Ejemplo en [`plugins/advanced-tanstack/examples/demo/`](plugins/advanced-tanstack/examples/demo/). |
| `organigrama` | Organigramas interactivos sin dependencias: por jefatura directa, de equipos anidados (áreas y transversales) e interno por equipo. Marca de agua, zoom, buscador, arrastre, pantalla completa y descarga PNG/PDF de todo o de una parte (descendente, ascendente, con pares). Modelo opcional Postgres/Supabase. Ejemplo en [`plugins/organigrama/examples/demo/`](plugins/organigrama/examples/demo/). |

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
claude plugin install advanced-tanstack@claude-tools
claude plugin install organigrama@claude-tools
```

Para un proyecto concreto, agregar `--scope project` (queda en su `.claude/settings.json`).

## Actualizar

```bash
claude plugin marketplace update claude-tools
```

Para que se actualice solo: `claude plugin marketplace enable-auto-update claude-tools`.

## Agregar una skill nueva

1. Crear `plugins/<nombre>/.claude-plugin/plugin.json` (nombre, descripción, versión) y su `SKILL.md`.
2. Sumarla a `plugins` en `.claude-plugin/marketplace.json`.
3. Si tiene interfaz: crear `plugins/<nombre>/assets/default-theme/`, correr `python scripts/sync-default-theme.py`, mapear
   sus tokens a `--dt-*` en un archivo de alias y agregar a su `SKILL.md` las preguntas de estilo y de marca/logo
   (ver `shared/default-theme/README.md`). Sin marca propia: nada de nombres, colores ni logos de una empresa.
4. Validar: `claude plugin validate plugins/<nombre>` y `claude plugin validate .`

Al cambiar una skill, subir su `version` en `plugin.json`: quien la tiene instalada sigue en su versión hasta que cambia.
