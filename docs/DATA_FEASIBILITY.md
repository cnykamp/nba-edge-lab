# Data feasibility — 2026-10-24

Status: **official documentation and source-rights update reviewed; collectors tested with synthetic responses only; no authenticated API calls or provider accounts tested.** The project has no provider credentials. Pricing and availability may change. Region is Michigan, USA; timezone America/New_York.

| Source | Documented free access relevant here | Limitation / decision |
| --- | --- | --- |
| BALLDONTLIE | Teams, players, games; five requests/minute | Games include scores and can be filtered by season. Game-player stats/injuries require paid access; advanced stats and odds require higher paid access. Selected for a score-derived baseline; real response/historical revisions untested. Section 6 of its terms permits archiving, model training and backtesting within plan access. |
| TheRundown | Pregame moneyline/spread/total at DraftKings, FanDuel, BetMGM; five-minute delay; 20,000 data points/day and 200,000/month advertised | Current catalog does not list bet365. No MI-specific feed established. Published licensing now verified: 24-hour retention limit without supplemental agreement; backtesting permission required. **Not selected for archival collection.** Free dated game/score lookback is seven days; free odds-history endpoints unavailable. |
| The Odds API | 500 credits/month; listed US feeds include DraftKings, FanDuel, BetMGM | Historical snapshots are paid. Published bet365 entry is Australian, paid, and limited to AFL/NRL: **not a Michigan NBA substitute**. **Selected free forward-odds source.** Its terms expressly permit indefinite retention and ML use; quota and actual three-book coverage still require testing. |

## Sources checked

- BALLDONTLIE endpoint tiers, fields, authentication, pagination, and rate limits: https://nba.balldontlie.io/
- TheRundown NBA plans/book roster: https://therundown.io/nba-odds-api
- TheRundown documentation introduction/catalog: https://docs.therundown.io/introduction and https://docs.therundown.io/llms.txt
- The Odds API pricing: https://the-odds-api.com/
- The Odds API bookmaker roster and geography: https://the-odds-api.com/sports-odds-data/bookmaker-apis.html
- The Odds API current/historical endpoint and credit rules: https://the-odds-api.com/liveapi/guides/v4/

These are provider claims, not measured coverage. The previously inaccessible TheRundown pages were retrieved on recheck: https://docs.therundown.io/rate-limits and https://docs.therundown.io/licensing-and-attribution. The latter rules out our intended durable history without further agreement. Selected-source terms: https://www.balldontlie.io/terms.html and https://the-odds-api.com/terms-and-conditions.html. No real provider data has been downloaded or redistributed; synthetic test responses are not live evidence.

## Feasible zero-cost path

Proceed with BALLDONTLIE Free and The Odds API Free after user signup/key setup and authenticated checks. bet365 may come later; the user confirmed this. Retention permissions are documented for these sources; real response quotas, timestamp behavior and Michigan equivalence still require testing. Do not claim profitable historical selections without archived contemporaneous prices.

Illustrative quota planning for The Odds API: two markets in one region cost two credits/request under its documented market/region formula. Four whole-slate requests/day for 30 days would consume 240 credits, leaving some allowance out of 500. This does **not** establish that morning plus per-game pregame polling and closing captures fit: calculate against the actual schedule first. No polling schedule is enabled.

## Before choosing an adapter

1. User obtains free keys locally; do not sign up for auto-renewing trials or put keys in browser source.
2. Test one bounded NBA call; record provider event IDs, response version, headers/quotas, reported timestamps, retrieval time, and matching book/market coverage.
3. Confirm whether returned prices represent Michigan, a different US jurisdiction, or unspecified US coverage. Label unverified prices and verify against the locally available book before any recommendation qualification.
4. Review personal storage, retention, derivative model, display, attribution, and redistribution rights. Keep raw data private regardless of repository visibility.
5. Verify scores/corrections, event matching across providers, postponements, pregame/live status, stale/closed prices, and absence vs request failure.
6. Establish point-in-time history availability. Opening/closing snapshots alone do not reconstruct every morning or pregame decision.

bet365 remains a required product book with **unverified automated MI NBA coverage**. Manual journal entry supports it; automated comparison must not silently substitute another country or pretend four-book coverage.

## v0.2 collection boundaries

The game collector requests one page of up to 100 records and exposes its next cursor. Neither a page nor an exhausted tail cursor establishes a verified complete season. The odds collector uses only NBA h2h/spreads for the three requested initial books, records US/Michigan-unknown geography, and reserves at most eight credits/day and 240/month locally. Provider quotas and other consumers of the same key can reduce availability. Authentication, complete datasets, scheduling, model training and profit evidence remain pending.
