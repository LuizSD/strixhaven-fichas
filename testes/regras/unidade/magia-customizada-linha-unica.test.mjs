// ============================================================
// Issues #49/#50/#54 -- a SECAO Magias da ficha (renderSecaoMagias) tem de
// desenhar a magia personalizada UMA vez, na forma certa.
//
// Achado Critical 1 da revisao de branch: as fusoes da issue #46 iteravam
// char.magias_customizadas so por `circulo > 0` e empurravam TODA
// personalizada como linha "sempre preparada", sem nunca consultar
// `sempre_preparada`. Como a Tarefa 4 grava uma entrada CRUA em
// magias_preparadas (demais classes) ou no grimorio (Mago, que dali a
// prepara), a mesma magia saia DUAS vezes: a crua pelo ramo do acervo
// (descricao vazia, "Conjurar" que nao conhece a magia -- a forma da issue
// #39) e a derivada anunciando "sempre preparada", exatamente o que o
// jogador desligou.
//
// Achado Important 3, mesma raiz: escolher a personalizada em Maestria de
// Magias/Assinatura Magica grava entrada crua com `origem`, e a ficha
// desenhava as duas linhas, com o selo da caracteristica na linha errada.
//
// Estes oraculos leem o HTML que renderSecaoMagias() devolve -- o mesmo
// padrao de multiclasse-magias-secao.test.mjs, onde o render e sincrono e
// nao precisa de DOM falso.
// ============================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { modulosApp, lerClassesDados } from './harness.mjs';

const { sheetEstado, sheetMagias, sheetMago } = await modulosApp();
const mapaDadosDisco = lerClassesDados();

const CAMPOS_MAGIA = {
  escola: 'Evocação', tempo_conjuracao: 'Ação', alcance: '18 metros',
  componentes: 'V', duracao: 'Instantânea', descricao: 'Uma chama azul.',
  dano: '', ritual: false,
};

/** Clerigo 5 puro: conjurador preparado SEM grimorio -- nenhuma outra
 *  secao da ficha emite `data-magia-custom-index`, entao contar o atributo
 *  no HTML inteiro responde "quantas linhas personalizadas saíram?". */
function clerigoNivel5({ preparadas = [], customizadas = [] } = {}) {
  return {
    nome: 'Devoto', especie: 'Humano', classe: 'Clérigo', subclasse: '',
    nivel: 5, xp: 6500,
    atributos: { forca: 10, destreza: 10, constituicao: 14, inteligencia: 8, sabedoria: 18, carisma: 10 },
    classes: [{ classe: 'Clérigo', subclasse: '', nivel: 5, ordem: 0 }],
    grimorio: [], magias_preparadas: preparadas, magias_customizadas: customizadas,
    schema_versao: 2,
  };
}

/** Mago 18 com grimorio VAZIO, pelo mesmo motivo do fixture acima: a secao
 *  do grimorio tambem emite `data-magia-custom-index` (sheet/magias.js, na
 *  linha do livro de magias), e um grimorio vazio deixa a contagem falando
 *  so das linhas de Preparadas. */
function magoNivel18({ preparadas = [], customizadas = [], recursos = {} } = {}) {
  return {
    nome: 'Arquimago', especie: 'Humano', classe: 'Mago', subclasse: '',
    nivel: 18, xp: 300000,
    atributos: { forca: 8, destreza: 12, constituicao: 14, inteligencia: 20, sabedoria: 10, carisma: 10 },
    classes: [{ classe: 'Mago', subclasse: '', nivel: 18, ordem: 0 }],
    grimorio: [], magias_preparadas: preparadas, magias_customizadas: customizadas,
    recursos, schema_versao: 2,
  };
}

function contar(html, agulha) {
  return html.split(agulha).length - 1;
}

function preparar(personagem, classe) {
  sheetEstado.definirClasseData(mapaDadosDisco.get(classe));
  sheetEstado.definirClassesData(mapaDadosDisco);
  sheetEstado.definirChar(personagem);
}

test('CLERIGO: personalizada "ocupa vaga" COM entrada em magias_preparadas sai em UMA linha personalizada', () => {
  const p = clerigoNivel5({
    preparadas: [{ nome: 'Chama Azul', circulo: 1, classe: 'Clérigo' }],
    customizadas: [{ nome: 'Chama Azul', circulo: 1, sempre_preparada: false, ...CAMPOS_MAGIA }],
  });
  preparar(p, 'Clérigo');

  const html = sheetMagias.renderSecaoMagias();

  assert.equal(contar(html, 'data-magia-custom-index='), 1,
    'a magia tem de sair em UMA linha personalizada (com Editar/Remover e o Conjurar que a conhece)');
  assert.equal(contar(html, 'data-magia-nome="Chama Azul"'), 0,
    'a entrada crua nao pode ser desenhada pelo ramo do acervo: descricao vazia e Conjurar errado (issue #39)');
  assert.ok(!html.includes('<span class="contador-label">Personalizadas</span>'),
    'o chip "Personalizadas" ("nao gastam vaga") nao pode contar uma magia que ocupa vaga de verdade');
  assert.ok(!html.includes('Não preparada'),
    'com a entrada gravada presente, a magia esta preparada');
});

test('CLERIGO: personalizada "ocupa vaga" SEM entrada gravada continua na ficha, marcada "Não preparada"', () => {
  // Caso (c) do Critical 1: o jogador tirou a magia pelo "x" das
  // preparadas. Sem esta linha ela desapareceria da ficha levando os
  // unicos botoes de Editar/Remover que tem.
  const p = clerigoNivel5({
    customizadas: [{ nome: 'Chama Azul', circulo: 1, sempre_preparada: false, ...CAMPOS_MAGIA }],
  });
  preparar(p, 'Clérigo');

  const html = sheetMagias.renderSecaoMagias();

  assert.equal(contar(html, 'data-magia-custom-index='), 1, 'a magia continua desenhada');
  assert.ok(html.includes('Não preparada'), 'e sai marcada como nao preparada');
  assert.ok(html.includes('data-remover-magia-custom='), 'com o botao de remover');
  assert.ok(html.includes('data-editar-magia-custom='), 'e o de editar');
  assert.ok(!html.includes('data-conjurar-magia-custom='),
    'sem controles de conjuracao: ela nao esta preparada');
});

test('CLERIGO: personalizada SEMPRE PREPARADA nao muda -- linha derivada e chip "Personalizadas" (nao regride)', () => {
  const p = clerigoNivel5({
    customizadas: [{ nome: 'Chama Eterna', circulo: 1, ...CAMPOS_MAGIA }],
  });
  preparar(p, 'Clérigo');

  const html = sheetMagias.renderSecaoMagias();

  assert.equal(contar(html, 'data-magia-custom-index='), 1);
  assert.ok(html.includes('<span class="contador-label">Personalizadas</span>'),
    'a sempre preparada continua contada no chip proprio');
  assert.ok(!html.includes('Não preparada'),
    'sempre preparada nunca entra no estado "nao preparada"');
  assert.ok(html.includes('data-conjurar-magia-custom='), 'e continua conjuravel pela linha');
});

test('MAGO: personalizada "ocupa vaga" preparada a partir do grimorio nao sai duplicada em Preparadas', () => {
  // O caminho do Mago: a Tarefa 4 injeta no grimorio, o painel do grimorio
  // grava {nome, circulo, classe:'Mago'} em magias_preparadas ao preparar.
  // Aqui o grimorio TEM a magia de proposito -- por isso a contagem
  // esperada de `data-magia-custom-index` e 2 (a linha de Preparadas e a
  // linha do livro de magias), nao 1.
  const p = magoNivel18({
    preparadas: [{ nome: 'Chama Azul', circulo: 1, classe: 'Mago' }],
    customizadas: [{ nome: 'Chama Azul', circulo: 1, sempre_preparada: false, ...CAMPOS_MAGIA }],
  });
  p.grimorio = [{ nome: 'Chama Azul', circulo: 1 }];
  preparar(p, 'Mago');

  const html = sheetMagias.renderSecaoMagias();

  assert.equal(contar(html, 'data-magia-nome="Chama Azul"'), 0,
    'nenhuma linha crua do acervo: a entrada gravada foi absorvida pela linha personalizada');
  assert.equal(contar(html, 'data-magia-custom-index='), 2,
    'uma linha em Preparadas e uma no Grimorio -- nao tres (a duplicata do achado Critical 1)');
});

test('MAGO 18: personalizada escolhida em Maestria de Magias sai em UMA linha, com o selo da caracteristica', () => {
  const p = magoNivel18({
    customizadas: [{ nome: 'Chama Azul', circulo: 1, sempre_preparada: false, ...CAMPOS_MAGIA }],
    recursos: { mago: { maestria_magias: { c1: 'Chama Azul', c2: '' }, assinaturas: { m1: '', m2: '' } } },
  });
  preparar(p, 'Mago');
  // A entrada crua com `origem` vem da PRODUCAO (classes/mago.js), nao
  // escrita a mao no fixture: e ela que o achado Important 3 descreve.
  sheetMago.sincronizarMagiasFixasMago();
  const entrada = p.magias_preparadas.find(m => m.nome === 'Chama Azul');
  assert.ok(entrada, 'sanity: sincronizarMagiasFixasMago tem de gravar a escolha em magias_preparadas');
  assert.equal(entrada.origem, 'maestria_magias', 'sanity: com a origem da caracteristica');

  const html = sheetMagias.renderSecaoMagias();

  assert.equal(contar(html, 'data-magia-custom-index='), 1,
    'UMA linha: a crua (estrela + Conjurar do acervo) e a derivada saiam as duas');
  assert.equal(contar(html, 'data-magia-nome="Chama Azul"'), 0);
  assert.ok(html.includes('Maestria de Magias'),
    'o selo da caracteristica acompanha a linha unica, em vez de ficar na linha crua');
});

test('MAGO 18: o indicador de conjuracao gratuita acompanha a linha personalizada absorvida', () => {
  // Guarda do "Grátis" do achado Important 3: `gratis_usado` mora na
  // entrada gravada, e absorver a entrada nao pode perder o indicador --
  // senao a conjuracao gratuita fica numa linha que nao sabe conjurar a
  // magia. Posto aqui a mao porque a gravacao de Maestria/Assinatura nao
  // usa esse campo hoje (so `origem`); o campo vem das magias concedidas
  // por talento (levelup.js, talentos.js).
  const p = magoNivel18({
    preparadas: [{ nome: 'Chama Azul', circulo: 1, origem: 'maestria_magias', gratis_usado: false }],
    customizadas: [{ nome: 'Chama Azul', circulo: 1, sempre_preparada: false, ...CAMPOS_MAGIA }],
    recursos: { mago: { maestria_magias: { c1: 'Chama Azul', c2: '' }, assinaturas: { m1: '', m2: '' } } },
  });
  preparar(p, 'Mago');

  const html = sheetMagias.renderSecaoMagias();

  assert.equal(contar(html, 'data-magia-custom-index='), 1);
  assert.equal(contar(html, 'data-magia-nome="Chama Azul"'), 0,
    'sem a linha crua, o unico lugar onde o botao "Grátis" pode estar e a linha personalizada');
  assert.equal(contar(html, 'data-conjurar-gratis="Chama Azul"'), 1,
    'o botao "Grátis" tem de sair NA linha personalizada, uma vez so');
});
