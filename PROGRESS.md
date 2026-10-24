# Progress and handoff

## Current handoff: Phase 3 — complete, paused for user review/manual commit/push

Completed on 2026-10-25 under the attached request to implement Leave Management only. Inspected AGENTS.md, PLAN.md, this file, README.md, existing code/tests and all four physical pages of the original PDF (text extraction plus rendered-page inspection). Existing Phase 1–2 implementation and module boundaries were extended. No commit, push, deployment, submission, framework, application backend, extra storage key, seeded app data, payroll, announcement/helper feature, illustration or premium redesign was added. Exactly seven page paths remain.

### Phase 3 changed files and behavior

- Added `js/leaves.js`: reusable role-scoped request/preview/list/yearly balance, inclusive current working-day counts, range/joining/year/overlap/quota rules, pending reservations across all three types, Admin prepare/review with current count and snapshot token, immutable finalized decisions, real pending/approved-today summaries and retained-deleted-ID filter options. Every mutation re-resolves the current account. No stored aggregate totals.
- Extended `js/storage.js`: exact leave record fields, valid same-year ordered calendar dates, positive plausible day count, type/status, required reason, canonical submission/review timestamps, required reviewer/comment for finalized records and unique IDs. Existing empty arrays work; unfamiliar/malformed data blocks editing and is never migrated/erased.
- Extended `js/hcm.js`: composes leave service and scopes `getState().leaves` to Admin all / Employee own / anonymous none; local dates consistently pad four-digit years. Existing account/settings/session APIs preserved.
- Extended `js/attendance.js`: uses the existing absence-exclusion hook for approved leave, derives approved-leave rows through today and adds summary counts. Actual attendance wins, so no duplicate row or overwritten attendance; pending/rejected leave does not excuse absence. Existing check-in/out/lateness/duration/overnight rules remain intact.
- Extended `js/pages.js`: Employee request form, inline errors and day preview on `employee.html`, all-year own history with comments/timestamps, selected-year approved balance/pending/available figures; Admin employee/status filters, review panel with saved/current count, comment/decision fields, stale/error handling and immutable final UI on `leaves.html`; real Admin dashboard leave totals. Attendance labels/rows explain approved leave. Failed request/review saves keep entered form text and old data.
- Updated `index.html` and `pages/admin.html`, `pages/employees.html`, `pages/leaves.html`, `pages/settings.html`, `pages/employee.html`, `pages/payslip.html`: load leave module before domain composition, Phase 3 footer, same seven paths.
- Updated `css/style.css`: minimal leave table width and action-cell spacing to prevent split Review/Finalized labels; existing responsive visual style preserved. No Phase 6 design work.
- Updated `tools/serve.cjs`: static allowlist includes leave script; still development-only static preview.
- Added `tests/leaves.test.cjs` and `tests/leaves-browser.cjs`; updated module loaders/inventory in `tests/domain.test.cjs` and `tests/attendance.test.cjs`, and superseded absence wording assertion in `tests/attendance-browser.cjs`. Existing `tests/browser.cjs` unchanged and rerun.
- Updated `AGENTS.md`, `PLAN.md`, `README.md`, `PROGRESS.md`: decisions, completion checklist, usage/schema, tests, current handoff and corrected stale remaining-work wording.

### Phase 3 policy decisions

These choices supplement the PDF and follow the attached request; permanent details are in AGENTS.md and the walkthrough/schema in README.md.

- Casual/Sick/Other share one calendar-year quota. Pending working days reserve it. Approval must fit all current approved and pending reservations; a quota reduction may require rejecting excess pending requests or adjusting settings first.
- Count inclusive current configured working dates. Reject zero-day, reversed, before-joining and cross-year ranges; split years. Historical requests are allowed. Pending/approved calendar ranges block overlap; rejected ranges permit replacements. No medical-proof/accrual rules added.
- Balances use current settings for every saved request, including approvals; show negative balances after settings changes. Saved `days` is an audit snapshot, updated at approval, and differences are explicitly displayed. Settings do not revoke finalized decisions.
- Review displays current days before approval. Relevant company/employee/leave changes require opening Review again; approval also revalidates employment, joining, working-day count, overlap and quota. Comment is required for approval and rejection; finalized decisions cannot be changed or double-counted. Deleted requests stay identifiable/filterable and can be rejected, never newly approved.
- Approved leave excuses covered configured working dates on/after current joining date. Actual attendance stays authoritative (late/half-day/open included). Synthetic leave rows extend through today only; future requests remain in leave history. No synthetic history is created for deleted employees. Approved leave is paid/excused for future Phase 4 integration; payroll is not implemented.

### Phase 3 exact verification results

All test data was isolated in memory or disposable browser contexts. No normal browser profile or delivered app source was seeded.

**Automated checks:**

1. `node --test tests/domain.test.cjs tests/attendance.test.cjs tests/leaves.test.cjs`: **43 passed, 0 failed** (14 foundation + 13 attendance + 16 leave). New coverage: valid/same-day/preview/custom-Sunday/leap-year counts, invalid/reversed/zero-day/pre-joining/cross-year requests, pending/approved overlap and rejected replacement, shared exact/zero/over quota, multiple pending reservations and yearly isolation, approval after quota/working-day/joining/employment/overlap changes, explicit changed-count preparation, stale/repeated/finalized/comment checks, all/own/anonymous/deleted-session scope, current-settings negative balance, approved vs pending/rejected absence, actual late half-day/open attendance coexistence, today/future boundaries, schema/duplicate/JSON preservation, failed request/approval/rejection writes, refresh persistence and backward review clock. Includes maximum supported calendar-year iteration boundary.
2. `node tests/browser.cjs`: **14 scenarios passed** in installed headless Edge, preserving foundation workflows, passwords, roles/redirects, employee CRUD/filter/search, settings, empty startup, storage errors and mobile regression checks.
3. `node tests/attendance-browser.cjs`: **10 scenarios passed** in installed Edge with controlled clock and Asia/Karachi timezone, preserving attendance actions, cutoff/duration, filters/scope, overnight/nonworking/joining policies, save failures and phone layouts. Only the now-superseded not-leave-aware text expectation changed.
4. `node tests/leaves-browser.cjs`: **10 scenarios passed** in installed Edge with controlled clock and isolated Asia/Karachi contexts. Actual UI Employee request → Admin review → Employee status/comment/balance; inline request errors/preview, safe markup text, pending quota, all/own isolation and Admin route guard, employee/status filters and empty states, required review comment, failed approval and request retaining input/data, finalized UI, rejection/replacement, stale settings review, updated count, reduced quota approval blocking, exact/over quota, yearly balance, real pending totals, approved-leave absence and actual open-shift precedence, refresh persistence, 390px forms/tables/review, malformed storage preservation and clean empty first run. No page JavaScript errors.
5. `node --check` passed for all **13** app/tool/test JavaScript files. Domain inventory verified exactly seven HTML paths and shared module loads. Static preview served the new leave script successfully during browser tests.

Browser invocation (development-only installed package; no app dependency added):

```powershell
$env:HCM_PLAYWRIGHT_MODULE='C:\Users\ALPHA\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
node tests/browser.cjs
node tests/attendance-browser.cjs
node tests/leaves-browser.cjs
```

**Manual visual inspection:** reviewed generated 1280px Admin desktop and 390px Employee/Admin phone screenshots. Fixed split Admin action labels found in screenshot review, then reran leave browser verification and inspected the updated phone form/review and table screenshots. Forms, current-count notices, inline errors and review actions fit; wide tables use their own horizontal scroll. Screenshots are temporary QA files in the system temp directory (`hcm-phase3-*.png`), not delivered app assets. This was visual inspection of automated captures, not a separate hand-operated end-to-end walkthrough, physical-phone or screen-reader test.

### Phase 3 limits and next step

- No known failing Phase 3 acceptance checks. Browser-only identity/device time remain a learning demonstration. localStorage is origin-specific and cannot provide cross-tab atomic transactions; one editing tab is recommended. A snapshot token detects stale reviews but does not remove that storage limitation.
- Current working-day/quota/joining edits can alter historical derived figures; negative balances remain visible. Actual attendance and finalized decisions are retained. No background clock refresh, pagination, cancellation/editing of submitted requests or reversal of finalized decisions was added.
- Verified in installed Edge and emulated 390px phone viewports; other browsers, physical phones and assistive technologies were not manually exercised. Blank attendance filters can generate large reports for old joining dates.
- Payroll/payslip, announcements/helper, premium UI and final acceptance remain Phases 4, 5, 6 and 7 respectively. Announcement schema stays reserved for its phase. Publishing/LMS/repository delivery remains user-controlled.

**Pause for the user's Phase 3 review and manual commit/push. Next only after authorization: Phase 4 payroll/payslips, using the PDF formula, approved paid/excused leave, all/own scope and print/Save as PDF. Do not start it automatically.**

Suggested commit message: `feat: implement leave management with quota reservations and attendance integration`

---

## Phase 2 — historical completion record (superseded by Phase 3 above)

Completed on 2026-10-24. Phase 2 was explicitly authorized by the user. Phase 1 implementation was extended, not restarted. The workspace still contains the user's untracked app files; no automatic staging, commit, push, deployment or submission occurred. No Phase 3 workflow or illustration/bonus was implemented.

### Inspection, guidance and conflicts

Read the existing modules, seven page shells, tests, PLAN.md, this file, README.md and all four physical pages of the original PDF before modifying anything. Existing boundaries: storage validation in storage.js, account/settings/access in hcm.js, reusable UI in ui.js and page events in pages.js. Added a focused reusable attendance.js rather than rewriting these modules.

No existing AGENTS.md was found. Created it with all mandatory PDF areas, user constraints and attendance policies before calculations. Stale Phase 1 stop instructions in planning/README were superseded by the user's Phase 2 authorization and updated; no conflicting permanent instructions existed. The PDF's future hosting/submission deliverables do not authorize automatic publication.

Phases 1–5 keep their numbers. Phase 6 is now explicitly dedicated to premium UI/UX (design tokens, responsive/accessibility/reduced-motion support and suitable generated illustrations when available); final acceptance follows as Phase 7. Neither stage is part of this milestone.

### Phase 2 implemented behavior and changed files

- Added `AGENTS.md`: permanent product requirements, constraints, policies and milestone handoff rules.
- Added `js/attendance.js`: Employee-only own check-in/out, one record per local date, one open shift, duplicate/repeat/without-check-in rejection, exact start+grace lateness, completed elapsed duration and <5h half-day classification. Frozen cutoff and separate `isLate` survive settings changes and half-day classification. Role-scoped reports/filters, current state, real overview and Admin employee filter choices; reusable pure absence derivation with a future exclusion callback.
- Extended `js/storage.js`: exact attendance record fields, stable IDs, canonical timestamps, valid saved calendar date/UTC offset, boolean lateness matching cutoff, consistent open/completed status and duration, unique IDs/employee-date pairs and at most one open shift per employee. Malformed/unfamiliar collections are preserved and block editing; no silent conversion. Existing empty Phase 1 attendance is compatible.
- Extended `js/hcm.js`: composes attendance service and supports an injected clock for isolated tests. Its `getState()` scopes attendance to the resolved role (none when anonymous, own for Employee, all for Admin). Existing account/settings business logic preserved.
- Extended `js/pages.js`: replaced attendance placeholders on both dashboards with real current/month summaries, Employee actions/current shift and shared history. Admin Employee/date filters and Employee own date filters, inline reversed-date errors, inclusive ranges, truthful empty/absent/open states, completed durations and separate late column. Later leave/payroll/helper/announcements remain placeholders. No fake data/figures.
- Updated all seven existing HTML shells: attendance script loads before hcm.js, footer reflects Phase 2; paths unchanged. Existing CSS/UI helpers reused; no visual redesign.
- Updated `tools/serve.cjs` static allowlist for the new script. No application backend/API added.
- Added `tests/attendance.test.cjs` and `tests/attendance-browser.cjs`; updated the existing domain loader/page-inventory check for the new module. Existing Phase 1 browser tests preserved and rerun.
- Updated PLAN.md's checklist/policies/stages, README.md's usage/schema/time policies/test commands and this progress handoff.

### Policy decisions recorded before implementation

- Nonworking-day check-ins are allowed on/after joining, visibly noted; no new absence obligations or payroll entitlement follows.
- Overnight/overdue checkout closes the original record/date; no new check-in while open, no automatic checkout or arbitrary duration cap. Duration is actual elapsed timestamps. Only the starting date is credited; later elapsed working dates without their own record can be absent.
- Open attendance is Checked in with null duration regardless of hours elapsed. Completed <5h is Half day; exactly 5h is Present/Late. `isLate` is separate and uses the saved absolute cutoff, strictly after start+grace.
- Local dates come from device calendar, timestamps from the same device as UTC ISO; saved offset validates the original date even after timezone changes. Backward-clock/future-relative activity blocks new actions.
- Absence uses current configured working/joining settings, excludes before joining/today/future and days with actual attendance. Historical absence can change with settings edits. Deleted accounts retain actual records but generate no new absence. Absence is synthetic, not persisted, and explicitly NOT leave-aware/payroll-ready. A pure exclusion callback is reserved for Phase 3; no leave workflow is wired yet.
- Inclusive date filters default to local month start/today; blank bounds include all available history. Late summaries overlap open/half-day counts and are labeled.

### Phase 2 verification results

**Automated:** all final checks passed, using temporary records in isolated memory/browser contexts only. No delivered app data or normal browser profile was seeded.

1. `node --test tests/domain.test.cjs tests/attendance.test.cjs`: **27 passed, 0 failed** (14 Phase 1 regressions + 13 attendance tests). Covers both roles/anonymous/cross-employee authorization; cutoff and +1ms; 4h59m and exactly 5h; late half day; duplicate actions and open state; local midnight/year change and saved offsets across viewer timezone changes; nonworking and overnight/overdue policies; backward/invalid clock; before joining; absence vs custom working days (including Sunday), joining/today/future and settings changes; pure exclusion hook; Admin/date filters; Employee isolation; deleted-record retention; strict schema/uniqueness rejection; preserved failed check-in/out and refresh state; exact seven-page inventory and all Phase 1 account/settings checks.
2. Existing `node tests/browser.cjs`: **14 scenarios passed**, covering Phase 1 setup/login/passwords/CRUD/search-filter/settings/roles/persistence/empty startup/storage errors/mobile regression checks.
3. `node tests/attendance-browser.cjs`: **10 scenarios passed**, using installed Edge with Asia/Karachi timezone, controlled browser clock and isolated contexts. Covers actual Employee check-in/out/buttons/open state/refresh, cutoff and +1ms, 4h59m and 5h, late half day, own isolation and denied cross-user/Admin actions, both filter types and inline reversed range, exact derived absence and summaries, nonworking/overnight UI, full-storage errors preserving both action states and records, 390px Employee actions/Admin history, unfamiliar-data preservation and untouched fresh startup. No JavaScript page errors.

   Browser commands use this development-only module setting in PowerShell:

   ```powershell
   $env:HCM_PLAYWRIGHT_MODULE='C:\Users\ALPHA\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
   node tests/browser.cjs
   node tests/attendance-browser.cjs
   ```

4. JavaScript syntax checks passed. Static paths and exactly seven HTML pages retained.

**Manual inspection:** visually inspected generated 1280px Admin desktop and 390px Employee/Admin phone screenshots. Readable shared styling, labels/filters/actions, safe rendered employee text, open/derived distinctions and contained horizontal attendance tables. This was screenshot inspection, not a separate hand-operated end-to-end walkthrough or physical-phone test.

### Phase 2 limits at that historical handoff

- No known failing Phase 2 acceptance checks. Browser-only authentication and client device clock remain learning-only and tamperable; there is no trusted time source. localStorage is origin/browser-specific and not transactional across tabs; use one editing tab.
- At Phase 2, attendance was not leave-aware. Phase 3 now connects and tests approved-leave exclusions. Payroll/helper/announcements remain unimplemented. No invented current-day absence or finalized open-shift duration.
- Use Refresh attendance/reload after date/time changes to refresh displayed action availability and summaries. There is no live clock/background timer. Overnight records are attributed to their starting date; long elapsed shifts do not grant automatic multi-day credit.
- Historical absence uses current working-day/joining settings and current accounts; deleted records remain actual history only. Blank date filters may create a large report for very old joining dates; no pagination added in this milestone.
- Strict attendance schema deliberately blocks unfamiliar nonempty shapes instead of guessing a migration. Back up/repair data explicitly. Phase 3 now adds strict leave validation; announcement schema remains for Phase 5.
- Verified with installed Edge and emulated 390px viewport, not all browsers, physical mobile devices or hand-operated screen-reader testing.

### Historical next step after Phase 2 (superseded)

The Phase 2 stop was subsequently superseded by the user's Phase 3 authorization. The current Phase 3 handoff above now governs continuation.

Suggested commit message: `feat: add role-scoped attendance tracking and summaries`

After Phase 3 is explicitly authorized: inspect the current files, AGENTS.md, PDF and handoff; implement Employee leave requests/status/balance plus Admin approval/rejection with comment; ordered dates, configured working-day counts, no overlapping leave, yearly quota. Resolve cross-year/status-overlap policies explicitly before calculation. Add strict leave validation without erasing unfamiliar data. Connect approved leave to reusable absence exclusion and real pending-leave summaries, preserving Phase 1–2 behavior. Verify, update all handoff docs and pause again. Payroll/announcements/helper stay later.

---

## Phase 1 — historical completion record

Phase 1 was completed and verified on 2026-10-24. At that historical handoff Phase 2 had not started; it is now completed as recorded above. No commit, push, deployment or submission was performed.

## Workspace and original-PDF review

- Initial workspace contained only `.git`, without commits or existing app code. No existing user work was removed. PLAN.md with requirements and six phases was saved before coding.
- The original PDF was supplied during implementation at `C:\Users\ALPHA\Downloads\Saylani_Hackathon_HCM_Lite_Beginner_Track (1).pdf`. All four physical pages were read before continuing; the source remains unchanged.
- Compared PDF with PLAN.md, this progress file and the initial storage/domain code. Added all 13 role-matrix rows, exact attendance/leave/payroll rules, six helper question groups, announcements, README/walkthrough and eventual hosting/submission deliverables to the checklist.
- Corrected the initial planned guard so `leaves.html` is Admin-only. Employee leave actions belong on their own dashboard in Phase 3. Other completed code met the brief and was preserved.
- PDF hosting/submission directions are future deliverables, not authorization to publish. Optional bonus features and decorative cover figures are excluded under the user's explicit scope.

## Completed features

- Exactly seven HTML pages at the requested paths; shared responsive navigation, labels, inline errors, keyboard focus, skip link and readable styling. Phone directory uses a separately scrollable, keyboard-focusable table rather than squeezing columns.
- `js/storage.js`: six required keys, JSON and current-structure validation, preserved malformed/incomplete state, clear unavailable/full-storage errors and best-effort rollback of multi-key setup writes. Other site keys are untouched. No auto-reset or seed data.
- `js/hcm.js`: separate domain validation, setup, session/roles, account management, settings, local-date helpers, stable random IDs and password functions.
- Empty setup collects company name, office start, grace minutes, yearly quota, explicit working days and Admin account. Cannot run again over existing data. Successful setup opens login; no implicit seeded session.
- Case-insensitive login for both roles; logout; own-password changes with current-password verification, confirmation and eight-character minimum. Salted PBKDF2-SHA256 hashes; session stores only user ID.
- Every protected page checks session against current user records. Employees redirect from all four Admin pages; Admin redirects from Employee-only dashboard. Stale/deleted sessions cannot grant access. Storage events and browser-back restoration recheck access; focus also rechecks the guard.
- Admin employee add/edit/delete (native confirmation including cancel path), name/email search plus department filtering, empty/no-match states. Employee creation provides working login. Edit preserves ID/password and updates login email; deletion disables login. Name/email/department/salary/joining date validation and field-level errors included.
- Company settings edit/save with validation and persistence, including working days and allowed zero grace/quota.
- At Phase 1, Employee saw their profile and later-workflow placeholders. Attendance and leave are now complete as recorded above. Payslip, announcements and helper still identify their later phases; no fabricated payroll/print claims.
- README covers running a static preview, using the app, verification, storage keys, learning-only browser authentication, data recovery and the handoff boundary. Static preview tool has no application API/backend or database.

## Verification results

All checks below passed. Test records existed only in in-memory storage or disposable browser contexts; app source and the normal browser profile were never seeded.

1. `node --test tests/domain.test.cjs`: **14 tests passed, 0 failed**. Covers empty setup, all required setup inputs, settings rules, repeat-setup prevention, login and minimal session, CRUD/stable IDs/edit login, case-insensitive uniqueness, salary/date validation, combined search/filter, both password changes and failures, every page's role routes and mutation authorization, settings persistence, malformed/partial storage preservation, blocked/full storage rollback, failed writes retaining old data, local calendar dates and exact seven-page inventory.
2. Browser suite: **14 scenarios passed, 0 failed**, using bundled Playwright and installed Microsoft Edge in headless mode, with fresh contexts and an ephemeral local static origin. The final run completed after the table-readability correction. Exact PowerShell invocation used:

   ```powershell
   $env:HCM_PLAYWRIGHT_MODULE='C:\Users\ALPHA\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
   node tests/browser.cjs
   ```

   Covers actual setup forms and inline errors; all anonymous page redirects; Admin and Employee login; working employee creation; invalid email/duplicate/salary errors; safe text rendering with markup input; combined search/filter; edit and cancel; settings and selected working days after reload; both password changes with old-password rejection and new-password login; logout; all Employee-to-Admin redirects; Admin-to-Employee redirect; deletion cancel/confirm/persistence; deleted login and stale session; cross-tab logout; 390px layouts for all Admin pages, Employee dashboard and first-run setup; preserved malformed storage; denied getter/full-storage failure and setup rollback. No browser JavaScript errors. A separate clean context still displayed untouched first-run setup with zero `hcm_*` keys.
3. `node --check` passed for all four application scripts, static preview and browser test scripts. Static preview returned HTTP 200. Desktop (1280px) and phone (390px) screenshots were visually inspected. Screenshots are temporary QA artifacts outside the repository and contain isolated test records; none are delivered as app content.

## Known issues and limits

- No known failing Phase 1 requirements or unresolved Phase 1 test failures.
- Browser-only authentication is a learning demonstration, not suitable for real HR data; localStorage can be edited by the browser owner. Data is browser/origin-specific. Password recovery and production security are outside this brief.
- localStorage cannot make cross-tab transactions atomic. Use one editing tab; a change in another tab re-renders and may discard unsaved input. Setup writes attempt rollback on write failures and report incomplete rollback explicitly if necessary.
- Verified on desktop Edge and emulated phone viewport, not physical phones or every browser. Web Crypto requires localhost or HTTPS. No runtime dependency installation was needed for the application.
- At Phase 1, attendance/leave/announcement collections were checked as arrays of objects. Phases 2–3 now add strict attendance/leave validation; announcement validation remains for Phase 5. Do not auto-migrate or silently reset unfamiliar existing records.
- Attendance/leave policy edges are now recorded in AGENTS.md, including open-shift and cross-year/paid-leave rules. Remaining payroll-specific edges (such as partial joining months or months without configured working days) must be resolved in Phase 4 before presenting salary calculations.

## Remaining mandatory work

The unchecked items in PLAN.md are the source checklist. Attendance, leave and their real company/personal summaries are complete. Remaining: monthly payslip formula with all/own access and print/Save as PDF; Admin announcements/Employee reading; both keyword-helper chats with role-scoped real answers; Phase 6 premium UI and Phase 7 final integration acceptance. Hosting/repository links and LMS submission remain the user's eventual responsibility, outside this session.

## Historical next step after Phase 1 (superseded)

The user subsequently authorized Phases 2–3; the current Phase 3 handoff above now governs continuation.

Suggested commit message: `feat: implement phase 1 HCM setup, auth, employees and settings`

The original Phase 1 handoff pointed to attendance. Phases 2–3 are now complete; remaining work starts at Phase 4 only after authorization.
