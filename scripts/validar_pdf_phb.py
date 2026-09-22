"""Reabre PDF da prova e renderiza todas as páginas, sem alterar o original."""
import pymupdf as fitz
import argparse
import hashlib
from auditar_phb import ROOT, gravar

parser = argparse.ArgumentParser()
parser.add_argument('--bardo', action='store_true')
args = parser.parse_args()
arquivo = ROOT/('assets-private/entrega/bardo-phb-editavel.pdf' if args.bardo else 'assets-private/entrega/phb-editavel.pdf')
doc = fitz.open(arquivo)
destino = ROOT/('assets-private/entrega/bardo-pdf-render' if args.bardo else 'assets-private/entrega/phb-pdf-render')
destino.mkdir(parents=True, exist_ok=True)
campos = []
for n, pagina in enumerate(doc, 1):
    pagina.get_pixmap(matrix=fitz.Matrix(1, 1)).save(destino/f'{n:03}.png')
    for w in pagina.widgets() or []:
        assert pagina.rect.contains(w.rect), (n, w.field_name)
        if w.field_type == fitz.PDF_WIDGET_TYPE_TEXT:
            assert not w.field_flags & fitz.PDF_FIELD_IS_READ_ONLY, w.field_name
        assert doc.xref_get_key(w.xref, 'AP')[0] != 'null', w.field_name
        campos.append({'name': w.field_name, 'value': w.field_value, 'page': n, 'rect': list(w.rect)})
valores = {c['value'] for c in campos}
esperados = ['Auditoria PHB', 'Silvestre', 'Idioma da Prova', 'Orientação', 'Desejo'] if args.bardo else ['Auditoria PHB', 'Silvestre', 'Linguagem Estelar', 'Desejo', 'Recompensa futura']
for esperado in esperados:
    assert esperado in valores, esperado
gravar(ROOT/('reference/audits/bardo-export-proof.json' if args.bardo else 'reference/audits/phb-export-proof.json'), {'pages': len(doc), 'widgets': len(campos), 'editable': True, 'appearances': True, 'expectedValues': esperados, 'renderedPages': len(doc)})
if not args.bardo:
    gravar(ROOT/'reference/manifests/pdf-templates/strixhaven-gerador.json', {'id': 'strixhaven-atual', 'kind': 'generated-template', 'validated': True, 'sourcePattern': None, 'templateHash': None, 'generatorSource': 'site/js/strixhaven/exportacao.js', 'generatorSha256': hashlib.sha256((ROOT/'site/js/strixhaven/exportacao.js').read_bytes()).hexdigest(), 'pages': 'dynamic', 'pageSize': [595, 842], 'fieldNamePattern': 'campo.<sequence>.<document path>.<continuation offset>', 'proof': {'sha256': hashlib.sha256(arquivo.read_bytes()).hexdigest(), 'pages': len(doc), 'widgets': len(campos), 'editable': True}, 'coverage': 'Percorre propriedades do documento e cria continuação; retrato binário fica fora do formulário textual.'})
print(f'{len(doc)} páginas; {len(campos)} widgets editáveis; appearances e valores conferidos.')
