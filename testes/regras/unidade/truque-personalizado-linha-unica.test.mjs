// ============================================================
// Issue #74 (comentário do usuário) -- a SEÇÃO Magias da ficha
// (renderSecaoMagias) tem de desenhar o TRUQUE personalizado UMA vez, na
// forma certa -- mesmo cuidado do Critical 1 da revisão de branch que
// corrigiu isso para magia de círculo 1+ (magia-customizada-linha-unica.
// test.mjs), agora para truque (círculo 0): a entrada crua que
// grimorio.js grava em `magias_conhecidas` tem de se fundir com a
// personalizada (fundirTruquesComPersonalizados), não desenhar duas
// linhas.
// ============================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { modulosApp } from './harness.mjs';

const { sheetEstado, sheetMagias } = await modulosApp();

const CAMPOS_TRUQUE = {
  escola: 'Evocação', tempo_conjuracao: 'Ação', alcance: '9 metros',
  componentes: 'V', duracao: 'Instantânea', descricao: 'Uma faísca.',
  dano: '', ritual: false,
};

/** Clerigo 5 puro: nenhuma outra seção da ficha emite
 *  `data-magia-custom-index`, então contar o atributo no HTML inteiro
 *  responde "quantas linhas personalizadas saíram?". */
function clerigoNivel5({ conhecidas = [], customizadas = [] } = {}) {
  return {
    nome: 'Devoto', especie: 'Humano', classe: 'Clérigo', subclasse: '',
    nivel: 5, xp: 6500,
    atributos: { forca: 10, destreza: 10, constituicao: 14, inteligencia: 8, sabedoria: 18, carisma: 10 },
    classes: [{ classe: 'Clérigo', subclasse: '', nivel: 5, ordem: 0 }],
    grimorio: [], magias_preparadas: [], magias_conhecidas: conhecidas, magias_customizadas: customizadas,
    schema_versao: 2,
  };
}

function contar(html, agulha) {
  return html.split(agulha).length - 1;
}

test('CLERIGO: truque "ocupa vaga" COM entrada em magias_conhecidas sai em UMA linha personalizada', () => {
  const p = clerigoNivel5({
    conhecidas: [{ nome: 'Faísca Menor', circulo: 0, classe: 'Clérigo' }],
    customizadas: [{ nome: 'Faísca Menor', circulo: 0, sempre_preparada: false, ...CAMPOS_TRUQUE }],
  });
  sheetEstado.definirChar(p);

  const html = sheetMagias.renderSecaoMagias();

  assert.equal(contar(html, 'data-magia-custom-index='), 1, 'o truque continua desenhado uma vez');
  assert.ok(html.includes('Lançar'), 'truque preparado tem de ter o botão Lançar -- ele está pronto para uso');
  assert.ok(!html.includes('Não conhecido'), 'já tem entrada gravada: não é "não conhecido"');
});

test('CLERIGO: truque "ocupa vaga" SEM entrada gravada continua na ficha, marcado "Não conhecido"', () => {
  const p = clerigoNivel5({
    customizadas: [{ nome: 'Faísca Menor', circulo: 0, sempre_preparada: false, ...CAMPOS_TRUQUE }],
  });
  sheetEstado.definirChar(p);

  const html = sheetMagias.renderSecaoMagias();

  assert.equal(contar(html, 'data-magia-custom-index='), 1, 'o truque continua desenhado');
  assert.ok(html.includes('Não conhecido'), 'e sai marcado como não conhecido');
  assert.ok(html.includes('data-remover-magia-custom='), 'com o botão de remover');
  assert.ok(html.includes('data-editar-magia-custom='), 'e o de editar');
  assert.ok(!html.includes('data-lancar-magia-custom='), 'sem controle de lançar: ele não está conhecido de verdade');
});

test('CLERIGO: truque SEMPRE CONHECIDO nao muda -- linha derivada e chip "Truques Personalizados" (nao regride)', () => {
  const p = clerigoNivel5({
    customizadas: [{ nome: 'Faísca Eterna', circulo: 0, ...CAMPOS_TRUQUE }],
  });
  sheetEstado.definirChar(p);

  const html = sheetMagias.renderSecaoMagias();

  assert.equal(contar(html, 'data-magia-custom-index='), 1);
  assert.ok(html.includes('<span class="contador-label">Truques Personalizados</span>'),
    'o sempre conhecido continua contado no chip próprio');
  assert.ok(!html.includes('Não conhecido'), 'sempre conhecido nunca entra no estado "não conhecido"');
});

test('CLERIGO: o chip "Truques Personalizados" NÃO conta o truque que ocupa vaga', () => {
  const p = clerigoNivel5({
    conhecidas: [{ nome: 'Faísca Menor', circulo: 0, classe: 'Clérigo' }],
    customizadas: [
      { nome: 'Faísca Eterna', circulo: 0, ...CAMPOS_TRUQUE },
      { nome: 'Faísca Menor', circulo: 0, sempre_preparada: false, ...CAMPOS_TRUQUE },
    ],
  });
  sheetEstado.definirChar(p);

  const html = sheetMagias.renderSecaoMagias();
  const inicioChip = html.indexOf('Truques Personalizados');
  const trechoChip = html.slice(inicioChip, inicioChip + 200);
  assert.match(trechoChip, /contador-valor">1</,
    'só "Faísca Eterna" (sempre conhecida) conta no chip -- "Faísca Menor" (ocupa vaga) já entra no contador de truques normal');
});
