# Baseline 001: experiment specification

This specification and `experiments/baseline-001.json` are written before any real-data fitting or performance evaluation. Data ingestion/schema/coverage inspection is allowed before registration; outcomes must not guide feature or model changes. Private `registration.json` locks the exact config, dataset and snapshot hashes before the first fit. Configuration budget: **one**. A failed or weak development result stays in the record.

## Scope

NBA regular-season team forecasts, with a home-win probability model and home-minus-away score-margin model. This is predictive development research. It does not estimate a validated betting edge, issue picks, compute returns, or provide confidence intervals. Final-score retrieval is not an archived point-in-time data feed.

## Dataset and splits

- Training: season start years 2021, 2022, 2023.
- Main development: 2024. Fixed expanding-window checks also fit 2021 → evaluate 2022 and fit 2021–2022 → evaluate 2023, using the identical configuration. No fold selects hyperparameters.
- Reserved final test: 2025. The runner must not evaluate or display its performance.
- Exclude postseason, postponed, NBA Cup championship and nonstandard-team records using source metadata. Require exhausted pagination, exactly 1,230 eligible final games/season, exactly 30 teams and 82 games/team before fitting. Resolve structural discrepancies from source evidence before changing the eligible set. Do not exclude records because a model gets them wrong.
- Deduplicate provider game IDs, stop on conflicting final records, and hash the snapshot files plus assembled dataset. Audit coverage independently of pagination.

## Features available before each forecast

Four coefficients: intercept, neutral Elo difference divided by 400, difference in trailing 20-game average score margin divided by 10, and capped rest-day difference divided by 7. Features are computed before the day's outcomes are released. All games for a provider date are handled as a batch.

For score-derived features, a final result enters the state only three calendar days after the provider's game date. Rest uses only earlier game dates, not their outcomes. This is a conservative **retrospective availability assumption**, not verified historical publication/correction timing; postponed records are excluded. It cannot justify a point-in-time profitability claim. Current source corrections can still affect a retrospective study.

Require ten eligible prior results per team; report dropped warmup games. Elo starts at 1500, uses K=20 and a 60-point home adjustment for its expected-result update. Carry 75% of rating deviation into a new season. Recent score margins carry across seasons. This deliberately simple baseline does not account for roster changes, player injuries, or lineups.

## Models and comparators

- Home-win model: L2-regularized logistic regression, mean log-loss objective plus 0.01/2 times the squared non-intercept weights; full-batch gradient descent with learning rate 0.1, maximum 3,000 steps and maximum-gradient stopping tolerance 1e-8. No hyperparameter search or recalibration.
- Margin model: ridge regression with mean squared error and 0.01 penalty on non-intercept weights; solve its four-dimensional linear system with pivoting.
- Comparators: training home-win frequency, fixed Elo probability with 60-point home advantage, and training mean home margin.
- Report development log loss, Brier score, accuracy, fixed calibration buckets with sample counts, margin MAE and RMSE. No final-test metrics. A trained model may lose to a comparator; report that directly.

One small dependency-free implementation keeps this first baseline inspectable. Tests must establish that changing a game's outcome does not change that game's or earlier features, that same-day games do not share outcomes, and that fitting/metrics agree with simple analytically checkable cases.

## Qualification and follow-up

Fitting success means finite parameters and a reproducible development report. It is **not** model promotion. All best-bet/shortlist qualification stays locked. Historical market comparisons, spread-cover probabilities including push handling, uncertainty intervals, independently evaluated final-test performance and a forward recommendation record remain separate milestones. The reserved test must not become a recurring tuning score.

Method references: https://scikit-learn.org/stable/modules/cross_validation.html#time-series-split and https://scikit-learn.org/stable/modules/linear_model.html#logistic-regression. The project uses its own transparent implementation, not scikit-learn.

## Pre-fit structural audit correction

The first completed 2022-season page chain contained 1,236 non-postseason records, including six play-in games. No model had been fitted or evaluated. Eligibility now also uses NBA-published regular-season date boundaries and Cup championship dates, recorded with source URLs in the config. This changes dataset membership based on official competition definitions, not model errors. The 2021 season independently matched 1,230 games and 82/team. All five seasons must still pass after this correction.
