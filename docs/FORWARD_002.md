# Forward 002: event-time alignment amendment

Registered before capturing under this policy and before any captured game finished. This amends forward-001's event matching, not the fitted model, features, probabilities, ordering, or qualification state.

The first real forward-001 capture on October 25, 2026 saved seven forecasts and only two matching markets. Source inspection found the other five exact team/side matches had ten-minute differences between BALLDONTLIE scheduled time and The Odds API commencement time. Their original comparisons were correctly withheld under the five-minute rule. The original capture and five unavailable comparisons are preserved. No outcomes guided this change.

Use a fifteen-minute maximum start difference, retaining unique exact home/away identity (with the existing explicit Clippers alias), future status, source freshness, and ambiguity checks. Add a fifteen-minute minimum lead before the game provider's scheduled start, both at feature cutoff and before saving, so the permitted mismatch cannot admit an already-started game. The fifteen-minute bound is an operational reconciliation rule, not a performance-tuned threshold. This does not independently verify actual tipoff or Michigan pricing.

Keep first-forecast accounting and performance cohorts separate by policy ID. Show forward-002's metrics by default, preserve both policies in capture history, and check results for both. A later forward-002 capture never replaces its first forecast. Save policy/implementation hashes; implementation changes after the first capture require a new policy registration.

All other [forward-001 rules](FORWARD_001.md) remain in force. Current-policy selection is recorded in experiments/forward-active.json. No automatic model promotion, retraining, bets, intervals, returns, or fixed-time scheduling is enabled.
