import { novoId } from './strixhaven/modelo.js';
import { rotuloLocalizado, correspondeBusca } from './catalogo-localizado.js';
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

export function salvarIdioma(p, dados, id) {
  const nome = String(dados.nome || '').trim();
  if (!nome) throw new Error('Informe o nome do idioma.');
  p.idiomas_personalizados ||= [];
  p.idiomas ||= [];
  const antigo = p.idiomas_personalizados.find(i => i.id === id);
  if (p.idiomas.includes(nome) && nome !== antigo?.nome) throw new Error('Esse idioma já está na ficha.');
  const novo = { ...antigo, ...dados, nome, id: antigo?.id || novoId(), name: { ptBR: nome, en: dados.en || '', ptBRStatus: 'interface-translation' }, source: { sourceId: 'local', sourceTitle: dados.origem || 'Idioma personalizado', rulesVersion: 'custom' } };
  if (antigo) {
    p.idiomas_personalizados[p.idiomas_personalizados.indexOf(antigo)] = novo;
    p.idiomas = p.idiomas.map(n => n === antigo.nome ? nome : n);
    if (p.idiomas_livres) p.idiomas_livres = p.idiomas_livres.map(n => n === antigo.nome ? nome : n);
  } else { p.idiomas_personalizados.push(novo); p.idiomas.push(nome); }
  return novo;
}

export function removerIdioma(p, id) {
  const antigo = p.idiomas_personalizados?.find(i => i.id === id);
  if (!antigo) return;
  p.idiomas_personalizados = p.idiomas_personalizados.filter(i => i.id !== id);
  p.idiomas = (p.idiomas || []).filter(n => n !== antigo.nome);
  if (p.idiomas_livres) p.idiomas_livres = p.idiomas_livres.filter(n => n !== antigo.nome);
}

export function abrirIdiomas(p, aoSalvar) {
  const abrir = () => { window.fecharModal(); abrirIdiomas(p, aoSalvar); };
  abrirModal('Idiomas', `<label>Buscar português / inglês<input id="idioma-busca" class="form-input"></label><div id="idioma-catalogo"></div><h3>Idiomas personalizados</h3><button class="btn btn-secondary" id="idioma-novo">Adicionar idioma personalizado</button>${(p.idiomas_personalizados || []).map(i => `<article>${rotuloLocalizado(i)}<p>${escHtml(i.escrita)} · ${escHtml(i.observacoes)}</p><button class="btn btn-secondary" data-idioma-editar="${escHtml(i.id)}">Editar</button><button class="btn btn-secondary" data-idioma-remover="${escHtml(i.id)}">Remover</button></article>`).join('')}`);
  const listar = () => {
    const el = document.getElementById('idioma-catalogo');
    el.innerHTML = IDIOMAS_CATALOGO.filter(i => correspondeBusca(i, document.getElementById('idioma-busca').value)).map(i => `<label class="sh-opcao"><input type="checkbox" data-idioma="${i.id}" ${(p.idiomas || []).includes(i.nome) ? 'checked' : ''}>${rotuloLocalizado(i)}<small>Escrita: ${escHtml(i.escrita || '—')} · ${escHtml(i.associacao)}</small></label>`).join('');
    el.querySelectorAll('[data-idioma]').forEach(b => { b.onchange = () => {
      const i = IDIOMAS_CATALOGO.find(i => i.id === b.dataset.idioma);
      p.idiomas = b.checked ? [...new Set([...(p.idiomas || []), i.nome])] : (p.idiomas || []).filter(n => n !== i.nome);
      aoSalvar();
    }; });
  };
  document.getElementById('idioma-busca').oninput = listar; listar();
  const editar = id => {
    const i = p.idiomas_personalizados?.find(i => i.id === id) || {};
    const campos = { nome: 'Nome principal (obrigatório)', en: 'Nome em inglês', escrita: 'Escrita / alfabeto', origem: 'Origem', observacoes: 'Observações' };
    window.fecharModal();
    abrirModal('Idioma personalizado', Object.entries(campos).map(([k, titulo]) => `<label>${titulo}<input class="form-input" id="idioma-${k}" value="${escHtml(i[k] || '')}"></label>`).join(''), '<button class="btn btn-primary" id="idioma-salvar">Salvar idioma</button>');
    document.getElementById('idioma-salvar').onclick = () => {
      try { salvarIdioma(p, Object.fromEntries(Object.keys(campos).map(k => [k, document.getElementById(`idioma-${k}`).value])), id); aoSalvar(); abrir(); }
      catch (e) { toast(e.message, 'error'); }
    };
  };
  document.getElementById('idioma-novo').onclick = () => editar();
  document.querySelectorAll('[data-idioma-editar]').forEach(b => { b.onclick = () => editar(b.dataset.idiomaEditar); });
  document.querySelectorAll('[data-idioma-remover]').forEach(b => { b.onclick = () => {
    if (!confirm('Remover este idioma personalizado usado na ficha?')) return;
    removerIdioma(p, b.dataset.idiomaRemover); aoSalvar(); abrir();
  }; });
}
