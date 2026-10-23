// Development utility only. The deployed game has no Node dependency.
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, extname, sep } from 'node:path';
const root = fileURLToPath(new URL('../../', import.meta.url));
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.md': 'text/plain' };
const port = Number(process.env.PORT || 4173);
const server = createServer(async (request, response) => {
  try {
    const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname);
    let path = resolve(root, `.${pathname}`);
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep) || pathname.split(/[\\/]/).some(p => p.startsWith('.'))) {
      response.writeHead(403); response.end('Forbidden'); return;
    }
    if ((await stat(path)).isDirectory()) {
      if (!pathname.endsWith('/')) { response.writeHead(302, { Location: pathname + '/' }); response.end(); return; }
      path = resolve(path, 'index.html');
    }
    const body = await readFile(path);
    response.writeHead(200, { 'Content-Type': `${mime[extname(path)] || 'application/octet-stream'}; charset=utf-8`, 'Cache-Control': 'no-store' });
    response.end(body);
  } catch { response.writeHead(404); response.end('Not found'); }
});
server.listen(port, '127.0.0.1', () => console.log(`Floppio preview: http://127.0.0.1:${port}/test/?sample=1`));
