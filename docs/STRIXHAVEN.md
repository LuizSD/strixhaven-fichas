# Adaptação Strixhaven sobre a base 2024

## Base e decisões

Commit inicial: `ea43e7dc8786d3b84538430fb26b2800eb38241e`.
Antes desta implementação já havia modificações locais em `.gitignore`,
`site/index.html`, `auth.js`, `store.js`, `sync.js`, manifest e SW, e o arquivo
`campanha-config.js`. Foram preservadas e completadas. O import de
`strixhaven/modelo.js` existente ainda não tinha módulo correspondente.

Sem bundler, backend ou dependência de runtime adicional. Código MIT e crédito a
ZaitBr mantidos. Conteúdo de jogo não recebe licença MIT por estar no repositório.

### Perfil de campanha `campanha-2024-v1` (decisões da mesa)

- Classes, progressão, multiclasse, perícias, salvaguardas e conjuração continuam 2024.
- Strixhaven (SCC, 2021) é um suplemento originalmente 2014. Os resumos novos são
  próprios em PT-BR, com nomes originais das cinco magias preservados.
- Antecedentes acadêmicos usam aumentos 2024 uma única vez, escolhidos entre os
  seis atributos; dois idiomas pela base e 50 PO para equipamento. Isso é adaptação,
  não reprodução dos pacotes de equipamento e idiomas de 2014.
- Iniciado de Strixhaven substitui o benefício de origem do antecedente. Não concede
  outro talento de origem junto. A faculdade da matrícula não concede o talento.
  Escolhas explícitas: faculdade do talento, dois truques, uma magia de 1º círculo
  da lista correspondente e atributo mental. A magia recebe um uso especial por
  descanso longo, além da possibilidade de usar espaços existentes.
- Antecedente correspondente amplia a lista elegível, sem preparar tudo. As
  referências em `listas-2024.json` usam as versões 2024 do catálogo da base,
  inclusive magias cuja mecânica mudou entre edições. Não se oferecem simultaneamente
  versões antigas com o mesmo nome. As cinco magias exclusivas têm IDs SCC próprios.
- Owlin não recebe aumento racial adicional. Voo condicionado por armadura,
  proficiência de Furtividade e visão no escuro estão descritos; conferir/aplicar
  esses efeitos manualmente na ficha. Mascote também explicita o controle manual
  de seu familiar, ataques, troca de posição e pré-requisitos.
- Relacionamentos, inspiração de relação/aula, d4s, marcas de avaliação e bônus
  condicionais são registros independentes. Não há limiares ou benefícios ocultos.

### Fontes consultadas

- Apresentação oficial: <https://dnd.wizards.com/products/strixhaven-curriculum-chaos>
  (redireciona à loja oficial D&D Beyond; confirma faculdades, opções e exemplos acadêmicos).
- Conferência mecânica secundária, páginas que atribuem o conteúdo ao SCC:
  `https://dnd5e.wikidot.com/background:<faculdade>-student`,
  `feat:strixhaven-initiate`, `feat:strixhaven-mascot`, `lineage:owlin` e
  `spell:silvery-barbs`, `spell:borrowed-knowledge`, `spell:kinetic-jaunt`,
  `spell:vortex-warp`, `spell:wither-and-bloom` no mesmo domínio.
- Nomes PT-BR das magias equivalentes conferidos no catálogo 2024 deste clone.
  Não foram copiados extensivamente textos, ilustrações ou aventuras.

## Modelo e interface

`strixhaven.versao = 1` é independente de `schema_versao` da multiclasse.
Migração aditiva e idempotente em `strixhaven/modelo.js`; leitura/salvamento do
store preservam propriedades desconhecidas. Registros acadêmicos e concessões
possuem IDs estáveis; seus nomes não são a identidade.

Extras têm uma única fonte em `magias_customizadas`, reutilizam o editor da base
e não gravam cópias concorrentes no grimório ou nas preparadas. `origem: extra`,
`catalogo_ref`, motivo e avisos acompanham a concessão. A classificação por classe
inclui apenas extras que optaram por ocupar cota. Fusões e migrações antigas não
absorvem uma magia normal homônima. Remover uma extra remove só seu ID.

Estado conhecida/grimório/preparada, cota e execução são controles separados.
O painel ordenável de extras lê essa mesma coleção, inclusive entre círculos
diferentes. Não há uma segunda coleção de magias. A classe da cota deve ser
escolhida explicitamente quando a concessão ocupa vaga. Magias utilitárias podem
ser marcadas como sem CD/ataque, sem inventar atributo ou classe conjuradora.
Registrar não cria espaços. Uso especial possui quantidade, gastos, recuperação e
atributo/CD/ataque; execução sem recurso exige escolha e confirmação explícitas.
Concentração entra no mecanismo de efeitos existente. Materiais, condições e
tempo precisam ser confirmados. Os efeitos descritos não são automaticamente
aplicados a alvos. A criação tem a mesma ação extra no passo Magias.

A edição livre de atributos da base foi ampliada para exceções inteiras sem teto
de criação, com deltas e reversão existentes. Ajustes de CA, iniciativa e perícias
guardam ajuste ou valor final, nunca somando ambos. Outros controles manuais
existentes de PV, itens, idiomas e detalhes foram preservados. Benefícios manuais
têm campos independentes de ataque, dano/tipo, alcance, condição, usos e recuperação.

## Matriz de referências

**Impedimento:** `Tetse-strixhaven (6).pdf` não está em `assets-private/references/`.
Não foi possível confirmar visualmente sua totalidade ou o problema `/Pages`.
O arquivo disponível é `Bardo - Critical20 (1).pdf`, não o nome duplo mencionado
no pedido. Ele tem 3 páginas e AcroForm; é referência, não template de produção.
A matriz acadêmica abaixo usa os subcampos fornecidos pelo usuário, não inventa
uma inspeção do PDF ausente.

| Propriedade | Base | Modelo/interface da adaptação | Alteração |
|---|---|---|---|
| Faculdade, ingresso, ano | Classe/nível, sem matrícula | `strixhaven.faculdade/ingresso/ano` | Independentes, tema e cartões da home |
| NPC, pontos, relação | Notas livres | `relacionamentos[]` | IDs, pontos negativos, inspiração, bônus, desvantagem, observações |
| Cursos/aulas | Sem registro próprio | `cursos[]` | Nome, ano/período, inspiração, habilidades, professor, horário, notas; tabela |
| Boletim 1º–4º | Sem registro próprio | `avaliacoes[]` | Registro #, três marcas neutras independentes, repetições, d4s, habilidades |
| Extracurriculares | Sem registro próprio | `atividades[]` | Membro, participação, d4, habilidades, três marcas e notas |
| Trabalho | Notas livres | `empregos[]` | Empregador, função, colega/NPC e observações |
| Notas acadêmicas | Notas gerais | `strixhaven.notas` | Texto separado |
| Ataques e magias | Armas e conjuração | Base + editor de magias + `beneficios_manuais[]` | Nome, ataque, dano/tipo, alcance, descrição separados |
| História, ideais, vínculos, fraquezas | Detalhes pessoais | Campos existentes | Preservados |
| Equipamento e mochila | Inventário e carteira | Campos existentes | Preservados |
| PV, CA, iniciativa, atributos | Motor 2024 | Base + ajustes identificados | Sem usar valores do PDF como regra |
| Salvaguardas/perícias | Motor 2024 | Campos existentes | Sem substituir por Reflexos/Vontade |

Inspeção visual complementar do Critical20: a página 1 reúne identidade, atributos,
salvaguardas, perícias, inspiração, PV/CA/iniciativa, ataques, inventário e narrativa;
a página 2 tem aparência, idade/altura/peso/olhos/pele/cabelos, aliados/organizações,
símbolo, história, características e tesouro; a página 3 tem atributo/CD/ataque de
conjuração, truques, círculos, preparação e espaços totais/usados. A base conserva
seus campos de aparência/notas/inventário e seu motor de conjuração; esses rótulos
da referência visual não substituem as regras 2024 nem impõem o número de linhas.

## Exportação e aparência

- JSON preserva o personagem inteiro. A importação da base faz merge por ID e não
  duplica ao importar duas vezes; fichas com ID já existente não são sobrescritas.
- PDF descritivo original ampliado com vida acadêmica, extras e metadados de ajuste.
- PDF **editável AcroForm próprio**, gerado com a biblioteca já embarcada, sem usar
  o PDF privado como template. Tem resumo calculado e campos de dados, com páginas
  de continuação. Não faz recálculo de regras dentro do leitor PDF. JSON é o backup
  de ida e volta; não foi criado importador universal de PDF.
- Fontes PDF padrão suportam PT-BR e pontuação usual; glifos fora de WinAnsi são
  substituídos na aparência PDF. O JSON conserva o texto Unicode original.
- Tema separado em `css/strixhaven.css`, azul-marinho, dourado, pergaminho e SVG
  próprio. Ficha mantém controles, com navegação por seções e cores de faculdade.

## Verificação

Comandos reais:

```bash
python3 scripts/verificar_extracao.py tudo
npm --prefix testes/e2e run test:regras:unidade
npm --prefix testes/e2e run test:regras:e2e
npm --prefix testes/e2e run test:offline
cd testes/e2e
npx playwright test --config=strixhaven.config.mjs
```

O verificador estrutural já falha no commit original por duas funções locais com
nomes repetidos (`superficieAtiva`, `subConjDaSuperficie`); isso foi confirmado em
snapshot isolado. Não foi ocultado com exceções novas. Parte dos testes de unidade
exige `Informacoes Separadas/`, ausente neste clone.

Resultados desta entrega:

| Verificação | Resultado |
|---|---|
| Regras no navegador | **452 aprovados**; log privado `regras-e2e-entrega.log` |
| Campanha no navegador | **15 aprovados**, sem skips |
| Unidade autocontida Strixhaven | **6 aprovados**, sem skips |
| Unidade ampla | **2.253 aprovados, 12 falhas por arquivos de regras ausentes, 256 skips preexistentes** |
| Parser ES modules | **88 arquivos, nenhuma falha** |
| Offline da base em árvore de desenvolvimento | **1 aprovado, 2 skips existentes por ausência dos manifestos de deploy** |
| Offline da campanha em artefato real | Incluído nos 15 aprovados: precache, prefixo de fork, troca de build, caches e dados alheios preservados |
| Verificador estrutural | Somente as **2 duplicações preexistentes**; nenhum import quebrado, símbolo sem import ou gravação em binding importado |
| `git diff --check` | Sem erros |

Os testes novos exercitam edição/remoção por ID depois de reordenar e renomear,
homônimas de outra origem, recuperação de uso especial, quotas de truques também
na criação e normalização de grimório multiclasse sem copiar extras. As visões de
cota são derivadas; seletores de troca e normalizadores continuam lendo as
concessões normais, evitando mover uma extra para o acervo da classe.
As cinco faculdades também foram percorridas no assistente real: talento,
perícias, ferramentas/instrumentos, limite de três pontos de atributo e 50 PO.
Prismari e Quandrix reutilizam o seletor de ferramentas existente; a opção única
de 50 PO usa o mesmo parser de equipamento da base. Anos e notas de matrícula,
aula e avaliação foram testados com valores diferentes, para detectar mistura
entre campos homônimos na interface.

PDFs gerados, reabertos, com aparências verificadas e todas as páginas renderizadas:

| Exemplo privado | Páginas | Campos AcroForm |
|---|---:|---:|
| `estudante-descritivo.pdf` | 4 | 0 (estático) |
| `estudante-editavel.pdf` | 10 | 196 |
| `longo-descritivo.pdf` | 11 | 0 (estático) |
| `longo-editavel.pdf` | 22 | 496 |

O exemplo longo inclui 25 relacionamentos, 12 avaliações, aula, atividade,
emprego e textos extensos, inclusive uma palavra maior que a largura da página.
O verificador também confere campos/textos dentro dos limites da página. O formato
editável prioriza a exposição completa dos dados e seus identificadores, por isso
é mais extenso que o PDF descritivo. Os resumos calculados no AcroForm são valores
de consulta editáveis, sem motor de recálculo embutido.
CD/ataque das extras usam o atributo da própria concessão, não o da classe da
ficha. Os valores calculados e efetivos são exportados separadamente. A descrição
de cada extra aparece uma só vez no PDF descritivo.

### Capturas privadas

Em `assets-private/entrega/`: `inicio-{desktop,mobile}.png`,
`ficha-{desktop,mobile}.png`, `extra-{desktop,mobile}.png` e
`academia-{desktop,mobile}.png`. A seção acadêmica foi capturada inteira,
incluindo os controles e os campos preenchidos. As versões `original-*` foram
capturadas de um snapshot de `ea43e7d`, com os mesmos atributos e PV da semente,
bloqueando a rede externa do site original. A comparação mostra a troca do vermelho
por azul-marinho/dourado, superfícies de pergaminho, melhor uso da largura desktop,
identificação da faculdade, navegação acadêmica e controles de mesa preservados.

### Principais arquivos

- `dados/strixhaven/{modulo,magias,listas-2024}.json`: conteúdo, perfil e referências.
- `site/js/strixhaven/`: modelo, academia, extras, escolhas de Iniciado e exportação.
- `site/js/sheet/{extras,manual}.js`: integração dos controles à ficha existente.
- `store.js`, `db.js`, `auth.js`, `sync.js`, `campanha-config.js`: persistência,
  catálogos aditivos e isolamento de serviços; metadados futuros de edição preservados.
- `creator/{passo-magias,wizard}.js`, `sheet/{magias,grimorio,migracoes,hp-descanso}.js`,
  `regras-magia-classe.js`, `regras-origens-magia.js`: fluxos normais e exceções explícitas.
- `creator/{comum,passo-antecedente,passo-equipamento}.js`: escolhas concretas de
  proficiência e equipamento dos antecedentes acadêmicos, sem duplicar bônus.
- `sheet/{ficha,edicao,combate,impressao,pdf}.js`, `utils.js`, `ficha-edicoes.js` e
  `ficha-edicao-validacoes.js`: composição, ajustes reversíveis e exportação.
- `css/strixhaven.css`, SVGs próprios, páginas HTML, manifest e SW: tema/PWA.
- `scripts/preparar_dist.py` e workflow existente: empacotamento por allowlist.
- `testes/e2e/strixhaven/` e `testes/regras/unidade/strixhaven.test.mjs`: regressões novas.

Os testes autocontidos novos cobrem migração/JSON idempotente, IDs homônimos,
cota opcional, círculo alto sem recurso normal, uso especial, dados acadêmicos,
benefícios/ajustes, progressão, PDFs com continuação e SW sob prefixo de fork.
As expectativas antigas de catálogo fechado e teto na exceção manual foram
atualizadas explicitamente; os testes do fluxo normal permanecem.

Evidências privadas duráveis: `assets-private/entrega/` (personagens sintéticos em JSON, PDFs, screenshots
desktop/mobile, comparação com `ea43e7d`, logs e renderizações de todas as páginas).
Elas estão ignoradas pelo Git e excluídas do artefato. O gerador de screenshots usa
Chromium local; nesta máquina foi necessário disponibilizar `libasound.so.2` ao
processo do navegador. PyMuPDF/Pillow foram usados somente para conferir PDFs,
fora das dependências do aplicativo.

## Limitações explícitas

- Falta o PDF principal para fechar a comparação visual de **todas** as propriedades.
- Cursos/atividades iniciais são os exemplos públicos sem spoilers, não uma
  transcrição integral das listas e NPCs da aventura.
- Mascotes, voo condicionado, benefícios de relações, efeitos de magias e demais
  efeitos condicionais descritos exigem controle manual, identificado na interface.
- Ajustes derivados implementados abrangem CA, iniciativa e perícias; não existe
  ainda override uniforme de todo valor derivado possível do motor.
- A integração da lista expandida abrange a seleção principal/criação e cópia no
  grimório; fluxos especializados de aquisição de magias de talentos/subclasses
  continuam seguindo suas próprias listas.
- Sincronização não foi testada contra serviço externo: permanece desabilitada e
  requer configuração própria. A URL real de publicação do fork não foi fornecida.
