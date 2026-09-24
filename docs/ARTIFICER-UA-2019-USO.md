# Artífice / Artificer — UA 2019 · Playtest

## Fonte e identificação

A fonte privada foi localizada em `../assets-private/UA-Artificer2-2019.pdf`,
relativo à raiz `D-D_2024/`. Conferidos título **UA Eberron Artificer**, autor
**Crawford, Jeremy**, 14 páginas e SHA-256
`28a6257a7a04b2578f867fd0d6a7a1a9b05bdc4f42a0f44942bc8cf6f416d3c0`.

A classe usa o ID `artificer-ua-2019` e a versão `ua-2019-playtest`. Não é
apresentada como uma classe oficial de 2024. O PDF permanece privado; o build
contém somente os dados estruturados e resumos funcionais da implementação.

## Abrir e validar localmente

Na pasta `D-D_2024/`:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Abra `http://localhost:8000/site/`.

1. Crie uma ficha e pesquise **Artífice** ou **Artificer** no seletor de classe.
   A classe aparece como **Artífice / Artificer**, sem selo de versão. O seletor também aceita Enter/espaço.
2. No passo de magias, configure o painel do Artífice. Na ficha salva, o mesmo
   painel fica antes do inventário.
3. Abra **Escolher / preparar magias** e procure `Guidance` ou `Orientacao`.
   Os filtros incluem círculo, escola, ritual, estado, origem e versão.
   **Mega busca** permite escolhas fora da lista; **Adicionar magia manual**
   permite conteúdo próprio. Exceder limites mostra avisos, sem impedir salvar.
4. A partir do nível 3, selecione Alquimista, Arquivista, Artilheiro ou Ferreiro
   de Batalha. Confira as magias sempre preparadas, separadas da cota normal,
   e os recursos dos níveis 3, 6 e 14.
5. Em **Infusões**, aprenda uma infusão, escolha uma réplica quando pertinente
   e vincule um item. Infusão conhecida, item ativo e sintonização são estados
   distintos. Escolhas acima dos limites são preservadas com observações.
6. Use os controles de recursos, companheiros, torretas, mente, engenhocas,
   varinha e item armazenador. Recursos de descanso usam os descansos normais
   da ficha. Os explicitamente diários usam **Novo dia**; reações de infusões
   têm **Descanso do portador**.
7. Suba de nível pelo fluxo existente. A progressão usa nível de Artífice;
   o bônus de proficiência usa nível total. Em multiclasse, abra a memória do
   cálculo: a contribuição é metade dos níveis de Artífice arredondada para cima.
8. Exporte/importe JSON, recarregue e confira as escolhas. Em **Gerar PDF**,
   escolha ficha descritiva, Strixhaven editável ou Critical20 quando disponível.
9. Repita em largura móvel de 390px: controles e painéis devem caber sem
   rolagem horizontal.

O equipamento inicial oferece duas armas simples, besta leve com 20 virotes,
couro batido ou loriga de escamas, ferramentas de ladrão e kit de explorador
de masmorras. Há alternativa de riqueza e possibilidade de adiar/ignorar.
O recebimento é registrado para evitar duplicação. Equipamento de antecedente
já recebido deve ser revisado explicitamente no inventário ao optar por riqueza.

## Conteúdo integrado

| Círculo | Associações da lista-base |
|---|---:|
| Truques | 19 |
| 1º | 17 |
| 2º | 20 |
| 3º | 14 |
| 4º | 11 |
| 5º | 7 |
| **Total** | **88** |

São quatro especializações, 40 vínculos adicionais de magias sempre preparadas,
11 infusões e 48 itens replicáveis (10 sem mínimo adicional, 26 no nível 12 e
12 no nível 16). As referências PHB 2014 já existentes são reutilizadas por ID;
os registros PHB 2024 permanecem separados. Arma Arcana tem conteúdo próprio do
UA e as 16 referências de Xanathar conservam essa origem.

O JSON mantém a classe versionada e a extensão aditiva `artificerUA`, incluindo
escolhas, usos, objetos, companheiros, histórico e justificativa. Os exportadores
editáveis percorrem essa extensão e seu resumo, com páginas de continuação.
A etiqueta de versão não é exibida na interface, impressão ou PDF; os metadados
originais continuam preservados internamente e na exportação/importação JSON.

## Arquivos principais

- `site/js/artificer-ua/dados.js`: classe, progressão, características,
  especializações, infusões, réplicas e metadados de fonte.
- `site/js/artificer-ua/magias-dados.js`: vínculos canônicos gerados e registros
  novos; não contém bytes do PDF privado.
- `site/js/artificer-ua/modelo.js`: migração, limites, estados, recursos,
  companheiros, infusões, avisos e resumo exportável.
- `site/js/artificer-ua/ui.js` e `site/css/artificer-ua.css`: controles na criação
  e na ficha, usando os componentes e modais existentes.
- Integrações em `db.js`, `dados-classes.js`, `catalogo-localizado.js`,
  `utils.js`, `levelup.js`, `levelup-flow.js`, `levelup-cards.js`, nos módulos
  de criação/ficha, proficiências, sintonização e exportação Strixhaven.
- `scripts/importar_artificer_ua.py`: valida a fonte antes de gerar dados.
- `scripts/auditar_artificer_ua.mjs`: verifica progressão, IDs, contagens,
  especializações, infusões e privacidade; gera o relatório de auditoria.
- `testes/regras/unidade/artificer-ua.test.mjs`: 32 testes de regras.
- `testes/e2e/artificer.config.mjs` e `testes/e2e/artificer/artificer.spec.mjs`:
  oito cenários de navegador, incluindo PDF e persistência.

Relatório detalhado: [ARTIFICER-UA-2019-AUDIT.md](ARTIFICER-UA-2019-AUDIT.md).

## Verificação após remoção da etiqueta visual

- Unidade Artífice: **33 aprovados**, incluindo preservação de metadados e
  escolhas na projeção para impressão.
- Artífice E2E: **8 aprovados**, incluindo seletor, detalhes, resumo, ficha,
  impressão e ausência da etiqueta no texto dos três modelos PDF disponíveis.
- Busca/magias: **13 aprovados**; Strixhaven/PDF: **25 aprovados**.
- Auditoria UA aprovada: 88 associações de magias, quatro especializações,
  40 vínculos adicionais, 11 infusões e 48 réplicas.
- Importações ESM: **107 módulos, zero falhas**; `git diff --check` sem erros.

## Diagnóstico e correção da verificação de PDFs

O log da execução interrompida localizou a espera em `page.evaluate`, ao carregar
o PDF já baixado para verificar páginas/campos. Não estava aguardando download
nem um diálogo fechar. Na retomada houve também falha de inicialização do
Chromium por `libasound.so.2` ausente, corrigida no ambiente pelo usuário.

Depois da correção ambiental, os oito testes passaram em 59,4 s, sem aumentar
o limite de 120 s. A instrumentação identificou aproximadamente 20,2 s na leitura
do Critical20: o teste enviava cerca de 3,6 milhões de bytes como um array de
números pelo protocolo do navegador. Outra regressão repetia essa transferência
e o carregamento para consultar apenas mais um campo, excedendo seu prazo de 60 s.

A validação agora envia os mesmos bytes baixados como uma string base64, formato
nativamente aceito por `PDFDocument.load`. O teste Critical20 reúne todas as
consultas no mesmo carregamento. Não houve mudança no PDF gerado, redução das
asserções ou aumento de timeout. As etapas de geração/download e validação
ficam nomeadas no relatório, com tamanho do arquivo e tempos.

Na execução final do Artífice, o cenário antes problemático levou **9,3 s**,
incluindo os três modelos disponíveis. A validação do Critical20 levou **974 ms**.

## Comandos e resultados

Executados na raiz do aplicativo, com o Playwright já existente em `testes/e2e/`:
Os testes de PDF do Artífice também usam `pdftotext` (Poppler) para verificar o
texto visível de todos os modelos, além dos campos editáveis.

```sh
python3 scripts/verificar_ajustes_finais.py artificer
python3 scripts/verificar_ajustes_finais.py regras
python3 scripts/verificar_ajustes_finais.py strixhaven
python3 scripts/verificar_ajustes_finais.py magias
python3 scripts/verificar_ajustes_finais.py novos
python3 scripts/verificar_ajustes_finais.py offline
python3 scripts/verificar_ajustes_finais.py unidade
node --test testes/regras/unidade/artificer-ua.test.mjs
node scripts/auditar_artificer_ua.mjs
python3 -m unittest discover -s testes/catalogo -v
python3 -m unittest discover -s testes/magias -v
TMPDIR=/tmp/opencode node testes/e2e/checar_esm.mjs .
git diff --check
```

| Verificação | Resultado final registrado |
|---|---|
| Artífice E2E | **8 aprovados**, 0 falhas, 0 ignorados; 47,1 s |
| Regras E2E, execução completa | **452 aprovados** |
| Strixhaven/PDF | **25 aprovados** |
| Busca/magias | **13 aprovados** |
| Ajustes finais/polimento | **17 aprovados** |
| Offline original | **3 aprovados** |
| Unidade Artífice | **32 aprovados** |
| Unidade completa | **2.289 aprovados, 256 ignorados, 12 falhas históricas** |
| Python catálogo/auditoria | **8 aprovados** |
| Auditoria UA | **Aprovada** |
| Importações ESM | **107 módulos, zero falhas** |

Os 32 testes do Artífice estão incluídos na contagem da unidade completa. Os
relatórios de cada suíte estão em `docs/verificacoes-ajustes-finais/`; logs mais
extensos e arquivos PDF de prova ficam em `assets-private/entrega/`.

Na retomada foram concluídas regras, Strixhaven, offline, auditoria, Python e
ESM. Busca/magias, polimento e unidade já tinham execuções completas registradas
durante a implementação. As antigas contagens fixas do catálogo Strixhaven foram
ajustadas para verificar separadamente os **396 registros originais** e os
**17 acréscimos UA/XGE**, preservando a verificação do acervo anterior.

## Limitações concretas

- As 12 falhas unitárias históricas dependem de sete referências Markdown
  privadas ausentes em `Informacoes Separadas/`, listadas em
  `docs/verificacoes-ajustes-finais/unidade.json`. A suíte completa não é
  declarada inteiramente verde.
- Há 127 referências de magias base/especializações sem descrição completa local.
  O UA fornece suas listas, não seus efeitos completos. Elas estão listadas na
  auditoria; não foram inventadas descrições PHB/Xanathar. Os detalhes dos itens
  replicáveis remetem ao DMG, conforme o próprio UA.
- Alcance, alvos, passagem do tempo, concentração e resultados de dados são
  acompanhados pelo jogador com os resumos e controles; não há simulação
  automática de combate.
- Templates PDF opcionais continuam dependendo dos arquivos locais validados.

O pacote estático final pode ser preparado com:

```sh
python3 scripts/preparar_dist.py --build 2026092401
```
