// ============================================================
// Issues #50/#54 -- campo novo no formulario de Magia Personalizada:
// escolher se ela fica sempre preparada (hoje, fora do limite) ou passa a
// ocupar vaga de verdade. Este oraculo mede so o FORMULARIO e o
// ARMAZENAMENTO -- a injecao na lista real e a Tarefa 4.
//
// DOM falso: mostrarFormMagiaCustom (site/js/sheet/grimorio.js) chama
// abrirModal (site/js/utils.js), que le document.getElementById(
// 'modal-overlay'/'modal-titulo'/...) sem checar null -- o stub padrao do
// harness (document.getElementById => null) faz isso lancar TypeError
// antes de qualquer asserção rodar. Mesmo padrao de DOM falso ja usado em
// troca-modal-por-classe.test.mjs (elementoFalso/instalarDocumentoFalso) e
// em maestria-assinatura-personalizada.test.mjs, adaptado aqui: diferente
// daqueles dois arquivos (que restauram o document ORIGINAL logo apos abrir
// o modal, e so inspecionam o registro capturado), os testes deste arquivo
// -- baseados no brief -- leem e escrevem `document.getElementById`
// DIRETAMENTE no corpo do teste, depois de `await mostrarFormMagiaCustom(...)`
// retornar. Por isso o document falso fica instalado globalmente durante
// TODO o teste (beforeEach/afterEach), nao so durante a chamada que abre o
// modal. O elemento falso tambem ganha `checked` (checkbox), `hidden` e
// `dispatchEvent`/`click()` que disparam os handlers de addEventListener --
// nenhum dos dois arquivos de referencia precisava disso, porque nao
// simulavam digitar/marcar campos nem clicar em botao.
//
// RODADA DE CORRECAO 1 (revisao): o `checked` do elemento falso nao pode
// nascer hardcoded por id -- fazia dois oraculos (o "marcado por padrao" e
// o de edicao) passarem sem a implementacao gravar nada. `checked` agora
// nasce SEMPRE false; o teste do padrao le o HTML que `abrirModal`
// realmente montou (`modal-corpo`), a unica fonte que prova que a tag
// nasceu com o atributo `checked`.
// ============================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { modulosApp } from './harness.mjs';

const { sheetGrimorio, sheetEstado } = await modulosApp();

/** Elemento de DOM falso: alem do minimo (id/style/innerHTML/addEventListener,
 *  copiado de troca-modal-por-classe.test.mjs), suporta `checked`, `hidden`
 *  e `dispatchEvent`/`click()` disparando os handlers registrados por
 *  addEventListener -- o que os testes deste arquivo precisam para simular
 *  marcar checkbox, trocar select e clicar em "Salvar". */
function elementoFalso(id) {
  const filhos = new Map();
  const el = {
    id, style: {}, innerHTML: '', textContent: '', scrollTop: 0,
    className: '', dataset: {}, handlers: {}, value: '',
    // `checked` SEMPRE nasce false, para todo id -- inclusive
    // mc-sempre-preparada. Achado Important 3 da revisao: um valor
    // hardcoded por id (id === 'mc-sempre-preparada') fazia o oraculo do
    // "marcado por padrao" passar mesmo sem a implementacao gravar nada
    // (o `checked` vinha do proprio teste, nao do codigo de producao). Com
    // false fixo, o teste 1 tem de ler o HTML que abrirModal realmente
    // montou (ver `modal-corpo`), e o teste 5 (edicao sem a chave) so
    // passa se o Step 4 da implementacao de fato setar `.checked = true`.
    checked: false, hidden: false,
    // `options`: os <select> do formulario (mc-escola, mc-tempo, mc-duracao)
    // sao lidos via `[...select.options].some(...)` em
    // definirSelectOuPersonalizado (grimorio.js) no caminho de EDICAO --
    // sem esta lista (vazia) iterar `undefined` lanca TypeError antes de
    // qualquer asserção deste arquivo rodar. Vazia sempre cai no ramo
    // '__personalizado__', irrelevante para as asserções (que so olham
    // mc-sempre-preparada), e e o mesmo efeito pratico de um <select> cujas
    // <option> ainda nao foram parseadas do HTML (este documento falso nao
    // interpreta o HTML montado por abrirModal, so mapeia id -> elemento).
    options: [],
    addEventListener(evento, fn) { (el.handlers[evento] ||= []).push(fn); },
    dispatchEvent(evento) { (el.handlers[evento.type] || []).forEach(fn => fn(evento)); },
    click() { (el.handlers.click || []).forEach(fn => fn()); },
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
 *  `restaurar` para repor o document original ao fim do teste. */
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

function magoNivel5() {
  return {
    nome: 'Aluno', especie: 'Humano', classe: 'Mago', subclasse: '',
    nivel: 5, xp: 6500,
    atributos: { forca: 8, destreza: 12, constituicao: 14, inteligencia: 18, sabedoria: 10, carisma: 10 },
    classes: [{ classe: 'Mago', subclasse: '', nivel: 5, ordem: 0 }],
    grimorio: [], magias_customizadas: [],
    schema_versao: 2,
  };
}

function preencherESalvar({ nome = 'Bola de Gelo', circulo = '1', semprePreparada = null } = {}) {
  // elementoFalso nasce SEMPRE com checked:false (ver comentario ali) -- o
  // navegador real, ao contrario, ja aplicaria o atributo HTML `checked` da
  // tag (conferido pelo teste 1, que le o HTML de `modal-corpo`) antes do
  // jogador tocar no formulario. Reproduz aqui esse estado inicial de um
  // checkbox NOVO (fora do caminho de edicao, que tem seu proprio Step 4),
  // para o cenario de "salvar sem mexer na caixa" medir o campo de
  // producao (Step 5) e nao um artefato do fake.
  document.getElementById('mc-sempre-preparada').checked = true;
  document.getElementById('mc-nome').value = nome;
  document.getElementById('mc-circulo').value = circulo;
  document.getElementById('mc-escola').value = '__personalizado__';
  document.getElementById('mc-escola-personalizada').value = 'Evocação';
  document.getElementById('mc-tempo').value = 'Ação';
  document.getElementById('mc-alcance').value = '18 metros';
  document.getElementById('mc-comp-v').checked = true;
  document.getElementById('mc-duracao').value = '__personalizado__';
  document.getElementById('mc-duracao-texto').value = 'Instantânea';
  if (semprePreparada !== null) document.getElementById('mc-sempre-preparada').checked = semprePreparada;
  document.getElementById('btn-salvar-mc').click();
}

let _doc;
test.beforeEach(() => {
  _doc = instalarDocumentoFalso();
  // O handler de "Salvar" chama renderFichaCompleta (site/js/sheet/ficha.js)
  // no fim, que escreve em `containerRef.innerHTML` -- sem um container
  // registrado via sheetEstado.definirContainer, containerRef e null e o
  // clique em btn-salvar-mc lanca TypeError antes de gravar a magia. Mesmo
  // container minimo que prepararEstadoGrimorio usa em
  // troca-modal-por-classe.test.mjs.
  sheetEstado.definirContainer({
    innerHTML: '', querySelectorAll: () => [], querySelector: () => null, addEventListener: () => {},
  });
});
test.afterEach(() => { _doc.restaurar(); });

test('o formulario tem a caixa "Sempre preparada", MARCADA por padrao', async () => {
  sheetEstado.definirChar(magoNivel5());
  await sheetGrimorio.mostrarFormMagiaCustom();
  // Achado Important 3: o elemento falso mc-sempre-preparada nasce SEMPRE
  // com checked:false (ver elementoFalso acima) -- ele nao "sabe" que o
  // HTML real tem o atributo `checked`. A unica fonte de verdade sobre o
  // que a implementacao realmente montou e o HTML que abrirModal escreveu
  // em `modal-corpo` (site/js/utils.js: corpoEl.innerHTML = corpoHtml).
  const corpo = document.getElementById('modal-corpo')?.innerHTML || '';
  assert.match(corpo, /id="mc-sempre-preparada"/, 'falta o campo mc-sempre-preparada no HTML montado');
  assert.match(corpo, /id="mc-sempre-preparada"[^>]*\bchecked\b/,
    'o padrao tem de ser o comportamento de hoje: a tag tem de nascer com o atributo checked');
});

test('salvar SEM mexer na caixa grava sempre_preparada ausente ou true (compatibilidade)', async () => {
  const p = magoNivel5();
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom();
  preencherESalvar({ nome: 'Bola de Gelo' });
  const salva = p.magias_customizadas.find(m => m.nome === 'Bola de Gelo');
  assert.ok(salva, 'a magia tem de ser gravada');
  assert.notEqual(salva.sempre_preparada, false, 'sem mexer na caixa, o comportamento tem de continuar o de hoje');
});

test('desmarcar a caixa grava sempre_preparada: false', async () => {
  const p = magoNivel5();
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom();
  preencherESalvar({ nome: 'Bola de Fogo Menor', semprePreparada: false });
  const salva = p.magias_customizadas.find(m => m.nome === 'Bola de Fogo Menor');
  assert.equal(salva.sempre_preparada, false);
});

// Issue #74 (comentário do usuário): truque personalizado (círculo 0)
// ganhou a mesma opção "ocupa vaga" que magia de círculo 1+ já tinha --
// antes a caixa ficava escondida para truque, e a mensagem mudava de
// "Sempre preparada" para "Sempre conhecido" (truque não é "preparado",
// é "conhecido").
test('truque (circulo 0) TAMBÉM mostra a caixa de sempre preparada, com o texto ajustado', async () => {
  sheetEstado.definirChar(magoNivel5());
  await sheetGrimorio.mostrarFormMagiaCustom();
  document.getElementById('mc-circulo').value = '0';
  document.getElementById('mc-circulo').dispatchEvent(new Event('change'));
  const linha = document.getElementById('mc-sempre-preparada-linha');
  assert.notEqual(linha?.hidden, true, 'truque personalizado agora também ocupa vaga -- a caixa não pode ficar escondida');
  const rotulo = document.getElementById('mc-sempre-preparada-rotulo');
  assert.match(rotulo?.textContent || '', /conhecido/i, 'para truque, o texto fala em "conhecido", não "preparada"');
});

test('editar uma magia existente sem sempre_preparada mostra a caixa MARCADA', async () => {
  const p = magoNivel5();
  p.magias_customizadas.push({ nome: 'Antiga', circulo: 2, escola: 'Evocação', tempo_conjuracao: 'Ação', alcance: '9 metros', componentes: 'V', duracao: 'Instantânea', descricao: '', dano: '', ritual: false });
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom(0);
  assert.equal(document.getElementById('mc-sempre-preparada').checked, true, 'ficha antiga sem o campo tem de ler como sempre preparada');
  // Achado Important 2: a chamada inicial de atualizarVisibilidadeSemprePreparada
  // roda ANTES do bloco de edicao preencher mc-circulo (valor ainda "0", o
  // padrao do select) -- sem recalcular depois, editar uma magia de
  // circulo 2 deixava a linha escondida para sempre.
  assert.equal(document.getElementById('mc-sempre-preparada-linha')?.hidden, false,
    'editando uma magia de circulo 2, a linha tem de estar VISIVEL');
});

test('editar uma magia gravada com sempre_preparada:false mostra a caixa DESMARCADA', async () => {
  const p = magoNivel5();
  p.magias_customizadas.push({ nome: 'Nova', circulo: 2, escola: 'Evocação', tempo_conjuracao: 'Ação', alcance: '9 metros', componentes: 'V', duracao: 'Instantânea', descricao: '', dano: '', ritual: false, sempre_preparada: false });
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom(0);
  assert.equal(document.getElementById('mc-sempre-preparada').checked, false);
  // Mesmo achado Important 2 do teste anterior: circulo 2, linha visivel.
  assert.equal(document.getElementById('mc-sempre-preparada-linha')?.hidden, false,
    'editando uma magia de circulo 2, a linha tem de estar VISIVEL');
});
