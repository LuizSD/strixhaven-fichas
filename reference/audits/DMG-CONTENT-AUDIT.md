# Guia do Mestre — auditoria independente

- Arquivo: `dd-5e-guia-do-mestre-biblioteca-elfica.pdf`.
- SHA-256: `2ca3c21ee90d703ca5ab0e713540531d37893913afe2aef063d5f7fdb5adfcc3`.
- Português, 322 páginas, identificado como D&D 5e/2014; impressão não confirmada.
  Os créditos iniciais não estão disponíveis na camada textual. O ano/edição
  são identificação bibliográfica, não uma impressão transcrita desses créditos.
- Deslocamento +1 confirmado por múltiplos fólios marginais. Um número 17 em
  tabela perto do rodapé não é fólio; o detector exige também posição na margem.
- Todas as páginas passaram por busca textual de conteúdo relevante; índices
  de presença dos termos estão em `dmg-2014-pt-scan.json`.
- Páginas impressas 153–154: títulos e cabeçalhos de sete anéis confirmados no
  PDF. Dados mecânicos transcritos em `dados/legacy/dmg-items.json`.
- Incorporados: Evasão, Natação, Proteção, Queda Suave, Regeneração, Resistência
  e Três Desejos. Cargas, recuperação, sintonização, bônus e outras propriedades
  permanecem estruturados para consulta e controle manual na ficha.
- Nomes ingleses: tradução de interface, ainda não conferida em PDF inglês.
- Não incorporados: demais opções de personagem e itens, além de capítulos de
  condução da aventura. A varredura por termos não constitui catálogo completo.
- Nenhum texto corrido extenso foi embarcado; nenhum PDF é dependência do
  catálogo em runtime. Não há concessão automática de espaços/bônus por esses
  itens; não substituem mecânicas 2024.

Reprodução: `scripts/auditar_referencias.py` e `scripts/auditar_dmg.py`, com o
venv de PyMuPDF descrito em `reference/README.md`.
