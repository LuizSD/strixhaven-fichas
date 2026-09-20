"""Gera PNGs públicos do SVG próprio. PyMuPDF é ferramenta de desenvolvimento, não runtime."""
from pathlib import Path
import pymupdf

imagens = Path(__file__).resolve().parents[1] / 'site/img'
doc = pymupdf.open(imagens / 'strixhaven.svg')
pagina = doc[0]
for tamanho in (192, 512):
    pix = pagina.get_pixmap(matrix=pymupdf.Matrix(tamanho / pagina.rect.width, tamanho / pagina.rect.height), alpha=True)
    arquivo = imagens / f'strixhaven-{tamanho}.png'
    pix.save(arquivo)
    assert pix.width == tamanho and pix.height == tamanho
    print(f'{arquivo.name}: {pix.width}x{pix.height}')
