// ============================================================
// Issue #73 -- os mesmos dois pontos da issue #60, agora para os Traços de
// Espécie: (1) o card separava Habilidades Ativas/Passivas em duas seções,
// reordenando por classificação em vez de nível -- para um Draconato, Voo
// Dracônico (nível 5, ativo) podia sair ACIMA de Visão no Escuro (nível 1,
// passivo); (2) o traço não dizia em que nível foi concedido, mesmo tendo
// isso disponível (a maioria é nível 1; alguns exigem nível maior, seja
// por menção na prosa do livro -- "a partir do nível N"/"no nível N" -- ou
// por nivel_minimo explícito nos sintéticos de Elfo/Tiferino).
// ============================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { modulosApp } from './harness.mjs';

const { sheetEstado, sheetCaracteristicas, db } = await modulosApp();

async function draconato(nivel) {
  const especies = await db.getEspecies();
  sheetEstado.definirEspecies(especies);
  return {
    nome: 'Fulano', especie: 'Draconato', classe: 'Guerreiro', subclasse: '',
    nivel, xp: 0,
    atributos: { forca: 16, destreza: 12, constituicao: 14, inteligencia: 10, sabedoria: 10, carisma: 10 },
    tracos_escolhidos: ['Vermelho'],
    classes: [{ classe: 'Guerreiro', subclasse: '', nivel, ordem: 0 }],
    schema_versao: 2,
  };
}

test('Draconato nível 5: Visão no Escuro (Nv.1) aparece ANTES de Voo Dracônico (Nv.5)', async () => {
  const p = await draconato(5);
  sheetEstado.definirChar(p);

  const html = sheetCaracteristicas.renderSecaoTracosEspecie();
  const idxVisao = html.indexOf('Visão no Escuro');
  const idxVoo = html.indexOf('Voo Dracônico');

  assert.ok(idxVisao >= 0, 'Visão no Escuro tem de estar no card');
  assert.ok(idxVoo >= 0, 'Voo Dracônico (nível 5) tem de estar no card de um Draconato 5');
  assert.ok(idxVisao < idxVoo,
    'a ordem de nível tem de prevalecer -- nível 1 antes de nível 5, mesmo que Voo Dracônico seja "ativo"');
});

test('a ficha não separa mais traços de espécie em "Habilidades Ativas"/"Habilidades Passivas"', async () => {
  const p = await draconato(5);
  sheetEstado.definirChar(p);

  const html = sheetCaracteristicas.renderSecaoTracosEspecie();
  assert.ok(!html.includes('Habilidades Ativas'), 'a seção "Habilidades Ativas" não pode mais existir');
  assert.ok(!html.includes('Habilidades Passivas'), 'a seção "Habilidades Passivas" não pode mais existir');
});

test('cada traço mostra o selo de nível em que foi concedido', async () => {
  const p = await draconato(5);
  sheetEstado.definirChar(p);

  const html = sheetCaracteristicas.renderSecaoTracosEspecie();
  assert.match(html, />Nv\.1<[\s\S]*?Visão no Escuro/, 'Visão no Escuro (concedido na criação) tem de mostrar Nv.1');
  assert.match(html, />Nv\.5<[\s\S]*?Voo Dracônico/, 'Voo Dracônico (livro: "no nível 5") tem de mostrar Nv.5');
});

test('Draconato nível 1: Voo Dracônico ainda não aparece (nem o selo precisa existir para ele)', async () => {
  const p = await draconato(1);
  sheetEstado.definirChar(p);

  const html = sheetCaracteristicas.renderSecaoTracosEspecie();
  assert.ok(!html.includes('Voo Dracônico'), 'nível 1 não tem Voo Dracônico -- ele é do nível 5');
  assert.ok(html.includes('Visão no Escuro'), 'traços de nível 1 continuam presentes');
});
