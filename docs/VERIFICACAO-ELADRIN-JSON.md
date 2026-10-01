# Eladrin e exportação JSON local

- `site/js/eladrin.js`: catálogo MPMM, migração idempotente, estações, CD, usos e descanso.
- `site/js/eladrin-ui.js`: detalhes bilíngues, consumo/ajustes de usos, Transe e escolha exclusiva da origem dos aumentos. O slot `bonus_antecedente` continua sendo a única distribuição de origem; `eladrin.origemAtributos` identifica antecedente ou linhagem. Trocar a origem substitui os bônus em vez de somá-los.
- `site/js/documento-json.js`: contrato de array contendo a ficha completa, metadados, nome do arquivo e limite de importação.
- `site/js/exportar-json.js`: download local da ficha aberta, independente de rede e armazenamento, entre Editar ficha e Gerar PDF.

Testes específicos: `testes/regras/unidade/eladrin-json.test.mjs` e `testes/e2e/regras/eladrin-json.spec.mjs`. As expectativas de catálogo incluem Eladrin em `especie-criador.spec.mjs` e `strixhaven/fluxos.spec.mjs`.

A suíte unitária completa depende dos Markdown de referência em `Informacoes Separadas/` e do livro `D&D 5.5 - Livro do Jogador (2024) 5.3.7.md`, ausentes nesta cópia. Os testes correspondentes continuam habilitados.

## Verificação em 30/09/2026

Comandos Node e Playwright executados em `testes/e2e`:

| Comando | Resultado |
|---|---|
| `node --test --test-concurrency=4 --test-reporter=spec --test-reporter-destination=/tmp/opencode/strix-unit-results.txt "../regras/unidade/*.test.mjs"` | 2.561 testes: 2.293 aprovados, 256 ignorados pela suíte existente e 12 falhas por referências Markdown ausentes |
| `npx playwright test --config=regras/playwright.config.mjs --reporter=dot` | 454 aprovados |
| `npx playwright test --config=playwright.config.mjs --reporter=dot` | 3 aprovados; 111 módulos em cache, nenhum ausente |
| `npx playwright test --config=artificer.config.mjs --reporter=dot` | 8 aprovados, incluindo os três modelos PDF |
| `npx playwright test --config=strixhaven.config.mjs --reporter=dot` | 25 aprovados |
| `npx playwright test --config=magias.config.mjs --reporter=dot` | 13 aprovados |
| `npx playwright test --config=ajustes-finais.config.mjs --reporter=dot` | 17 aprovados |
| `npm run test:esm -- /home/luizsd/projetos/strixfichaBase/D-D_2024` | 111 módulos, zero falhas |

Na raiz: `python3 -m unittest discover -s testes/catalogo -v` e `python3 -m unittest discover -s testes/magias -v`: 4 aprovados em cada suíte. Build: `python3 scripts/preparar_dist.py --destino _dist/sem-drive-verificacao --build 20260930`. `git diff --check`: sem erros.

As primeiras execuções completas excederam o limite de 120 segundos da ferramenta; foram repetidas até conclusão com limite ampliado. O extrator de PDF emitiu avisos de marked content, sem falha dos testes.
