'use strict';
process.env.TZ = 'Asia/Karachi';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { webcrypto } = require('node:crypto');
const vm = require('node:vm');
const fs = require('node:fs');
const path = require('node:path');
const settings = { companyName: 'Test', officeStart: '09:00', graceMinutes: 15, yearlyLeaveQuota: 10, workingDays: [1, 2, 3, 4, 5], name: 'Admin <safe>', email: 'admin@example.test', password: 'Admin-Test-123', confirmPassword: 'Admin-Test-123' };
async function ready() {
  let time = '2026-10-23T23:00:00+05:00';
  const data = new Map(), adapter = { getItem: k => data.get(k) ?? null, setItem: (k, v) => data.set(k, v), removeItem: k => data.delete(k) };
  const sandbox = vm.createContext({ crypto: webcrypto, Date, TextEncoder });
  for (const file of ['storage.js', 'attendance.js', 'leaves.js', 'payroll.js', 'announcements.js', 'helper.js', 'hcm.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'js', file), 'utf8'), sandbox);
  const storage = sandbox.HCMStorage.create(adapter), options = { clock: () => new Date(time) }, app = sandbox.HCM.create(storage, options);
  await app.setup(settings); await app.login({ email: settings.email, password: settings.password });
  const ids = [];
  for (const name of ['first', 'second', 'third']) ids.push(await app.addEmployee({ name: `${name} <safe>`, email: `${name}@example.test`, password: 'Employee-Test-123', department: 'Test', monthlySalary: 26000, joiningDate: '2026-01-01' }));
  return { data, adapter, sandbox, storage, app, ids, setTime: value => { time = value; }, fresh: () => sandbox.HCM.create(sandbox.HCMStorage.create(adapter), options) };
}
const login = (c, name = 'first') => c.app.login({ email: `${name}@example.test`, password: name === 'admin' ? settings.password : 'Employee-Test-123' });
const answer = (c, q, options) => c.app.helper.query(q, options).answer;
function attendance(c, date, hours = 8, late = false, employeeId = c.ids[0], hour = late ? '10' : '09') {
  const start = new Date(`${date}T${hour}:00:00+05:00`), duration = hours === null ? null : hours * 3600000;
  return { id: `${employeeId}:${date}`, employeeId, date, checkIn: start.toISOString(), checkOut: duration === null ? null : new Date(start.getTime() + duration).toISOString(), isLate: late, status: duration === null ? 'Checked in' : hours < 5 ? 'Half day' : late ? 'Late' : 'Present', durationMs: duration, offsetMinutes: -300, lateAfter: new Date(`${date}T09:15:00+05:00`).toISOString() };
}
function leave(c, from, to = from, status = 'Approved', employeeId = c.ids[0]) {
  return { id: `${employeeId}:${from}:${status}`, employeeId, type: 'Casual', from, to, days: c.sandbox.HCMLeaves.workingDates(from, to, settings.workingDays).length, reason: 'Test', status, comment: status === 'Pending' ? '' : 'Reviewed', requestedAt: '2025-01-01T00:00:00.000Z', reviewedAt: status === 'Pending' ? null : '2025-01-02T00:00:00.000Z', reviewedBy: status === 'Pending' ? null : c.storage.state().users[0].id };
}

test('announcements: exact schema, author, stable unique IDs, newest first, safe text and refresh persistence', async () => {
  const c = await ready(), first = c.app.announcements.post({ title: '  First <script>  ', body: '  <img src=x>\nText  ' });
  c.setTime('2026-10-23T23:01:00+05:00'); const second = c.app.announcements.post({ title: 'Second', body: 'Message' });
  assert.notEqual(first.id, second.id); assert.equal(first.title, 'First <script>'); assert.equal(first.body, '<img src=x>\nText');
  assert.deepEqual(Object.keys(first).sort(), ['authorId', 'body', 'createdAt', 'id', 'title']); assert.equal(first.authorId, c.app.currentUser().id);
  assert.equal(c.fresh().announcements.list()[0].id, second.id); assert.equal(c.app.announcements.list()[1].authorName, 'Admin <safe>');
  await login(c); assert.equal(c.app.announcements.list().length, 2); assert.throws(() => c.app.announcements.post({ title: 'X', body: 'Y' }), /permission/);
});
test('announcements: nonblank inline fields; failed save preserves old records and retries', async () => {
  const c = await ready(); c.app.announcements.post({ title: 'Old', body: 'Saved' });
  assert.throws(() => c.app.announcements.post({ title: ' \n', body: '\t' }), e => !!e.fields.announcementTitle && !!e.fields.announcementBody);
  const before = [...c.data], set = c.adapter.setItem; c.adapter.setItem = () => { throw new Error('full'); };
  assert.throws(() => c.app.announcements.post({ title: 'New', body: 'Keep me' }), /No changes were saved/); assert.deepEqual([...c.data], before);
  c.adapter.setItem = set; c.app.announcements.post({ title: 'New', body: 'Keep me' }); assert.equal(c.app.announcements.list().length, 2);
});
test('announcements: malformed JSON, unknown/missing fields, bad timestamps, duplicate IDs preserved; no migration', async () => {
  const c = await ready(), row = c.app.announcements.post({ title: 'Title', body: 'Message' });
  const cases = ['{bad', JSON.stringify([{}]), ...[{ ...row, extra: true }, { ...row, body: '' }, { ...row, createdAt: 'today' }, { ...row, authorId: null }].map(a => JSON.stringify([a])), JSON.stringify([row, row])];
  for (const raw of cases) { c.data.set('hcm_announcements', raw); assert.throws(() => c.app.announcements.list(), /invalid|unsupported/); assert.throws(() => c.app.announcements.post({ title: 'X', body: 'Y' }), /invalid|unsupported/); assert.equal(c.data.get('hcm_announcements'), raw); }
});
test('Admin count required wording and normalized variants read current employee users only', async () => {
  const c = await ready();
  for (const q of ['How many employees do we have?', ' EMPLOYEE   COUNT!! ', 'Please, total employees.', 'Number of employees']) assert.equal(answer(c, q), '3 current employees.');
  c.app.deleteEmployee(c.ids[2]); assert.equal(answer(c, 'employee count'), '2 current employees.');
});
test('Admin approved leave today uses current working days, employment and joining, excludes pending/rejected/deleted', async () => {
  const c = await ready(); c.storage.write({ leaves: [leave(c, '2026-10-23'), leave(c, '2026-10-23', '2026-10-23', 'Pending', c.ids[1]), leave(c, '2026-10-23', '2026-10-23', 'Rejected', c.ids[2]), leave(c, '2026-10-22', '2026-10-23', 'Approved', 'deleted')] });
  assert.match(answer(c, 'Who is on leave today?'), /1 current employees on approved leave: first <safe>/);
  const u = c.app.employees()[0]; c.app.editEmployee(u.id, { ...u, joiningDate: '2026-10-24' }); assert.match(answer(c, 'approved leave today'), /0 current employees/);
  c.setTime('2026-10-24T12:00:00+05:00'); assert.match(answer(c, 'leave today'), /nonworking day/);
});
test('Admin late today counts saved late half-day/open and retained deleted records, ignores old/on-time rows', async () => {
  const c = await ready(); c.storage.write({ attendance: [attendance(c, '2026-10-23', 2, true), attendance(c, '2026-10-23', null, true, c.ids[1]), attendance(c, '2026-10-23', 8, false, c.ids[2]), attendance(c, '2026-10-23', 5, true, 'deleted'), attendance(c, '2026-10-22', 8, true)] });
  const text = answer(c, 'Who was late today?'); assert.match(text, /3 late check-ins/); for (const name of ['first <safe>', 'second <safe>', 'Deleted employee (deleted)']) assert.ok(text.includes(name)); assert.ok(!text.includes('third <safe>'));
  c.app.saveSettings({ ...settings, officeStart: '23:00' }); assert.match(answer(c, 'late employees today'), /3 late check-ins/);
});
test('Employee balance required question, current year approved versus pending; truthful negative after settings changes', async () => {
  const c = await ready(); c.storage.write({ leaves: [leave(c, '2026-10-19', '2026-10-21'), leave(c, '2026-10-22', '2026-10-23', 'Pending'), leave(c, '2025-10-20', '2025-10-24'), leave(c, '2026-10-26', '2026-10-27', 'Rejected'), leave(c, '2026-10-19', '2026-10-23', 'Approved', c.ids[1])] });
  await login(c); const text = answer(c, 'How many leaves do I have left?'); assert.match(text, /2026: 7 leave days left/); assert.match(text, /Pending reservations: 2 days. Available to request: 5/);
  await login(c, 'admin'); c.app.saveSettings({ ...settings, yearlyLeaveQuota: 1 }); await login(c); assert.match(answer(c, 'LEAVE BALANCE!'), /-2 leave days left/); assert.match(answer(c, 'my leave balance'), /Available to request: -4/);
});
test('Employee late question: no check-in is unknown, own saved on-time/late/open/half flag only', async () => {
  const c = await ready(); await login(c); assert.match(answer(c, 'Was I late today?'), /No check-in.*cannot be determined/);
  c.storage.write({ attendance: [attendance(c, '2026-10-23', null, true, c.ids[1])] }); assert.match(answer(c, 'my late today'), /No check-in/);
  c.storage.write({ attendance: [attendance(c, '2026-10-23', null, true)] }); assert.match(answer(c, 'Was I late today?'), /Yes.*Checked in/);
  c.storage.write({ attendance: [attendance(c, '2026-10-23', 2, true)] }); assert.match(answer(c, 'am i late today'), /Yes.*Half day/);
  c.storage.write({ attendance: [attendance(c, '2026-10-23')] }); assert.match(answer(c, 'late today'), /No, your check-in was on time/);
});
test('Employee weekly hours: independent 3+8+12=23, previous Sunday excluded, overnight start attribution and open exclusion', async () => {
  const c = await ready(); c.storage.write({ attendance: [attendance(c, '2026-10-18', 20), attendance(c, '2026-10-19', 3), attendance(c, '2026-10-20', 8), attendance(c, '2026-10-21', 12, true, c.ids[0], '22'), attendance(c, '2026-10-23', null), attendance(c, '2026-10-20', 99, false, c.ids[1])] });
  await login(c); const text = answer(c, 'How many hours did I work this week?'); assert.match(text, /2026-10-19 to 2026-10-25.*23.00 completed hours/); assert.match(text, /Open shift starting 2026-10-23.*excluded/);
  c.setTime('2026-10-25T23:00:00+05:00'); assert.match(answer(c, 'HOURS THIS WEEK!'), /23.00 completed hours/);
  c.setTime('2026-10-26T00:01:00+05:00'); assert.match(answer(c, 'hours this week'), /2026-10-26 to 2026-11-01.*0.00 completed hours.*outside this week/);
});
test('Monday/Sunday inclusion, nonworking and long shifts count full duration only in starting week', async () => {
  const c = await ready(); c.setTime('2026-10-26T23:00:00+05:00'); c.storage.write({ attendance: [attendance(c, '2026-10-19', 2), attendance(c, '2026-10-25', 24)] }); await login(c);
  assert.match(answer(c, 'hours this week'), /0.00 completed hours/); c.setTime('2026-10-25T23:00:00+05:00');
  // Checkout is still tomorrow: refuse future saved activity instead of inventing worked hours.
  assert.throws(() => answer(c, 'hours this week'), /ahead/);
  c.storage.write({ attendance: [attendance(c, '2026-10-19', 2), attendance(c, '2026-10-25', 5)] }); assert.match(answer(c, 'hours this week'), /7.00 completed hours/);
});
test('week across December/January is local Monday–Sunday; approved balance switches calendar year', async () => {
  const c = await ready(); c.setTime('2027-01-03T23:00:00+05:00'); c.storage.write({ attendance: [attendance(c, '2026-12-28', 5), attendance(c, '2027-01-03', 6)], leaves: [leave(c, '2026-10-23')] }); await login(c);
  assert.match(answer(c, 'my weekly hours'), /2026-12-28 to 2027-01-03.*11.00/); assert.match(answer(c, 'leave balance'), /2027: 10 leave days left/);
});
test('unknown, ambiguous, mixed, named and other-role requests fallback without leaking names, salary or objects', async () => {
  const c = await ready();
  for (const q of ['leave', 'Who is on leave today and what is the leave balance?', 'employee count and late today', 'passwords', '<img src=x>', 'leave balance']) assert.equal(c.app.helper.query(q).intent, 'unsupported');
  await login(c);
  for (const q of ['employee count', 'Who is on leave today?', 'Who was late today?', 'second leave balance', 'hours this week for second', 'show salaries', 'all attendance', 'leave balance and hours this week']) {
    const result = c.app.helper.query(q); assert.equal(result.intent, 'unsupported'); assert.ok(!JSON.stringify(result).includes('<safe>')); assert.ok(!JSON.stringify(result).includes('26000'));
  }
  assert.throws(() => c.app.helper.query('leave balance', { employeeId: c.ids[1] }), /own/);
});
test('blank and nonstring question gives field error; punctuation/case/whitespace variants and suggestions work', async () => {
  const c = await ready(); for (const q of ['', ' \n', null, {}]) assert.throws(() => c.app.helper.query(q), e => !!e.fields.helperQuestion);
  for (const q of c.app.helper.suggestions()) assert.notEqual(c.app.helper.query(q).intent, 'unsupported');
  await login(c); for (const q of c.app.helper.suggestions()) assert.notEqual(c.app.helper.query(q).intent, 'unsupported');
  assert.equal(c.app.helper.query('  PLEASE,   LEAVE BALANCE?! ').intent, 'balance'); assert.equal(c.app.helper.query('My hours worked this week.').intent, 'hours');
  assert.equal(c.app.helper.query('How many leave days do I have left?').intent, 'balance');
  await login(c, 'admin'); assert.equal(c.app.helper.query('Who’s on leave today?').intent, 'leaveToday');
});
test('fresh role/data per direct call across account changes; no writes, no stale privileged answer or raw secrets', async () => {
  const c = await ready(), helper = c.app.helper; assert.match(helper.query('employee count').answer, /3 current/); await login(c);
  assert.equal(helper.query('employee count').intent, 'unsupported'); const before = [...c.data];
  for (const q of helper.suggestions()) { const result = helper.query(q); assert.deepEqual(Object.keys(result).sort(), ['answer', 'intent']); assert.ok(!/password|hash|session|26000/.test(JSON.stringify(result))); }
  assert.deepEqual([...c.data], before);
  await login(c, 'second'); assert.match(helper.query('leave balance').answer, /10 leave days left/);
});
test('anonymous/deleted/stale sessions and malformed/unavailable storage fail honestly without altering data', async () => {
  const c = await ready(); c.app.logout(); for (const action of [() => c.app.helper.query('employee count'), () => c.app.helper.suggestions(), () => c.app.announcements.list(), () => c.app.announcements.post({ title: 'x', body: 'y' })]) assert.throws(action, /permission/);
  await login(c, 'admin'); c.app.deleteEmployee(c.ids[0]); c.storage.write({ session: { userId: c.ids[0] } }); assert.throws(() => answer(c, 'leave balance'), /permission/);
  c.storage.write({ session: { userId: 'unknown' } }); assert.throws(() => answer(c, 'employee count'), /permission/);
  c.data.set('hcm_leaves', '{broken'); assert.throws(() => answer(c, 'leave balance'), /invalid JSON/); assert.equal(c.data.get('hcm_leaves'), '{broken');
  c.adapter.getItem = () => { throw new Error('denied'); }; assert.throws(() => answer(c, 'hours this week'), /unavailable/);
});
test('zero records, empty delivery and invalid clock handled without extra storage keys or seeded app data', async () => {
  const c = await ready(); assert.equal(c.app.announcements.list().length, 0); assert.match(answer(c, 'Who was late today?'), /0 late check-ins/); assert.match(answer(c, 'Who is on leave today?'), /0 current/);
  for (const id of c.ids) c.app.deleteEmployee(id); assert.equal(answer(c, 'employee count'), '0 current employees.');
  assert.equal(c.data.size, 6); c.setTime('invalid'); assert.throws(() => answer(c, 'employee count'), /clock is invalid/); assert.throws(() => c.app.announcements.post({ title: 'X', body: 'Y' }), /clock is invalid/);
});
