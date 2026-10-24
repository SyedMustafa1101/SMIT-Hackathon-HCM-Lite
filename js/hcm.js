/* Domain rules. This file has no page or DOM dependencies. */
(function (root) {
  'use strict';
  class ValidationError extends Error {
    constructor(fields) { super('Please correct the highlighted fields.'); this.fields = fields; }
  }
  const clean = value => typeof value === 'string' ? value.trim() : '';
  const emailKey = value => clean(value).toLowerCase();
  const hex = bytes => Array.from(bytes, b => b.toString(16).padStart(2, '0')).join('');
  const unhex = value => Uint8Array.from(value.match(/../g), byte => parseInt(byte, 16));
  function localDate(now = new Date()) {
    return `${String(now.getFullYear()).padStart(4, '0')}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  }
  function secureCrypto() {
    if (!root.crypto || !root.crypto.subtle) throw new Error('Password protection requires a modern browser on localhost or HTTPS. Open the app through the local server described in README.md.');
    return root.crypto;
  }
  function id() { return hex(secureCrypto().getRandomValues(new Uint8Array(16))); }
  async function hashPassword(password, salt = hex(secureCrypto().getRandomValues(new Uint8Array(16)))) {
    const crypto = secureCrypto();
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits']);
    const hash = hex(new Uint8Array(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: unhex(salt), iterations: 100000, hash: 'SHA-256' }, key, 256)));
    return { algorithm: 'PBKDF2-SHA256', iterations: 100000, salt, hash };
  }
  function passwordFields(input, errors, key = 'password') {
    if (typeof input !== 'string' || !input.trim()) errors[key] = 'Enter a password.';
    else if (input.length < 8) errors[key] = 'Use at least 8 characters.';
  }
  function identityFields(input, users, exceptId) {
    const errors = {};
    if (!clean(input.name)) errors.name = 'Enter a name.';
    if (!clean(input.email)) errors.email = 'Enter an email address.';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(input.email))) errors.email = 'Enter a valid email address.';
    else if (users.some(u => u.id !== exceptId && emailKey(u.email) === emailKey(input.email))) errors.email = 'This email is already in use.';
    return errors;
  }
  function companyFields(input) {
    const errors = {};
    if (!clean(input.companyName)) errors.companyName = 'Enter a company name.';
    if (!/^([01]\d|2[0-3]):[0-5]\d$/.test(input.officeStart || '')) errors.officeStart = 'Enter a valid office start time.';
    if (clean(String(input.graceMinutes ?? '')) === '' || !Number.isInteger(Number(input.graceMinutes)) || Number(input.graceMinutes) < 0 || Number(input.graceMinutes) > 1440) errors.graceMinutes = 'Enter whole grace minutes from 0 to 1440.';
    if (clean(String(input.yearlyLeaveQuota ?? '')) === '' || !Number.isInteger(Number(input.yearlyLeaveQuota)) || Number(input.yearlyLeaveQuota) < 0 || Number(input.yearlyLeaveQuota) > 366) errors.yearlyLeaveQuota = 'Enter a whole yearly leave quota from 0 to 366.';
    if (!Array.isArray(input.workingDays) || !input.workingDays.length || input.workingDays.some(d => !Number.isInteger(d) || d < 0 || d > 6) || new Set(input.workingDays).size !== input.workingDays.length) errors.workingDays = 'Choose at least one working day.';
    return errors;
  }
  function check(errors) { if (Object.keys(errors).length) throw new ValidationError(errors); }
  function companyValue(input, existingId) {
    return { id: existingId || id(), name: clean(input.companyName), officeStart: input.officeStart, graceMinutes: Number(input.graceMinutes), yearlyLeaveQuota: Number(input.yearlyLeaveQuota), workingDays: [...input.workingDays].sort() };
  }
  function create(storage, { clock = () => new Date() } = {}) {
    function currentUser() {
      const s = storage.state();
      if (!s.initialized || !s.session) return null;
      return s.users.find(u => u.id === s.session.userId) || null;
    }
    function requireRole(roles = ['Admin', 'Employee']) {
      const user = currentUser();
      if (!user || !roles.includes(user.role)) throw new Error('You do not have permission to perform this action. Sign in with the appropriate account.');
      return user;
    }
    function route(page) {
      const s = storage.state(), user = currentUser();
      if (!s.initialized) return page === 'index' ? null : 'index';
      if (!user) return page === 'index' ? null : 'index';
      if (page === 'index') return user.role === 'Admin' ? 'admin' : 'employee';
      if (['admin', 'employees', 'leaves', 'settings'].includes(page) && user.role !== 'Admin') return 'employee';
      if (page === 'employee' && user.role !== 'Employee') return 'admin';
      return null;
    }
    async function setup(input) {
      if (storage.state().initialized) throw new Error('Setup is already complete. Sign in to edit company settings.');
      const errors = { ...companyFields(input), ...identityFields(input, []) };
      passwordFields(input.password, errors);
      if (input.password !== input.confirmPassword) errors.confirmPassword = 'Passwords must match.';
      check(errors);
      const password = await hashPassword(input.password);
      // Re-check after asynchronous password hashing to prevent a second setup overwriting data.
      if (storage.state().initialized) throw new Error('Setup has already been completed. Sign in instead.');
      const admin = { id: id(), name: clean(input.name), email: emailKey(input.email), role: 'Admin', password };
      storage.write({ company: companyValue(input), users: [admin], attendance: [], leaves: [], announcements: [], session: null });
    }
    async function login(input) {
      const errors = {};
      if (!clean(input.email)) errors.email = 'Enter your email address.';
      else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(clean(input.email))) errors.email = 'Enter a valid email address.';
      if (!input.password) errors.password = 'Enter your password.';
      check(errors);
      const state = storage.state();
      if (!state.initialized) throw new Error('Complete company setup first.');
      const user = state.users.find(u => emailKey(u.email) === emailKey(input.email));
      if (!user || (await hashPassword(input.password, user.password.salt)).hash !== user.password.hash) throw new Error('Email or password is incorrect.');
      const fresh = storage.state().users.find(u => u.id === user.id);
      if (!fresh || JSON.stringify(fresh.password) !== JSON.stringify(user.password) || fresh.email !== user.email) throw new Error('This account changed while signing in. Please try again.');
      storage.write({ session: { userId: user.id } });
      return user.role;
    }
    function logout() { storage.write({ session: null }); }
    async function changePassword(input) {
      const user = requireRole(), errors = {};
      if (!input.currentPassword) errors.currentPassword = 'Enter your current password.';
      passwordFields(input.newPassword, errors, 'newPassword');
      if (input.newPassword !== input.confirmPassword) errors.confirmPassword = 'Passwords must match.';
      if (input.currentPassword && input.currentPassword === input.newPassword) errors.newPassword = 'Choose a different password.';
      check(errors);
      if ((await hashPassword(input.currentPassword, user.password.salt)).hash !== user.password.hash) throw new ValidationError({ currentPassword: 'Current password is incorrect.' });
      const password = await hashPassword(input.newPassword), fresh = requireRole();
      if (fresh.id !== user.id || JSON.stringify(fresh.password) !== JSON.stringify(user.password)) throw new Error('Your account changed. Please try again.');
      const s = storage.state();
      storage.write({ users: s.users.map(u => u.id === user.id ? { ...u, password } : u) });
    }
    function employeeErrors(input, users, exceptId) {
      const errors = identityFields(input, users, exceptId);
      if (!clean(input.department)) errors.department = 'Enter a department.';
      if (clean(String(input.monthlySalary ?? '')) === '' || !Number.isFinite(Number(input.monthlySalary)) || Number(input.monthlySalary) <= 0) errors.monthlySalary = 'Enter a salary greater than zero.';
      if (!root.HCMStorage.validDate(input.joiningDate)) errors.joiningDate = 'Enter a valid joining date.';
      return errors;
    }
    const employeeValue = input => ({ name: clean(input.name), email: emailKey(input.email), department: clean(input.department), monthlySalary: Number(input.monthlySalary), joiningDate: input.joiningDate });
    async function addEmployee(input) {
      requireRole(['Admin']);
      const errors = employeeErrors(input, storage.state().users);
      passwordFields(input.password, errors); check(errors);
      const password = await hashPassword(input.password);
      requireRole(['Admin']);
      const s = storage.state(); check(employeeErrors(input, s.users));
      const user = { id: id(), ...employeeValue(input), role: 'Employee', password };
      storage.write({ users: [...s.users, user] });
      return user.id;
    }
    function editEmployee(userId, input) {
      requireRole(['Admin']);
      const s = storage.state();
      if (!s.users.some(u => u.id === userId && u.role === 'Employee')) throw new Error('This employee no longer exists. Refresh the list.');
      check(employeeErrors(input, s.users, userId));
      storage.write({ users: s.users.map(u => u.id === userId ? { ...u, ...employeeValue(input) } : u) });
    }
    function deleteEmployee(userId) {
      requireRole(['Admin']);
      const s = storage.state();
      if (!s.users.some(u => u.id === userId && u.role === 'Employee')) throw new Error('This employee no longer exists. Refresh the list.');
      storage.write({ users: s.users.filter(u => u.id !== userId) });
    }
    function employees(query = '', department = '') {
      requireRole(['Admin']);
      const term = clean(query).toLowerCase();
      return storage.state().users.filter(u => u.role === 'Employee' && (!department || u.department === department) && (!term || `${u.name} ${u.email}`.toLowerCase().includes(term)));
    }
    function saveSettings(input) {
      requireRole(['Admin']); check(companyFields(input));
      storage.write({ company: companyValue(input, storage.state().company.id) });
    }
    const leaves = root.HCMLeaves.create(storage, requireRole, { clock, makeId: id });
    const attendance = root.HCMAttendance.create(storage, requireRole, { clock, makeId: id });
    function getState() {
      const state = storage.state(), user = currentUser();
      return { ...state,
        attendance: user?.role === 'Admin' ? state.attendance : user ? state.attendance.filter(a => a.employeeId === user.id) : [],
        leaves: user?.role === 'Admin' ? state.leaves : user ? state.leaves.filter(l => l.employeeId === user.id) : [] };
    }
    return Object.freeze({ currentUser, route, setup, login, logout, changePassword, addEmployee, editEmployee, deleteEmployee, employees, saveSettings, attendance, leaves, getState });
  }
  root.HCM = Object.freeze({ create, ValidationError, localDate });
})(globalThis);
