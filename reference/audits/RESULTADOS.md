# Resultados de validação — 2026-09-22

## Verificações executadas

| Comando / verificação | Resultado |
|---|---|
| `scripts/auditar_phb.py --generate` | Catálogo gerado após reconciliação independente |
| `scripts/auditar_phb.py --check` | **Passou**: 845 associações, 361 títulos, 361 registros; zero divergências/IDs duplicados |
| `python3 -m unittest discover -s testes/catalogo -v` | **4 passaram** |
| `node testes/e2e/checar_esm.mjs .` | **93 módulos, zero falhas de sintaxe ESM** |
| `npx playwright test --config=strixhaven.config.mjs` | **25 passaram**, incluindo os casos PHB novos |
| `npx playwright test --config=phb.config.mjs` | **10 passaram** com `python3 -m http.server 8000` |
| `npm run test:regras:unidade` | **2.253 passaram, 12 falharam por referências privadas ausentes, 256 ignorados pela suíte existente** |
| `scripts/validar_pdf_phb.py` | Prova atual: **8 páginas, 168 widgets**, valores e editabilidade conferidos |
| `scripts/validar_pdf_phb.py --bardo` | Prova Critical20: **11 páginas, 511 widgets**, valores e editabilidade conferidos |
| `scripts/validar_template_bardo.py` | **334 widgets originais preservados**, zero nomes alterados, sem flatten, ações antigas removidas da cópia |
| `python3 scripts/preparar_dist.py --build 20260922` | Artefato estático gerado em `_dist/` |
| Busca de PDFs em `site/`, `dados/`, `_dist/` | **Nenhum PDF encontrado** |
| Diff de `dados/classes`, `site/js/sheet/classes`, `site/js/dados-classes.js` | **Vazio**; classes e nomes canônicos preservados |

Os comandos PyMuPDF usam `/tmp/opencode/phb-venv/bin/python`.
Os comandos Playwright foram executados em `testes/e2e/` com:

```sh
LD_LIBRARY_PATH=/tmp/opencode/browser-libs/usr/lib/x86_64-linux-gnu
```

Esse ajuste é do ambiente de verificação: o Chromium instalado não encontrava
`libasound.so.2`. Nenhuma dependência Node foi adicionada à aplicação estática.

## Bloqueio da suíte histórica

`unit-tests.json` contém o resumo reproduzível, produzido por
`python3 scripts/verificar_regras_unidade.py`. A suíte retorna código **1**;
o relatório não converte esse resultado em sucesso. As sete referências
ausentes ficam em `Informacoes Separadas/`:

- `Antecedente.md`
- `Classes.md`
- `Criação de Personagens.md`
- `D&D 5.5 - Livro do Jogador (2024) 5.3.7.md`
- `Espécies.md`
- `Magias.md`
- `Talentos.md`

Não foram substituídas pelo PHB 2014 nem fabricadas a partir dos dados sob teste.
Foram corrigidas as regressões encontradas nesta alteração: preservação da
identidade dos objetos de classe em cache, referências de linhas dos testes
estáticos, callback de persistência, fechamento de modais de idiomas e testes
que antes exigiam bloqueio de excesso de truques.

## Cobertura comportamental nova

- Busca Guidance / Orientação / orientacao, classe e nível vindos do PDF.
- Versões 2024 e 2014 distintas; legado não entra em listas automáticas 2024.
- Seleção, correção local, confirmação de duplicata e remoção por ID.
- Círculo 9 em personagem de nível 1; escolha preservada sem novo espaço.
- Banners de falta/excesso e justificativa persistida sem ocultar números.
- Idiomas criados, editados, removidos, salvos, exportados e reimportados.
- Idioma personalizado preservado durante a sessão de criação em memória.
- Importação de coleções malformadas mantém a ficha acessível e conserva os
  valores originais para correção, inclusive nomes legados em string.
- Inventário bilíngue, edição local pelo formulário real, preço/peso corrigidos
  sem mutar o catálogo e substituição manual do peso total.
- PDF com valores, widgets, appearances e campos de texto editáveis.
- Ausência do template opcional não quebra a exportação atual.
- Nome português acima do inglês menor: geometria, contraste AA e reflow em
  viewport de 390 px, inclusive com texto ampliado a 200%.

Os resultados não eliminam as pendências funcionais de
`docs/PHB-CONTENT-AUDIT.md`. Em particular, Tetse continua desabilitado e as
alternativas completas de regras/classes/raças 2014 não foram implementadas.
