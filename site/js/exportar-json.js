import { _validarPersonagem } from './store.js';
import { serializarDocumento, nomeArquivo } from './documento-json.js';
import { toast } from './utils.js';

/** Baixa a ficha aberta completa, sem depender de persistência ou rede. */
export function exportarFichaJSON(personagem) {
  if (!_validarPersonagem(personagem)) {
    toast('Ficha inválida para exportação.', 'error');
    return;
  }
  const texto = serializarDocumento(personagem);
  const url = URL.createObjectURL(new Blob([texto], { type: 'application/json' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = nomeArquivo(personagem.nome);
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
