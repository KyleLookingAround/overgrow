# Sealing and the step up to the allotment

Issue: #69 · Status: Approved (the coordinator, under the owner's decisions 15 and 20) · PRs: the `feature/step-up` PR

Part 7 of the founding spec's roadmap, from `docs/briefs/step-up.md`. It wires the carry-over rule's maths (`src/sim/ladder.ts`, `docs/systems/ladder.md`) into the game: the first time the game is more than one level.

## What the player gets

When the garden's offer is met, the offer card becomes the step-up card. It has two buttons: "Take the plot" and "Stay in the garden a while". Taking the plot seals the garden into one tile ("This is your plot now"), and the camera pulls back to an allotment of twelve plots. The player can't tend beds there any more, only plan: how many hours a week the plot gets, what it grows more of, and whether it's fed with compost or bought feed. They watch twelve plots grow and their own plot's numbers move.

## The mechanism

- **Sealing** (the founding spec, "The carry-over rule"): a level the player leaves runs on its last full cycle's totals. Output is lumpy by its Reliability, and Health drifts at most a point a season toward the plan. It isn't a real-world model but a rule of the game.
- **The plan's three levers** are each a real trade, with sources in `src/data/allotment.ts`:
  - **Care** is the hours a week against what a ten-rod plot needs (about six, the National Allotment Society), and it moves Health's target.
  - **The mix** moves the kg by crop yields (potatoes 3–4 kg a m², salads and greens 1–2) and the groups the household eats.
  - **Compost or bought feed:** bought feed gives about 10 % more now, costs about £35 a year and fertiliser's carbon, and runs the soil's organic matter down (Brentrup et al. 2016; RHS).
- **Fast effect:** this season's Output from the mix and the feed. **Slow effect:** Health's point a season from the care and the feed.

## Where it sits on the ladder

- **The allotment (level 2):** the player's node is a plot (kind `plot`), and eleven neighbours hold the rest.
- **One level up (part 10):** the same sealing seals the allotment into a field. A plot then shows as a tile with its numbers, and two levels up as a tint and a line.
- **Carried into the plot:** the garden's year carries up exactly in Output, carbon and land, and the `carry` check holds it to that.

## What they see

- **On the map:**
  - the zoom-out (about 3 s, skipped by a tap, a straight cut under reduced motion);
  - twelve tiles tinted by Health, each showing its Output;
  - the player's plot outlined;
  - paths, the trough and the sheds;
  - neighbours walking to their plots on the days their plots give food.
- **In the panel:** "Your plot" (the plan's three levers, each with Explain, unfolding over the first three weeks) and "The allotment" (every plot with its numbers, and a line on what's coming next season).
- **The top bar** reads "Allotment" with the level's date.
- **Screen sizes:** 320 px portrait and landscape up to large screens.

## How it works

- **The command:** `step-up` is refused until the offer is latched. The goal latches the first week the offer is met (`Goal.offered`).
- **Sealing:** it seals `windowTotals()` of the garden's year, with Reliability as the offer counted it (the weeks' shares of the veg met, not the ring's spread), the garden's land as it stands, and the household's veg mix.
- **What stays below:** the garden's graph is kept in `State.ladder` for part 9's zoom back in. The household's money and members carry over.
- **The clock:** level 2 runs at 4 s a day with an hourly step (`src/data/ladder.ts`). The garden's systems rest there; the `allotment` system and `sealedSystem` run.
- **The neighbours** come from the household model (`allotment(rng(seed))`, the same draw as `neglectedPlot(seed)`), with their totals from `layoutRng(seed, 'allotment')`. The household with least time holds the neglected plot, whose Health is 35 or less.
- **The household's week at level 2:**
  - wages come in;
  - the shop buys the basket less what the plot gave;
  - the rest of life goes out;
  - the plot's rent (about £100 a year) comes out daily.
- **Level 2's own `History`** samples the player's plot weekly, for its own offer at part 10.
- **Level 2's length:** about two years (730 days, about 49 minutes at 1×). Part 8 fills them:
  - the first season: the trough and the watering rota, the swap shed, the neglected plot's slugs, the second plot with its helper, and the committee;
  - the second year: the committee's vote and the plot's own offer.

## Saved state

The save version rises to 11: `Goal.offered`, the level-2 graph, and `State.ladder` holding the garden below. There is no compatibility before the first release, so an older save starts a new game.

## Balance

- **The step up:** the bot takes the plot the morning after the offer latches, on day 365, 421 and 365 for seeds 1 to 3. The garden's milestones before it are unchanged.
- **The allotment:** the plot gives about 0.25–0.27 kg a day and the neighbours about 0.32–0.36. Groceries saved are about £390–440 over the allotment's two years. Money stays positive.

## Checks

- **`src/sim/allotment.test.ts`:**
  - the command's refusal;
  - what sealing carries;
  - the neighbours from the seed;
  - each lever's direction, its unfolding, and that it's the player's alone;
  - two years with a save and a load;
  - the day's budget;
  - the carry report.
- **The long headless run** crosses the step up with the bot's player (`src/sim/index.test.ts`).
- **The `carry` check group:**
  - on seeds 1–3, Output matches the garden's last full year within 1 %;
  - land and carbon carry exactly;
  - a rebuilt first cycle is inside `INFLATE_TOLERANCE`, with Reliability, a one-cycle spread, inside its own 15 % (the question below).
- **The `stepup` check group:** the card, the zoom-out and the allotment's map and panel at 320 px, landscape, tablet and desktop.

## Files

- **New:**
  - `src/data/allotment.ts`, `src/sim/allotment.ts` and its test;
  - `src/ui/StepUpCard.tsx`, `src/ui/AllotmentPanel.tsx`, `src/ui/map/allotment.ts`;
  - `tools/carry.ts`, `tools/checks/carry.mjs`, `tools/checks/stepup.mjs`.
- **Hooks in existing files:**
  - `ladder.ts` (the plan's output, mix and upkeep, and who pays), `clock.ts` (a system's levels), `commands.ts`, `goal.ts`, `state.ts`, `save.ts` and `systems.ts`;
  - `App.tsx`, `MapView.tsx`, `Panel.tsx` and the renderer;
  - the bot.

## Left out

- **Part 8:** agents, the trough's water, swaps, pests spreading, the second plot and the committee.
- **Part 9:** the zoom back in.
- **Part 10:** the allotment's own offer and its sealing.

**The question for the coordinator:** Reliability's 15 % in the `carry` check (`INFLATE_RELIABILITY_TOLERANCE`) is the safer option taken. 5 % can't hold a spread measured over a single cycle of noisy days.
