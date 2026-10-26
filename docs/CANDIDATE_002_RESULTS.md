# Candidate 002 development results — October 26, 2026

Research only. All three preregistered variants and both chronological folds completed. All six logistic and six Platt numerical fits met the gradient tolerance; no additional configuration or rerun was attempted. The primary remained context-fast, fixed in advance. Private fitted artifacts and full reports are excluded from Git.

Main split: 2,290 eligible 2021–22 fitting games, 1,230 separate 2023 calibration games, 1,230 later 2024 development games. Season numbers are start years. The earlier fold fits 2021, calibrates 2022 and evaluates 2023. Neither period is a new unseen final test: these development seasons were already inspected in prior research. No 2025 prediction/performance rows were constructed.

| Variant | Development season | Raw log loss | Calibrated log loss | Margin MAE | Nominal 80% interval coverage |
| --- | --- | --- | --- | --- | --- |
| recency-only | 2023–24 | 0.617382 | 0.620352 | 11.0557 | 77.89% |
| recency-only | 2024–25 | 0.609220 | 0.605113 | 10.9965 | 81.46% |
| context-fast (primary) | 2023–24 | 0.613598 | 0.617427 | 10.9894 | 77.24% |
| context-fast (primary) | 2024–25 | 0.605334 | 0.601822 | 10.9415 | 81.63% |
| context-slow | 2023–24 | 0.612747 | 0.617148 | 10.9791 | 77.56% |
| context-slow | 2024–25 | 0.606392 | 0.603310 | 10.9646 | 81.38% |

Each evaluation row has n=1,230 games. In the main 2024–25 development period, the primary calibrated candidate has Brier 0.207547 and winner accuracy 67.15%, versus original baseline-001 Brier 0.212048, log loss 0.612032, accuracy 66.42%, and margin MAE 11.0639. Mean primary interval width is 35.83 points. These modest probability improvements have not been tested against archived market prices or a selected-bet policy. No uncertainty estimate or significance claim for the improvement is made.

Calibration **worsened** log loss in all three earlier folds. Primary earlier interval coverage was 77.24%, below 80%, with mean width 32.09 points. Preserve these failures; do not choose raw or calibrated probabilities separately after seeing each period. The old baseline displayed beside the 2023–24 fold was itself fitted through 2023 and is an in-sample descriptive reference, not an independent comparator there. The 2024–25 original-baseline comparison is later development data for both models.

The empirical residual distribution provides cover/push/loss probabilities at half-point or integer lines. Diagnostics use a preregistered synthetic line grid, with observed push rates and three-outcome Brier scores in the private report/dashboard. Those are not historical sportsbook lines and cannot establish returns, closing-line value, or best-bet selection. An 80% margin prediction interval is not a confidence interval for the win probability; its coverage is marginal and varies by period.

Forward-003 is a separate prospective paper cohort with a fixed primary candidate and original baseline shadow. Fresh prior-date finals use their actual observed-before-cutoff evidence. The historical three-day availability approximation remains unchanged. All original baseline-001 and forward-001/002 artifacts and captures remain intact. First review eligibility is 200 settled primary forecasts over at least 60 forecast dates, without automatic promotion. No model-impact coefficients are fitted for manually reviewed injuries.
