import { ARTIFICER_ID, UA_VERSION, fonteUA, PROGRESSAO_UA, ESPECIALIZACOES_UA, INFUSOES_UA, REPLICAS_UA, MATERIAIS_MENTE } from './dados.js';
import { MAGIAS_UA } from './magias-dados.js';
import { migrarParaMulticlasse, sincronizarEspelhos } from '../regras-multiclasse.js';

const uuid=()=>globalThis.crypto?.randomUUID?.() || `ua-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export const entradaUA=p=>(p?.classes?.length ? p.classes.find(c=>c.classe===ARTIFICER_ID || c.classId===ARTIFICER_ID) : p?.classe===ARTIFICER_ID ? p : null);
export const nivelUA=p=>Number(entradaUA(p)?.nivel)||0;
export const subclasseUA=p=>entradaUA(p)?.subclasse || p?.artificerUA?.especializacao || '';
export const modIntUA=p=>Math.floor(((Number(p?.atributos?.inteligencia)||10)-10)/2);
export const pbUA=p=>Math.ceil((p?.classes?.length ? p.classes.reduce((s,c)=>s+(Number(c.nivel)||0),0) : Number(p?.nivel)||1)/4)+1;
export const progressaoUA=n=>PROGRESSAO_UA[Math.max(0,Math.min(19,Number(n)-1))];
export const limitePreparadasUA=(n,int)=>Math.max(1,Math.floor((int-10)/2)+Math.floor(n/2));
export const semprePreparadasUA=p=>(MAGIAS_UA.especializacoes[subclasseUA(p)] || []).filter(m=>m.nivel<=nivelUA(p));
export const identidadeMagiaUA=m=>m.catalogo_ref || m.id;
const listaIds=new Set(MAGIAS_UA.associacoes.map(a=>a.spellId));
export const magiaDaListaUA=m=>listaIds.has(typeof m==='string'?m:identidadeMagiaUA(m));
export const periciasMenteUA=p=>nivelUA(p)>=3 && subclasseUA(p)==='archivist' && p.artificerUA?.mente?.portando ? (p.artificerUA.mente.pericias || []).filter(x=>MATERIAIS_MENTE[p.artificerUA.mente.material]?.includes(x)) : [];
export const sintonizadosUA=p=>[...new Map([...(p?.inventario || []).filter(i=>i.sintonizado && i.dados?.requer_sintonizacao).map(i=>[i.id,i]),...(p?.artificerUA?.sintonizacoes || []).filter(x=>x.ativa).map(x=>[x.itemId || x.id,x])]).values()];
export const bonusSalvaguardasUA=p=>nivelUA(p)>=20?sintonizadosUA(p).length:0;
export function efeitosItemUA(p,item) {
 const i=(p.artificerUA?.itensInfundidos || []).find(x=>x.ativa && x.itemId && x.itemId===item?.id);
 if(!i || !nivelUA(p))return {magico:!!item?.dados?.magico,ataque:0,dano:0,ca:0,ataqueMagia:0};
 const def=INFUSOES_UA.find(x=>x.id===i.infusionId),ativo=!def?.sintonizacao || i.sintonizado;
 const aprimorado=nivelUA(p)>=12?2:1;
 return {magico:true,ataque:ativo&&['enhanced-weapon','radiant-weapon','repeating-shot','returning-weapon'].includes(i.infusionId)?(i.infusionId==='enhanced-weapon'?aprimorado:1):0,dano:ativo&&['enhanced-weapon','radiant-weapon','repeating-shot','returning-weapon'].includes(i.infusionId)?(i.infusionId==='enhanced-weapon'?aprimorado:1):0,ca:ativo&&['enhanced-defense','repulsion-shield'].includes(i.infusionId)?(i.infusionId==='enhanced-defense'?aprimorado:1):0,ataqueMagia:ativo&&i.infusionId==='enhanced-wand'?aprimorado:0};
}
export const bonusAtaqueMagiaUA=p=>Math.max(0,...(p.inventario || []).filter(i=>i.equipado).map(i=>efeitosItemUA(p,i).ataqueMagia));
export const bonusCaUA=p=>(p.inventario || []).filter(i=>i.equipado).reduce((s,i)=>s+efeitosItemUA(p,i).ca,0);
export const battleReadyUA=(p,item)=>nivelUA(p)>=3 && subclasseUA(p)==='battle-smith' && efeitosItemUA(p,item).magico;
export function defesasUA(p) {
 const resistencias=[],imunidades=[];
 if(nivelUA(p)>=14 && subclasseUA(p)==='alchemist'){resistencias.push('Ácido','Veneno');imunidades.push('Envenenado (UA 2019)');}
 for(const i of p.artificerUA?.itensInfundidos || [])if(i.ativa && i.sintonizado && i.infusionId==='resistant-armor' && (p.inventario || []).some(x=>x.id===i.itemId&&x.equipado) && i.resistencia)resistencias.push(i.resistencia);
 return {resistencias:[...new Set(resistencias)],imunidades};
}

export function migrarUA(p) {
  if (!p || !nivelUA(p)) return p;
  const c=entradaUA(p); c.classId=ARTIFICER_ID; c.rulesVersion=UA_VERSION; c.source ??= fonteUA(2);
  const u=p.artificerUA ??= {};
  u.schemaVersion ??= 1; u.classId=ARTIFICER_ID; u.rulesVersion=UA_VERSION; u.source ??= fonteUA(1);
  u.especializacao=c.subclasse || u.especializacao || '';
  u.infusoes ??= []; u.itensInfundidos ??= []; u.engenhocas ??= []; u.registradas ??= []; u.historico ??= [];
  u.recursos ??= {}; u.companheiros ??= {}; u.torretas ??= []; u.mente ??= {material:'vegetal',pericias:[],manifestada:false,portando:true};
  u.varinha ??= {truques:[],ativa:false}; u.armazenador ??= {item:'',spellId:'',usados:0};
  u.sintonizacoes ??= []; u.justificativa ??= ''; u.escolhas ??= {ferramenta:'',equipamento:'pendente'};
  p.proficiencias_ferramentas ??= [];
  const ferramentas=['Ferramentas de Ladrão','Ferramentas de Funileiro',...(nivelUA(p)>=3?(ESPECIALIZACOES_UA.find(s=>s.id===u.especializacao)?.ferramentas || []):[]),...(u.escolhas.ferramenta?[u.escolhas.ferramenta]:[])];
  for(const f of ferramentas) if(!p.proficiencias_ferramentas.includes(f))p.proficiencias_ferramentas.push(f);
  if (u.nivelAnterior != null && u.nivelAnterior!==nivelUA(p)) {
    if(nivelUA(p)>u.nivelAnterior){u.trocaTruqueDisponivel=true;u.trocaInfusaoDisponivel=true;}
    u.historico.push({tipo:'nivel',de:u.nivelAnterior,para:nivelUA(p),source:fonteUA(2)});
  }
  u.nivelAnterior=nivelUA(p);
  // Só os vínculos automáticos próprios são reconciliados. Estado e escolhas manuais ficam.
  const sempre=new Set(semprePreparadasUA(p).map(a=>a.spellId));
  p.magias_preparadas ??= [];
  u.sempreArquivadas ??= [];
  p.magias_preparadas=p.magias_preparadas.filter(m=>{
    if(m.uaAutomatica && !sempre.has(identidadeMagiaUA(m))) { if(!u.sempreArquivadas.some(x=>x.id===m.id)) u.sempreArquivadas.push(m); return false; }
    if(m.uaOrigemAnterior!==undefined && !sempre.has(identidadeMagiaUA(m))) { m.origem=m.uaOrigemAnterior; delete m.uaOrigemAnterior; delete m.sempre_preparada; }
    return true;
  });
  for(const a of semprePreparadasUA(p)) {
    const atual=p.magias_preparadas.find(m=>identidadeMagiaUA(m)===a.spellId && m.classe===ARTIFICER_ID);
    if(atual) { if(!atual.uaAutomatica && atual.uaOrigemAnterior===undefined) atual.uaOrigemAnterior=atual.origem || ''; atual.origem='sempre'; atual.sempre_preparada=true; }
    else p.magias_preparadas.push({...MAGIAS_UA.referencias[a.spellId],classe:ARTIFICER_ID,catalogo_ref:a.spellId,origem:'sempre',sempre_preparada:true,uaAutomatica:true,association:a});
  }
  return p;
}

export function estadoUA(p) {
  const n=nivelUA(p),r=progressaoUA(n),int=modIntUA(p),pb=pbUA(p),u=p?.artificerUA || {};
  const sempre=new Set(semprePreparadasUA(p).map(a=>a.spellId));
  const extras=(p?.magias_customizadas || []).filter(m=>m.classe===ARTIFICER_ID && m.sempre_preparada===false && !['registrada','grimório'].includes(m.estado_extra));
  const unicas=lista=>[...new Map(lista.map(m=>[identidadeMagiaUA(m),m])).values()];
  const preparadas=unicas([...(p?.magias_preparadas || []),...extras.filter(m=>Number(m.circulo)>0 && ['preparada','sempre preparada'].includes(m.estado_extra))].filter(m=>m.classe===ARTIFICER_ID && !sempre.has(identidadeMagiaUA(m)) && m.origem!=='sempre'));
  const truques=unicas([...(p?.magias_conhecidas || []),...extras].filter(m=>m.classe===ARTIFICER_ID && Number(m.circulo)===0));
  return {nivel:n,subclasse:subclasseUA(p),...r,int,pb,cd:8+pb+int,ataque:pb+int+bonusAtaqueMagiaUA(p),limitePreparadas:Math.max(1,int+Math.floor(n/2)),preparadas,truques,sempre:semprePreparadasUA(p),engenhocas:Math.max(1,int),armazenador:Math.max(2,2*int),sintonizacoes:n>=20?6:3,bonusSalvaguardas:bonusSalvaguardasUA(p)};
}

export function recursosUA(p) {
  if(!nivelUA(p)) return [];
  const n=nivelUA(p),s=subclasseUA(p),int=Math.max(1,modIntUA(p));
  const recursos=[];
  const add=(id,nome,max,recarga,page)=>recursos.push({id,nome,max,recarga,source:fonteUA(page),usados:Number(p.artificerUA?.recursos?.[id]?.usados)||0});
  if(n>=3 && s==='alchemist') {add('salve','Salva Alquímica / Alchemical Salve',3,'dia',7); if(n>=6)add('lesser-restoration','Restauração Menor gratuita',int,'dia',7); if(n>=14)add('greater-restoration','Restauração Maior gratuita',1,'longo',7);}
  if(n>=3 && s==='archivist') {add('manifest-cast','Conjurar pela Mente / Manifest Mind',int,'longo',8);if(n>=14)add('infoportation','Infoportação / Infoportation',1,'longo',9);}
  if(n>=3 && s==='artillerist') add('turret','Torretas gratuitas / Arcane Turret',n>=14?2:1,'longo',10);
  if(n>=3 && s==='battle-smith') {add('repair','Reparar / Repair',3,'dia',12);if(n>=6)add('jolt','Impulso Arcano / Arcane Jolt',int,'longo',12);}
  for(const i of p.artificerUA?.itensInfundidos || []) if(i.ativa && ['radiant-weapon','repulsion-shield'].includes(i.infusionId)) add(`infusion-${i.id}`,`${INFUSOES_UA.find(f=>f.id===i.infusionId)?.nome} · reação`,1,'portador',13);
  return recursos;
}
export function gastarRecursoUA(p,id,delta=1) {
  migrarUA(p); const r=p.artificerUA.recursos[id] ??= {usados:0}; r.usados=Math.max(0,(Number(r.usados)||0)+delta);
}
export function descansarUA(p,tipo) {
  if(!nivelUA(p)) return;
  migrarUA(p); const u=p.artificerUA;
  for(const r of recursosUA(p)) if(r.recarga===tipo) u.recursos[r.id]={usados:0};
  if(tipo==='longo') { u.varinha.ativa=false; u.torretas.forEach(t=>{t.ativa=false;}); }
  if(['curto','longo'].includes(tipo) && nivelUA(p)>=10) u.trocaTruqueDisponivel=true;
  u.historico.push({tipo:'descanso',descanso:tipo,source:fonteUA(6)});
}
export function companheiroUA(p,tipo) {
  const n=nivelUA(p),int=modIntUA(p),pb=pbUA(p),ferro=tipo==='iron-defender';
  return {tipo,source:fonteUA(ferro?11:7),ca:ferro?15:13,pvMax:5*n+int+(ferro?2:0),ataque:pb+2,dano:`1d${ferro?8:6} + ${pb}`,reparo:`2d8 + ${pb}`,percepcao:pb+2,furtividade:ferro?null:pb+2,percepcaoPassiva:10,deslocamento:ferro?'12 m':'6 m; voo 9 m',atributos:ferro?[14,12,14,4,10,6]:[4,15,11,10,10,7],imunidades:ferro?'veneno; enfeitiçado, exaustão, envenenado':'ácido, veneno; enfeitiçado, exaustão, envenenado',sentidos:'Visão no escuro 18 m; entende seus idiomas',magico:ferro && n>=6,jolt:n>=14?'4d4':'2d4',bote:n>=14?`1d4 + ${int} força`:'desvantagem no ataque'};
}
export function definirEspecializacaoUA(p,id) {
  migrarParaMulticlasse(p);
  migrarUA(p); entradaUA(p).subclasse=id; p.artificerUA.especializacao=id;
  sincronizarEspelhos(p);
  migrarUA(p);
}
export function registrarMagiaUA(p,m,estado='registrada',substituir=null,motivo='') {
  migrarUA(p); const u=p.artificerUA; const id=identidadeMagiaUA(m) || uuid();
  const snapshot={...m,id,catalogo_ref:m.catalogo_ref || m.id,classe:ARTIFICER_ID,uaClassSource:fonteUA(4)};
  const existente=u.registradas.find(x=>identidadeMagiaUA(x)===id);
  if(existente) Object.assign(existente,snapshot); else u.registradas.push(snapshot);
  if(substituir) {
    p.magias_conhecidas=(p.magias_conhecidas || []).filter(x=>x.classe!==ARTIFICER_ID || identidadeMagiaUA(x)!==substituir);
    u.historico.push({tipo:'substituicao-truque',de:substituir,para:id,nivel:nivelUA(p),motivo,permitida:!!u.trocaTruqueDisponivel,source:fonteUA(nivelUA(p)>=10?6:3)}); u.trocaTruqueDisponivel=false;
  }
  const chave=Number(m.circulo)===0?'magias_conhecidas':'magias_preparadas'; p[chave] ??= [];
  if(estado==='preparada' || estado==='conhecida') {
    const anterior=p[chave].find(x=>x.classe===ARTIFICER_ID && identidadeMagiaUA(x)===id);
    if(anterior)Object.assign(anterior,snapshot);else p[chave].push(snapshot);
    const outra=chave==='magias_conhecidas'?'magias_preparadas':'magias_conhecidas';
    p[outra]=(p[outra] || []).filter(x=>x.classe!==ARTIFICER_ID || identidadeMagiaUA(x)!==id || x.uaAutomatica);
  } else for(const colecao of ['magias_conhecidas','magias_preparadas'])p[colecao]=(p[colecao] || []).filter(x=>x.classe!==ARTIFICER_ID || identidadeMagiaUA(x)!==id || x.uaAutomatica);
  migrarUA(p);
}
export function aprenderInfusaoUA(p,infusionId,replicaId='',substituir=null) {
  migrarUA(p);const u=p.artificerUA;
  if(u.infusoes.some(i=>i.infusionId===infusionId && i.replicaId===replicaId && i.id!==substituir)) throw new Error('Esta infusão/item replicado já é conhecido.');
  const novo={id:uuid(),infusionId,replicaId,source:fonteUA(13)};
  if(substituir) {const antigo=u.infusoes.find(i=>i.id===substituir);u.historico.push({tipo:'substituicao-infusao',anterior:antigo,nova:novo,nivel:nivelUA(p),permitida:!!u.trocaInfusaoDisponivel,source:fonteUA(5)});u.trocaInfusaoDisponivel=false;u.infusoes=u.infusoes.filter(i=>i.id!==substituir);u.itensInfundidos.filter(i=>i.knownId===substituir).forEach(i=>{i.ativa=false;});}
  u.infusoes.push(novo);return novo;
}
export function infundirUA(p,knownId,item) {
  migrarUA(p);const conhecida=p.artificerUA.infusoes.find(i=>i.id===knownId);if(!conhecida)throw new Error('Selecione uma infusão conhecida.');
  const registro={id:uuid(),knownId,infusionId:conhecida.infusionId,replicaId:conhecida.replicaId,...item,ativa:true,source:fonteUA(5)};
  p.artificerUA.itensInfundidos.push(registro);return registro;
}
export function avisosUA(p) {
  if(!nivelUA(p))return [];
  const e=estadoUA(p),u=p.artificerUA || {},a=[];
  const add=(codigo,mensagem)=>a.push({codigo,mensagem,source:fonteUA(2),justificativa:u.justificativa || ''});
  const limiteTruques=progressaoUA(e.nivel).truques;
  if(e.truques.length!==limiteTruques)add('TRUQUES',`Truques: ${e.truques.length}/${limiteTruques}.`);
  if(e.preparadas.length>e.limitePreparadas)add('PREPARADAS',`Preparadas: ${e.preparadas.length}/${e.limitePreparadas}.`);
  if(e.nivel>=3 && !ESPECIALIZACOES_UA.some(s=>s.id===e.subclasse))add('ESPECIALIZACAO','Escolha uma especialização do UA 2019.');
  const maxCirculo=e.espacos.reduce((n,q,i)=>q?i+1:n,0);
  for(const m of [...e.truques,...e.preparadas]) {
    if(!magiaDaListaUA(m))add(`LISTA:${identidadeMagiaUA(m)}`,`${m.nome}: fora da lista-base; escolha manual preservada.`);
    if(Number(m.circulo)>maxCirculo)add(`CIRCULO:${identidadeMagiaUA(m)}`,`${m.nome}: acima do círculo da classe; registrar não concede espaços.`);
  }
  if((u.infusoes || []).length>e.infusoes)add('INFUSOES',`Infusões conhecidas: ${u.infusoes.length}/${e.infusoes}.`);
  const ativos=(u.itensInfundidos || []).filter(i=>i.ativa);
  if(ativos.length>e.itens)add('ITENS',`Itens infundidos: ${ativos.length}/${e.itens}; pelas regras a infusão mais antiga deve encerrar.`);
  const vistos=new Set();
  for(const k of u.infusoes || []) {
    const inf=INFUSOES_UA.find(i=>i.id===k.infusionId),rep=REPLICAS_UA.find(r=>r.id===k.replicaId),chave=`${k.infusionId}:${k.replicaId || ''}`;
    if(!inf || (k.infusionId==='replicate-magic-item' && !rep))add(`INFUSAO:${k.id}`,'Infusão ou item replicado não identificado.');
    if(e.nivel<Math.max(inf?.nivel || 2,rep?.nivel || 0))add(`NIVEL:${k.id}`,`${rep?.nome || inf?.nome}: pré-requisito de nível não atendido.`);
    if(vistos.has(chave))add(`DUPLICATA:${k.id}`,'Infusão repetida: Replicar Item Mágico exige itens diferentes.'); vistos.add(chave);
  }
  const objetos=new Set(),usadas=new Set();
  for(const i of ativos) {
    const inf=INFUSOES_UA.find(x=>x.id===i.infusionId);
    if(!u.infusoes?.some(k=>k.id===i.knownId))add(`DESCONHECIDA:${i.id}`,'Item ativo sem infusão conhecida.');
    const tipos=inf?.alvo.split('|') || [];
    if(i.magico || !(tipos.includes(i.tipo) || tipos.includes('arma') && ['municao','arremesso'].includes(i.tipo)))add(`ALVO:${i.id}`,`${i.item}: objeto incompatível ou previamente mágico.`);
    if(objetos.has(i.itemId || i.item))add(`OBJETO:${i.id}`,'Mesmo objeto com várias infusões.');objetos.add(i.itemId || i.item);
    if(usadas.has(i.knownId))add(`USADA:${i.id}`,'Uma infusão conhecida está em vários itens.');usadas.add(i.knownId);
    if(i.infusionId==='many-handed-pouch' && !(i.quantidade>=2 && i.quantidade<=5))add(`BOLSAS:${i.id}`,'Bolsas de Muitas Mãos exige 2–5 bolsas.');
  }
  if((u.engenhocas || []).filter(x=>x.ativa).length>e.engenhocas)add('ENGENHOCAS','Limite de Engenhoca Mágica excedido; encerre a propriedade mais antiga.');
  if((u.sintonizacoes || []).filter(x=>x.ativa).length>e.sintonizacoes)add('SINTONIZACAO',`Limite de sintonização: ${e.sintonizacoes}.`);
  for(const r of recursosUA(p))if(r.usados>r.max)add(`RECURSO:${r.id}`,`${r.nome}: ${r.usados}/${r.max} usos gastos.`);
  if(e.subclasse==='archivist' && e.nivel>=3 && ((u.mente?.pericias || []).length!==2 || u.mente.pericias.some(x=>!MATERIAIS_MENTE[u.mente.material]?.includes(x))))add('MENTE','Mente artificial: escolha duas perícias elegíveis para o material.');
  if(p.classes?.length>1 && Number(p.atributos?.inteligencia)<13)add('MULTICLASSE','Multiclasse Artífice exige Inteligência 13 para entrar/sair; divergência preservada.');
  if(u.historico?.some(h=>h.permitida===false))add('SUBSTITUICAO_MANUAL','Substituição registrada fora da janela de nível/descanso; confirme a justificativa da mesa.');
  if(u.armazenador?.usados>e.armazenador)add('ARMAZENADOR','Item armazenador esgotou suas utilizações.');
  if(u.mente?.manifestada && Number(u.mente.distancia)>90)add('MENTE_DISTANCIA','A mente deixa de manifestar a mais de 90 m do objeto.');
  return a;
}
export function resumoExportacaoUA(p) {
  if(!nivelUA(p))return null;
  const e=estadoUA(p);
  return {classe:'Artífice / Artificer',classId:ARTIFICER_ID,source:fonteUA(1),nivel:e.nivel,especializacao:ESPECIALIZACOES_UA.find(s=>s.id===e.subclasse)?.name || e.subclasse,progressao:progressaoUA(e.nivel),cd:e.cd,ataque:e.ataque,limitePreparadas:e.limitePreparadas,recursos:recursosUA(p),infusoes:(p.artificerUA?.infusoes || []).map(k=>({...k,infusao:INFUSOES_UA.find(i=>i.id===k.infusionId),replica:REPLICAS_UA.find(i=>i.id===k.replicaId)})),companheiros:['homunculus','iron-defender'].map(tipo=>companheiroUA(p,tipo)),avisos:avisosUA(p)};
}
