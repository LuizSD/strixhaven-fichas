// Acessibilidade da pilha de modais existente, sem mudar o contrato abrir/fechar.
const pilha = [];
let sequencia = 0;
const focoPermitido = 'button:not([disabled]),a[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),[tabindex]:not([tabindex="-1"])';
function visiveis(container) {
  return [...container.querySelectorAll(focoPermitido)].filter(e => !e.hidden && e.getClientRects().length && !e.closest('[inert]'));
}
function origemDoFoco(el) {
  const id = el?.id;
  const atributos = el?.dataset ? Object.entries(el.dataset).filter(([k]) => /^(foto|idioma|justificar|observacoes)/i.test(k)) : [];
  return () => {
    if (el?.isConnected) return el;
    if (id) return document.getElementById(id);
    if (atributos.length) return [...document.querySelectorAll('button')].find(b => atributos.every(([k,v]) => b.dataset[k] === v));
    return null;
  };
}
export function prepararModalAcessivel(overlay, fechar) {
  if (!overlay?.querySelector || !document.addEventListener) return; // harness sem DOM visual
  const container = overlay.querySelector('.modal-container');
  if (!container?.setAttribute) return;
  const titulo = container.querySelector('h2');
  const numero = ++sequencia;
  if (titulo && !titulo.id) titulo.id = `dialogo-titulo-${numero}`;
  container.setAttribute('role','dialog'); container.setAttribute('aria-modal','true'); container.tabIndex = -1;
  if (titulo) container.setAttribute('aria-labelledby', titulo.id);
  let descricao = container.querySelector('[data-dialogo-descricao]') || container.querySelector('.modal-corpo p');
  if (!descricao) {
    descricao = document.createElement('p'); descricao.className = 'sr-only';
    descricao.textContent = 'Janela de detalhes e edição. Use Tab para navegar e Escape para fechar.';
    container.appendChild(descricao);
  }
  if (!descricao.id) descricao.id = `dialogo-descricao-${numero}`;
  container.setAttribute('aria-describedby', descricao.id);
  container.querySelectorAll('.modal-fechar').forEach(b => b.setAttribute('aria-label','Fechar janela'));
  const restaurarFoco = origemDoFoco(document.activeElement);
  const bloqueados = [...document.body.children].filter(e => e !== overlay && e.id !== 'toast-container' && !['SCRIPT','STYLE','LINK'].includes(e.tagName)).map(e => ({ el:e, inert:e.inert }));
  bloqueados.forEach(({el}) => { el.inert = true; });
  const overflow = document.body.style.overflow;
  document.body.style.overflow = 'hidden';
  const estado = { overlay, container, bloqueados, overflow, restaurarFoco };
  pilha.push(estado);
  estado.tecla = e => {
    if (pilha.at(-1) !== estado) return;
    if (e.key === 'Escape') { e.preventDefault(); e.stopImmediatePropagation(); fechar(); }
    if (e.key === 'Tab') {
      const elementos = visiveis(container);
      const primeiro = elementos[0], ultimo = elementos.at(-1);
      if (!primeiro) { e.preventDefault(); container.focus(); return; }
      if (!container.contains(document.activeElement) || document.activeElement === container) {
        e.preventDefault(); (e.shiftKey ? ultimo : primeiro).focus();
      } else if (e.shiftKey && document.activeElement === primeiro) { e.preventDefault(); ultimo.focus(); }
      else if (!e.shiftKey && document.activeElement === ultimo) { e.preventDefault(); primeiro.focus(); }
    }
  };
  document.addEventListener('keydown', estado.tecla, true);
  queueMicrotask(() => { if (pilha.at(-1) === estado) (container.querySelector('[data-modal-initial-focus]') || container).focus(); });
}
export function liberarModalAcessivel(overlay) {
  const i = pilha.findIndex(e => e.overlay === overlay);
  if (i < 0) return;
  const estado = pilha.splice(i,1)[0];
  document.removeEventListener('keydown',estado.tecla,true);
  estado.bloqueados.forEach(({el,inert}) => { el.inert = inert; });
  document.body.style.overflow = estado.overflow;
  queueMicrotask(() => {
    const topo = pilha.at(-1), origem = estado.restaurarFoco();
    const alvo = topo && !topo.overlay.contains(origem) ? topo.container : origem;
    alvo?.focus?.({ preventScroll:true });
  });
}
