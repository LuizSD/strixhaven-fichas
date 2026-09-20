import { getIndiceMagias, getMagia, getClasse } from '../db.js';
import { abrirModal, escHtml, semAcento, toast, bonusProficiencia, calcMod, getLimitesMagias, getEspacosMagia } from '../utils.js';
import { preparadasComExtrasPorClasse as preparadasPorClasse, truquesComExtrasPorClasse as truquesPorClasse } from '../regras-magia-classe.js';
import { novoId, numeroInformado } from './modelo.js';

/** Avisos não bloqueantes: seleção extra nunca filtra o catálogo por elegibilidade. */
export function avisosExtra(p, m) {
  const avisos = ['Exceção explícita de seleção da mesa; elegibilidade e cota normal não impedem o registro.'];
  const classes = (p.classes || [{ classe: p.classe }]).map(c => c.classe);
  if (m.classes?.length && !m.classes.some(c => classes.includes(c))) avisos.push('Fora das listas básicas de classe; antecedentes e talentos podem ampliar a elegibilidade.');
  if (m.circulo > 0) avisos.push('Registrar não concede espaços ou usos gratuitos; confira uma reserva de círculo igual ou superior ao conjurar.');
  return avisos;
}

/** Compara com as cotas reais da classe inicial sem restringir a seleção extra. */
async function avisosElegibilidade(p, m) {
  const avisos = avisosExtra(p, m);
  const classe = p.classes?.[0] || { classe: p.classe, nivel: p.nivel };
  if (!classe.classe) return avisos;
  const dados = await getClasse(classe.classe);
  const tabela = dados?.tabela_caracteristicas;
  const limites = getLimitesMagias(tabela, classe.nivel || 1);
  const espacos = getEspacosMagia(tabela, classe.nivel || 1);
  if (m.circulo > 0 && !Object.keys(espacos).some(c => Number(c) >= m.circulo)) avisos.push(`Círculo acima dos espaços da classe ${classe.classe} neste nível. Nenhum recurso adicional é concedido.`);
  const contagem = m.circulo === 0 ? truquesPorClasse(p, classe.classe).desta.length : preparadasPorClasse(p, classe.classe).desta.length;
  const limite = m.circulo === 0 ? limites.truques : limites.preparadas;
  if (contagem >= limite) avisos.push(`Cota normal de ${m.circulo === 0 ? 'truques' : 'preparadas'} de ${classe.classe} atingida (${contagem}/${limite}). Extra pode excedê-la explicitamente.`);
  return avisos;
}

/** Busca completa, inclusive truques, duplicatas e círculos indisponíveis. */
export async function escolherExtra(p, editar) {
  const indice = await getIndiceMagias();
  if (!indice) { toast('Catálogo indisponível. Tente novamente após carregar os dados.', 'error'); return; }
  abrirModal('Adicionar magia extra', `<p><span class="sh-selo">Extra</span> Regra da mesa · Não ocupa vaga por padrão. Não concede recursos.</p><label>Buscar em todo o catálogo<input id="extra-busca" class="form-input" placeholder="Nome de qualquer magia ou truque"></label><button class="btn btn-secondary" id="extra-manual">Criar magia manualmente</button><div id="extra-resultados" class="sh-resultados"></div>`);
  const mostrar = () => {
    const termo = semAcento(document.getElementById('extra-busca').value);
    const lista = indice.magias.filter(m => semAcento(m.nome).includes(termo));
    const el = document.getElementById('extra-resultados');
    el.innerHTML = lista.map((m, i) => `<button class="sh-opcao" data-extra-opcao="${i}"><strong>${escHtml(m.nome)}</strong><span>${m.circulo ? `${m.circulo}º círculo` : 'Truque'} · ${escHtml((m.classes || []).join(', '))}</span></button>`).join('');
    el.querySelectorAll('[data-extra-opcao]').forEach(b => { b.onclick = async () => {
      const resumo = lista[Number(b.dataset.extraOpcao)];
      const completa = await getMagia(resumo.nome, resumo.circulo, resumo.id);
      if (!completa) { toast('Não foi possível carregar os detalhes da magia.', 'error'); return; }
      window.fecharModal();
      editar({ ...structuredClone(completa), catalogo_ref: completa.id || `2024:${resumo.circulo}:${resumo.nome}`, restricoes_excedidas: await avisosElegibilidade(p, resumo) });
    }; });
  };
  document.getElementById('extra-busca').oninput = mostrar;
  document.getElementById('extra-manual').onclick = () => { window.fecharModal(); editar({}); };
  mostrar();
}

/** Controles extras inseridos no editor de personalizadas já existente. */
export function camposExtra(m = {}, p = {}) {
  const texto = (k, titulo, tipo = 'text', valor = m[k]) => `<label>${titulo}<input class="form-input" id="extra-${k}" type="${tipo}" value="${escHtml(valor ?? '')}"></label>`;
  return `<fieldset class="sh-extra-editor"><legend>Extra · regra da mesa</legend><p>Não ocupa vaga por padrão. A origem de classe independente é preservada. Ações, materiais, concentração e ritual continuam exigindo suas condições.</p>
    ${(m.restricoes_excedidas || []).map(a => `<p>${escHtml(a)}</p>`).join('')}
    <div class="sh-grade">${texto('motivo', 'Motivo (opcional)')}
    <label>Estado<select id="extra-estado" class="form-select">${['sempre preparada', 'preparada', 'conhecida', 'grimório'].map(v => `<option ${m.estado_extra === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label>Atributo de conjuração<select id="extra-atributo" class="form-select"><option value="">Definir antes de conjurar</option>${['forca', 'destreza', 'constituicao', 'inteligencia', 'sabedoria', 'carisma'].map(v => `<option ${m.atributo_extra === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label>Classe cuja cota pode ocupar<select id="extra-classe" class="form-select"><option value="">Sem cota de classe</option>${(p.classes || [{ classe: p.classe }]).filter(c => c.classe).map(c => `<option ${m.classe === c.classe ? 'selected' : ''}>${escHtml(c.classe)}</option>`).join('')}</select></label>
    ${texto('cd_manual', 'CD manual (opcional)', 'number')}${texto('ataque_manual', 'Ataque manual (opcional)', 'number')}
    ${texto('usos_total', 'Uso especial: quantidade (0 = nenhum)', 'number', m.usos_total ?? 0)}
    ${texto('usos_gastos', 'Uso especial: usos já gastos (0 para recuperar manualmente)', 'number', m.usos_gastos ?? 0)}
    <label>Recuperação<select id="extra-recuperacao" class="form-select">${['manual', 'descanso longo', 'descanso curto'].map(v => `<option ${m.recuperacao === v ? 'selected' : ''}>${v}</option>`).join('')}</select></label>
    <label><input id="extra-concentracao" type="checkbox" ${m.concentracao || /concentra/i.test(m.duracao || '') ? 'checked' : ''}> Concentração</label></div></fieldset>`;
}

/** Controle explícito para utilitárias que não usam CD ou jogada de ataque. */
export function campoExtraSemTeste(m = {}) {
  return `<label class="sh-campo"><span><input type="checkbox" id="extra-sem-teste" ${m.sem_teste === true ? 'checked' : ''}> Esta magia não usa CD/ataque (não se aplica)</span></label>`;
}

/** Lê configuração sem coerções silenciosas, preservando propriedades desconhecidas. */
export function lerExtra(anterior, p) {
  const valor = k => document.getElementById(`extra-${k}`).value;
  const opcional = k => valor(k).trim() === '' ? null : numeroInformado(valor(k), k);
  return { id: anterior?.id || novoId(), origem: 'extra', motivo: valor('motivo'),
    estado_extra: valor('estado'), atributo_extra: valor('atributo'), cd_manual: opcional('cd_manual'), ataque_manual: opcional('ataque_manual'),
    classe: valor('classe'),
    sem_teste: document.getElementById('extra-sem-teste')?.checked === true,
    usos_total: numeroInformado(valor('usos_total'), 'quantidade de usos', { min: 0 }), usos_gastos: numeroInformado(valor('usos_gastos'), 'usos gastos', { min: 0 }),
    recuperacao: valor('recuperacao'), concentracao: document.getElementById('extra-concentracao').checked,
    restricoes_excedidas: anterior?.restricoes_excedidas || avisosExtra(p, anterior || {}) };
}

/** Extra ocupa cota apenas por opção e no estado pertinente; nunca duplica no acervo. */
/** Uma fórmula compartilhada pela ficha e pelos PDFs, sem assumir classe da extra. */
export function calcularConjuracaoExtra(m, p) {
  if (m.sem_teste === true) return { cd_calculada: null, ataque_calculado: null, cd_efetiva: null, ataque_efetivo: null };
  const valor = p.atributos?.[m.atributo_extra];
  // Compatibilidade com inteiros legados em texto, sem transformar vazio em zero
  // ou um atributo ausente em 10. A ficha não é modificada por esta leitura.
  const numero = typeof valor === 'number' ? valor : typeof valor === 'string' && /^[-+]?\d+$/.test(valor.trim()) ? Number(valor) : NaN;
  const mod = m.atributo_extra && Number.isFinite(numero) ? calcMod(numero) + bonusProficiencia(p.nivel) : null;
  return { cd_calculada: mod === null ? null : 8 + mod, ataque_calculado: mod,
    cd_efetiva: m.cd_manual ?? (mod === null ? null : 8 + mod), ataque_efetivo: m.ataque_manual ?? mod };
}

/** Cartão usa ID, e mantém propriedades e concessão isoladas do catálogo. */
export function renderExtra(m, p) {
  const valores = calcularConjuracaoExtra(m, p);
  const cd = valores.cd_efetiva ?? (m.sem_teste === true ? 'não se aplica' : 'definir');
  const ataque = valores.ataque_efetivo ?? (m.sem_teste === true ? 'não se aplica' : 'definir');
  const preparada = m.circulo === 0 ? m.estado_extra !== 'grimório' : ['preparada', 'sempre preparada'].includes(m.estado_extra);
  const cota = m.sempre_preparada === false ? `${preparada ? 'Ocupa vaga' : 'Ocupará vaga ao preparar/conhecer'} · ${m.classe || 'classe não atribuída'}` : 'Não ocupa vaga';
  return `<article class="magia-item sh-extra" data-extra-id="${escHtml(m.id)}"><h4>${escHtml(m.nome)} <span class="sh-selo">Extra</span></h4><p>${m.circulo ? `${escHtml(m.circulo)}º círculo` : 'Truque'} · ${escHtml(m.estado_extra)} · ${escHtml(cota)}</p>
    <p>CD ${escHtml(cd)} · Ataque ${escHtml(ataque)} · ${escHtml(m.atributo_extra || 'Atributo não definido')}${m.cd_manual != null || m.ataque_manual != null ? ' · <span class="sh-selo">Ajuste manual</span>' : ''}</p><p>Uso especial: ${Math.max(0, (m.usos_total || 0) - (m.usos_gastos || 0))}/${escHtml(m.usos_total || 0)} · ${escHtml(m.recuperacao || 'manual')}</p>
    <details><summary>Detalhes e origem</summary><p>Regra da mesa: ${escHtml(m.motivo || 'sem motivo informado')}</p><p>${escHtml(m.tempo_conjuracao)} · ${escHtml(m.alcance)} · ${escHtml(m.componentes)} · ${escHtml(m.duracao)}${m.concentracao ? ' · Concentração' : ''}${m.ritual ? ' · Ritual' : ''}</p><p>${escHtml(m.dano)}</p><p class="sh-texto">${escHtml(m.descricao)}</p>${(m.restricoes_excedidas || []).map(a => `<p>${escHtml(a)}</p>`).join('')}</details>
    <div class="sh-acoes no-print"><button class="btn btn-sm btn-primary" data-extra-acao="conjurar">Conjurar</button><button class="btn btn-sm btn-secondary" data-extra-acao="editar">Editar</button><button class="btn btn-sm btn-secondary" data-extra-acao="subir" aria-label="Mover extra para cima">↑</button><button class="btn btn-sm btn-secondary" data-extra-acao="descer" aria-label="Mover extra para baixo">↓</button><button class="btn btn-sm btn-secondary" data-extra-acao="remover">Remover extra</button></div></article>`;
}
