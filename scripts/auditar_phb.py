"""Auditoria privada reproduzível. Dependência de desenvolvimento: PyMuPDF.

Não publica texto corrido: somente títulos, metadados e relações mecânicas.
As passagens de listas e descrições não recebem resultados uma da outra.
"""
import argparse
import hashlib
import json
import re
import unicodedata
from pathlib import Path
import pymupdf as fitz

ROOT = Path(__file__).resolve().parents[1]


def normalizar(texto):
    return re.sub(r'[^a-z0-9]', '', unicodedata.normalize('NFKD', texto).lower())


def linhas(pagina, colunas):
    linhas = []
    for bloco in pagina.get_text('dict')['blocks']:
        for linha in bloco.get('lines', []):
            texto = ''.join(s['text'] for s in linha['spans']).strip()
            x, y, _, _ = linha['bbox']
            coluna = sum(x >= limite for limite in colunas)
            linhas.append((coluna, y, x, texto))
    return sorted(linhas)


def detectar_paginas(doc):
    # Folios impressos, não índices físicos. Múltiplas âncoras independentes.
    ancoras = []
    for i, pagina in enumerate(doc):
        for _, y, x, linha in linhas(pagina, []):
            margem = x < pagina.rect.width * .1 or x > pagina.rect.width * .9
            if margem and y > pagina.rect.height * .92 and linha.strip().isdigit() and int(linha.strip()) in (17, 45, 121, 143, 163, 201, 208, 211, 212, 289, 290):
                ancoras.append({'physicalPage': i + 1, 'printedPage': int(linha.strip())})
    offsets = [a['physicalPage'] - a['printedPage'] for a in ancoras]
    assert len(offsets) >= 3 and len(set(offsets)) == 1, ancoras
    return offsets[0], ancoras


def descricoes(doc, offset):
    registros = []
    stream = []
    for impressa in range(211, 290):
        pagina = doc[impressa + offset - 1]
        stream.extend((impressa, col, y, x, texto) for col, y, x, texto in linhas(pagina, [pagina.rect.width / 2]))
    for i, (impressa, col, y, x, texto) in enumerate(stream):
        compacto = normalizar(texto)
        school = next((s for s in ['abjuration', 'conjuration', 'divination', 'enchantment', 'evocation', 'illusion', 'necromancy', 'transmutation'] if s in compacto.replace('jllusion', 'illusion')), None)
        nivel = re.match(r'([1-9l])(?:st|nd|rd|th)level', compacto)
        if not school or not (nivel or 'cantrip' in compacto):
            continue
        anterior = stream[i-1]
        if anterior[:2] != (impressa, col):
            continue
        titulo = anterior[4]
        campos, paginas_meta, headers_meta = {}, set(), []
        # Cabeçalhos podem continuar na coluna seguinte ou na próxima página.
        # Nunca ler campos de uma segunda magia para completar a primeira.
        ativo = None
        for p, c, yy, xx, t in stream[i+1:i+30]:
            chave, separador, valor = t.partition(':')
            label = next((k for k in ['Casting Time', 'Range', 'Components', 'Duration'] if normalizar(k) == normalizar(chave)), None)
            if normalizar(chave) == 'component':
                label = 'Components'
            if not label or not separador:
                folha = doc[p + offset - 1]
                rodape = yy > folha.rect.height * .92 and (normalizar(t).isdigit() or len(normalizar(t)) < 22)
                if ativo and not rodape:
                    campos[ativo] += ' ' + t
                continue
            if label in campos:
                break
            campos[label] = valor.strip()
            ativo = label
            paginas_meta.add(p)
            headers_meta.append({'printedPage': p, 'raw': t})
            if label == 'Duration':
                break
        registros.append({'rawName': titulo, 'printedPage': impressa, 'level': int(nivel[1].replace('l', '1')) if nivel else 0, 'school': school, 'rawSchool': texto, 'ritual': 'ritual' in compacto, 'metadata': campos, 'metadataPages': sorted(paginas_meta), 'metadataRawHeaders': headers_meta})
    return registros


def resumo_material(componentes, pagina):
    if '(' not in componentes:
        return ''
    texto = componentes.split('(', 1)[1].rsplit(')', 1)[0].strip()
    # Somente metadado curto; jamais a descrição/efeito da magia.
    if len(texto) > 200:
        custos = re.findall(r'[\d,]+\s*(?:gp|sp|cp|pp)', texto)
        return texto[:140].rsplit(' ', 1)[0] + '…; ' + ', '.join(custos) + f' (PHB p.{pagina})'
    return texto


def listas(doc, offset):
    registros = []
    classe, nivel = None, None
    for impressa in range(207, 212):
        pagina = doc[impressa + offset - 1]
        # Quatro colunas tipográficas; na última página descrições ocupam metade.
        for col, y, x, texto in linhas(pagina, [155, 285, 416]):
            if y > pagina.rect.height * .92 or (impressa == 211 and col >= 2):
                continue
            compacto = normalizar(texto)
            c = next((c for c in ['bard', 'cleric', 'druid', 'paladin', 'ranger', 'sorcerer', 'warlock', 'wizard'] if compacto == c + 'spells'), None)
            if c:
                classe, nivel = c, None
                continue
            if 'level' in compacto or 'leve' in compacto:
                if 'antr' in compacto:
                    nivel = 0
                else:
                    n = re.match(r'([1-9ls])', compacto)
                    if n:
                        nivel = int(n[1].replace('l', '1').replace('s', '5'))
                    elif texto.strip().startswith(']'):
                        nivel = 7
                continue
            if classe and nivel is not None and texto and y > 20:
                if registros and normalizar(texto) in ('evilandgood', 'faithfulhound', 'privatesanctum', 'magnificentmansion', 'summons'):
                    registros[-1]['rawName'] += ' ' + texto
                else:
                    registros.append({'rawName': texto, 'class': classe, 'level': nivel, 'printedPage': impressa})
    return registros


def gravar(path, dados):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(dados, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--pdf', type=Path)
    parser.add_argument('--check', action='store_true')
    parser.add_argument('--generate', action='store_true')
    args = parser.parse_args()
    identidade = json.loads((ROOT/'reference/manifests/books/phb-2014-10th.json').read_text())
    candidatos = [p for pasta in [ROOT/'reference/books', ROOT/'assets-private', ROOT.parent/'assets-private'] for p in pasta.glob('*') if p.suffix.lower() == '.pdf' and re.search(r'player|handbook|phb', p.name, re.I)]
    pdf = args.pdf or next((p for p in candidatos if hashlib.sha256(p.read_bytes()).hexdigest() == identidade['sha256']), None)
    assert pdf, 'PHB não encontrado. Informe --pdf com o caminho privado.'
    doc = fitz.open(pdf)
    creditos = re.sub(r'\s+', '', doc[2].get_text()).lower()
    assert 'firstprinting:august2014' in creditos and 'tenthprinting:october2018' in creditos, 'Edição/impressão não confirmadas na página de créditos.'
    offset, ancoras = detectar_paginas(doc)
    sha = hashlib.sha256(pdf.read_bytes()).hexdigest()
    assert len(doc) == identidade['pages'] and sha == identidade['sha256'], 'PDF não corresponde ao hash/paginação da fonte identificada.'
    assert 'playershandbook' in normalizar(doc[2].get_text()), 'Título interno não confirmado.'
    assert 'chapter11spells' in normalizar(doc[207+offset-1].get_text()), 'Capítulo 11 não confirmado.'
    l = listas(doc, offset)
    d = descricoes(doc, offset)
    correcoes_path = ROOT/'scripts/excecoes/phb-extracao.json'
    correcoes = json.loads(correcoes_path.read_text()) if correcoes_path.exists() else []
    for passagem, registros in [('descriptions', d), ('lists', l)]:
        for r in registros:
            correcoes_r = [c for c in correcoes if c['pass'] == passagem and c['rawName'] == r['rawName'] and c['printedPage'] == r['printedPage']]
            r['name'] = correcoes_r[0]['canonicalName'] if correcoes_r else r['rawName']
            r['normalized'] = normalizar(r['name'])
    ds, ls = {r['normalized'] for r in d}, {r['normalized'] for r in l}
    catalogo_path = ROOT/'dados/legacy/phb-spells.json'
    anterior = json.loads(catalogo_path.read_text())['magias'] if catalogo_path.exists() else []
    nomes = dict(linha.split('|', 1) for linha in (ROOT/'scripts/excecoes/phb-nomes.txt').read_text().splitlines() if linha and not linha.startswith('#'))
    por_normalizado = {normalizar(en): (en, pt) for en, pt in nomes.items()}
    assert len(por_normalizado) == len(nomes), 'Colisão na normalização dos nomes canônicos.'
    for r in l + d:
        if r['normalized'] in por_normalizado:
            r['name'] = por_normalizado[r['normalized']][0]
    if args.generate:
        assert ds == ls, {'listsOnly': sorted(ls-ds), 'descriptionsOnly': sorted(ds-ls)}
        nomes = dict(linha.split('|', 1) for linha in (ROOT/'scripts/excecoes/phb-nomes.txt').read_text().splitlines() if linha and not linha.startswith('#'))
        por_normalizado = {normalizar(en): (en, pt) for en, pt in nomes.items()}
        assert ds == set(por_normalizado), {'missingTranslations': sorted(ds-set(por_normalizado)), 'unused': sorted(set(por_normalizado)-ds)}
        classe_pt = dict(bard='Bardo', cleric='Clérigo', druid='Druida', paladin='Paladino', ranger='Guardião', sorcerer='Feiticeiro', warlock='Bruxo', wizard='Mago')
        escolas = dict(abjuration='Abjuração', conjuration='Conjuração', divination='Adivinhação', enchantment='Encantamento', evocation='Evocação', illusion='Ilusão', necromancy='Necromancia', transmutation='Transmutação')
        magias = []
        for r in d:
            en, pt = por_normalizado[r['normalized']]
            meta = r['metadata']
            componentes = meta.get('Components', '').split('(')[0].strip().rstrip(',')
            antigo = next((m for m in anterior if normalizar(m['name']['en']) == r['normalized']), {})
            magias.append({'id': antigo.get('id') or 'phb-2014-' + re.sub(r'[^a-z0-9]+', '-', en.lower()).strip('-'), 'nome': pt, 'name': {'en': en, 'ptBR': pt, 'ptBRStatus': 'interface-translation', 'aliases': antigo.get('name', {}).get('aliases', [])}, 'circulo': r['level'], 'escola': escolas[r['school']], 'classes': sorted({classe_pt[x['class']] for x in l if x['normalized'] == r['normalized']}), 'tempo_conjuracao': meta.get('Casting Time', '').split(',')[0], 'alcance': meta.get('Range', ''), 'componentes': componentes, 'material_resumo': resumo_material(meta.get('Components', ''), r['printedPage']), 'duracao': meta.get('Duration', ''), 'concentracao': 'concentra' in meta.get('Duration', '').lower(), 'ritual': r['ritual'], 'source': {'sourceId': 'phb-2014-10th', 'sourceTitle': "Player’s Handbook (2014), 10th printing", 'rulesVersion': '2014-legacy', 'printedPage': r['printedPage'], 'section': 'Spell descriptions'}, 'descricao': ''})
        gravar(catalogo_path, {'schemaVersion': 2, 'magias': magias})
        gravar(ROOT/'reference/audits/phb-spells-changes.json', {'added': [m['id'] for m in magias if m['id'] not in {a['id'] for a in anterior}], 'updated': [{'id': m['id'], 'fields': [k for k in m if m[k] != a.get(k)]} for m in magias for a in anterior if m['id'] == a['id'] and m != a], 'removedIds': [a['id'] for a in anterior if a['id'] not in {m['id'] for m in magias}]})
    catalogo = json.loads(catalogo_path.read_text())['magias'] if catalogo_path.exists() else []
    cs = {normalizar(m['name']['en']) for m in catalogo}
    duplicates = sorted(n for n in ds if sum(r['normalized'] == n for r in d) > 1)
    problemas = {'listsWithoutDescriptions': sorted(ls-ds), 'descriptionsWithoutLists': sorted(ds-ls), 'missingFromCatalog': sorted(ds-cs), 'extraInCatalog': sorted(cs-ds), 'duplicateDescriptions': duplicates, 'duplicateCatalog': len(catalogo)-len(cs), 'incompleteCatalog': [m.get('id') for m in catalogo if not (m.get('source') and m.get('classes') and m.get('name', {}).get('ptBR') and 0 <= m.get('circulo', -1) <= 9)]}
    problemas['duplicateIds'] = len(catalogo) - len({m['id'] for m in catalogo})
    problemas['incompleteEditorHeaders'] = [m['id'] for m in catalogo if not all(m.get(k) for k in ['escola', 'tempo_conjuracao', 'alcance', 'componentes', 'duracao'])]
    classe_pt = dict(bard='Bardo', cleric='Clérigo', druid='Druida', paladin='Paladino', ranger='Guardião', sorcerer='Feiticeiro', warlock='Bruxo', wizard='Mago')
    by_name = {normalizar(m['name']['en']): m for m in catalogo}
    problemas['listsMissingFromCatalog'] = sorted(ls-cs)
    problemas['levelMismatches'] = [{'name': r['name'], 'page': r['printedPage'], 'pdf': r['level'], 'catalog': by_name[r['normalized']]['circulo']} for r in l+d if r['normalized'] in by_name and r['level'] != by_name[r['normalized']]['circulo']]
    problemas['classMismatches'] = [{'name': m['name']['en'], 'pdf': sorted({classe_pt[r['class']] for r in l if r['normalized'] == n}), 'catalog': m.get('classes')} for n, m in by_name.items() if set(m.get('classes', [])) != {classe_pt[r['class']] for r in l if r['normalized'] == n}]
    problemas['missingBilingualOrSource'] = [m.get('id') for m in catalogo if not (m.get('name', {}).get('en') and m.get('name', {}).get('ptBR') and m['name'].get('ptBRStatus') in ('verified', 'interface-translation') and m.get('source', {}).get('rulesVersion') == '2014-legacy' and m['source'].get('printedPage'))]
    problemas['invalidExceptions'] = []
    for c in correcoes:
        valida = bool(c.get('reason') and c.get('printedPage') and normalizar(c.get('canonicalName', '')) in ds)
        if c['pass'] in ('descriptions', 'lists'):
            valida = valida and any(r['rawName'] == c['rawName'] and r['printedPage'] == c['printedPage'] for r in (d if c['pass'] == 'descriptions' else l))
        elif c['pass'] == 'metadata':
            valida = valida and any(r['normalized'] == normalizar(c['canonicalName']) and ((r['rawSchool'] == c['rawName'] and r['printedPage'] == c['printedPage']) or {'printedPage': c['printedPage'], 'raw': c['rawName']} in r['metadataRawHeaders']) for r in d)
        else:
            valida = False
        if not valida:
            problemas['invalidExceptions'].append(c)
    resultado = {'pdf': pdf.name, 'sha256': sha, 'edition': {'firstPrinting': '2014-08', 'printing': '2018-10 (10th)', 'creditsPhysicalPage': 3}, 'catalogSha256': hashlib.sha256(catalogo_path.read_bytes()).hexdigest() if catalogo_path.exists() else None, 'offset': offset, 'anchors': ancoras, 'passes': {'lists': {'raw': len(l), 'normalized': len(ls)}, 'descriptions': {'raw': len(d), 'normalized': len(ds)}, 'reconciliation': problemas, 'final': bool(args.check)}, 'lists': l, 'descriptions': d, 'corrections': correcoes}
    resultado['physicalPages'] = len(doc)
    resultado['privateSourcePath'] = str(pdf.resolve())
    resultado['sections'] = {'lists': [207, 211], 'descriptions': [211, 289]}
    resultado['byClass'] = {c: {'raw': sum(r['class'] == c for r in l), 'normalized': len({r['normalized'] for r in l if r['class'] == c})} for c in classe_pt}
    gravar(ROOT/'assets-private/audits/phb-spells-raw.json', resultado)
    seguro = {**resultado, 'lists': [{k: r[k] for k in ['name', 'normalized', 'class', 'level', 'printedPage']} for r in l], 'descriptions': [{k: r[k] for k in ['name', 'normalized', 'level', 'school', 'printedPage', 'metadataPages']} for r in d]}
    seguro.pop('privateSourcePath', None)
    seguro['passes']['final'] = {'executed': args.check, 'passed': bool(args.check and not any(problemas.values()))}
    gravar(ROOT/'reference/audits/phb-spells.json', seguro)
    gravar(ROOT/'reference/audits/phb-spells-audit.json', seguro)
    print(json.dumps({k: resultado[k] for k in ['sha256', 'offset', 'passes']}, ensure_ascii=False, indent=2))
    if args.check:
        assert not any(problemas.values()), 'Reconciliação bloqueada: veja reference/audits/phb-spells.json'
        by_name = {normalizar(m['name']['en']): m for m in catalogo}
        classe_pt = dict(bard='Bardo', cleric='Clérigo', druid='Druida', paladin='Paladino', ranger='Guardião', sorcerer='Feiticeiro', warlock='Bruxo', wizard='Mago')
        for r in l:
            m = by_name[r['normalized']]
            assert r['level'] == m['circulo'] and classe_pt[r['class']] in m['classes'], r
        for r in d:
            assert r['level'] == by_name[r['normalized']]['circulo'], r
        for c in correcoes:
            assert c['reason'] and c['printedPage'] and normalizar(c['canonicalName']) in ds, c
            if c['pass'] in ('descriptions', 'lists'):
                assert any(r['rawName'] == c['rawName'] and r['printedPage'] == c['printedPage'] for r in (d if c['pass'] == 'descriptions' else l)), c
            if c['pass'] == 'metadata':
                assert any(r['normalized'] == normalizar(c['canonicalName']) and ((r['rawSchool'] == c['rawName'] and r['printedPage'] == c['printedPage']) or {'printedPage': c['printedPage'], 'raw': c['rawName']} in r['metadataRawHeaders']) for r in d), c


if __name__ == '__main__':
    main()
