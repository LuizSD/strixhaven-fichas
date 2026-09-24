import { test, expect } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
const artefatos = new URL('../../../assets-private/entrega/', import.meta.url);

/** Usa o construtor real, preservando propriedades legadas e desconhecidas. */
async function semear(page) {
  await page.goto('');
  await page.evaluate(async () => {
    const store = await import('./js/store.js');
    const p = store.criarPersonagemVazio();
    Object.assign(p, { id: 'estudante-teste', nome: 'Lia — Registro de teste', classe: 'Mago', especie: 'Humano', nivel: 1, pv_max: 8, pv_atual: 8,
      atributos: { forca: 10, destreza: 14, constituicao: 14, inteligencia: 16, sabedoria: 12, carisma: 10 },
      magias_preparadas: [{ nome: 'Bênção', circulo: 1, origem: 'iniciado_em_magia' }], futuro: { preservar: 'sim' } });
    store.salvarPersonagem(p);
    location.hash = '#ficha/estudante-teste';
  });
  await expect(page.locator('#char-nome-display')).toContainText('Lia');
}

test('extra de círculo alto, identidade, recurso, academia, JSON e AcroForm', async ({ page }) => {
  await mkdir(artefatos, { recursive: true });
  const erros = [];
  page.on('pageerror', e => erros.push(e.message));
  page.on('console', m => { if (m.type() === 'error') console.log(m.text()); });
  const externas = [];
  page.on('request', r => { if (!r.url().startsWith('http://127.0.0.1')) externas.push(r.url()); });
  await semear(page);
  await page.locator('#adicionar-magia-extra').click();
  await page.locator('#extra-busca').fill('Desejo');
  await page.locator('#extra-todas').check();
  await page.locator('#extra-origem-filtro').selectOption('2024');
  await page.screenshot({ path: new URL('extra-desktop.png', artefatos).pathname, animations: 'disabled' });
  await page.locator('.sh-opcao').filter({ hasText: 'Desejo' }).click();
  await page.locator('#extra-atributo').selectOption('sabedoria');
  await page.locator('#extra-usos_total').fill('1');
  await page.locator('#extra-recuperacao').selectOption('descanso longo');
  await page.locator('#btn-salvar-mc').click();
  await expect(page.locator('#modal-overlay')).toBeHidden();
  const extra = page.locator('[data-extra-id]').first();
  for (const d of await page.locator('details').filter({ has: extra }).all()) {
    if (await d.getAttribute('open') === null) await d.locator(':scope > summary').click();
  }
  await expect(extra).toContainText('Não ocupa vaga');
  await extra.locator('[data-extra-acao="conjurar"]').click();
  await expect(page.locator('#modal-corpo')).toContainText('Não há recurso normal compatível');
  await page.locator('#extra-condicoes').check();
  await page.locator('#extra-executar').click();
  await extra.locator('[data-extra-acao="editar"]').click();
  await page.locator('#mc-nome').fill('Desejo acadêmico');
  await page.locator('#btn-salvar-mc').click();
  await page.locator('[data-ac-adicionar="relacionamentos"]').click();
  await page.locator('#academia-nome').fill('NPC de teste');
  await page.locator('#academia-pontos').fill('');
  await page.locator('#academia-salvar').click();
  await expect(page.locator('#academia-erro')).toContainText('campo vazio');
  await page.locator('#academia-pontos').fill('-3');
  await page.locator('#academia-relacionamento').fill('Rival acadêmico');
  await page.locator('#academia-inspiracao').check();
  await page.locator('#academia-bonus').fill('Apoio na biblioteca (manual)');
  await page.locator('#academia-observacoes').fill('Registro independente da inspiração geral.');
  await page.locator('#academia-salvar').click();
  await page.locator('#ac-faculdade').selectOption('Quandrix');
  await page.locator('#matricula-ano').fill('2');
  await page.locator('#ac-identidade').click();
  await page.locator('#academia-geral-notas').fill('Notas acadêmicas gerais — campo independente.');
  await page.locator('#ac-notas').click();
  for (const [grupo, nome] of Object.entries({ cursos: 'Ethics of Enchantment', avaliacoes: 'Prova de numeromancia', atividades: 'Fantastical Horticulture Club', empregos: 'Biblioteca de teste' })) {
    await page.locator(`[data-ac-adicionar="${grupo}"]`).click();
    await page.locator('#academia-nome').fill(nome);
    if (grupo === 'cursos') {
      await page.locator('#academia-inspiracao').check(); await page.locator('#academia-habilidades').fill('Arcanismo, Intuição');
      await page.locator('#academia-professor').fill('Professora de teste'); await page.locator('#academia-horario').fill('Terça, 9h');
      await page.locator('#academia-ano').fill('1'); await page.locator('#academia-periodo').fill('Primeiro semestre');
      await page.locator('#academia-notas').fill('Notas apenas da aula.');
    }
    if (grupo === 'avaliacoes') { await page.locator('#academia-marca1').check(); await page.locator('#academia-marca3').check(); await page.locator('#academia-d4s').fill('2'); await page.locator('#academia-ano').fill('3'); await page.locator('#academia-notas').fill('Notas apenas da avaliação.'); }
    if (grupo === 'atividades') { await page.locator('#academia-membro').check(); await page.locator('#academia-d4').fill('1'); await page.locator('#academia-notas').fill('Notas apenas da atividade.'); }
    if (grupo === 'empregos') { await page.locator('#academia-funcao').fill('Catalogação'); await page.locator('#academia-colega').fill('NPC de teste'); }
    await page.locator('#academia-salvar').click();
  }
  await page.reload();
  await expect(page.locator('[data-extra-id]').first()).toContainText('Desejo acadêmico');
  await expect(page.locator('#vida-academica')).toContainText('-3');
  const dados = await page.evaluate(async () => {
    const s = await import('./js/store.js');
    const p = s.getPersonagem('estudante-teste');
    const antes = s.exportarPersonagem(p.id);
    s.salvarPersonagem(p); s.salvarPersonagem(p);
    s.removerPersonagem(p.id);
    if (s.importarPersonagens(antes) !== 1) throw new Error('Falha no roundtrip');
    if (s.importarPersonagens(antes) !== 0) throw new Error('Duplicação no roundtrip');
    return s.getPersonagem(p.id);
  });
  expect(dados.futuro.preservar).toBe('sim');
  expect(dados.strixhaven.ano).toBe(2);
  expect(dados.strixhaven.notas).toBe('Notas acadêmicas gerais — campo independente.');
  expect(dados.strixhaven.cursos[0]).toMatchObject({ ano: 1, notas: 'Notas apenas da aula.' });
  expect(dados.strixhaven.avaliacoes[0]).toMatchObject({ ano: 3, notas: 'Notas apenas da avaliação.' });
  expect(dados.strixhaven.atividades[0].notas).toBe('Notas apenas da atividade.');
  expect(dados.notas).toBe('');
  expect(dados.magias_customizadas).toHaveLength(1);
  expect(dados.magias_customizadas[0].usos_gastos).toBe(1);
  expect(dados.magias_preparadas.some(m => m.nome === 'Bênção')).toBe(true);
  expect(dados.espacos_magia.conjuracao?.['9']).toBeUndefined();
  const descanso = await page.evaluate(async () => {
    const { restaurarHabilidades } = await import('./js/sheet/hp-descanso.js');
    const { char, salvar } = await import('./js/sheet/estado.js');
    restaurarHabilidades('longo'); salvar();
    return char.magias_customizadas;
  });
  expect(descanso).toHaveLength(1);
  expect(descanso[0].id).toBe(dados.magias_customizadas[0].id);
  expect(descanso[0].usos_gastos).toBe(0);
  expect(descanso[0].sempre_preparada).toBe(true);
  const exemploAtual = await page.evaluate(async () => (await import('./js/store.js')).exportarPersonagem('estudante-teste'));
  await writeFile(new URL('personagem-exemplo.json', artefatos), exemploAtual);
  const download = page.waitForEvent('download');
  await page.locator('#btn-print').click();
  await page.locator('input[value="strixhaven-atual"]').check();
  await page.locator('#pdf-gerar').click();
  const pdf = await download;
  await pdf.saveAs(new URL('estudante-editavel.pdf', artefatos).pathname);
  const descritivo = page.waitForEvent('download');
  await page.locator('#pdf-cancelar').click();
  await page.locator('#btn-print').click();
  await page.locator('#pdf-gerar').click();
  await (await descritivo).saveAs(new URL('estudante-descritivo.pdf', artefatos).pathname);
  await page.locator('#pdf-cancelar').click();
  const arquivoEditavel = await readFile(new URL('estudante-editavel.pdf', artefatos));
  const pdfVerificado = await page.evaluate(async bytes => {
    const doc = await window.PDFLib.PDFDocument.load(new Uint8Array(bytes));
    const fields = doc.getForm().getFields();
    const valor = trecho => fields.find(f => f.getName().includes(trecho))?.getText();
    return { paginas: doc.getPageCount(), ca: valor('resumo_calculado / combate / CA'), pv: valor('resumo_calculado / combate / PV'), iniciativa: valor('resumo_calculado / combate / Iniciativa'), cdExtra: valor('calculos_conjuracao / cd_efetiva'), valores: fields.map(f => f.getText()), aparencias: fields.every(f => f.acroField.getWidgets().every(w => !!w.getAppearances()?.normal)) };
  }, [...arquivoEditavel]);
  expect(pdfVerificado.valores).toContain('NPC de teste');
  expect(pdfVerificado.valores).toContain('Desejo acadêmico');
  expect(pdfVerificado.aparencias).toBe(true);
  expect(pdfVerificado.cdExtra).toBe('11'); // Sabedoria da extra, não Inteligência do Mago
  expect(pdfVerificado).toMatchObject({ ca: '12', pv: '8/8', iniciativa: '+2' });
  await expect(page.getByText('Gerando PDF...', { exact: true })).toHaveCount(0, { timeout: 8000 });
  await page.locator('#char-nome-display').scrollIntoViewIfNeeded();
  await page.screenshot({ path: new URL('ficha-desktop.png', artefatos).pathname });
  await page.locator('#vida-academica').evaluate(el => el.scrollIntoView({ block: 'start' }));
  await page.locator('#vida-academica').screenshot({ path: new URL('academia-desktop.png', artefatos).pathname });
  await page.goto('#home');
  await expect(page.locator('.char-card')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: new URL('inicio-desktop.png', artefatos).pathname });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: new URL('inicio-mobile.png', artefatos).pathname });
  await page.goto('#ficha/estudante-teste');
  await expect(page.locator('#char-nome-display')).toBeVisible();
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.screenshot({ path: new URL('ficha-mobile.png', artefatos).pathname });
  await page.locator('#vida-academica').evaluate(el => el.scrollIntoView({ block: 'start' }));
  await page.locator('#vida-academica').screenshot({ path: new URL('academia-mobile.png', artefatos).pathname });
  await page.locator('#adicionar-magia-extra').click();
  await page.locator('#extra-busca').fill('Desejo');
  await page.screenshot({ path: new URL('extra-mobile.png', artefatos).pathname, animations: 'disabled' });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  expect(erros).toEqual([]);
  expect(externas).toEqual([]);
});

test('homônimas, cota opcional, benefício manual, ajustes e progressão preservam dados', async ({ page }) => {
  await semear(page);
  const adicionar = async () => {
    await page.locator('#adicionar-magia-extra').click();
    await page.locator('#extra-busca').fill('Bênção');
    await page.locator('#extra-todas').check();
    await page.locator('#extra-origem-filtro').selectOption('2024');
    page.once('dialog', dialog => dialog.accept()); // Bênção já existe pela origem Iniciado em Magia
    await page.locator('.sh-opcao').filter({ hasText: 'Bênção' }).first().click();
    await page.locator('#extra-atributo').selectOption('sabedoria');
    await page.locator('#extra-classe').selectOption('Mago');
    await page.locator('#mc-sempre-preparada').uncheck();
    await page.locator('#btn-salvar-mc').click();
  };
  await adicionar(); await adicionar();
  for (const d of await page.locator('details').filter({ has: page.locator('[data-extra-id]') }).all()) {
    if (await d.getAttribute('open') === null) await d.locator(':scope > summary').click();
  }
  const antes = await page.evaluate(async () => (await import('./js/store.js')).getPersonagem('estudante-teste'));
  expect(new Set(antes.magias_customizadas.map(m => m.id)).size).toBe(2);
  await page.locator('[data-extra-id]').first().locator('[data-extra-acao="descer"]').click();
  const alvo = page.locator(`[data-extra-id="${antes.magias_customizadas[0].id}"]`);
  await alvo.locator('[data-extra-acao="editar"]').click();
  await page.locator('#mc-nome').fill('Bênção de teste renomeada');
  await page.locator('#mc-circulo').selectOption('9');
  await page.locator('#btn-salvar-mc').click();
  expect(await page.locator('[data-extra-id]').evaluateAll(els => els.map(el => el.dataset.extraId))).toEqual([antes.magias_customizadas[1].id, antes.magias_customizadas[0].id]);
  await alvo.locator('[data-extra-acao="subir"]').click();
  expect(await page.locator('[data-extra-id]').evaluateAll(els => els.map(el => el.dataset.extraId))).toEqual([antes.magias_customizadas[0].id, antes.magias_customizadas[1].id]);
  page.once('dialog', d => d.accept());
  await alvo.locator('[data-extra-acao="remover"]').click();
  await page.locator('#manual-beneficio').click();
  await page.locator('#beneficio-nome').fill('Ataque acadêmico');
  await page.locator('#beneficio-ataque').fill('+7');
  await page.locator('#beneficio-dano').fill('1d8 energético');
  await page.locator('#beneficio-alcance').fill('18 metros');
  await page.locator('#beneficio-condicao').fill('Somente durante prova (manual)');
  await page.locator('#beneficio-salvar').click();
  await page.locator('#manual-ajustar').click();
  await page.locator('#ajuste-chave').selectOption('ca');
  await page.locator('#ajuste-delta').fill('2');
  await page.locator('#ajuste-final').fill('19');
  await page.locator('#ajuste-salvar').click();
  await expect(page.locator('#ajustes-manuais')).toContainText('Efetivo: 19');
  for (const grupo of ['cursos', 'avaliacoes', 'atividades', 'empregos']) {
    await page.locator(`[data-ac-adicionar="${grupo}"]`).click();
    await page.locator('#academia-nome').fill(`Teste ${grupo}`);
    if (grupo === 'avaliacoes') { await page.locator('#academia-marca1').check(); await page.locator('#academia-marca3').check(); }
    await page.locator('#academia-salvar').click();
  }
  const resultado = await page.evaluate(async () => {
    const s = await import('./js/store.js');
    const { subirDeNivel } = await import('./js/levelup.js');
    const { calcCA } = await import('./js/utils.js');
    const { preparadasComExtrasPorClasse: preparadasPorClasse } = await import('./js/regras-magia-classe.js');
    const p = s.getPersonagem('estudante-teste');
    const academia = JSON.stringify(p.strixhaven);
    const cota = preparadasPorClasse(p, 'Mago').desta.length;
    p.xp = 300;
    p.pericias_proficientes = ['Arcanismo'];
    const subida = await subirDeNivel(p, { grimorio_selecionados: ['Mísseis Mágicos', 'Armadura Arcana'], academico_expertise: ['Arcanismo'] });
    s.salvarPersonagem(p);
    return { p, cota, subida, ca: calcCA(p), academiaAntes: academia };
  });
  expect(resultado.cota).toBe(1);
  expect(resultado.ca).toBe(19); // final substitui, não soma ajuste outra vez
  expect(resultado.subida.sucesso, JSON.stringify(resultado.subida)).toBe(true);
  expect(resultado.p.nivel).toBe(2);
  expect(JSON.stringify(resultado.p.strixhaven)).toBe(resultado.academiaAntes);
  expect(resultado.p.magias_customizadas).toHaveLength(1);
  expect(resultado.p.magias_preparadas.some(m => m.nome === 'Bênção' && m.origem === 'iniciado_em_magia')).toBe(true);
  expect(resultado.p.beneficios_manuais[0].alcance).toBe('18 metros');
  expect(resultado.p.strixhaven.avaliacoes[0]).toMatchObject({ marca1: true, marca2: false, marca3: true });
  await page.reload();
  await page.locator('#manual-ajustar').click();
  await page.locator('#ajuste-restaurar').click();
  await expect(page.locator('#ajustes-manuais')).not.toContainText('Efetivo: 19');
});

test('PDFs com continuações preservam o último registro, notas e campos editáveis', async ({ page }) => {
  await mkdir(artefatos, { recursive: true });
  await semear(page);
  await page.evaluate(async () => {
    const s = await import('./js/store.js');
    const p = s.getPersonagem('estudante-teste');
    p.strixhaven.relacionamentos = Array.from({ length: 25 }, (_, i) => ({ id: `relacao-${i}`, nome: `Relação ${i}`, pontos: i - 12, relacionamento: 'Colega de estudos', inspiracao: i % 2 === 0, bonus: 'Registrado manualmente', desvantagem: '', observacoes: 'Notas sem efeitos automáticos.' }));
    p.strixhaven.cursos = [{ id: 'curso-1', nome: 'Ethics of Enchantment', ano: 2, periodo: 'Primeiro semestre', inspiracao: true, habilidades: 'Arcanismo, Intuição', professor: 'Professor de teste', horario: 'Terça, 9h', notas: 'Dados acadêmicos separados de nível e recursos.' }];
    p.strixhaven.avaliacoes = Array.from({ length: 12 }, (_, i) => ({ id: `avaliacao-${i}`, nome: `Avaliação ${i + 1}`, ano: Math.floor(i / 3) + 1, registro: i % 3 + 1, marca1: i % 2 === 0, marca2: false, marca3: true, repeticoes: 1, d4s: 2, habilidades: 'Arcanismo', notas: 'Três marcas independentes e neutras.' }));
    p.strixhaven.atividades = [{ id: 'atividade-1', nome: 'Fantastical Horticulture Club', membro: true, participacao: 'Semanal', d4: 1, habilidades: 'Natureza, Sobrevivência', marca1: false, marca2: true, marca3: false, notas: 'Bônus condicionado: controle manual.' }];
    p.strixhaven.empregos = [{ id: 'trabalho-1', nome: 'Biblioteca de teste', funcao: 'Catalogação', colega: 'NPC de teste', observacoes: 'Turno livre, sem benefício automático.' }];
    p.strixhaven.notas = 'Estudo acadêmico de longa duração. '.repeat(180) + 'PALAVRALONGA'.repeat(100) + ' MARCADOR-FINAL-NOTAS';
    p.magias_customizadas = [{ id: 'manual-longa', origem: 'extra', nome: 'Magia manual longa', circulo: 9, tempo_conjuracao: 'Ação', alcance: '18 metros', componentes: 'V, S, M (componente de teste)', duracao: '1 minuto', concentracao: true, ritual: true, escola: 'Evocação', dano: '1d6 energético', descricao: 'Descrição independente do catálogo. '.repeat(100) + 'MARCADOR-FINAL-MAGIA', estado_extra: 'sempre preparada', atributo_extra: 'inteligencia' }];
    s.salvarPersonagem(p);
  });
  await page.reload();
  const backupLongo = await page.evaluate(async () => (await import('./js/store.js')).exportarPersonagem('estudante-teste'));
  await writeFile(new URL('personagem-longo.json', artefatos), backupLongo);
  const dl = page.waitForEvent('download');
  await page.locator('#btn-print').click();
  await page.locator('input[value="strixhaven-atual"]').check();
  await page.locator('#pdf-gerar').click();
  await (await dl).saveAs(new URL('longo-editavel.pdf', artefatos).pathname);
  const verificado = await page.evaluate(async () => {
    const s = await import('./js/store.js');
    const { gerarPdfEditavel } = await import('./js/strixhaven/exportacao.js');
    const { extrairBlocosDetalhe } = await import('./js/sheet/pdf.js');
    const { gerarHtmlImpressao } = await import('./js/sheet/impressao.js');
    const p = s.getPersonagem('estudante-teste');
    const doc = await window.PDFLib.PDFDocument.load(await gerarPdfEditavel(p, window.PDFLib));
    const campos = doc.getForm().getFields();
    const notas = campos.filter(f => f.getName().includes('strixhaven / notas')).map(f => f.getText().replaceAll('\n', '')).join('');
    return { paginas: doc.getPageCount(), notas, esperadas: p.strixhaven.notas, ultimo: campos.some(f => f.getText() === 'Relação 24'), detalhes: extrairBlocosDetalhe(await gerarHtmlImpressao()).map(b => b.text).join('\n') };
  });
  expect(verificado.paginas).toBeGreaterThan(10);
  expect(verificado.notas).toBe(verificado.esperadas);
  expect(verificado.ultimo).toBe(true);
  expect(verificado.detalhes).toContain('MARCADOR-FINAL-NOTAS');
  expect(verificado.detalhes).toContain('MARCADOR-FINAL-MAGIA');
  expect(verificado.detalhes).toContain('Relação 24');
  const dl2 = page.waitForEvent('download');
  await page.locator('#pdf-cancelar').click();
  await page.locator('#btn-print').click();
  await page.locator('#pdf-gerar').click();
  await (await dl2).saveAs(new URL('longo-descritivo.pdf', artefatos).pathname);
});

test('criação manual extra para não conjurador usa o editor real e conserva subcampos', async ({ page }) => {
  await page.goto('');
  await page.evaluate(async () => {
    const { criarPersonagemVazio } = await import('./js/store.js');
    const { definirPersonagem } = await import('./js/creator/wizard.js');
    const { renderStepMagias } = await import('./js/creator/passo-magias.js');
    const p = criarPersonagemVazio(); p.classe = 'Guerreiro'; p.nome = 'Estudante não conjurador';
    definirPersonagem(p);
    await renderStepMagias(document.getElementById('app-content'));
  });
  await page.getByRole('button', { name: 'Adicionar magia extra', exact: true }).click();
  await page.locator('#extra-manual').click();
  await page.locator('#mc-nome').fill('Prática impossível');
  await page.locator('#mc-circulo').selectOption('8');
  await page.locator('#mc-escola').selectOption('Evocação');
  await page.locator('#mc-tempo').selectOption('Reação');
  await page.locator('#mc-gatilho-reacao').fill('quando a prova começar');
  await page.locator('#mc-alcance').fill('36 metros');
  await page.locator('#mc-comp-v').check();
  await page.locator('#mc-comp-m').check();
  await page.locator('#mc-comp-outro').fill('cristal de 100 PO, consumido');
  await page.locator('#mc-duracao').selectOption('Concentração, até 1 minuto');
  await page.locator('#extra-concentracao').check();
  await page.locator('#mc-ritual').check();
  await page.locator('#mc-desc').fill('Descrição própria, com gatilho e material.');
  await page.locator('#mc-dano').fill('2d8 psíquico');
  await page.locator('#extra-atributo').selectOption('carisma');
  await page.locator('#extra-usos_total').fill('2');
  await page.locator('#btn-salvar-mc').click();
  await expect(page.locator('#app-content')).toContainText('Prática impossível');
  const p = await page.evaluate(async () => (await import('./js/creator/wizard.js')).personagem);
  expect(p.magias_customizadas).toHaveLength(1);
  expect(p.magias_customizadas[0]).toMatchObject({ origem: 'extra', circulo: 8, ritual: true, concentracao: true, dano: '2d8 psíquico', atributo_extra: 'carisma', usos_total: 2, sempre_preparada: true });
  expect(p.magias_customizadas[0].tempo_conjuracao).toContain('quando a prova começar');
  expect(p.magias_customizadas[0].componentes).toContain('100 PO, consumido');
  expect(p.magias_customizadas[0].classe).toBe('');
});

test('catálogo aditivo e escolhas de Iniciado são explícitos e idempotentes', async ({ page }) => {
  await semear(page);
  const catalogos = await page.evaluate(async () => {
    const db = await import('./js/db.js');
    const { getTamanho } = await import('./js/utils.js');
    const s = await import('./js/store.js');
    const p = s.getPersonagem('estudante-teste');
    p.antecedente = 'Estudante de Witherbloom (adaptação)';
    p.talentos = ['Iniciado de Strixhaven (adaptação)'];
    s.salvarPersonagem(p);
    const magias = (await db.getIndiceMagias()).magias;
    const acrescimosUA = magias.filter(m => ['xge-2017', 'artificer-ua-2019'].includes(m.source?.sourceId));
    return { tamanhoOwlin: getTamanho((await db.getEspecies()).especies.find(e => e.id === 'scc-owlin-2024').texto_completo), especies: (await db.getEspecies()).especies.length, antecedentes: (await db.getAntecedentes()).antecedentes.length, talentos: (await db.getTalentos()).todos.length, talentos2: (await db.getTalentos()).todos.length, magias: magias.length - acrescimosUA.length, acrescimosUA: acrescimosUA.length, lista: (await db.getMagiasClasse('Mago', p)).lista_magias['1º Círculo'].map(m => m.nome) };
  });
  expect(catalogos).toMatchObject({ especies: 12, antecedentes: 21, talentos: 77, talentos2: 77, magias: 396 });
  expect(catalogos.acrescimosUA).toBe(17);
  expect(catalogos.lista).toContain('Curar Ferimentos');
  expect(catalogos.tamanhoOwlin).toBe('Médio ou Pequeno');
  await page.reload();
  for (let repeticao = 0; repeticao < 2; repeticao++) {
    await page.locator('#ac-iniciado').click();
    await expect(page.locator('#iniciado-faculdade')).toHaveValue('witherbloom');
    await page.locator('[name="iniciado-truque"]').nth(0).check();
    await page.locator('[name="iniciado-truque"]').nth(1).check();
    await page.locator('#iniciado-salvar').click();
    await expect(page.locator('#modal-overlay')).toBeHidden();
  }
  const p = await page.evaluate(async () => (await import('./js/store.js')).getPersonagem('estudante-teste'));
  expect(p.magias_customizadas).toHaveLength(3);
  expect(p.magias_customizadas.filter(m => m.circulo === 1)[0].usos_total).toBe(1);
  expect(p.strixhaven.faculdade).toBe(''); // faculdade do talento não impõe matrícula
});

test('recurso 2024 Sortudo continua consumindo pontos nas duas ações', async ({ page }) => {
  await semear(page);
  await page.evaluate(async () => {
    const s = await import('./js/store.js');
    const p = s.getPersonagem('estudante-teste'); p.talentos = ['Sortudo']; s.salvarPersonagem(p);
  });
  await page.reload();
  await page.locator('[data-sortudo-acao="vantagem"]').click();
  await page.locator('[data-sortudo-acao="desvantagem"]').click();
  await expect(page.locator('[data-sortudo-acao="vantagem"]')).toBeDisabled();
  expect(await page.evaluate(async () => (await import('./js/store.js')).getPersonagem('estudante-teste').recursos.sortudo.pontos_gastos)).toBe(2);
});

test('truque extra ocupa vaga, mas exceder a referência não bloqueia a criação', async ({ page }) => {
  await page.goto('');
  await page.evaluate(async () => {
    const { criarPersonagemVazio } = await import('./js/store.js');
    const { definirPersonagem } = await import('./js/creator/wizard.js');
    const { renderStepMagias } = await import('./js/creator/passo-magias.js');
    const p = criarPersonagemVazio(); p.classe = 'Clérigo';
    p.magias_conhecidas = [{ nome: 'Luz', circulo: 0 }, { nome: 'Taumaturgia', circulo: 0 }];
    p.magias_customizadas = [{ id: 'truque-extra', nome: 'Truque de teste', circulo: 0, origem: 'extra', classe: 'Clérigo', escola: 'Evocação', tempo_conjuracao: 'Ação', alcance: '9 metros', componentes: 'V', duracao: 'Instantânea', sempre_preparada: false, estado_extra: 'conhecida' }];
    definirPersonagem(p); await renderStepMagias(document.getElementById('app-content'));
  });
  await page.locator('[data-creator-check="Orientação"]').click();
  expect(await page.evaluate(async () => (await import('./js/creator/wizard.js')).personagem.magias_conhecidas.length)).toBe(3);
  await page.locator('[data-cr-extra-editar="truque-extra"]').click();
  await page.locator('#mc-sempre-preparada').check();
  await page.locator('#btn-salvar-mc').click();
  await page.locator('[data-creator-check="Orientação"]').click();
  const p = await page.evaluate(async () => (await import('./js/creator/wizard.js')).personagem);
  expect(p.magias_conhecidas).toHaveLength(2);
  expect(p.magias_customizadas).toHaveLength(1);
  expect(p.magias_customizadas[0].id).toBe('truque-extra');
  expect(p.magias_customizadas[0].sempre_preparada).toBe(true);
});

test('valores numéricos inválidos importados são texto, nunca HTML ou recurso gratuito', async ({ page }) => {
  await semear(page);
  await page.evaluate(async () => {
    const s = await import('./js/store.js');
    const p = s.getPersonagem('estudante-teste');
    const texto = '<img src=x onerror="window.__xss=true">';
    p.ajustes_manuais = { ca: { ajuste: texto, final: texto } };
    p.magias_customizadas = [{ id: 'importado-invalido', origem: 'extra', nome: 'Registro a corrigir', circulo: 1, cd_manual: texto, ataque_manual: 2, usos_total: texto, estado_extra: 'preparada', atributo_extra: 'inteligencia' }];
    s.salvarPersonagem(p);
  });
  await page.reload();
  const extra = page.locator('[data-extra-id="importado-invalido"]');
  for (const d of await page.locator('details').filter({ has: extra }).all()) {
    if (await d.getAttribute('open') === null) await d.locator(':scope > summary').click();
  }
  await expect(page.locator('img[src="x"]')).toHaveCount(0);
  expect(await page.evaluate(() => !!window.__xss)).toBe(false);
  await extra.locator('[data-extra-acao="conjurar"]').click();
  await expect(page.locator('#toast-container')).toContainText('Dados numéricos inválidos');
  const html = await page.evaluate(async () => (await import('./js/sheet/impressao.js')).gerarHtmlImpressao());
  expect(html).not.toContain('<img src=x');
});

test('não conjurador registra utilitária sem atributo fictício e consome só o uso especial', async ({ page }) => {
  await page.goto('');
  await page.evaluate(async () => {
    const s = await import('./js/store.js');
    const p = s.criarPersonagemVazio();
    Object.assign(p, { id: 'nao-conjurador', nome: 'Estudante guerreiro', classe: 'Guerreiro', nivel: 1, pv_max: 10, pv_atual: 10 });
    s.salvarPersonagem(p); location.hash = '#ficha/nao-conjurador';
  });
  await page.locator('#char-nome-display').waitFor();
  await page.locator('#adicionar-magia-extra').click();
  await page.locator('#extra-busca').fill('Identificar');
  await page.locator('#extra-todas').check();
  await page.locator('#extra-origem-filtro').selectOption('2024');
  await page.locator('.sh-opcao').filter({ hasText: 'Identificar' }).click();
  await page.locator('#extra-sem-teste').check();
  await page.locator('#extra-usos_total').fill('1');
  await page.locator('#btn-salvar-mc').click();
  await expect(page.locator('[data-extra-id]')).toContainText('não se aplica');
  await expect(page.getByRole('heading', { name: 'Magias', exact: true })).toHaveCount(0);
  await page.locator('[data-extra-acao="conjurar"]').click();
  await page.locator('#extra-condicoes').check();
  await page.locator('#extra-executar').click();
  const p = await page.evaluate(async () => (await import('./js/store.js')).getPersonagem('nao-conjurador'));
  expect(p.classe).toBe('Guerreiro');
  expect(p.magias_customizadas[0].atributo_extra).toBe('');
  expect(p.magias_customizadas[0].usos_gastos).toBe(1);
  expect(p.magias_customizadas[0].ultima_execucao.tipo).toBe('especial');
  expect(Object.keys(p.espacos_magia.conjuracao || {})).toHaveLength(0);
});
