# ADR-2026-09-28: Real mechanisms, rough numbers

## Status

Accepted (with the owner on 28 Sep 2026).

## Context

The owner wants an educational simulation where every interaction of every system is based in reality: what happens in the game happens for the reason it happens in the world. They also want it to stay an incremental upgrade game, and the numbers "don't need to be perfect, just the general vibe and effect roughly". A rule that cited every constant and checked it in CI was considered and turned down as too slow for what it buys.

## Options Considered

### Option 1: Invented mechanics tuned for fun
**Cons:** teaches nothing, and drifts from the world with every balance change.

### Option 2: Every constant cited and checked in CI
**Cons:** slow to write, and false precision: a game's constants are tuned for pacing anyway.

### Option 3: Real mechanisms, rough numbers
**Description:** every model in `src/sim/models/` implements a real-world mechanism, names what it's based on, and says what it simplifies. Its constants are tuned for the game inside the real direction and rough size of the effect. The proof is a plausibility test per model asserting the shape of the effect, not a decimal.

## Decision

Option 3, enforced three ways:
- **A header on every model** (`// Sources:` naming the papers, standards or datasets it rests on, and `// Simplifies:` saying what it leaves out), which the `rules` check requires.
- **A plausibility test per model** in Vitest, asserting direction and rough size: tomatoes in a hot dry week need more water than lettuce in cool rain; the same family three years running yields less; a day at 2 °C grows nothing; a week in a warm lorry loses more strawberries than potatoes.
- **An Explain card on every effect** in the game, naming the mechanism and its source, which is where the education happens.

Balance tuning moves constants only inside the rough size the sources give; a change outside it is a design change and needs the owner.

## Consequences

- A model with no real-world basis doesn't go in; find the mechanism first.
- The founding spec's systems map lists each system's basis; each system's notes in `docs/systems/` repeat it.
- The bot's baselines (the `balance` playbook) are pacing targets, not truth claims.
