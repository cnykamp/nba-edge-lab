# Data feasibility — 2026-10-24

Status: **official documentation reviewed; no authenticated API calls or provider accounts tested.** The project has no provider credentials. Pricing and availability may change. Region is Michigan, USA; timezone America/New_York.

| Source | Documented free access relevant here | Limitation / decision |
| --- | --- | --- |
| BALLDONTLIE | Teams, players, games; five requests/minute | Games include scores and can be filtered by season. Game-player stats/injuries require paid access; advanced stats and odds require higher paid access. Candidate for a score-derived baseline; response and historical revision behavior untested. |
| TheRundown | Pregame moneyline/spread/total at DraftKings, FanDuel, BetMGM; five-minute delay; 20,000 data points/day and 200,000/month advertised | Current catalog does not list bet365. No MI-specific feed established. Personal retention and historical lookback still need verification before ingestion. Candidate for forward collection only until that is resolved. |
| The Odds API | 500 credits/month; listed US feeds include DraftKings, FanDuel, BetMGM | Historical snapshots are paid. Published bet365 entry is Australian, paid, and limited to AFL/NRL: **not a Michigan NBA substitute**. Alternative if its quotas and retention terms fit. |

## Sources checked

- BALLDONTLIE endpoint tiers, fields, authentication, pagination, and rate limits: https://nba.balldontlie.io/
- TheRundown NBA plans/book roster: https://therundown.io/nba-odds-api
- TheRundown documentation introduction/catalog: https://docs.therundown.io/introduction and https://docs.therundown.io/llms.txt
- The Odds API pricing: https://the-odds-api.com/
- The Odds API bookmaker roster and geography: https://the-odds-api.com/sports-odds-data/bookmaker-apis.html
- The Odds API current/historical endpoint and credit rules: https://the-odds-api.com/liveapi/guides/v4/

These are provider claims, not measured coverage. Specific TheRundown rate-limit/licensing pages could not be retrieved during this audit; legal storage/display/retention permission remains unresolved. No provider data has been downloaded or redistributed.

## Feasible zero-cost path

Proceed with dashboard setup and a completed-game baseline after free-key access is tested. Begin timestamped forward odds collection only after retention rights and quotas are checked. Do not claim profitable historical selections without archived contemporaneous prices.

Illustrative quota planning for The Odds API: two markets in one region cost two credits/request under its documented market/region formula. Four whole-slate requests/day for 30 days would consume 240 credits, leaving some allowance out of 500. This does **not** establish that morning plus per-game pregame polling and closing captures fit: calculate against the actual schedule first. No polling schedule is enabled.

## Before choosing an adapter

1. User obtains free keys locally; do not sign up for auto-renewing trials or put keys in browser source.
2. Test one bounded NBA call; record provider event IDs, response version, headers/quotas, reported timestamps, retrieval time, and matching book/market coverage.
3. Confirm whether returned prices represent Michigan, a different US jurisdiction, or unspecified US coverage. Label unverified prices and verify against the locally available book before any recommendation qualification.
4. Review personal storage, retention, derivative model, display, attribution, and redistribution rights. Keep raw data private regardless of repository visibility.
5. Verify scores/corrections, event matching across providers, postponements, pregame/live status, stale/closed prices, and absence vs request failure.
6. Establish point-in-time history availability. Opening/closing snapshots alone do not reconstruct every morning or pregame decision.

bet365 remains a required product book with **unverified automated MI NBA coverage**. Manual journal entry supports it; automated comparison must not silently substitute another country or pretend four-book coverage.
