# ADR-2026-09-28: A seeded random generator and a headless simulation from the first line

## Status

Accepted, carried over from Final Call.

## Context

Balance is checked with a bot that plays a long game headless. That only works if a seed repeats a run exactly and the game runs with no screen. Final Call made both rules early and kept them for 34 versions; adding them late would mean hunting every stray `Math.random()` and DOM call.

## Options Considered

### Option 1: `Math.random()` and DOM work wherever convenient
**Pros:** quicker to write. **Cons:** no repeatable runs, no bot, no seeded checks.

### Option 2: a seeded generator for anything that changes the game, and a sim that never touches the DOM
**Pros:** every check and bot run repeats from its seed; a change's effect can be measured before and after on the same seeds. **Cons:** a rule every session has to keep.

## Decision

Option 2. The generator lives in `src/sim/random.ts`, seeded from the game's seed (the checks set `window.__seed`). The `rules` check rejects `Math.random()` anywhere else in `src/` on a line that doesn't end with `// cosmetic`, and the build refuses to run on it. The simulation (`src/sim/`) never touches the DOM at all: it runs in a worker, in Node and in tests alike.

## Consequences

- The `rules` check proves the `Math.random()` rule is enforced, on a fixture.
- `src/sim/index.test.ts` plays two game years headless and proves the same seed gives the same game; the first slice grows it.
