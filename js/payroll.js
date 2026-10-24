/* Derived monthly payroll. No DOM, stored totals or write operations. */
(function (root) {
  'use strict';
  function create(storage, requireRole, { clock }) {
    function employeeOptions() {
      const user = requireRole(), state = storage.state();
      return state.users.filter(u => u.role === 'Employee' && (user.role === 'Admin' || u.id === user.id)).map(u => ({ id: u.id, name: u.name }));
    }
    function slip(input = {}) {
      const user = requireRole(), state = storage.state();
      if (user.role === 'Employee' && input.employeeId !== undefined && input.employeeId !== user.id) throw new Error('Employees may access only their own payslip.');
      const target = user.role === 'Employee' ? user.id : input.employeeId;
      const employee = state.users.find(u => u.role === 'Employee' && u.id === target);
      if (!employee) throw new root.HCM.ValidationError({ payrollEmployee: 'Choose an existing employee. This account may no longer be available.' });
      const errors = {};
      if (!/^\d{3,4}$/.test(String(input.year)) || Number(input.year) < 100 || Number(input.year) > 9999) errors.payrollYear = 'Enter a year from 100 to 9999.';
      if (!/^(?:[1-9]|1[0-2])$/.test(String(input.month))) errors.payrollMonth = 'Choose a month from 1 to 12.';
      if (Object.keys(errors).length) throw new root.HCM.ValidationError(errors);
      const time = clock();
      if (!time || !Number.isFinite(time.getTime())) throw new Error('The device clock is invalid. Correct it before calculating payroll.');
      const today = root.HCM.localDate(time), period = `${String(Number(input.year)).padStart(4, '0')}-${String(Number(input.month)).padStart(2, '0')}`;
      if (period > today.slice(0, 7)) throw new root.HCM.ValidationError({ payrollMonth: 'Future-month payslips are unavailable.' });
      const from = `${period}-01`, last = new Date(Number(input.year), Number(input.month), 0, 12).getDate(), to = `${period}-${last}`;
      const dates = root.HCMLeaves.workingDates(from, to, state.company.workingDays);
      const eligible = dates.filter(date => date >= employee.joiningDate), eligibleSet = new Set(eligible);
      const records = state.attendance.filter(a => a.employeeId === employee.id && eligibleSet.has(a.date));
      if (records.some(a => Date.parse(a.checkIn) > time.getTime() || (a.checkOut && Date.parse(a.checkOut) > time.getTime()))) throw new Error('Saved attendance is ahead of the device clock. Correct the clock before calculating payroll.');
      const isExcluded = (id, date) => root.HCMLeaves.covers(state.leaves, id, date, state.company.workingDays);
      const absentDays = root.HCMAttendance.deriveAbsences({ employees: [employee], attendance: records, workingDays: state.company.workingDays, from, to, today, isExcluded }).length;
      const halfDays = records.filter(a => a.status === 'Half day').length;
      const occupied = new Set(records.map(a => a.date));
      const paidLeaveDays = eligible.filter(date => !occupied.has(date) && isExcluded(employee.id, date)).length;
      const openDates = records.filter(a => a.checkOut === null).map(a => a.date).sort();
      const currentMonth = period === today.slice(0, 7), workingDays = dates.length;
      const base = { companyName: state.company.name, employee: { id: employee.id, name: employee.name, department: employee.department, joiningDate: employee.joiningDate }, period, from, to, asOf: today, monthlySalary: employee.monthlySalary, workingDays, eligibleDays: eligible.length, absentDays, halfDays, paidLeaveDays, openDates, currentMonth, prorated: eligible.length > 0 && eligible.length < workingDays };
      if (!workingDays) return { ...base, status: 'Cannot calculate', dailyRate: null, gross: null, deduction: null, net: null };
      const dailyRate = employee.monthlySalary / workingDays;
      // Divide before multiplying, retaining full precision. Never round the daily rate.
      const gross = eligible.length === workingDays ? employee.monthlySalary : dailyRate * eligible.length;
      const deductibleDays = absentDays + 0.5 * halfDays;
      // Deducting the entire entitlement is exactly gross. This identity avoids
      // floating-point multiplication leaving a tiny negative net (or overflow).
      const deduction = deductibleDays === eligible.length ? gross : dailyRate * deductibleDays;
      const net = gross - deduction;
      if (![dailyRate, gross, deduction, net].every(Number.isFinite) || net < 0) throw new Error('Cannot calculate valid payroll totals from these inputs. Check salary, settings and attendance.');
      return { ...base, status: currentMonth || openDates.length ? 'Provisional' : eligible.length ? 'Final' : 'No payable entitlement', dailyRate, gross, deduction, net };
    }
    return Object.freeze({ employeeOptions, slip });
  }
  root.HCMPayroll = Object.freeze({ create });
})(globalThis);
