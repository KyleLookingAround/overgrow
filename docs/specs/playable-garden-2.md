# The playable garden, round two

Issue: #58 · Status: Approved. The brief for round two (in #52) approves it in advance, from the owner's decisions 14 and 15. · PRs: (added as they open)

## What the player gets

The garden stays a game all year, not only for its first month:
- money is something to save and choose with;
- beds 3 to 6 come one at a time, each a project;
- there's always a reason to come back each week;
- no bed stands empty without the player's say.

## The mechanism

Each part rests on a real mechanism:
- **The household's budget.** Spending takes most of the wage, leaving the garden a keen grower's budget of about £10 a week (ONS Family Spending).
- **Consumables.** Seed costs money at each sowing (seed catalogue prices), and so do the hens' layers' pellets.
- **Digging.** Lifting turf and digging a bed takes most of a week's spare hours, plus edging boards and bagged compost (RHS; WRAP's PAS 100 analysis).
- **The big buys:**
  - a greenhouse keeps frost off, runs warmer and keeps the tomatoes dry (RHS);
  - soft fruit crops from its second summer (RHS);
  - raised beds drain and warm sooner (RHS);
  - a rainwater tank takes the house roof's rain (RHS);
  - hens lay by day length and eat pellets, and their droppings go to the heap (`src/sim/models/livestock.ts`'s sources; the British Hen Welfare Trust).
- **Gluts.** They are preserved, given away or sold, which cuts household food waste (WRAP).

Fast effect: this week's purse and kitchen. Slow effect: the soil, the fruit's years and savings.

## Where it sits on the ladder

- **The level.** The back garden (level 1). Its rows in the systems web are "Technology and upgrades" and "Money" at level 1, "Livestock" at level 1, the waste row and the diet row.
- **Zoomed out.** A sealed garden carries its kit and hens in Health and its gifts in goodwill. At the allotment, swaps and gifts are that level's currency. At the smallholding, the flock is part 12. The glut decision returns at the market town as surplus and waste policy.

## What they see

- **On the map.** Each purchase stands where it works:
  - the greenhouse's glass;
  - the hens in their run;
  - the fruit cage's net over red fruit;
  - raised beds' boards;
  - the tank by the house.
- **The bed card.** An empty bed asks what's next in the notices' queue, one tap to sow the suggestion.
- **The Shed tab.** Big buys show how far the purse has saved.
- **The Garden tab.** It has one "Sow the empty beds for winter" action, and each bed's winter crop folds into one line.
- **Every size**, from 320 px portrait and landscape to large screens, with one card or notice at a time.

## How it works

The numbers are in `docs/systems/shed.md`, `household.md`, `gardener.md`, `crops.md`, `kitchen.md`, `fruit.md` and `livestock.md`:
- each big buy unfolds when it's worth having;
- the bed card uses the rotation's pick;
- the bot and a player who follows only the goal bar prove the tips.

## Saved state

Version 9:
- the beds' `raised` and `fallow` levers;
- the big buys' nodes, edges and levers once bought.

Before the first release, an older save starts a new game.

## Balance

The brief approves the milestones moving. The baselines are reset later (part 6c). The PR reports:
- the purse over the year;
- each purchase's day;
- the kg eaten, sold, given and wasted;
- the longest quiet stretch;
- the offer's day.

## Checks

- The plausibility test for soft fruit.
- Shed tests for each big buy (land and soil moved, not made; hens fed and laying; fruit from the second summer; the greenhouse's glass).
- Digging tests.
- The bed card's rules.
- The browser checks this changes.

## Files

- `src/sim/` (the shed, gardener, crops, kitchen, household, water and pests, and a new `models/fruit.ts`).
- `src/data/` (the shed, garden, crops, kitchen, household, jobs and unfold).
- `src/ui/` (the Shed and Garden tabs, a new `bed-card.ts`, and the map's drawing and tokens).
- `tools/bot/`.
