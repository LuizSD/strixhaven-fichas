// ============================================================
// Issues #50/#54 -- ao desmarcar "sempre preparada", a magia personalizada
// precisa entrar na lista REAL de escolha da classe (grimorio para Mago,
// magias_preparadas com classe carimbada para as demais), ocupando vaga
// de verdade -- e sair de la quando o jogador volta a marcar a caixa,
// renomeia, muda o circulo, ou exclui a magia.
//
// RULING B do controlador (task-4-brief.md, Controller Ruling B): a
// fixture "sem vaga livre" do brief original usava Mago, mas
// `temVagaLivre()` devolve `true` incondicionalmente para Mago (o
// grimorio nao tem teto de ESPACO, so de ouro) -- um Mago nunca exercita a
// recusa. O teste de recusa abaixo usa um Clerigo (conjurador PREPARADO
// sem grimorio) no lugar, com o limite de 1o circulo confirmado em tempo
// de execucao por getLimitesMagias (a mesma funcao que a producao chama),
// nunca um numero presumido.
//
// O caso de EXCLUSAO nao entra neste oraculo de unidade (mesma limitacao
// documentada em magia-customizada-toggle-vaga.test.mjs e no brief): o
// botao de remover so existe dentro do HTML que renderFichaCompleta()
// produz, e o harness de unidade deste projeto captura esse HTML como
// STRING -- clicar nele de verdade e trabalho da spec e2e (Tarefa 5).
// ============================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { modulosApp, lerClassesDados } from './harness.mjs';

const { sheetGrimorio, sheetEstado, utils } = await modulosApp();
const mapaDadosDisco = lerClassesDados();

/** Elemento de DOM falso: identico ao de magia-customizada-toggle-vaga.test.mjs
 *  (copiado dali, nao reinventado -- ver o comentario daquele arquivo para o
 *  porque de cada campo). Suporta checked/value/hidden/dispatchEvent/click. */
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

function magoNivel5({ grimorio = [], preparadas = [] } = {}) {
  return {
    nome: 'Aluno', especie: 'Humano', classe: 'Mago', subclasse: '',
    nivel: 5, xp: 6500,
    atributos: { forca: 8, destreza: 12, constituicao: 14, inteligencia: 18, sabedoria: 10, carisma: 10 },
    classes: [{ classe: 'Mago', subclasse: '', nivel: 5, ordem: 0 }],
    grimorio, magias_preparadas: preparadas, magias_customizadas: [],
    schema_versao: 2,
  };
}

// Clerigo 5 puro: conjurador PREPARADO sem grimorio -- o unico jeito de
// exercitar `temVagaLivre()` de verdade (Controller Ruling B, ver docblock
// do arquivo).
function clerigoNivel5({ preparadas = [] } = {}) {
  return {
    nome: 'Devoto', especie: 'Humano', classe: 'Clérigo', subclasse: '',
    nivel: 5, xp: 6500,
    atributos: { forca: 10, destreza: 10, constituicao: 14, inteligencia: 8, sabedoria: 18, carisma: 10 },
    classes: [{ classe: 'Clérigo', subclasse: '', nivel: 5, ordem: 0 }],
    grimorio: [], magias_preparadas: preparadas, magias_customizadas: [],
    schema_versao: 2,
  };
}

function preencherESalvar({ nome, circulo = '1', semprePreparada }) {
  document.getElementById('mc-nome').value = nome;
  document.getElementById('mc-circulo').value = circulo;
  document.getElementById('mc-circulo').dispatchEvent(new Event('change'));
  document.getElementById('mc-escola').value = '__personalizado__';
  document.getElementById('mc-escola-personalizada').value = 'Evocação';
  document.getElementById('mc-tempo').value = 'Ação';
  document.getElementById('mc-alcance').value = '18 metros';
  document.getElementById('mc-comp-v').checked = true;
  document.getElementById('mc-duracao').value = '__personalizado__';
  document.getElementById('mc-duracao-texto').value = 'Instantânea';
  document.getElementById('mc-sempre-preparada').checked = semprePreparada;
  document.getElementById('btn-salvar-mc').click();
}

let _doc;
test.beforeEach(() => {
  _doc = instalarDocumentoFalso();
  sheetEstado.definirContainer({
    innerHTML: '', querySelectorAll: () => [], querySelector: () => null, addEventListener: () => {},
  });
});
test.afterEach(() => { _doc.restaurar(); });

test('desmarcar "sempre preparada" no MAGO adiciona a magia ao grimorio', async () => {
  const p = magoNivel5();
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom();
  preencherESalvar({ nome: 'Chama Azul', semprePreparada: false });
  assert.ok(p.grimorio.some(m => m.nome === 'Chama Azul' && m.circulo === 1));
});

test('salvar com "sempre preparada" MARCADA nao mexe no grimorio', async () => {
  const p = magoNivel5();
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom();
  preencherESalvar({ nome: 'Chama Azul', semprePreparada: true });
  assert.equal(p.grimorio.length, 0, 'sempre preparada continua fora do grimorio, como hoje');
});

test('editar uma magia ja marcada como "ocupa vaga" e voltar a marcar "sempre preparada" TIRA do grimorio', async () => {
  const p = magoNivel5({ grimorio: [{ nome: 'Chama Azul', circulo: 1 }] });
  p.magias_customizadas = [{ nome: 'Chama Azul', circulo: 1, sempre_preparada: false, escola: 'Evocação', tempo_conjuracao: 'Ação', alcance: '18 metros', componentes: 'V', duracao: 'Instantânea', descricao: '', dano: '', ritual: false }];
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom(0);
  preencherESalvar({ nome: 'Chama Azul', semprePreparada: true });
  assert.ok(!p.grimorio.some(m => m.nome === 'Chama Azul'), 'voltar a marcar sempre preparada libera a vaga');
});

// ACHADO da revisao da Tarefa 4 (Important): a primeira versao deste
// oraculo usava 'Chama Azul' (nome fictício) como nome ANTERIOR. Como
// 'Chama Azul' nao bate com NENHUMA magia real do acervo (indiceMagiasCache
// vem do _indice.json de verdade neste harness -- fetch le do disco), o
// bloco LEGADO da issue #42 (grimorio.js, `identidadeMudou && nomeAnterior
// && Array.isArray(char.grimorio)`) ja o considerava "nao ambiguo" e
// RENOMEAVA a entrada sozinho -- o teste passava mesmo com o bloco NOVO da
// Tarefa 4 (caso 1: "ocupava vaga, continua, nome mudou") completamente
// ausente. Nasceu VERDE por engano, nao pelo codigo que deveria medir.
//
// Correcao: o nome ANTERIOR precisa ser uma magia REAL do acervo de Mago
// no mesmo circulo (ex.: 'Detectar Magia', 1o circulo) -- isso faz
// `podeSerTambemDoAcervo` dar `true` e o bloco legado marcar
// `grimorioAmbiguo = true` SEM renomear a entrada. Quem entao tem de
// renomear a entrada de 'Detectar Magia' para o nome novo e exclusivamente
// o bloco NOVO da Tarefa 4 (caso 1). Confirmado por RED/GREEN manual: com o
// caso 1 do bloco novo comentado, este teste falha (ver task-4-report.md,
// secao de correcao).
test('renomear uma magia "ocupa vaga" atualiza o nome da entrada no grimorio', async () => {
  const p = magoNivel5({ grimorio: [{ nome: 'Detectar Magia', circulo: 1 }] });
  p.magias_customizadas = [{ nome: 'Detectar Magia', circulo: 1, sempre_preparada: false, escola: 'Adivinhação', tempo_conjuracao: 'Ação', alcance: '9 metros', componentes: 'V, S', duracao: 'Concentração, até 10 minutos', descricao: '', dano: '', ritual: false }];
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom(0);
  preencherESalvar({ nome: 'Labareda Azul', semprePreparada: false });
  assert.ok(!p.grimorio.some(m => m.nome === 'Detectar Magia'), 'o nome antigo nao pode sobrar');
  assert.ok(p.grimorio.some(m => m.nome === 'Labareda Azul' && m.circulo === 1), 'o nome novo tem de estar la');
});

// ACHADO Important 2 da revisao de branch: o bloco LEGADO da issue #42
// rodava ANTES do bloco novo e RENOMEAVA a entrada do grimorio quando o
// nome antigo nao era do acervo ('Chama Azul'); o bloco novo procurava
// pelo nome ANTIGO, nao achava nada, e nao removia a entrada. Resultado:
// a magia voltava a ser "sempre preparada" E ficava no grimorio -- o
// estado que a 3.0.3 eliminou. A correcao gateia o bloco legado com
// `!ocupavaVagaAntes`. RED/GREEN confirmado por reversao da guarda (ver o
// relatorio da fix wave final).
test('MAGO: renomear E voltar a marcar "sempre preparada" no mesmo salvamento nao deixa entrada presa no grimorio', async () => {
  const p = magoNivel5({ grimorio: [{ nome: 'Chama Azul', circulo: 1 }] });
  p.magias_customizadas = [{ nome: 'Chama Azul', circulo: 1, sempre_preparada: false, escola: 'Evocação', tempo_conjuracao: 'Ação', alcance: '18 metros', componentes: 'V', duracao: 'Instantânea', descricao: '', dano: '', ritual: false }];
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom(0);
  preencherESalvar({ nome: 'Labareda', semprePreparada: true });
  assert.ok(!p.grimorio.some(m => m.nome === 'Chama Azul'), 'o nome antigo nao pode sobrar');
  assert.ok(!p.grimorio.some(m => m.nome === 'Labareda'),
    'o nome novo tambem nao: a magia voltou a ser sempre preparada e sai do grimorio');
});

// Contrapartida do teste acima: com a caixa AINDA desmarcada, o rename tem
// de ser acompanhado pelo grimorio -- agora pelo bloco novo, que passou a
// ser o unico responsavel pela entrada de uma personalizada que ocupa vaga.
test('MAGO: renomear mantendo "ocupa vaga" acompanha o nome novo no grimorio (nome fora do acervo)', async () => {
  const p = magoNivel5({ grimorio: [{ nome: 'Chama Azul', circulo: 1 }] });
  p.magias_customizadas = [{ nome: 'Chama Azul', circulo: 1, sempre_preparada: false, escola: 'Evocação', tempo_conjuracao: 'Ação', alcance: '18 metros', componentes: 'V', duracao: 'Instantânea', descricao: '', dano: '', ritual: false }];
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom(0);
  preencherESalvar({ nome: 'Labareda', semprePreparada: false });
  assert.ok(!p.grimorio.some(m => m.nome === 'Chama Azul'), 'o nome antigo nao pode sobrar');
  assert.equal(p.grimorio.filter(m => m.nome === 'Labareda').length, 1,
    'UMA entrada com o nome novo -- nem duas (legado + novo), nem nenhuma');
});

// Achado adiado (parked) na revisao final de branch: um Mago pode ja ter
// PREPARADO a personalizada a partir do grimorio (`data-preparar-grimorio`,
// magias.js, grava {nome, circulo, classe:'Mago'} em magias_preparadas, sem
// `personalizada`/`origem`). Renomear a magia enquanto ela ocupa vaga
// sincronizava so `char.grimorio` -- a copia preparada ficava presa com o
// nome antigo, consumindo uma vaga que ninguem mais controla (mesmo formato
// de entrada orfa da issue #39). Corrigido sincronizando tambem
// magias_preparadas quando `ehMagoAgora && ocupavaVagaAntes`.
test('MAGO: renomear uma magia "ocupa vaga" JA PREPARADA tambem atualiza a copia em magias_preparadas', async () => {
  const p = magoNivel5({
    grimorio: [{ nome: 'Detectar Magia', circulo: 1 }],
    preparadas: [{ nome: 'Detectar Magia', circulo: 1, classe: 'Mago' }],
  });
  p.magias_customizadas = [{ nome: 'Detectar Magia', circulo: 1, sempre_preparada: false, escola: 'Adivinhação', tempo_conjuracao: 'Ação', alcance: '9 metros', componentes: 'V, S', duracao: 'Concentração, até 10 minutos', descricao: '', dano: '', ritual: false }];
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom(0);
  preencherESalvar({ nome: 'Labareda Azul', semprePreparada: false });
  assert.ok(!p.magias_preparadas.some(m => m.nome === 'Detectar Magia'), 'a copia preparada com o nome antigo nao pode sobrar');
  assert.ok(p.magias_preparadas.some(m => m.nome === 'Labareda Azul' && m.circulo === 1 && m.classe === 'Mago'),
    'a copia preparada tem de acompanhar o nome novo');
});

// Contrapartida: renomear e voltar a marcar "sempre preparada" no mesmo
// salvamento tambem precisa TIRAR a copia preparada de magias_preparadas
// (nao so do grimorio) -- senao a magia volta a ser "sempre preparada" E
// continua ocupando uma vaga fantasma na lista de preparadas.
test('MAGO: renomear E voltar a marcar "sempre preparada" tambem remove a copia preparada de magias_preparadas', async () => {
  const p = magoNivel5({
    grimorio: [{ nome: 'Detectar Magia', circulo: 1 }],
    preparadas: [{ nome: 'Detectar Magia', circulo: 1, classe: 'Mago' }],
  });
  p.magias_customizadas = [{ nome: 'Detectar Magia', circulo: 1, sempre_preparada: false, escola: 'Adivinhação', tempo_conjuracao: 'Ação', alcance: '9 metros', componentes: 'V, S', duracao: 'Concentração, até 10 minutos', descricao: '', dano: '', ritual: false }];
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom(0);
  preencherESalvar({ nome: 'Labareda Azul', semprePreparada: true });
  assert.ok(!p.magias_preparadas.some(m => m.nome === 'Detectar Magia' || m.nome === 'Labareda Azul'),
    'nenhuma copia (nome antigo ou novo) pode sobrar em magias_preparadas: a magia voltou a ser sempre preparada');
});

// Analogo ao teste anterior, mas para o RAMO NAO-MAGO do bloco novo (caso
// 1, grimorio.js: char.magias_preparadas). Nao ha ambiguidade de acervo
// para conferir aqui -- so Mago tem grimorio, e o bloco legado que renomeia
// por engano so mexe em char.grimorio; o unico jeito de a entrada em
// magias_preparadas ser atualizada e o bloco novo desta tarefa.
test('CLERIGO: renomear uma magia "ocupa vaga" atualiza a entrada em magias_preparadas', async () => {
  sheetEstado.definirClasseData(mapaDadosDisco.get('Clérigo'));
  sheetEstado.definirClassesData(mapaDadosDisco);
  const p = clerigoNivel5({ preparadas: [{ nome: 'Prece Antiga', circulo: 1, classe: 'Clérigo' }] });
  p.magias_customizadas = [{ nome: 'Prece Antiga', circulo: 1, sempre_preparada: false, escola: 'Abjuração', tempo_conjuracao: 'Ação', alcance: '9 metros', componentes: 'V', duracao: 'Instantânea', descricao: '', dano: '', ritual: false }];
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom(0);
  preencherESalvar({ nome: 'Prece Nova', semprePreparada: false });
  assert.ok(!p.magias_preparadas.some(m => m.nome === 'Prece Antiga'), 'o nome antigo nao pode sobrar em magias_preparadas');
  const atualizada = p.magias_preparadas.find(m => m.nome === 'Prece Nova');
  assert.ok(atualizada, 'o nome novo tem de estar em magias_preparadas');
  assert.equal(atualizada.circulo, 1);
  assert.equal(atualizada.classe, 'Clérigo', 'a entrada atualizada tem de manter a classe carimbada');
});

// Caso 3 do bloco novo, ramo NAO-MAGO: ocupava vaga, o jogador volta a
// marcar "sempre preparada" -- a entrada tem de sair de magias_preparadas
// (mesmo comportamento ja coberto para o Mago/grimorio, acima).
test('CLERIGO: voltar a marcar "sempre preparada" remove a entrada de magias_preparadas', async () => {
  sheetEstado.definirClasseData(mapaDadosDisco.get('Clérigo'));
  sheetEstado.definirClassesData(mapaDadosDisco);
  const p = clerigoNivel5({ preparadas: [{ nome: 'Prece Antiga', circulo: 1, classe: 'Clérigo' }] });
  p.magias_customizadas = [{ nome: 'Prece Antiga', circulo: 1, sempre_preparada: false, escola: 'Abjuração', tempo_conjuracao: 'Ação', alcance: '9 metros', componentes: 'V', duracao: 'Instantânea', descricao: '', dano: '', ritual: false }];
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom(0);
  preencherESalvar({ nome: 'Prece Antiga', semprePreparada: true });
  assert.ok(!p.magias_preparadas.some(m => m.nome === 'Prece Antiga'), 'voltar a marcar sempre preparada libera a vaga em magias_preparadas');
});

test('MAGO: mesmo com magias_preparadas cheio, a injecao no grimorio e aceita (o teto do Mago e ouro, nao espaco)', async () => {
  // Confirma o Ruling B na pratica: preencher magias_preparadas nao afeta
  // Mago nenhum, porque ehMagoAgora faz temVagaLivre() devolver true sem
  // nem olhar para preparadasPorClasse.
  const preparadasCheias = Array.from({ length: 20 }, (_, i) => (
    { nome: `Enchimento ${i}`, circulo: 1, classe: 'Mago' }
  ));
  const p = magoNivel5({ preparadas: preparadasCheias });
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom();
  preencherESalvar({ nome: 'Chama Azul', semprePreparada: false });
  assert.ok(p.grimorio.some(m => m.nome === 'Chama Azul' && m.circulo === 1),
    'Mago injeta no grimorio independente de magias_preparadas -- o limite dele e outro');
});

test('CLERIGO sem vaga livre no circulo: a tentativa de desmarcar "sempre preparada" e recusada', async () => {
  sheetEstado.definirClasseData(mapaDadosDisco.get('Clérigo'));
  sheetEstado.definirClassesData(mapaDadosDisco);
  const tabelaClerigo = mapaDadosDisco.get('Clérigo').tabela_caracteristicas;
  // Mesmo calculo que a producao faz (grimorio.js: getLimitesMagias(sup.tabela,
  // sup.nivelClasse, subConj)) -- confirmado aqui, nao presumido, para o
  // numero de entradas de preenchimento bater EXATAMENTE com o limite real.
  const limites = utils.getLimitesMagias(tabelaClerigo, 5, null);
  assert.ok(limites.preparadas > 0, 'sanity: Clerigo 5 tem de ter limite de preparadas conhecido');
  const preparadasNoLimite = Array.from({ length: limites.preparadas }, (_, i) => (
    { nome: `Prece ${i}`, circulo: 1, classe: 'Clérigo' }
  ));
  const p = clerigoNivel5({ preparadas: preparadasNoLimite });
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom();
  preencherESalvar({ nome: 'Chama Azul', semprePreparada: false });
  assert.ok(!(p.magias_preparadas || []).some(m => m.nome === 'Chama Azul'),
    'sem vaga, a magia nao pode ser injetada em magias_preparadas');
  assert.ok(!(p.magias_customizadas || []).some(m => m.nome === 'Chama Azul' && m.sempre_preparada === false),
    'a recusa tem de desfazer tambem o toggle -- senao a magia fica marcada "ocupa vaga" sem ocupar nenhuma');
});

test('CLERIGO com vaga livre: desmarcar "sempre preparada" injeta {nome, circulo, classe} em magias_preparadas', async () => {
  sheetEstado.definirClasseData(mapaDadosDisco.get('Clérigo'));
  sheetEstado.definirClassesData(mapaDadosDisco);
  const p = clerigoNivel5();
  sheetEstado.definirChar(p);
  await sheetGrimorio.mostrarFormMagiaCustom();
  preencherESalvar({ nome: 'Chama Azul', semprePreparada: false });
  const injetada = (p.magias_preparadas || []).find(m => m.nome === 'Chama Azul');
  assert.ok(injetada, 'a magia tem de entrar em magias_preparadas, carimbada com a classe');
  assert.equal(injetada.circulo, 1);
  assert.equal(injetada.classe, 'Clérigo');
});
