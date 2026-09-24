"""Importação determinística; valida a fonte privada ANTES de escrever dados públicos."""
import hashlib
import json
from pathlib import Path
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
HASH = '28a6257a7a04b2578f867fd0d6a7a1a9b05bdc4f42a0f44942bc8cf6f416d3c0'
CLASS = 'artificer-ua-2019'
LISTAS = [
 'acid splash;create bonfire;dancing lights;fire bolt;frostbite;guidance;light;mage hand;magic stone;mending;message;poison spray;prestidigitation;ray of frost;resistance;shocking grasp;spare the dying;thorn whip;thunderclap',
 'absorb elements;alarm;arcane weapon;catapult;cure wounds;detect magic;disguise self;expeditious retreat;faerie fire;false life;feather fall;grease;identify;jump;longstrider;sanctuary;snare',
 'aid;alter self;arcane lock;blur;continual flame;darkvision;enhance ability;enlarge/reduce;heat metal;invisibility;lesser restoration;levitate;magic mouth;magic weapon;protection from poison;pyrotechnics;rope trick;see invisibility;skywrite;spider climb',
 'blink;catnap;dispel magic;elemental weapon;flame arrows;fly;gaseous form;glyph of warding;haste;protection from energy;revivify;tiny servant;water breathing;water walk',
 "arcane eye;elemental bane;fabricate;freedom of movement;Leomund's secret chest;Mordenkainen's faithful hound;Mordenkainen's private sanctum;Otiluke's resilient sphere;stone shape;stoneskin;vitriolic sphere",
 "animate objects;Bigby's hand;creation;greater restoration;skill empowerment;transmute rock;wall of stone"
]
SUBS = {
 'alchemist':(6,'purify food and drink;ray of sickness;Melf\'s acid arrow;web;create food and water;stinking cloud;blight;death ward;cloudkill;raise dead'),
 'archivist':(8,'comprehend languages;dissonant whispers;detect thoughts;locate object;hypnotic pattern;tongues;locate creature;phantasmal killer;legend lore;modify memory'),
 'artillerist':(9,'shield;thunderwave;scorching ray;shatter;fireball;wind wall;ice storm;wall of fire;cone of cold;wall of force'),
 'battle-smith':(11,'heroism;searing smite;branding smite;warding bond;aura of vitality;blinding smite;aura of purity;staggering smite;banishing smite;mass cure wounds')
}
XGE = dict(zip('create bonfire;frostbite;magic stone;thunderclap;absorb elements;catapult;snare;pyrotechnics;skywrite;catnap;flame arrows;tiny servant;elemental bane;vitriolic sphere;skill empowerment;transmute rock'.split(';'),
 'Criar Fogueira;Queimadura de Frio;Pedra Mágica;Estrondo Trovejante;Absorver Elementos;Catapulta;Armadilha;Pirotecnia;Escrita Celeste;Cochilo;Flechas de Chamas;Servo Minúsculo;Flagelo Elemental;Esfera Vitriólica;Aprimorar Perícia;Transmutar Rocha'.split(';')))
RITUAIS = set('alarm;detect magic;identify;magic mouth;skywrite;water breathing;water walk'.split(';'))
def fonte(page):
    return dict(sourceId=CLASS, sourceTitle='UA 2019 · Playtest', file='UA-Artificer2-2019.pdf', rulesVersion='ua-2019-playtest', printedPage=page)
def normal(s):
    return ''.join(c for c in s.lower() if c.isalnum())
def slug(s):
    import re
    return re.sub('[^a-z0-9]+','-',s.lower()).strip('-')
def validar_fonte():
    paths = sorted({p.resolve() for parent in [ROOT/'assets-private', ROOT.parent/'assets-private'] if parent.exists() for p in parent.rglob('UA-Artificer2-2019.pdf')})
    if len(paths) != 1:
        raise ValueError(f'Esperada uma fonte privada sem ambiguidade; encontradas {len(paths)}: {paths}')
    path = paths[0]
    actual = hashlib.sha256(path.read_bytes()).hexdigest()
    if actual != HASH:
        raise ValueError(f'SHA-256 divergente em {path}: {actual}; esperado {HASH}')
    info = subprocess.check_output(['pdfinfo',str(path)],text=True)
    campos = dict(l.split(':',1) for l in info.splitlines() if ':' in l)
    for key,value in {'Title':'UA Eberron Artificer','Author':'Crawford, Jeremy','Pages':'14'}.items():
        if campos.get(key,'').strip() != value:
            raise ValueError(f'{path}: {key}={campos.get(key)!r}; esperado {value!r}')
    subprocess.run(['git','check-ignore','--quiet','assets-private/UA-Artificer2-2019.pdf'],cwd=ROOT,check=True)
    return path
def gerar():
    path=validar_fonte()
    existentes=json.loads((ROOT/'dados/legacy/phb-spells.json').read_text())['magias']
    por_nome={normal(m['name']['en']):m for m in existentes}
    registros={}; novos=[]; associacoes=[]; subclasses={}
    def resolver(en,circulo,page=4):
        key=normal(en)
        if key in por_nome:
            m=por_nome[key]
            if m['circulo'] != circulo: raise ValueError(f'Círculo divergente: {en}')
        elif en=='arcane weapon':
            m=dict(id='ua-2019-arcane-weapon',nome='Arma Arcana',name=dict(ptBR='Arma Arcana',en='Arcane Weapon',ptBRStatus='interface-translation'),circulo=1,escola='Transmutação',classes=[CLASS],tempo_conjuracao='1 ação bônus',alcance='Pessoal',componentes='V, S',duracao='Concentração, até 1 hora',concentracao=True,ritual=False,source=fonte(14),descricao='Uma arma simples ou marcial empunhada torna-se mágica e causa +1d6 de ácido, frio, fogo, elétrico, veneno ou trovejante (escolha ao conjurar). Ação bônus troca o tipo. Com espaço de círculo 3 ou superior, concentração até 8 horas.',upcast=dict(minCircle=3,durationHours=8),damage=dict(dice='1d6',types=['acid','cold','fire','lightning','poison','thunder']))
            if not any(x['id']==m['id'] for x in novos): novos.append(m)
        elif en in XGE:
            # O UA fornece associação e círculo, não escola/descrição dessas magias.
            m=dict(id='xge-2017-'+slug(en),nome=XGE[en],name=dict(ptBR=XGE[en],en=en.title(),ptBRStatus='interface-translation'),circulo=circulo,classes=[CLASS],ritual=en in RITUAIS,escola='',descricao='Citada na lista do Artífice UA 2019, p.4. Detalhes exigem a fonte original Xanathar’s Guide to Everything, não fornecida nesta importação.',detailsUnavailable=True,source=dict(sourceId='xge-2017',sourceTitle="Xanathar’s Guide to Everything",rulesVersion='2014',printedPage=None),citedBy=fonte(4))
            if not any(x['id']==m['id'] for x in novos): novos.append(m)
        else:
            raise ValueError(f'Magia sem reconciliação canônica: {en}')
        registros[m['id']]={k:m[k] for k in ['id','nome','name','circulo','source','ritual','tempo_conjuracao'] if k in m}
        return m['id']
    for circulo,texto in enumerate(LISTAS):
        for en in texto.split(';'):
            mid=resolver(en,circulo)
            associacoes.append(dict(spellId=mid,classId=CLASS,circulo=circulo,ritual=en in RITUAIS,source=fonte(4)))
    for sid,(page,texto) in SUBS.items():
        subclasses[sid]=[]
        for i,en in enumerate(texto.split(';')):
            circulo=i//2+1; mid=resolver(en,circulo,page)
            subclasses[sid].append(dict(spellId=mid,classId=CLASS,subclassId=sid,nivel=[3,5,9,13,17][i//2],semprePreparada=True,source=fonte(page)))
    resultado=dict(associacoes=associacoes,especializacoes=subclasses,referencias=registros,novas=novos)
    destino=ROOT/'site/js/artificer-ua/magias-dados.js'
    content='// Gerado por scripts/importar_artificer_ua.py após validar SHA-256 e metadados.\nexport const MAGIAS_UA = '+json.dumps(resultado,ensure_ascii=False,indent=2)+';\n'
    if '--check' in sys.argv:
        if not destino.exists() or destino.read_text()!=content: raise ValueError('Dados derivados UA divergentes; execute o importador sem --check.')
    else: destino.write_text(content)
    print(f'Fonte validada: {path}; 88 associações, 40 vínculos de especialização; {len(novos)} registros novos (incluindo citações sem detalhes).')
if __name__=='__main__':
    try: gerar()
    except (ValueError,subprocess.CalledProcessError) as e: sys.exit(str(e))
