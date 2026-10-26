# Candidate 002 preregistration

Registered before fitting. Three fixed variants and two chronological folds, six candidate fits and six past-only Platt fits total; no tuning repeats. Primary is context-fast regardless of development performance. Main split: 2021–22 fitting, 2023 calibration/distribution, 2024 development. Earlier stability split: 2021 fitting, 2022 calibration, 2023 development. The 2025 performance block stays sealed. All used development periods were already inspected during earlier research.

The fixed features and settings are in experiments/candidate-002.json. Exponentially weighted last-20 margins downweight earlier seasons and retain a prior; Elo regresses halfway to 1500 each offseason. Added context is rest, back-to-backs, games in the preceding four/seven calendar days, and margins adjusted by opponents' pregame Elo. No players, roster or injury-impact coefficients are claimed. Report every ablation and both raw/calibrated forecasts; do not select a winner after inspection.

Historical evaluation retains the three-day availability approximation. Forward-003 alone uses prior-date final results actually observed before cutoff. Known-at checks, source hashes, contributing rows, date/season counts and interval method are persisted with each new forecast. The old model runs as a same-cutoff comparator, with its original features and lag unchanged.

Platt calibration and empirical margin residuals use only the separate calibration season. Integer simulated final margins exclude impossible ties. The 80% interval is a marginal score-margin prediction interval, not a confidence interval on a team's win probability. Synthetic spread grids test cover/push normalization and probability scoring; they cannot establish historical betting returns.

No best-bet selection, automatic training or promotion. First future review requires 200 settled primary forecasts across 60 dates, paired probability comparisons and uncertainty/calibration checks; no favorable streak changes this rule. A selected-policy market backtest remains required before bets qualify. More features, calibration and fresher inputs may fail to improve performance.

Manual availability records are append-only source observations. Official-report links and timestamps are accepted without automated scraping. Unreviewed/stale/not-submitted/questionable cases remain visible; no invented point adjustment or inferred healthy roster. NBA.com statistics must not be scraped into this betting project; source use must match the provider's permitted terms.
