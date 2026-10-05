# Revisa el contraste WCAG de los estilos de shared/default-theme (predeterminado y estilos/*.css).
# Uso: python scripts/check-contrast.py   → sale con código 1 si algún par no cumple.
import glob, os, re, sys

root = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'shared', 'default-theme')
BLOCKS = {  # selector con el que empieza el bloque → nombre
    ':root, .dt-thp[data-theme="light"]': 'claro',
    ':root[data-theme="dark"], .dt-thp[data-theme="dark"]': 'oscuro',
    ':root[data-theme="light"][data-contrast="high"], .dt-thp[data-theme="light"][data-contrast="high"]': 'claro AAA',
    ':root[data-theme="dark"][data-contrast="high"], .dt-thp[data-theme="dark"][data-contrast="high"]': 'oscuro AAA',
}
# (texto, fondo); fondo '#ffffff' = texto blanco sobre un relleno
PAIRS = [('text', 'surface'), ('text-body', 'bg'), ('text-muted', 'surface'), ('text-muted', 'bg'), ('text-muted', 'surface-2'),
         ('text-faint', 'surface'), ('brand', 'surface'), ('brand', 'bg'), ('brand', 'brand-subtle'),
         ('state-canceled', 'surface'), ('state-canceled', 'state-canceled-bg')]
WHITE_ON = ['brand-emphasis', 'logo-bg']

def lum(h):
    h = h.lstrip('#'); r, g, b = (int(h[i:i + 2], 16) / 255 for i in (0, 2, 4))
    f = lambda c: c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
    return 0.2126 * f(r) + 0.7152 * f(g) + 0.0722 * f(b)

def ratio(a, b):
    x, y = sorted([lum(a), lum(b)]); return (y + .05) / (x + .05)

def blocks(path):
    css = open(path, encoding='utf-8-sig').read()
    out = {}
    for sel, name in BLOCKS.items():
        i = css.find(sel + ' {')
        if i < 0: continue
        body = css[i:css.index('}', i)]
        out[name] = dict(re.findall(r'--dt-([\w-]+):\s*(#[0-9a-fA-F]{6})', body))
    return out

base = blocks(os.path.join(root, 'theme-tokens.css'))
fails = 0
for path in [os.path.join(root, 'theme-tokens.css')] + sorted(glob.glob(os.path.join(root, 'estilos', '*.css'))):
    style = os.path.basename(path)
    for name, own in blocks(path).items():
        # alto contraste hereda del modo base: predeterminado → estilo → su bloque AAA
        mode = name.replace(' AAA', '')
        t = {**base.get(mode, {}), **(blocks(path).get(mode, {}) if name != mode else {}), **(base.get(name, {}) if path.endswith('theme-tokens.css') else {}), **own}
        need = 7 if 'AAA' in name else 4.5
        checks = [(a, b, t.get(a), t.get(b)) for a, b in PAIRS] + [('#fff', c, '#ffffff', t.get(c)) for c in WHITE_ON]
        for a, b, ca, cb in checks:
            if not ca or not cb: continue
            r = ratio(ca, cb)
            if r < need:
                fails += 1; print(f'FALLA {style:18} {name:10} {a} sobre {b}: {r:.2f} (mín. {need})')
print('Contraste OK' if not fails else f'{fails} pares no cumplen')
sys.exit(1 if fails else 0)
