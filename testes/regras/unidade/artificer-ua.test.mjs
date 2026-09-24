import test from 'node:test';
import assert from 'node:assert/strict';
import { ARTIFICER_ID as ID, PROGRESSAO_UA, INFUSOES_UA, REPLICAS_UA, ESPECIALIZACOES_UA, CLASSE_UA } from '../../../site/js/artificer-ua/dados.js';
import { MAGIAS_UA } from '../../../site/js/artificer-ua/magias-dados.js';
import { migrarUA, estadoUA, limitePreparadasUA, registrarMagiaUA, avisosUA, definirEspecializacaoUA, recursosUA, descansarUA, gastarRecursoUA, companheiroUA, aprenderInfusaoUA, infundirUA, periciasMenteUA, bonusSalvaguardasUA } from '../../../site/js/artificer-ua/modelo.js';
import { nivelConjurador, espacosPorCirculo } from '../../../site/js/regras-multiclasse-conjuracao.js';
import { modulosApp } from './harness.mjs';
import { rotuloLocalizado, tituloFonteLocalizado } from '../../../site/js/catalogo-localizado.js';
const ficha=(nivel=1,subclasse='',inteligencia=16)=>migrarUA({classe:ID,nivel,classes:[{classe:ID,nivel,subclasse,ordem:0}],atributos:{inteligencia,forca:13,destreza:13,constituicao:14,sabedoria:13,carisma:13},magias_conhecidas:[],magias_preparadas:[],inventario:[]});
const slots=['20000','20000','30000','30000','42000','42000','43000','43000','43200','43200','43300','43300','43310','43310','43320','43320','43331','43331','43332','43332'];
const conhecidos=[0,3,3,4,4,4,5,5,5,5,6,6,6,6,7,7,7,7,8,8];
const infundidos=[0,2,2,2,2,3,3,3,3,3,4,4,4,4,4,5,5,5,5,5];
test('UA: apresentação sem etiqueta preserva metadados e escolhas exportáveis',async()=>{
 await modulosApp();
 const {htmlComplemento,camposExportaveis}=await import('../../../site/js/strixhaven/exportacao.js');
 const p=ficha(12,'alchemist');aprenderInfusaoUA(p,'replicate-magic-item','winged-boots');
 registrarMagiaUA(p,MAGIAS_UA.novas.find(m=>m.id==='ua-2019-arcane-weapon'),'preparada');
 const antes=JSON.stringify(p);
 const html=htmlComplemento(p);
 assert.match(html,/Artífice \/ Artificer/);assert.match(html,/winged-boots/);assert.match(html,/Arma Arcana/);
 assert.doesNotMatch(html,/UA 2019 · Playtest|ua-2019-playtest/);
 for(const r of [CLASSE_UA,...ESPECIALIZACOES_UA,...INFUSOES_UA,...REPLICAS_UA]) assert.doesNotMatch(rotuloLocalizado(r),/UA 2019 · Playtest/);
 assert.equal(tituloFonteLocalizado(CLASSE_UA.source),'Artífice / Artificer');
 assert.equal(JSON.stringify(p),antes);
 assert.equal(p.classe,ID);assert.equal(p.artificerUA.rulesVersion,'ua-2019-playtest');
 assert(camposExportaveis(p).some(c=>c.valor==='UA 2019 · Playtest'));
});
for(let nivel=1;nivel<=20;nivel++) test(`UA: progressão independente no nível ${nivel}`,()=>{
 const r=PROGRESSAO_UA[nivel-1],p=ficha(nivel);assert.equal(r.nivel,nivel);assert.equal(r.pb,Math.ceil(nivel/4)+1);
 assert.equal(r.infusoes,conhecidos[nivel-1]);assert.equal(r.itens,infundidos[nivel-1]);assert.equal(r.truques,nivel>=14?4:nivel>=10?3:2);assert.equal(r.espacos.join(''),slots[nivel-1]);
 assert.equal(estadoUA(p).cd,8+r.pb+3);assert.equal(estadoUA(p).ataque,r.pb+3);assert.equal(CLASSE_UA.tabela_caracteristicas[nivel-1]['1'],String(r.espacos[0]));
});
test('UA: preparo INT baixa, média, alta e nível de classe, não total',()=>{
 for(const [n,int,total] of [[1,6,1],[1,16,3],[5,14,4],[20,20,15],[3,20,6]]) assert.equal(limitePreparadasUA(n,int),total);
 const p=ficha(3);p.classes.push({classe:'Mago',nivel:8,ordem:1});p.nivel=11;assert.equal(estadoUA(p).limitePreparadas,4);assert.equal(estadoUA(p).cd,15);
});
test('UA: 88 associações, referências canônicas únicas, origem XGE e Arcane Weapon',()=>{
 assert.deepEqual(Array.from({length:6},(_,i)=>MAGIAS_UA.associacoes.filter(a=>a.circulo===i).length),[19,17,20,14,11,7]);
 assert.equal(new Set(MAGIAS_UA.associacoes.map(a=>a.spellId)).size,88);
 for(const a of MAGIAS_UA.associacoes){assert.equal(a.classId,ID);assert.equal(a.source.printedPage,4);assert.equal(MAGIAS_UA.referencias[a.spellId].circulo,a.circulo);}
 assert.equal(MAGIAS_UA.novas.filter(m=>m.source.sourceId==='xge-2017').length,16);
 const a=MAGIAS_UA.novas.find(m=>m.id==='ua-2019-arcane-weapon');assert.equal(a.source.rulesVersion,'ua-2019-playtest');assert.equal(a.circulo,1);assert.equal(a.source.printedPage,14);assert.deepEqual(a.upcast,{minCircle:3,durationHours:8});assert.equal(a.damage.dice,'1d6');
});
for(const s of ESPECIALIZACOES_UA) test(`UA: ${s.name.en} nos níveis 3, 6 e 14; sempre preparadas fora da cota`,()=>{
 for(const [n,qtd] of [[3,2],[6,4],[14,8],[17,10]]){const p=ficha(n,s.id);const e=estadoUA(p);assert.equal(e.sempre.length,qtd);assert.equal(e.preparadas.length,0);assert.equal(p.magias_preparadas.length,qtd);assert.equal(s.caracteristicas.some(f=>f.nivel===3),true);assert.equal(s.caracteristicas.some(f=>f.nivel===6),true);assert.equal(s.caracteristicas.some(f=>f.nivel===14),true);}
});
test('UA: escolhas livres não concedem espaços e permanecem após reduzir nível',()=>{
 const p=ficha(20);registrarMagiaUA(p,{id:'manual-wish',nome:'Desejo da mesa',circulo:9,source:{rulesVersion:'custom'}},'preparada');
 assert.equal(p.espacos_magia,undefined);p.classes[0].nivel=1;p.nivel=1;migrarUA(p);assert.equal(p.magias_preparadas.length,1);assert(avisosUA(p).some(a=>a.codigo.startsWith('CIRCULO')));
 const antes=JSON.stringify(p);migrarUA(p);assert.equal(JSON.stringify(p),antes);const copia=JSON.parse(antes);migrarUA(copia);assert.deepEqual(copia,p);
});
test('UA: especialização em nível reduzido arquiva automáticas sem apagar escolhas',()=>{
 const p=ficha(14,'battle-smith');const b=aprenderInfusaoUA(p,'enhanced-defense');infundirUA(p,b.id,{item:'Escudo',tipo:'escudo'});p.classes[0].nivel=2;p.nivel=2;migrarUA(p);assert.equal(p.magias_preparadas.length,0);assert.equal(p.artificerUA.sempreArquivadas.length,8);assert.equal(p.artificerUA.infusoes.length,1);assert.equal(p.artificerUA.itensInfundidos.length,1);p.classes[0].nivel=14;p.nivel=14;migrarUA(p);assert.equal(p.magias_preparadas.length,8);
});
test('UA: infusões completas, três tabelas e substituição encerra itens anteriores',()=>{
 assert.equal(INFUSOES_UA.length,11);assert.deepEqual([0,12,16].map(n=>REPLICAS_UA.filter(r=>r.nivel===n).length),[10,26,12]);assert.equal(new Set(REPLICAS_UA.map(r=>r.id)).size,48);
 const p=ficha(2);const a=aprenderInfusaoUA(p,'replicate-magic-item','bag-of-holding');aprenderInfusaoUA(p,'replicate-magic-item','alchemy-jug');assert.throws(()=>aprenderInfusaoUA(p,'replicate-magic-item','bag-of-holding'));
 const item=infundirUA(p,a.id,{item:'Bolsa',tipo:'replica'});aprenderInfusaoUA(p,'radiant-weapon','',a.id);assert.equal(item.ativa,false);assert(avisosUA(p).some(a=>a.codigo.startsWith('NIVEL')));
});
test('UA: recursos diários distintos de descanso; companheiros escalam com PB total',()=>{
 const p=ficha(6,'alchemist');gastarRecursoUA(p,'salve');descansarUA(p,'curto');assert.equal(recursosUA(p).find(r=>r.id==='salve').usados,1);descansarUA(p,'dia');assert.equal(recursosUA(p).find(r=>r.id==='salve').usados,0);
 assert.equal(companheiroUA(p,'homunculus').pvMax,33);assert.equal(companheiroUA(p,'homunculus').ataque,5);
 definirEspecializacaoUA(p,'battle-smith');gastarRecursoUA(p,'jolt');descansarUA(p,'longo');assert.equal(recursosUA(p).find(r=>r.id==='jolt').usados,0);assert.equal(companheiroUA(p,'iron-defender').pvMax,35);
 p.classes.push({classe:'Mago',nivel:5,ordem:1});p.nivel=11;assert.equal(companheiroUA(p,'iron-defender').ataque,6);assert.equal(companheiroUA(p,'iron-defender').pvMax,35);
});
test('UA: mente só concede perícias enquanto portando; Alma conta sintonização sem duplicar inventário',()=>{
 const p=ficha(20,'archivist');p.artificerUA.mente={material:'vegetal',portando:true,pericias:['História','Investigação']};assert.equal(periciasMenteUA(p).length,2);p.artificerUA.mente.portando=false;assert.equal(periciasMenteUA(p).length,0);
 p.inventario=[{id:'a',dados:{requer_sintonizacao:true},sintonizado:true}];p.artificerUA.sintonizacoes=[{id:'s',itemId:'a',ativa:true},{id:'b',ativa:true}];assert.equal(bonusSalvaguardasUA(p),2);
});
test('UA: multiclasse arredonda metade para cima sem afetar Mago/Paladino',async()=>{
 const {podeEntrarEm}=(await modulosApp()).multiclasseProgressao;
 const p=ficha(3);p.classes.push({classe:'Mago',nivel:2,ordem:1});p.nivel=5;assert.equal(nivelConjurador(p),4);assert.deepEqual(espacosPorCirculo(p),{1:4,2:3});
 const mago={classe:'Mago',nivel:3,atributos:{inteligencia:12},classes:[{classe:'Mago',nivel:3,ordem:0}]};assert.equal(podeEntrarEm(mago,ID).permitido,false);
 const antiga={classe:'Paladino',nivel:3,classes:[{classe:'Paladino',nivel:3,ordem:0},{classe:'Mago',nivel:2,ordem:1}]};assert.equal(nivelConjurador(antiga),4);const before=JSON.stringify(antiga);migrarUA(antiga);assert.equal(JSON.stringify(antiga),before);
});
