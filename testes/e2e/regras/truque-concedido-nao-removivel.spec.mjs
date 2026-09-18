// ============================================================
// Issue #63 -- prova de tela: o truque concedido por Ilusões Aprimoradas
// do Ilusionista (origem `subclasse_automatica`) aparece na aba "Truques"
// de "Preparar Magias" sem checkbox de remoção -- clicar nele não pode
// tirá-lo da lista de truques conhecidos.
// ============================================================
import { test, expect } from '@playwright/test';
import { ATRIBUTOS_REGRAS, abrirFicha, assentar } from './helpers-regras.mjs';

const MAGO_ILUSIONISTA_3 = {
  nome: 'Aluna', especie: 'Humano', classe: 'Mago', subclasse: 'Ilusionista',
  nivel: 3, xp: 900, atributos: ATRIBUTOS_REGRAS,
  grimorio: [],
  magias_conhecidas: [
    { nome: 'Prestidigitação Arcana', circulo: 0, origem: 'subclasse_automatica' },
    { nome: 'Mãos Mágicas', circulo: 0 },
  ],
  schema_versao: 2,
};

test('truque concedido por subclasse não tem checkbox de remoção e clicar nele não o tira da ficha', async ({ context }) => {
  const { page } = await abrirFicha(context, MAGO_ILUSIONISTA_3, 'regras-truque-concedido-1');
  await assentar(page).catch(() => {});

  await page.locator('#btn-add-magia').click();
  await assentar(page).catch(() => {});
  await page.locator('.tab[data-tab-mg="truques"]').click();
  await assentar(page).catch(() => {});

  // O card do truque concedido aparece na seção travada, sem checkbox
  // clicável (nenhum [data-truque-check] com esse nome).
  await expect(page.locator('[data-truque-check="Prestidigitação Arcana"]')).toHaveCount(0);
  await expect(page.locator('#resultado-magias')).toContainText('Prestidigitação Arcana');

  // Truque de classe escolhido livremente continua removível -- contraste.
  await expect(page.locator('[data-truque-check="Mãos Mágicas"]')).toHaveCount(1);
});
