/* Supported keyword questions only. Answers are fresh, scoped strings, never raw records. */
(function (root) {
  'use strict';
  const questions = Object.freeze({
    Admin: Object.freeze(['How many employees do we have?', 'Who is on leave today?', 'Who was late today?']),
    Employee: Object.freeze(['How many leaves do I have left?', 'Was I late today?', 'How many hours did I work this week?'])
  });
  const normalize = value => value.toLowerCase().replace(/[’']/g, '').replace(/[^\p{L}\p{N}\s]/gu, ' ').replace(/\s+/g, ' ').trim().replace(/^please /, '').replace(/ please$/, '');
  // Full-question patterns avoid treating named, mixed or unsupported requests as own-data questions.
  const patterns = [
    ['count', /^(?:how many employees(?: do we have)?|employee count|total employees|number of employees)$/],
    ['leaveToday', /^(?:(?:who is|whos) on (?:approved )?leave today|(?:approved )?leave today|employees on leave today)$/],
    ['balance', /^(?:how many (?:leaves?|leave days) do i have left|(?:my )?leave balance|my leaves? left|remaining leaves?|how much leave do i have left)$/],
    ['lateAll', /^(?:who (?:was|is|checked in) late today|whos late today|late employees today)$/],
    ['lateOwn', /^(?:(?:was|am) i late today|(?:my )?late today)$/],
    ['hours', /^(?:how many hours did i work this week|(?:my )?hours(?: worked)? this week|my weekly hours)$/]
  ];
  function create(storage, requireRole, { clock, attendance, leaves }) {
    const suggestions = () => [...questions[requireRole().role]];
    function query(question, options = {}) {
      const user = requireRole();
      if (user.role === 'Employee' && options.employeeId && options.employeeId !== user.id) throw new Error('Employees may query only their own data.');
      if (typeof question !== 'string' || !question.trim()) throw new root.HCM.ValidationError({ helperQuestion: 'Enter a question.' });
      const fallback = () => ({ intent: 'unsupported', answer: `Ask one supported question at a time. ${questions[user.role].join(' ')}` });
      const matches = patterns.filter(([, pattern]) => pattern.test(normalize(question)));
      if (matches.length !== 1) return fallback();
      const intent = matches[0][0];
      if (!(user.role === 'Admin' ? ['count', 'leaveToday', 'lateAll'] : ['balance', 'lateOwn', 'hours']).includes(intent)) return fallback();
      const state = storage.state(), time = clock();
      if (!time || !Number.isFinite(time.getTime())) throw new Error('The device clock is invalid. Correct it before asking the helper.');
      const today = root.HCM.localDate(time);
      const name = id => state.users.find(u => u.id === id && u.role === 'Employee')?.name || `Deleted employee (${id})`;
      const actual = (from, to) => {
        const rows = attendance.report({ from, to }).rows.filter(a => !a.derived);
        if (rows.some(a => Date.parse(a.checkIn) > time.getTime() || (a.checkOut && Date.parse(a.checkOut) > time.getTime()))) throw new Error('Saved attendance is ahead of the device clock. Correct the clock before asking the helper.');
        return rows;
      };
      let answer;
      if (intent === 'count') answer = `${state.users.filter(u => u.role === 'Employee').length} current employees.`;
      if (intent === 'leaveToday') {
        if (!state.company.workingDays.includes(time.getDay())) answer = `${today} is a nonworking day. No working-day approved leave is counted today.`;
        else {
          const people = state.users.filter(u => u.role === 'Employee' && u.joiningDate <= today && root.HCMLeaves.covers(state.leaves, u.id, today, state.company.workingDays));
          answer = `${today}: ${people.length} current employees on approved leave${people.length ? `: ${people.map(u => u.name).join('; ')}` : ''}. Approved coverage is shown even if attendance was recorded.`;
        }
      }
      if (intent === 'lateAll') {
        const rows = actual(today, today).filter(a => a.isLate);
        answer = `${today}: ${rows.length} late check-ins${rows.length ? `: ${rows.map(a => name(a.employeeId)).join('; ')}` : ''}. Includes late half-day and open shifts; uses the saved lateness flag.`;
      }
      if (intent === 'balance') {
        const b = leaves.balance(time.getFullYear());
        answer = `${b.year}: ${b.balance} leave days left (quota ${b.quota} minus ${b.approved} approved working days). Pending reservations: ${b.pending} days. Available to request: ${b.available} days. Counts use current settings.`;
      }
      if (intent === 'lateOwn') {
        const row = actual(today, today)[0];
        answer = !row ? `${today}: No check-in recorded today; lateness cannot be determined.` : `${today}: ${row.isLate ? 'Yes, your check-in was late' : 'No, your check-in was on time'} (saved flag). Shift status: ${row.status}.`;
      }
      if (intent === 'hours') {
        const monday = new Date(time.getTime()); monday.setDate(monday.getDate() - (monday.getDay() + 6) % 7);
        const sunday = new Date(monday.getTime()); sunday.setDate(sunday.getDate() + 6);
        const from = root.HCM.localDate(monday), to = root.HCM.localDate(sunday), rows = actual(from, to);
        const duration = rows.reduce((sum, a) => sum + (a.durationMs ?? 0), 0);
        if (!Number.isSafeInteger(duration)) throw new Error('Completed hours cannot be calculated safely from these records.');
        const open = attendance.current().open;
        answer = `${from} to ${to} (Monday–Sunday): ${(duration / 3600000).toFixed(2)} completed hours. Shifts count by their starting date, including overnight and nonworking-day shifts.${open ? ` Open shift starting ${open.date} has no completed duration and is excluded${open.date < from || open.date > to ? '; its start is outside this week' : ''}.` : ''}`;
      }
      return { intent, answer };
    }
    return Object.freeze({ suggestions, query });
  }
  root.HCMHelper = Object.freeze({ create });
})(globalThis);
