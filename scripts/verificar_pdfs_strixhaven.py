"""Inspeção local de PDFs gerados. Requer PyMuPDF e Pillow só no ambiente de verificação."""
from pathlib import Path
import json
import re
import pymupdf as fitz
from PIL import Image, ImageDraw

base = Path(__file__).resolve().parents[1] / 'assets-private/entrega'
saida = base / 'pdf-renderizados'
saida.mkdir(exist_ok=True)
relatorio = {}
for arquivo in sorted(base.glob('*.pdf')):
    # Somente prévias geradas por este script; preserva PDFs e arquivos livres.
    padrao = re.compile(re.escape(arquivo.stem) + r'-(?:\d{3,}|contato-\d+)\.png')
    for previa in saida.iterdir():
        if previa.is_file() and padrao.fullmatch(previa.name):
            previa.unlink()
    doc = fitz.open(arquivo)
    miniaturas = []
    campos = []
    texto = ''
    for numero, pagina in enumerate(doc, 1):
        texto += pagina.get_text()
        for palavra in pagina.get_text('words'):
            assert palavra[0] >= -1 and palavra[2] <= pagina.rect.width + 1, f'Texto além da margem: {arquivo.name}, página {numero}'
        pix = pagina.get_pixmap(matrix=fitz.Matrix(1.3, 1.3), alpha=False)
        pix.save(saida / f'{arquivo.stem}-{numero:03}.png')
        imagem = Image.frombytes('RGB', [pix.width, pix.height], pix.samples)
        imagem.thumbnail((290, 420))
        mini = Image.new('RGB', (310, 450), 'white')
        mini.paste(imagem, (10, 25))
        ImageDraw.Draw(mini).text((10, 5), f'Página {numero}', fill='black')
        miniaturas.append(mini)
        for campo in pagina.widgets() or []:
            assert pagina.rect.contains(campo.rect), f'Campo fora da página: {campo.field_name}'
            campos.append({'nome': campo.field_name, 'valor': campo.field_value, 'pagina': numero})
    assert texto.strip(), f'PDF sem texto: {arquivo}'
    if 'editavel' in arquivo.stem:
        assert campos, 'AcroForm sem campos'
        assert any(c['valor'] == 'NPC de teste' or str(c['valor']).startswith('Relação ') for c in campos)
    if 'descritivo' in arquivo.stem:
        assert 'vida acadêmica' in texto.casefold()
        assert 'extra' in texto.casefold()
    for inicio in range(0, len(miniaturas), 12):
        lote = miniaturas[inicio:inicio+12]
        painel = Image.new('RGB', (310 * 3, 450 * ((len(lote)+2)//3)), '#cccccc')
        for i, mini in enumerate(lote):
            painel.paste(mini, ((i % 3)*310, (i//3)*450))
        painel.save(saida / f'{arquivo.stem}-contato-{inicio//12+1}.png')
    relatorio[arquivo.name] = {'paginas': len(doc), 'campos': len(campos), 'valores': campos}
(base / 'pdf-verificacao.json').write_text(json.dumps(relatorio, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({k: {'paginas': v['paginas'], 'campos': v['campos']} for k, v in relatorio.items()}, ensure_ascii=False, indent=2))
