# NBA Edge Lab

Private NBA forecasting research for Michigan, USA. Version 0.1 establishes the product, source audit, evaluation contract, and a responsive local dashboard with a manual bet journal.

**No trained model, live odds integration, automated collection, forecast intervals, market comparisons, or verified betting edge exists yet.** Missing data is not a no-edge finding.

## Run

Requires Node.js 22 or newer. No installation, external services, API keys, or paid subscriptions are needed for this version.

```sh
npm test
npm run check
npm start
```

Open http://127.0.0.1:4173 on the laptop. The interface is responsive for phone-sized screens, but this version binds only to the laptop's loopback address. Phone access on Wi-Fi, shared storage, authentication, hosting, and access away from home are future work. Do not expose this local server publicly.

## What works

- Responsive daily board with explicit unavailable states for best opportunity, three shortlist slots, forecast intervals, and update schedule.
- Manual journal for moneyline/spread bets at FanDuel, DraftKings, BetMGM, and bet365. Recording a bet does not establish live feed coverage or a model recommendation.
- American odds, selected-team spread, Eastern wall-clock time, accepted stake, and user-reported win/loss/push/void settlement.
- Realized profit, settled return on stake, and hypothetical profit at exactly one unit per recorded bet. Open bets are excluded; voids are excluded from stake denominator; pushes count as action.
- Journal export; values rendered as text, with no external scripts, analytics, or data requests.

The journal is stored in **this browser's local storage**, not in GitHub or on a backend. It is not encrypted, does not sync across browsers/devices, and can be lost if browser data is cleared. Export backups. No import feature exists yet. All entries and settlements are user-reported, editable, and unsuitable as a tamper-resistant model-performance record.

## Agreed product

One best qualifying NBA moneyline or spread opportunity plus up to three others, or no qualifying opportunity. Morning and pregame snapshots; FanDuel, DraftKings, BetMGM, and bet365 where feeds support them. Estimated outcome probabilities, defensible uncertainty, feature-grounded explanations, immutable forecast history, and separate actual-bet and full-recommendation performance. Fixed stakes are an evaluation convention, not evidence of profit. Budget starts at $0. Completed versions receive tested milestone commits and pushes to this private repository.

## Build sequence

1. **v0.1 — foundation:** dashboard/journal, documented feasibility, evaluation design. This commit.
2. **Data collection:** obtain user-selected free provider keys; authenticate and test coverage, timestamps, access rights, and quotas; save raw snapshots privately with retrieval times and hashes. No account signup, paid trial, or scheduler has been created.
3. **Forecast baseline:** ingest completed games, construct past-only team-strength/rest/margin features, establish chronological splits, and train regularized baselines. No historical ROI claim without contemporaneous prices.
4. **Forward research:** record morning and pregame predictions before tipoff, verify selection logic and settlement, and compare with market baselines.
5. **Model qualification:** assess predeclared evidence requirements. Only then enable qualifying recommendations and documented intervals; support no-bet days.
6. **Phone access:** authenticated hosting with private server-side journal storage and API secrets. Add screenshot entry later.

## Project records

- [Source feasibility](docs/DATA_FEASIBILITY.md)
- [Evaluation contract](docs/EVALUATION.md)
- [Data contract](docs/DATA_CONTRACT.md)
- [Version history](CHANGELOG.md)

Credentials, raw provider responses, personal journals, trained artifacts, and screenshots are excluded from version control. The private repository contains source code, tests, and project documentation only.

## Browser QA

Open a separate tab at http://127.0.0.1:4173/#qa to use isolated session-only records. The banner must say QA SESSION. Use fictional matchups, verify adding/settling/reloading, then close that test tab. Ordinary dashboard records are unaffected.
