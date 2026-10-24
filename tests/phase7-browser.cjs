'use strict';
// Acceptance journey uses UI-created records in disposable contexts, never the user's profile.
// This independent file-only host deliberately does not import tools/serve.cjs.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const http = require('node:http');
const { chromium } = require(process.env.HCM_PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '..'), prefix = '/SMIT-Hackathon-HCM-Lite/';
const files = ['index.html', ...['admin', 'employees', 'leaves', 'settings', 'employee', 'payslip'].map(n => `pages/${n}.html`),
  'css/style.css', ...fs.readdirSync(path.join(root, 'js')).map(n => `js/${n}`),
  ...['logo.svg', 'favicon.svg', 'team-work.webp', 'empty-work.webp'].map(n => `assets/${n}`)];
const mime = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.svg': 'image/svg+xml', '.webp': 'image/webp' };
function host() {
  return http.createServer((req, res) => {
    const pathname = new URL(req.url, 'http://localhost').pathname;
    const file = pathname.startsWith(prefix) ? pathname.slice(prefix.length) || 'index.html' : '';
    // Set membership is case sensitive even on Windows.
    if (!files.includes(file)) { res.writeHead(404); res.end(); return; }
    res.writeHead(200, { 'Content-Type': `${mime[path.extname(file)]}; charset=utf-8` });
    res.end(fs.readFileSync(path.join(root, file)));
  });
}
(async () => {
  const server = host(), other = host(), contexts = [], errors = [], broken = [], external = [];
  await new Promise(r => server.listen(0, '127.0.0.1', r));
  await new Promise(r => other.listen(0, '127.0.0.1', r));
  const origin = `http://127.0.0.1:${server.address().port}`, base = origin + prefix;
  let browser, checks = 0;
  const pass = label => console.log(`PASS ${++checks}: ${label}`);
  const visible = (p, selector, match) => p.locator(selector).filter({ hasText: match }).waitFor();
  async function fill(p, selector, values) {
    for (const [key, value] of Object.entries(values)) await p.locator(`${selector} [name="${key}"]`).fill(String(value));
  }
  async function login(p, role) {
    await p.goto(base);
    await fill(p, '#login-form', { email: `${role}@example.test`, password: role === 'admin' ? 'Admin-Test-123' : 'Employee-Test-123' });
    await p.getByRole('button', { name: 'Sign in', exact: true }).click();
    await p.waitForURL(base + `pages/${role === 'admin' ? 'admin' : 'employee'}.html`);
  }
  async function logout(p) {
    await p.getByRole('button', { name: 'Log out', exact: true }).click(); await p.waitForURL(base + 'index.html');
  }
  async function ask(p, question, match) {
    await p.locator('#helperQuestion').fill(question); await p.locator('#helperQuestion').press('Enter');
    await visible(p, '.helper-entry:last-child', match);
  }
  try {
    browser = await chromium.launch({ channel: process.env.HCM_BROWSER_CHANNEL || 'msedge', headless: true });
    const c = await browser.newContext({ timezoneId: 'Asia/Karachi', locale: 'en-US', viewport: { width: 1440, height: 1000 } }); contexts.push(c);
    const p = await c.newPage();
    p.on('pageerror', e => errors.push(e.message));
    p.on('response', r => { if (r.status() >= 400) broken.push(r.url()); });
    p.on('request', r => { if (!r.url().startsWith(origin + '/')) external.push(r.url()); });
    await p.clock.setFixedTime(new Date('2026-10-19T09:15:00.001+05:00'));
    // Direct protected navigation, setup redirect and an untouched origin.
    await p.goto(base + 'pages/admin.html'); await p.waitForURL(base + 'index.html');
    assert.deepEqual(await p.evaluate(() => Object.keys(localStorage)), []);
    await fill(p, '#setup-form', { companyName: 'Acceptance Studio', officeStart: '09:00', graceMinutes: 15, yearlyLeaveQuota: 5,
      name: 'Acceptance Admin', email: 'admin@example.test', password: 'Admin-Test-123', confirmPassword: 'Admin-Test-123' });
    for (const d of [1, 2, 3, 4, 5]) await p.locator(`[name="workingDays"][value="${d}"]`).check();
    await p.getByRole('button', { name: 'Create company & Admin', exact: true }).click(); await visible(p, '#auth-status', /Company created/);
    await login(p, 'admin'); await p.goto(base + 'pages/employees.html');
    await fill(p, '#employee-form', { name: 'Journey Employee', email: 'employee@example.test', password: 'Employee-Test-123', department: 'Engineering', monthlySalary: 22000, joiningDate: '2026-10-19' });
    await p.getByRole('button', { name: 'Add employee & create login', exact: true }).click(); await visible(p, '#employee-status', /Employee added/);
    const employeeId = await p.evaluate(() => JSON.parse(localStorage.hcm_users).find(u => u.role === 'Employee').id);
    await logout(p); await p.reload(); await login(p, 'employee');
    pass('Empty subdirectory setup -> UI Admin/company -> UI employee creation -> logout/refresh -> usable Employee login');

    await p.locator('#check-in').click(); await visible(p, '#attendance-status', /Check-in saved/);
    assert.equal(await p.locator('#check-in').isDisabled(), true);
    await p.clock.setFixedTime(new Date('2026-10-19T14:15:00.001+05:00'));
    await p.locator('#check-out').click(); await visible(p, '#attendance-status', /Status: Late/);
    await fill(p, '#leave-form', { leaveFrom: '2026-10-20', leaveTo: '2026-10-20', leaveReason: 'Journey <safe> leave' });
    await p.locator('#leaveType').selectOption('Casual');
    await p.getByRole('button', { name: 'Submit leave request', exact: true }).click(); await visible(p, '#leave-status', /Pending.*1 working days/);
    await p.reload(); await visible(p, '#attendance-current', /Late.*Yes/); await visible(p, '#leave-balance', /Pending 1.*Available to request 4/);
    const record = await p.evaluate(() => JSON.parse(localStorage.hcm_attendance)[0]);
    assert.equal(record.durationMs, 5 * 3600000); assert.equal(record.isLate, true); assert.equal(record.employeeId, employeeId);
    await ask(p, 'Was I late today?', /Yes, your check-in was late/);
    await ask(p, 'How many hours did I work this week?', /5.00 completed hours/);
    await logout(p); await login(p, 'admin');
    await visible(p, '#leave-overview', /1 pending/);
    await ask(p, 'How many employees do we have?', /1 current employees/);
    await ask(p, 'Who was late today?', /1 late check-ins: Journey Employee/);
    pass('Employee UI check-in/out at controlled +1ms cutoff/exact five hours; request/status/reservation persists; real own/company helper answers');

    await p.goto(base + 'pages/leaves.html'); await p.locator('#leave-rows button').click();
    await visible(p, '#review-days', /Current working-day count: 1. Saved count: 1/);
    await p.locator('#reviewDecision').selectOption('Approved'); await p.locator('#reviewComment').fill('Coverage confirmed <safe>');
    await p.getByRole('button', { name: 'Save leave decision', exact: true }).click(); await visible(p, '#leave-filter-status', /Leave approved/);
    await p.clock.setFixedTime(new Date('2026-10-20T10:00:00+05:00'));
    await p.goto(base + 'pages/admin.html');
    await fill(p, '#announcement-form', { announcementTitle: 'Team update <safe>', announcementBody: 'Read the handover before your next shift.' });
    await p.getByRole('button', { name: 'Post announcement', exact: true }).click(); await visible(p, '#announcement-status', /posted/);
    await visible(p, '#leave-overview', /0 pending.*1 current employees on approved leave/);
    await ask(p, 'Who is on leave today?', /1 current employees on approved leave: Journey Employee/);
    // Reproduce the joining-date audit bug through an allowed edit, then restore it.
    await p.evaluate(id => { const a = HCM.create(HCMStorage.create(localStorage)), u = a.employees().find(u => u.id === id); a.editEmployee(id, { ...u, joiningDate: '2026-10-21' }); }, employeeId);
    await p.reload(); await visible(p, '#leave-overview', /0 current employees on approved leave/);
    await ask(p, 'Who is on leave today?', /0 current employees on approved leave/);
    await p.evaluate(id => { const a = HCM.create(HCMStorage.create(localStorage)), u = a.employees().find(u => u.id === id); a.editEmployee(id, { ...u, joiningDate: '2026-10-19' }); }, employeeId);
    await logout(p); await login(p, 'employee');
    await visible(p, '#leave-rows', /Approved.*Coverage confirmed <safe>/s); await visible(p, '#leave-balance', /Approved 1.*Approved balance 4.*Pending 0.*Available to request 4/);
    await visible(p, '#announcements-list', /Team update <safe>/); assert.equal(await p.locator('#announcements-list safe, #leave-rows safe').count(), 0);
    await ask(p, 'How many leaves do I have left?', /4 leave days left.*1 approved/);
    await ask(p, 'Was I late today?', /No check-in.*cannot be determined/);
    await ask(p, 'How many hours did I work this week?', /5.00 completed hours/);
    pass('Admin review/comment/announcement -> Employee decision/balance/read-only feed; all six question groups; joining-edit dashboard regression');

    const source = await p.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k !== 'hcm_session')));
    for (const role of ['employee', 'admin']) {
      if (role === 'admin') { await logout(p); await login(p, 'admin'); }
      await p.goto(base + 'pages/payslip.html');
      if (role === 'admin') await p.locator('#payrollEmployee').selectOption(employeeId);
      else assert.equal(await p.locator('#payrollEmployee').count(), 0);
      await p.getByRole('button', { name: 'Calculate / Refresh payslip', exact: true }).click();
      for (const [key, value] of [['working', '22'], ['eligible', '10'], ['leave', '1'], ['absent', '0'], ['half', '0'], ['gross', '10,000.00'], ['net', '10,000.00']]) assert.equal(await p.locator(`[data-payroll="${key}"]`).innerText(), value);
      await visible(p, '#payslip', /Journey Employee.*2026-10-19/s);
      assert.deepEqual(await p.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k !== 'hcm_session'))), source);
    }
    await logout(p); await p.reload(); assert.equal(await p.locator('#login-form').isVisible(), true);
    await login(p, 'employee'); await visible(p, '#leave-rows', /Approved/); await visible(p, '#announcements-list', /Team update/);
    assert.deepEqual(await p.evaluate(() => Object.fromEntries(Object.entries(localStorage).filter(([k]) => k !== 'hcm_session'))), source);
    pass('Both roles see correct selected/own provisional joining-month payslip; paid leave/no late-only deduction; no source writes; logout/relogin/refresh persistence');

    await logout(p); await login(p, 'admin');
    async function accountKeyboard() {
      for (const width of [1440, 834, 390]) {
        await p.setViewportSize({ width, height: 1000 });
        assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
        const password = p.getByRole('button', { name: 'Change my password', exact: true });
        const logoutButton = p.getByRole('button', { name: 'Log out', exact: true });
        assert.equal(await password.isVisible(), true); assert.equal(await logoutButton.isVisible(), true);
        await password.focus(); await p.keyboard.press('Tab');
        assert.equal(await logoutButton.evaluate(n => n === document.activeElement), true);
        await p.keyboard.press('Shift+Tab'); await p.keyboard.press('Enter');
        assert.equal(await p.locator('#currentPassword').evaluate(n => n === document.activeElement), true);
        await p.locator('#password-panel summary').click();
      }
    }
    for (const name of ['admin', 'employees', 'leaves', 'settings', 'payslip']) {
      await p.goto(base + `pages/${name}.html`); assert.equal(await p.locator('#fatal').isVisible(), false);
      assert.equal(await p.locator('.brand img').evaluate(n => n.complete && n.naturalWidth > 0), true);
      await accountKeyboard();
    }
    await p.goto(base + 'pages/employee.html'); await p.waitForURL(base + 'pages/admin.html');
    await logout(p); await login(p, 'employee');
    for (const name of ['admin', 'employees', 'leaves', 'settings']) { await p.goto(base + `pages/${name}.html`); await p.waitForURL(base + 'pages/employee.html'); }
    await accountKeyboard();
    for (const file of files) { const r = await c.request.get(base + file); assert.equal(r.status(), 200, file); }
    assert.equal((await c.request.get(base + 'pages/Admin.html')).status(), 404);
    assert.equal((await c.request.get(base + 'qa/phase6/after/final.pdf')).status(), 404);
    assert.equal((await c.request.get(base + 'tests/browser.cjs')).status(), 404);
    assert.deepEqual(errors, []); assert.deepEqual(broken, []); assert.deepEqual(external, []);
    pass('Case-sensitive repository prefix: seven direct routes, all role redirects, account keyboard access at 1440/834/390px, scripts/CSS/four assets; independent static host, no external requests/test/QA dependency');

    const isolated = await browser.newContext(); contexts.push(isolated); const clean = await isolated.newPage(); await clean.goto(base);
    assert.deepEqual(await clean.evaluate(() => Object.keys(localStorage)), []); assert.equal(await clean.locator('#setup-form').isVisible(), true);
    const secondBase = `http://127.0.0.1:${other.address().port}${prefix}`;
    await p.goto(secondBase); assert.deepEqual(await p.evaluate(() => Object.keys(localStorage)), []); assert.equal(await p.locator('#setup-form').isVisible(), true);
    await p.goto(base + 'pages/employee.html'); await visible(p, '#announcements-list', /Team update/);
    pass('Separate context and separate origin both start empty; returning to original origin retains its company/data');

    const known = await p.evaluate(() => ({ ...localStorage }));
    for (const target of ['company', 'account', 'password']) {
      const raw = await p.evaluate(({ known, target }) => {
        for (const [key, value] of Object.entries(known)) localStorage.setItem(key, value);
        const key = target === 'company' ? 'hcm_company' : 'hcm_users', value = JSON.parse(localStorage.getItem(key));
        const record = target === 'company' ? value : target === 'password' ? value[0].password : value[0];
        record.unfamiliarField = 'preserve this data'; localStorage.setItem(key, JSON.stringify(value));
        return { ...localStorage };
      }, { known, target });
      await p.reload(); await visible(p, '#fatal', /unsupported or invalid structure.*preserved/);
      assert.equal(await p.locator('#content').innerText(), '');
      assert.deepEqual(await p.evaluate(() => ({ ...localStorage })), raw);
    }
    pass('Unknown company/account/password fields show preservation error and block UI without rewriting any raw collection');
    console.log(`${checks} Phase 7 browser scenarios passed.`);
  } finally {
    for (const c of contexts) await c.close(); if (browser) await browser.close();
    await Promise.all([new Promise(r => server.close(r)), new Promise(r => other.close(r))]);
  }
})().catch(e => { console.error(e); process.exitCode = 1; });
