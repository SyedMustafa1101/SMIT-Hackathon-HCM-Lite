/* Page event handlers call domain methods; business and storage rules live elsewhere. */
(function () {
  'use strict';
  const UI = HCMUI, page = document.body.dataset.page;
  let app, renderedAccount, reviewDraft;
  function heading(title, description) {
    const top = UI.el('div', undefined, 'workspace-line');
    top.append(UI.el('span', app.currentUser().role === 'Admin' ? 'Workspace / Administration' : 'Workspace / My work'), UI.el('span', new Date().toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })));
    const head = UI.el('div', undefined, 'page-heading'); head.append(UI.el('p', 'People. Work. In sync.', 'eyebrow'), UI.el('h1', title), UI.el('p', description, 'intro'));
    UI.byId('content').append(top, head);
  }
  function index() {
    const setup = !app.getState().initialized;
    const story = UI.el('aside', undefined, 'auth-story');
    story.innerHTML = '<p class="eyebrow">A little structure. More possibility.</p><h2>Good work starts with your people.</h2><p>Bring your team, attendance and time off together. A calmer way to manage the everyday.</p>';
    const art = UI.el('img', undefined, 'auth-art'); art.src = UI.asset('team-work.webp'); art.alt = ''; art.width = 800; art.height = 800; art.decoding = 'async';
    art.addEventListener('error', () => { art.style.visibility = 'hidden'; }, { once: true });
    story.append(art, UI.el('div', 'One workspace. A more organized day.', 'story-bottom'));
    const card = UI.el('section', undefined, `card auth-card ${setup ? '' : 'login-card'}`);
    card.innerHTML = setup ? `<h1>Set up your company</h1><p class="intro">Start with an empty workspace. Create your company and its Admin account, then add your employees.</p><p class="help">All fields are required. Choose your working days. Zero grace minutes and zero leave days are allowed.</p><form id="setup-form" novalidate>${UI.formNotice('auth-status')}<h2>Company & working rules</h2><div class="grid">${UI.companyFields()}</div><h2>Admin account</h2><div class="grid">${UI.field('name', 'Admin name', 'text', 'autocomplete="name" maxlength="120"')}${UI.field('email', 'Admin email', 'email', 'autocomplete="username" maxlength="254"')}${UI.field('password', 'Password (at least 8 characters)', 'password', 'autocomplete="new-password" minlength="8"')}${UI.field('confirmPassword', 'Confirm password', 'password', 'autocomplete="new-password" minlength="8"')}</div><div class="actions"><button type="submit">Create company & Admin</button></div></form>` : `<h1>Sign in</h1><p class="intro">Welcome back. Use your Admin account or the Employee login created by your Admin.</p><form id="login-form" novalidate>${UI.formNotice('auth-status')}<div class="grid">${UI.field('email', 'Email', 'email', 'autocomplete="username" maxlength="254"')}${UI.field('password', 'Password', 'password', 'autocomplete="current-password"')}</div><div class="actions"><button type="submit">Sign in</button></div></form><p class="help">Company setup is complete. Your Admin manages employee accounts and company settings.</p>`;
    UI.byId('content').append(story, card);
    const note = UI.el('p', 'Learning demonstration: accounts and data exist only in this browser. Browser-only authentication cannot protect real HR or payroll data. Use sample information you create yourself.', 'auth-note'); UI.byId('content').append(note);
    if (setup) UI.bindForm(UI.byId('setup-form'), UI.byId('auth-status'), async input => { await app.setup(input); render(); UI.message(UI.byId('auth-status'), 'Company created. Sign in with your new Admin account.'); });
    else UI.bindForm(UI.byId('login-form'), UI.byId('auth-status'), async input => { const role = await app.login(input); UI.go(role === 'Admin' ? 'admin' : 'employee'); });
  }
  function admin() {
    heading('Admin dashboard', 'Manage employees, settings, attendance, leave, payslips and announcements. Ask supported questions using the keyword helper.');
    const card = UI.el('section', undefined, 'card workspace-card'); card.innerHTML = `<h2>A well-organized team starts here.</h2><p>Add an employee to create their login, or keep your company rules up to date.</p><div class="actions"><a class="button" href="employees.html">Manage employees</a><a class="button secondary" href="settings.html">Company settings</a></div>`; UI.byId('content').append(card);
    const leaveCard = UI.el('section', undefined, 'card leave-overview-card'); leaveCard.innerHTML = '<h2>Time off, in view</h2><p id="leave-overview" role="status"></p><a href="leaves.html">Review leave requests →</a>'; UI.byId('content').append(leaveCard);
    const totals = app.leaves.overview(); UI.byId('leave-overview').textContent = `${totals.pending} pending leave requests. ${totals.approvedToday} current employees on approved leave today (configured working dates only).`;
    attendanceView(true);
    announcementsView(true); helperView();
  }
  function employees() {
    heading('Employees', 'Your people, organized. Find a colleague or add an employee and their login in one step.');
    const editor = UI.el('section', undefined, 'card');
    editor.innerHTML = `<h2 id="editor-title">Add employee</h2><form id="employee-form" novalidate>${UI.formNotice('employee-status')}<div class="grid">${UI.field('name', 'Full name', 'text', 'autocomplete="off" maxlength="120"')}${UI.field('email', 'Email (login)', 'email', 'autocomplete="off" maxlength="254"')}${UI.field('password', 'Initial password (at least 8 characters)', 'password', 'autocomplete="new-password" minlength="8"')}${UI.field('department', 'Department', 'text', 'maxlength="100" list="department-suggestions"')}${UI.field('monthlySalary', 'Monthly salary', 'number', 'min="0.01" step="any" inputmode="decimal"')}${UI.field('joiningDate', 'Joining date', 'date')}</div><datalist id="department-suggestions"></datalist><p id="edit-help" class="help" hidden>Editing keeps the employee's ID and password. Employees change their own password after signing in.</p><div class="actions"><button id="employee-submit" type="submit">Add employee & create login</button><button id="cancel-edit" type="button" class="secondary" hidden>Cancel edit</button></div></form>`;
    const listing = UI.el('section', undefined, 'card');
    listing.innerHTML = `<h2>Employee directory</h2>${UI.formNotice('directory-status')}<div class="toolbar"><div><label for="search">Search name or email</label><input id="search" type="search" placeholder="Search employees" autocomplete="off"></div><div><label for="department-filter">Department</label><select id="department-filter"><option value="">All departments</option></select></div></div><p id="list-count" class="help" role="status"></p><p class="help">On smaller screens, scroll the table sideways to see all columns and actions.</p><div class="table-wrap" id="employee-table-wrap" role="region" aria-label="Employee directory, scroll horizontally for all columns" tabindex="0"><table><caption class="help">Employee accounts and salary details</caption><thead><tr><th scope="col">Name / email</th><th scope="col">Department</th><th scope="col">Monthly salary</th><th scope="col">Joining date</th><th scope="col">Actions</th></tr></thead><tbody id="employee-rows"></tbody></table></div><div id="directory-empty" class="empty" hidden></div>`;
    editor.id = 'employee-editor';
    const add = UI.el('a', 'Add an employee', 'button'); add.href = '#employee-form'; add.addEventListener('click', event => { event.preventDefault(); if (UI.byId('employee-form').dataset.editingId) resetEditor(); UI.byId('name').focus(); });
    const listingHead = UI.el('div', undefined, 'section-head'); listingHead.append(listing.querySelector('h2'), add); listing.prepend(listingHead);
    UI.byId('content').append(listing, editor);
    const form = UI.byId('employee-form'); let editingId = null;
    function resetEditor() {
      editingId = null; form.reset(); UI.clearErrors(form); UI.byId('editor-title').textContent = 'Add employee';
      delete form.dataset.editingId;
      UI.byId('employee-submit').textContent = 'Add employee & create login';
      UI.byId('employee-submit').disabled = false;
      UI.byId('field-password').hidden = false; UI.byId('password').disabled = false;
      UI.byId('cancel-edit').hidden = true; UI.byId('edit-help').hidden = true;
    }
    function refreshDirectory() {
      const all = app.employees(), selected = UI.byId('department-filter').value;
      const departments = [...new Set(all.map(u => u.department))].sort((a, b) => a.localeCompare(b));
      const select = UI.byId('department-filter'); select.replaceChildren();
      const any = UI.el('option', 'All departments'); any.value = ''; select.append(any);
      departments.forEach(d => { const option = UI.el('option', d); option.value = d; select.append(option); });
      select.value = departments.includes(selected) ? selected : '';
      const suggestions = UI.byId('department-suggestions'); suggestions.replaceChildren();
      departments.forEach(d => { const option = UI.el('option'); option.value = d; suggestions.append(option); });
      const matches = app.employees(UI.byId('search').value, select.value), rows = UI.byId('employee-rows'); rows.replaceChildren();
      UI.byId('list-count').textContent = `${matches.length} matching / ${all.length} employee${all.length === 1 ? '' : 's'}`;
      UI.byId('employee-table-wrap').hidden = !matches.length; UI.byId('directory-empty').hidden = !!matches.length;
      UI.byId('directory-empty').textContent = all.length ? 'No employees match this search and department. Change either filter to see more results.' : 'No employees yet. Add your first employee below to create their login.';
      matches.forEach(user => {
        const tr = UI.el('tr'), identity = UI.el('td'); identity.append(UI.el('strong', user.name), UI.el('div', user.email, 'muted')); tr.append(identity);
        tr.append(UI.el('td', user.department), UI.el('td', user.monthlySalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 20 })), UI.el('td', user.joiningDate));
        const actions = UI.el('div', undefined, 'actions'), td = UI.el('td');
        const edit = UI.el('button', 'Edit', 'secondary'); edit.type = 'button'; edit.setAttribute('aria-label', `Edit ${user.name}`);
        edit.dataset.editEmployee = user.id;
        edit.addEventListener('click', () => {
          resetEditor(); editingId = user.id; UI.fill(form, { name: user.name, email: user.email, department: user.department, monthlySalary: user.monthlySalary, joiningDate: user.joiningDate });
          form.dataset.editingId = user.id;
          UI.byId('password').value = ''; UI.byId('password').disabled = true; UI.byId('field-password').hidden = true;
          UI.byId('editor-title').textContent = 'Edit employee'; UI.byId('employee-submit').textContent = 'Save employee';
          UI.byId('cancel-edit').hidden = false; UI.byId('edit-help').hidden = false; UI.byId('employee-status').hidden = true; UI.byId('name').focus();
        });
        const remove = UI.el('button', 'Delete', 'danger'); remove.type = 'button'; remove.setAttribute('aria-label', `Delete ${user.name}`);
        remove.addEventListener('click', () => {
          if (!window.confirm(`Delete ${user.name} (${user.email})? Their login will stop working. This cannot be undone.`)) return;
          try { app.deleteEmployee(user.id); if (editingId === user.id) resetEditor(); refreshDirectory(); UI.message(UI.byId('directory-status'), 'Employee deleted. Their login is no longer available.'); UI.byId('directory-status').focus(); }
          catch (error) { UI.message(UI.byId('directory-status'), error.message, 'error'); }
        });
        actions.append(edit, remove); td.append(actions); tr.append(td); rows.append(tr);
      });
    }
    UI.bindForm(form, UI.byId('employee-status'), async input => {
      const edited = !!editingId;
      if (edited) app.editEmployee(editingId, input); else await app.addEmployee(input);
      resetEditor(); refreshDirectory();
      UI.message(UI.byId('employee-status'), edited ? 'Employee updated. Their existing password still works; use the updated email to sign in.' : 'Employee added. They can sign in with the email and initial password you entered.');
    });
    UI.byId('cancel-edit').addEventListener('click', () => { resetEditor(); UI.byId('employee-status').hidden = true; UI.byId('name').focus(); });
    UI.byId('search').addEventListener('input', refreshDirectory); UI.byId('department-filter').addEventListener('change', refreshDirectory); refreshDirectory();
  }
  function settings() {
    heading('Company settings', 'Attendance, leave and payroll use current saved rules. Working-day/quota edits recalculate historical figures and reservations; leave balances may become negative. Payslips have no historical snapshots. All fields are required.');
    const card = UI.el('section', undefined, 'card');
    card.innerHTML = `<form id="settings-form" novalidate>${UI.formNotice('settings-status')}<div class="grid">${UI.companyFields()}</div><p class="help">Grace minutes: 0–1440. Yearly leave quota: 0–366. Choose at least one working day.</p><div class="actions"><button type="submit">Save settings</button></div></form>`;
    UI.byId('content').append(card);
    const company = app.getState().company, form = UI.byId('settings-form'); UI.fill(form, { ...company, companyName: company.name });
    UI.bindForm(form, UI.byId('settings-status'), input => { app.saveSettings(input); UI.header(app, page); UI.message(UI.byId('settings-status'), 'Company settings saved.'); });
  }
  function employee() {
    const user = app.currentUser(); heading('My dashboard', 'Check in, check out, review attendance and manage your leave. Open My payslip for monthly salary calculations and printing.');
    const card = UI.el('section', undefined, 'card profile-card'); card.append(UI.el('h2', 'My profile'));
    const list = UI.el('dl');
    [['Name', user.name], ['Email', user.email], ['Department', user.department], ['Joining date', user.joiningDate], ['Monthly salary', user.monthlySalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 20 })]].forEach(([label, value]) => list.append(UI.el('dt', label), UI.el('dd', value)));
    card.append(list); UI.byId('content').append(card);
    attendanceView(false);
    UI.byId('content').append(card);
    leaveView(false);
    announcementsView(false); helperView();
  }
  function announcementsView(isAdmin) {
    const section = UI.el('section', undefined, 'card'); section.id = 'announcements-section';
    section.innerHTML = `<h2>Announcements</h2>${isAdmin ? `<form id="announcement-form" novalidate>${UI.formNotice('announcement-status')}${UI.field('announcementTitle', 'Announcement title')}<div class="field"><label for="announcementBody">Announcement message</label><textarea id="announcementBody" name="announcementBody" rows="4" required aria-describedby="error-announcementBody"></textarea><span id="error-announcementBody" class="field-error"></span></div><div class="actions"><button type="submit">Post announcement</button></div></form>` : '<p class="help">Company announcements from your Admin. Employees have read-only access.</p>'}<div class="actions"><button type="button" id="announcements-refresh" class="secondary">Refresh announcements</button></div>${UI.formNotice('announcements-status')}<div id="announcements-list"></div>`;
    UI.byId('content').append(section);
    function refresh() {
      const records = app.announcements.list(), list = UI.byId('announcements-list'); list.replaceChildren();
      if (!records.length) list.append(UI.el('p', 'No announcements yet. Posted announcements will appear here, newest first.', 'empty'));
      records.forEach(record => {
        const article = UI.el('article', undefined, 'announcement');
        const time = UI.el('time', new Date(record.createdAt).toLocaleString()); time.dateTime = record.createdAt;
        const byline = UI.el('p', `By ${record.authorName} · `, 'help'); byline.append(time);
        article.append(UI.el('h3', record.title), byline, UI.el('p', record.body, 'announcement-body')); list.append(article);
      });
    }
    UI.byId('announcements-refresh').addEventListener('click', () => {
      try { refresh(); UI.byId('announcements-status').hidden = true; }
      catch (error) { UI.byId('announcements-list').replaceChildren(); UI.message(UI.byId('announcements-status'), error.message, 'error'); }
    });
    if (isAdmin) UI.bindForm(UI.byId('announcement-form'), UI.byId('announcement-status'), input => {
      app.announcements.post({ title: input.announcementTitle, body: input.announcementBody });
      UI.byId('announcement-form').reset(); refresh(); UI.message(UI.byId('announcement-status'), 'Announcement posted.');
    });
    refresh();
  }
  function helperView() {
    const section = UI.el('section', undefined, 'card'); section.id = 'helper-section';
    section.innerHTML = `<h2>Keyword smart helper</h2><p id="helper-help" class="help">Matches supported questions using JavaScript and current saved data. Ask one question at a time. History stays on this page until reload or an account change.</p><div id="helper-suggestions" class="actions" role="group" aria-label="Suggested questions"></div><form id="helper-form" novalidate>${UI.formNotice('helper-status')}${UI.field('helperQuestion', 'Your question', 'text', 'autocomplete="off" aria-controls="helper-history"')}<div class="actions"><button type="submit">Ask helper</button></div></form><h3>Response history</h3><div id="helper-history" role="log" aria-label="Helper response history" aria-live="polite" aria-relevant="additions" tabindex="0"><p id="helper-empty" class="empty">No questions yet. Type a question or choose a suggestion.</p></div>`;
    UI.byId('content').append(section);
    const form = UI.byId('helper-form'), owner = app.currentUser().id, history = UI.byId('helper-history');
    app.helper.suggestions().forEach(question => {
      const button = UI.el('button', question, 'secondary'); button.type = 'button';
      button.addEventListener('click', () => { UI.byId('helperQuestion').value = question; UI.byId('helperQuestion').focus(); form.requestSubmit(); });
      UI.byId('helper-suggestions').append(button);
    });
    UI.bindForm(form, UI.byId('helper-status'), input => {
      try {
        if (app.currentUser()?.id !== owner) { history.replaceChildren(); render(); return; }
        const result = app.helper.query(input.helperQuestion);
        UI.byId('helper-empty')?.remove();
        const entry = UI.el('div', undefined, 'helper-entry');
        entry.append(UI.el('p', `You: ${input.helperQuestion}`), UI.el('p', `Helper: ${result.answer}`)); history.append(entry);
        history.scrollTop = history.scrollHeight;
        UI.byId('helperQuestion').value = ''; UI.byId('helperQuestion').focus();
      } catch (error) {
        // Never leave privileged answers visible after an invalid session or unreadable data.
        if (!error.fields) history.replaceChildren();
        throw error;
      }
    });
  }
  function attendanceView(isAdmin) {
    const metrics = UI.el('section', undefined, 'dashboard-metrics'); metrics.id = 'dashboard-metrics'; metrics.setAttribute('aria-label', isAdmin ? 'Company overview' : 'My overview');
    UI.byId('content').insertBefore(metrics, UI.byId('content').children[2] || null);
    const section = UI.el('section', undefined, 'card'); section.id = 'attendance-section';
    section.innerHTML = `<h2>${isAdmin ? 'Company attendance' : 'My attendance'}</h2><div id="attendance-overview" class="notice info"></div>${UI.formNotice('attendance-status')}
      ${isAdmin ? '' : '<div id="attendance-current" class="notice info"></div><div class="actions"><button id="check-in" type="button">Check in</button><button id="check-out" type="button" class="secondary">Check out</button></div>'}
      <details class="attendance-policy"><summary>Attendance rules & time policy</summary><p>Times use this device’s local calendar. Nonworking-day check-ins are allowed. Overnight checkout closes the original date; close an open shift before starting another. Long shifts credit only their starting date. Open shifts remain “Checked in” until checkout; under five completed hours is “Half day”. Lateness is kept separately.</p><p>Absences are derived only for elapsed working days on/after joining, using current settings. Today and future dates are excluded. Approved leave excuses working dates; actual attendance takes precedence. These figures are not payroll calculations.</p></details>
      <h3>Attendance history</h3><form id="attendance-filters" novalidate>${UI.formNotice('attendance-filter-status')}<div class="grid">
      ${isAdmin ? '<div class="field full"><label for="attendanceEmployee">Employee</label><select id="attendanceEmployee" name="employeeId"><option value="">All employees</option></select></div>' : ''}
      ${UI.field('attendanceFrom', 'From date (optional)', 'date')}${UI.field('attendanceTo', 'To date (optional)', 'date')}</div><div class="actions"><button type="submit">Apply attendance filters</button><button id="attendance-refresh" type="button" class="secondary">Refresh attendance</button></div></form>
      <p class="help">Dates include both endpoints and refer to the check-in date. Default: current month through today. Clear dates for all history. Scroll the table sideways on small screens.</p>
      <p id="attendance-range-summary" role="status"></p><div id="attendance-empty" class="empty" hidden></div>
      <div id="attendance-history" class="table-wrap" role="region" aria-label="Attendance history, scroll horizontally for all columns" tabindex="0"><table><caption>Saved attendance, derived absence and approved leave</caption><thead><tr>${isAdmin ? '<th scope="col">Employee</th>' : ''}<th scope="col">Date</th><th scope="col">Check-in</th><th scope="col">Check-out</th><th scope="col">Status</th><th scope="col">Late at check-in</th><th scope="col">Completed duration</th></tr></thead><tbody id="attendance-rows"></tbody></table></div>`;
    UI.byId('content').append(section);
    const filters = UI.byId('attendance-filters');
    if (!isAdmin) { const current = UI.byId('attendance-current'); section.querySelector('h2').after(current, current.nextElementSibling); }
    filters.querySelectorAll('input').forEach(input => { input.required = false; });
    const today = HCM.localDate(); UI.fill(filters, { attendanceFrom: `${today.slice(0, 7)}-01`, attendanceTo: today });
    if (isAdmin) app.attendance.employeeOptions().forEach(user => { const option = UI.el('option', user.name); option.value = user.id; UI.byId('attendanceEmployee').append(option); });
    function duration(ms) {
      if (ms === null || ms === undefined) return 'Not completed';
      const seconds = Math.floor(ms / 1000);
      return `${Math.floor(seconds / 3600)}h ${Math.floor(seconds % 3600 / 60)}m ${seconds % 60}s`;
    }
    function overview() {
      const view = app.attendance.overview(), summary = UI.byId('attendance-overview'); summary.replaceChildren();
      const leave = app.leaves.overview(); metrics.replaceChildren();
      const cards = isAdmin ? [
        ['Total employees', view.employeeCount, 'Current employee accounts', 'employees'],
        ['Check-ins today', view.daily.records, `${view.daily.open} open · ${view.daily.completed} completed`, 'employee'],
        ['Late today', view.daily.late, 'Includes open and half-day shifts', 'employee'],
        ['Pending leave', leave.pending, 'Requests awaiting your review', 'leaves']
      ] : [
        ['Completed hours', (view.monthly.durationMs / 3600000).toFixed(2), 'This month · unfinished shifts excluded', 'employee'],
        ['Late check-ins', view.monthly.late, 'This month · includes half days', 'employee'],
        ['Leave available', app.leaves.balance(HCM.localDate().slice(0, 4)).available, 'This year · after pending reservations', 'leaves'],
        ['Pending leave', leave.pending, 'Your requests awaiting review', 'leaves']
      ];
      cards.forEach(args => metrics.append(UI.metric(...args)));
      if (isAdmin) summary.append(UI.el('p', `${view.employeeCount} current Employee account${view.employeeCount === 1 ? '' : 's'}.`));
      summary.append(UI.el('p', `Today (${view.today}): ${view.daily.records} check-ins, ${view.daily.open} open, ${view.daily.completed} completed, ${view.daily.late} late check-ins, ${view.daily.halfDays} half days, ${view.daily.approvedLeave} excused leave days without attendance.`));
      summary.append(UI.el('p', `This month (${view.month} through ${view.today}): ${view.monthly.absent} elapsed working-day absences, ${view.monthly.approvedLeave} approved leave days without attendance. Completed work: ${duration(view.monthly.durationMs)}.`));
      summary.append(UI.el('small', 'Late counts include open and half-day shifts. Absence excludes today and approved leave; actual attendance takes precedence.'));
      if (!isAdmin) {
        const current = app.attendance.current(), record = current.open || current.todayRecord;
        let label = record ? `${record.date}: ${record.status}. Late at check-in: ${record.isLate ? 'Yes' : 'No'}.` : 'No check-in recorded today.';
        if (current.open && current.open.date !== current.today) label += ' Close this earlier shift before checking in for a new date.';
        if (!current.workingDay) label += ' Today is a nonworking day; check-in is optional.';
        if (current.beforeJoining) label += ' Check-in is available from your joining date.';
        UI.byId('attendance-current').textContent = label;
        UI.byId('check-in').disabled = !!(current.open || current.todayRecord || current.beforeJoining);
        UI.byId('check-out').disabled = !current.open;
      }
    }
    function history() {
      UI.byId('attendance-history').hidden = true; UI.byId('attendance-empty').hidden = true; UI.byId('attendance-range-summary').textContent = '';
      const input = UI.values(filters), report = app.attendance.report({ employeeId: input.employeeId || '', from: input.attendanceFrom, to: input.attendanceTo });
      const summary = report.summary;
      UI.byId('attendance-range-summary').textContent = `Filtered: ${summary.records} saved records, ${summary.open} open, ${summary.late} late check-ins, ${summary.halfDays} half days, ${summary.absent} derived absences, ${summary.approvedLeave} approved leave days without attendance. Completed duration: ${duration(summary.durationMs)}. Late counts overlap other statuses.`;
      const rows = UI.byId('attendance-rows'); rows.replaceChildren();
      report.rows.forEach(record => {
        const tr = UI.el('tr');
        if (isAdmin) tr.append(UI.el('td', record.employeeName));
        const status = UI.el('td'); status.append(UI.badge(record.status)); if (record.derived) status.append(UI.el('div', ' (derived)', 'muted'));
        tr.append(UI.el('td', record.date, 'date-cell'), UI.el('td', record.checkIn ? new Date(record.checkIn).toLocaleString() : '—'), UI.el('td', record.checkOut ? new Date(record.checkOut).toLocaleString() : '—'), status, UI.el('td', record.derived ? '—' : record.isLate ? 'Yes' : 'No'), UI.el('td', record.derived ? '—' : duration(record.durationMs))); rows.append(tr);
      });
      UI.byId('attendance-history').hidden = !report.rows.length;
      UI.byId('attendance-empty').hidden = !!report.rows.length;
      UI.byId('attendance-empty').textContent = isAdmin && !app.attendance.employeeOptions().length ? 'No employees or attendance yet. Add an employee to begin.' : 'No attendance or elapsed working-day absences match these filters.';
    }
    function refresh() { overview(); history(); }
    document.addEventListener('hcm-leave-updated', overview, { signal: viewController.signal });
    UI.bindForm(filters, UI.byId('attendance-filter-status'), () => { history(); });
    UI.byId('attendance-refresh').addEventListener('click', () => {
      UI.clearErrors(filters); UI.byId('attendance-filter-status').hidden = true;
      try { refresh(); } catch (error) { UI.message(UI.byId('attendance-filter-status'), error.message, 'error'); }
    });
    if (!isAdmin) ['check-in', 'check-out'].forEach(action => UI.byId(action).addEventListener('click', () => {
      try { const record = action === 'check-in' ? app.attendance.checkIn() : app.attendance.checkOut(); overview(); UI.message(UI.byId('attendance-status'), `${action === 'check-in' ? 'Check-in' : 'Check-out'} saved for ${record.date}. Status: ${record.status}.`); try { history(); } catch (_) { /* A separate filter error does not change a successful saved action. */ } }
      catch (error) { UI.message(UI.byId('attendance-status'), error.message, 'error'); }
    }));
    refresh();
  }
  function leaves() {
    heading('Leave requests', 'Review company leave requests. Only pending requests can be finalized; every decision requires a comment.');
    leaveView(true);
  }
  function leaveView(isAdmin) {
    const section = UI.el('section', undefined, 'card'); section.id = 'leave-section';
    const typeOptions = HCMLeaves.types.map(type => `<option>${type}</option>`).join('');
    section.innerHTML = `<h2>${isAdmin ? 'All leave requests' : 'My leave'}</h2><p class="help">Casual, Sick and Other share one yearly quota. Count inclusive configured working days. Pending requests reserve days; pending and approved ranges block overlap. Split requests at year end. Settings edits recalculate balances and may make them negative.</p>
      ${isAdmin ? '' : `<form id="leave-form" novalidate>${UI.formNotice('leave-status')}<div class="grid"><div class="field"><label for="leaveType">Leave type</label><select id="leaveType" name="leaveType" required aria-describedby="error-leaveType"><option value="">Choose type</option>${typeOptions}</select><span id="error-leaveType" class="field-error"></span></div>${UI.field('leaveFrom', 'Leave From date', 'date')}${UI.field('leaveTo', 'Leave To date', 'date')}${UI.field('leaveReason', 'Reason', 'text')}</div><p id="leave-preview" class="notice info" role="status">Choose dates to preview working days.</p><div class="actions"><button type="submit">Submit leave request</button></div></form><hr><form id="leave-balance-form" novalidate><div class="grid">${UI.field('leaveYear', 'Balance year', 'number', 'min="100" max="9999" step="1"')}</div>${UI.formNotice('leave-balance-status')}<div class="actions"><button type="submit">Show yearly balance</button></div></form><p id="leave-balance" class="notice info" role="status"></p>`}
      <h3>Request history</h3><form id="leave-filters" novalidate>${UI.formNotice('leave-filter-status')}<div class="grid">${isAdmin ? '<div class="field"><label for="leaveEmployee">Employee</label><select id="leaveEmployee" name="employeeId"><option value="">All employees</option></select></div>' : ''}<div class="field"><label for="leaveFilterStatus">Status</label><select id="leaveFilterStatus" name="status"><option value="">All statuses</option><option>Pending</option><option>Approved</option><option>Rejected</option></select></div></div><div class="actions"><button type="submit">Apply leave filters</button><button type="button" id="leave-refresh" class="secondary">Refresh leave</button></div></form>
      <p id="leave-count" role="status"></p><p class="help">History includes every year. Days use current working settings; a changed saved count is shown separately. Scroll the table sideways on small screens.</p><div id="leave-empty" class="empty" hidden></div><div id="leave-history" class="table-wrap" role="region" aria-label="Leave history, scroll horizontally for all columns" tabindex="0"><table><caption>Leave requests and Admin comments</caption><thead><tr>${isAdmin ? '<th scope="col">Employee</th>' : ''}<th scope="col">Type / dates</th><th scope="col">Working days</th><th scope="col">Reason</th><th scope="col">Status / submitted</th><th scope="col">Admin comment / review</th>${isAdmin ? '<th scope="col">Action</th>' : ''}</tr></thead><tbody id="leave-rows"></tbody></table></div>
      ${isAdmin ? `<section id="leave-review" hidden><h3 id="review-title"></h3><p id="review-days" class="notice info"></p><form id="review-form" novalidate>${UI.formNotice('review-status')}<div class="grid"><div class="field"><label for="reviewDecision">Decision</label><select id="reviewDecision" name="reviewDecision" required aria-describedby="error-reviewDecision"><option value="">Choose decision</option><option value="Approved">Approve</option><option value="Rejected">Reject</option></select><span id="error-reviewDecision" class="field-error"></span></div>${UI.field('reviewComment', 'Required Admin comment', 'text')}</div><div class="actions"><button type="submit">Save leave decision</button><button id="review-cancel" type="button" class="secondary">Cancel review</button></div></form></section>` : ''}`;
    UI.byId('content').append(section);
    if (isAdmin) section.querySelector('h2').after(UI.byId('leave-review'));
    const filters = UI.byId('leave-filters'); let selectedReview = null;
    if (isAdmin) app.leaves.employeeOptions().forEach(user => { const option = UI.el('option', user.name); option.value = user.id; UI.byId('leaveEmployee').append(option); });
    function refreshBalance() {
      const b = app.leaves.balance(UI.byId('leaveYear').value);
      UI.byId('leave-balance').textContent = `${b.year}: Annual quota ${b.quota}. Approved ${b.approved} working days. Approved balance ${b.balance}. Pending ${b.pending} days reserved. Available to request ${b.available} days.`;
      document.dispatchEvent(new Event('hcm-leave-updated'));
    }
    function openReview(record) {
      try {
        selectedReview = app.leaves.prepareReview(record.id);
        UI.byId('review-form').reset(); UI.clearErrors(UI.byId('review-form')); UI.byId('review-status').hidden = true;
        UI.byId('review-form').dataset.reviewId = record.id;
        if (reviewDraft?.id === record.id) UI.fill(UI.byId('review-form'), reviewDraft.values);
        UI.byId('review-title').textContent = `Review: ${record.employeeName} · ${record.type} · ${record.from} to ${record.to}`;
        const view = selectedReview;
        UI.byId('review-days').textContent = `Current working-day count: ${view.days}. Saved count: ${view.record.days}.${view.days !== view.record.days ? ' Settings changed the day count; approval will save the current count.' : ''}${view.approvalError ? ` Approval unavailable: ${view.approvalError} You may reject with a comment.` : ' Approval rechecks current employment, overlap and quota, including all pending reservations.'}`;
        UI.byId('reviewDecision').querySelector('[value="Approved"]').disabled = !!view.approvalError;
        UI.byId('leave-review').hidden = false; UI.byId('reviewDecision').focus();
      } catch (error) { UI.message(UI.byId('leave-filter-status'), error.message, 'error'); }
    }
    function history() {
      const records = app.leaves.list(UI.values(filters)), rows = UI.byId('leave-rows'); rows.replaceChildren();
      UI.byId('leave-count').textContent = `${records.length} matching requests. ${app.leaves.overview().pending} pending requests ${isAdmin ? 'across the company' : 'of your own'}.`;
      UI.byId('leave-empty').hidden = !!records.length; UI.byId('leave-history').hidden = !records.length;
      UI.byId('leave-empty').textContent = 'No leave requests match these filters.';
      records.forEach(record => {
        const tr = UI.el('tr');
        if (isAdmin) tr.append(UI.el('td', record.employeeName));
        const status = UI.el('td'); status.append(UI.badge(record.status), UI.el('div', new Date(record.requestedAt).toLocaleString(), 'muted'));
        tr.append(UI.el('td', `${record.type}: ${record.from} to ${record.to}`), UI.el('td', `${record.currentDays}${record.currentDays !== record.days ? ` (saved ${record.days})` : ''}`), UI.el('td', record.reason), status, UI.el('td', record.reviewedAt ? `${record.comment} · ${new Date(record.reviewedAt).toLocaleString()}` : 'Awaiting Admin review'));
        if (isAdmin) {
          const cell = UI.el('td', undefined, 'leave-actions');
          if (record.status === 'Pending') { const button = UI.el('button', 'Review', 'secondary'); button.type = 'button'; button.dataset.reviewLeave = record.id; button.setAttribute('aria-label', `Review ${record.employeeName} ${record.from} ${record.type}`); button.addEventListener('click', () => openReview(record)); cell.append(button); }
          else cell.textContent = 'Finalized';
          tr.append(cell);
        }
        rows.append(tr);
      });
    }
    UI.bindForm(filters, UI.byId('leave-filter-status'), history);
    UI.byId('leave-refresh').addEventListener('click', () => {
      try { history(); if (!isAdmin) refreshBalance(); else { selectedReview = null; UI.byId('leave-review').hidden = true; } UI.byId('leave-filter-status').hidden = true; }
      catch (error) { UI.message(UI.byId('leave-filter-status'), error.message, 'error'); }
    });
    if (isAdmin) {
      UI.byId('review-cancel').addEventListener('click', () => {
        const id = selectedReview?.record.id; selectedReview = null; reviewDraft = null; UI.byId('leave-review').hidden = true;
        const buttons = [...UI.byId('leave-rows').querySelectorAll('button')];
        const button = id && buttons.find(b => b.dataset.reviewLeave === id);
        if (button) button.focus(); else UI.byId('leaveFilterStatus').focus();
      });
      UI.bindForm(UI.byId('review-form'), UI.byId('review-status'), input => {
        if (!selectedReview) throw new Error('Open a pending request for review first.');
        const result = app.leaves.review(selectedReview.record.id, { token: selectedReview.token, status: input.reviewDecision, comment: input.reviewComment });
        selectedReview = null; reviewDraft = null; history(); UI.byId('leave-review').hidden = true;
        UI.message(UI.byId('leave-filter-status'), `Leave ${result.status.toLowerCase()}. Comment and decision saved.`); UI.byId('leave-filter-status').focus();
      });
    } else {
      const form = UI.byId('leave-form');
      function preview() {
        const input = UI.values(form);
        if (!input.leaveFrom || !input.leaveTo) { UI.byId('leave-preview').textContent = 'Choose dates to preview working days.'; return; }
        try { UI.byId('leave-preview').textContent = `${app.leaves.preview({ from: input.leaveFrom, to: input.leaveTo }).days} configured working days requested. Pending days reserve quota until reviewed.`; }
        catch (error) { UI.byId('leave-preview').textContent = error.fields ? Object.values(error.fields).join(' ') : error.message; }
      }
      form.addEventListener('input', preview); form.addEventListener('change', preview);
      UI.byId('leaveYear').value = HCM.localDate().slice(0, 4);
      UI.bindForm(UI.byId('leave-balance-form'), UI.byId('leave-balance-status'), refreshBalance);
      UI.bindForm(form, UI.byId('leave-status'), input => {
        const record = app.leaves.request({ type: input.leaveType, from: input.leaveFrom, to: input.leaveTo, reason: input.leaveReason });
        form.reset(); preview(); UI.byId('leaveYear').value = record.from.slice(0, 4); refreshBalance(); history();
        UI.message(UI.byId('leave-status'), `Leave request saved as Pending. ${record.days} working days reserved for ${record.from.slice(0, 4)}.`);
      });
      refreshBalance();
    }
    history();
  }
  function payslip() {
    const user = app.currentUser(), isAdmin = user.role === 'Admin';
    heading(isAdmin ? 'Payslips' : 'My payslip', 'Calculate a monthly slip from saved attendance and approved paid leave. Amounts use the company’s chosen currency.');
    const controls = UI.el('section', undefined, 'card payroll-controls');
    controls.innerHTML = `<form id="payroll-form" novalidate>${UI.formNotice('payroll-status')}<div class="grid">${isAdmin ? '<div class="field"><label for="payrollEmployee">Employee</label><select id="payrollEmployee" name="payrollEmployee" required aria-describedby="error-payrollEmployee"><option value="">Choose employee</option></select><span id="error-payrollEmployee" class="field-error"></span></div>' : ''}<div class="field"><label for="payrollMonth">Month</label><select id="payrollMonth" name="payrollMonth" required aria-describedby="error-payrollMonth"></select><span id="error-payrollMonth" class="field-error"></span></div>${UI.field('payrollYear', 'Year', 'number', 'min="100" max="9999" step="1"')}</div><div class="actions"><button type="submit">Calculate / Refresh payslip</button><button id="payroll-print" type="button" class="secondary" disabled>Print / Save as PDF</button></div></form><p class="help">To save a PDF, choose Save as PDF in your browser’s print destination, then Save. Opening the print dialog does not create a downloaded file. A4 portrait is recommended.</p><p id="payroll-empty" class="empty" hidden>No employees yet. Add an employee before calculating a payslip.</p>`;
    const article = UI.el('article', undefined, 'card payslip'); article.id = 'payslip'; article.hidden = true; article.setAttribute('aria-label', 'Selected monthly payslip');
    UI.byId('content').append(controls, article);
    const form = UI.byId('payroll-form'), print = UI.byId('payroll-print'), today = HCM.localDate();
    for (let month = 1; month <= 12; month++) { const option = UI.el('option', new Date(2026, month - 1, 1).toLocaleString(undefined, { month: 'long' })); option.value = month; UI.byId('payrollMonth').append(option); }
    UI.fill(form, { payrollMonth: String(Number(today.slice(5, 7))), payrollYear: today.slice(0, 4) });
    if (isAdmin) {
      const options = app.payroll.employeeOptions();
      options.forEach(employee => { const option = UI.el('option', employee.name); option.value = employee.id; UI.byId('payrollEmployee').append(option); });
      UI.byId('payroll-empty').hidden = !!options.length;
    }
    function invalidate() { article.hidden = true; article.replaceChildren(); print.disabled = true; }
    form.addEventListener('input', invalidate); form.addEventListener('change', invalidate);
    const money = value => value === null ? 'Cannot calculate' : value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    function calculate() {
      invalidate();
      const values = UI.values(form), input = { month: values.payrollMonth, year: values.payrollYear };
      if (isAdmin) input.employeeId = values.payrollEmployee;
      const s = app.payroll.slip(input);
      article.append(UI.el('h2', s.companyName), UI.el('h3', `Monthly payslip · ${s.period}`), UI.el('p', `${s.status} · Calculated as of ${s.asOf}`, 'notice info'));
      const identity = UI.el('dl');
      for (const [label, value] of [['Employee', s.employee.name], ['Employee ID', s.employee.id], ['Department', s.employee.department], ['Joining date', s.employee.joiningDate], ['Period', `${s.from} to ${s.to}`]]) identity.append(UI.el('dt', label), UI.el('dd', value));
      article.append(identity);
      if (s.currentMonth) article.append(UI.el('p', 'Provisional full-month projection, not salary earned to date. Gross covers all eligible working days this month; deductions include only elapsed absences and completed working-day half-days. Today and future dates are never absent.', 'notice info'));
      if (s.openDates.length) article.append(UI.el('p', `Unresolved attendance: open working-day shift(s) starting ${s.openDates.join(', ')}. This slip cannot be final until checkout resolves them. No duration or half-day deduction is invented.`, 'notice info'));
      if (s.prorated) article.append(UI.el('p', `Joining-month proration: ${s.eligibleDays} eligible working days on/after joining out of ${s.workingDays} in the month. Gross = monthly salary / ${s.workingDays} × ${s.eligibleDays}.`, 'notice info'));
      if (!s.eligibleDays && s.workingDays) article.append(UI.el('p', 'No payable entitlement: this month has no working days on/after the current joining date.', 'notice info'));
      if (!s.workingDays) article.append(UI.el('p', 'Cannot calculate: this month has zero configured working days. A daily rate cannot be calculated.', 'notice error'));
      const table = UI.el('table'); table.className = 'payroll-breakdown';
      table.innerHTML = '<caption>Monthly calculation breakdown</caption><thead><tr><th scope="col">Item</th><th scope="col">Value</th></tr></thead>';
      const body = UI.el('tbody');
      for (const [key, label, value] of [
        ['salary', 'Monthly salary', money(s.monthlySalary)], ['working', 'Configured working days in month', s.workingDays], ['eligible', 'Eligible working days on/after joining', s.eligibleDays],
        ['rate', 'Daily rate (display rounded)', money(s.dailyRate)], ['gross', 'Gross entitlement', money(s.gross)], ['absent', 'Elapsed absent working days', s.absentDays], ['half', 'Completed working-day half-days', s.halfDays],
        ['leave', 'Approved paid-leave days without attendance (whole period)', s.paidLeaveDays], ['deduction', 'Deductions', money(s.deduction)], ['net', 'Net salary', money(s.net)]
      ]) { const row = UI.el('tr'), labelNode = UI.el('th', label), valueNode = UI.el('td', value); labelNode.scope = 'row'; valueNode.dataset.payroll = key; row.append(labelNode, valueNode); body.append(row); }
      table.append(body); article.append(table);
      article.append(UI.el('p', `Daily rate = monthly salary / ${s.workingDays} configured working days. Gross = ${s.prorated || !s.eligibleDays ? `daily rate × ${s.eligibleDays} eligible days` : 'monthly salary'}. Deduction = daily rate × (${s.absentDays} absent + 0.5 × ${s.halfDays} half-days). Net = gross − deduction.`, 'help'));
      article.append(UI.el('p', 'Current saved salary, working days, joining date and approved-leave rules apply, including to past periods; historical snapshots are not implemented. Approved leave is paid; pending/rejected leave does not excuse absence. Actual attendance wins over leave. Late alone has no deduction. Nonworking attendance gives no deduction or extra pay. Overnight shifts credit only their starting date. Calculations retain full precision; currency displays use two decimals.', 'help'));
      article.hidden = false; print.disabled = !s.workingDays;
      return s;
    }
    UI.bindForm(form, UI.byId('payroll-status'), calculate);
    function refreshForPrint() {
      try { calculate(); UI.byId('payroll-status').hidden = true; return !print.disabled; }
      catch (error) { invalidate(); article.append(UI.el('p', `Payslip unavailable: ${error.fields ? Object.values(error.fields).join(' ') : error.message}`, 'notice error')); article.hidden = false; UI.message(UI.byId('payroll-status'), article.textContent, 'error'); return false; }
    }
    print.addEventListener('click', () => { if (refreshForPrint()) window.print(); });
    // Revalidate native Ctrl+P too; never print a stale account or old saved-data calculation.
    window.addEventListener('beforeprint', () => { if (article.isConnected) refreshForPrint(); }, { signal: viewController.signal });
    if (!isAdmin) calculate();
  }
  function guard() {
    const destination = app.route(page);
    if (destination) { UI.byId('content').replaceChildren(); UI.go(destination); return false; }
    return true;
  }
  function fatal(error) {
    UI.cleanup(); viewController.abort(); reviewDraft = null;
    document.body.classList.remove('authenticated');
    UI.byId('content').replaceChildren(); UI.byId('header').replaceChildren();
    UI.message(UI.byId('fatal'), error.message || 'Unable to load HCM Lite. Existing browser data was not reset.', 'error');
  }
  let viewController = new AbortController();
  function captureView() {
    const active = document.activeElement;
    if (UI.byId('leave-review') && !UI.byId('leave-review').hidden) reviewDraft = { id: UI.byId('review-form').dataset.reviewId, values: UI.values(UI.byId('review-form')) };
    return {
      fields: [...document.querySelectorAll('#content input, #content select, #content textarea')].map(n => ({ id: n.id, name: n.name, value: n.value, checked: n.checked, type: n.type })),
      editingId: UI.byId('employee-form')?.dataset.editingId,
      details: [...document.querySelectorAll('#content details[open]')].map(n => n.id).filter(Boolean),
      errors: [...document.querySelectorAll('#content .field-error')].filter(n => n.textContent).map(n => [n.id, n.textContent]),
      notices: [...document.querySelectorAll('#content .notice.error:not([hidden])')].map(n => [n.id, n.textContent]),
      focus: active.id, selection: typeof active.selectionStart === 'number' ? [active.selectionStart, active.selectionEnd] : null,
      scroll: [scrollX, scrollY], regions: [...document.querySelectorAll('.table-wrap, #helper-history')].map(n => [n.id, n.scrollLeft, n.scrollTop]),
      payrollVisible: UI.byId('payslip') && !UI.byId('payslip').hidden,
      menu: UI.byId('menu-toggle')?.getAttribute('aria-expanded') === 'true'
    };
  }
  function restoreView(saved) {
    if (saved.editingId) {
      const edit = [...document.querySelectorAll('[data-edit-employee]')].find(n => n.dataset.editEmployee === saved.editingId);
      if (edit) edit.click();
      else {
        UI.byId('employee-submit').disabled = true; UI.byId('cancel-edit').hidden = false;
        UI.message(UI.byId('employee-status'), 'This employee is no longer available. Your draft is retained; cancel editing before adding another employee.', 'error');
      }
    }
    saved.fields.forEach(f => {
      const node = f.id ? UI.byId(f.id) : [...document.querySelectorAll('input')].find(n => n.name === f.name && n.value === f.value);
      if (!node) return;
      if (f.type === 'checkbox') node.checked = f.checked; else node.value = f.value;
    });
    saved.details.forEach(id => { if (UI.byId(id)) UI.byId(id).open = true; });
    // Restore view-only filters against fresh data, without saving or reusing stale results.
    UI.byId('search')?.dispatchEvent(new Event('input'));
    for (const id of ['attendance-filters', 'leave-filters', 'leave-balance-form']) UI.byId(id)?.requestSubmit();
    UI.byId('leave-form')?.dispatchEvent(new Event('input'));
    if (UI.byId('payroll-form')) {
      UI.byId('payroll-form').dispatchEvent(new Event('change'));
      if (saved.payrollVisible) UI.byId('payroll-form').requestSubmit();
    }
    saved.errors.forEach(([id, text]) => { const node = UI.byId(id); if (node && !id.startsWith('error-review')) { node.textContent = text; const field = UI.byId(id.replace('error-', '')); field?.setAttribute('aria-invalid', 'true'); } });
    saved.notices.forEach(([id, text]) => { if (id && UI.byId(id) && id !== 'review-status') UI.message(UI.byId(id), text, 'error'); });
    if (saved.menu && UI.byId('menu-toggle') && matchMedia('(max-width: 960px)').matches) UI.byId('menu-toggle').click();
    if (reviewDraft && UI.byId('leave-filter-status')) UI.message(UI.byId('leave-filter-status'), 'Review data changed. Reopen the request to review current days. Your comment draft is retained.', 'info');
    const focus = UI.byId(saved.focus);
    if (focus && focus.getClientRects().length) { focus.focus({ preventScroll: true }); if (saved.selection && focus.setSelectionRange) focus.setSelectionRange(...saved.selection); }
    else if (reviewDraft) UI.byId('leave-filter-status')?.focus({ preventScroll: true });
    saved.regions.forEach(([id, x, y]) => { const n = UI.byId(id); if (n) { n.scrollLeft = x; n.scrollTop = y; } });
    window.scrollTo(...saved.scroll);
  }
  function render(preserve = false) {
    try {
      if (!guard()) return;
      const sameAccount = (app.currentUser()?.id || null) === renderedAccount;
      const saved = preserve && sameAccount ? captureView() : null;
      if (!sameAccount) reviewDraft = null;
      UI.cleanup(); viewController.abort(); viewController = new AbortController();
      renderedAccount = app.currentUser()?.id || null;
      UI.byId('fatal').hidden = true; UI.byId('content').replaceChildren(); UI.header(app, page);
      ({ index, admin, employees, settings, employee, leaves, payslip })[page]();
      if (page !== 'index') UI.passwordPanel(app);
      const symbols = { 'attendance-section': 'employee', 'leave-section': 'leaves', 'announcements-section': 'leaves', 'helper-section': 'settings' };
      Object.entries(symbols).forEach(([id, symbol]) => { const h = UI.byId(id)?.querySelector('h2'); if (h) { const wrap = UI.el('span', undefined, 'section-icon'); wrap.append(UI.icon(symbol)); h.prepend(wrap); } });
      UI.enhance();
      if (saved) restoreView(saved);
    } catch (error) { fatal(error); }
  }
  try {
    // Accessing localStorage itself can throw in a blocked browser context.
    let adapter;
    try { adapter = window.localStorage; }
    catch (_) { throw new HCMStorage.StorageError('Browser storage is unavailable. Allow site storage and try again.'); }
    app = HCM.create(HCMStorage.create(adapter)); render();
    window.addEventListener('storage', event => { if (event.key === null || Object.values(HCMStorage.keys).includes(event.key)) render(true); });
    window.addEventListener('pageshow', event => { if (event.persisted) render(); });
    window.addEventListener('focus', () => { try { if ((app.currentUser()?.id || null) !== renderedAccount) render(); else guard(); } catch (error) { fatal(error); } });
    document.addEventListener('visibilitychange', () => { if (!document.hidden) { try { if ((app.currentUser()?.id || null) !== renderedAccount) render(); } catch (error) { fatal(error); } } });
  } catch (error) { fatal(error); }
})();
