// ============================================================
// Carregador de dados JSON (acessa ../dados/)
// Cache em memória para evitar re-fetch
// ============================================================

// Caminho base para os arquivos de dados.
// site/ e dados/ são irmãos também no Pages, sob qualquer prefixo de fork.
const BASE_PATH = '../dados';
const cache = {};

/** Conteúdo de campanha aditivo; os JSON da base permanecem intactos. */
export async function getStrixhaven() {
  return fetchJSON('strixhaven/modulo.json');
}

/** Somente o antecedente concede lista expandida; matrícula nunca concede magias. */
export async function getListaExpandidaStrixhaven(personagem) {
  const listas = await fetchJSON('strixhaven/listas-2024.json');
  const faculdade = ['Lorehold', 'Prismari', 'Quandrix', 'Silverquill', 'Witherbloom'].find(f => personagem?.antecedente === `Estudante de ${f} (adaptação)`);
  return faculdade ? listas?.[faculdade] || [] : [];
}

/** Magias próprias do suplemento, identificadas por edição e ID. */
async function magiasStrixhaven() {
  return (await fetchJSON('strixhaven/magias.json'))?.magias || [];
}

/** Busca um JSON com cache em memória */
async function fetchJSON(caminho) {
  if (cache[caminho]) return cache[caminho];
  try {
    const resp = await fetch(`${BASE_PATH}/${caminho}`, { cache: 'no-store' });
    if (!resp.ok) throw new Error(`Erro ${resp.status}: ${caminho}`);
    const dados = await resp.json();
    cache[caminho] = dados;
    return dados;
  } catch (err) {
    console.error(`Erro ao carregar ${caminho}:`, err);
    return null;
  }
}

// --- Classes ---

/** Carrega dados de uma classe específica */
export async function getClasse(nome) {
  const nomeArq = nome.toLowerCase()
    .replace(/á/g, 'a').replace(/ã/g, 'a').replace(/é/g, 'e')
    .replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u');
  const dados = await fetchJSON(`classes/${nomeArq}.json`);
  if (!dados) return null;

  return dados;
}

/** Carrega lista de magias de uma classe conjuradora */
export async function getMagiasClasse(nomeClasse, personagem = null) {
  const nomeArq = nomeClasse.toLowerCase()
    .replace(/á/g, 'a').replace(/ã/g, 'a').replace(/é/g, 'e')
    .replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u');
  const base = await fetchJSON(`classes/magias_${nomeArq}.json`);
  if (!base) return null;
  const resultado = structuredClone(base);
  for (const m of await magiasStrixhaven()) {
    if (!m.classes.includes(nomeClasse)) continue;
    const chave = `${m.circulo}º Círculo`;
    (resultado.lista_magias[chave] ||= []).push({ ...m, especial: m.concentracao ? 'C' : '—' });
  }
  if (personagem) {
    const nomes = await getListaExpandidaStrixhaven(personagem);
    const indice = await getIndiceMagias();
    for (const m of indice?.magias || []) {
      if (!nomes.includes(m.nome)) continue;
      const lista = resultado.lista_magias[`${m.circulo}º Círculo`] ||= [];
      if (!lista.some(x => x.nome === m.nome)) lista.push({ ...m, especial: /concentra/i.test(m.duracao) ? 'C' : '—' });
    }
  }
  return resultado;
}

// --- Origens ---

/** Carrega todos os antecedentes */
export async function getAntecedentes() {
  const base = await fetchJSON('origens/antecedentes.json');
  const modulo = await getStrixhaven();
  if (!base) return null;
  const academicos = (modulo?.faculdades || []).map(f => ({
    id: `scc-estudante-${f.id}-2024`, nome: `Estudante de ${f.nome} (adaptação)`,
    valores_atributo: 'Força, Destreza, Constituição, Inteligência, Sabedoria, Carisma',
    talento: 'Iniciado de Strixhaven (adaptação)', pericias: f.pericias, ferramentas: f.ferramentas,
    idiomas_obrigatorios: ['Comum'], idiomas_adicionais: 2,
    idiomas_opcoes: ['Língua de Sinais Comum', 'Dracônico', 'Anão', 'Élfico', 'Gigante', 'Gnômico', 'Goblin', 'Pequenino', 'Orc'],
    equipamento: 'Escolha B: (B) 50 PO',
    descricao: `${f.area}. SCC 2021 (2014), perfil de adaptação da mesa 2024: escolha aumentos de atributo uma vez, dois idiomas pela base 2024 e 50 PO para equipamento. Iniciado substitui o talento de origem, não acumula outro. Configure as escolhas do talento na ficha; a faculdade acadêmica é independente. Lista expandida original, apenas elegibilidade (não concessão automática): ${f.lista_expandida_2014.join(', ')}.`,
    fonte: `https://dnd5e.wikidot.com/background:${f.id}-student`, edicao_original: '2014', adaptacao: modulo.adaptacao,
  }));
  return { ...base, antecedentes: [...base.antecedentes, ...academicos], total: base.antecedentes.length + academicos.length };
}

/** Carrega todas as espécies */
export async function getEspecies() {
  const base = await fetchJSON('origens/especies.json');
  const modulo = await getStrixhaven();
  return base ? { ...base, especies: [...base.especies, ...(modulo?.especies || [])], total: base.especies.length + (modulo?.especies.length || 0) } : null;
}

// --- Talentos ---

/** Carrega todos os talentos */
export async function getTalentos() {
  const base = await fetchJSON('talentos/talentos.json');
  if (!base) return null;
  const resultado = structuredClone(base);
  for (const t of (await getStrixhaven())?.talentos || []) {
    (resultado.por_categoria[t.categoria] ||= []).push(t);
    resultado.todos.push(t);
    resultado.total++;
  }
  return resultado;
}

// --- Equipamento ---

/** Carrega armas */
export async function getArmas() {
  return fetchJSON('equipamento/armas.json');
}

/** Carrega armaduras */
export async function getArmaduras() {
  return fetchJSON('equipamento/armaduras.json');
}

/** Carrega equipamento de aventura */
export async function getEquipamentoAventura() {
  return fetchJSON('equipamento/equipamento_aventura.json');
}

/** Carrega ferramentas */
export async function getFerramentas() {
  return fetchJSON('equipamento/ferramentas.json');
}

// --- Magias ---

/** Carrega índice de todas as magias (resumido) */
export async function getIndiceMagias() {
  const base = await fetchJSON('magias/_indice.json');
  if (!base) return null;
  const magias = [...base.magias, ...await magiasStrixhaven()];
  return { ...base, magias, total_magias: magias.length };
}

/** Carrega magias de um círculo específico (com descrição completa) */
export async function getMagiasPorCirculo(circulo) {
  const nome = circulo === 0 ? 'truques' : `circulo_${circulo}`;
  const base = await fetchJSON(`magias/${nome}.json`);
  if (!base) return null;
  const magias = [...base.magias, ...(await magiasStrixhaven()).filter(m => m.circulo === Number(circulo))];
  return { ...base, magias, total_magias: magias.length };
}

/** Carrega magias de uma classe (lista resumida: nome, circulo, escola) */
export async function getMagiasPorClasseLista(nomeClasse) {
  const nomeArq = nomeClasse.toLowerCase()
    .replace(/á/g, 'a').replace(/ã/g, 'a').replace(/é/g, 'e')
    .replace(/í/g, 'i').replace(/ó/g, 'o').replace(/ú/g, 'u');
  const base = await fetchJSON(`magias/por_classe/${nomeArq}.json`);
  if (!base) return null;
  const magias = [...base.magias, ...(await magiasStrixhaven()).filter(m => m.classes.includes(nomeClasse))];
  return { ...base, magias, total_magias: magias.length };
}

/**
 * Devolve as magias de um círculo que têm o marcador Ritual, com a magia
 * inteira (descrição, alcance, componentes, duração).
 *
 * O marcador vem de `tempo_conjuracao` -- "1 minuto ou Ritual",
 * "1 ação ou Ritual" etc. É o mesmo critério que o Pacto do Tomo do Bruxo
 * (sheet/classes/bruxo.js) já usava, e é a leitura certa: o campo `ritual`
 * booleano que o Conjurador Ritualista procurava NÃO existe em lugar nenhum
 * do acervo, e por isso a lista dele nascia vazia.
 *
 * A outra fonte possível seria o campo `especial` de
 * `classes/magias_<classe>.json` ('R', e também os combinados 'R, M' e
 * 'C, R'). Conferido: para o 1º círculo as duas fontes dão exatamente as
 * mesmas 11 magias. Esta é preferível por ser um arquivo só, em vez da união
 * das oito listas de classe, e por já trazer a descrição -- os cards mostram
 * "ver detalhes" sem uma segunda busca.
 */
export async function getMagiasRituais(circulo) {
  const dados = await getMagiasPorCirculo(circulo);
  return (dados?.magias || [])
    .filter(m => (m.tempo_conjuracao || '').toLowerCase().includes('ritual'))
    .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'));
}

/** Busca uma magia específica pelo nome (carrega o círculo inteiro) */
export async function getMagia(nome, circulo, id = null) {
  const dados = await getMagiasPorCirculo(circulo);
  if (!dados) return null;
  return dados.magias.find(m => id ? m.id === id : m.nome === nome) || null;
}

/** Busca magias por nome (busca no índice, retorna matches) */
export async function buscarMagias(termo) {
  const indice = await getIndiceMagias();
  if (!indice) return [];
  const termoNorm = termo.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
  return indice.magias.filter(m => {
    const nomeNorm = m.nome.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    return nomeNorm.includes(termoNorm);
  });
}

// --- Apêndices ---

/** Carrega criaturas */
export async function getCriaturas() {
  return fetchJSON('apendices/criaturas.json');
}

/** Carrega glossário */
export async function getGlossario() {
  return fetchJSON('apendices/glossario.json');
}

// --- Pré-carregamento ---

/** Pré-carrega dados essenciais para criação de personagem */
export async function precarregarDadosCriacao() {
  await Promise.all([
    getAntecedentes(),
    getEspecies(),
    getTalentos(),
    getArmas(),
    getArmaduras(),
    getIndiceMagias()
  ]);
}
