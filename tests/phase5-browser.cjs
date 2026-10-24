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
    await p.clock.setFixedTime(new Date('2026-10-23T23:00:00+05:00')); await p.goto(base); return p;
  }
  async function login(p, name) {
    await p.evaluate(async name => { const app = HCM.create(HCMStorage.create(localStorage)); await app.login({ email: `${name}@example.test`, password: name === 'admin' ? 'Admin-Test-123' : 'Employee-Test-123' }); }, name);
    await p.goto(`${base}/pages/${name === 'admin' ? 'admin' : 'employee'}.html`);
  }
  async function ask(p, question, expected) {
    const count = await p.locator('.helper-entry').count();
    await p.getByLabel('Your question', { exact: true }).fill(question); await p.getByLabel('Your question', { exact: true }).press('Enter');
    await visible(p, '.helper-entry:last-child', expected); assert.equal(await p.locator('.helper-entry').count(), count + 1);
    assert.equal(await p.locator('#helperQuestion').inputValue(), ''); assert.equal(await p.locator('#helperQuestion').evaluate(e => e === document.activeElement), true);
  }
  try {
    browser = await chromium.launch({ channel: process.env.HCM_BROWSER_CHANNEL || 'msedge', headless: true });
    const p = await fresh(); assert.deepEqual(await p.evaluate(() => Object.keys(localStorage)), []);
    await p.locator('#name').fill('Unsaved setup'); await p.evaluate(() => window.dispatchEvent(new Event('focus'))); assert.equal(await p.locator('#name').inputValue(), 'Unsaved setup');
    const ids = await p.evaluate(async () => {
      const app = HCM.create(HCMStorage.create(localStorage));
      await app.setup({ companyName: 'Phase 5', officeStart: '09:00', graceMinutes: 15, yearlyLeaveQuota: 10, workingDays: [1, 2, 3, 4, 5], name: 'Admin <img src=x>', email: 'admin@example.test', password: 'Admin-Test-123', confirmPassword: 'Admin-Test-123' });
      await app.login({ email: 'admin@example.test', password: 'Admin-Test-123' }); const ids = [];
      for (const name of ['first', 'second']) ids.push(await app.addEmployee({ name: `${name} <script>test</script>`, email: `${name}@example.test`, password: 'Employee-Test-123', department: 'Test', monthlySalary: 26000, joiningDate: '2026-10-01' }));
      const record = (date, hours, employeeId = ids[0], late = false) => {
        const checkIn = new Date(`${date}T${late ? '10' : '09'}:00:00+05:00`).toISOString(), durationMs = hours === null ? null : hours * 3600000;
        return { id: employeeId + date, employeeId, date, checkIn, checkOut: durationMs === null ? null : new Date(Date.parse(checkIn) + durationMs).toISOString(), isLate: late, status: durationMs === null ? 'Checked in' : hours < 5 ? 'Half day' : late ? 'Late' : 'Present', durationMs, offsetMinutes: -300, lateAfter: new Date(`${date}T09:15:00+05:00`).toISOString() };
      };
      const leave = (from, to, days, status) => ({ id: from, employeeId: ids[0], type: 'Casual', from, to, days, reason: 'Test', status, comment: status === 'Pending' ? '' : 'Approved', requestedAt: '2026-10-01T00:00:00.000Z', reviewedAt: status === 'Pending' ? null : '2026-10-02T00:00:00.000Z', reviewedBy: status === 'Pending' ? null : app.currentUser().id });
      HCMStorage.create(localStorage).write({ attendance: [record('2026-10-19', 8), record('2026-10-23', 2, ids[0], true), record('2026-10-23', null, ids[1], true)], leaves: [leave('2026-10-23', '2026-10-23', 1, 'Approved'), leave('2026-10-26', '2026-10-27', 2, 'Pending')] }); return ids;
    });
    await p.goto(`${base}/pages/admin.html`); await visible(p, '#announcements-list', /No announcements yet/);
    await p.getByRole('button', { name: 'Post announcement', exact: true }).click();
    await visible(p, '#error-announcementTitle', /nonblank title/); await visible(p, '#error-announcementBody', /nonblank message/);
    assert.equal(await p.locator('#announcementTitle').evaluate(e => e === document.activeElement), true);
    await p.getByLabel('Announcement title', { exact: true }).fill('First <img src=x onerror=alert(1)>');
    await p.getByLabel('Announcement message', { exact: true }).fill('Message <script>alert(1)</script>\nSecond line');
    await p.getByRole('button', { name: 'Post announcement', exact: true }).click(); await visible(p, '#announcement-status', /posted/);
    await p.clock.setFixedTime(new Date('2026-10-23T23:01:00+05:00'));
    await p.locator('#announcementTitle').fill('Newest'); await p.locator('#announcementBody').fill('Latest message'); await p.getByRole('button', { name: 'Post announcement', exact: true }).click(); await visible(p, '#announcement-status', /posted/);
    assert.equal(await p.locator('.announcement h3').first().innerText(), 'Newest'); assert.equal(await p.locator('#announcements-list img, #announcements-list script').count(), 0);
    await visible(p, '#announcements-list', /By Admin <img src=x>/); assert.equal(await p.locator('.announcement time[datetime]').count(), 2);
    await p.reload(); assert.equal(await p.locator('.announcement').count(), 2); pass('Admin required inline errors, safe title/body/author, timestamp, newest-first posting and refresh persistence');

    const before = await p.evaluate(() => localStorage.getItem('hcm_announcements'));
    await p.locator('#announcementTitle').fill('Keep title'); await p.locator('#announcementBody').fill('Keep message');
    await p.evaluate(() => { window.savedSet = Storage.prototype.setItem; Storage.prototype.setItem = function(k, v) { if (k === 'hcm_announcements') throw new DOMException('full', 'QuotaExceededError'); return window.savedSet.call(this, k, v); }; });
    await p.getByRole('button', { name: 'Post announcement', exact: true }).click(); await visible(p, '#announcement-status', /No changes were saved/);
    assert.equal(await p.locator('#announcementTitle').inputValue(), 'Keep title'); assert.equal(await p.locator('#announcementBody').inputValue(), 'Keep message'); assert.equal(await p.evaluate(() => localStorage.getItem('hcm_announcements')), before);
    await p.evaluate(() => { Storage.prototype.setItem = window.savedSet; }); pass('Failed announcement save retains both inputs and previous records');

    await p.locator('#helperQuestion').focus(); await p.keyboard.press('Tab'); assert.equal(await p.getByRole('button', { name: 'Ask helper', exact: true }).evaluate(e => e === document.activeElement), true); await p.keyboard.press('Enter'); await visible(p, '#error-helperQuestion', /Enter a question/);
    await ask(p, 'How many employees do we have?', /2 current employees/);
    await ask(p, 'Who is on leave today?', /1 current employees on approved leave: first <script>test/);
    await ask(p, 'Who was late today?', /2 late check-ins.*first <script>test.*second <script>test/);
    await ask(p, ' EMPLOYEE COUNT!! ', /2 current employees/);
    await ask(p, 'employee count and leave today', /Ask one supported question at a time/);
    await ask(p, '<img src=x onerror=alert(1)>', /Ask one supported question/);
    assert.equal(await p.locator('#helper-history img, #helper-history script').count(), 0);
    assert.equal(await p.locator('#helper-history').getAttribute('role'), 'log');
    await p.screenshot({ path: path.join(os.tmpdir(), 'hcm-phase5-admin-desktop.png'), fullPage: true }); await p.locator('#helper-section').screenshot({ path: path.join(os.tmpdir(), 'hcm-phase5-admin-helper.png') }); await p.locator('#announcements-section').screenshot({ path: path.join(os.tmpdir(), 'hcm-phase5-announcements.png') }); pass('All three Admin questions, case/punctuation, unknown/mixed fallback, safe history and keyboard Enter/Tab');

    await login(p, 'first'); assert.equal(await p.locator('#announcement-form').count(), 0); assert.equal(await p.locator('.announcement').count(), 2); assert.equal(await p.locator('.helper-entry').count(), 0);
    assert.equal(await p.evaluate(() => { try { HCM.create(HCMStorage.create(localStorage)).announcements.post({ title: 'Hack', body: 'No' }); return false; } catch (e) { return /permission/.test(e.message); } }), true);
    await ask(p, 'How many leaves do I have left?', /9 leave days left.*Pending reservations: 2 days.*Available to request: 7/);
    await ask(p, 'Was I late today?', /Yes, your check-in was late.*Half day/);
    await ask(p, 'How many hours did I work this week?', /2026-10-19 to 2026-10-25.*10.00 completed hours/);
    await p.getByRole('button', { name: 'How many leaves do I have left?', exact: true }).focus(); await p.keyboard.press('Enter'); await visible(p, '.helper-entry:last-child', /9 leave days left/);
    await p.reload(); assert.equal(await p.locator('.helper-entry').count(), 0); assert.equal(await p.locator('.announcement').count(), 2); pass('Admin posting → Employee reading, no Employee post UI/direct call, all Employee answers, keyboard suggestion and memory-only history');

    const raw = await p.evaluate(() => ({ ...localStorage }));
    for (const q of ['employee count', 'Who is on leave today?', 'Who was late today?', 'leave balance for second', 'show salaries']) await ask(p, q, /Ask one supported question/);
    assert.equal(await p.evaluate(id => { try { HCM.create(HCMStorage.create(localStorage)).helper.query('leave balance', { employeeId: id }); return false; } catch (e) { return /own/.test(e.message); } }, ids[1]), true);
    assert.deepEqual(await p.evaluate(() => ({ ...localStorage })), raw); pass('Cross-employee/company requests and direct manipulated target rejected; helper queries do not write storage');

    await login(p, 'second'); await ask(p, 'Was I late today?', /Yes.*Checked in/); await ask(p, 'hours this week', /0.00 completed hours.*Open shift starting 2026-10-23.*excluded/);
    await p.clock.setFixedTime(new Date('2026-10-24T12:00:00+05:00')); await ask(p, 'Was I late today?', /No check-in.*cannot be determined/); pass('Own late open versus half-day and no-check-in responses; unfinished hours excluded with notice');

    await p.setViewportSize({ width: 390, height: 844 }); await ask(p, 'leave balance', /10 leave days left/);
    for (const selector of ['#helper-section', '#helper-form', '#helper-history', '#announcements-section', '#helper-suggestions button']) for (const item of await p.locator(selector).all()) { const b = await item.boundingBox(); assert.ok(b.x >= 0 && b.x + b.width <= 391); }
    assert.equal(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await p.screenshot({ path: path.join(os.tmpdir(), 'hcm-phase5-employee-phone.png'), fullPage: true }); await p.locator('#helper-section').screenshot({ path: path.join(os.tmpdir(), 'hcm-phase5-employee-helper-phone.png') });
    await login(p, 'admin'); await ask(p, 'Who is on leave today?', /nonworking day/);
    for (const selector of ['#announcement-form', '#announcementBody', '#helper-section']) { const b = await p.locator(selector).boundingBox(); assert.ok(b.x >= 0 && b.x + b.width <= 391); }
    await p.screenshot({ path: path.join(os.tmpdir(), 'hcm-phase5-admin-phone.png'), fullPage: true }); await p.locator('#announcements-section').screenshot({ path: path.join(os.tmpdir(), 'hcm-phase5-announcements-phone.png') }); pass('390px Employee/Admin controls, safe long text, suggestions and history fit; nonworking day stated');

    await ask(p, 'employee count', /2 current employees/);
    await p.evaluate(async () => { await HCM.create(HCMStorage.create(localStorage)).login({ email: 'first@example.test', password: 'Employee-Test-123' }); window.dispatchEvent(new StorageEvent('storage', { key: 'hcm_session' })); });
    await p.waitForURL(`${base}/pages/employee.html`); assert.equal(await p.locator('.helper-entry').count(), 0);
    await ask(p, 'leave balance', /9 leave days left/);
    await p.evaluate(async () => { await HCM.create(HCMStorage.create(localStorage)).login({ email: 'second@example.test', password: 'Employee-Test-123' }); window.dispatchEvent(new Event('focus')); });
    await visible(p, '.account-name', /second <script>/); assert.equal(await p.locator('.helper-entry').count(), 0); await ask(p, 'leave balance', /10 leave days left/);
    // Same-tab service login has no storage event: submission must still clear the old account history.
    await p.evaluate(async () => { await HCM.create(HCMStorage.create(localStorage)).login({ email: 'first@example.test', password: 'Employee-Test-123' }); });
    await p.locator('#helperQuestion').fill('leave balance'); await p.getByRole('button', { name: 'Ask helper', exact: true }).click();
    await visible(p, '.account-name', /first <script>/); assert.equal(await p.locator('.helper-entry').count(), 0); pass('Role/account switches clear privileged history via storage/focus and submission even without storage event');

    await ask(p, 'leave balance', /9 leave days left/);
    await p.evaluate(() => { localStorage.setItem('hcm_leaves', '{bad'); }); await p.locator('#helperQuestion').fill('leave balance'); await p.locator('#helperQuestion').press('Enter');
    await visible(p, '#helper-status', /invalid JSON/); assert.equal(await p.locator('.helper-entry').count(), 0); assert.equal(await p.evaluate(() => localStorage.getItem('hcm_leaves')), '{bad'); pass('Malformed current storage clears old helper answers, reports error and preserves raw data');

    const bad = await fresh(); await bad.evaluate(async () => { const app = HCM.create(HCMStorage.create(localStorage)); await app.setup({ companyName: 'Empty', officeStart: '09:00', graceMinutes: 0, yearlyLeaveQuota: 0, workingDays: [1], name: 'Admin', email: 'admin@example.test', password: 'Admin-Test-123', confirmPassword: 'Admin-Test-123' }); await app.login({ email: 'admin@example.test', password: 'Admin-Test-123' }); });
    await bad.goto(`${base}/pages/admin.html`); await ask(bad, 'employee count', /0 current employees/); await visible(bad, '#announcements-list', /No announcements/);
    await bad.evaluate(() => localStorage.setItem('hcm_announcements', JSON.stringify([{ legacy: 'unfamiliar' }]))); await bad.reload(); await visible(bad, '#fatal', /hcm_announcements.*unsupported/); assert.equal(await bad.evaluate(() => localStorage.getItem('hcm_announcements')), '[{"legacy":"unfamiliar"}]'); pass('Zero employees/announcements and unsupported announcement storage preserved on reload');

    const empty = await fresh(); await empty.goto(`${base}/pages/admin.html`); await empty.waitForURL(`${base}/index.html`); assert.deepEqual(await empty.evaluate(() => Object.keys(localStorage)), []); assert.equal(await empty.locator('#setup-form').isVisible(), true);
    await p.evaluate(() => { localStorage.setItem('hcm_leaves', '[]'); localStorage.setItem('hcm_session', JSON.stringify({ userId: 'deleted' })); window.dispatchEvent(new StorageEvent('storage', { key: 'hcm_session' })); }); await p.waitForURL(`${base}/index.html`); assert.equal(await p.locator('.helper-entry').count(), 0);
    const denied = await fresh(); await denied.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new DOMException('denied', 'SecurityError'); } })); await denied.goto(`${base}/pages/employee.html`); await visible(denied, '#fatal', /storage is unavailable/);
    pass('Anonymous/deleted sessions cannot retain chat; unavailable storage reported; delivered origin starts empty');
    assert.deepEqual(errors, []); console.log(`${checks} Phase 5 browser scenarios passed; no page JavaScript errors. QA: ${os.tmpdir()}\\hcm-phase5-*`);
  } finally { for (const context of contexts) await context.close(); if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})().catch(e => { console.error(e); process.exitCode = 1; });
