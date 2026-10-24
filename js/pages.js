/* Page event handlers call domain methods; business and storage rules live elsewhere. */
(function () {
  'use strict';
  const UI = HCMUI, page = document.body.dataset.page;
  let app;
  function heading(title, description) {
    UI.byId('content').append(UI.el('h1', title), UI.el('p', description, 'intro'));
  }
  function index() {
    const setup = !app.getState().initialized;
    const card = UI.el('section', undefined, `card auth-card ${setup ? '' : 'login-card'}`);
    card.innerHTML = setup ? `<h1>Set up your company</h1><p class="intro">Start with an empty workspace. Create your company and its Admin account, then add your employees.</p><p class="help">All fields are required. Choose your working days. Zero grace minutes and zero leave days are allowed.</p><form id="setup-form" novalidate>${UI.formNotice('auth-status')}<h2>Company & working rules</h2><div class="grid">${UI.companyFields()}</div><h2>Admin account</h2><div class="grid">${UI.field('name', 'Admin name', 'text', 'autocomplete="name" maxlength="120"')}${UI.field('email', 'Admin email', 'email', 'autocomplete="username" maxlength="254"')}${UI.field('password', 'Password (at least 8 characters)', 'password', 'autocomplete="new-password" minlength="8"')}${UI.field('confirmPassword', 'Confirm password', 'password', 'autocomplete="new-password" minlength="8"')}</div><div class="actions"><button type="submit">Create company & Admin</button></div></form>` : `<h1>Sign in</h1><p class="intro">Welcome back. Use your Admin account or the Employee login created by your Admin.</p><form id="login-form" novalidate>${UI.formNotice('auth-status')}<div class="grid">${UI.field('email', 'Email', 'email', 'autocomplete="username" maxlength="254"')}${UI.field('password', 'Password', 'password', 'autocomplete="current-password"')}</div><div class="actions"><button type="submit">Sign in</button></div></form><p class="help">Company setup is complete. Your Admin manages employee accounts and company settings.</p>`;
    UI.byId('content').append(card);
    const note = UI.el('p', 'Learning demonstration: accounts and data exist only in this browser. Browser-only authentication cannot protect real HR or payroll data. Use sample information you create yourself.', 'notice info auth-card'); UI.byId('content').append(note);
    if (setup) UI.bindForm(UI.byId('setup-form'), UI.byId('auth-status'), async input => { await app.setup(input); render(); UI.message(UI.byId('auth-status'), 'Company created. Sign in with your new Admin account.'); });
    else UI.bindForm(UI.byId('login-form'), UI.byId('auth-status'), async input => { const role = await app.login(input); UI.go(role === 'Admin' ? 'admin' : 'employee'); });
  }
  function admin() {
    heading('Admin dashboard', 'Manage employees, settings, company attendance and leave. Payroll and helper workflows remain reserved for later phases.');
    const card = UI.el('section', undefined, 'card'); card.innerHTML = `<h2>Manage your workspace</h2><p>Add an employee to create their login, or update the rules for your company.</p><div class="actions"><a class="button" href="employees.html">Manage employees</a><a class="button secondary" href="settings.html">Company settings</a></div>`; UI.byId('content').append(card);
    attendanceView(true);
    const leaveCard = UI.el('section', undefined, 'card'); leaveCard.innerHTML = '<h2>Company leave</h2><p id="leave-overview" role="status"></p><a href="leaves.html">Review leave requests</a>'; UI.byId('content').append(leaveCard);
    const totals = app.leaves.overview(); UI.byId('leave-overview').textContent = `${totals.pending} pending leave requests. ${totals.approvedToday} current employees on approved leave today (configured working dates only).`;
    UI.byId('content').append(UI.empty('Announcements & smart helper', 'Posting announcements and the keyword-based helper are reserved for Phase 5.', 5));
  }
  function employees() {
    heading('Employees', 'Create an employee and their login in one step. Search and department filters work together. All employee fields are required.');
    const editor = UI.el('section', undefined, 'card');
    editor.innerHTML = `<h2 id="editor-title">Add employee</h2><form id="employee-form" novalidate>${UI.formNotice('employee-status')}<div class="grid">${UI.field('name', 'Full name', 'text', 'autocomplete="off" maxlength="120"')}${UI.field('email', 'Email (login)', 'email', 'autocomplete="off" maxlength="254"')}${UI.field('password', 'Initial password (at least 8 characters)', 'password', 'autocomplete="new-password" minlength="8"')}${UI.field('department', 'Department', 'text', 'maxlength="100" list="department-suggestions"')}${UI.field('monthlySalary', 'Monthly salary', 'number', 'min="0.01" step="any" inputmode="decimal"')}${UI.field('joiningDate', 'Joining date', 'date')}</div><datalist id="department-suggestions"></datalist><p id="edit-help" class="help" hidden>Editing keeps the employee's ID and password. Employees change their own password after signing in.</p><div class="actions"><button id="employee-submit" type="submit">Add employee & create login</button><button id="cancel-edit" type="button" class="secondary" hidden>Cancel edit</button></div></form>`;
    const listing = UI.el('section', undefined, 'card');
    listing.innerHTML = `<h2>Employee directory</h2>${UI.formNotice('directory-status')}<div class="toolbar"><div><label for="search">Search name or email</label><input id="search" type="search" placeholder="Search employees" autocomplete="off"></div><div><label for="department-filter">Department</label><select id="department-filter"><option value="">All departments</option></select></div></div><p id="list-count" class="help" role="status"></p><p class="help">On smaller screens, scroll the table sideways to see all columns and actions.</p><div class="table-wrap" id="employee-table-wrap" role="region" aria-label="Employee directory, scroll horizontally for all columns" tabindex="0"><table><caption class="help">Employee accounts and salary details</caption><thead><tr><th scope="col">Name / email</th><th scope="col">Department</th><th scope="col">Monthly salary</th><th scope="col">Joining date</th><th scope="col">Actions</th></tr></thead><tbody id="employee-rows"></tbody></table></div><div id="directory-empty" class="empty" hidden></div>`;
    UI.byId('content').append(editor, listing);
    const form = UI.byId('employee-form'); let editingId = null;
    function resetEditor() {
      editingId = null; form.reset(); UI.clearErrors(form); UI.byId('editor-title').textContent = 'Add employee';
      UI.byId('employee-submit').textContent = 'Add employee & create login';
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
      UI.byId('directory-empty').textContent = all.length ? 'No employees match this search and department. Change either filter to see more results.' : 'No employees yet. Add your first employee above to create their login.';
      matches.forEach(user => {
        const tr = UI.el('tr'), identity = UI.el('td'); identity.append(UI.el('strong', user.name), UI.el('div', user.email, 'muted')); tr.append(identity);
        tr.append(UI.el('td', user.department), UI.el('td', user.monthlySalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 20 })), UI.el('td', user.joiningDate));
        const actions = UI.el('div', undefined, 'actions'), td = UI.el('td');
        const edit = UI.el('button', 'Edit', 'secondary'); edit.type = 'button'; edit.setAttribute('aria-label', `Edit ${user.name}`);
        edit.addEventListener('click', () => {
          resetEditor(); editingId = user.id; UI.fill(form, { name: user.name, email: user.email, department: user.department, monthlySalary: user.monthlySalary, joiningDate: user.joiningDate });
          UI.byId('password').value = ''; UI.byId('password').disabled = true; UI.byId('field-password').hidden = true;
          UI.byId('editor-title').textContent = 'Edit employee'; UI.byId('employee-submit').textContent = 'Save employee';
          UI.byId('cancel-edit').hidden = false; UI.byId('edit-help').hidden = false; UI.byId('employee-status').hidden = true; UI.byId('name').focus();
        });
        const remove = UI.el('button', 'Delete', 'danger'); remove.type = 'button'; remove.setAttribute('aria-label', `Delete ${user.name}`);
        remove.addEventListener('click', () => {
          if (!window.confirm(`Delete ${user.name} (${user.email})? Their login will stop working. This cannot be undone.`)) return;
          try { app.deleteEmployee(user.id); if (editingId === user.id) resetEditor(); refreshDirectory(); UI.message(UI.byId('directory-status'), 'Employee deleted. Their login is no longer available.'); }
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
    UI.byId('cancel-edit').addEventListener('click', () => { resetEditor(); UI.byId('employee-status').hidden = true; });
    UI.byId('search').addEventListener('input', refreshDirectory); UI.byId('department-filter').addEventListener('change', refreshDirectory); refreshDirectory();
  }
  function settings() {
    heading('Company settings', 'Attendance and leave use these rules. Working-day/quota edits recalculate leave balances and pending reservations, including history; balances may become negative. Payroll remains Phase 4. All fields are required.');
    const card = UI.el('section', undefined, 'card');
    card.innerHTML = `<form id="settings-form" novalidate>${UI.formNotice('settings-status')}<div class="grid">${UI.companyFields()}</div><p class="help">Grace minutes: 0–1440. Yearly leave quota: 0–366. Choose at least one working day.</p><div class="actions"><button type="submit">Save settings</button></div></form>`;
    UI.byId('content').append(card);
    const company = app.getState().company, form = UI.byId('settings-form'); UI.fill(form, { ...company, companyName: company.name });
    UI.bindForm(form, UI.byId('settings-status'), input => { app.saveSettings(input); UI.header(app, page); UI.message(UI.byId('settings-status'), 'Company settings saved.'); });
  }
  function employee() {
    const user = app.currentUser(); heading('My dashboard', 'Check in, check out, review your attendance and manage your own leave. Payslips remain reserved for Phase 4.');
    const card = UI.el('section', undefined, 'card'); card.append(UI.el('h2', 'My profile'));
    const list = UI.el('dl');
    [['Name', user.name], ['Email', user.email], ['Department', user.department], ['Joining date', user.joiningDate], ['Monthly salary', user.monthlySalary.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 20 })]].forEach(([label, value]) => list.append(UI.el('dt', label), UI.el('dd', value)));
    card.append(list); UI.byId('content').append(card);
    attendanceView(false);
    leaveView(false);
    UI.byId('content').append(UI.empty('Announcements & my smart helper', 'Announcements and the keyword-based helper for your own data are reserved for Phase 5.', 5));
  }
  function attendanceView(isAdmin) {
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
        tr.append(UI.el('td', record.date), UI.el('td', record.checkIn ? new Date(record.checkIn).toLocaleString() : '—'), UI.el('td', record.checkOut ? new Date(record.checkOut).toLocaleString() : '—'), UI.el('td', record.derived ? `${record.status} (derived)` : record.status), UI.el('td', record.derived ? '—' : record.isLate ? 'Yes' : 'No'), UI.el('td', record.derived ? '—' : duration(record.durationMs))); rows.append(tr);
      });
      UI.byId('attendance-history').hidden = !report.rows.length;
      UI.byId('attendance-empty').hidden = !!report.rows.length;
      UI.byId('attendance-empty').textContent = isAdmin && !app.attendance.employeeOptions().length ? 'No employees or attendance yet. Add an employee to begin.' : 'No attendance or elapsed working-day absences match these filters.';
    }
    function refresh() { overview(); history(); }
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
    const filters = UI.byId('leave-filters'); let selectedReview = null;
    if (isAdmin) app.leaves.employeeOptions().forEach(user => { const option = UI.el('option', user.name); option.value = user.id; UI.byId('leaveEmployee').append(option); });
    function refreshBalance() {
      const b = app.leaves.balance(UI.byId('leaveYear').value);
      UI.byId('leave-balance').textContent = `${b.year}: Annual quota ${b.quota}. Approved ${b.approved} working days. Approved balance ${b.balance}. Pending ${b.pending} days reserved. Available to request ${b.available} days.`;
    }
    function openReview(record) {
      try {
        selectedReview = app.leaves.prepareReview(record.id);
        UI.byId('review-form').reset(); UI.clearErrors(UI.byId('review-form')); UI.byId('review-status').hidden = true;
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
        tr.append(UI.el('td', `${record.type}: ${record.from} to ${record.to}`), UI.el('td', `${record.currentDays}${record.currentDays !== record.days ? ` (saved ${record.days})` : ''}`), UI.el('td', record.reason), UI.el('td', `${record.status} · ${new Date(record.requestedAt).toLocaleString()}`), UI.el('td', record.reviewedAt ? `${record.comment} · ${new Date(record.reviewedAt).toLocaleString()}` : 'Awaiting Admin review'));
        if (isAdmin) {
          const cell = UI.el('td', undefined, 'leave-actions');
          if (record.status === 'Pending') { const button = UI.el('button', 'Review', 'secondary'); button.type = 'button'; button.setAttribute('aria-label', `Review ${record.employeeName} ${record.from} ${record.type}`); button.addEventListener('click', () => openReview(record)); cell.append(button); }
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
      UI.byId('review-cancel').addEventListener('click', () => { selectedReview = null; UI.byId('leave-review').hidden = true; });
      UI.bindForm(UI.byId('review-form'), UI.byId('review-status'), input => {
        if (!selectedReview) throw new Error('Open a pending request for review first.');
        const result = app.leaves.review(selectedReview.record.id, { token: selectedReview.token, status: input.reviewDecision, comment: input.reviewComment });
        selectedReview = null; history(); UI.byId('leave-review').hidden = true;
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
    heading(app.currentUser().role === 'Admin' ? 'Payslips' : 'My payslip', 'Monthly salary slips · reserved for Phase 4.');
    UI.byId('content').append(UI.empty('Payslips are not available yet', 'Monthly calculations, Admin access to all slips, Employee access to their own slip, and print / Save as PDF will be implemented in Phase 4. No salary deductions are calculated in this milestone.', 4));
  }
  function guard() {
    const destination = app.route(page);
    if (destination) { UI.byId('content').replaceChildren(); UI.go(destination); return false; }
    return true;
  }
  function fatal(error) {
    UI.byId('content').replaceChildren(); UI.byId('header').replaceChildren();
    UI.message(UI.byId('fatal'), error.message || 'Unable to load HCM Lite. Existing browser data was not reset.', 'error');
  }
  function render() {
    try {
      if (!guard()) return;
      UI.byId('fatal').hidden = true; UI.byId('content').replaceChildren(); UI.header(app, page);
      ({ index, admin, employees, settings, employee, leaves, payslip })[page]();
      if (page !== 'index') UI.passwordPanel(app);
    } catch (error) { fatal(error); }
  }
  try {
    // Accessing localStorage itself can throw in a blocked browser context.
    let adapter;
    try { adapter = window.localStorage; }
    catch (_) { throw new HCMStorage.StorageError('Browser storage is unavailable. Allow site storage and try again.'); }
    app = HCM.create(HCMStorage.create(adapter)); render();
    window.addEventListener('storage', event => { if (event.key === null || Object.values(HCMStorage.keys).includes(event.key)) render(); });
    window.addEventListener('pageshow', event => { if (event.persisted) render(); });
    window.addEventListener('focus', () => { try { guard(); } catch (error) { fatal(error); } });
  } catch (error) { fatal(error); }
})();
