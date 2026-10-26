# Manual collection and scraping

Checked October 26, 2026. No paid plan, trial, scraper, scheduler or extra provider was enabled.

## What is implemented for free

The dashboard accepts an official injury-report page/PDF link, report publication time, matchup, review state, player/status/reason rows and a short note. The server assigns observation time when it saves; it cannot backdate availability. Reviews append to the private hash chain under the same operation lock. A later review never changes a saved forecast. Future captures may include the latest review known then. Reports over six hours old, incomplete/not-submitted reports, and questionable/doubtful players remain explicit. Empty rows do not establish a healthy roster. No arbitrary injury point adjustment is applied.

The workflow is a manual, user-reported observation; the app does not fetch, parse or independently verify a report. Prefer the exact official PDF URL rather than only the changing season landing page. Report times use device local time in the form and are stored in UTC; source observation time is always server-assigned.

## Where manual work is useful

A small number of current report checks or book-price spot checks can fill specific gaps cheaply. Capture source, event date, publication/quote time and observation time. The existing free licensed feeds already provide schedule, scores and bounded current odds; no scraper is needed for recency, schedule or score-model features. The current manual journal records accepted personal prices separately from model evidence. A general manual historical odds importer is not part of v0.5.

## Why a public page does not replace a data plan

Public visibility alone is insufficient permission for automated extraction and model reuse. NBA.com's terms section 9 restricts its statistics' use in connection with gambling; do not build an NBA.com statistics scraper for this betting project. The treatment of any particular report/source must be checked against its applicable terms, without assuming manual access licenses a derived betting dataset. Existing API collectors use the previously reviewed provider rights.

Today's page cannot reconstruct what was known before an old game. Historical odds need an actual archived line, price, side, sportsbook and timestamp; current odds and final scores cannot manufacture that record. Injuries and expected availability change during a day. Current injury API access also does not automatically include a historical injury-report archive.

Scraping additionally requires stable identifiers, pagination, parsers, duplication/correction controls, time-zone handling, source-use permission and monitoring. Anti-bot restrictions, login or paid access must not be bypassed. Manual copying thousands of player box scores adds large effort and error risk. For a sustained player-stats experiment, a $9.99/month documented API tier may be cheaper in time, but no purchase or accuracy gain is implied.

Sources: [official reports](https://official.nba.com/nba-injury-report-2026-27-season/), [NBA.com terms](https://www.nba.com/termsofuse), [BALLDONTLIE tiers](https://nba.balldontlie.io/), [Odds API historical snapshots](https://the-odds-api.com/liveapi/guides/v4/#get-historical-odds).
