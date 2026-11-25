// iqtest.live — minimal static web server for Render (no dependencies)
const http = require('http'), fs = require('fs'), path = require('path'), zlib = require('zlib');
const ROOT = __dirname, PORT = process.env.PORT || 10000;
const ALLOW = [/^\/index\.html$/, /^\/kz\//, /^\/ru\//, /^\/admin\//, /^\/privacy\//, /^\/oferta\//, /^\/assets\//, /^\/favicon\.(ico|svg|png)$/, /^\/robots\.txt$/];
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain; charset=utf-8', '.webp': 'image/webp', '.m4a': 'audio/mp4' };
let apiMod = null;
const SEC = { 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'SAMEORIGIN' };
function send(req, res, file, status) {
  fs.readFile(file, (err, buf) => {
    if (err) return notFound(req, res);
    const ext = path.extname(file), type = TYPES[ext] || 'application/octet-stream';
    const h = { ...SEC, 'Content-Type': type, 'Cache-Control': (ext === '.html' || (/[\/]admin[\/]/.test(file) && ext === '.js')) ? 'no-cache' : (/fonts\//.test(file) ? 'public, max-age=31536000, immutable' : 'public, max-age=3600') };
    if (/\/admin\//.test(file)) h['X-Robots-Tag'] = 'noindex, nofollow';
    const gz = /gzip/.test(req.headers['accept-encoding'] || '') && /text|javascript|json|svg/.test(type) && buf.length > 1024;
    if (gz) { h['Content-Encoding'] = 'gzip'; h['Vary'] = 'Accept-Encoding'; buf = zlib.gzipSync(buf); }
    res.writeHead(status || 200, h); res.end(req.method === 'HEAD' ? undefined : buf);
  });
}
function notFound(req, res) { res.writeHead(302, { ...SEC, Location: '/' }); res.end(); }
http.createServer((req, res) => {
  let p; try { p = decodeURIComponent(new URL(req.url, 'http://x').pathname); } catch (e) { return notFound(req, res); }
  if (p === '/healthz') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('ok'); }
  if (p.startsWith('/api/')) {
    // Payments API (Tole). Loaded lazily; secrets are read from Render env vars inside lib/tole/http.ts.
    apiMod ??= import('./lib/tole/http.ts');
    return apiMod.then(m => m.handleApi(req, res, p)).catch(() => { if (!res.headersSent) { res.writeHead(500, { 'Content-Type': 'application/json' }); res.end('{"error":"internal"}'); } });
  }
  // canonical host: www → apex
  const host = (req.headers.host || '').toLowerCase();
  if (host.startsWith('www.')) { res.writeHead(301, { Location: 'https://' + host.slice(4) + req.url }); return res.end(); }
  if (p === '/' ) p = '/index.html';
  // site is Kazakh-only: /ru/… → /kz/…
  if (/^\/ru(\/|$)/.test(p)) { res.writeHead(301, { Location: '/kz/' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '') }); return res.end(); }
  if (/^\/(kz|ru|admin|privacy|oferta)$/.test(p)) { res.writeHead(301, { Location: p + '/' + (req.url.includes('?') ? req.url.slice(req.url.indexOf('?')) : '') }); return res.end(); }
  if (p.endsWith('/')) p += 'index.html';
  if (p.includes('..') || !ALLOW.some(r => r.test(p))) return notFound(req, res);
  send(req, res, path.join(ROOT, p));
}).listen(PORT, () => console.log('iqtest.live listening on ' + PORT));
