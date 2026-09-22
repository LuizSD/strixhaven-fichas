import test from 'node:test';
import assert from 'node:assert/strict';
import { validarUrlFoto, migrarFotos, salvarFoto, definirFotoPrincipal, moverFoto, removerFoto } from '../../../site/js/fotos-modelo.js';

test('URLs de foto usam HTTPS ou loopback HTTP, sem depender da extensão',()=>{
  for(const url of ['https://cdn.example/image?id=1','https://cdn.example/foto.webp','http://localhost:8000/a','http://127.0.0.1:8000/a']) assert.equal(validarUrlFoto(url),url);
  for(const url of ['javascript:alert(1)','data:image/png;base64,AAA','file:///tmp/x.jpg','http://example.com/foto.jpg','http://localhost.example.com/x','http://[::1]:8000/a','/imagem.png','ftp://localhost/x']) assert.throws(()=>validarUrlFoto(url));
});
test('migração de fotos é aditiva e idempotente para fichas antigas',()=>{
  const p={id:'antiga',imagem:'data:image/png;base64,legado',inventario:[{nome:'Preservar'}],futuro:{a:1}};
  migrarFotos(p); const snapshot=JSON.stringify(p); migrarFotos(p);
  assert.equal(JSON.stringify(p),snapshot); assert.deepEqual(p.photos,[]);
  assert.equal(p.imagem,'data:image/png;base64,legado'); assert.deepEqual(p.inventario,[{nome:'Preservar'}]);
});
test('metadados apenas, ID e data estáveis; no máximo uma principal no round-trip',()=>{
  const p={}; const a=salvarFoto(p,{url:'https://cdn.example/a',title:'A',isPrimary:true,bytes:'PROIBIDO'});
  const b=salvarFoto(p,{url:'https://cdn.example/b',title:'B',isPrimary:true});
  assert.equal(p.photos.filter(f=>f.isPrimary).length,1); assert.equal(p.photos[1].id,b.id);
  const editada=salvarFoto(p,{...a,title:'Editada',isPrimary:false},a.id);
  assert.equal(editada.id,a.id); assert.equal(editada.createdAt,a.createdAt); assert.equal(editada.bytes,undefined);
  definirFotoPrincipal(p,a.id); moverFoto(p,a.id,1);
  const copia=JSON.parse(JSON.stringify(p)); migrarFotos(copia); assert.deepEqual(copia,p);
  removerFoto(p,a.id); assert.equal(p.photos[0].id,b.id); assert.equal(p.photos[0].isPrimary,true);
});
test('importação recusa protocolos proibidos sem persistir bytes no álbum',()=>{
  const p={photos:[{id:'inválida',url:'data:image/png;base64,AAA',bytes:'AAA'},{id:'ok',url:'https://cdn.example/foto',bytes:'AAA',isPrimary:true}]};
  migrarFotos(p); assert.equal(p.photos.length,1); assert.equal(p.photos[0].id,'ok');
  assert.equal(JSON.stringify(p).includes('base64'),false); assert.equal(JSON.stringify(p).includes('AAA'),false);
});
