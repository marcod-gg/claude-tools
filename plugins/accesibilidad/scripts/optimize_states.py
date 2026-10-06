#!/usr/bin/env python3
"""
Busca una paleta de colores de estado distinguible con visión normal, protanopía, deuteranopía y
tritanopía (simulación de Machado et al. 2009), cumpliendo un contraste mínimo sobre la superficie.

Cada estado queda en una familia de tono (grados HSL) para conservar el significado (rojo = nuevo…).
Se maximiza el ΔE mínimo entre todos los pares en las cuatro visiones, incluido el gris "cancelado".

Uso:
  python optimize_states.py --surface ffffff --min-contrast 4.5 --gray 48545f
  python optimize_states.py --surface ffffff --min-contrast 7 --max-contrast 14 --gray 26323f      # alto contraste claro
  python optimize_states.py --surface 10243a --min-contrast 4.8 --max-contrast 13 --gray 9aabbf    # oscuro
  python optimize_states.py --hues '{"nuevo":[0,22],"listo":[160,185]}' ...                        # estados propios

Imprime los hex, el ΔE mínimo logrado y el contraste de cada uno. Pegar el resultado en los bloques
[data-vision="colorblind"] y [data-vision="tritanopia"] (y en los de alto contraste) y volver a correr
check_theme.py. Una buena paleta llega a ΔE ≥ 15-20; bajo 10 cuesta distinguir los estados.
"""
import argparse, colorsys, itertools, json, math, random, sys
sys.stdout.reconfigure(encoding="utf-8")

from check_theme import MACHADO, contrast, hexrgb, lum, simulate

DEFAULT_HUES = {'new': (0, 22), 'active': (300, 340), 'waiting': (35, 55), 'pending': (205, 232), 'done': (160, 185), 'extra': (255, 285)}


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('--surface', default='ffffff')
    ap.add_argument('--min-contrast', type=float, default=4.5)
    ap.add_argument('--max-contrast', type=float, default=7.5)
    ap.add_argument('--gray', default='48545f', help='color de "cancelado" (fijo, también debe distinguirse)')
    ap.add_argument('--hues', help='JSON {estado: [hue_min, hue_max]}; por defecto los 6 estados de default-theme')
    ap.add_argument('--iters', type=int, default=60000)
    ap.add_argument('--seed', type=int, default=11)
    a = ap.parse_args()
    random.seed(a.seed)
    surf = hexrgb('#' + a.surface.lstrip('#'))
    gray = hexrgb('#' + a.gray.lstrip('#'))
    hues = {k: tuple(v) for k, v in json.loads(a.hues).items()} if a.hues else DEFAULT_HUES

    def pool(h, n=900):
        out, tries = [], 0
        while len(out) < n and tries < 400000:
            tries += 1
            c = tuple(round(v * 255) for v in colorsys.hls_to_rgb(random.uniform(*h) / 360, random.uniform(.12, .9), random.uniform(.5, 1)))
            if a.min_contrast <= contrast(c, surf) <= a.max_contrast:
                out.append(c)
        if not out:
            raise SystemExit(f'Sin candidatos para el tono {h} con contraste {a.min_contrast}-{a.max_contrast}: amplía el rango.')
        return out

    P = {k: pool(h) for k, h in hues.items()}
    V = {c: [simulate(c, k) for k in MACHADO] for p in P.values() for c in p}
    G = [simulate(gray, k) for k in MACHADO]
    keys = list(hues)

    def score(s):
        vs = [V[s[k]] for k in keys] + [G]
        return min(math.dist(x[i], y[i]) for x, y in itertools.combinations(vs, 2) for i in range(len(MACHADO)))

    best = {k: random.choice(P[k]) for k in keys}
    bs = score(best)
    for _ in range(a.iters):
        k = random.choice(keys)
        t = dict(best); t[k] = random.choice(P[k])
        s = score(t)
        if s > bs:
            best, bs = t, s
    hx = lambda c: '#%02x%02x%02x' % c
    print(f'ΔE mínimo (normal + protan + deutan + tritan, incluido el gris): {bs:.0f}')
    for k in keys:
        print(f'  {k:10} {hx(best[k])}  contraste {contrast(best[k], surf):.1f}:1')


if __name__ == '__main__':
    main()
