// ============================================================
// Issue #73 -- prova de tela: o card "Traços de Espécie" de um Draconato
// nível 5 lista Visão no Escuro (nível 1) antes de Voo Dracônico (nível
// 5), sem seções "Habilidades Ativas"/"Habilidades Passivas", com o selo
// de nível em cada card.
// ============================================================
import { test, expect } from '@playwright/test';
import { ATRIBUTOS_REGRAS, abrirFicha, assentar } from './helpers-regras.mjs';

const DRACONATO_5 = {
  classe: 'Guerreiro', subclasse: '', nivel: 5, xp: 6500,
  especie: 'Draconato', atributos: ATRIBUTOS_REGRAS,
  pericias_proficientes: ['Atletismo', 'Intimidação'],
  tracos_escolhidos: ['Vermelho'],
};

test('Traços de Espécie: Visão no Escuro (Nv.1) vem antes de Voo Dracônico (Nv.5), sem seções Ativas/Passivas', async ({ context }) => {
  const { page, erros } = await abrirFicha(context, DRACONATO_5, 'regras-tracos-especie-1');
  await assentar(page).catch(() => {});

  const card = page.locator('.card', { has: page.locator('.card-header', { hasText: 'Traços de Espécie' }) });
  await expect(card).toBeVisible();
  await expect(card).not.toContainText('Habilidades Ativas');
  await expect(card).not.toContainText('Habilidades Passivas');

  const texto = await card.innerText();
  const idxVisao = texto.indexOf('Visão no Escuro');
  const idxVoo = texto.indexOf('Voo Dracônico');
  expect(idxVisao, 'Visão no Escuro tem de estar no card').toBeGreaterThan(-1);
  expect(idxVoo, 'Voo Dracônico tem de estar no card de um Draconato 5').toBeGreaterThan(-1);
  expect(idxVisao, 'nível 1 antes de nível 5').toBeLessThan(idxVoo);

  expect(erros, `erros de console/página: ${erros.join('; ')}`).toEqual([]);
});
