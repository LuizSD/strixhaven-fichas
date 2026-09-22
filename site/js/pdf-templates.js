import { gerarPdfEditavel } from './strixhaven/exportacao.js';
import { adaptadorBardo } from './pdf-bardo.js';

// Adaptadores centralizados. Modelos privados dependem de hash + mapa próprios.
// Os modelos privados descobertos constam dos manifests, sem embutir seus bytes.
export const PDF_TEMPLATE_ADAPTERS = [{
  id: 'strixhaven-atual', displayName: 'Strixhaven atual · AcroForm próprio',
  sourcePattern: null, templateHash: null, supports: () => true,
  validateTemplate: async () => ({ valid: true, generated: true }),
  exportEditable: (p, PDFLib) => gerarPdfEditavel(p, PDFLib),
}];

export function modeloPdfHtml() {
  return `<label>Modelo do PDF<select class="form-select" id="modelo-pdf">${PDF_TEMPLATE_ADAPTERS.map(a => `<option value="${a.id}">${a.displayName}</option>`).join('')}</select></label><p id="pdf-modelo-disponibilidade">Verificando disponibilidade do template Bardo - Critical20…</p><details><summary>Disponibilidade dos modelos privados</summary><p>Tetse-strixhaven: os arquivos encontrados têm tabelas xref danificadas e precisam de reparo em memória e reposicionamento de campos; modelo desabilitado.</p><p>O modelo Strixhaven atual continua disponível. Consulte reference/manifests/pdf-templates/ para hashes, campos e cobertura individual.</p></details>`;
}

let descoberta;
export async function setupModelosPdf(container, carregarBiblioteca) {
  descoberta ||= (async () => {
    try {
      const resp = await fetch('../dados/pdf-templates/bardo-critical20.json');
      if (!resp.ok) return null;
      const manifest = await resp.json();
      if (manifest.validated !== true) return null;
      const pdf = await fetch(manifest.url);
      if (!pdf.ok) return null;
      const adapter = adaptadorBardo(manifest, new Uint8Array(await pdf.arrayBuffer()));
      if (!(await adapter.validateTemplate(await carregarBiblioteca())).valid) return null;
      PDF_TEMPLATE_ADAPTERS.push(adapter);
      return adapter;
    } catch { return null; }
  })();
  const adapter = await descoberta;
  const select = container.querySelector('#modelo-pdf');
  if (adapter && select && ![...select.options].some(o => o.value === adapter.id)) select.add(new Option(adapter.displayName, adapter.id));
  const status = container.querySelector('#pdf-modelo-disponibilidade');
  if (status) status.textContent = adapter ? 'Bardo - Critical20 disponível: arquivo privado conferido por hash. Dados completos em páginas editáveis complementares.' : 'Bardo - Critical20 indisponível nesta pasta servida. Prepare a referência privada conforme reference/README.md. O modelo atual continua funcionando.';
}

export async function exportarModeloPdf(id, personagem, PDFLib) {
  const adapter = PDF_TEMPLATE_ADAPTERS.find(a => a.id === id);
  if (!adapter || !(await adapter.validateTemplate(PDFLib)).valid) throw new Error('Modelo de PDF indisponível ou não validado. Selecione Strixhaven atual.');
  return adapter.exportEditable(personagem, PDFLib);
}
