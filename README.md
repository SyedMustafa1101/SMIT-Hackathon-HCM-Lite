# Saylani HCM Lite — Phases 1–2

Plain HTML, CSS and JavaScript; browser localStorage only. No app dependencies, framework, backend, external API, or demo data. Seven HTML pages, as specified. The Node tool below is an optional static file preview, not an application backend. Any ordinary static host can serve the same files unchanged.

## Run locally

With Node.js installed, open a terminal in this folder and run:

```sh
node tools/serve.cjs
```

Open **http://127.0.0.1:4173** in a modern browser. Keep the same host and port to keep using the same localStorage. Password hashing requires Web Crypto, available on localhost or HTTPS. Avoid opening pages directly with `file://`, where browser storage behavior differs. There is no build step. Stop the preview with Ctrl+C.

## Use Phase 1

1. On an empty browser origin, enter company name, start time, grace minutes, yearly leave quota and working days. Create your Admin account with a password of at least eight characters. No data is preloaded and working days are not preselected.
2. Sign in as Admin. Open Employees and add name, email, initial password, department, positive monthly salary and joining date. Give the employee their credentials yourself. The app does not send messages or emails.
3. Search by name/email and combine with a department filter. Edit employees without changing their stable ID or password; changes to their email change their login email. Deletion asks for confirmation and disables their login. No Admin deletion or password reset is provided.
4. Edit company settings and refresh to confirm they persist. Grace minutes must be a whole number from 0 to 1440, quota a whole number from 0 to 366; select at least one working day. Zero grace/quota is allowed.
5. Both roles can select **Change my password**, enter their current password and matching new passwords, then log out and sign back in. Employees see only their own profile and cannot access Admin pages, including Leave requests.
6. Phase 2 attendance is available on both dashboards. Leave, payslip, announcements and helper sections still identify their later phases honestly; no fake workflows or payroll figures are provided.

Use data you enter yourself for a walkthrough: setup → Admin sign in → employee creation → settings change → logout → Employee sign in → own password change → logout. No tutorial account or seeded records are included.

## Use Phase 2 — Attendance

- Employee dashboard: use **Check in** and **Check out** for your own attendance. An open shift reads **Checked in**, with no completed duration. Check-in is available on/after joining, once per local calendar date. Checkout requires an open shift and can happen only once. Admin has no personal attendance actions.
- Admin dashboard shows current Employee count, today's check-ins/open/completed/late/half-day counts and this month's completed hours/elapsed absence. Employees get the same attendance summaries for themselves only. Late counts overlap open/half-day counts because lateness is retained separately.
- Use inclusive From/To date filters, and Admin's Employee selector, then **Apply attendance filters**. Default is this local month through today. Clearing both dates includes all saved history and eligible elapsed absence. Deleted employees' saved records remain filterable by ID, labeled as deleted; no new absence is derived for deleted accounts. Invalid date ranges show an inline error.
- Histories mix saved attendance with clearly labeled **Absent (derived)** rows. No record on an elapsed configured working day, on/after joining, is absent. Today, future dates and nonworking days are excluded. **This is not leave-aware or payroll-ready yet.** No absence records are written to storage.
- Use **Refresh attendance** (or reload) when the day/device time changes or to refresh summaries and action availability. On mobile, scroll the table horizontally for status, lateness and duration; filters/actions stay within the page.

### Explicit time and calculation policies

1. **Nonworking days:** check-ins are allowed, with a visible notice. They create actual records without extra absence obligations, overtime payments or payroll entitlement.
2. **Overnight/overdue shifts:** checkout closes the existing open shift on its original check-in date, even after midnight or a longer delay. No new check-in until that shift closes. Duration is actual timestamp difference; no automatic checkout or arbitrary cap. Only the starting date receives attendance credit: later elapsed working days without their own check-in can be absent.
3. **Lateness:** strictly after local office start + grace, down to milliseconds. The absolute cutoff is saved at check-in; later settings edits do not rewrite lateness. At the cutoff is on time. An open late shift still has status Checked in. After checkout, under five hours is Half day; exactly five hours is Present or Late according to the saved flag. `isLate` stays true even for a Half day.
4. **Calendar and clock:** dates are device-local, while check-in/out/cutoff are canonical UTC ISO timestamps. The saved check-in offset validates the original local date even if the viewer later changes timezone. Displayed timestamps use the viewer's current local timezone; the Date column retains the starting local date. Backward/future-relative saved activity blocks new actions until the clock is corrected. Browser clock/timezone are trusted for this learning demo; there is no trusted server clock.
5. **Absence:** derived using current working-day and joining-date settings, so editing them can change past absence figures. Joining dates in the future create no absence. A reusable exclusion callback is reserved for Phase 3 approved-leave integration but currently excludes no leave. Open shifts count as attendance on their starting date, never half day until checkout.

`js/attendance.js` contains role-scoped actions, filters/reports, real summaries and reusable pure `deriveAbsences`. Page handlers only render and invoke these functions. Attendance domain APIs reject anonymous/Admin mutations and other-employee access; `getState()` also scopes its attendance collection.

### Attendance storage schema

`hcm_attendance` remains the only attendance key. Each record contains exactly: `id`, `employeeId`, local `date`, UTC `checkIn`, nullable UTC `checkOut`, boolean `isLate`, `status`, nullable integer `durationMs`, integer check-in `offsetMinutes`, UTC `lateAfter`. Status is Checked in while open; otherwise Half day (<5h), Late or Present. Duration must equal checkout minus check-in and be nonnegative. IDs and employee/date pairs are unique; at most one open record per employee. Saved date must agree with timestamp plus its saved offset. Deleted employee IDs are preserved deliberately.

Phase 1's empty attendance array is compatible. Unfamiliar/nonempty older shapes, invalid timestamps, inconsistent statuses/durations and duplicates are rejected with a preservation error, never erased or silently converted. Back up raw data and repair it deliberately. Full/blocked writes retain the old attendance and show an error, without claiming success.

## Learning-only authentication and data

This is a browser-only learning demonstration. It cannot protect real HR, payroll or personal information: anyone with browser developer tools can read or change localStorage, change scripts or bypass role checks. Passwords are stored as salted PBKDF2-SHA256 hashes (100,000 iterations) rather than plaintext, but hashing does not turn browser-only accounts into secure authentication. There is no server, password recovery, shared storage across devices, or email delivery. Clearing site data removes all accounts and records.

`hcm_session` contains only `{ "userId": "…" }`. Every protected page resolves it against current `hcm_users`; removed accounts cannot keep using their session. Admin pages are `admin`, `employees`, `leaves`, `settings`; `employee` is Employee-only; `payslip` is accessible by either authenticated role, with its workflow reserved for Phase 4. Cross-tab sign-in/data changes re-check and render the current state; this may discard an unsaved form. localStorage does not provide transactions across tabs; use one editing tab at a time. Writes are validated and multi-key setup attempts roll back on write failure, but browser crashes and simultaneous writers are not atomic transactions.

The six keys are `hcm_company`, `hcm_users`, `hcm_attendance`, `hcm_leaves`, `hcm_session`, `hcm_announcements`. Other storage keys are untouched. `js/storage.js` handles persistence/structure checks; `js/hcm.js` handles accounts/settings/access and composes `js/attendance.js`; `js/ui.js` provides shared UI; `js/pages.js` wires page events. Local calendar dates are used for joining dates; IDs use cryptographic random bytes. User text is rendered with DOM `textContent`/`value`. Salary is stored as a positive number in the company's chosen currency (no currency assumption).

Invalid JSON, invalid collection shapes and partial existing setup block editing with a clear error and preserve data. There is deliberately no automatic reset button. If this happens, first copy the raw `hcm_*` values using browser developer tools for a backup, then repair the invalid collection. For a deliberate fresh learning start, after backing up, remove all six `hcm_*` keys from the chosen browser origin yourself and reload. Do not remove only some keys or unrelated site storage. Storage denied/full errors are displayed; failed writes do not report success.

## Verification and continuation

```sh
node --test tests/domain.test.cjs tests/attendance.test.cjs
```

The domain suite uses isolated in-memory storage and never writes browser data. Optional browser integration verification uses Playwright as a development-only tool (not shipped to or loaded by the app):

```sh
node tests/browser.cjs
node tests/attendance-browser.cjs
```

If Playwright is not on Node's module path, set `HCM_PLAYWRIGHT_MODULE` to the absolute directory of an already installed Playwright package. It uses installed Microsoft Edge by default; set `HCM_BROWSER_CHANNEL=chrome` to use an installed Chrome instead. These tools are for verification only; the app runs without them. The browser suite launches a temporary static server and fresh browser contexts, creates its own temporary records and destroys the contexts on completion. It never seeds app source or your normal browser profile.

Automated checks and manual screenshot inspection are distinguished in PROGRESS.md. Browser tests use installed Edge and an emulated 390px phone viewport, not physical phones. All test records are isolated fixtures, not delivered app data.

See AGENTS.md for permanent guidance and policies, PLAN.md for the complete PDF checklist/build plan and PROGRESS.md for actual verification and the exact next step. Phases 1–5 retain their numbering; Phase 6 is reserved for premium UI/UX, followed by Phase 7 final acceptance. Phase 2 stops for the user's review/commit/push. Do not begin Phase 3, commit, push, deploy or submit automatically.
