import { getIndiceMagias } from '../db.js';
import { abrirModal, escHtml, toast } from '../utils.js';
import { novoId } from '../strixhaven/modelo.js';
import { rotuloLocalizado } from '../catalogo-localizado.js';
import { componentesMagia, nomesMagia, normalizarMagia, CLASSES_MAGIA_EN } from './modelo.js';

/** Editor de instância: conserva campos desconhecidos, usos e overrides anteriores. */
export async function abrirEditorMagia(p, { magia = null, aoSalvar = () => {}, selecionarCatalogo = null, nomeInicial = '' } = {}) {
  const catalogo = (await getIndiceMagias({ incluirLegado: true }))?.magias || [];
  const antigo = magia;
  const m = magia || {};
  const componentes = componentesMagia(m);
  const classes = p.classes?.length ? p.classes.map(c => c.classe) : [p.classe].filter(Boolean);
  const input = (id, label, value = '', tipo = 'text') => `<label>${label}<input class="form-input" id="me-${id}" type="${tipo}" value="${escHtml(value)}"></label>`;
  abrirModal(magia ? 'Editar magia da ficha' : 'Adicionar magia manualmente', `
    <p>Somente esta ficha será alterada. Digite para procurar correspondências antes de criar uma magia personalizada.</p>
    ${input('pt', 'Nome em português / nome principal', m.nome || m.name?.ptBR || nomeInicial)}
    ${input('en', 'Nome em inglês (opcional)', m.name?.en || '')}
    <div id="me-sugestoes" class="spell-suggestions" aria-live="polite"></div>
    <div class="sh-grade">${input('aliases', 'Aliases (separados por vírgula)', (m.name?.aliases || []).join(', '))}
    <label>Círculo<select id="me-circulo" class="form-select">${Array.from({ length: 10 }, (_, i) => `<option value="${i}" ${Number(m.circulo || 0) === i ? 'selected' : ''}>${i === 0 ? '0 — Truque' : i+'º círculo'}</option>`).join('')}</select></label>
    ${input('escola', 'Escola', m.escola || '')}${input('classes', 'Classes relacionadas (PT ou EN, separadas por vírgula)', (m.classes || []).join(', '))}
    ${input('tempo', 'Tempo de conjuração', m.tempo_conjuracao || 'Ação')}${input('alcance', 'Alcance', m.alcance || 'Pessoal')}
    ${input('duracao', 'Duração', m.duracao || 'Instantânea')}${input('material', 'Resumo do componente material', componentes.materialSummary)}
    <fieldset><legend>Componentes</legend>${[['v','Verbal',componentes.verbal],['s','Somático',componentes.somatic],['m','Material',componentes.material]].map(([k,l,v]) => `<label><input type="checkbox" id="me-${k}" ${v ? 'checked' : ''}> ${l}</label>`).join(' ')}</fieldset>
    <label><input id="me-ritual" type="checkbox" ${m.ritual ? 'checked' : ''}> Ritual</label>
    <label><input id="me-concentracao" type="checkbox" ${m.concentracao ? 'checked' : ''}> Concentração</label>
    <label>Estado<select id="me-estado" class="form-select">${['registrada','conhecida','preparada','sempre preparada','grimório'].map(e => `<option ${e === (m.estado_extra || 'registrada') ? 'selected' : ''}>${e}</option>`).join('')}</select></label>
    <label>Classe da cota<select class="form-select" id="me-classe"><option value="">Sem classe atribuída</option>${classes.map(c => `<option ${c === m.classe ? 'selected' : ''}>${escHtml(c)}</option>`).join('')}</select></label>
    <label><input type="checkbox" id="me-cota" ${m.sempre_preparada !== true ? 'checked' : ''}> Contabilizar quando conhecida/preparada</label>
    ${input('fonte', 'Origem informada / fonte', m.source?.sourceTitle || 'Magia personalizada')}
    ${input('motivo', 'Justificativa para a regra personalizada / exceção', m.motivo || '')}</div>
    <label>Descrição / resumo<textarea class="form-input" id="me-descricao" rows="4">${escHtml(m.descricao || '')}</textarea></label>
    <label>Observações<textarea class="form-input" id="me-observacoes">${escHtml(m.observacoes || '')}</textarea></label>
    ${!antigo ? '<label><input type="checkbox" id="me-confirmar"> Confirmo criar uma magia personalizada, independente do catálogo</label>' : '<p>O ID desta instância e seus overrides serão preservados.</p>'}
    <p id="me-erro" role="alert"></p>`, '<button class="btn btn-primary" id="me-salvar">Salvar magia</button>');
  const valor = k => document.getElementById(`me-${k}`).value.trim();
  const check = k => document.getElementById(`me-${k}`).checked;
  const sugerir = e => {
    const termo = normalizarMagia(e?.target?.value || valor('pt') || valor('en'));
    const achadas = termo ? catalogo.filter(c => nomesMagia(c).some(n => n.includes(termo))).slice(0, 10) : [];
    const box = document.getElementById('me-sugestoes');
    box.innerHTML = achadas.length ? `<p>Correspondências do catálogo:</p>${achadas.map((c,i) => `<button type="button" class="sh-opcao" data-me-sugestao="${i}">${rotuloLocalizado(c)}<span>${c.circulo}º círculo · ${escHtml(c.escola)} · ${escHtml(c.classes.join(', '))}</span><span>Usar magia do catálogo</span></button>`).join('')}` : (termo ? '<p>Sem correspondência de nome. Você pode confirmar a criação personalizada.</p>' : '');
    box.querySelectorAll('[data-me-sugestao]').forEach(b => { b.onclick = async () => {
      const c = achadas[Number(b.dataset.meSugestao)];
      if (antigo && !confirm('Abrir a adição do catálogo? A magia em edição será preservada sem alterações.')) return;
      window.fecharModal();
      if (selecionarCatalogo) selecionarCatalogo(c);
      else (await import('./busca-ui.js')).abrirAdicaoMagia(p, c, aoSalvar);
    }; });
  };
  document.getElementById('me-pt').oninput = sugerir;
  document.getElementById('me-en').oninput = sugerir;
  if (nomeInicial) sugerir();
  document.getElementById('me-salvar').onclick = () => {
    const erro = document.getElementById('me-erro');
    if (!valor('pt') || !valor('escola')) { erro.textContent = 'Informe nome e escola.'; return; }
    if (!antigo && !check('confirmar')) { erro.textContent = 'Confirme explicitamente a criação personalizada ou escolha uma sugestão do catálogo.'; return; }
    const circulo = Number(valor('circulo'));
    if (!Number.isInteger(circulo) || circulo < 0 || circulo > 9) { erro.textContent = 'Círculo deve estar entre 0 e 9.'; return; }
    const classesRelacionadas = [...new Set(valor('classes').split(',').map(c => c.trim()).filter(Boolean).map(c => Object.entries(CLASSES_MAGIA_EN).find(([pt,en]) => [pt,en].some(n => normalizarMagia(n) === normalizarMagia(c)))?.[0] || c))];
    const novo = { ...antigo, id: antigo?.id || novoId(), nome: valor('pt'),
      name: { ...antigo?.name, ptBR: valor('pt'), en: valor('en'), aliases: valor('aliases').split(',').map(v => v.trim()).filter(Boolean), ptBRStatus: 'interface-translation' },
      circulo, escola: valor('escola'), classes: classesRelacionadas, tempo_conjuracao: valor('tempo'), alcance: valor('alcance'),
      componentes: ['v','s','m'].filter(check).map(v => v.toUpperCase()).join(', '), material_resumo: valor('material'), duracao: valor('duracao'),
      ritual: check('ritual'), concentracao: check('concentracao'), descricao: valor('descricao'), observacoes: valor('observacoes'), motivo: valor('motivo'),
      estado_extra: valor('estado'), classe: valor('classe'), sempre_preparada: !check('cota'), origem: 'extra', editada_localmente: !!antigo,
      source: antigo?.catalogo_ref ? antigo.source : { sourceId: 'local', sourceTitle: valor('fonte') || 'Magia personalizada', rulesVersion: 'custom' } };
    if (antigo?.catalogo_ref) novo.fonte_observacoes = valor('fonte');
    delete novo.restricoes_excedidas;
    const lista = p.magias_customizadas ||= [];
    const indice = antigo ? lista.findIndex(c => c === antigo || (c.id && c.id === antigo.id)) : -1;
    if (indice >= 0) lista[indice] = novo; else lista.push(novo);
    window.fecharModal(); aoSalvar(); toast('Magia salva nesta ficha.', 'success');
  };
}
