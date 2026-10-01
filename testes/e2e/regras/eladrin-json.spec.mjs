import { test, expect } from '@playwright/test';
import { readFile } from 'node:fs/promises';
import { clicarBotaoFicha } from './helpers-regras.mjs';
const URL='http://127.0.0.1:8802/site/';
test('Home local, Eladrin, salvar sem rede e exportar/reimportar o download offline',async({page, context})=>{
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 const googleRequests=[];
 page.on('request',r=>{if (/googleapis\.com|accounts\.google\.com|apis\.google\.com|drive\.google\.com/.test(r.url())) googleRequests.push(r.url());});
 await page.addInitScript(()=>{
   window.intervalos=[];window.eventosSalvos=0;
   const original=window.setInterval;
   window.setInterval=(fn,ms,...args)=>{window.intervalos.push(ms);return original(fn,ms,...args);};
   window.addEventListener('ficha-salva',()=>window.eventosSalvos++);
 });
 await page.goto(URL);
 await expect(page.locator('#drive-home, [data-drive-status], [id^="drive-"]')).toHaveCount(0);
 await expect(page.locator('body')).not.toContainText('Google Drive');
 await page.evaluate(async()=>{
   const {criarPersonagemVazio,salvarPersonagem}=await import('./js/store.js');const p=criarPersonagemVazio();p.id='eladrin-teste';p.nome='Jade';p.classe='Guerreiro';p.especie='Eladrin';p.atributos.carisma=16;salvarPersonagem(p);
   const outra=criarPersonagemVazio();outra.nome='Outra ficha';salvarPersonagem(outra);
 });
 await page.evaluate(()=>location.hash='ficha/eladrin-teste');await expect(page.locator('#eladrin')).toBeVisible();await expect(page.locator('#eladrin')).toContainText('CD 13');await expect(page.locator('#eladrin')).toContainText('nível 3');
 await page.locator('#eladrin-gastar').click();await expect(page.locator('#eladrin')).toContainText('1/2 usos');
 await page.setViewportSize({width:360,height:800});
 for(const id of ['btn-editar-ficha','btn-exportar-json','btn-print']) {
   const b=page.locator('#'+id);await expect(b).toBeVisible();const box=await b.boundingBox();expect(box.x+box.width).toBeLessThanOrEqual(360);
 }
 expect(await page.locator('#btn-exportar-json').evaluate(el=>[el.previousElementSibling.id,el.nextElementSibling.id])).toEqual(['btn-editar-ficha','btn-print']);
 await context.setOffline(true);
 const antes=await page.evaluate(async()=>{
   const s=await import('./js/store.js');const p=s.getPersonagem('eladrin-teste');p.notas='Salvo offline';s.salvarPersonagem(p);return s.getPersonagem(p.id);
 });
 const requests=[];page.on('request',r=>requests.push(r.url()));
 const aberta=await page.evaluate(async()=>JSON.parse(JSON.stringify((await import('./js/sheet/estado.js')).char)));
 const download=page.waitForEvent('download');await page.locator('#btn-exportar-json').click();const arquivo=await download;expect(arquivo.suggestedFilename()).toBe('Jade.json');
 const texto=await readFile(await arquivo.path(),'utf8');const exportados=JSON.parse(texto);
 expect(exportados).toHaveLength(1);expect(exportados[0].id).toBe('eladrin-teste');
 expect(exportados[0]).toEqual(aberta);
 // O botão exporta o objeto aberto, sem recarregar uma versão diferente do store.
 expect(exportados[0].eladrin.usosGastos).toBe(1);
 expect(await page.evaluate(async()=> (await import('./js/store.js')).getPersonagem('eladrin-teste'))).toEqual(antes);
 expect(await page.evaluate(async texto=>{const s=await import('./js/store.js');s.atualizarListaLocal([]);const n=s.importarPersonagens(texto);return {n,p:s.getPersonagem('eladrin-teste')};},texto)).toEqual({n:1,p:exportados[0]});
 expect(requests).toEqual([]);
 await page.evaluate(()=>location.hash='home');await expect(page.locator('#drive-home, [data-drive-status]')).toHaveCount(0);
 expect(await page.evaluate(()=>({timer:intervalos.includes(300000),eventos:eventosSalvos,estado:localStorage.getItem('strix-drive')}))).toEqual({timer:false,eventos:0,estado:null});
 expect(googleRequests).toEqual([]);expect(errors).toEqual([]);
});
test('Eladrin nível 3: Transe, CD, origem exclusiva e recuperação de usos',async({page})=>{
 await page.goto(URL);
 await page.evaluate(async()=>{
   const s=await import('./js/store.js');const p=s.criarPersonagemVazio();p.id='transe';p.nome='Eladrin';p.classe='Mago';p.especie='Eladrin';p.nivel=3;p.atributos.inteligencia=15;p.atributos.forca=12;p.atributos.destreza=11;p.bonus_antecedente={forca:2,destreza:1};s.salvarPersonagem(p);location.hash='ficha/transe';
 });
 await page.locator('#eladrin-editar').click();await page.locator('#ee-estacao').selectOption('verao');await page.locator('#ee-cd').selectOption('inteligencia');
 await page.locator('#ee-origem').selectOption('linhagem');await page.locator('[data-ee-bonus="forca"]').fill('0');await page.locator('[data-ee-bonus="inteligencia"]').fill('2');
 const escolhas=await page.locator('#ee-prof-0 option').evaluateAll(els=>els.map(e=>e.value).filter(Boolean));expect(escolhas.length).toBeGreaterThan(1);
 await page.locator('#ee-prof-0').selectOption(escolhas[0]);await page.locator('#ee-prof-1').selectOption(escolhas[1]);await page.locator('#ee-salvar').click();
 await expect(page.locator('#eladrin')).toContainText('Dano: 2');await expect(page.locator('#eladrin')).toContainText('CD 13');
 const dados=await page.evaluate(async()=> (await import('./js/store.js')).getPersonagem('transe'));
 expect(dados.atributos.forca).toBe(10);expect(dados.atributos.inteligencia).toBe(17);expect(dados.eladrin.proficienciasTranse).toHaveLength(2);expect(dados.eladrin.origemAtributos).toBe('linhagem');
 await page.locator('#eladrin-gastar').click();await expect(page.locator('#eladrin')).toContainText('1/2 usos');await clicarBotaoFicha(page, 'btn-descanso-longo');
 const apos=await page.evaluate(async()=> (await import('./js/store.js')).getPersonagem('transe'));
 expect(apos.eladrin.usosGastos).toBe(0);expect(apos.eladrin.proficienciasTranse).toEqual([]);expect(apos.eladrin.transeDisponivel).toBe(true);
});
