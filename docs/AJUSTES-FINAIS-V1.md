# Ajustes finais da primeira versão

O fluxo de PDF e a apresentação do álbum foram posteriormente refinados em
[Polimento visual V1](POLIMENTO-VISUAL-V1.md), que também registra os resultados
mais recentes. Os números abaixo descrevem a entrega original desta etapa.

## Avisos de magias

O cabeçalho e as seções de magias mostram uma observação compacta:
`⚠ N observações de regras — Ver detalhes`. Quando todas têm justificativa,
mostram `ⓘ N divergências aceitas`. As regras e os contadores permanecem ativos;
nenhum aviso impede salvar, imprimir ou exportar.

“Ver detalhes” abre a lista completa, com nomes bilíngues, motivo, referência
de classe/círculo e justificativas. Há edição/remoção de justificativa geral e
por magia, além de “Ir à magia”. Mensagens da mesma referência canônica e código
de validação são unificadas, incluindo cópias em preparadas/grimório/extras.
Avisos de classe e de círculo da mesma magia continuam distintos. Parâmetros
distintos de uma incompatibilidade também não são unidos indevidamente.

Os modais existentes agora têm `role=dialog`, título/descrição acessíveis,
foco inicial e preso por Tab, Escape, retorno ao acionador, fundo inerte e
bloqueio de rolagem. A pilha de submodais mantém o mesmo contrato de abertura.

## Idiomas personalizados

Na seção **Idiomas**, use **Adicionar idioma personalizado / Add custom
language**. Digite o nome principal, inglês opcional, aliases separados por
vírgula, alfabeto, origem e observações. Enquanto digita, aparecem sugestões do
catálogo e das entradas pessoais, pesquisadas sem acentos e nos dois idiomas.

Uma provável duplicata pede confirmação explícita; selecionar uma sugestão
reutiliza o idioma existente. Editar altera só a instância; remover exige
confirmação. Cada instância tem ID local estável e origem `custom`.

O contrato legado `idiomas[]` continua disponível para cálculos e exportações.
`idiomas_personalizados[]` guarda metadados, com aliases em `name.aliases`.
`idiomas_padrao[]` diferencia seleções predefinidas de personalizadas homônimas,
para remover uma variante sem apagar a seleção padrão. O modelo atual não
separa proficiências de fala/leitura/escrita. Silvestre/Sylvan foi preservado.

O mesmo editor funciona no rascunho de criação em memória e na ficha persistida.
Os dois conjuntos permanecem no JSON individual e de campanha e no complemento
editável do PDF existente.

## Fotos e referências visuais

Use **Adicionar foto por URL** no álbum ou **Escolher foto / Trocar principal**
no cabeçalho. O cadastro aceita uma URL HTTPS absoluta; para desenvolvimento,
aceita HTTP em `localhost` e `127.0.0.1`. `javascript:`, `data:`, `file:` e HTTP
externo são recusados. Extensões não são usadas como prova de imagem: a URL é
testada por um `<img>` real, incluindo caminhos de CDN com query string.

Campos: URL, título, legenda, texto alternativo, principal e posição do recorte
(centro/topo/base). O álbum permite editar, reordenar por botões, remover com
confirmação e ampliar em modal acessível. Miniaturas usam carregamento lazy e
`referrerpolicy=no-referrer`; URLs são atribuídas por propriedades DOM, nunca
interpoladas em HTML. Títulos/legendas são texto inerte.

### Falhas e principal

- Nenhum byte, base64, canvas ou arquivo de imagem é criado pelo álbum.
- Imagem indisponível mostra placeholder e **Tentar novamente**. A URL salva
  permanece, inclusive offline. Edição de metadados com a mesma URL não exige
  que o servidor externo esteja online novamente.
- URL nova ou alterada precisa carregar antes de ser salva. Em caso de erro,
  o formulário conserva o endereço digitado e permite corrigir/tentar novamente.
- Definir uma principal desmarca as anteriores. Pode existir zero ou uma.
- Ao excluir a principal, o modal permite escolher substituta ou placeholder.
  Por padrão, escolhe a primeira referência restante na ordem do álbum. Se ela
  não carregar, aparece o placeholder; não há varredura/download de outras URLs.
- **Sem principal** no cabeçalho preserva o álbum e usa iniciais neutras.

### Migração e privacidade

Fichas antigas ganham `photos: []`. Os demais dados são preservados. IDs, ordem,
principal, criação e metadados sobrevivem ao round-trip JSON. URLs inseguras
importadas são recusadas sem manter bytes no álbum; um aviso informa o problema.

Retratos antigos em `imagem` são mantidos por compatibilidade e podem continuar
visíveis enquanto o álbum não for configurado. Não são copiados nem convertidos
em fotos do álbum. Os controles antigos de envio de arquivo passam a abrir o
gerenciador por URL; novas imagens não são serializadas em `imagem`.

Imagens externas dependem do servidor original. O service worker não arquiva
imagens externas; o cache HTTP normal do navegador continua sob controle do
navegador/servidor. Não há proxy, scraping ou download de arquivo pela aplicação.
GIFs são exibidos pelo navegador; não há análise de quadros/bytes para identificar
animação. SVGs que o navegador decodifica como imagem também funcionam, isolados
em `<img>`, sem inserção de HTML externo.

Os exportadores PDF não foram reescritos. URLs/metadados seguem no documento
editável; a imagem remota nova não é incorporada automaticamente. Retratos
legados continuam usando o mecanismo de exportação já existente.

## Verificação

Resumos legíveis por máquina: `docs/verificacoes-ajustes-finais/`.
Logs extensos e capturas: `assets-private/entrega/` (privados).

Comandos usados, na raiz do aplicativo:

```sh
python3 scripts/verificar_ajustes_finais.py novos
python3 scripts/verificar_ajustes_finais.py unidade
python3 scripts/verificar_ajustes_finais.py regras
python3 scripts/verificar_ajustes_finais.py strixhaven
python3 scripts/verificar_ajustes_finais.py magias
python3 scripts/verificar_ajustes_finais.py offline
python3 -m unittest discover -s testes/catalogo -v
python3 -m unittest discover -s testes/magias -v
TMPDIR=/tmp/opencode node testes/e2e/checar_esm.mjs .
```

O executor usa o Playwright/Node já existente **somente em `testes/e2e/`**.
Não instala npm nem cria toolchain para o aplicativo. Neste ambiente o Chromium
usa a biblioteca de áudio local em `/tmp/opencode/browser-libs/`; isso é apenas
configuração do ambiente de testes.

Resultados:

- Novos testes de navegador: 9 aprovados, cobrindo os 23 requisitos funcionais
  por cenários agrupados (incluindo criação em memória e round-trip).
- Unidade: 2.257 aprovados, 256 ignorados pela suíte histórica; 12 bloqueios
  já conhecidos por sete referências privadas Markdown 2024 ausentes.
- Regras no navegador: 449 aprovados na execução completa; três expectativas
  antigas de catálogo/metadados foram corrigidas e passaram na reexecução
  dirigida. Total de casos distintos verificados: 452.
- Strixhaven: 25 aprovados. Busca global/magias: 13 aprovados.
- Offline original: 3 aprovados; o teste agora prepara seu artefato local em
  `_dist/offline-original/`, sem depender de workflow/deploy.
- Python: 4 testes de catálogo e 4 de auditoria já existente aprovados. O PHB
  **não foi extraído novamente**: esses testes leem os artefatos existentes.

A suíte de unidade não é declarada totalmente verde enquanto faltarem os
arquivos privados de `Informacoes Separadas/`. Nenhuma referência foi fabricada.

## Abrir localmente

Na pasta `D-D_2024/`:

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Abra `http://localhost:8000/site/`. Para um diretório contendo apenas o site e
os dados públicos, use o empacotador já existente:

```sh
python3 scripts/preparar_dist.py --build 2026092203
python3 -m http.server 8000 --bind 127.0.0.1 --directory _dist
```
