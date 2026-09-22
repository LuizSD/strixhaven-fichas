"""Validação pública de contratos. Auditoria privada bloqueante: auditar_phb.py --check."""
import hashlib
import json
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]


def ler(path):
    return json.loads((ROOT/path).read_text())


class CatalogoPHB(unittest.TestCase):
    def test_reconciliacao_publica_derivada_do_pdf(self):
        audit = ler('reference/audits/phb-spells.json')
        spells = ler('dados/legacy/phb-spells.json')['magias']
        self.assertFalse(any(audit['passes']['reconciliation'].values()))
        self.assertEqual(len(spells), audit['passes']['descriptions']['normalized'])
        self.assertEqual(audit['catalogSha256'], hashlib.sha256((ROOT/'dados/legacy/phb-spells.json').read_bytes()).hexdigest())
        self.assertEqual(len(spells), len({m['id'] for m in spells}))
        for m in spells:
            self.assertIn(m['circulo'], range(10))
            self.assertTrue(m['classes'])
            self.assertTrue(m['name']['en'])
            self.assertTrue(m['name']['ptBR'])
            for campo in ['escola', 'tempo_conjuracao', 'alcance', 'componentes', 'duracao']:
                self.assertTrue(m[campo], (m['id'], campo))
            self.assertEqual(m['source']['rulesVersion'], '2014-legacy')
            self.assertIn(m['source']['printedPage'], range(211, 290))
            self.assertFalse(m['descricao'])

    def test_guidance(self):
        spells = ler('dados/legacy/phb-spells.json')['magias']
        guidance = [m for m in spells if m['name']['en'] == 'Guidance']
        self.assertEqual(len(guidance), 1)
        self.assertEqual(guidance[0]['nome'], 'Orientação')
        self.assertEqual(guidance[0]['classes'], ['Clérigo', 'Druida'])
        self.assertEqual(guidance[0]['circulo'], 0)

    def test_equipamento_nao_inventa_peso(self):
        itens = ler('dados/legacy/phb-equipment.json')['itens']
        self.assertEqual(len(itens), len({i['id'] for i in itens}))
        self.assertTrue(any('weightLb' not in i for i in itens))
        for i in itens:
            self.assertEqual(i['source']['rulesVersion'], '2014-legacy')
            self.assertTrue(i['name']['en'])
            if 'weightLb' not in i:
                self.assertNotIn('peso', i)

    def test_reference_e_privacidade_do_artefato(self):
        for p in ['books', 'templates', 'manifests/books', 'manifests/pdf-templates', 'audits']:
            self.assertTrue((ROOT/'reference'/p).is_dir())
        for p in ['site', 'dados', '_dist']:
            pdfs = list((ROOT/p).rglob('*.pdf'))
            self.assertFalse(pdfs, f'PDF inesperado no artefato público: {pdfs}')
        manifests = list((ROOT/'reference/manifests/books').glob('*.json'))
        self.assertGreaterEqual(len(manifests), 2)
        t = ler('reference/manifests/pdf-templates/tetse-strixhaven.json')
        b = ler('reference/manifests/pdf-templates/bardo-critical20.json')
        self.assertNotEqual(t['sha256'], b['sha256'])
        self.assertNotEqual(t['fields'], b['fields'])


if __name__ == '__main__':
    unittest.main()
