import { escHtml } from '../utils.js';
import { CAMPOS_ACADEMICOS } from './modelo.js';
import { calcularConjuracaoExtra } from './extras.js';

/** Percorre todos os subcampos, incluindo extensões desconhecidas; IDs ficam no caminho. */
export function camposExportaveis(valor, caminho = '', resultado = []) {
  if (valor && typeof valor === 'object') {
    for (const [k, v] of Object.entries(valor)) {
      if (k === 'imagem') continue; // retrato pertence à ficha visual, não ao formulário textual
      const parte = Array.isArray(valor) && v?.id ? `${k} [${v.id}]` : k;
      camposExportaveis(v, caminho ? `${caminho} / ${parte}` : parte, resultado);
    }
  } else if (valor != null) resultado.push({ caminho, valor: String(valor) });
  return resultado;
}

/** Blocos de impressão também alimentam o PDF descritivo existente. */
export function htmlComplemento(p) {
  const a = p.strixhaven || {};
  const blocos = [`<h2>Vida acadêmica · Strixhaven (adaptação 2024)</h2><p>Estudante: ${escHtml(p.nome || '')}</p><p>Faculdade: ${escHtml(a.faculdade || 'Ainda não definida')} · Ano: ${escHtml(a.ano ?? '')} · Ingresso: ${escHtml(a.ingresso || '')}</p>`];
  for (const [grupo, def] of Object.entries(CAMPOS_ACADEMICOS)) {
    blocos.push(`<h2>${def.titulo}</h2>`);
    for (const r of a[grupo] || []) {
      blocos.push(`<h3>${escHtml(r.nome)} · ID ${escHtml(r.id)}</h3>`);
      for (const [k, v] of Object.entries(r)) {
        const d = def.campos[k];
        const rotulo = Array.isArray(d) ? d[0] : d || k;
        blocos.push(`<p>${escHtml(rotulo)}: ${escHtml(typeof v === 'boolean' ? v ? 'Sim' : 'Não' : typeof v === 'object' ? JSON.stringify(v) : v)}</p>`);
      }
    }
  }
  blocos.push(`<h2>Notas acadêmicas</h2><p>${escHtml(a.notas || '')}</p>`);
  if (p.idiomas_personalizados?.length) {
    blocos.push('<h2>Idiomas personalizados</h2>');
    for (const i of p.idiomas_personalizados) blocos.push(`<h3>${escHtml(i.nome)}${i.name?.en ? ` (${escHtml(i.name.en)})` : ''}</h3><p>${escHtml(i.escrita)} · ${escHtml(i.origem)} · ${escHtml(i.observacoes)}</p>`);
  }
  if (p.justificativa_magias) blocos.push(`<h2>Quantidade fora do limite sugerido · justificativa manual</h2><p>${escHtml(p.justificativa_magias)}</p>`);
  const extras = (p.magias_customizadas || []).filter(m => m.origem === 'extra');
  for (const m of extras) {
    const valores = calcularConjuracaoExtra(m, p);
    blocos.push(`<h2>Magia Extra</h2><h3>${escHtml(m.nome)}</h3><p>${m.sempre_preparada === false ? 'Ocupa vaga' : 'Não ocupa vaga'} · Regra da mesa</p>`);
    const semValor = m.sem_teste === true ? 'não se aplica' : 'não definido';
    blocos.push(`<p>CD calculada: ${escHtml(valores.cd_calculada ?? semValor)} · CD efetiva: ${escHtml(valores.cd_efetiva ?? semValor)} · Ataque calculado: ${escHtml(valores.ataque_calculado ?? semValor)} · Ataque efetivo: ${escHtml(valores.ataque_efetivo ?? semValor)}</p>`);
    for (const c of camposExportaveis(m)) blocos.push(`<p>${escHtml(c.caminho)}: ${escHtml(c.valor)}</p>`);
  }
  if (p.edicoes || p.ajustes_manuais) {
    blocos.push('<h2>Ajustes manuais identificados</h2>');
    for (const c of camposExportaveis({ edicoes: p.edicoes, ajustes_manuais: p.ajustes_manuais })) blocos.push(`<p>${escHtml(c.caminho)}: ${escHtml(c.valor)}</p>`);
  }
  if (p.beneficios_manuais?.length) {
    blocos.push('<h2>Habilidades e benefícios manuais · Extra</h2>');
    for (const c of camposExportaveis(p.beneficios_manuais)) blocos.push(`<p>${escHtml(c.caminho)}: ${escHtml(c.valor)}</p>`);
  }
  return `<section class="sh-impressao">${blocos.join('\n')}</section>`;
}

/** Quebra texto pelo tamanho real da fonte, inclusive palavras extensas. */
function linhasTexto(texto, fonte, largura, tamanho) {
  const linhas = [];
  for (const paragrafo of texto.split('\n')) {
    let linha = '';
    for (const caractere of paragrafo) {
      if (fonte.widthOfTextAtSize(linha + caractere, tamanho) > largura && linha) { linhas.push(linha); linha = ''; }
      linha += caractere;
    }
    linhas.push(linha);
  }
  return linhas;
}

/** PDF próprio AcroForm; páginas de continuação, sem achatar campos ou cortar listas. */
export async function gerarPdfEditavel(p, PDFLib, documento = null) {
  const { PDFDocument, StandardFonts, rgb } = PDFLib;
  const doc = documento || await PDFDocument.create();
  const fonte = await doc.embedFont(StandardFonts.Helvetica);
  const titulo = await doc.embedFont(StandardFonts.TimesRomanBold);
  const form = doc.getForm();
  const seguro = t => String(t).replace(/[^\x20-\x7e\xa0-\xff\n–—‘’“”…•€™]/g, '?');
  let pagina, y, numero = 0, coluna = 0, alturaLinha = 0;
  const novaPagina = () => {
    pagina = doc.addPage([595, 842]); numero++; y = 760; coluna = 0; alturaLinha = 0;
    pagina.drawText('STRIXHAVEN', { x: 36, y: 799, font: titulo, size: 20, color: rgb(.08, .17, .27) });
    pagina.drawText(`Registro editável próprio · D&D 2024 · ${numero}`, { x: 36, y: 779, font: fonte, size: 9 });
    pagina.drawLine({ start: { x: 36, y: 770 }, end: { x: 559, y: 770 }, color: rgb(.62, .47, .2) });
  };
  novaPagina();
  let seq = 0;
  const rotulos = { resumo_calculado: 'Resumo calculado', strixhaven: 'Vida acadêmica', magias_customizadas: 'Magias manuais e extras', atributos_base: 'Atributos de base', pv_max: 'PV máximos', pv_atual: 'PV atuais', pv_temporario: 'PV temporários', beneficios_manuais: 'Habilidades e benefícios manuais', ajustes_manuais: 'Ajustes manuais', edicoes: 'Histórico de ajustes', estado_extra: 'Estado da magia extra', cd_manual: 'CD manual', ataque_manual: 'Ataque manual', usos_total: 'Uso especial: quantidade', usos_gastos: 'Uso especial: gastos' };
  const projecao = { ...p, magias_customizadas: (p.magias_customizadas || []).map(m => m.origem === 'extra' ? { ...m, calculos_conjuracao: calcularConjuracaoExtra(m, p) } : m) };
  for (const c of camposExportaveis(projecao)) {
    const compacto = c.valor.length <= 60 && !c.valor.includes('\n') && c.caminho.length < 105;
    const largura = compacto ? 253 : 523;
    const linhas = linhasTexto(seguro(c.valor), fonte, largura - 23, 10);
    for (let inicio = 0; inicio < linhas.length; inicio += 12) {
      if (!compacto && coluna) { y -= alturaLinha; coluna = 0; alturaLinha = 0; }
      const trecho = linhas.slice(inicio, inicio + 12);
      const legenda = c.caminho.split(' / ').map(k => rotulos[k] || k.replaceAll('_', ' ')).join(' / ');
      const linhasRotulo = linhasTexto(seguro(`${legenda}${inicio ? ' (continuação)' : ''}`), fonte, largura - 3, 8);
      const altura = Math.max(26, trecho.length * 13 + 12);
      const bloco = altura + linhasRotulo.length * 10 + 18;
      if (y - bloco < 42) novaPagina();
      const x = 36 + (compacto ? coluna * 270 : 0);
      let linhaY = y;
      for (const linha of linhasRotulo) { pagina.drawText(linha, { x, y: linhaY, font: fonte, size: 8 }); linhaY -= 10; }
      // O ponto separa níveis AcroForm; pontuação dos rótulos não cria níveis vazios.
      const chave = c.caminho.replaceAll('.', '·') || 'valor';
      const campo = form.createTextField(`campo.${seq++}.${chave}.${inicio}`);
      campo.enableMultiline(); campo.setText(trecho.join('\n'));
      campo.addToPage(pagina, { x, y: linhaY - altura, width: largura, height: altura, borderWidth: .5, borderColor: rgb(.65, .62, .55), font: fonte });
      campo.setFontSize(10);
      if (compacto) {
        alturaLinha = Math.max(alturaLinha, bloco);
        if (coluna === 0) coluna = 1;
        else { coluna = 0; y -= alturaLinha; alturaLinha = 0; }
      } else y -= bloco;
    }
  }
  form.updateFieldAppearances(fonte);
  doc.setTitle(`Strixhaven — ${p.nome} — AcroForm`);
  return doc.save();
}
