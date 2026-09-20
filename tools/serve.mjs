// Tiny static server for the kit. ES modules and canvas capture both need http://, not file://.
//   node tools/serve.mjs [scene]   → serves the repo on :8321 and opens the preview page
//   import { serve } from './serve.mjs'  → used in-process by render.mjs
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';

const MIME = { html: 'text/html', js: 'text/javascript', mjs: 'text/javascript', css: 'text/css', json: 'application/json',
               png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', mp4: 'video/mp4', md: 'text/plain' };

export function serve(root, port = 0) {
  root = path.resolve(root);
  return new Promise(resolve => {
    const s = http.createServer((req, res) => {
      const u = decodeURIComponent(new URL(req.url, 'http://x').pathname);
      if (u === '/favicon.ico') { res.writeHead(204); return res.end(); }
      let f = path.normalize(path.join(root, u));
      if (!f.startsWith(root)) { res.writeHead(403); return res.end(); }
      if (fs.existsSync(f) && fs.statSync(f).isDirectory()) f = path.join(f, 'index.html');
      fs.readFile(f, (err, data) => {
        if (err) { res.writeHead(404); return res.end('not found: ' + u); }
        res.writeHead(200, { 'Content-Type': MIME[path.extname(f).slice(1)] || 'application/octet-stream', 'Cache-Control': 'no-store' });
        res.end(data);
      });
    });
    s.listen(port, '127.0.0.1', () => resolve({ url: `http://127.0.0.1:${s.address().port}`, close: () => s.close() }));
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === new URL(import.meta.url).pathname) {
  const root = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
  const scene = process.argv[2] || 'say-cheese';
  const { url } = await serve(root, 8321);
  const page = `${url}/lib/page.html?scene=${scene}`;
  console.log(`preview: ${page}\n(ctrl-c to stop; add &t=5.2 to open paused at a time)`);
  spawn('open', [page], { stdio: 'ignore' });
}
