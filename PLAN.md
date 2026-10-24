# Saylani HCM Lite — requirements and build plan

## Source and scope

The workspace was inspected before implementation on 2026-10-24. It contained only `.git`, no commits, app files, or instructions. The original PDF was subsequently supplied at `C:\Users\ALPHA\Downloads\Saylani_Hackathon_HCM_Lite_Beginner_Track (1).pdf` and all four physical pages (cover plus three numbered pages) were read before continuing implementation. The following checklist combines every mandatory PDF requirement with the user's stricter milestone constraints. PDF section references below refer to the printed sections, not the decorative cover illustration. This source file remains unchanged in Downloads.

The PDF defines product behavior. Its instructions to host and submit describe eventual hackathon deliverables; they do not authorize this agent to deploy, submit, commit, or push. The user's explicit phase boundary and prohibition on those actions govern this work. Optional cover imagery, figures, Chart.js, LLM access, camera, location, and face detection are not mandatory requirements. PDF folder names are suggestions; the user's exact seven-page paths govern.

Use plain HTML, CSS, JavaScript, and localStorage only. No framework, backend, database service, external AI API, seeded accounts, or demo records. Mandatory behavior precedes polish. No charts, animation, dark mode, camera/location, or face detection. Work locally; do not deploy, submit, commit, or push. Stop after each authorized milestone for the user to commit and push. Current milestone: Phase 2. Repeat verification, documentation, report, suggested commit message, and pause at each phase.

## Mandatory requirements checklist

### Phase 1: foundation, identity, employee management, settings — complete

- [x] Exactly seven HTML pages: `index.html`, `pages/admin.html`, `pages/employees.html`, `pages/leaves.html`, `pages/settings.html`, `pages/employee.html`, `pages/payslip.html`.
- [x] Shared readable responsive navigation and basic styling.
- [x] Reusable `js/storage.js` for `hcm_company`, `hcm_users`, `hcm_attendance`, `hcm_leaves`, `hcm_session`, `hcm_announcements`.
- [x] Empty first-run setup creates company and Admin; collects office start time, grace minutes, yearly leave quota, working days.
- [x] Repeat setup cannot overwrite existing data.
- [x] Admin and Employee login, logout, and own-password change.
- [x] All protected pages check login and role; resolve session against current users. Employees cannot access Admin pages.
- [x] Admin can add, edit, delete employees with confirmation; search name/email and combine with department filter.
- [x] Add employee creates a usable Employee login; collect name, email, initial password, department, positive monthly salary, joining date.
- [x] Inline required-field, email-format, case-insensitive email-uniqueness, positive-salary validation.
- [x] Validate, edit, and persist company settings, including working days.
- [x] Honest empty states for later workflows; no invented dashboard figures or completion claims.
- [x] Business logic separated from page event handlers; stable unique IDs; local calendar dates; safe text rendering.
- [x] Clear storage errors; never silently replace malformed data.
- [x] Session stores no passwords or full user records.
- [x] Document browser-only authentication as a learning demonstration.
- [x] Verify setup, Admin login, creation, Employee login, both password changes, logout, role redirects, editing/deletion, combined search/filter, settings and refresh persistence.
- [x] Test records isolated from the delivered app; delivered app starts empty.

Verified on 2026-10-24: 14 domain tests and 14 isolated Edge browser scenarios passed; JavaScript syntax checks passed. PROGRESS.md records commands, evidence, limitations and the Phase 2 handoff.

### Other PDF requirements and eventual deliverables (sections 1–5 and 7)

- [x] Employee-only own check-in / check-out (role matrix #06); Admin has no personal attendance actions.
- [x] Admin all attendance records; Employee own records only (#07), employee/date filters and domain scope checks.
- [x] Late when check-in is strictly after office start + configured grace; one check-in per employee per local calendar day; checkout requires prior check-in. Separate persisted lateness and open status.
- [x] Work hours = checkout minus check-in; under 5 hours = half day; no record on an elapsed configured working day = absent, excluding before joining/today/future. Not leave-aware until Phase 3.
- [ ] Employee applies for leave and sees own status and balance (#08); type, from/to, working-day count, reason, status and Admin comment persisted.
- [ ] Admin approves/rejects leave with a comment (#09); `leaves.html` is an Admin page. Employee applies/sees leave on `employee.html`.
- [ ] Leave From <= To; count configured working days only, skip nonworking weekends; no overlapping leave; cannot exceed Admin's yearly quota; approved leave updates balance.
- [x] Admin current employee total/today's attendance and Employee personal attendance summaries (#10). All figures derived from real records, no seeded data.
- [ ] Pending-leave dashboard totals and integration with personal balance (#10) remain Phase 3.
- [ ] Monthly payslip: Admin all / Employee own (#11), with print and browser Save as PDF.
- [ ] Payslip per-day = monthly salary / configured working days in selected month; deduction = per-day × (absent days + 0.5 × half days); net = monthly salary − deduction. Resolve any zero-working-day month and approved-leave interpretation explicitly at that phase rather than silently inventing rules.
- [ ] Small helper chat on both dashboards: keyword matching with JavaScript and real app data, Admin all data / Employee own only (#12). No external AI API under user constraints.
- [ ] Required Admin helper questions: employee count; who is on approved leave covering today; who was late today.
- [ ] Required Employee helper questions: own leaves left (quota minus own approved leave days); was I late today; own hours worked this week.
- [ ] Announcements: Admin posts, Employee reads (#13); stored in `hcm_announcements` per the user's explicit additional key.
- [x] Responsive phone design and clear forms/errors; organized reusable code; clear walkthrough and README explaining available app use (sections 1 and 7). Dedicated premium design is Phase 6; final cross-workflow audit is Phase 7.
- [ ] Eventual hosted link plus GitHub repository link and LMS submission (sections 1 and 7): deferred to the user; this session must not deploy or submit.

PDF role matrix #01–05 and storage section 4 are covered by the Phase 1 checklist above, including both own-password changes, working days and the exact six keys. The PDF's simple storage snippet is illustrative, not a requirement to use timestamp IDs, plaintext passwords or silently reset malformed JSON.

## Build plan (preserve completed milestone numbering)

1. **Foundation and administration — complete:** seven pages, shared UI, validated storage, empty setup, accounts/session/roles/password changes, employee CRUD/search/filter, company settings, reserved-workflow states. Verified in isolated tests; both planning documents updated. Stopped for the user's commit/push.
2. **Attendance — complete:** one daily Employee check-in, checkout prerequisite, late/grace and under-five-hour half-day rules, configured working-day absence and hours, Admin all / Employee own records/filters, real summaries. Strict validation and explicit nonworking/overnight policies; verified boundaries, persistence, errors, scope and Phase 1 regressions. Paused for user review/commit/push.
3. **Leave management:** implement Employee requests/status/balance and Admin approval/rejection with comment; ordered dates, working-day counts, overlap prevention and yearly quota; real pending-leave totals. Verify balances and state transitions, update docs and pause.
4. **Payroll and payslips:** implement the PDF monthly per-day/deduction/net formula, Admin all / Employee own selection and print / Save as PDF. Verify month/day cases, figures, print layout and access, update docs and pause.
5. **Announcements and keyword helper:** implement Admin posting / Employee reading and dashboard keyword chats covering all six PDF question groups using role-scoped real data. Verify safe rendering and coverage, update docs and pause.
6. **Dedicated premium UI/UX:** after mandatory workflows pass, establish consistent design tokens, responsive layouts, accessible interactions, reduced-motion support and suitable generated illustrations when available. Verify behavior remains intact; update docs and pause. This stage is explicitly reserved, not part of Phase 2.
7. **Final acceptance:** compare every PDF requirement and user constraint, test all cross-workflow behavior, persistence, roles, accessibility/responsiveness, errors and empty first run after the design stage. Update README/demo and final checklist; pause. No automatic deployment/submission.

Phase 2 attendance was authorized by the user's new request and is now complete. Implement nothing from phases 3–7 in this milestone. User commits and pushes after each phase; the agent supplies a suggested commit message and pauses.

## Phase 2 policies and acceptance (recorded before calculations)

AGENTS.md records permanent guidance, the complete PDF requirements and explicit attendance policies. No prior AGENTS.md or agreed overnight/nonworking-day policy existed. Allow nonworking-day attendance without extra absence obligations. Allow overnight/overdue checkout on the original date; block a new shift until the prior open shift closes. Count all elapsed duration and credit only the starting date. Reject backward-clock actions. Store the check-in local offset, absolute start+grace cutoff and separate lateness so timezone/settings edits do not rewrite history. Open records remain Checked in, with no completed duration.

Absence uses current working days and joining dates, only before today, with a reusable future leave-exclusion hook; Phase 2 is explicitly not leave-aware. Deleted accounts retain actual attendance by ID but generate no new synthetic absence. Inclusive date filters default to the current month through today; blank boundaries allow all history. Late totals overlap open/half-day counts and are labeled accordingly.

- [x] Employee own actions; reject Admin/anonymous/other-employee actions and attendance reads.
- [x] Strict stored record/ID/date/timestamp/status/duration validation and daily uniqueness; malformed data preserved.
- [x] Cutoff/exact-five-hour boundaries; duplicate/open/overnight/backward-clock and joining-date checks.
- [x] Admin all attendance and employee/date filters; Employee own date-filtered history only.
- [x] Reusable elapsed-working-day absence excluding before-joining/today/future; real dashboard summaries.
- [x] Refresh/save failure/empty startup/mobile checks; relevant Phase 1 regression tests.
- [x] Update docs with actual results, limitations, next step and suggested commit; pause.

## Verification approach

Use Node's built-in test runner with isolated in-memory localStorage for domain/storage tests; use a temporary browser origin/context for UI verification if browser tooling is available. Do not seed application source or the user's normal browser origin. Verify page inventory and syntax, required workflows and invalid inputs, stale/deleted sessions, malformed storage, denied writes and no overwrite on repeat setup. Record exact commands/results and remaining verification limits in PROGRESS.md.
