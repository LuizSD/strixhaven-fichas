import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="160"><rect width="200" height="160" fill="#234661"/><circle cx="100" cy="65" r="32" fill="#ead6aa"/></svg>';
const A='https://images.example.test/retrato?size=large', B='https://images.example.test/referencia.webp';
async function imagens(page) {
  await page.route('https://images.example.test/**',r=>r.fulfill({ contentType:'image/svg+xml',body:SVG }));
}
async function ficha(page, avisos = false) {
  await page.goto('');
  await page.evaluate(async avisos => {
    const s=await import('./js/store.js'); const p=s.criarPersonagemVazio();
    Object.assign(p,{ id:'ajustes-final',nome:'Lia Final',classe:'Mago',especie:'Humano',nivel:1,pv_max:8,pv_atual:8 });
    if(avisos) {
      const m={ id:'versao-ficha',catalogo_ref:'phb-2014-guiding-bolt',nome:'Raio Guia',name:{ptBR:'Raio Guia',en:'Guiding Bolt'},circulo:9,classes:['Clérigo'],source:{rulesVersion:'2014-legacy'},origem:'extra',estado_extra:'registrada' };
      p.magias_customizadas=[m]; p.magias_preparadas=[{...m,id:'outro-caminho'}]; p.grimorio=[{...m,id:'terceiro-caminho'}];
    }
    s.salvarPersonagem(p); location.hash='#ficha/ajustes-final';
  },avisos);
  await expect(page.locator('#char-nome-display')).toHaveText('Lia Final');
}
async function novaFoto(page,url,title,primary = true) {
  await page.locator('#foto-adicionar').click();
  await page.locator('#foto-url').fill(url); await page.locator('#foto-title').fill(title);
  await page.locator('#foto-altText').fill('Retrato de Lia');
  await page.locator('#foto-principal').setChecked(primary);
  await page.locator('#foto-salvar').click();
  await expect(page.locator('#foto-salvar')).toBeHidden();
}

test('resumo compacto deduplica por magia e código, mantendo motivos distintos', async ({page})=>{
  await ficha(page,true);
  const avisos=await page.evaluate(async()=>(await import('./js/sheet/alertas-magias.js')).alertasDaFicha());
  const magia=avisos.filter(a=>a.magiaId==='phb-2014-guiding-bolt');
  expect(magia.map(a=>a.codigo).sort()).toEqual(['CIRCULO_SUPERIOR','FORA_DA_CLASSE']);
  const resumo=page.locator('#magias-extras > .observacoes-resumo');
  await expect(resumo).toContainText(`${avisos.length} observações de regras`);
  await expect(resumo.locator('ul')).toHaveCount(0);
  await expect(page.locator('#magias-extras > .catalogo-alerta')).toHaveCount(0);
  expect((await resumo.boundingBox()).height).toBeLessThan(90);
  await page.locator('#observacoes-extras').click();
  const dialog=page.locator('[role="dialog"]:visible');
  await expect(dialog).toHaveAttribute('aria-modal','true');
  await expect(dialog).toHaveAttribute('aria-labelledby',/.+/); await expect(dialog).toHaveAttribute('aria-describedby',/.+/);
  await expect(dialog).toContainText('Guiding Bolt');
  await expect(dialog.locator('[data-regra-codigo="CIRCULO_SUPERIOR"]')).toHaveCount(1);
  await expect(dialog.locator('[data-regra-codigo="FORA_DA_CLASSE"]')).toHaveCount(1);
});

test('teclado, foco preso, Escape e retorno ao acionador; justificativa editável',async({page})=>{
  await ficha(page,true);
  const abrir=page.locator('#observacoes-extras'); await abrir.focus(); await page.keyboard.press('Enter');
  const dialog=page.locator('[role="dialog"]:visible');
  await expect.poll(()=>dialog.evaluate(el=>el.contains(document.activeElement))).toBe(true);
  expect(await page.evaluate(()=>document.body.style.overflow)).toBe('hidden');
  await dialog.locator('button').last().focus(); await page.keyboard.press('Tab');
  await expect(dialog.locator('.modal-fechar')).toBeFocused();
  await page.keyboard.press('Shift+Tab'); await expect(dialog.locator('button').last()).toBeFocused();
  await page.keyboard.press('Escape'); await expect(dialog).toHaveCount(0); await expect(abrir).toBeFocused();
  expect(await page.evaluate(()=>document.body.style.overflow)).not.toBe('hidden');
  await abrir.click(); await page.locator('#magias-justificativa').fill('Regra da mesa'); await page.locator('#magias-justificar-salvar').click();
  await expect(page.locator('#magias-extras > .observacoes-resumo')).toContainText('divergências aceitas');
  await expect(page.locator('#observacoes-extras')).toBeFocused();
  await page.locator('#observacoes-extras').click(); await page.locator('#magias-justificativa').fill('Recompensa permanente'); await page.locator('#magias-justificar-salvar').click();
  await page.reload(); await page.locator('#observacoes-extras').click();
  await expect(page.locator('#magias-justificativa')).toHaveValue('Recompensa permanente');
  await page.locator('#magias-justificar-remover').click();
  await expect(page.locator('#magias-extras > .observacoes-resumo')).toContainText('observações de regras');
});

test('justificativa individual e navegação direta preservam edição e exportação',async({page})=>{
  await ficha(page,true); await page.locator('#observacoes-extras').click();
  const item=page.locator('[data-regra-codigo="CIRCULO_SUPERIOR"]');
  await item.locator('textarea').fill('Item mágico da campanha'); await item.getByRole('button',{name:'Salvar justificativa da magia',exact:true}).click();
  const p=await page.evaluate(async()=>(await import('./js/store.js')).getPersonagem('ajustes-final'));
  expect(p.magias_customizadas[0].motivo).toBe('Item mágico da campanha');
  await page.locator('#observacoes-extras').click();
  await page.locator('[data-regra-codigo="CIRCULO_SUPERIOR"] [data-ir-magia]').click();
  await expect(page.locator('[data-extra-id="versao-ficha"]')).toBeFocused();
  await page.locator('#btn-print').click(); await page.locator('input[value="strixhaven-atual"]').check();
  const dl=page.waitForEvent('download'); await page.locator('#pdf-gerar').click(); expect((await dl).suggestedFilename()).toContain('Lia Final');
});

test('idioma manual: sugestões PT/EN/aliases, edição, duplicata confirmada, JSON e remoção',async({page})=>{
  await ficha(page);
  await page.locator('#idioma-adicionar-direto').click();
  await page.locator('#idioma-nome').fill('silvestre'); await expect(page.locator('#idioma-sugestoes')).toContainText('Sylvan');
  await page.locator('#idioma-en').fill('sylvan'); await expect(page.locator('#idioma-sugestoes')).toContainText('Silvestre');
  await page.locator('#idioma-salvar').click(); await expect(page.locator('#idioma-erro')).toContainText('duplicado');
  await page.locator('#idioma-confirmar-duplicata').check(); await page.locator('#idioma-aliases').fill('fala feérica');
  await page.locator('#idioma-confirmar-duplicata').check(); await page.locator('#idioma-salvar').click();
  await page.locator('[data-idioma-editar]').click();
  await page.locator('#idioma-nome').fill('Idioma Estelar'); await page.locator('#idioma-en').fill('Star Speech');
  await page.locator('#idioma-escrita').fill('Runas'); await page.locator('#idioma-salvar').click();
  for(const termo of ['Idioma Estelar','Star Speech','fala feerica']) { await page.locator('#idioma-busca').fill(termo); await expect(page.locator('[data-idioma-editar]')).toHaveCount(1); }
  const r=await page.evaluate(async()=>{
    const s=await import('./js/store.js'); const p=s.getPersonagem('ajustes-final'); const antes=p.idiomas_personalizados;
    const campanha=s.exportarTodos(); s.removerPersonagem(p.id); s.importarPersonagens(campanha);
    return { antes, depois:s.getPersonagem(p.id).idiomas_personalizados, json:JSON.parse(s.exportarPersonagem(p.id))[0] };
  });
  expect(r.depois).toEqual(r.antes); expect(r.json.idiomas_personalizados[0]).toMatchObject({escrita:'Runas',source:{rulesVersion:'custom'},name:{aliases:['fala feérica']}});
  page.once('dialog',d=>d.accept()); await page.locator('[data-idioma-remover]').click(); await expect(page.locator('[data-idioma-editar]')).toHaveCount(0);
});

test('álbum: URL sem extensão, principal única, ordem, edição, remoção e round-trip',async({page})=>{
  await imagens(page); await ficha(page);
  await novaFoto(page,A,'Retrato');
  await expect(page.locator('#retrato-personagem img')).toHaveAttribute('src',A);
  await expect(page.locator('#retrato-personagem .foto-retrato')).toHaveAttribute('data-estado','carregada');
  await novaFoto(page,B,'Referência',false);
  const fotos=await page.evaluate(async()=>(await import('./js/store.js')).getPersonagem('ajustes-final').photos);
  await page.locator(`[data-foto-id="${fotos[1].id}"] summary`).click();
  await page.locator(`[data-foto-principal="${fotos[1].id}"]`).click();
  await expect(page.locator(`[data-foto-id="${fotos[1].id}"] .foto-selo-principal`)).toBeVisible();
  await page.locator(`[data-foto-id="${fotos[1].id}"] summary`).click();
  await page.locator(`[data-foto-subir="${fotos[1].id}"]`).click();
  await expect(page.locator('.foto-card').first()).toHaveAttribute('data-foto-id',fotos[1].id);
  await page.locator(`[data-foto-id="${fotos[1].id}"] summary`).click();
  await page.locator(`[data-foto-editar="${fotos[1].id}"]`).click();
  await page.locator('#foto-caption').fill('Legenda preservada'); await page.locator('#foto-altText').fill('Texto alternativo'); await page.locator('#foto-salvar').click();
  await page.reload();
  await expect(page.locator('.foto-card').first()).toHaveAttribute('data-foto-id',fotos[1].id);
  await expect(page.locator('#retrato-personagem img')).toHaveAttribute('src',B);
  await expect(page.locator('#retrato-personagem img')).toHaveAttribute('alt','Texto alternativo');
  await mkdir(new URL('../../../assets-private/entrega/',import.meta.url),{recursive:true});
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:new URL('../../../assets-private/entrega/ajustes-finais-desktop.png',import.meta.url).pathname});
  const r=await page.evaluate(async()=>{
    const s=await import('./js/store.js'); const p=s.getPersonagem('ajustes-final'); const json=s.exportarPersonagem(p.id), campanha=s.exportarTodos();
    s.removerPersonagem(p.id); s.importarPersonagens(json);
    return {p:s.getPersonagem(p.id), campanha:JSON.parse(campanha)[0], json};
  });
  expect(r.p.photos.filter(f=>f.isPrimary)).toHaveLength(1); expect(r.p.photos).toEqual(r.campanha.photos);
  expect(r.p.photos[0]).toMatchObject({caption:'Legenda preservada',sortOrder:0,isPrimary:true});
  expect(r.json).not.toMatch(/data:image|base64|<svg/); expect(r.p.imagem).toBe('');
  await page.locator(`[data-foto-id="${fotos[1].id}"] summary`).click();
  await page.locator(`[data-foto-remover="${fotos[1].id}"]`).click(); await page.locator('#foto-remover-confirmar').click();
  await expect(page.locator('.foto-card')).toHaveCount(1); await expect(page.locator('#retrato-personagem img')).toHaveAttribute('src',A);
});

test('protocolos recusados e carregamento falho não descartam a ficha',async({page})=>{
  await imagens(page); await ficha(page); await page.locator('#foto-adicionar').click();
  for(const url of ['javascript:alert(1)','data:image/png;base64,AAAA','file:///tmp/foto.png','http://example.com/foto.jpg']) {
    await page.locator('#foto-url').fill(url); await page.locator('#foto-salvar').click(); await expect(page.locator('#foto-erro')).toContainText('HTTPS');
  }
  await page.locator('#foto-url').fill('https://images.example.test/broken');
  await page.route('https://images.example.test/broken',r=>r.abort());
  await page.locator('#foto-salvar').click(); await expect(page.locator('#foto-erro')).toContainText('Não foi possível carregar');
  expect(await page.evaluate(async()=>(await import('./js/store.js')).getPersonagem('ajustes-final').photos)).toEqual([]);
});

test('link quebrado/offline: fallback, nova tentativa, edição e URL preservada',async({page})=>{
  await imagens(page); await ficha(page); await novaFoto(page,A,'Foto com fallback');
  await page.route('https://images.example.test/retrato?size=large',r=>r.abort());
  await page.reload(); await expect(page.locator('#retrato-personagem .foto-retrato')).toHaveAttribute('data-estado','erro');
  await expect(page.locator('#retrato-personagem')).toContainText('endereço foi preservado');
  const p=await page.evaluate(async()=>(await import('./js/store.js')).getPersonagem('ajustes-final')); expect(p.photos[0].url).toBe(A);
  await page.route('https://images.example.test/retrato?size=large',r=>r.fulfill({contentType:'image/svg+xml',body:SVG}));
  await page.locator('#retrato-personagem [data-foto-retry]').click(); await expect(page.locator('#retrato-personagem .foto-retrato')).toHaveAttribute('data-estado','carregada');
  await page.locator('.foto-menu summary').click();
  await page.locator('[data-foto-editar]').click(); await page.locator('#foto-url').fill(B); await page.locator('#foto-salvar').click();
  await expect(page.locator('#retrato-personagem img')).toHaveAttribute('src',B);
});

test('galeria mobile por teclado, lightbox e metadados são texto inerte',async({page})=>{
  await imagens(page); await page.setViewportSize({width:390,height:844}); await ficha(page);
  await novaFoto(page,A,'<img src=x onerror="window.executou=1">');
  await expect(page.locator('.foto-card h3')).toContainText('<img src=x'); expect(await page.evaluate(()=>window.executou)).toBeUndefined();
  const abrir=page.locator('.foto-card [data-foto-ampliar]'); await abrir.focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#foto-lightbox img')).toHaveAttribute('referrerpolicy','no-referrer');
  await page.keyboard.press('Escape'); await expect(abrir).toBeFocused();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await expect(page.locator('.foto-card img')).toHaveAttribute('loading','lazy');
  await mkdir(new URL('../../../assets-private/entrega/',import.meta.url),{recursive:true});
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:new URL('../../../assets-private/entrega/ajustes-finais-mobile.png',import.meta.url).pathname});
});

test('migração vazia preserva dados antigos; idiomas e fotos também no rascunho',async({page})=>{
  await imagens(page); await page.goto('');
  const antigo=await page.evaluate(async()=>{
    const s=await import('./js/store.js'); const p=s.criarPersonagemVazio(); p.nome='Antiga'; p.classe='Mago'; p.futuro={valor:42}; delete p.photos;
    s.salvarPersonagem(p); const salvo=s.getPersonagem(p.id); return {photos:salvo.photos,futuro:salvo.futuro,imagem:salvo.imagem};
  });
  expect(antigo).toEqual({photos:[],futuro:{valor:42},imagem:''});
  await page.goto('#criar');
  await expect(page.locator('#wizard-content')).toBeVisible();
  await page.evaluate(async()=>{
    const w=await import('./js/creator/wizard.js'); w.personagem.classe='Mago'; w.personagem.nome='Rascunho';
    (await import('./js/creator/passo-detalhes.js')).renderStepDetalhes(document.getElementById('wizard-content'));
  });
  await page.locator('#det-imagem-btn').click(); await page.locator('#foto-adicionar-modal').click();
  await page.locator('#foto-url').fill(A); await page.locator('#foto-title').fill('Temporária'); await page.locator('#foto-salvar').click();
  await expect(page.locator('#foto-salvar')).toHaveCount(0);
  await page.evaluate(()=>window.fecharModal());
  await page.locator('#criacao-idioma-custom').click(); await page.locator('#idioma-novo').click();
  await page.locator('#idioma-nome').fill('Linguagem da sessão'); await page.locator('#idioma-aliases').fill('Session speech'); await page.locator('#idioma-salvar').click();
  const r=await page.evaluate(async()=>({rascunho:(await import('./js/creator/wizard.js')).personagem, salvos:(await import('./js/store.js')).listarPersonagens()}));
  expect(r.rascunho.photos[0].url).toBe(A); expect(r.rascunho.idiomas_personalizados[0].name.aliases).toEqual(['Session speech']);
  expect(r.salvos).toHaveLength(1); expect(r.salvos[0].nome).toBe('Antiga');
});
