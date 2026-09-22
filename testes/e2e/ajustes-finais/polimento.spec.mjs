import { test, expect } from '@playwright/test';
import { mkdir } from 'node:fs/promises';

const imagem = '<svg xmlns="http://www.w3.org/2000/svg" width="200" height="200"><rect width="200" height="200" fill="#234661"/></svg>';
async function ficha(page, quantidade = 1) {
  await page.route('https://fotos.example/**', r => r.fulfill({contentType:'image/svg+xml', body:imagem}));
  await page.goto('');
  await page.evaluate(async quantidade => {
    const s = await import('./js/store.js'); const p = s.criarPersonagemVazio();
    Object.assign(p, {id:'polimento',nome:'Lia Visual',classe:'Mago',especie:'Humano',nivel:1,pv_max:8,pv_atual:8});
    p.photos = Array.from({length:quantidade}, (_,i) => ({id:`foto-${i+1}`,url:`https://fotos.example/${i+1}`,title:`Foto ${i+1}`,caption:`Legenda ${i+1}`,altText:`Referência ${i+1}`,sortOrder:i,isPrimary:i===0,createdAt:'2026-09-22T00:00:00.000Z',position:'top'}));
    s.salvarPersonagem(p); location.hash='#ficha/polimento';
  }, quantidade);
  await expect(page.locator('#char-nome-display')).toHaveText('Lia Visual');
}
async function fotosSalvas(page) { return page.evaluate(async () => (await import('./js/store.js')).getPersonagem('polimento').photos); }
async function menu(page, id) { await page.locator(`[data-foto-id="${id}"] summary`).click(); }

test('PDF: abre por teclado, disponibilidade, foco preso, cancelar e Escape sem download', async ({page}) => {
  await ficha(page); let downloads=0; page.on('download',()=>downloads++);
  await expect(page.locator('#modelo-pdf, #pdf-editavel, #pdf-opcoes')).toHaveCount(0);
  const abrir=page.locator('#btn-print'); await abrir.focus(); await page.keyboard.press('Enter');
  const modal=page.locator('[role="dialog"]:visible');
  await expect(modal).toHaveAttribute('aria-modal','true');
  await expect(page.locator('input[value="descritivo"]')).toBeFocused();
  await expect(modal).toContainText('Gerar PDF da ficha');
  await expect(page.locator('input[value="strixhaven-atual"]')).toBeEnabled();
  await expect(page.locator('input[value="tetse-indisponivel"]')).toBeDisabled();
  await expect.poll(()=>modal.evaluate(el=>el.contains(document.activeElement))).toBe(true);
  await page.locator('#pdf-gerar').focus(); await page.keyboard.press('Tab'); await expect(modal.locator('.modal-fechar')).toBeFocused();
  await page.keyboard.press('Escape'); await expect(abrir).toBeFocused();
  await abrir.click(); await page.locator('#pdf-cancelar').click(); await expect(abrir).toBeFocused();
  await abrir.click(); await modal.locator('.modal-fechar').click(); await expect(abrir).toBeFocused();
  expect(downloads).toBe(0);
});

test('PDF: modelo selecionado chama adaptador uma vez, processamento e erro recuperável', async ({page}) => {
  await ficha(page);
  await page.evaluate(async () => {
    const {PDF_TEMPLATE_ADAPTERS} = await import('./js/pdf-templates.js');
    window.chamadasPdf=[];
    PDF_TEMPLATE_ADAPTERS[0].exportEditable = p => { window.chamadasPdf.push(p.id); return new Promise((resolve,reject)=>{window.falharPdf=()=>reject(new Error('Template de teste indisponível'));window.concluirPdf=()=>resolve(new Uint8Array([37,80,68,70]));}); };
  });
  await page.locator('#btn-print').click(); await page.locator('input[value="strixhaven-atual"]').check();
  await page.locator('#pdf-gerar').evaluate(b=>{b.click();b.click();});
  await expect(page.locator('#pdf-gerar')).toBeDisabled(); await expect(page.locator('#pdf-estado')).toHaveText('Gerando PDF…');
  await expect.poll(()=>page.evaluate(()=>window.chamadasPdf.length)).toBe(1);
  await page.evaluate(()=>window.falharPdf()); await expect(page.locator('#pdf-estado')).toContainText('Não foi possível gerar');
  await expect(page.locator('#pdf-gerar')).toBeEnabled(); await page.locator('#pdf-gerar').click();
  await expect.poll(()=>page.evaluate(()=>window.chamadasPdf)).toEqual(['polimento','polimento']);
  const download=page.waitForEvent('download'); await page.evaluate(()=>window.concluirPdf());
  expect((await download).suggestedFilename()).toBe('Ficha Lia Visual.pdf');
});

test('galeria: 18 por página, ordem, teclado, lightbox e correção após excluir última',async({page})=>{
  await ficha(page,19);
  await expect(page.locator('.foto-card')).toHaveCount(18);
  expect(await page.locator('.foto-card').evaluateAll(els=>els.map(e=>e.dataset.fotoId))).toEqual(Array.from({length:18},(_,i)=>`foto-${i+1}`));
  await expect(page.locator('[data-foto-id="foto-19"]')).toHaveCount(0);
  await expect(page.locator('.album-paginacao')).toContainText('1–18 de 19 fotos');
  await page.getByRole('button',{name:'Próxima',exact:true}).focus(); await page.keyboard.press('Enter');
  await expect(page.locator('.foto-card')).toHaveCount(1); await expect(page.locator('.foto-card')).toHaveAttribute('data-foto-id','foto-19');
  await page.locator('[data-foto-ampliar="foto-19"]').focus(); await page.keyboard.press('Enter');
  await expect(page.locator('#foto-lightbox')).toContainText('Legenda 19'); await page.keyboard.press('Escape');
  await expect(page.locator('[data-foto-ampliar="foto-19"]')).toBeFocused();
  await menu(page,'foto-19'); await page.locator('[data-foto-remover="foto-19"]').click(); await page.locator('#foto-remover-confirmar').click();
  await expect(page.locator('.foto-card')).toHaveCount(18); await expect(page.locator('.album-paginacao')).toContainText('Página 1 de 1');
  expect((await fotosSalvas(page))[0].isPrimary).toBe(true);
});

for(const width of [1280,768,390]) test(`galeria e cabeçalho preservados a ${width}px, inclusão consecutiva e avatar`,async({page})=>{
  await page.setViewportSize({width,height:900}); await ficha(page);
  const avatar=page.locator('#retrato-personagem .foto-retrato');
  await expect(avatar).toHaveAttribute('data-estado','carregada');
  const geometria=()=>page.locator('#retrato-personagem').evaluate(el=>{
    const foto=el.querySelector('.foto-retrato'),img=foto.querySelector('img'),s=getComputedStyle(foto),r=foto.getBoundingClientRect();
    const botoes=['btn-editar-ficha','btn-print','btn-levelup'].map(id=>{const b=document.getElementById(id).getBoundingClientRect();return {id,x:b.x,y:b.y+scrollY,width:b.width,height:b.height};});
    return {x:r.x,y:r.y+scrollY,width:r.width,height:r.height,radius:s.borderRadius,fit:getComputedStyle(img).objectFit,position:img.style.objectPosition,botoes};
  });
  const antes=await geometria();
  expect(antes.width).toBeCloseTo(width<=600?120:Math.min(170,Math.max(120,width*.16)),1); expect(antes.height).toBe(antes.width);
  expect(antes.radius).toBe('6.4px'); expect(antes.fit).toBe('cover'); expect(antes.position).toBe('center top');
  const thumb=await page.locator('.foto-miniatura').boundingBox(); expect(thumb.width).toBeLessThanOrEqual(140); expect(thumb.height).toBeCloseTo(thumb.width,0);
  expect(await page.locator('.album-grade').evaluate(el=>getComputedStyle(el).gridTemplateColumns.split(' ').length)).toBe(width>900?6:width>480?4:3);
  await page.locator('#retrato-personagem [data-foto-ampliar]').click(); await expect(page.locator('#foto-lightbox')).toBeVisible(); await page.keyboard.press('Escape');
  for(let i=2;i<=3;i++) {
    await page.locator('#foto-adicionar').click(); await expect(page.locator('#foto-principal')).not.toBeChecked();
    await page.locator('#foto-url').fill(`https://fotos.example/${i}`); await page.locator('#foto-title').fill(`Foto ${i}`); await page.locator('#foto-salvar').click();
    await expect(page.locator('.foto-card')).toHaveCount(i);
  }
  await page.locator('#btn-print').scrollIntoViewIfNeeded();
  expect(await geometria()).toEqual(antes);
  expect((await fotosSalvas(page)).filter(f=>f.isPrimary).map(f=>f.id)).toEqual(['foto-1']);
  await expect(page.locator('.foto-selo-principal')).toHaveText('Principal');
  const dimensoes=await page.locator('.foto-miniatura').evaluateAll(els=>els.map(el=>el.getBoundingClientRect().width)); expect(new Set(dimensoes).size).toBe(1);
  await page.locator('#btn-editar-ficha').click(); await expect(page.locator('[role="dialog"]:visible')).toBeVisible(); await page.keyboard.press('Escape');
  await page.locator('#btn-levelup').click(); await expect(page.locator('[role="dialog"]:visible')).toBeVisible(); await page.keyboard.press('Escape');
  await menu(page,'foto-1');
  const menuBox=await page.locator('[data-foto-id="foto-1"] .foto-acoes').boundingBox(); expect(menuBox.x).toBeGreaterThanOrEqual(0); expect(menuBox.x+menuBox.width).toBeLessThanOrEqual(width);
  await menu(page,'foto-1');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await mkdir(new URL('../../../assets-private/entrega/polimento/',import.meta.url),{recursive:true});
  await page.locator('#album-fotos').screenshot({path:new URL(`../../../assets-private/entrega/polimento/album-${width}.png`,import.meta.url).pathname});
  await page.locator('#retrato-personagem').screenshot({path:new URL(`../../../assets-private/entrega/polimento/retrato-${width}.png`,import.meta.url).pathname});
  await page.screenshot({path:new URL(`../../../assets-private/entrega/polimento/ficha-${width}.png`,import.meta.url).pathname,fullPage:true});
  await page.locator('#btn-print').click();
  const dialog=page.locator('[role="dialog"]:visible'); expect(await dialog.evaluate(el=>el.scrollWidth<=el.clientWidth)).toBe(true);
  await expect(page.locator('#pdf-modelo-disponibilidade')).not.toContainText('Verificando');
  await dialog.screenshot({animations:'disabled',path:new URL(`../../../assets-private/entrega/polimento/pdf-${width}.png`,import.meta.url).pathname});
  await page.locator('#pdf-cancelar').click();
});

test('ficha antiga: adicionar e remover foto comum preserva retrato legado',async({page})=>{
  await ficha(page,0);
  await page.evaluate(async()=>{
    const {char,salvar}=await import('./js/sheet/estado.js'); char.imagem='https://fotos.example/legado'; delete char.photos_configurado;
    salvar(); (await import('./js/sheet/ficha.js')).renderFichaCompleta();
  });
  const avatar=page.locator('#retrato-personagem img'); await expect(avatar).toHaveAttribute('src','https://fotos.example/legado');
  await page.locator('#foto-adicionar').click(); await expect(page.locator('#foto-principal')).not.toBeChecked();
  await page.locator('#foto-url').fill('https://fotos.example/nova'); await page.locator('#foto-salvar').click();
  await expect(page.locator('.foto-card')).toHaveCount(1); await expect(avatar).toHaveAttribute('src','https://fotos.example/legado');
  await page.locator('.foto-menu summary').click(); await page.locator('[data-foto-remover]').click(); await page.locator('#foto-remover-confirmar').click();
  await expect(page.locator('.foto-card')).toHaveCount(0); await page.reload(); await expect(avatar).toHaveAttribute('src','https://fotos.example/legado');
});

test('link quebrado mantém dimensões; editar e definir principal persistem após recarga',async({page})=>{
  await ficha(page,2); await page.route('https://fotos.example/erro',r=>r.abort());
  await page.evaluate(async()=>{
    const {char,salvar}=await import('./js/sheet/estado.js'); char.photos[1].url='https://fotos.example/erro'; salvar(); (await import('./js/sheet/ficha.js')).renderFichaCompleta();
  });
  const mini=page.locator('[data-foto-id="foto-2"] .foto-miniatura'); await mini.scrollIntoViewIfNeeded(); await expect(mini).toHaveAttribute('data-estado','erro');
  const rect=await mini.boundingBox(), primeira=await page.locator('[data-foto-id="foto-1"] .foto-miniatura').boundingBox();
  expect(rect.width).toBe(primeira.width); expect(rect.height).toBe(primeira.height);
  await menu(page,'foto-1'); await page.locator('[data-foto-editar="foto-1"]').click(); await page.locator('#foto-caption').fill('Legenda editada'); await page.locator('#foto-salvar').click();
  await expect(page.locator('[data-foto-id="foto-1"]')).toContainText('Legenda editada');
  await menu(page,'foto-2'); await page.locator('[data-foto-principal="foto-2"]').click(); await expect(page.locator('[data-foto-id="foto-2"] .foto-selo-principal')).toBeVisible();
  await page.reload(); await expect(page.locator('#retrato-personagem .foto-retrato')).toHaveAttribute('data-estado','erro');
  expect((await fotosSalvas(page)).map(f=>[f.id,f.isPrimary,f.caption])).toEqual([['foto-1',false,'Legenda editada'],['foto-2',true,'Legenda 2']]);
});
