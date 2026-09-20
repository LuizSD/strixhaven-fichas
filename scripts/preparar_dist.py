"""Prepara só o conteúdo público do fork, igual à estrutura servida localmente."""
from pathlib import Path
import argparse
import json
import shutil

parser = argparse.ArgumentParser()
parser.add_argument('--destino', default='_dist')
parser.add_argument('--build', type=int, default=1)
args = parser.parse_args()
raiz = Path(__file__).resolve().parents[1]
destino = (raiz / args.destino).resolve()
if (raiz / '_dist').is_symlink() or not destino.is_relative_to(raiz / '_dist'):
    parser.error('--destino deve ficar em _dist/; nenhuma pasta de fontes pode ser substituída')
if destino.exists():
    # Artefato descartável: não carregar arquivos residuais de uma preparação anterior.
    # A raiz permitida foi validada antes; fichas/referências privadas ficam fora dela.
    shutil.rmtree(destino)
destino.mkdir(parents=True, exist_ok=True)
# Allowlist: prompts, exemplos e referências jamais são percorridos.
shutil.copy2(raiz / 'index.html', destino / 'index.html')
shutil.copy2(raiz / 'LICENSE', destino / 'LICENSE')
for pasta in ('site', 'dados'):
    if (destino / pasta).exists():
        shutil.rmtree(destino / pasta)
    shutil.copytree(raiz / pasta, destino / pasta)
for pasta, sufixo, nome, prefixo in [('dados', '*.json', 'dados-precache.json', '../dados/'), ('site/js', '*.js', 'js-precache.json', './js/')]:
    base = destino / pasta
    urls = sorted(prefixo + str(p.relative_to(base)).replace('\\', '/') for p in base.rglob(sufixo))
    (destino / 'site' / nome).write_text(json.dumps(urls, ensure_ascii=False), encoding='utf-8')
sw = destino / 'site/sw.js'
sw.write_text(sw.read_text(encoding='utf-8').replace('const CACHE_VERSION = 0; // AUTO', f'const CACHE_VERSION = {args.build};'), encoding='utf-8')
print(f'Artefato público: {destino}; build {args.build}')
