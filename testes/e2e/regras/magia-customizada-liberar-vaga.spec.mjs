// ============================================================
// Issue #74 -- prova de tela: com o limite de preparadas cheio, desmarcar
// "sempre preparada" abre um modal para liberar uma vaga; escolher uma
// magia preparada substitui ela pela personalizada, em vez de recusar de
// vez e devolver o jogador sem saída.
// ============================================================
import { test, expect } from '@playwright/test';
import { abrirFicha, assentar, ATRIBUTOS_REGRAS } from './helpers-regras.mjs';

// Clérigo 5: limite de preparadas de 1º círculo (dados/classes/clerigo.json)
// preenchido de propósito, para exercitar a recusa/liberação de vaga.
const CLERIGO_5_CHEIO = {
  nome: 'Devoto de Nimb', especie: 'Humano', classe: 'Clérigo', subclasse: '',
  nivel: 5, xp: 6500, atributos: ATRIBUTOS_REGRAS,
  classes: [{ classe: 'Clérigo', subclasse: '', nivel: 5, ordem: 0 }],
  magias_preparadas: [
    { nome: 'Curar Ferimentos', circulo: 1, classe: 'Clérigo' },
    { nome: 'Escudo da Fé', circulo: 1, classe: 'Clérigo' },
    { nome: 'Bênção', circulo: 1, classe: 'Clérigo' },
    { nome: 'Comando', circulo: 1, classe: 'Clérigo' },
    { nome: 'Detectar Magia', circulo: 1, classe: 'Clérigo' },
    { nome: 'Detectar Veneno e Doença', circulo: 1, classe: 'Clérigo' },
    { nome: 'Orientação Divina', circulo: 1, classe: 'Clérigo' },
    { nome: 'Purificar Comida e Bebida', circulo: 1, classe: 'Clérigo' },
    { nome: 'Santuário', circulo: 1, classe: 'Clérigo' },
  ],
  schema_versao: 2,
};

async function criarMagiaPersonalizada(page, { nome, semprePreparada }) {
  await page.locator('#btn-add-magia-custom').click();
  await assentar(page).catch(() => {});
  await page.locator('#mc-nome').fill(nome);
  await page.locator('#mc-circulo').selectOption('1');
  await page.locator('#mc-escola').selectOption('__personalizado__');
  await page.locator('#mc-escola-personalizada').fill('Evocação');
  await page.locator('#mc-tempo').selectOption('Ação');
  await page.locator('#mc-alcance').fill('18 metros');
  await page.locator('#mc-comp-v').check();
  await page.locator('#mc-duracao').selectOption('__personalizado__');
  await page.locator('#mc-duracao-texto').fill('Instantânea');
  if (!semprePreparada) await page.locator('#mc-sempre-preparada').uncheck();
  await page.locator('#btn-salvar-mc').click();
  await assentar(page).catch(() => {});
}

test('sem vaga livre: o modal de liberar vaga aparece, e escolher uma magia a substitui', async ({ context }) => {
  const { page } = await abrirFicha(context, CLERIGO_5_CHEIO, 'regras-liberar-vaga-1');
  await assentar(page).catch(() => {});

  await criarMagiaPersonalizada(page, { nome: 'Chama Azul', semprePreparada: false });

  // O modal de liberar vaga é um SUB-modal, empilhado sobre o formulário
  // (utils.js:abrirModal) -- vive fora de #modal-overlay, num elemento
  // próprio (#sub-modal-overlay-1). A página inteira é o escopo certo.
  await expect(page.getByText('Liberar uma vaga')).toBeVisible();
  await expect(page.locator('[data-liberar-vaga-indice]').first()).toBeVisible();

  // Escolhe liberar "Comando".
  const cartaoComando = page.locator('.opcao-card', { hasText: 'Comando' });
  await cartaoComando.locator('[data-liberar-vaga-indice]').click();
  await assentar(page).catch(() => {});

  // O modal fecha sozinho (o salvamento é repetido e agora tem sucesso).
  await expect(page.locator('#modal-overlay')).not.toBeVisible();

  // Preparar Magias: Comando saiu, Chama Azul (a personalizada) entrou.
  await page.locator('#btn-add-magia').click();
  await assentar(page).catch(() => {});
  await expect(page.locator('#resultado-magias')).toContainText('Chama Azul');
  await expect(page.locator('#resultado-magias')).not.toContainText('Comando');
});
