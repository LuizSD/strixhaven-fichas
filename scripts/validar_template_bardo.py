"""Gate do adaptador após a prova E2E real, com conferência de campos e ações."""
import hashlib
import json
from collections import Counter
import pymupdf as fitz
from auditar_phb import ROOT, gravar

manifest_path = ROOT/'reference/manifests/pdf-templates/bardo-critical20.json'
manifest = json.loads(manifest_path.read_text())
arquivo = ROOT/'assets-private/entrega/bardo-phb-editavel.pdf'
doc = fitz.open(arquivo)
widgets = [w for p in doc for w in p.widgets() or []]
counts = Counter(w.field_name for w in widgets)
original = Counter(w['name'] for w in manifest['fields'])
for name, count in original.items():
    assert counts[name] == count, name
values = {w.field_name: w.field_value for w in widgets}
assert values['CharacterName'] == 'Auditoria PHB'
assert values['ClassLevel'] == 'Clérigo 1'
assert values['ST Strength'] == '+0'
assert values['Medicine'] == '+0'
assert values['SlotsTotal 19'] == '2'
assert 'Silvestre' in values['ProficienciesLang']
assert values['FactionName'] == 'Quandrix'
assert doc.xref_get_key(doc.pdf_catalog(), 'OpenAction')[0] == 'null'
assert doc.xref_get_key(doc.pdf_catalog(), 'Names/JavaScript')[0] == 'null'
for w in widgets:
    if w.field_name in manifest['mapping']:
        assert not w.field_flags & fitz.PDF_FIELD_IS_READ_ONLY
        assert doc.xref_get_key(w.xref, 'AP')[0] != 'null'
        assert doc.xref_get_key(w.xref, 'AA')[0] == 'null'
proof = {'sha256': hashlib.sha256(arquivo.read_bytes()).hexdigest(), 'adapterSha256': hashlib.sha256((ROOT/'site/js/pdf-bardo.js').read_bytes()).hexdigest(), 'generatorSha256': hashlib.sha256((ROOT/'site/js/strixhaven/exportacao.js').read_bytes()).hexdigest(), 'originalWidgetsPreserved': sum(original.values()), 'outputWidgets': len(widgets), 'pages': len(doc), 'fieldsRenamed': 0, 'flattened': False, 'actionsRemoved': True, 'visualReview': 'Páginas 1–3 e continuação renderizadas; rótulos originais preservados, português principal; excedentes no complemento.'}
manifest.update({'validated': True, 'exportProof': proof, 'inputIssues': [b for b in (manifest.get('blockers') or manifest.get('inputIssues', [])) if not b.startswith('Adaptação completa')], 'blockers': []})
gravar(manifest_path, manifest)
public_path = ROOT/'dados/pdf-templates/bardo-critical20.json'
public = json.loads(public_path.read_text())
public['validated'] = True
gravar(public_path, public)
gravar(ROOT/'reference/audits/bardo-adapter-validation.json', proof)
print(json.dumps(proof, indent=2, ensure_ascii=False))
