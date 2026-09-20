// Captura de comparação de um snapshot git servido localmente. Bloqueia toda rede externa.
import { chromium } from '@playwright/test';
import { mkdir } from 'node:fs/promises';
const destino = new URL('../../assets-private/entrega/', import.meta.url);
await mkdir(destino, { recursive: true });
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 1000 }, serviceWorkers: 'block' });
await page.route('**/*', r => r.request().url().startsWith('http://127.0.0.1:8804/') ? r.continue() : r.abort());
await page.goto('http://127.0.0.1:8804/site/');
await page.evaluate(async () => {
  const s = await import('./js/store.js');
  const p = s.criarPersonagemVazio();
  Object.assign(p, { id: 'comparacao', nome: 'Lia — Registro de teste', classe: 'Mago', especie: 'Humano', nivel: 1, pv_max: 8, pv_atual: 8,
    atributos: { forca: 10, destreza: 14, constituicao: 14, inteligencia: 16, sabedoria: 12, carisma: 10 } });
  s.salvarPersonagem(p);
});
await page.reload();
await page.locator('.char-card').waitFor();
await page.screenshot({ path: new URL('original-inicio-desktop.png', destino).pathname });
await page.goto('http://127.0.0.1:8804/site/#ficha/comparacao');
await page.locator('#char-nome-display').waitFor();
await page.screenshot({ path: new URL('original-ficha-desktop.png', destino).pathname });
await page.setViewportSize({ width: 390, height: 844 });
await page.screenshot({ path: new URL('original-ficha-mobile.png', destino).pathname });
await page.goto('http://127.0.0.1:8804/site/#home');
await page.locator('.char-card').waitFor();
await page.screenshot({ path: new URL('original-inicio-mobile.png', destino).pathname });
await browser.close();
