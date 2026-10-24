# Saylani HCM Lite — requirements and build plan

## Source and scope

The workspace was inspected before implementation on 2026-10-24. It contained only `.git`, no commits, app files, or instructions. The original PDF was subsequently supplied at `C:\Users\ALPHA\Downloads\Saylani_Hackathon_HCM_Lite_Beginner_Track (1).pdf` and all four physical pages (cover plus three numbered pages) were read before continuing implementation. The following checklist combines every mandatory PDF requirement with the user's stricter milestone constraints. PDF section references below refer to the printed sections, not the decorative cover illustration. This source file remains unchanged in Downloads.

The PDF defines product behavior. Its instructions to host and submit describe eventual hackathon deliverables; they do not authorize this agent to deploy, submit, commit, or push. The user's explicit phase boundary and prohibition on those actions govern this work. Optional cover imagery, figures, Chart.js, LLM access, camera, location, and face detection are not mandatory requirements. PDF folder names are suggestions; the user's exact seven-page paths govern.

Use plain HTML, CSS, JavaScript, and localStorage only. No framework, backend, database service, external AI API, seeded accounts, or demo records. Mandatory behavior precedes polish. No charts, dark mode, camera/location, or face detection. Phase 6 explicitly authorizes restrained native motion and generated local artwork. Work locally; do not deploy, submit, commit, or push. Stop after each authorized milestone for the user to commit and push. Current milestone: Phase 6 complete, paused for screenshot review/manual commit/push. Repeat verification, documentation, report, suggested commit message, and pause at each phase.

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
- [x] Work hours = checkout minus check-in; under 5 hours = half day; no record on an elapsed configured working day = absent, excluding before joining/today/future and approved leave. Actual attendance takes precedence.
- [x] Employee applies for leave and sees own status and balance (#08); type, from/to, working-day count, reason, status and Admin comment persisted.
- [x] Admin approves/rejects leave with a required comment (#09); `leaves.html` is an Admin page. Employee applies/sees leave on `employee.html`.
- [x] Leave From <= To; count configured working days only, skip nonworking days; no pending/approved overlapping ranges; cannot exceed Admin's shared yearly quota with pending reservations; approved leave updates balance.
- [x] Admin current employee total/today's attendance and Employee personal attendance summaries (#10). All figures derived from real records, no seeded data.
- [x] Pending-leave dashboard totals and personal balance (#10), plus company approved-leave-today summary.
- [x] Monthly payslip: Admin all / Employee own (#11), with print and browser Save as PDF.
- [x] Payslip per-day = monthly salary / configured working days in selected month; deduction = per-day × (absent days + 0.5 × half days); net = monthly salary − deduction for a fully eligible month. Explicit joining proration, current-month projection, approved paid leave, open-shift and zero-working-day decisions supplement this formula (below and AGENTS.md).
- [x] Small helper chat on both dashboards: keyword matching with JavaScript and real app data, Admin all data / Employee own only (#12). No external AI API under user constraints.
- [x] Required Admin helper questions: employee count; who is on approved leave covering today; who was late today.
- [x] Required Employee helper questions: own leaves left (quota minus own approved leave days); was I late today; own hours worked this week.
- [x] Announcements: Admin posts, Employee reads (#13); stored in `hcm_announcements` per the user's explicit additional key.
- [x] Responsive phone design and clear forms/errors; organized reusable code; clear walkthrough and README explaining available app use (sections 1 and 7). Dedicated premium design is Phase 6; final cross-workflow audit is Phase 7.
- [ ] Eventual hosted link plus GitHub repository link and LMS submission (sections 1 and 7): deferred to the user; this session must not deploy or submit.

PDF role matrix #01–05 and storage section 4 are covered by the Phase 1 checklist above, including both own-password changes, working days and the exact six keys. The PDF's simple storage snippet is illustrative, not a requirement to use timestamp IDs, plaintext passwords or silently reset malformed JSON.

## Build plan (preserve completed milestone numbering)

1. **Foundation and administration — complete:** seven pages, shared UI, validated storage, empty setup, accounts/session/roles/password changes, employee CRUD/search/filter, company settings, reserved-workflow states. Verified in isolated tests; both planning documents updated. Stopped for the user's commit/push.
2. **Attendance — complete:** one daily Employee check-in, checkout prerequisite, late/grace and under-five-hour half-day rules, configured working-day absence and hours, Admin all / Employee own records/filters, real summaries. Strict validation and explicit nonworking/overnight policies; verified boundaries, persistence, errors, scope and Phase 1 regressions. Paused for user review/commit/push.
3. **Leave management — complete:** Employee requests/preview/status/history/yearly balance, Admin filters/review/comments, strict storage and role scope, pending quota reservations, current-settings/stale-review validation, real dashboard leave totals and approved-leave absence integration. Verified with isolated domain/browser tests; paused for user review/commit/push.
4. **Payroll and payslips — complete:** reusable read-only payroll module, PDF formula, Admin all / Employee own, month/year selection, current-settings derivation, joining proration/current-month projection, approved paid leave and unresolved-shift notices, browser print / Save as PDF. Domain/browser regressions and A4 output verified; paused for review/manual commit/push.
5. **Announcements and keyword helper — complete:** Admin posts validated announcements; both dashboards read newest first. Memory-only keyword chats answer all six required question groups from fresh role-scoped data. Storage/save errors, safe rendering, account changes, keyboard and phone layouts verified; paused for review/manual commit/push.
6. **Dedicated premium UI/UX — complete:** shared navy/blue identity, design tokens, SVG mark/favicon, generated local illustrations, seven redesigned pages, responsive sidebar/Menu, semantic badges, real overview cards, grouped forms, contained histories, professional payslip and reduced-motion/native animation. Domain/browser regression, visual/print verification and documentation complete; paused for screenshot review/manual commit/push.
7. **Final acceptance:** compare every PDF requirement and user constraint, test all cross-workflow behavior, persistence, roles, accessibility/responsiveness, errors and empty first run after the design stage. Update README/demo and final checklist; pause. No automatic deployment/submission.

Phases 1–6 are complete. The user's attached Phase 6 request supersedes the earlier Phase 5 stop wording and authorizes this design milestone only. Phase 7 remains separately authorized work. User commits and pushes after each phase; the agent supplies a suggested commit message and pauses.

## Phase 2 policies and acceptance (recorded before calculations)

AGENTS.md records permanent guidance, the complete PDF requirements and explicit attendance policies. No prior AGENTS.md or agreed overnight/nonworking-day policy existed. Allow nonworking-day attendance without extra absence obligations. Allow overnight/overdue checkout on the original date; block a new shift until the prior open shift closes. Count all elapsed duration and credit only the starting date. Reject backward-clock actions. Store the check-in local offset, absolute start+grace cutoff and separate lateness so timezone/settings edits do not rewrite history. Open records remain Checked in, with no completed duration.

Absence uses current working days and joining dates, only before today. Phase 2 supplied the reusable leave-exclusion hook; Phase 3 now uses it for approved leave. Deleted accounts retain actual attendance by ID but generate no new synthetic absence or leave rows. Inclusive date filters default to the current month through today; blank boundaries allow all history. Late totals overlap open/half-day counts and are labeled accordingly.

- [x] Employee own actions; reject Admin/anonymous/other-employee actions and attendance reads.
- [x] Strict stored record/ID/date/timestamp/status/duration validation and daily uniqueness; malformed data preserved.
- [x] Cutoff/exact-five-hour boundaries; duplicate/open/overnight/backward-clock and joining-date checks.
- [x] Admin all attendance and employee/date filters; Employee own date-filtered history only.
- [x] Reusable elapsed-working-day absence excluding before-joining/today/future; real dashboard summaries.
- [x] Refresh/save failure/empty startup/mobile checks; relevant Phase 1 regression tests.
- [x] Update docs with actual results, limitations, next step and suggested commit; pause.

## Phase 3 policies and acceptance

The permanent decisions in AGENTS.md govern leave: one shared annual quota; pending reservations; inclusive current working days; same-year requests on/after joining; pending/approved calendar overlap only; rejected replacements allowed. Past dates are allowed. Settings recalculate all balances (negative values are shown), while saved days retain an audit snapshot and are updated on approval. Admin must view current counts before approval and reopen stale reviews. After quota reduction, all pending reservations must fit before approval; reject excess requests or adjust settings first. Finalized decisions are immutable. Deleted requests remain filterable by ID and may be rejected, never newly approved. Approved working dates are paid/excused in Phase 4 payroll; actual attendance always takes precedence.

- [x] Employee own request, working-day preview, status/comment history and selected-year approved/pending/available balance.
- [x] Admin all requests, combined employee/status filters, comment-required approval/rejection and updated count display.
- [x] Exact quota, pending reservations, yearly isolation, date/joining/working-day/overlap validation and current-state approval checks.
- [x] Stale/repeated/unauthorized review protection; strict preserved storage and failed-write behavior.
- [x] Existing absence hook excludes approved leave; synthetic approved leave rows through today, actual attendance retained without duplicates.
- [x] Real dashboard counts, empty states, persistence, Phase 1–2 regressions and mobile form/table verification.
- [x] Update all four guidance/handoff documents; report results and pause for manual commit/push.

Verified on 2026-10-25: 43 domain tests and 34 isolated Edge browser scenarios passed. See PROGRESS.md for the exact commands, coverage and screenshot inspection limits.

## Verification approach

### Phase 4 acceptance and implementation decisions (historical milestone)

The PDF's full-month formula is unchanged. Current saved salary/settings/joining date determine history; there are no snapshots. The denominator is all configured working days in the month. Joining-month gross is daily rate × eligible working days; before-joining entitlement is zero. Current-month gross projects the full eligible month, with only elapsed absence/completed half-day deductions. Future slips are unavailable. Open eligible working-day shifts prevent final status for their starting month. Actual attendance wins over paid approved leave; late alone and nonworking attendance have no deduction/extra pay. Full precision is retained and currency displays use two decimals. Zero working days is Cannot calculate; normal valid settings cannot produce it, so the guard is tested through injected state without relaxing storage validation.

- [x] Reusable payroll service with current-session authorization, Admin existing employee / Employee own, unavailable-user/invalid-period/storage errors and no writes.
- [x] Full-month 26,000 / 26 / 2 absent / 2 half-days = 3,000 deduction and 23,000 net; zero/all absence, half-day, late-only, paid/pending/rejected/overlap and nonworking cases.
- [x] Custom weeks, leap February, year/month boundaries, joining/before-joining/current/future/zero-working-day cases and open/overnight shifts.
- [x] Selected slip with all calculation fields, explicit projection/proration/unresolved notices, safe user text and empty states; refresh and print revalidation.
- [x] Browser button/selection/access/error/mobile checks and Phase 1–3 regressions. A4 final/provisional PDF capture, text extraction and rendered-page inspection; native OS dialog and actual user Save action are untested.
- [x] Update AGENTS.md/PLAN.md/PROGRESS.md/README.md; stop for manual commit/push. No Phase 5–7 work.

Verified on 2026-10-25: 55 domain tests (43 regressions + 12 payroll), 43 isolated Edge browser scenarios (34 regressions + 9 payroll), syntax and inventory checks passed. PROGRESS.md has exact commands and verification limits.

Use Node's built-in test runner with isolated in-memory localStorage for domain/storage tests; use a temporary browser origin/context for UI verification if browser tooling is available. Do not seed application source or the user's normal browser origin. Verify page inventory and syntax, required workflows and invalid inputs, stale/deleted sessions, malformed storage, denied writes and no overwrite on repeat setup. Record exact commands/results and remaining verification limits in PROGRESS.md.

## Phase 5 policies and mandatory-feature checkpoint

- [x] Focused announcement/helper services, existing composition/loaders/static allowlist; seven pages, six keys and empty startup preserved.
- [x] Admin-only title/message posting, newest-first reading on both dashboards, strict exact record shape, safe rendering, inline required errors, preserved records/inputs after failed writes.
- [x] Admin current employee count, approved working-day coverage today for current employees on/after joining, and saved late flags including half-day/open/deleted records. Coverage is reported even with actual attendance. Nonworking days are stated.
- [x] Employee own current-year approved balance/pending reservations/available days, saved late flag or honest no-check-in, completed Monday–Sunday hours by starting date, open shifts excluded and disclosed.
- [x] Case/whitespace/punctuation variations, specific whole-question keyword patterns, supported-question fallback for unknown/mixed/other-role requests; no external API or raw record output.
- [x] Current identity/data on every service call, cross-employee denial, memory-only history cleared on account changes/errors; anonymous/deleted/stale/malformed/unavailable cases verified.
- [x] Required numeric fixtures, edge cases, browser workflow/keyboard/390px checks and relevant Phase 1–4 regressions; no app source fixtures. See PROGRESS.md for exact results and limits.

Rechecked PDF sections 1–5 and 7 at the historical Phase 5 checkpoint: setup/accounts/settings and employee administration (Phase 1), attendance (Phase 2), leave (Phase 3), dashboards/payroll/print (Phases 2–4), announcements/helper (Phase 5), readable phone UI, reusable code and README/walkthrough were implemented with automated verification. Native OS printing/actual user Save, physical phones, other browsers and screen readers remain unverified. Hosting/repository links and LMS submission remain user-controlled deliverables. The Phase 6 milestone below supersedes its earlier deferral; Phase 7 final acceptance remains separate.

## Phase 6 scope and acceptance

- [x] Inspect guidance, source PDF, seven shells, rendering/styles and existing regression tests before design edits; preserve Phase 1–5 domain modules and existing tests.
- [x] Central tokens and HCM Lite identity, SVG mark/favicon, desktop sidebar and keyboard-operable tablet/phone Menu.
- [x] Actual generated teamwork and empty-work artwork, visually inspected before integration, resized/encoded locally; explicit space, decorative semantics, missing-image fallback and static allowlist.
- [x] Branded split auth/setup; real Admin/Employee metrics and prominent shift controls; directory-first employee flow with native confirmation; distinct leave statuses and review above history; grouped settings; professional payslip with retained notices/A4 print.
- [x] GSAP not clearly allowed by the brief; native motion only, visible-by-default content, short staggers, one-time entrances, reduced-motion/API-failure guards and rerender/print cleanup.
- [x] Same-account form/filter/focus/selection/scroll preservation without stale payslip figures or stale leave approvals; clear drafts/history on identity errors.
- [x] Complete all existing domain/browser regressions and focused Phase 6 checks; inspect desktop/tablet/390px captures, empty/error/long/open/review/helper states and rendered final/provisional A4 output; record exact results in PROGRESS.md.
- [x] Update all four guidance/handoff documents; report limitations and suggested commit; pause for screenshot review/manual commit/push. Phase 7 remains separate.

Verified on 2026-10-25: **71 domain tests**, **54 existing + 10 Phase 6 browser scenarios (64 total)**, all 21 JavaScript syntax checks, inventory and diff checks. Reviewed all seven pages at 1440/834/390px and one-page final/provisional A4 renders; native printing, physical devices, assistive technology and full accessibility conformance remain unverified. Generated artwork succeeded. GSAP was not clearly authorized; native progressive motion was used. See PROGRESS.md for evidence, iterations and limits.
