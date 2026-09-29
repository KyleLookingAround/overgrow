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
- A change meant to leave the game as it is (a refactor, a speed-up) must leave `PLAY` identical on seeds 1–3 against a build of `main` (`git worktree add`).
- Report the table in the PR description.

## 4. When the owner wants the pacing to change

- Agree the target in the issue first ("the allotment by about day 20").
- Update `tools/baseline.json` and the table below in the same PR as the change.

## Tips

- The Balance workflow (`balance.yml`) runs the seeds on a PR once when it opens or leaves draft, and again when the `balance` label is added; its table is in the run's summary. Report its tables rather than repeating the runs, unless you're tuning. Add the label again after a tuning push to re-run it.
- Tune a constant only inside the rough size its model's sources give (`docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`); outside it is a design change for the owner.
- A part of a split feature reports its numbers and tunes only outside 15% of the baselines; the whole feature is rebalanced once, with every part in.
- A level zoomed out is fed by the level below's numbers (the spec's carry-over rule), so a change to the garden can move the allotment's pacing too: compare every milestone, not only the one you changed.

## Baselines

None yet. The first slice sets them from its own bot runs, with the owner's agreement, and writes them here and in `tools/baseline.json`.
