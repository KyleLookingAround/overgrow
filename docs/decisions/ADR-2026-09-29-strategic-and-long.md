# ADR-2026-09-29: The game is strategic and long, and each level lasts long enough for its slowest lever to pay back

## Status

Accepted when the PR that adds it merges (the brief `docs/briefs/spec-answers.md`, closing #29). It writes together the owner's decision of 29 Sep 2026 that the game should be strategic and long, and never boring (decision 12 of `docs/briefs/coordinator-first-slice-2.md`), and the owner's answer to #29's question 15.

## Context

The first baselines aimed at speed: the garden's offer on days 55 to 75, the smallholding's first year in about ten minutes. So the slow effects the levels are built round (soil organic matter, rotation, hedges) couldn't pay back inside the level that teaches them: #24 found a rotating bot doesn't yet beat a one-crop bot. The systems web's strategy section found the same in every mechanic: one obviously best choice, because the trade-off's long side never arrived. The owner has said the game may take longer, so long as the player always has things to do and changes to make.

## Options Considered

### Option 1: keep the short levels and make the slow effects faster
**Pros:** the baselines stand. **Cons:** breaks "real mechanisms, rough numbers": soil takes years, and a mechanism sped up to fit a level teaches the wrong lesson.

### Option 2: lengthen each level, keep the clock's rates, and judge pacing by the longest quiet stretch
**Pros:** the slowest lever pays back once inside the level that teaches it; the clock, and so the ladder's speed-up, is untouched. **Cons:** the slice gets longer, the baselines must be reset, and a long level can bore, which the quiet-stretch measure is there to catch.

### Option 3: keep the levels and add an "years pass" skip
**Pros:** short in real time. **Cons:** the player skips the very choices the levels are for.

## Decision

Option 2 (the owner, 29 Sep 2026, taking the recommendation on #29):

1. **The game is strategic and long, never boring.** Choices have trade-offs that pay off over different horizons (this week, this season, the years ahead), the player can compare plans, and no single option dominates.
2. **Each level lasts long enough for its slowest lever to pay back once.** The garden runs at least a full year; the allotment and the smallholding run two or three years each. The clock keeps its rates (seconds per game day), so the game gets longer, not slower.
3. **The step-up waits for a year's steady supply, not a lucky summer.** The garden's offer looks at the last full year (four seasons) for Output, Reliability and Health; the numbers stay proposed, for the bot to set.
4. **Pacing is judged by the longest quiet stretch** (no decision, unlock, harvest to place or event to answer) and by each level lasting long enough for its slowest lever to pay back. Milestones may land later than the first baselines' ranges. The "within about 15% of the baselines" rule goes, and `tools/baseline.json` is reset by part 6c with the bot's new measure.

## Consequences

- The founding spec's slice, step-up conditions, bot targets and roadmap (parts 8 to 14) say two or three years and a full year; the systems web's strategy section and time-scale note are answered.
- The `balance` playbook judges the longest quiet stretch; the project notes' pacing line changes to match. Part 6c writes the measure and resets the baselines; until then the old baselines are out of date, not targets.
- The sealing maths' garden window moves from 28 days to a year with the session that adds the other approved hooks (`docs/systems/ladder.md`).
- A level that lasts longer than its slowest lever needs still has to fill its time with decisions: each level's spec answers what the player is choosing across its years, and the bot's quiet-stretch measure fails a level that leaves them with nothing to do.
- The garden becomes about two and a half hours at 1× (thirty-six minutes at 4×); the owner accepted this by taking the recommendation.
