import { abrirModal, escHtml as h, toast } from '../utils.js';
import { rotuloLocalizado as rotulo, tituloFonteLocalizado } from '../catalogo-localizado.js';
import { getIndiceMagias, getClasse, getArmas, getArmaduras } from '../db.js';
import { classesDe } from '../regras-multiclasse.js';
import { adicionarMoeda } from '../moedas.js';
import { classesConjuradoras, nivelConjurador, usaTabelaUnificada } from '../regras-multiclasse-conjuracao.js';
import { montarReservasDeEspacos, gastarEspaco } from '../sheet/reservas-espacos.js';
import { ARTIFICER_ID, fonteUA, PROGRESSAO_UA, CARACTERISTICAS_UA, ESPECIALIZACOES_UA, INFUSOES_UA, REPLICAS_UA, MATERIAIS_MENTE, CLASSE_UA } from './dados.js';
import { MAGIAS_UA } from './magias-dados.js';
import { nivelUA, migrarUA, estadoUA, progressaoUA, avisosUA, recursosUA, gastarRecursoUA, descansarUA, companheiroUA, definirEspecializacaoUA, registrarMagiaUA, aprenderInfusaoUA, infundirUA, identidadeMagiaUA, magiaDaListaUA } from './modelo.js';

const idNovo=()=>crypto.randomUUID();
const busca=s=>String(s??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
// Literais explícitos para o inventário de gatilhos e seus testes de navegador.
const acoes={
 avisos:'data-ua-acao="avisos"',equipamento:'data-ua-acao="equipamento"',magias:'data-ua-acao="magias"',manual:'data-ua-acao="manual"',
 'trocar-truque':'data-ua-acao="trocar-truque"',magia:'data-ua-acao="magia"',infusoes:'data-ua-acao="infusoes"',infundir:'data-ua-acao="infundir"',item:'data-ua-acao="item"',
 'ferramentas-sub':'data-ua-acao="ferramentas-sub"',companheiro:'data-ua-acao="companheiro"',mente:'data-ua-acao="mente"',overload:'data-ua-acao="overload"',infoportation:'data-ua-acao="infoportation"',
 torreta:'data-ua-acao="torreta"','editar-torreta':'data-ua-acao="editar-torreta"',varinha:'data-ua-acao="varinha"',recurso:'data-ua-acao="recurso"',devolver:'data-ua-acao="devolver"',portador:'data-ua-acao="portador"',dia:'data-ua-acao="dia"',
 engenhoca:'data-ua-acao="engenhoca"','engenhoca-toggle':'data-ua-acao="engenhoca-toggle"',armazenador:'data-ua-acao="armazenador"','armazenador-usar':'data-ua-acao="armazenador-usar"',sintonizacao:'data-ua-acao="sintonizacao"'
};
const btn=(texto,acao,id='',extra='')=>`<button type="button" class="btn btn-sm btn-secondary" ${acoes[acao]} data-ua-id="${h(id)}" ${extra}>${texto}</button>`;
const campo=(id,texto,valor='',tipo='text')=>`<label>${h(texto)}<input class="form-input" id="${id}" type="${tipo}" value="${h(valor)}"></label>`;
const opcoes=(registros,valor)=>registros.map(([id,nome])=>`<option value="${h(id)}" ${String(id)===String(valor)?'selected':''}>${h(nome)}</option>`).join('');
const select=(id,texto,registros,valor='')=>`<label>${h(texto)}<select class="form-select" id="${id}">${opcoes(registros,valor)}</select></label>`;
const val=id=>document.getElementById(id)?.value || '';
const check=(id,texto,valor=false)=>`<label><input type="checkbox" id="${id}" ${valor?'checked':''}> ${h(texto)}</label>`;
const marcado=id=>!!document.getElementById(id)?.checked;
const texto=(id,label,value='')=>`<label>${h(label)}<textarea class="form-input" id="${id}">${h(value)}</textarea></label>`;
function formulario(titulo,corpo,confirmar) {
  abrirModal(titulo,`<div class="ua-form">${corpo}<p id="ua-form-erro" role="alert"></p></div>`, '<button class="btn btn-secondary" id="ua-cancelar">Cancelar</button><button class="btn btn-primary" id="ua-confirmar">Salvar</button>');
  document.getElementById('ua-cancelar').onclick=()=>window.fecharModal();
  document.getElementById('ua-confirmar').onclick=async()=>{try{await confirmar();}catch(e){document.getElementById('ua-form-erro').textContent=e.message;}};
}
const fecharSalvar=(salvar)=>{window.fecharModal();salvar();};
const blocoFeature=f=>`<details><summary>${rotulo(f)} · nível ${f.nivel}</summary><p>${h(f.descricao)}</p><small>UA 2019 · p. ${f.source.printedPage}</small></details>`;

export async function renderArtificerUA(p,el,salvar) {
  if(!el?.querySelector || !nivelUA(p))return;
  migrarUA(p);
  const indice=await getIndiceMagias({incluirLegado:true});
  if(!el.isConnected)return;
  const catalogo=indice?.magias || []; const mapa=new Map(await Promise.all(classesDe(p).map(async c=>[c.classe,await getClasse(c.classe)])));
  const e=estadoUA(p),u=p.artificerUA,r=progressaoUA(e.nivel),s=ESPECIALIZACOES_UA.find(x=>x.id===e.subclasse),avisos=avisosUA(p);
  const reservas=montarReservasDeEspacos(p,mapa); const resolver=id=>catalogo.find(m=>m.id===id) || MAGIAS_UA.referencias[id] || u.registradas.find(m=>identidadeMagiaUA(m)===id);
  const salvarAqui=()=>{migrarUA(p);salvar();};
  el.className='card ua-painel';
  el.innerHTML=`<h2>${rotulo(CLASSE_UA)}</h2><p>Nível de Artífice ${e.nivel} · d8 · PB +${e.pb} · CD ${e.cd} · ataque mágico ${e.ataque>=0?'+':''}${e.ataque}</p>
    <div class="observacoes-resumo ${avisos.length?'':'info'}"><span>${avisos.length?`⚠ ${avisos.length} observações de regras`:'Progressão conferida'}${u.justificativa?' · divergências justificadas':''}</span>${btn('Ver detalhes','avisos')}</div>
    <details><summary>Progressão, escolhas e próximo nível</summary><p>Truques ${r.truques}; infusões ${r.infusoes}; itens infundidos ${r.itens}. ${e.nivel<20?`Próximo nível: ${progressaoUA(e.nivel+1).truques} truques, ${progressaoUA(e.nivel+1).infusoes} infusões, ${progressaoUA(e.nivel+1).itens} itens.`:'Nível máximo.'}</p><p>Atributos/talento nos níveis 4, 8, 12, 16 e 19. Especialização: 3, 6 e 14.</p>
    <p>Ferramenta de artesão: ${h(u.escolhas.ferramenta || 'escolha pendente')}. Equipamento: ${h(u.escolhas.equipamento)}.</p>${btn('Ferramentas e equipamento inicial','equipamento')}
    ${PROGRESSAO_UA.map(l=>`<p>Nível ${l.nivel}: PB +${l.pb}, truques ${l.truques}, infusões ${l.infusoes}, itens ${l.itens}, espaços ${l.espacos.join(' / ')}.</p>`).join('')}</details>
    <details><summary>Características de classe</summary>${CARACTERISTICAS_UA.filter(f=>f.nivel<=e.nivel).map(blocoFeature).join('')}</details>
    <details open data-details-id="ua-conjuracao"><summary>Conjuração / Spellcasting</summary>
      <p id="ua-contadores">Preparadas da classe: ${e.preparadas.length} / ${e.limitePreparadas} · Sempre preparadas: ${e.sempre.length} · Truques: ${e.truques.length} / ${r.truques}</p>
      <p>Espaços disponíveis: ${reservas.map(x=>`${x.circulo}º ${x.fonte}: ${x.disponiveis}/${x.total}`).join(' · ') || 'nenhum'}</p>
      <details><summary>Memória do cálculo de espaços</summary><p>${classesConjuradoras(p).map(c=>`${h(c.classe===ARTIFICER_ID?'Artífice UA 2019':c.classe)} ${c.nivel}: ${c.categoria==='meia'?`ceil(${c.nivel}/2) = ${Math.ceil(c.nivel/2)}`:c.categoria==='plena'?c.nivel:`floor(${c.nivel}/3)`}`).join(' + ')}${usaTabelaUnificada(p)?` → nível de conjurador ${nivelConjurador(p)} na tabela multiclasse.`:' → tabela própria da única classe conjuradora.'}</p><p>Preparo: máx(1, ${e.int} + floor(${e.nivel}/2)) = ${e.limitePreparadas}. Selecionar magias nunca cria espaços. Foco: ferramenta proficiente em mãos; no nível 2 também item com sua infusão. Rituais exigem preparo.</p></details>
      <div class="sh-acoes">${btn('Escolher / preparar magias','magias')}${btn('Adicionar magia manual','manual')}${btn('Substituir um truque','trocar-truque')}</div>
      <details><summary>Sempre preparadas da especialização</summary>${e.sempre.map(a=>`<p>${rotulo(resolver(a.spellId))} <small>Sempre preparada · não ocupa vaga · UA p. ${a.source.printedPage}</small></p>`).join('') || '<p>Nenhuma neste nível.</p>'}</details>
      <details><summary>Registradas, truques e preparadas</summary>${[...new Map([...u.registradas,...e.truques,...e.preparadas].map(m=>[identidadeMagiaUA(m),m])).values()].map(m=>`<p>${rotulo(m)} · ${m.circulo}º ${btn('Editar estado / detalhes','magia',identidadeMagiaUA(m))}</p>`).join('') || '<p>Escolhas pendentes; é permitido salvar antes de completar.</p>'}</details>
    </details>
    <details open data-details-id="ua-infusoes"><summary>Infusões / Infusions · conhecidas ${u.infusoes.length}/${r.infusoes}, ativas ${u.itensInfundidos.filter(i=>i.ativa).length}/${r.itens}</summary>
      ${btn('Aprender / substituir infusão','infusoes')}${btn('Infundir um item','infundir')}
      ${u.infusoes.map(k=>`<p>${rotulo(INFUSOES_UA.find(i=>i.id===k.infusionId) || {nome:k.infusionId})}${k.replicaId?` · ${rotulo(REPLICAS_UA.find(i=>i.id===k.replicaId) || {nome:k.replicaId})}`:''}</p>`).join('')}
      ${u.itensInfundidos.map(i=>`<div class="ua-registro"><span>${h(i.item)} · ${h(INFUSOES_UA.find(f=>f.id===i.infusionId)?.nome || i.infusionId)} · ${i.ativa?'Ativo':'Inativo'} · ${i.sintonizado?'sintonizado':'sem sintonização'} ${i.resistencia?h('· '+i.resistencia):''}</span>${btn('Editar / ativar','item',i.id)}</div>`).join('')}
    </details>
    <details open data-details-id="ua-especializacao"><summary>Especialização / Specialist</summary>
      ${e.nivel>=3?select('ua-especializacao','Escolher especialização',[['','Selecione'],...ESPECIALIZACOES_UA.map(x=>[x.id,`${x.nome} / ${x.name.en}`])],e.subclasse):'<p>Escolha no nível 3.</p>'}
      ${s?`<p>${rotulo(s)} · ${h(s.fabricacao)}</p><p>Proficiência e ferramentas gratuitas: ${h(s.ferramentas.join(', '))}.</p>${btn('Receber ferramentas da especialização','ferramentas-sub')}${s.caracteristicas.filter(f=>f.nivel<=e.nivel).map(blocoFeature).join('')}`:''}
      ${e.nivel>=3 && ['alchemist','battle-smith'].includes(e.subclasse)?painelCompanheiro(p,e.subclasse==='alchemist'?'homunculus':'iron-defender'):''}
      ${e.nivel>=3 && e.subclasse==='archivist'?`<p>Material: ${h(u.mente.material)} · perícias: ${h(u.mente.pericias.join(', '))} · ${u.mente.manifestada?'manifestada':'não manifestada'}.</p><p>Sobrecarga: ${e.nivel>=17?4:e.nivel>=11?3:e.nivel>=5?2:1}d8${e.nivel>=6?` + ${Math.max(1,e.int)}`:''} psíquico; CD INT ${e.cd}.</p>${btn('Configurar mente / manifestação','mente')}${btn('Sobrecarga / gastar espaço','overload')}${e.nivel>=14?btn('Infoportação com espaço','infoportation'):''}`:''}
      ${e.nivel>=3 && e.subclasse==='artillerist'?`${btn('Invocar torreta','torreta')}${e.nivel>=6?btn('Configurar varinha','varinha'):''}<p>Varinha ${u.varinha.ativa?'ativa':'inativa'}: ${u.varinha.truques.map(id=>h(resolver(id)?.nome || id)).join(', ')}</p>${u.torretas.map(t=>`<div class="ua-registro">${h(t.tipo)} · CA 18 · PV ${t.pv}/${5*e.nivel} · ${t.ativa?'Ativa, 10 min':'Inativa'} · ativações ${t.ativacoes || 0} ${btn('Ativar / mover / detonar','editar-torreta',t.id)}</div>`).join('')}`:''}
    </details>
    <details open data-details-id="ua-recursos"><summary>Recursos e objetos</summary>
      ${recursosUA(p).map(x=>`<div class="ua-registro"><span>${h(x.nome)} · gastos ${x.usados}/${x.max} · recuperação: ${h(x.recarga)}</span>${btn('Usar','recurso',x.id)}${btn('Devolver uso','devolver',x.id)}${x.recarga==='portador'?btn('Descanso do portador','portador',x.id):''}</div>`).join('')}
      ${btn('Novo dia: recuperar recursos diários','dia')}<p>Os recursos marcados “dia” têm essa frequência no UA; o botão acima registra a passagem de dia. Descansos usam os controles normais da ficha.</p>
      <p>Engenhocas ativas: ${u.engenhocas.filter(x=>x.ativa).length}/${e.engenhocas}</p>${btn('Criar engenhoca','engenhoca')}${u.engenhocas.map(x=>`<p>${h(x.objeto)} · ${h(x.efeito)} · ${x.ativa?'ativa':'encerrada'} ${btn('Alternar estado','engenhoca-toggle',x.id)}</p>`).join('')}
      ${e.nivel>=18?`<p>Armazenador: ${h(u.armazenador.item || 'não configurado')} · ${h(resolver(u.armazenador.spellId)?.nome || '')} · gastos ${u.armazenador.usados}/${e.armazenador}</p>${btn('Configurar item armazenador','armazenador')}${btn('Usar item armazenador','armazenador-usar')}`:''}
      <p>Itens sintonizados: ${u.sintonizacoes.filter(x=>x.ativa).length}/${e.sintonizacoes}${e.nivel>=20?` · Alma do Artifício: +${e.bonusSalvaguardas} em todas as salvaguardas`:''}</p>${btn('Gerenciar sintonização','sintonizacao')}
      <details><summary>Histórico de escolhas e substituições</summary><pre>${h(JSON.stringify(u.historico,null,2))}</pre></details>
    </details>`;
  el.querySelector('#ua-especializacao')?.addEventListener('change',ev=>{definirEspecializacaoUA(p,ev.target.value);salvarAqui();});
  el.querySelectorAll('[data-ua-acao]').forEach(b=>b.onclick=async()=>{
    const id=b.dataset.uaId,acao=b.dataset.uaAcao;
    try {
      if(acao==='avisos') return formulario('Observações · Artífice UA 2019',`<ul>${avisos.map(a=>`<li>${h(a.mensagem)}</li>`).join('')}</ul>${texto('ua-justificativa','Justificativa opcional',u.justificativa)}`,()=>{u.justificativa=val('ua-justificativa');fecharSalvar(salvarAqui);});
      if(['magias','trocar-truque'].includes(acao)) return abrirBuscaMagiasUA(p,catalogo,salvarAqui,acao==='trocar-truque');
      if(acao==='manual' || acao==='magia') return editarMagia(p,acao==='magia'?resolver(id):null,salvarAqui);
      if(acao==='infusoes') return escolherInfusao(p,salvarAqui);
      if(acao==='infundir' || acao==='item') return editarInfusao(p,acao==='item'?u.itensInfundidos.find(i=>i.id===id):null,salvarAqui);
      if(acao==='equipamento') return equipamento(p,salvarAqui);
      if(acao==='ferramentas-sub') {
        u.ferramentasRecebidas ??= [];
        if(u.ferramentasRecebidas.includes(s.id))return toast('Ferramentas já recebidas; edite no inventário.','info');
        p.inventario ??= []; for(const nome of [...s.ferramentas,...(s.id==='artillerist'?['Varinha de madeira']:[])])p.inventario.push({id:idNovo(),nome,tipo:'equipamento',quantidade:1,equipado:false,source:s.source});u.ferramentasRecebidas.push(s.id);
      }
      if(['recurso','devolver'].includes(acao))gastarRecursoUA(p,id,acao==='recurso'?1:-1);
      if(acao==='dia')descansarUA(p,'dia');
      if(acao==='portador')u.recursos[id]={usados:0};
      if(acao==='engenhoca-toggle'){const x=u.engenhocas.find(x=>x.id===id);x.ativa=!x.ativa;}
      if(acao==='engenhoca')return formulario('Engenhoca Mágica / Magical Tinkering',campo('ua-objeto','Objeto Minúsculo não mágico')+select('ua-efeito','Propriedade',[['luz','Luz plena 1,5 m + penumbra 1,5 m'],['gravacao','Mensagem de até 6 segundos'],['som-odor','Som não verbal / odor a 3 m'],['imagem','Imagem ou texto de até 25 palavras']])+texto('ua-notas','Descrição'),()=>{if(!val('ua-objeto').trim())throw new Error('Informe o objeto.');u.engenhocas.push({id:idNovo(),objeto:val('ua-objeto'),efeito:val('ua-efeito'),notas:val('ua-notas'),ativa:true,source:fonteUA(2)});fecharSalvar(salvarAqui);});
      if(acao==='companheiro')return editarCompanheiro(p,id,salvarAqui,mapa);
      if(acao==='mente')return editarMente(p,salvarAqui);
      if(acao==='overload' || acao==='infoportation')return usarEspaco(p,mapa,acao==='infoportation'?2:1,acao==='overload'?'Sobrecarga de Informação':'Infoportação',circulo=>{u.historico.push({tipo:acao,circulo,dadosExtras:acao==='overload'?`${circulo+1}d8`:null,source:fonteUA(9)});},salvarAqui);
      if(acao==='torreta')return criarTorreta(p,mapa,salvarAqui);
      if(acao==='editar-torreta')return editarTorreta(p,id,salvarAqui);
      if(acao==='varinha' || acao==='armazenador')return configurarItemMagico(p,catalogo,acao,salvarAqui);
      if(acao==='armazenador-usar')u.armazenador.usados++;
      if(acao==='sintonizacao')return formulario('Sintonização de itens mágicos',texto('ua-sintonizados','Um item por linha; inclua itens infundidos sintonizados',u.sintonizacoes.filter(x=>x.ativa).map(x=>x.item).join('\n')),()=>{const nomes=val('ua-sintonizados').split('\n').map(x=>x.trim()).filter(Boolean);u.sintonizacoes.forEach(x=>x.ativa=nomes.includes(x.item));for(const item of nomes)if(!u.sintonizacoes.some(x=>x.item===item))u.sintonizacoes.push({id:idNovo(),item,ativa:true});fecharSalvar(salvarAqui);});
      salvarAqui();
    } catch(err) {toast(err.message,'danger');}
  });
}

function painelCompanheiro(p,tipo) {
 const c=companheiroUA(p,tipo),a=p.artificerUA.companheiros[tipo];
 return `<div class="ua-registro"><h4>${tipo==='homunculus'?'Homúnculo Alquímico / Alchemical Homunculus':'Defensor de Ferro / Iron Defender'}</h4><p>CA ${c.ca} · PV ${a?.pv??c.pvMax}/${c.pvMax} · ${h(c.deslocamento)} · ataque +${c.ataque}, ${h(c.dano)} ${tipo==='homunculus'?'ácido, alcance 9 m':'perfurante, alcance 1,5 m'}.</p><p>FOR/DES/CON/INT/SAB/CAR: ${c.atributos.join(' / ')} · Percepção +${c.percepcao}${c.furtividade?` · Furtividade +${c.furtividade}`:''} · Percepção passiva ${c.percepcaoPassiva}.</p><p>${h(c.sentidos)}. Imunidades: ${h(c.imunidades)}.</p>${btn('PV, comando, criar / reviver','companheiro',tipo)}</div>`;
}
function editarMagia(p,m,salvar) {
 const e=estadoUA(p),id=m?identidadeMagiaUA(m):null,sempre=e.sempre.some(a=>a.spellId===id);
 const selecionada=[...e.truques,...e.preparadas].some(x=>identidadeMagiaUA(x)===id);
  formulario(m?'Magia de Artífice':'Magia manual · Artífice',campo('ua-nome','Nome PT-BR (obrigatório)',m?.nome)+campo('ua-en','Nome EN',m?.name?.en)+campo('ua-circulo','Círculo (0–9)',m?.circulo??0,'number')+campo('ua-escola','Escola',m?.escola)+check('ua-ritual','Ritual',m?.ritual)+campo('ua-origem','Origem',tituloFonteLocalizado(m?.source) || 'Conteúdo manual')+campo('ua-classes','Classes / observações de associação',(m?.classes || []).join(', '))+texto('ua-descricao','Descrição',m?.descricao)+texto('ua-notas','Observações / justificativa',m?.motivo)+select('ua-estado','Estado',[['registrada','Registrada (não preparada)'],['preparada','Preparada / truque conhecido']],selecionada||sempre?'preparada':'registrada')+(sempre?'<p>Sempre preparada pela especialização; não ocupa vaga.</p>':''),()=>{
   const circulo=Number(val('ua-circulo'));if(!val('ua-nome').trim()||!Number.isInteger(circulo)||circulo<0||circulo>9)throw new Error('Informe nome e círculo inteiro de 0 a 9.');
   registrarMagiaUA(p,{...m,id:id||idNovo(),nome:val('ua-nome').trim(),name:{...m?.name,ptBR:val('ua-nome').trim(),en:val('ua-en')},circulo,escola:val('ua-escola'),ritual:marcado('ua-ritual'),descricao:val('ua-descricao'),motivo:val('ua-notas'),classes:m?.classes || val('ua-classes').split(',').map(x=>x.trim()).filter(Boolean),source:m?.source || {sourceId:'local',sourceTitle:val('ua-origem'),rulesVersion:'custom'}},val('ua-estado'));
   // Atualiza o snapshot selecionado sem mudar ID nem origem do vínculo automático.
   const novo=p.artificerUA.registradas.find(x=>identidadeMagiaUA(x)===(id || p.artificerUA.registradas.at(-1).id));
   for(const chave of ['magias_conhecidas','magias_preparadas'])for(const atual of p[chave] || [])if(atual.classe===ARTIFICER_ID && identidadeMagiaUA(atual)===identidadeMagiaUA(novo))Object.assign(atual,{nome:novo.nome,name:novo.name,descricao:novo.descricao,motivo:novo.motivo});
   fecharSalvar(salvar);
 });
}
export function abrirBuscaMagiasUA(p,catalogo,salvar,troca=false) {
 const e=estadoUA(p),sempre=new Set(e.sempre.map(a=>a.spellId));
 abrirModal(troca?'Substituir truque de Artífice':'Escolher magias · Artífice UA 2019',`<p data-dialogo-descricao>Seleções fora da lista e acima do limite são preservadas com avisos. Espaços não mudam.</p><div class="ua-form">${campo('ua-busca','Buscar PT-BR / EN')}${check('ua-global','Mega busca: todas as classes e círculos')}${select('ua-f-circulo','Círculo',[['','Todos'],...Array.from({length:10},(_,i)=>[i,i])])}${select('ua-f-escola','Escola',[['','Todas'],...[...new Set(catalogo.map(m=>m.escola).filter(Boolean))].sort().map(x=>[x,x])])}${select('ua-f-ritual','Ritual',[['','Todos'],['sim','Ritual'],['nao','Não ritual']])}${select('ua-f-preparada','Estado',[['','Todos'],['sim','Preparada / conhecida'],['nao','Não preparada']])}${select('ua-f-origem','Origem',[['','Todas'],...[...new Set(catalogo.map(m=>m.source?.sourceId).filter(Boolean))].map(x=>[x,x])])}${select('ua-f-versao','Versão de regras',[['','Todas'],...[...new Set(catalogo.map(m=>m.source?.rulesVersion).filter(Boolean))].map(x=>[x,x])])}${troca?select('ua-substituir','Truque a substituir',e.truques.map(m=>[identidadeMagiaUA(m),m.nome]))+campo('ua-motivo-troca','Motivo: nível / descanso / correção manual'):''}</div><p id="ua-editor-aviso" role="status"></p><div id="ua-resultados" class="sh-resultados"></div>`);
 const atualizar=()=>{
   const atual=estadoUA(p),selecionadas=new Set([...atual.truques,...atual.preparadas,...atual.sempre.map(a=>({id:a.spellId}))].map(identidadeMagiaUA));
   const resultados=catalogo.filter(m=>(marcado('ua-global') || magiaDaListaUA(m) || sempre.has(m.id))&&(!troca||m.circulo===0)&&busca([m.nome,m.name?.en,...(m.name?.aliases||[])].join(' ')).includes(busca(val('ua-busca')))&&(val('ua-f-circulo')===''||Number(val('ua-f-circulo'))===Number(m.circulo))&&(!val('ua-f-escola')||m.escola===val('ua-f-escola'))&&(!val('ua-f-ritual')||(!!m.ritual)===(val('ua-f-ritual')==='sim'))&&(!val('ua-f-preparada')||selecionadas.has(m.id)===(val('ua-f-preparada')==='sim'))&&(!val('ua-f-origem')||m.source?.sourceId===val('ua-f-origem'))&&(!val('ua-f-versao')||m.source?.rulesVersion===val('ua-f-versao')));
   // Edições canônicas existentes continuam distinguíveis pelo filtro de versão;
   // dentro da mesma versão, um ID só produz um resultado.
   const unicos=[...new Map(resultados.map(m=>[m.id,m])).values()];
   document.getElementById('ua-editor-aviso').textContent=`Truques ${atual.truques.length}/${progressaoUA(atual.nivel).truques}; preparadas ${atual.preparadas.length}/${atual.limitePreparadas}. ${avisosUA(p).map(a=>a.mensagem).join(' ')}`;
   document.getElementById('ua-resultados').innerHTML=`<p>${unicos.length} resultados</p>`+unicos.slice(0,150).map(m=>`<article class="ua-registro"><div>${rotulo(m)} <small>${m.circulo}º · ${h(m.escola || 'escola não informada na fonte local')} · ${magiaDaListaUA(m)?'Artífice · UA 2019':''} ${sempre.has(m.id)?'Sempre preparada':''}</small></div><button class="btn btn-sm btn-secondary" data-ua-magia="${h(m.id)}" ${sempre.has(m.id)?'disabled':''}>${troca?'Substituir':selecionadas.has(m.id)?'Despreparar / registrar':'Preparar / conhecer'}</button><button class="btn btn-sm btn-secondary" data-ua-detalhe="${h(m.id)}">Detalhes</button></article>`).join('');
   document.querySelectorAll('[data-ua-magia]').forEach(b=>b.onclick=()=>{const m=catalogo.find(x=>x.id===b.dataset.uaMagia);registrarMagiaUA(p,m,troca||!selecionadas.has(m.id)?'preparada':'registrada',troca?val('ua-substituir'):null,val('ua-motivo-troca'));salvar();if(troca)window.fecharModal();else atualizar();});
   document.querySelectorAll('[data-ua-detalhe]').forEach(b=>b.onclick=()=>{const m=catalogo.find(x=>x.id===b.dataset.uaDetalhe);abrirModal(m.nome,`${rotulo(m)}<p>${h(m.tempo_conjuracao)} · ${h(m.alcance)} · ${h(m.componentes)} · ${h(m.duracao)}</p><p>${h(m.descricao || 'O catálogo local contém apenas a referência; consulte a fonte original para a descrição completa.')}</p><p>${h(tituloFonteLocalizado(m.source))} · p. ${h(m.source?.printedPage || 'não informada')}</p>`);});
 };
 document.querySelectorAll('.ua-form input,.ua-form select').forEach(i=>i.addEventListener('input',atualizar));atualizar();
}

function escolherInfusao(p,salvar) {
 formulario('Infusões conhecidas',campo('ua-inf-busca','Buscar PT-BR / EN')+select('ua-inf-nivel','Pré-requisito',[['','Todos'],['disponivel','Disponíveis no nível atual']])+select('ua-inf-sint','Sintonização',[['','Todas'],['sim','Exige'],['nao','Não exige']])+select('ua-inf','Infusão',INFUSOES_UA.map(i=>[i.id,`${i.nome} / ${i.name.en} · nível ${i.nivel}`]))+select('ua-replica','Item de Replicar Item Mágico',REPLICAS_UA.map(i=>[i.id,`${i.nome} / ${i.name.en} · ${i.nivel||'sem mínimo'} · ${i.sintonizacao?'sintonização':'sem sintonização'}`]))+select('ua-inf-substituir','Substituir ao subir nível',[['','Aprender nova'],...p.artificerUA.infusoes.map(k=>[k.id,`${INFUSOES_UA.find(i=>i.id===k.infusionId)?.nome} ${REPLICAS_UA.find(i=>i.id===k.replicaId)?.nome || ''}`])])+'<p id="ua-inf-regra"></p>',()=>{aprenderInfusaoUA(p,val('ua-inf'),val('ua-inf')==='replicate-magic-item'?val('ua-replica'):'',val('ua-inf-substituir')||null);fecharSalvar(salvar);});
 const filtro=()=>{for(const [id,lista] of [['ua-inf',INFUSOES_UA],['ua-replica',REPLICAS_UA]])for(const o of document.getElementById(id).options){const i=lista.find(x=>x.id===o.value);o.hidden=!busca(o.text).includes(busca(val('ua-inf-busca')))||(val('ua-inf-nivel') && i.nivel>nivelUA(p))||(val('ua-inf-sint')&&i.sintonizacao!==(val('ua-inf-sint')==='sim'));}document.getElementById('ua-inf-regra').textContent=INFUSOES_UA.find(i=>i.id===val('ua-inf'))?.descricao || '';};
 for(const id of ['ua-inf-busca','ua-inf-nivel','ua-inf-sint','ua-inf'])document.getElementById(id).oninput=filtro;filtro();
}
function editarInfusao(p,item,salvar) {
 const u=p.artificerUA;
 formulario(item?'Item infundido':'Infundir item ao terminar descanso longo',select('ua-conhecida','Infusão conhecida',u.infusoes.map(k=>[k.id,`${INFUSOES_UA.find(i=>i.id===k.infusionId)?.nome} ${REPLICAS_UA.find(r=>r.id===k.replicaId)?.nome || ''}`]),item?.knownId)+select('ua-inventario','Vincular ao inventário',[['','Referência manual'],...(p.inventario || []).map(i=>[i.id,i.nome])],item?.itemId)+campo('ua-item','Nome do objeto',item?.item)+select('ua-tipo','Propriedades do alvo',[['arma','Arma simples/marcial'],['municao','Arma com munição'],['arremesso','Arma de arremesso'],['armadura','Armadura'],['escudo','Escudo'],['varinha','Varinha'],['botas','Botas'],['bolsas','Bolsas'],['replica','Objeto exigido pela réplica (consultar DMG)']],item?.tipo)+campo('ua-qtd','Quantidade de bolsas',item?.quantidade??2,'number')+check('ua-magico','Já era mágico antes da infusão',item?.magico)+check('ua-sintonizado','Sintonizado pelo personagem',item?.sintonizado)+check('ua-ativa','Infusão ativa',item?.ativa??true)+select('ua-resistencia','Resistência escolhida', ['ácido','frio','fogo','força','elétrico','necrótico','veneno','psíquico','radiante','trovejante'].map(x=>[x,x]),item?.resistencia)+texto('ua-item-notas','Observações',item?.notas),()=>{
  const inv=(p.inventario || []).find(i=>i.id===val('ua-inventario')),nome=val('ua-item').trim() || inv?.nome;
  if(!nome)throw new Error('Informe ou selecione o item.');
  const conhecida=u.infusoes.find(k=>k.id===val('ua-conhecida'));if(!conhecida)throw new Error('Aprenda uma infusão primeiro.');
  const dados={item:nome,itemId:inv?.id || '',tipo:val('ua-tipo'),quantidade:Number(val('ua-qtd')),magico:marcado('ua-magico'),sintonizado:marcado('ua-sintonizado'),ativa:marcado('ua-ativa'),resistencia:val('ua-resistencia'),notas:val('ua-item-notas')};
  const alvo=item || infundirUA(p,conhecida.id,dados);Object.assign(alvo,dados,{knownId:conhecida.id,infusionId:conhecida.infusionId,replicaId:conhecida.replicaId});
  let sint=u.sintonizacoes.find(x=>x.infusedId===alvo.id);if(!sint){sint={id:idNovo(),infusedId:alvo.id,item:nome};u.sintonizacoes.push(sint);}sint.itemId=alvo.itemId;sint.ativa=alvo.ativa && alvo.sintonizado;
  fecharSalvar(salvar);
 });
}
function editarMente(p,salvar) {
 const m=p.artificerUA.mente;
 formulario('Mente Artificial / Artificial Mind',campo('ua-mente-objeto','Objeto Minúsculo',m.objeto)+select('ua-material','Material',[['animal','Animal: pergaminho, couro, osso'],['mineral','Mineral: vidro, pedra, metal'],['vegetal','Vegetal: papel, madeira']],m.material)+'<fieldset id="ua-pericias-mente"><legend>Duas perícias elegíveis</legend></fieldset>'+check('ua-portando','Portando o objeto',m.portando)+check('ua-manifestada','Mente manifestada (ação bônus)',m.manifestada)+campo('ua-distancia','Distância da mente ao objeto (metros)',m.distancia||0,'number')+texto('ua-mente-notas','Aparência / concentração nos sentidos / notas',m.notas),()=>{Object.assign(m,{objeto:val('ua-mente-objeto'),material:val('ua-material'),pericias:[...document.querySelectorAll('#ua-pericias-mente input:checked')].map(i=>i.value),portando:marcado('ua-portando'),manifestada:marcado('ua-manifestada'),distancia:Number(val('ua-distancia')),notas:val('ua-mente-notas')});fecharSalvar(salvar);});
 const atualizar=()=>{document.getElementById('ua-pericias-mente').innerHTML='<legend>Duas perícias elegíveis</legend>'+MATERIAIS_MENTE[val('ua-material')].map(x=>`<label><input type="checkbox" value="${h(x)}" ${m.pericias.includes(x)?'checked':''}> ${h(x)}</label>`).join('');};document.getElementById('ua-material').onchange=atualizar;atualizar();
}
function usarEspaco(p,mapa,min,titulo,concluir,salvar) {
 const reservas=montarReservasDeEspacos(p,mapa).filter(r=>r.circulo>=min && r.disponiveis>0);
 formulario(titulo,select('ua-espaco','Espaço a gastar',reservas.map(r=>[`${r.fonte}:${r.circulo}`,`${r.fonte} ${r.circulo}º · ${r.disponiveis} disponíveis`])),()=>{const [fonte,circulo]=val('ua-espaco').split(':');if(!gastarEspaco(p,fonte,Number(circulo),mapa))throw new Error('Não há espaço disponível.');concluir(Number(circulo));fecharSalvar(salvar);});
}
function editarCompanheiro(p,tipo,salvar,mapa) {
 const c=companheiroUA(p,tipo),u=p.artificerUA,a=u.companheiros[tipo] ??= {pv:c.pvMax,ativo:true};
 formulario('Companheiro · Artífice',campo('ua-comp-pv','PV atuais',a.pv,'number')+check('ua-comp-ativo','Ativo',a.ativo)+select('ua-comp-comando','Comando por ação bônus',[['esquivar','Esquivar (padrão)'],['ataque',tipo==='homunculus'?'Cuspe Ácido':'Mordida'],['ajudar','Ajudar'],['disparada','Disparada'],['desengajar','Desengajar'],['especial',tipo==='homunculus'?'Salva Alquímica':'Reparar']],a.comando)+select('ua-salva','Benefício da salva',[['buoyancy','Flutuação'],['inspiration','Inspiração'],['resilience','Resiliência']],a.salva)+texto('ua-comp-notas','Notas / alvo',a.notas)+`<p>${h(c.reparo)} PV por Reparar. Consertar cura 2d6, informado manualmente acima.</p><button class="btn btn-sm btn-secondary" id="ua-reviver">Reviver com espaço (morto há até 1 hora)</button><button class="btn btn-sm btn-secondary" id="ua-recriar">Criar substituto ao terminar descanso longo</button>`,()=>{Object.assign(a,{pv:Number(val('ua-comp-pv')),ativo:marcado('ua-comp-ativo'),comando:val('ua-comp-comando'),salva:val('ua-salva'),notas:val('ua-comp-notas')});fecharSalvar(salvar);});
 document.getElementById('ua-reviver').onclick=()=>usarEspaco(p,mapa,1,'Reviver companheiro',()=>{a.pv=c.pvMax;a.ativo=true;},salvar);
 document.getElementById('ua-recriar').onclick=()=>{a.pv=c.pvMax;a.ativo=true;u.historico.push({tipo:'recriar-companheiro',companheiro:tipo,source:c.source});fecharSalvar(salvar);};
}
function criarTorreta(p,mapa,salvar) {
 const u=p.artificerUA,e=estadoUA(p),r=recursosUA(p).find(r=>r.id==='turret');
 formulario('Invocar Torreta Arcana',select('ua-torreta-tipo','Tipo',[['flamethrower','Lança-chamas / Flamethrower'],['force-ballista','Balista de Força / Force Ballista'],['defender','Defensora / Defender']])+select('ua-torreta-custo','Custo',[['gratis',`Uso gratuito (${Math.max(0,r.max-r.usados)} restantes)`],...montarReservasDeEspacos(p,mapa).filter(r=>r.disponiveis>0).map(r=>[`${r.fonte}:${r.circulo}`,`Espaço ${r.fonte} ${r.circulo}º`])]),()=>{
  if(val('ua-torreta-custo')==='gratis'){if(r.usados>=r.max)throw new Error('Usos gratuitos esgotados; selecione um espaço.');gastarRecursoUA(p,'turret');}
  else{const [f,c]=val('ua-torreta-custo').split(':');if(!gastarEspaco(p,f,Number(c),mapa))throw new Error('Espaço indisponível.');}
  const ativas=u.torretas.filter(t=>t.ativa);if(ativas.length>=(e.nivel>=14?2:1))ativas[0].ativa=false;
  u.torretas.push({id:idNovo(),tipo:val('ua-torreta-tipo'),pv:5*e.nivel,ativa:true,duracaoMinutos:10,ativacoes:0,source:fonteUA(10)});fecharSalvar(salvar);
 });
}
function editarTorreta(p,id,salvar) {
 const t=p.artificerUA.torretas.find(t=>t.id===id);
 formulario('Torreta: ativação, movimento e detonação',campo('ua-torreta-pv','PV atuais',t.pv,'number')+campo('ua-torreta-tempo','Minutos restantes',t.duracaoMinutos,'number')+campo('ua-torreta-pos','Posição / movimento até 4,5 m',t.posicao)+select('ua-torreta-acao','Ação',[['editar','Editar estado'],['ativar','Ativar: ação bônus a até 18 m'],['ambas','Ativar ambas: nível 14'],['detonar','Detonar: ação, 3d6 força DES/metade a 3 m'],['dispensar','Dispensar: ação']]),()=>{Object.assign(t,{pv:Number(val('ua-torreta-pv')),duracaoMinutos:Number(val('ua-torreta-tempo')),posicao:val('ua-torreta-pos')});const ac=val('ua-torreta-acao');if(ac==='ativar')t.ativacoes++;if(ac==='ambas'&&nivelUA(p)>=14)p.artificerUA.torretas.filter(x=>x.ativa).forEach(x=>x.ativacoes++);if(['detonar','dispensar'].includes(ac)||t.pv<=0||t.duracaoMinutos<=0)t.ativa=false;fecharSalvar(salvar);});
}
function configurarItemMagico(p,catalogo,tipo,salvar) {
 const u=p.artificerUA,varinha=tipo==='varinha',atual=varinha?u.varinha:u.armazenador;
 const candidatas=catalogo.filter(m=>magiaDaListaUA(m)&&(varinha?m.circulo===0:[1,2].includes(m.circulo))&&/^1 (ação|action)(?:$| ou Ritual| or Ritual)/i.test(m.tempo_conjuracao || ''));
 formulario(varinha?'Protótipo de Varinha':'Item Armazenador de Magia',campo('ua-foco-item',varinha?'Varinha de madeira não mágica':'Arma simples/marcial ou foco',atual.item)+select('ua-item-magia','Magia da lista com tempo de uma ação',candidatas.map(m=>[m.id,`${m.nome} / ${m.name.en}`]),varinha?atual.truques[0]:atual.spellId)+(varinha&&nivelUA(p)>=14?select('ua-item-magia2','Segundo truque',[['','Nenhum'],...candidatas.map(m=>[m.id,`${m.nome} / ${m.name.en}`])],atual.truques[1]):'')+'<p>Configuração ao terminar descanso longo. Magias citadas sem tempo de conjuração local não são presumidas elegíveis.</p>',()=>{if(!val('ua-foco-item').trim()||!val('ua-item-magia'))throw new Error('Informe item e magia.');atual.item=val('ua-foco-item');if(varinha){atual.truques=[...new Set([val('ua-item-magia'),val('ua-item-magia2')].filter(Boolean))];atual.ativa=true;}else{atual.spellId=val('ua-item-magia');atual.usados=0;}fecharSalvar(salvar);});
}
async function equipamento(p,salvar) {
 const armas=(await getArmas())?.armas || [],armaduras=(await getArmaduras())?.armaduras || [],u=p.artificerUA;
 const simples=armas.filter(a=>busca(a.categoria).includes('simples'));
 formulario('Ferramentas e equipamento · UA p.2',campo('ua-ferramenta','Uma ferramenta de artesão à escolha',u.escolhas.ferramenta)+select('ua-equip-opcao','Equipamento',[['pendente','Decidir depois'],['itens','Pacote de itens'],['ouro','5d4 × 10 PO no lugar da classe E antecedente'],['ignorado','Ignorar / ajustar manualmente']],u.escolhas.equipamento)+select('ua-arma1','Primeira arma simples',simples.map(a=>[a.nome,a.nome]))+select('ua-arma2','Segunda arma simples',simples.map(a=>[a.nome,a.nome]))+select('ua-armadura','Armadura',[['Couro Batido','Couro batido'],['Loriga de Escamas','Cota de escamas / Scale mail']])+campo('ua-ouro','Resultado de 5d4 × 10 PO (não inclui itens do antecedente)',u.escolhas.ouro||0,'number')+'<p>O pacote inclui besta leve, 20 virotes, ferramentas de ladrão e kit de explorador de masmorras. Itens podem ser editados no inventário. O recebimento é registrado para evitar duplicação. A alternativa em ouro credita o resultado uma vez; confirme no inventário a retirada de equipamento de origem que já tenha sido recebido.</p>',()=>{
  u.escolhas.ferramenta=val('ua-ferramenta');u.escolhas.equipamento=val('ua-equip-opcao');u.escolhas.ouro=Number(val('ua-ouro'));
  if(u.escolhas.equipamento==='itens'&&!u.escolhas.recebido){
   p.inventario ??= [];
   const escolhas=[val('ua-arma1'),val('ua-arma2'),'Besta Leve',val('ua-armadura'),'Virotes','Ferramentas de Ladrão','Kit de Explorador de Masmorras'];
   for(const nome of escolhas){const arma=armas.find(a=>a.nome===nome),armadura=armaduras.find(a=>a.nome===nome);p.inventario.push({id:idNovo(),nome,tipo:arma?'arma':armadura?'armadura':'equipamento',dados:arma||armadura||{},quantidade:nome==='Virotes'?20:1,equipado:false,source:fonteUA(2)});}u.escolhas.recebido=true;
  }
  if(u.escolhas.equipamento==='ouro'&&!u.escolhas.ouroAplicado){if(!Number.isFinite(u.escolhas.ouro)||u.escolhas.ouro<=0)throw new Error('Informe a rolagem em PO.');p.moedas=adicionarMoeda(p.moedas,'po',u.escolhas.ouro);u.escolhas.ouroAplicado=u.escolhas.ouro;}
  fecharSalvar(salvar);
 });
}
