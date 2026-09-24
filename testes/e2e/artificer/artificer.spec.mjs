import {test,expect} from '@playwright/test';
import {execFileSync} from 'node:child_process';
const ID='artificer-ua-2019';
const ETIQUETA=/UA\s*2019\s*·\s*Playtest|ua-2019-playtest/i;
async function ficha(page,nivel=3,subclasse='') {
 await page.goto('');
 await page.evaluate(async({nivel,subclasse,ID})=>{const s=await import('./js/store.js');const p=s.criarPersonagemVazio();Object.assign(p,{id:'artifice-teste',nome:'Inventora UA',classe:ID,nivel,classes:[{classe:ID,nivel,subclasse,ordem:0}],subclasse,especie:'Humano',pv_max:20,pv_atual:20});p.atributos.inteligencia=16;s.salvarPersonagem(p);location.hash='#ficha/artifice-teste';},{nivel,subclasse,ID});
 await expect(page.locator('#artificer-ua-painel')).toContainText('Artificer');
 await expect(page.locator('body')).not.toContainText('UA 2019 · Playtest');
}
const acao=(page,a)=>page.locator(`#artificer-ua-painel [data-ua-acao="${a}"]`);
const estado=page=>page.evaluate(async()=>(await import('./js/store.js')).getPersonagem('artifice-teste'));
test('classe selecionável por teclado no criador e rascunho em memória',async({page})=>{
 await page.goto('#criar');
 await expect(page.locator(`[data-classe="${ID}"]`)).toBeVisible();
 await expect(page.locator(`[data-classe="${ID}"]`)).not.toContainText(ETIQUETA);
 await page.locator('#busca-classe-localizada').fill('Artifice');await page.locator(`[data-classe="${ID}"]`).focus();await page.keyboard.press('Enter');
 await expect(page.locator('[role="dialog"]:visible')).not.toContainText(ETIQUETA);
 await page.locator('#popup-confirmar-classe').click();
 await expect(page.locator('.selecao-resumo')).toContainText('Artífice');
 await expect(page.locator('.selecao-resumo')).not.toContainText(ETIQUETA);
 await page.evaluate(async()=>{const {personagem}=await import('./js/creator/wizard.js');personagem.atributos.inteligencia=16;await (await import('./js/creator/passo-magias.js')).renderStepMagias(document.getElementById('wizard-content'));});
 await page.locator('[data-ua-acao="magias"]').click();await page.locator('#ua-busca').fill('Guidance');await expect(page.locator('[data-ua-magia]')).toHaveCount(1);await page.locator('[data-ua-magia]').click();
 const r=await page.evaluate(async()=>{const {personagem}=await import('./js/creator/wizard.js');return personagem.magias_conhecidas;});expect(r[0].catalogo_ref).toBe('phb-2014-guidance');
});
test('busca bilíngue, filtros, excesso manual, ausência de espaços indevidos e round-trip',async({page})=>{
 await ficha(page,1);await acao(page,'magias').click();
 for(const termo of ['Guidance','Orientacao']){await page.locator('#ua-busca').fill(termo);await expect(page.locator('[data-ua-magia]')).toHaveCount(1);}
 await page.locator('[data-ua-magia]').click();await page.locator('#ua-busca').fill('Mage Hand');await page.locator('[data-ua-magia]').click();await page.locator('#ua-busca').fill('Mending');await page.locator('[data-ua-magia]').click();await expect(page.locator('#ua-editor-aviso')).toContainText('Truques 3/2');
 await page.locator('#ua-global').check();await page.locator('#ua-f-versao').selectOption('2014-legacy');await page.locator('#ua-f-circulo').selectOption('9');await page.locator('#ua-busca').fill('Wish');await page.locator('[data-ua-magia]').click();await page.keyboard.press('Escape');
 await expect(page.locator('#ua-contadores')).toContainText('Truques: 3 / 2');expect((await estado(page)).espacos_magia.conjuracao['9']).toBeUndefined();
 await acao(page,'avisos').click();await page.locator('#ua-justificativa').fill('Concessão da mesa');await page.locator('#ua-confirmar').click();
 const r=await page.evaluate(async()=>{const s=await import('./js/store.js');const json=s.exportarPersonagem('artifice-teste');s.removerPersonagem('artifice-teste');s.importarPersonagens(json);return s.getPersonagem('artifice-teste');});expect(r.artificerUA.justificativa).toBe('Concessão da mesa');expect(r.magias_conhecidas).toHaveLength(3);
 await page.reload();await expect(page.locator('#ua-contadores')).toContainText('Truques: 3 / 2');
});
test('especializações, companheiro e usos persistem, descanso recupera',async({page})=>{
 await ficha(page,14,'battle-smith');await expect(page.locator('#ua-contadores')).toContainText('Sempre preparadas: 8');await acao(page,'recurso').filter({hasText:'Usar'}).last().click();
 await expect.poll(async()=>((await estado(page)).artificerUA.recursos.jolt?.usados)).toBe(1);
 await acao(page,'companheiro').click();await page.locator('#ua-comp-pv').fill('20');await page.locator('#ua-confirmar').click();await page.reload();await expect(page.locator('#artificer-ua-painel')).toContainText('PV 20/75');
 await page.evaluate(async()=>{(await import('./js/sheet/hp-descanso.js')).restaurarHabilidades('longo');(await import('./js/sheet/estado.js')).salvar();});expect((await estado(page)).artificerUA.recursos.jolt.usados).toBe(0);
 for(const sub of ['alchemist','archivist','artillerist','battle-smith']){await page.locator('#ua-especializacao').selectOption(sub);await expect(page.locator('#ua-contadores')).toContainText('Sempre preparadas: 8');}
});
test('infusões, Replicate Magic Item, item ativo e redução de nível preservam escolhas',async({page})=>{
 await ficha(page,12,'artillerist');await acao(page,'infusoes').click();await page.locator('#ua-inf').selectOption('replicate-magic-item');await page.locator('#ua-replica').selectOption('winged-boots');await page.locator('#ua-confirmar').click();
 await expect(page.locator('#artificer-ua-painel')).toContainText('Botas Aladas');await acao(page,'infundir').click();await page.locator('#ua-item').fill('Botas da Inventora');await page.locator('#ua-tipo').selectOption('replica');await page.locator('#ua-sintonizado').check();await page.locator('#ua-confirmar').click();await page.reload();await expect(page.locator('#artificer-ua-painel')).toContainText('Botas da Inventora');
 await page.evaluate(async()=>{const {char,salvar}=await import('./js/sheet/estado.js');char.classes[0].nivel=2;(await import('./js/regras-multiclasse.js')).sincronizarEspelhos(char);salvar();(await import('./js/sheet/ficha.js')).renderFichaCompleta();});
 await acao(page,'avisos').click();await expect(page.locator('[role="dialog"]:visible')).toContainText('pré-requisito de nível');expect((await estado(page)).artificerUA.itensInfundidos).toHaveLength(1);
});
test('torreta gratuita e com espaço, mente e ferramentas; layout mobile e foco',async({page})=>{
 await page.setViewportSize({width:390,height:844});await ficha(page,14,'artillerist');
 for(let i=0;i<2;i++){await acao(page,'torreta').click();await page.locator('#ua-confirmar').click();await expect.poll(async()=>((await estado(page)).artificerUA.torretas.length)).toBe(i+1);}
 await acao(page,'torreta').click();await page.locator('#ua-torreta-custo').selectOption('conjuracao:1');await page.locator('#ua-confirmar').click();await expect.poll(async()=>((await estado(page)).espacos_magia.conjuracao['1'])).toBe(1);
 await page.locator('#ua-especializacao').selectOption('archivist');await acao(page,'mente').click();await page.locator('#ua-material').selectOption('vegetal');await page.getByLabel('História',{exact:true}).check();await page.getByLabel('Investigação',{exact:true}).check();await page.locator('#ua-confirmar').click();
 await acao(page,'avisos').focus();await page.keyboard.press('Enter');await expect(page.locator('[role="dialog"]:visible')).toHaveAttribute('aria-modal','true');await page.keyboard.press('Escape');await expect(acao(page,'avisos')).toBeFocused();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('PDF AcroForm preserva classe, especialização, recursos e escolhas',async({page})=>{
 await ficha(page,3,'alchemist');await page.locator('#btn-print').click();await page.locator('input[value="strixhaven-atual"]').check();
 const download=page.waitForEvent('download');await page.locator('#pdf-gerar').click();const d=await download;expect(d.suggestedFilename()).toContain('Inventora UA');
 const stream=await d.createReadStream();const chunks=[];for await(const c of stream)chunks.push(c);const bytes=[...Buffer.concat(chunks)];
 const r=await page.evaluate(async bytes=>{const doc=await window.PDFLib.PDFDocument.load(new Uint8Array(bytes));return doc.getForm().getFields().map(f=>f.getText?.()||'');},bytes);
 expect(r.join('\n')).toContain('Artífice / Artificer');expect(r.join('\n')).toContain('Alquimista');expect(r.join('\n')).not.toMatch(ETIQUETA);
 const salvo=await estado(page);expect(salvo.classe).toBe(ID);expect(salvo.artificerUA.rulesVersion).toBe('ua-2019-playtest');expect(salvo.artificerUA.source.sourceTitle).toBe('UA 2019 · Playtest');
});

test('recursos de nível alto, edição manual, equipamento e todos os comandos de objetos',async({page})=>{
 const erros=[];page.on('pageerror',e=>erros.push(e.message));await ficha(page,20,'artillerist');
 await page.locator('summary').filter({hasText:'Progressão, escolhas e próximo nível'}).click();await acao(page,'equipamento').click();await page.locator('#ua-ferramenta').fill('Ferramentas de Ferreiro');await page.locator('#ua-equip-opcao').selectOption('itens');await page.locator('#ua-confirmar').click();
 await expect.poll(async()=>((await estado(page)).inventario.length)).toBe(7);await acao(page,'ferramentas-sub').click();await expect.poll(async()=>((await estado(page)).inventario.length)).toBe(10);
 await acao(page,'manual').click();await page.locator('#ua-nome').fill('Centelha de teste');await page.locator('#ua-en').fill('Test Spark');await page.locator('#ua-estado').selectOption('preparada');await page.locator('#ua-confirmar').click();
 await page.locator('summary').filter({hasText:'Registradas, truques e preparadas'}).click();await acao(page,'magia').first().click();await page.locator('#ua-notas').fill('Teste de edição local');await page.locator('#ua-confirmar').click();
 await acao(page,'trocar-truque').click();await page.locator('#ua-busca').fill('Mending');await page.locator('[data-ua-magia]').click();await expect.poll(async()=>((await estado(page)).magias_conhecidas[0].catalogo_ref)).toBe('phb-2014-mending');
 await acao(page,'engenhoca').click();await page.locator('#ua-objeto').fill('Pedra da luz');await page.locator('#ua-confirmar').click();await acao(page,'engenhoca-toggle').click();expect((await estado(page)).artificerUA.engenhocas[0].ativa).toBe(false);
 await acao(page,'varinha').click();await page.locator('#ua-foco-item').fill('Varinha de carvalho');await page.locator('#ua-item-magia').selectOption('phb-2014-fire-bolt');await page.locator('#ua-confirmar').click();await expect.poll(async()=>((await estado(page)).artificerUA.varinha.ativa)).toBe(true);
 await acao(page,'armazenador').click();await page.locator('#ua-foco-item').fill('Adaga armazenadora');await page.locator('#ua-item-magia').selectOption('phb-2014-cure-wounds');await page.locator('#ua-confirmar').click();await acao(page,'armazenador-usar').click();await expect.poll(async()=>((await estado(page)).artificerUA.armazenador.usados)).toBe(1);
 await acao(page,'infusoes').click();await page.locator('#ua-inf').selectOption('radiant-weapon');await page.locator('#ua-confirmar').click();await acao(page,'infundir').click();await page.locator('#ua-item').fill('Adaga radiante');await page.locator('#ua-tipo').selectOption('arma');await page.locator('#ua-sintonizado').check();await page.locator('#ua-confirmar').click();
 await acao(page,'item').click();await page.locator('#ua-item-notas').fill('Emprestada à aliada');await page.locator('#ua-confirmar').click();await acao(page,'portador').click();await acao(page,'devolver').first().click();
 await acao(page,'sintonizacao').click();await page.locator('#ua-sintonizados').fill('Adaga radiante\nAnel de teste');await page.locator('#ua-confirmar').click();await expect(page.locator('#artificer-ua-painel')).toContainText('Alma do Artifício: +2');
 await acao(page,'torreta').click();await page.locator('#ua-confirmar').click();await acao(page,'editar-torreta').click();await page.locator('#ua-torreta-acao').selectOption('detonar');await page.locator('#ua-confirmar').click();await expect.poll(async()=>((await estado(page)).artificerUA.torretas[0].ativa)).toBe(false);
 await page.locator('#ua-especializacao').selectOption('archivist');await acao(page,'overload').click();await page.locator('#ua-confirmar').click();await expect.poll(async()=>((await estado(page)).espacos_magia.conjuracao['1'])).toBe(1);
 await acao(page,'infoportation').click();await page.locator('#ua-confirmar').click();await expect.poll(async()=>((await estado(page)).espacos_magia.conjuracao['2'])).toBe(1);
 await page.locator('#ua-especializacao').selectOption('alchemist');await acao(page,'recurso').first().click();await acao(page,'dia').click();await expect.poll(async()=>((await estado(page)).artificerUA.recursos.salve.usados)).toBe(0);
 expect(erros).toEqual([]);
});

test('catálogo canônico, subida real de nível e todos os modelos PDF disponíveis',async({page})=>{
 await ficha(page,2);
 const r=await page.evaluate(async()=>{
  const db=await import('./js/db.js');const c=(await db.getMagiasClasse('artificer-ua-2019')).lista_magias;const lista=Object.values(c).flat();
  const {char,salvar}=await import('./js/sheet/estado.js');const result=await (await import('./js/levelup.js')).subirDeNivel(char,{subclasse:'alchemist',ignorar_xp:true});salvar();(await import('./js/sheet/ficha.js')).renderFichaCompleta();
  return {ids:lista.map(m=>m.id),associadas:lista.every(m=>m.classes.includes('artificer-ua-2019')),result};
 });
 expect(r.ids).toHaveLength(88);expect(new Set(r.ids).size).toBe(88);expect(r.associadas).toBe(true);expect(r.result.sucesso,JSON.stringify(r.result)).toBe(true);await expect(page.locator('#ua-contadores')).toContainText('Sempre preparadas: 2');
 const impressao=await page.evaluate(async()=>(await import('./js/sheet/impressao.js')).gerarHtmlImpressao());
 expect(impressao).toContain('Artífice / Artificer');expect(impressao).not.toMatch(ETIQUETA);
 await page.locator('#btn-print').click();await expect(page.locator('#pdf-modelo-disponibilidade')).not.toContainText('Verificando');const modelos=await page.locator('#pdf-opcoes input:enabled').evaluateAll(els=>els.map(e=>e.value));
  for(const id of modelos){
   const bytes=await test.step(`Gerar e baixar ${id}`,async()=>{
    await page.locator(`#pdf-opcoes input[value="${id}"]`).check();
    const dl=page.waitForEvent('download');await page.locator('#pdf-gerar').click();const download=await dl;
    expect(await download.failure()).toBeNull();
    const stream=await download.createReadStream();const chunks=[];for await(const chunk of stream)chunks.push(chunk);
    const buffer=Buffer.concat(chunks);
    test.info().annotations.push({type:'pdf-download',description:`${id}: ${buffer.length} bytes`});
    console.log(`PDF baixado: ${id}, ${buffer.length} bytes`);
    return buffer;
   });
   await test.step(`Validar o PDF baixado: ${id}`,async()=>{
     // Poppler verifica o texto visível, incluindo cabeçalhos e PDF descritivo sem campos.
     const texto=execFileSync('pdftotext',['-','-'],{input:bytes,encoding:'utf8',maxBuffer:10*1024*1024});
     expect(texto).toContain('Artífice');expect(texto).not.toMatch(ETIQUETA);
    // Evita serializar milhões de números pelo protocolo do navegador.
    // PDFDocument.load aceita base64 e valida os mesmos bytes baixados.
    const dados=await page.evaluate(async base64=>{const d=await window.PDFLib.PDFDocument.load(base64);return {pages:d.getPageCount(),fields:d.getForm().getFields().map(f=>f.getText?.()||'')};},bytes.toString('base64'));
     expect(dados.pages).toBeGreaterThan(1);expect(dados.fields.join('\n')).not.toMatch(ETIQUETA);if(id!=='descritivo'){expect(dados.fields.join('\n')).toContain('Artífice / Artificer');expect(dados.fields.join('\n')).toContain('alchemist');}
   });
   await expect(page.locator('#pdf-gerar')).toBeEnabled();
 }
});
