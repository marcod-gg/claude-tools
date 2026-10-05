# Demo: junta index.html con organigrama.css y organigrama.js en un solo demo.html que abre con doble clic (file://).
# Los módulos ES no cargan desde file://, así que el módulo va dentro de la página sin sus "export".
# Uso: python build.py   (correr de nuevo al cambiar index.html o los assets)
import os, re

here = os.path.dirname(os.path.abspath(__file__))
assets = os.path.normpath(os.path.join(here, '..', '..', 'assets'))
read = lambda p: open(p, encoding='utf-8-sig').read()

html = read(os.path.join(here, 'index.html'))
css = read(os.path.join(assets, 'organigrama.css'))
js = re.sub(r'^export ', '', read(os.path.join(assets, 'organigrama.js')), flags=re.M).replace('</script', '<\\/script')

link = '<link rel="stylesheet" href="../../assets/organigrama.css">'
imp = re.search(r"^\s*import \{[^}]+\} from '\.\./\.\./assets/organigrama\.js';\n", html, re.M)
assert link in html and imp, 'index.html cambió: revisar el <link> del CSS y el import del módulo'
html = html.replace(link, f'<style>\n{css}\n</style>')
html = html.replace(imp.group(0), f'\n{js}\n')
html = re.sub(r'<!-- Servir esta carpeta por HTTP.*?-->\n', '<!-- Generado por build.py desde index.html y los assets: no editar a mano. -->\n', html, flags=re.S)

open(os.path.join(here, 'demo.html'), 'w', encoding='utf-8', newline='\n').write(html)
print('demo.html listo')
