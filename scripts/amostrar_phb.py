"""Renderiza títulos/escolas para conferência visual manual, exclusivamente privada."""
import json
from pathlib import Path
import pymupdf as fitz
from auditar_phb import ROOT, normalizar, gravar

audit = json.loads((ROOT/'assets-private/audits/phb-spells-raw.json').read_text())
pdf = Path(audit['privateSourcePath'])
doc = fitz.open(pdf)
nomes = ['Acid Splash', 'Aid', 'Dispel Evil and Good', "Leomund's Tiny Hut", "Melf's Acid Arrow", "Mordenkainen's Sword", "Otiluke's Freezing Sphere", "Otiluke's Resilient Sphere", 'Guidance', 'Minor Illusion', 'Fireball', 'Ice Storm', 'Cone of Cold', 'Heal', 'Finger of Death', 'Sunburst', 'Wish', 'Zone of Truth', 'Alarm']
saida = fitz.open()
pagina_saida = saida.new_page(width=900, height=1220)
amostras = []
for n, nome in enumerate(nomes):
    r = next(r for r in audit['descriptions'] if r['normalized'] == normalizar(nome))
    pagina = doc[r['printedPage'] + audit['offset'] - 1]
    linhas = [l for b in pagina.get_text('dict')['blocks'] for l in b.get('lines', [])]
    linha = next(l for l in linhas if ''.join(s['text'] for s in l['spans']).strip() == r['rawName'])
    x0, y0, x1, y1 = linha['bbox']
    clip = fitz.Rect(max(0, x0-2), max(0, y0-2), min(pagina.rect.width, x0+240), min(pagina.rect.height, y1+15))
    pix = pagina.get_pixmap(clip=clip, matrix=fitz.Matrix(2, 2))
    x, y = 20 + (n % 2)*450, 15 + (n//2)*120
    pagina_saida.insert_text((x, y+10), f'{nome} - p.{r["printedPage"]} - nivel {r["level"]}', fontsize=9)
    pagina_saida.insert_image(fitz.Rect(x, y+20, x+425, y+100), pixmap=pix)
    amostras.append({'name': nome, 'printedPage': r['printedPage'], 'level': r['level']})
destino = ROOT/'assets-private/entrega/phb-amostras.png'
destino.parent.mkdir(parents=True, exist_ok=True)
pagina_saida.get_pixmap().save(destino)
for impressa in [227]:
    doc[impressa + audit['offset'] - 1].get_pixmap(matrix=fitz.Matrix(1.5, 1.5)).save(destino.parent/f'phb-table-{impressa}.png')
gravar(ROOT/'reference/audits/phb-samples.json', {'sha256': audit['sha256'], 'samples': amostras, 'image': 'assets-private/entrega/phb-amostras.png'})
print(destino)
