// Identidade do catálogo e da instância são distintas. Não escreve espaços/CD.
import { novoId } from '../strixhaven/modelo.js';

export const CLASSES_MAGIA_EN = { Bardo: 'Bard', Clérigo: 'Cleric', Druida: 'Druid', Paladino: 'Paladin', Guardião: 'Ranger', Feiticeiro: 'Sorcerer', Bruxo: 'Warlock', Mago: 'Wizard', Guerreiro: 'Fighter', Ladino: 'Rogue', Bárbaro: 'Barbarian', Monge: 'Monk', Artífice: 'Artificer' };
CLASSES_MAGIA_EN['artificer-ua-2019']='Artífice Artificer UA 2019';
export const ESCOLAS_MAGIA_EN = { Abjuração: 'Abjuration', Conjuração: 'Conjuration', Invocação: 'Conjuration', Adivinhação: 'Divination', Encantamento: 'Enchantment', Evocação: 'Evocation', Ilusão: 'Illusion', Necromancia: 'Necromancy', Transmutação: 'Transmutation' };
export const normalizarMagia = valor => String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
export const nomesMagia = m => [...new Set([m?.nome, typeof m?.name === 'string' ? m.name : m?.name?.ptBR, m?.name?.en, ...(m?.name?.aliases || [])].filter(Boolean).map(normalizarMagia))];
export function componentesMagia(m) {
  const texto = String(m?.componentes || '');
  return { verbal: /\bV\b/.test(texto), somatic: /\bS\b/.test(texto), material: /\bM\b/.test(texto), materialSummary: m?.material_resumo || texto.match(/\((.*)\)/s)?.[1] || '' };
}
export const colecoesMagias = ['magias_conhecidas', 'magias_preparadas', 'grimorio', 'magias_customizadas'];
export const magiasRegistradas = p => colecoesMagias.flatMap(k => Array.isArray(p?.[k]) ? p[k] : []);
let catalogoDisponivel = [];
export function registrarCatalogoMagias(lista) {
  const mapa = new Map(catalogoDisponivel.map(m => [m.id, m]));
  for (const m of lista) if (m.id) mapa.set(m.id, m);
  catalogoDisponivel = [...mapa.values()];
}
export function resolverReferenciaMagia(m, catalogo = catalogoDisponivel) {
  if (!m || typeof m !== 'object') return null;
  const ref = m.catalogo_ref || m.id;
  const exata = catalogo.find(c => c.id === ref || c.legacyIds?.includes(ref));
  if (exata) return exata;
  if (m.source?.rulesVersion === 'custom' && !m.catalogo_ref) return null;
  const versao = String(ref || '').startsWith('phb-2014-') ? '2014-legacy'
    : m.source?.rulesVersion && m.source.rulesVersion !== 'custom' ? m.source.rulesVersion : '2024';
  const nomes = nomesMagia(m);
  const candidatas = catalogo.filter(c => c.source?.rulesVersion === versao
    && (m.circulo == null || Number(m.circulo) === c.circulo)
    && nomesMagia(c).some(n => nomes.includes(n)));
  return candidatas.length === 1 ? candidatas[0] : null; // Nunca aproxima nomes parecidos.
}
export function reconciliarMagias(p, catalogo = catalogoDisponivel) {
  if (!p || !catalogo.length) return false;
  let mudou = false;
  for (const campo of colecoesMagias) for (const [indice, valor] of (Array.isArray(p[campo]) ? p[campo] : []).entries()) {
    let m = valor;
    if (typeof m === 'string') {
      const entrada = resolverReferenciaMagia({ nome: m }, catalogo);
      if (!entrada) continue;
      m = { nome: valor, nome_original: valor, circulo: entrada.circulo };
      p[campo][indice] = m;
      mudou = true;
    }
    if (!m || typeof m !== 'object') continue;
    const c = resolverReferenciaMagia(m, catalogo);
    if (!c) continue;
    const antes = JSON.stringify(m);
    if (m.catalogo_ref && m.catalogo_ref !== c.id) m.catalogo_ref_anterior ??= m.catalogo_ref;
    m.catalogo_ref = c.id;
    // O ID da instância, nome editado e TODOS os overrides permanecem intactos.
    const name = typeof m.name === 'object' && m.name ? m.name : {};
    const nomeInglesLegado = normalizarMagia(m.nome) === normalizarMagia(c.name.en) && (!name.ptBR || name.ptBRStatus === 'missing');
    m.name = { ...c.name, ...name, en: name.en || c.name.en, ptBR: nomeInglesLegado ? c.name.ptBR : name.ptBR || m.nome || c.name.ptBR,
      ptBRStatus: name.ptBRStatus === 'verified' ? 'verified' : c.name.ptBRStatus,
      aliases: [...new Set([...(c.name.aliases || []), ...(name.aliases || []), m.nome].filter(Boolean))] };
    m.source = { ...structuredClone(c.source), ...m.source };
    m.classes ??= [...c.classes];
    m.circulo ??= c.circulo;
    if (JSON.stringify(m) !== antes) mudou = true;
  }
  return mudou;
}
export function magiaSelecionada(p, c) {
  return magiasRegistradas(p).some(m => m.catalogo_ref === c.id || m.id === c.id || (!m.catalogo_ref && m.source?.rulesVersion !== 'custom' && resolverReferenciaMagia(m)?.id === c.id));
}
export function conflitosMagia(p, c) {
  const nomes = nomesMagia(c);
  return magiasRegistradas(p).filter(m => m.catalogo_ref === c.id || m.id === c.id || (Number(m.circulo) === c.circulo && nomesMagia(m).some(n => nomes.includes(n))));
}
export function adicionarMagiaRegistrada(p, c, opcoes = {}) {
  if (!Number.isInteger(c.circulo) || c.circulo < 0 || c.circulo > 9) throw new Error('Círculo inválido: use 0 a 9.');
  if (conflitosMagia(p, c).length && !opcoes.confirmarVersao) throw new Error('Magia já registrada. Confirme que é outra versão.');
  const instancia = { ...structuredClone(c), id: novoId(), catalogo_ref: c.id,
    nome: c.name?.ptBR || c.nome, origem: 'extra', estado_extra: opcoes.estado || 'registrada',
    classe: opcoes.classe || '', sempre_preparada: opcoes.ocupaCota === false,
    motivo: opcoes.motivo || '', justificativa_tipo: opcoes.justificativaTipo || '',
    atributo_extra: '', cd_manual: null, ataque_manual: null, usos_total: 0, usos_gastos: 0, recuperacao: 'manual' };
  delete instancia.restricoes_excedidas;
  (p.magias_customizadas ||= []).push(instancia);
  return instancia;
}

export function correspondeConsultaMagia(m, consulta) {
  const q = normalizarMagia(consulta);
  if (!q) return true;
  const nivel = String(consulta).match(/(?:^|\s)([0-9])\s*(?:[º°oª])?\s*(?:c[ií]rculo|n[ií]vel|level)|(?:c[ií]rculo|n[ií]vel|level)\s*([0-9])/i);
  if (nivel && Number(nivel[1] ?? nivel[2]) !== m.circulo) return false;
  if (/^[0-9]$/.test(q)) return m.circulo === Number(q);
  const restante = nivel ? String(consulta).replace(nivel[0], '').trim() : consulta;
  if (!restante) return true;
  const texto = [m.nome, m.name?.ptBR, m.name?.en, ...(m.name?.aliases || []), m.escola,
    ESCOLAS_MAGIA_EN[m.escola], ...(m.classes || []), ...(m.classes || []).map(c => CLASSES_MAGIA_EN[c]),
    m.circulo === 0 ? 'truque truques cantrip cantrips' : `${m.circulo}º círculo nível level ${m.circulo}`,
    m.source?.sourceTitle, m.source?.sourceId, m.source?.rulesVersion, m.source?.printedPage,
    m.source?.rulesVersion === '2014-legacy' ? 'PHB Legado 2014 Players Handbook' : m.source?.rulesVersion === '2024' ? 'PHB 2024' : m.source?.rulesVersion === 'strixhaven' ? 'Strixhaven' : m.source?.sourceTitle,
    m.ritual ? 'ritual' : '', m.concentracao ? 'concentração concentration' : ''].filter(v => v != null).join(' ');
  const alvo = normalizarMagia(texto);
  // Preserva a frase: “Mage Hand” não pode casar “Mage Armor” + “Handbook”.
  return alvo.includes(normalizarMagia(restante));
}
export function filtrarMagias(catalogo, filtros = {}, p = null, compativeis = null) {
  return catalogo.filter(m => correspondeConsultaMagia(m, filtros.busca || '')
    && (filtros.circulo === '' || filtros.circulo == null || m.circulo === Number(filtros.circulo))
    && (!filtros.classes?.length || filtros.classes.some(c => m.classes?.includes(c)))
    && (!filtros.escola || ESCOLAS_MAGIA_EN[m.escola] === filtros.escola || m.escola === filtros.escola)
    && (!filtros.origem || m.source?.rulesVersion === filtros.origem)
    && (filtros.ritual === '' || filtros.ritual == null || Boolean(m.ritual) === (filtros.ritual === 'sim'))
    && (filtros.concentracao === '' || filtros.concentracao == null || Boolean(m.concentracao) === (filtros.concentracao === 'sim'))
    && (!filtros.selecionadas || magiaSelecionada(p, m))
    && (!filtros.compativeis || compativeis?.(m)));
}
