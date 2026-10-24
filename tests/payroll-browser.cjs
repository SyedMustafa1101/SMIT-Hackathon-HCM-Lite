'use strict';
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../tools/serve.cjs');
const { chromium } = require(process.env.HCM_PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`, contexts = [], errors = []; let browser, checks = 0;
  const pass = label => console.log(`PASS ${++checks}: ${label}`);
  const visible = (p, selector, regex) => p.locator(selector).filter({ hasText: regex }).waitFor({ state: 'visible' });
  async function fresh() {
    const context = await browser.newContext({ timezoneId: 'Asia/Karachi', locale: 'en-US', viewport: { width: 1280, height: 900 } }); contexts.push(context);
    const p = await context.newPage(); p.on('pageerror', e => errors.push(e.message));
    await p.clock.setFixedTime(new Date('2026-10-25T12:00:00+05:00')); await p.goto(base); return p;
  }
  async function select(p, id, month = '9', year = '2026') {
    if (id !== undefined) await p.locator('#payrollEmployee').selectOption(id);
    await p.locator('#payrollMonth').selectOption(month); await p.locator('#payrollYear').fill(year);
    await p.getByRole('button', { name: 'Calculate / Refresh payslip', exact: true }).click();
  }
  async function login(p, name) {
    await p.evaluate(async name => { const app = HCM.create(HCMStorage.create(localStorage)); await app.login({ email: `${name}@example.test`, password: name === 'admin' ? 'Admin-Test-123' : 'Employee-Test-123' }); }, name);
    await p.goto(`${base}/pages/payslip.html`);
  }
  const value = (p, key) => p.locator(`[data-payroll="${key}"]`).innerText();
  try {
    browser = await chromium.launch({ channel: process.env.HCM_BROWSER_CHANNEL || 'msedge', headless: true });
    const p = await fresh(); assert.deepEqual(await p.evaluate(() => Object.keys(localStorage)), []);
    const ids = await p.evaluate(async () => {
      const app = HCM.create(HCMStorage.create(localStorage));
      await app.setup({ companyName: 'Payroll <img src=x onerror=alert(1)> Company', officeStart: '09:00', graceMinutes: 15, yearlyLeaveQuota: 366, workingDays: [1, 2, 3, 4, 5, 6], name: 'Admin', email: 'admin@example.test', password: 'Admin-Test-123', confirmPassword: 'Admin-Test-123' });
      await app.login({ email: 'admin@example.test', password: 'Admin-Test-123' }); const ids = [];
      for (const name of ['first', 'second']) ids.push(await app.addEmployee({ name: `${name} <script>test</script>`, email: `${name}@example.test`, password: 'Employee-Test-123', department: '<b>Test</b>', monthlySalary: 26000, joiningDate: '2026-01-01' }));
      const records = HCMLeaves.workingDates('2026-09-01', '2026-09-30', [1, 2, 3, 4, 5, 6]).filter(d => !['2026-09-01', '2026-09-02'].includes(d)).map(date => {
        const half = ['2026-09-03', '2026-09-04'].includes(date), checkIn = new Date(`${date}T09:00:00+05:00`).toISOString(), durationMs = (half ? 4 : 8) * 3600000;
        return { id: date, employeeId: ids[0], date, checkIn, checkOut: new Date(Date.parse(checkIn) + durationMs).toISOString(), isLate: false, status: half ? 'Half day' : 'Present', durationMs, offsetMinutes: -300, lateAfter: new Date(`${date}T09:15:00+05:00`).toISOString() };
      }); HCMStorage.create(localStorage).write({ attendance: records }); return ids;
    });
    await p.goto(`${base}/pages/payslip.html`); assert.equal(await p.locator('#payslip').isVisible(), false);
    await select(p, ''); await visible(p, '#error-payrollEmployee', /existing employee/);
    await select(p, ids[0]); await visible(p, '#payslip', /Final/);
    for (const [key, expected] of [['salary', '26,000.00'], ['working', '26'], ['rate', '1,000.00'], ['absent', '2'], ['half', '2'], ['deduction', '3,000.00'], ['net', '23,000.00']]) assert.equal(await value(p, key), expected);
    assert.equal(await p.locator('#payslip img, #payslip script, #payslip b').count(), 0); await visible(p, '#payslip', /first <script>test/);
    const raw = await p.evaluate(() => ({ ...localStorage }));
    await p.screenshot({ path: path.join(os.tmpdir(), 'hcm-phase4-desktop.png'), fullPage: true }); pass('Admin selection, required employee error, PDF example and safe text rendering');

    await select(p, ids[1]); assert.equal(await value(p, 'net'), '0.00'); await visible(p, '#payslip', /second <script>/);
    await select(p, ids[0], '11'); await visible(p, '#error-payrollMonth', /Future-month/); assert.equal(await p.locator('#payslip').isVisible(), false); assert.equal(await p.locator('#payroll-print').isDisabled(), true);
    await select(p, ids[0], '9', '99'); await visible(p, '#error-payrollYear', /100 to 9999/);
    await select(p, ids[0]); await p.locator('#payrollMonth').selectOption('8'); assert.equal(await p.locator('#payslip').isVisible(), false); pass('Admin all employees, invalid/future period errors and stale selection invalidation');

    await login(p, 'first'); assert.equal(await p.locator('#payrollEmployee').count(), 0); await visible(p, '#payslip', /Provisional full-month projection/);
    await select(p, undefined); assert.equal(await value(p, 'net'), '23,000.00');
    assert.equal(await p.evaluate(id => { const a = HCM.create(HCMStorage.create(localStorage)); try { a.payroll.slip({ year: 2026, month: 9, employeeId: id }); return false; } catch (e) { return /own/.test(e.message); } }, ids[1]), true);
    await p.reload(); await visible(p, '#payslip', /Provisional full-month projection/); await select(p, undefined); pass('Employee identity fixed, direct manipulated ID rejected and refresh recalculates');

    await p.evaluate(() => { window.printCalls = 0; window.print = () => { window.printCalls++; window.dispatchEvent(new Event('beforeprint')); }; });
    await p.getByRole('button', { name: 'Print / Save as PDF', exact: true }).click(); assert.equal(await p.evaluate(() => window.printCalls), 1);
    assert.deepEqual(await p.evaluate(() => ({ ...localStorage, hcm_session: undefined })), { ...raw, hcm_session: undefined });
    await p.emulateMedia({ media: 'print' });
    for (const selector of ['#header', '.payroll-controls', '#password-panel', 'footer', '#content > h1']) assert.equal(await p.locator(selector).isVisible(), false);
    assert.equal(await p.locator('#payslip').isVisible(), true); await p.pdf({ path: path.join(os.tmpdir(), 'hcm-phase4-final.pdf'), preferCSSPageSize: true, printBackground: true });
    await p.emulateMedia({ media: 'screen' }); pass('Print button invokes print only; print media hides controls and unrelated content; A4 final PDF captured without storage writes');

    await p.setViewportSize({ width: 390, height: 844 });
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    for (const selector of ['#payroll-form', '#payslip', '.payroll-breakdown', '#payroll-print']) { const b = await p.locator(selector).boundingBox(); assert.ok(b.x >= 0 && b.x + b.width <= 391); }
    await p.screenshot({ path: path.join(os.tmpdir(), 'hcm-phase4-phone.png'), fullPage: true }); pass('390px phone controls, breakdown and long user text fit viewport');

    await login(p, 'admin'); await p.evaluate(id => {
      const storage = HCMStorage.create(localStorage), app = HCM.create(storage), u = app.employees().find(u => u.id === id);
      app.editEmployee(id, { ...u, joiningDate: '2026-09-16' });
      const rows = storage.read('attendance').map(a => a.date === '2026-09-17' ? { ...a, checkOut: null, durationMs: null, status: 'Checked in' } : a); storage.write({ attendance: rows });
    }, ids[0]);
    await select(p, ids[0]); await visible(p, '#payslip', /Joining-month proration/); await visible(p, '#payslip', /Unresolved attendance.*2026-09-17/); await visible(p, '#payslip', /Provisional/);
    assert.equal(await value(p, 'gross'), '13,000.00');
    await p.emulateMedia({ media: 'print' }); await p.pdf({ path: path.join(os.tmpdir(), 'hcm-phase4-provisional.pdf'), preferCSSPageSize: true, printBackground: true }); await p.emulateMedia({ media: 'screen' });
    await select(p, ids[0], '8'); await visible(p, '#payslip', /No payable entitlement/); assert.equal(await value(p, 'net'), '0.00'); pass('Joining-month, before-joining and open-shift notices; provisional/proration PDF captured');

    await select(p, ids[0]); await p.evaluate(() => { const storage = HCMStorage.create(localStorage); const state = storage.state(); storage.write({ users: state.users.map(u => u.role === 'Employee' ? { ...u, monthlySalary: 52000 } : u) }); });
    await p.evaluate(() => window.dispatchEvent(new Event('beforeprint'))); assert.equal(await value(p, 'gross'), '26,000.00');
    await p.evaluate(() => { localStorage.setItem('hcm_leaves', '{bad'); window.dispatchEvent(new Event('beforeprint')); }); await visible(p, '#payslip', /Payslip unavailable.*invalid JSON/); assert.equal(await p.locator('[data-payroll="net"]').count(), 0); assert.equal(await p.evaluate(() => localStorage.getItem('hcm_leaves')), '{bad');
    await p.reload(); await visible(p, '#fatal', /invalid JSON/); pass('Native beforeprint revalidates current data and removes stale figures on preserved malformed storage');

    const denied = await fresh(); await denied.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } })); await denied.goto(`${base}/pages/payslip.html`); await visible(denied, '#fatal', /storage is unavailable/);
    const empty = await fresh(); await empty.goto(`${base}/pages/payslip.html`); await empty.waitForURL(`${base}/index.html`); assert.equal(await empty.locator('#setup-form').isVisible(), true); assert.deepEqual(await empty.evaluate(() => Object.keys(localStorage)), []);
    await empty.evaluate(async () => { const app = HCM.create(HCMStorage.create(localStorage)); await app.setup({ companyName: 'Empty', officeStart: '09:00', graceMinutes: 0, yearlyLeaveQuota: 0, workingDays: [1], name: 'Admin', email: 'admin@example.test', password: 'Admin-Test-123', confirmPassword: 'Admin-Test-123' }); await app.login({ email: 'admin@example.test', password: 'Admin-Test-123' }); });
    await empty.goto(`${base}/pages/payslip.html`); await visible(empty, '#payroll-empty', /No employees/); assert.equal(await empty.locator('#payroll-print').isDisabled(), true); pass('Unavailable storage, anonymous routing, empty delivery and no-employee state');

    await empty.evaluate(() => { localStorage.setItem('hcm_session', JSON.stringify({ userId: 'deleted' })); window.dispatchEvent(new Event('beforeprint')); }); assert.equal(await empty.locator('[data-payroll="net"]').count(), 0); await visible(empty, '#payslip', /permission/);
    await empty.reload(); await empty.waitForURL(`${base}/index.html`); pass('Stale/deleted session cannot calculate/print and redirects on reload');
    assert.deepEqual(errors, []); console.log(`${checks} payroll browser scenarios passed; no page JavaScript errors. QA: ${os.tmpdir()}\\hcm-phase4-*`);
  } finally { for (const context of contexts) await context.close(); if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
