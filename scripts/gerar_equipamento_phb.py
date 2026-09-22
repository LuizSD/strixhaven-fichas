"""Estrutura transcrição revisável das tabelas, mantendo peso desconhecido ausente."""
import re
from collections import Counter
from auditar_phb import ROOT, gravar


def main():
    categoria = ''
    itens = []
    for linha in (ROOT/'scripts/excecoes/phb-equipamento.txt').read_text().splitlines():
        if linha.startswith(('# Armas', '# Equipamento', '# Ferramentas', '# Jogos', '# Instrumentos', '# Pacotes', '# Arreios')):
            categoria = linha[2:]
        if not linha or linha.startswith('#'):
            continue
        en, pt, custo, peso, dano, tipo_dano, props = linha.split('|')
        qtd, unidade = custo.split()
        arma = categoria.startswith('Armas')
        item = {'id': 'phb-2014-item-' + re.sub(r'[^a-z0-9]+', '-', en.lower()).strip('-'), 'nome': pt, 'name': {'en': en, 'ptBR': pt, 'ptBRStatus': 'interface-translation'}, 'category': categoria, 'cost': {'amount': float(qtd), 'unit': unidade}, 'custo': f'{qtd} ' + {'gp': 'PO', 'sp': 'PP', 'cp': 'PC'}[unidade], 'source': {'sourceId': 'phb-2014-10th', 'sourceTitle': 'Player’s Handbook (2014), 10th printing', 'rulesVersion': '2014-legacy', 'printedPage': 149 if arma else 150, 'section': 'Equipment'}}
        if peso:
            item['weightLb'] = float(peso)
            item['peso'] = f'{float(peso)*0.45359237:.3f} kg'
        if arma:
            item['weapon'] = {'category': 'simple' if 'simples' in categoria else 'martial', 'usage': 'ranged' if 'distância' in categoria else 'melee', 'damage': dano or None, 'damageType': tipo_dano or None, 'properties': props.split(', ') if props else []}
            item.update({'categoria': categoria, 'dano': f'{dano} {tipo_dano}'.strip(), 'propriedades': props})
        pagina = re.search(r'\((\d+)\)', categoria)
        if pagina:
            item['source']['printedPage'] = int(pagina[1])
            item['category'] = categoria[:pagina.start()].strip()
        itens.append(item)
    # p.145: pesos das pesadas/escudo recuperados na conferência da imagem
    # phb-table-145.png; a camada textual omite essas cinco células.
    armaduras = [
        ('Padded', 'Acolchoada', 5, 8, 'light', 11, None, True),
        ('Leather', 'Couro', 10, 10, 'light', 11, None, False),
        ('Studded leather', 'Couro Batido', 45, 13, 'light', 12, None, False),
        ('Hide', 'Gibão de Peles', 10, 12, 'medium', 12, None, False),
        ('Chain shirt', 'Camisão de Malha', 50, 20, 'medium', 13, None, False),
        ('Scale mail', 'Brunea', 50, 45, 'medium', 14, None, True),
        ('Breastplate', 'Peitoral', 400, 20, 'medium', 14, None, False),
        ('Half plate', 'Meia Armadura', 750, 40, 'medium', 15, None, True),
        ('Ring mail', 'Cota de Anéis', 30, 40, 'heavy', 14, None, True),
        ('Chain mail', 'Cota de Malha', 75, 55, 'heavy', 16, 13, True),
        ('Splint', 'Armadura de Talas', 200, 60, 'heavy', 17, 15, True),
        ('Plate', 'Armadura de Placas', 1500, 65, 'heavy', 18, 15, True),
        ('Shield', 'Escudo', 10, 6, 'shield', 2, None, False),
    ]
    for en, pt, custo, peso, categoria, ca, forca, furtividade in armaduras:
        item = {'id': 'phb-2014-item-' + en.lower().replace(' ', '-'), 'nome': pt, 'name': {'en': en, 'ptBR': pt, 'ptBRStatus': 'interface-translation'}, 'category': 'Armaduras e escudos', 'cost': {'amount': custo, 'unit': 'gp'}, 'custo': f'{custo} PO', 'armor': {'category': categoria, 'baseAC': ca, 'dexterityRule': {'light': 'full', 'medium': 'max-2', 'heavy': 'none', 'shield': 'bonus'}[categoria], 'strengthRequirement': forca, 'stealthDisadvantage': furtividade}, 'source': {'sourceId': 'phb-2014-10th', 'sourceTitle': 'Player’s Handbook (2014), 10th printing', 'rulesVersion': '2014-legacy', 'printedPage': 145, 'section': 'Armor'}}
        if peso is not None:
            item.update({'weightLb': peso, 'peso': f'{peso*0.45359237:.3f} kg'})
        itens.append(item)
    # p.157, coluna Carrying Capacity é capacidade, nunca peso do animal.
    montarias = [
        ('Camel', 'Camelo', 50, 50, 480), ('Donkey or mule', 'Burro ou Mula', 8, 40, 420),
        ('Elephant', 'Elefante', 200, 40, 1320), ('Horse, draft', 'Cavalo de Carga', 50, 40, 540),
        ('Horse, riding', 'Cavalo de Montaria', 75, 60, 480), ('Mastiff', 'Mastim', 25, 40, 195),
        ('Pony', 'Pônei', 30, 40, 225), ('Warhorse', 'Cavalo de Guerra', 400, 60, 540),
    ]
    barcos = [('Galley', 'Galé', 30000, 4), ('Keelboat', 'Barco de Quilha', 3000, 1), ('Longship', 'Dracar', 10000, 3), ('Rowboat', 'Barco a Remo', 50, 1.5), ('Sailing ship', 'Navio à Vela', 10000, 2), ('Warship', 'Navio de Guerra', 25000, 2.5)]
    for row in montarias + barcos:
        en, pt, custo, velocidade, *capacidade = row
        item = {'id': 'phb-2014-item-' + re.sub(r'[^a-z0-9]+', '-', en.lower()).strip('-'), 'nome': pt, 'name': {'en': en, 'ptBR': pt, 'ptBRStatus': 'interface-translation'}, 'category': 'Montarias' if capacidade else 'Veículos aquáticos', 'cost': {'amount': custo, 'unit': 'gp'}, 'custo': f'{custo} PO', 'speed': {'amount': velocidade, 'unit': 'ft' if capacidade else 'mph'}, 'source': {'sourceId': 'phb-2014-10th', 'sourceTitle': 'Player’s Handbook (2014), 10th printing', 'rulesVersion': '2014-legacy', 'printedPage': 157, 'section': 'Mounts and vehicles'}}
        if capacidade:
            item['carryingCapacityLb'] = capacidade[0]
        if en == 'Rowboat':
            item.update({'weightLb': 100, 'peso': '45.359 kg'})
        itens.append(item)
    capacidades = {
        'Backpack': {'cubicFeet': 1, 'weightLb': 30}, 'Barrel': {'gallons': 40, 'cubicFeet': 4},
        'Basket': {'cubicFeet': 2, 'weightLb': 40}, 'Bottle, glass': {'pints': 1.5},
        'Bucket': {'gallons': 3, 'cubicFeet': .5}, 'Chest': {'cubicFeet': 12, 'weightLb': 300},
        'Flask or tankard': {'pints': 1}, 'Jug or pitcher': {'gallons': 1}, 'Pot, iron': {'gallons': 1},
        'Pouch': {'cubicFeet': .2, 'weightLb': 6}, 'Sack': {'cubicFeet': 1, 'weightLb': 30},
        'Vial': {'fluidOunces': 4}, 'Waterskin': {'pints': 4},
    }
    for item in itens:
        if item['name']['en'] in capacidades:
            item['capacity'] = capacidades[item['name']['en']] | {'printedPage': 153}
    assert len({i['id'] for i in itens}) == len(itens)
    gravar(ROOT/'dados/legacy/phb-equipment.json', {'schemaVersion': 2, 'itens': itens})
    gravar(ROOT/'reference/audits/phb-equipment.json', {'count': len(itens), 'byCategory': dict(Counter(i['category'] for i in itens)), 'idsAdded': [i['id'] for i in itens], 'weightNotSpecified': [i['id'] for i in itens if 'weightLb' not in i], 'examinedPrintedPages': [145, 149, 150, 151, 153, 154, 157], 'visualCorrections': [{'printedPage': 145, 'field': 'weightLb', 'values': {'Ring mail': 40, 'Chain mail': 55, 'Splint': 60, 'Plate': 65, 'Shield': 6}, 'reason': 'Células ausentes na camada textual; conferidas na imagem privada phb-table-145.png.'}], 'notImplemented': ['Conteúdo e expansão automática dos sete pacotes', 'Barding parametrizado por armadura', 'Bens comerciais, custos de hospedagem e despesas diárias', 'Aplicação automática de CA/dano de itens legados: requer ajuste explícito na ficha']})
    print(f'{len(itens)} itens; pesos ausentes: {sum("weightLb" not in i for i in itens)}')


if __name__ == '__main__':
    main()
