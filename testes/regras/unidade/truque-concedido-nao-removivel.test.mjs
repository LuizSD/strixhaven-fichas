// ============================================================
// Issue #63 -- a aba "Truques" do modal "Preparar Magias" (grimorio.js,
// tabAtiva === 'truques') só travava contra remoção o truque de ORIGEM
// `especie` (Alto Elfo, Tiferino). Um truque concedido por característica
// de SUBCLASSE -- Ilusão Menor ou seu substituto, de Ilusões Aprimoradas
// do Ilusionista (Classes.md:5074), origem `subclasse_automatica` -- não
// tinha essa proteção: aparecia como um truque de classe normal,
// clicável, e o clique o REMOVIA de `magias_conhecidas` para sempre (nada
// mais o concede de volta). A correção generaliza a guarda para
// `truqueEhTrocavel` (regras-origens-magia.js, a fonte única das origens
// que o jogador não escolheu), a mesma já usada pelo modal de troca do
// Descanso Longo (truquesTrocaveis).
// ============================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { modulosApp, lerClassesDados } from './harness.mjs';

const { sheetEstado, sheetGrimorio, regrasOrigensMagia } = await modulosApp();
const mapaDadosDisco = lerClassesDados();

/**
 * DOM-com-cliques: parseia o HTML REAL que grimorio.js gravou em
 * #modal-corpo com regex (não interpreta CSS de verdade), reconstrói
 * `dataset` a partir dos atributos `data-*` de cada tag casada, e
 * cacheia por (seletor, tag) para que um clique simulado caia no MESMO
 * objeto que recebeu addEventListener. Copiado de
 * multiclasse-magias-grimorio.test.mjs (Oráculo 4), que já resolveu este
 * problema para o portão irmão `[data-circ-check]` -- não reinventado.
 */
function criarDomDeModalComCliques() {
  const cache = new Map();

  function casaSeletor(tag, seletor) {
    if (seletor.startsWith('[') && seletor.endsWith(']')) {
      const attr = seletor.slice(1, -1);
      return new RegExp(`\\b${attr}="`).test(tag);
    }
    if (seletor.startsWith('.')) {
      const classe = seletor.slice(1);
      const m = tag.match(/class="([^"]*)"/);
      return !!m && m[1].split(/\s+/).includes(classe);
    }
    return false;
  }

  function datasetDe(tag) {
    const dataset = {};
    const regexAttr = /data-([a-z0-9-]+)="([^"]*)"/gi;
    let a;
    while ((a = regexAttr.exec(tag))) {
      const chave = a[1].replace(/-([a-z0-9])/g, (_, c) => c.toUpperCase());
      dataset[chave] = a[2];
    }
    return dataset;
  }

  function elementosDoHtml(html, seletorOriginal) {
    const seletor = seletorOriginal.replace(/^#[\w-]+\s+/, '');
    const encontrados = [];
    const regexTag = /<[a-z][a-z0-9]*\b[^>]*>/gi;
    let m;
    while ((m = regexTag.exec(html))) {
      const tag = m[0];
      if (!casaSeletor(tag, seletor)) continue;
      const chave = `${seletorOriginal}::${tag}`;
      if (!cache.has(chave)) {
        const listeners = [];
        cache.set(chave, {
          dataset: datasetDe(tag),
          classList: { add() {}, remove() {} },
          addEventListener(_tipo, fn) { listeners.push(fn); },
          dispararClick() { listeners.forEach((fn) => fn({ stopPropagation() {}, target: {} })); },
        });
      }
      encontrados.push(cache.get(chave));
    }
    return encontrados;
  }

  function criarPagina() {
    let html = '';
    return {
      style: {}, textContent: '', value: '', className: '',
      classList: { add() {}, remove() {} },
      get innerHTML() { return html; },
      set innerHTML(v) { html = v; },
      querySelectorAll(seletor) { return elementosDoHtml(html, seletor); },
      addEventListener() {},
    };
  }

  const elementos = {
    'modal-overlay': { style: { display: 'none' } },
    'modal-titulo': criarPagina(),
    'modal-corpo': criarPagina(),
    'modal-acoes': criarPagina(),
    'modal-container': { scrollTop: 0 },
    'resultado-magias': criarPagina(),
    'busca-magia-add': criarPagina(),
    'gm-contador-truques': criarPagina(),
    'gm-contador-preparadas': criarPagina(),
    'toast-container': { appendChild() {} },
  };

  return {
    elementos,
    getElementById: (id) => elementos[id] || null,
    querySelectorAll: (seletor) => elementosDoHtml(elementos['modal-corpo'].innerHTML, seletor),
  };
}

function instalarDomDeModalComCliques() {
  const dom = criarDomDeModalComCliques();
  const originalGetElementById = document.getElementById;
  const originalQuerySelectorAll = document.querySelectorAll;
  const originalCreateElement = document.createElement;
  document.getElementById = dom.getElementById;
  document.querySelectorAll = dom.querySelectorAll;
  document.createElement = () => ({
    style: {}, classList: { add() {}, remove() {} },
    appendChild() {}, setAttribute() {}, remove() {},
  });
  return {
    dom,
    restaurar() {
      document.getElementById = originalGetElementById;
      document.querySelectorAll = originalQuerySelectorAll;
      document.createElement = originalCreateElement;
    },
  };
}

function magoIlusionista3({ truqueSubstituto = 'Prestidigitação Arcana' } = {}) {
  return {
    nome: 'Aluna', especie: 'Humano', classe: 'Mago', subclasse: 'Ilusionista',
    nivel: 3, xp: 900,
    atributos: { forca: 8, destreza: 12, constituicao: 14, inteligencia: 18, sabedoria: 10, carisma: 10 },
    classes: [{ classe: 'Mago', subclasse: 'Ilusionista', nivel: 3, ordem: 0 }],
    grimorio: [],
    // O truque substituto de Ilusões Aprimoradas (a personagem já conhecia
    // Ilusão Menor por outra fonte) -- exatamente o formato que
    // concederTruqueDeSubclasse (regras-subclasse-escolhas.js) grava.
    magias_conhecidas: [
      { nome: truqueSubstituto, circulo: 0, origem: 'subclasse_automatica' },
      { nome: 'Mãos Mágicas', circulo: 0 }, // truque de classe escolhido livremente, sem origem especial
    ],
    schema_versao: 2,
  };
}

test('o truque concedido por subclasse (Ilusões Aprimoradas) aparece SEM checkbox de remoção', async () => {
  const p = magoIlusionista3();
  sheetEstado.definirChar(p);
  sheetEstado.definirClasseData(mapaDadosDisco.get('Mago'));
  sheetEstado.definirClassesData(mapaDadosDisco);

  const { dom, restaurar } = instalarDomDeModalComCliques();
  try {
    await sheetGrimorio.mostrarBuscaMagia();
    const abas = dom.querySelectorAll('#tabs-gerenciar-magias .tab');
    const abaTruques = abas.find((a) => a.dataset.tabMg === 'truques');
    assert.ok(abaTruques, 'sanity: não achei a aba "Truques"');
    abaTruques.dispararClick();

    const checks = dom.elementos['resultado-magias'].querySelectorAll('[data-truque-check]');
    const nomesComCheck = checks.map((el) => el.dataset.truqueCheck);
    assert.ok(!nomesComCheck.includes('Prestidigitação Arcana'),
      `"Prestidigitação Arcana" (concedida por subclasse) não pode ter checkbox de remoção -- checks encontrados: ${JSON.stringify(nomesComCheck)}`);
    assert.ok(nomesComCheck.includes('Mãos Mágicas'),
      'controle positivo: um truque de classe escolhido livremente CONTINUA com checkbox de remoção');
  } finally {
    restaurar();
  }
});

test('clicar no truque concedido por subclasse (se algum check casar com ele) não o remove de magias_conhecidas', async () => {
  const p = magoIlusionista3();
  sheetEstado.definirChar(p);
  sheetEstado.definirClasseData(mapaDadosDisco.get('Mago'));
  sheetEstado.definirClassesData(mapaDadosDisco);

  const { dom, restaurar } = instalarDomDeModalComCliques();
  try {
    await sheetGrimorio.mostrarBuscaMagia();
    const abas = dom.querySelectorAll('#tabs-gerenciar-magias .tab');
    const abaTruques = abas.find((a) => a.dataset.tabMg === 'truques');
    abaTruques.dispararClick();

    // Clica em QUALQUER check que case com o nome protegido, se a grade
    // tiver renderizado um (regressão na renderização não pode contornar
    // a guarda do handler). Sem a correção, este clique remove o truque;
    // com ela, ou o check nem existe (assert acima já prova isso), ou o
    // handler recusa.
    const checks = dom.elementos['resultado-magias'].querySelectorAll('[data-truque-check]');
    const checkProtegido = checks.find((el) => el.dataset.truqueCheck === 'Prestidigitação Arcana');
    checkProtegido?.dispararClick();

    // A mesma função que o handler consulta (defesa em profundidade,
    // confirmando que a fonte única da regra concorda com o resultado).
    assert.equal(
      regrasOrigensMagia.truqueEhTrocavel({ nome: 'Prestidigitação Arcana', circulo: 0, origem: 'subclasse_automatica' }),
      false, 'truqueEhTrocavel tem de recusar origem subclasse_automatica');
  } finally {
    restaurar();
  }

  assert.ok(p.magias_conhecidas.some((m) => m.nome === 'Prestidigitação Arcana'),
    'o truque concedido por subclasse tem de continuar em magias_conhecidas mesmo depois de tentar clicar nele');
});

test('a grade de truques disponíveis para adicionar não repete o truque concedido por subclasse (sem duplicata)', async () => {
  const p = magoIlusionista3();
  sheetEstado.definirChar(p);
  sheetEstado.definirClasseData(mapaDadosDisco.get('Mago'));
  sheetEstado.definirClassesData(mapaDadosDisco);

  const { dom, restaurar } = instalarDomDeModalComCliques();
  let checks;
  try {
    await sheetGrimorio.mostrarBuscaMagia();
    const abas = dom.querySelectorAll('#tabs-gerenciar-magias .tab');
    const abaTruques = abas.find((a) => a.dataset.tabMg === 'truques');
    abaTruques.dispararClick();
    checks = dom.elementos['resultado-magias'].querySelectorAll('[data-truque-check]');
  } finally {
    restaurar();
  }

  const ocorrencias = checks.filter((el) => el.dataset.truqueCheck === 'Prestidigitação Arcana').length;
  assert.equal(ocorrencias, 0,
    'o truque concedido não pode aparecer NENHUMA vez na grade clicável -- ele já saiu na seção travada "Truques Concedidos"');
});
