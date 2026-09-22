"""Incorporação conservadora de dados mecânicos do DMG privado em português.

As páginas e os títulos são confirmados no PDF; não copia descrições corridas.
"""
import hashlib
import pymupdf as fitz
from auditar_phb import ROOT, detectar_paginas, gravar, linhas

pdf = next(p for pasta in [ROOT/'reference/books', ROOT/'assets-private', ROOT.parent/'assets-private'] for p in pasta.glob('*.pdf') if 'guia-do-mestre' in p.name.lower())
doc = fitz.open(pdf)
offset, anchors = detectar_paginas(doc)
specs = [
    ('ANEL DE EVASÃO', 'Anel de Evasão', 'Ring of Evasion', 153, 'rare', True, {'charges': 3, 'recovery': {'dice': '1d3', 'when': 'dawn'}}),
    ('ANEL DE NATAÇÃO', 'Anel de Natação', 'Ring of Swimming', 153, 'uncommon', False, {'swimSpeedMeters': 12}),
    ('ANEL DE PROTEÇÃO', 'Anel de Proteção', 'Ring of Protection', 153, 'rare', True, {'armorClassBonus': 1, 'savingThrowBonus': 1}),
    ('ANEL DE QUEDA SUAVE', 'Anel de Queda Suave', 'Ring of Feather Falling', 153, 'rare', True, {'fallSpeedMetersPerRound': 18, 'fallDamage': False}),
    ('ANEL DE REGENERAÇÃO', 'Anel de Regeneração', 'Ring of Regeneration', 154, 'very-rare', True, {'healingDice': '1d6', 'intervalMinutes': 10, 'minimumCurrentHP': 1, 'regrowDays': '1d6+1'}),
    ('ANEL DE RESISTÊNCIA', 'Anel de Resistência', 'Ring of Resistance', 154, 'rare', True, {'resistanceChoices': ['acid', 'cold', 'fire', 'force', 'lightning', 'necrotic', 'poison', 'psychic', 'radiant', 'thunder'], 'choose': 1}),
    ('ANEL DOS TRÊS DESEJOS', 'Anel dos Três Desejos', 'Ring of Three Wishes', 154, 'legendary', False, {'charges': 3, 'chargesPerUse': 1, 'spellRef': 'phb-2014-wish', 'activation': 'action', 'nonmagicalAtZero': True}),
]
items = []
for heading, pt, en, printed, rarity, attunement, mechanics in specs:
    page = doc[printed + offset - 1]
    records = linhas(page, [page.rect.width/2])
    found = [i for i, row in enumerate(records) if row[3] == heading]
    assert len(found) == 1, heading
    assert 'Anel,' in records[found[0]+1][3], heading
    items.append({'id': 'dmg-2014-'+en.lower().replace(' ', '-'), 'nome': pt, 'name': {'ptBR': pt, 'en': en, 'ptBRStatus': 'interface-translation', 'enStatus': 'interface-translation'}, 'category': 'Itens mágicos (DMG 2014)', 'raridade': {'rare': 'Rara', 'uncommon': 'Incomum', 'very-rare': 'Muito Rara', 'legendary': 'Lendária'}[rarity], 'requer_sintonizacao': attunement, 'mechanics': mechanics, 'descricao': 'Efeitos legados para consulta e controle manual; não concede bônus, espaços ou magias automaticamente.', 'source': {'sourceId': 'dmg-2014-pt', 'sourceTitle': 'Guia do Mestre (D&D 5e, tradução em português)', 'rulesVersion': '2014-legacy', 'printedPage': printed, 'section': 'Itens mágicos'}})
sha = hashlib.sha256(pdf.read_bytes()).hexdigest()
gravar(ROOT/'dados/legacy/dmg-items.json', {'schemaVersion': 2, 'itens': items})
gravar(ROOT/'reference/audits/dmg-items.json', {'sha256': sha, 'pageOffset': offset, 'anchors': anchors, 'records': [{'id': i['id'], 'name': i['name'], 'source': i['source']} for i in items], 'count': len(items), 'examinedPrintedPages': [153, 154], 'ignored': ['Demais capítulos varridos por termos; não houve catalogação item a item.', 'Descrições extensas protegidas.', 'Opções de classe/raça e regras do Mestre não incorporadas automaticamente no motor 2024.'], 'translationCaveat': 'Nomes ingleses de interface; não conferidos contra PDF inglês do DMG.'})
print(f'{len(items)} itens do DMG; deslocamento {offset}; SHA-256 {sha}')
