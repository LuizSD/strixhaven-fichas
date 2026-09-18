# Backlog de Issues — ZaitBr-bit/D-D_2024

> Gerado em 2026-09-18, a partir da API do GitHub (issues abertas, sem PRs).
> Ordenado por **tipo** (Bug / Melhoria) e depois por **complexidade**. Ticket
> aqui é a issue do GitHub — ver [`TRIAGEM-ISSUES.md`](TRIAGEM-ISSUES.md) para
> o procedimento de investigar e corrigir.
>
> Uso: marque `[x]` ao fechar uma issue, ou risque a linha. Atualize a
> complexidade se a investigação real divergir da estimativa.

---

## 🐛 Bugs

### Baixa

- [x] **#81** — Ícone "+ Item Personalizado" no inventário aparece cortado, só "custom". Corrigido na 3.0.8: grupo de botões do cabeçalho do inventário ganhou `flex-wrap`, e nenhum `.btn` da ficha encolhe mais abaixo do próprio texto.
- [x] **#67** — Talento "Aumento no Valor de Atributo" entra na lista sem pedir os 2 pontos de atributo. Corrigido na 3.0.8: a causa era `obterAtributosASITalento` não achar nada no PRÓPRIO talento (a distribuição mora no `descricao` de nível de talento, não num `beneficios[]` nomeado) — o atalho de "sem escolha nenhuma" persistia direto. Agora exige e aplica a distribuição certa (`validarDistribuicaoASI`), igual à subida de nível; o select genérico de "+1" (Resiliente etc.) parou de aparecer duplicado para este talento.

### Baixa–Média

- [x] **#78** — Magia personalizada escolhida para Maestria de Magias/Assinatura Mágica não mostrava descrição ao clicar. Corrigido na 3.0.8: quando a personalizada também "ocupa vaga" no grimório, a lista de candidatas usava a entrada crua do grimório (só nome+círculo) em vez da personalizada completa — `abrirEscolhaMagiasFixasMago` agora troca pela personalizada quando os dois batem por nome+círculo.
- [x] **#79** — Verificado em 2026-09-18: **não reproduz** no código atual. Escrito um teste e2e (`truque-personalizado-trocado-descanso.spec.mjs`) reproduzindo o cenário exato (truque personalizado "ocupa vaga" trocado pela grade de Trocar Truque do Descanso Longo) — passa sem nenhuma alteração de produção: a ficha já mostra "Não conhecido" sem reabrir. Mantido como teste de regressão; se o relato persistir, provavelmente é outro caminho (ex.: a cadeia de Descanso Longo com mais passos, que usa `callbackPosTroca` em vez do `renderFichaCompleta()` direto).

### Média

- [ ] **#76** — Truques concedidos por característica de subclasse com uso gratuito limitado (Invocar Fera/Convocar Féerico do Ilusionista, nível 6) não têm o botão "Grátis" na lista principal — hoje só existem botões próprios no card de Características de Classe (habilidades.js), que só marcam `usada` e não conjuram de verdade nem aparecem na lista de Magias. Portar para o mecanismo do #68 exige decidir se essas magias entram em `magias_conhecidas`/`preparadas` (como Maestria/Assinatura fazem) — mudança de modelo, não 1 linha. Não iniciado.
- [ ] **#70** — PDF não gera no Android/Chrome. Sem print/personagem no relato; precisa reproduzir em dispositivo antes de diagnosticar (Blob + `<a download>` pode estar sendo bloqueado pelo navegador/PWA). Não iniciado — depende de informação do usuário.
- [x] **#66** — Investigado em 2026-09-18: **não reproduz**. Tracing completo de `subirDeNivel`/`aplicarPvRetroativoPorCon` mostra a ordem certa (`sincronizarEspelhos` já atualiza `personagem.nivel` para o total NOVO antes do cálculo retroativo), e o motor `classes-progressao.test.mjs` já sobe as 12 classes do nível 1 ao 20 escolhendo `+2 Constituição` em TODA pendência de ASI, conferindo o PV contra a tabela do livro em cada nível — passa. Sem repro concreto (qual classe, qual nível, qual sequência de edições) não há o que corrigir; fechar como não reprodutível ou pedir ao relator os passos exatos.

### Média–Alta

- Cluster investigado em 2026-09-18. As três issues tinham raízes DIFERENTES, não uma raiz única:
  - [x] **#62** — CORRIGIDO. `normalizarGrimorioMago` (utils.js) varria QUALQUER magia preparada de círculo 1+ para o grimório do Mago, sem olhar de qual classe ela era — um Mago(inicial)/Clérigo(multiclasse) tinha as preparadas do Clérigo (carimbadas `classe:'Clérigo'`) copiadas para o grimório do Mago. Agora, em multiclasse, a varredura filtra por `preparadasPorClasse(...).desta` (só o que está carimbado com a classe certa); classe única não muda em nada. Teste: `multiclasse-clerigo-mago-grimorio.test.mjs`.
  - [x] **#61** — Investigado: **é decisão de produto documentada, não bug** (comentário "Achado 2 da rodada 1... Tarefa 4" em `sheet/magias.js`, acima do `.map` que desenha os cartões de Preparadas por círculo). A lista de cartões mostra as preparadas de TODAS as classes de propósito — filtrar pela classe ativa esconderia o botão "Conjurar" da magia de OUTRA classe. A mitigação é o rótulo de classe em cada cartão (só aparece com >1 superfície) — MAS esse rótulo só aparece para magia normal; magia "especial" (Domínio/sempre/legado, `magiaEhEspecial`) mostra `origemLabel` genérico ("Domínio") sem dizer de qual classe. Gap residual pequeno, cosmético — não corrigido nesta rodada; se voltar a ser relatado, é aí que mexer (a correção do #62 já deve ter eliminado a maior parte do sintoma visível, já que a mistura relatada media magia que TINHA sido varrida para o grimório errado).
  - [ ] **#59** — Investigado, **não é 1 linha**: a escolha de Ordem Divina/Ordem Primal (proficiências ou truque+perícia extra) só existe no CRIADOR (`creator/passo-classe.js`/`wizard.js`, via `CLASSES_ESCOLHAS`) — o fluxo de multiclasse (`subirDeNivel`, levelup.js) não tem NENHUM passo equivalente para quando a classe nova é Clérigo/Druida. Medido: outras concessões de "classe nova" têm o mesmo buraco (`opcoes.pericia_classe_nova`/`instrumento_classe_nova` são lidos por `levelup.js` mas NUNCA escritos por UI nenhuma — `grep` não achou nenhum card em levelup-ui.js/levelup-cards.js). Corrigir de verdade exige um STEP NOVO no assistente de subida (`STEP_DEFINITIONS`, levelup-flow.js + card em levelup-cards.js + bind em levelup-ui.js + pendência em levelup.js + aplicar o efeito via `escolhas_classe`/`proficiencias_extra`) — feature nova, não bugfix pontual. Não iniciado nesta rodada.

---

## ✨ Melhorias

### Baixa

- [ ] **#75** — Organizar as magias personalizadas "não preparadas" por círculo, com botão de minimizar por círculo (mesmo padrão visual dos blocos "Nº Círculo" que a lista de Preparadas já usa).

### Baixa–Média

- [ ] **#77** — Voltar ao modelo da 3.0.1: magia personalizada do Mago, ao ser retirada do grimório, vai para a lista de "copiar para o grimório" (pagando PO/tempo) em vez de ficar só como candidata do toggle. Mesmo pedido de fundo do comentário de truque na #74 (**já resolvido para truque**) — este é o pedido simétrico para magia de círculo 1+ do Mago especificamente, tocando `mostrarBuscaGrimorio`.

### Média

- [ ] **#22** — Modo escuro. Nenhum `prefers-color-scheme`/`data-theme` hoje; exige tokenizar cores em CSS custom properties.
- [ ] **#37** — Itens customizados com bônus mecânicos (CD de magia, ataque de magia, propriedades, maestria de arma) — formulário já tem raridade/preço/sintonização; falta plugar no motor de cálculo.

### Média–Alta

- [ ] **#80** — Linhas customizadas no inventário (além de Equipados/Mochila/Esgotados), com opção de a linha contar ou não no peso, e mover itens entre linhas. Modelo de dados novo (contêiner nomeado) + UI de mover item.

### Alta

- [ ] **#69** + **#65** + **#14** — Reduzir/retroceder nível com histórico de progressão. **Consolidar as três** — #14 já propõe o desenho técnico (snapshot por nível).
- [ ] **#38** + **#52** — Talentos customizados/criação de talentos. **Consolidar as duas.**
- [ ] **#41** — Antecedentes customizados (concede atributo + perícia + talento de origem + equipamento — 4 integrações no criador).
- [ ] **#53** — Montaria na ficha (entidade nova, bloco de estatísticas de criatura).
- [ ] **#23** + **#26** — Espécie customizada / Warforged. **Consolidar as duas** (espécie alimenta deslocamento, sentidos, truques, resistências).

### Muito alta

- [ ] **#40** — Classe e subclasse customizadas (núcleo do app: progressão, conjuração, dado de vida, características por nível).
- [ ] **#47** + **#32** — Homebrew geral com alteração de bônus / homebrew de raças-classes-origens + compartilhar. **Guarda-chuva de #23/#38/#40/#41** — considerar fechar como duplicata se as específicas cobrirem o pedido.

### Fora do escopo atual

- [ ] **#18** — Subclasse Paladino Juramento dos Gênios Nobres (Heroes of Faerûn — fora do PHB 2024).
- [ ] **#28** — Subclasse Guerreiro do Eco (Wildemount, 5e 2014 — sem versão 2024).
- [ ] **#56** — Compatibilidade com iOS 15. Falta diagnóstico: precisa saber qual API/recurso quebra no dispositivo antes de estimar.

---

## Notas de manutenção

- **Cluster "magia/truque personalizado"**: #68, #71, #73, #74 fechados na 3.0.7; #78 fechado na 3.0.8; #79 verificado sem repro (ver acima). #75, #76, #77 continuam abertos, todos da mesma área — considerar uma janela de trabalho dedicada a essa região antes de passar para outro assunto.
- **#66 e #79** ficaram marcados `[x]` como "verificado, sem repro" (não como "corrigido") — nenhuma linha de produção mudou para eles. Se o comportamento relatado persistir, peça ao relator passos exatos (classe, nível, sequência de cliques) antes de investigar de novo: sem isso, a investigação já esgotou o que dava para inferir do código.
- Ao fechar uma issue por commit, o formato de mensagem e o `Closes #N` estão documentados em [`TRIAGEM-ISSUES.md`](TRIAGEM-ISSUES.md#a-mensagem-de-commit-que-fecha-a-issue).
- Esta lista não inclui issues fechadas nem Pull Requests. Para atualizar do zero, repita a consulta:
  ```bash
  curl -s "https://api.github.com/repos/ZaitBr-bit/D-D_2024/issues?state=open&per_page=100"
  ```
