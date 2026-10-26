# Project decisions — October 24, 2026

User confirmed:

- Private `cnykamp/nba-edge-lab`; meaningful tested versions are committed and pushed.
- Michigan, USA; Eastern time; moneyline and spread first.
- One best qualifying opportunity plus up to three other qualifying opportunities; no forced pick.
- Morning and pregame views, eventually accessible from laptop and phone.
- Feature-grounded explanations, defensible uncertainty and constant-stake evaluation.
- FanDuel, DraftKings and BetMGM first; **bet365 may come later**.
- **Start free.** User is open to paid data later if evidence supports the value; no subscription, payment, or automatic upgrade is authorized.
- No provider accounts existed at the start of v0.2; user requested a signup walkthrough. Accounts/keys have since been configured locally and both providers authenticated.

Implementation decision from newly verified source terms:

Use BALLDONTLIE Free for games and The Odds API Free for a durable forward odds record. TheRundown remains unused because its published terms restrict data retention to 24 hours without a supplemental agreement. The replacement stays within the zero-cost plan and covers the same initial three books on documented US feeds; Michigan-equivalent prices still need testing.

Before proposing paid data, identify a concrete missing input, its cost and permitted use, and what new evaluation it enables. Evaluate forecasting/calibration and forward selected-pick results with uncertainty. Report incremental subscription costs separately from betting returns. A favorable streak or backtest is insufficient to claim the subscription will pay for itself. User makes any spending decision.

Implementation follow-up: the malformed local key was repaired without printing values; both providers authenticate. The user then authorized starting real-data collection and the baseline build. Spending remains unapproved. The historical experiment uses only public game outcomes and archived free odds collected from now onward; all predictive/financial evidence states remain distinct.

October 25 follow-up: user authorized building the daily paper-research milestone without additional accounts or spending. Manual capture/check-result buttons are the initial workflow. Version 0.4 does not create automations or qualify bets. Forward-001's observed start-time mismatch and forward-002's preregistered amendment are preserved separately; model settings are unchanged.

October 26 model/data review: user reports no bets recorded for the October 25 slate. Preserve that exact user-reported state; actual placed wagers and personal returns are not inferred. User asked about model improvements and potential paid API budgets; this is not authorization to subscribe, pay, retrain or alter a frozen policy. Current free access is unchanged. Proposed options and a read-only feature-freshness audit are documented in MODEL_UPGRADE_PLAN.md.

October 26 authorization: user requested all seven free research improvements and candid feasibility assessment of manual scraping. Implemented candidate-002 with a precommitted three-variant/two-fold budget, separate past-only calibration and forward-003 paper cohort; no paid plan, trial, schedule, wager or automatic promotion. Manual official-report observation workflow is implemented without an NBA.com statistics scraper. The original baseline/capture hashes are preserved. User reports no personal bets recorded for October 25; this does not establish whether wagers were placed or personal profit.
