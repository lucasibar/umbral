import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const topics=JSON.parse(fs.readFileSync('data.json','utf8'));
assert.equal(topics.length,24);
assert.equal(new Set(topics.map(x=>x.slug)).size,24);
assert(topics.every(x=>x.slides.length&&x.slides.every(s=>s.body&&s.source)));
const html=fs.readFileSync('index.html','utf8');
for(const [,asset] of html.matchAll(/(?:href|src)="(\.\/[^"#?]+)/g)) assert(fs.existsSync(asset),asset);
const manifest=JSON.parse(fs.readFileSync('manifest.webmanifest','utf8'));
assert.equal(manifest.start_url,'./'); assert.equal(manifest.scope,'./');
for(const icon of manifest.icons) assert(fs.existsSync(icon.src));
assert(fs.readFileSync('sw.js','utf8').includes('./data.json'));
console.log(`OK: ${topics.length} cartas, ${topics.reduce((n,x)=>n+x.slides.length,0)} fichas, recursos locales y rutas relativas para GitHub Pages.`);

// Ejecuta el ciclo offline con un repositorio cuyo nombre no se conoce al exportar.
for (const scope of ['https://example.github.io/', 'https://example.github.io/otro-repositorio/']) {
  const handlers = {}, entries = new Map();
  const cache = {
    async addAll(assets) {
      for (const asset of assets) {
        const file = asset === './' ? 'index.html' : asset;
        assert(fs.existsSync(file), `Recurso offline faltante: ${file}`);
        entries.set(new URL(asset,scope).href,fs.readFileSync(file));
      }
    },
    async match(request) {
      const url = new URL(typeof request === 'string' ? request : request.url,scope);
      url.search = ''; return entries.get(url.href);
    },
  };
  const deleted=[];
  vm.runInNewContext(fs.readFileSync('sw.js','utf8'), {
    URL,
    self: {registration:{scope},clients:{claim:async()=>{}},addEventListener:(name,fn)=>{handlers[name]=fn;}},
    caches: {open:async()=>cache,keys:async()=>['another-app','umbral-'+new URL(scope).pathname+'-old'],delete:async name=>deleted.push(name)},
    fetch:async()=>{throw new Error('offline');},
  });
  let pending;
  handlers.install({waitUntil:p=>{pending=p;}}); await pending;
  handlers.activate({waitUntil:p=>{pending=p;}}); await pending;
  assert.deepEqual(deleted,['umbral-'+new URL(scope).pathname+'-old']);
  for (const resource of ['','index.html','data.json','app.js','icon-192.png']) {
    handlers.fetch({request:{url:new URL(resource,scope).href,method:'GET',mode:resource?'cors':'navigate'},respondWith:p=>{pending=p;}});
    assert(await pending, `No disponible offline: ${resource}`);
  }
}
console.log('OK: descarga completa y lectura offline con ruta raíz y subcarpeta de GitHub Pages.');
