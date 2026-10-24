'use strict';
process.env.TZ = 'Asia/Karachi';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const settings = { companyName: 'Payroll <safe>', officeStart: '09:00', graceMinutes: 15, yearlyLeaveQuota: 366, workingDays: [1, 2, 3, 4, 5, 6], name: 'Admin', email: 'admin@example.test', password: 'Admin-Test-123', confirmPassword: 'Admin-Test-123' };
async function ready({ joiningDate = '2026-01-01', salary = 26000, workingDays = settings.workingDays, time = '2026-10-25T12:00:00+05:00' } = {}) {
  const data = new Map(), adapter = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
  const sandbox = vm.createContext({ crypto: webcrypto, Date, TextEncoder });
  for (const file of ['storage.js', 'attendance.js', 'leaves.js', 'payroll.js', 'announcements.js', 'helper.js', 'hcm.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), sandbox);
  const storage = sandbox.HCMStorage.create(adapter), options = { clock: () => new Date(time) }, app = sandbox.HCM.create(storage, options);
  await app.setup({ ...settings, workingDays }); await app.login({ email: settings.email, password: settings.password });
  const ids = [];
  for (const name of ['first', 'second']) ids.push(await app.addEmployee({ name, email: `${name}@example.test`, password: 'Employee-Test-123', department: 'Test', monthlySalary: salary, joiningDate }));
  return { data, adapter, sandbox, storage, app, ids, setTime: value => { time = value; }, fresh: () => sandbox.HCM.create(sandbox.HCMStorage.create(adapter), options) };
}
const login = (c, name = 'first') => c.app.login({ email: `${name}@example.test`, password: name === 'admin' ? settings.password : 'Employee-Test-123' });
const slip = (c, year = 2026, month = 9, employeeId = c.ids[0]) => c.app.payroll.slip({ year, month, employeeId });
function attendance(c, date, hours = 8, late = false, employeeId = c.ids[0]) {
  const start = new Date(`${date}T${late ? '10' : '09'}:00:00+05:00`), cutoff = new Date(`${date}T09:15:00+05:00`), duration = hours === null ? null : hours * 3600000;
  return { id: `${employeeId}:${date}`, employeeId, date, checkIn: start.toISOString(), checkOut: duration === null ? null : new Date(start.getTime() + duration).toISOString(), isLate: late, status: duration === null ? 'Checked in' : hours < 5 ? 'Half day' : late ? 'Late' : 'Present', durationMs: duration, offsetMinutes: -300, lateAfter: cutoff.toISOString() };
}
function fillMonth(c, year = 2026, month = 9, omitted = [], halves = [], late = []) {
  const from = `${year}-${String(month).padStart(2, '0')}-01`, to = `${from.slice(0, 8)}${new Date(year, month, 0).getDate()}`;
  const dates = c.sandbox.HCMLeaves.workingDates(from, to, c.storage.state().company.workingDays);
  c.storage.write({ attendance: dates.filter(d => !omitted.includes(d)).map(d => attendance(c, d, halves.includes(d) ? 4 : 8, late.includes(d))) }); return dates;
}
function leave(c, from, to = from, status = 'Approved') {
  const admin = c.storage.state().users.find(u => u.role === 'Admin').id;
  const record = { id: `${from}:${status}`, employeeId: c.ids[0], type: 'Casual', from, to, days: c.sandbox.HCMLeaves.workingDates(from, to, c.storage.state().company.workingDays).length, reason: 'Test', status, comment: status === 'Pending' ? '' : 'Reviewed', requestedAt: '2026-01-01T00:00:00.000Z', reviewedAt: status === 'Pending' ? null : '2026-01-02T00:00:00.000Z', reviewedBy: status === 'Pending' ? null : admin };
  c.storage.write({ leaves: [...c.storage.state().leaves, record] });
}

test('PDF example: 26000 / 26; two absent and two halves give 3000 deduction and 23000 net; no writes', async () => {
  const c = await ready(); fillMonth(c, 2026, 9, ['2026-09-01', '2026-09-02'], ['2026-09-03', '2026-09-04']);
  const before = [...c.data], s = slip(c);
  assert.equal(s.workingDays, 26); assert.equal(s.dailyRate, 1000); assert.equal(s.absentDays, 2); assert.equal(s.halfDays, 2); assert.equal(s.deduction, 3000); assert.equal(s.net, 23000); assert.equal(s.status, 'Final');
  assert.deepEqual([...c.data], before); assert.equal(slip({ ...c, app: c.fresh() }).net, 23000);
});
test('no absences, all absent, half-days and late-only full shifts', async () => {
  const c = await ready(); assert.equal(slip(c).net, 0); assert.equal(slip(c).absentDays, 26);
  const dates = fillMonth(c); assert.equal(slip(c).net, 26000); assert.equal(slip(c).deduction, 0);
  fillMonth(c, 2026, 9, [], [], dates); assert.equal(slip(c).net, 26000);
  fillMonth(c, 2026, 9, [], dates, dates); assert.equal(slip(c).deduction, 13000); assert.equal(slip(c).net, 13000);
});
test('approved paid leave excuses absence, pending/rejected do not; actual half-day/open wins', async () => {
  const c = await ready(); leave(c, '2026-09-01', '2026-09-03'); leave(c, '2026-09-04', '2026-09-04', 'Pending'); leave(c, '2026-09-05', '2026-09-05', 'Rejected');
  c.storage.write({ attendance: [attendance(c, '2026-09-01', 4, true), attendance(c, '2026-09-02', null)] });
  const s = slip(c); assert.equal(s.paidLeaveDays, 1); assert.equal(s.halfDays, 1); assert.equal(s.absentDays, 23); assert.equal(s.deduction, 23500); assert.equal(s.status, 'Provisional'); assert.deepEqual(Array.from(s.openDates), ['2026-09-02']);
});
test('nonworking half/open attendance creates no deductions, extra pay or unresolved status', async () => {
  const c = await ready(); fillMonth(c);
  c.storage.write({ attendance: [...c.storage.read('attendance'), attendance(c, '2026-09-06', 1), attendance(c, '2026-09-13', null)] });
  const s = slip(c); assert.equal(s.halfDays, 0); assert.equal(s.net, 26000); assert.equal(s.status, 'Final'); assert.equal(s.openDates.length, 0);
});
test('overnight/overdue credits only start day; open prior month blocks final, later month still absent', async () => {
  const c = await ready(); c.storage.write({ attendance: [attendance(c, '2026-09-30', 72)] });
  assert.equal(slip(c).absentDays, 25); assert.equal(slip(c).halfDays, 0); assert.equal(slip(c, 2026, 10).absentDays, 21);
  c.storage.write({ attendance: [attendance(c, '2026-09-30', null)] }); assert.equal(slip(c).status, 'Provisional'); assert.equal(slip(c, 2026, 10).openDates.length, 0);
});
test('custom weeks, leap February, year boundaries and maximum year work', async () => {
  const c = await ready({ joiningDate: '2020-01-01', workingDays: [0, 2], time: '2029-01-02T12:00:00+05:00' });
  assert.equal(slip(c, 2028, 2).workingDays, 9); assert.equal(slip(c, 2028, 12).workingDays, 9); assert.equal(slip(c, 2029, 1).status, 'Provisional');
  c.setTime('9999-12-31T12:00:00+05:00'); assert.ok(slip(c, 9999, 12).workingDays > 0);
});
test('joining month prorates gross with full-month denominator; before joining has zero entitlement', async () => {
  const c = await ready({ joiningDate: '2026-09-16' }); const s = slip(c);
  assert.equal(s.workingDays, 26); assert.equal(s.eligibleDays, 13); assert.equal(s.gross, 13000); assert.equal(s.deduction, 13000); assert.equal(s.net, 0); assert.equal(s.prorated, true);
  const early = slip(c, 2026, 8); assert.equal(early.gross, 0); assert.equal(early.net, 0); assert.equal(early.status, 'No payable entitlement');
  c.storage.write({ attendance: [attendance(c, '2026-09-01', 1), attendance(c, '2026-09-16', 8)] }); assert.equal(slip(c).halfDays, 0); assert.equal(slip(c).net, 1000);
});
test('current month is full-month projection; today/future never absent; completed today half-day deducts', async () => {
  const c = await ready({ time: '2026-09-03T15:00:00+05:00' });
  c.storage.write({ attendance: [attendance(c, '2026-09-03', 4)] }); leave(c, '2026-09-04');
  const s = slip(c); assert.equal(s.gross, 26000); assert.equal(s.absentDays, 2); assert.equal(s.halfDays, 1); assert.equal(s.paidLeaveDays, 1); assert.equal(s.net, 23500); assert.equal(s.status, 'Provisional');
  assert.throws(() => slip(c, 2026, 10), e => /Future-month/.test(e.fields.payrollMonth));
});
test('finite precision and zero-working-day guard, with no schema relaxation', async () => {
  const c = await ready({ salary: 10000 }); fillMonth(c, 2026, 9, ['2026-09-01'], ['2026-09-02']);
  const s = slip(c); assert.equal(s.deduction, (10000 / 26) * 1.5); assert.equal(s.net, 10000 - (10000 / 26) * 1.5);
  const fractional = await ready({ salary: 0.1, workingDays: [1, 2, 3, 4, 5] });
  assert.equal(slip(fractional).workingDays, 22); assert.equal(slip(fractional).deduction, 0.1); assert.equal(slip(fractional).net, 0);
  const large = await ready({ salary: Number.MAX_VALUE, workingDays: [0, 2] });
  assert.equal(slip(large).deduction, Number.MAX_VALUE); assert.equal(slip(large).net, 0);
  const state = c.storage.state(); state.company.workingDays = [];
  const service = c.sandbox.HCMPayroll.create({ state: () => state }, () => state.users.find(u => u.role === 'Admin'), { clock: () => new Date('2026-10-25T12:00:00+05:00') });
  const zero = service.slip({ year: 2026, month: 9, employeeId: c.ids[0] }); assert.equal(zero.status, 'Cannot calculate'); assert.equal(zero.net, null); assert.equal(zero.dailyRate, null);
  assert.throws(() => c.storage.write({ company: state.company }), /invalid/);
});
test('current salary, working days, joining date and approved rules recalculate history without snapshots', async () => {
  const c = await ready(); fillMonth(c); const before = c.data.get('hcm_attendance');
  const u = c.app.employees()[0]; c.app.editEmployee(u.id, { ...u, monthlySalary: 52000, joiningDate: '2026-09-16' });
  assert.equal(slip(c).gross, 26000); assert.equal(slip(c).net, 26000);
  c.app.saveSettings({ ...settings, workingDays: [0] }); assert.equal(slip(c).workingDays, 4); assert.equal(slip(c).eligibleDays, 2); assert.equal(slip(c).net, 0); assert.equal(c.data.get('hcm_attendance'), before);
});
test('Admin all/Employee own direct service scope, manipulated IDs, anonymous/deleted sessions and unavailable users', async () => {
  const c = await ready(); assert.equal(c.app.payroll.employeeOptions().length, 2); assert.equal(slip(c, 2026, 9, c.ids[1]).employee.id, c.ids[1]);
  assert.throws(() => slip(c, 2026, 9, 'missing'), e => !!e.fields.payrollEmployee);
  await login(c); assert.equal(c.app.payroll.employeeOptions().length, 1); assert.equal(c.app.payroll.slip({ year: 2026, month: 9 }).employee.id, c.ids[0]);
  for (const id of [c.ids[1], 'bogus', '', null, {}, []]) assert.throws(() => slip(c, 2026, 9, id), /own/);
  c.app.logout(); assert.throws(() => slip(c), /permission/); assert.throws(() => c.app.payroll.employeeOptions(), /permission/);
  c.storage.write({ session: { userId: 'deleted' } }); assert.throws(() => slip(c), /permission/);
  await login(c, 'admin'); c.app.deleteEmployee(c.ids[0]); assert.throws(() => slip(c), e => !!e.fields.payrollEmployee); c.storage.write({ session: { userId: c.ids[0] } }); assert.throws(() => slip(c), /permission/);
});
test('invalid period/clock/future activity, malformed/unavailable storage and denied writes are honest and read-only', async () => {
  const c = await ready(); const before = [...c.data];
  for (const [year, month] of [[2026, 0], [2026, 13], [2026, '1.5'], [2026, ''], ['', 9], [99, 9], [10000, 9], [Infinity, 9], ['2026e0', 9]]) assert.throws(() => slip(c, year, month), e => !!e.fields);
  c.setTime('invalid'); assert.throws(() => slip(c), /clock/); c.setTime('2026-10-25T12:00:00+05:00');
  c.adapter.setItem = () => { throw new Error('blocked writes'); }; assert.equal(slip(c).net, 0); assert.deepEqual([...c.data], before);
  for (const key of ['hcm_attendance', 'hcm_leaves', 'hcm_users', 'hcm_company']) {
    const original = c.data.get(key); c.data.set(key, '{bad'); assert.throws(() => slip(c), /invalid JSON/); assert.equal(c.data.get(key), '{bad'); c.data.set(key, '[{}]'); assert.throws(() => slip(c), /invalid structure/); assert.equal(c.data.get(key), '[{}]'); c.data.set(key, original);
  }
  const get = c.adapter.getItem; c.adapter.getItem = () => { throw new Error('denied'); }; assert.throws(() => slip(c), /unavailable/); c.adapter.getItem = get;
  c.data.set('hcm_attendance', JSON.stringify([attendance(c, '2026-10-26', 8)])); assert.throws(() => slip(c, 2026, 10), /ahead/);
});
