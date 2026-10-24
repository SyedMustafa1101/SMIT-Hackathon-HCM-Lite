'use strict';
process.env.TZ = 'Asia/Karachi';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const settings = { companyName: 'Leave Tests', officeStart: '09:00', graceMinutes: 15, yearlyLeaveQuota: 20, workingDays: [1, 2, 3, 4, 5], name: 'Admin', email: 'admin@example.test', password: 'Admin-Test-123', confirmPassword: 'Admin-Test-123' };
const plain = value => JSON.parse(JSON.stringify(value));
const input = (from = '2026-10-19', to = from, type = 'Casual') => ({ type, from, to, reason: 'Personal <test> reason' });
const field = key => error => !!error.fields?.[key];
function context() {
  const data = new Map(); let time = '2026-10-19T12:00:00+05:00';
  const adapter = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
  const sandbox = vm.createContext({ crypto: webcrypto, Date, TextEncoder });
  for (const file of ['storage.js', 'attendance.js', 'leaves.js', 'payroll.js', 'announcements.js', 'helper.js', 'hcm.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), sandbox);
  const storage = sandbox.HCMStorage.create(adapter), options = { clock: () => new Date(time) };
  return { data, adapter, storage, sandbox, app: sandbox.HCM.create(storage, options), setTime: value => { time = value; }, fresh: () => sandbox.HCM.create(sandbox.HCMStorage.create(adapter), options) };
}
async function ready(quota = 20, workingDays = [1, 2, 3, 4, 5]) {
  const c = context(); await c.app.setup({ ...settings, yearlyLeaveQuota: quota, workingDays }); await admin(c);
  c.ids = [];
  for (const name of ['first', 'second']) c.ids.push(await c.app.addEmployee({ name, email: `${name}@example.test`, password: 'Employee-Test-123', department: 'Test', monthlySalary: 50000, joiningDate: '2026-10-19' }));
  return c;
}
const admin = c => c.app.login({ email: settings.email, password: settings.password });
const employee = (c, name = 'first') => c.app.login({ email: `${name}@example.test`, password: 'Employee-Test-123' });
function review(c, id, status = 'Approved', comment = 'Reviewed <safe>') {
  const view = c.app.leaves.prepareReview(id);
  return c.app.leaves.review(id, { token: view.token, status, comment });
}

test('empty leave collection stays empty; same-day request has stable persisted fields and working-day preview', async () => {
  const c = await ready(); await employee(c);
  assert.equal(c.app.leaves.list().length, 0); assert.equal(c.storage.read('leaves').length, 0);
  assert.equal(c.app.leaves.preview(input()).days, 1);
  const l = c.app.leaves.request(input());
  assert.match(l.id, /^[a-f0-9]{32}$/); assert.equal(l.employeeId, c.ids[0]); assert.equal(l.days, 1); assert.equal(l.status, 'Pending'); assert.equal(l.reviewedAt, null);
  assert.deepEqual(plain(c.fresh().leaves.list()[0]), plain(c.app.leaves.list()[0]));
  assert.deepEqual(plain(c.app.leaves.balance(2026)), { year: 2026, quota: 20, approved: 0, pending: 1, balance: 20, available: 19 });
});

test('all fields, invalid/reversed dates, zero working days, pre-joining and cross-year reject without writes', async () => {
  const c = await ready(); await employee(c);
  for (const [patch, key] of [[{ type: '' }, 'leaveType'], [{ type: 'Medical proof' }, 'leaveType'], [{ reason: '  ' }, 'leaveReason'], [{ from: '' }, 'leaveFrom'], [{ to: '2026-02-30' }, 'leaveTo'], [{ from: '2026-10-20' }, 'leaveTo'], [{ from: '2026-10-18' }, 'leaveFrom'], [{ from: '2026-10-24', to: '2026-10-25' }, 'leaveTo'], [{ from: '2026-12-31', to: '2027-01-01' }, 'leaveTo']]) {
    assert.throws(() => c.app.leaves.request({ ...input(), ...patch }), field(key)); assert.equal(c.storage.read('leaves').length, 0);
  }
  assert.throws(() => c.app.leaves.request(input('2026-12-31', '2027-01-01')), e => /separate requests per year/.test(e.fields.leaveTo));
});

test('inclusive configured working-day count, including custom Sundays and leap-year dates', async () => {
  const c = await ready(20, [0, 2]); await employee(c);
  assert.equal(c.app.leaves.request(input('2026-10-19', '2026-10-27')).days, 3);
  const dates = c.sandbox.HCMLeaves.workingDates('2028-02-27', '2028-02-29', [0, 2]);
  assert.deepEqual(plain(dates), ['2028-02-27', '2028-02-29']);
  assert.equal(c.sandbox.HCMLeaves.workingDates('9999-12-31', '9999-12-31', [0, 1, 2, 3, 4, 5, 6]).length, 1);
});

test('pending/approved calendar overlap blocked, rejected replacement allowed', async () => {
  const c = await ready(); await employee(c); const l = c.app.leaves.request(input('2026-10-23', '2026-10-26'));
  assert.throws(() => c.app.leaves.request(input('2026-10-26', '2026-10-27')), field('leaveFrom'));
  await admin(c); review(c, l.id); await employee(c);
  assert.throws(() => c.app.leaves.request(input('2026-10-22', '2026-10-23')), field('leaveFrom'));
  const next = c.app.leaves.request(input('2026-10-28')); await admin(c); review(c, next.id, 'Rejected'); await employee(c);
  assert.equal(c.app.leaves.request(input('2026-10-28', '2026-10-29')).status, 'Pending');
});

test('shared exact quota, multiple pending reservations, over-quota and calendar-year isolation', async () => {
  const c = await ready(3); await employee(c);
  c.app.leaves.request(input()); c.app.leaves.request(input('2026-10-20', '2026-10-21', 'Sick'));
  assert.equal(c.app.leaves.balance(2026).available, 0); assert.equal(c.app.leaves.balance(2026).balance, 3);
  assert.throws(() => c.app.leaves.request(input('2026-10-22', '2026-10-22', 'Other')), field('leaveTo'));
  assert.equal(c.app.leaves.request(input('2027-01-01')).days, 1);
  assert.equal(c.app.leaves.balance(2027).pending, 1); assert.equal(c.app.leaves.balance(2026).pending, 3);
  assert.throws(() => c.app.leaves.balance('bad'), field('leaveYear'));
  const zero = await ready(0); await employee(zero); assert.throws(() => zero.app.leaves.request(input()), field('leaveTo'));
});

test('approve/reject requires comment, finalized decision immutable and approved balance counted exactly once', async () => {
  const c = await ready(); await employee(c); const l = c.app.leaves.request(input()); await admin(c);
  const v = c.app.leaves.prepareReview(l.id), before = c.data.get('hcm_leaves');
  assert.throws(() => c.app.leaves.review(l.id, { token: v.token, status: 'Approved', comment: '  ' }), field('reviewComment'));
  assert.throws(() => c.app.leaves.review(l.id, { token: v.token, status: 'Other', comment: 'x' }), field('reviewDecision'));
  assert.equal(c.data.get('hcm_leaves'), before);
  const final = review(c, l.id); assert.equal(final.comment, 'Reviewed <safe>'); assert.ok(final.reviewedBy); assert.ok(final.reviewedAt);
  const saved = c.data.get('hcm_leaves');
  assert.throws(() => review(c, l.id), /finalized/); assert.throws(() => c.app.leaves.review(l.id, { token: v.token, status: 'Rejected', comment: 'change' }), /finalized/);
  assert.equal(c.data.get('hcm_leaves'), saved);
  await employee(c); assert.equal(c.app.leaves.balance(2026).approved, 1); assert.equal(c.app.leaves.balance(2026).pending, 0); assert.equal(c.app.leaves.balance(2026).balance, 19);
});

test('stale settings or requests invalidate review; current count explicitly prepared before approval', async () => {
  const c = await ready(); await employee(c); const l = c.app.leaves.request(input('2026-10-23', '2026-10-26')); await admin(c);
  const old = c.app.leaves.prepareReview(l.id); assert.equal(old.days, 2);
  c.app.saveSettings({ ...settings, workingDays: [1, 2, 3, 4, 5, 6] });
  assert.throws(() => c.app.leaves.review(l.id, { token: old.token, status: 'Approved', comment: 'ok' }), /stale/);
  const v = c.app.leaves.prepareReview(l.id); assert.equal(v.days, 3); assert.equal(v.record.days, 2);
  assert.equal(review(c, l.id).days, 3);
  await employee(c); const next = c.app.leaves.request(input('2026-10-28')); await admin(c); const v2 = c.app.leaves.prepareReview(next.id);
  await employee(c, 'second'); c.app.leaves.request(input()); await admin(c);
  assert.throws(() => c.app.leaves.review(next.id, { token: v2.token, status: 'Rejected', comment: 'ok' }), /stale/);
});

test('approval revalidates reduced quota and other pending reservations; rejection releases them', async () => {
  const c = await ready(3); await employee(c); const a = c.app.leaves.request(input()), b = c.app.leaves.request(input('2026-10-20', '2026-10-21'));
  await admin(c); c.app.saveSettings({ ...settings, yearlyLeaveQuota: 1 });
  const raw = c.data.get('hcm_leaves'); assert.match(c.app.leaves.prepareReview(a.id).approvalError, /quota exceeded/);
  assert.throws(() => review(c, a.id), field('leaveTo')); assert.equal(c.data.get('hcm_leaves'), raw);
  review(c, b.id, 'Rejected'); review(c, a.id);
  assert.equal(c.app.leaves.balance(2026, c.ids[0]).available, 0);
});

test('approval rechecks joining, working days, overlap and employment; deleted requests retained and rejectable', async () => {
  const c = await ready(); await employee(c); const l = c.app.leaves.request(input()); await admin(c);
  const user = c.app.employees().find(u => u.id === c.ids[0]);
  c.app.editEmployee(user.id, { ...user, joiningDate: '2026-10-20' }); assert.match(c.app.leaves.prepareReview(l.id).approvalError, /joining date/); assert.throws(() => review(c, l.id), field('leaveFrom'));
  c.app.editEmployee(user.id, user); c.app.saveSettings({ ...settings, workingDays: [0] }); assert.match(c.app.leaves.prepareReview(l.id).approvalError, /zero/); assert.throws(() => review(c, l.id), field('leaveTo'));
  c.app.saveSettings(settings);
  const records = c.storage.read('leaves'); c.storage.write({ leaves: [...records, { ...records[0], id: 'external-overlap' }] }); assert.match(c.app.leaves.prepareReview(l.id).approvalError, /overlaps/);
  c.storage.write({ leaves: records }); c.app.deleteEmployee(user.id); assert.throws(() => review(c, l.id), /no longer exists/);
  assert.match(c.app.leaves.employeeOptions().find(u => u.id === user.id).name, /Deleted employee/);
  assert.equal(review(c, l.id, 'Rejected').status, 'Rejected'); assert.equal(c.app.leaves.list().length, 1); assert.equal(c.app.attendance.report().rows.some(r => r.employeeId === user.id), false);
});

test('settings recalculate approved balance honestly without mutating finalized saved fields', async () => {
  const c = await ready(); await employee(c); const l = c.app.leaves.request(input('2026-10-23', '2026-10-26')); await admin(c); review(c, l.id);
  const raw = c.data.get('hcm_leaves'); c.app.saveSettings({ ...settings, workingDays: [1, 5, 6], yearlyLeaveQuota: 1 });
  const b = c.app.leaves.balance(2026, c.ids[0]); assert.equal(b.approved, 3); assert.equal(b.balance, -2); assert.equal(c.app.leaves.list()[0].days, 2); assert.equal(c.app.leaves.list()[0].currentDays, 3); assert.equal(c.data.get('hcm_leaves'), raw);
});

test('Admin all, Employee own and anonymous scope on every read and mutation including stale session', async () => {
  const c = await ready(); assert.throws(() => c.app.leaves.request(input()), /permission/); assert.throws(() => c.app.leaves.preview(input()), /permission/);
  await employee(c); const a = c.app.leaves.request(input());
  for (const action of [() => c.app.leaves.request(input('2026-10-20'), c.ids[1]), () => c.app.leaves.request({ ...input('2026-10-20'), employeeId: c.ids[1] }), () => c.app.leaves.list({ employeeId: c.ids[1] }), () => c.app.leaves.balance(2026, c.ids[1]), () => c.app.leaves.preview(input(), c.ids[1]), () => c.app.leaves.prepareReview(a.id), () => c.app.leaves.review(a.id, {}), () => c.app.leaves.employeeOptions()]) assert.throws(action, /own|permission/);
  await employee(c, 'second'); c.app.leaves.request(input()); assert.equal(c.app.getState().leaves.length, 1); assert.equal(c.app.leaves.list()[0].employeeId, c.ids[1]); assert.equal(c.app.leaves.overview().pending, 1);
  await admin(c); assert.equal(c.app.leaves.list().length, 2); assert.equal(c.app.leaves.list({ employeeId: c.ids[0], status: 'Pending' }).length, 1); assert.equal(c.app.getState().leaves.length, 2); assert.equal(c.app.leaves.overview().pending, 2);
  assert.throws(() => c.app.leaves.list({ status: 'bogus' }), /valid leave status/);
  c.app.logout(); assert.equal(c.app.getState().leaves.length, 0);
  for (const action of [() => c.app.leaves.list(), () => c.app.leaves.balance(2026), () => c.app.leaves.overview(), () => c.app.leaves.request(input()), () => c.app.leaves.prepareReview(a.id), () => c.app.leaves.review(a.id, {})]) assert.throws(action, /permission/);
  await admin(c); c.storage.write({ session: { userId: 'deleted' } }); assert.throws(() => c.app.leaves.list(), /permission/);
});

test('approved leave excuses absence only on configured dates; pending/rejected do not; actual attendance wins', async () => {
  const c = await ready(); await employee(c);
  const approved = c.app.leaves.request(input('2026-10-19', '2026-10-21'));
  const rejected = c.app.leaves.request(input('2026-10-22')); c.app.leaves.request(input('2026-10-23'));
  c.app.attendance.checkIn(); c.setTime('2026-10-19T13:00:00+05:00'); c.app.attendance.checkOut();
  const actualRaw = c.data.get('hcm_attendance'); await admin(c); review(c, approved.id); review(c, rejected.id, 'Rejected');
  c.setTime('2026-10-26T12:00:00+05:00');
  const report = c.app.attendance.report({ employeeId: c.ids[0], from: '2026-10-19', to: '2026-10-26' });
  assert.equal(report.summary.absent, 2); assert.equal(report.summary.approvedLeave, 2); assert.equal(report.summary.records, 1); assert.equal(report.summary.halfDays, 1); assert.equal(report.summary.late, 1);
  assert.equal(report.rows.filter(r => r.date === '2026-10-19').length, 1); assert.equal(report.rows.find(r => r.date === '2026-10-19').status, 'Half day'); assert.equal(c.data.get('hcm_attendance'), actualRaw);
  assert.equal(report.rows.some(r => ['2026-10-24', '2026-10-25'].includes(r.date)), false);
  await employee(c); assert.equal(c.app.attendance.report({ from: '2026-10-20', to: '2026-10-20' }).rows[0].status, 'Approved leave');
});

test('leave today gets a derived row, future leave stays in request history; open attendance takes precedence', async () => {
  const c = await ready(); await employee(c); const today = c.app.leaves.request(input()), future = c.app.leaves.request(input('2026-10-20'));
  await admin(c); review(c, today.id); review(c, future.id); assert.equal(c.app.leaves.overview().approvedToday, 1);
  assert.equal(c.app.attendance.report({ employeeId: c.ids[0] }).rows.length, 1);
  assert.equal(c.app.attendance.overview().daily.approvedLeave, 1);
  await employee(c); c.app.attendance.checkIn(); const r = c.app.attendance.report(); assert.equal(r.rows.length, 1); assert.equal(r.summary.open, 1); assert.equal(r.summary.approvedLeave, 0);
});

test('approved-today dashboard follows current joining date and helper coverage without changing saved approval', async () => {
  const c = await ready(); await employee(c);
  const leave = c.app.leaves.request(input());
  c.app.attendance.checkIn();
  await admin(c); review(c, leave.id);
  const raw = c.data.get('hcm_leaves'), user = c.app.employees().find(u => u.id === c.ids[0]);
  // Coverage counts even with attendance, but never before current employment.
  assert.equal(c.app.leaves.overview().approvedToday, 1);
  assert.match(c.app.helper.query('Who is on leave today?').answer, /1 current employees/);
  c.app.editEmployee(user.id, { ...user, joiningDate: '2026-10-20' });
  assert.equal(c.app.leaves.overview().approvedToday, 0);
  assert.match(c.app.helper.query('Who is on leave today?').answer, /0 current employees/);
  await employee(c); assert.equal(c.app.leaves.overview().approvedToday, 0);
  await admin(c); c.app.editEmployee(user.id, user);
  c.app.saveSettings({ ...settings, workingDays: [0] });
  assert.equal(c.app.leaves.overview().approvedToday, 0);
  c.app.saveSettings(settings); c.app.deleteEmployee(user.id);
  assert.equal(c.app.leaves.overview().approvedToday, 0);
  assert.equal(c.data.get('hcm_leaves'), raw);
});

test('strict leave validator preserves unfamiliar/malformed fields and rejects duplicate IDs', async () => {
  const c = await ready(); await employee(c); const good = plain(c.app.leaves.request(input()));
  const changes = [l => { l.extra = 1; }, l => { delete l.id; }, l => { l.employeeId = ''; }, l => { l.from = '2026-02-30'; }, l => { l.to = '2027-01-01'; }, l => { l.days = 0; }, l => { l.days = 2; }, l => { l.days = 1.5; }, l => { l.type = 'Unknown'; }, l => { l.reason = ' '; }, l => { l.requestedAt = 'bad'; }, l => { l.comment = 'already reviewed'; }, l => { l.reviewedBy = 'admin'; }, l => { l.status = 'Approved'; }, l => { l.status = 'Rejected'; l.comment = 'x'; l.reviewedBy = 'admin'; l.reviewedAt = '2026-10-18T00:00:00.000Z'; }];
  for (const mutate of changes) {
    const bad = { ...good }; mutate(bad); const raw = JSON.stringify([bad]); c.data.set('hcm_leaves', raw);
    assert.throws(() => c.storage.state(), /hcm_leaves.*unsupported or invalid/); assert.throws(() => c.app.leaves.request(input()), /unsupported or invalid/); assert.equal(c.data.get('hcm_leaves'), raw);
  }
  for (const value of [[{}], [good, good]]) { const raw = JSON.stringify(value); c.data.set('hcm_leaves', raw); assert.throws(() => c.storage.state(), /unsupported or invalid/); assert.equal(c.data.get('hcm_leaves'), raw); }
  c.data.set('hcm_leaves', '{bad'); assert.throws(() => c.storage.state(), /invalid JSON/); assert.equal(c.data.get('hcm_leaves'), '{bad');
});

test('failed request/approval/rejection writes retain original records and balances; retry and fresh state correct', async () => {
  const c = await ready(); await employee(c); const set = c.adapter.setItem;
  const block = () => { c.adapter.setItem = (k, v) => { if (k === 'hcm_leaves') throw new Error('full'); set(k, v); }; };
  block(); assert.throws(() => c.app.leaves.request(input()), /No changes were saved/); assert.equal(c.data.get('hcm_leaves'), '[]'); assert.equal(c.app.leaves.balance(2026).pending, 0);
  c.adapter.setItem = set; const l = c.app.leaves.request(input()); const before = c.data.get('hcm_leaves'); await admin(c);
  block(); for (const decision of ['Approved', 'Rejected']) assert.throws(() => review(c, l.id, decision), /No changes were saved/);
  assert.equal(c.data.get('hcm_leaves'), before); assert.equal(c.fresh().leaves.list()[0].status, 'Pending'); assert.equal(c.app.leaves.balance(2026, c.ids[0]).balance, 20);
  c.adapter.setItem = set; review(c, l.id); assert.equal(c.fresh().leaves.balance(2026, c.ids[0]).approved, 1);
});

test('backward review clock rejected with no mutation', async () => {
  const c = await ready(); await employee(c); const l = c.app.leaves.request(input()); await admin(c);
  const raw = c.data.get('hcm_leaves'); c.setTime('2026-10-18T12:00:00+05:00'); assert.throws(() => review(c, l.id), /precede submission/); assert.equal(c.data.get('hcm_leaves'), raw);
});
