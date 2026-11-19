import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, extname } from 'node:path';
const root = resolve(import.meta.dirname, '..');
const types = {'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.json':'application/json', '.webmanifest':'application/manifest+json', '.png':'image/png'};
http.createServer(async (req, res) => {
 const pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
 if (!pathname.startsWith('/tabata-timer/')) { res.writeHead(404).end(); return; }
 const file = resolve(root, pathname.slice('/tabata-timer/'.length) || 'index.html');
 if (!file.startsWith(root + '/')) { res.writeHead(403).end(); return; }
 try { const body = await readFile(file); res.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream', 'Cache-Control':'no-store'}).end(body); }
 catch { res.writeHead(404).end('Not found'); }
}).listen(4173, '127.0.0.1');
