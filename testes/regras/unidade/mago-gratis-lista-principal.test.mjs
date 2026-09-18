// ============================================================
// Issue #68 -- as magias de Maestria de Magias (nível 18) e Assinatura
// Mágica (nível 20) já apareciam na lista principal de "Preparadas"
// (magiaEhEspecial as reconhece por origem), mas sem botão "Grátis": o
// jogador tinha de rolar até o painel de recursos do Mago, lá em cima da
// ficha, para conjurá-las sem gastar espaço.
//
// `sincronizarMagiasFixasMago` nunca escrevia `gratis_usado` na entrada de
// `magias_preparadas` -- e escrever ali criaria um SEGUNDO estado
// desatualizado (o painel de cima usa char.recursos.mago.assinatura_magia_
// N_usada, não um campo por entrada). A correção computa a disponibilidade
// NA HORA (magiaFixaMagoGratisDisponivel, classes/mago.js), lendo a MESMA
// fonte que o painel já usa -- Maestria nunca esgota; Assinatura esgota
// por vaga (m1/m2), 1x por Descanso Curto/Longo.
// ============================================================
import test from 'node:test';
import assert from 'node:assert/strict';
import { modulosApp, personagemSemente, lerClassesDados } from './harness.mjs';

const { sheetEstado, sheetMago, sheetMagias } = await modulosApp();
const mapaDadosDisco = lerClassesDados();

async function magoComGrimorio(nivel) {
  const p = await personagemSemente('Mago');
  p.nivel = nivel;
  p.grimorio = [
    { nome: 'Mísseis Mágicos', circulo: 1 },
    { nome: 'Escudo Arcano', circulo: 1 },
    { nome: 'Despedaçar', circulo: 2 },
    { nome: 'Bola de Fogo', circulo: 3 },
    { nome: 'Contramagia', circulo: 3 },
  ];
  p.magias_preparadas = [];
  sheetEstado.definirChar(p);
  sheetMago.getEstadoRecursosMago();
  return p;
}

test('Maestria de Magias: as duas magias escolhidas têm o Grátis SEMPRE disponível (à vontade)', async () => {
  await magoComGrimorio(18);
  sheetMago.definirMagiasFixasMago('maestria_magias', { c1: 'Mísseis Mágicos', c2: 'Despedaçar' });

  assert.equal(sheetMago.magiaFixaMagoGratisDisponivel('Mísseis Mágicos'), true);
  assert.equal(sheetMago.magiaFixaMagoGratisDisponivel('Despedaçar'), true);
});

test('Assinatura Mágica: cada magia tem Grátis disponível até ser marcada como usada (por vaga)', async () => {
  await magoComGrimorio(20);
  sheetMago.definirMagiasFixasMago('assinatura_magica', { m1: 'Bola de Fogo', m2: 'Contramagia' });

  assert.equal(sheetMago.magiaFixaMagoGratisDisponivel('Bola de Fogo'), true);
  assert.equal(sheetMago.magiaFixaMagoGratisDisponivel('Contramagia'), true);

  const marcou = sheetMago.marcarAssinaturaMagicaUsada('Bola de Fogo');
  assert.equal(marcou, true, 'marcarAssinaturaMagicaUsada tem de reconhecer o nome da vaga m1');

  assert.equal(sheetMago.magiaFixaMagoGratisDisponivel('Bola de Fogo'), false,
    'depois de marcada, a MESMA vaga não pode mais oferecer Grátis');
  assert.equal(sheetMago.magiaFixaMagoGratisDisponivel('Contramagia'), true,
    'a OUTRA vaga (Contramagia) é independente -- marcar uma não esgota a outra');
});

test('marcarAssinaturaMagicaUsada escreve a MESMA chave que o painel de recursos do Mago lê', async () => {
  const p = await magoComGrimorio(20);
  sheetMago.definirMagiasFixasMago('assinatura_magica', { m1: 'Bola de Fogo', m2: 'Contramagia' });

  sheetMago.marcarAssinaturaMagicaUsada('Contramagia');

  // A mesma leitura que renderPainelRecursosMago/habilidades.js fazem:
  // getEstadoRecursosMago().assinatura2Usada.
  const estado = sheetMago.getEstadoRecursosMago();
  assert.equal(estado.assinatura2Usada, true,
    'o painel de recursos do Mago tem de ver a MESMA marca que o botão Grátis da lista principal escreveu -- ' +
    'sem isso os dois lugares divergem sobre se a assinatura já foi usada');
  assert.equal(p.recursos.mago.assinatura_magia_2_usada, true);
});

test('magiaFixaMagoGratisDisponivel devolve null para uma magia comum (não Maestria/Assinatura)', async () => {
  await magoComGrimorio(5);
  assert.equal(sheetMago.magiaFixaMagoGratisDisponivel('Mísseis Mágicos'), null,
    'uma magia comum não é nem Maestria nem Assinatura -- quem chama tem de cair no mecanismo genérico de gratis_usado');
});

test('magiaFixaMagoGratisDisponivel devolve null quando o personagem ainda não tem a característica', async () => {
  await magoComGrimorio(10); // abaixo de 18 e de 20
  assert.equal(sheetMago.magiaFixaMagoGratisDisponivel('Bola de Fogo'), null);
});

// ------------------------------------------------------------
// Integração: renderSecaoMagias() de verdade (é síncrono, sem DOM falso --
// mesmo padrão de magia-customizada-linha-unica.test.mjs), provando que a
// lista PRINCIPAL de Preparadas (não o painel de recursos lá em cima)
// desenha o botão Grátis para Maestria/Assinatura.
// ------------------------------------------------------------
test('renderSecaoMagias: a magia de Maestria de Magias sai com o botão Grátis na lista principal', async () => {
  const p = await magoComGrimorio(18);
  sheetEstado.definirClasseData(mapaDadosDisco.get('Mago'));
  sheetEstado.definirClassesData(mapaDadosDisco);
  sheetMago.definirMagiasFixasMago('maestria_magias', { c1: 'Mísseis Mágicos', c2: 'Despedaçar' });
  sheetEstado.definirChar(p); // definirMagiasFixasMago já mutou p; re-registra por clareza

  const html = sheetMagias.renderSecaoMagias();
  assert.match(html, /data-magia-nome="Mísseis Mágicos"[\s\S]*?data-conjurar-gratis="Mísseis Mágicos"/,
    'a lista principal de Preparadas tem de desenhar o botão Grátis junto da magia da Maestria');
});

test('renderSecaoMagias: Assinatura Mágica já usada NÃO mostra o botão Grátis; a outra vaga continua mostrando', async () => {
  const p = await magoComGrimorio(20);
  sheetEstado.definirClasseData(mapaDadosDisco.get('Mago'));
  sheetEstado.definirClassesData(mapaDadosDisco);
  sheetMago.definirMagiasFixasMago('assinatura_magica', { m1: 'Bola de Fogo', m2: 'Contramagia' });
  sheetMago.marcarAssinaturaMagicaUsada('Bola de Fogo');
  sheetEstado.definirChar(p);

  const html = sheetMagias.renderSecaoMagias();
  const blocoBolaDeFogo = html.slice(html.indexOf('data-magia-nome="Bola de Fogo"'), html.indexOf('data-magia-nome="Bola de Fogo"') + 800);
  assert.ok(!blocoBolaDeFogo.includes('data-conjurar-gratis="Bola de Fogo"'),
    'Bola de Fogo já foi usada como assinatura -- não pode ter botão Grátis');
  assert.match(html, /data-magia-nome="Contramagia"[\s\S]*?data-conjurar-gratis="Contramagia"/,
    'Contramagia (a outra vaga, ainda não usada) continua com o botão Grátis');
});
