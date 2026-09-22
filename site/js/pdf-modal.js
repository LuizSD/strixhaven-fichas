import { abrirModal } from './utils.js';
import { PDF_TEMPLATE_ADAPTERS, setupModelosPdf } from './pdf-templates.js';

let processando = false;

/** Apenas apresentação: a descoberta e a geração continuam nos adaptadores existentes. */
export function abrirModalPdf(carregarBiblioteca, exportar) {
  abrirModal('Gerar PDF da ficha', `<p data-dialogo-descricao>Escolha o modelo e revise sua disponibilidade antes de gerar.</p>
    <fieldset id="pdf-opcoes"><legend>Modelo do PDF</legend></fieldset>
    <details><summary>Disponibilidade dos modelos privados</summary>
      <p id="pdf-modelo-disponibilidade">Verificando Bardo - Critical20…</p>
      <p>Tetse-strixhaven: indisponível. Referências com tabelas xref danificadas exigem reparo e reposicionamento de campos.</p>
      <p>Modelos privados são conferidos por hash e mapa de campos próprios.</p>
    </details><p id="pdf-estado" role="status" aria-live="polite"></p>`,
  '<button type="button" class="btn btn-secondary" id="pdf-cancelar">Cancelar</button><button type="button" class="btn btn-primary" id="pdf-gerar">Gerar PDF</button>');
  const opcoes = document.getElementById('pdf-opcoes');
  const estado = document.getElementById('pdf-estado');
  const gerar = document.getElementById('pdf-gerar');
  const cancelar = document.getElementById('pdf-cancelar');
  const modal = opcoes.closest('[role="dialog"]');
  const adicionar = (id, nome, descricao, indicador, desabilitado = false) => {
    const label = document.createElement('label'); label.className = 'pdf-modelo-opcao';
    const radio = document.createElement('input'); radio.type = 'radio'; radio.name = 'modelo-pdf'; radio.value = id;
    radio.disabled = desabilitado; radio.checked = id === 'descritivo';
    if (id === 'descritivo') radio.setAttribute('data-modal-initial-focus', '');
    const texto = document.createElement('span');
    const titulo = document.createElement('strong'); titulo.textContent = `${nome} — ${indicador}`;
    const detalhe = document.createElement('small'); detalhe.textContent = descricao;
    texto.append(titulo, detalhe); label.append(radio, texto); opcoes.append(label);
    return label;
  };
  adicionar('descritivo', 'Ficha descritiva', 'Resumo visual da ficha. Sem campos editáveis AcroForm.', 'Disponível');
  const adicionarAdapter = a => adicionar(a.id, a.displayName,
    a.id === 'strixhaven-atual' ? 'Ficha completa editável com campos AcroForm.' : 'Template privado validado, com páginas editáveis AcroForm complementares.',
    a.id === 'strixhaven-atual' ? 'Disponível' : 'Com complemento');
  PDF_TEMPLATE_ADAPTERS.forEach(adicionarAdapter);
  const bardo = PDF_TEMPLATE_ADAPTERS.some(a => a.id === 'bardo-critical20') ? null :
    adicionar('bardo-indisponivel', 'Bardo - Critical20', 'Verificando arquivo privado e validação. AcroForm com complemento quando disponível.', 'Indisponível', true);
  adicionar('tetse-indisponivel', 'Tetse-strixhaven', 'Template privado precisa de reparo; AcroForm indisponível.', 'Indisponível', true);
  setupModelosPdf(modal, carregarBiblioteca).then(() => {
    if (!opcoes.isConnected) return;
    for (const a of PDF_TEMPLATE_ADAPTERS) {
      if (![...opcoes.querySelectorAll('input')].some(r => r.value === a.id)) { bardo?.remove(); adicionarAdapter(a); }
    }
    if (bardo?.isConnected) bardo.querySelector('small').textContent = 'Arquivo privado ausente ou não validado. AcroForm com complemento requer referência válida.';
  });
  cancelar.onclick = () => window.fecharModal();
  if (processando) { gerar.disabled = true; estado.textContent = 'Um PDF já está sendo gerado. Aguarde e reabra esta janela.'; }
  gerar.onclick = async () => {
    if (processando) return;
    const id = opcoes.querySelector('input:checked')?.value;
    if (!id) return;
    processando = true; gerar.disabled = true; opcoes.disabled = true;
    estado.textContent = 'Gerando PDF…'; modal.setAttribute('aria-busy', 'true');
    try {
      await exportar(id);
      if (estado.isConnected) estado.textContent = 'PDF gerado. O download foi iniciado.';
    } catch (e) {
      if (estado.isConnected) estado.textContent = `Não foi possível gerar o PDF. ${e.message || 'Tente novamente.'}`;
    } finally {
      processando = false; gerar.disabled = false; opcoes.disabled = false; modal.removeAttribute('aria-busy');
    }
  };
}
