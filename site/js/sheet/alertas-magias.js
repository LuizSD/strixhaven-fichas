import { char, classesData, salvar } from './estado.js';
import { superficiesDaFicha } from './contexto-classe.js';
import { reservasDeEspacos } from './reservas-espacos.js';
import { getLimitesMagias, getBonusTruquesOrdem, escHtml, abrirModal } from '../utils.js';
import { getTruquesExtraEstiloLuta } from './combate.js';
import { preparadasComExtrasPorClasse, truquesComExtrasPorClasse } from '../regras-magia-classe.js';
import { renderFichaCompleta } from './ficha.js';
import { getConjuracaoSubclasse } from '../regras-conjuracao-subclasse.js';
import { classeInicial } from '../regras-multiclasse.js';

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
    const limites = getLimitesMagias(sup.tabela, sup.nivelClasse, getConjuracaoSubclasse(sup.classe, sup.subclasse, sup.nivelClasse));
    const truques = truquesComExtrasPorClasse(char, sup.classe, classesData);
    const preparadas = preparadasComExtrasPorClasse(char, sup.classe, classesData);
    for (const [real, esperado, titulo] of [
      [truques.desta.length, limites.truques + getBonusTruquesOrdem(char, sup.classe) + (sup.classe === classeInicial(char)?.classe ? getTruquesExtraEstiloLuta() : 0), 'truques'],
      [preparadas.desta.length, limites.preparadas, sup.tipo === 'conhecidas' ? 'magias conhecidas' : 'magias preparadas'],
    ]) {
      const aviso = divergenciaQuantidade(real, esperado, titulo);
      if (aviso) avisos.push({ ...aviso, regra: `${sup.classe}, nível ${sup.nivelClasse} · tabela de conjuração 2024 e bônus de opções da ficha` });
    }
    if (truques.semClasse.length || preparadas.semClasse.length) avisos.push({ severidade: 'warning', texto: 'Há magias sem classe atribuída; a contagem por classe é parcial.', regra: sup.classe });
  }
  const max = maiorCirculoAtual();
  const classes = (char.classes || [{ classe: char.classe }]).map(c => c.classe);
  for (const m of [...(char.magias_customizadas || []), ...(char.magias_conhecidas || []), ...(char.magias_preparadas || []), ...(char.grimorio || [])]) {
    if (Number(m.circulo) > max) avisos.push({ severidade: m.motivo ? 'info' : 'error', texto: `${m.nome}: ${m.circulo}º círculo — personagem atualmente conjura até o ${max}º. Registrada; não conjurável atualmente por espaços.`, regra: m.motivo || 'Reservas de espaços atuais; registrar não concede recursos.' });
    if (m.classes?.length && !m.classes.some(c => classes.includes(c))) avisos.push({ severidade: m.motivo ? 'info' : 'error', texto: `${m.nome}: fora das listas de classe.`, regra: m.motivo || 'Pode haver concessão por talento, antecedente, item ou regra da mesa; registre a justificativa.' });
  }
  return avisos;
}

export function renderAlertasMagias(resumo = false) {
  const avisos = alertasDaFicha();
  if (!avisos.length) return '';
  const aceito = !!char.justificativa_magias?.trim();
  const severidade = aceito ? 'info' : avisos.some(a => a.severidade === 'error') ? 'error' : 'warning';
  return `<aside class="catalogo-alerta ${severidade}" role="status"><strong>⚠ ${aceito ? 'Divergência aceita com justificativa' : 'Escolhas de magia fora da referência'} · ${avisos.length} aviso(s)</strong>${resumo ? '<p>Veja os contadores e detalhes na seção de magias.</p>' : `<ul>${avisos.map(a => `<li><strong>${escHtml(a.texto)}</strong><br>${escHtml(a.regra)}</li>`).join('')}</ul><p>Salvar, imprimir e exportar continuam disponíveis. Magias registradas não criam espaços. As cotas contam somente conhecidas/preparadas da classe.</p>`}<p>${escHtml(char.justificativa_magias || '')}</p><button class="btn btn-secondary no-print" data-justificar-magias>Detalhes / registrar justificativa</button></aside>`;
}

export function setupAlertasMagias(container) {
  container.querySelectorAll('[data-justificar-magias]').forEach(b => { b.onclick = () => {
    abrirModal('Escolhas de magia · detalhes e justificativa', `${renderAlertasMagias()}<label>Justificativa manual<textarea class="form-input" id="magias-justificativa">${escHtml(char.justificativa_magias || '')}</textarea></label><p>Para corrigir escolhas, use os controles de adicionar, editar e remover da seção Magias.</p>`, '<button class="btn btn-primary" id="magias-justificar-salvar">Salvar justificativa</button>');
    document.getElementById('magias-justificar-salvar').onclick = () => { char.justificativa_magias = document.getElementById('magias-justificativa').value; salvar(); window.fecharModal(); renderFichaCompleta(); };
  }; });
}
