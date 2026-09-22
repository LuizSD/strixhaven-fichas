import { resolverReferenciaMagia } from './modelo.js';
import { rotuloLocalizado } from '../catalogo-localizado.js';

/** Resolve rótulos sem trocar o nome/ID legado que os controles da ficha usam. */
export function nomeMagiaHtml(magia, circulo = null) {
  const original = typeof magia === 'string' ? { nome: magia } : magia;
  const m = original.circulo == null && circulo != null ? { ...original, circulo } : original;
  const ref = resolverReferenciaMagia(m);
  return rotuloLocalizado(ref ? { ...ref, ...m, name: { ...ref.name, ...m.name, en: m.name?.en || ref.name.en } } : m);
}
