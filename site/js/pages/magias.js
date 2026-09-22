import { getPersonagem } from '../store.js';
import { montarBuscaMagias } from '../magias/busca-ui.js';

export async function renderTodasMagias(container, personagemId = '') {
  window.definirTituloHeader?.('Todas as Magias');
  await montarBuscaMagias(container, { personagem: personagemId ? getPersonagem(decodeURIComponent(personagemId)) : null });
}
