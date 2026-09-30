# The playable garden, round four: a money ladder and a winter with work in it

Issue: #83 · Status: Approved (by the brief, `docs/briefs/playable-garden-4.md`, under the owner's decisions 15, 19 and 20) · PRs: (added as they open)

## What the player gets

A goal within a few weeks' reach all year. The big buys come in steps, each a real thing with its own use; the goal bar names the next rung, its price and the gap, and opens the Shed at it. The honesty box and the glut card show what they pay, and the box can be kept stocked year-round. Midwinter has real jobs as cards. The year card names the next rung and where the allotment offer stands.

## The mechanism

- **Staged buys.** A hen house and run (a flat-pack house for two to four hens, about £75) stands empty until the hens come, and meanwhile keeps the heap's finished compost dry, so less of its nitrogen washes out (RHS, "Compost": cover the heap). Hens are social and never kept alone (the British Hen Welfare Trust), so they come as a pair (£25 each, point-of-lay hybrids), then a third. A lean-to growhouse (£40) on the house's sunny wall raises the tender crops two weeks bigger before they go out (RHS, "Greenhouses: lean-to"; "Sowing seeds indoors"), before the greenhouse. A potted blackcurrant bush (£15, planted any time; about 4 kg a summer once established, RHS "Blackcurrants") comes before the fruit cage.
- **The box.** "Keep it stocked": the gardener fills the box with up to a day and a half's sales from what the kitchen has beyond the next day's meal, eggs and preserves among it (a jar about £2 for 400 g: £5 a kg). The household buys what it then lacks at the shop: cash now for a little less of the week's veg from the garden (Reliability), a real market gardener's trade.
- **Midwinter jobs** (15 December to February): winter pruning of the cordons and the bush (RHS: an unpruned currant crops about a sixth less as it crowds); seed potatoes and onion sets ordered by post in January (cheaper than the spring's garden-centre packs, when the catalogue hasn't covered them); pots, the frame and cloches washed (RHS "Slugs and snails": slugs shelter under pots, so about a sixth of the beds' slugs go); salad sown in trays on the windowsill (cut-and-come-again leaves, faster in the propagator); the hens' winter care (fresh straw and a check for red mite, the Hen Welfare Trust), which keeps their welfare up through the cold.
- Fast effect: this week's purse and eggs. Slow effect: the hens' and the fruit's years.

## Where it sits on the ladder

The garden (level 1). A sealed garden carries its kit, hens and box takings in its totals; the allotment's swap shed is the box's next step, and the staged buys become the allotment's shared kit.

## What they see

- On the map: the empty run before the hens, the lean-to against the house, the bush by the fence, the box stocked.
- The goal bar's verb names the next rung ("Cold frame: £12 to go", or "Buy the cold frame" once it can), its button opens the Shed there. The glut card lists each choice with what it gives. The Kitchen tab has the box's two settings. The year card has a "Next" line.
- Items the garden can't take (every bed raised, the fence full) are hidden.

## How it works

- `RUNGS` in `src/data/shed.ts` is the ladder's order; the next rung is the first unfolded, not owned and buyable but for the money. A staged buy needs the one before (`after`), and unfolds when it's bought.
- The box's policy is the kitchen's `box` lever (`spare` or `stock`); a card offers "Keep it stocked" when the purse is short of the rung.
- The midwinter cards are week's decisions, asked once a winter, each from its own date so they don't come together.
- Unfolding: from day 3, one "New:" a day; a second batch waits for the next morning.

## Saved state

New kit fields (`pruned`, `sets`, `sill`), the kitchen's `box` lever, the unfold queue; a hen house with no hens is a herd of none. `SAVE_VERSION` rises (no compatibility promise before release).

## Balance

Milestones may move (the brief approves). Targets: the next rung every two to four weeks, the purse never at £0 for over a fortnight, a quiet stretch of about 14 days at most, the goal-bar bot still reaching the offer. The bot reports each purchase's day, the purse by month, the food's fate, the quiet stretch and the offer's day.

## Checks

Vitest for the rungs, the caps, the staged buys, the box policy, each midwinter card (answered and gone), the unfold spacing, and the goal bar's rung; the fruit and livestock plausibility tests for the bush and the empty coop.

## Files

`src/data/shed.ts`, `src/data/kitchen.ts`, `src/data/unfold.ts`, `src/data/explain.ts`, `src/sim/shed.ts`, `src/sim/kit.ts`, `src/sim/models/kitchen.ts`, `src/sim/models/fruit.ts`, `src/sim/gardener.ts`, `src/sim/commands.ts`, `src/ui/goal.ts`, `src/ui/decisions.ts`, `src/ui/ShedTab.tsx`, `src/ui/KitchenTab.tsx`, `src/ui/YearCard.tsx`, the map's draw, `tools/bot/`.

## Left out

A polytunnel (the lean-to is the step), a broad-bean sowing in pots, prices for the box by crop, advisers.
