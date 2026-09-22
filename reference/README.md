# Referências privadas

Livros: coloque os PDFs originais em `reference/books/`. Modelos de ficha:
`reference/templates/`. Também são reconhecidos, sem mover ou modificar nada,
`assets-private/` da raiz do aplicativo e `../assets-private/` deste ambiente.
Arquivos são identificados por hash, não pelos sufixos de download.

Não coloque livros em `site/`, `dados/`, `public/` ou `_dist/`. O empacotador
`scripts/preparar_dist.py` usa somente `site/` e `dados/`. Sirva a aplicação a
partir de `_dist/` para não expor as referências pelo servidor HTTP simples.

Ambiente de auditoria (não é dependência do aplicativo):

```sh
python3 -m venv /tmp/opencode/phb-venv
/tmp/opencode/phb-venv/bin/pip install pymupdf
/tmp/opencode/phb-venv/bin/python scripts/auditar_phb.py --generate
/tmp/opencode/phb-venv/bin/python scripts/auditar_phb.py --check
/tmp/opencode/phb-venv/bin/python scripts/auditar_referencias.py
/tmp/opencode/phb-venv/bin/python scripts/gerar_equipamento_phb.py
/tmp/opencode/phb-venv/bin/python scripts/auditar_dmg.py
/tmp/opencode/phb-venv/bin/python scripts/amostrar_phb.py
```

A geração do catálogo falha se listas e descrições independentes divergirem.
`--check` reabre o PDF, refaz ambas as extrações, reconcilia o catálogo e verifica
associações classe/nível. As correções individuais de OCR estão em
`scripts/excecoes/phb-extracao.json`; nomes bilíngues, em `phb-nomes.txt`.
Não use as traduções de interface como traduções oficiais verificadas.

Manifests e auditorias seguros ficam em `manifests/` e `audits/`. Renderizações,
provas de exportação e PDFs nunca são versionados. A presença de um manifesto
de descoberta não significa que o modelo está habilitado para exportação:
verifique `validated` e `blockers` no manifesto individual.

## Modelo Bardo - Critical20

O modelo é descoberto pelo padrão `Bardo - Critical20*.pdf`, e validado pelo
hash. Não há dependência dos sufixos `(1)`, `(2)` etc. Para preparar uma cópia
privada, sem sobrescrever o original:

```sh
/tmp/opencode/phb-venv/bin/python scripts/preparar_template_bardo.py
```

O script gera uma cópia privada com nome derivado do hash em
`reference/templates/` e um mapa sem bytes do PDF em `dados/pdf-templates/`.
O arquivo privado **não entra em `_dist/`**. Servindo a raiz local, o seletor
detecta a cópia e confere o hash antes de habilitar Bardo. Servindo somente
`_dist/`, o template fica indisponível e Strixhaven atual continua funcionando.

Para auditar uma alteração do mapa/adaptador, a partir de `testes/e2e/`:

```sh
npx playwright test --config=strixhaven.config.mjs phb.spec.mjs --grep Critical20
```

Esse teste pode exercitar um mapa candidato **somente no navegador isolado do
teste**. A aplicação exige `validated: true`. Depois da prova, na raiz:

```sh
/tmp/opencode/phb-venv/bin/python scripts/validar_pdf_phb.py --bardo
/tmp/opencode/phb-venv/bin/python scripts/validar_template_bardo.py
```

Inspecione visualmente `assets-private/entrega/bardo-pdf-render/`. O manifesto
registra campos originais preservados, hash do adaptador e da prova. Uma mudança
do adaptador invalida a prova ao regenerar o manifesto. A auditoria de referências
preserva mapas e provas compatíveis com o hash, em vez de sobrescrevê-los.

Os dois Tetse encontrados têm hashes diferentes. Ambos foram enumerados e
renderizados com recuperação do PyMuPDF; `pdfinfo` não abre os originais.
O reposicionamento dos campos sobre a arte ainda não foi validado, portanto
não são oferecidos como exportadores funcionais.
