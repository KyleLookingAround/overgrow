# The shed

What the garden can buy and what each thing bought does (`src/data/shed.ts` for the offers and their numbers, `src/sim/shed.ts` for the `shed` system, `src/sim/kit.ts` for the garden's kit, and the Shed tab, `src/ui/ShedTab.tsx`). Tested in `src/sim/shed.test.ts` and the `shed` check group.

- **Buying.** A `buy` command (`src/sim/commands.ts`) is refused until its offer's key (`shed.<id>`, `src/data/unfold.ts`) has unfolded, so an offer is hidden, not greyed, until it's worth having. The `shed` system then refuses what's owned already, a second pack of nematodes while one is still at work, and what the purse (the kitchen's `money`) can't pay for; otherwise the price moves as a flow from the purse to the `bought` boundary and the thing goes into the kit. The command's `upgrades` list in the saved state records every buy, and the command's effect (`buying`, at the shed) is what the map and the moments read.
- **The kit** is the shed node's `kit` lever (`{owned, nematodes, dry}`), which no plan can set: every system reads it from the graph (`kitOf`, `owns`).
- **The offers** (rough 2027 garden-centre prices), each a trade and each through its mechanism:
  - **Beer traps**, £4 (`shed.beer-trap`, with the first time slugs cost time or money): the `shed` system's day drowns 35 % of each bed's slugs out the night before, with none of the gardener's time; the beer is 80p a week from the purse (`beer for the traps`), and the traps go dry for a week the purse can't pay it.
  - **Hose and reel**, £25 (`shed.hose`, with a day's watering by can past 45 minutes, the gardener's `long watering` note): the `hose` joins the gardener's tools (`src/data/jobs.ts`), the fastest they have for watering, straight from the tap at 12 L a minute with five minutes to run it out and reel it back, no trips; all of it mains water, none of the butt's rain.
  - **Nematodes**, £13 a pack (`shed.nematodes`, with `slugs thriving`, a bed past 12 slugs a m²): for six weeks each dug bed loses 6 % of its slugs a day while the day's mean is 5 °C or more and the soil at least half its water; then the pack is spent (`nematodes spent`) and can be bought again.
  - **Compost bin**, £30 (`shed.compost-bin`, with the first compost spread): the heap breaks down 1.5 times as fast, loses 12 % of its nitrogen instead of 20 %, and makes 1.25 times the methane and nitrous oxide (`src/sim/models/carbon.ts`).
  - **Cold frame**, £40 (`shed.cold-frame`, with the first frost damage or the first empty autumn bed): it goes over the first empty dug bed (the bed's `cover` lever, which a plan command can move to another dug bed), keeps 3 °C of frost off (`shelter`), widens that bed's sowing seasons by three weeks at each end (`coverDays`, `src/sim/models/crops.ts`), and keeps the rain off it (`src/sim/models/water.ts`), so the gardener waters it.
  - **Second water butt**, £40 (`shed.water-butt`, with the butt run dry while there's watering to do, `butt dry`): the butt's cap rises by 200 L.
- **Raised bed**, £45 a bed (`shed.raised-bed`, with the first digging): goes on the next dug bed that isn't raised (the bed's `raised` lever, which no plan can set), widening its seasons 10 days at each end and draining it twice as fast; bought again for each bed.
- **Rainwater tank**, £85 (`shed.water-tank`, with the butt run dry): 350 L more in the store, and half the house's back roof (20 m²) draining into it through a diverter (`src/sim/models/water.ts`).
- **The big buys**, each a node put on the map where it works, its land (and for the greenhouse, the lawn's soil under it, a share of each of the lawn's stocks) moved from the lawn by flows (`building`), with the ways it needs (`SITES` and `SITE_WAYS` in `src/data/garden.ts`), and the graph's `rev` raised so the ground is drawn again. The Shed tab shows how far the purse has saved towards each:
  - **Greenhouse**, £320 (`shed.greenhouse`, with the first frost damage or blight): a 6 × 8 ft border cropped like a bed (kind `bed`, cover `greenhouse`, which no plan can take off), planned for tomatoes; no rain falls in it, so the gardener waters it (`docs/systems/crops.md`, "Covers").
  - **Fruit cage**, £150 (`shed.fruit-cage`, with the first bees on the flowers): raspberry canes and currant bushes under a net, cropping from the second summer (`docs/systems/fruit.md`).
  - **Hen house and three hens**, £240 (`shed.hens`, with the first compost spread): `docs/systems/livestock.md`, "Wiring".
- **Not built:** netting over the beds (no birds or cabbage whites are modelled yet), peat and a wheelbarrow.

## How it fits and grows

1. **Born where:** the garden (level 1): upgrades held on the shed node, bought with £ from the household's purse, each a flow to `bought`.
2. **Across the ladder:** a sealed garden carries its kit in Health (the `kit` part) and its hours saved in the hours it had; the allotment's shared store and tools, the smallholding's tractor and polytunnel, and the farm's machinery are the same pattern (`src/sim/models/machinery.ts`).
3. **Loops:** intensification (tools and a bin now, the soil and the purse later) and waste (the bin). Fast effect: the next week's hours and crop. Slow effect: the soil and the purse.
4. **People:** the gardener uses each tool within their hours; the player buys.
5. **The lever:** a purchase in the Shed tab; the cold frame's place in the plan.
6. **The map:** what's bought is used where it acts (the hose run out from the tap, the frame over its bed).
7. **Explain:** `buying`, `beer trap`, `nematodes` and the rest in `src/data/explain.ts`, each with its source.
8. **Economy and balance:** since round two the purse gains about £10 a week plus the groceries saved and the box's takings, so the shed's kit is a choice: the bot buys the beer traps on day 2, the small kit over the first 150 days, saves up for the hens (about day 250) and the greenhouse (about day 440), and digs beds 3 to 6 one at a time as the purse allows.
9. **Carbon and land:** the bin's extra methane goes to the dial; the hose's mains water is counted as water from the `mains` boundary.
10. **Polish:** each offer in one short card with its price, what it saves and its trade, and a Buy button; nothing greyed.
11. **The lesson:** every tool is a trade.
12. **Unfolding:** each offer has its own key, unfolding when the thing it answers first happens.

## The week's decisions (round two)

Each is a `card` command (`src/sim/commands.ts`), asked once for what it's about (the state's `answered`, the hour each was last answered) by `src/ui/decisions.ts`, one at a time in the notices' queue:
- **The seed catalogue** (December to February, `CATALOGUE`): next year's seed ordered now for £5.50 a dug bed, about a third less than packets at sowing time, or £6.88 a bed for blight-resistant potatoes and tomatoes (a third of blight's start and spread, `resistance()` in `src/sim/kit.ts`); the kit's `seeds` says which garden year it covers, and that year's sowings cost nothing (`seedCost`). "Later" asks again in three weeks.
- **A forecast frost** with tender crops up in the open: fleece over them for a cold spell of four nights (`FLEECE`: 2 °C kept off, the bed's `fleece` lever until then; a £6 roll the first time).
- **Chitting** (February and March, `CHIT`): seed potatoes set out on a windowsill (the kit's `chitted`), so a potato planted within a hundred days starts 70 degree days on (about two weeks sooner).
- **Warming the soil** (February to mid-April, `WARM`): fleece over the empty beds (the bed's `warmed` day), so a fortnight on, their sowing seasons open 14 days earlier for a month.
- **A winter mulch** (November to February, with 10 kg of compost on the heap): the gardener spreads the heap's compost on the dug beds, around what stands the winter (the gardener's `mulch` list).
- **A glut** and **a dry spell** are the kitchen's and the gardener's (`docs/systems/kitchen.md`; the dry-spell card, seven days without rain and none forecast from April to September, raises the watering line to three quarters).
