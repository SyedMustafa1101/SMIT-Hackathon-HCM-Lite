/* Shared DOM helpers. User-entered values are assigned as text/value, never HTML. */
(function (root) {
  'use strict';
  const byId = id => document.getElementById(id);
  const motionStyle = getComputedStyle(document.documentElement);
  const timing = (name, fallback) => Number.parseFloat(motionStyle.getPropertyValue(`--motion-${name}`)) || fallback;
  const motion = { enter: timing('enter', 340), artwork: timing('artwork', 700), feedback: timing('feedback', 160), stagger: timing('stagger', 35), cap: timing('stagger-cap', 105), ease: motionStyle.getPropertyValue('--ease').trim() || 'ease-out' };
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
    return `<section class="field-group full"><div class="group-label"><span class="step">01</span><div><h3>Company identity</h3><p class="help">The name your team sees across the workspace.</p></div></div>${field('companyName', 'Company name', 'text', 'autocomplete="organization" maxlength="120"')}</section>
      <section class="field-group full"><div class="group-label"><span class="step">02</span><div><h3>Attendance schedule</h3><p class="help">Set the start of the day and the days your team works.</p></div></div><div class="grid">
      ${field('officeStart', 'Office start time', 'time')}
      ${field('graceMinutes', 'Grace period (minutes)', 'number', 'min="0" max="1440" step="1"')}
      <fieldset class="full" id="field-workingDays" aria-describedby="error-workingDays"><legend>Working days (choose at least one)</legend><div class="days">${dayNames.map((name, i) => `<label><input name="workingDays" type="checkbox" value="${i}">${name}</label>`).join('')}</div><span id="error-workingDays" class="field-error"></span></fieldset></div></section>
      <section class="field-group full"><div class="group-label"><span class="step">03</span><div><h3>Leave allowance</h3><p class="help">One annual quota shared by Casual, Sick and Other leave.</p></div></div>${field('yearlyLeaveQuota', 'Yearly leave quota (days)', 'number', 'min="0" max="366" step="1"')}</section>`;
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
    if (!matchMedia('(prefers-reduced-motion: reduce)').matches && typeof node.animate === 'function') {
      animate(node, [{ opacity: .75 }, { opacity: 1 }], { duration: motion.feedback, easing: 'ease-out' });
    }
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
  const asset = file => `${document.body.dataset.page === 'index' ? '' : '../'}assets/${file}`;
  const iconPaths = {
    admin: 'M3 3h7v7H3zM14 3h7v7h-7zM3 14h7v7H3zM14 14h7v7h-7z',
    employees: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    leaves: 'M8 2v4M16 2v4M3 10h18M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2M8 15l3 3 5-5',
    settings: 'M4 7h16M4 17h16M8 4v6M16 14v6',
    employee: 'M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18M12 7v5l3 2',
    payslip: 'M6 3h12v18l-3-2-3 2-3-2-3 2zM9 8h6M9 12h6',
    arrow: 'M5 12h14M14 7l5 5-5 5'
  };
  function icon(name) {
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('viewBox', '0 0 24 24'); svg.setAttribute('aria-hidden', 'true'); svg.classList.add('icon');
    const p = document.createElementNS(svg.namespaceURI, 'path'); p.setAttribute('d', iconPaths[name] || iconPaths.employee); svg.append(p); return svg;
  }
  let headerController;
  function header(app, page) {
    headerController?.abort(); headerController = new AbortController();
    const signal = headerController.signal;
    const user = app.currentUser(), state = app.getState(), target = byId('header');
    document.body.classList.toggle('authenticated', !!user);
    target.replaceChildren();
    const inner = el('div', undefined, 'header-inner'), identity = el('div');
    identity.className = 'workspace-identity';
    const brand = el('a', undefined, 'brand'); brand.href = path(user ? (user.role === 'Admin' ? 'admin' : 'employee') : 'index');
    const mark = el('img'); mark.src = asset('logo.svg'); mark.alt = ''; mark.width = 36; mark.height = 36;
    brand.append(mark, el('span', 'HCM Lite'));
    identity.append(brand, el('div', state.company ? state.company.name : 'People. Work. In sync.', 'company-label')); inner.append(identity);
    if (user) {
      const toggle = el('button', 'Menu', 'menu-toggle'); toggle.type = 'button'; toggle.id = 'menu-toggle';
      toggle.setAttribute('aria-controls', 'main-navigation'); toggle.setAttribute('aria-expanded', 'false'); inner.append(toggle);
      const nav = el('nav'); nav.id = 'main-navigation'; nav.setAttribute('aria-label', 'Main navigation');
      const links = user.role === 'Admin' ? [['admin', 'Dashboard'], ['employees', 'Employees'], ['leaves', 'Leave requests'], ['settings', 'Settings'], ['payslip', 'Payslip']] : [['employee', 'My dashboard'], ['payslip', 'My payslip']];
      links.forEach(([destination, label]) => { const link = el('a'); link.append(icon(destination), el('span', label)); link.href = path(destination); if (page === destination) link.setAttribute('aria-current', 'page'); nav.append(link); });
      inner.append(el('p', user.role === 'Admin' ? 'WORKSPACE' : 'MY WORKSPACE', 'nav-label'), nav);
      const mobile = matchMedia('(max-width: 960px)');
      function menu(open, focus = false) { nav.hidden = mobile.matches && !open; toggle.setAttribute('aria-expanded', String(mobile.matches && open)); if (focus) toggle.focus(); }
      toggle.addEventListener('click', () => menu(toggle.getAttribute('aria-expanded') !== 'true'), { signal });
      document.addEventListener('keydown', event => { if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { menu(false, true); } }, { signal });
      mobile.addEventListener('change', () => { const inside = nav.contains(document.activeElement); menu(false, inside && mobile.matches); }, { signal }); menu(false);
      target.append(inner);
      const account = el('div', undefined, 'account-bar');
      account.append(el('span', `${user.name} · ${user.role}`, 'account-name'));
      const password = el('button', 'Change my password', 'secondary'); password.type = 'button';
      password.addEventListener('click', () => { byId('password-panel').open = true; byId('currentPassword').focus(); });
      const logout = el('button', 'Log out', 'secondary'); logout.type = 'button';
      logout.addEventListener('click', () => { try { app.logout(); go('index'); } catch (error) { message(byId('fatal'), error.message, 'error'); } });
      account.append(password, logout); target.append(account);
    } else { inner.append(el('span', 'Your people workspace', 'auth-header-label')); target.append(inner); }
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
    const heading = el('div', undefined, 'section-head'); heading.append(el('h2', title));
    const box = el('div', undefined, 'empty'); box.append(el('p', text)); card.append(heading, box); return card;
  }
  function badge(text, status = text) {
    const node = el('span', text, 'badge');
    node.dataset.tone = ['Approved', 'Present'].includes(status) ? 'positive' : ['Pending', 'Late', 'Half day', 'Provisional'].includes(status) ? 'warning' : ['Rejected', 'Absent'].includes(status) ? 'negative' : 'neutral'; return node;
  }
  function metric(label, value, detail, symbol) {
    const node = el('article', undefined, 'metric-card');
    const top = el('div', undefined, 'metric-label'); top.append(el('span', label), icon(symbol));
    node.append(top, el('strong', value, 'metric-value'), el('span', detail, 'metric-detail')); return node;
  }
  // Motion never hides content. Only the first page construction receives entrances.
  let observer, entrancePlayed = false, motionController;
  const motions = new Set();
  function animate(node, frames, options) {
    const animation = node.animate(frames, options); motions.add(animation);
    animation.finished.then(() => motions.delete(animation), () => motions.delete(animation)); return animation;
  }
  function cleanup() { observer?.disconnect(); observer = null; motions.forEach(a => a.cancel()); motions.clear(); motionController?.abort(); }
  function enhance() {
    if (entrancePlayed) return; entrancePlayed = true;
    const preference = matchMedia('(prefers-reduced-motion: reduce)');
    if (preference.matches || typeof window.IntersectionObserver !== 'function' || typeof Element.prototype.animate !== 'function') return;
    motionController = new AbortController();
    preference.addEventListener('change', () => { if (preference.matches) cleanup(); }, { signal: motionController.signal });
    observer = new IntersectionObserver(entries => {
      if (preference.matches || !observer) return;
      entries.forEach(entry => { if (!entry.isIntersecting) return;
        observer.unobserve(entry.target);
        animate(entry.target, [{ opacity: .92, transform: 'translateY(10px)' }, { opacity: 1, transform: 'none' }], { duration: motion.enter, delay: Number(entry.target.dataset.stagger || 0), easing: motion.ease });
      });
    }, { threshold: .06 });
    document.querySelectorAll('.page-heading, #content > .card, .metric-card, .auth-story').forEach((node, i) => { node.dataset.stagger = String(Math.min(i % 4 * motion.stagger, motion.cap)); observer.observe(node); });
    const artwork = document.querySelector('.auth-art');
    if (artwork) animate(artwork, [{ transform: 'translateY(6px) scale(.985)' }, { transform: 'none' }], { duration: motion.artwork, easing: 'ease-out' });
  }
  window.addEventListener('beforeprint', cleanup);
  window.addEventListener('pagehide', cleanup);
  root.HCMUI = { byId, el, field, companyFields, formNotice, values, clearErrors, message, bindForm, fill, path, go, header, passwordPanel, empty, asset, icon, badge, metric, enhance, cleanup };
})(globalThis);
