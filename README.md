# claude-tools

Skills propias para Claude Code, publicadas como marketplace de plugins.

| Plugin | Qué hace |
|---|---|
| `advanced-tanstack` | Tablas de datos con TanStack Table (React + Vite): vistas guardadas tipo Notion, tabla, tablero kanban y tarjetas, filtros y/o con grupos, segmentos, orden personalizado arrastrando, descarga Excel/PDF y estilo por espacio de trabajo. Ejemplo en [`plugins/advanced-tanstack/examples/demo/`](plugins/advanced-tanstack/examples/demo/). |

## Instalar

```bash
claude plugin marketplace add marcod-gg/claude-tools
claude plugin install advanced-tanstack@claude-tools
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
3. Validar: `claude plugin validate plugins/<nombre>` y `claude plugin validate .`

Al cambiar una skill, subir su `version` en `plugin.json`: quien la tiene instalada sigue en su versión hasta que cambia.
