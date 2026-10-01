export const LIMITE_JSON = 10 * 1024 * 1024;
export function migrarDocumento(p) {
  p.name = p.nome;
  p.updatedAt = p.atualizado_em || p.updatedAt || p.criado_em || '1970-01-01T00:00:00.000Z';
  p.revision = Number.isSafeInteger(p.revision) && p.revision >= 1 ? p.revision : 1;
  p.schema_versao ??= 1;
  return p;
}
export function nomeArquivo(nome) {
  const limpo = String(nome || '').replace(/[<>:"/\\|?*\u0000-\u001f]/g, '_').trim().replace(/[. ]+$/g, '');
  return `${limpo || 'Personagem'}.json`;
}
export function serializarDocumento(p) {
  return JSON.stringify([migrarDocumento(structuredClone(p))], null, 2);
}
export function lerDocumento(texto, validar) {
  if (new TextEncoder().encode(texto).length > LIMITE_JSON) throw new Error('JSON excede 10 MB.');
  const lista = JSON.parse(texto);
  if (!Array.isArray(lista) || lista.length !== 1 || !validar(lista[0])) throw new Error('JSON de ficha inválido.');
  return migrarDocumento(lista[0]);
}
