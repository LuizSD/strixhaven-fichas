// ============================================================
// Issue #60 -- o card "Características de Classe" separava as
// características em duas seções (Habilidades Ativas / Habilidades
// Passivas), renderizando TODAS as ativas antes de TODAS as passivas.
// Um Mago 20 via "Assinatura Mágica" (nível 20, ativa) ACIMA de
// "Acadêmico" (nível 2, passiva) -- fora da ordem em que o livro
// apresenta as características. Agora é uma lista única, ordenada por
// nível; cada card carrega o selo Ativa/Passiva (tipoBadge,
// site/js/sheet/habilidades.js), então a seção deixou de ser necessária
// para transmitir a classificação.
// ============================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { modulosApp, personagemMulticlasse } from './harness.mjs';

test('Mago 20: Acadêmico (nível 2) aparece ANTES de Assinatura Mágica (nível 20)', async () => {
  const { sheetEstado, sheetCaracteristicas, db } = await modulosApp();
  const dadosMago = await db.getClasse('Mago');
  const p = await personagemMulticlasse([{ classe: 'Mago', nivel: 20, subclasse: 'Evocação' }]);
  sheetEstado.definirChar(p);
  sheetEstado.definirClassesData(new Map([['Mago', dadosMago]]));

  const html = sheetCaracteristicas.renderSecaoCaracteristicas();
  const idxAcademico = html.indexOf('Acadêmico');
  const idxAssinatura = html.indexOf('Assinatura Mágica');

  assert.ok(idxAcademico >= 0, 'Acadêmico (nível 2) tem de estar no card');
  assert.ok(idxAssinatura >= 0, 'Assinatura Mágica (nível 20) tem de estar no card');
  assert.ok(idxAcademico < idxAssinatura,
    'a ordem de nível tem de prevalecer -- nível 2 antes de nível 20, mesmo que Assinatura Mágica seja "ativa"');
});

test('a ficha não separa mais características em seções "Habilidades Ativas"/"Habilidades Passivas"', async () => {
  const { sheetEstado, sheetCaracteristicas, db } = await modulosApp();
  const dadosMago = await db.getClasse('Mago');
  const p = await personagemMulticlasse([{ classe: 'Mago', nivel: 20, subclasse: 'Evocação' }]);
  sheetEstado.definirChar(p);
  sheetEstado.definirClassesData(new Map([['Mago', dadosMago]]));

  const html = sheetCaracteristicas.renderSecaoCaracteristicas();
  assert.ok(!html.includes('Habilidades Ativas'), 'a seção "Habilidades Ativas" não pode mais existir');
  assert.ok(!html.includes('Habilidades Passivas'), 'a seção "Habilidades Passivas" não pode mais existir');
});
