import { abrirModal, escHtml, toast } from '../utils.js';
import { CAMPOS_ACADEMICOS, FACULDADES, migrarAcademia, novoId, numeroInformado } from './modelo.js';
import { configurarIniciado } from './beneficios.js';
import { getStrixhaven } from '../db.js';

/** Desenha um campo acessível, sem converter conteúdo livre em HTML. */
function campo(chave, definicao, valor, prefixo = 'academia') {
  const [rotulo, tipo = 'text'] = Array.isArray(definicao) ? definicao : [definicao];
  const id = `${prefixo}-${chave}`;
  const comum = `id="${id}" name="${chave}" class="form-input"`;
  return `<label class="sh-campo" for="${id}">${escHtml(rotulo)}${tipo === 'textarea'
    ? `<textarea ${comum} rows="3">${escHtml(valor ?? '')}</textarea>`
    : `<input ${comum} type="${tipo}" ${tipo === 'checkbox' ? (valor ? 'checked' : '') : `value="${escHtml(valor ?? (tipo === 'number' ? 0 : ''))}"`}>`}</label>`;
}

/** Editor por ID: editar ou remover não depende da ordem dos registros. */
async function editarRegistro(p, grupo, id, aoSalvar) {
  const modulo = await getStrixhaven();
  const def = CAMPOS_ACADEMICOS[grupo];
  const lista = p.strixhaven[grupo];
  const anterior = lista.find(r => r.id === id);
  const registro = anterior || { id: novoId(),
    ...(['cursos', 'avaliacoes'].includes(grupo) ? { ano: p.strixhaven.ano } : {}),
    ...(grupo === 'avaliacoes' ? { registro: 1 } : {}) };
  abrirModal(def.titulo, `<form id="academia-form" class="sh-grade">${Object.entries(def.campos).map(([k, d]) => campo(k, d, registro[k])).join('')}</form><p id="academia-erro" role="alert"></p>`, `<button class="btn btn-secondary" onclick="fecharModal()">Cancelar</button><button class="btn btn-primary" id="academia-salvar">Salvar</button>`);
  const opcoes = modulo?.opcoes_academicas?.[grupo] || [];
  if (opcoes.length) {
    document.getElementById('academia-nome').setAttribute('list', 'academia-catalogo');
    document.getElementById('academia-form').insertAdjacentHTML('beforeend', `<datalist id="academia-catalogo">${opcoes.map(n => `<option value="${escHtml(n)}">`).join('')}</datalist>`);
  }
  document.getElementById('academia-salvar').onclick = () => {
    try {
      const novo = { ...registro };
      for (const [k, d] of Object.entries(def.campos)) {
        const el = document.getElementById(`academia-${k}`);
        const tipo = Array.isArray(d) ? d[1] : 'text';
        novo[k] = tipo === 'checkbox' ? el.checked : tipo === 'number' ? numeroInformado(el.value, d[0], { min: k === 'pontos' ? -Infinity : ['ano', 'registro'].includes(k) ? 1 : 0 }) : el.value;
      }
      if (!novo.nome.trim()) throw new Error('Informe um nome.');
      if (anterior) lista[lista.findIndex(r => r.id === id)] = novo;
      else lista.push(novo);
      aoSalvar(); window.fecharModal();
    } catch (e) { document.getElementById('academia-erro').textContent = e.message; }
  };
}

/** Cartões de registros; boletim organizado por ano, sem limite de linhas. */
function registrosHtml(a, grupo, filtro = () => true) {
  const def = CAMPOS_ACADEMICOS[grupo];
  if (grupo === 'cursos' && a.cursos.length) return `<div class="sh-tabela" role="region" aria-label="Aulas: tabela com rolagem interna" tabindex="0"><table><thead><tr><th>Aula</th><th>Ano / período</th><th>Inspiração</th><th>Habilidades</th><th>Professor / horário / notas</th><th>Ações</th></tr></thead><tbody>${a.cursos.map(r => `<tr><td>${escHtml(r.nome)}</td><td>${escHtml(r.ano)} / ${escHtml(r.periodo || '')}</td><td>${r.inspiracao ? 'Sim' : 'Não'}</td><td>${escHtml(r.habilidades || '')}</td><td>${escHtml(r.professor || '')}<br>${escHtml(r.horario || '')}<br>${escHtml(r.notas || '')}</td><td><button class="btn btn-sm btn-secondary no-print" data-ac-editar="${escHtml(r.id)}" data-ac-grupo="cursos">Editar</button><button class="btn btn-sm btn-secondary no-print" data-ac-remover="${escHtml(r.id)}" data-ac-grupo="cursos">Remover</button></td></tr>`).join('')}</tbody></table></div>`;
  return a[grupo].filter(filtro).map(r => `<article class="sh-registro"><h4>${escHtml(r.nome)}</h4><dl>${Object.entries(def.campos).filter(([k]) => k !== 'nome').map(([k, d]) => {
    const [rotulo, tipo] = Array.isArray(d) ? d : [d];
    return `<div><dt>${escHtml(rotulo)}</dt><dd>${tipo === 'checkbox' ? (r[k] ? '☑' : '☐') : escHtml(r[k] ?? '—')}</dd></div>`;
  }).join('')}</dl><div class="sh-acoes no-print"><button class="btn btn-sm btn-secondary" data-ac-editar="${escHtml(r.id)}" data-ac-grupo="${grupo}">Editar</button><button class="btn btn-sm btn-secondary" data-ac-remover="${escHtml(r.id)}" data-ac-grupo="${grupo}">Remover</button></div></article>`).join('') || '<p class="text-muted">Nenhum registro neste período.</p>';
}

/** Vida acadêmica separada dos recursos e níveis de classe. */
export function renderAcademia(p) {
  migrarAcademia(p);
  const a = p.strixhaven;
  return `<section class="card sh-academia" id="vida-academica"><header class="sh-titulo"><div><small>STRIXHAVEN · REGISTRO DO ESTUDANTE</small><h2>Vida acadêmica</h2></div><span class="sh-selo">Suplemento 2014 · adaptação 2024</span></header>
    <p>Faculdade não concede classe, talentos ou magias automaticamente. Bônus condicionais, d4s e relações são registros de mesa, sem efeitos automáticos.</p>
    <div class="sh-grade"><label>Faculdade<select class="form-select" id="ac-faculdade"><option value="">Ainda não definida</option>${FACULDADES.map(f => `<option ${a.faculdade === f ? 'selected' : ''}>${f}</option>`).join('')}</select></label>${campo('ingresso', 'Situação de ingresso', a.ingresso, 'matricula')}${campo('ano', ['Ano acadêmico', 'number'], a.ano, 'matricula')}</div>
    <div class="sh-acoes"><button class="btn btn-secondary no-print" id="ac-identidade">Salvar identificação acadêmica</button><button class="btn btn-secondary no-print" id="ac-iniciado">Configurar Iniciado de Strixhaven</button></div>
    ${Object.entries(CAMPOS_ACADEMICOS).map(([grupo, def]) => `<section class="sh-grupo"><header class="sh-titulo"><h3>${def.titulo}</h3><button class="btn btn-sm btn-secondary no-print" data-ac-adicionar="${grupo}">+ Adicionar</button></header>${grupo === 'avaliacoes' ? [...new Set([1, 2, 3, 4, ...a.avaliacoes.map(r => r.ano)])].map(ano => `<details open><summary>${escHtml(ano)}º ano</summary><div class="sh-grade">${registrosHtml(a, grupo, r => r.ano === ano)}</div></details>`).join('') : `<div class="sh-grade">${registrosHtml(a, grupo)}</div>`}</section>`).join('')}
    ${campo('notas', ['Notas acadêmicas', 'textarea'], a.notas, 'academia-geral')}<button class="btn btn-secondary no-print" id="ac-notas">Salvar notas</button></section>`;
}

/** Liga eventos após o render da ficha, sem listeners globais acumulados. */
export function setupAcademia(p, container, aoSalvar) {
  const a = p.strixhaven;
  container.querySelector('#ac-iniciado')?.addEventListener('click', () => configurarIniciado(p, aoSalvar));
  if (document.body?.dataset) document.body.dataset.faculdade = FACULDADES.includes(a.faculdade) ? a.faculdade.toLowerCase() : '';
  container.querySelector('#ac-identidade')?.addEventListener('click', () => {
    try {
      const ano = numeroInformado(container.querySelector('#matricula-ano').value, 'ano acadêmico', { min: 1 });
      Object.assign(a, { ano, faculdade: container.querySelector('#ac-faculdade').value, ingresso: container.querySelector('#matricula-ingresso').value });
      aoSalvar();
    } catch (e) { toast(e.message, 'error'); }
  });
  container.querySelector('#ac-notas')?.addEventListener('click', () => { a.notas = container.querySelector('#academia-geral-notas').value; aoSalvar(); });
  container.querySelectorAll('[data-ac-adicionar]').forEach(b => { b.onclick = () => editarRegistro(p, b.dataset.acAdicionar, null, aoSalvar); });
  container.querySelectorAll('[data-ac-editar]').forEach(b => { b.onclick = () => editarRegistro(p, b.dataset.acGrupo, b.dataset.acEditar, aoSalvar); });
  container.querySelectorAll('[data-ac-remover]').forEach(b => { b.onclick = () => {
    if (!confirm('Remover este registro acadêmico?')) return;
    a[b.dataset.acGrupo] = a[b.dataset.acGrupo].filter(r => r.id !== b.dataset.acRemover); aoSalvar();
  }; });
}
