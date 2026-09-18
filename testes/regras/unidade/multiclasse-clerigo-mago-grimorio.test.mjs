// ============================================================
// Issue #62 -- Mago (classe inicial) multiclasse com Clérigo: magias
// preparadas PELO CLÉRIGO (via "Preparar Magias" com a superfície do
// Clérigo ativa -- carimbadas `classe: 'Clérigo'` de verdade pelo
// gravador, grimorio.js:935-938, sem ambiguidade nenhuma) eram varridas
// por `normalizarGrimorioMago` (utils.js) para dentro do grimório do
// MAGO, porque a varredura não filtrava por classe nenhuma -- só por "é
// uma magia preparada normal de círculo > 0?". De lá, reapareciam na
// grade de "Preparar Magias" do Mago (mostrarBuscaMagia, sheet/
// grimorio.js), que lê candidatas do grimório quando a superfície ativa
// usa grimório -- a mistura relatada.
//
// (Magia de Domínio AUTOMÁTICA -- `_concederMagiaAutomatica`, levelup.js,
// origem 'dominio' -- é ISENTA de `magiaContaNoLimite` e nunca chegava a
// este laço nem antes da correção; não é o caminho deste teste.)
//
// `store.listarPersonagens()` chama `normalizarGrimorioMago` em todo
// load (mesmo caminho do Oráculo 5b de multiclasse-magias-grimorio.
// test.mjs) -- usado aqui para reproduzir o efeito real de reabrir a
// ficha, não só chamar a função isolada.
// ============================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { modulosApp } from './harness.mjs';

const { store, utils } = await modulosApp();

function personagemMagoComPreparadaDeClerigo() {
  return {
    id: 'regras-clerigo-mago-grimorio-1',
    nome: 'Teste #62',
    classe: 'Mago', subclasse: '', nivel: 6,
    classes: [
      { classe: 'Mago', subclasse: 'Evocação', nivel: 1, ordem: 0 },
      { classe: 'Clérigo', subclasse: '', nivel: 5, ordem: 1 },
    ],
    atributos: { forca: 10, destreza: 10, constituicao: 14, inteligencia: 16, sabedoria: 14, carisma: 10 },
    // Magias preparadas PELO CLÉRIGO, via "Preparar Magias" com a
    // superfície do Clérigo ativa -- carimbadas 'Clérigo' de verdade
    // (grimorio.js:935-938: `classe: sup.classe`, sem ambiguidade).
    magias_preparadas: [
      { nome: 'Palavra Curativa', circulo: 1, classe: 'Clérigo' },
      { nome: 'Curar Feridas', circulo: 1, classe: 'Clérigo' },
      { nome: 'Santuário', circulo: 1, classe: 'Clérigo' },
      { nome: 'Bênção', circulo: 1, classe: 'Clérigo' },
      // Uma magia de Mago escolhida manualmente pela grade de "Preparar
      // Magias" -- essa SIM está carimbada 'Mago' e já vive no grimório
      // (é assim que a grade do Mago funciona: só prepara o que já está
      // lá). Continua aqui para provar que a normalização não perde
      // nenhuma preparada legítima do Mago.
      { nome: 'Mísseis Mágicos', circulo: 1, classe: 'Mago' },
    ],
    grimorio: [{ nome: 'Mísseis Mágicos', circulo: 1 }],
    moedas: { pl: 0, po: 200, pe: 0, pp: 0, pc: 0 },
  };
}

test('Mago(inicial)/Clérigo(multiclasse): magias preparadas PELO CLÉRIGO NÃO entram no grimório do Mago', async () => {
  const chaveOriginal = localStorage.getItem('dnd_personagens');
  localStorage.setItem('dnd_personagens', '[]');
  try {
    store.salvarPersonagem(personagemMagoComPreparadaDeClerigo());

    // "Recarregar": store.listarPersonagens() roda normalizarGrimorioMago
    // em todo load, o mesmo caminho de abrir a ficha ou revisitar a lista.
    const relido = store.listarPersonagens().find((p) => p.id === 'regras-clerigo-mago-grimorio-1');
    assert.ok(relido, 'sanity: personagem salvo precisa estar na lista relida');

    const nomesNoGrimorio = (relido.grimorio || []).map((m) => m?.nome);
    for (const nomeClerigo of ['Palavra Curativa', 'Curar Feridas', 'Santuário', 'Bênção']) {
      assert.ok(!nomesNoGrimorio.includes(nomeClerigo),
        `"${nomeClerigo}" foi preparada PELO CLÉRIGO (carimbada classe:'Clérigo') -- não deveria ter sido ` +
        `varrida para o grimório do Mago. Grimório: ${JSON.stringify(relido.grimorio)}`);
    }
    assert.ok(nomesNoGrimorio.includes('Mísseis Mágicos'),
      'a magia do próprio Mago (carimbada "Mago", já no grimório) deveria continuar lá -- a correção não ' +
      'pode remover o que já era legítimo');
  } finally {
    if (chaveOriginal == null) localStorage.removeItem('dnd_personagens');
    else localStorage.setItem('dnd_personagens', chaveOriginal);
  }
});

test('Mago(inicial)/Clérigo(multiclasse): "Preparar Magias" do Mago não mostra a magia preparada pelo Clérigo como candidata', async () => {
  const { sheetEstado, sheetGrimorio, contextoClasse } = await modulosApp();
  contextoClasse.resetarSuperficieSelecionada?.();
  const p = personagemMagoComPreparadaDeClerigo();
  // Aplica a normalização (o efeito de reabrir a ficha) ANTES de abrir o
  // modal -- sem isso este teste mediria só o Oráculo acima outra vez.
  utils.normalizarGrimorioMago(p);
  sheetEstado.definirChar(p);

  const originalGetElementById = document.getElementById;
  const originalQuerySelectorAll = document.querySelectorAll;
  const elementoFalso = () => ({
    style: {}, innerHTML: '', textContent: '', value: '', className: '',
    querySelectorAll: () => [], addEventListener: () => {},
    classList: { add() {}, remove() {} },
  });
  const elementos = {
    'modal-overlay': { style: { display: 'none' } },
    'modal-titulo': elementoFalso(),
    'modal-corpo': elementoFalso(),
    'modal-acoes': elementoFalso(),
    'modal-container': { scrollTop: 0 },
    'resultado-magias': elementoFalso(),
    'busca-magia-add': elementoFalso(),
    'gm-contador-truques': elementoFalso(),
    'gm-contador-preparadas': elementoFalso(),
  };
  document.getElementById = (id) => elementos[id] || null;
  document.querySelectorAll = () => [];
  let html;
  try {
    await sheetGrimorio.mostrarBuscaMagia();
    html = elementos['modal-corpo'].innerHTML;
  } finally {
    document.getElementById = originalGetElementById;
    document.querySelectorAll = originalQuerySelectorAll;
  }

  assert.ok(!html.includes('Palavra Curativa'),
    'a grade de "Preparar Magias" do Mago não deveria mostrar "Palavra Curativa" (preparada pelo ' +
    'Clérigo) -- ela só apareceria se tivesse sido varrida para char.grimorio, de onde a grade do Mago lê');
});
