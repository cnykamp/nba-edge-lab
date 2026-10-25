# Free data setup — v0.2

## 1. Create free accounts yourself

- BALLDONTLIE: https://app.balldontlie.io/ — create an account, keep the Free tier, and locate your API key. Skip paid trials and payment details. Free games are enough for initial score-derived model research; player stats and injuries are not included.
- The Odds API: https://the-odds-api.com/ — select **Starter FREE, 500 credits/month** in Get Access. Follow its free-key email/account instructions. Do not select a paid plan. Current prices will form a forward record; historical snapshots are not included.
- **Do not create a TheRundown account for this build.** Its published retention restriction conflicts with keeping our evaluation history. If you already made a free account, leave it unused; this version has no TheRundown collector.

Review and accept each provider's account terms yourself. No account has been created by the project, and account signup is not required to view the dashboard.

## 2. Save keys on your laptop

In Terminal:

```sh
cd /Users/calebnykamp/Documents/nba-edge-lab
npm run setup:keys
```

Paste the BALLDONTLIE key at its prompt, then the Odds API key. The terminal deliberately shows no typed characters. Enter skips a provider. The helper creates a new `.env` with owner-only permissions and refuses to overwrite an existing file. It makes no API requests. Keys stay out of browser code and are ignored by Git. Never paste them into chat, a screenshot, a command argument, or an issue.

If `.env` already exists, edit it locally using `.env.example` as the format and keep permissions `600`. Only BALLDONTLIE_API_KEY and ODDS_API_KEY are supported. OS-level credential-manager storage and rotation UI are future work.

## 3. Check readiness

```sh
npm run data:status
```

Only booleans and safe collection metadata are shown. `keyConfigured: true` means a value was saved; it does not mean authentication succeeded. Restart/reload the dashboard to see setup status (reload suffices after changing keys).

## 4. First bounded requests

```sh
npm run data:games -- --season 2025
npm run data:odds
```

The games command retrieves **one page, up to 100 games**. `2025` means the season starting in 2025. If a next cursor is returned, continue with `--cursor NUMBER` after at least 13 seconds. Do not call a single page or an exhausted tail cursor a verified complete season. Dataset reconciliation comes before training.

The odds command requests NBA moneyline/spread prices from only FanDuel, DraftKings and BetMGM. It discards in-play events from normalized pregame records, retains source/retrieval times, and marks Michigan equivalence unverified. Missing books/zero quotes are recorded honestly. It generates no model predictions or betting recommendations.

Raw and normalized snapshots are written privately under ignored `data/`, with hashes and a separate collection index. No browser endpoint exposes raw data. The collector writes new snapshot files exclusively; this is not tamper-proof archival storage. Requests do not retry automatically. Provider errors never forward raw bodies, URLs, keys, or causes.

Local guards reserve two credits per odds request, with maximums of eight credits/day and 240/month, plus a 60-second minimum interval. They count failed requests conservatively. These are local ceilings, not a guarantee of provider quota: other apps may share the same key, and provider accounting controls access. No scheduler is enabled.

If collection stops with `COLLECTION_LOCKED`, a collector may still be running. After confirming none is running, inspect the ignored `data/.collection-lock` locally before removing a stale lock. Do not bypass a live lock or quota boundary.

## What to report back

Say “both keys saved” or share the **data:status output**, which contains no keys. Do not send `.env`. We can then test real responses, reconcile game coverage, freeze the initial experiment, and start the baseline model. No performance or profitability claim follows from successful API access.

## Sources checked October 24, 2026

- https://nba.balldontlie.io/
- https://www.balldontlie.io/terms.html — Section 6 permits storage, model training and evaluation within acquired plan access.
- https://the-odds-api.com/ — free plan and key instructions.
- https://the-odds-api.com/liveapi/guides/v4/ — query authentication and market/region quotas.
- https://the-odds-api.com/terms-and-conditions.html — permits indefinite retention and ML use, excluding raw-data resale.
- https://docs.therundown.io/licensing-and-attribution — 24-hour retention restriction without supplemental agreement.
