# Permanent project guidance

## Source and delivery constraints

Read PLAN.md, PROGRESS.md, README.md and the original `C:\Users\ALPHA\Downloads\Saylani_Hackathon_HCM_Lite_Beginner_Track (1).pdf` before changing behavior. The PDF is the product source; user instructions govern milestone scope and authorization. Preserve useful existing work. No AGENTS.md existed when this file was created for Phase 2; no conflicting prior instructions were found.

- Plain HTML5, CSS, vanilla JavaScript and localStorage only. No framework, application backend, external database, external AI API or seeded app data. Optional local static preview/testing tools are development tools only.
- Exactly seven existing page paths: index.html; pages/admin.html, employees.html, leaves.html, settings.html, employee.html, payslip.html. Preserve the six existing `hcm_*` keys.
- Mandatory functionality and verification before significant visual decoration. Keep unfinished features honest. Never claim unverified functionality is complete.
- Keep reusable business logic separate from page handlers; enforce role scope in domain functions and UI, use stable IDs/local calendar dates, render user text safely, and show clear storage errors. Never erase or silently migrate malformed/unfamiliar storage. Preserve saved data on failed writes.
- Browser authentication is a learning demonstration, not production protection. Resolve sessions against current users; store only user ID in session.
- Reserve Phase 6 for dedicated premium UI/UX: consistent design tokens, responsive layouts, accessible interactions, reduced-motion support and suitable generated illustrations when image generation is available. No illustrations or optional bonus features in Phase 2. Phase 7 follows as final acceptance; completed phases 1–5 keep their numbers.
- The user handles commits and pushes. Never commit, push, deploy, or submit automatically. After each authorized milestone, verify, update PLAN.md/PROGRESS.md/README.md, report results/limits and a suggested commit message, then pause.

## Mandatory PDF checklist (sections 1–5, 7)

- Empty company/Admin setup; Admin company name, start time, grace, yearly quota and working days. Admin/Employee own login/logout/password change.
- Admin employee add (creates usable login), edit/delete, name/email search and department filter. Required inputs, valid unique email and positive salary errors next to fields.
- Employee own check-in/out only; one record per local day, checkout after check-in. Admin all attendance; Employee own only. Late strictly after start+grace. Duration = out−in; under five hours half-day; working-day no record absent. Follow the documented Phase 2 policies below.
- Employee own leave request/status/balance; Admin approve/reject with comment. From <= To, count working days, prevent overlap, enforce yearly quota; approved leave updates balance. Employee leave UI on their dashboard; leaves.html is Admin-only.
- Admin company/personal Employee dashboards with real data. Monthly payslip Admin all/Employee own, print/Save as PDF. Per-day salary = salary/working days in month; deduction = per-day × (absent + 0.5 × half days); net = salary−deduction.
- Admin posts announcements; Employees read. Keyword chat on both dashboards, no external AI API: Admin employee count, approved leave today, late today; Employee own balance, late today, hours this week. Enforce all/own scope.
- Responsive phone UI, organized reusable code and README/walkthrough. Eventual repo/hosted links and LMS submission are user-controlled, not permission for agent publishing.
- Camera/location/face detection, charts, dark mode, CSV/report exports and LLM access are optional PDF bonuses, excluded from the current work.

## Attendance policies agreed for Phase 2

- Use device local calendar/time for new actions, canonical UTC timestamps for elapsed duration and a saved check-in UTC offset for validating the original local date. Browser/device clock and timezone are trusted only for this learning demo.
- Allow check-ins on nonworking days after joining; show the fact in the UI. These create real attendance records but no extra absence requirements or overtime/payroll entitlement.
- Allow overnight/overdue checkout of the existing open record, retaining its original check-in date. Block new check-in until it is closed; never auto-checkout or truncate hours. A long shift credits only its starting date; later elapsed working days without their own record can be absent. No maximum shift duration is invented. Reject a clock earlier than check-in and future-dated saved activity relative to the current action.
- One employee/date record, including closed records; at most one open shift per employee. Open status is Checked in, with null duration; completed status is Half day (<5h), otherwise Late or Present. Store `isLate` separately and freeze the absolute start+grace cutoff at check-in so later settings edits do not reclassify it.
- Derive absence only on elapsed configured working days, on/after joining, with no attendance. Exclude today and future days. Use current working-day/joining settings for historical absence; edits may change derived history. Keep absence synthetic, not stored. Deleted employees' actual records remain identifiable by ID; no new absence is derived for deleted accounts.
- Phase 2 absence is NOT leave-aware. Keep a reusable exclusion hook ready for Phase 3; do not call the current calculation payroll-ready or claim approved leaves are already excluded.
- Default history filters cover the current local month through today; clearing dates shows all saved history/eligible elapsed absence. Filters include both endpoints; invalid/reversed ranges show inline errors. Summaries label late counts as overlapping open/half-day counts.
