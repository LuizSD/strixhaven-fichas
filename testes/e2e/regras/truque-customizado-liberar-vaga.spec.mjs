// ============================================================
// Issue #74 (comentário do usuário) -- prova de tela: truque personalizado
// ganhou a mesma opção "ocupa vaga" que magia de círculo 1+ já tinha.
// Com o limite de truques cheio, desmarcar "sempre conhecido" abre o
// mesmo modal de liberar vaga; escolher um truque conhecido o substitui.
// Excluir o truque personalizado depois limpa a entrada de
// magias_conhecidas (achado que não tinha oráculo nenhum, nem de
// unidade nem e2e, até esta tarefa).
// ============================================================
import { test, expect } from '@playwright/test';
import { abrirFicha, assentar, ATRIBUTOS_REGRAS, clicarSeletorFicha } from './helpers-regras.mjs';

// Clérigo 5: limite de truques (dados/classes/clerigo.json) preenchido de
// propósito, com truques reais do livro (dados/classes/magias_clerigo.json).
const CLERIGO_5_TRUQUES_CHEIOS = {
  nome: 'Devoto de Nimb', especie: 'Humano', classe: 'Clérigo', subclasse: '',
  nivel: 5, xp: 6500, atributos: ATRIBUTOS_REGRAS,
  classes: [{ classe: 'Clérigo', subclasse: '', nivel: 5, ordem: 0 }],
  magias_conhecidas: [
    { nome: 'Acudir os Moribundos', circulo: 0, classe: 'Clérigo' },
    { nome: 'Chama Sagrada', circulo: 0, classe: 'Clérigo' },
    { nome: 'Luz', circulo: 0, classe: 'Clérigo' },
    { nome: 'Orientação', circulo: 0, classe: 'Clérigo' },
  ],
  schema_versao: 2,
};

async function criarTruquePersonalizado(page, { nome, semprePreparada }) {
  await page.locator('#btn-add-magia-custom').click();
  await assentar(page).catch(() => {});
  await page.locator('#mc-nome').fill(nome);
  await page.locator('#mc-circulo').selectOption('0');
  await page.locator('#mc-escola').selectOption('__personalizado__');
  await page.locator('#mc-escola-personalizada').fill('Evocação');
  await page.locator('#mc-tempo').selectOption('Ação');
  await page.locator('#mc-alcance').fill('9 metros');
  await page.locator('#mc-comp-v').check();
  await page.locator('#mc-duracao').selectOption('__personalizado__');
  await page.locator('#mc-duracao-texto').fill('Instantânea');
  if (!semprePreparada) await page.locator('#mc-sempre-preparada').uncheck();
  await page.locator('#btn-salvar-mc').click();
  await assentar(page).catch(() => {});
}

test('truque sem vaga livre: o modal de liberar vaga aparece, e escolher um truque o substitui', async ({ context }) => {
  const { page } = await abrirFicha(context, CLERIGO_5_TRUQUES_CHEIOS, 'regras-truque-liberar-vaga-1');
  await assentar(page).catch(() => {});

  await criarTruquePersonalizado(page, { nome: 'Faísca Menor', semprePreparada: false });

  await expect(page.getByText('Liberar uma vaga')).toBeVisible();
  await expect(page.locator('[data-liberar-vaga-indice]').first()).toBeVisible();

  const cartaoLuz = page.locator('.opcao-card', { hasText: 'Luz' });
  await cartaoLuz.locator('[data-liberar-vaga-indice]').click();
  await assentar(page).catch(() => {});

  await expect(page.locator('#modal-overlay')).not.toBeVisible();

  const detailsTruques = page.locator('#details-truques');
  await expect(detailsTruques).toContainText('Faísca Menor');
  await expect(detailsTruques).not.toContainText('Luz');
});

test('excluir o truque personalizado "ocupa vaga" tira a entrada de magias_conhecidas', async ({ context }) => {
  const { page } = await abrirFicha(context, {
    ...CLERIGO_5_TRUQUES_CHEIOS,
    magias_conhecidas: CLERIGO_5_TRUQUES_CHEIOS.magias_conhecidas.slice(0, 3), // uma vaga livre
  }, 'regras-truque-liberar-vaga-2');
  await assentar(page).catch(() => {});

  await criarTruquePersonalizado(page, { nome: 'Faísca Menor', semprePreparada: false });
  await expect(page.locator('#details-truques')).toContainText('Faísca Menor');

  // Botão dentro de um <details> recolhido (a mesma limitação documentada
  // em magia-customizada-*.spec.mjs) -- clicarSeletorFicha dispara o
  // clique via JS, sem exigir visibilidade.
  await clicarSeletorFicha(page, '[data-remover-magia-custom]', { esperar: '#btn-confirmar-remover-magia-custom' });
  await assentar(page).catch(() => {});
  await page.locator('#btn-confirmar-remover-magia-custom').click();
  await assentar(page).catch(() => {});

  await expect(page.locator('#details-truques')).not.toContainText('Faísca Menor');
});
