// ============================================================
// Issue #64 -- o catálogo de armaduras (dados/equipamento/armaduras.json)
// guardava "Placas" e "Placas Parcial" sem o prefixo "Armadura de", que o
// nome oficial do livro (PHB 2024, pág. 220) usa. O item novo copia o
// nome do catálogo no momento em que é adicionado ao inventário
// (site/js/itens-seletor.js:153,178 -- `nome: a.nome`), então corrigir
// aqui só afeta armaduras adicionadas DAQUI PRA FRENTE; uma ficha com a
// armadura já equipada guarda sua própria cópia congelada em `dados` e
// não precisa de migração (ver site/js/utils.js:427 `calcCA`, que lê
// `armadura.dados`, nunca o catálogo ao vivo).
// ============================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { RAIZ } from './harness.mjs';

const armaduras = JSON.parse(readFileSync(resolve(RAIZ, 'dados/equipamento/armaduras.json'), 'utf-8'));
const nomes = armaduras.armaduras.map(a => a.nome);

test('catálogo de armaduras usa o nome completo do livro para Placas', () => {
  assert.ok(nomes.includes('Armadura de Placas'), 'falta "Armadura de Placas"');
  assert.ok(!nomes.includes('Placas'), 'nome antigo sem prefixo não pode sobrar');
});

test('catálogo de armaduras usa o nome completo do livro para Placas Parcial', () => {
  assert.ok(nomes.includes('Armadura de Placas Parcial'), 'falta "Armadura de Placas Parcial"');
  assert.ok(!nomes.includes('Placas Parcial'), 'nome antigo sem prefixo não pode sobrar');
});
