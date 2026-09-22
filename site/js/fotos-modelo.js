/** Álbum: somente referências externas. Não lê arquivos, canvas ou bytes. */
const idFoto = () => globalThis.crypto?.randomUUID?.() || `foto-${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
export function validarUrlFoto(valor) {
  const texto = String(valor || '').trim();
  let url;
  try { url = new URL(texto); } catch { throw new Error('Informe uma URL absoluta de imagem HTTPS.'); }
  const local = ['localhost','127.0.0.1'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && local)) throw new Error('Use HTTPS. HTTP só é permitido para localhost; javascript:, data: e file: não são aceitos.');
  return url.href;
}
export function migrarFotos(p) {
  if (!p || typeof p !== 'object') return p;
  if (p.photos == null) { p.photos = []; return p; }
  if (!Array.isArray(p.photos)) { p.photos = []; p.photos_avisos = ['Álbum importado fora do formato esperado. Revise o arquivo original.']; return p; }
  const vistos = new Set();
  p.photos = p.photos.flatMap((f,i) => {
    try {
      const url = validarUrlFoto(f?.url);
      let id = typeof f.id === 'string' && f.id ? f.id : idFoto();
      if (vistos.has(id)) id = idFoto();
      vistos.add(id);
      return [{ id, url, title:String(f.title || ''), caption:String(f.caption || ''), altText:String(f.altText || ''),
        sortOrder:Number.isFinite(f.sortOrder) ? f.sortOrder : i, isPrimary:f.isPrimary === true,
        createdAt:typeof f.createdAt === 'string' ? f.createdAt : new Date().toISOString(), position:['center','top','bottom'].includes(f.position) ? f.position : 'center' }];
    } catch {
      if (!Array.isArray(p.photos_avisos)) p.photos_avisos = [];
      const aviso = 'Uma referência de foto importada foi recusada por URL inválida. Os demais dados da ficha foram preservados.';
      if (!p.photos_avisos.includes(aviso)) p.photos_avisos.push(aviso);
      return [];
    }
  }).sort((a,b) => a.sortOrder-b.sortOrder);
  let principal = false;
  p.photos.forEach((f,i) => { f.sortOrder = i; if (f.isPrimary && !principal) principal = true; else f.isPrimary = false; });
  return p;
}
export function salvarFoto(p, dados, id = null) {
  const url = validarUrlFoto(dados.url);
  migrarFotos(p);
  const anterior = p.photos.find(f => f.id === id);
  if (id && !anterior) throw new Error('Esta foto não está mais no álbum. Reabra o editor.');
  const foto = { id:anterior?.id || idFoto(), url, title:String(dados.title || '').trim(), caption:String(dados.caption || '').trim(),
    altText:String(dados.altText || '').trim(), sortOrder:anterior?.sortOrder ?? p.photos.length,
    isPrimary:dados.isPrimary === true, createdAt:anterior?.createdAt || new Date().toISOString(), position:['center','top','bottom'].includes(dados.position) ? dados.position : 'center' };
  if (foto.isPrimary) p.photos.forEach(f => { f.isPrimary = false; });
  if (anterior) p.photos[p.photos.indexOf(anterior)] = foto; else p.photos.push(foto);
  // Acrescentar uma referência comum também preserva o retrato legado visível.
  if (!p.imagem || foto.isPrimary || anterior?.isPrimary) p.photos_configurado = true;
  return foto;
}
export function definirFotoPrincipal(p, id) {
  migrarFotos(p);
  if (id != null && !p.photos.some(f => f.id === id)) throw new Error('Foto não encontrada.');
  p.photos.forEach(f => { f.isPrimary = f.id === id; });
  p.photos_configurado = true;
}
export function moverFoto(p, id, delta) {
  migrarFotos(p);
  const i = p.photos.findIndex(f => f.id === id), j = i + delta;
  if (i < 0 || j < 0 || j >= p.photos.length) return;
  [p.photos[i], p.photos[j]] = [p.photos[j], p.photos[i]];
  p.photos.forEach((f,n) => { f.sortOrder = n; });
}
export function removerFoto(p, id, substituta = undefined) {
  migrarFotos(p);
  const principal = p.photos.find(f => f.id === id)?.isPrimary;
  p.photos = p.photos.filter(f => f.id !== id);
  if (principal) definirFotoPrincipal(p, substituta === undefined ? p.photos[0]?.id ?? null : substituta);
  p.photos.forEach((f,i) => { f.sortOrder = i; });
  if (!p.imagem || principal) p.photos_configurado = true;
}
export const fotoPrincipal = p => (p.photos || []).find(f => f.isPrimary) || null;

/** Validação real do navegador. A imagem nunca é serializada. */
export function testarImagem(url, timeout = 12000) {
  return new Promise((resolve,reject) => {
    let endereco;
    try { endereco = validarUrlFoto(url); } catch(e) { reject(e); return; }
    const img = new Image(); img.referrerPolicy = 'no-referrer';
    const timer = setTimeout(() => concluir(new Error('A imagem demorou para responder. Tente novamente.')), timeout);
    function concluir(erro) { clearTimeout(timer); img.onload = null; img.onerror = null; erro ? reject(erro) : resolve(endereco); }
    img.onload = () => concluir(img.naturalWidth > 0 && img.naturalHeight > 0 ? null : new Error('O endereço não retornou uma imagem válida.'));
    img.onerror = () => concluir(new Error('Não foi possível carregar a imagem. Confira o link direto e a conexão; o servidor pode impedir a exibição.'));
    img.src = endereco;
  });
}
