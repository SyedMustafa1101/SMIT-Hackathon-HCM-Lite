# Saylani HCM Lite — Phases 1–5

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
6. Attendance and leave are available on the dashboards. Open Payslip for real monthly calculations and browser printing. Use Announcements and Keyword smart helper on either dashboard; Admin can post announcements.

Use data you enter yourself for a walkthrough: setup → Admin sign in → employee creation → settings change → logout → Employee sign in → own password change → logout. No tutorial account or seeded records are included.

## Use Phase 2 — Attendance

- Employee dashboard: use **Check in** and **Check out** for your own attendance. An open shift reads **Checked in**, with no completed duration. Check-in is available on/after joining, once per local calendar date. Checkout requires an open shift and can happen only once. Admin has no personal attendance actions.
- Admin dashboard shows current Employee count, today's check-ins/open/completed/late/half-day counts and this month's completed hours/elapsed absence. Employees get the same attendance summaries for themselves only. Late counts overlap open/half-day counts because lateness is retained separately.
- Use inclusive From/To date filters, and Admin's Employee selector, then **Apply attendance filters**. Default is this local month through today. Clearing both dates includes all saved history and eligible elapsed absence. Deleted employees' saved records remain filterable by ID, labeled as deleted; no new absence is derived for deleted accounts. Invalid date ranges show an inline error.
- Histories mix saved attendance with clearly labeled **Absent (derived)** and **Approved leave (derived)** rows. No attendance or approved leave on an elapsed configured working day, on/after joining, is absent. Today, future dates and nonworking days are excluded from absence. Approved leave rows extend through today only; actual attendance always takes precedence, including open/late/half-day shifts. No synthetic rows are written to storage. Phase 4 reuses these rules for payroll.
- Use **Refresh attendance** (or reload) when the day/device time changes or to refresh summaries and action availability. On mobile, scroll the table horizontally for status, lateness and duration; filters/actions stay within the page.

### Explicit time and calculation policies

1. **Nonworking days:** check-ins are allowed, with a visible notice. They create actual records without extra absence obligations, overtime payments or payroll entitlement.
2. **Overnight/overdue shifts:** checkout closes the existing open shift on its original check-in date, even after midnight or a longer delay. No new check-in until that shift closes. Duration is actual timestamp difference; no automatic checkout or arbitrary cap. Only the starting date receives attendance credit: later elapsed working days without their own check-in can be absent.
3. **Lateness:** strictly after local office start + grace, down to milliseconds. The absolute cutoff is saved at check-in; later settings edits do not rewrite lateness. At the cutoff is on time. An open late shift still has status Checked in. After checkout, under five hours is Half day; exactly five hours is Present or Late according to the saved flag. `isLate` stays true even for a Half day.
4. **Calendar and clock:** dates are device-local, while check-in/out/cutoff are canonical UTC ISO timestamps. The saved check-in offset validates the original local date even if the viewer later changes timezone. Displayed timestamps use the viewer's current local timezone; the Date column retains the starting local date. Backward/future-relative saved activity blocks new actions until the clock is corrected. Browser clock/timezone are trusted for this learning demo; there is no trusted server clock.
5. **Absence:** derived using current working-day and joining-date settings, so editing them can change past absence figures. Joining dates in the future create no absence. Phase 3 connects approved leave to the reusable exclusion callback; pending/rejected requests do not excuse absence. Open shifts count as attendance on their starting date, never half day until checkout.

`js/attendance.js` contains role-scoped actions, filters/reports, real summaries and reusable pure `deriveAbsences`. Page handlers only render and invoke these functions. Attendance domain APIs reject anonymous/Admin mutations and other-employee access; `getState()` also scopes its attendance collection.

### Attendance storage schema

`hcm_attendance` remains the only attendance key. Each record contains exactly: `id`, `employeeId`, local `date`, UTC `checkIn`, nullable UTC `checkOut`, boolean `isLate`, `status`, nullable integer `durationMs`, integer check-in `offsetMinutes`, UTC `lateAfter`. Status is Checked in while open; otherwise Half day (<5h), Late or Present. Duration must equal checkout minus check-in and be nonnegative. IDs and employee/date pairs are unique; at most one open record per employee. Saved date must agree with timestamp plus its saved offset. Deleted employee IDs are preserved deliberately.

Phase 1's empty attendance array is compatible. Unfamiliar/nonempty older shapes, invalid timestamps, inconsistent statuses/durations and duplicates are rejected with a preservation error, never erased or silently converted. Back up raw data and repair it deliberately. Full/blocked writes retain the old attendance and show an error, without claiming success.

## Use Phase 3 — Leave management

1. Employee: on **My dashboard**, use **My leave**. Choose Casual, Sick or Other, From/To dates and a reason. The preview counts inclusive configured working days. Submit to save a Pending request. Requests may be same-day or historical, but cannot start before joining, cross a year boundary, contain zero working days or overlap any pending/approved calendar range. Split cross-year leave into one request per year. Rejected requests allow a replacement.
2. Choose **Balance year** and **Show yearly balance**. All types share the annual quota. Approved balance = quota minus approved working days; Pending days are reserved; Available to request = approved balance minus pending days. Multiple pending requests must fit together. History includes all years, status, submitted/review timestamps and the Admin comment. Employees access only their own leave in both UI and domain APIs.
3. Admin: dashboard shows pending request count and current employees on approved leave today (working dates only). Open **Leave requests** and combine Employee/Status filters. Select **Review** for a pending request to see current working-day count and saved count. Choose Approve/Reject and enter a nonblank comment, then **Save leave decision**. A finalized decision cannot be changed or applied twice.
4. Approval rechecks the current employee, joining date, working days, overlap and quota including other pending reservations. Settings/employee/leave edits invalidate an open review: reopen it to view the current count. If working days changed, the review explicitly shows the new count before approval saves it. If quota was reduced below reservations, reject excess pending requests or adjust settings first. A deleted employee's retained request can be rejected with a comment, but cannot be approved; Admin filters label deleted IDs.
5. Log back in as the Employee to see status/comment, updated balance and approved leave in attendance. **Refresh leave**, **Refresh attendance**, or reload after changes. On phones, forms fit the page and tables scroll horizontally. A failed save shows an error and retains request/comment inputs and existing stored data; retry after storage is available.

### Leave decisions and schema

These details extend the PDF's simple rules without adding accrual, medical proof or extra HR requirements. Current working-day settings determine approved days and pending reservations even for historical requests. Settings changes can produce a negative balance; the app shows it and blocks further excess requests/approvals. Saved `days` is an audit snapshot at submission, updated to the reviewed count on approval. History shows both saved and current counts when they differ. Final decisions remain immutable; changing settings does not revoke existing approval. Covered current working dates remain excused, and approved leave is paid/excused in payroll. Actual attendance remains authoritative and is never overwritten or duplicated.

`hcm_leaves` contains exact fields: `id`, `employeeId`, `type` (Casual/Sick/Other), `from`, `to`, positive integer `days`, nonblank `reason`, `status` (Pending/Approved/Rejected), `comment`, canonical UTC `requestedAt`, nullable UTC `reviewedAt` and nullable `reviewedBy` (Admin ID). Pending requests have empty comment/null review fields; reviewed requests require comment, reviewer and review time on/after submission. IDs are unique; dates are valid, ordered and within one year. Historical employee IDs are deliberately retained. The original empty leave array is compatible; unfamiliar/nonempty shapes block editing and are preserved without migration. Derived balances, totals and leave attendance rows are never stored.

`js/leaves.js` holds reusable leave rules and role scope. `js/hcm.js` composes it, and scopes leaves in `getState()` to Admin all / Employee own / anonymous none. Admin review uses a fresh snapshot token and revalidation to reject stale actions; this does not make browser storage a cross-tab transaction.

## Use Phase 4 — Payroll and payslips

1. Open **Payslip** as Admin; choose an existing employee, month and year, then **Calculate / Refresh payslip**. Employee **My payslip** fixes identity to the current account and initially shows the current month. Choose another month/year and calculate. Future months are unavailable. Empty employee lists, invalid periods, unavailable accounts and storage errors show honest messages. Changing selection hides old figures until recalculated. Reload defaults to the current month; it saves no payroll record or selection.
2. Read the company, employee/department/ID, joining date and period, followed by monthly salary, configured/eligible working days, daily rate, gross entitlement, elapsed absences, completed half-days, approved paid-leave days, deductions and net. Amounts have two decimal places in the company's chosen currency; the app assumes no currency. The displayed rate is rounded only for reading; calculations use full precision.
3. Use **Print / Save as PDF**. Choose **Save as PDF** as the browser destination and then **Save**, or choose a printer. A4 portrait is recommended. The printed slip includes identity, period, breakdown, formulas and provisional/proration notices. Navigation, filters, actions and password content are hidden. Invoking printing does not itself download a PDF. The button and native print event recalculate with current data/session, hiding stale figures on error.

### Payroll calculation decisions

These supplement the PDF for cases its simple formula does not specify. No tax, bonus, overtime or salary accrual was introduced.

- **Completed fully eligible month:** daily rate = monthly salary / all configured working days in the month; deduction = daily rate × (absent + 0.5 × half-days); net = monthly salary − deduction. For 26,000 salary, 26 working days, 2 absent and 2 half-days: daily rate 1,000, deduction 3,000, net 23,000.
- **Current settings, including history:** current saved salary, working days, joining date and approved-leave rules apply. Editing them can change an old slip. Historical snapshots and locked payroll records are not implemented; Final means a past period with resolved relevant attendance under current data.
- **Joining month:** keep the full-month denominator; gross = daily rate × working days on/after joining. Net = gross − eligible deductions. The slip labels proration. Months with no eligible dates have zero entitlement.
- **Current month:** a provisional full-month projection, not salary earned to date. Gross covers the whole eligible month. Deduct only elapsed classified absence and completed working-day half-days, including completed today. Today/future are never absent. Future-month slips are unavailable.
- **Leave/attendance:** approved working-day leave is paid/excused; pending/rejected leave does not excuse absence. Actual attendance wins, including half-day/open/late attendance overlapping approval. The paid-leave count covers the whole selected eligible period, including future approved dates in a current-month projection, excluding actual attendance dates. Late alone has no deduction. Nonworking attendance gives no deduction or extra pay.
- **Open/overnight shifts:** an open eligible working-day shift makes its starting month's slip provisional, with unresolved dates and no invented duration/half-day status. Overnight/overdue attendance credits only the starting date; later working dates can remain absent. Nonworking open shifts do not block final payroll.
- **Zero working days:** Cannot calculate, with null amounts and disabled print button. Normal validated settings require at least one weekday, which occurs in every month. The defensive branch is tested with injected state; malformed stored settings still show a preservation error.

`js/payroll.js` provides read-only, role-scoped `employeeOptions()` and `slip({ year, month, employeeId })`, composed by `js/hcm.js`. Employee calls can omit their own ID; another/manipulated ID is rejected. Every call resolves the current user. The service reuses leave calendar/coverage and attendance absence logic, filters eligible working-day records and validates finite totals. It adds no storage keys, totals or snapshots. Viewing/printing never mutate source data. Browser owners can edit local code/storage; this remains learning-only authorization.

## Use Phase 5 — Announcements and keyword smart helper

1. Admin dashboard: under **Announcements**, enter a nonblank title and message, then **Post announcement**. Both dashboards show saved posts newest first with author and local timestamp. **Refresh announcements** or reload to read the latest records. Employees have no posting access, including through the service. There is no edit/delete/targeting/read-receipt feature. Failed saves keep your entered text and old records for retry.
2. Both dashboards: use the labeled **Your question** field and **Ask helper**, press Enter, or activate a suggested question using keyboard or pointer. The response log keeps question/answer pairs on this page only. Reload/account changes clear history. The helper uses JavaScript keyword patterns and current app data, without an LLM or external API. Unknown, combined, other-role or unsupported questions show the supported questions; ask one at a time.

| Role | Supported question / short variation | Answer policy |
| --- | --- | --- |
| Admin | How many employees do we have? / employee count | Current Employee accounts only. |
| Admin | Who is on leave today? / leave today | Approved coverage on configured working dates for current employees on/after joining. Pending/rejected/deleted accounts excluded; nonworking days stated. Coverage still shown when attendance exists. |
| Admin | Who was late today? | Saved actual `isLate`, including half-day and open shifts; retained deleted accounts labeled with ID. |
| Employee | How many leaves do I have left? / leave balance | Own current-year quota minus approved working days; pending reservations and available-to-request days separately. Current settings apply, including truthful negative balances. |
| Employee | Was I late today? / my late today | Own actual saved flag/status. No check-in means unknown, never falsely on time. |
| Employee | How many hours did I work this week? / hours this week | Sum completed durations for local Monday–Sunday by shift starting date. Include nonworking/overnight actual hours, exclude unfinished durations, disclose an open shift even if it started outside the week. |

Matching ignores case, ordinary punctuation and extra whitespace. It recognizes supported whole-question variants, with no arbitrary natural-language understanding. Employee queries cannot select another person or company totals. Every query resolves the current account and data; no answer cache is reused across account changes. History is cleared on account changes and storage/session errors. Clock/storage errors are reported instead of invented answers. Hours display two decimals; sums use stored millisecond durations.

`js/announcements.js` owns `list()`/Admin-only `post({ title, body })`; `js/helper.js` owns role-specific `suggestions()`/`query(question, { employeeId }?)`, returning only `{ intent, answer }`. The optional target never grants Employee cross-user access. It reuses existing attendance reports/current shift, leave coverage and annual balance rules. UI handlers remain in `js/pages.js`. `hcm_announcements` contains exactly `id`, `title`, `body`, `authorId`, canonical UTC `createdAt`. Unknown/missing fields, blank content, duplicate IDs or invalid timestamps preserve raw data and block use; no silent migration. No chat storage key or extra page was added.

Suggested walkthrough: Admin posts an announcement and asks the three company questions → log out → Employee reads the post, requests leave/checks in as appropriate and asks the three own-data questions → Admin reviews leave → Employee refreshes and asks again. Use records you enter; the app ships empty.

## Learning-only authentication and data

This is a browser-only learning demonstration. It cannot protect real HR, payroll or personal information: anyone with browser developer tools can read or change localStorage, change scripts or bypass role checks. Passwords are stored as salted PBKDF2-SHA256 hashes (100,000 iterations) rather than plaintext, but hashing does not turn browser-only accounts into secure authentication. There is no server, password recovery, shared storage across devices, or email delivery. Clearing site data removes all accounts and records.

`hcm_session` contains only `{ "userId": "…" }`. Every protected page resolves it against current `hcm_users`; removed accounts cannot keep using their session. Admin pages are `admin`, `employees`, `leaves`, `settings`; `employee` is Employee-only; `payslip` is accessible by either authenticated role, with Admin all / Employee own service scope. Cross-tab sign-in/data changes re-check and render the current state; this may discard an unsaved form. localStorage does not provide transactions across tabs; use one editing tab at a time. Writes are validated and multi-key setup attempts roll back on write failure, but browser crashes and simultaneous writers are not atomic transactions.

The six keys are `hcm_company`, `hcm_users`, `hcm_attendance`, `hcm_leaves`, `hcm_session`, `hcm_announcements`. Other storage keys are untouched. `js/storage.js` handles persistence/structure checks; `js/hcm.js` handles accounts/settings/access and composes `js/attendance.js`, `js/leaves.js`, `js/payroll.js`, `js/announcements.js` and `js/helper.js`; `js/ui.js` provides shared UI; `js/pages.js` wires page events. Local calendar dates are used for joining/leave dates; IDs use cryptographic random bytes. User text is rendered with DOM `textContent`/`value`. Salary is stored as a positive number in the company's chosen currency (no currency assumption).

Invalid JSON, invalid collection shapes and partial existing setup block editing with a clear error and preserve data. There is deliberately no automatic reset button. If this happens, first copy the raw `hcm_*` values using browser developer tools for a backup, then repair the invalid collection. For a deliberate fresh learning start, after backing up, remove all six `hcm_*` keys from the chosen browser origin yourself and reload. Do not remove only some keys or unrelated site storage. Storage denied/full errors are displayed; failed writes do not report success.

## Verification and continuation

```sh
node --test tests/domain.test.cjs tests/attendance.test.cjs tests/leaves.test.cjs tests/payroll.test.cjs tests/phase5.test.cjs
```

The domain suite uses isolated in-memory storage and never writes browser data. Optional browser integration verification uses Playwright as a development-only tool (not shipped to or loaded by the app):

```sh
node tests/browser.cjs
node tests/attendance-browser.cjs
node tests/leaves-browser.cjs
node tests/payroll-browser.cjs
node tests/phase5-browser.cjs
```

If Playwright is not on Node's module path, set `HCM_PLAYWRIGHT_MODULE` to the absolute directory of an already installed Playwright package. It uses installed Microsoft Edge by default; set `HCM_BROWSER_CHANNEL=chrome` to use an installed Chrome instead. These tools are for verification only; the app runs without them. The browser suite launches a temporary static server and fresh browser contexts, creates its own temporary records and destroys the contexts on completion. It never seeds app source or your normal browser profile.

Automated checks and manual screenshot inspection are distinguished in PROGRESS.md. Browser tests use installed Edge and an emulated 390px phone viewport, not physical phones. The payroll suite captures temporary final/provisional A4 PDFs and screenshots under the system temp directory. These use headless browser rendering; print invocation is stubbed for verification. The native OS dialog and actual user Save action are untested. All test records are isolated fixtures, not delivered app data.

See AGENTS.md for permanent guidance, PLAN.md for the PDF checklist and PROGRESS.md for exact verification. Phases 1–5 are complete; Phase 5 is paused for review/manual commit/push. Next only after authorization: Phase 6 premium UI/UX, then Phase 7 final acceptance. Do not begin those phases, commit, push, deploy or submit automatically.
