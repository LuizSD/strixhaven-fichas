import { getStrixhaven, getIndiceMagias, getMagia } from '../db.js';
import { abrirModal, escHtml, toast } from '../utils.js';
import { novoId } from './modelo.js';

/** Configura somente escolhas do talento já adquirido, nunca pela faculdade acadêmica. */
export async function configurarIniciado(p, aoSalvar) {
  const temTalento = (p.talentos || []).some(t => (typeof t === 'string' ? t : t.nome || '').startsWith('Iniciado de Strixhaven'));
  if (!temTalento) { toast('Adquira Iniciado de Strixhaven pelo antecedente ou pelo seletor de talentos antes de configurar suas escolhas.', 'error'); return; }
  const modulo = await getStrixhaven();
  const indice = await getIndiceMagias();
  if (!modulo || !indice) { toast('Dados de campanha indisponíveis.', 'error'); return; }
  const aliases = { Druidismo: 'Arte Druídica', Prestidigitação: 'Prestidigitação Arcana', 'Zombaria Viciosa': 'Zombaria Perversa', Estabilizar: 'Acudir os Moribundos' };
  const faculdadeAntecedente = modulo.faculdades.find(f => p.antecedente?.startsWith(`Estudante de ${f.nome}`));
  const faculdadeInicial = faculdadeAntecedente?.id || p.strixhaven?.iniciado?.faculdade || 'lorehold';
  abrirModal('Iniciado de Strixhaven · escolhas da adaptação', `<p>Escolha dois truques e uma magia de 1º círculo. A faculdade aqui pertence ao talento, independentemente da matrícula acadêmica. Concessões são identificadas como extras de campanha e não consomem a cota de classe.</p><label>Faculdade do talento<select id="iniciado-faculdade" class="form-select" ${faculdadeAntecedente ? 'disabled' : ''}>${modulo.faculdades.map(f => `<option value="${f.id}" ${f.id === faculdadeInicial ? 'selected' : ''}>${f.nome}</option>`).join('')}</select></label><label>Atributo<select id="iniciado-atributo" class="form-select"><option value="inteligencia">Inteligência</option><option value="sabedoria">Sabedoria</option><option value="carisma">Carisma</option></select></label><div id="iniciado-opcoes"></div>`, '<button class="btn btn-primary" id="iniciado-salvar">Confirmar escolhas</button>');
  const render = () => {
    const f = modulo.faculdades.find(f => f.id === document.getElementById('iniciado-faculdade').value);
    const truques = f.truques_iniciado.map(n => aliases[n] || n);
    const magias = indice.magias.filter(m => m.circulo === 1 && m.classes.some(c => f.listas_iniciado.includes(c)));
    document.getElementById('iniciado-opcoes').innerHTML = `<fieldset><legend>Dois truques</legend>${truques.map(n => `<label><input type="checkbox" name="iniciado-truque" value="${escHtml(n)}"> ${escHtml(n)}</label><br>`).join('')}</fieldset><label>Magia de 1º círculo<select id="iniciado-magia" class="form-select">${magias.map(m => `<option>${escHtml(m.nome)}</option>`).join('')}</select></label>`;
  };
  document.getElementById('iniciado-faculdade').onchange = render; render();
  document.getElementById('iniciado-salvar').onclick = async () => {
    const truques = [...document.querySelectorAll('[name="iniciado-truque"]:checked')].map(el => el.value);
    if (truques.length !== 2) { toast('Escolha exatamente dois truques.', 'error'); return; }
    const faculdade = document.getElementById('iniciado-faculdade').value;
    const atributo = document.getElementById('iniciado-atributo').value;
    const magia = document.getElementById('iniciado-magia').value;
    const escolhidas = await Promise.all([...truques.map(n => getMagia(n, 0)), getMagia(magia, 1)]);
    if (escolhidas.some(m => !m)) { toast('Uma escolha não foi encontrada no catálogo.', 'error'); return; }
    const existentes = p.magias_customizadas || [];
    const concessoes = escolhidas.map(m => {
      const anterior = existentes.find(x => x.beneficio_id === 'strixhaven-iniciado' && x.catalogo_ref === `${m.circulo}:${m.nome}`);
      return { ...structuredClone(m), id: anterior?.id || novoId(), origem: 'extra', beneficio_id: 'strixhaven-iniciado', catalogo_ref: `${m.circulo}:${m.nome}`,
        motivo: `Iniciado de Strixhaven · ${faculdade} · adaptação 2024`, atributo_extra: atributo, sempre_preparada: true, estado_extra: 'sempre preparada',
        usos_total: m.circulo === 1 ? 1 : 0, usos_gastos: anterior?.usos_gastos || 0, recuperacao: 'descanso longo', restricoes_excedidas: ['Concessão de talento da campanha, não benefício de classe.'], concentracao: /concentra/i.test(m.duracao || '') };
    });
    p.magias_customizadas = [...existentes.filter(m => m.beneficio_id !== 'strixhaven-iniciado'), ...concessoes];
    p.strixhaven ||= {}; p.strixhaven.iniciado = { faculdade, atributo, truques, magia };
    aoSalvar(); window.fecharModal();
  };
}
