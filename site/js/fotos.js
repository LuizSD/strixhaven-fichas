import { abrirModal } from './utils.js';
import { fotoPrincipal, migrarFotos, salvarFoto, definirFotoPrincipal, removerFoto, moverFoto, validarUrlFoto, testarImagem } from './fotos-modelo.js';

const criar = (tag, texto = '', classe = '') => { const el = document.createElement(tag); el.textContent = texto; if (classe) el.className = classe; return el; };
function botao(texto, acao, atributos = {}) {
  const b = criar('button', texto, 'btn btn-sm btn-secondary'); b.type = 'button'; b.onclick = acao;
  for (const [k,v] of Object.entries(atributos)) b.setAttribute(k,v);
  return b;
}
const iniciais = p => (p.nome || '?').trim().split(/\s+/).slice(0,2).map(s => s[0]).join('').toUpperCase();
const paginasAlbum = new WeakMap();

/** URLs só entram em propriedades DOM, nunca em HTML interpolado. */
function imagemSegura(foto, p, { principal = false, ampliar = true, legado = false } = {}) {
  const caixa = criar('div', '', principal ? 'foto-retrato' : 'foto-miniatura');
  const imagem = document.createElement('img');
  imagem.alt = foto.altText || foto.title || `Retrato de ${p.nome || 'personagem'}`;
  imagem.loading = principal ? 'eager' : 'lazy'; imagem.decoding = 'async'; imagem.referrerPolicy = 'no-referrer';
  imagem.style.objectPosition = foto.position || 'center';
  const fallback = criar('div', '', 'foto-fallback');
  fallback.append(criar('span', iniciais(p), 'foto-iniciais'), criar('span', 'Carregando referência visual…'));
  caixa.append(imagem, fallback);
  const tentar = () => {
    fallback.replaceChildren(criar('span', iniciais(p), 'foto-iniciais'), criar('span', 'Carregando referência visual…'));
    fallback.hidden = false; imagem.hidden = false; imagem.style.opacity = '0';
    caixa.dataset.estado = 'carregando';
    try { imagem.src = legado ? foto.url : validarUrlFoto(foto.url); }
    catch(e) { falhar(e.message); }
  };
  const falhar = texto => {
    imagem.hidden = true; fallback.hidden = false;
    fallback.replaceChildren(criar('span', iniciais(p), 'foto-iniciais'), criar('span', texto || 'Imagem indisponível. O endereço foi preservado.'), botao('Tentar novamente', tentar, { 'data-foto-retry':foto.id || 'legado' }));
    caixa.dataset.estado = 'erro';
  };
  imagem.onload = () => { imagem.hidden = false; imagem.style.opacity = '1'; fallback.hidden = true; caixa.dataset.estado = 'carregada'; };
  imagem.onerror = () => falhar();
  if (ampliar) {
    const abrir = botao('Ampliar imagem', () => abrirImagem(foto,p,legado), { 'data-foto-ampliar':foto.id || 'legado' });
    caixa.append(abrir);
  }
  tentar();
  return caixa;
}
function abrirImagem(foto,p,legado = false) {
  abrirModal('Foto e referência visual', '<p data-dialogo-descricao>Visualização ampliada. Escape fecha a janela.</p><div id="foto-lightbox"></div>');
  const box = document.getElementById('foto-lightbox');
  box.className = 'foto-lightbox';
  box.append(criar('h3',foto.title || 'Referência visual'), imagemSegura(foto,p,{ principal:true, ampliar:false, legado }));
  if (foto.caption) box.append(criar('p',foto.caption));
}

export function abrirEditorFoto(p, aoSalvar, id = null) {
  migrarFotos(p);
  const anterior = p.photos.find(f => f.id === id);
  abrirModal(anterior ? 'Editar referência visual' : 'Adicionar foto por URL', '<p data-dialogo-descricao>Use um link direto HTTPS. Imagens externas dependem do servidor original e podem ficar indisponíveis. Somente URL e metadados serão salvos.</p><div id="foto-editor"></div>', '<button class="btn btn-primary" id="foto-salvar">Salvar foto</button>');
  const editor = document.getElementById('foto-editor');
  const campos = { url:'URL direta da imagem (obrigatória)', title:'Título', caption:'Legenda', altText:'Texto alternativo (recomendado)' };
  const inputs = {};
  for (const [key,label] of Object.entries(campos)) {
    const l = criar('label',label); const i = document.createElement('input');
    i.className = 'form-input'; i.id = `foto-${key}`; i.type = key === 'url' ? 'url' : 'text';
    i.value = anterior?.[key] || ''; if (key === 'url') i.setAttribute('data-modal-initial-focus','');
    l.append(i); editor.append(l); inputs[key]=i;
  }
  const rotuloPrincipal = criar('label',''); const primary = document.createElement('input');
  primary.type = 'checkbox'; primary.id = 'foto-principal'; primary.checked = anterior ? anterior.isPrimary : false;
  rotuloPrincipal.append(primary,document.createTextNode(' Definir como foto principal')); editor.append(rotuloPrincipal);
  const posLabel = criar('label','Posição do recorte'); const position = document.createElement('select');
  position.id = 'foto-posicao'; position.className = 'form-select';
  for (const [v,t] of [['center','Centro'],['top','Topo'],['bottom','Base']]) position.add(new Option(t,v));
  position.value = anterior?.position || 'center'; posLabel.append(position); editor.append(posLabel);
  const erro = criar('p',''); erro.id='foto-erro'; erro.setAttribute('role','alert'); editor.append(erro);
  const preview = criar('div','','foto-editor-preview'); editor.append(preview);
  const validar = async () => {
    const url = validarUrlFoto(inputs.url.value);
    erro.textContent = 'Verificando o carregamento real da imagem…';
    await testarImagem(url);
    if (!editor.isConnected || editor.closest('.modal-overlay')?.style.display !== 'flex') return null;
    if (url !== validarUrlFoto(inputs.url.value)) throw new Error('O endereço mudou durante a validação. Tente novamente.');
    erro.textContent = 'Imagem carregada. Nenhum byte será armazenado na ficha.';
    preview.replaceChildren(imagemSegura({ url, title:inputs.title.value },p,{ principal:true, ampliar:false }));
    return url;
  };
  editor.append(botao('Testar carregamento', async () => { try { await validar(); } catch(e) { erro.textContent=e.message; } }, { id:'foto-testar' }));
  const salvar = document.getElementById('foto-salvar');
  salvar.onclick = async () => {
    salvar.disabled = true;
    try {
      const atual = validarUrlFoto(inputs.url.value);
      const url = anterior?.url === atual ? atual : await validar();
      if (!url || !editor.isConnected || editor.closest('.modal-overlay')?.style.display !== 'flex') return;
      salvarFoto(p, { ...Object.fromEntries(Object.entries(inputs).map(([k,i]) => [k,i.value])), url, isPrimary:primary.checked, position:position.value }, id);
      window.fecharModal(); aoSalvar();
    } catch(e) { if (editor.isConnected) erro.textContent=e.message; }
    finally { salvar.disabled = false; }
  };
}

function confirmarRemocao(p,foto,aoSalvar) {
  abrirModal('Remover foto do álbum', '<p data-dialogo-descricao>Confirme a remoção desta referência. A imagem no servidor original não será alterada.</p><div id="foto-remocao"></div>', '<button class="btn btn-danger" id="foto-remover-confirmar">Remover foto</button>');
  const box = document.getElementById('foto-remocao'); box.append(criar('p',foto.title || 'Foto sem título'));
  let select;
  if (foto.isPrimary) {
    const label=criar('label','Nova foto principal'); select=document.createElement('select'); select.id='foto-substituta'; select.className='form-select';
    select.add(new Option('Primeira restante na ordem do álbum','auto')); select.add(new Option('Sem principal (placeholder)',''));
    p.photos.filter(f=>f.id!==foto.id).forEach(f=>select.add(new Option(f.title || 'Foto sem título',f.id)));
    label.append(select); box.append(label,criar('p','Se a substituta estiver indisponível, o cabeçalho mostra um placeholder e permite tentar novamente.'));
  }
  document.getElementById('foto-remover-confirmar').onclick = () => {
    removerFoto(p,foto.id,!select || select.value === 'auto' ? undefined : select.value || null);
    window.fecharModal(); aoSalvar();
  };
}
export function renderAlbumFotos(p, container, aoSalvar) {
  if (!container?.replaceChildren) return;
  migrarFotos(p); container.replaceChildren(); container.className='card album-fotos'; container.id ||= 'album-fotos';
  const cabecalho=criar('div','','album-titulo');
  cabecalho.append(criar('h2','Fotos e referências visuais'),criar('span',`${p.photos.length} fotos`,'album-contador'),botao('Adicionar foto por URL',()=>abrirEditorFoto(p,aoSalvar),{ id:container.id === 'album-modal' ? 'foto-adicionar-modal':'foto-adicionar' }));
  container.append(cabecalho);
  const ajuda=criar('details'); ajuda.append(criar('summary','Como funciona'),criar('p','São salvos somente URLs e metadados. Links externos podem ficar indisponíveis. Adicionar fotos não muda a principal; use Definir como principal.')); container.append(ajuda);
  for (const aviso of p.photos_avisos || []) container.append(criar('p',aviso,'foto-aviso'));
  const grid=criar('div','','album-grade'); container.append(grid);
  if (!p.photos.length) grid.append(criar('p','Álbum vazio. Adicione um link direto de imagem.'));
  const paginas=Math.max(1,Math.ceil(p.photos.length/18));
  const estado=paginasAlbum.get(p) || {};
  const pagina=Math.min(estado[container.id] || 0,paginas-1);
  estado[container.id]=pagina; paginasAlbum.set(p,estado);
  p.photos.slice(pagina*18,pagina*18+18).forEach((f,indice) => {
    const i=pagina*18+indice;
    const card=criar('article','','foto-card'); card.dataset.fotoId=f.id;
    const miniatura=imagemSegura(f,p);
    const ampliar=miniatura.querySelector('[data-foto-ampliar]');
    ampliar.setAttribute('aria-label',`Ampliar ${f.title || `Referência ${i+1}`}`);
    card.append(miniatura,criar('h3',f.title || `Referência ${i+1}`));
    if (f.caption) { const legenda=criar('p',f.caption,'foto-legenda'); legenda.title=f.caption; card.append(legenda); }
    if (f.isPrimary) miniatura.append(criar('strong','Principal','foto-selo-principal'));
    const menu=criar('details','','foto-menu no-print');
    menu.dataset.detailsId=`foto-menu-${f.id}`;
    const resumo=criar('summary','⋮'); resumo.setAttribute('aria-label',`Ações de ${f.title || `Referência ${i+1}`}`); menu.append(resumo);
    const acoes=criar('div','','foto-acoes');
    acoes.addEventListener('click',()=>{ menu.open=false; },true);
    acoes.append(botao('Definir como principal',()=>{ definirFotoPrincipal(p,f.id); aoSalvar(); },{ 'data-foto-principal':f.id }),
      botao('Editar',()=>abrirEditorFoto(p,aoSalvar,f.id),{ 'data-foto-editar':f.id }),
      botao('Remover',()=>confirmarRemocao(p,f,aoSalvar),{ 'data-foto-remover':f.id }));
    const subir=botao('↑',()=>{ moverFoto(p,f.id,-1); aoSalvar(); },{ 'data-foto-subir':f.id, 'aria-label':'Mover foto para cima' }); subir.disabled=i===0;
    const descer=botao('↓',()=>{ moverFoto(p,f.id,1); aoSalvar(); },{ 'data-foto-descer':f.id, 'aria-label':'Mover foto para baixo' }); descer.disabled=i===p.photos.length-1;
    acoes.append(subir,descer); menu.append(acoes); card.append(menu); grid.append(card);
  });
  if (p.photos.length) {
    const navegacao=criar('nav','','album-paginacao'); navegacao.setAttribute('aria-label','Páginas do álbum');
    const ir=delta=>{ estado[container.id]=pagina+delta; renderAlbumFotos(p,container,aoSalvar); container.querySelector('[data-album-pagina]')?.focus(); };
    const anterior=botao('Anterior',()=>ir(-1)); anterior.disabled=pagina===0;
    const proxima=botao('Próxima',()=>ir(1)); proxima.disabled=pagina===paginas-1;
    const status=criar('span',`${pagina*18+1}–${Math.min((pagina+1)*18,p.photos.length)} de ${p.photos.length} fotos · Página ${pagina+1} de ${paginas}`);
    status.tabIndex=-1; status.setAttribute('data-album-pagina',''); status.setAttribute('aria-live','polite');
    if(paginas>1) navegacao.append(anterior); navegacao.append(status); if(paginas>1) navegacao.append(proxima);
    container.append(navegacao);
  }
}
export function renderRetratoFotos(p, container, aoSalvar) {
  if (!container?.replaceChildren) return;
  container.replaceChildren(); container.className='retrato-cabecalho';
  const principal=fotoPrincipal(p);
  if (principal) container.append(imagemSegura(principal,p,{ principal:true }));
  else if (!p.photos_configurado && p.imagem && (/^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(p.imagem) || /^https:\/\//i.test(p.imagem))) {
    // Compatibilidade somente de leitura: nunca converte bytes antigos em álbum.
    container.append(imagemSegura({ url:p.imagem, title:'Retrato anterior', altText:`Retrato anterior de ${p.nome || 'personagem'}` },p,{ principal:true, legado:true }));
  } else container.append(criar('div',iniciais(p),'foto-retrato foto-iniciais foto-placeholder'));
  const acoes=criar('div','','sh-acoes no-print');
  acoes.append(botao(principal ? 'Trocar principal' : 'Escolher foto',()=>abrirGerenciadorFotos(p,aoSalvar),{ id:'foto-cabecalho-trocar' }));
  if (principal || (!p.photos_configurado && p.imagem)) acoes.append(botao('Remover principal',()=>{
    if (!confirm('Deixar o cabeçalho sem foto principal? As referências do álbum serão preservadas.')) return;
    definirFotoPrincipal(p,null); aoSalvar();
  },{ id:'foto-cabecalho-remover' }));
  container.append(acoes);
}
export function renderPreviewFoto(p, container) {
  if (!container?.replaceChildren) return;
  container.replaceChildren(); container.className='foto-editor-preview';
  const f=fotoPrincipal(p);
  if (f) container.append(imagemSegura(f,p,{ principal:true, ampliar:false }));
  else if (!p.photos_configurado && p.imagem && (/^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(p.imagem) || /^https:\/\//i.test(p.imagem))) container.append(imagemSegura({url:p.imagem,title:'Retrato anterior'},p,{principal:true,ampliar:false,legado:true}));
  else container.append(criar('div',iniciais(p),'foto-retrato foto-placeholder foto-iniciais'));
}
export function abrirGerenciadorFotos(p, aoSalvar) {
  abrirModal('Fotos e referências visuais','<p data-dialogo-descricao>Organize referências por URL e escolha o retrato principal.</p><div id="album-modal"></div>');
  const el=document.getElementById('album-modal');
  const atualizar=()=>{ aoSalvar(); if(el.isConnected && el.closest('.modal-overlay')?.style.display === 'flex') renderAlbumFotos(p,el,atualizar); };
  renderAlbumFotos(p,el,atualizar);
}
