"""Inventário não destrutivo de livros e templates. Não publica texto protegido."""
from pathlib import Path
import hashlib
import json
import re
import subprocess
import pymupdf as fitz
from auditar_phb import ROOT, gravar, detectar_paginas

SECOES = {'races': (17, 43), 'classes': (45, 119), 'backgrounds': (121, 141), 'equipment': (143, 161), 'multiclass-feats': (163, 170), 'spellcasting': (201, 205), 'spell-lists': (207, 211), 'spell-descriptions': (211, 289), 'conditions': (290, 292)}


def main():
    encontrados = []
    hashes = {}
    for pasta in [ROOT/'reference/books', ROOT/'reference/templates', ROOT/'assets-private', ROOT/'assets-private/references', ROOT.parent/'assets-private', ROOT.parent/'assets-private/references']:
        for pdf in sorted(pasta.glob('*.pdf')):
            sha = hashlib.sha256(pdf.read_bytes()).hexdigest()
            if sha in hashes:
                hashes[sha]['alsoFoundAt'].append(str(pdf.relative_to(ROOT.parent)))
                continue
            doc = fitz.open(pdf)
            template = pasta.name == 'templates' or bool(re.search(r'Tetse-strixhaven|Bardo\s*-\s*Critical20|Ficha.de.Personagem|Strixhaven_Ficha', pdf.name, re.I))
            id = 'tetse-strixhaven' if 'tetse' in pdf.name.lower() else 'bardo-critical20' if 'critical20' in pdf.name.lower() else 'strixhaven-atual-privado' if 'Strixhaven_Ficha' in pdf.name else 'ficha-2024' if template else 'phb-2014-10th' if 'Handbook' in pdf.name else 'dmg-2014-pt'
            if any(b['id'] == id for b in encontrados):
                id += '-' + sha[:12]
            base = {'id': id, 'filename': pdf.name, 'sha256': sha, 'pages': len(doc), 'alsoFoundAt': [str(pdf.relative_to(ROOT.parent))], 'kind': 'template' if template else 'book'}
            hashes[sha] = base
            if template:
                campos = []
                render_dir = ROOT/'assets-private/entrega/reference-render'/id
                render_dir.mkdir(parents=True, exist_ok=True)
                paginas = []
                for n, p in enumerate(doc, 1):
                    paginas.append({'page': n, 'width': p.rect.width, 'height': p.rect.height})
                    p.get_pixmap(matrix=fitz.Matrix(.8, .8)).save(render_dir/f'{n:03}.png')
                    for w in p.widgets() or []:
                        campos.append({'name': w.field_name, 'type': w.field_type_string, 'page': n, 'rect': list(w.rect), 'xref': w.xref})
                info = subprocess.run(['pdfinfo', str(pdf)], capture_output=True, text=True)
                bloqueios = []
                if info.returncode:
                    bloqueios.append('Poppler/pdfinfo não abre a estrutura xref original: ' + info.stderr.strip().replace('\n', ' ')[:900])
                if 'JavaScript:      yes' in info.stdout:
                    bloqueios.append('JavaScript embutido requer auditoria/neutralização em cópia antes de evitar recálculo legado sobre valores 2024.')
                if id.startswith('tetse'):
                    bloqueios.append('Inspeção visual da página 1: campos de modificadores/CA/PV desalinhados; Reflexos e Vontade não correspondem às perícias canônicas. Requer mapa geométrico próprio.')
                bloqueios.append('Adaptação completa dos dados da ficha e prova visual final ainda não implementadas; teste AcroForm mínimo não habilita suporte.')
                prova = {'attempted': False}
                primeiro = next(((p.number, w.field_name) for p in doc for w in p.widgets() or [] if w.field_type == fitz.PDF_WIDGET_TYPE_TEXT), None)
                if primeiro:
                    p = doc[primeiro[0]]
                    w = next(w for w in p.widgets() if w.field_name == primeiro[1])
                    w.field_value = 'Prova: Orientação'; w.update()
                    prova_path = render_dir/'prova-minima.pdf'
                    doc.save(prova_path)
                    reaberto = fitz.open(prova_path)
                    campos_prova = [w for p in reaberto for w in p.widgets() or []]
                    assert any(w.field_name == primeiro[1] and w.field_value == 'Prova: Orientação' for w in campos_prova)
                    assert len(campos_prova) == len(campos)
                    for n, p in enumerate(reaberto, 1):
                        p.get_pixmap(matrix=fitz.Matrix(.8, .8)).save(render_dir/f'prova-{n:03}.png')
                    prova = {'attempted': True, 'reopened': True, 'widgetsPreserved': len(campos_prova), 'field': primeiro[1], 'value': 'Prova: Orientação', 'semanticCoverage': 'Apenas prova de edição de um campo; não representa uma ficha exportada.'}
                base.update({'dimensions': paginas, 'fields': campos, 'widgets': len(campos), 'validated': False, 'mapping': {}, 'blockers': bloqueios, 'minimalProof': prova, 'popplerReadable': info.returncode == 0})
                anterior_path = ROOT/f'reference/manifests/pdf-templates/{id}.json'
                if anterior_path.exists():
                    anterior = json.loads(anterior_path.read_text())
                    if anterior.get('sha256') == sha:
                        for key in ['adapterVersion', 'mapping', 'checkboxMapping', 'spellGroups', 'unmappedFields', 'supplement', 'actionsPolicy', 'exportProof']:
                            if key in anterior:
                                base[key] = anterior[key]
                        if anterior.get('validated') and anterior.get('exportProof', {}).get('adapterSha256') == hashlib.sha256((ROOT/'site/js/pdf-bardo.js').read_bytes()).hexdigest() and anterior.get('exportProof', {}).get('generatorSha256') == hashlib.sha256((ROOT/'site/js/strixhaven/exportacao.js').read_bytes()).hexdigest():
                            base['validated'] = True
                            base['inputIssues'] = [b for b in bloqueios if not b.startswith('Adaptação completa')]
                            base['blockers'] = []
                gravar(ROOT/f'reference/manifests/pdf-templates/{id}.json', base)
            else:
                # Lê cada página de cada livro; só índices de presença são publicados.
                termos = ['spell', 'magic', 'equipment', 'language', 'race', 'class', 'feat', 'background', 'condition', 'magia', 'itens', 'equipamento', 'idioma', 'raça', 'classe', 'talento', 'antecedente', 'condições', 'Strixhaven', 'Lorehold', 'Prismari', 'Quandrix', 'Silverquill', 'Witherbloom']
                presenca = {t: [] for t in termos}
                for n, p in enumerate(doc, 1):
                    texto = p.get_text().lower()
                    for t in termos:
                        if t.lower() in texto:
                            presenca[t].append(n)
                base.update({'title': "Player's Handbook" if id.startswith('phb') else 'Guia do Mestre', 'edition': 'D&D 5e (2014)', 'printing': '10th (2018)' if id.startswith('phb') else 'não confirmada', 'year': 2014, 'language': 'en' if id.startswith('phb') else 'pt-BR', 'rulesVersion': '2014-legacy'})
                offset, anchors = detectar_paginas(doc)
                base.update({'pageOffset': offset, 'anchors': anchors})
                if id.startswith('phb'):
                    offset, anchors = detectar_paginas(doc)
                    base.update({'pageOffset': offset, 'anchors': anchors, 'sections': []})
                    for nome, (inicio, fim) in SECOES.items():
                        texto = '\n'.join(doc[p+offset-1].get_text() for p in range(inicio, fim+1))
                        base['sections'].append({'section': nome, 'printedPages': [inicio, fim], 'extractedCharacters': len(texto), 'textSha256': hashlib.sha256(texto.encode()).hexdigest()})
                gravar(ROOT/f'reference/manifests/books/{id}.json', base)
                gravar(ROOT/f'reference/audits/{id}-scan.json', {'sha256': sha, 'physicalPagesWithTerms': presenca, 'examinedPages': len(doc), 'incorporated': ['spell names and mechanics', 'languages', 'equipment tables'] if id.startswith('phb') else ['7 magic rings, printed pages 153–154; see dmg-items.json'] if (ROOT/'reference/audits/dmg-items.json').exists() else [], 'limitations': ['Varredura textual/indexação não equivale a extração validada de todas as opções.'], 'ignored': ['Textos extensos protegidos', 'Progressões conflitantes com 2024 sem adaptador explícito']})
            encontrados.append(base)
    for b in encontrados:
        pasta = 'pdf-templates' if b['kind'] == 'template' else 'books'
        gravar(ROOT/f'reference/manifests/{pasta}/{b["id"]}.json', b)
    gravar(ROOT/'reference/audits/inventory.json', [{'id': b['id'], 'sha256': b['sha256'], 'kind': b['kind'], 'alsoFoundAt': b['alsoFoundAt']} for b in encontrados])
    print(json.dumps([{k: b[k] for k in ['id', 'kind', 'pages']} | ({'widgets': b['widgets']} if b['kind'] == 'template' else {}) for b in encontrados], indent=2))


if __name__ == '__main__':
    main()
