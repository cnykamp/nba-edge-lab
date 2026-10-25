# v0.1 verification — 2026-10-24

- Node syntax checks passed for server and application modules.
- Six automated tests passed: odds conversion/invalid prices; required spread and valid zero line; stake/book/timezone/result validation; settlements; actual-vs-flat-stake accounting; HTTP asset allowlist and private-path rejection.
- Chrome desktop inspection: unavailable model/data/interval states, empty real journal, source-coverage status, and form controls rendered correctly.
- Chrome isolated QA session: recorded a fictional +150 moneyline with a $10 stake; Win displayed $15 net and 1.50 units. Reload preserved that session record. Fictional zero-point spread accepted at -110; Push displayed $0 net and adjusted settled return-on-stake denominator correctly.
- A nonexistent Eastern daylight-saving time (2026-03-08 02:30) was rejected without saving a record.
- Inspected at 390 × 844 viewport: stacked cards, readable journal metrics, and form layout. Wider journal table intentionally scrolls horizontally.
- Closed QA tab and verified the real journal remained empty. No actual bet was placed or recorded.

Not verified: physical-phone/LAN access, shared storage, export/import recovery, provider authentication/data rights, Michigan feed equivalence, odds freshness, model training, forecast/return intervals, automated schedules, or predictive/financial performance. Export generation is implemented but the download was not exercised during browser QA.

## v0.2 verification — 2026-10-24

- Fifteen automated tests pass; syntax checks pass across nine modules. Provider tests use synthetic responses and isolated temporary storage. They do not establish actual provider access or coverage.
- Checked missing-key CLI behavior: status reports both keys absent, no collections, no schedule, and untrained model. Collection stops before any request when keys are missing.
- Tested provider error/key redaction, disabled redirects, bounded provider hosts, upcoming-only quote normalization, opposite spread lines, invalid/future timestamps, pagination state, local budget/rate limits, private snapshots and secret-free status endpoint.
- Tested the hidden key-entry helper interactively in a separate temporary project using synthetic values: neither value appeared in output; resulting file permissions were 600; the test folder was removed. Real project credentials were not created or changed.
- Chrome desktop and 390 × 844 inspections show account-setup cards and accurate missing-key state. The real journal remains empty.
- Verified provider-published storage/model-use permissions for BALLDONTLIE and The Odds API. Identified TheRundown retention restriction and disabled its archival path. These are documented provider permissions, not authentication tests or an assessment of all third-party rights.

Still pending: user-created accounts/keys, first real bounded calls, season reconciliation, actual book/market/quota behavior, Michigan price comparison, model experiments, live or historical betting performance, schedules and physical-phone access. No model training or actual provider request was performed during v0.2 verification.

## v0.3 verification — 2026-10-25

- Actual provider calls succeeded: five historical page chains exhausted, independent regular-season coverage passed for 6,150 games, and the first three-book odds snapshot returned 100 normalized quotes with 498 credits remaining. These are bounded observations, not continuous feed or Michigan-price verification.
- Baseline 001 was registered and fitted once after its specification and structural eligibility correction were pushed. Training/development counts were 3,520/1,230; final-test performance remained unevaluated. See BASELINE_RESULTS.md for all results and fitting limits.
- Verified a second baseline invocation is refused before fitting; the original registration hash stayed unchanged.
- All 23 automated tests passed with local socket access. An initial restricted run aborted the HTTP test inside Node; rerunning with local socket permission passed. Syntax checks passed across 15 modules. Tests use isolated synthetic data and temporary storage.
- The actual local research API returned the same candidate log loss and row counts as the saved private report. The response excluded fitted weights and kept recommendations and final-test evaluation disabled. The server allowlist rejects private data/artifact paths.
- Chrome displayed the real report: 3,520 training games, 1,230 development games, 11.06-point margin MAE, candidate 0.6120 log loss and 66.4% accuracy, alongside both comparators. Latest-snapshot book labels reflected observed three-book coverage while retaining MI-unverified labels.
- Desktop and 390 × 844 screenshots inspected. Research cards stack at phone size and the comparison table scrolls horizontally. Viewport was restored. The real journal remained empty; no actual bet was placed or recorded.
- Browser logs contained extension-style “Could not establish connection. Receiving end does not exist.” messages. No app console logging or extension messaging is implemented in this app; source inspection and the visible/API report flow passed. A completely clean browser console is not claimed.

Still pending: physical-phone/network access, shared journal storage, original forward forecasts, event matching, uncertainty validation, selected-bet policy/returns, market comparisons, Michigan-price equivalence, final performance test and model promotion. No paid services or schedules were enabled.

## v0.4 verification — 2026-10-25

Story: the daily-board button → guarded local POST → bounded free-provider snapshots → frozen model inference → append-only paper ledger → sanitized GET → displayed forecasts and prices. Scores-only checking follows the same path without requesting odds or modifying a capture.

| Boundary | Evidence |
| --- | --- |
| UI/action | Chrome triggered Save today's board and Check results; running buttons disabled, then restored after completion. |
| Local API | Real GET showed the saved capture and seven pending primary forecasts. Automated HTTP tests reject foreign Origin/Host and overlapping actions. |
| Provider/input | Current-season bounded query exhausted in one page with 52 records through tomorrow. Odds snapshot returned 104 normalized quotes; the response reported 494 credits remaining after the second capture. |
| Inference | Original baseline config/source/dataset/model integrity checks passed. No fitting or final-test performance evaluation occurred. All seven forecasts used the frozen builder and coefficients. |
| Matching | Forward-001 withheld five comparisons because the exact team matches had ten-minute provider time differences. It remains unchanged. Forward-002 was registered/pushed before capture and before outcomes; all seven games then matched all three books with complete moneyline and spread pairs. |
| Persistence | Two original captures remain hash-identical; source hashes for the active implementation match. Capture history retains both policy IDs; statistics use the active cohort, seven games rather than fourteen. |
| Results | A real result check appended a results-check record with zero final updates. All games remained pending. Odds-snapshot count stayed at three (one earlier v0.3 snapshot plus two v0.4 captures). |
| Rendering | Chrome showed the actual saved 7/0 forecast/result counts, input explanations, both-side prices and pending performance. No fabricated outcome or confidence interval appeared. |

- All 35 automated tests passed; syntax checks passed across 20 modules. Tests cover causal features/score lag, same-event/book pairing, stale/ambiguous/reversed markets, bounded pagination, version cohorts, original-forecast accounting, correction chains, integrity failures, future-tipoff settlement rejection and local API controls. Synthetic tests use disposable temporary roots and do not touch the real journal.
- Desktop and 390 × 844 screenshots inspected. An observed grid-width overflow was fixed: phone document width now equals the 390-pixel viewport, first card width is 354 pixels, probabilities wrap, and the wider quote table scrolls within its card. The temporary viewport was restored.
- Original captures were re-read after the scores-only check; hashes and active implementation were unchanged. Fitted weights are excluded from the paper-board response; credentials, private data and model artifacts remain ignored by Git. Real journal remained at zero entries.
- Forward policies were pushed before their respective real captures. The matching amendment addresses observed provider metadata, not model errors or outcomes. No model settings changed.

Not yet verified: a real captured game reaching final/being corrected (synthetic paths pass), physical-phone/LAN access, Michigan price equivalence, fixed-time capture completeness, calibrated intervals, spread-cover/push probabilities, best/shortlist selection, returns, final-test performance or model promotion. Manual capture availability is not a qualified no-bet result. The current season-bounded runner needs a follow-up policy for result checks after the regular-season boundary. No paid services, actual wagers, scheduled jobs, or automatic retraining were enabled.
