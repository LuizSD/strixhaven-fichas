// Configuração pública da adaptação. Nunca coloque tokens de usuário aqui.
export const CAMPANHA_CONFIG = Object.freeze({
  repositorio: '',
  firebase: null,
});

/** Exige configuração própria explícita antes de carregar qualquer SDK remoto. */
export function sincronizacaoConfigurada() {
  const c = CAMPANHA_CONFIG.firebase;
  return !!(c && c.projectId && c.projectId !== 'ded2024' && c.apiKey && c.authDomain && c.appId);
}
