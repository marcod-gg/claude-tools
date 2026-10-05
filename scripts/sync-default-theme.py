# Copia el estilo compartido (shared/default-theme/) a cada plugin que lo usa (los que tienen assets/default-theme/).
# Cada plugin se instala solo con su carpeta, así que lleva su propia copia; la fuente única es shared/.
# Uso: python scripts/sync-default-theme.py          → copia
#      python scripts/sync-default-theme.py --check  → solo revisa; sale con código 1 si alguna copia está desfasada
import glob, os, shutil, sys

repo = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..'))
src = os.path.join(repo, 'shared', 'default-theme')
check = '--check' in sys.argv
# Compara sin saltos de línea: git en Windows (autocrlf) deja CRLF en la copia de trabajo
CRLF, LF = bytes([13, 10]), bytes([10])
def same(a, b):
    norm = lambda p: open(p, 'rb').read().replace(CRLF, LF)
    return norm(a) == norm(b)
files = [os.path.relpath(p, src) for p in glob.glob(os.path.join(src, '**', '*'), recursive=True)
         if os.path.isfile(p) and not p.endswith('README.md')]
stale = 0
for dest in sorted(glob.glob(os.path.join(repo, 'plugins', '*', 'assets', 'default-theme'))):
    for f in files:
        a, b = os.path.join(src, f), os.path.join(dest, f)
        if os.path.exists(b) and same(a, b): continue
        stale += 1
        print(('DESFASADO ' if check else 'copiado   ') + os.path.relpath(b, repo))
        if not check:
            os.makedirs(os.path.dirname(b), exist_ok=True); shutil.copyfile(a, b)
print('Copias al día' if not stale else f'{stale} archivos {"desfasados" if check else "copiados"}')
sys.exit(1 if check and stale else 0)
