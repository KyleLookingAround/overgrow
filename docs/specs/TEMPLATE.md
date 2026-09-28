# <Feature name>

Issue: #<number> · Status: Proposed | Approved | Built · PRs: #<number>, … (added as they open)

Copy this file to `docs/specs/<short-name>.md`. Keep it to a page. The owner approves it before building starts.

## What the player gets

The goal or problem in two or three sentences, from the player's side.

## Where it sits on the ladder

- The level it belongs to (back garden, allotment, farm, local distribution, supply chain, national), and what the player does with it there.
- How it shows once that level is zoomed out: which of its numbers carry up as a node's properties, and how its events read one level up (the founding spec's carry-over rule).

## What they see

- On the map (impacts show there, not as text events).
- In the panel: which tab, what's new there.
- On a 320 px phone, a landscape phone, a tablet and a large screen.

## How it works

- The rules, with the numbers that matter, and the clock they run on.
- When it unlocks: a level, an upgrade, or from the start. Locked things are hidden, not greyed out.
- Managers and recommendations: what they do for players who'd rather not handle it.

## Saved state

- New fields in `G` and their defaults; how an older save without them loads.
- Nothing is renamed or removed.

## Balance

- Expected effect on the bot's milestones (`tools/baseline.json`) at this level and the levels it feeds.
- If pacing should change, by how much, and whether the owner has agreed.

## Checks

- New check groups or checks that prove it works, headless (`R.sim`) where they can be.
- What to look at in the screenshots.

## Files

Which `src/game/` files change, and whether it needs a new file.

## Left out

What this deliberately doesn't do, so it doesn't creep.
