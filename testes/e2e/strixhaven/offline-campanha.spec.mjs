import { test, expect } from '@playwright/test';
import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync, existsSync } from 'node:fs';
test.use({ serviceWorkers: 'allow' });

test('artefato sob prefixo de fork, precache acadêmico, atualização e armazenamento isolado', async ({ page, context }) => {
  test.setTimeout(120000);
  execFileSync('python3', ['scripts/preparar_dist.py', '--destino', '_dist/fork-verificacao', '--build', '901'], { cwd: new URL('../../../', import.meta.url) });
  const url = 'http://127.0.0.1:8802/_dist/fork-verificacao/site/';
  // Simula caches antigos com as mesmas URLs ANTES da instalação nova.
  // Preservá-los não pode fazer o fallback executar código de outra aplicação.
  await page.goto('http://127.0.0.1:8802/dados/_metadados.json');
  await page.evaluate(async site => {
    const legado = await caches.open('dnd-legado-preservar');
    await legado.put(site, new Response('<h1>Cache legado do autor</h1>', { headers: { 'Content-Type': 'text/html' } }));
    await legado.put(new URL('js/campanha-config.js', site).href, new Response('throw new Error("Código legado não deve executar")', { headers: { 'Content-Type': 'application/javascript' } }));
    await legado.put(new URL('../dados/magias/_indice.json', site).href, new Response('{"magias":[]}', { headers: { 'Content-Type': 'application/json' } }));
  }, url);
  await page.goto(url);
  await page.evaluate(() => navigator.serviceWorker.ready);
  await expect.poll(() => page.evaluate(() => !!navigator.serviceWorker.controller)).toBe(true);
  await page.evaluate(async () => {
    const s = await import('./js/store.js');
    const legado = s.criarPersonagemVazio();
    Object.assign(legado, { id: 'legado', nome: 'Não apagar', nivel: 1, classe: 'Mago', futuro: { dado: 'preservar' } });
    delete legado.strixhaven;
    localStorage.setItem('dnd_personagens', JSON.stringify([legado]));
    await caches.open('cache-de-outro-aplicativo');
  });
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#app-content')).toContainText('Modo local');
  const dados = await page.evaluate(async () => {
    const db = await import('./js/db.js');
    const magias = (await db.getIndiceMagias()).magias;
    const acrescimosUA = magias.filter(m => ['xge-2017', 'artificer-ua-2019'].includes(m.source?.sourceId));
    return { faculdades: (await db.getStrixhaven()).faculdades.length, magias: magias.length - acrescimosUA.length, acrescimosUA: acrescimosUA.length, originais: localStorage.getItem('dnd_personagens'), icone: !!(await caches.match(new URL('img/strixhaven-192.png', location.href).href)) };
  });
  expect(dados.faculdades).toBe(5);
  expect(dados.magias).toBe(396);
  expect(dados.acrescimosUA).toBe(17); // Arma Arcana + 16 referências XGE também disponíveis offline.
  expect(dados.icone).toBe(true);
  expect(dados.originais).toContain('Não apagar');
  await page.locator('#copiar-originais').click();
  await page.locator('#copiar-originais').click();
  const migracao = await page.evaluate(async () => ({ lista: (await import('./js/store.js')).listarPersonagens(), backup: localStorage.getItem('strixhaven_2024_backup_importacao_original') }));
  expect(migracao.lista).toHaveLength(1);
  expect(migracao.lista[0].strixhaven.versao).toBe(1);
  expect(migracao.lista[0].futuro.dado).toBe('preservar');
  expect(migracao.backup).toBe(dados.originais);
  await context.setOffline(false);
  const residual = new URL('../../../_dist/fork-verificacao/assets-private/', import.meta.url);
  mkdirSync(residual, { recursive: true });
  writeFileSync(new URL('sentinela-privada.txt', residual), 'Sentinela de teste, sem dados pessoais.');
  execFileSync('python3', ['scripts/preparar_dist.py', '--destino', '_dist/fork-verificacao', '--build', '902'], { cwd: new URL('../../../', import.meta.url) });
  expect(existsSync(residual)).toBe(false);
  await page.evaluate(async () => (await navigator.serviceWorker.ready).update());
  await expect.poll(() => page.evaluate(async () => (await caches.keys()).some(k => k.endsWith('static-r3-v902')))).toBe(true);
  await expect.poll(() => page.evaluate(async () => !(await caches.keys()).some(k => k.endsWith('static-r3-v901'))).catch(() => false)).toBe(true);
  expect(await page.evaluate(async () => (await caches.keys()).includes('cache-de-outro-aplicativo'))).toBe(true);
  expect(await page.evaluate(async () => (await caches.keys()).includes('dnd-legado-preservar'))).toBe(true);
  expect(await page.evaluate(() => localStorage.getItem('dnd_personagens'))).toBe(dados.originais);
  await context.setOffline(true);
  await page.reload();
  await expect(page.locator('#app-content')).toContainText('Modo local');
});
