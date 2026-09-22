# Polimento visual da primeira versão

## Escopo e referência visual

O cabeçalho existente no diretório de trabalho foi preservado: marcação de
identidade e botões, dimensões, posição, recorte, `object-fit`, raio e regras
responsivas. O clique no retrato continua abrindo o lightbox; os controles
existentes de administração continuam disponíveis.

**Divergência concreta com a descrição solicitada:** a base local recebida já
usava `.foto-retrato` com `border-radius: .4rem`, proporção 1:1 e largura
`clamp(120px,16vw,170px)` (120px no celular). Portanto, o retrato desta base é
quadrado com cantos arredondados, não circular. Esses valores foram preservados
para respeitar a proibição expressa de mudar tamanho, recorte e raio. A versão
circular aprovada precisa ser identificada antes de qualquer mudança visual
no cabeçalho. Os testes registram os valores realmente presentes, sem afirmar
que o avatar local é circular.

Não houve mudança de contrato JSON, cálculos, catálogo, idiomas, justificativas,
mapas PDF, hashes ou implementação dos adaptadores.

## PDF

`Gerar PDF` no cabeçalho abre `Gerar PDF da ficha`, sem download imediato.
O seletor e o botão de exportação inline foram retirados da ficha.

- Ficha descritiva: disponível, sem AcroForm; seleção inicial.
- Strixhaven atual: disponível, editável AcroForm.
- Bardo - Critical20: habilitado somente após a descoberta e validação existentes
  (manifest, arquivo privado e hash); indicado como **Com complemento**.
- Tetse-strixhaven: desabilitado com explicação do reparo necessário.
- Detalhes dos templates privados ficam em `Disponibilidade dos modelos privados`.
- Radios, nomes, descrições e indicadores permitem revisar a escolha a cada abertura.
- Foco inicial na primeira opção, foco preso, Escape, fechar e Cancelar com retorno
  ao acionador usam a infraestrutura acessível existente.
- Durante a geração há estado de processamento e bloqueio de chamadas simultâneas.
  Erros aparecem no modal e permitem tentar novamente. Após sucesso, o modal
  informa o início do download e pode ser fechado pelo usuário.
- Fechar uma geração já iniciada não cancela o exportador; uma nova janela informa
  que há um PDF em processamento e impede outra exportação simultânea.

`baixarPdfFicha` recebe o identificador explicitamente, em vez de consultar um
select inline. O fluxo descritivo e os adaptadores editáveis continuam gerando
os mesmos documentos, incluindo complementos e validações.

## Galeria

- Grade limitada a aproximadamente seis colunas de 110–140px no desktop;
  quatro colunas até 110px no tablet; três até 120px no celular.
- Miniaturas 1:1, `object-fit: cover`, sem expansão quando há uma única foto.
- Até 18 fotos por página; `Anterior`, `Próxima`, intervalo e página atual.
- A página é estado de interface em memória, separado por personagem e superfície;
  não acrescenta campos aos dados salvos. Mantém-se nos rerenders e é corrigida
  após exclusão. Recarregar a aplicação volta à primeira página.
- Ordem do álbum preservada. Badge discreto `Principal` sobre a miniatura.
- Clique/Enter abre o lightbox existente, com título, legenda e texto alternativo.
- Menu `⋮` concentra editar, remover, definir principal e mudar ordem.
- Links quebrados mantêm o quadrado e permitem tentar novamente.
- `Adicionar foto por URL` permanece disponível. A opção de tornar principal
  começa desmarcada; a troca exige ação explícita.
- Retratos legados em `imagem` também permanecem visíveis ao adicionar/remover uma
  referência comum. O campo `photos_configurado` existente passa a ser marcado
  nesse caso somente quando a principal é explicitamente configurada.

## Arquivos desta etapa

- `site/js/pdf-modal.js`: apresentação e estado do modal.
- `site/js/sheet/ficha.js`: abertura do modal e remoção da seção PDF inline.
- `site/js/sheet/pdf.js`: passagem explícita do modelo e propagação opcional de erro.
- `site/js/fotos.js`: galeria paginada, menus, inclusão sem troca automática.
- `site/js/fotos-modelo.js`: preservação do retrato legado ao alterar referências comuns.
- `site/css/ajustes-finais.css`: estilos restritos à galeria e às opções PDF.
- `testes/e2e/ajustes-finais/polimento.spec.mjs`: oito cenários novos agrupados.
- Testes ajustados ao novo fluxo em `ajustes-finais/finais.spec.mjs`,
  `strixhaven/fluxos.spec.mjs`, `strixhaven/phb.spec.mjs` e `regras/pdf-foto.spec.mjs`.
- Documentação e resumos em `docs/verificacoes-ajustes-finais/`.

As outras alterações já existentes no diretório de trabalho pertencem à etapa
anterior e foram mantidas.

## Verificação executada

Comandos na raiz `D-D_2024/`, sem instalação npm:

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
git diff --check
```

Resultados finais de cada suíte:

| Suíte | Resultado |
|---|---|
| Ajustes finais + polimento | 17 aprovados (9 anteriores + 8 novos) |
| Regras E2E, execução completa | 452 aprovados |
| Strixhaven/PDF | 25 aprovados |
| Magias/busca | 13 aprovados |
| Offline | 3 aprovados |
| Python | 8 aprovados |
| Importações ESM | 103 módulos, zero falhas |
| Unidade | 2.257 aprovados, 256 ignorados, 12 falhas por referências privadas ausentes |

As sete referências ausentes estão listadas em
`docs/verificacoes-ajustes-finais/unidade.json`. A suíte unitária inteira não está
verde. A primeira execução concorrente de Strixhaven apresentou dois timeouts
e um teste que precisava fechar o novo modal; após ajuste do fluxo, a execução
completa passou, incluindo validação dos bytes dos PDFs e do template Critical20.

Os cenários novos verificam teclado, foco, cancelamento, seleção de adaptador,
duplo clique, erro recuperável, paginação, remoção da última página, persistência,
links quebrados, inclusão consecutiva, retrato legado e medidas do cabeçalho
antes/depois em 1280, 768 e 390px. Também verificam ausência de overflow horizontal
na ficha, nos menus de fotos e no modal PDF.

Capturas privadas: `assets-private/entrega/polimento/` (ficha, álbum, retrato e modal
nas três larguras). A preservação do cabeçalho é verificada por geometria/estilos
e manutenção do código existente; não há snapshot fornecido da versão circular.

## Validação manual

```sh
python3 -m http.server 8000 --bind 127.0.0.1
```

Abra `http://localhost:8000/site/`.

1. Em desktop e celular (ou DevTools em 390px), abra uma ficha com principal.
   Confira identidade, botões e clique no retrato.
2. Clique `Gerar PDF`: escolha descritivo ou AcroForm, cancele, reabra e gere.
   Confira Escape, retorno de foco e a ausência do seletor inline.
3. Cadastre duas URLs válidas sem marcar principal. O retrato deve permanecer.
4. Com 19 referências, confira 18 na primeira página e a última na segunda.
   Exclua a última e confirme o retorno à página anterior.
5. Use Enter numa miniatura, edite legenda, reordene e defina uma principal pelo
   menu. Recarregue para confirmar persistência.
6. Teste uma URL salva que fique indisponível: o placeholder ocupa o mesmo quadrado.

Empacotamento estático local: `python3 scripts/preparar_dist.py --build 2026092204`.
Não há configuração de deploy nesta etapa.

## Limitações restantes

- Divergência entre o avatar circular descrito e o retrato encontrado na base local.
- Doze testes históricos dependem de referências privadas ausentes.
- Disponibilidade dos modelos privados depende dos arquivos servidos e sua validação.
- Mantêm-se as limitações anteriores do álbum/PDF: imagens dependem do servidor
  original e retratos remotos novos não são incorporados automaticamente ao PDF.
