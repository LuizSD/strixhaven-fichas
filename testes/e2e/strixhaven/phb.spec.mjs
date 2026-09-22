import { test, expect } from '@playwright/test';
import { readFile, mkdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';

async function ficha(page, classe = 'Clérigo') {
  await page.goto('');
  await page.evaluate(async classe => {
    const s = await import('./js/store.js');
    const p = s.criarPersonagemVazio();
    Object.assign(p, { id: 'phb-teste', nome: 'Auditoria PHB', classe, nivel: 1, especie: 'Humano', pv_max: 8, pv_atual: 8 });
    s.salvarPersonagem(p); location.hash = '#ficha/phb-teste';
  }, classe);
  await expect(page.locator('#char-nome-display')).toHaveText('Auditoria PHB');
}

test('catálogo reconcilia auditoria e busca Guidance nos três termos sem contaminar 2024', async ({ page }) => {
  const audit = JSON.parse(await readFile(new URL('../../../reference/audits/phb-spells.json', import.meta.url)));
  await page.goto('');
  const dados = await page.evaluate(async () => {
    const db = await import('./js/db.js');
    const legado = await db.getMagiasLegado();
    const buscas = await Promise.all(['Guidance', 'Orientação', 'orientacao'].map(t => db.buscarMagias(t)));
    return { legado, ids: buscas.map(ms => ms.filter(m => m.name?.en === 'Guidance' && m.source?.rulesVersion === '2014-legacy').map(m => m.id)), primaria: (await db.getMagiasClasse('Clérigo')).lista_magias, global: (await db.getIndiceMagias({ incluirLegado: true })).magias.length };
  });
  expect(dados.legado).toHaveLength(audit.passes.descriptions.normalized);
  expect(new Set(dados.legado.map(m => m.id)).size).toBe(dados.legado.length);
  expect(dados.ids).toEqual(Array(3).fill(['phb-2014-guidance']));
  expect(dados.legado.find(m => m.id === 'phb-2014-guidance')).toMatchObject({ nome: 'Orientação', circulo: 0, escola: 'Adivinhação', classes: ['Clérigo', 'Druida'], source: { rulesVersion: '2014-legacy', printedPage: 248 } });
  for (const m of dados.legado) for (const k of ['tempo_conjuracao', 'alcance', 'componentes', 'duracao']) expect(m[k], `${m.id}: ${k}`).toBeTruthy();
  expect(dados.legado.find(m => m.name.en === 'Branding Smite').concentracao).toBe(true);
  expect(dados.legado.find(m => m.name.en === 'Delayed Blast Fireball').concentracao).toBe(true);
  expect(dados.legado.find(m => m.name.en === 'Contagion').componentes).toBe('V, S');
  expect(Object.values(dados.primaria).flat().some(m => m.source?.rulesVersion === '2014-legacy')).toBe(false);
});

test('Guidance selecionada, editada localmente, duplicação confirmada e remoção por ID', async ({ page }) => {
  await ficha(page);
  const adicionar = async () => {
    await page.locator('#catalogo-todos').click();
    await page.locator('#extra-origem-filtro').selectOption('2014-legacy');
    await page.locator('#extra-busca').fill('guidance');
    const opcao = page.locator('[data-extra-opcao]');
    await expect(opcao).toHaveCount(1);
    await expect(opcao.locator('.localized-label__primary')).toHaveText('Orientação');
    await expect(opcao.locator('.localized-label__secondary')).toHaveText('Guidance');
    await opcao.click();
  };
  await adicionar();
  await page.locator('#extra-sem-teste').check();
  await page.locator('#btn-salvar-mc').click();
  await expect(page.locator('[data-extra-id]')).toHaveCount(1);
  page.once('dialog', d => d.accept());
  await adicionar();
  await page.locator('#extra-sem-teste').check();
  await page.locator('#mc-nome').fill('Orientação da Mesa');
  await page.locator('#btn-salvar-mc').click();
  await expect(page.locator('[data-extra-id]')).toHaveCount(2);
  page.once('dialog', d => d.accept());
  await page.locator('[data-extra-id]').first().locator('[data-extra-acao="remover"]').click();
  await page.reload();
  await expect(page.locator('[data-extra-id]')).toHaveCount(1);
  await expect(page.locator('[data-extra-id]')).toContainText('Orientação da Mesa');
  expect(await page.evaluate(async () => (await (await import('./js/db.js')).getMagiasLegado()).find(m => m.id === 'phb-2014-guidance').nome)).toBe('Orientação');
});

test('círculo 9, justificativa, idiomas e JSON completo preservam escolhas e PDF editável', async ({ page }) => {
  await ficha(page);
  await page.locator('#catalogo-todos').click();
  await page.locator('#extra-origem-filtro').selectOption('2014-legacy');
  await page.locator('#extra-nivel-filtro').selectOption('9');
  await page.locator('#extra-busca').fill('Wish');
  await page.locator('[data-extra-opcao]').click();
  await page.locator('#extra-sem-teste').check();
  await page.locator('#extra-motivo').fill('Recompensa futura');
  await page.locator('#btn-salvar-mc').click();
  await page.locator('#observacoes-extras').click();
  await expect(page.locator('#modal-corpo')).toContainText('não conjurável atualmente');
  await page.keyboard.press('Escape');
  await page.locator('[data-justificar-magias]').first().click();
  await page.locator('#magias-justificativa').fill('Regra da mesa: repertório incompleto e recompensa futura');
  await page.locator('#magias-justificar-salvar').click();
  await expect(page.locator('#magias-extras > .observacoes-resumo.info')).toContainText('divergências aceitas');
  await page.locator('#manual-idiomas').click();
  await page.locator('#idioma-busca').fill('Sylvan');
  await expect(page.locator('[data-idioma]')).toHaveCount(1);
  await page.locator('[data-idioma]').check();
  await page.locator('#idioma-novo').click();
  await page.locator('#idioma-nome').fill('Linguagem Estelar');
  await page.locator('#idioma-en').fill('Star Speech');
  await page.locator('#idioma-escrita').fill('Runas');
  await page.locator('#idioma-salvar').click();
  await page.locator('[data-idioma-editar]').click();
  await page.locator('#idioma-observacoes').fill('Aprendida na campanha');
  await page.locator('#idioma-salvar').click();
  await page.evaluate(() => window.fecharModal());
  const roundtrip = await page.evaluate(async () => {
    const s = await import('./js/store.js');
    const antes = s.getPersonagem('phb-teste');
    const campanha = s.exportarTodos();
    const personagem = s.exportarPersonagem(antes.id);
    s.removerPersonagem(antes.id); s.importarPersonagens(campanha);
    const depois = s.getPersonagem(antes.id);
    return { antes, depois, personagem: JSON.parse(personagem)[0] };
  });
  for (const p of [roundtrip.antes, roundtrip.depois, roundtrip.personagem]) {
    expect(p.schemaVersion).toBe(2);
    expect(p.idiomas).toEqual(expect.arrayContaining(['Silvestre', 'Linguagem Estelar']));
    expect(p.idiomas_personalizados[0]).toMatchObject({ escrita: 'Runas', observacoes: 'Aprendida na campanha', source: { rulesVersion: 'custom' } });
    expect(p.magias_customizadas[0]).toMatchObject({ circulo: 9, motivo: 'Recompensa futura' });
    expect(p.espacos_magia.conjuracao?.['9']).toBeUndefined();
    expect(p.justificativa_magias).toContain('Regra da mesa');
  }
  const download = page.waitForEvent('download');
  await page.locator('#btn-print').click();
  await page.locator('input[value="strixhaven-atual"]').check();
  await page.locator('#pdf-gerar').click();
  await page.locator('#pdf-estado').filter({hasText:'PDF gerado'}).waitFor();
  await page.locator('#pdf-cancelar').click();
  const arquivo = await download;
  const dir = new URL('../../../assets-private/entrega/', import.meta.url);
  await mkdir(dir, { recursive: true });
  await arquivo.saveAs(new URL('phb-editavel.pdf', dir).pathname);
  const bytes = [...await readFile(new URL('phb-editavel.pdf', dir))];
  const pdf = await page.evaluate(async bytes => {
    const d = await window.PDFLib.PDFDocument.load(new Uint8Array(bytes));
    const fields = d.getForm().getFields();
    return { valores: fields.map(f => f.getText()), editaveis: fields.every(f => !f.isReadOnly() && f.acroField.getWidgets().every(w => !!w.getAppearances()?.normal)) };
  }, bytes);
  expect(pdf.editaveis).toBe(true);
  expect(pdf.valores).toEqual(expect.arrayContaining(['Silvestre', 'Linguagem Estelar', 'Recompensa futura', 'Desejo']));
  page.once('dialog', d => d.accept());
  await page.locator('#manual-idiomas').click();
  await page.locator('[data-idioma-remover]').click();
  await expect(page.locator('[data-idioma-editar]')).toHaveCount(0);
});

test('quantidades abaixo e acima são alertas persistentes sem conceder espaços', async ({ page }) => {
  await ficha(page);
  await page.locator('#observacoes-extras').click();
  await expect(page.locator('#modal-corpo')).toContainText('0/3 truques — falta 3');
  await page.keyboard.press('Escape');
  await page.locator('#catalogo-todos').click();
  await page.locator('#extra-classe-filtro').selectOption('Paladino');
  await page.locator('#extra-nivel-filtro').selectOption('1');
  await page.locator('#extra-todas').uncheck();
  await page.locator('#extra-todas').check();
  await expect(page.locator('#extra-classe-filtro')).toHaveValue('');
  await expect(page.locator('#extra-nivel-filtro')).toHaveValue('');
  expect(await page.locator('[data-extra-opcao]').filter({ hasText: '9º círculo' }).count()).toBeGreaterThan(0);
  await page.evaluate(() => window.fecharModal());
  const espacos = await page.evaluate(async () => {
    const { char, salvar } = await import('./js/sheet/estado.js');
    const antes = JSON.stringify(char.espacos_magia);
    const catalogo = await (await import('./js/db.js')).getMagiasLegado();
    char.magias_customizadas = catalogo.filter(m => m.circulo === 0).slice(0, 4).map((m, i) => ({ ...m, id: `escolha-${i}`, origem: 'extra', classe: 'Clérigo', estado_extra: 'conhecida', sempre_preparada: false, sem_teste: true }));
    salvar(); (await import('./js/sheet/ficha.js')).renderFichaCompleta();
    return antes;
  });
  await page.locator('#observacoes-extras').click();
  await expect(page.locator('#modal-corpo')).toContainText('4/3 truques — excede 1');
  await page.keyboard.press('Escape');
  await page.reload();
  await expect(page.locator('[data-extra-id]')).toHaveCount(4);
  expect(await page.evaluate(async () => JSON.stringify((await import('./js/sheet/estado.js')).char.espacos_magia))).toBe(espacos);
  await page.locator('[data-justificar-magias]').first().click();
  await page.locator('#magias-justificativa').fill('Talento da campanha');
  await page.locator('#magias-justificar-salvar').click();
  await expect(page.locator('#magias-extras > .observacoes-resumo.info')).toContainText('divergências aceitas');
  await page.locator('#observacoes-extras').click();
  await expect(page.locator('#modal-corpo')).toContainText('4/3 truques — excede 1');
});

test('equipamento legado é bilíngue e a instância editável não altera o catálogo', async ({ page }) => {
  await ficha(page);
  await page.locator('#btn-add-inv').click();
  await page.getByRole('button', { name: 'Equipamento de aventura · Legado 2014', exact: true }).click();
  await page.locator('#busca-inv-cat').fill('Abacus');
  await expect(page.locator('[data-add-cat]')).toHaveCount(1);
  await expect(page.locator('[data-add-cat] .localized-label__primary')).toHaveText('Ábaco');
  await page.locator('[data-add-cat]').click();
  await page.locator('#btn-confirmar-add-item').click();
  await page.evaluate(() => window.fecharModal());
  await expect(page.locator('#sheet-inventario')).toContainText('Abacus');
  await page.locator('[data-info-inv-sheet]').first().click();
  await page.locator('#btn-editar-item-custom').click();
  await page.locator('#ic-nome').fill('Ábaco da campanha');
  await page.locator('#ic-peso').fill('3');
  await page.locator('#ic-preco').fill('7 PO');
  await page.locator('#btn-salvar-ic').click();
  await page.locator('[data-qty-plus="0"]').click();
  await expect(page.locator('#sheet-inventario')).toContainText('Correção local');
  await page.locator('#peso-total-manual').click();
  await page.locator('#peso-total-valor').fill('4.5');
  await page.locator('#peso-total-salvar').click();
  await expect(page.locator('#sheet-peso-valor')).toContainText('4,5');
  const estado = await page.evaluate(async () => {
    const { char, salvar } = await import('./js/sheet/estado.js');
    const item = char.inventario.find(i => i.name?.en === 'Abacus');
    salvar();
    const global = (await (await import('./js/db.js')).getEquipamentoLegado()).find(i => i.name.en === 'Abacus');
    const s = await import('./js/store.js');
    const json = s.exportarPersonagem(char.id); s.removerPersonagem(char.id); s.importarPersonagens(json);
    return { global, local: s.getPersonagem(char.id).inventario[0], pesoManual: s.getPersonagem(char.id).peso_total_manual };
  });
  expect(estado.global.nome).toBe('Ábaco');
  expect(estado.global.weightLb).toBe(2);
  expect(estado.local).toMatchObject({ nome: 'Ábaco da campanha', quantidade: 2, dados: { peso: '3 kg', custo: '7 PO', cost: { amount: 7, unit: 'gp' } }, source: { rulesVersion: '2014-legacy' } });
  expect(estado.pesoManual).toBe(4.5);
});

test('Critical20 usa mapa próprio, limpa dados anteriores e mantém complemento editável', async ({ page }) => {
  const manifest = JSON.parse(await readFile(new URL('../../../dados/pdf-templates/bardo-critical20.json', import.meta.url)));
  const template = new URL(`../../../${manifest.url.replace('../', '')}`, import.meta.url);
  test.skip(!existsSync(template), 'Template privado ausente; execute preparar_template_bardo.py.');
  // Candidato só no navegador isolado da auditoria; produção exige validated=true.
  if (!manifest.validated) await page.route('**/dados/pdf-templates/bardo-critical20.json', route => route.fulfill({ contentType: 'application/json', body: JSON.stringify({ ...manifest, validated: true }) }));
  await ficha(page);
  await page.evaluate(async () => {
    const { char, salvar } = await import('./js/sheet/estado.js');
    const spells = await (await import('./js/db.js')).getMagiasLegado();
    char.magias_customizadas = spells.filter(m => ['Guidance', 'Wish'].includes(m.name.en)).map(m => ({ ...m, origem: 'extra', estado_extra: 'conhecida', sem_teste: true, motivo: 'Prova de template' }));
    char.idiomas = ['Comum', 'Silvestre', 'Idioma da Prova'];
    char.strixhaven.faculdade = 'Quandrix';
    salvar(); (await import('./js/sheet/ficha.js')).renderFichaCompleta();
  });
  await page.locator('#btn-print').click();
  await page.locator('input[value="bardo-critical20"]').check();
  const download = page.waitForEvent('download');
  await page.locator('#pdf-gerar').click();
  const dir = new URL('../../../assets-private/entrega/', import.meta.url);
  await mkdir(dir, { recursive: true });
  await (await download).saveAs(new URL('bardo-phb-editavel.pdf', dir).pathname);
  const bytes = [...await readFile(new URL('bardo-phb-editavel.pdf', dir))];
  const r = await page.evaluate(async ({ bytes, manifest }) => {
    const d = await window.PDFLib.PDFDocument.load(new Uint8Array(bytes));
    const f = d.getForm();
    return { nome: f.getTextField('CharacterName').getText(), classe: f.getTextField('ClassLevel').getText(), idiomas: f.getTextField('ProficienciesLang').getText(), faculdade: f.getTextField('FactionName').getText(), forca: f.getTextField('ST Strength').getText(), medicina: f.getTextField('Medicine').getText(), antigas: f.getFields().filter(x => x instanceof window.PDFLib.PDFTextField).map(x => x.getText()), nomes: f.getFields().map(x => x.getName()), paginas: d.getPageCount(), mappedEditable: Object.keys(manifest.mapping).every(n => !f.getField(n).isReadOnly() && f.getField(n).acroField.getWidgets().every(w => !!w.getAppearances()?.normal)) };
  }, { bytes, manifest });
  expect(r.nome).toBe('Auditoria PHB');
  expect(r.classe).toBe('Clérigo 1');
  expect(r.idiomas).toContain('Silvestre');
  expect(r.faculdade).toBe('Quandrix');
  expect(r.forca).toBe('+0');
  expect(r.medicina).toBe('+0');
  expect(await page.evaluate(async ({ bytes }) => {
    const d = await window.PDFLib.PDFDocument.load(new Uint8Array(bytes));
    return d.getForm().getTextField('SlotsTotal 19').getText();
  }, { bytes })).toBe('2');
  expect(r.antigas).not.toContain('Bardo 1');
  expect(r.antigas).toEqual(expect.arrayContaining(['Orientação', 'Desejo', 'Idioma da Prova']));
  expect(r.mappedEditable).toBe(true);
  expect(r.paginas).toBeGreaterThan(manifest.pages);
  for (const n of Object.keys(manifest.mapping)) expect(r.nomes).toContain(n);
});

test('template opcional ausente não quebra exportador atual', async ({ page }) => {
  await page.route('**/reference/templates/**', route => route.fulfill({ status: 404, body: '' }));
  await ficha(page);
  await page.locator('#btn-print').click();
  await expect(page.locator('#pdf-modelo-disponibilidade')).toContainText('indisponível');
  await expect(page.locator('#pdf-opcoes input:enabled')).toHaveCount(2);
  await page.locator('input[value="strixhaven-atual"]').check();
  const download = page.waitForEvent('download');
  await page.locator('#pdf-gerar').click();
  expect((await download).suggestedFilename()).toContain('Auditoria PHB');
});

test('nomes em duas linhas permanecem legíveis no celular e a 200%; classe busca inglês', async ({ page }) => {
  await ficha(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.locator('#catalogo-todos').click();
  await page.locator('#extra-origem-filtro').selectOption('2014-legacy');
  await page.locator('#extra-busca').fill('Guidance');
  const verificar = async () => page.locator('[data-extra-opcao]').evaluate(el => {
    const p = el.querySelector('.localized-label__primary'), s = el.querySelector('.localized-label__secondary');
    const a = p.getBoundingClientRect(), b = s.getBoundingClientRect();
    const cor = getComputedStyle(s).color.match(/\d+/g).slice(0, 3).map(Number);
    const bg = getComputedStyle(el).backgroundColor.match(/\d+/g).slice(0, 3).map(Number);
    const lum = rgb => rgb.map(v => v/255).map(v => v <= .04045 ? v/12.92 : ((v+.055)/1.055)**2.4).reduce((s, v, i) => s+v*[.2126,.7152,.0722][i], 0);
    return { abaixo: b.top >= a.bottom, menor: parseFloat(getComputedStyle(s).fontSize) < parseFloat(getComputedStyle(p).fontSize), visivel: a.left >= 0 && a.right <= innerWidth, contraste: (Math.max(lum(cor), lum(bg))+.05)/(Math.min(lum(cor), lum(bg))+.05) };
  });
  for (const zoom of ['100%', '200%']) {
    await page.evaluate(zoom => { document.documentElement.style.fontSize = zoom; }, zoom);
    const r = await verificar();
    expect(r).toMatchObject({ abaixo: true, menor: true, visivel: true });
    expect(r.contraste).toBeGreaterThanOrEqual(4.5);
  }
  await page.evaluate(async () => {
    document.documentElement.style.fontSize = '';
    window.fecharModal();
    const w = await import('./js/creator/wizard.js');
    w.definirPersonagem((await import('./js/store.js')).criarPersonagemVazio());
    (await import('./js/creator/passo-classe.js')).renderStepClasse(document.getElementById('app-content'));
  });
  await page.locator('#busca-classe-localizada').fill('Wizard');
  await expect(page.locator('[data-classe]:visible')).toHaveCount(1);
  await expect(page.locator('[data-classe]:visible .localized-label__primary')).toHaveText('Mago');
  await expect(page.locator('[data-classe]:visible .localized-label__secondary')).toHaveText('Wizard');
});

test('idioma personalizado da sessão de criação não é eliminado pela coleta dos detalhes', async ({ page }) => {
  await page.goto('');
  await page.evaluate(async () => {
    const s = await import('./js/store.js');
    const w = await import('./js/creator/wizard.js');
    const p = s.criarPersonagemVazio();
    Object.assign(p, { nome: 'Idioma na criação', classe: 'Clérigo', especie: 'Humano', idiomas: ['Comum', 'Anão', 'Élfico'] });
    w.definirPersonagem(p);
    (await import('./js/creator/passo-detalhes.js')).renderStepDetalhes(document.getElementById('app-content'));
  });
  await page.locator('#criacao-idioma-custom').click();
  await page.locator('#idioma-novo').click();
  await page.locator('#idioma-nome').fill('Linguagem Inicial');
  await page.locator('#idioma-en').fill('Initial Speech');
  await page.locator('#idioma-salvar').click();
  const r = await page.evaluate(async () => {
    window.fecharModal();
    (await import('./js/creator/passo-detalhes.js')).coletarDetalhes();
    const p = (await import('./js/creator/wizard.js')).personagem;
    const s = await import('./js/store.js'); s.salvarPersonagem(p);
    return { emMemoria: p, exportado: JSON.parse(s.exportarPersonagem(p.id))[0] };
  });
  for (const p of [r.emMemoria, r.exportado]) {
    expect(p.idiomas).toContain('Linguagem Inicial');
    expect(p.idiomas_personalizados[0]).toMatchObject({ nome: 'Linguagem Inicial', name: { en: 'Initial Speech' }, source: { rulesVersion: 'custom' } });
  }
});

test('importação recupera coleções malformadas sem esconder a ficha ou perder os originais', async ({ page }) => {
  await page.goto('');
  await page.evaluate(async () => {
    const s = await import('./js/store.js');
    const p = s.criarPersonagemVazio();
    Object.assign(p, { id: 'import-recuperavel', nome: 'Importação recuperável', classe: 'Clérigo', especie: 'Humano', nivel: 1,
      inventario: [{ nome: 'Item preservado', tipo: 'customizado', dados: { peso: '1 kg' } }, null],
      idiomas_personalizados: { nome: 'Valor original fora de uma lista' },
      magias_customizadas: [{ id: 'old-spell', name: 'Nome antigo', classes: 'Mago', circulo: 0, escola: 'Evocação', tempo_conjuracao: 'Ação', alcance: 'Pessoal', componentes: 'V', duracao: 'Instantânea' }] });
    if (s.importarPersonagens(JSON.stringify([p])) !== 1) throw new Error('A ficha inteira foi descartada');
    location.hash = '#ficha/import-recuperavel';
  });
  await expect(page.locator('#char-nome-display')).toHaveText('Importação recuperável');
  await expect(page.locator('#ajustes-manuais')).toContainText('Dados importados precisam de correção');
  const p = await page.evaluate(async () => JSON.parse((await import('./js/store.js')).exportarPersonagem('import-recuperavel'))[0]);
  expect(p.inventario).toHaveLength(1);
  expect(p.inventario[0].nome).toBe('Item preservado');
  expect(p.magias_customizadas[0]).toMatchObject({ id: 'old-spell', nome: 'Nome antigo', name: { ptBR: 'Nome antigo', original: 'Nome antigo' } });
  expect(p.dados_importados_pendentes.inventario).toEqual([{ indice: 1, valor: null }]);
  expect(p.dados_importados_pendentes.idiomas_personalizados).toEqual({ nome: 'Valor original fora de uma lista' });
  expect(p.dados_importados_pendentes['magia:old-spell:classes']).toBe('Mago');
});
