import { char, classesData, salvar } from './estado.js';
import { superficiesDaFicha } from './contexto-classe.js';
import { reservasDeEspacos } from './reservas-espacos.js';
import { getLimitesMagias, getBonusTruquesOrdem, escHtml, abrirModal } from '../utils.js';
import { getTruquesExtraEstiloLuta } from './combate.js';
import { preparadasComExtrasPorClasse, truquesComExtrasPorClasse } from '../regras-magia-classe.js';
import { renderFichaCompleta } from './ficha.js';
import { getConjuracaoSubclasse } from '../regras-conjuracao-subclasse.js';
import { classeInicial } from '../regras-multiclasse.js';
import { resolverReferenciaMagia, normalizarMagia } from '../magias/modelo.js';
import { rotuloLocalizado } from '../catalogo-localizado.js';

export function identidadeAvisoMagia(m) {
  return resolverReferenciaMagia(m)?.id || m.catalogo_ref || m.id
    || `${m.source?.rulesVersion || '2024'}:${normalizarMagia(m.name?.en || m.nome)}:${m.circulo}`;
}

/** Une caminhos de leitura da mesma incompatibilidade, não motivos distintos. */
export function deduplicarObservacoes(avisos, personagemId = '') {
  const unicos = new Map();
  for (const a of avisos) {
    const chave = JSON.stringify([personagemId, a.magiaId || a.classe || 'ficha', a.codigo, a.parametros || null]);
    const anterior = unicos.get(chave);
    if (anterior) {
      anterior.alvos.push(...(a.alvos || []));
      if (!anterior.justificativa && a.justificativa) anterior.justificativa = a.justificativa;
      anterior.severidade = anterior.justificativa ? 'info' : anterior.severidade;
    } else unicos.set(chave, { ...a, chave, alvos:[...(a.alvos || [])] });
  }
  return [...unicos.values()];
}

export function maiorCirculoAtual() {
  return Math.max(0, ...reservasDeEspacos().filter(r => r.total > 0).map(r => r.circulo));
}

export function divergenciaQuantidade(real, esperado, rotulo) {
  if (real === esperado) return null;
  return { severidade: real > esperado ? 'error' : 'warning', texto: `${real}/${esperado} ${rotulo} — ${real > esperado ? 'excede' : 'falta'} ${Math.abs(real-esperado)}` };
}

export function alertasDaFicha() {
  const avisos = [];
  for (const sup of superficiesDaFicha(char)) {
    const limites = getLimitesMagias(sup.tabela, sup.nivelClasse, getConjuracaoSubclasse(sup.classe, sup.subclasse, sup.nivelClasse), char);
    const truques = truquesComExtrasPorClasse(char, sup.classe, classesData);
    const preparadas = preparadasComExtrasPorClasse(char, sup.classe, classesData);
    for (const [real, esperado, titulo] of [
      [truques.desta.length, limites.truques + getBonusTruquesOrdem(char, sup.classe) + (sup.classe === classeInicial(char)?.classe ? getTruquesExtraEstiloLuta() : 0), 'truques'],
      [preparadas.desta.length, limites.preparadas, sup.tipo === 'conhecidas' ? 'magias conhecidas' : 'magias preparadas'],
    ]) {
      const aviso = divergenciaQuantidade(real, esperado, titulo);
      if (aviso) avisos.push({ ...aviso, codigo: titulo === 'truques' ? 'QUANTIDADE_TRUQUES' : 'QUANTIDADE_MAGIAS', classe:sup.classe, regra: `${sup.classe}, nível ${sup.nivelClasse} · tabela de conjuração 2024 e bônus de opções da ficha`, justificativa:char.justificativa_magias || '' });
    }
    if (truques.semClasse.length || preparadas.semClasse.length) avisos.push({ codigo:'CLASSE_NAO_ATRIBUIDA', classe:sup.classe, severidade: 'warning', texto: 'Há magias sem classe atribuída; a contagem por classe é parcial.', regra: sup.classe, justificativa:char.justificativa_magias || '' });
  }
  const max = maiorCirculoAtual();
  const classes = (char.classes?.length ? char.classes : [{ classe: char.classe }]).map(c => c.classe);
  for (const colecao of ['magias_customizadas','magias_conhecidas','magias_preparadas','grimorio']) for (const [indice,m] of (char[colecao] || []).entries()) {
    const ref = resolverReferenciaMagia(m);
    const justificativa = m.motivo || char.justificativa_magias || '';
    const comum = { magiaId:identidadeAvisoMagia(m), nome:m.nome, name:m.name || ref?.name, justificativa,
      alvos:[{ colecao, indice, id:m.id }], severidade:justificativa ? 'info':'error' };
    if (Number(m.circulo) > max) avisos.push({ ...comum, codigo:'CIRCULO_SUPERIOR', parametros:[Number(m.circulo),max], texto: `${m.nome}: ${m.circulo}º círculo — personagem atualmente conjura até o ${max}º. Registrada; não conjurável atualmente por espaços.`, regra:'Reservas de espaços atuais; registrar não concede recursos.' });
    if (m.classes?.length && !m.classes.some(c => classes.includes(c))) avisos.push({ ...comum, codigo:'FORA_DA_CLASSE', parametros:[...m.classes].sort(), texto:`${m.nome}: fora das listas de classe.`, regra:`Classe atual: ${classes.join(' / ')}. Listas normais: ${m.classes.join(', ')}. Talentos, antecedentes e regras da mesa podem ampliar o acesso.` });
  }
  return deduplicarObservacoes(avisos, char.id);
}

export function renderAlertasMagias(resumo = false, local = 'magias') {
  const avisos = alertasDaFicha();
  if (!avisos.length) return '';
  const aceito = avisos.every(a => a.justificativa?.trim());
  return `<aside class="observacoes-resumo ${aceito ? 'info':'warning'}" role="status"><span>${aceito ? 'ⓘ':'⚠'} <strong>${avisos.length} ${aceito ? 'divergências aceitas':'observações de regras'}</strong></span><button class="btn btn-sm btn-secondary no-print" id="observacoes-${resumo ? 'resumo':local}" data-justificar-magias aria-haspopup="dialog">Ver detalhes</button></aside>`;
}

export function abrirObservacoesMagias(filtro = null) {
  const todos = alertasDaFicha();
  const avisos = filtro ? todos.filter(a => a.magiaId === filtro) : todos;
  abrirModal('Observações de regras de magias', `<p data-dialogo-descricao>Estas observações não impedem salvar ou exportar. As escolhas permanecem na ficha e não concedem espaços adicionais.</p>
    <div class="observacoes-lista">${avisos.map((a,i) => `<article class="observacao-item ${a.justificativa ? 'info':a.severidade}" data-regra-codigo="${escHtml(a.codigo)}">
      ${a.magiaId ? `<h3>${rotuloLocalizado(a)}</h3>` : `<h3>${escHtml(a.classe || 'Contagem')}</h3>`}
      <p><strong>${a.justificativa ? 'ⓘ':'⚠'} ${escHtml(a.texto)}</strong></p><p>${escHtml(a.regra)}</p>
      <p>Justificativa: ${escHtml(a.justificativa || 'não informada')}</p>
      ${a.magiaId ? `<label>Justificativa desta magia<textarea class="form-input" data-justificativa-individual="${i}">${escHtml(a.justificativa || '')}</textarea></label><div class="sh-acoes"><button class="btn btn-secondary" data-salvar-justificativa="${i}">Salvar justificativa da magia</button><button class="btn btn-secondary" data-remover-justificativa="${i}">Remover justificativa da magia</button><button class="btn btn-secondary" data-ir-magia="${i}">Ir à magia</button></div>` : ''}</article>`).join('')}</div>
    <label>Justificativa geral (contagens e exceções da ficha)<textarea class="form-input" id="magias-justificativa">${escHtml(char.justificativa_magias || '')}</textarea></label>`, '<button class="btn btn-secondary" id="magias-justificar-remover">Remover justificativa geral</button><button class="btn btn-primary" id="magias-justificar-salvar">Salvar justificativa</button>');
  const finalizar = () => { salvar(); window.fecharModal(); renderFichaCompleta(); };
  document.getElementById('magias-justificar-salvar').onclick = () => { char.justificativa_magias = document.getElementById('magias-justificativa').value; finalizar(); };
  document.getElementById('magias-justificar-remover').onclick = () => { delete char.justificativa_magias; finalizar(); };
  const modificar = (indice, valor) => {
    const id = avisos[indice].magiaId;
    for (const k of ['magias_customizadas','magias_conhecidas','magias_preparadas','grimorio']) for (const m of char[k] || []) if (identidadeAvisoMagia(m) === id) {
      if (valor) m.motivo = valor; else delete m.motivo;
    }
    finalizar();
  };
  document.querySelectorAll('[data-salvar-justificativa]').forEach(b => { b.onclick = () => modificar(Number(b.dataset.salvarJustificativa), document.querySelector(`[data-justificativa-individual="${b.dataset.salvarJustificativa}"]`).value.trim()); });
  document.querySelectorAll('[data-remover-justificativa]').forEach(b => { b.onclick = () => modificar(Number(b.dataset.removerJustificativa), ''); });
  document.querySelectorAll('[data-ir-magia]').forEach(b => { b.onclick = () => {
    const a = avisos[Number(b.dataset.irMagia)]; window.fecharModal();
    const elementos = [...document.querySelectorAll('[data-extra-id],[data-magia-ref],[data-magia-nome]')];
    const alvo = elementos.find(el => el.dataset.extraId && a.alvos.some(t => t.id && el.dataset.extraId === t.id))
      || elementos.find(el => el.dataset.magiaRef === a.magiaId || el.dataset.magiaNome === a.nome);
    if (alvo) queueMicrotask(() => { for (let pai=alvo.parentElement; pai; pai=pai.parentElement) if (pai.tagName === 'DETAILS') pai.open = true; alvo.tabIndex=-1; alvo.focus(); alvo.scrollIntoView({ block:'center', behavior:'smooth' }); });
  }; });
}
export function setupAlertasMagias(container) {
  container.querySelectorAll('[data-justificar-magias]').forEach(b => { b.onclick = () => abrirObservacoesMagias(); });
  container.querySelectorAll('[data-observacoes-magia]').forEach(b => { b.onclick = () => abrirObservacoesMagias(b.dataset.observacoesMagia); });
}
