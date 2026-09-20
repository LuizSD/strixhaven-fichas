import { test, expect } from '@playwright/test';
import { abrirSite, irAtePassoAntecedente, personagemEmCriacao, satisfazerPasso } from '../regras/helpers-regras.mjs';

const faculdades = {
  Lorehold: { pericias: ['História', 'Religião'] },
  Prismari: { pericias: ['Acrobacia', 'Atuação'], escolha: 'Alaúde', destino: 'proficiencias_instrumentos' },
  Quandrix: { pericias: ['Arcanismo', 'Natureza'], escolha: 'Ferramentas de Cartógrafo', destino: 'proficiencias_ferramentas' },
  Silverquill: { pericias: ['Intimidação', 'Persuasão'] },
  Witherbloom: { pericias: ['Natureza', 'Sobrevivência'], fixa: 'Kit de Herbalismo' },
};

for (const [faculdade, esperado] of Object.entries(faculdades)) {
  test(`${faculdade}: antecedente real no criador concede escolhas, só 3 pontos e 50 PO`, async ({ context }) => {
    const { page, erros } = await abrirSite(context, '#criar');
    expect(await irAtePassoAntecedente(page)).toBe(true);
    await page.locator(`[data-antecedente="Estudante de ${faculdade} (adaptação)"]`).click();
    if (esperado.escolha) {
      await page.locator('#popup-confirmar-antecedente').click();
      await expect(page.locator('#modal-overlay')).toBeVisible(); // escolha obrigatória
      await page.locator(`[data-opcao-ant="${esperado.escolha}"]`).click();
    }
    await page.locator('#popup-confirmar-antecedente').click();
    await expect(page.locator('#modal-overlay')).toBeHidden();
    await page.locator('[name="dist-mode"][value="1-1-1"]').click();
    for (const a of ['Inteligência', 'Sabedoria', 'Carisma']) await page.locator(`#antecedente-distribuicao [data-attr="${a}"]`).click();
    // Tentar um quarto ponto não muda o orçamento 2024.
    await page.locator('#antecedente-distribuicao [data-attr="Força"]').click();
    const p = await personagemEmCriacao(page);
    expect(p.bonus_antecedente).toEqual({ inteligencia: 1, sabedoria: 1, carisma: 1 });
    expect(p.talentos.filter(t => String(t).startsWith('Iniciado de Strixhaven'))).toHaveLength(1);
    for (const pericia of esperado.pericias) expect(p.pericias_proficientes).toContain(pericia);
    if (esperado.escolha) expect(p[esperado.destino]).toContain(esperado.escolha);
    if (esperado.fixa) expect(p.proficiencias_ferramentas).toContain(esperado.fixa);
    expect((p.proficiencias_ferramentas || []).some(n => n.startsWith('Escolha'))).toBe(false);
    await page.locator('#btn-next').click();
    expect(await satisfazerPasso(page)).toBe(true);
    await page.locator('[data-equip-tipo="antecedente"][data-equip-letra="B"]').waitFor();
    const antes = await personagemEmCriacao(page);
    await page.locator('[data-equip-tipo="antecedente"][data-equip-letra="B"]').click();
    const depois = await personagemEmCriacao(page);
    expect(depois.moedas.po - antes.moedas.po).toBe(50);
    expect(erros).toEqual([]);
  });
}
