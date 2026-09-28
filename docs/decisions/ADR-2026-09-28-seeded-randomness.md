# ADR-2026-09-28: A seeded random generator and a headless simulation from the first line

## Status

Accepted, carried over from Final Call.

## Context

Balance is checked with a bot that plays a long game headless. That only works if a seed repeats a run exactly and the game runs with no screen. Final Call made both rules early and kept them for 34 versions; adding them late would mean hunting every stray `Math.random()` and DOM call.

## Options Considered

### Option 1: `Math.random()` and DOM work wherever convenient
**Pros:** quicker to write. **Cons:** no repeatable runs, no bot, no seeded checks.

### Option 2: `rnd()` for anything that changes the game, and `R.sim` for headless runs
**Pros:** every check and bot run repeats from its seed; a change's effect can be measured before and after on the same seeds. **Cons:** a rule every session has to keep.

## Decision

Option 2. `rnd()` lives in `src/game/00-random.js`, seeded from `window.__seed`. The build rejects `Math.random()` on any other line that doesn't end with `// cosmetic`. Everything reachable from `update()` works with `R.sim=true`: no DOM work, no saving.

## Consequences

- The `build` check proves the `Math.random()` rule is enforced.
- The first slice adds the `sim` check: a new game plays a long headless run without errors.
