import { createServer } from 'node:http';
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// Disconnect the actual server to test WebKit offline navigation. WebKit's
// protocol-level setOffline can reject navigation before a service worker runs.
export async function offlineFixture() {
  const assets = new Map();
  const root = path.resolve('dist');
  async function load(directory) {
    for (const entry of await readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await load(file);
      else assets.set(`/${path.relative(root, file).split(path.sep).join('/')}`, await readFile(file));
    }
  }
  await load(root);
  const mime = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };
  const server = createServer((request, response) => {
    const url = new URL(request.url, 'http://localhost');
    const key = url.pathname === '/' ? '/index.html' : url.pathname;
    const body = assets.get(key);
    response.writeHead(body ? 200 : 404, { 'Content-Type': mime[path.extname(key)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
    response.end(body || 'Not found');
  });
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const port = server.address().port;
  let stopped = false;
  return {
    url: `http://127.0.0.1:${port}`,
    stop: async () => { if (stopped) return; stopped = true; server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); },
  };
}
