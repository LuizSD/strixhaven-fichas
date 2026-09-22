"""Copia privada não destrutiva e mapa individual Critical20. Não habilita sem prova."""
import hashlib
import json
import shutil
from auditar_phb import ROOT, gravar

manifest_path = ROOT/'reference/manifests/pdf-templates/bardo-critical20.json'
manifest = json.loads(manifest_path.read_text())
sha = manifest['sha256']
fonte = next(p for pasta in [ROOT/'reference/templates', ROOT/'assets-private', ROOT.parent/'assets-private'] for p in pasta.glob('*.pdf') if 'critical20' in p.name.lower() and hashlib.sha256(p.read_bytes()).hexdigest() == sha)
destino = ROOT/'reference/templates'/f'bardo-critical20-{sha[:12]}.pdf'
if destino.exists():
    assert hashlib.sha256(destino.read_bytes()).hexdigest() == sha, 'Nunca sobrescrever template diferente'
else:
    shutil.copy2(fonte, destino)
mapping = {
    'CharacterName': 'nome', 'CharacterName 2': 'nome', 'ClassLevel': '$classes', 'Background': 'antecedente',
    'PlayerName': 'jogador', 'Race ': 'especie', 'Alignment': 'alinhamento', 'XP': 'xp',
    'HPMax': 'pv_max', 'HPCurrent': 'pv_atual', 'HPTemp': 'pv_temporario',
    'PersonalityTraits ': 'personalidade', 'Ideals': 'ideais', 'Bonds': 'lacos', 'Flaws': 'defeitos',
    'ProficienciesLang': '$idiomas', 'Equipment': '$inventario', 'Features and Traits': '$habilidades',
    'Backstory': 'historia_personagem', 'Allies': '$academia', 'FactionName': 'strixhaven.faculdade',
    'Age': 'idade', 'Height': 'altura', 'Weight': 'peso', 'Eyes': 'olhos', 'Skin': 'pele', 'Hair': 'cabelo',
    'AC': 'resumo_calculado.combate.CA', 'Initiative': 'resumo_calculado.combate.Iniciativa',
    'Speed': 'resumo_calculado.combate.Deslocam.', 'ProfBonus': 'resumo_calculado.combate.Prof.',
    'Spellcasting Class 2': '$classes', 'SpellSaveDC  2': 'resumo_calculado.combate.CD Magia',
    'SpellAtkBonus 2': 'resumo_calculado.combate.Atq Magia',
    'SpellcastingAbility 2': '$atributoMagia', 'HD': '$dadosVida', 'HDTotal': 'dados_vida_total',
    'Passive': '$percepcaoPassiva', 'AttacksSpellcasting': '$ataquesNotas',
    'CP': 'moedas.pc', 'SP': 'moedas.pp', 'EP': 'moedas.pe', 'GP': 'moedas.po', 'PP': 'moedas.pl',
}
atributos = {'STR': ('forca', 'Força', 'Strength'), 'DEX': ('destreza', 'Destreza', 'Dexterity'), 'CON': ('constituicao', 'Constituição', 'Constitution'), 'INT': ('inteligencia', 'Inteligência', 'Intelligence'), 'WIS': ('sabedoria', 'Sabedoria', 'Wisdom'), 'CHA': ('carisma', 'Carisma', 'Charisma')}
for field, (key, pt, en) in atributos.items():
    mapping[field] = 'atributos.' + key
    mapping[{'DEX': 'DEXmod ', 'CHA': 'CHamod'}.get(field, field+'mod')] = '$mod:' + key
    mapping['ST '+en] = 'resumo_calculado.salvaguardas.'+pt
pericias = {'Acrobatics': 'Acrobacia', 'Animal': 'Lidar com Animais', 'Athletics': 'Atletismo', 'Deception ': 'Enganação', 'History ': 'História', 'Insight': 'Intuição', 'Intimidation': 'Intimidação', 'Investigation ': 'Investigação', 'Arcana': 'Arcanismo', 'Perception ': 'Percepção', 'Nature': 'Natureza', 'Performance': 'Atuação', 'Medicine': 'Medicina', 'Religion': 'Religião', 'Stealth ': 'Furtividade', 'Persuasion': 'Persuasão', 'SleightofHand': 'Prestidigitação', 'Survival': 'Sobrevivência'}
for field, nome in pericias.items():
    mapping[field] = 'resumo_calculado.pericias.' + nome
fields = manifest['fields']
names = {f['name'] for f in fields}
assert set(mapping) <= names, set(mapping)-names
# Ordenação geométrica conferida na página 3: colunas 0–2, 3–5, 6–9.
slots = sorted([f for f in fields if f['name'].startswith('SlotsTotal')], key=lambda f: (int(f['rect'][0]//200), f['rect'][1]))
for level, s in enumerate(slots, 1):
    mapping[s['name']] = f'$slotTotal:{level}'
    restante = s['name'].replace('SlotsTotal', 'SlotsRemaining')
    assert restante in names
    # O rótulo impresso português é ESPAÇOS USADOS, apesar do nome AcroForm.
    mapping[restante] = f'$slotUsed:{level}'
checkboxes = {}
for field, path in list(mapping.items()):
    if not (path.startswith('resumo_calculado.pericias.') or path.startswith('resumo_calculado.salvaguardas.')):
        continue
    target = next(f for f in fields if f['name'] == field)
    cy = (target['rect'][1] + target['rect'][3])/2
    candidates = [f for f in fields if f['type'] == 'CheckBox' and f['page'] == target['page'] and f['rect'][0] < target['rect'][0] and abs((f['rect'][1]+f['rect'][3])/2-cy) < 5]
    if candidates:
        checkbox = max(candidates, key=lambda f: f['rect'][0])
        checkboxes[checkbox['name']] = path
spell_groups = {str(i): [] for i in range(10)}
for f in sorted([f for f in fields if f['name'].startswith('Spells ')], key=lambda f: (f['rect'][0], f['rect'][1])):
    column = int(f['rect'][0]//200)
    preceding = [(i+1, s) for i, s in enumerate(slots) if int(s['rect'][0]//200) == column and s['rect'][1] < f['rect'][1]]
    level = preceding[-1][0] if preceding else 0
    spell_groups[str(level)].append(f['name'])
mapped = set(mapping) | set(checkboxes) | {f for group in spell_groups.values() for f in group}
manifest.update({'adapterVersion': 1, 'mapping': mapping, 'checkboxMapping': checkboxes, 'spellGroups': spell_groups, 'unmappedFields': sorted(names-mapped), 'supplement': 'Documento integral em páginas AcroForm adicionais: inclui proficiências, ataques, magias, inventário e Strixhaven sem limite de linhas.', 'actionsPolicy': 'Remove JavaScript e ações de cálculo somente da cópia em memória; os valores 2024 fornecidos são autoritativos.'})
gravar(manifest_path, manifest)
gravar(ROOT/'dados/pdf-templates/bardo-critical20.json', {k: manifest[k] for k in ['id', 'sha256', 'pages', 'adapterVersion', 'mapping', 'checkboxMapping', 'spellGroups', 'unmappedFields', 'supplement']} | {'url': '../reference/templates/'+destino.name, 'validated': manifest.get('validated', False) and manifest.get('exportProof', {}).get('adapterSha256') == hashlib.sha256((ROOT/'site/js/pdf-bardo.js').read_bytes()).hexdigest() and manifest.get('exportProof', {}).get('generatorSha256') == hashlib.sha256((ROOT/'site/js/strixhaven/exportacao.js').read_bytes()).hexdigest()})
print(f'{len(mapping)} campos textuais + {len(checkboxes)} proficiências mapeados; grupos de magias: ' + str({k: len(v) for k, v in spell_groups.items()}))
