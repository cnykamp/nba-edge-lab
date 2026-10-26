# Model and data upgrade decision brief — October 26, 2026

Original brief status at preparation: proposed research roadmap; no model/policy change was made by that brief. Update after subsequent user authorization: the seven free improvements are now implemented as candidate-002 and separate forward-003 paper research; see [preregistration](CANDIDATE_002.md), [complete development results](CANDIDATE_002_RESULTS.md), and [manual data limits](MANUAL_DATA.md). No subscription or paid request was authorized. Existing baseline-001 and forward records remain preserved. The user reports no bets recorded for the October 25 slate; do not infer actual betting activity or personal returns from that statement.

## Current evidence and observed limitations

The baseline uses home advantage, Elo difference, trailing-20 score-margin difference and capped rest difference. Its fitted relationships use season start years 2021–2023; later eligible results update its team-strength state without refitting the coefficients. The 2025–26 final performance test remains unevaluated. Seven settled forward games and a 1–3 chat value watchlist cannot establish a persistent edge or identify why individual games were lost.

A read-only reconstruction from the original October 25 input snapshots found that Sacramento, Memphis and the Clippers each had **19 prior-season games and one current-season game** in their 20-game score-margin window. Oklahoma City had 18 prior-season games and two current-season games. Latest eligible dates were October 21 or 22 because of the frozen three-calendar-day score lag. Sacramento's mean margin was -7.8 and Memphis's -16.4, producing the +8.6-point relative margin feature; it was not evidence that Sacramento itself had a positive recent margin.

This is a concrete freshness/season-transition limitation to test, not proof it caused the outcomes. October 25 is now inspected development evidence for any newly designed pipeline; it cannot serve as an unseen test of that pipeline.

## Prioritized free work

1. Audit team mapping, season transitions, duplicate handling and feature provenance, with a clear display of which games contribute to each forecast. Preserve the original snapshots.
2. Register a candidate using final results actually observed before forecast cutoff in forward operation. Keep the historical three-day assumption unless original availability is established; never retroactively backdate data. Compare declared recency/offseason treatments on chronological development folds.
3. Add explicit back-to-back/congestion features, opponent-adjusted strength and bounded recency alternatives from the existing game schedule. Test incremental benefit instead of assuming every added feature helps.
4. Keep the independent baseline and a same-cutoff market benchmark. With sufficient paired historical prices, register a market-aware candidate that learns modest residual adjustments. More accurate favorite predictions alone do not establish value.
5. Check probability calibration on later chronological data, including underdog ranges. Fit any calibrator only on prior data; fit a verified numerical solution in a separately registered experiment rather than silently extending baseline-001's iteration cap.
6. Develop a score-margin distribution for spread-cover and integer-push probabilities, separately from the current expected-margin point estimate. Validate uncertainty coverage and the complete top-one/up-to-three policy before qualification.

These are proposed changes. They must not silently modify the hash-locked forward-002 implementation. Register the next configuration, trial budget, splits and acceptance criteria before fitting; preserve the original comparison and reserve new forward outcomes for evaluation.

## Inputs paid data could add

- Player game statistics: possessions-adjusted team offense/defense, shooting/rebounding/turnover/free-throw features, rolling minutes and player-contribution estimates from past games.
- Availability: current injury reports, expected lost minutes, replacement-player scenarios and roster continuity. Injury count alone is not an impact model; questionable players require scenarios, not arbitrary point deductions.
- Historical odds: same-cutoff market baselines and complete selection-policy backtests at archived prices, plus later closing-price diagnostics. Historical scores alone cannot establish betting returns.
- A time-stamped forward injury archive is still needed. Access to today's injury endpoint does not establish historical injury-report availability.

## Verified monthly prices and practical scope

Provider pages were checked October 26, 2026. Prices are USD per month before any applicable tax; actual subscribed access remains free.

| Proposed total budget | Components | Research capability |
| --- | --- | --- |
| $0 | Existing free feeds | Current game/price capture, timing/recency work, calibration research, manual official injury checks; no purchased historical odds. |
| $9.99 | BALLDONTLIE NBA ALL-STAR + free Odds API | Player game stats, active-player and injury endpoints; implement richer inputs and archive availability prospectively. |
| $30 | Odds API 20K + free BALLDONTLIE | 20,000 credits/month and historical odds; prioritize a bounded same-cutoff market/selection backtest. |
| $39.99 | NBA ALL-STAR $9.99 + Odds API 20K $30 | Small combined input-and-evaluation research pilot. Recommended first combined paid option once adapters and the retrieval manifest are ready. |
| $69.99 | NBA GOAT $39.99 + Odds API 20K $30 | Adds advanced statistics/box-score endpoints and other GOAT access; defer until a specific missing feature and evaluation justify the added cost. |

Important GOAT limitation: BALLDONTLIE's lineup endpoint is documented only from season start year 2025 and only after the game begins. It cannot supply confirmed pre-tipoff lineups for our pregame model. Current-season aggregates also cannot be inserted into old forecasts; reconstruct past-only features from appropriately dated records.

Odds API Free advertises 500 credits/month without historical odds. Its $30 plan advertises 20,000 and historical access. Historical snapshots begin June 2020 at ten-minute spacing, with five-minute spacing from September 2022. Requested timestamps return the available snapshot at or before the requested time; book/market coverage must be audited for each historical period.

Historical odds cost ten credits per region per market: two markets in one region are twenty credits per timestamp. An illustrative 100-timestamp audit costs 2,000 credits; 1,000 such timestamps would consume the full 20,000 before current-price requests. Build and approve a bounded retrieval manifest before calls. Paying for more quota changes neither model skill nor the current local budget guards automatically.

## Recommendation and spending discipline

Complete the free freshness/provenance work first. The lowest useful paid input option is $9.99/month. If the user chooses a combined research budget, $39.99/month is a reasonable initial pilot; prioritize historical odds when the same-cutoff backtest is ready, and add player inputs through controlled comparisons. Do not buy higher tiers solely because one night's picks lost.

A subscription buys access and better experiments, not a measured accuracy gain or expected profit. Illustrative cost hurdle only: 100 bets of $10 each produce $1,000 in turnover; $40/month would require a 4% return on that turnover simply to cover data cost. This is not an assumed betting schedule, predicted return, or recommendation to wager. Keep data/hosting costs separate from gross hypothetical strategy returns.

## Sources

- [BALLDONTLIE NBA tiers and endpoint documentation](https://nba.balldontlie.io/)
- [BALLDONTLIE retention/model-use terms](https://www.balldontlie.io/terms.html)
- [The Odds API pricing](https://the-odds-api.com/)
- [Historical odds, timestamps, quota and coverage rules](https://the-odds-api.com/liveapi/guides/v4/#get-historical-odds)
- [Odds API permitted research and retention uses](https://the-odds-api.com/terms-and-conditions.html)
- [Official NBA injury reports](https://official.nba.com/nba-injury-report-2026-27-season/)
- [Probability calibration methodology](https://scikit-learn.org/stable/modules/calibration.html)
