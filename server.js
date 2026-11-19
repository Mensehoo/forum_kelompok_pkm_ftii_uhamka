const http = require('http');
const fs = require('fs');
const path = require('path');

function loadEnvFile(filename) {
  const fullPath = path.join(__dirname, filename);
  if (!fs.existsSync(fullPath)) return;
  const lines = fs.readFileSync(fullPath, 'utf8').split(/\r?\n/);
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIndex = trimmed.indexOf('=');
    if (eqIndex === -1) continue;
    const key = trimmed.slice(0, eqIndex).trim();
    let val = trimmed.slice(eqIndex + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (key && process.env[key] === undefined) {
      process.env[key] = val;
    }
  }
}

loadEnvFile('.env.local');
loadEnvFile('.env');

const { getSupabaseConfig, sendJson } = require('./lib/supabase');
const postsIndexHandler = require('./api/posts/index');
const postStatusHandler = require('./api/posts/[id]/status');
const postDeleteHandler = require('./api/posts/[id]/index');

const PORT = Number(process.env.PORT) || 3000;
const HOST = process.env.HOST || '0.0.0.0';
const PUBLIC_DIR = path.join(__dirname, 'public');

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.ico': 'image/x-icon',
};

function serveStatic(req, res, pathname) {
  let reqPath = pathname === '/' ? '/index.html' : pathname;
  reqPath = path.normalize(reqPath).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(PUBLIC_DIR, reqPath);

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      const fallback = path.join(PUBLIC_DIR, 'index.html');
      fs.readFile(fallback, (fallbackErr, content) => {
        if (fallbackErr) {
          res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
          res.end('Not Found');
          return;
        }
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        res.end(content);
      });
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const mime = MIME_TYPES[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mime });
    fs.createReadStream(filePath).pipe(res);
  });
}

const server = http.createServer(async (req, res) => {
  try {
    const urlObj = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
    const pathname = urlObj.pathname;

    if (pathname === '/api/posts') {
      await postsIndexHandler(req, res);
      return;
    }

    const statusMatch = pathname.match(/^\/api\/posts\/([^/]+)\/status$/);
    if (statusMatch) {
      req.query = { id: decodeURIComponent(statusMatch[1]) };
      await postStatusHandler(req, res);
      return;
    }

    const idMatch = pathname.match(/^\/api\/posts\/([^/]+)$/);
    if (idMatch) {
      req.query = { id: decodeURIComponent(idMatch[1]) };
      await postDeleteHandler(req, res);
      return;
    }

    if (pathname.startsWith('/api/')) {
      sendJson(res, 404, { error: 'Endpoint API tidak ditemukan.' });
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Method Not Allowed');
      return;
    }

    serveStatic(req, res, pathname);
  } catch (err) {
    console.error('Unhandled error:', err);
    sendJson(res, 500, { error: 'Terjadi kesalahan pada server.' });
  }
});

server.listen(PORT, HOST, () => {
  console.log(`Forum Kelompok PKM FTII UHAMKA berjalan di http://localhost:${PORT}`);
  if (!getSupabaseConfig()) {
    console.log(
      'Catatan: Isi SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY di .env.local agar API terhubung ke Supabase.'
    );
  }
});
