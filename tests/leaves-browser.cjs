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
  const text = (p, selector, pattern) => p.locator(selector).filter({ hasText: pattern }).waitFor({ state: 'visible' });
  async function fresh() {
    const context = await browser.newContext({ timezoneId: 'Asia/Karachi' }); contexts.push(context);
    const page = await context.newPage(); page.on('pageerror', e => errors.push(e.message));
    await page.clock.setFixedTime(new Date('2026-10-26T12:00:00+05:00')); await page.goto(base); return { page, context };
  }
  const run = (p, fn, args) => p.evaluate(async ({ fn, args }) => {
    const app = HCM.create(HCMStorage.create(localStorage));
    if (fn === 'setup') {
      await app.setup({ companyName: 'Isolated Leave UI Tests', officeStart: '09:00', graceMinutes: 15, yearlyLeaveQuota: 5, workingDays: [1, 2, 3, 4, 5], name: 'Admin', email: 'admin@example.test', password: 'Admin-Test-123', confirmPassword: 'Admin-Test-123' });
      await app.login({ email: 'admin@example.test', password: 'Admin-Test-123' }); const ids = [];
      for (const name of ['first', 'second']) ids.push(await app.addEmployee({ name, email: `${name}@example.test`, password: 'Employee-Test-123', department: 'Test', monthlySalary: 50000, joiningDate: '2026-10-19' })); return ids;
    }
    if (fn === 'login') return app.login({ email: `${args}@example.test`, password: args === 'admin' ? 'Admin-Test-123' : 'Employee-Test-123' });
    if (fn === 'leaves') return app.leaves.list();
    if (fn === 'settings') { const c = app.getState().company; return app.saveSettings({ ...c, companyName: c.name, ...args }); }
    if (fn === 'scope') {
      const output = [];
      for (const action of [() => app.leaves.list({ employeeId: args }), () => app.leaves.balance(2026, args), () => app.leaves.request({ type: 'Casual', from: '2026-10-27', to: '2026-10-27', reason: 'x' }, args), () => app.leaves.prepareReview('any'), () => app.leaves.review('any', {})]) { try { action(); output.push(false); } catch (_) { output.push(true); } } return output;
    }
  }, { fn, args });
  async function login(p, name, target) { await run(p, 'login', name); await p.goto(`${base}/pages/${target || (name === 'admin' ? 'admin' : 'employee')}.html`); }
  async function fillRequest(p, from, to, reason = 'Personal <img src=x onerror=alert(1)>', type = 'Casual') {
    await p.locator('#leaveType').selectOption(type); await p.locator('#leaveFrom').fill(from); await p.locator('#leaveTo').fill(to); await p.locator('#leaveReason').fill(reason);
  }
  async function submit(p) { await p.getByRole('button', { name: 'Submit leave request', exact: true }).click(); }
  async function block(p, enabled) {
    await p.evaluate(enabled => {
      if (!window.originalSet) window.originalSet = Storage.prototype.setItem;
      Storage.prototype.setItem = enabled ? function(k, v) { if (k === 'hcm_leaves') throw new DOMException('Full', 'QuotaExceededError'); return window.originalSet.call(this, k, v); } : window.originalSet;
    }, enabled);
  }
  async function decide(p, decision, comment) {
    await p.locator('#reviewDecision').selectOption(decision); await p.locator('#reviewComment').fill(comment); await p.getByRole('button', { name: 'Save leave decision', exact: true }).click();
  }
  try {
    browser = await chromium.launch({ channel: process.env.HCM_BROWSER_CHANNEL || 'msedge', headless: true });
    const { page } = await fresh(); assert.deepEqual(await page.evaluate(() => Object.keys(localStorage)), []);
    const ids = await run(page, 'setup'); await login(page, 'first'); await text(page, '#leave-empty', /No leave requests/); await text(page, '#leave-balance', /Approved balance 5.*Pending 0.*Available to request 5/);
    await submit(page); await text(page, '#error-leaveType', /Choose/);
    await fillRequest(page, '2026-10-20', '2026-10-19'); await submit(page); await text(page, '#error-leaveTo', /on or after/);
    await fillRequest(page, '2026-10-24', '2026-10-25'); await submit(page); await text(page, '#error-leaveTo', /zero/);
    await fillRequest(page, '2026-12-31', '2027-01-01'); await submit(page); await text(page, '#error-leaveTo', /separate requests per year/);
    await fillRequest(page, '2026-10-19', '2026-10-20'); await text(page, '#leave-preview', /2 configured working days/); await submit(page); await text(page, '#leave-status', /saved as Pending/);
    await text(page, '#leave-balance', /Approved balance 5.*Pending 2.*Available to request 3/);
    await page.reload(); await text(page, '#leave-rows', /Personal <img/); assert.equal(await page.locator('#leave-rows img').count(), 0);
    await fillRequest(page, '2026-10-20', '2026-10-21'); await submit(page); await text(page, '#error-leaveFrom', /overlaps/);
    pass('Employee fields/range errors, working-day preview, safe pending history, reservation and refresh persistence');

    await login(page, 'second'); await text(page, '#leave-empty', /No leave requests/); await fillRequest(page, '2026-10-22', '2026-10-22', 'Second only', 'Sick'); await submit(page); await text(page, '#leave-status', /1 working days/);
    await login(page, 'first'); assert.ok((await run(page, 'scope', ids[1])).every(Boolean)); assert.equal((await run(page, 'leaves')).length, 1); assert.equal(await page.locator('#review-form, #leaveEmployee').count(), 0);
    await page.goto(`${base}/pages/leaves.html`); await page.waitForURL('**/pages/employee.html'); pass('Employee own reads/mutations and Admin route guard; second account isolated');

    await login(page, 'admin'); await text(page, '#leave-overview', /2 pending leave requests/); assert.equal(await page.locator('#leave-form').count(), 0);
    await page.goto(`${base}/pages/leaves.html`); assert.equal(await page.locator('#leave-rows tr').count(), 2);
    await page.locator('#leaveEmployee').selectOption(ids[0]); await page.locator('#leaveFilterStatus').selectOption('Pending'); await page.getByRole('button', { name: 'Apply leave filters', exact: true }).click(); assert.equal(await page.locator('#leave-rows tr').count(), 1);
    await page.getByRole('button', { name: /^Review first/ }).click(); await text(page, '#review-days', /Current working-day count: 2. Saved count: 2/);
    await decide(page, 'Approved', '   '); await text(page, '#error-reviewComment', /nonblank/);
    const before = await page.evaluate(() => localStorage.getItem('hcm_leaves')); await block(page, true); await decide(page, 'Approved', 'Approved <safe>'); await text(page, '#review-status', /No changes were saved/); assert.equal(await page.evaluate(() => localStorage.getItem('hcm_leaves')), before); assert.equal(await page.locator('#reviewComment').inputValue(), 'Approved <safe>');
    await block(page, false); await decide(page, 'Approved', 'Approved <safe>'); await text(page, '#leave-filter-status', /Leave approved/); await text(page, '#leave-empty', /No leave requests/);
    await page.locator('#leaveFilterStatus').selectOption('Approved'); await page.getByRole('button', { name: 'Apply leave filters', exact: true }).click(); await text(page, '#leave-rows', /Approved <safe>/); assert.equal(await page.getByRole('button', { name: /^Review first/ }).count(), 0);
    pass('Admin combined filters, explicit count, required comment, failed approval preservation, approval and finalized UI');

    await login(page, 'first'); await text(page, '#leave-rows', /Approved <safe>/); await text(page, '#leave-balance', /Approved 2.*Approved balance 3.*Pending 0.*Available to request 3/);
    await text(page, '#attendance-rows', /Approved leave \(derived\)/); assert.equal(await page.locator('#attendance-rows tr').count(), 5); await text(page, '#attendance-overview', /3 elapsed working-day absences, 2 approved leave/);
    pass('full Employee request → Admin approval → Employee status/comment/balance and derived absence integration');

    await login(page, 'admin', 'leaves'); await page.locator('#leaveEmployee').selectOption(ids[1]); await page.getByRole('button', { name: 'Apply leave filters', exact: true }).click(); await page.getByRole('button', { name: /^Review second/ }).click();
    await decide(page, 'Rejected', 'Please choose another day'); await text(page, '#leave-filter-status', /Leave rejected/);
    await login(page, 'second'); await text(page, '#leave-rows', /Rejected.*Please choose another day/s); await text(page, '#leave-balance', /Approved balance 5.*Pending 0/);
    await fillRequest(page, '2026-10-22', '2026-10-22', 'Replacement', 'Other'); await submit(page); await text(page, '#leave-status', /saved as Pending/); pass('Admin rejection comment, released quota, rejected range replacement');

    await login(page, 'first'); await fillRequest(page, '2026-10-23', '2026-10-26', 'Retain this request');
    const raw = await page.evaluate(() => localStorage.getItem('hcm_leaves')); await block(page, true); await submit(page); await text(page, '#leave-status', /No changes were saved/); assert.equal(await page.locator('#leaveReason').inputValue(), 'Retain this request'); assert.equal(await page.evaluate(() => localStorage.getItem('hcm_leaves')), raw); await text(page, '#leave-balance', /Pending 0/);
    await block(page, false); await submit(page); await text(page, '#leave-status', /2 working days/); pass('failed request retains input/history/balance; successful retry reserves once');

    await login(page, 'admin', 'leaves'); await page.locator('#leaveEmployee').selectOption(ids[0]); await page.locator('#leaveFilterStatus').selectOption('Pending'); await page.getByRole('button', { name: 'Apply leave filters', exact: true }).click();
    await page.getByRole('button', { name: /^Review first/ }).click(); await run(page, 'settings', { workingDays: [1, 2, 3, 4, 5, 6] });
    await decide(page, 'Approved', 'Checked new count'); await text(page, '#review-status', /stale/);
    await page.getByRole('button', { name: /^Review first/ }).click(); await text(page, '#review-days', /Current working-day count: 3. Saved count: 2. Settings changed/);
    await run(page, 'settings', { yearlyLeaveQuota: 4 }); await page.getByRole('button', { name: /^Review first/ }).click(); await text(page, '#review-days', /Approval unavailable.*quota exceeded/); assert.equal(await page.locator('#reviewDecision option[value="Approved"]').isDisabled(), true);
    await run(page, 'settings', { yearlyLeaveQuota: 5 }); await page.getByRole('button', { name: /^Review first/ }).click(); await decide(page, 'Approved', 'Three days reviewed'); await text(page, '#leave-filter-status', /Leave approved/);
    await page.screenshot({ path: path.join(os.tmpdir(), 'hcm-phase3-admin-desktop.png'), fullPage: true });
    pass('stale review rejection, settings-changed day count explicitly shown, reduced quota blocks approval, current approval saves');

    await login(page, 'first'); await text(page, '#leave-balance', /Approved 5.*Approved balance 0.*Pending 0.*Available to request 0/);
    await fillRequest(page, '2026-10-27', '2026-10-27'); await submit(page); await text(page, '#error-leaveTo', /quota exceeded/);
    await page.locator('#leaveYear').fill('2027'); await page.getByRole('button', { name: 'Show yearly balance', exact: true }).click(); await text(page, '#leave-balance', /2027:.*Approved balance 5/);
    await page.locator('#leaveYear').fill('2026'); await page.getByRole('button', { name: 'Show yearly balance', exact: true }).click();
    await page.getByRole('button', { name: 'Check in', exact: true }).click(); await text(page, '#attendance-status', /Check-in saved/);
    const row = page.locator('#attendance-rows tr').filter({ hasText: '2026-10-26' }); assert.equal(await row.count(), 1); await text(page, '#attendance-rows', /Checked in/); assert.ok(!(await row.innerText()).includes('Approved leave'));
    pass('exact quota, over-quota inline error, yearly balance isolation; actual open attendance replaces synthetic leave row');

    await page.setViewportSize({ width: 390, height: 844 }); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true); assert.equal(await page.locator('#leave-history').evaluate(n => n.scrollWidth > n.clientWidth), true);
    await page.locator('#leaveType').scrollIntoViewIfNeeded(); await page.screenshot({ path: path.join(os.tmpdir(), 'hcm-phase3-employee-mobile.png'), fullPage: true });
    await page.locator('#leave-form').screenshot({ path: path.join(os.tmpdir(), 'hcm-phase3-employee-form-mobile.png') });
    await login(page, 'admin', 'leaves'); await page.getByRole('button', { name: /^Review second/ }).click(); assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.screenshot({ path: path.join(os.tmpdir(), 'hcm-phase3-admin-mobile.png'), fullPage: true }); pass('390px Employee form/history and Admin filters/review fit page; tables scroll; screenshots captured');
    await page.locator('#leave-review').screenshot({ path: path.join(os.tmpdir(), 'hcm-phase3-admin-review-mobile.png') });

    const bad = await fresh(); await run(bad.page, 'setup'); await bad.page.evaluate(() => localStorage.setItem('hcm_leaves', '[{"unfamiliar":true}]')); await bad.page.goto(`${base}/pages/leaves.html`); await text(bad.page, '#fatal', /hcm_leaves.*unsupported or invalid/); assert.equal(await bad.page.evaluate(() => localStorage.getItem('hcm_leaves')), '[{"unfamiliar":true}]');
    const clean = await fresh(); assert.equal(await clean.page.locator('#setup-form').count(), 1); assert.deepEqual(await clean.page.evaluate(() => Object.keys(localStorage)), []); assert.deepEqual(errors, []); pass('malformed leave storage preserved and blocked; clean first run empty; no browser JavaScript errors');
    console.log(`${checks} leave browser scenarios passed, isolated contexts only.`);
  } catch (error) { console.error(error); process.exitCode = 1; }
  finally { for (const context of contexts) await context.close(); if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})();
