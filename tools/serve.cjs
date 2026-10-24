// Local static preview only: no application API, persistence or backend logic.
'use strict';
const http = require('node:http');
const fs = require('node:fs/promises');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const files = new Set(['index.html', 'pages/admin.html', 'pages/employees.html', 'pages/leaves.html', 'pages/settings.html', 'pages/employee.html', 'pages/payslip.html', 'css/style.css', 'js/storage.js', 'js/attendance.js', 'js/hcm.js', 'js/ui.js', 'js/pages.js']);
function createServer() {
  return http.createServer(async (request, response) => {
    let file;
    try { file = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\//, '') || 'index.html'; }
    catch (_) { response.writeHead(400); response.end('Bad request'); return; }
    if (!['GET', 'HEAD'].includes(request.method) || !files.has(file)) { response.writeHead(404); response.end('Not found'); return; }
    try {
      const body = await fs.readFile(path.join(root, file));
      const type = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript' }[path.extname(file)];
      response.writeHead(200, { 'Content-Type': `${type}; charset=utf-8`, 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' });
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (_) { response.writeHead(500); response.end('Unable to read static file'); }
  });
}
if (require.main === module) {
  const port = Number(process.argv[2] || 4173), server = createServer();
  server.on('error', error => { console.error(error.message); process.exitCode = 1; });
  server.listen(port, '127.0.0.1', () => console.log(`Local: http://127.0.0.1:${server.address().port}`));
}
module.exports = { createServer };
