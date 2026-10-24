'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
function memory() {
  const data = new Map();
  return { data, getItem: k => data.has(k) ? data.get(k) : null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
}
function context(adapter = memory()) {
  const sandbox = vm.createContext({ crypto: webcrypto, TextEncoder, Date });
  for (const file of ['storage.js', 'attendance.js', 'leaves.js', 'payroll.js', 'announcements.js', 'helper.js', 'hcm.js']) vm.runInContext(fs.readFileSync(path.join(root, 'js', file), 'utf8'), sandbox);
  const storage = sandbox.HCMStorage.create(adapter), app = sandbox.HCM.create(storage);
  return { sandbox, storage, app, adapter, fresh: () => sandbox.HCM.create(sandbox.HCMStorage.create(adapter)) };
}
const setup = () => ({ companyName: 'Isolated Test Company', officeStart: '09:00', graceMinutes: '15', yearlyLeaveQuota: '20', workingDays: [1, 2, 3, 4, 5], name: 'Test Admin', email: 'admin@example.test', password: 'Admin-Test-123', confirmPassword: 'Admin-Test-123' });
const employee = (data = {}) => ({ name: 'Test Employee', email: 'employee@example.test', password: 'Employee-Test-123', department: 'Engineering', monthlySalary: '50000', joiningDate: '2026-10-01', ...data });
const adminLogin = app => app.login({ email: 'ADMIN@EXAMPLE.TEST', password: 'Admin-Test-123' });
async function ready() { const c = context(); await c.app.setup(setup()); await adminLogin(c.app); return c; }
const plain = value => JSON.parse(JSON.stringify(value));
const hasField = field => error => !!error.fields?.[field];

test('empty first run, exact keys, no seed records; setup persists without session', async () => {
  const { app, storage, adapter, fresh } = context();
  assert.equal(app.getState().initialized, false); assert.equal(adapter.data.size, 0);
  await app.setup(setup());
  assert.equal(app.getState().initialized, true);
  assert.equal(app.getState().users.length, 1); assert.equal(app.currentUser(), null);
  assert.deepEqual([...adapter.data.keys()].sort(), ['hcm_announcements', 'hcm_attendance', 'hcm_company', 'hcm_leaves', 'hcm_users']);
  for (const name of ['attendance', 'leaves', 'announcements']) assert.deepEqual(plain(storage.read(name)), []);
  assert.equal(fresh().getState().company.officeStart, '09:00');
  const raw = adapter.getItem('hcm_users'); assert.ok(!raw.includes(setup().password));
  const before = [...adapter.data.entries()];
  await assert.rejects(app.setup({ ...setup(), companyName: 'Overwrite attempt' }), /already complete/);
  assert.deepEqual([...adapter.data.entries()], before);
});

test('setup validates all required fields, company rules and password confirmation', async () => {
  for (const field of ['companyName', 'officeStart', 'graceMinutes', 'yearlyLeaveQuota', 'name', 'email', 'password']) {
    const c = context(); await assert.rejects(c.app.setup({ ...setup(), [field]: '' }), hasField(field)); assert.equal(c.adapter.data.size, 0);
  }
  for (const [field, value] of [['email', 'bad'], ['officeStart', '25:00'], ['graceMinutes', '-1'], ['yearlyLeaveQuota', '1.2'], ['workingDays', []], ['workingDays', [1, 1]], ['password', 'short'], ['confirmPassword', 'different']]) {
    await assert.rejects(context().app.setup({ ...setup(), [field]: value }), hasField(field));
  }
  const c = context(); await c.app.setup({ ...setup(), graceMinutes: '0', yearlyLeaveQuota: '0', workingDays: [0] }); assert.equal(c.app.getState().company.graceMinutes, 0);
});

test('Admin login is case-insensitive; wrong credentials rejected; session contains only ID; logout persists', async () => {
  const c = context(); await c.app.setup(setup());
  await assert.rejects(c.app.login({ email: 'admin@example.test', password: 'wrong' }), /incorrect/);
  assert.equal(await adminLogin(c.app), 'Admin');
  assert.deepEqual(Object.keys(c.storage.read('session')), ['userId']);
  assert.equal(c.fresh().currentUser().role, 'Admin');
  c.app.logout(); assert.equal(c.fresh().currentUser(), null); assert.equal(c.adapter.getItem('hcm_session'), null);
});

test('employee CRUD creates working login; editing preserves ID and password; deletion disables session', async () => {
  const c = await ready(), id = await c.app.addEmployee(employee());
  const original = c.app.employees()[0];
  c.app.editEmployee(id, employee({ name: 'Changed', email: 'new@example.test', department: 'Finance', monthlySalary: '60000', joiningDate: '2026-10-12' }));
  const updated = c.fresh().employees()[0]; assert.equal(updated.id, id); assert.deepEqual(plain(updated.password), plain(original.password)); assert.equal(updated.monthlySalary, 60000); assert.equal(updated.joiningDate, '2026-10-12');
  c.app.logout();
  await assert.rejects(c.app.login({ email: 'employee@example.test', password: employee().password }), /incorrect/);
  await c.app.login({ email: 'NEW@example.test', password: employee().password }); assert.equal(c.app.currentUser().name, 'Changed');
  const employeeSession = c.adapter.getItem('hcm_session');
  await adminLogin(c.app); c.app.deleteEmployee(id);
  c.adapter.setItem('hcm_session', employeeSession); assert.equal(c.fresh().currentUser(), null); assert.equal(c.app.route('employee'), 'index');
  await assert.rejects(c.app.login({ email: 'new@example.test', password: employee().password }), /incorrect/);
});

test('employee required fields, invalid email/date/salary and case-insensitive duplicate emails rejected', async () => {
  const c = await ready();
  for (const field of ['name', 'email', 'password', 'department', 'monthlySalary', 'joiningDate']) await assert.rejects(c.app.addEmployee(employee({ [field]: '' })), hasField(field));
  for (const [field, value] of [['email', 'invalid'], ['email', 'ADMIN@EXAMPLE.TEST'], ['monthlySalary', 0], ['monthlySalary', -1], ['monthlySalary', 'Infinity'], ['joiningDate', '2026-02-30'], ['joiningDate', '2026-2-1'], ['password', 'short']]) await assert.rejects(c.app.addEmployee(employee({ [field]: value })), hasField(field));
  const first = await c.app.addEmployee(employee());
  await assert.rejects(c.app.addEmployee(employee({ email: 'EMPLOYEE@EXAMPLE.TEST' })), hasField('email'));
  assert.throws(() => c.app.editEmployee(first, employee({ email: 'AdMin@example.test' })), hasField('email'));
  c.app.editEmployee(first, employee({ email: 'EMPLOYEE@example.test' }));
  assert.equal(c.app.employees().length, 1);
});

test('combined name/email search and department filter use actual employee records', async () => {
  const c = await ready();
  await c.app.addEmployee(employee({ name: 'Alex Test', email: 'alex.eng@example.test' }));
  await c.app.addEmployee(employee({ name: 'Alex Finance', email: 'alex.finance@example.test', department: 'Finance' }));
  await c.app.addEmployee(employee({ name: 'Maya Test', email: 'maya@example.test' }));
  assert.equal(c.app.employees(' ALEX ', 'Engineering').length, 1);
  assert.equal(c.app.employees('finance@', 'Engineering').length, 0);
  assert.equal(c.app.employees('FINANCE@', 'Finance').length, 1);
  assert.equal(c.app.employees('', 'Engineering').length, 2);
  assert.equal(c.app.employees().length, 3);
});

test('both roles change own password; incorrect current, short and mismatched passwords fail', async () => {
  const c = await ready(); await c.app.addEmployee(employee());
  for (const [email, oldPassword] of [['admin@example.test', setup().password], ['employee@example.test', employee().password]]) {
    c.app.logout(); await c.app.login({ email, password: oldPassword });
    await assert.rejects(c.app.changePassword({ currentPassword: 'wrong', newPassword: 'New-Test-123', confirmPassword: 'New-Test-123' }), hasField('currentPassword'));
    await assert.rejects(c.app.changePassword({ currentPassword: oldPassword, newPassword: 'short', confirmPassword: 'short' }), hasField('newPassword'));
    await assert.rejects(c.app.changePassword({ currentPassword: oldPassword, newPassword: 'New-Test-123', confirmPassword: 'different' }), hasField('confirmPassword'));
    await c.app.changePassword({ currentPassword: oldPassword, newPassword: 'New-Test-123', confirmPassword: 'New-Test-123' });
    c.app.logout(); await assert.rejects(c.app.login({ email, password: oldPassword }), /incorrect/);
    await c.fresh().login({ email, password: 'New-Test-123' }); assert.equal(c.app.currentUser().email, email);
  }
});

test('every protected route requires login; Employee forbidden Admin routes and mutations', async () => {
  const c = context();
  const pages = ['admin', 'employees', 'leaves', 'settings', 'employee', 'payslip'];
  pages.forEach(page => assert.equal(c.app.route(page), 'index'));
  await c.app.setup(setup()); pages.forEach(page => assert.equal(c.app.route(page), 'index'));
  await adminLogin(c.app); assert.equal(c.app.route('employee'), 'admin');
  await c.app.addEmployee(employee()); c.app.logout(); await c.app.login({ email: employee().email, password: employee().password });
  for (const page of ['admin', 'employees', 'leaves', 'settings']) assert.equal(c.app.route(page), 'employee');
  for (const page of ['employee', 'payslip']) assert.equal(c.app.route(page), null);
  assert.throws(() => c.app.employees(), /permission/); await assert.rejects(c.app.addEmployee(employee()), /permission/);
  assert.throws(() => c.app.editEmployee('missing', employee()), /permission/);
  assert.throws(() => c.app.deleteEmployee('missing'), /permission/);
  assert.throws(() => c.app.saveSettings(setup()), /permission/);
});

test('company settings validate and persist across fresh application instances', async () => {
  const c = await ready(), id = c.app.getState().company.id;
  for (const [field, value] of [['companyName', ''], ['officeStart', 'oops'], ['graceMinutes', ''], ['graceMinutes', '1.5'], ['yearlyLeaveQuota', '-1'], ['workingDays', []]]) assert.throws(() => c.app.saveSettings({ ...setup(), [field]: value }), hasField(field));
  c.app.saveSettings({ ...setup(), companyName: 'Updated Company', officeStart: '08:30', graceMinutes: '0', yearlyLeaveQuota: '25', workingDays: [0, 2, 4] });
  const saved = c.fresh().getState().company; assert.equal(saved.id, id); assert.equal(saved.name, 'Updated Company'); assert.deepEqual(plain(saved.workingDays), [0, 2, 4]); assert.equal(saved.yearlyLeaveQuota, 25);
});

test('malformed JSON, unsupported schemas and partial collections are preserved and block setup', async () => {
  for (const raw of ['{bad json', '{}', 'null', '[]']) {
    const adapter = memory(); adapter.setItem('hcm_users', raw); const c = context(adapter);
    assert.throws(() => c.app.getState(), /invalid|incomplete|unsupported/);
    await assert.rejects(c.app.setup(setup()), /invalid|incomplete|unsupported/); assert.equal(adapter.getItem('hcm_users'), raw);
  }
  const c = await ready(), before = c.adapter.getItem('hcm_users'); c.adapter.setItem('hcm_session', JSON.stringify({ userId: 'bad', password: 'never allowed' }));
  assert.throws(() => c.app.logout(), /invalid|unsupported/); assert.equal(c.adapter.getItem('hcm_users'), before);
  const partial = context(); partial.adapter.setItem('hcm_attendance', '[]'); await assert.rejects(partial.app.setup(setup()), /incomplete/); assert.equal(partial.adapter.data.size, 1);
});

test('unknown company/account/password fields block editing and preserve every raw collection', async () => {
  const c = await ready(); await c.app.addEmployee(employee());
  const clean = new Map(c.adapter.data);
  for (const [key, change] of [
    ['hcm_company', value => { value.unfamiliarSetting = 'keep this'; }],
    ['hcm_users', value => { value[0].unfamiliarAccount = 'keep this'; }],
    ['hcm_users', value => { value[1].unfamiliarAccount = 'keep this'; }],
    ['hcm_users', value => { value[0].password.unfamiliarHashVersion = 'keep this'; }]
  ]) {
    c.adapter.data.clear(); for (const [k, v] of clean) c.adapter.data.set(k, v);
    const value = JSON.parse(c.adapter.getItem(key)); change(value); c.adapter.setItem(key, JSON.stringify(value));
    const before = [...c.adapter.data];
    assert.throws(() => c.app.getState(), /unsupported|invalid/);
    assert.throws(() => c.app.saveSettings({ ...setup(), companyName: 'Must not erase fields' }), /unsupported|invalid/);
    await assert.rejects(c.app.changePassword({ currentPassword: setup().password, newPassword: 'New-Test-123', confirmPassword: 'New-Test-123' }), /unsupported|invalid/);
    await assert.rejects(c.app.setup(setup()), /unsupported|invalid/);
    assert.deepEqual([...c.adapter.data], before);
  }
});

test('blocked storage and failed setup writes produce errors with no partial setup', async () => {
  const blocked = context({ getItem() { throw new Error('denied'); } }); assert.throws(() => blocked.app.getState(), /storage is unavailable/);
  const adapter = memory(), original = adapter.setItem; adapter.setItem = (key, value) => { if (key === 'hcm_leaves') throw new Error('quota'); original(key, value); };
  const c = context(adapter); await assert.rejects(c.app.setup(setup()), /No changes were saved/); assert.equal(adapter.data.size, 0);
});

test('failed employee/settings/password writes retain previously saved data', async () => {
  const c = await ready(), before = c.adapter.getItem('hcm_users'), set = c.adapter.setItem;
  c.adapter.setItem = () => { throw new Error('full'); };
  await assert.rejects(c.app.addEmployee(employee()), /No changes were saved/); assert.equal(c.adapter.getItem('hcm_users'), before);
  assert.throws(() => c.app.saveSettings({ ...setup(), companyName: 'Unsaved' }), /No changes were saved/); assert.equal(c.app.getState().company.name, setup().companyName);
  await assert.rejects(c.app.changePassword({ currentPassword: setup().password, newPassword: 'New-Test-123', confirmPassword: 'New-Test-123' }), /No changes were saved/); assert.equal(c.adapter.getItem('hcm_users'), before);
  c.adapter.setItem = set;
});

test('local dates use local calendar components, including near-midnight values', () => {
  const c = context(), d = new Date(2026, 9, 24, 0, 1);
  assert.equal(c.sandbox.HCM.localDate(d), '2026-10-24');
  assert.equal(c.sandbox.HCMStorage.validDate('2024-02-29'), true); assert.equal(c.sandbox.HCMStorage.validDate('2026-02-29'), false);
});

test('exactly seven HTML files; every page loads shared storage/domain/UI/guards', () => {
  const actual = fs.readdirSync(root).filter(f => f.endsWith('.html')).concat(fs.readdirSync(path.join(root, 'pages')).filter(f => f.endsWith('.html')).map(f => `pages/${f}`)).sort();
  assert.deepEqual(actual, ['index.html', 'pages/admin.html', 'pages/employee.html', 'pages/employees.html', 'pages/leaves.html', 'pages/payslip.html', 'pages/settings.html']);
  for (const file of actual) {
    const source = fs.readFileSync(path.join(root, file), 'utf8');
    for (const script of ['storage.js', 'attendance.js', 'leaves.js', 'payroll.js', 'announcements.js', 'helper.js', 'hcm.js', 'ui.js', 'pages.js']) assert.ok(source.includes(script), `${file} loads ${script}`);
    assert.ok(source.includes('name="viewport"')); assert.ok(source.includes('data-page='));
  }
});
