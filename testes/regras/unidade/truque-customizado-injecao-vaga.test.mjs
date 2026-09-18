// ============================================================
// Issue #74 (comentário do usuário) -- truque personalizado ganhou a
// mesma opção "ocupa vaga" que magia de círculo 1+ já tinha: ao desmarcar
// "sempre conhecido", o truque precisa entrar na lista REAL de truques
// conhecidos da classe (magias_conhecidas, carimbado com a classe, para
// QUALQUER classe -- truque não usa grimório nem passa por preparo
// separado, nem para o Mago) -- e sair de lá quando o jogador volta a
// marcar a caixa, renomeia, ou exclui o truque.
//
// Mesmo padrão de magia-customizada-injecao-vaga.test.mjs (fake-document
// copiado dali, não reinventado) -- só a FONTE muda: magias_conhecidas em
// vez de grimorio/magias_preparadas, e truquesPorClasse em vez de
// preparadasPorClasse para o limite.
// ============================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { modulosApp, lerClassesDados } from './harness.mjs';

const { sheetGrimorio, sheetEstado, utils } = await modulosApp();
const mapaDadosDisco = lerClassesDados();

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

function instalarDocumentoFalso() {
  const registro = new Map();
  const docOriginal = globalThis.document;
  globalThis.document = {
    getElementById(id) {
      if (!registro.has(id)) registro.set(id, elementoFalso(id));
      return registro.get(id);
    },
    querySelector: () => null,
    querySelectorAll(sel) {
      const m = sel.match(/^\[data-([\w-]+)\]$/);
      if (!m) return [];
      const attrCamel = m[1].replace(/-([a-z])/g, (_x, c) => c.toUpperCase());
      return [...registro.values()].filter(el => attrCamel in el.dataset);
    },
    createElement: (tag) => elementoFalso(tag),
    body: { appendChild() {} },
  };
  return {
    registro,
    restaurar() { globalThis.document = docOriginal; },
  };
}

function prepararBotaoLiberarVaga(indice) {
  const el = document.getElementById(`liberar-vaga-${indice}`);
  el.dataset.liberarVagaIndice = String(indice);
  return el;
}

function magoNivel5({ conhecidas = [] } = {}) {
  return {
    nome: 'Aluno', especie: 'Humano', classe: 'Mago', subclasse: '',
    nivel: 5, xp: 6500,
    atributos: { forca: 8, destreza: 12, constituicao: 14, inteligencia: 18, sabedoria: 10, carisma: 10 },
    classes: [{ classe: 'Mago', subclasse: '', nivel: 5, ordem: 0 }],
    grimorio: [], magias_preparadas: [], magias_conhecidas: conhecidas, magias_customizadas: [],
    schema_versao: 2,
  };
}

function clerigoNivel5({ conhecidas = [] } = {}) {
  return {
    nome: 'Devoto', especie: 'Humano', classe: 'Clérigo', subclasse: '',
    nivel: 5, xp: 6500,
    atributos: { forca: 10, destreza: 10, constituicao: 14, inteligencia: 8, sabedoria: 18, carisma: 10 },
    classes: [{ classe: 'Clérigo', subclasse: '', nivel: 5, ordem: 0 }],
    grimorio: [], magias_preparadas: [], magias_conhecidas: conhecidas, magias_customizadas: [],
    schema_versao: 2,
  };
}

function preencherESalvar({ nome, semprePreparada }) {
  document.getElementById('mc-nome').value = nome;
  document.getElementById('mc-circulo').value = '0';
  document.getElementById('mc-circulo').dispatchEvent(new Event('change'));
  document.getElementById('mc-escola').value = '__personalizado__';
  document.getElementById('mc-escola-personalizada').value = 'Evocação';
  document.getElementById('mc-tempo').value = 'Ação';
  document.getElementById('mc-alcance').value = '9 metros';
  document.getElementById('mc-comp-v').checked = true;
  document.getElementById('mc-duracao').value = '__personalizado__';
  document.getElementById('mc-duracao-texto').value = 'Instantânea';
  document.getElementById('mc-sempre-preparada').checked = semprePreparada;
  document.getElementById('btn-salvar-mc').click();
}

let _doc;
test.beforeEach(() => {
  _doc = instalarDocumentoFalso();
  // Sem isto, renderFichaCompleta() (chamada ao Salvar) tenta escrever em
  // containerRef.innerHTML com containerRef === null e estoura.
  sheetEstado.definirContainer({
    innerHTML: '', querySelectorAll: () => [], querySelector: () => null, addEventListener: () => {},
  });
});
test.afterEach(() => { _doc.restaurar(); });

test('desmarcar "sempre conhecido" no MAGO adiciona o truque a magias_conhecidas', async () => {
  const p = magoNivel5();
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom();
  preencherESalvar({ nome: 'Faísca Menor', semprePreparada: false });
  assert.ok(p.magias_conhecidas.some(m => m.nome === 'Faísca Menor' && m.circulo === 0),
    'o Mago também grava truque em magias_conhecidas -- truque não usa grimório para ninguém');
});

test('salvar com "sempre conhecido" MARCADO nao mexe em magias_conhecidas', async () => {
  const p = magoNivel5();
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom();
  preencherESalvar({ nome: 'Faísca Menor', semprePreparada: true });
  assert.equal(p.magias_conhecidas.length, 0, 'sempre conhecido continua fora de magias_conhecidas, como hoje');
});

test('editar um truque ja marcado "ocupa vaga" e voltar a marcar "sempre conhecido" TIRA de magias_conhecidas', async () => {
  const p = magoNivel5({ conhecidas: [{ nome: 'Faísca Menor', circulo: 0 }] });
  p.magias_customizadas = [{ nome: 'Faísca Menor', circulo: 0, sempre_preparada: false, escola: 'Evocação', tempo_conjuracao: 'Ação', alcance: '9 metros', componentes: 'V', duracao: 'Instantânea', descricao: '', dano: '', ritual: false }];
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom(0);
  preencherESalvar({ nome: 'Faísca Menor', semprePreparada: true });
  assert.ok(!p.magias_conhecidas.some(m => m.nome === 'Faísca Menor'), 'voltar a marcar sempre conhecido libera a vaga');
});

test('renomear um truque "ocupa vaga" atualiza o nome da entrada em magias_conhecidas', async () => {
  const p = magoNivel5({ conhecidas: [{ nome: 'Faísca Menor', circulo: 0 }] });
  p.magias_customizadas = [{ nome: 'Faísca Menor', circulo: 0, sempre_preparada: false, escola: 'Evocação', tempo_conjuracao: 'Ação', alcance: '9 metros', componentes: 'V', duracao: 'Instantânea', descricao: '', dano: '', ritual: false }];
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom(0);
  preencherESalvar({ nome: 'Faísca Maior', semprePreparada: false });
  assert.ok(!p.magias_conhecidas.some(m => m.nome === 'Faísca Menor'), 'o nome antigo não pode sobrar');
  assert.ok(p.magias_conhecidas.some(m => m.nome === 'Faísca Maior' && m.circulo === 0), 'o nome novo tem de estar lá');
});

test('CLERIGO com vaga livre: desmarcar "sempre conhecido" injeta {nome, circulo:0, classe} em magias_conhecidas', async () => {
  sheetEstado.definirClasseData(mapaDadosDisco.get('Clérigo'));
  sheetEstado.definirClassesData(mapaDadosDisco);
  const p = clerigoNivel5();
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom();
  preencherESalvar({ nome: 'Faísca Menor', semprePreparada: false });
  const injetada = p.magias_conhecidas.find(m => m.nome === 'Faísca Menor');
  assert.ok(injetada, 'o truque tem de entrar em magias_conhecidas, carimbado com a classe');
  assert.equal(injetada.circulo, 0);
  assert.equal(injetada.classe, 'Clérigo');
});

test('CLERIGO sem vaga livre de truque: nada e gravado ate o jogador escolher um truque para liberar', async () => {
  sheetEstado.definirClasseData(mapaDadosDisco.get('Clérigo'));
  sheetEstado.definirClassesData(mapaDadosDisco);
  const tabelaClerigo = mapaDadosDisco.get('Clérigo').tabela_caracteristicas;
  const limites = utils.getLimitesMagias(tabelaClerigo, 5, null);
  assert.ok(limites.truques > 0, 'sanity: Clerigo 5 tem de ter limite de truques conhecido');
  const conhecidasNoLimite = Array.from({ length: limites.truques }, (_, i) => (
    { nome: `Sopro ${i}`, circulo: 0, classe: 'Clérigo' }
  ));
  const p = clerigoNivel5({ conhecidas: conhecidasNoLimite });
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom();
  preencherESalvar({ nome: 'Faísca Menor', semprePreparada: false });
  assert.ok(!p.magias_conhecidas.some(m => m.nome === 'Faísca Menor'),
    'sem vaga, o truque nao pode ser injetado em magias_conhecidas');
  assert.ok(!(p.magias_customizadas || []).some(m => m.nome === 'Faísca Menor' && m.sempre_preparada === false),
    'a recusa tem de desfazer tambem o toggle');
});

test('CLERIGO sem vaga livre de truque: escolher liberar um truque remove o escolhido E injeta a personalizada', async () => {
  sheetEstado.definirClasseData(mapaDadosDisco.get('Clérigo'));
  sheetEstado.definirClassesData(mapaDadosDisco);
  const tabelaClerigo = mapaDadosDisco.get('Clérigo').tabela_caracteristicas;
  const limites = utils.getLimitesMagias(tabelaClerigo, 5, null);
  const conhecidasNoLimite = Array.from({ length: limites.truques }, (_, i) => (
    { nome: `Sopro ${i}`, circulo: 0, classe: 'Clérigo' }
  ));
  const p = clerigoNivel5({ conhecidas: conhecidasNoLimite });
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom();
  conhecidasNoLimite.forEach((_, i) => prepararBotaoLiberarVaga(i));

  preencherESalvar({ nome: 'Faísca Menor', semprePreparada: false });
  document.getElementById('liberar-vaga-0').click();

  assert.ok(!p.magias_conhecidas.some(m => m.nome === 'Sopro 0'),
    'o truque escolhido para liberar a vaga tem de sair de magias_conhecidas');
  const injetada = p.magias_conhecidas.find(m => m.nome === 'Faísca Menor');
  assert.ok(injetada, 'a personalizada tem de entrar no lugar da vaga liberada');
  assert.equal(injetada.circulo, 0);
  assert.equal(injetada.classe, 'Clérigo');
  assert.equal(p.magias_conhecidas.length, limites.truques,
    'um saiu, um entrou -- o total de truques conhecidos nao pode mudar');
});
