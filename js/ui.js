/* Shared DOM helpers. User-entered values are assigned as text/value, never HTML. */
(function (root) {
  'use strict';
  const byId = id => document.getElementById(id);
  function el(tag, text, className) {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  }
  function field(name, label, type = 'text', extra = '') {
    return `<div class="field" id="field-${name}"><label for="${name}">${label}</label><input id="${name}" name="${name}" type="${type}" required aria-describedby="error-${name}" ${extra}><span id="error-${name}" class="field-error"></span></div>`;
  }
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  function companyFields() {
    return `${field('companyName', 'Company name', 'text', 'autocomplete="organization" maxlength="120"')}
      ${field('officeStart', 'Office start time', 'time')}
      ${field('graceMinutes', 'Grace period (minutes)', 'number', 'min="0" max="1440" step="1"')}
      ${field('yearlyLeaveQuota', 'Yearly leave quota (days)', 'number', 'min="0" max="366" step="1"')}
      <fieldset class="full" id="field-workingDays" aria-describedby="error-workingDays"><legend>Working days (choose at least one)</legend><div class="days">${dayNames.map((name, i) => `<label><input name="workingDays" type="checkbox" value="${i}">${name}</label>`).join('')}</div><span id="error-workingDays" class="field-error"></span></fieldset>`;
  }
  function formNotice(id) { return `<div id="${id}" class="notice" role="status" tabindex="-1" hidden></div>`; }
  function values(form) {
    const result = Object.fromEntries(new FormData(form));
    if (form.querySelector('[name="workingDays"]')) result.workingDays = new FormData(form).getAll('workingDays').map(Number);
    return result;
  }
  function clearErrors(form) {
    form.querySelectorAll('.field-error').forEach(node => { node.textContent = ''; });
    form.querySelectorAll('[aria-invalid]').forEach(node => node.removeAttribute('aria-invalid'));
  }
  function message(node, text, kind = 'success') {
    node.className = `notice ${kind}`;
    node.textContent = text;
    node.hidden = false;
  }
  function showError(error, form, status) {
    message(status, error.message || 'An unexpected error occurred. Please try again.', 'error');
    if (error.fields) {
      Object.entries(error.fields).forEach(([name, text]) => {
        const output = form.querySelector(`#error-${name}`);
        if (output) output.textContent = text;
        const input = form.querySelector(`[name="${name}"]`);
        if (input) input.setAttribute('aria-invalid', 'true');
      });
      const first = form.querySelector('[aria-invalid="true"]');
      if (first) first.focus(); else status.focus();
    } else status.focus();
  }
  function bindForm(form, status, action) {
    let busy = false;
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (busy) return;
      clearErrors(form); status.hidden = true;
      const input = values(form), submit = form.querySelector('[type="submit"]');
      busy = true; submit.disabled = true; form.setAttribute('aria-busy', 'true');
      try { await action(input); }
      catch (error) { showError(error, form, status); }
      finally { busy = false; submit.disabled = false; form.removeAttribute('aria-busy'); }
    });
  }
  function fill(form, data) {
    Object.entries(data).forEach(([name, value]) => {
      if (name === 'workingDays') form.querySelectorAll('[name="workingDays"]').forEach(input => { input.checked = value.includes(Number(input.value)); });
      else if (form.elements.namedItem(name)) form.elements.namedItem(name).value = value;
    });
  }
  function path(page) {
    const inside = document.body.dataset.page !== 'index';
    return page === 'index' ? (inside ? '../index.html' : 'index.html') : `${inside ? '' : 'pages/'}${page}.html`;
  }
  const go = page => window.location.replace(path(page));
  function header(app, page) {
    const user = app.currentUser(), state = app.getState(), target = byId('header');
    target.replaceChildren();
    const inner = el('div', undefined, 'header-inner'), identity = el('div');
    const brand = el('a', 'HCM Lite', 'brand'); brand.href = path(user ? (user.role === 'Admin' ? 'admin' : 'employee') : 'index');
    identity.append(brand, el('div', state.company ? state.company.name : 'Saylani · Beginner Track', 'company-label')); inner.append(identity);
    if (user) {
      const nav = el('nav'); nav.setAttribute('aria-label', 'Main navigation');
      const links = user.role === 'Admin' ? [['admin', 'Dashboard'], ['employees', 'Employees'], ['leaves', 'Leave requests'], ['settings', 'Settings'], ['payslip', 'Payslip']] : [['employee', 'My dashboard'], ['payslip', 'My payslip']];
      links.forEach(([destination, label]) => { const link = el('a', label); link.href = path(destination); if (page === destination) link.setAttribute('aria-current', 'page'); nav.append(link); });
      inner.append(nav);
      target.append(inner);
      const account = el('div', undefined, 'account-bar');
      account.append(el('span', `${user.name} · ${user.role}`, 'account-name'));
      const password = el('button', 'Change my password', 'secondary'); password.type = 'button';
      password.addEventListener('click', () => { byId('password-panel').open = true; byId('currentPassword').focus(); });
      const logout = el('button', 'Log out', 'secondary'); logout.type = 'button';
      logout.addEventListener('click', () => { try { app.logout(); go('index'); } catch (error) { message(byId('fatal'), error.message, 'error'); } });
      account.append(password, logout); target.append(account);
    } else target.append(inner);
  }
  function passwordPanel(app) {
    const panel = el('details', undefined, 'card'); panel.id = 'password-panel';
    panel.innerHTML = `<summary>Change my password</summary><p class="help">Update your own login password. Use at least 8 characters.</p><form id="password-form" novalidate>${formNotice('password-status')}<div class="grid">${field('currentPassword', 'Current password', 'password', 'autocomplete="current-password"')}${field('newPassword', 'New password', 'password', 'autocomplete="new-password" minlength="8"')}${field('confirmPassword', 'Confirm new password', 'password', 'autocomplete="new-password" minlength="8"')}</div><div class="actions"><button type="submit">Update my password</button></div></form>`;
    byId('content').append(panel);
    const form = byId('password-form');
    bindForm(form, byId('password-status'), async input => { await app.changePassword(input); form.reset(); message(byId('password-status'), 'Your password has been changed. Use the new password next time you sign in.'); });
  }
  function empty(title, text, phase) {
    const card = el('section', undefined, 'card');
    const heading = el('div', undefined, 'section-head'); heading.append(el('h2', title), el('span', `Phase ${phase}`, 'tag'));
    const box = el('div', undefined, 'empty'); box.append(el('p', text)); card.append(heading, box); return card;
  }
  root.HCMUI = { byId, el, field, companyFields, formNotice, values, clearErrors, message, bindForm, fill, path, go, header, passwordPanel, empty };
})(globalThis);
