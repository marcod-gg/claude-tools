# Estilo compartido (default-theme)

Estilo predeterminado de todas las skills de este repo (`vistas-de-datos`, `organigrama` y las que vengan), sin marca:
neutros grises y azul genérico, con claro, oscuro, daltonismo (protanopía/deuteranopía y tritanopía), alto contraste AAA y
fuente/tamaño elegibles. Además hay dos estilos opcionales, que solo cambian neutros, marca y acentos:

| Estilo | Archivo | Paleta |
|---|---|---|
| **Predeterminado** | `theme-tokens.css` | Grises neutros y azul (`#0969DA`) |
| Cálido | `estilos/calido.css` | Arena y terracota (`#A6461F`) |
| Pizarra | `estilos/pizarra.css` | Gris pizarra y verde azulado (`#0F766E`) |

| Archivo | Qué es |
|---|---|
| `theme-tokens.css` | Tokens `--dt-*` (neutros, marca, semánticos, estados, fuente, forma) en todos los modos |
| `head.html` | Script del `<head>`: aplica tema, visión, contraste, fuente y tamaño antes del primer pintado |
| `estilos/*.css` | Estilos opcionales: cargar **después** de `theme-tokens.css` |

## Cómo se usa en una skill

1. La skill lleva una copia en `plugins/<skill>/assets/default-theme/` (un plugin se instala solo con su carpeta).
   **No editar las copias**: editar aquí y correr `python scripts/sync-default-theme.py`.
2. La skill mapea sus tokens propios a `--dt-*` en un archivo de alias (p. ej. `--c-*` en `dataviews-tokens.css`,
   `--org-*` en `organigrama-tokens.css`).
3. Al implementar, la skill **pregunta qué estilo toma**: los colores de la página donde se despliega (si tiene los suyos),
   el predeterminado, Cálido o Pizarra (u otra fuente que indique el usuario). Y por separado, la **marca y el logo**: los
   que ya tiene la página o los que indique el usuario; nunca inventados.
4. Con la marca de una app: sobrescribir `--dt-brand*`, `--dt-accent*` y `--dt-logo-bg` en un CSS propio cargado al final.

## Agregar un estilo

Copiar `estilos/pizarra.css`, cambiar los valores de los cuatro bloques (claro, oscuro, claro AAA, oscuro AAA) y correr
`python scripts/check-contrast.py` (texto ≥ 4.5:1, alto contraste ≥ 7:1, texto blanco sobre los rellenos) y luego
`python scripts/sync-default-theme.py`. Sumarlo a la tabla de arriba y a la pregunta de estilo de cada skill.
