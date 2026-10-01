// MPMM, exclusivamente. Bônus usa o slot único da origem já existente.
export const ESTACOES = {
  outono: ['Outono', 'Autumn', 'Paz e generosidade.', 'Após o teleporte, até duas criaturas visíveis a 3 m / 10 pés fazem salvaguarda de Sabedoria; falha: enfeitiçadas por 1 minuto, até você ou seus companheiros causarem dano a elas.'],
  inverno: ['Inverno', 'Winter', 'Contemplação e melancolia.', 'Uma criatura visível a 1,5 m / 5 pés antes do teleporte faz salvaguarda de Sabedoria; falha: amedrontada até o fim do seu próximo turno.'],
  primavera: ['Primavera', 'Spring', 'Alegria e esperança.', 'Toque uma criatura voluntária a 1,5 m / 5 pés: ela se teleporta em seu lugar para espaço desocupado visível a até 9 m / 30 pés.'],
  verao: ['Verão', 'Summer', 'Ousadia e energia.', 'Após o teleporte, criaturas escolhidas e visíveis a 1,5 m / 5 pés recebem dano de fogo igual ao bônus de proficiência.'],
};
export const ELADRIN = {
  id: 'eladrin-mpmm', nome: 'Eladrin', name: { ptBR: 'Eladrin', en: 'Eladrin' },
  source: { book: 'Mordenkainen Presents: Monsters of the Multiverse', rulesVersion: '5e-compatible' },
  descricao: 'Elfos da Agrestia das Fadas ligados às emoções das estações.',
  idiomas_obrigatorios: ['Comum'], idiomas_adicionais: 1,
  texto_completo: 'Tipo de Criatura: Humanoide (elfo)\nTamanho: Médio\nDeslocamento: 9 metros',
  tracos: [
    { nome: 'Visão no Escuro', descricao: '18 metros / 60 pés; no escuro, apenas tons de cinza.' },
    { nome: 'Ancestralidade Feérica', name: { en: 'Fey Ancestry' }, descricao: 'Vantagem nas salvaguardas para evitar ou encerrar enfeitiçado em si.' },
    { nome: 'Sentidos Aguçados', name: { en: 'Keen Senses' }, descricao: 'Proficiência em Percepção.' },
    { nome: 'Transe', name: { en: 'Trance' }, descricao: 'Não precisa dormir e magia não pode fazê-lo dormir. Descanso longo em 4 horas de meditação consciente; pode trocar estação e duas proficiências temporárias em armas ou ferramentas.' },
    { nome: 'Passo Feérico', name: { en: 'Fey Step' }, descricao: 'Ação bônus: teleporte para espaço desocupado visível a até 9 m / 30 pés. Usos iguais ao bônus de proficiência por descanso longo. Efeito sazonal a partir do nível 3.' },
  ],
};
export function migrarEladrin(p) {
  if (p.especie !== 'Eladrin') return p;
  if (!p.eladrin || typeof p.eladrin !== 'object' || Array.isArray(p.eladrin)) p.eladrin = {};
  const e = p.eladrin;
  if (!Object.hasOwn(ESTACOES, e.estacao)) e.estacao = 'outono';
  if (!['inteligencia', 'sabedoria', 'carisma'].includes(e.atributoCD)) e.atributoCD = 'carisma';
  e.origemAtributos ??= 'antecedente';
  e.usosGastos ??= 0; e.proficienciasTranse ??= []; e.transeDisponivel ??= true;
  if (!Number.isInteger(e.usosGastos) || e.usosGastos < 0) e.usosGastos = 0;
  if (!Array.isArray(e.proficienciasTranse)) e.proficienciasTranse = [];
  e.proficienciasTranse = e.proficienciasTranse.filter(x => x && typeof x.nome === 'string' && ['arma', 'ferramenta'].includes(x.tipo));
  const nivel = p.classes?.reduce((s, c) => s + c.nivel, 0) || p.nivel || 1;
  e.usosMaximos = e.maxManual ?? 2 + Math.floor((nivel - 1) / 4);
  e.usosAtuais = Math.max(0, e.usosMaximos - e.usosGastos);
  p.pericia_especie = 'Percepção';
  p.pericias_proficientes = [...new Set([...(p.pericias_proficientes || []), 'Percepção'])];
  p.tamanho ||= 'Médio'; p.tipo_criatura = 'Humanoide'; p.especie_id = ELADRIN.id;
  p.considerado_elfo = true; p.especie_source = ELADRIN.source;
  return p;
}
export function estadoEladrin(p) {
  migrarEladrin(p);
  const nivel = p.classes?.reduce((s, c) => s + c.nivel, 0) || p.nivel || 1;
  const pb = 2 + Math.floor((nivel - 1) / 4);
  const max = p.eladrin.maxManual ?? pb;
  return { pb, max, atuais: Math.max(0, max - p.eladrin.usosGastos), cd: 8 + pb + Math.floor(((p.atributos[p.eladrin.atributoCD] || 10) - 10) / 2), efeito: nivel >= 3 ? ESTACOES[p.eladrin.estacao][3] : 'Efeito sazonal disponível no nível 3.' };
}
export function descansarEladrin(p) {
  if (p.especie !== 'Eladrin') return;
  migrarEladrin(p); p.eladrin.usosGastos = 0;
  p.eladrin.proficienciasTranse = []; p.eladrin.transeDisponivel = true;
}
