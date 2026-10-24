'use strict';
const assert = require('node:assert/strict');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../tools/serve.cjs');
const { chromium } = require(process.env.HCM_PLAYWRIGHT_MODULE || 'playwright');
(async () => {
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`; let browser; const contexts = [], errors = []; let checks = 0;
  const pass = text => console.log(`PASS ${++checks}: ${text}`);
  async function fresh(options = {}) {
    const context = await browser.newContext({ timezoneId: 'Asia/Karachi', ...options }); contexts.push(context);
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.clock.setFixedTime(new Date('2026-10-19T09:15:00+05:00')); await page.goto(base);
    return { page, context };
  }
  const text = (page, selector, pattern) => page.locator(selector).filter({ hasText: pattern }).waitFor({ state: 'visible' });
  const appEval = (page, task, args) => page.evaluate(async ({ task, args }) => {
    const app = HCM.create(HCMStorage.create(localStorage));
    if (task === 'login') return app.login(args);
    if (task === 'logout') return app.logout();
    if (task === 'report') return app.attendance.report(args);
    if (task === 'seed-test-only') {
      await app.setup({ companyName: 'Isolated Attendance UI Test', officeStart: '09:00', graceMinutes: '15', yearlyLeaveQuota: '20', workingDays: [1, 2, 3, 4, 5], name: 'Admin', email: 'admin@example.test', password: 'Admin-Test-123', confirmPassword: 'Admin-Test-123' });
      await app.login({ email: 'admin@example.test', password: 'Admin-Test-123' });
      const ids = [];
      for (const [name, email, joiningDate] of [['First <test>', 'first@example.test', '2026-10-19'], ['Second', 'second@example.test', '2026-10-22']]) ids.push(await app.addEmployee({ name, email, password: 'Employee-Test-123', department: 'Test', monthlySalary: 50000, joiningDate }));
      return ids;
    }
    if (task === 'scope-errors') {
      const output = [];
      for (const action of [() => app.attendance.checkIn(args), () => app.attendance.checkOut(args), () => app.attendance.report({ employeeId: args }), () => app.attendance.employeeOptions()]) {
        try { action(); output.push('unexpected success'); } catch (error) { output.push(error.message); }
      }
      return output;
    }
  }, { task, args });
  async function login(page, name) {
    await appEval(page, 'login', { email: `${name}@example.test`, password: name === 'admin' ? 'Admin-Test-123' : 'Employee-Test-123' });
    await page.goto(`${base}/pages/${name === 'admin' ? 'admin' : 'employee'}.html`);
  }
  const setTime = (page, value) => page.clock.setFixedTime(new Date(value));
  async function clickAction(page, name, match) { await page.getByRole('button', { name, exact: true }).click(); await text(page, '#attendance-status', match); }
  try {
    browser = await chromium.launch({ channel: process.env.HCM_BROWSER_CHANNEL || 'msedge', headless: true });
    const { page } = await fresh();
    assert.equal(await page.locator('#setup-form').count(), 1); assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), []);
    const ids = await appEval(page, 'seed-test-only'); await page.goto(`${base}/pages/admin.html`);
    assert.equal(await page.locator('#check-in, #check-out').count(), 0);
    await text(page, '#attendance-empty', /No attendance or elapsed/); await text(page, '#attendance-overview', /2 current Employee accounts/);
    const denied = await page.evaluate(() => {
      const app = HCM.create(HCMStorage.create(localStorage)); return ['checkIn', 'checkOut'].map(method => { try { app.attendance[method](); return false; } catch (_) { return true; } });
    }); assert.deepEqual(denied, [true, true]); pass('empty startup, real empty company summary, Admin has no personal actions in UI/domain');

    await login(page, 'first'); assert.equal(await page.locator('#check-out').isDisabled(), true);
    await clickAction(page, 'Check in', /Check-in saved/);
    await text(page, '#attendance-current', /Checked in\. Late at check-in: No/); await text(page, '#attendance-rows', /Not completed/);
    assert.equal(await page.locator('#check-in').isDisabled(), true); await page.reload(); await text(page, '#attendance-current', /Checked in/);
    assert.equal((await appEval(page, 'report', {})).summary.open, 1);
    const duplicate = await page.evaluate(() => { try { HCM.create(HCMStorage.create(localStorage)).attendance.checkIn(); return false; } catch (_) { return true; } }); assert.equal(duplicate, true);
    await setTime(page, '2026-10-19T14:14:00+05:00'); await clickAction(page, 'Check out', /Half day/);
    await text(page, '#attendance-rows', /4h 59m 0s/); assert.equal(await page.locator('#check-out').isDisabled(), true);
    pass('grace cutoff, open display, duplicate prevention, 4h59m half day, refresh persistence');

    await setTime(page, '2026-10-20T09:15:00.001+05:00'); await page.reload(); await clickAction(page, 'Check in', /Checked in/); await text(page, '#attendance-current', /Late at check-in: Yes/);
    await setTime(page, '2026-10-20T14:15:00.001+05:00'); await clickAction(page, 'Check out', /Status: Late/); await text(page, '#attendance-rows', /5h 0m 0s/);
    await page.reload(); assert.equal((await appEval(page, 'report', {})).summary.late, 1);
    pass('just-after cutoff lateness, exactly five hours not half day, completed persistence');

    const scopeErrors = await appEval(page, 'scope-errors', ids[1]); assert.ok(scopeErrors.every(e => /own|permission/.test(e)));
    await page.locator('#attendanceFrom').fill('2026-10-20'); await page.locator('#attendanceTo').fill('2026-10-19'); await page.getByRole('button', { name: 'Apply attendance filters', exact: true }).click(); await text(page, '#error-attendanceTo', /on or after/); assert.equal(await page.locator('#attendance-history').isVisible(), false);
    await page.locator('#attendanceTo').fill('2026-10-20'); await page.getByRole('button', { name: 'Apply attendance filters', exact: true }).click(); assert.equal(await page.locator('#attendance-rows tr').count(), 1); assert.equal(await page.locator('#attendanceEmployee').count(), 0);
    pass('Employee domain isolation and date-filter errors/inclusive range');

    await setTime(page, '2026-10-22T09:15:00.001+05:00'); await login(page, 'second');
    await clickAction(page, 'Check in', /saved/); await setTime(page, '2026-10-22T14:14:00.001+05:00'); await clickAction(page, 'Check out', /Half day/);
    const own = await appEval(page, 'report', {}); assert.equal(own.summary.records, 1); assert.equal(own.summary.late, 1); assert.equal(own.summary.halfDays, 1); assert.ok(own.rows.every(a => a.employeeId === ids[1]));
    await text(page, '#attendance-current', /Half day\. Late at check-in: Yes/); pass('late half day retains independent lateness; second Employee sees only own records');

    await setTime(page, '2026-10-26T12:00:00+05:00'); await login(page, 'admin');
    await page.locator('#attendanceEmployee').selectOption(ids[0]); await page.locator('#attendanceFrom').fill('2026-10-19'); await page.locator('#attendanceTo').fill('2026-10-30'); await page.getByRole('button', { name: 'Apply attendance filters', exact: true }).click();
    let report = await appEval(page, 'report', { employeeId: ids[0], from: '2026-10-19', to: '2026-10-30' }); assert.equal(report.summary.records, 2); assert.equal(report.summary.absent, 3); assert.equal(await page.locator('#attendance-rows tr').count(), 5);
    assert.ok(!(await page.locator('#attendance-rows').innerText()).includes('Second'));
    await page.locator('#attendanceEmployee').selectOption(ids[1]); await page.getByRole('button', { name: 'Apply attendance filters', exact: true }).click();
    assert.equal(await page.locator('#attendance-rows tr').count(), 2); await text(page, '#attendance-rows', /2026-10-23/); assert.ok(!(await page.locator('#attendance-rows').innerText()).includes('First'));
    await page.locator('#attendanceEmployee').selectOption(''); await page.getByRole('button', { name: 'Apply attendance filters', exact: true }).click(); assert.equal(await page.locator('#attendance-rows tr').count(), 7);
    assert.equal(await page.locator('#attendance-rows img').count(), 0); await text(page, '#attendance-overview', /excludes today and approved leave/);
    pass('Admin combined employee/date filters and all records; correct absence/joining/weekend/today/future boundaries');

    await login(page, 'first'); await setTime(page, '2026-10-24T23:00:00+05:00'); await page.reload();
    await text(page, '#attendance-current', /nonworking day/); await clickAction(page, 'Check in', /2026-10-24/);
    await setTime(page, '2026-10-25T04:00:00+05:00'); await page.reload(); await text(page, '#attendance-current', /earlier shift/); assert.equal(await page.locator('#check-in').isDisabled(), true);
    await clickAction(page, 'Check out', /2026-10-24/); await clickAction(page, 'Check in', /2026-10-25/);
    pass('nonworking-day and overnight policy in actual UI, original date retained, new date allowed after checkout');

    await page.evaluate(() => { window.originalSetItem = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key === 'hcm_attendance') throw new DOMException('Full', 'QuotaExceededError'); return window.originalSetItem.call(this, key, value); }; });
    const before = await page.evaluate(() => localStorage.getItem('hcm_attendance')); await setTime(page, '2026-10-25T10:00:00+05:00');
    await clickAction(page, 'Check out', /No changes were saved/); assert.equal(await page.evaluate(() => localStorage.getItem('hcm_attendance')), before);
    assert.equal(await page.locator('#check-out').isDisabled(), false); await page.evaluate(() => { Storage.prototype.setItem = window.originalSetItem; }); await clickAction(page, 'Check out', /saved/);
    await setTime(page, '2026-10-26T09:00:00+05:00'); await page.reload();
    await page.evaluate(() => { Storage.prototype.setItem = function (key, value) { if (key === 'hcm_attendance') throw new DOMException('Full', 'QuotaExceededError'); return window.originalSetItem.call(this, key, value); }; });
    const previous = await page.evaluate(() => localStorage.getItem('hcm_attendance')); await clickAction(page, 'Check in', /No changes were saved/); assert.equal(await page.evaluate(() => localStorage.getItem('hcm_attendance')), previous);
    await page.reload(); assert.equal(await page.locator('#check-in').isDisabled(), false);
    pass('failed checkout/check-in show clear errors and preserve records/action availability');

    await page.setViewportSize({ width: 390, height: 844 }); await clickAction(page, 'Check in', /saved/); await setTime(page, '2026-10-26T14:00:00+05:00'); await clickAction(page, 'Check out', /Present/);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.equal(await page.locator('#attendance-history').evaluate(n => n.scrollWidth > n.clientWidth), true);
    await page.screenshot({ path: path.join(os.tmpdir(), 'hcm-phase2-employee-mobile.png'), fullPage: true });
    await login(page, 'admin'); await page.setViewportSize({ width: 390, height: 844 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(os.tmpdir(), 'hcm-phase2-admin-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 }); await page.screenshot({ path: path.join(os.tmpdir(), 'hcm-phase2-admin-desktop.png'), fullPage: true }); pass('390px Employee actions and both histories usable without page overflow; screenshots captured');

    const bad = await fresh(); await appEval(bad.page, 'seed-test-only'); await bad.page.evaluate(() => localStorage.setItem('hcm_attendance', '[{"unfamiliar":true}]')); await bad.page.goto(`${base}/pages/admin.html`); await text(bad.page, '#fatal', /hcm_attendance.*unsupported or invalid/); assert.equal(await bad.page.evaluate(() => localStorage.getItem('hcm_attendance')), '[{"unfamiliar":true}]');
    const clean = await fresh(); assert.equal(await clean.page.locator('#setup-form').count(), 1); assert.deepEqual(await clean.page.evaluate(() => Object.keys(localStorage)), []);
    assert.deepEqual(errors, []); pass('unfamiliar attendance preserved and blocked; fresh delivered context empty; no JavaScript errors');
    console.log(`${checks} attendance browser scenarios passed, isolated contexts only.`);
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { for (const context of contexts) await context.close(); if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})();
