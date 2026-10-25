# Research records

v0.4 implements private provider snapshots, the audited baseline dataset/experiment, original manual forward forecast records and append-only final-score research checks. Qualified selections, uncertainty intervals, financial settlement, actual-bet linkage and fixed-time policies remain future work. Store private records outside Git; never use personal betting journals as training labels.

| Record | Required fields / invariants |
| --- | --- |
| Game | Canonical/provider IDs, teams, scheduled start, status, final scores, final-known-at, corrections. Postponed/unknown is not final. |
| Observation | Provider, endpoint/query without secret, event ID, source timestamp, observed_at UTC, payload hash, provenance, coverage geography, retrieval outcome. Never backdate observed_at. |
| Quote | Observation ID, book, region status, side, market, spread line, American/decimal price, source update time, active/closed/live status. Compare matching contracts; a different spread is a different outcome probability. |
| Feature snapshot | Game, forecast cutoff, each feature's source and known_at, construction version. Every input must be available by cutoff. |
| Forecast | Immutable ID, game, morning/pregame, created_at, cutoff, model/config hash, probability and push probability if applicable, line-specific target, interval method/version, reason inputs. |
| Selection | Forecast + quote IDs, ranked-at, policy version, qualification/rejection reasons, best/shortlist rank, benchmark prices, no-bet/missing-data distinction. |
| Settlement | Selection ID, final score/source, applicable book rules, result, one-unit return, correction chain. Never modify the original forecast. |
| Experiment | ID, data/version hashes, train/development/final bounds, configuration and trial budget, metrics including failures, inspected-at and promotion decision. |

All research times use timezone-aware UTC; display in America/New_York. Geography must be explicit: US unspecified is not Michigan verified. Prices entered by the user are actual accepted-price reports, not verified provider observations. Version 0.1 journal is browser-local, mutable and user-reported; it has no model linkage or market comparison.

## Implemented forward ledger

`data/paper/ledger/NNNNNNNN.json` stores a sequence number, prior-record hash, entry and content hash. Writes are exclusive; reads reject missing/changed records. The operation lock serializes CLI/UI work. Owner modification of the entire chain is still possible; no external immutability is claimed.

Capture entries include policy/config/model/implementation hashes, historical/current snapshot hashes, actual creation and input-cutoff times, original feature vectors/contributions, probabilities, expected margin, book-side quote IDs/prices, withheld reasons and unsupported/unmatched events. Qualified selection is always disabled. No probability interval or spread-cover/push model exists.

Result entries reference the original capture, final score observation, source snapshots and previous result hash. Identity, scheduled start and final state are checked; timing conflicts require review. Corrections append a successor without changing the forecast. First-forecast and paired-model/market statistics are computed separately within each policy cohort. A score check is a research outcome observation, not a bookmaker settlement.
