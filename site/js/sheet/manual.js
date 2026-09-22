import { char, salvar, passivosTalentosCache } from './estado.js';
import { renderFichaCompleta } from './ficha.js';
import { abrirModal, calcCA, calcBonusPericia, calcMod, escHtml, toast } from '../utils.js';
import { PERICIAS } from '../dados-classes.js';
import { aplicarEdicao } from '../ficha-edicoes.js';
import { getEstadoFuria } from './classes/barbaro.js';
import { forcaPrimordialAtiva } from './combate.js';
import { novoId, numeroInformado, valorComAjuste } from '../strixhaven/modelo.js';
import { abrirIdiomas, IDIOMAS_CATALOGO } from '../idiomas-catalogo.js';
import { rotuloLocalizado } from '../catalogo-localizado.js';

export function renderIdiomasFicha() {
  const personalizados = char.idiomas_personalizados || [];
  const padrao = char.idiomas_padrao || (char.idiomas || []).filter(n => !personalizados.some(i => i.nome === n));
  return `<section class="card" id="idiomas-ficha"><h2>Idiomas</h2><div class="idiomas-selecionados">${padrao.map(nome => rotuloLocalizado(IDIOMAS_CATALOGO.find(i => i.nome === nome) || { nome })).join('')}${personalizados.map(i => rotuloLocalizado(i)).join('')}</div><div class="sh-acoes no-print"><button class="btn btn-primary bilingual-action" id="idioma-adicionar-direto">Adicionar idioma personalizado<small lang="en">Add custom language</small></button><button class="btn btn-secondary" id="idiomas-gerenciar">Gerenciar idiomas</button></div></section>`;
}

/** Valores derivados editáveis calculados sem aplicar o ajuste em si. */
function calculadosManuais() {
  const base = { ...char, ajustes_manuais: {} };
  const opcoesPericia = { emFuria: !!getEstadoFuria()?.ativa, forcaPrimordialAtiva: forcaPrimordialAtiva() };
  return { ca: calcCA(base, passivosTalentosCache), iniciativa: calcMod(char.atributos.destreza) + (passivosTalentosCache?.bonusIniciativa || 0),
    ...Object.fromEntries(PERICIAS.map(p => [`pericia:${p.nome}`, calcBonusPericia(base, p.nome, opcoesPericia)])) };
}

/** Painel de ajustes, e benefícios textuais sem efeitos ocultos. */
export function renderManual() {
  const calculados = calculadosManuais();
  return `<section class="card" id="ajustes-manuais"><header class="sh-titulo"><h3>Regras da mesa e ajustes manuais</h3><button class="btn btn-secondary no-print" id="manual-ajustar">Ajustar valores derivados</button></header>
    <p>O cálculo automático continua ativo. Ajustes condicionais descritos em texto não são aplicados automaticamente.</p>
    ${char.dados_importados_pendentes ? `<aside class="catalogo-alerta error" role="alert"><strong>⚠ Dados importados precisam de correção</strong><p>A ficha foi preservada. Alguns campos não tinham o formato esperado e seus valores originais continuam no JSON. Corrija-os pelos editores da ficha ou no arquivo importado.</p><details><summary>Ver dados originais preservados</summary><pre style="white-space:pre-wrap;overflow-wrap:anywhere">${escHtml(JSON.stringify(char.dados_importados_pendentes, null, 2))}</pre></details></aside>` : ''}
    <dl>${Object.entries(char.ajustes_manuais || {}).map(([k, a]) => `<div><dt>${escHtml(k)} · <span class="sh-selo">Ajuste manual</span></dt><dd>Calculado: ${escHtml(calculados[k] ?? '—')} · Ajuste: ${escHtml(a.ajuste ?? 0)} · Valor final manual: ${escHtml(a.final ?? '—')} · Efetivo: ${escHtml(valorComAjuste(char, k, calculados[k]))} · ${escHtml(a.motivo || '')}</dd></div>`).join('')}</dl>
    <div class="sh-acoes"><button class="btn btn-secondary no-print" id="manual-beneficio">+ Habilidade / benefício manual</button><button class="btn btn-secondary no-print" id="manual-proficiencias">Idiomas e proficiências extras</button><button class="btn btn-secondary no-print" id="manual-idiomas">Idiomas · Adicionar idioma personalizado</button></div>
    <div class="sh-grade">${(char.beneficios_manuais || []).map(b => `<article class="sh-registro"><h4>${escHtml(b.nome)} <span class="sh-selo">Extra</span></h4><p>${escHtml(b.tipo)} · ${escHtml(b.origem)}</p><p class="sh-texto">${escHtml(b.descricao)}</p><p>${escHtml(b.condicao)} · Uso: ${escHtml(b.usos)} · Recuperação: ${escHtml(b.recuperacao)}</p><p>Ataque: ${escHtml(b.ataque)} · Dano/tipo: ${escHtml(b.dano)} · Alcance: ${escHtml(b.alcance)}</p><button class="btn btn-sm btn-secondary no-print" data-beneficio-editar="${escHtml(b.id)}">Editar</button><button class="btn btn-sm btn-secondary no-print" data-beneficio-remover="${escHtml(b.id)}">Remover</button></article>`).join('')}</div></section>`;
}

/** Editor textual de benefício preserva todos os subcampos, usando ID. */
function editarBeneficio(id) {
  char.beneficios_manuais ||= [];
  const antigo = char.beneficios_manuais.find(b => b.id === id);
  const campos = { nome: 'Nome', tipo: 'Tipo (habilidade, talento, ataque...)', origem: 'Origem / motivo', descricao: 'Descrição', condicao: 'Condição (controle manual)', usos: 'Usos', recuperacao: 'Recuperação', ataque: 'Bônus de ataque', dano: 'Dano / tipo', alcance: 'Alcance' };
  abrirModal('Habilidade / benefício manual', `<div class="sh-grade">${Object.entries(campos).map(([k, r]) => `<label>${r}<textarea class="form-input" id="beneficio-${k}">${escHtml(antigo?.[k] || '')}</textarea></label>`).join('')}</div>`, '<button class="btn btn-primary" id="beneficio-salvar">Salvar</button>');
  document.getElementById('beneficio-salvar').onclick = () => {
    const novo = { ...antigo, id: antigo?.id || novoId(), ...Object.fromEntries(Object.keys(campos).map(k => [k, document.getElementById(`beneficio-${k}`).value])) };
    if (!novo.nome.trim()) { toast('Informe um nome.', 'error'); return; }
    if (antigo) {
      const indice = char.beneficios_manuais.findIndex(b => b.id === id);
      char.beneficios_manuais[indice] = novo;
    } else char.beneficios_manuais.push(novo);
    salvar(); window.fecharModal(); renderFichaCompleta();
  };
}

/** Liga ações manuais sem relaxar os seletores normais de criação. */
export function setupManual(container) {
  const salvarIdiomas = () => { salvar(); renderFichaCompleta(); };
  container.querySelector('#idioma-adicionar-direto')?.addEventListener('click', () => abrirIdiomas(char, salvarIdiomas, { criar:true }));
  container.querySelector('#idiomas-gerenciar')?.addEventListener('click', () => abrirIdiomas(char, salvarIdiomas));
  container.querySelector('#manual-idiomas')?.addEventListener('click', () => abrirIdiomas(char, () => { salvar(); renderFichaCompleta(); }));
  container.querySelector('#manual-beneficio')?.addEventListener('click', () => editarBeneficio());
  container.querySelectorAll('[data-beneficio-editar]').forEach(b => { b.onclick = () => editarBeneficio(b.dataset.beneficioEditar); });
  container.querySelectorAll('[data-beneficio-remover]').forEach(b => { b.onclick = () => {
    if (!confirm('Remover este benefício manual?')) return;
    char.beneficios_manuais = char.beneficios_manuais.filter(x => x.id !== b.dataset.beneficioRemover); salvar(); renderFichaCompleta();
  }; });
  container.querySelector('#manual-ajustar')?.addEventListener('click', () => {
    const calculados = calculadosManuais();
    abrirModal('Ajuste manual de valor derivado', `<label>Valor<select id="ajuste-chave" class="form-select">${Object.keys(calculados).map(k => `<option>${escHtml(k)}</option>`).join('')}</select></label><p id="ajuste-calculado"></p><label>Ajuste numérico<input id="ajuste-delta" class="form-input" type="number" value="0"></label><label>OU valor final manual (opcional)<input id="ajuste-final" class="form-input" type="number"></label><label>Motivo<input id="ajuste-motivo" class="form-input"></label>`, '<button class="btn btn-secondary" id="ajuste-restaurar">Restaurar automático</button><button class="btn btn-primary" id="ajuste-salvar">Salvar ajuste</button>');
    const chave = () => document.getElementById('ajuste-chave').value;
    const preencher = () => {
      const a = char.ajustes_manuais?.[chave()];
      document.getElementById('ajuste-calculado').textContent = `Calculado: ${calculados[chave()]}`;
      document.getElementById('ajuste-delta').value = a?.ajuste ?? 0;
      document.getElementById('ajuste-final').value = a?.final ?? '';
      document.getElementById('ajuste-motivo').value = a?.motivo ?? '';
    };
    document.getElementById('ajuste-chave').onchange = preencher; preencher();
    document.getElementById('ajuste-restaurar').onclick = () => { if (char.ajustes_manuais) delete char.ajustes_manuais[chave()]; salvar(); window.fecharModal(); renderFichaCompleta(); };
    document.getElementById('ajuste-salvar').onclick = () => {
      try {
        const final = document.getElementById('ajuste-final').value;
        const a = { ajuste: numeroInformado(document.getElementById('ajuste-delta').value, 'ajuste'), final: final.trim() === '' ? null : numeroInformado(final, 'valor final'), motivo: document.getElementById('ajuste-motivo').value };
        char.ajustes_manuais ||= {}; char.ajustes_manuais[chave()] = a;
        salvar(); window.fecharModal(); renderFichaCompleta();
      } catch (e) { toast(e.message, 'error'); }
    };
  });
  container.querySelector('#manual-proficiencias')?.addEventListener('click', () => {
    const grupos = { idiomas: 'Idiomas', pericias_proficientes: 'Perícias proficientes', pericias_expertise: 'Especializações', salvaguardas_proficientes: 'Salvaguardas', proficiencias_ferramentas: 'Ferramentas', proficiencias_instrumentos: 'Instrumentos' };
    abrirModal('Exceção da mesa · idiomas e proficiências', `<p>Uma entrada por linha. Perícias e salvaguardas devem usar os nomes da ficha para entrar nos cálculos. Nenhum limite de criação é aplicado neste editor explícito.</p>${Object.entries(grupos).map(([k, r]) => `<label>${r}<textarea class="form-input" id="lista-${k}">${escHtml((char[k] || []).join('\n'))}</textarea></label>`).join('')}`, '<button class="btn btn-primary" id="listas-salvar">Salvar exceções</button>');
    document.getElementById('listas-salvar').onclick = () => {
      char.edicoes ||= { versao: 1, campos: {} };
      for (const k of Object.keys(grupos)) {
        const texto = document.getElementById(`lista-${k}`).value;
        if (!texto.trim()) continue; // vazio preserva; remover pela edição normal, sem apagamento silencioso
        aplicarEdicao(char, k, [...new Set(texto.split('\n').map(s => s.trim()).filter(Boolean))]);
      }
      salvar(); window.fecharModal(); renderFichaCompleta();
    };
  });
}
