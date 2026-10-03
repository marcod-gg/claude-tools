# Demo

Ejemplo completo de la skill aplicada desde cero: mantenciones de flota (140 registros de prueba), solo lectura, con
los tres diseños, todas las herramientas, Estilo por vista (menú «…»), pantalla completa y el tema por defecto
(`assets/default-theme/`). Respuestas usadas en las preguntas de la skill: no se mueven registros; tema por defecto.

| Archivo | Qué es |
|---|---|
| `demo.html` | La demo armada en un solo archivo: abrir en el navegador (los íconos y la fuente vienen de CDN) |
| `main.tsx` | El montaje: esquema (`FIELDS`), alcances, `load`, vistas iniciales y props de `<DataViews>` |
| `build.py` | Junta el build de Vite con el tema por defecto y la página en `demo.html` |

## Regenerar `demo.html`

Desde `plugins/advanced-tanstack/`:

```bash
mkdir -p /tmp/dv && cp -r assets/package.json assets/vite.config.ts assets/tsconfig.json assets/src /tmp/dv/
cp examples/demo/main.tsx /tmp/dv/src/main.tsx
cd /tmp/dv && sed -i 's/__APP__/demo/' package.json && npm install && npx tsc --noEmit && npx vite build --outDir /tmp/dv/build
cd - && python examples/demo/build.py /tmp/dv/build
```
