'use strict';
// Isolated visual fixtures only. Never opens a normal profile or seeds the app source.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { createServer } = require('../tools/serve.cjs');
const { chromium } = require(process.env.HCM_PLAYWRIGHT_MODULE || 'playwright');
const out = path.resolve(__dirname, '../qa/phase6/after');
fs.mkdirSync(out, { recursive: true });
(async () => {
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`, contexts = [], errors = [], broken = [];
  let browser, checks = 0;
  const pass = label => console.log(`PASS ${++checks}: ${label}`);
  async function fresh(options = {}) {
    const c = await browser.newContext({ viewport: { width: 1440, height: 1000 }, timezoneId: 'Asia/Karachi', ...options }); contexts.push(c);
    const p = await c.newPage(); p.on('pageerror', e => errors.push(e.message)); p.on('response', r => { if (r.status() >= 400) broken.push(r.url()); });
    await p.clock.setFixedTime(new Date('2026-10-23T17:00:00+05:00')); await p.goto(base); return p;
  }
  async function shot(p, name) { await p.evaluate(() => scrollTo(0, 0)); await p.screenshot({ path: path.join(out, `${name}.png`), fullPage: true, animations: 'disabled' }); }
  async function fits(p) { assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${p.url()} fits viewport`); }
  async function seed(p, populated = true) {
    return p.evaluate(async populated => {
      const store = HCMStorage.create(localStorage), app = HCM.create(store);
      await app.setup({ companyName: 'Atlas Studio', officeStart: '09:00', graceMinutes: 15, yearlyLeaveQuota: 20, workingDays: [1, 2, 3, 4, 5], name: 'Mina Patel', email: 'admin@example.test', password: 'Admin-Test-123', confirmPassword: 'Admin-Test-123' });
      await app.login({ email: 'admin@example.test', password: 'Admin-Test-123' });
      if (!populated) return [];
      const ids = [];
      for (const [i, name] of ['Sara Ahmed', 'Omar Hassan', 'Alexandria-Christine Montgomery-Wellington', 'Daniel Park'].entries()) ids.push(await app.addEmployee({ name, email: `person${i}@example.test`, password: 'Employee-Test-123', department: ['Engineering', 'Product', 'Operations', 'Engineering'][i], monthlySalary: 66000, joiningDate: i === 0 ? '2026-09-16' : '2026-09-01' }));
      const record = (id, date, hours, late = false) => {
        const checkIn = new Date(`${date}T${late ? '10' : '09'}:00:00+05:00`).toISOString(), durationMs = hours === null ? null : hours * 3600000;
        return { id: `${id}:${date}`, employeeId: id, date, checkIn, checkOut: hours === null ? null : new Date(Date.parse(checkIn) + durationMs).toISOString(), durationMs, isLate: late, status: hours === null ? 'Checked in' : hours < 5 ? 'Half day' : late ? 'Late' : 'Present', offsetMinutes: -300, lateAfter: new Date(`${date}T09:15:00+05:00`).toISOString() };
      };
      const attendance = HCMLeaves.workingDates('2026-09-16', '2026-09-30', [1, 2, 3, 4, 5]).map(d => record(ids[0], d, 8));
      attendance.push(record(ids[0], '2026-10-23', null), record(ids[1], '2026-10-23', 6, true), record(ids[2], '2026-10-22', 4, true), record(ids[0], '2026-10-22', 8));
      const leave = (id, date, status, type) => ({ id: `${id}:${date}`, employeeId: id, type, from: date, to: date, days: 1, reason: 'Family appointment. Handover notes are ready for the team. '.repeat(id === ids[2] ? 5 : 1), status, comment: status === 'Pending' ? '' : 'Coverage confirmed with the team. Thank you for planning ahead.', requestedAt: '2026-10-19T06:00:00.000Z', reviewedAt: status === 'Pending' ? null : '2026-10-20T06:00:00.000Z', reviewedBy: status === 'Pending' ? null : app.currentUser().id });
      store.write({ attendance, leaves: [leave(ids[0], '2026-10-26', 'Pending', 'Casual'), leave(ids[1], '2026-10-23', 'Approved', 'Sick'), leave(ids[2], '2026-10-27', 'Rejected', 'Other')] });
      app.announcements.post({ title: 'A little planning goes a long way', body: 'Please keep your attendance up to date and submit planned time off early.\nYour team can read handover notes before you head out.' });
      return ids;
    }, populated);
  }
  async function role(p, name) { await p.evaluate(name => HCM.create(HCMStorage.create(localStorage)).login({ email: name === 'admin' ? 'admin@example.test' : 'person0@example.test', password: name === 'admin' ? 'Admin-Test-123' : 'Employee-Test-123' }), name); }
  try {
    browser = await chromium.launch({ channel: process.env.HCM_BROWSER_CHANNEL || 'msedge', headless: true });
    const p = await fresh(); assert.deepEqual(await p.evaluate(() => Object.keys(localStorage)), []);
    for (const width of [1440, 834, 390]) { await p.setViewportSize({ width, height: 1000 }); await fits(p); await shot(p, `setup-${width}`); }
    await p.getByRole('button', { name: 'Create company & Admin', exact: true }).click(); await shot(p, 'setup-errors-390');
    assert.equal(await p.locator('#companyName').evaluate(n => document.activeElement === n), true);
    pass('Genuinely empty setup at desktop/tablet/390px, inline errors and first invalid focus');
    const ids = await seed(p); await p.evaluate(() => HCM.create(HCMStorage.create(localStorage)).logout()); await p.goto(base);
    for (const width of [1440, 834, 390]) { await p.setViewportSize({ width, height: 1000 }); await fits(p); await shot(p, `login-${width}`); }
    await role(p, 'admin');
    for (const target of ['admin', 'employees', 'leaves', 'settings', 'payslip', 'employee']) {
      await role(p, target === 'employee' ? 'employee' : 'admin');
      await p.goto(`${base}/pages/${target}.html`);
      if (target === 'payslip') { await p.locator('#payrollEmployee').selectOption(ids[0]); await p.locator('#payrollMonth').selectOption('9'); await p.locator('#payroll-form').evaluate(n => n.requestSubmit()); await p.locator('[data-payroll="net"]').waitFor(); }
      if (target === 'admin' || target === 'employee') { await p.locator('#helperQuestion').fill(target === 'admin' ? 'employee count' : 'hours this week'); await p.locator('#helperQuestion').press('Enter'); await p.locator('.helper-entry').waitFor(); }
      for (const width of [1440, 834, 390]) {
        await p.setViewportSize({ width, height: 1000 }); await fits(p); await shot(p, `${target}-${width}`);
        assert.equal(await p.locator('#main-navigation [aria-current="page"]').count(), 1);
        if (width <= 960) {
          const toggle = p.locator('#menu-toggle'); await toggle.focus(); await p.keyboard.press('Enter'); assert.equal(await toggle.getAttribute('aria-expanded'), 'true');
          await p.keyboard.press('Tab'); assert.equal(await p.locator('#main-navigation a:first-child').evaluate(n => document.activeElement === n), true);
          await p.keyboard.press('Escape'); assert.equal(await toggle.getAttribute('aria-expanded'), 'false'); assert.equal(await toggle.evaluate(n => document.activeElement === n), true);
          assert.equal(await p.locator('#main-navigation').isVisible(), false);
        }
      }
    }
    pass('All seven pages (+ setup/login) captured at 1440/834/390px; no overflow; active nav; keyboard Menu/Tab/Escape/focus');
    await role(p, 'admin'); await p.goto(`${base}/pages/leaves.html`); await p.setViewportSize({ width: 1440, height: 1000 });
    await p.locator('#leave-rows button').first().click(); await p.locator('#reviewComment').fill('Draft handover note');
    await p.locator('#review-form').evaluate(n => n.requestSubmit()); assert.ok(await p.locator('#error-reviewDecision').innerText());
    await shot(p, 'leave-review-1440'); await p.setViewportSize({ width: 390, height: 1000 }); await fits(p); await shot(p, 'leave-review-390');
    await p.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'hcm_company' })));
    assert.equal(await p.locator('#leave-review').isVisible(), false);
    await p.locator('#leave-rows button').first().click(); assert.equal(await p.locator('#reviewComment').inputValue(), 'Draft handover note');
    await p.getByRole('button', { name: 'Cancel review', exact: true }).click(); assert.equal(await p.locator('#leave-rows button').first().evaluate(n => document.activeElement === n), true);
    pass('Leave review visible above history; invalid field; phone fit; stale review closes, draft retained on explicit reopen; Cancel returns focus');
    await p.goto(`${base}/pages/employees.html`); await p.locator('#employee-rows button').first().click(); await p.locator('#name').fill('Unsaved edit draft'); await p.locator('#name').evaluate(n => n.setSelectionRange(2, 6));
    const y = await p.evaluate(() => scrollY); await p.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'hcm_announcements' })));
    assert.equal(await p.locator('#name').inputValue(), 'Unsaved edit draft'); assert.equal(await p.locator('#employee-submit').innerText(), 'Save employee');
    assert.deepEqual(await p.locator('#name').evaluate(n => [document.activeElement === n, n.selectionStart, n.selectionEnd]), [true, 2, 6]); assert.ok(Math.abs((await p.evaluate(() => scrollY)) - y) < 2);
    await p.locator('#cancel-edit').click(); await p.locator('#search').fill('Sara'); await p.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'hcm_users' })));
    assert.equal(await p.locator('#search').inputValue(), 'Sara'); assert.equal(await p.locator('#employee-rows tr').count(), 1);
    pass('Same-account UI updates preserve employee edit mode, draft, text selection/focus/scroll and combined directory filter');
    const edits = await fresh(); const editIds = await seed(edits); await edits.goto(`${base}/pages/employees.html`); await edits.locator('#employee-rows button').first().click(); await edits.locator('#name').fill('Retained after deletion');
    await edits.evaluate(id => { HCM.create(HCMStorage.create(localStorage)).deleteEmployee(id); window.dispatchEvent(new StorageEvent('storage', { key: 'hcm_users' })); }, editIds[0]);
    assert.equal(await edits.locator('#name').inputValue(), 'Retained after deletion'); assert.equal(await edits.locator('#employee-submit').isDisabled(), true);
    await edits.locator('#cancel-edit').click(); assert.equal(await edits.locator('#employee-submit').isDisabled(), false); assert.equal(await edits.locator('#name').evaluate(n => document.activeElement === n), true);
    await p.goto(`${base}/pages/settings.html`); await p.locator('#companyName').fill('Unsaved company draft');
    await p.evaluate(() => { window.originalSet = Storage.prototype.setItem; Storage.prototype.setItem = function() { throw new DOMException('full', 'QuotaExceededError'); }; });
    await p.locator('#settings-form').evaluate(n => n.requestSubmit()); await p.locator('#settings-status.error').waitFor(); assert.equal(await p.locator('#companyName').inputValue(), 'Unsaved company draft'); await shot(p, 'settings-failed-390');
    await p.evaluate(() => { Storage.prototype.setItem = window.originalSet; }); await p.locator('#settings-form').evaluate(n => n.requestSubmit()); await p.locator('#settings-status.success').waitFor(); await shot(p, 'settings-saved-390');
    pass('Settings failed write retains draft; successful retry and feedback fit phone');
    await p.evaluate(() => { const a = HCM.create(HCMStorage.create(localStorage)), c = a.getState().company; a.saveSettings({ ...c, companyName: 'Atlas Studio' }); });
    await p.goto(`${base}/pages/payslip.html`); await p.locator('#payrollEmployee').selectOption(ids[0]); await p.locator('#payrollMonth').selectOption('9'); await p.locator('#payroll-form').evaluate(n => n.requestSubmit());
    await p.evaluate(() => window.dispatchEvent(new StorageEvent('storage', { key: 'hcm_company' })));
    assert.equal(await p.locator('#payrollMonth').inputValue(), '9'); assert.equal(await p.locator('#payslip').isVisible(), true);
    await p.pdf({ path: path.join(out, 'final.pdf'), preferCSSPageSize: true, printBackground: true });
    await p.evaluate(id => { const s = HCMStorage.create(localStorage); s.write({ attendance: s.read('attendance').map(a => a.employeeId !== id ? a : a.date === '2026-09-17' ? { ...a, checkOut: null, durationMs: null, status: 'Checked in' } : a.checkOut === null ? { ...a, checkOut: new Date(Date.parse(a.checkIn) + 8 * 3600000).toISOString(), durationMs: 8 * 3600000, status: a.isLate ? 'Late' : 'Present' } : a) }); }, ids[0]);
    await p.locator('#payroll-form').evaluate(n => n.requestSubmit()); await p.locator('#payslip').filter({ hasText: /Unresolved attendance/ }).waitFor();
    await p.pdf({ path: path.join(out, 'provisional.pdf'), preferCSSPageSize: true, printBackground: true }); await shot(p, 'payslip-provisional-390');
    pass('Payslip selection preserved and recalculated; A4 final and provisional/proration PDFs captured');
    const empty = await fresh(); await seed(empty, false); await empty.goto(`${base}/pages/admin.html`); await shot(empty, 'empty-admin-1440');
    for (const page of ['employees', 'leaves', 'payslip']) { await empty.goto(`${base}/pages/${page}.html`); await empty.setViewportSize({ width: 390, height: 1000 }); await fits(empty); await shot(empty, `empty-${page}-390`); }
    pass('Unpopulated company, directory, leave and payslip empty states');
    const reduced = await fresh({ reducedMotion: 'reduce' }); await seed(reduced, false); await reduced.goto(`${base}/pages/admin.html`);
    assert.equal(await reduced.evaluate(() => document.getAnimations().length), 0); await reduced.locator('#menu-toggle').evaluate(n => { n.dataset.test = 'present'; });
    await reduced.emulateMedia({ reducedMotion: 'no-preference' }); await reduced.reload(); await reduced.emulateMedia({ reducedMotion: 'reduce' }); await reduced.waitForFunction(() => document.getAnimations().length === 0); assert.equal(await reduced.evaluate(() => document.getAnimations().length), 0);
    const failed = await fresh(); await failed.addInitScript(() => { window.IntersectionObserver = undefined; Element.prototype.animate = undefined; }); await failed.reload();
    assert.equal(await failed.locator('#setup-form').isVisible(), true); await fits(failed);
    await failed.route('**/assets/*.webp', route => route.abort()); await failed.reload(); assert.equal(await failed.locator('#setup-form').isVisible(), true); await fits(failed); await shot(failed, 'missing-artwork');
    pass('Reduced motion initial/live preference, missing observer/animation API and blocked artwork leave content/forms usable');
    const contrast = await p.evaluate(() => {
      const luminance = hex => { const a = hex.match(/\w\w/g).map(v => parseInt(v, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4); return .2126 * a[0] + .7152 * a[1] + .0722 * a[2]; };
      return [['182840', 'ffffff'], ['596b83', 'ffffff'], ['ffffff', '2563eb'], ['c8d5e8', '101e36'], ['85520d', 'fff6e4'], ['146244', 'eaf7f0'], ['9c303b', 'fff0f1'], ['5e7189', 'ffffff'], ['7b8ea8', 'ffffff']].map(([a, b]) => { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05); });
    }); assert.ok(contrast.slice(0, -1).every(n => n >= 4.5)); assert.ok(contrast.at(-1) >= 3);
    assert.deepEqual(errors, []); assert.deepEqual(broken, []); pass(`Core text/button/badge contrast >=4.5:1; no page errors or broken served assets. Ratios: ${contrast.map(n => n.toFixed(2)).join(', ')}`);
    const subdir = http.createServer((req, res) => { if (req.url.startsWith('/hcm-lite/')) { req.url = req.url.slice('/hcm-lite'.length); server.emit('request', req, res); } else { res.writeHead(404); res.end(); } });
    await new Promise(resolve => subdir.listen(0, '127.0.0.1', resolve));
    try {
      const sub = await fresh(); const prefix = `http://127.0.0.1:${subdir.address().port}/hcm-lite`;
      await sub.goto(`${prefix}/index.html`); assert.ok(await sub.locator('.auth-art').evaluate(n => n.complete && n.naturalWidth === 800)); await seed(sub, false);
      await sub.goto(`${prefix}/pages/admin.html`); await sub.getByRole('link', { name: 'Employees', exact: true }).click(); assert.equal(sub.url(), `${prefix}/pages/employees.html`);
      assert.ok(await sub.locator('.brand img').evaluate(n => n.complete && n.naturalWidth > 0)); assert.deepEqual(broken, []); assert.deepEqual(errors, []);
    } finally { await new Promise(resolve => subdir.close(resolve)); }
    pass('Local subdirectory host serves scripts, styles, generated artwork, SVG logo/favicon and relative page navigation');
    console.log(`${checks} Phase 6 browser scenarios passed. Captures: ${out}`);
  } finally { for (const c of contexts) await c.close(); if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
