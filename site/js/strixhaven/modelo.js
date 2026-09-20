// Extensão da ficha 2024. Nunca projeta o personagem em um schema menor.
export const FACULDADES = ['Lorehold', 'Prismari', 'Quandrix', 'Silverquill', 'Witherbloom'];

/** Fonte única de cota extra; não grava cópias em preparadas ou grimório. */
export function extrasQueOcupam(p, truque) {
  return (p?.magias_customizadas || []).filter(m => m.origem === 'extra' && m.sempre_preparada === false
    && (truque ? Number(m.circulo) === 0 && m.estado_extra !== 'grimório' : Number(m.circulo) > 0 && ['preparada', 'sempre preparada'].includes(m.estado_extra)));
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
export function migrarAcademia(p) {
  if (!p || typeof p !== 'object') return p;
  p.strixhaven ??= {};
  const a = p.strixhaven;
  a.versao ??= 1;
  a.perfil ??= 'campanha-2024-v1';
  a.faculdade ??= '';
  a.ingresso ??= 'Estudante';
  a.ano ??= 1;
  a.notas ??= '';
  for (const chave of ['relacionamentos', 'cursos', 'avaliacoes', 'atividades', 'empregos']) {
    a[chave] ??= [];
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
