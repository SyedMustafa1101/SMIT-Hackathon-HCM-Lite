'use strict';
process.env.TZ = 'Asia/Karachi';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const plain = value => JSON.parse(JSON.stringify(value));
const settings = { companyName: 'Attendance Test', officeStart: '09:00', graceMinutes: '15', yearlyLeaveQuota: '20', workingDays: [1, 2, 3, 4, 5], name: 'Admin Test', email: 'admin@example.test', password: 'Admin-Test-123', confirmPassword: 'Admin-Test-123' };
function context() {
  const data = new Map(); let time = '2026-10-19T09:15:00.000+05:00';
  const adapter = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
  const sandbox = vm.createContext({ crypto: webcrypto, Date, TextEncoder });
  for (const file of ['storage.js', 'attendance.js', 'hcm.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), sandbox);
  const storage = sandbox.HCMStorage.create(adapter), options = { clock: () => new Date(time) };
  return { data, adapter, sandbox, storage, app: sandbox.HCM.create(storage, options), setTime: value => { time = value; }, fresh: () => sandbox.HCM.create(sandbox.HCMStorage.create(adapter), options) };
}
async function ready() {
  const c = context(); await c.app.setup(settings); await c.app.login({ email: settings.email, password: settings.password });
  c.ids = [];
  for (const [name, joiningDate] of [['First', '2026-10-19'], ['Second', '2026-10-22']]) c.ids.push(await c.app.addEmployee({ name, email: `${name.toLowerCase()}@example.test`, password: 'Employee-Test-123', department: 'Test', monthlySalary: 50000, joiningDate }));
  return c;
}
const login = (c, name = 'first') => c.app.login({ email: `${name}@example.test`, password: 'Employee-Test-123' });
const admin = c => c.app.login({ email: settings.email, password: settings.password });

test('attendance API denies anonymous/Admin actions and Employee cross-user reads/mutations', async () => {
  const empty = context();
  for (const action of ['checkIn', 'checkOut', 'current', 'report', 'overview', 'employeeOptions']) assert.throws(() => empty.app.attendance[action](), /permission/);
  const c = await ready();
  for (const action of ['checkIn', 'checkOut', 'current']) assert.throws(() => c.app.attendance[action](), /permission/);
  assert.equal(c.app.attendance.report().summary.records, 0);
  await login(c); c.app.attendance.checkIn();
  for (const action of ['checkIn', 'checkOut']) assert.throws(() => c.app.attendance[action](c.ids[1]), /only their own/);
  assert.throws(() => c.app.attendance.report({ employeeId: c.ids[1] }), /only their own/);
  assert.throws(() => c.app.attendance.employeeOptions(), /permission/);
  assert.equal(c.app.attendance.report({ employeeId: c.ids[0] }).summary.records, 1);
  c.app.logout(); assert.equal(c.app.getState().attendance.length, 0);
});

test('grace cutoff is strict to the millisecond and stored cutoff/lateness survive settings edits', async () => {
  const c = await ready(); await login(c);
  const exact = c.app.attendance.checkIn(); assert.equal(exact.isLate, false); assert.equal(exact.status, 'Checked in'); assert.equal(exact.durationMs, null);
  c.app.attendance.checkOut(); await admin(c); c.setTime('2026-10-22T09:15:00.001+05:00'); await login(c, 'second');
  const late = c.app.attendance.checkIn(); assert.equal(late.isLate, true); assert.equal(late.status, 'Checked in');
  await admin(c); c.app.saveSettings({ ...settings, officeStart: '12:00', graceMinutes: '60' });
  await login(c, 'second'); c.setTime('2026-10-22T14:15:00.001+05:00'); const finished = c.app.attendance.checkOut();
  assert.equal(finished.status, 'Late'); assert.equal(finished.isLate, true); assert.equal(finished.lateAfter, late.lateAfter);
});

test('4h59m is half day; exactly five hours is Present; lateness retained on half day', async () => {
  const c = await ready(); await login(c);
  c.setTime('2026-10-19T09:15:00.001+05:00'); c.app.attendance.checkIn(); c.setTime('2026-10-19T14:14:00.001+05:00');
  const short = c.app.attendance.checkOut(); assert.equal(short.durationMs, 299 * 60000); assert.equal(short.status, 'Half day'); assert.equal(short.isLate, true);
  c.setTime('2026-10-20T09:15:00+05:00'); c.app.attendance.checkIn(); c.setTime('2026-10-20T14:15:00+05:00');
  const full = c.app.attendance.checkOut(); assert.equal(full.durationMs, 5 * 3600000); assert.equal(full.status, 'Present'); assert.equal(full.isLate, false);
  const report = c.app.attendance.report({ from: '2026-10-19', to: '2026-10-20' }); assert.equal(report.summary.halfDays, 1); assert.equal(report.summary.late, 1); assert.equal(report.summary.durationMs, 599 * 60000);
});

test('daily uniqueness, duplicate/open/checkout-without-checkin/repeat-checkout prevention', async () => {
  const c = await ready(); await login(c);
  assert.throws(() => c.app.attendance.checkOut(), /No open check-in/);
  const record = c.app.attendance.checkIn(); assert.throws(() => c.app.attendance.checkIn(), /already checked in/);
  assert.equal(c.fresh().attendance.current().open.status, 'Checked in');
  const completed = c.app.attendance.checkOut(); assert.equal(completed.id, record.id); assert.equal(completed.durationMs, 0);
  assert.throws(() => c.app.attendance.checkOut(), /No open check-in/); assert.throws(() => c.app.attendance.checkIn(), /already have an attendance record/);
  assert.equal(c.storage.read('attendance').length, 1);
});

test('nonworking-day check-in is allowed; overnight checkout keeps original date and prevents overlapping shifts', async () => {
  const c = await ready(); await login(c); c.setTime('2026-10-24T23:00:00+05:00');
  assert.equal(c.app.attendance.current().workingDay, false); const open = c.app.attendance.checkIn();
  c.setTime('2026-10-25T04:00:00+05:00'); assert.throws(() => c.app.attendance.checkIn(), /open shift/);
  const out = c.app.attendance.checkOut(); assert.equal(out.id, open.id); assert.equal(out.date, '2026-10-24'); assert.equal(out.durationMs, 5 * 3600000); assert.equal(out.status, 'Late');
  assert.equal(c.app.attendance.checkIn().date, '2026-10-25');
  c.setTime('2026-10-27T10:00:00+05:00'); c.app.attendance.checkOut();
  const absent = c.app.attendance.report({ from: '2026-10-24', to: '2026-10-27' }).rows.filter(a => a.derived).map(a => a.date);
  assert.deepEqual(plain(absent), ['2026-10-26']); // Long shifts credit only their start date, no automatic multi-day credit.
});

test('reject before joining, invalid clocks and backward-clock actions without mutating saved data', async () => {
  const c = await ready(); await login(c); c.setTime('2026-10-18T10:00:00+05:00'); assert.throws(() => c.app.attendance.checkIn(), /before your joining/);
  c.setTime('2026-10-19T09:15:00+05:00'); c.app.attendance.checkIn(); const before = c.data.get('hcm_attendance');
  c.setTime('2026-10-19T09:14:59+05:00'); assert.throws(() => c.app.attendance.checkOut(), /ahead of the device clock/); assert.equal(c.data.get('hcm_attendance'), before);
  c.setTime('invalid'); assert.throws(() => c.app.attendance.current(), /clock is invalid/);
});

test('local dates around midnight/year boundary remain distinct from UTC dates; saved offsets survive viewer timezone changes', async () => {
  const c = await ready(); await login(c); c.setTime('2026-12-31T23:59:59+05:00'); const open = c.app.attendance.checkIn();
  c.setTime('2027-01-01T00:00:00+05:00'); c.app.attendance.checkOut(); const next = c.app.attendance.checkIn();
  assert.equal(open.date, '2026-12-31'); assert.equal(next.date, '2027-01-01'); assert.ok(next.checkIn.startsWith('2026-12-31T19:'));
  const oldTZ = process.env.TZ;
  try { process.env.TZ = 'America/Los_Angeles'; assert.equal(c.storage.read('attendance').length, 2); } finally { process.env.TZ = oldTZ; }
});

test('absence excludes nonworking, before-joining, today and future; no attendance write; future leave exclusion hook is reusable', async () => {
  const c = await ready(); await login(c);
  c.setTime('2026-10-20T09:00:00+05:00'); c.app.attendance.checkIn(); c.setTime('2026-10-20T15:00:00+05:00'); c.app.attendance.checkOut();
  c.setTime('2026-10-21T09:00:00+05:00'); c.app.attendance.checkIn(); c.setTime('2026-10-26T12:00:00+05:00');
  const raw = c.data.get('hcm_attendance'), report = c.app.attendance.report({ from: '2026-10-16', to: '2026-10-30' });
  assert.deepEqual(plain(report.rows.filter(a => a.derived).map(a => a.date)), ['2026-10-23', '2026-10-22', '2026-10-19']);
  assert.equal(report.summary.open, 1); assert.equal(report.summary.halfDays, 0); assert.equal(c.data.get('hcm_attendance'), raw);
  await admin(c); const state = c.app.getState(), all = c.app.attendance.report({ from: '2026-10-16', to: '2026-10-30' }); assert.equal(all.summary.absent, 5);
  const excluded = c.sandbox.HCMAttendance.deriveAbsences({ employees: state.users.filter(u => u.role === 'Employee'), attendance: state.attendance, workingDays: state.company.workingDays, from: '2026-10-16', to: '2026-10-30', today: '2026-10-26', isExcluded: (_, date) => date === '2026-10-22' }); assert.equal(excluded.length, 3);
  const view = c.app.attendance.overview(); assert.equal(view.employeeCount, 2); assert.equal(view.daily.absent, 0); assert.equal(view.monthly.absent, 5);
});

test('Admin employee and inclusive date filters; Employee full history never returns other employees', async () => {
  const c = await ready(); c.setTime('2026-10-22T09:00:00+05:00'); await login(c); c.app.attendance.checkIn(); await login(c, 'second'); c.app.attendance.checkIn();
  assert.equal(c.app.attendance.report().summary.records, 1); assert.equal(c.app.getState().attendance.length, 1);
  assert.ok(c.app.attendance.report().rows.every(a => a.employeeId === c.ids[1]));
  await admin(c); assert.equal(c.app.attendance.report().summary.records, 2);
  assert.equal(c.app.attendance.report({ employeeId: c.ids[0], from: '2026-10-22', to: '2026-10-22' }).rows.length, 1);
  assert.equal(c.app.attendance.report({ from: '2026-10-23', to: '2026-10-24' }).rows.length, 0);
  assert.throws(() => c.app.attendance.report({ from: '2026-02-30' }), error => !!error.fields.attendanceFrom);
  assert.throws(() => c.app.attendance.report({ from: '2026-10-24', to: '2026-10-22' }), error => !!error.fields.attendanceTo);
});

test('custom working days include configured Sundays and rederive absence when settings change', async () => {
  const c = await ready(); c.setTime('2026-10-26T12:00:00+05:00');
  c.app.saveSettings({ ...settings, workingDays: [0, 2] });
  let report = c.app.attendance.report({ employeeId: c.ids[0], from: '2026-10-19', to: '2026-10-30' });
  assert.deepEqual(plain(report.rows.map(a => a.date)), ['2026-10-25', '2026-10-20']);
  c.app.saveSettings({ ...settings, workingDays: [1] });
  report = c.app.attendance.report({ employeeId: c.ids[0], from: '2026-10-19', to: '2026-10-30' });
  assert.deepEqual(plain(report.rows.map(a => a.date)), ['2026-10-19']); // Today's Monday is unfinished.
  assert.equal(c.data.get('hcm_attendance'), '[]');
});

test('deleted employee actual attendance preserved and filterable without new derived absence', async () => {
  const c = await ready(); await login(c); c.app.attendance.checkIn(); await admin(c); c.app.deleteEmployee(c.ids[0]); c.setTime('2026-10-26T12:00:00+05:00');
  const report = c.app.attendance.report({ employeeId: c.ids[0] }); assert.equal(report.rows.length, 1); assert.match(report.rows[0].employeeName, /Deleted employee/); assert.equal(report.summary.absent, 0);
  assert.ok(c.app.attendance.employeeOptions().some(u => u.id === c.ids[0]));
});

test('strict attendance validation preserves malformed/unfamiliar data and rejects duplicate IDs/dates/open shifts', async () => {
  const c = await ready(); await login(c); const good = plain(c.app.attendance.checkIn());
  const mutations = [a => { a.extra = 1; }, a => { delete a.id; }, a => { a.date = '2026-02-30'; }, a => { a.checkIn = '2026-10-19T04:15:00'; }, a => { a.offsetMinutes = 841; }, a => { a.offsetMinutes = 840; }, a => { a.status = 'Half day'; }, a => { a.isLate = true; }, a => { a.durationMs = -1; }, a => { a.checkOut = 'bad'; }, a => { a.checkOut = a.checkIn; a.durationMs = 1; a.status = 'Half day'; }];
  for (const mutate of mutations) {
    const bad = { ...good }; mutate(bad); const raw = JSON.stringify([bad]); c.data.set('hcm_attendance', raw);
    assert.throws(() => c.storage.state(), /hcm_attendance.*unsupported or invalid/); assert.throws(() => c.app.attendance.checkIn(), /unsupported or invalid/); assert.equal(c.data.get('hcm_attendance'), raw);
  }
  const candidates = [[good, { ...good, id: 'different' }], [good, { ...good, employeeId: 'another' }], [good, { ...good, id: 'different', date: '2026-10-20', checkIn: '2026-10-20T04:15:00.000Z', lateAfter: '2026-10-20T04:15:00.000Z' }], [{}]];
  for (const value of candidates) { const raw = JSON.stringify(value); c.data.set('hcm_attendance', raw); assert.throws(() => c.storage.state(), /unsupported or invalid/); assert.equal(c.data.get('hcm_attendance'), raw); }
});

test('failed check-in and checkout writes preserve prior data and refresh persistence', async () => {
  const c = await ready(); await login(c); const originalSet = c.adapter.setItem;
  c.adapter.setItem = (key, value) => { if (key === 'hcm_attendance') throw new Error('full'); originalSet(key, value); };
  assert.throws(() => c.app.attendance.checkIn(), /No changes were saved/); assert.equal(c.data.get('hcm_attendance'), '[]');
  c.adapter.setItem = originalSet; const open = c.app.attendance.checkIn(), raw = c.data.get('hcm_attendance');
  c.adapter.setItem = (key, value) => { if (key === 'hcm_attendance') throw new Error('full'); originalSet(key, value); };
  c.setTime('2026-10-19T14:15:00+05:00'); assert.throws(() => c.app.attendance.checkOut(), /No changes were saved/); assert.equal(c.data.get('hcm_attendance'), raw); assert.equal(c.fresh().attendance.current().open.id, open.id);
  c.adapter.setItem = originalSet; c.app.attendance.checkOut(); assert.equal(c.fresh().attendance.report().summary.completed, 1);
});
