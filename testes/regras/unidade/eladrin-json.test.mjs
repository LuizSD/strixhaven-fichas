import test from 'node:test';
import assert from 'node:assert/strict';
import { migrarDocumento, serializarDocumento, lerDocumento, nomeArquivo } from '../../../site/js/documento-json.js';
import { migrarEladrin, estadoEladrin, descansarEladrin, ESTACOES } from '../../../site/js/eladrin.js';
import { modulosApp } from './harness.mjs';
const ficha = (id='a', nome='Jade') => migrarDocumento({id,nome,nivel:1,especie:'Eladrin',atributos:{carisma:16},atualizado_em:'2026-01-01T00:00:00.000Z',revision:1});
const validar = p => !!p?.id && !!p?.nome && p.nivel >= 1 && !!p.atributos;
test('Eladrin MPMM idempotente, níveis 1 e 3, estações e descanso',()=>{
  const p=migrarEladrin(ficha());const antes=JSON.stringify(p);migrarEladrin(p);assert.equal(JSON.stringify(p),antes);
  assert.equal(p.pericias_proficientes.filter(x=>x==='Percepção').length,1);assert.equal(estadoEladrin(p).cd,13);assert.equal(estadoEladrin(p).max,2);assert.match(estadoEladrin(p).efeito,/nível 3/);
  p.nivel=3;for(const k of Object.keys(ESTACOES)){p.eladrin.estacao=k;assert.equal(estadoEladrin(p).efeito,ESTACOES[k][3])}
  p.eladrin.usosGastos=2;p.eladrin.proficienciasTranse=[{nome:'Espada',tipo:'arma'}];descansarEladrin(p);assert.equal(estadoEladrin(p).atuais,2);assert.deepEqual(p.eladrin.proficienciasTranse,[]);
});
test('JSON canônico completo, nome e migração estável',()=>{
 const p=ficha();p.artificerUA={infusoes:['a']};p.galeria=[{url:'https://example.org/x.png'}];p.eladrin={estacao:'verao'};
 assert.deepEqual(lerDocumento(serializarDocumento(p),validar),p);assert.equal(nomeArquivo('  Gallurium Duts  '),'Gallurium Duts.json');assert.equal(nomeArquivo(''),'Personagem.json');assert.equal(nomeArquivo('A/B'),'A_B.json');assert.throws(()=>lerDocumento('{}',validar));
});
test('store: salvar conteúdo igual não incrementa revisão; ficha sem nome é reimportável',async()=>{
 await modulosApp();const s=await import('../../../site/js/store.js');
 const p=s.criarPersonagemVazio();p.nome='';p.classe='Guerreiro';s.salvarPersonagem(p);
 const carregado=s.getPersonagem(p.id);s.salvarPersonagem(carregado);const revisao=carregado.revision;
 s.salvarPersonagem(carregado);assert.equal(carregado.revision,revisao);
 const texto=s.exportarPersonagem(p.id);assert.equal(JSON.parse(texto)[0].nome,'');assert(s._validarPersonagem(JSON.parse(texto)[0]));assert.equal(nomeArquivo(carregado.nome),'Personagem.json');
 carregado.notas='alterada';s.salvarPersonagem(carregado);assert.equal(carregado.revision,revisao+1);
});
