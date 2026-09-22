// Extensão da ficha 2024. Nunca projeta o personagem em um schema menor.
import { CLASSES_INFO } from '../dados-classes.js';
export const FACULDADES = ['Lorehold', 'Prismari', 'Quandrix', 'Silverquill', 'Witherbloom'];

/** Fonte única de cota extra; não grava cópias em preparadas ou grimório. */
export function extrasQueOcupam(p, truque) {
  return (p?.magias_customizadas || []).filter(m => m.origem === 'extra' && m.sempre_preparada === false
    && (truque ? Number(m.circulo) === 0 && !['grimório', 'registrada'].includes(m.estado_extra)
      : Number(m.circulo) > 0 && (['preparada', 'sempre preparada'].includes(m.estado_extra)
        || (m.estado_extra === 'conhecida' && CLASSES_INFO[m.classe || p.classe]?.tipo_conjuracao === 'conhecidas'))));
}

/** Cota explícita durante criação de classe única; sem carimbo conta na única classe. */
export function contarExtrasCriacao(p, truque) {
  return extrasQueOcupam(p, truque).filter(m => !m.classe || m.classe === p.classe).length;
}

/** Identidade independente de nome e posição, inclusive para homônimos. */
export function novoId() {
  return globalThis.crypto?.randomUUID?.() || `sh-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
}

/** Calculado + ajuste OU valor final. O valor final nunca recebe o ajuste outra vez. */
export function valorComAjuste(p, chave, calculado) {
  const ajuste = p?.ajustes_manuais?.[chave];
  if (!ajuste) return calculado;
  return Number.isFinite(ajuste.final) ? ajuste.final : calculado + (Number.isFinite(ajuste.ajuste) ? ajuste.ajuste : 0);
}

/** Migração aditiva e idempotente; campos de versões futuras são preservados. */
function guardarImportacaoPendente(p, chave, valor) {
  const anterior = p.dados_importados_pendentes;
  if (!anterior || typeof anterior !== 'object' || Array.isArray(anterior)) p.dados_importados_pendentes = anterior == null ? {} : { original: anterior };
  let destino = chave, sufixo = 2;
  while (Object.hasOwn(p.dados_importados_pendentes, destino) && JSON.stringify(p.dados_importados_pendentes[destino]) !== JSON.stringify(valor)) destino = `${chave}#${sufixo++}`;
  p.dados_importados_pendentes[destino] = valor;
}

function colecaoImportada(p, objeto, chave, caminho = chave) {
  const valor = objeto[chave];
  if (valor == null) { objeto[chave] = []; return; }
  if (!Array.isArray(valor)) {
    guardarImportacaoPendente(p, caminho, valor); objeto[chave] = []; return;
  }
  const invalidos = valor.map((v, indice) => ({ indice, valor: v })).filter(r => !r.valor || typeof r.valor !== 'object' || Array.isArray(r.valor));
  if (invalidos.length) {
    guardarImportacaoPendente(p, caminho, invalidos);
    objeto[chave] = valor.filter(v => v && typeof v === 'object' && !Array.isArray(v));
  }
}

export function migrarAcademia(p) {
  if (!p || typeof p !== 'object') return p;
  p.schemaVersion = Math.max(Number(p.schemaVersion) || 0, 2);
  for (const chave of ['idiomas_personalizados', 'magias_customizadas', 'inventario', 'beneficios_manuais']) colecaoImportada(p, p, chave);
  if (p.idiomas != null && !Array.isArray(p.idiomas)) { guardarImportacaoPendente(p, 'idiomas', p.idiomas); p.idiomas = []; }
  for (const item of p.inventario || []) {
    item.nome ??= typeof item.name === 'string' ? item.name : item.name?.ptBR || item.name?.en || '';
    if (!item.name || typeof item.name !== 'object' || Array.isArray(item.name)) item.name = { ptBR: item.nome || '', en: '', ptBRStatus: 'missing', original: item.name ?? item.nome };
    if (item.tipo === 'customizado') item.source ??= { sourceId: 'local', sourceTitle: 'Item personalizado', rulesVersion: 'custom' };
  }
  for (const m of p.magias_customizadas || []) {
    m.nome ??= typeof m.name === 'string' ? m.name : m.name?.ptBR || m.name?.en || '';
    if (!m.name || typeof m.name !== 'object' || Array.isArray(m.name)) m.name = { ptBR: m.nome || '', en: '', ptBRStatus: 'missing', original: m.name ?? m.nome };
    if (m.classes != null && !Array.isArray(m.classes)) { guardarImportacaoPendente(p, `magia:${m.id || m.nome}:classes`, m.classes); delete m.classes; }
    m.source ??= { sourceId: 'local', sourceTitle: 'Conteúdo personalizado', rulesVersion: 'custom' };
    if (m.origem === 'extra') delete m.restricoes_excedidas; // cache derivado antigo; motivo manual é preservado
  }
  if (p.strixhaven != null && (typeof p.strixhaven !== 'object' || Array.isArray(p.strixhaven))) { guardarImportacaoPendente(p, 'strixhaven', p.strixhaven); p.strixhaven = {}; }
  p.strixhaven ??= {};
  const a = p.strixhaven;
  a.versao ??= 1;
  a.perfil ??= 'campanha-2024-v1';
  a.faculdade ??= '';
  a.ingresso ??= 'Estudante';
  a.ano ??= 1;
  a.notas ??= '';
  for (const chave of ['relacionamentos', 'cursos', 'avaliacoes', 'atividades', 'empregos']) {
    colecaoImportada(p, a, chave, `strixhaven.${chave}`);
    for (const registro of a[chave]) registro.id ||= novoId();
  }
  for (const m of p.magias_customizadas || []) m.id ||= novoId();
  for (const b of Array.isArray(p.beneficios_manuais) ? p.beneficios_manuais : []) {
    if (b && typeof b === 'object') b.id ||= novoId();
  }
  return p;
}

/** Números de formulário: vazio não é zero e entradas inválidas não são gravadas. */
export function numeroInformado(valor, rotulo, { inteiro = true, min = -Infinity, max = Infinity } = {}) {
  if (String(valor).trim() === '') throw new Error(`Informe ${rotulo}; campo vazio não altera o valor anterior.`);
  const n = Number(valor);
  if (!Number.isFinite(n) || (inteiro && !Number.isInteger(n)) || n < min || n > max) {
    throw new Error(`${rotulo}: informe ${inteiro ? 'um inteiro' : 'um número'} entre ${min} e ${max}.`);
  }
  return n;
}

// Metadados comuns à UI e à exportação; as três marcas não ganham significado inventado.
export const CAMPOS_ACADEMICOS = {
  relacionamentos: { titulo: 'Relacionamentos', campos: { nome: 'NPC / nome', pontos: ['Pontos', 'number'], relacionamento: 'Relacionamento', inspiracao: ['Inspiração de relacionamento', 'checkbox'], bonus: 'Bônus', desvantagem: 'Desvantagem', observacoes: ['Observações', 'textarea'] } },
  cursos: { titulo: 'Cursos e aulas', campos: { nome: 'Nome', ano: ['Ano', 'number'], periodo: 'Período', inspiracao: ['Inspiração da aula', 'checkbox'], habilidades: 'Habilidades associadas', professor: 'Professor', horario: 'Horário', notas: ['Notas', 'textarea'] } },
  avaliacoes: { titulo: 'Boletim', campos: { nome: 'Avaliação', ano: ['Ano', 'number'], registro: ['Registro #', 'number'], marca1: ['Marca 1', 'checkbox'], marca2: ['Marca 2', 'checkbox'], marca3: ['Marca 3', 'checkbox'], repeticoes: ['Repetições', 'number'], d4s: ['d4s', 'number'], habilidades: 'Habilidades', notas: ['Notas', 'textarea'] } },
  atividades: { titulo: 'Extracurriculares', campos: { nome: 'Nome', membro: ['Membro', 'checkbox'], participacao: 'Participação', d4: ['d4', 'number'], habilidades: 'Habilidades', marca1: ['Marca 1', 'checkbox'], marca2: ['Marca 2', 'checkbox'], marca3: ['Marca 3', 'checkbox'], notas: ['Notas', 'textarea'] } },
  empregos: { titulo: 'Trabalho', campos: { nome: 'Empregador', funcao: 'Trabalho / função', colega: 'Colega / NPC', observacoes: ['Observações', 'textarea'] } },
};
