---
name: balance
description: Measure and tune Overgrow's pacing and economy with the bot on seeds 1-3, before and after a change, against tools/baseline.json. Use for any change to growth, yields, costs, prices, the clock or when a level unlocks.
---

# Balance

## What the bot is

- `tools/bot.ts` plays the game headless in Node through `createSim()` and the same commands the player uses, making the choices a sensible player would; `npm run bot -- <game time> --seed <n>` drives it (`120d`, `2w`, `1y` or `36h`; `--seed` again for more seeds; `--player <name>`; `--markdown <file>` and `--json <file>` keep the table and the runs). `docs/SYSTEMS.md` ("The bot") says how it's built.
- It prints, per seed: `SEED`, `REACHED {milestone: game day}` (each level's step up, and the spec's milestones inside a level), `PLAY` (a fingerprint of the saved state that affects play: the save less the speed and what's been seen), `ERR [...]`; then one table of every seed and their mean against `tools/baseline.json`. It exits 1 only on an `ERR`.
- A milestone is one line in `tools/bot/milestones.ts`, a player's choice one policy in `tools/bot/player.ts`: a part that brings a milestone or a choice (the pest policy, the shop, the allotment offer) fills in its line.
- The same seed and code always give the same run. Any change to the code can shift the dice, so judge a change on several seeds, before and after.
- It must also play a long headless game (the spec says how long) without errors: `src/sim/index.test.ts` plays two game years on every check.

## 1. Before

On the branch's starting point (usually `main`, built in a `git worktree` so the build doesn't disturb yours), run seeds 1, 2 and 3: `npm run bot -- 120d --seed 1 --seed 2 --seed 3 > build/before.log`. The garden's 120 days take about a second a seed, so there's no need to run them in the background yet.

## 2. Change, then after

Make the change and run the same three seeds into `build/after.log`.

## 3. Compare

- Put before and after side by side per milestone: each seed, and the mean.
- Against `tools/baseline.json`: `ok` is inside the range, `near` is within 15% of it, `off` is beyond. Aim for `ok`; `near` needs a reason; `off` needs the owner's agreement.
- `ERR` must be empty on every seed.
- **Strategic and long; never boring** (the owner, 29 Sep 2026). The game should be strategic and long: a milestone later than its range needs no agreement as long as the player always has something to do or change: no long stretch without a decision, an unlock, a harvest to place or an event to answer. The number that matters is the longest quiet stretch, not the total. Until the bot reports it (part 6's work), read it from the bot's log and say it in the PR. Earlier than the range, or a long quiet stretch, still needs a reason. A strategy the bot finds that beats every other on every seed is a design gap to report (as #24 was for rotation), not a win.
- A change meant to leave the game as it is (a refactor, a speed-up) must leave `PLAY` identical on seeds 1–3 against a build of `main` (`git worktree add`, never stash or check out around a build). `PLAY` fingerprints the save's version, so raising `SAVE_VERSION` changes it everywhere: compare with the version held equal (#79).
- Report the table in the PR description.

## 4. When the owner wants the pacing to change

- Agree the target in the issue first ("the allotment by about day 20").
- Update `tools/baseline.json` and the table below in the same PR as the change.

## Tips

- The Balance workflow (`balance.yml`) runs the seeds on a PR once when it opens or leaves draft, and again when the `balance` label is added; its table is in the run's summary. Report its tables rather than repeating the runs, unless you're tuning. To run it again after a tuning push (or before merging, on the latest head), remove the label and add it again: only adding it starts a run.
- Tune a constant only inside the rough size its model's sources give (`docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`); outside it is a design change for the owner.
- A part of a split feature reports its numbers and tunes only outside 15% of the baselines; the whole feature is rebalanced once, with every part in.
- Before tuning a constant, run one seed and check that `PLAY` moves: a constant can be dead, overwritten where it's used (Final Call's `STAND` was set again by each layout, so a cheaper gate changed nothing).
- A wall the bot hits can be the bot's own policy, not the game's: Final Call's bot raised fares to 240% where the tips stop at 120%, and a slow first morning left it stuck for 1,000 hours. Read the policy's values in the run before calling a stall a pacing problem, and stop the bot where the game's own guidance stops (Final Call, `lessons/171-release-b1-pacing.md`).
- A run that ends before a milestone's upper bound can't call it `off`: make the run longer than the longest range, or a missing level reads as "not run long enough" and hid level 9 on all three seeds until the audit (Final Call, `lessons/155-audits.md`).
- A level zoomed out is fed by the level below's numbers (the spec's carry-over rule), so a change to the garden can move the allotment's pacing too: compare every milestone, not only the one you changed.

## Baselines

`tools/baseline.json`, **proposed** (not yet agreed by the owner; the `needs-owner` issue from part 4 asks): the sensible bot on seeds 1–3 through day 120 of the garden, with part 3's crops and the owner's head start. A milestone not reached within the run counts as later than any day.

| Milestone or measure | Range | Seeds 1, 2, 3 |
| --- | --- | --- |
| First sowing | day 1 | 1, 1, 1 |
| First harvest | day 2–8 (the spec's by day 8) | 5, 6, 3 |
| First sale | not by day 120 | none, none, none |
| Half the kitchen's need met, a week | day 105 or later | none, 114, 113 |
| Output, last 28 days | 0.08–0.35 kg/day | 0.10, 0.30, 0.32 |
| Reliability, last 28 days | 0–10 | 0, 0, 0 |
| Health, last 28 days | 83–92 | 87, 88, 88 |
| Money on days 30, 60, 90 and 120 | £20 | £20 on each |
| Food wasted | 0.4–1.5 kg | 0.5, 1.1, 1.3 |
| Carbon into the air | 0–5 kg CO₂e | 4.2, 0.2, 2.8 |

The spec's other first targets (the first upgrade by day 20, the allotment offer between days 55 and 75) get their ranges with the parts that bring them (6 and 7).
