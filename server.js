const http = require('http');
const fs = require('fs');
const path = require('path');
const ROOT = path.resolve(__dirname);
const PORT = 8976;
const MIME = { '.html':'text/html; charset=utf-8', '.css':'text/css; charset=utf-8', '.js':'application/javascript; charset=utf-8', '.json':'application/json; charset=utf-8', '.png':'image/png', '.webp':'image/webp', '.svg':'image/svg+xml', '.ttf':'font/ttf', '.gif':'image/gif' };
http.createServer((req, res) => {
  let p = req.url.split('?')[0]; if (p === '/') p = '/index.html';
  const fp = path.join(ROOT, p);
  if (!fp.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(fp, (e, d) => {
    if (e) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(fp).toLowerCase()]||'application/octet-stream', 'Access-Control-Allow-Origin':'*' });
    res.end(d);
  });
}).listen(PORT, () => console.log('http://localhost:'+PORT));
