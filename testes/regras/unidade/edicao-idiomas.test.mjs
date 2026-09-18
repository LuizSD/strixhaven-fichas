// ============================================================
// Issue #58 -- o jogador pedia poder adicionar ou tirar idiomas que o
// personagem conhece. Antes desta tarefa a ficha só EXIBIA `char.idiomas`
// (site/js/sheet/ficha.js:279); não existia edição alguma depois da
// criação. Agora o modal "Editar ficha" (site/js/sheet/edicao.js) ganhou
// uma seção "idiomas": checklist livre do catálogo do livro (Comuns +
// Raros, dados-classes.js) mais um campo de texto para qualquer outro
// nome (suplemento, homebrew) -- sem a regra de orçamento da criação
// (obterRegraIdiomasAtual), que só vale no criador.
//
// abrirModalEdicaoFicha foi exportada (era privada) só para este oráculo:
// o harness de unidade não interpreta HTML, então clicar num botão de aba
// gerado por `.map()` (sem id fixo) não é alcançável por getElementById.
// Abrir direto na seção evita esse problema.
// ============================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { modulosApp } from './harness.mjs';

const { sheetEdicao, sheetEstado } = await modulosApp();

/** Elemento de DOM falso, copiado do padrão já usado em
 *  magia-customizada-toggle-vaga.test.mjs / magia-customizada-injecao-vaga.test.mjs. */
function elementoFalso(id) {
  const filhos = new Map();
  const el = {
    id, style: {}, innerHTML: '', textContent: '', scrollTop: 0,
    className: '', dataset: {}, handlers: {}, value: '',
    checked: false, hidden: false,
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

/**
 * Documento falso com `querySelectorAll('[data-x]')` além do
 * `getElementById` de sempre: `vincular()` re-liga os checkboxes de idioma
 * por esse seletor a cada re-render (o mesmo padrão de `[data-edicao-pericia]`
 * já usado neste arquivo de produção), então o stub precisa devolver os
 * elementos JÁ REGISTRADOS que carregam a chave em `dataset` -- não
 * interpreta CSS de verdade, só esse único formato de atributo.
 */
function instalarDocumentoFalso() {
  const registro = new Map();
  const docOriginal = globalThis.document;
  const doc = {
    getElementById(id) {
      if (!registro.has(id)) registro.set(id, elementoFalso(id));
      return registro.get(id);
    },
    querySelectorAll(sel) {
      const m = sel.match(/^\[data-([\w-]+)\]$/);
      if (!m) return [];
      // dataset despe o prefixo "data-": data-edicao-idioma-toggle vira
      // dataset.edicaoIdiomaToggle, nao dataset.dataEdicaoIdiomaToggle.
      const attrCamel = m[1].replace(/-([a-z])/g, (_x, c) => c.toUpperCase());
      return [...registro.values()].filter(el => attrCamel in el.dataset);
    },
    querySelector: () => null,
    createElement: (tag) => elementoFalso(tag),
    body: { appendChild() {} },
  };
  globalThis.document = doc;
  return { registro, restaurar() { globalThis.document = docOriginal; } };
}

/**
 * Pré-registra o checkbox de UM idioma, com `dataset.edicaoIdiomaToggle`
 * já preenchido -- tem de existir ANTES de abrirModalEdicaoFicha, porque
 * `vincular()` (chamada dentro dela) varre `querySelectorAll(...)` uma
 * única vez, na abertura; um elemento criado DEPOIS não seria encontrado.
 * O id de registro é arbitrário (`toggle-<nome>`): a produção não usa
 * getElementById para estes elementos, só o atributo.
 */
function prepararCaixaIdioma(nome) {
  const el = document.getElementById(`toggle-${nome}`);
  el.dataset.edicaoIdiomaToggle = nome;
  return el;
}

function magoNivel5({ idiomas = ['Comum'] } = {}) {
  return {
    nome: 'Aluno', especie: 'Humano', classe: 'Mago', subclasse: '',
    nivel: 5, xp: 6500,
    atributos: { forca: 8, destreza: 12, constituicao: 14, inteligencia: 18, sabedoria: 10, carisma: 10 },
    classes: [{ classe: 'Mago', subclasse: '', nivel: 5, ordem: 0 }],
    idiomas, magias_customizadas: [],
    schema_versao: 2,
  };
}

let _doc;
test.beforeEach(() => {
  _doc = instalarDocumentoFalso();
  // Sem isto, renderFichaCompleta() (chamada ao Salvar) tenta escrever em
  // containerRef.innerHTML com containerRef === null e estoura -- mesmo
  // registro exigido pelos oráculos de magia-customizada-*.test.mjs.
  sheetEstado.definirContainer({
    innerHTML: '', querySelectorAll: () => [], querySelector: () => null, addEventListener: () => {},
  });
});
test.afterEach(() => { _doc.restaurar(); });

test('desmarcar um idioma e Salvar remove ele de char.idiomas', () => {
  const p = magoNivel5({ idiomas: ['Comum', 'Anão'] });
  sheetEstado.definirChar(p);
  const caixaAnao = prepararCaixaIdioma('Anão');
  sheetEdicao.abrirModalEdicaoFicha('idiomas');

  caixaAnao.checked = false;
  caixaAnao.dispatchEvent({ type: 'change' });
  document.getElementById('btn-salvar-edicao-ficha').click();

  assert.deepEqual(p.idiomas, ['Comum'], 'Anão tem de sair da lista depois de desmarcar e salvar');
});

test('marcar um idioma do catálogo (Raros) e Salvar adiciona ele a char.idiomas', () => {
  const p = magoNivel5({ idiomas: ['Comum'] });
  sheetEstado.definirChar(p);
  const caixaAbissal = prepararCaixaIdioma('Abissal');
  sheetEdicao.abrirModalEdicaoFicha('idiomas');

  caixaAbissal.checked = true;
  caixaAbissal.dispatchEvent({ type: 'change' });
  document.getElementById('btn-salvar-edicao-ficha').click();

  assert.ok(p.idiomas.includes('Abissal'), 'Abissal tem de entrar na lista depois de marcar e salvar');
  assert.ok(p.idiomas.includes('Comum'), 'Comum não pode sumir só por marcar outro idioma');
});

test('adicionar um idioma por texto livre (fora do catálogo) e Salvar grava o nome digitado', () => {
  const p = magoNivel5({ idiomas: ['Comum'] });
  sheetEstado.definirChar(p);
  sheetEdicao.abrirModalEdicaoFicha('idiomas');

  document.getElementById('edicao-idioma-novo').value = 'Idioma da Homebrew';
  document.getElementById('btn-edicao-idioma-add').click();
  document.getElementById('btn-salvar-edicao-ficha').click();

  assert.ok(p.idiomas.includes('Idioma da Homebrew'),
    'um idioma que não está no catálogo do livro tem de poder ser adicionado por texto livre');
});

test('adicionar o mesmo idioma duas vezes por texto livre não duplica a entrada', () => {
  const p = magoNivel5({ idiomas: ['Comum'] });
  sheetEstado.definirChar(p);
  sheetEdicao.abrirModalEdicaoFicha('idiomas');

  document.getElementById('edicao-idioma-novo').value = 'Anão';
  document.getElementById('btn-edicao-idioma-add').click();
  document.getElementById('edicao-idioma-novo').value = 'Anão';
  document.getElementById('btn-edicao-idioma-add').click();
  document.getElementById('btn-salvar-edicao-ficha').click();

  assert.equal(p.idiomas.filter(i => i === 'Anão').length, 1, 'o mesmo idioma não pode entrar duas vezes na lista');
});

test('sem tocar na aba idiomas, char.idiomas fica intacto (compatibilidade)', () => {
  const p = magoNivel5({ idiomas: ['Comum', 'Anão', 'Élfico'] });
  sheetEstado.definirChar(p);
  sheetEdicao.setupEventosEdicao();
  document.getElementById('btn-editar-ficha').click();
  // Abre na aba padrão (atributos) e salva sem passar por idiomas.
  document.getElementById('btn-salvar-edicao-ficha').click();

  assert.deepEqual(p.idiomas, ['Comum', 'Anão', 'Élfico'],
    'idiomas não pode mudar quando o jogador edita outra seção do modal');
});
