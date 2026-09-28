# <Feature name>

Issue: #<number> · Status: Proposed | Approved | Built · PRs: #<number>, … (added as they open)

Copy this file to `docs/specs/<short-name>.md`. Keep it to a page: the founding spec (`docs/specs/overgrow.md`) is the one exception, and a feature spec points at its model and systems map rather than restating them. The owner approves it before building starts.

## What the player gets

The goal or problem in two or three sentences, from the player's side.

## The mechanism

The real-world mechanism behind it, its sources, what this simplifies, and its fast and slow effects (`docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`).

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

- New fields in the saved state (`src/sim/`) and their defaults; how an older save without them loads.
- Nothing is renamed or removed.

## Balance

- Expected effect on the bot's milestones (`tools/baseline.json`) at this level and the levels it feeds.
- If pacing should change, by how much, and whether the owner has agreed.

## Checks

- The plausibility test for each model (direction and rough size), Vitest tests for the rules, and any browser check group the page needs.
- What to look at in the screenshots.

## Files

Which files under `src/sim/`, `src/data/`, `src/app/` and `src/ui/` change, and whether it needs a new file.

## Left out

What this deliberately doesn't do, so it doesn't creep.
