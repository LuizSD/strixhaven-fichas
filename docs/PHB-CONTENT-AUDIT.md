# Auditoria PHB e ampliação do catálogo

Revisão: 2026-09-22. **A reconciliação das magias do PHB está concluída. O aceite
integral do documento de escopo ainda tem pendências**, discriminadas no final.
Este relatório não afirma cobertura integral de todos os conteúdos de todos os
livros, nem suporte ao Tetse.

## Fonte e método

- Arquivo principal: `Player's Handbook [10th Print] (1).pdf`, encontrado em
  `../assets-private/`, fora da raiz pública do aplicativo.
- SHA-256: `c0d18ede598e55bc1759a0b64901a207fd24328b832637b2da60950c86b32412`.
- 322 páginas físicas. Créditos na página física 3 confirmam primeira impressão
  em agosto de 2014 e décima impressão em outubro de 2018.
- Deslocamento **+1**, detectado por múltiplos fólios numéricos nas margens do
  rodapé. Não foi assumido a partir do índice físico. As âncoras constam do JSON.
- Ferramentas: Poppler (`pdfinfo`, `pdftotext -layout`) e PyMuPDF 1.28.2.
- O aplicativo não abre o livro em runtime. Os novos dados públicos contêm
  nomes, referências e mecânica estruturada; não contêm descrições integrais.
  Descrições de magias ficam vazias; componentes usam V/S/M, sem transcrever
  os longos textos de materiais ou condições completas dos efeitos/reações.

### Seções examinadas

`scripts/auditar_referencias.py` extrai as páginas de cada intervalo e registra
quantidade de caracteres e hash do texto, **sem publicar esse texto**:

| Seção impressa | Tratamento nesta execução |
|---|---|
| 17–43, raças/traços | Varredura textual; não criado motor de espécies 2014 |
| 45–119, classes | Varredura textual; progressões 2024 preservadas |
| 121–141, antecedentes | Varredura textual; tabela de idiomas p.123 conferida |
| 143–161, equipamento | Extração, transcrição estruturada e conferência visual de tabelas |
| 163–170, multiclasse/talentos | Varredura textual; não substitui pré-requisitos/progressões 2024 |
| 201–205, conjuração | Varredura textual; mantém os cálculos existentes |
| 207–211, listas | Extração integral independente, com classe e nível |
| 211–289, descrições | Extração independente de títulos, níveis e metadados |
| 290–292, condições | Varredura textual; condições 2024 existentes preservadas |

Varredura textual não equivale a transcrição mecânica completa. Foram extraídos
**361 registros de magia, 219 itens e 16 idiomas**. Não foram criados registros
mecânicos alternativos de raças, classes, antecedentes ou talentos 2014.

## Quatro passagens de magias

Artefato: `reference/audits/phb-spells.json`. Contagens derivadas do PDF, sem um
total esperado fixado de memória no teste.

| Passagem | Bruto | Normalizado | Resultado |
|---|---:|---:|---|
| 1. Listas de classes, 207–211 | 845 associações | 361 nomes | Todas as associações preservam classe/nível |
| 2. Títulos de descrições, 211–289 | 361 títulos | 361 nomes | Extraídos sem usar as listas como entrada |
| 3. Reconciliação e geração | 361 registros | 361 nomes | Listas = descrições = catálogo PHB |
| 4. Nova extração após implementação, `--check` | 845 associações / 361 títulos | 361 nomes | Zero ausentes, extras, IDs repetidos ou pendências sem justificativa |

“Bruto” significa registros antes da normalização de nomes, após recomposição
estrutural das linhas quebradas. Magia compartilhada por várias classes tem um
registro com várias associações, não vários registros canônicos.

O teste bloqueante compara conjuntos e cada associação de nível/classe, além de
origem, nomes, nível 0–9, duplicatas, existência das correções e hash do catálogo.
Nenhuma magia foi excluída por uma allowlist. A checagem canônica é da edição
**PHB 2014**; uma versão 2024 homônima continua sendo outra versão explícita.

### Correções individuais de extração

Arquivo: `scripts/excecoes/phb-extracao.json`.

| Página | Extração | Correção comprovada |
|---:|---|---|
| 211 | `Acrn SPLASH` | Acid Splash: OCR de D em versalete |
| 211 | `Arn` | Aid: OCR de ID em versalete |
| 233 | `DISPEL EVIL AND Goon` | Dispel Evil and Good: D lido como N |
| 255 | `LEOMUNn's TINY HuT` | Leomund's Tiny Hut: D lido como N |
| 259 | `MELF's Acrn ARROW` | Melf's Acid Arrow: D lido como RN |
| 262 | `MoRDENKAINEN's SwoRo` | Mordenkainen's Sword: D final lido como O |
| 263 | `0TILUKE'S FREEZING SPHERE` | Otiluke's Freezing Sphere: O lido como zero |
| 264 | `0TILUKE's RESILIENT SPHERE` | Otiluke's Resilient Sphere: O lido como zero |
| 260 | `Jllusion cantrip` | Escola de Minor Illusion: I lido como J |
| 227 | `Component: V, S` | Cabeçalho de Contagion no singular; interpretado como Components |

São **oito correções de título e duas de metadado**, com justificativas e páginas.
Quebras como Drawmij's Instant / Summons são recomposição estrutural, não exclusão.
Na primeira tentativa diagnóstica, Summons ficou isolado e Minor Illusion não foi
detectada por causa de `Jllusion`; esses problemas foram corrigidos no extrator.

A conferência dos campos exigidos pelo editor também encontrou cabeçalhos que
continuam na coluna/página seguinte (por exemplo, Branding Smite e Delayed Blast
Fireball). O extrator passou a percorrer um fluxo contínuo de colunas/páginas;
`metadataPages` e `metadataRawHeaders` registram de onde vieram os campos.
Componentes, alcance e duração não são mais perdidos nessas quebras, e a
concentração é extraída da duração recuperada. O teste bloqueante também exige
que os quatro campos de cabeçalho usados pelo editor estejam preenchidos.

### Inspeção manual amostral

`scripts/amostrar_phb.py` renderiza recortes privados de títulos/escolas;
`reference/audits/phb-samples.json` registra as amostras. Foram conferidas
visualmente: Acid Splash, Aid, Alarm, Dispel Evil and Good, Leomund's Tiny Hut,
Melf's Acid Arrow, Mordenkainen's Sword, as duas magias de Otiluke, Guidance,
Minor Illusion, Fireball, Ice Storm, Cone of Cold, Heal, Finger of Death,
Sunburst, Wish e Zone of Truth. São **19 amostras**, distribuídas de A a Z,
cobrindo todos os círculos de 0 a 9 e todas as correções de títulos.
Além desses recortes, o cabeçalho singular de Contagion foi conferido
visualmente na página 227.

Guidance foi confirmada na p.248: Orientação / Guidance, truque de Adivinhação,
Clérigo e Druida nas listas 2014. Existe exatamente uma vez no catálogo PHB
legado. A Orientação 2024 já existente continua separada; não foi sobrescrita.

## Equipamento e idiomas

`reference/audits/phb-equipment.json` contém IDs adicionados, categorias,
ausências de peso e decisões de extração.

| Categoria PHB | Registros |
|---|---:|
| Armas simples corpo a corpo / distância | 10 / 4 |
| Armas marciais corpo a corpo / distância | 18 / 5 |
| Armaduras e escudos | 13 |
| Equipamento de aventura, munições, focos e recipientes | 99 |
| Ferramentas e kits | 23 |
| Jogos / instrumentos | 4 / 10 |
| Pacotes | 7 |
| Arreios e veículos terrestres | 12 |
| Montarias / veículos aquáticos | 8 / 6 |
| **Total** | **219** |

Tabelas conferidas visualmente: p.145, 149, 150, 154 e 157. A p.151 forneceu os
nomes/preços dos pacotes; a p.153 forneceu capacidades estruturadas de 13
recipientes. A extração textual omitia cinco pesos na p.145; a imagem confirmou
40, 55, 60, 65 e 6 lb, respectivamente para Ring mail, Chain mail, Splint, Plate
e Shield. Esses valores foram incorporados com decisão registrada.

**43 registros não especificam peso** no modelo incorporado, incluindo pacotes,
animais e células marcadas com traço. Ausência permanece ausente; a interface
mostra “Peso desconhecido” e total calculado parcial. Há substituição manual do
peso total. Capacidade de carga do animal não é usada como peso do animal.

Armaduras/armas legadas têm CA/dano/propriedades estruturados, mas entram como
instâncias de equipamento de consulta, com ajustes de combate manuais; não
substituem implicitamente a interpretação 2024. Quantidade, equipado,
sintonização quando exigida, correções e observações usam a ficha existente.

Idiomas: 16 entradas das tabelas da p.123, incluindo Silvestre / Sylvan,
criaturas feéricas, escrita élfica. O nome Silvestre já existia na lista rara
2024; foi reutilizado sem duplicar a escolha. Idiomas personalizados têm UUID,
nomes, escrita, origem e observações, com origem `custom`. O modelo existente
não distingue fala, leitura e escrita.

## Outros livros

Além do PHB, foi encontrado **Guia do Mestre**, arquivo
`dd-5e-guia-do-mestre-biblioteca-elfica.pdf`, em português, 322 páginas:

`2ca3c21ee90d703ca5ab0e713540531d37893913afe2aef063d5f7fdb5adfcc3`.

Identificado bibliograficamente como D&D 5e/2014; a impressão não foi confirmada.
As páginas iniciais não oferecem créditos na camada textual extraída. Há
manifesto próprio, varredura por termos em todas as páginas e auditoria própria
`reference/audits/dmg-items.json`. Deslocamento +1 confirmado por fólios.

Foram incorporados **7 anéis**, com nomes e mecânica estruturada das p.153–154:
Evasão, Natação, Proteção, Queda Suave, Regeneração, Resistência e Três Desejos.
Cargas, sintonização, bônus e restrições são dados de consulta/controle manual;
não concedem automaticamente bônus ou espaços. Os nomes ingleses são traduções
de interface ainda não conferidas em um DMG inglês.

Os demais capítulos foram varridos por termos, mas não catalogados item a item.
Não foi encontrado um livro PDF de Strixhaven; fichas com esse nome foram
classificadas como templates. O conteúdo Strixhaven existente foi preservado.

## Origem, apresentação e migração

- Catálogos novos usam `source`, `name`, versão de regras, página e IDs próprios.
- O motor e as listas de classe continuam 2024. O catálogo global de escolha
  livre inclui legado; seletores automáticos de regra não recebem legado
  silenciosamente. `getIndiceMagias({ incluirLegado: true })` e `buscarMagias`
  consultam o catálogo completo.
- Nomes portugueses são principais, inglês abaixo. Busca ignora acentos,
  espaços, hífens e apóstrofos; considera aliases. Os filtros não impedem o
  acesso explícito a todos os círculos/classes.
- Traduções novas estão marcadas `interface-translation`, não “oficiais”.
  Registros 2024 sem correspondência segura mantêm `missing`; não se inventa
  tradução oficial. Nomes equivalentes conhecidos recebem metadados aditivos.
- Migração aditiva em `migrarAcademia`: `schemaVersion: 2` para a extensão de
  catálogo, sem remover o `schema_versao` de multiclasse; nomes antigos ficam
  preservados em `original` quando migrados, IDs existentes não são recriados.
- Idiomas continuam em `idiomas[]` para contratos antigos; metadados de idiomas
  personalizados ficam em `idiomas_personalizados[]`. Ambos são exportados.
- Correções ficam na instância da ficha. Catálogos não são mutados por edição.
- Coleções malformadas de itens, extras, idiomas personalizados e vida acadêmica
  são isoladas sem esconder a ficha: os valores originais ficam em
  `dados_importados_pendentes`, com aviso visível e possibilidade de consultar
  os dados preservados. Registros válidos continuam ativos. Nomes antigos em
  string são convertidos sem perder o valor original.
- Alertas são recalculados; o cache antigo `restricoes_excedidas` de extras é
  retirado, preservando o motivo manual. A justificativa numérica geral fica em
  `justificativa_magias`; não são persistidas mensagens derivadas novas.
- Fichas podem guardar escolhas abaixo/acima da cota, com banners e resumo,
  sem alterar espaços. Criação permite continuar com seleção incompleta;
  retornar à etapa anterior não apaga as listas de magia.
- Arquivos de classes, inclusive qualquer conteúdo de Artificer/Artífice, e
  nomes de atributos/perícias não foram alterados.

## Exportação PDF e templates

Todos os originais privados permanecem intactos. Mapas e hashes individuais:
`reference/manifests/pdf-templates/`.

| Modelo | Resultado |
|---|---|
| Strixhaven atual do aplicativo | Gerador AcroForm próprio preservado; páginas complementares, widgets e valores reabertos em teste |
| Bardo - Critical20 | Adaptador próprio, 98 campos textuais, 24 marcadores de proficiência e 100 linhas de magia; 334 widgets originais preservados |
| Tetse-strixhaven, duas variantes | Não habilitado: estrutura xref inválida no Poppler e posicionamento/correspondência de campos ainda não validados |
| Strixhaven privado de 2 páginas | Descoberto e inventariado (228 widgets); não é o gerador próprio que já funcionava no aplicativo |
| Ficha D&D 5.5 privada | Inventariada (423 widgets); não habilitada nesta execução |

Bardo: hash de fonte
`6e28fd99001080fc9d47c41ac25a0a4f94b160829496554718a0cee19aa51eea`.
Os cálculos JavaScript e ações do formulário são retirados **da cópia em
memória**, antes de preencher valores 2024. Não há flatten nem renomeação.
Campos não mapeados, conteúdo resumido e overflow constam do complemento e do
relatório de cobertura; escolhas completas são preservadas em páginas AcroForm
adicionais. Slots vêm das reservas calculadas, não da quantidade de magias.
O modelo é oferecido só quando o PDF privado está disponível e corresponde ao
hash aprovado. A ausência em `_dist/` mantém o exportador atual funcional.

Tetse: hashes distintos `09dc421a8b247302031a419d22b54136e432ab21a28a8ae9a74126fbdd13ab25`
e `9091c2e91252d1dd7df532c070aed2bfed4a7566557690f1c2348566b53fdcc2`.
Cada arquivo tem 3 páginas e 235 widgets recuperáveis pelo PyMuPDF. Ambos dão
`Invalid object stream` / `Couldn't read page catalog` no `pdfinfo`. Foram
renderizados e tiveram prova mínima de campo editado/reaberto, sem alterar o
original. Isso não valida uma ficha completa: há campos desalinhados na página
1 e rótulos como Reflexos/Vontade sem equivalência às perícias canônicas.
Não se reutilizou o mapa do Bardo para alegar suporte ao Tetse.

## Verificações e reprodução

As instruções completas estão em `reference/README.md`. Na raiz do aplicativo:

```sh
/tmp/opencode/phb-venv/bin/python scripts/auditar_phb.py --check
python3 -m unittest discover -s testes/catalogo -v
node testes/e2e/checar_esm.mjs .
python3 scripts/preparar_dist.py
```

No pacote de testes já existente `testes/e2e/`:

```sh
npm run test:regras:unidade
LD_LIBRARY_PATH=/tmp/opencode/browser-libs/usr/lib/x86_64-linux-gnu npx playwright test --config=strixhaven.config.mjs
LD_LIBRARY_PATH=/tmp/opencode/browser-libs/usr/lib/x86_64-linux-gnu npx playwright test --config=phb.config.mjs
```

`phb.config.mjs` usa o servidor real `python3 -m http.server 8000`, não o servidor
Node dos testes antigos. Node permanece restrito à infraestrutura de testes
existente; não foi criado `package.json` na aplicação. Não existem scripts de
lint/typecheck/build npm da aplicação para executar.

PyMuPDF foi instalado em um venv externo. O Chromium inicialmente não abria por
falta de `libasound.so.2`; o pacote do sistema foi extraído em
`/tmp/opencode/browser-libs/`, sem adicionar dependências ao aplicativo.

Resultados finais e limitações de execução estão em `reference/audits/RESULTADOS.md`.

## Pendências concretas para aceite integral

1. Alternativas mecânicas completas de raças, antecedentes, talentos e
   progressões 2014 não foram cadastradas. Essas seções foram varridas, mas
   continuam sem adaptação selecionável; nenhum cálculo 2024 foi substituído.
2. A localização de todo o acervo 2024 não está completa. Correspondências
   incertas continuam `missing`; os 361 nomes do catálogo PHB novo são bilíngues.
3. Os sete pacotes têm nomes/preços, mas não expansão estruturada de seus
   conteúdos. Barding parametrizado e tabelas de despesas/bens comerciais não
   foram incorporados.
4. CA/dano e efeitos dos itens legados permanecem de controle manual. As fichas
   têm correções locais e ajuste de peso, mas não um motor completo de itens 2014.
5. Referências de contagem usam as tabelas e classificações 2024 existentes.
   Não existe seleção de progressão de classe 2014; bônus globais de estilo de
   luta e concessões incompletas de talentos em multiclasses ainda precisam de
   revisão individual. A justificativa manual não altera recursos.
6. Os seletores normais antigos ainda conservam regras de troca/preparo. A
   edição sem teto é oferecida pela escolha livre/extra, disponível durante e
   depois da criação; não foi reescrito cada assistente de troca antigo.
7. O Tetse não exporta uma ficha completa validada. A recuperação mínima de
   campos não é apresentada como suporte funcional.
8. A suíte histórica que compara regras com arquivos Markdown privados 2024
   permanece bloqueada pela ausência de `Informacoes Separadas/`. O PHB 2014
   não foi usado para falsificar essas referências 2024.
