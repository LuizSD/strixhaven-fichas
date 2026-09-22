import { getIndiceMagias, getMagia } from '../db.js';
import { listarPersonagens, salvarPersonagem } from '../store.js';
import { abrirModal, escHtml, toast } from '../utils.js';
import { rotuloLocalizado } from '../catalogo-localizado.js';
import { filtrarMagias, magiaSelecionada, conflitosMagia, adicionarMagiaRegistrada, reconciliarMagias, componentesMagia, CLASSES_MAGIA_EN, ESCOLAS_MAGIA_EN } from './modelo.js';
import { contextoDeMagias, compatibilidadeMagia } from './contexto.js';
import { abrirEditorMagia } from './editor.js';

export function htmlCompatibilidade(m, contexto) {
  const c = compatibilidadeMagia(m, contexto);
  if (c.semFicha) return '<p>Escolha uma ficha para comparar compatibilidade.</p>';
  return c.textos.length ? `<div class="spell-warning ${m.motivo ? 'info' : 'error'}" role="status">${c.textos.map(t => `<p>⚠ ${escHtml(t)}</p>`).join('')}${m.motivo ? `<p>Justificativa: ${escHtml(m.motivo)}</p>` : ''}</div>` : '<p class="spell-compatible">✓ Compatível com as sugestões de classe e nível.</p>';
}
function metadados(m) {
  return `<p><strong>${m.circulo === 0 ? 'Truque · nível 0' : m.circulo+'º círculo'}</strong> · ${escHtml(m.escola)}${ESCOLAS_MAGIA_EN[m.escola] ? ` / ${escHtml(ESCOLAS_MAGIA_EN[m.escola])}` : ''}</p>
    <div class="spell-classes">${(m.classes || []).map(c => `<span class="badge">${escHtml(c)}${CLASSES_MAGIA_EN[c] ? ` <small lang="en">${escHtml(CLASSES_MAGIA_EN[c])}</small>` : ''}</span>`).join('')}</div>
    <p><span class="badge">Ritual: ${m.ritual ? 'Sim' : 'Não'}</span> <span class="badge">Concentração: ${m.concentracao ? 'Sim' : 'Não'}</span></p>
    <p class="spell-source">${escHtml(m.source?.sourceTitle || 'Fonte personalizada')} · ${escHtml(m.source?.rulesVersion || 'custom')}${m.source?.printedPage ? ' · p. '+escHtml(m.source.printedPage) : ' · página não informada'}</p>`;
}
export async function abrirDetalhesMagia(m, p = null) {
  const completa = m.source?.rulesVersion === 'custom' ? m : await getMagia(m.nome, m.circulo, m.id) || m;
  const ctx = await contextoDeMagias(p);
  const comp = componentesMagia(completa);
  abrirModal('Detalhes da magia', `${rotuloLocalizado(completa)}${metadados(completa)}${htmlCompatibilidade(completa, ctx)}
    <dl><dt>Tempo de conjuração</dt><dd>${escHtml(completa.tempo_conjuracao || 'Não informado')}</dd><dt>Alcance</dt><dd>${escHtml(completa.alcance || 'Não informado')}</dd>
    <dt>Componentes</dt><dd>${['verbal','somatic','material'].filter(k => comp[k]).map(k => ({ verbal:'V — Verbal', somatic:'S — Somático', material:'M — Material' })[k]).join(', ') || 'Não informados'}</dd>
    ${comp.materialSummary ? `<dt>Resumo material</dt><dd>${escHtml(comp.materialSummary)}</dd>` : ''}<dt>Duração</dt><dd>${escHtml(completa.duracao || 'Não informada')}</dd></dl>
    <p class="sh-texto">${escHtml(completa.descricao || 'Consulte os efeitos completos na referência indicada. O catálogo não reproduz descrições extensas do livro privado.')}</p>
    <p>Tradução de interface: ${escHtml(completa.name?.ptBRStatus || 'missing')}. Identificador: ${escHtml(completa.id || '')}</p>`);
}

/** Mesma adição em rota, modal e sugestões manuais. Somente escolhas são gravadas. */
export async function abrirAdicaoMagia(p, m, aoSalvar = () => salvarPersonagem(p)) {
  const completa = m.source?.rulesVersion === 'custom' ? m : await getMagia(m.nome, m.circulo, m.id) || m;
  const ctx = await contextoDeMagias(p);
  const repetida = conflitosMagia(p, completa).length > 0;
  const classes = ctx?.classes || [];
  abrirModal('Adicionar à ficha', `${rotuloLocalizado(completa)}<p>Destino: <strong>${escHtml(p.nome)}</strong></p>${metadados(completa)}${htmlCompatibilidade(completa, ctx)}
    <p>Registrar não concede espaços, CD ou ataque. Conhecimento/preparo e recurso de conjuração são controles separados.</p>
    <label>Estado da magia<select class="form-select" id="ga-estado">${['registrada','conhecida','preparada','sempre preparada','grimório'].map(e => `<option>${e}</option>`).join('')}</select></label>
    <label>Classe da cota<select class="form-select" id="ga-classe"><option value="">Sem classe atribuída</option>${classes.map(c => `<option>${escHtml(c.classe)}</option>`).join('')}</select></label>
    <label><input id="ga-cota" type="checkbox" checked> Contabilizar na cota quando conhecida/preparada</label>
    <label>Justificativa opcional<select id="ga-tipo" class="form-select"><option value="">Sem justificativa</option>${['Regra da mesa','Talento','Antecedente','Recompensa','Item','Strixhaven','Outro'].map(v => `<option>${v}</option>`).join('')}</select></label>
    <label>Detalhes da justificativa<textarea class="form-input" id="ga-motivo"></textarea></label>
    ${repetida ? '<label class="spell-warning error"><input id="ga-versao" type="checkbox"> Esta magia já está registrada. Confirmo que quero outra versão/instância.</label>' : ''}
    <p id="ga-erro" role="alert"></p>`, '<button class="btn btn-primary" id="ga-salvar">Adicionar à ficha</button>');
  if (classes.length === 1) document.getElementById('ga-classe').value = classes[0].classe;
  document.getElementById('ga-salvar').onclick = () => {
    const tipo = document.getElementById('ga-tipo').value;
    const motivo = document.getElementById('ga-motivo').value.trim();
    try {
      adicionarMagiaRegistrada(p, completa, { estado: document.getElementById('ga-estado').value, classe: document.getElementById('ga-classe').value,
        ocupaCota: document.getElementById('ga-cota').checked, motivo: [tipo, motivo].filter(Boolean).join(' — '), justificativaTipo: tipo,
        confirmarVersao: !!document.getElementById('ga-versao')?.checked });
      window.fecharModal(); aoSalvar(p); toast('Magia registrada; espaços e cálculos preservados.', 'success');
    } catch (e) { document.getElementById('ga-erro').textContent = e.message; }
  };
}

/** Única mega busca, reutilizada no menu e dentro da ficha/criação. */
export async function montarBuscaMagias(el, { personagem = null, aoSalvar = null, compativeis = false, consulta = '' } = {}) {
  el.innerHTML = '<p role="status">Carregando o catálogo local de magias…</p>';
  const dados = await getIndiceMagias({ incluirLegado: true });
  if (!dados) { el.innerHTML = '<p role="alert">Catálogo local indisponível. Reabra após concluir o carregamento do aplicativo.</p>'; return; }
  const catalogo = dados.magias;
  const destinos = listarPersonagens();
  const idsSalvos = new Set(destinos.map(p => p.id));
  if (personagem) {
    const pos = destinos.findIndex(p => p.id === personagem.id);
    if (pos >= 0) destinos[pos] = personagem; else destinos.unshift(personagem);
  }
  let atual = personagem, ctx = null, limite = 50, revisao = 0, timer;
  const seletor = (chave, titulo, itens) => `<label>${titulo}<select class="form-select" data-gs="${chave}"><option value="">Todos</option>${itens.map(([v,t]) => `<option value="${escHtml(v)}">${escHtml(t)}</option>`).join('')}</select></label>`;
  el.innerHTML = `<section class="spell-browser" aria-label="Todas as Magias / All Spells">
    <h2>Todas as Magias <small lang="en">All Spells</small></h2>
    <p>Catálogo global, independente da classe e do nível. Todas as escolhas podem ser registradas.</p>
    <label>Ficha de destino / compatibilidade<select class="form-select" data-gs="destino"><option value="">Sem ficha — consultar catálogo</option>${destinos.map(p => `<option value="${escHtml(p.id)}" ${p.id === personagem?.id ? 'selected' : ''}>${escHtml(p.nome)}${p === personagem && !idsSalvos.has(p.id) ? ' (em criação)' : ''}</option>`).join('')}</select></label>
    <label>Mega busca · português / inglês<input class="form-input" data-gs="busca" type="search" placeholder="Guidance, orientacao, wizard, adivinhação, 3º círculo" value="${escHtml(consulta)}" autocomplete="off"></label>
    <div class="spell-filter-grid">
    ${seletor('circulo', 'Círculo', Array.from({ length: 10 }, (_,i) => [i, i === 0 ? '0 — Truque / Cantrip' : `${i}º círculo`]))}
    <label>Classes (uma ou várias)<select multiple size="4" class="form-select" data-gs="classes">${[...new Set(catalogo.flatMap(m => m.classes))].sort().map(c => `<option value="${escHtml(c)}">${escHtml(c)} / ${escHtml(CLASSES_MAGIA_EN[c] || c)}</option>`).join('')}</select></label>
    ${seletor('escola', 'Escola', [...new Set(Object.values(ESCOLAS_MAGIA_EN))].map(en => [en, `${Object.keys(ESCOLAS_MAGIA_EN).find(k => ESCOLAS_MAGIA_EN[k] === en)} / ${en}`]))}
    ${seletor('origem', 'Origem', [['2024','2024'], ['2014-legacy','Legado 2014 — PHB'], ['strixhaven','Strixhaven'], ['custom','Personalizadas da ficha']])}
    ${seletor('ritual', 'Ritual', [['sim','Sim'],['nao','Não']])}${seletor('concentracao', 'Concentração', [['sim','Sim'],['nao','Não']])}
    <label><input type="checkbox" data-gs="compativeis" ${compativeis ? 'checked' : ''}> Compatível com minha ficha</label>
    <label><input type="checkbox" data-gs="selecionadas"> Somente magias já selecionadas</label></div>
    <div class="sh-acoes"><button class="btn btn-primary" data-gs="limpar">Limpar filtros / Mostrar todas</button><button class="btn btn-secondary" data-gs="circulos">Mostrar todos os círculos (0–9)<small lang="en">Show all spell levels (0–9)</small></button><button class="btn btn-secondary" data-gs="manual">Adicionar magia manualmente</button></div>
    <p role="status" aria-live="polite" data-gs="contador"></p><div class="spell-results" data-gs="resultados"></div><button class="btn btn-secondary" data-gs="mais">Mostrar mais resultados</button>
    </section>`;
  const q = k => el.querySelector(`[data-gs="${k}"]`);
  const gravar = p => {
    if (p === personagem && aoSalvar) aoSalvar(p); else salvarPersonagem(p);
    mostrar();
  };
  const adicionar = m => {
    if (!atual) { toast('Escolha a ficha de destino antes de adicionar.', 'info'); q('destino').focus(); return; }
    abrirAdicaoMagia(atual, m, gravar);
  };
  function mostrar() {
    if (!el.isConnected) return;
    const pessoais = (atual?.magias_customizadas || []).filter(m => m.source?.rulesVersion === 'custom' && !m.catalogo_ref);
    const filtros = Object.fromEntries(['busca','circulo','escola','origem','ritual','concentracao'].map(k => [k, q(k).value]));
    filtros.classes = [...q('classes').selectedOptions].map(o => o.value);
    filtros.compativeis = q('compativeis').checked; filtros.selecionadas = q('selecionadas').checked;
    const lista = filtrarMagias([...catalogo, ...pessoais], filtros, atual, m => compatibilidadeMagia(m, ctx).compativel)
      .sort((a,b) => (a.name?.ptBR || a.nome).localeCompare(b.name?.ptBR || b.nome, 'pt-BR') || (a.id || '').localeCompare(b.id || ''));
    q('contador').textContent = `${lista.length} magias encontradas · exibindo ${Math.min(limite, lista.length)} · catálogo canônico: ${catalogo.length}`;
    const visiveis = lista.slice(0, limite);
    q('resultados').innerHTML = visiveis.map((m,i) => `<article class="spell-result" data-spell-id="${escHtml(m.id)}">${rotuloLocalizado(m)}${metadados(m)}${magiaSelecionada(atual,m) ? '<p class="badge">Já registrada nesta ficha</p>' : ''}${htmlCompatibilidade(m,ctx)}<div class="sh-acoes"><button class="btn btn-secondary" data-gs-detalhes="${i}">Detalhes</button><button class="btn btn-primary" data-gs-adicionar="${i}">Adicionar à ficha</button></div></article>`).join('') || '<p>Nenhum resultado. Limpe os filtros para voltar ao catálogo inteiro.</p>';
    q('resultados').setAttribute('aria-busy', 'false');
    q('mais').hidden = lista.length <= limite;
    el.querySelectorAll('[data-gs-detalhes]').forEach(b => { b.onclick = () => abrirDetalhesMagia(visiveis[Number(b.dataset.gsDetalhes)], atual); });
    el.querySelectorAll('[data-gs-adicionar]').forEach(b => { b.onclick = () => adicionar(visiveis[Number(b.dataset.gsAdicionar)]); });
  }
  const mudarDestino = async () => {
    const rodada = ++revisao;
    atual = destinos.find(p => p.id === q('destino').value) || null;
    if (atual) reconciliarMagias(atual, catalogo);
    const contexto = await contextoDeMagias(atual);
    if (rodada !== revisao || !el.isConnected) return;
    ctx = contexto; limite = 50; mostrar();
  };
  q('destino').onchange = mudarDestino;
  q('busca').oninput = () => {
    clearTimeout(timer);
    q('resultados').setAttribute('aria-busy', 'true');
    q('resultados').querySelectorAll('button').forEach(b => { b.disabled = true; });
    timer = setTimeout(() => { limite = 50; mostrar(); }, 70);
  };
  for (const k of ['circulo','classes','escola','origem','ritual','concentracao','compativeis','selecionadas']) q(k).onchange = () => { limite = 50; mostrar(); };
  q('limpar').onclick = () => {
    for (const k of ['busca','circulo','escola','origem','ritual','concentracao']) q(k).value = '';
    for (const o of q('classes').options) o.selected = false;
    q('compativeis').checked = false; q('selecionadas').checked = false; limite = 50; mostrar();
  };
  q('circulos').onclick = () => { q('circulo').value = ''; q('compativeis').checked = false; limite = 50; mostrar(); };
  q('mais').onclick = () => { limite += 50; mostrar(); };
  q('manual').onclick = () => {
    if (!atual) { toast('Escolha uma ficha de destino para criar a magia.', 'info'); q('destino').focus(); return; }
    const alvo = atual;
    abrirEditorMagia(alvo, { aoSalvar: () => gravar(alvo), selecionarCatalogo: m => abrirAdicaoMagia(alvo, m, gravar), nomeInicial: q('busca').value });
  };
  await mudarDestino();
}
export async function abrirBuscaGlobalMagias(opcoes = {}) {
  abrirModal('Todas as Magias / All Spells', '<div id="spell-global-modal"></div>');
  const el = document.getElementById('spell-global-modal');
  await montarBuscaMagias(el, opcoes);
  el.querySelector('[data-gs="busca"]')?.focus();
}
