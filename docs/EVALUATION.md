# Evaluation contract

This contract began in v0.1. The first registered development experiment is now fitted: see [the frozen specification](BASELINE_001.md) and [all reported baseline results](BASELINE_RESULTS.md). The final performance test remains unevaluated. Candidate-002 now implements research-only empirical margin prediction intervals and reports their development coverage; no win-probability confidence interval, qualified selection policy, historical market-price comparison, or profitable strategy has been established. See [all candidate results](CANDIDATE_002_RESULTS.md). Record trial budgets and acceptance criteria before each experiment; do not select them by looking at final test results.

## Target and evidence

Research question: can a fixed selection policy identify NBA moneyline/spread opportunities with positive net returns at obtainable, timestamped prices when risking one unit per bet? Predictive quality and returns are separate outcomes. Classification accuracy alone does not establish value. Forecast intervals do not guarantee model correctness.

Maintain separate all-game forecast, qualified recommendation, best-of-day, shortlist, and user-entered placed-bet records. Preserve no-bet days, missing-data days, and rejected opportunities. User-entered results cannot establish model performance.

## Time and grouping

- Use expanding or fixed-length past-only training windows and later contiguous development windows across multiple periods. No shuffled game split.
- Keep all snapshots/sides/markets of a game in the same evaluation group; boundaries use game start and outcome availability. Do not train on uncompleted games.
- Every feature must have known_at <= forecast cutoff. Store event time, provider timestamp, observed_at, and availability separately. Fit imputers/scalers/feature selectors/calibrators only on the relevant past training portion. A currently retrieved historical average or injury report is not a historical snapshot.
- Morning and pregame are distinct forecasting policies; no pregame inputs in a morning test. Closing prices are later benchmarks, not earlier inputs.
- Reserve a final later test block before experimentation. Use development-only chronological folds for feature, algorithm, calibration, window, and selection tuning. Open the final block once for the frozen pipeline. If it influences revisions, relabel it development and require a new unseen evaluation period.

## Restrict model searching

Start with a small predetermined feature list and regularized team-strength/margin models. Compare against home/team-strength baselines and same-cutoff market-implied probabilities with documented margin removal. Moneyline and spread calibration/labels differ; integer-spread push probability must be represented, not silently treated as a loss or zero.

Track every attempted configuration, feature change, threshold, and failed result. Declare a bounded trial budget before searching. Complexity, trial count, and correlated bets reduce the strength of a favorable result. Use an inner chronological tuning loop where needed; never reuse final holdout performance as a daily candidate-promotion score.

## Freeze the complete selection policy

Record edge calculation, uncertainty qualification, stale-price cutoff, supported books/regions, decision times, ranking/tie-break rules, selected-line probability, deduplication, number of picks, minimum evidence, and no-bet behavior before final evaluation. Highest estimated edge is especially subject to selection noise. Test the top-one and up-to-three policy using prices actually available then; do not choose the best historical price after the event. Avoid counting a single game's moneyline/spread as independent evidence.

## Metrics and uncertainty

Report log loss/Brier score and calibration curves with bucket sample sizes, alongside fixed-stake net returns, return on stake, drawdown, number of selections, and period breakdowns. Compare to same-cutoff market forecasts on the same games. Closing-price comparison is a separate diagnostic and must match line/side and use a documented reference; it is not proof of future profit.

Evaluate uncertainty with an explicitly specified, time-aware method after data audit; resampling blocks/days must retain game and same-day dependence. Account for selection/model search and show method limitations. A bootstrap over a fixed, selected model does not automatically cover selection bias or misspecification. Per-game probability intervals, predictive score-margin intervals, and aggregate return intervals are different objects. Do not relabel model disagreement as a calibrated confidence interval.

## Forward evaluation and updates

Save immutable forecast/selection snapshots before tipoff, including configuration hash, model ID, data cutoff, available odds, source freshness, qualification, and explanation inputs. Settle against final scores under explicit overtime/postponement/void rules. Keep corrections append-only.

Refresh data independently of model changes. Train candidates on a predefined schedule; let them forecast alongside the active version. Freeze comparison windows and review dates before outcomes. Apply a bounded candidate/decision budget; repeated reviews can themselves overfit. A new version must meet preregistered predictive, calibration, stability, and selection evidence criteria on new outcomes. A favorable ROI streak alone is insufficient. Preserve rollback and full histories across versions.

Until those criteria can be evaluated, label **edge unproven**, and keep recommendations unavailable. No confidence or profitability claim may be inferred from the dashboard existing.

## Reference methods

- https://scikit-learn.org/stable/modules/cross_validation.html#time-series-split
- https://scikit-learn.org/stable/common_pitfalls.html#data-leakage
- https://scikit-learn.org/stable/modules/calibration.html
