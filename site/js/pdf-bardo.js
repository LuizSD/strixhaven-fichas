import { gerarPdfEditavel } from './strixhaven/exportacao.js';
import { CLASSES_INFO } from './dados-classes.js';

const seguro = valor => String(valor ?? '').replace(/[^\x20-\x7e\xa0-\xff\n–—‘’“”…•€™]/g, '?');
function caminho(p, path) {
  if (!p || typeof p !== 'object') return '';
  if (Object.hasOwn(p, path)) return p[path];
  const [primeiro, ...resto] = path.split('.');
  return resto.length ? caminho(p[primeiro], resto.join('.')) : p[primeiro] ?? '';
}
function valorMapeado(p, path) {
  if (path.startsWith('$slot')) {
    const level = path.split(':')[1];
    if (Array.isArray(p.espacos_calculados)) return p.espacos_calculados.filter(r => Number(r.circulo) === Number(level)).reduce((s, r) => s + (Number(r[path.startsWith('$slotTotal') ? 'total' : 'usados']) || 0), 0);
    const reservas = p.espacos_magia?.conjuracao || p.espacos_magia?.pacto ? [p.espacos_magia.conjuracao, p.espacos_magia.pacto] : [p.espacos_magia];
    return reservas.reduce((s, r) => s + (Number(r?.[level]?.[path.startsWith('$slotTotal') ? 'total' : 'usados']) || 0), 0);
  }
  if (path === '$atributoMagia') return [...new Set((p.classes || [{ classe: p.classe }]).map(c => CLASSES_INFO[c.classe]?.atributo_conjuracao).filter(Boolean))].join(' / ');
  if (path === '$dadosVida') return typeof p.dados_vida === 'object' ? Object.entries(p.dados_vida).map(([d, r]) => `${r.total}d${d}`).join(' / ') : String(p.dados_vida || '');
  if (path === '$percepcaoPassiva') return p.resumo_calculado?.sentidos?.match(/Percepção\s+(\d+)/)?.[1] || '';
  if (path === '$ataquesNotas') return (p.beneficios_manuais || []).filter(b => b.ataque || b.dano).map(b => `${b.nome}: ${b.ataque || ''} · ${b.dano || ''}`).join('\n');
  if (path.startsWith('$mod:')) return Math.floor((Number(p.atributos?.[path.slice(5)] ?? 10) - 10) / 2);
  if (path === '$classes') return (p.classes || [{ classe: p.classe, nivel: p.nivel }]).map(c => `${c.classe} ${c.nivel}`).join(' / ');
  if (path === '$idiomas') return [...(p.idiomas || []), ...(p.proficiencias_ferramentas || []), ...(p.proficiencias_instrumentos || [])].join('\n');
  if (path === '$inventario') return (p.inventario || []).map(i => `${i.quantidade ?? 1} x ${i.nome}${i.name?.en ? ` (${i.name.en})` : ''}${i.equipado ? ' (equipado)' : ''}`).join('\n');
  if (path === '$habilidades') return ['Registro completo e magias adicionais no complemento editável.', ...(p.beneficios_manuais || []).map(b => b.nome), ...(p.talentos || []).map(t => typeof t === 'string' ? t : t.nome)].join('\n');
  if (path === '$academia') return [p.strixhaven?.faculdade, ...(p.strixhaven?.relacionamentos || []).map(r => `${r.nome}: ${r.relacionamento || ''}`)].filter(Boolean).join('\n');
  const v = caminho(p, path);
  return path.includes('.pericias.') || path.includes('.salvaguardas.') ? String(v).split(' · ')[0] : path.endsWith('.Deslocam.') ? String(v).replace('metros', 'm') : v;
}

/** Fonte privada carregada só em memória. Não altera nem achata o template. */
export function adaptadorBardo(manifest, bytes) {
  return {
    id: 'bardo-critical20', displayName: 'Bardo - Critical20 · editável com complemento',
    sourcePattern: 'Bardo - Critical20*.pdf', templateHash: manifest.sha256,
    supports: p => !!p && typeof p === 'object',
    async validateTemplate(PDFLib) {
      const hash = [...new Uint8Array(await crypto.subtle.digest('SHA-256', bytes))].map(n => n.toString(16).padStart(2, '0')).join('');
      if (hash !== manifest.sha256) return { valid: false, reason: 'Hash não corresponde ao mapa validado.' };
      const doc = await PDFLib.PDFDocument.load(bytes);
      const names = doc.getForm().getFields().map(f => f.getName());
      return { valid: doc.getPageCount() === manifest.pages && Object.keys(manifest.mapping).every(n => names.includes(n)), fields: names.length };
    },
    async exportEditable(p, PDFLib) {
      if (!(await this.validateTemplate(PDFLib)).valid) throw new Error('Template Critical20 incompatível com o mapa.');
      const { PDFDocument, PDFName, PDFDict, PDFTextField, PDFCheckBox, StandardFonts } = PDFLib;
      const doc = await PDFDocument.load(bytes);
      const form = doc.getForm();
      const font = await doc.embedFont(StandardFonts.Helvetica);
      const overflow = [];
      // Calculadoras 2014 do modelo não podem reescrever o cálculo 2024.
      doc.catalog.delete(PDFName.of('OpenAction'));
      const names = doc.catalog.lookupMaybe(PDFName.of('Names'), PDFDict);
      names?.delete(PDFName.of('JavaScript'));
      form.acroForm.dict.delete(PDFName.of('CO'));
      for (const f of form.getFields()) {
        f.acroField.dict.delete(PDFName.of('AA'));
        f.acroField.dict.delete(PDFName.of('DV'));
        for (const w of f.acroField.getWidgets()) { w.dict.delete(PDFName.of('AA')); w.dict.delete(PDFName.of('A')); }
        if (f instanceof PDFTextField) { f.acroField.dict.delete(PDFName.of('MaxLen')); f.setText(''); f.disableReadOnly(); }
        if (f instanceof PDFCheckBox) { f.uncheck(); f.disableReadOnly(); }
      }
      const preencher = (name, valor) => {
        const f = form.getTextField(name);
        const rect = f.acroField.getWidgets()[0]?.getRectangle();
        if (!rect) { overflow.push(name); return; }
        const width = Math.max(1, rect.width - 4), height = Math.max(1, rect.height - 4);
        let text = seguro(valor), size = Math.min(10, Math.max(7, height*.65));
        const multiline = f.isMultiline() || height > 45;
        if (multiline) {
          f.enableMultiline(); size = 9;
          const lines = [];
          for (const paragraph of text.split('\n')) {
            let line = '';
            for (const c of paragraph) {
              if (font.widthOfTextAtSize(line+c, size) > width && line) { lines.push(line); line = ''; }
              line += c;
            }
            lines.push(line);
          }
          const max = Math.max(1, Math.floor(height/(size*1.3)));
          if (lines.length > max) { overflow.push(name); text = [...lines.slice(0, max-1), 'Ver complemento.'].join('\n'); }
          else text = lines.join('\n');
        } else {
          text = text.replaceAll('\n', '; ');
          while (size > 8 && font.widthOfTextAtSize(text, size) > width) size -= .5;
          if (font.widthOfTextAtSize(text, size) > width) {
            overflow.push(name);
            while (text && font.widthOfTextAtSize(text+'...', size) > width) text = text.slice(0, -1);
            text += '...';
          }
        }
        f.setText(text); f.setFontSize(size);
      };
      for (const [name, path] of Object.entries(manifest.mapping)) preencher(name, valorMapeado(p, path));
      for (const [name, path] of Object.entries(manifest.checkboxMapping || {})) {
        if (/Proficiente|Especialização/.test(String(caminho(p, path)))) form.getCheckBox(name).check();
      }
      const spells = new Map();
      for (const m of [...(p.magias_conhecidas || []), ...(p.magias_preparadas || []), ...(p.grimorio || []), ...(p.magias_customizadas || [])]) {
        const key = m.id || `${m.nome}|${m.circulo}|${m.source?.rulesVersion || '2024'}`;
        if (!spells.has(key)) spells.set(key, m);
      }
      for (const [level, fields] of Object.entries(manifest.spellGroups)) {
        const lista = [...spells.values()].filter(m => Number(m.circulo) === Number(level));
        fields.forEach((f, i) => {
          const m = lista[i];
          let nome = m?.nome || '';
          if (m?.name?.en) {
            const bilingue = seguro(`${nome} (${m.name.en})`);
            const width = form.getTextField(f).acroField.getWidgets()[0]?.getRectangle().width || 0;
            if (font.widthOfTextAtSize(bilingue, 8) <= width-4) nome = bilingue;
          }
          preencher(f, nome);
        });
        if (lista.length > fields.length) overflow.push(`Magias de círculo ${level}: ${lista.length-fields.length} no complemento.`);
      }
      form.updateFieldAppearances(font);
      // Acrescenta ao MESMO documento: copyPages perderia o AcroForm da cópia.
      return gerarPdfEditavel({ ...p, cobertura_pdf: { modelo: 'Bardo - Critical20', campos_resumidos: overflow.join('; '), campos_sem_mapa: manifest.unmappedFields.join(', '), suplemento: manifest.supplement } }, PDFLib, doc);
    },
  };
}
