import { getClasse, getListaExpandidaStrixhaven } from '../db.js';
import { classesDe } from '../regras-multiclasse.js';
import { superficiesDeConjuracao, migrarEspacosDeMagia } from '../regras-multiclasse-conjuracao.js';
import { getConjuracaoSubclasse } from '../regras-conjuracao-subclasse.js';
import { getEspacosMagia } from '../utils.js';
import { montarReservasDeEspacos } from '../sheet/reservas-espacos.js';

/** Apenas leitura: usa os cálculos existentes, nunca concede ou regrava reservas. */
export async function contextoDeMagias(p) {
  if (!p) return null;
  const classes = classesDe(p);
  const mapa = new Map(await Promise.all(classes.map(async c => [c.classe, await getClasse(c.classe)])));
  const copia = structuredClone(p);
  migrarEspacosDeMagia(copia);
  const reservas = montarReservasDeEspacos(copia, mapa);
  const superficies = superficiesDeConjuracao(p, mapa).map(s => {
    const sub = getConjuracaoSubclasse(s.classe, s.subclasse, s.nivelClasse);
    const espacos = sub?.espacos || getEspacosMagia(s.tabela, s.nivelClasse);
    const circulos = Object.keys(espacos).map(Number);
    if (s.classe === 'Bruxo') circulos.push(...reservas.filter(r => r.fonte === 'pacto').map(r => r.circulo));
    return { ...s, maximo: Math.max(0, ...circulos) };
  });
  return { personagem: p, classes, mapa, superficies, reservas,
    maximo: Math.max(0, ...reservas.filter(r => r.total > 0).map(r => r.circulo)),
    expandida: await getListaExpandidaStrixhaven(p), incompleto: [...mapa.values()].some(v => !v) };
}
export function compatibilidadeMagia(m, ctx) {
  if (!ctx) return { semFicha: true, compativel: true, textos: [] };
  const propria = ctx.superficies.filter(s => m.classes?.includes(s.listaMagias));
  const expandida = ctx.expandida.includes(m.nome) || ctx.expandida.includes(m.name?.ptBR);
  const foraClasse = !propria.length && !expandida;
  const acima = m.circulo > ctx.maximo;
  const elegivelNivel = (expandida ? ctx.superficies : propria).some(s => m.circulo <= s.maximo);
  const disponiveis = m.circulo === 0 ? null : ctx.reservas.filter(r => r.circulo >= m.circulo).reduce((s, r) => s + r.disponiveis, 0);
  const textos = [];
  if (foraClasse) textos.push(`Fora da lista da sua classe — ${ctx.classes.map(c => c.classe).join(' / ') || 'classe não definida'}. Adição permitida.`);
  if (acima) textos.push(`${m.circulo}º círculo — personagem atualmente conjura até o ${ctx.maximo}º. Não conjurável atualmente por espaços.`);
  else if (!foraClasse && !elegivelNivel && m.circulo > 0) textos.push('Círculo acima da progressão individual desta lista de classe, mesmo havendo espaços de multiclasse.');
  if (m.circulo > 0 && !disponiveis) textos.push('Sem espaço disponível de círculo adequado. Registrar não cria recursos.');
  if (ctx.incompleto) textos.push('Dados de uma classe indisponíveis: referência de compatibilidade parcial.');
  return { foraClasse, acima, elegivelNivel, disponiveis, compativel: !foraClasse && !acima && elegivelNivel,
    textos, maximo: ctx.maximo, severidade: m.motivo ? 'info' : 'error' };
}
