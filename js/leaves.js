/* Leave rules and role scope. No DOM or stored aggregate totals. */
(function (root) {
  'use strict';
  const types = Object.freeze(['Casual', 'Sick', 'Other']);
  const calendar = value => { const [y, m, d] = value.split('-').map(Number); return new Date(y, m - 1, d, 12); };
  function workingDates(from, to, workingDays) {
    const dates = [], cursor = calendar(from), end = calendar(to).getTime();
    for (; cursor.getTime() <= end; cursor.setDate(cursor.getDate() + 1)) {
      if (workingDays.includes(cursor.getDay())) dates.push(root.HCM.localDate(cursor));
    }
    return dates;
  }
  const count = (leave, company) => workingDates(leave.from, leave.to, company.workingDays).length;
  const covers = (leaves, employeeId, date, workingDays) => workingDays.includes(calendar(date).getDay()) && leaves.some(l => l.employeeId === employeeId && l.status === 'Approved' && l.from <= date && l.to >= date);
  function create(storage, requireRole, { clock, makeId }) {
    const fail = fields => {
      if (Object.keys(fields).length) {
        const error = new root.HCM.ValidationError(fields); error.message = Object.values(fields).join(' '); throw error;
      }
    };
    const clean = value => typeof value === 'string' ? value.trim() : '';
    function now() {
      const time = clock();
      if (!time || !Number.isFinite(time.getTime())) throw new Error('The device clock is invalid. Correct it before saving leave.');
      return time.toISOString();
    }
    function scoped(employeeId = '') {
      const user = requireRole(), state = storage.state();
      if (user.role === 'Employee' && employeeId && employeeId !== user.id) throw new Error('Employees may access only their own leave.');
      const target = user.role === 'Employee' ? user.id : employeeId;
      return { state, target, records: state.leaves.filter(l => !target || l.employeeId === target) };
    }
    function balanceFor(state, employeeId, year) {
      const records = state.leaves.filter(l => l.employeeId === employeeId && l.from.slice(0, 4) === String(Number(year)).padStart(4, '0'));
      const days = status => records.filter(l => l.status === status).reduce((sum, l) => sum + count(l, state.company), 0);
      const approved = days('Approved'), pending = days('Pending'), quota = state.company.yearlyLeaveQuota;
      return { year: Number(year), quota, approved, pending, balance: quota - approved, available: quota - approved - pending };
    }
    function balance(year, employeeId) {
      const { state, target } = scoped(employeeId);
      if (!target) throw new Error('Choose an employee for a yearly balance.');
      if (!/^\d{3,4}$/.test(String(year)) || Number(year) < 100 || Number(year) > 9999) fail({ leaveYear: 'Enter a year from 100 to 9999.' });
      return balanceFor(state, target, year);
    }
    function range(input, employee, company) {
      const errors = {};
      if (!root.HCMStorage.validDate(input.from)) errors.leaveFrom = 'Enter a valid From date.';
      if (!root.HCMStorage.validDate(input.to)) errors.leaveTo = 'Enter a valid To date.';
      fail(errors);
      if (input.from > input.to) errors.leaveTo = 'To date must be on or after From date.';
      else if (input.from.slice(0, 4) !== input.to.slice(0, 4)) errors.leaveTo = 'Submit separate requests per year; cross-year leave is not allowed.';
      if (employee && input.from < employee.joiningDate) errors.leaveFrom = 'Leave cannot start before your joining date.';
      fail(errors);
      const days = count(input, company);
      if (!days) fail({ leaveTo: 'This range contains zero configured working days. Choose a working date.' });
      return days;
    }
    function preview(input, employeeId) {
      const user = requireRole(['Employee']);
      scoped(employeeId);
      return { days: range(input, user, storage.state().company) };
    }
    function eligibility(state, employee, candidate) {
      if (!employee || employee.role !== 'Employee') throw new Error('This employee no longer exists. Their retained request can be rejected, but cannot be approved.');
      const days = range(candidate, employee, state.company);
      if (state.leaves.some(l => l.id !== candidate.id && l.employeeId === employee.id && l.status !== 'Rejected' && l.from <= candidate.to && l.to >= candidate.from)) fail({ leaveFrom: 'This range overlaps a pending or approved request.' });
      const totals = balanceFor(state, employee.id, candidate.from.slice(0, 4));
      const reserved = totals.approved + totals.pending - (candidate.id ? count(candidate, state.company) : 0);
      if (reserved + days > totals.quota) fail({ leaveTo: `Yearly quota exceeded: ${reserved} days already approved or pending, ${days} requested, quota ${totals.quota}. Review pending requests or settings first.` });
      return days;
    }
    function request(input, employeeId) {
      const user = requireRole(['Employee']); scoped(employeeId);
      if (input.employeeId && input.employeeId !== user.id) throw new Error('Employees may request only their own leave.');
      const state = storage.state(), errors = {};
      if (!types.includes(input.type)) errors.leaveType = 'Choose Casual, Sick or Other.';
      if (!clean(input.reason)) errors.leaveReason = 'Enter a reason.';
      fail(errors);
      const candidate = { from: input.from, to: input.to };
      const days = eligibility(state, user, candidate);
      const record = { id: makeId(), employeeId: user.id, type: input.type, ...candidate, days, reason: clean(input.reason), status: 'Pending', comment: '', requestedAt: now(), reviewedAt: null, reviewedBy: null };
      storage.write({ leaves: [...state.leaves, record] });
      return record;
    }
    function list(filters = {}) {
      const { state, records } = scoped(filters.employeeId);
      if (filters.status && !['Pending', 'Approved', 'Rejected'].includes(filters.status)) throw new Error('Choose a valid leave status.');
      return records.filter(l => !filters.status || l.status === filters.status).map(l => ({ ...l, currentDays: count(l, state.company), employeeName: state.users.find(u => u.id === l.employeeId)?.name || `Deleted employee (${l.employeeId})` })).sort((a, b) => b.requestedAt.localeCompare(a.requestedAt) || a.id.localeCompare(b.id));
    }
    function reviewState(id) {
      const reviewer = requireRole(['Admin']), state = storage.state(), record = state.leaves.find(l => l.id === id);
      if (!record) throw new Error('This request no longer exists. Refresh the list.');
      if (record.status !== 'Pending') throw new Error('This request is already finalized. Refresh the list; decisions cannot be changed.');
      const employee = state.users.find(u => u.id === record.employeeId && u.role === 'Employee');
      const token = JSON.stringify({ reviewer: reviewer.id, leaves: state.leaves, company: state.company, employee: employee || null });
      return { state, record, employee, reviewer, token };
    }
    function prepareReview(id) {
      const { state, record, employee, token } = reviewState(id);
      let approvalError = '';
      try { eligibility(state, employee, record); } catch (error) { approvalError = error.fields ? Object.values(error.fields).join(' ') : error.message; }
      return { record, token, days: count(record, state.company), approvalError };
    }
    function review(id, input) {
      const { state, record, employee, reviewer, token } = reviewState(id);
      if (!input.token || input.token !== token) throw new Error('Review is stale: records or settings changed. Open Review again to see current days and rules.');
      const errors = {};
      if (!['Approved', 'Rejected'].includes(input.status)) errors.reviewDecision = 'Choose Approve or Reject.';
      if (!clean(input.comment)) errors.reviewComment = 'Enter a nonblank Admin comment.';
      fail(errors);
      const days = input.status === 'Approved' ? eligibility(state, employee, record) : record.days;
      const reviewedAt = now();
      if (reviewedAt < record.requestedAt) throw new Error('Review cannot precede submission. Correct the device clock.');
      const completed = { ...record, days, status: input.status, comment: clean(input.comment), reviewedAt, reviewedBy: reviewer.id };
      storage.write({ leaves: state.leaves.map(l => l.id === id ? completed : l) });
      return completed;
    }
    function overview() {
      const { records, state } = scoped(), today = root.HCM.localDate(clock());
      return { pending: records.filter(l => l.status === 'Pending').length, approvedToday: new Set(records.filter(l => covers([l], l.employeeId, today, state.company.workingDays) && state.users.some(u => u.id === l.employeeId && u.role === 'Employee' && u.joiningDate <= today)).map(l => l.employeeId)).size };
    }
    function employeeOptions() {
      requireRole(['Admin']); const { state } = scoped();
      const options = new Map(state.users.filter(u => u.role === 'Employee').map(u => [u.id, u.name]));
      state.leaves.forEach(l => { if (!options.has(l.employeeId)) options.set(l.employeeId, `Deleted employee (${l.employeeId})`); });
      return [...options].map(([id, name]) => ({ id, name }));
    }
    return Object.freeze({ request, preview, balance, list, prepareReview, review, overview, employeeOptions });
  }
  root.HCMLeaves = Object.freeze({ create, workingDates, covers, types });
})(globalThis);
