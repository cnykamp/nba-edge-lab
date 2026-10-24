# v0.1 verification — 2026-10-24

- Node syntax checks passed for server and application modules.
- Six automated tests passed: odds conversion/invalid prices; required spread and valid zero line; stake/book/timezone/result validation; settlements; actual-vs-flat-stake accounting; HTTP asset allowlist and private-path rejection.
- Chrome desktop inspection: unavailable model/data/interval states, empty real journal, source-coverage status, and form controls rendered correctly.
- Chrome isolated QA session: recorded a fictional +150 moneyline with a $10 stake; Win displayed $15 net and 1.50 units. Reload preserved that session record. Fictional zero-point spread accepted at -110; Push displayed $0 net and adjusted settled return-on-stake denominator correctly.
- A nonexistent Eastern daylight-saving time (2026-03-08 02:30) was rejected without saving a record.
- Inspected at 390 × 844 viewport: stacked cards, readable journal metrics, and form layout. Wider journal table intentionally scrolls horizontally.
- Closed QA tab and verified the real journal remained empty. No actual bet was placed or recorded.

Not verified: physical-phone/LAN access, shared storage, export/import recovery, provider authentication/data rights, Michigan feed equivalence, odds freshness, model training, forecast/return intervals, automated schedules, or predictive/financial performance. Export generation is implemented but the download was not exercised during browser QA.
