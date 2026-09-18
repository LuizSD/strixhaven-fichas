// ============================================================
// Issue #71 -- a personalizada "ocupa vaga" (sempre_preparada:false)
// ainda não preparada saía DENTRO do bloco de círculo da lista de
// Preparadas, marcada "Não preparada" -- poluindo o que o jogador olha
// para saber o que está pronto para conjurar. Agora ela sai numa seção
// própria, fora dos blocos "Nº Círculo".
// ============================================================
import { test, expect } from '@playwright/test';
import { ATRIBUTOS_REGRAS, abrirFicha, assentar } from './helpers-regras.mjs';

const CLERIGO_5 = {
  classe: 'Clérigo', subclasse: '', nivel: 5, xp: 6500,
  especie: 'Humano', atributos: ATRIBUTOS_REGRAS,
  pericias_proficientes: ['Religião', 'Medicina'],
  magias_preparadas: [{ nome: 'Curar Ferimentos', circulo: 1, classe: 'Clérigo' }],
  magias_customizadas: [{
    nome: 'Chama Azul', circulo: 1, sempre_preparada: false,
    escola: 'Evocação', tempo_conjuracao: 'Ação', alcance: '18 metros',
    componentes: 'V, S', duracao: 'Instantânea', descricao: 'Uma chama azulada.',
    ritual: false,
  }],
};

test('a personalizada "ocupa vaga" não preparada aparece numa seção própria, fora do bloco de círculo', async ({ context }) => {
  const { page, erros } = await abrirFicha(context, CLERIGO_5, 'regras-issue71-secao-propria');
  await assentar(page).catch(() => {});

  // Fora do bloco de círculo: Chama Azul não pode estar contida nele.
  const blocoCirculo1 = page.locator('[data-details-id="magias-circulo-1"]');
  await expect(blocoCirculo1).not.toContainText('Chama Azul');
  // Curar Ferimentos (de verdade preparada) continua lá, sozinha.
  await expect(blocoCirculo1).toContainText('Curar Ferimentos');
  await expect(blocoCirculo1).toContainText('1º Círculo (1)');

  // Seção própria: existe, contém a magia, e preserva Editar/Remover.
  const secaoPropria = page.locator('[data-details-id="magias-personalizadas-nao-preparadas"]');
  await expect(secaoPropria).toContainText('Chama Azul');
  await expect(secaoPropria.locator('[data-editar-magia-custom]')).toHaveCount(1);
  await expect(secaoPropria.locator('[data-remover-magia-custom]')).toHaveCount(1);

  expect(erros, `erros de console/página: ${erros.join('; ')}`).toEqual([]);
});
