// Metadados de apresentação não alteram IDs nem cálculos de regras.
export function normalizarBusca(valor) {
  return String(valor ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s'’‘‐‑–—-]+/g, '');
}

export function correspondeBusca(registro, termo) {
  return normalizarBusca([registro.nome, registro.name?.ptBR, registro.name?.en, ...(registro.name?.aliases || [])].join(' ')).includes(normalizarBusca(termo));
}

const escapar = valor => String(valor ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
export function rotuloLocalizado(registro) {
  const principal = registro.nome && registro.nome !== registro.name?.en ? registro.nome : registro.name?.ptBR || registro.nome;
  return `<span class="localized-label"><span class="localized-label__primary">${escapar(principal)}</span>${registro.name?.en ? `<span class="localized-label__secondary" lang="en">${escapar(registro.name.en)}</span>` : ''}${registro.source?.rulesVersion === '2014-legacy' ? '<span class="sh-selo">Legado 2014</span>' : ''}</span>`;
}

export const NOMES_CLASSES = { Bárbaro: 'Barbarian', Bardo: 'Bard', Bruxo: 'Warlock', Clérigo: 'Cleric', Druida: 'Druid', Feiticeiro: 'Sorcerer', Guerreiro: 'Fighter', Guardião: 'Ranger', Ladino: 'Rogue', Mago: 'Wizard', Monge: 'Monk', Paladino: 'Paladin' };
