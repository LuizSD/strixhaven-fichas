# PHB — catálogo completo e busca global de magias

Execução exclusiva de magias, 2026-09-22. Os arquivos de itens, idiomas,
origens, classes (incluindo Artificer/Artífice) e adaptadores PDF existentes
foram preservados. O menu e o carregamento offline receberam apenas os pontos
de integração necessários à busca de magias.

## Fonte efetivamente examinada

- Arquivo: `Player's Handbook [10th Print] (1).pdf`, em `../assets-private/`
  relativamente à raiz do aplicativo `D-D_2024/`.
- SHA-256: `c0d18ede598e55bc1759a0b64901a207fd24328b832637b2da60950c86b32412`.
- Título interno confirmado nos créditos; **CHAPTER 11: SPELLS** confirmado no
  conteúdo. Primeira impressão: agosto de 2014; décima: outubro de 2018.
- **322 páginas físicas**, conferidas com o manifesto da fonte identificada.
- Deslocamento **+1**, calculado por fólios impressos nas margens. Âncoras
  detectadas: impressa 201/física 202, 208/209 e 212/213.
- Seções: listas 207–211 (físicas 208–212); descrições 211–289 (físicas 212–290).
- Descoberta por nomes contendo Player, Handbook ou PHB, seguida de validação
  por hash, créditos, paginação e título do capítulo. Sufixos de download não
  participam da identidade. `--pdf` permite informar o caminho explicitamente.

## Quatro passagens

| Passagem | Bruto | Normalizado | Resultado |
|---|---:|---:|---|
| 1 — listas por classe | 845 associações | 361 nomes | Classe, círculo e página preservados |
| 2 — descrições independentes | 361 títulos | 361 nomes | Não usa a primeira passagem como entrada |
| 3 — reconciliação | 361 registros PHB | 361 nomes | Conjuntos equivalentes; classes e níveis exatos |
| 4 — reextração sobre o código final | 845 associações / 361 títulos | 361 nomes | Gate `--check`, sem divergências não justificadas |

O total não é uma constante esperada no teste: vem das duas extrações locais.
O termo bruto refere-se a registros depois da recomposição das linhas quebradas,
antes da normalização do nome. Nenhum título de magia foi excluído por allowlist.

### Associações por classe

| Classe | Ocorrências / nomes distintos |
|---|---:|
| Bard | 120 / 120 |
| Cleric | 106 / 106 |
| Druid | 110 / 110 |
| Paladin | 45 / 45 |
| Ranger | 46 / 46 |
| Sorcerer | 129 / 129 |
| Warlock | 74 / 74 |
| Wizard | 215 / 215 |

Uma magia compartilhada mantém um registro canônico e várias classes.

### Gate bloqueante

`scripts/auditar_phb.py --check` verifica e publica explicitamente:

- descrições sem catálogo e listas sem catálogo;
- descrições sem listas e listas sem descrições;
- IDs e nomes canônicos repetidos;
- diferenças de círculo entre listas, descrições e catálogo;
- classes ausentes **ou extras**, comparando conjuntos exatos;
- nomes bilíngues/status, origem, página e cabeçalhos usados pelo editor;
- existência e correspondência real das exceções no PDF;
- hash do PDF e hash do catálogo final.

Artefato público: `reference/audits/phb-spells-audit.json`.
`reference/audits/phb-spells.json` conserva uma projeção segura para os testes
anteriores. Não contém mais as listas/títulos brutos ou cabeçalhos brutos.
Os registros de extração ficam exclusivamente em
`assets-private/audits/phb-spells-raw.json`, ignorado pelo Git e pelo empacotador.

## Exceções individuais e inspeção

`scripts/excecoes/phb-extracao.json` contém oito correções de título e duas de
metadados, com página e resolução canônica:

| Página | Leitura / variante | Resolução |
|---:|---|---|
| 211 | Acrn SPLASH | Acid Splash |
| 211 | Arn | Aid |
| 233 | DISPEL EVIL AND Goon | Dispel Evil and Good |
| 255 | LEOMUNn's TINY HuT | Leomund's Tiny Hut |
| 259 | MELF's Acrn ARROW | Melf's Acid Arrow |
| 262 | MoRDENKAINEN's SwoRo | Mordenkainen's Sword |
| 263 | 0TILUKE'S FREEZING SPHERE | Otiluke's Freezing Sphere |
| 264 | 0TILUKE's RESILIENT SPHERE | Otiluke's Resilient Sphere |
| 260 | Jllusion cantrip | Illusion, cabeçalho de Minor Illusion |
| 227 | Component: V, S | Components, cabeçalho singular de Contagion |

Não há aproximação por distância de edição. A remoção de acentos, pontuação e
espaços não autoriza unir nomes distintos; colisões canônicas fazem o gate falhar.
Quebras de coluna/página são percorridas no fluxo de leitura, inclusive
Branding Smite e Delayed Blast Fireball. Folhas/cabeçalhos de origem constam
da auditoria privada. O campo Components inclui suas linhas de continuação.

Inspeção visual amostral (recortes privados, com registros em
`reference/audits/phb-samples.json`): Acid Splash, Aid, Alarm, Dispel Evil and
Good, Leomund's Tiny Hut, Melf's Acid Arrow, Mordenkainen's Sword, Otiluke's
Freezing Sphere, Otiluke's Resilient Sphere, Guidance, Minor Illusion, Fireball,
Ice Storm, Cone of Cold, Heal, Finger of Death, Sunburst, Wish e Zone of Truth.
São 19 amostras distribuídas de A a Z e pelos círculos 0–9. O cabeçalho singular
de Contagion também foi conferido na página 227.

## Adições, correções e identidade

O ponto de partida desta execução já continha os 361 registros PHB da execução
anterior. Portanto, **zero novas magias PHB foram necessárias**, e nenhum ID
canônico existente foi removido. Os 361 registros foram enriquecidos/revalidados,
incluindo resumo material e cabeçalhos recompostos. A lista por ID/campo está
em `reference/audits/phb-spells-changes.json`.

- Campos existentes `circulo`, `escola`, `tempo_conjuracao`, `componentes` e
  `duracao` foram reaproveitados. `componentesMagia()` projeta V/S/M em booleanos
  e usa `material_resumo`, sem guardar outra cópia redundante dos mesmos flags.
- Materiais são metadados curtos, não efeitos completos. Textos longos de
  componente recebem resumo limitado e referência; condições extensas de
  reações não são embarcadas como descrições.
- Os 391 registros 2024 e cinco Strixhaven também recebem nomes ingleses e
  IDs estáveis no carregador, sem modificar seus nomes legados/mecânica.
  A busca global reúne **757 registros de versões**, não 757 magias distintas
  entre todas as edições. Os 361 canônicos PHB 2014 continuam únicos.
- Correspondências 2024 em `dados/magias/nomes-en.json`: traduções de interface,
  não uma alegação de validação em PHB inglês 2024.
- Duas colisões da localização foram detectadas nos testes e corrigidas pela
  conferência dos registros locais: **Danação = Hex**, **Perdição = Bane**;
  **Metamorfose (9º) = Shapechange**, **Polimorfia (4º) = Polymorph**.
  Nenhum desses registros foi unido ou apagado.
- Traduções PHB em português são `interface-translation`, não “oficiais”.

### Migração das fichas

`magias/modelo.js` resolve referências por ID, nome inglês, português e aliases,
sempre dentro da versão indicada. Fichas antigas sem versão usam o acervo
principal 2024; homônimos de outra edição não são escolhidos silenciosamente.
Uma correspondência ambígua permanece sem migração automática.

O `catalogo_ref` passa a apontar para o canônico; o ID físico da instância,
nomes editados, overrides e justificativas permanecem. Referências antigas
substituídas ficam em `catalogo_ref_anterior`. Entradas textuais inequívocas são
migradas mantendo `nome_original`. Não há exclusão/deduplicação destrutiva das
escolhas; duas instâncias confirmadas podem compartilhar a referência canônica.

A reconciliação roda ao abrir a ficha, depois de carregar o catálogo local, e
nas rotas de persistência quando o índice já está disponível. Sem índice em
memória, a operação síncrona preserva os dados e adia a resolução para a abertura
da ficha. Funciona offline com os dados precacheados do artefato estático.

## Interface implementada

- Menu superior **Todas as Magias / All Spells**, link nativo operável por Tab
  e Enter. Rota `#magias`, ou `#magias/<id>` com contexto de destino.
- Dentro da ficha: **Pesquisar em todas as magias / Search all spells** abre
  a mesma mega busca. Durante criação, mantém o rascunho em memória.
- Busca inicial sem restrições de classe/círculo; pesquisa nomes, aliases,
  classe/escola em PT/EN, círculo e origem. “Mage Hand” é tratado como frase,
  sem falso positivo por combinar “Mage Armor” e “Handbook”.
- Filtros opcionais, multisseleção de classes, compatibilidade e já selecionadas;
  **Limpar filtros / Mostrar todas** e **todos os círculos (0–9)**.
- Cada resultado tem dois nomes, círculo, escola, classes, ritual/concentração,
  referência, compatibilidade, detalhes e adição. Ficha de destino selecionável.
- Resultados paginados visualmente de 50 em 50; a busca sempre percorre todos.
  Durante o debounce, botões de resultados antigos ficam inativos para impedir
  que uma digitação rápida adicione a magia da consulta anterior.
- Estado registrado, conhecido/preparado e recurso disponível são separados.
  Nova adição começa **registrada**, sem ganhar espaços, CD, ataque ou preparo.
- Fora da classe/círculo produz alerta textual; a justificativa é opcional.
  Quantidades fora da referência não impedem salvar, imprimir ou exportar.
- Editor manual com sugestões PT/EN, confirmação explícita, aliases, classes,
  componentes, concentração, fonte, observações e justificativa. Correções ficam
  na instância. O editor anterior também ganhou sugestões e nomes bilíngues.

## Comandos de reprodução

Na raiz `D-D_2024/` (PyMuPDF somente no ambiente de auditoria):

```sh
/tmp/opencode/phb-venv/bin/python scripts/auditar_phb.py --generate
/tmp/opencode/phb-venv/bin/python scripts/auditar_phb.py --check
/tmp/opencode/phb-venv/bin/python scripts/amostrar_phb.py
python3 -m unittest discover -s testes/magias -v
TMPDIR=/tmp/opencode node testes/e2e/checar_esm.mjs .
python3 scripts/preparar_dist.py --build 2026092202
python3 -m http.server 8000 --bind 127.0.0.1
```

Abra `http://localhost:8000/site/#magias`.
No pacote de testes **já existente** `testes/e2e/`:

```sh
LD_LIBRARY_PATH=/tmp/opencode/browser-libs/usr/lib/x86_64-linux-gnu node node_modules/@playwright/test/cli.js test --config=magias.config.mjs
node --test ../regras/unidade/*.test.mjs
```

Não foi criado package.json na aplicação nem executado npm install.
O ajuste de biblioteca acima atende ao Chromium deste ambiente, não ao site.
O servidor dos novos E2E é `python3 -m http.server`, na porta 8024.

## Resultados e limites concretos

- Gate privado das quatro passagens: reconciliado, sem pendências de catálogo,
  nível ou classes. Testes Python públicos: 4 aprovados.
- Busca, adição irrestrita, migração, JSON, teclado, confirmação manual e
  preservação da exportação: **13 testes E2E aprovados** em `testes/e2e/magias/`,
  com servidor Python. Incluem inspeção de geometria, contraste AA e ausência
  de overflow horizontal em tela de 390 px.
- Quatro fluxos anteriores de magias também passaram, executados com
  `--config=strixhaven.config.mjs fluxos.spec.mjs --grep 'extra de círculo alto|homônimas|criação manual extra|truque extra ocupa'`.
- Verificação ESM: **99 módulos, zero falhas**. A conferência por hashes contra
  o início da execução registrou **zero mudanças fora do escopo** nos arquivos
  protegidos em `reference/audits/phb-spells-scope.json`.
- O teste offline constrói o artefato, corta a rede, recarrega e busca Guidance;
  também verifica ausência de PDFs, extrações e pasta privada no artefato.
- A suíte histórica completa possui 12 bloqueios por sete arquivos privados
  Markdown 2024 ausentes em `Informacoes Separadas/`. Não são substituídos pelo
  PHB 2014 nem por conteúdo fabricado. Resultado: **2.253 aprovados, 12 falhas
  por referências ausentes e 256 ignorados pela suíte existente**, com código
  de saída 1. Resumo: `reference/audits/phb-spells-tests.json`. Esse resultado
  não é apresentado como uma execução histórica integralmente verde.
- As descrições integrais protegidas do PHB não são distribuídas. O detalhe
  mostra metadados e a página para consulta; resumos pessoais podem ser salvos
  na instância da ficha.
- Referência de compatibilidade utiliza os cálculos e reservas existentes;
  efeitos condicionais de itens/recompensas continuam explicitamente manuais.
- Nenhum template PDF foi alterado. O teste reabre o PDF produzido pelo
  mecanismo existente e confirma que magias registradas de círculo alto e sua
  origem continuam presentes em campos editáveis.
