import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';

const q = (page, chave) => page.locator(`[data-gs="${chave}"]`);
async function buscar(page, termo) {
  await q(page,'busca').fill(termo);
  await expect(q(page,'resultados')).toHaveAttribute('aria-busy','false');
}
async function preparar(page, abrirFicha = false) {
  await page.goto('');
  await page.evaluate(async () => {
    const s = await import('./js/store.js');
    for (const [id,nome,classe] of [['global-mago','Mago da busca','Mago'], ['global-druida','Druida da busca','Druida']]) {
      const p = s.criarPersonagemVazio();
      Object.assign(p, { id, nome, classe, especie: 'Humano', nivel: 1, pv_max: 8, pv_atual: 8 });
      s.salvarPersonagem(p);
    }
  });
  await page.goto(abrirFicha ? '#ficha/global-mago' : '#magias/global-mago');
  await expect(page.locator(abrirFicha ? '#char-nome-display' : '[data-gs="contador"]')).toBeVisible();
}

test('menu por teclado, catálogo integral e nomes bilíngues de todas as versões', async ({ page }) => {
  await page.goto('');
  await page.locator('#menu-todas-magias').focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#magias$/);
  await expect(q(page,'contador')).toContainText('magias encontradas');
  const audit = JSON.parse(await readFile(new URL('../../../reference/audits/phb-spells-audit.json', import.meta.url)));
  const c = await page.evaluate(async () => (await (await import('./js/db.js')).getIndiceMagias({ incluirLegado: true })).magias);
  expect(c.filter(m => m.source.rulesVersion === '2014-legacy')).toHaveLength(audit.passes.descriptions.normalized);
  expect(c.filter((m,i) => c.findIndex(n => n.id === m.id) !== i).map(m => ({ id:m.id, nome:m.nome, circulo:m.circulo }))).toEqual([]);
  expect(c.filter(m => !m.name?.en || !m.name?.ptBR)).toEqual([]);
  await expect(q(page,'contador')).toContainText(`${c.length} magias encontradas`);
  await q(page,'origem').selectOption('2014-legacy');
  for (const termo of ['Guidance', 'Orientação', 'orientacao']) {
    await buscar(page, termo);
    await expect(page.locator('.spell-result')).toHaveCount(1);
    await expect(page.locator('.spell-result')).toHaveAttribute('data-spell-id','phb-2014-guidance');
  }
  await expect(page.locator('.spell-result .localized-label__primary')).toHaveText('Orientação');
  await expect(page.locator('.spell-result .localized-label__secondary')).toHaveText('Guidance');
  for (const termo of ['Orien', 'guid']) {
    await buscar(page, termo);
    await expect(page.locator('[data-spell-id="phb-2014-guidance"]')).toHaveCount(1);
  }
});

test('mega busca pesquisa nomes, classe PT/EN, escola, círculo, origem e limpa todos os filtros', async ({ page }) => {
  await preparar(page);
  for (const termo of ['Mage Hand', 'Mãos Mágicas', 'wizard', 'mago', 'divination', 'adivinhação', '3º círculo', 'PHB 2014']) {
    await buscar(page, termo);
    await expect(q(page,'contador')).not.toContainText('0 magias encontradas');
    await expect(page.locator('.spell-result').first()).toBeVisible();
  }
  await q(page,'limpar').click();
  const total = await q(page,'contador').textContent();
  await q(page,'circulo').selectOption('3');
  await q(page,'classes').selectOption(['Clérigo','Druida']);
  await q(page,'escola').selectOption('Evocation');
  await q(page,'compativeis').check();
  await q(page,'selecionadas').check();
  await q(page,'limpar').click();
  await expect(q(page,'contador')).toHaveText(total);
  await expect(q(page,'classes')).toHaveValues([]);
  await expect(q(page,'compativeis')).not.toBeChecked();
  await q(page,'busca').fill('3º círculo');
  await expect(q(page,'contador')).not.toContainText('0 magias');
  const r = await page.evaluate(async () => (await (await import('./js/db.js')).buscarMagias('3º círculo')));
  expect(r.every(m => m.circulo === 3)).toBe(true);
  expect(new Set(r.flatMap(m => m.classes)).size).toBeGreaterThan(3);
});

test('outra classe e círculo 9: destino escolhido, alerta e nenhum espaço concedido', async ({ page }) => {
  await preparar(page);
  const antes = await page.evaluate(async () => (await import('./js/store.js')).getPersonagem('global-mago'));
  await q(page,'origem').selectOption('2014-legacy');
  await q(page,'busca').fill('Guidance');
  await expect(page.locator('.spell-result')).toHaveCount(1);
  await expect(page.locator('.spell-result')).toContainText('Fora da lista da sua classe');
  await page.locator('[data-gs-adicionar]').click();
  await page.locator('#ga-salvar').click();
  await expect(page.locator('.spell-result')).toContainText('Já registrada');
  await q(page,'busca').fill('Wish');
  await expect(page.locator('.spell-result')).toHaveCount(1);
  await expect(page.locator('.spell-result')).toContainText('9º círculo — personagem atualmente conjura até o 1º');
  await page.locator('[data-gs-adicionar]').click();
  await page.locator('#ga-tipo').selectOption('Recompensa');
  await page.locator('#ga-motivo').fill('Recompensa futura da campanha');
  await page.locator('#ga-salvar').click();
  await q(page,'destino').selectOption('global-druida');
  await q(page,'busca').fill('Guidance');
  await expect(page.locator('.spell-result')).toHaveCount(1);
  await page.locator('[data-gs-adicionar]').click();
  await page.locator('#ga-salvar').click();
  const depois = await page.evaluate(async () => (await import('./js/store.js')).listarPersonagens());
  const mago = depois.find(p => p.id === 'global-mago');
  expect(mago.magias_customizadas).toHaveLength(2);
  expect(mago.magias_customizadas[1]).toMatchObject({ circulo: 9, estado_extra: 'registrada', motivo: 'Recompensa — Recompensa futura da campanha' });
  expect(mago.espacos_magia).toEqual(antes.espacos_magia);
  expect(mago.atributos).toEqual(antes.atributos);
  expect(depois.find(p => p.id === 'global-druida').magias_customizadas).toHaveLength(1);
  await page.goto('#ficha/global-mago');
  await expect(page.locator('#magias-extras')).toContainText('Não conjurável atualmente');
  await page.locator('#observacoes-extras').click();
  await expect(page.locator('#modal-corpo')).toContainText('fora das listas de classe');
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.locator('[data-extra-id]')).toHaveCount(2);
});

test('busca da ficha é a mesma visão global e sugestões do manual funcionam PT/EN', async ({ page }) => {
  await preparar(page, true);
  await page.locator('#pesquisar-todas-magias').click();
  await expect(q(page,'compativeis')).not.toBeChecked();
  await expect(q(page,'destino')).toHaveValue('global-mago');
  await q(page,'manual').click();
  for (const [campo,valor] of [['pt','orientacao'],['en','Guidan']]) {
    await page.locator(`#me-${campo}`).fill(valor);
    await expect(page.locator('#me-sugestoes')).toContainText('Guidance');
  }
  await page.locator('[data-me-sugestao]').filter({ hasText: 'Legado 2014' }).click();
  await page.locator('#ga-salvar').click();
  expect(await page.evaluate(async () => (await import('./js/store.js')).getPersonagem('global-mago').magias_customizadas[0].catalogo_ref)).toBe('phb-2014-guidance');
});

test('personalizada confirmada é local, editável, removível e faz round-trip completo', async ({ page }) => {
  await preparar(page, true);
  const catalogoAntes = await page.evaluate(async () => JSON.stringify((await (await import('./js/db.js')).getIndiceMagias({ incluirLegado: true })).magias));
  await page.locator('#magia-manual-global').click();
  await page.locator('#me-pt').fill('Luz da Biblioteca');
  await page.locator('#me-en').fill('Library Light');
  await page.locator('#me-aliases').fill('Luz acadêmica, Academic light');
  await page.locator('#me-circulo').selectOption('9');
  await page.locator('#me-escola').fill('Evocação');
  await page.locator('#me-classes').fill('wizard, druid');
  await page.locator('#me-v').check();
  await page.locator('#me-motivo').fill('Regra da mesa');
  await page.locator('#me-salvar').click();
  await expect(page.locator('#me-erro')).toContainText('Confirme explicitamente');
  await page.locator('#me-confirmar').check();
  await page.locator('#me-salvar').click();
  await expect(page.locator('[data-extra-id]')).toContainText('Library Light');
  await page.locator('[data-extra-acao="editar-completa"]').click();
  await page.locator('#me-alcance').fill('777 metros — override');
  await page.locator('#me-salvar').click();
  const r = await page.evaluate(async () => {
    const s = await import('./js/store.js');
    const original = s.getPersonagem('global-mago');
    const json = s.exportarPersonagem(original.id);
    const campanha = s.exportarTodos();
    s.removerPersonagem(original.id); s.importarPersonagens(json);
    return { original, apos: s.getPersonagem(original.id), campanha: JSON.parse(campanha), catalogo: JSON.stringify((await (await import('./js/db.js')).getIndiceMagias({ incluirLegado: true })).magias) };
  });
  expect(r.apos.magias_customizadas).toEqual(r.original.magias_customizadas);
  expect(r.apos.magias_customizadas[0]).toMatchObject({ source: { rulesVersion:'custom' }, classes: ['Mago','Druida'], alcance: '777 metros — override', motivo:'Regra da mesa', name: { en: 'Library Light', aliases: ['Luz acadêmica','Academic light'] } });
  expect(r.catalogo).toBe(catalogoAntes);
  expect(r.campanha.find(p => p.id === 'global-mago').magias_customizadas).toEqual(r.original.magias_customizadas);
  page.once('dialog', d => d.accept());
  await page.locator('[data-extra-acao="remover"]').click();
  await expect(page.locator('[data-extra-id]')).toHaveCount(0);
});

test('IDs antigos reconciliam sem perder overrides nem remover versões', async ({ page }) => {
  await page.goto('');
  const r = await page.evaluate(async () => {
    const db = await import('./js/db.js');
    const cat = (await db.getIndiceMagias({ incluirLegado: true })).magias;
    const { reconciliarMagias } = await import('./js/magias/modelo.js');
    const p = { magias_preparadas: [{ id:'referencia-antiga', nome:'Orientação local', name:{ en:'Guidance' }, circulo:0, source:{ rulesVersion:'2014-legacy' }, alcance:'999 m', overrides:{ livre:true }, motivo:'Recompensa' }], magias_conhecidas:[{ nome:'Orientação', circulo:0 }] };
    reconciliarMagias(p,cat);
    const antes = JSON.stringify(p); reconciliarMagias(p,cat);
    return { p, idempotente: antes === JSON.stringify(p) };
  });
  expect(r.idempotente).toBe(true);
  // A associação UA é aditiva ao registro canônico; os overrides continuam intactos.
  expect(r.p.magias_preparadas[0]).toMatchObject({ id:'referencia-antiga', catalogo_ref:'phb-2014-guidance', alcance:'999 m', overrides:{ livre:true }, motivo:'Recompensa', classes:['Clérigo','Druida','artificer-ua-2019'] });
  expect(r.p.magias_conhecidas[0].catalogo_ref).toBe('phb-2024-guidance');
});

test('cotas são referências: menos/mais, justificativa e mudança de classe preservam registros', async ({ page }) => {
  await preparar(page,true);
  await page.locator('#observacoes-extras').click();
  await expect(page.locator('#modal-corpo')).toContainText('0/3 truques — falta 3');
  await page.keyboard.press('Escape');
  const antes = await page.evaluate(async () => (await import('./js/store.js')).getPersonagem('global-mago').espacos_magia);
  await page.locator('#pesquisar-todas-magias').click();
  await q(page,'origem').selectOption('2014-legacy');
  for (const termo of ['Fire Bolt','Mage Hand','Minor Illusion','Prestidigitation']) {
    await buscar(page, termo);
    await expect(page.locator('.spell-result')).toHaveCount(1);
    await page.locator('[data-gs-adicionar]').click();
    await page.locator('#ga-estado').selectOption('conhecida');
    await page.locator('#ga-salvar').click();
    await expect(page.locator('#ga-salvar')).toHaveCount(0);
  }
  await page.evaluate(() => window.fecharModal());
  await page.locator('#observacoes-extras').click();
  await expect(page.locator('#modal-corpo')).toContainText('4/3 truques — excede 1');
  await page.locator('#magias-justificativa').fill('Bônus da campanha');
  await page.locator('#magias-justificar-salvar').click();
  await expect(page.locator('#magias-extras > .observacoes-resumo.info')).toContainText('divergências aceitas');
  await page.locator('#observacoes-extras').click();
  await expect(page.locator('#modal-corpo')).toContainText('4/3 truques — excede 1');
  await page.keyboard.press('Escape');
  const r = await page.evaluate(async () => {
    const s = await import('./js/store.js');
    const p = s.getPersonagem('global-mago');
    const json = s.exportarTodos(); s.removerPersonagem(p.id); s.importarPersonagens(json);
    const restaurado = s.getPersonagem(p.id);
    const ids = restaurado.magias_customizadas.map(m => m.id);
    restaurado.classes[0].classe = 'Bárbaro';
    (await import('./js/regras-multiclasse.js')).sincronizarEspelhos(restaurado);
    s.salvarPersonagem(restaurado);
    return { p, ids };
  });
  expect(r.p.espacos_magia).toEqual(antes);
  expect(r.p.justificativa_magias).toBe('Bônus da campanha');
  await page.reload();
  const apos = await page.evaluate(async () => (await import('./js/store.js')).getPersonagem('global-mago'));
  expect(apos.magias_customizadas.map(m => m.id)).toEqual(r.ids);
});

test('duplicatas exigem confirmação, versões e remoção usam a identidade certa', async ({ page }) => {
  await preparar(page);
  await q(page,'busca').fill('Guidance');
  await q(page,'origem').selectOption('2014-legacy');
  await expect(page.locator('.spell-result')).toHaveCount(1);
  await page.locator('[data-gs-adicionar]').click(); await page.locator('#ga-salvar').click();
  await q(page,'origem').selectOption('2024');
  await page.locator('[data-gs-adicionar]').click();
  await page.locator('#ga-salvar').click();
  await expect(page.locator('#ga-erro')).toContainText('já registrada');
  await page.locator('#ga-versao').check(); await page.locator('#ga-salvar').click();
  const p = await page.evaluate(async () => (await import('./js/store.js')).getPersonagem('global-mago'));
  expect(p.magias_customizadas.map(m => m.catalogo_ref)).toEqual(['phb-2014-guidance','phb-2024-guidance']);
  await q(page,'selecionadas').check();
  await expect(page.locator('.spell-result')).toHaveCount(1);
  await page.goto('#ficha/global-mago');
  page.once('dialog',d=>d.accept());
  await page.locator(`[data-extra-id="${p.magias_customizadas[0].id}"] [data-extra-acao="remover"]`).click();
  await expect(page.locator('[data-extra-id]')).toHaveCount(1);
  expect(await page.evaluate(async () => (await import('./js/store.js')).getPersonagem('global-mago').magias_customizadas[0].catalogo_ref)).toBe('phb-2024-guidance');
});

test('magias escolhidas continuam na exportação editável existente', async ({ page }) => {
  await preparar(page);
  await q(page,'origem').selectOption('2014-legacy'); await q(page,'busca').fill('Wish');
  await expect(page.locator('.spell-result')).toHaveCount(1);
  await page.locator('[data-gs-adicionar]').click(); await page.locator('#ga-salvar').click();
  await page.addScriptTag({ url:'js/vendor/pdf-lib.min.js' });
  const r = await page.evaluate(async () => {
    const p = (await import('./js/store.js')).getPersonagem('global-mago');
    const bytes = await (await import('./js/strixhaven/exportacao.js')).gerarPdfEditavel(p, window.PDFLib);
    const doc = await window.PDFLib.PDFDocument.load(bytes);
    return { valores:doc.getForm().getFields().map(f=>f.getText()), editavel:doc.getForm().getFields().every(f=>!f.isReadOnly()) };
  });
  expect(r.valores).toEqual(expect.arrayContaining(['Desejo','Wish','2014-legacy','registrada']));
  expect(r.editavel).toBe(true);
});

test('editor legado também sugere o catálogo por digitação bilíngue', async ({ page }) => {
  await preparar(page,true);
  await page.locator('#btn-add-magia-custom').click();
  await page.locator('#mc-nome').fill('orientacao');
  await expect(page.locator('#mc-sugestoes-globais')).toContainText('Guidance');
  await page.locator('#mc-nome').fill('Guidance');
  await page.locator('[data-mc-global]').filter({ hasText:'Legado 2014' }).click();
  await page.locator('#ga-salvar').click();
  await expect(page.locator('[data-extra-id]')).toContainText('Orientação');
});

test('menu global durante criação conserva o rascunho em memória', async ({ page }) => {
  await page.goto('#criar');
  await expect(page.locator('#wizard-content')).toBeVisible();
  await page.evaluate(async () => {
    const { personagem } = await import('./js/creator/wizard.js');
    personagem.nome = 'Rascunho preservado'; personagem.classe = 'Mago'; personagem.notas = 'Não perder estes dados';
  });
  await page.locator('#menu-todas-magias').click();
  await expect(page).toHaveURL(/#criar$/);
  await q(page,'origem').selectOption('2014-legacy');
  await buscar(page,'Wish');
  await page.locator('[data-gs-adicionar]').click(); await page.locator('#ga-salvar').click();
  const p = await page.evaluate(async () => (await import('./js/creator/wizard.js')).personagem);
  expect(p.nome).toBe('Rascunho preservado'); expect(p.notas).toBe('Não perder estes dados');
  expect(p.magias_customizadas[0]).toMatchObject({ catalogo_ref:'phb-2014-wish', circulo:9 });
  expect(await page.evaluate(async () => (await import('./js/store.js')).listarPersonagens())).toEqual([]);
});

test('visão global em tela pequena: duas linhas, contraste e teclado', async ({ page }) => {
  await page.setViewportSize({ width:390, height:844 });
  await page.goto('#magias');
  await q(page,'origem').selectOption('2014-legacy'); await buscar(page,'Guidance');
  const dimensoes = await page.locator('.spell-result').evaluate(el => {
    const a = el.querySelector('.localized-label__primary'), b = el.querySelector('.localized-label__secondary');
    const ar = a.getBoundingClientRect(), br = b.getBoundingClientRect();
    const lum = s => s.match(/[\d.]+/g).slice(0,3).map(Number).map(v=>v/255).map(v=>v<=.04045?v/12.92:((v+.055)/1.055)**2.4).reduce((n,v,i)=>n+v*[.2126,.7152,.0722][i],0);
    const cor = lum(getComputedStyle(b).color), bg=lum(getComputedStyle(el).backgroundColor);
    return { abaixo:br.top>=ar.bottom, menor:parseFloat(getComputedStyle(b).fontSize)<parseFloat(getComputedStyle(a).fontSize), contraste:(Math.max(cor,bg)+.05)/(Math.min(cor,bg)+.05), largura:document.documentElement.scrollWidth, viewport:innerWidth, overflow:[...document.querySelectorAll('body *')].filter(n=>n.getBoundingClientRect().right>innerWidth+1).map(n=>({ tag:n.tagName, cls:n.className, text:n.textContent.slice(0,90) })).slice(0,8) };
  });
  expect(dimensoes.abaixo).toBe(true); expect(dimensoes.menor).toBe(true);
  expect(dimensoes.contraste).toBeGreaterThanOrEqual(4.5); expect(dimensoes.largura, JSON.stringify(dimensoes.overflow)).toBeLessThanOrEqual(dimensoes.viewport);
  await page.locator('[data-gs-detalhes]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#modal-corpo')).toContainText('p. 248');
  await page.evaluate(()=>window.fecharModal());
  await mkdir(new URL('../../../assets-private/entrega/',import.meta.url),{recursive:true});
  await page.screenshot({ path:new URL('../../../assets-private/entrega/magias-global-mobile.png',import.meta.url).pathname, fullPage:true });
});
