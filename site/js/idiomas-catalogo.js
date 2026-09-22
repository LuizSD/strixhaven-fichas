import { novoId } from './strixhaven/modelo.js';
import { rotuloLocalizado, correspondeBusca, normalizarBusca } from './catalogo-localizado.js';
import { abrirModal, escHtml, toast } from './utils.js';

const referencias = [
  ['Comum', 'Common', 'Common', 'Humans'], ['Anão', 'Dwarvish', 'Dwarvish', 'Dwarves'],
  ['Élfico', 'Elvish', 'Elvish', 'Elves'], ['Gigante', 'Giant', 'Dwarvish', 'Ogres, giants'],
  ['Gnômico', 'Gnomish', 'Dwarvish', 'Gnomes'], ['Goblin', 'Goblin', 'Dwarvish', 'Goblinoids'],
  ['Pequenino', 'Halfling', 'Common', 'Halflings'], ['Orc', 'Orc', 'Dwarvish', 'Orcs'],
  ['Abissal', 'Abyssal', 'Infernal', 'Demons'], ['Celestial', 'Celestial', 'Celestial', 'Celestials'],
  ['Dracônico', 'Draconic', 'Draconic', 'Dragons, dragonborn'], ['Dialeto Obscuro', 'Deep Speech', '', 'Mind flayers, beholders'],
  ['Infernal', 'Infernal', 'Infernal', 'Devils'], ['Primordial', 'Primordial', 'Dwarvish', 'Elementals'],
  ['Silvestre', 'Sylvan', 'Elvish', 'Fey'], ['Subcomum', 'Undercommon', 'Elvish', 'Underdark traders'],
];
export const IDIOMAS_CATALOGO = referencias.map(([nome, en, escrita, associacao]) => ({
  id: `phb-language-${en.toLowerCase().replaceAll(' ', '-')}`, nome, name: { ptBR: nome, en, ptBRStatus: 'interface-translation' }, escrita, associacao,
  source: { sourceId: 'phb-2014-10th', sourceTitle: 'Player’s Handbook (2014)', rulesVersion: '2014-legacy', printedPage: 123, section: 'Languages' },
}));

export function idiomaLocalizado(nome, p = {}) {
  return (p.idiomas_personalizados || []).find(i => i.nome === nome) || IDIOMAS_CATALOGO.find(i => i.nome === nome) || { nome };
}

function atualizarPadrao(p) {
  const custom = new Set((p.idiomas_personalizados || []).map(i => i.nome));
  p.idiomas_padrao = [...new Set([...(p.idiomas_padrao || []).filter(n => (p.idiomas || []).includes(n)), ...(p.idiomas || []).filter(n => !custom.has(n))])];
}
function atualizarNomes(p) {
  p.idiomas = [...new Set([...(p.idiomas_padrao || []), ...(p.idiomas_personalizados || []).map(i => i.nome)])];
  if (p.idiomas_livres) p.idiomas_livres = [...p.idiomas];
}
const aliasesDe = valor => Array.isArray(valor) ? valor.map(String) : String(valor || '').split(/[,\n]/).map(s => s.trim()).filter(Boolean);
export function buscarIdiomas(termo, p = {}) {
  return [...IDIOMAS_CATALOGO, ...(p.idiomas_personalizados || [])].filter(i => correspondeBusca({ ...i, name:{ ...i.name, aliases:[...(i.name?.aliases || []), ...aliasesDe(i.aliases)] } }, termo));
}
export function duplicatasIdioma(p, dados, id = null) {
  const chaves = [dados.nome, dados.en, ...aliasesDe(dados.aliases)].filter(Boolean).map(normalizarBusca);
  return [...IDIOMAS_CATALOGO, ...(p.idiomas_personalizados || [])].filter(i => i.id !== id && [i.nome, i.name?.en, ...aliasesDe(i.name?.aliases), ...aliasesDe(i.aliases)].filter(Boolean).some(n => chaves.includes(normalizarBusca(n))));
}
export function salvarIdioma(p, dados, id, { confirmarDuplicata = false } = {}) {
  const nome = String(dados.nome || '').trim();
  if (!nome) throw new Error('Informe o nome do idioma.');
  p.idiomas_personalizados ||= [];
  p.idiomas ||= [];
  const antigo = p.idiomas_personalizados.find(i => i.id === id);
  if (duplicatasIdioma(p, dados, id).length && !confirmarDuplicata) throw new Error('Existe um provável idioma duplicado. Escolha o existente ou confirme a versão personalizada.');
  atualizarPadrao(p);
  const novo = { ...antigo, ...dados, nome, id: antigo?.id || novoId(), name: { ...antigo?.name, ptBR: nome, en: dados.en || '', aliases:aliasesDe(dados.aliases), ptBRStatus: 'interface-translation' }, source: { sourceId: 'local', sourceTitle: dados.origem || 'Idioma personalizado', rulesVersion: 'custom' } };
  delete novo.aliases; // fonte única dos aliases: name.aliases
  if (antigo) {
    p.idiomas_personalizados[p.idiomas_personalizados.indexOf(antigo)] = novo;
  } else p.idiomas_personalizados.push(novo);
  atualizarNomes(p);
  return novo;
}

export function removerIdioma(p, id) {
  const antigo = p.idiomas_personalizados?.find(i => i.id === id);
  if (!antigo) return;
  atualizarPadrao(p);
  p.idiomas_personalizados = p.idiomas_personalizados.filter(i => i.id !== id);
  atualizarNomes(p);
}

export function abrirIdiomas(p, aoSalvar, { criar = false } = {}) {
  const origem = document.activeElement;
  const focarOrigem = () => (origem?.isConnected ? origem : document.getElementById(origem?.id))?.focus?.({ preventScroll:true });
  const abrir = () => { window.fecharModal(); focarOrigem(); abrirIdiomas(p, aoSalvar); };
  atualizarPadrao(p);
  abrirModal('Idiomas', `<p data-dialogo-descricao>Escolha idiomas existentes ou crie uma entrada personalizada. O catálogo global permanece intacto.</p><label>Buscar português / inglês / aliases<input id="idioma-busca" class="form-input" data-modal-initial-focus></label><div id="idioma-catalogo"></div><h3>Idiomas personalizados</h3><button class="btn btn-secondary bilingual-action" id="idioma-novo">Adicionar idioma personalizado<small lang="en">Add custom language</small></button><div id="idiomas-personalizados-lista"></div>`);
  const listar = () => {
    const el = document.getElementById('idioma-catalogo');
    const encontrados = buscarIdiomas(document.getElementById('idioma-busca').value, p);
    el.innerHTML = IDIOMAS_CATALOGO.filter(i => encontrados.includes(i)).map(i => `<label class="sh-opcao"><input type="checkbox" data-idioma="${i.id}" ${(p.idiomas_padrao || []).includes(i.nome) ? 'checked' : ''}>${rotuloLocalizado(i)}<small>Escrita: ${escHtml(i.escrita || '—')} · ${escHtml(i.associacao)}</small></label>`).join('');
    el.querySelectorAll('[data-idioma]').forEach(b => { b.onchange = () => {
      const i = IDIOMAS_CATALOGO.find(i => i.id === b.dataset.idioma);
      p.idiomas_padrao = b.checked ? [...new Set([...(p.idiomas_padrao || []), i.nome])] : (p.idiomas_padrao || []).filter(n => n !== i.nome);
      atualizarNomes(p);
      aoSalvar();
    }; });
    document.getElementById('idiomas-personalizados-lista').innerHTML = (p.idiomas_personalizados || []).filter(i => encontrados.includes(i)).map(i => `<article class="idioma-registro">${rotuloLocalizado(i)}<p>${escHtml(i.escrita)} · ${escHtml(i.observacoes)}</p><button class="btn btn-secondary" data-idioma-editar="${escHtml(i.id)}">Editar</button><button class="btn btn-secondary" data-idioma-remover="${escHtml(i.id)}">Remover</button></article>`).join('');
    document.querySelectorAll('[data-idioma-editar]').forEach(b => { b.onclick = () => editar(b.dataset.idiomaEditar); });
    document.querySelectorAll('[data-idioma-remover]').forEach(b => { b.onclick = () => {
      if (!confirm('Remover este idioma personalizado usado na ficha?')) return;
      removerIdioma(p, b.dataset.idiomaRemover); aoSalvar(); abrir();
    }; });
  };
  const editar = id => {
    const i = p.idiomas_personalizados?.find(i => i.id === id) || {};
    const campos = { nome: 'Nome principal (obrigatório)', en: 'Nome em inglês', aliases:'Aliases (separados por vírgula)', escrita: 'Escrita / alfabeto', origem: 'Origem', observacoes: 'Observações' };
    const valores = { ...i, en:i.en || i.name?.en, aliases:aliasesDe(i.name?.aliases || i.aliases).join(', ') };
    window.fecharModal();
    focarOrigem();
    abrirModal('Idioma personalizado', `<p data-dialogo-descricao>Digite o nome para encontrar correspondências existentes, ou confirme uma versão personalizada.</p>${Object.entries(campos).map(([k, titulo]) => `<label>${titulo}<input class="form-input" id="idioma-${k}" value="${escHtml(valores[k] || '')}" ${k === 'nome' ? 'data-modal-initial-focus' : ''}></label>`).join('')}<div id="idioma-sugestoes" aria-live="polite"></div><label id="idioma-duplicata-linha" hidden><input type="checkbox" id="idioma-confirmar-duplicata"> Confirmo continuar como idioma personalizado, mesmo com provável duplicata</label><p id="idioma-erro" role="alert"></p>`, '<button class="btn btn-primary" id="idioma-salvar">Salvar idioma</button>');
    const dados = () => Object.fromEntries(Object.keys(campos).map(k => [k, document.getElementById(`idioma-${k}`).value]));
    const sugerir = e => {
      const termo = e?.target?.value ?? document.getElementById('idioma-nome').value;
      const matches = termo.trim() ? buscarIdiomas(termo, p).filter(x => x.id !== id).slice(0,8) : [];
      document.getElementById('idioma-sugestoes').innerHTML = matches.map((x,n) => `<button type="button" class="sh-opcao" data-usar-idioma="${n}">${rotuloLocalizado(x)}<span>Usar idioma existente</span></button>`).join('');
      document.getElementById('idioma-duplicata-linha').hidden = !duplicatasIdioma(p, dados(), id).length;
      document.querySelectorAll('[data-usar-idioma]').forEach(b => { b.onclick = () => {
        const x = matches[Number(b.dataset.usarIdioma)];
        if (IDIOMAS_CATALOGO.includes(x)) p.idiomas_padrao = [...new Set([...(p.idiomas_padrao || []), x.nome])];
        atualizarNomes(p); aoSalvar(); abrir();
      }; });
    };
    for (const k of ['nome','en','aliases']) document.getElementById(`idioma-${k}`).oninput = e => { document.getElementById('idioma-confirmar-duplicata').checked = false; sugerir(e); };
    sugerir();
    document.getElementById('idioma-salvar').onclick = () => {
      try { salvarIdioma(p, dados(), id, { confirmarDuplicata:document.getElementById('idioma-confirmar-duplicata').checked }); aoSalvar(); abrir(); }
      catch (e) { document.getElementById('idioma-erro').textContent = e.message; }
    };
  };
  document.getElementById('idioma-novo').onclick = () => editar();
  document.getElementById('idioma-busca').oninput = listar; listar();
  if (criar) editar();
}
