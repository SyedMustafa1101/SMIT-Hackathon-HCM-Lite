'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const pages = ['index.html', ...['admin', 'employee', 'employees', 'leaves', 'payslip', 'settings'].map(n => `pages/${n}.html`)].sort();
const assets = ['empty-work.webp', 'favicon.svg', 'logo.svg', 'team-work.webp'].map(n => `assets/${n}`);
const scripts = ['storage', 'attendance', 'leaves', 'payroll', 'announcements', 'helper', 'hcm', 'ui', 'pages'].map(n => `js/${n}.js`);
const runtime = new Set([...pages, ...assets, ...scripts, 'css/style.css']);
function walk(dir = '') {
  return fs.readdirSync(path.join(root, dir), { withFileTypes: true }).flatMap(e => {
    const file = dir ? `${dir}/${e.name}` : e.name;
    if (['.git', 'qa', 'node_modules'].includes(e.name)) return [];
    return e.isDirectory() ? walk(file) : [file];
  });
}
test('delivery inventory has exactly seven pages and every referenced relative static file matches exact filename case', () => {
  const all = new Set(walk());
  assert.deepEqual([...all].filter(n => n.endsWith('.html')).sort(), pages);
  for (const file of runtime) assert.ok(all.has(file), file);
  const resolve = (file, ref) => {
    if (ref.startsWith('#')) return;
    assert.ok(!/^(?:[a-z]+:|\/)/i.test(ref), `relative runtime reference required: ${file}: ${ref}`);
    const resolved = path.posix.normalize(path.posix.join(path.posix.dirname(file), ref));
    assert.ok(runtime.has(resolved), `unexpected or case-mismatched runtime file ${resolved}`);
  };
  for (const file of pages) {
    const html = fs.readFileSync(path.join(root, file), 'utf8');
    for (const match of html.matchAll(/(?:src|href)="([^"]+)"/g)) resolve(file, match[1]);
    assert.deepEqual([...html.matchAll(/<script defer src="([^"]+)"/g)].map(m => path.posix.normalize(path.posix.join(path.posix.dirname(file), m[1]))), scripts);
  }
  const css = fs.readFileSync(path.join(root, 'css/style.css'), 'utf8');
  for (const match of css.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) resolve('css/style.css', match[1]);
});
test('runtime has no preview/test/QA paths, external network API or package dependency', () => {
  for (const file of runtime) {
    if (!/\.(html|css|js)$/.test(file)) continue;
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    assert.doesNotMatch(source, /(?:require\s*\(|\bimport\s*(?:\(|.+?from)|\bfetch\s*\(|\bXMLHttpRequest\b|\bWebSocket\b)/, file);
    assert.doesNotMatch(source, /(?:src|href)=["'](?:https?:|\/\/)|(?:tools|tests|qa|node_modules)\//, file);
  }
});
