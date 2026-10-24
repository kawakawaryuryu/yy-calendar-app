import { readdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import path from 'node:path';

const dist = path.resolve('dist');
async function list(directory) {
  return (await Promise.all((await readdir(directory, { withFileTypes: true })).map(async entry => entry.isDirectory() ? list(path.join(directory, entry.name)) : [path.join(directory, entry.name)]))).flat();
}
const files = (await list(dist)).filter(file => !file.endsWith('/sw.js')).sort();
const hash = createHash('sha256');
for (const file of files) hash.update(await readFile(file));
const version = hash.digest('hex').slice(0, 12);
const assets = files.map(file => `/${path.relative(dist, file).split(path.sep).join('/')}`);
await writeFile(path.join(dist, 'sw.js'), `const CACHE = 'hibi-mock-${version}';
const ASSETS = ${JSON.stringify(['/', ...assets])};
self.addEventListener('install', event => event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(ASSETS))));
self.addEventListener('activate', event => event.waitUntil((async () => {
  for (const key of await caches.keys()) if (key.startsWith('hibi-mock-') && key !== CACHE) await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message', event => { if (event.data?.type === 'SKIP_WAITING') self.skipWaiting(); });
self.addEventListener('fetch', event => {
  if (event.request.method !== 'GET' || new URL(event.request.url).origin !== self.location.origin) return;
  if (new URL(event.request.url).searchParams.has('connectivity')) return;
  if (event.request.mode === 'navigate') {
    event.respondWith(caches.open(CACHE).then(async cache => (await cache.match('/index.html')) || fetch(event.request)));
    return;
  }
  // Static assets are identical for every Origin. Dev/preview servers may set
  // Vary: Origin, while module requests add Origin and cache.addAll does not.
  event.respondWith(caches.open(CACHE).then(async cache => (await cache.match(event.request, { ignoreVary: true })) || fetch(event.request)));
});
`);
console.log(`Offline shell: ${assets.length} assets, version ${version}`);
