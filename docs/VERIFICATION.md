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
