'use strict';
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createServer } = require('../tools/serve.cjs');
const { chromium } = require(process.env.HCM_PLAYWRIGHT_MODULE || 'playwright');

(async () => {
  const server = createServer(); await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${server.address().port}`;
  let browser;
  const failures = [], pageErrors = [], contexts = [];
  let checks = 0;
  const pass = label => { checks++; console.log(`PASS ${checks}: ${label}`); };
  async function fresh(options = {}) {
    const context = await browser.newContext(options); contexts.push(context);
    const page = await context.newPage(); page.on('pageerror', error => pageErrors.push(error.message));
    return { context, page };
  }
  async function fill(form, fields) { for (const [name, value] of Object.entries(fields)) await form.locator(`[name="${name}"]`).fill(String(value)); }
  async function text(page, selector, pattern) { await page.locator(selector).filter({ hasText: pattern }).waitFor({ state: 'visible' }); }
  async function login(page, email, password, destination) {
    await page.goto(base); await fill(page.locator('#login-form'), { email, password });
    await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await page.waitForURL(`**/pages/${destination}.html`);
  }
  async function logout(page) { await page.getByRole('button', { name: 'Log out', exact: true }).click(); await page.waitForURL('**/index.html'); }
  async function changePassword(page, currentPassword, newPassword) {
    await page.getByRole('button', { name: 'Change my password', exact: true }).click();
    await fill(page.locator('#password-form'), { currentPassword, newPassword, confirmPassword: newPassword });
    await page.getByRole('button', { name: 'Update my password', exact: true }).click(); await text(page, '#password-status', /has been changed/);
  }
  async function createEmployee(page, fields) {
    await fill(page.locator('#employee-form'), fields);
    await page.getByRole('button', { name: 'Add employee & create login', exact: true }).click(); await text(page, '#employee-status', /Employee added/);
  }
  try {
    browser = await chromium.launch({ headless: true, channel: process.env.HCM_BROWSER_CHANNEL || 'msedge' });
    const { page, context } = await fresh({ timezoneId: 'Asia/Karachi' });
    await page.goto(base);
    assert.equal(await page.locator('#setup-form').count(), 1);
    assert.deepEqual(await page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('hcm_'))), []);
    await page.getByRole('button', { name: 'Create company & Admin', exact: true }).click();
    await text(page, '#error-companyName', /Enter a company/); await text(page, '#error-workingDays', /at least one/);
    assert.equal(await page.locator('[aria-invalid="true"]').count() >= 7, true);
    await fill(page.locator('#setup-form'), { companyName: 'Browser Test Company', officeStart: '09:00', graceMinutes: 15, yearlyLeaveQuota: 20, name: 'Browser Admin', email: 'admin@example.test', password: 'Admin-Test-123', confirmPassword: 'Admin-Test-123' });
    for (const value of [1, 2, 3, 4, 5]) await page.locator(`[name="workingDays"][value="${value}"]`).check();
    await page.getByRole('button', { name: 'Create company & Admin', exact: true }).click(); await text(page, '#auth-status', /Company created/);
    assert.equal(await page.locator('#setup-form').count(), 0); await page.reload(); assert.equal(await page.locator('#login-form').count(), 1);
    pass('empty setup, required errors, company/Admin creation, no repeat setup after refresh');

    for (const name of ['admin', 'employees', 'leaves', 'settings', 'employee', 'payslip']) {
      await page.goto(`${base}/pages/${name}.html`); await page.waitForURL('**/index.html'); assert.equal(await page.locator('#login-form').count(), 1);
    }
    pass('all six protected pages redirect anonymous access to login');
    await login(page, 'ADMIN@EXAMPLE.TEST', 'Admin-Test-123', 'admin');
    const session = await page.evaluate(() => JSON.parse(localStorage.getItem('hcm_session'))); assert.deepEqual(Object.keys(session), ['userId']);
    await page.goto(`${base}/pages/employee.html`); await page.waitForURL('**/pages/admin.html');
    await page.getByRole('link', { name: 'Employees', exact: true }).click();
    await text(page, '#directory-empty', /No employees yet/); pass('Admin login, minimal session, role redirect and honest empty directory');

    await page.getByRole('button', { name: 'Add employee & create login', exact: true }).click(); await text(page, '#error-name', /Enter a name/);
    const employee = { name: 'Alex Engineering', email: 'alex@example.test', password: 'Employee-Test-123', department: 'Engineering', monthlySalary: 50000, joiningDate: '2026-10-01' };
    await fill(page.locator('#employee-form'), { ...employee, email: 'not-an-email', monthlySalary: -2 });
    await page.getByRole('button', { name: 'Add employee & create login', exact: true }).click(); await text(page, '#error-email', /valid email/); await text(page, '#error-monthlySalary', /greater than zero/);
    await fill(page.locator('#employee-form'), { email: 'ADMIN@EXAMPLE.TEST', monthlySalary: 50000 });
    await page.getByRole('button', { name: 'Add employee & create login', exact: true }).click(); await text(page, '#error-email', /already in use/);
    await createEmployee(page, employee);
    await createEmployee(page, { ...employee, name: 'Alex Finance', email: 'finance@example.test', department: 'Finance' });
    await createEmployee(page, { ...employee, name: '<img src=x onerror="window.xss=1"> Maya', email: 'maya@example.test' });
    assert.equal(await page.locator('#employee-rows tr').count(), 3); assert.equal(await page.locator('#employee-rows img').count(), 0);
    assert.equal(await page.evaluate(() => window.xss), undefined); await page.reload(); assert.equal(await page.locator('#employee-rows tr').count(), 3);
    pass('employee creation, inline required/email/duplicate/salary validation, safe text and refresh persistence');

    await page.locator('#search').fill(' ALEX '); await page.locator('#department-filter').selectOption('Engineering');
    assert.equal(await page.locator('#employee-rows tr').count(), 1); assert.ok((await page.locator('#employee-rows').innerText()).includes('alex@example.test'));
    await page.locator('#department-filter').selectOption('Finance'); assert.equal(await page.locator('#employee-rows tr').count(), 1);
    await page.locator('#search').fill('MAYA'); await text(page, '#directory-empty', /No employees match/);
    await page.locator('#search').fill('finance@'); assert.equal(await page.locator('#employee-rows tr').count(), 1);
    await page.locator('#search').fill(''); await page.locator('#department-filter').selectOption(''); pass('combined case-insensitive name/email search and department filter, including no matches');

    const id = await page.evaluate(() => JSON.parse(localStorage.getItem('hcm_users')).find(u => u.email === 'alex@example.test').id);
    await page.getByRole('button', { name: 'Edit Alex Engineering', exact: true }).click();
    assert.equal(await page.locator('#field-password').isVisible(), false);
    await fill(page.locator('#employee-form'), { name: 'Alex Revised', email: 'revised@example.test', department: 'Support', monthlySalary: 61000, joiningDate: '2026-10-05' });
    await page.getByRole('button', { name: 'Save employee', exact: true }).click(); await text(page, '#employee-status', /Employee updated/);
    await page.reload(); assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('hcm_users')).find(u => u.email === 'revised@example.test').id), id);
    await page.getByRole('button', { name: 'Edit Alex Revised', exact: true }).click();
    assert.equal(await page.locator('#monthlySalary').inputValue(), '61000'); assert.equal(await page.locator('#joiningDate').inputValue(), '2026-10-05');
    await page.getByRole('button', { name: 'Cancel edit', exact: true }).click(); pass('employee edit persists fields and stable ID, cancel edit restores add form');

    await page.getByRole('link', { name: 'Settings', exact: true }).click();
    await fill(page.locator('#settings-form'), { companyName: 'Updated <Company>', officeStart: '08:30', graceMinutes: '0', yearlyLeaveQuota: '25' });
    await page.locator('[name="workingDays"][value="5"]').uncheck(); await page.locator('[name="workingDays"][value="0"]').check();
    await page.getByRole('button', { name: 'Save settings', exact: true }).click(); await text(page, '#settings-status', /saved/);
    await page.reload(); assert.equal(await page.locator('#companyName').inputValue(), 'Updated <Company>'); assert.equal(await page.locator('#officeStart').inputValue(), '08:30'); assert.equal(await page.locator('#graceMinutes').inputValue(), '0'); assert.equal(await page.locator('#yearlyLeaveQuota').inputValue(), '25'); assert.equal(await page.locator('[name="workingDays"][value="0"]').isChecked(), true); assert.equal(await page.locator('[name="workingDays"][value="5"]').isChecked(), false);
    assert.equal(await page.locator('.company-label').innerText(), 'Updated <Company>');
    pass('company settings and working days persist on reload; company text rendered safely');

    await changePassword(page, 'Admin-Test-123', 'Admin-New-456'); await logout(page);
    await fill(page.locator('#login-form'), { email: 'admin@example.test', password: 'Admin-Test-123' }); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await text(page, '#auth-status', /incorrect/);
    await login(page, 'admin@example.test', 'Admin-New-456', 'admin'); await logout(page); pass('Admin own-password change, old-password rejection, new-password login and logout');

    await login(page, 'REVISED@EXAMPLE.TEST', 'Employee-Test-123', 'employee');
    assert.ok((await page.locator('#content dl').innerText()).includes('Alex Revised'));
    assert.equal(await page.getByRole('link', { name: 'Employees', exact: true }).count(), 0);
    for (const name of ['admin', 'employees', 'leaves', 'settings']) { await page.goto(`${base}/pages/${name}.html`); await page.waitForURL('**/pages/employee.html'); }
    await page.goto(`${base}/pages/payslip.html`); await text(page, 'h1', /My payslip/); await text(page, '#payslip', /Monthly calculation breakdown/);
    await page.goto(`${base}/pages/employee.html`); await page.reload(); assert.ok((await page.locator('#content dl').innerText()).includes('Alex Revised'));
    await page.setViewportSize({ width: 390, height: 844 });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'Employee dashboard fits mobile');
    await changePassword(page, 'Employee-Test-123', 'Employee-New-456'); await logout(page);
    await fill(page.locator('#login-form'), { email: 'revised@example.test', password: 'Employee-Test-123' }); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await text(page, '#auth-status', /incorrect/);
    await login(page, 'revised@example.test', 'Employee-New-456', 'employee'); await logout(page);
    pass('Employee usable edited login, all Admin-page redirects, own profile/payslip, password change and logout');

    await login(page, 'admin@example.test', 'Admin-New-456', 'admin'); await page.goto(`${base}/pages/employees.html`);
    page.once('dialog', dialog => dialog.dismiss()); await page.getByRole('button', { name: 'Delete Alex Revised', exact: true }).click(); assert.equal(await page.locator('#employee-rows tr').count(), 3);
    page.once('dialog', dialog => dialog.accept()); await page.getByRole('button', { name: 'Delete Alex Revised', exact: true }).click(); await text(page, '#directory-status', /Employee deleted/); assert.equal(await page.locator('#employee-rows tr').count(), 2);
    await page.reload(); assert.equal(await page.locator('#employee-rows tr').count(), 2);
    await logout(page); await fill(page.locator('#login-form'), { email: 'revised@example.test', password: 'Employee-New-456' }); await page.getByRole('button', { name: 'Sign in', exact: true }).click(); await text(page, '#auth-status', /incorrect/);
    await page.evaluate(id => localStorage.setItem('hcm_session', JSON.stringify({ userId: id })), id); await page.goto(`${base}/pages/employee.html`); await page.waitForURL('**/index.html');
    pass('delete cancellation/confirmation, deletion persistence, revoked login and deleted-user session redirect');

    await login(page, 'admin@example.test', 'Admin-New-456', 'admin');
    const second = await context.newPage(); await second.goto(`${base}/pages/settings.html`); await page.getByRole('button', { name: 'Log out', exact: true }).click(); await second.waitForURL('**/index.html');
    pass('cross-tab logout rechecks the active session');

    await login(page, 'admin@example.test', 'Admin-New-456', 'admin');
    for (const target of ['admin', 'employees', 'settings', 'leaves', 'payslip']) {
      await page.goto(`${base}/pages/${target}.html`); await page.setViewportSize({ width: 390, height: 844 });
      assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `${target}: no page-level horizontal overflow`);
    }
    await page.goto(`${base}/pages/employees.html`);
    assert.equal(await page.locator('#employee-table-wrap').evaluate(node => node.scrollWidth > node.clientWidth), true, 'table scrolls instead of squeezing text');
    await page.locator('#employee-table-wrap').evaluate(node => { node.scrollLeft = node.scrollWidth; });
    assert.equal(await page.getByRole('button', { name: 'Delete Alex Finance', exact: true }).isVisible(), true);
    await page.locator('#employee-table-wrap').evaluate(node => { node.scrollLeft = 0; });
    await page.screenshot({ path: path.join(os.tmpdir(), 'hcm-phase1-mobile.png'), fullPage: true });
    await page.setViewportSize({ width: 1280, height: 900 }); await page.screenshot({ path: path.join(os.tmpdir(), 'hcm-phase1-desktop.png'), fullPage: true });
    pass('Admin pages at 390px: navigation/forms fit, directory has its own scroll container');

    const malformed = await fresh();
    await malformed.context.addInitScript(() => localStorage.setItem('hcm_users', '{bad-json'));
    await malformed.page.goto(base); await text(malformed.page, '#fatal', /invalid JSON/);
    assert.equal(await malformed.page.locator('form').count(), 0); assert.equal(await malformed.page.evaluate(() => localStorage.getItem('hcm_users')), '{bad-json');
    const failedWrite = await fresh();
    await failedWrite.context.addInitScript(() => { const set = Storage.prototype.setItem; Storage.prototype.setItem = function (key, value) { if (key === 'hcm_leaves') throw new DOMException('Storage full', 'QuotaExceededError'); return set.call(this, key, value); }; });
    await failedWrite.page.goto(base);
    await fill(failedWrite.page.locator('#setup-form'), { companyName: 'Failure test', officeStart: '09:00', graceMinutes: '0', yearlyLeaveQuota: '0', name: 'Test', email: 'test@example.test', password: 'Test-Pass-123', confirmPassword: 'Test-Pass-123' });
    await failedWrite.page.locator('[name="workingDays"][value="1"]').check(); await failedWrite.page.getByRole('button', { name: 'Create company & Admin', exact: true }).click(); await text(failedWrite.page, '#auth-status', /No changes were saved/);
    assert.deepEqual(await failedWrite.page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('hcm_'))), []);
    const denied = await fresh(); await denied.context.addInitScript(() => Object.defineProperty(window, 'localStorage', { get() { throw new Error('denied'); } })); await denied.page.goto(base); await text(denied.page, '#fatal', /Browser storage is unavailable/);
    pass('malformed data preserved; denied/full storage produces clear errors and rolls back setup');

    const clean = await fresh({ viewport: { width: 390, height: 844 } }); await clean.page.goto(base); assert.equal(await clean.page.locator('#setup-form').count(), 1); assert.deepEqual(await clean.page.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('hcm_'))), []);
    assert.equal(await clean.page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, 'empty setup fits mobile');
    assert.deepEqual(pageErrors, []); pass('fresh delivered origin remains empty; no browser JavaScript errors');
    console.log(`Verified ${checks} browser scenarios using isolated contexts. Screenshots: ${path.join(os.tmpdir(), 'hcm-phase1-{mobile,desktop}.png')}`);
  } catch (error) { failures.push(error); console.error(error); process.exitCode = 1; }
  finally { for (const context of contexts) await context.close(); if (browser) await browser.close(); await new Promise(resolve => server.close(resolve)); }
})();
