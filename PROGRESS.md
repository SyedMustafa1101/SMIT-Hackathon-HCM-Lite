# Progress and handoff

## Current handoff: Phase 7 local acceptance complete; manual delivery pending

Completed local audit on **2026-10-25 (Asia/Karachi)** under the user's attached “Implement Phase 7 — Final Acceptance and Submission Readiness” request. That request supersedes the Phase 6 pause for this acceptance milestone, skips further visual refinement and preserves the current design. Read AGENTS.md, full PLAN/PROGRESS/README, all four physical pages of the original PDF via pypdf, implementation and existing test coverage before changes. Original PDF remains unchanged in Downloads. No staging, commit, push, fetch, reset, branch/checkout change, hosting configuration, deployment or LMS submission was performed.

**Local mandatory implementation checks pass. Entire hackathon delivery is not complete.** The user must review, synchronize Git, commit/push, finish native print/device checks, verify public hosting/link and submit to LMS. See ACCEPTANCE.md for every mandatory requirement's evidence/status, separated from implementation policies; README.md contains the exact manual sequence and demo.

### Functional audit finding and changes

- Found a real count inconsistency in `js/leaves.js`: `overview().approvedToday` included an existing approval even after Admin moved the employee's joining date after today. Helper coverage, derived attendance and payroll already excluded pre-joining dates. Added `u.joiningDate <= today` to the overview's current-Employee predicate; no data/schema/policy/design change.
- Added a meaningful regression to `tests/leaves.test.cjs`. It first failed with **1 instead of 0** after the joining edit, then passed after the fix. It covers Admin and own Employee overview, helper agreement, actual-attendance coexistence, nonworking dates, deleted employee exclusion and byte-for-byte preservation of the saved approval. The reproduced failure is not counted as passing evidence.
- Final preservation review found `js/storage.js` accepted unknown fields on company, user and nested password records; later company/password replacement could discard them. Added exact field-set validation for those existing schemas. Unfamiliar records now block reads/edits with the existing preservation error; valid records/keys stay unchanged, and no migration is attempted. New `tests/domain.test.cjs` regression first failed with a missing expected exception, then passed across company/Admin/Employee/password variants, blocking settings/password/repeated setup and preserving every raw collection. B7 adds fatal-error/raw-preservation UI checks. Full domain and browser regression were rerun after this shared validation fix.
- Added `tests/inventory.test.cjs`: exact seven-page and relative/case-sensitive runtime inventory, shared script ordering, CSS asset paths, and no external API/package/preview/test/QA runtime dependency. This closes a delivery-verification gap rather than adding product functionality.
- Added `tests/phase7-browser.cjs`: single complete UI-created journey on an independent file-only host (does not import `tools/serve.cjs`), repository prefix `/SMIT-Hackathon-HCM-Lite/`, direct routes/role redirects, all runtime files/four assets, no unexpected requests, account keyboard access at all three widths, origin separation and unfamiliar-field storage preservation. Only regression-specific joining-date edits use direct domain calls; company, accounts, attendance, leave, decision and announcement are created via real forms/actions. Malformed-state checks inject data only into the disposable context.
- Added ACCEPTANCE.md and updated PLAN.md/README.md/this file. Intended changes are exactly these **ten files**: two production modules, existing domain/leave tests, two new test files and four audit/handoff documents. Production changes are the joining-date predicate and strict unknown-field preservation validation; Phase 6 styling/assets/pages remain unchanged. Existing regression assertions remain intact.

### Final verification results

All records were in isolated in-memory adapters or disposable Edge browser contexts/temporary origins. No real profile/company was opened or seeded; only browser-test time was controlled, never the device clock.

| Command / check | Final outcome |
| --- | --- |
| `node --test tests/domain.test.cjs tests/attendance.test.cjs tests/leaves.test.cjs tests/payroll.test.cjs tests/phase5.test.cjs tests/inventory.test.cjs` | **75 passed, 0 failed/skipped**: 73 domain (71 originals + two bug regressions) and 2 inventory tests. |
| `node tests/browser.cjs` | **14 passed**: empty setup, all routes, both roles/passwords/logout, CRUD/search/filter, settings, malformed/denied/full storage and empty delivery. |
| `node tests/attendance-browser.cjs` | **10 passed**: actual actions, cutoff/half-day boundaries, all/own scope, filters/absence, nonworking/overnight/joining, failed saves and phone layout. |
| `node tests/leaves-browser.cjs` | **10 passed**, including a rerun after the domain fix: request/review/approval/rejection/comment/balance, current settings/quota/stale review, source/draft preservation and phone scope. |
| `node tests/payroll-browser.cjs` | **9 passed**: exact **3,000 deduction / 23,000 net**, identity/period/scope, no writes, safe text, print stub/media/beforeprint, projection/proration/unresolved notices and phone layout. |
| `node tests/phase5-browser.cjs` | **11 passed**: announcements/all six helper groups, safe text, fresh role/storage, known values, failed saves, own-only queries, keyboard/phone and history clearing. |
| `node tests/phase6-browser.cjs` | **10 passed**: regenerated all seven pages/setup/login at **1440/834/390px**, menu keyboard/focus/active links, no overflow, same-account drafts/filter/focus, missing art/API fallback, reduced motion initial/live, selected slip recalculation and A4 output. |
| `node tests/phase7-browser.cjs` | **7 passed**: complete journey, known values below, joining-date UI regression, prefix-host direct routes/runtime/roles, keyboard password/logout/Enter-to-password-form on protected page types at 1440/834/390px, independent host, clean-context/second-origin empty startup and unknown company/account/password fields blocking UI with all raw values preserved. |
| JavaScript syntax | `node --check` on all **23** files in js/tests/tools passed (PowerShell loop in README). |
| Inventory and diff | Exactly seven HTML pages, nine shared scripts, four required assets/six keys retained; relative exact-case inventory tests pass; `git diff --check` passes. Git's LF-to-CRLF notices are informational. |

Total: **71 passing browser scenarios** (64 existing + 7 new). The matrix names concrete assertions/source and limitations; totals alone are not requirement evidence. The final expanded Phase 7 run includes keyboard account and unfamiliar-field assertions; earlier narrower runs are not added to the count. All seven browser suites were rerun sequentially after the shared storage fix. No known failing local check remains.

Verified environment: bundled Node on PATH, installed headless Microsoft Edge, existing development-only Playwright at `C:\Users\ALPHA\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright`, with `HCM_PLAYWRIGHT_MODULE` set accordingly. No runtime dependency install/build is required. README lists all seven browser commands, combined domain/inventory command and syntax/diff loop.

### Complete journey and independently expected values

On a case-sensitive repository-prefix static host, a fresh disposable Asia/Karachi context starts with zero keys. UI setup creates Acceptance Studio, 09:00 start + 15 grace, Monday-Friday, quota 5; UI Admin creates one employee, salary 22,000, joining 2026-10-19. Logout/refresh and Employee form login work. Controlled check-in at 2026-10-19 09:15:00.001 (+1ms beyond cutoff), checkout at 14:15:00.001: **Late**, exactly **18,000,000ms / 5 completed hours**, not Half day; duplicate check-in disabled. UI leave request for October 20 counts **1 working day**, Pending 1/available 4 after reload.

Admin UI opens review, sees current/saved count 1, approves with a comment and posts an announcement. Browser time advances to October 20: approved-today count is 1; moving joining to October 21 changes dashboard/helper to 0 without changing the saved approval, then the edit is restored. Employee sees Approved/comment, approved balance **4**, pending **0**, available **4**, announcement and helper answers. All six question groups are exercised: Admin current count 1/late first day 1/approved next day 1; Employee saved late first day/unknown next day, balance 4 and weekly completed hours 5. Markup-like reason/comment/title stay literal text.

Both roles see the same own/selected current-month slip: **22 configured / 10 eligible days**, salary 22,000, gross/net **10,000**, approved paid leave 1, absence/half/deduction 0. Full-month projection/proration are explicit; lateness alone adds no deduction. Reading/calculating leaves all non-session raw storage unchanged. Logout/reload/relogin preserves data. Direct Admin/Employee paths redirect correctly, and a different origin plus a fresh context each show empty setup. Returning to the original origin retains the company. No app external network requests or page errors were observed.

### Responsive and print review

B6 regenerated screenshots under ignored `qa/phase6/after/` (same stable paths used by that suite). Created fresh `qa/phase7/overview-{1440,834,390}.jpg` contact sheets and readable top/end phone crops of both dashboards; inspected these and the two latest Poppler page renders. Layout keeps forms/actions usable, account buttons reachable, table scrolling contained and artwork loaded/fallback usable. No blocking overflow or visual redesign was needed. Sampled contrast remains **14.83, 5.45, 5.17, 11.21, 6.09, 6.66, 6.55, 5.00** for text/button/status samples; input boundary **3.35:1**. This is not a full WCAG audit.

Latest `final.pdf` and `provisional.pdf` from B6 each have **one A4 page, 594.95996 x 841.91998 points** (pypdf). Poppler renders are `qa/phase7/print-final.png` and `print-provisional.png`; inspected identity, selected 2026-09 period, 66,000 salary / 22 working / 11 eligible days, 3,000 daily rate, **33,000 gross/net**, zero deductions, formula and joining proration. Provisional retains the unresolved **2026-09-17** notice. No missing identity, clipped values or workspace controls. B4 also re-rendered its exact 23,000-net and provisional fixtures in system temp; its Final PDF was separately extracted (one page, **3,000 deduction / 23,000 net**) and visually inspected as `qa/phase7/print-exact-example.png`, including literal safe markup and full-month formula.

These are headless PDF/media checks and print invocation stubs. **Native OS print dialog, actual user Save destination/download/printer and physical devices/assistive technology were not exercised.** README has the short manual checklist. A4 QA PDFs are synthetic test evidence, not generated payslips for a real company. A local QA script's initial quoting/name-shadowing errors were corrected before the successful extraction/contact-sheet review; they did not affect app code or acceptance results.

### Hosting and tracked-content readiness

- Independent static host serves only index/pages/css/js/four assets, with exact-case path membership even on Windows. B7 directly loads all seven page paths and checks role redirects under **`/SMIT-Hackathon-HCM-Lite/`**. It checks every runtime file, confirms wrong-case/test/QA requests are unavailable on that test host, and proves no dependency on the preview implementation or bundled tooling. GitHub Pages may serve tracked docs/tests; the local allowlist is not represented as a public-host security control.
- All four required assets are tracked: `logo.svg`, `favicon.svg`, `team-work.webp`, `empty-work.webp`; inventory confirms their exact references. `qa/` is ignored (`git check-ignore` confirmed the PDF); no QA/test file is a runtime reference. Tests and their synthetic `example.test` credentials are tracked verification code, not delivered seeded accounts. No JSON/CSV/XLSX/PDF/env/private-key data dump is tracked.
- Reviewed tracked runtime/test inventory and scanned tracked text for common API/private-key patterns (AWS access ID, GitHub/OpenAI token shapes, PEM private-key headers): no matches. Existing fixture credentials are explicitly synthetic and isolated. This scoped working-tree scan is **not** a complete Git-history or security certification.
- No live hosted URL verified. Web access to the candidate/repository page was unavailable via the browsing tool; this does not establish that hosting is disabled or the site is down. Hosting configuration was neither inspected nor changed. README labels hosted link pending and instructs the user to copy the actual successful Pages URL, then verify its HTTPS/direct routes/assets/workflows in a clean browser before recording/submitting it.
- Localhost and HTTPS storage are separate origins and hosted first run starts empty. Same-origin paths share localStorage; one editing tab remains the policy. No deployed data transfer/backend is implied.

### Git synchronization evidence (read-only snapshot)

- Starting `git status --short`: **clean**. Branch **main**; latest local commit **`6924739fb507b362b8bbde3c1fd025d6f00bc2bd`**, subject **Phase 6 completed**. Local cached `origin/main` pointed there too; cached tracking alone did not prove synchronization.
- `origin` fetch/push URL: **`https://github.com/SyedMustafa1101/SMIT-Hackathon-HCM-Lite.git`**. First sandboxed remote read failed network access; authorized read-only retry of `git ls-remote --heads origin main` succeeded: **`c581171e9c1854880286c1ad91886b252b544a16 refs/heads/main`**.
- Read-only GitHub REST comparison of local HEAD to that remote SHA: **ahead 3, behind 0, no net changed files**. Commits: `f06da3148d0d95e465c0b1802e83a33e893289af` Create CNAME; `d1f638ec84ec620b84d88a48aa49a607d2290084` Update CNAME; `c581171e9c1854880286c1ad91886b252b544a16` Delete CNAME. Committed file contents match at those two revisions; **branch histories are not synchronized**. No CNAME remains. This does not verify Pages settings/live deployment.
- Remote objects were not fetched into the local repository, refs/HEAD were not updated and the checkout stayed on main. Changes produced by this milestone are unstaged: modified `js/leaves.js`, `js/storage.js`, `tests/domain.test.cjs`, `tests/leaves.test.cjs`, `PLAN.md`, `PROGRESS.md`, `README.md`; new `tests/inventory.test.cjs`, `tests/phase7-browser.cjs`, `ACCEPTANCE.md`. All Phase 6 assets were already committed/tracked. Remote state may change after this snapshot.

### Exact remaining user actions and stop

1. Review the ten-file diff, ACCEPTANCE matrix and local ignored screenshots/PDFs. README has the manual/native checklist and 3-5 minute live demo; no further cosmetic iteration is required by this milestone.
2. Run the README Git sequence yourself: `git fetch origin`, inspect fetched log/content diff, then `git merge --ff-only origin/main` if it matches this safe fast-forward snapshot. Stop on unexpected changes/conflicts; no forced reset/push. Stage the ten named files, inspect staged diff/check, commit and push main; confirm local HEAD equals fresh `ls-remote` main. The three remote commits must be incorporated before a normal push.
3. Perform native A4 Print/Save and actual saved-file inspection, then actual phone/tablet and any additional browser/assistive-technology checks. Record any defects before submission.
4. Inspect repository Settings -> Pages. If needed, manually choose branch main / root and save; wait for successful deployment. Copy the real HTTPS URL, verify logged-out/public access, assets, all direct protected URLs, both complete workflows and persistence from clean hosted storage. Add only that verified hosted URL to README and push the doc update manually.
5. Submit the verified repository URL + hosted URL to **https://lms.saylaniit.com/** using the user's account; follow current assignment/demo instructions and confirm receipt. This remains pending, not an achieved delivery claim.

Suggested commit message: **`fix: complete HCM Lite final acceptance and submission handoff`**.

**Stop for user review/manual actions.** No known failing local mandatory functionality remains; native-device/print and public delivery claims stay unverified/pending as stated. The historical records below preserve prior phase evidence and are superseded by this handoff.

---

## Phase 6 — historical completion record (superseded by Phase 7 above)

Completed on 2026-10-25 under the user's attached “Implement Phase 6 — Premium UI/UX and Visual Identity” request. Read AGENTS.md, PLAN.md, this file, README.md, all four physical pages of the original PDF (pypdf text extraction), all seven page shells, shared styling/rendering, services and existing tests before implementation. The PDF does not clearly allow GSAP: it specifies plain HTML/CSS/JavaScript and optionally Chart.js. Used native motion, without a new runtime dependency. Phases 1–5 retain their numbering and working behavior; Phase 7 final acceptance remains separate. No commit, push, deployment, submission, app backend, new page/key, app seed data or optional bonus was added.

### Design system and seven-page changes

- `css/style.css`: centralized navy/blue/green and semantic color tokens, readable system sans-serif typography, spacing, radii, shadows, layering and motion. White surfaces on a subtle light canvas, clear section hierarchy, shared controls/notices, visible focus, text-and-color status badges, numeric salary alignment and contained two-axis histories with sticky column headings. Input borders were strengthened to 3.35:1 against white; placeholder/core text colors pass the sampled contrast checks below.
- Shared identity: HCM Lite / **People. Work. In sync.** Code-native H mark with a green connecting bridge, matching favicon, local icon strokes and readable text wordmark. Desktop fixed navy sidebar, active role-scoped links and account actions. Tablet/phone Menu uses a native button, correct controls/expanded attributes, hidden collapsed links, keyboard activation, Tab, Escape focus return and responsive desktop restoration. Password/logout remain reachable outside the collapsed navigation. Ordinary product footers no longer show development-phase labels; the learning-data limitation stays in appropriate auth help/docs.
- `index.html`: editorial split login/setup with actual generated teamwork artwork, focused login form and grouped company/attendance/leave rules plus Admin fields. Explicit image dimensions prevent layout shift; mobile stacks cleanly with a compact illustration. Missing artwork reserves space and leaves the form/text usable.
- Admin dashboard: four current-data overview cards (employees, check-ins, late check-ins, pending leave), workspace quick actions, clear leave overview, attendance hierarchy, contained long history, refined announcement form/feed and helper suggestions/conversation surfaces. No fake metric/chart/loading UI.
- Employees: directory first, combined search/department toolbar, readable identity/salary rows, direct Add-to-form action, preserved add/edit validation and native delete confirmation. Edit and cancellation focus the proper field; deletion reports/focuses its outcome. The existing employee/login services are unchanged.
- Leave requests: distinct Pending/Approved/Rejected badges, concise filters and readable details; active review is above the history with a blue boundary, current/saved day count and explicit decision/comment errors. Cancel returns focus to the invoking request. Stale data closes the review and requires explicit reopening while retaining its comment draft in memory.
- Settings: numbered Company identity, Attendance schedule and Leave allowance groups; working-day choices clearly indicate selection, with preserved inline errors and saved/failed feedback. Current-settings/historical recalculation warnings remain honest.
- Employee dashboard: own current-data overview cards; prominent current-shift state and check-in/out above the detailed summary; organized profile, attendance, leave request/preview/balance/history, announcements and helper. Leave-request/refresh changes update the overview values from services.
- Payslip: clear employee/period selectors, a professional document surface, tabular calculation values and distinct net salary; current projection, joining proration and unresolved shifts retain explicit notices. Existing selected-identity, read-only recalculation, A4 print/Save-as-PDF and beforeprint validation remain intact.

### Assets and motion actually delivered

Image generation **succeeded twice**, using the built-in imagegen tool. Inspected both originals before integration and optimized the actual outputs locally with Pillow. No stock portraits, baked UI text/statistics or stand-in illustrations were used.

| Local file | Source / role | Final dimensions and bytes |
| --- | --- | --- |
| `assets/logo.svg` | Code-native logo mark; shared brand text supplies the wordmark | 40×40 viewBox; 261 bytes |
| `assets/favicon.svg` | Matching code-native favicon, linked on all seven pages | 40×40 viewBox; 261 bytes |
| `assets/team-work.webp` | Generated editorial teamwork scene, auth/setup | 800×800; 49,772 bytes |
| `assets/empty-work.webp` | Generated document-tray spot illustration, empty states | 240×240; 1,700 bytes |

The auth image is decorative with `alt=""`, width/height and asynchronous decoding; CSS empty-state art has reserved space plus readable empty-state text. Assets are local and relative; preview allowlists only the four files and sends SVG/WebP MIME types. No external image/font/animation request is made by the app. Local subdirectory hosting was exercised in an isolated test server.

`js/ui.js` reads timing/easing tokens from CSS. IntersectionObserver/native Web Animations provide visible-by-default, one-time section entrances, 35ms metric staggers capped at 105ms, a finite 700ms artwork settle and 160ms notice feedback. CSS supplies hover/pressed/navigation feedback. No hidden initial content, whole-view replay after rerender, per-row reveal, animated payroll amount, continuous art loop, smooth-scroll replacement or scroll hijacking. Missing observer/animation APIs skip enhancement. Reduced-motion preference disables initial movement and cancels ongoing motion when changed. Completed animation references are released; observers, animation handles, media/header listeners and print handlers are cleaned up on the relevant rerender/lifecycle boundary. Print forcibly removes transforms/opacity effects.

### State preservation and implementation boundaries

`js/pages.js` keeps same-account drafts, employee edit identity, filters, text selection, focus, open details and page/table scroll across storage rerenders. A deleted employee's draft is retained with Save disabled until Cancel; it cannot accidentally become a new account. A changed leave review retains a memory-only comment draft but closes its stale token; explicit reopening obtains current counts. Selected payslips recalculate after refresh instead of showing restored old totals. Account changes and fatal storage errors discard privileged content/drafts. Helper history still clears on account/storage rerender. Failed-save behavior remains verified by the original suites.

Changed production files: `css/style.css`, `js/ui.js`, `js/pages.js`, the seven existing HTML shells and development-only `tools/serve.cjs`; added the four local assets. Added `tests/phase6-browser.cjs` and a `.gitignore` rule for local `qa/` output. Updated AGENTS/PLAN/README/PROGRESS. Existing storage/business modules (`storage`, `hcm`, `attendance`, `leaves`, `payroll`, `announcements`, `helper`) and all original test assertions were preserved.

### Exact final verification

All records belonged to in-memory adapters or disposable Edge contexts/temporary origins. The normal user profile and delivered app data were never seeded.

1. `node --test tests/domain.test.cjs tests/attendance.test.cjs tests/leaves.test.cjs tests/payroll.test.cjs tests/phase5.test.cjs`: **71 passed, 0 failed**. All existing domain/storage/role/calculation cases retained.
2. `node tests/browser.cjs`: **14 scenarios passed**. Setup, roles/logins/passwords, employee CRUD/search/filter, settings, session/storage failures, phone layout and empty delivery.
3. `node tests/attendance-browser.cjs`: **10 scenarios passed**. Attendance actions, timing/status/scope, filters, nonworking/overnight/joining policies, failed saves and phone layouts.
4. `node tests/leaves-browser.cjs`: **10 scenarios passed**. Request → review → decision/balance, failed saves, comments, reservations, stale settings, approved attendance integration, scope, malformed data and phone review.
5. `node tests/payroll-browser.cjs`: **9 scenarios passed**. Exact 26,000 / 26-day example = 3,000 deduction / 23,000 net; period/identity/print guards, no writes, current-data beforeprint, long safe text, notices and phone fit.
6. `node tests/phase5-browser.cjs`: **11 scenarios passed**. Announcements/helper workflows, all six answer groups, failed inputs/saves, safe/long text, keyboard, account/history resets, scope and 390px controls.
7. `node tests/phase6-browser.cjs`: **10 scenarios passed**. All seven pages plus setup/login captured at **1440, 834 and 390px** with no page overflow; active navigation and Menu Enter/Tab/Escape/focus. Covers invalid focus, open shift, long names/reasons, review/error/draft reopening, edit-mode/text-selection/focus/scroll/filter retention, deleted edit protection, selected payslip recalculation, saved/failed settings, empty startup/company/lists, reduced motion (initial/live), missing animation APIs/artwork, asset requests and subdirectory navigation. **64 browser scenarios total**, including 54 original regressions. No page JavaScript errors or unexpected broken asset responses in the passing runs.
8. Sampled core body/muted/button/nav/status/placeholder contrast ratios: **14.83, 5.45, 5.17, 11.21, 6.09, 6.66, 6.55, 5.00** (all ≥4.5:1); input boundary **3.35:1**. This is token sampling plus screenshot/focus inspection, not a full WCAG conformance audit.
9. `node --check` passed for all **21** app/tool/test JavaScript files. Seven-page/module inventory is asserted by the domain suite; six-key/empty-start/schema checks pass unchanged. `git diff --check` passed. Relative artwork/logo/favicon/styles/scripts/navigation were served under an isolated `/hcm-lite/` prefix as well as the root preview.

Commands use bundled Node or `node` on PATH and the existing development-only Playwright package:

```powershell
$env:HCM_PLAYWRIGHT_MODULE='C:\Users\ALPHA\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
node --test tests/domain.test.cjs tests/attendance.test.cjs tests/leaves.test.cjs tests/payroll.test.cjs tests/phase5.test.cjs
node tests/browser.cjs
node tests/attendance-browser.cjs
node tests/leaves-browser.cjs
node tests/payroll-browser.cjs
node tests/phase5-browser.cjs
node tests/phase6-browser.cjs
```

### Visual and print inspection, iterations and limits

Before editing, reran the Phase 5 browser suite (**11 passed**) and retained representative Admin desktop / Employee phone before captures in `qa/phase6/before/`. Inspected those plus the after captures/contact sheets for every page at desktop, tablet and 390px; separately inspected full settings/directory/leave views, phone dashboard section strips, helper/announcement content, empty artwork, errors, saved/failed feedback, open attendance, active leave review and provisional payslip. Captures are local ignored review evidence, not app assets; they use isolated fixtures rather than live company records. `qa/phase6/after/overview-{1440,834,390}.jpg` provides a review overview, with full-resolution per-page PNGs alongside.

Rendered both `qa/phase6/after/final.pdf` and `provisional.pdf` through Poppler and inspected the resulting page PNGs; pypdf confirms **one A4 page each**. The fixture has 66,000 salary, 22 configured / 11 eligible joining-month days, 33,000 gross/net and zero deductions. Final retains proration; provisional additionally retains the unresolved 2026-09-17 shift notice. Identity, selected month, full breakdown/net/formula and all notices are readable, without clipping, hidden/transformed content or unrelated controls. Original payroll-suite A4 captures and print-media/guard assertions also pass. Browser Print invocation is tested with a stub; these are headless renders, not native OS dialog or actual user Save verification.

Iterations were completed rather than treating the first pass as acceptance: kept attendance dates on one line, raised Employee current-shift controls, strengthened input/placeholder contrast, fixed the badge/text whitespace caught by the unchanged leave regression, guarded unavailable animation APIs/live observer callbacks, centralized motion timings and released finished animation handles. An early new QA fixture tried to create two open shifts for one employee and was correctly rejected; the fixture was corrected without changing validation. The live reduced-motion check now waits for the browser's media-change delivery before asserting zero active animations. None of those incomplete runs was counted as passing.

No known remaining mandatory Phase 6 visual requirement or functional regression in the exercised scope. Limits: installed Edge/headless desktop and emulated viewports only; no physical phone/tablet, other browser, screen reader, comprehensive accessibility audit, native OS print/actual Save, large-data performance certification or Phase 7 acceptance claim. Existing browser-only identity/device clock/storage, current-settings history and single-editing-tab limitations remain. Very old joining dates can still produce long derived reports; the UI contains their scrolling but introduces no pagination or domain change. No publishing/repository/LMS deliverables were performed.

**Stop for the user's Phase 6 screenshot review and manual commit/push. Phase 7 final acceptance remains separately authorized work.**

Suggested commit message: `feat: add premium HCM Lite identity and responsive workspace UX`

---

## Phase 5 — historical completion record (superseded by Phase 6 above)

Completed on 2026-10-25 under the attached request for Announcements and Keyword Smart Helper only. Read AGENTS.md, PLAN.md, PROGRESS.md, README.md, all four physical pages of the original PDF (text extraction; additionally inspected the rendered helper/scoring page), and existing modules/tests. Preserved the pre-existing uncommitted Phase 4 work. No commit, push, deploy, submission, framework, app backend, extra page/key, app seed data, external API, illustration, premium redesign or bonus was added. Phases 1–5 retain their numbering; Phase 6 premium UI/UX and Phase 7 final acceptance await separate authorization.

### Phase 5 changed files and behavior

- Added `js/announcements.js`: authenticated `list()` and Admin-only `post({ title, body })`. Stable IDs, required trimmed title/message, current author ID and canonical UTC creation time; newest-first timestamp order with deterministic ID tie-break. Current author name/ID fallback; no editing/deletion/targeting/read receipts.
- Added `js/helper.js`: fresh current-session/data resolution, role-specific suggestions and `query()` returning only intent/answer strings. Explicit whole-question keyword patterns normalize case, whitespace and ordinary punctuation; unsupported/mixed/named/other-role queries fall back to supported questions. Employee target manipulation is rejected. No LLM, external API, stored chat or raw-object/credential output.
- Updated `js/storage.js`: exact five announcement fields (`id`, `title`, `body`, `authorId`, `createdAt`), nonblank content, canonical timestamp and unique IDs. Existing empty arrays remain compatible. Unknown/missing/malformed records block use and remain untouched; no silent reset/migration.
- Updated `js/hcm.js`: composes announcement/helper services using existing clock/role/ID boundaries and attendance/leave services. Existing account/settings/payroll behavior preserved.
- Updated `js/pages.js`: both dashboard announcement feeds, Admin title/textarea form, inline errors, safe text/author/timestamp rendering, refresh/empty state and retained inputs after failed saves. Both helper forms have labels, suggestions, submit/Enter support, live readable response history, clear blank errors and memory-only answers. New replies scroll the log to the latest answer. Account changes clear history via storage/focus/visibility/submit; invalid-session/storage query errors clear old responses. A null-account comparison preserves unsaved setup/login fields on ordinary focus.
- Updated `css/style.css`: existing readable textarea/error styles, wrapping announcement bodies/suggestions and a contained keyboard-focusable response log. No visual redesign.
- Updated `index.html` and all six `pages/*.html`: load new modules before domain composition, Phase 5 footer. Exactly seven paths preserved. Updated `tools/serve.cjs` static allowlist with both scripts; no application API.
- Added `tests/phase5.test.cjs` and `tests/phase5-browser.cjs`. Updated module loaders in `tests/domain.test.cjs`, `tests/attendance.test.cjs`, `tests/leaves.test.cjs`, `tests/payroll.test.cjs`; shared page inventory includes the new scripts. Existing Phase 1–4 test expectations otherwise preserved.
- Updated `AGENTS.md`, `PLAN.md`, `README.md`, `PROGRESS.md` with policies, walkthrough, checkpoint, results/limits and the review boundary.

### Helper answer policies and independently known fixtures

- Admin employee count uses current Employee accounts (fixture: three, then two after deletion; browser two/empty zero). Approved-today lists current employed users on/after joining whose approval covers this configured working date, excludes pending/rejected/deleted accounts, and states nonworking days. It reports approval coverage even with actual attendance. Fixture: one eligible approval among pending/rejected/deleted/pre-joining cases.
- Admin late-today uses actual saved `isLate`, including a late half-day, late open shift and retained deleted record (fixture: three late records, with a separate on-time record excluded). Later settings do not reclassify lateness. Deleted IDs are explicitly labeled.
- Employee balance reuses leave service: current-year quota minus approved working days, with pending reservations and available days separately. Domain fixture: quota 10, approved 3, pending 2 gives approved balance 7/available 5; reducing quota to 1 gives -2/-4 honestly. Browser fixture: approved 1/pending 2 gives 9/7. Other users and prior-year requests excluded; current working settings remain authoritative.
- Employee lateness uses own actual saved flag/status; absent check-in reports unknown. Tests cover on-time, late half-day and late open records. No company-wide or named-other-employee query is answered.
- Weekly hours reuse scoped attendance reports for device-local Monday–Sunday. Sum completed stored durations by original starting date, including actual nonworking/overnight shifts; do not accrue unfinished time. An open shift is disclosed even if its start is outside this week. Domain fixture: 3 + 8 + 12 = 23 completed hours; previous Sunday and another account's 99 hours excluded. Monday/Sunday/week/year transitions, Sunday inclusion, overnight/long shift attribution and future-relative saved activity are covered. Browser own fixture: 8 + 2 = 10 completed hours; second Employee open shift = 0 completed hours with notice.

### Phase 5 exact verification results

All fixtures were in isolated in-memory adapters or disposable Edge contexts at temporary local origins. No normal browser profile or delivered source data was seeded.

1. `node --test tests/domain.test.cjs tests/attendance.test.cjs tests/leaves.test.cjs tests/payroll.test.cjs tests/phase5.test.cjs`: **71 passed, 0 failed** (55 Phase 1–4 regressions + 16 Phase 5 tests). New tests cover all required questions/known values, variants/punctuation/case/blank/unknown/ambiguous/other-role/named queries, zero records, retained deleted IDs, saved flags, week/overnight/year boundaries, approved/pending/negative balances, session freshness/direct calls, no writes/raw objects, announcement posting/order/fields/author/schema/persistence, malformed/unavailable storage and failed saves.
2. `node tests/browser.cjs`: **14 scenarios passed**. Foundation setup/login/password/CRUD/search/filter/settings/role/session/storage/mobile/empty-start checks preserved.
3. `node tests/attendance-browser.cjs`: **10 scenarios passed**. Attendance actions/status/cutoff/duration/scope/date filters/nonworking/overnight/joining/save-failure/phone regressions preserved.
4. `node tests/leaves-browser.cjs`: **10 scenarios passed**. Employee request → Admin approval → Employee status/balance, comments/rejection/reservations/settings/stale review/attendance integration/storage/phone regressions preserved.
5. `node tests/payroll-browser.cjs`: **9 scenarios passed**. Exact payslip example, all/own/period guards, print invocation/media, current-data beforeprint, notices/error/no-write/phone checks preserved. Native OS dialog and user Save remain untested.
6. `node tests/phase5-browser.cjs`: **11 scenarios passed**, no page JavaScript errors. Actual Admin post → Employee reading, required errors and keyboard focus, safe markup/author/timestamp/order/reload, failed save retaining text/records, all six answers, suggestions/Enter/Tab/blank/fallback, own/company denial/direct targets/no writes, half-day/open/no-checkin, 390px controls/history/long text, nonworking day, role/same-role account changes and memory-only reset, malformed/unsupported/unavailable storage, zero/anonymous/deleted/empty startup.
7. `node --check` passed for all **20** app/tool/test JavaScript files; seven-page/module inventory and `git diff --check` passed. Static preview serves both new scripts during browser checks.
8. Visually inspected desktop and 390px phone automated captures, including the announcement form/feed, helper suggestions/input/history and safe markup text. No clipped controls or page overflow found. This was screenshot inspection after automation, not a separate hand-operated walkthrough, screen-reader test or physical-phone test. QA captures are system-temp `hcm-phase5-*.png`, outside app assets.

Exact invocation uses the bundled Node executable (or `node` on PATH) and existing development-only Playwright package:

```powershell
$env:HCM_PLAYWRIGHT_MODULE='C:\Users\ALPHA\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
node --test tests/domain.test.cjs tests/attendance.test.cjs tests/leaves.test.cjs tests/payroll.test.cjs tests/phase5.test.cjs
node tests/browser.cjs
node tests/attendance-browser.cjs
node tests/leaves-browser.cjs
node tests/payroll-browser.cjs
node tests/phase5-browser.cjs
```

During development, one Phase 5 browser run stopped at Edge `ERR_NETWORK_IO_SUSPENDED` navigation while other suites ran. A subsequent run exposed a test fixture using plain Event instead of StorageEvent with a relevant key; the fixture was corrected to simulate the actual browser event. The final standalone run passed. No app failure was concealed by treating those incomplete runs as passes.

### Mandatory-feature checkpoint, limits and next step

Recompared every mandatory item in PDF sections 1–5 and 7: empty setup, both accounts/passwords/logout/settings, employee login/CRUD/search/filter/field errors, scoped attendance/time rules, leave request/review/comment/quota/overlap/balance, company/personal dashboards, payroll formula/scoped slips/print, all six keyword questions, announcements, readable phone layout/reusable code/README walkthrough are implemented and covered by automated checks. No known remaining mandatory functional gap within the authorized local implementation. Hosting/repo links and LMS submission remain user-controlled and unperformed. Phase 6 design and Phase 7 final acceptance remain outstanding separate milestones.

Limits: browser-only identity/device time/localStorage remain a learning demonstration, origin-specific and non-atomic across concurrent tabs; use one editing tab. Helper patterns only support the documented variants, one question per query. UI history has no persistence; existing responses are past answers, new queries read fresh data. Current settings intentionally recalculate leave/payroll/history. Tested installed Edge and emulated 390px phones; other browsers, physical phones, assistive technology and native print/actual Save were not exercised. No bonus or premium design work was started.

**Pause for Phase 5 review and manual commit/push. Next only with separate authorization: Phase 6 premium UI/UX, then Phase 7 final acceptance.**

Suggested commit message: `feat: add announcements and role-scoped keyword helper`

---

## Phase 4 — historical completion record (superseded by Phase 5 above)

Completed on 2026-10-25 under the attached request to implement Payroll and Payslips only. Read AGENTS.md, PLAN.md, this file, README.md, existing modules/tests and all four physical pages of the original hackathon PDF (text extraction and rendered-page inspection) before implementation. The PDF full-month formula and the user's explicit edge policies govern this milestone. Existing attendance/leave/accounts work was preserved. No commit, push, deploy, submission, framework, backend, extra page/key, seeded app data, announcements/helper, illustration, premium redesign or optional bonus was added.

### Phase 4 changed files

- Added `js/payroll.js`: focused read-only service exposing role-scoped employee choices and monthly slips. Every call resolves the current account; Admin selects existing employees, Employee is own-only, including manipulated IDs/direct calls. Reuses leave working-date/coverage and attendance absence logic. Derives totals without writes or historical snapshots. Validates periods, current clock, future activity and finite totals; exposes explicit status and notices through returned fields.
- Updated `js/hcm.js`: composes payroll alongside existing attendance/leave services; existing account/settings boundaries stay intact.
- Updated `js/pages.js`: replaces the payslip placeholder with month/year and Admin employee selection, own Employee identity, full company/employee/period/calculation breakdown, inline errors/empty states, projection/proration/open-shift notices, safe text rendering, refresh and browser print instructions. Selection changes invalidate old figures. Button and native beforeprint revalidate current data/account and suppress stale figures on failure. Dashboard/settings text now truthfully describes available payroll.
- Updated `css/style.css`: minimal responsive payslip table and A4 print rules. Print hides navigation, controls, password panel and unrelated content; preserves identity, formulas and notices; avoids split rows and repeats table headers. Render review corrected the print root background and column widths.
- Updated `index.html` and all six existing `pages/*.html`: payroll module loads before domain composition; footer says Phase 4. Exactly seven existing HTML paths remain.
- Updated `tools/serve.cjs`: development-only static allowlist includes payroll script, with no application API/backend.
- Added `tests/payroll.test.cjs` and `tests/payroll-browser.cjs`. Updated loaders/inventory in `tests/domain.test.cjs`, `tests/attendance.test.cjs`, `tests/leaves.test.cjs`; replaced the superseded payslip-placeholder assertion in `tests/browser.cjs` with the real breakdown assertion. Other regression behavior was preserved.
- Updated `AGENTS.md`, `PLAN.md`, `README.md`, `PROGRESS.md`: permanent policies, completed checklist, walkthrough, calculation/print limits and current handoff.

### Phase 4 calculation decisions

These supplement the PDF for its unspecified cases, following the attached request. They do not alter its completed full-month formula.

- Current saved salary, working days, joining date and approved-leave rules apply even to old periods. No historical salary/settings snapshots or stored payroll totals. Final indicates a past month with resolved eligible attendance under current data; it does not lock payroll.
- Daily rate uses all configured working days in the month. Fully eligible gross is monthly salary. Joining-month gross is daily rate × eligible working days on/after joining; subtract eligible absence/half-day deductions. Before-joining/no-eligible months have zero entitlement. Proration and formulas are labeled.
- Current-month slips are provisional full-month projections, not earned-to-date amounts. Gross covers the whole eligible month; deductions include elapsed absence and completed working-day half-days (including completed today), never today/future absence. Future-month slips are unavailable.
- Approved working-day leave is paid/excused. Pending/rejected leave does not excuse absence. Actual attendance wins, including half-day/open/late overlap. Paid-leave counts cover the whole selected eligible period, including future approved dates in a current-month projection, excluding actual attendance dates.
- Late alone has no deduction. Nonworking-day attendance yields no deduction or extra pay. Overnight/overdue shifts credit only their starting date. Open eligible working-day shifts make their starting month's slip provisional with unresolved dates and no invented duration/half-day deduction; later working days may remain absent.
- Zero working days produces Cannot calculate/null amounts, never division by zero. Existing validated company settings require at least one weekday, so this branch is tested with injected state without weakening storage validation; malformed settings still block/preserve data.
- Full precision is retained throughout; currency displays use two decimals, without assuming a currency. Rates are not rounded before multiplying. When every eligible day is deducted, deduction equals gross exactly, preventing floating-point negative residue/overflow (regression-tested with 0.1 and maximum finite salary). Finite/nonnegative totals are required. Viewing/printing writes no source records or aggregate totals.

### Phase 4 exact verification results

All fixtures were isolated in-memory or disposable browser contexts at temporary local origins. No normal browser profile or delivered app data was seeded.

1. `node --test tests/domain.test.cjs tests/attendance.test.cjs tests/leaves.test.cjs tests/payroll.test.cjs`: **55 passed, 0 failed** (14 foundation + 13 attendance + 16 leave + 12 payroll). Payroll coverage: the exact 26,000/26/2 absent/2 half-days example gives daily rate 1,000, deduction 3,000, net 23,000; zero/all absence, halves, late-only, paid/pending/rejected leave, attendance overlap, nonworking attendance/open shifts, overnight/multi-day attribution, custom Sundays/Tuesdays, leap February, year boundaries/max year, joining/before-joining/current/future periods, zero-day guard, fractional rates, current-settings recalculation, all/own/manipulated IDs, anonymous/stale/deleted accounts, refresh, invalid periods/clock/future attendance, malformed/unavailable storage, denied writes and no source mutation.
2. `node tests/browser.cjs`: **14 scenarios passed**, including existing setup/login/passwords/CRUD/search/filter/settings/session guards/storage failures/mobile/empty-start checks. Its superseded payslip placeholder check now verifies the real breakdown.
3. `node tests/attendance-browser.cjs`: **10 scenarios passed**, preserving own actions, grace/duration/status, date/employee filters, authorization, overnight/nonworking/joining rules, failed saves and 390px layout.
4. `node tests/leaves-browser.cjs`: **10 scenarios passed**, preserving request/review/comment/balance/reservation, filters, stale settings, failed saves, approval/actual-attendance integration, role scope, malformed storage and phone layouts.
5. `node tests/payroll-browser.cjs`: **9 scenarios passed**, no page JavaScript errors. Admin employee selection/empty error and exact displayed PDF example; second-employee access; invalid/future periods and stale-selection invalidation; fixed Employee identity/manipulated-ID rejection/refresh; print invocation and hidden print controls with no writes; 390px bounds and safe markup; joining/before-joining/open-shift notices; beforeprint current-data recalculation and removal of stale figures on preserved malformed data; unavailable storage, anonymous/no-employees/untouched startup; stale/deleted session and reload redirect.
6. `node --check` passed for all **16** app/tool/test JavaScript files. Domain inventory confirms seven HTML paths with all module loads; static preview served payroll during browser checks. `git diff --check` passed (Git emits existing LF-to-CRLF informational warnings on this Windows checkout).
7. Headless Edge `page.pdf({ preferCSSPageSize: true })` produced isolated final and provisional/prorated test PDFs. Poppler rendered both; pypdf confirmed **one A4 page each** (594.96 × 841.92 points), required breakdown content, 23,000 net in the final example and preserved provisional/unresolved/proration notices. Rendered pages were visually inspected after the final CSS adjustment: no clipped values, overlapping content, awkward row breaks or hidden notices. Also inspected desktop 1280px and phone 390px captures; controls, long safe user text and breakdown fit. These were automated captures followed by visual inspection, not a separate hand-operated walkthrough.

Exact browser invocation (existing development-only Playwright package, installed Edge):

```powershell
$env:HCM_PLAYWRIGHT_MODULE='C:\Users\ALPHA\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\node_modules\playwright'
node tests/browser.cjs
node tests/attendance-browser.cjs
node tests/leaves-browser.cjs
node tests/payroll-browser.cjs
```

Temporary QA files are in the system temp directory: `hcm-phase4-desktop.png`, `hcm-phase4-phone.png`, `hcm-phase4-final.pdf`, `hcm-phase4-provisional.pdf` and their rendered PNGs. They contain isolated test records and are not app assets or payroll downloads for the user's company.

### Phase 4 limits and next step

- No known failing Phase 4 acceptance checks. Native OS print dialog/printer behavior and the user's actual Save as PDF action were **not** exercised. The button was tested with a print stub; print media and PDF output were tested separately through headless Edge. Invoking the print dialog is not claimed as a generated download.
- Browser-only authorization/device time remain a learning demonstration. Storage remains browser/origin-specific, writable by its owner, and non-atomic across simultaneous writers. Use one editing tab. Viewing/printing does not change data, but relevant settings/account edits intentionally recalculate historical slips.
- Only installed Edge and emulated 390px phones were exercised, not all browsers, physical phones or screen readers. No locked payroll history, automatic download, payroll exports, taxes, bonuses, overtime or other unrequested features were added.
- Phase 5 announcements/keyword helper, Phase 6 premium UI/UX and Phase 7 final acceptance remain deferred. Hosting/repository/LMS delivery remains user-controlled.

**Pause for Phase 4 review and manual commit/push. Next only after separate authorization: Phase 5 announcements and keyword helper. Do not start it automatically.**

Suggested commit message: `feat: implement role-scoped monthly payroll and printable payslips`

---

## Phase 3 — historical completion record (superseded by Phase 4 above)

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

The Phase 2 stop was subsequently superseded by the user's Phase 3 authorization. The current Phase 5 handoff above now governs continuation.

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
- At Phase 1, Employee saw their profile and later-workflow placeholders. Attendance, leave and payroll are now complete as recorded above. Announcements and helper remain Phase 5.
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
- Attendance, leave and payroll policy edges are recorded in AGENTS.md, including open shifts, paid leave, joining-month proration and provisional projections. Phase 4 resolved and verified these policies.

## Remaining mandatory work

The unchecked items in PLAN.md are the source checklist. Attendance, leave, payroll and their real summaries are complete. Remaining: Admin announcements/Employee reading; both keyword-helper chats with role-scoped real answers; Phase 6 premium UI and Phase 7 final integration acceptance. Hosting/repository links and LMS submission remain the user's eventual responsibility, outside this session.

## Historical next step after Phase 1 (superseded)

The user subsequently authorized Phases 2–4; the current Phase 4 handoff above now governs continuation.

Suggested commit message: `feat: implement phase 1 HCM setup, auth, employees and settings`

The original Phase 1 handoff pointed to attendance. Phases 2–4 are now complete; remaining work starts at Phase 5 only after authorization.
