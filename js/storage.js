/* Persistence only. Invalid or unavailable storage is never reset automatically. */
(function (root) {
  'use strict';
  const keys = Object.freeze({ company: 'hcm_company', users: 'hcm_users', attendance: 'hcm_attendance', leaves: 'hcm_leaves', session: 'hcm_session', announcements: 'hcm_announcements' });
  class StorageError extends Error {}
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const nonempty = value => typeof value === 'string' && value.trim().length > 0;
  const date = value => {
    if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
    const [y, m, d] = value.split('-').map(Number);
    const parsed = new Date(y, m - 1, d);
    return parsed.getFullYear() === y && parsed.getMonth() === m - 1 && parsed.getDate() === d;
  };
  function validCompany(c) {
    return record(c) && nonempty(c.id) && nonempty(c.name) && /^([01]\d|2[0-3]):[0-5]\d$/.test(c.officeStart) &&
      Number.isInteger(c.graceMinutes) && c.graceMinutes >= 0 && c.graceMinutes <= 1440 &&
      Number.isInteger(c.yearlyLeaveQuota) && c.yearlyLeaveQuota >= 0 && c.yearlyLeaveQuota <= 366 &&
      Array.isArray(c.workingDays) && c.workingDays.length > 0 && new Set(c.workingDays).size === c.workingDays.length && c.workingDays.every(d => Number.isInteger(d) && d >= 0 && d <= 6);
  }
  function validUser(u) {
    return record(u) && nonempty(u.id) && nonempty(u.name) && typeof u.email === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(u.email) &&
      ['Admin', 'Employee'].includes(u.role) && record(u.password) && u.password.algorithm === 'PBKDF2-SHA256' &&
      u.password.iterations === 100000 && /^[a-f0-9]{32}$/.test(u.password.salt) && /^[a-f0-9]{64}$/.test(u.password.hash) &&
      (u.role === 'Admin' || (nonempty(u.department) && Number.isFinite(u.monthlySalary) && u.monthlySalary > 0 && date(u.joiningDate)));
  }
  const timestamp = value => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value;
  function validAttendance(a) {
    const fields = ['id', 'employeeId', 'date', 'checkIn', 'checkOut', 'isLate', 'status', 'durationMs', 'offsetMinutes', 'lateAfter'];
    if (!record(a) || Object.keys(a).length !== fields.length || !fields.every(k => Object.hasOwn(a, k)) ||
      !nonempty(a.id) || !nonempty(a.employeeId) || !date(a.date) || !timestamp(a.checkIn) || !timestamp(a.lateAfter) ||
      !Number.isInteger(a.offsetMinutes) || a.offsetMinutes < -840 || a.offsetMinutes > 840 || typeof a.isLate !== 'boolean') return false;
    // Saved offset validates the original local date even if the viewer changes timezone.
    if (new Date(Date.parse(a.checkIn) - a.offsetMinutes * 60000).toISOString().slice(0, 10) !== a.date || a.isLate !== (Date.parse(a.checkIn) > Date.parse(a.lateAfter))) return false;
    if (a.checkOut === null) return a.durationMs === null && a.status === 'Checked in';
    if (!timestamp(a.checkOut) || !Number.isSafeInteger(a.durationMs) || a.durationMs < 0 || a.durationMs !== Date.parse(a.checkOut) - Date.parse(a.checkIn)) return false;
    return a.status === (a.durationMs < 5 * 3600000 ? 'Half day' : a.isLate ? 'Late' : 'Present');
  }
  function validLeave(l) {
    const fields = ['id', 'employeeId', 'type', 'from', 'to', 'days', 'reason', 'status', 'comment', 'requestedAt', 'reviewedAt', 'reviewedBy'];
    if (!record(l) || Object.keys(l).length !== fields.length || !fields.every(k => Object.hasOwn(l, k)) ||
      !nonempty(l.id) || !nonempty(l.employeeId) || !['Casual', 'Sick', 'Other'].includes(l.type) ||
      !date(l.from) || !date(l.to) || l.from > l.to || l.from.slice(0, 4) !== l.to.slice(0, 4) ||
      !Number.isInteger(l.days) || l.days < 1 || l.days > 366 || !nonempty(l.reason) || !timestamp(l.requestedAt)) return false;
    const elapsedDays = Math.round((Date.parse(`${l.to}T12:00:00Z`) - Date.parse(`${l.from}T12:00:00Z`)) / 86400000) + 1;
    if (l.days > elapsedDays) return false;
    if (l.status === 'Pending') return l.comment === '' && l.reviewedAt === null && l.reviewedBy === null;
    return ['Approved', 'Rejected'].includes(l.status) && nonempty(l.comment) && nonempty(l.reviewedBy) && timestamp(l.reviewedAt) && l.reviewedAt >= l.requestedAt;
  }
  function valid(name, value) {
    if (name === 'company') return validCompany(value);
    if (name === 'users') return Array.isArray(value) && value.every(validUser) &&
      new Set(value.map(u => u.id)).size === value.length && new Set(value.map(u => u.email.toLowerCase())).size === value.length && value.filter(u => u.role === 'Admin').length === 1;
    if (name === 'session') return record(value) && Object.keys(value).length === 1 && nonempty(value.userId);
    if (name === 'attendance') return Array.isArray(value) && value.every(validAttendance) &&
      new Set(value.map(a => a.id)).size === value.length &&
      new Set(value.map(a => JSON.stringify([a.employeeId, a.date]))).size === value.length &&
      new Set(value.filter(a => a.checkOut === null).map(a => a.employeeId)).size === value.filter(a => a.checkOut === null).length;
    if (name === 'leaves') return Array.isArray(value) && value.every(validLeave) && new Set(value.map(l => l.id)).size === value.length;
    if (name === 'announcements') return Array.isArray(value) && value.every(a => record(a) &&
      Object.keys(a).length === 5 && ['id', 'title', 'body', 'authorId', 'createdAt'].every(k => Object.hasOwn(a, k)) &&
      nonempty(a.id) && nonempty(a.title) && nonempty(a.body) && nonempty(a.authorId) && timestamp(a.createdAt)) &&
      new Set(value.map(a => a.id)).size === value.length;
    return false;
  }
  function create(adapter) {
    function raw(key) {
      try { return adapter.getItem(key); }
      catch (_) { throw new StorageError('Browser storage is unavailable. Allow site storage and try again.'); }
    }
    function read(name) {
      if (!keys[name]) throw new StorageError('Unknown storage collection.');
      const source = raw(keys[name]);
      if (source === null) return null;
      let value;
      try { value = JSON.parse(source); }
      catch (_) { throw new StorageError(`Stored ${keys[name]} contains invalid JSON. Existing data was preserved. Back it up and repair it before continuing.`); }
      if (!valid(name, value)) throw new StorageError(`Stored ${keys[name]} has an unsupported or invalid structure. Existing data was preserved. Back it up and repair it before continuing.`);
      return value;
    }
    function state() {
      const values = Object.fromEntries(Object.keys(keys).map(name => [name, read(name)]));
      const existing = Object.keys(keys).some(name => raw(keys[name]) !== null);
      if (!existing) return { initialized: false, company: null, users: [], attendance: [], leaves: [], session: null, announcements: [] };
      if (!values.company || !values.users || !values.attendance || !values.leaves || !values.announcements) {
        throw new StorageError('HCM storage is incomplete. Existing data was preserved; setup cannot overwrite it. Back it up and repair the missing collections.');
      }
      return { initialized: true, ...values };
    }
    function write(changes) {
      // Validate what is already stored too, including changes made by another tab.
      state();
      const entries = Object.entries(changes);
      entries.forEach(([name, value]) => {
        if (!keys[name] || (value === null ? name !== 'session' : !valid(name, value))) throw new StorageError('Refusing to save invalid HCM data.');
      });
      // Capture every previous value before making the first write.
      const before = entries.map(([name]) => [keys[name], raw(keys[name])]);
      const changed = [];
      try {
        entries.forEach(([name, value]) => {
          value === null ? adapter.removeItem(keys[name]) : adapter.setItem(keys[name], JSON.stringify(value));
          changed.push(keys[name]);
        });
      } catch (_) {
        let restored = true;
        before.filter(([key]) => changed.includes(key)).reverse().forEach(([key, value]) => { try { value === null ? adapter.removeItem(key) : adapter.setItem(key, value); } catch (_) { restored = false; } });
        throw new StorageError(restored ? 'Could not save to browser storage (it may be full or blocked). No changes were saved.' : 'Browser storage failed and rollback was incomplete. Stop editing, back up your browser data and inspect the HCM collections before continuing.');
      }
    }
    return Object.freeze({ read, state, write });
  }
  root.HCMStorage = Object.freeze({ keys, create, StorageError, validDate: date });
})(globalThis);
