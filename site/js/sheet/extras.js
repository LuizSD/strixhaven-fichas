import { escolherExtra, renderExtra, calcularConjuracaoExtra } from '../strixhaven/extras.js';
import { abrirModal, escHtml, toast } from '../utils.js';
import { char, salvar } from './estado.js';
import { mostrarFormMagiaCustom } from './grimorio.js';
import { renderFichaCompleta } from './ficha.js';
import { reservasDeEspacos, gastarEspaco } from './reservas-espacos.js';
import { getEstadoFuria } from './classes/barbaro.js';
import { maiorCirculoAtual, renderAlertasMagias, setupAlertasMagias } from './alertas-magias.js';
import { abrirBuscaGlobalMagias } from '../magias/busca-ui.js';
import { abrirEditorMagia } from '../magias/editor.js';

/** Uma visão ordenável da coleção existente, sem copiar concessões para outras listas. */
export function renderExtrasDaFicha() {
  const extras = (char.magias_customizadas || []).filter(m => m.origem === 'extra');
  return `<section class="card" id="magias-extras"><h3>Magias registradas · escolhas livres</h3>${renderAlertasMagias()}<p>Ordem manual, independente do círculo. Preparação, cota e recurso são decisões separadas.</p><div class="sh-acoes"><button class="btn btn-primary spell-search-action" id="pesquisar-todas-magias">Pesquisar em todas as magias<small lang="en">Search all spells</small></button><button class="btn btn-secondary" id="magia-manual-global">Adicionar magia manualmente</button><button class="btn btn-secondary" id="catalogo-todos">Mostrar todas as magias · círculos 0–9</button></div><div class="sh-grade">${extras.map(m => `${m.circulo > maiorCirculoAtual() ? `<p class="catalogo-alerta ${m.motivo ? 'info' : 'error'}">⚠ ${escHtml(m.nome)}: ${m.circulo}º círculo — personagem atualmente conjura até o ${maiorCirculoAtual()}º. Não conjurável atualmente por espaços.</p>` : ''}${renderExtra(m, char)}`).join('')}</div></section>`;
}

/** Conjuração explícita: nenhuma reserva menor ou gratuita é inventada. */
function conjurarExtra(m) {
  const numeros = [m.circulo, m.usos_total ?? 0, m.usos_gastos ?? 0, ...[m.cd_manual, m.ataque_manual].filter(v => v != null)];
  if (numeros.some(v => !Number.isInteger(v)) || m.circulo < 0 || m.circulo > 9 || (m.usos_total ?? 0) < 0 || (m.usos_gastos ?? 0) < 0) {
    toast('Dados numéricos inválidos na magia extra. Corrija círculo, usos, CD ou ataque no editor antes de conjurar.', 'error'); return;
  }
  const valores = calcularConjuracaoExtra(m, char);
  if (m.sem_teste !== true && valores.cd_efetiva == null && valores.ataque_efetivo == null) {
    toast('Defina o atributo ou a CD/ataque necessários no editor. Para utilitárias, marque explicitamente que CD/ataque não se aplicam.', 'error'); return;
  }
  if (getEstadoFuria()?.ativa) { toast('Não é possível conjurar durante a Fúria.', 'error'); return; }
  const reservas = reservasDeEspacos().filter(r => r.circulo >= m.circulo && r.disponiveis > 0);
  const opcoes = [];
  if (m.circulo === 0 && !['grimório', 'registrada'].includes(m.estado_extra)) opcoes.push({ nome: 'Truque · sem espaço', tipo: 'truque' });
  else if (['preparada', 'sempre preparada'].includes(m.estado_extra)) reservas.forEach(r => opcoes.push({ nome: `${r.circulo}º círculo · ${r.fonte} (${r.disponiveis} disponíveis)`, tipo: 'espaco', reserva: r }));
  if (m.usos_total > (m.usos_gastos || 0)) opcoes.push({ nome: `Uso especial (${m.usos_total - (m.usos_gastos || 0)} restantes)`, tipo: 'especial' });
  if (m.ritual) opcoes.push({ nome: 'Ritual · confirmar acesso ao ritual e tempo adicional', tipo: 'ritual' });
  opcoes.push({ nome: 'Execução excepcional da mesa · explicitamente sem recurso', tipo: 'excepcional' });
  abrirModal(`Conjurar Extra: ${m.nome}`, `<p>${m.circulo > 0 && !reservas.length ? 'Não há recurso normal compatível disponível. Nenhum espaço será criado.' : 'Selecione o recurso a consumir.'}</p><p>${escHtml(m.tempo_conjuracao)} · ${escHtml(m.componentes)} · ${escHtml(m.duracao)}</p><label><input type="checkbox" id="extra-condicoes"> Confirmo tempo, componentes e condições de execução; ritual/exceção depende da regra da mesa.</label><label>Recurso<select id="extra-recurso" class="form-select">${opcoes.map((o, i) => `<option value="${i}">${escHtml(o.nome)}</option>`).join('')}</select></label>`, '<button class="btn btn-primary" id="extra-executar">Confirmar conjuração</button>');
  document.getElementById('extra-executar').onclick = () => {
    if (!document.getElementById('extra-condicoes').checked) { toast('Confirme as condições de execução.', 'error'); return; }
    const o = opcoes[Number(document.getElementById('extra-recurso').value)];
    if (o.tipo === 'espaco' && !gastarEspaco(char, o.reserva.fonte, o.reserva.circulo)) return;
    if (o.tipo === 'especial') m.usos_gastos = (m.usos_gastos || 0) + 1;
    if (m.concentracao) {
      char.efeitos_magicos = (char.efeitos_magicos || []).filter(e => !e.concentracao);
      char.efeitos_magicos.push({ nome: m.nome, extra_id: m.id, tipo: 'concentracao_generica', concentracao: true, circulo: m.circulo });
    }
    m.ultima_execucao = { tipo: o.tipo, em: new Date().toISOString() };
    salvar(); window.fecharModal(); renderFichaCompleta(); toast(`Extra: ${m.nome} · ${o.nome}`, 'success');
  };
}

/** Eventos localizados por ID, inclusive depois de renomear ou reordenar. */
export function setupExtras(container) {
  setupAlertasMagias(container);
  const atualizar = () => { salvar(); renderFichaCompleta(); };
  container.querySelector('#pesquisar-todas-magias')?.addEventListener('click', () => abrirBuscaGlobalMagias({ personagem: char, aoSalvar: atualizar }));
  container.querySelector('#magia-manual-global')?.addEventListener('click', () => abrirEditorMagia(char, { aoSalvar: atualizar }));
  container.querySelector('#catalogo-todos')?.addEventListener('click', () => escolherExtra(char, inicial => mostrarFormMagiaCustom(null, { inicial }), true));
  container.querySelector('#adicionar-magia-extra')?.addEventListener('click', () => escolherExtra(char, inicial => mostrarFormMagiaCustom(null, { inicial })));
  container.querySelectorAll('[data-extra-acao]').forEach(b => { b.onclick = () => {
    const id = b.closest('[data-extra-id]').dataset.extraId;
    const lista = char.magias_customizadas || [];
    const idx = lista.findIndex(m => m.id === id);
    if (idx < 0) return;
    const m = lista[idx];
    const acao = b.dataset.extraAcao;
    if (acao === 'editar-completa') { abrirEditorMagia(char, { magia: m, aoSalvar: atualizar }); return; }
    if (acao === 'editar') { mostrarFormMagiaCustom(idx); return; }
    if (acao === 'conjurar') { conjurarExtra(m); return; }
    if (acao === 'remover') {
      if (!confirm(`Remover somente a concessão extra de ${m.nome}?`)) return;
      lista.splice(idx, 1);
    } else {
      const extras = lista.filter(x => x.origem === 'extra');
      const posicao = extras.findIndex(x => x.id === id);
      const vizinha = extras[posicao + (acao === 'subir' ? -1 : 1)];
      const destino = vizinha ? lista.findIndex(x => x.id === vizinha.id) : -1;
      if (destino >= 0) [lista[idx], lista[destino]] = [lista[destino], lista[idx]];
    }
    salvar(); renderFichaCompleta();
  }; });
}
