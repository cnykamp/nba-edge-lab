# Planned research records

Not implemented in v0.1. Store private records outside Git; never use personal betting journals as training labels.

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
