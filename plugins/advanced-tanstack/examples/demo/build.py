# Demo: junta el build de Vite con el tema por defecto de la skill (default-theme + alias --c-*) en un solo HTML.
# Uso: python build.py <carpeta del build de Vite>   (ver README.md)
import os, sys

here = os.path.dirname(os.path.abspath(__file__))
sk = os.path.normpath(os.path.join(here, '..', '..', 'assets'))   # assets de la skill en este repo
build = sys.argv[1] if len(sys.argv) > 1 else os.path.join(here, 'build')
read = lambda p: open(p, encoding='utf-8-sig').read()

theme = read(f'{sk}/default-theme/theme-tokens.css')
alias = read(f'{sk}/dataviews-tokens.css')
head = read(f'{sk}/default-theme/head.html')
head = head[head.index('<script>'):].replace('__STORAGE_KEY__', 'flota-a11y').replace('__LEGACY_KEY__', '').replace('__USE_PREF__', 'true')
css = read(f'{build}/dataviews.css')
js = read(f'{build}/dataviews.js').replace('</script', '<\\/script')

page_css = """
html { scrollbar-gutter: stable; }
body { margin: 0; }
#board-screen { max-width: 1600px; margin: 0 auto; padding: 28px 24px 48px; background: var(--dt-bg); }
#board-screen:fullscreen { max-width: none; overflow: auto; padding: 1rem 1.25rem; }
.fl-head { display: flex; align-items: flex-end; justify-content: space-between; gap: 16px; flex-wrap: wrap; margin-bottom: 20px; }
.fl-head h1 { margin: 0 0 4px; font-size: 1.5rem; color: var(--dt-text); }
.fl-head p { margin: 0; color: var(--dt-text-muted); }
@media (max-width: 600px) { #board-screen { padding: 16px 16px 32px; } }
"""

html = f"""<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Mantenciones de flota</title>
{head}
<link rel="preconnect" href="https://fonts.googleapis.com">
<link href="https://fonts.googleapis.com/css2?family=Roboto:wght@400;500;600;700&family=Roboto+Mono&display=swap" rel="stylesheet">
<link href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css" rel="stylesheet">
<style>
{theme}
{alias}
{css}
{page_css}
</style>
</head>
<body>
<div id="board-screen">
  <div class="fl-head">
    <div>
      <h1>Mantenciones de flota</h1>
      <p>Demo de DataViews · 140 mantenciones de prueba · solo lectura</p>
    </div>
    <div id="dv-style"></div>
  </div>
  <div id="dataviews-root"></div>
</div>
<script type="module">
{js}
</script>
</body>
</html>
"""
out = os.path.join(here, 'demo.html')
open(out, 'w', encoding='utf-8').write(html)
print(out)
