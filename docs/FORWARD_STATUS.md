# Forward research status — October 26, 2026

The October 25 slate is settled: **seven unique game forecasts, seven final results, zero pending** under forward-002. Final-score retrieval at 2026-10-26T04:13:25.551Z matched all seven scores in the user-provided screenshot. The screenshot labels these games Yesterday; they belong to October 25, not the October 26 upcoming slate.

| Same seven games | Frozen model | Saved market benchmark |
| --- | ---: | ---: |
| Winner accuracy | 4/7 (57.1%) | 5/7 (71.4%) |
| Log loss, lower is better | 0.668259 | 0.573811 |
| Brier score, lower is better | 0.238437 | 0.196659 |

The market benchmark is the per-game mean of the available within-book no-vig home-win probabilities saved with the original capture. These are same-game, same-cutoff comparisons. The market performed better on this slate; seven games cannot establish a persistent advantage for either method.

The model's favored winners were Lakers, Pacers, Knicks, Raptors, Thunder, Pistons and Kings. Lakers, Pacers, Thunder and Pistons won. The four raw moneyline value signals discussed in the pregame chat (Clippers, Kings, Nets and Pistons) went 1–3. That chat watchlist is distinct from the all-game winner forecasts and from a preregistered qualified selection policy, which remains disabled. No actual wager, stake or personal return is inferred; the application bettingReturns field remains null.

The score check appended seven result records to each of the two policy cohorts, plus a check record. These are the same seven games, not fourteen independent observations. Both original capture hashes and the fitted model hash remain unchanged. No retraining, threshold adjustment, final-test performance evaluation, paid data or odds request occurred during this scores-only check.

Next: retain this first forward result, continue the frozen process, and investigate input limitations through a separately registered experiment. A loss does not by itself establish that a probability was wrong, and one slate must not become a tuning target.

---

## Initial capture status, preserved from October 25

### First daily paper board — October 25, 2026

The local v0.4 board has saved seven forward forecasts, with all seven matched to FanDuel, DraftKings and BetMGM moneyline/spread pairs under forward-002. The active capture was saved at 12:12 p.m. Eastern, before any of its scheduled games. Seven forecasts are pending; no forward accuracy, probability score, betting return, or qualified selection can be reported yet.

Two captures are preserved. Forward-001's 12:07 p.m. capture withheld five market comparisons under its five-minute start-time rule. Source inspection found ten-minute differences between the game and odds providers; [forward-002](FORWARD_002.md) was registered before another capture, allowing fifteen-minute matching with a fifteen-minute minimum forecast lead. Model features and fitted coefficients did not change. Policy cohorts remain separate.

A subsequent scores-only check correctly found zero completed captured games and made no odds request. Later results must append observations against these originals. The response after the active capture reported 494 Odds API credits remaining; this is an observed response, not a guarantee of future quota or continuous book coverage.

The record establishes a working capture/inference/storage/display path. It does not establish prediction quality, market superiority, profit, Michigan-equivalent prices, or a validated daily bet policy. See [verification](VERIFICATION.md) and the [daily-use instructions](../README.md).
