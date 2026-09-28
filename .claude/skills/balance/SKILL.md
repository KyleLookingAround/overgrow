---
name: balance
description: Measure and tune Overgrow's pacing and economy with the bot on seeds 1-3, before and after a change, against tools/baseline.json. Use for any change to growth, yields, costs, prices, the clock or when a level unlocks.
---

# Balance

The bot doesn't exist yet: the first slice builds it with the back garden (the founding spec, "The bot"). Until then this playbook is the contract that slice builds to. When it lands, it fills in the commands and the baselines below and deletes this paragraph.

## What the bot is

- `tools/bot.js` plays the game headless (`R.sim=true`) through `window.__sim`, making the choices a sensible player would, and `tools/run-bot.mjs` (`npm run bot -- <game time> --seed <n>`) drives it in Chromium.
- It prints, at the end: `SEED`, `REACHED {milestone: game time}` (each level's step up, and the spec's milestones inside a level), `PLAY` (a fingerprint of the saved state that affects play), `ERR [...]`, and a table against `tools/baseline.json`.
- The same seed and code always give the same run. Any change to the code can shift the dice, so judge a change on several seeds, before and after.
- It must also play a long headless game (the spec says how long) without errors: that's the `sim` check.

## 1. Before

On the branch's starting point (usually `main`), run seeds 1, 2 and 3 side by side in the background (`nohup … > build/before-$s.log 2>&1 &`) and keep each log's last lines.

## 2. Change, then after

Make the change, rebuild, and run the same three seeds into `build/after-$s.log`.

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

- Once the Balance workflow exists (it comes with the bot), it runs the seeds on a PR once when it opens or leaves draft, and again when the `balance` label is added. Report its tables rather than repeating the runs, unless you're tuning.
- A part of a split feature reports its numbers and tunes only outside 15% of the baselines; the whole feature is rebalanced once, with every part in.
- A level zoomed out is fed by the level below's numbers (the spec's carry-over rule), so a change to the garden can move the allotment's pacing too: compare every milestone, not only the one you changed.

## Baselines

None yet. The first slice sets them from its own bot runs, with the owner's agreement, and writes them here and in `tools/baseline.json`.
