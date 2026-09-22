"""Contratos públicos do catálogo, derivados da leitura privada do PHB."""
import hashlib
import json
import re
import unittest
import unicodedata
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
def ler(p):
    return json.loads((ROOT/p).read_text())
def normalizar(s):
    return re.sub('[^a-z0-9]', '', unicodedata.normalize('NFKD', s).lower())

class AuditoriaMagias(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.audit = ler('reference/audits/phb-spells-audit.json')
        cls.catalogo = ler('dados/legacy/phb-spells.json')['magias']

    def test_quatro_passagens_e_hash_da_fonte(self):
        a = self.audit
        self.assertTrue(a['passes']['final']['executed'])
        self.assertTrue(a['passes']['final']['passed'])
        self.assertFalse(any(a['passes']['reconciliation'].values()))
        self.assertEqual(a['sha256'], ler('reference/manifests/books/phb-2014-10th.json')['sha256'])
        self.assertEqual(a['catalogSha256'], hashlib.sha256((ROOT/'dados/legacy/phb-spells.json').read_bytes()).hexdigest())
        self.assertEqual(len(self.catalogo), a['passes']['descriptions']['normalized'])
        self.assertEqual({d['normalized'] for d in a['descriptions']}, {normalizar(m['name']['en']) for m in self.catalogo})
        self.assertEqual({l['class'] for l in a['lists']}, {'bard','cleric','druid','paladin','ranger','sorcerer','warlock','wizard'})

    def test_associacoes_e_niveis_exatos(self):
        classes = dict(bard='Bardo', cleric='Clérigo', druid='Druida', paladin='Paladino', ranger='Guardião', sorcerer='Feiticeiro', warlock='Bruxo', wizard='Mago')
        for m in self.catalogo:
            nome = normalizar(m['name']['en'])
            ocorrencias = [l for l in self.audit['lists'] if l['normalized'] == nome]
            self.assertTrue(ocorrencias, m['id'])
            self.assertEqual(set(m['classes']), {classes[l['class']] for l in ocorrencias})
            self.assertTrue(all(l['level'] == m['circulo'] for l in ocorrencias), m['id'])
            descricao = [d for d in self.audit['descriptions'] if d['normalized'] == nome]
            self.assertEqual(len(descricao), 1)
            self.assertEqual(descricao[0]['level'], m['circulo'])

    def test_contrato_bilingue_componentes_e_unicidade(self):
        self.assertEqual(len(self.catalogo), len({m['id'] for m in self.catalogo}))
        for m in self.catalogo:
            for campo in ['ptBR','en','ptBRStatus']:
                self.assertTrue(m['name'][campo], m['id'])
            self.assertIsInstance(m['name']['aliases'], list)
            self.assertIn(m['circulo'], range(10))
            self.assertEqual(m['source']['rulesVersion'], '2014-legacy')
            self.assertTrue(m['source']['printedPage'])
            self.assertIsInstance(m['concentracao'], bool)
            self.assertIsInstance(m['ritual'], bool)
            self.assertTrue(m['componentes'])
            if 'M' in m['componentes']:
                self.assertTrue(m['material_resumo'], m['id'])
        guia = [m for m in self.catalogo if m['name']['en'] == 'Guidance']
        self.assertEqual(len(guia),1)
        self.assertEqual(guia[0]['nome'],'Orientação')
        self.assertEqual(set(guia[0]['classes']), {'Clérigo','Druida'})

    def test_extracoes_brutas_somente_privadas(self):
        for path in ['reference/audits/phb-spells-audit.json', 'reference/audits/phb-spells.json']:
            a = ler(path)
            for r in a['lists'] + a['descriptions']:
                self.assertNotIn('rawName',r)
                self.assertNotIn('rawSchool',r)
                self.assertNotIn('metadataRawHeaders',r)
        for pasta in ['site','dados','_dist']:
            self.assertFalse(list((ROOT/pasta).rglob('*.pdf')))
            self.assertFalse(list((ROOT/pasta).rglob('phb-spells-raw*')))

if __name__ == '__main__':
    unittest.main()
