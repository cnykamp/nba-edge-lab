# NBA Edge Lab

Private NBA forecasting research for Michigan, USA. Version 0.3 adds a fixed, chronological forecasting experiment and a research report view to the local dashboard.

**No validated betting edge, automated schedule, forecast interval, selected-bet return estimate or historical market-price comparison is available.** Free providers have authenticated successfully and five-season game coverage passed and a first real-data baseline is fitted. Baseline fitting requires a complete coverage audit; the dashboard reads the real private experiment report and keeps recommendations disabled. Missing data is not a no-edge finding.

## Run

Requires Node.js 22 or newer. No installation or paid subscriptions are needed. Viewing the dashboard and using the journal require no API keys. Real data collection requires free provider accounts and locally saved keys; follow [the setup walkthrough](docs/SETUP.md).

```sh
npm test
npm run check
npm start
```

Open http://127.0.0.1:4173 on the laptop. The interface is responsive for phone-sized screens, but this version binds only to the laptop's loopback address. Phone access on Wi-Fi, shared storage, authentication, hosting, and access away from home are future work. Do not expose this local server publicly.

## What works

- Hidden owner-only local key setup, safe readiness reporting, and bounded BALLDONTLIE / The Odds API collectors. No TheRundown archival collector is enabled.
- One game page or one three-book NBA odds snapshot per explicit command, plus a bounded/resumable historical backfill. Normalized records, provenance, private snapshot files and local rate/credit guards. No scheduled jobs.
- Structural game coverage checks and a one-configuration logistic/score-margin experiment with fixed expanding-window comparisons. Research-only metrics appear after a verified report exists.

- Responsive daily board with explicit unavailable states for best opportunity, three shortlist slots, forecast intervals, and update schedule.
- Manual journal for moneyline/spread bets at FanDuel, DraftKings, BetMGM, and bet365. Recording a bet does not establish live feed coverage or a model recommendation.
- American odds, selected-team spread, Eastern wall-clock time, accepted stake, and user-reported win/loss/push/void settlement.
- Realized profit, settled return on stake, and hypothetical profit at exactly one unit per recorded bet. Open bets are excluded; voids are excluded from stake denominator; pushes count as action.
- Journal export; values rendered as text, with no external scripts, analytics, or data requests.

The journal is stored in **this browser's local storage**, not in GitHub or on a backend. It is not encrypted, does not sync across browsers/devices, and can be lost if browser data is cleared. Export backups. No import feature exists yet. All entries and settlements are user-reported, editable, and unsuitable as a tamper-resistant model-performance record.

## Agreed product

One best qualifying NBA moneyline or spread opportunity plus up to three others, or no qualifying opportunity. Morning and pregame snapshots; FanDuel, DraftKings and BetMGM first; bet365 deferred by user choice. Estimated outcome probabilities, defensible uncertainty, feature-grounded explanations, immutable forecast history, and separate actual-bet and full-recommendation performance. Fixed stakes are an evaluation convention, not evidence of profit. Budget starts at $0. Completed versions receive tested milestone commits and pushes to this private repository.

## Build sequence

1. **v0.1 — foundation:** dashboard/journal, documented feasibility, evaluation design. Completed.
2. **v0.2 — data setup:** key helper, collectors, private snapshots, quota guards and source-rights update implemented. Free accounts/keys are now configured; both providers authenticated and initial responses were collected. Michigan price equivalence remains unverified. No signup, paid trial, or scheduler has been created.
3. **v0.3 — forecast baseline:** independently audit 2021–2025 regular-season history, fit the predeclared regularized baselines, and evaluate development periods. The 2025 final performance test stays unevaluated. Historical score availability uses an explicit conservative approximation; no historical ROI claim is made.
4. **Forward research:** record morning and pregame predictions before tipoff, verify selection logic and settlement, and compare with market baselines.
5. **Model qualification:** assess predeclared evidence requirements. Only then enable qualifying recommendations and documented intervals; support no-bet days.
6. **Phone access:** authenticated hosting with private server-side journal storage and API secrets. Add screenshot entry later.

## Project records

- [First baseline results](docs/BASELINE_RESULTS.md)
- [Baseline experiment specification](docs/BASELINE_001.md)
- [Free account/key walkthrough](docs/SETUP.md)
- [User decisions](docs/DECISIONS.md)
- [Source feasibility](docs/DATA_FEASIBILITY.md)
- [Evaluation contract](docs/EVALUATION.md)
- [Data contract](docs/DATA_CONTRACT.md)
- [Version history](CHANGELOG.md)

Credentials, raw provider responses, personal journals, trained artifacts, and screenshots are excluded from version control. The private repository contains source code, tests, and project documentation only.

## Browser QA

Open a separate tab at http://127.0.0.1:4173/#qa to use isolated session-only records. The banner must say QA SESSION. Use fictional matchups, verify adding/settling/reloading, then close that test tab. Ordinary dashboard records are unaffected.

## Historical research commands

```sh
npm run data:backfill
npm run research:audit
npm run research:baseline
```

Backfill resumes private page chains at one request per 13 seconds with a 100-new-request run bound. Audit verifies all five seasons, not just pagination. `research:baseline` registers a single real-data experiment and refuses to rerun an existing registration. It never opens final-test performance. Do not delete the registration to tune against results; create a separately justified, versioned experiment when needed. Model/source/dataset hashes and failed runs must be preserved.
