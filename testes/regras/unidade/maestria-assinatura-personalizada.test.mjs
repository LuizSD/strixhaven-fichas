// ============================================================
// Issue #49 -- a magia personalizada do Mago (circulo 1+) precisa
// aparecer como candidata de Maestria de Magias (nivel 18) e Assinatura
// Magica (nivel 20). A issue #46 (versao 3.0.3) tirou a personalizada do
// grimorio -- ela passou a ser derivada de magias_customizadas -- e a
// lista de candidatas destas duas caracteristicas so olhava char.grimorio.
//
// DOM falso: abrirEscolhaMagiasFixasMago (site/js/sheet/grimorio.js) chama
// abrirModal (site/js/utils.js), que le document.getElementById(
// 'modal-overlay'/'modal-titulo'/...) sem checar null -- o stub padrao do
// harness (document.getElementById => null) faz isso lancar
// TypeError antes de qualquer asserção rodar. Mesmo padrao de DOM falso ja
// usado em troca-modal-por-classe.test.mjs (elementoFalsoGrimorio/
// instalarDocumentoFalsoGrimorio), copiado aqui (funcoes locais, nao
// exportadas por aquele arquivo) e adaptado: os cards de cada vaga sao
// escritos por montarSeletor (site/js/ui-opcoes.js) no filho
// `.opcao-lista` do elemento, nao no innerHTML do proprio elemento -- por
// isso as asserções leem `registro.get('magia-fixa-c1').querySelector(
// '.opcao-lista').innerHTML`, nao `magia-fixa-c1.innerHTML` diretamente.
// ============================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { modulosApp } from './harness.mjs';

const { sheetGrimorio, sheetEstado } = await modulosApp();

/** Elemento de DOM falso minimo (copiado de troca-modal-por-classe.test.mjs). */
function elementoFalso(id) {
  const filhos = new Map();
  const el = {
    id, style: {}, innerHTML: '', textContent: '', scrollTop: 0,
    className: '', dataset: {}, handlers: {}, value: '',
    addEventListener(evento, fn) { (el.handlers[evento] ||= []).push(fn); },
    removeAttribute() {}, setAttribute() {}, appendChild() {}, remove() {},
    closest: () => null,
    querySelector(sel) {
      if (!filhos.has(sel)) filhos.set(sel, elementoFalso(sel));
      return filhos.get(sel);
    },
    querySelectorAll: () => [],
    classList: { add() {}, remove() {}, toggle() {} },
  };
  return el;
}

/** Instala um `document` falso com getElementById cacheado por id; devolve
 *  `{ registro, restaurar }` -- `registro` e o Map id -> elemento falso. */
function instalarDocumentoFalso() {
  const registro = new Map();
  const docOriginal = globalThis.document;
  globalThis.document = {
    getElementById(id) {
      if (!registro.has(id)) registro.set(id, elementoFalso(id));
      return registro.get(id);
    },
    querySelector: () => null,
    querySelectorAll: () => [],
    createElement: (tag) => elementoFalso(tag),
    body: { appendChild() {} },
  };
  return {
    registro,
    restaurar() { globalThis.document = docOriginal; },
  };
}

// Mago 18: Maestria de Magias exige duas vagas (1o e 2o circulo).
function mago18() {
  return {
    nome: 'Elminster', especie: 'Humano', classe: 'Mago', subclasse: 'Evocação',
    nivel: 18, xp: 300000,
    atributos: { forca: 8, destreza: 12, constituicao: 14, inteligencia: 20, sabedoria: 12, carisma: 10 },
    classes: [{ classe: 'Mago', subclasse: 'Evocação', nivel: 18, ordem: 0 }],
    grimorio: [{ nome: 'Mísseis Mágicos', circulo: 1 }],
    magias_customizadas: [
      { nome: 'Chama Azul', circulo: 1, escola: 'Evocação', tempo_conjuracao: 'Ação', alcance: '18 metros', componentes: 'V, S', duracao: 'Instantânea', descricao: 'Dano de fogo azulado.', dano: '3d6 fogo', ritual: false },
      { nome: 'Onda Gelada', circulo: 2, escola: 'Evocação', tempo_conjuracao: 'Ação', alcance: '18 metros', componentes: 'V, S', duracao: 'Instantânea', descricao: 'Dano de frio em cone.', dano: '4d6 frio', ritual: false },
    ],
    schema_versao: 2,
  };
}

/** Abre o modal sobre um documento falso e devolve o registro de elementos, para inspecionar o que montarSeletor desenhou em cada vaga. */
async function abrirModalMaestria(personagem) {
  sheetEstado.definirChar(personagem);
  const { registro, restaurar } = instalarDocumentoFalso();
  try {
    await sheetGrimorio.abrirEscolhaMagiasFixasMago('maestria_magias');
  } finally {
    restaurar();
  }
  return registro;
}

/** HTML de cards de uma vaga (`.opcao-lista`, filho de `magia-fixa-<chave>`). */
function htmlDaVaga(registro, chave) {
  return registro.get(`magia-fixa-${chave}`)?.querySelector('.opcao-lista')?.innerHTML || '';
}

test('Maestria de Magias lista a personalizada de 1o circulo como candidata', async () => {
  const registro = await abrirModalMaestria(mago18());
  const html = htmlDaVaga(registro, 'c1');
  assert.ok(html.includes('Chama Azul'), 'a personalizada de 1o circulo tem de aparecer na vaga de 1o circulo');
});

test('Maestria de Magias lista a personalizada de 2o circulo como candidata', async () => {
  const registro = await abrirModalMaestria(mago18());
  const html = htmlDaVaga(registro, 'c2');
  assert.ok(html.includes('Onda Gelada'), 'a personalizada de 2o circulo tem de aparecer na vaga de 2o circulo');
});

test('a magia do grimorio continua candidata (nao regride)', async () => {
  const registro = await abrirModalMaestria(mago18());
  const html = htmlDaVaga(registro, 'c1');
  assert.ok(html.includes('Mísseis Mágicos'), 'a magia do grimorio precisa continuar na lista');
});

test('a mesma personalizada nao aparece duplicada quando ja esta no grimorio', async () => {
  const p = mago18();
  // Chama Azul tambem foi copiada para o grimorio (cenario legado, ou
  // resultado da Tarefa 4): so pode aparecer UMA vez na vaga de 1o circulo.
  p.grimorio.push({ nome: 'Chama Azul', circulo: 1 });
  const registro = await abrirModalMaestria(p);
  const html = htmlDaVaga(registro, 'c1');
  // Conta CARTOES, nao ocorrencias cruas do nome: cardOpcaoHtml
  // (site/js/ui-opcoes.js) repete o nome dentro de UM UNICO cartao
  // (data-opcao, o rotulo visivel e data-ver de "ver detalhes") -- contar a
  // substring "Chama Azul" mediria sempre 3 nesse card e nunca detectaria
  // duplicacao de verdade. `data-opcao="Chama Azul"` e o atributo que so
  // aparece uma vez por cartao, e por isso identifica o cartao em si.
  const cartoes = html.split('data-opcao="Chama Azul"').length - 1;
  assert.equal(cartoes, 1, 'a mesma magia nao pode virar dois cartoes na mesma vaga');
});

// Minor 6 da revisao de branch: a guarda "grimorio vazio" rodava ANTES da
// uniao com as personalizadas e recusava o Mago que so tem personalizadas,
// embora ele TENHA candidatas -- o modal nem abria.
test('Mago com grimorio VAZIO e so personalizadas ainda recebe as candidatas', async () => {
  const p = mago18();
  p.grimorio = [];
  const registro = await abrirModalMaestria(p);
  assert.ok(htmlDaVaga(registro, 'c1').includes('Chama Azul'),
    'com grimorio vazio, a personalizada de 1o circulo continua candidata');
  assert.ok(htmlDaVaga(registro, 'c2').includes('Onda Gelada'),
    'idem para a de 2o circulo');
});

// Minor 7 da revisao de branch: o dedup era por NOME so, entao a
// personalizada de 2o circulo desaparecia da vaga c2 quando o grimorio
// tinha uma HOMONIMA de outro circulo.
test('homonima de OUTRO circulo no grimorio nao exclui a personalizada da sua vaga', async () => {
  const p = mago18();
  p.grimorio.push({ nome: 'Onda Gelada', circulo: 1 });
  const registro = await abrirModalMaestria(p);
  assert.ok(htmlDaVaga(registro, 'c2').includes('Onda Gelada'),
    'o dedup casa nome+circulo: a de 2o circulo nao e excluida pela de 1o');
});

test('personalizada de circulo errado nao aparece na vaga', async () => {
  const registro = await abrirModalMaestria(mago18());
  const html = htmlDaVaga(registro, 'c1');
  assert.ok(!html.includes('Onda Gelada'), 'a personalizada de 2o circulo nao pode aparecer na vaga de 1o');
});
