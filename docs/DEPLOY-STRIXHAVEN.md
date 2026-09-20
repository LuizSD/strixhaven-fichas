# Publicar o fork (não executado)

## Preparação

1. Revise as alterações em uma **branch separada**. O workflow preservado publica
   automaticamente quando `main` recebe push, depois de configurar Pages/Actions.
   `workflow_dispatch` também publica; não é um botão de pré-visualização.
2. Configure o remote do seu fork e preencha `repositorio` em
   `site/js/campanha-config.js` com `https://github.com/SEU-USUARIO/SEU-FORK`.
   A URL atual de `origin` ainda é a do upstream. Não houve push, merge ou deploy.
3. Em Settings → Pages, escolha GitHub Actions. Revise as permissões de Actions.
4. Rode os testes da adaptação e prepare o mesmo artefato localmente:

   ```bash
   python3 scripts/preparar_dist.py --build 1
   python3 -m http.server 8000 --bind 127.0.0.1
   ```

   Abra `http://localhost:8000/_dist/site/`. Não use somente a pasta `site/`.

## Estrutura e caminhos

`.github/workflows/deploy.yml` continua usando Pages Actions, com a estrutura:

```
_dist/
  index.html
  LICENSE
  site/    # manifest, SW, CSS, JS, imagens públicas
  dados/   # bancos originais + strixhaven/
```

O preparador usa uma allowlist e gera `js-precache.json` e
`dados-precache.json` por varredura. Não percorre `.ai/`, `assets-private/`,
prompts, checkpoints nem exemplos pessoais. Esses diretórios também são ignorados
pelo Git. Não coloque referências privadas dentro de `site/` ou `dados/`.
O destino é restrito a `_dist/` e é recriado para não incluir resíduos de builds
anteriores; a suíte offline verifica a remoção de uma sentinela privada residual.

Os caminhos são relativos: `../dados`, `./sw.js`, `start_url: ./index.html`,
`scope: ./` e `id: ./`. Não há prefixo de fork fixo. O teste de campanha serve o
artefato sob `/_dist/fork-verificacao/site/`, usa o precache offline e aplica uma
segunda versão do SW. A URL real do fork ainda depende da configuração do usuário.
Favicon SVG e ícones PNG próprios de 192/512 px estão em `site/img/`; o ícone Apple
também usa a arte nova. PNGs podem ser regenerados do SVG por
`scripts/gerar_icones_strixhaven.py` (ferramenta opcional com PyMuPDF).

Caches usam `strixhaven-2024-<escopo>-...-r3-v<build>` e só limpam versões desse
mesmo escopo. Não apagam caches da base original ou de outros aplicativos.
Builds de produção recebem `github.run_number`; ao mudar a lista estática em
desenvolvimento, incremente a revisão `r3` no SW. O fallback lê somente os caches
da versão/escopo atual, nunca caches de outro aplicativo. A verificação injeta
HTML, JavaScript e JSON legados nas mesmas URLs e confirma que não são usados.

## Armazenamento e sincronização

GitHub Pages hospeda arquivos, **não sincroniza personagens entre dispositivos**.
O namespace local é `strixhaven_2024_personagens`. JSON continua sendo o backup
completo. A cópia explícita da base faz backup e não modifica `dnd_personagens`.

Firebase permanece opcional: configure seu próprio projeto, autenticação,
domínios autorizados e regras de acesso por usuário. `firebase: null` não carrega
SDK remoto; a configuração antiga `ded2024` é recusada. Nunca grave tokens ou
credenciais privadas no código público. O transporte existente serializa o objeto
inteiro, incluindo `strixhaven`, extras e ajustes.
