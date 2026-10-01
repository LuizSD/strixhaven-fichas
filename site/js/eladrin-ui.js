import { ELADRIN, ESTACOES, estadoEladrin } from './eladrin.js';
import { escHtml, abrirModal, toast } from './utils.js';
import { getArmas, getFerramentas, getAntecedentes } from './db.js';
import { ATRIBUTOS_KEYS, ATRIBUTOS_NOMES } from './dados-classes.js';
import { temProficienciaArma } from './regras-equipamento.js';
const bilingue = (pt, en) => `${escHtml(pt)} <small style="display:block;color:var(--text-muted)">${escHtml(en)}</small>`;
export function renderEladrin(p) {
  if (p.especie !== 'Eladrin') return '';
  const s = estadoEladrin(p), e = p.eladrin, est = ESTACOES[e.estacao];
  return `<section class="card" id="eladrin"><h3>${bilingue('Eladrin', 'Eladrin')}</h3>
    <p>Humanoide · considerado elfo · Médio · deslocamento 9 m / 30 pés · visão no escuro 18 m / 60 pés.</p>
    <h4>${bilingue(est[0], est[1])}</h4><p>${est[2]}</p>
    <h4>${bilingue('Passo Feérico', 'Fey Step')}</h4><p>Ação bônus · teleporte de até 9 m / 30 pés para espaço desocupado visível · CD ${s.cd} · ${s.atuais}/${s.max} usos · recuperação no descanso longo.</p><p>${s.efeito}${e.estacao === 'verao' && p.nivel >= 3 ? ` Dano: ${s.pb}.` : ''}</p>
    <button class="btn btn-secondary" id="eladrin-gastar" ${s.atuais ? '' : 'disabled'}>Gastar uso</button><button class="btn btn-secondary" id="eladrin-editar">Editar Eladrin / Transe</button>
    <p>Proficiências temporárias — Transe: ${escHtml(e.proficienciasTranse.map(x => x.nome).join(', ') || 'nenhuma')}</p>
    <details><summary>Detalhes da raça e origem</summary><p>${ELADRIN.source.book}</p>${ELADRIN.tracos.map(t => `<h4>${bilingue(t.nome, t.name?.en || '')}</h4><p>${t.descricao}</p>`).join('')}<p>Idiomas: Comum e um idioma apropriado acordado com o mestre.</p></details></section>`;
}
export function setupEladrin(p, container, aoSalvar) {
  if (p.especie !== 'Eladrin') return;
  container.querySelector('#eladrin-gastar')?.addEventListener('click', () => { p.eladrin.usosGastos++; aoSalvar(); });
  container.querySelector('#eladrin-editar')?.addEventListener('click', async () => {
    const [armas, ferramentas, antecedentes] = await Promise.all([getArmas(), getFerramentas(), getAntecedentes()]);
    const e = p.eladrin, s = estadoEladrin(p);
    const permanentes = new Set([...(p.proficiencias_extra || []), ...(p.proficiencias_ferramentas || []), ...(p.proficiencias_instrumentos || [])]);
    const semTranse = { ...p, eladrin: { ...e, proficienciasTranse: [] } };
    const catalogo = [...(armas?.armas || []).filter(a => !temProficienciaArma(semTranse, a)).map(a => ({ nome: a.nome, tipo: 'arma' })), ...(ferramentas?.tabelas || []).flatMap(t => t.dados.map(f => ({ nome: f.Ferramenta, tipo: 'ferramenta' })))].filter(x => x.nome && !permanentes.has(x.nome));
    const options = (values, selected) => values.map(([k,v]) => `<option value="${escHtml(k)}" ${selected === k ? 'selected' : ''}>${escHtml(v)}</option>`).join('');
    abrirModal('Editar Eladrin / Transe', `<label>Estação após o Transe<select id="ee-estacao" ${e.transeDisponivel ? '' : 'disabled'}>${options(Object.entries(ESTACOES).map(([k,v]) => [k,v[0]]), e.estacao)}</select></label>
      <label>Atributo da CD<select id="ee-cd">${options(['inteligencia','sabedoria','carisma'].map(k=>[k,ATRIBUTOS_NOMES[k]]),e.atributoCD)}</select></label>
      <label>Usos atuais<input id="ee-atual" type="number" min="0" value="${s.atuais}"></label><label>Usos máximos (vazio: proficiência)<input id="ee-max" type="number" min="0" value="${e.maxManual ?? ''}"></label>
      <label>Origem dos aumentos de atributo<select id="ee-origem">${options([['antecedente','Antecedente — regras 2024'],['linhagem','Linhagem Eladrin — regra da fonte']],e.origemAtributos)}</select></label>
      <p>Distribua +2/+1 ou +1/+1/+1 em atributos diferentes. Substitui o bônus da origem anterior.</p>${ATRIBUTOS_KEYS.map(k => `<label>${ATRIBUTOS_NOMES[k]}<input type="number" min="0" max="2" data-ee-bonus="${k}" value="${p.bonus_antecedente?.[k] || 0}"></label>`).join('')}
      <h4>Proficiências temporárias do Transe</h4><p>Escolha duas ainda não possuídas. Disponíveis novamente após descanso longo.</p>${[0,1].map(i=>`<label>Proficiência ${i+1}<select id="ee-prof-${i}" ${e.transeDisponivel ? '' : 'disabled'}><option value="">Selecionar</option>${options(catalogo.map(x=>[x.nome,x.nome]),e.proficienciasTranse[i]?.nome)}</select></label>`).join('')}`,
      '<button class="btn btn-secondary" onclick="fecharModal()">Cancelar</button><button class="btn btn-primary" id="ee-salvar">Salvar</button>');
    document.getElementById('ee-salvar').onclick = () => {
      try {
        const val = id => document.getElementById(id).value;
        const origem = val('ee-origem');
        const bonus = Object.fromEntries([...document.querySelectorAll('[data-ee-bonus]')].map(el=>[el.dataset.eeBonus,Number(el.value)]));
        const alterouBonus = origem !== e.origemAtributos || ATRIBUTOS_KEYS.some(k => bonus[k] !== (p.bonus_antecedente?.[k] || 0));
        const nonzero = Object.values(bonus).filter(Boolean).sort().join(',');
        if (alterouBonus && !['1,2','1,1,1'].includes(nonzero)) throw new Error('Distribua +2/+1 ou +1/+1/+1 em atributos diferentes.');
        const ant = antecedentes?.antecedentes.find(a=>a.nome === p.antecedente);
        if (alterouBonus && origem === 'antecedente' && ant && ATRIBUTOS_KEYS.some(k=>bonus[k] && !ant.valores_atributo.includes(ATRIBUTOS_NOMES[k]))) throw new Error('Atributo não permitido pelo antecedente.');
        const totais = Object.fromEntries(ATRIBUTOS_KEYS.map(k=>[k,p.atributos[k] - (p.bonus_antecedente?.[k] || 0) + bonus[k]]));
        if (alterouBonus && Object.values(totais).some(v=>v>20)) throw new Error('O aumento da origem não pode elevar um atributo acima de 20.');
        const max = val('ee-max') === '' ? null : Number(val('ee-max')), atual = Number(val('ee-atual'));
        if ((max !== null && (!Number.isInteger(max) || max < 0)) || !Number.isInteger(atual) || atual < 0 || atual > (max ?? s.pb)) throw new Error('Usos inválidos.');
        const profs = [val('ee-prof-0'),val('ee-prof-1')].filter(Boolean);
        if (e.transeDisponivel && profs.length && (profs.length !== 2 || new Set(profs).size !== 2 || profs.some(n=>!catalogo.some(c=>c.nome===n)))) throw new Error('Escolha duas proficiências distintas disponíveis.');
        if (alterouBonus) { p.atributos = totais; p.bonus_antecedente = bonus; e.origemAtributos = origem; }
        e.atributoCD = val('ee-cd'); e.maxManual = max; e.usosGastos = (max ?? s.pb) - atual;
        if (e.transeDisponivel && (val('ee-estacao') !== e.estacao || profs.length)) { e.estacao = val('ee-estacao'); e.proficienciasTranse = profs.map(n=>({...catalogo.find(c=>c.nome===n), origem:'Transe'})); e.transeDisponivel = false; }
        aoSalvar(); window.fecharModal();
      } catch (err) { toast(err.message,'error'); }
    };
  });
}
