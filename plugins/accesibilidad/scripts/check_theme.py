#!/usr/bin/env python3
"""
Verifica un CSS de tokens (default-theme/theme-tokens.css o los tokens propios del proyecto):

  1. Resuelve la cascada de bloques :root[data-theme][data-vision][data-contrast] para las 12
     combinaciones (claro/oscuro × estándar/protan-deutan/tritan × contraste estándar/alto).
  2. Contraste WCAG de cada par texto/fondo: ≥ 4.5:1 (AA) o ≥ 7:1 con alto contraste (AAA).
  3. Distinción entre colores de estado simulando protanopía, deuteranopía y tritanopía
     (Machado et al. 2009) → ΔE mínimo entre pares; en los temas de daltonismo se exige ≥ 10.
     Si la app no define <prefix>-state-*, compara los semánticos (success, warning, danger): son los que
     cambian los temas de daltonismo, y antes quedaban sin revisar ("sin estados").

Uso:
  python check_theme.py ruta/theme-tokens.css                 # prefijo dt (default-theme)
  python check_theme.py src/tokens.css --prefix app            # tokens propios --app-text, --app-surface…
  python check_theme.py src/tokens.css --prefix app --states app-st-nuevo,app-st-listo,app-st-cancelado

Sale con código 1 si algo no cumple (útil en CI). Solo usa la biblioteca estándar.
"""
import argparse, itertools, math, re, sys
sys.stdout.reconfigure(encoding="utf-8")  # consola de Windows (cp1252) no imprime Δ ni ·

MACHADO = {
    'normal': [[1, 0, 0], [0, 1, 0], [0, 0, 1]],
    'protan': [[0.152286, 1.052583, -0.204868], [0.114503, 0.786281, 0.099216], [-0.003882, -0.048116, 1.051998]],
    'deutan': [[0.367322, 0.860646, -0.227968], [0.280085, 0.672501, 0.047413], [-0.011820, 0.042940, 0.968881]],
    'tritan': [[1.255528, -0.076749, -0.178779], [-0.078411, 0.930809, 0.147602], [0.004733, 0.691367, 0.303900]],
}


def parse_blocks(css):
    css = re.sub(r'/\*.*?\*/', '', css, flags=re.S)
    blocks = []
    for order, m in enumerate(re.finditer(r'([^{}]+)\{([^{}]*)\}', css)):
        sels = [s.strip() for s in m.group(1).split(',')]
        decls = dict(re.findall(r'(--[\w-]+)\s*:\s*([^;]+);', m.group(2)))
        if not decls:
            continue
        for sel in sels:
            if not sel.startswith(':root'):
                continue
            rest = sel[len(':root'):]
            attrs = dict(re.findall(r'\[data-([\w-]+)="([^"]*)"\]', rest))
            if re.sub(r'\[data-[\w-]+="[^"]*"\]', '', rest).strip():
                continue  # :root con otra cosa (descendientes, :not…): no son tokens
            blocks.append((len(attrs), order, attrs, decls))
    return blocks


def resolve(blocks, env):
    out = {}
    for _, _, attrs, decls in sorted(b for b in blocks if all(env.get(k) == v for k, v in b[2].items())):
        out.update(decls)
    return out


def hexrgb(v):
    v = v.strip().lower()
    m = re.fullmatch(r'#([0-9a-f]{3}|[0-9a-f]{6})', v)
    if not m:
        return None
    h = m.group(1)
    if len(h) == 3:
        h = ''.join(c * 2 for c in h)
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def lin(c):
    c /= 255
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def lum(rgb):
    r, g, b = (lin(c) for c in rgb)
    return 0.2126 * r + 0.7152 * g + 0.0722 * b


def contrast(a, b):
    la, lb = sorted((lum(a), lum(b)), reverse=True)
    return (la + 0.05) / (lb + 0.05)


def lab(rgb_lin):
    r, g, b = rgb_lin
    x = (0.4124 * r + 0.3576 * g + 0.1805 * b) / 0.95047
    y = 0.2126 * r + 0.7152 * g + 0.0722 * b
    z = (0.0193 * r + 0.1192 * g + 0.9505 * b) / 1.08883
    f = lambda t: t ** (1 / 3) if t > 0.008856 else 7.787 * t + 16 / 116
    return (116 * f(y) - 16, 500 * (f(x) - f(y)), 200 * (f(y) - f(z)))


def simulate(rgb, kind):
    r = [lin(c) for c in rgb]
    m = MACHADO[kind]
    return lab([max(0.0, min(1.0, sum(m[i][j] * r[j] for j in range(3)))) for i in range(3)])


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('css')
    ap.add_argument('--prefix', default='dt', help="prefijo de los tokens (dt → --dt-text, --dt-surface…)")
    ap.add_argument('--states', help='tokens de estado separados por coma (sin --). Por defecto: <prefix>-state-* o, si no hay, los semánticos')
    ap.add_argument('--min-de', type=float, default=10.0, help='ΔE mínimo entre estados en temas de daltonismo')
    a = ap.parse_args()

    css = open(a.css, encoding='utf-8-sig').read()
    blocks = parse_blocks(css)
    P = f'--{a.prefix}-'
    states = [f'--{s}' for s in a.states.split(',')] if a.states else None

    problems = 0
    print(f'Archivo: {a.css}\n')
    for theme, vision, contr in itertools.product(('light', 'dark'), ('default', 'colorblind', 'tritanopia'), ('default', 'high')):
        t = resolve(blocks, {'theme': theme, 'vision': vision, 'contrast': contr})
        get = lambda n: hexrgb(t.get(n, ''))
        surface, bg = get(P + 'surface'), get(P + 'bg')
        if not surface:
            print(f'[{theme}/{vision}/{contr}] sin {P}surface; se omite'); problems += 1; continue
        need = 7.0 if contr == 'high' else 4.5
        fails = []
        pairs = [(P + n, surface, need) for n in ('text', 'text-body', 'text-muted', 'brand', 'success', 'warning', 'danger', 'info')]
        pairs += [(P + n, bg, need) for n in ('text', 'text-muted') if bg]
        pairs += [(P + 'text-faint', surface, 7.0 if contr == 'high' else 3.0)]
        st_names = states or sorted(k for k in t if k.startswith(P + 'state-') and not k.endswith('-bg'))
        semanticos = not st_names
        if semanticos:   # sin estados propios: que éxito, aviso y peligro se distingan (info es azul como éxito a propósito)
            st_names = [P + n for n in ('success', 'warning', 'danger') if get(P + n)]
        pairs += [(n, surface, need) for n in st_names]
        worst = None
        for name, against, req in pairs:
            c = get(name)
            if not c:
                continue
            r = contrast(c, against)
            worst = r if worst is None else min(worst, r)
            if r < req:
                fails.append(f'{name} {r:.1f}:1 < {req}:1')
        emph = get(P + 'brand-emphasis')
        if emph and contrast((255, 255, 255), emph) < need:
            fails.append(f'blanco sobre {P}brand-emphasis {contrast((255, 255, 255), emph):.1f}:1 < {need}:1')
        # Distinción de estados (sin "cancelado"/gris si lo hubiera, se incluye igual: debe distinguirse)
        cols = {n: get(n) for n in st_names if get(n)}
        min_de, pair = 1e9, None
        for (n1, c1), (n2, c2) in itertools.combinations(cols.items(), 2):
            for kind in MACHADO:
                d = math.dist(simulate(c1, kind), simulate(c2, kind))
                if d < min_de:
                    min_de, pair = d, f'{n1.replace(P, "")}/{n2.replace(P, "")} ({kind})'
        de_req = a.min_de if vision != 'default' else 0
        if cols and min_de < de_req:
            fails.append(f'estados poco distinguibles: ΔE {min_de:.0f} < {de_req:.0f} en {pair}')
        status = 'OK ' if not fails else 'FALLA'
        de_txt = (f'ΔE mín {min_de:.0f} ({pair})' + (' · semánticos' if semanticos else '')) if cols else 'sin estados ni semánticos'
        print(f'{status} {theme:5} {vision:10} contraste {contr:7} · peor contraste {worst:.1f}:1 · {de_txt}')
        for f in fails:
            print(f'      - {f}')
        problems += len(fails)
    print('\nResultado:', 'todo cumple' if not problems else f'{problems} problema(s)')
    sys.exit(1 if problems else 0)


if __name__ == '__main__':
    main()
