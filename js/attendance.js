/* Attendance rules and scope. No DOM, page events, seeded data or persistence side effects at load. */
(function (root) {
  'use strict';
  const dayString = d => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const calendar = value => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  function deriveAbsences({ employees, attendance, workingDays, from, to, today, isExcluded = () => false }) {
    const occupied = new Set(attendance.map(a => JSON.stringify([a.employeeId, a.date]))), result = [];
    for (const employee of employees) {
      const start = from && from > employee.joiningDate ? from : employee.joiningDate;
      if (start >= today || (to && start > to)) continue;
      const cursor = calendar(start);
      for (let date = dayString(cursor); date < today && (!to || date <= to); cursor.setDate(cursor.getDate() + 1), date = dayString(cursor)) {
        if (workingDays.includes(cursor.getDay()) && !occupied.has(JSON.stringify([employee.id, date])) && !isExcluded(employee.id, date)) {
          result.push({ id: `absent:${employee.id}:${date}`, employeeId: employee.id, date, status: 'Absent', derived: true });
        }
      }
    }
    return result;
  }
  function create(storage, requireRole, { clock, makeId }) {
    function now() {
      const time = clock();
      if (!time || !Number.isFinite(time.getTime())) throw new Error('The device clock is invalid. Correct it before recording attendance.');
      return time;
    }
    function ownTarget(user, employeeId) {
      if (employeeId && employeeId !== user.id) throw new Error('Employees may access and change only their own attendance.');
    }
    function actionState(employeeId) {
      const user = requireRole(['Employee']); ownTarget(user, employeeId);
      const state = storage.state(), time = now(), today = dayString(time);
      const records = state.attendance.filter(a => a.employeeId === user.id);
      if (records.some(a => Date.parse(a.checkIn) > time.getTime() || (a.checkOut && Date.parse(a.checkOut) > time.getTime()))) throw new Error('Saved attendance is ahead of the device clock. Correct the clock before continuing.');
      return { user, state, time, today, records };
    }
    function checkIn(employeeId) {
      const { user, state, time, today, records } = actionState(employeeId);
      if (today < user.joiningDate) throw new Error('You cannot check in before your joining date.');
      if (records.some(a => a.checkOut === null)) throw new Error('You are already checked in. Check out of the open shift first.');
      if (records.some(a => a.date === today)) throw new Error('You already have an attendance record for today. Only one check-in per local date is allowed.');
      const cutoff = new Date(time.getTime()), [hours, minutes] = state.company.officeStart.split(':').map(Number);
      cutoff.setHours(hours, minutes, 0, 0); cutoff.setMinutes(cutoff.getMinutes() + state.company.graceMinutes);
      const record = { id: makeId(), employeeId: user.id, date: today, checkIn: time.toISOString(), checkOut: null, isLate: time.getTime() > cutoff.getTime(), status: 'Checked in', durationMs: null, offsetMinutes: time.getTimezoneOffset(), lateAfter: cutoff.toISOString() };
      storage.write({ attendance: [...state.attendance, record] });
      return record;
    }
    function checkOut(employeeId) {
      const { state, time, records } = actionState(employeeId);
      const open = records.find(a => a.checkOut === null);
      if (!open) throw new Error('No open check-in exists. Check in before checking out; a completed shift cannot be checked out again.');
      const durationMs = time.getTime() - Date.parse(open.checkIn);
      if (durationMs < 0) throw new Error('Checkout cannot be before check-in. Correct your device clock.');
      const completed = { ...open, checkOut: time.toISOString(), durationMs, status: durationMs < 5 * 3600000 ? 'Half day' : open.isLate ? 'Late' : 'Present' };
      storage.write({ attendance: state.attendance.map(a => a.id === open.id ? completed : a) });
      return completed;
    }
    function scoped(filters = {}) {
      const user = requireRole(), state = storage.state(), errors = {};
      const employeeId = filters.employeeId || '';
      if (user.role === 'Employee') ownTarget(user, employeeId);
      for (const key of ['from', 'to']) if (filters[key] && !root.HCMStorage.validDate(filters[key])) errors[key === 'from' ? 'attendanceFrom' : 'attendanceTo'] = 'Enter a valid calendar date.';
      if (filters.from && filters.to && filters.from > filters.to) errors.attendanceTo = 'To date must be on or after From date.';
      if (Object.keys(errors).length) throw new root.HCM.ValidationError(errors);
      const target = user.role === 'Employee' ? user.id : employeeId;
      return { state, target, records: state.attendance.filter(a => !target || a.employeeId === target), employees: state.users.filter(u => u.role === 'Employee' && (!target || u.id === target)) };
    }
    function report(filters = {}) {
      const { state, records, employees } = scoped(filters), today = dayString(now());
      const actual = records.filter(a => (!filters.from || a.date >= filters.from) && (!filters.to || a.date <= filters.to));
      const absent = deriveAbsences({ employees, attendance: records, workingDays: state.company.workingDays, from: filters.from, to: filters.to, today });
      const names = new Map(employees.map(u => [u.id, u.name]));
      const rows = [...actual, ...absent].map(a => ({ ...a, employeeName: names.get(a.employeeId) || `Deleted employee (${a.employeeId})` })).sort((a, b) => b.date.localeCompare(a.date) || a.employeeName.localeCompare(b.employeeName));
      return { rows, summary: { records: actual.length, open: actual.filter(a => a.checkOut === null).length, completed: actual.filter(a => a.checkOut !== null).length, late: actual.filter(a => a.isLate).length, halfDays: actual.filter(a => a.status === 'Half day').length, absent: absent.length, durationMs: actual.reduce((sum, a) => sum + (a.durationMs || 0), 0) } };
    }
    function overview() {
      const user = requireRole(), time = now(), today = dayString(time), month = `${today.slice(0, 7)}-01`;
      const daily = report({ from: today, to: today }), monthly = report({ from: month, to: today });
      const { employees } = scoped();
      return { today, month, employeeCount: employees.length, daily: daily.summary, monthly: monthly.summary, role: user.role };
    }
    function current() {
      const { user, state, today, records } = actionState();
      return { today, open: records.find(a => a.checkOut === null) || null, todayRecord: records.find(a => a.date === today) || null, beforeJoining: today < user.joiningDate, workingDay: state.company.workingDays.includes(calendar(today).getDay()) };
    }
    function employeeOptions() {
      requireRole(['Admin']);
      const { state } = scoped();
      const options = new Map(state.users.filter(u => u.role === 'Employee').map(u => [u.id, u.name]));
      state.attendance.forEach(a => { if (!options.has(a.employeeId)) options.set(a.employeeId, `Deleted employee (${a.employeeId})`); });
      return [...options].map(([id, name]) => ({ id, name }));
    }
    return Object.freeze({ checkIn, checkOut, report, overview, current, employeeOptions });
  }
  root.HCMAttendance = Object.freeze({ create, deriveAbsences });
})(globalThis);
