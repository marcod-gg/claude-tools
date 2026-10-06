#!/usr/bin/env python3
"""
Pasa a rem los tamaños de controles que hoy están en px, para que el tamaño de letra elegido (87.5–150 %, font-size en
<html>) escale la interfaz entera como un zoom, y no solo el texto (si no, a 150 % la letra crece dentro de botones y
barras de alto fijo, y el menú lateral corta sus etiquetas).

Convierte 1:1 (16 px = 1rem → a 100 % nada cambia):
  - font-size, height, flex-basis y las variables --*-w, --*-rail, --*-top, --*-h
  - width / min-width hasta 72 px (íconos, botones, avatares) y min-height hasta 100 px
No toca: 1 px (líneas), padding, bordes, radios, sombras, anchos de página ni media queries.

Uso:
  python px_to_rem.py src/app.css src/shell.css            # muestra lo que cambiaría
  python px_to_rem.py src/app.css src/shell.css --write    # escribe
Revisar después a 100 % (igual que antes) y a 150 % con el audit.cjs.
"""
import argparse, re, sys
sys.stdout.reconfigure(encoding="utf-8")

PAT = re.compile(r'(?<![\w-])(height|min-height|width|min-width|font-size|flex-basis|--[\w-]+-(?:w|rail|top|h))(\s*:\s*)(\d+(?:\.\d+)?)px')


def rem(px):
    v = f'{px / 16:.4f}'.rstrip('0').rstrip('.')
    return (v[1:] if v.startswith('0.') else v) + 'rem'


def convert(line):
    if line.lstrip().startswith('@media'):
        return line, 0
    n = 0

    def f(m):
        nonlocal n
        prop, px = m.group(1), float(m.group(3))
        if px <= 1 or (prop in ('width', 'min-width') and px > 72) or (prop == 'min-height' and px > 100):
            return m.group(0)
        n += 1
        return f'{prop}{m.group(2)}{rem(px)}'
    return PAT.sub(f, line), n


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('css', nargs='+')
    ap.add_argument('--write', action='store_true')
    a = ap.parse_args()
    for path in a.css:
        src = open(path, encoding='utf-8').read()
        out, total = [], 0
        for i, line in enumerate(src.split('\n'), 1):
            new, n = convert(line)
            if n and not a.write:
                print(f'{path}:{i}: {new.strip()[:140]}')
            out.append(new); total += n
        if a.write:
            open(path, 'w', encoding='utf-8', newline='').write('\n'.join(out))
        print(f'{path}: {total} conversiones' + ('' if a.write else ' (sin escribir; agregar --write)'))


if __name__ == '__main__':
    assert rem(16) == '1rem' and rem(13) == '.8125rem' and rem(216) == '13.5rem'
    assert convert('.x { height: 32px; width: 216px; border: 1px solid; }')[0] == '.x { height: 2rem; width: 216px; border: 1px solid; }'
    assert convert('@media (max-width: 768px) {')[1] == 0
    main()
