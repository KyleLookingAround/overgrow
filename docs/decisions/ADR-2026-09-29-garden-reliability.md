# ADR-2026-09-29: The garden's offer measures Reliability as the household fed, week by week

## Status

Proposed with the playable garden (#54), taken as the default while the owner decides (#55). Part 7's sealing is unchanged.

## Context

The founding spec proposes the garden's step-up offer at Output 1.5 kg a day and Reliability 60 over the garden's year, "set with the bot's baselines". The playtest saw Reliability 0 all year, and the brief asks why and for it to rise when the player does the right things. Measured with the bot (seeds 1 to 3, two years, a player who buys, digs all six beds and sows for the winter):
- **Output** reaches about 0.26 kg a day over the second year; 1.5 kg a day is an allotment's.
- **Reliability** as the ladder defines it, 100 × (1 − the coefficient of variation) of the weekly samples restated per day (× √7), is 0 on every seed, and still 0 taken week by week without the restatement: a garden's weeks run from 0.1 kg in January to 15 kg when a bed of lettuce comes ready, a spread larger than the mean, which the formula clamps to 0 whatever the player does.

## Options Considered

### Option 1: keep the definition, and set the target at its ceiling
**Pros:** nothing changes in the maths. **Cons:** the ceiling is 0: the requirement can't move, and the goal bar can't name anything that raises it.

### Option 2: change the ladder's Reliability for every level
**Pros:** one definition. **Cons:** a change to the founding spec's carry-over rule, which part 7's sealing and every level above rely on: the owner's to make.

### Option 3: the garden's offer takes Reliability from how steadily the garden fed the household
The goal keeps, beside the ring, each week's share of the household's veg ask the garden met at its meals (the kitchen's ledger), and the offer's Reliability is 100 × their mean over the year. The ring and its sealing maths are unchanged.
**Pros:** it moves, and it moves with the right things (winter crops, storing crops, a mix, more beds): the two-bed garden reaches about 12, the full garden about 40; it's what "a year's steady supply" means to a household; it's local to the garden's offer and easy to undo. **Cons:** the offer's Reliability and the sealed tile's (part 7) are two different numbers until the owner decides.

## Decision

Option 3, as the default, with the garden's targets at its measured ceiling: Output 0.25 kg a day, Reliability 35, Health 50 (`src/data/ladder-rules.ts`). The buying, digging player reaches the offer on days 378 to 469 on seeds 1 to 3, just after the garden's first full year (the founding spec's target); the two-bed player doesn't.

## Consequences

- `src/sim/goal.ts` keeps `fed` beside the ring, and `gardenStatus()` is what the goal bar, the level's-end card, the `card` command and the bot read.
- Part 7 decides, with the owner, whether sealing takes the same measure or the ring's spread.
