import test from 'node:test';
import assert from 'node:assert/strict';
import { migrarAcademia, numeroInformado, valorComAjuste } from '../../../site/js/strixhaven/modelo.js';
import { preparadasComExtrasPorClasse as preparadasPorClasse, truquesComExtrasPorClasse as truquesPorClasse } from '../../../site/js/regras-magia-classe.js';
import { modulosApp } from './harness.mjs';
await modulosApp();
const { fundirPreparadasComPersonalizadas, normalizarMagiaPersonalizada } = await import('../../../site/js/sheet/magias.js');
const { camposExportaveis } = await import('../../../site/js/strixhaven/exportacao.js');
const { migrarEdicoesLegado } = await import('../../../site/js/store.js');
const { garantirEstadoEdicoes } = await import('../../../site/js/ficha-edicoes.js');
const { normalizarGrimorioMago, calcPercepcaoPassiva } = await import('../../../site/js/utils.js');

test('migração acadêmica é aditiva, idempotente e mantém nomes iguais com IDs diferentes', () => {
  const p = { id: 'antiga', futuro: { valor: 7 }, beneficios_manuais: [{ nome: 'Benefício legado' }], magias_customizadas: [{ nome: 'Igual' }, { nome: 'Igual' }] };
  migrarAcademia(p);
  const copia = structuredClone(p);
  migrarAcademia(p);
  assert.deepEqual(p, copia);
  assert.notEqual(p.magias_customizadas[0].id, p.magias_customizadas[1].id);
  assert.equal(typeof p.beneficios_manuais[0].id, 'string');
  assert.equal(p.futuro.valor, 7);
  assert.deepEqual(migrarAcademia(JSON.parse(JSON.stringify(p))), copia);
});

test('versão futura dos metadados de edição não é descartada por leitura ou ajuste', () => {
  const p = { edicoes: { versao: 7, campos: {}, futuro: { preservar: true } } };
  migrarEdicoesLegado(p); garantirEstadoEdicoes(p);
  assert.equal(p.edicoes.versao, 7);
  assert.deepEqual(p.edicoes.futuro, { preservar: true });
});

test('multiclasse: normalizar o grimório nunca copia uma concessão extra que ocupa cota', () => {
  const p = { classe: 'Mago', nivel: 2, classes: [{ classe: 'Mago', nivel: 1, ordem: 0 }, { classe: 'Clérigo', nivel: 1, ordem: 1 }], grimorio: [], magias_preparadas: [{ nome: 'Armadura Arcana', circulo: 1, classe: 'Mago' }],
    magias_customizadas: [{ id: 'alto', origem: 'extra', nome: 'Desejo', circulo: 9, classe: 'Mago', sempre_preparada: false, estado_extra: 'preparada' }] };
  normalizarGrimorioMago(p); normalizarGrimorioMago(p);
  assert.deepEqual(p.grimorio.map(m => m.nome), ['Armadura Arcana']);
  assert.equal(p.magias_customizadas[0].id, 'alto');
  assert.equal(preparadasPorClasse(p, 'Mago').desta.length, 2);
});

test('extras fora da cota por padrão; optar pela cota afeta apenas a classe atribuída', () => {
  const p = { magias_preparadas: [{ nome: 'Bênção', circulo: 1, classe: 'Clérigo' }], magias_customizadas: [
    { id: 'x', nome: 'Bênção', circulo: 1, origem: 'extra', classe: 'Mago', estado_extra: 'preparada' },
    { id: 'y', nome: 'Luz', circulo: 0, origem: 'extra', classe: 'Mago' },
  ] };
  assert.equal(preparadasPorClasse(p, 'Mago').desta.length, 0);
  p.magias_customizadas[0].sempre_preparada = false;
  p.magias_customizadas[1].sempre_preparada = false;
  assert.equal(preparadasPorClasse(p, 'Mago').desta.length, 1);
  assert.equal(preparadasPorClasse(p, 'Mago').deOutra.length, 1);
  assert.equal(truquesPorClasse(p, 'Mago').desta.length, 1);
  const linhas = fundirPreparadasComPersonalizadas(p.magias_preparadas, p.magias_customizadas.map((m, i) => ({ ...normalizarMagiaPersonalizada(m), indicePersonalizada: i })));
  assert.equal(linhas.filter(m => m.nome === 'Bênção').length, 2);
  assert.equal(linhas.find(m => m.id === 'x').origem, 'extra');
  p.magias_customizadas[0].estado_extra = 'grimório';
  assert.equal(preparadasPorClasse(p, 'Mago').desta.length, 0);
});

test('números vazios/fracionários não são coercidos; ajustes finais não acumulam duas vezes', () => {
  assert.throws(() => numeroInformado('', 'pontos'));
  assert.throws(() => numeroInformado('1.5', 'pontos'));
  assert.equal(numeroInformado('-7', 'pontos'), -7);
  const p = { ajustes_manuais: { ca: { ajuste: 2, final: 19 } } };
  assert.equal(valorComAjuste(p, 'ca', 12), 19);
  p.ajustes_manuais.ca.final = null;
  assert.equal(valorComAjuste(p, 'ca', 12), 14);
  delete p.ajustes_manuais.ca;
  assert.equal(valorComAjuste(p, 'ca', 12), 12);
  const observador = { atributos: { sabedoria: 12 }, nivel: 1, ajustes_manuais: { 'pericia:Percepção': { ajuste: 2 } } };
  assert.equal(calcPercepcaoPassiva(observador), 13);
  observador.ajustes_manuais['pericia:Percepção'].final = 5;
  assert.equal(calcPercepcaoPassiva(observador), 15);
});

test('exportação percorre registros longos e desconhecidos, preservando IDs e três marcas', () => {
  const registros = Array.from({ length: 80 }, (_, i) => ({ id: `avaliacao-${i}`, nome: `Avaliação ${i}`, marca1: true, marca2: false, marca3: true, desconhecido: { texto: 'texto '.repeat(200) } }));
  const campos = camposExportaveis({ strixhaven: { avaliacoes: registros } });
  assert.equal(campos.length, 80 * 6);
  assert.ok(campos.some(c => c.caminho.includes('avaliacao-79') && c.valor === 'Avaliação 79'));
  assert.ok(campos.some(c => c.caminho.endsWith('marca2') && c.valor === 'false'));
});
