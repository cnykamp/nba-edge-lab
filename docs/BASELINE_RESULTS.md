# Baseline 001 development results — 2026-10-25

Observed run: 2026-10-25T04:18:43.543Z. This is one preregistered configuration, not a qualified betting system.

## Data and split

- Five seasons (2021–22 through 2025–26), 6,150 eligible regular-season games. Every season reconciled to 1,230 games, 30 teams, and 82 games per team; all page chains exhausted. No conflicting observed score revisions or duplicate team-date games were found.
- Main training: 2021–22, 2022–23, 2023–24; 3,520 rows after initial team-history warmup.
- Main development evaluation: 2024–25, 1,230 games.
- Reserved final performance test: 2025–26. Structural coverage was inspected, but no performance metrics were computed or shown.
- Three-day lag approximates historical score availability. Retrospective scores cannot verify their original publication or correction timing.

## Main development performance

| Model | Log loss ↓ | Brier ↓ | Winner accuracy |
| --- | ---: | ---: | ---: |
| Logistic candidate | 0.612032 | 0.212048 | 66.42% |
| Fixed Elo comparator | 0.616956 | 0.214408 | 65.45% |
| Training home-win frequency | 0.689568 | 0.248211 | 54.39% |

The margin model has mean absolute error 11.0639 points and RMSE 14.1338, versus 12.6051 and 15.8867 for the training-mean-margin comparator. This does not establish spread-cover probability or betting value.

## All fixed walk-forward comparisons

The same feature and algorithm settings are used in each fold, without tuning between folds. Earlier validation seasons become training data in later folds; these folds are not three independent final tests.

| Training season start years | Later validation season | Candidate log loss | Elo log loss | Candidate accuracy | Elo accuracy |
| --- | --- | ---: | ---: | ---: | ---: |
| 2021 | 2022 | 0.652594 | 0.648591 | 62.36% | 62.52% |
| 2021, 2022 | 2023 | 0.617716 | 0.614884 | 64.88% | 64.47% |
| 2021, 2022, 2023 | 2024 | 0.612032 | 0.616956 | 66.42% | 65.45% |

Candidate probability quality lost to fixed Elo in the two earlier validation seasons and improved on it in the main development season. The main-season difference is modest, and no significance or superiority claim has been established. All inspected periods are development evidence; no production promotion follows from this report.

## Main development calibration

Probabilities refer to home-team wins. Buckets were fixed before fitting. Small buckets have substantial sampling noise; these are descriptive calibration summaries, not confidence intervals.

| Forecast range | Games | Mean forecast | Observed home wins |
| --- | ---: | ---: | ---: |
| 0%–20% | 21 | 16.43% | 4.76% |
| 20%–40% | 236 | 31.94% | 28.81% |
| 40%–60% | 454 | 50.60% | 48.90% |
| 60%–80% | 430 | 68.96% | 70.23% |
| 80%–100% | 89 | 83.97% | 85.39% |

## Reproducibility and limits

- Frozen specification was pushed in commits `324aeeb` and `3648034` before fitting. Config SHA-256: `eb88a2a53cd68e3fe7e7024a825fcf49f506955e39205c782b9ccc4296c7517a`.
- Dataset SHA-256: `cfa4ead8622026eaec516f3420a834514af2f94e7b01a2548cc017a53f673f5a`. Source-file and private snapshot hashes are preserved with the local registration.
- Logistic fitting reached its fixed 3000-iteration cap; final recorded maximum gradient magnitude was 0.00006616, above the declared 1e-8 tolerance. Finite fitted parameters passed the experiment's research acceptance rule. Do not describe this run as converged to that tolerance, or extend training after viewing results without registering a new experiment.
- No historical sportsbook prices, market-implied baseline, selected-bet returns, uncertainty intervals, injury/lineup inputs, automatic retraining, or qualified picks were evaluated.
- One forward odds snapshot contained 100 normalized quotes across FanDuel, DraftKings and BetMGM. The response reported two credits consumed and 498 remaining. Michigan-equivalent pricing remains unverified.
- Private data and fitted weights remain local and ignored by Git. This committed report contains aggregate research results only.

## Next evidence

Freeze an explicit forward forecasting and market-matching policy, then save original forecasts/available quotes before tipoff with append-only results. Validate intervals and selected-pick behavior before qualification. Keep the final performance test reserved until the complete pipeline is fixed.
