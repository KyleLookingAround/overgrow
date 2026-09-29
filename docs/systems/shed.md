# The shed

What the garden can buy and what each thing bought does (`src/data/shed.ts` for the offers and their numbers, `src/sim/shed.ts` for the `shed` system, `src/sim/kit.ts` for the garden's kit, and the Shed tab, `src/ui/ShedTab.tsx`). Tested in `src/sim/shed.test.ts` and the `shed` check group.

- **Buying.** A `buy` command (`src/sim/commands.ts`) is refused until its offer's key (`shed.<id>`, `src/data/unfold.ts`) has unfolded, so an offer is hidden, not greyed, until it's worth having. The `shed` system then refuses what's owned already, a second pack of nematodes while one is still at work, and what the purse (the kitchen's `money`) can't pay for; otherwise the price moves as a flow from the purse to the `bought` boundary and the thing goes into the kit. The command's `upgrades` list in the saved state records every buy, and the command's effect (`buying`, at the thing's place: `placeOf()`) is what the map pulses and the moments read.
- **The kit** is the shed node's `kit` lever (`{owned, nematodes, dry, seeds, fleece, chitted, bare}`), which no plan can set: every system reads it from the graph (`kitOf`, `owns`).
- **The offers** (rough 2027 garden-centre prices), each a trade and each through its mechanism:
  - **Beer traps**, £4 (`shed.beer-trap`, with the first time slugs cost time or money): the `shed` system's day drowns 35 % of each bed's slugs out the night before, with none of the gardener's time; the beer is 80p a week from the purse (`beer for the traps`), and the traps go dry for a week the purse can't pay it.
  - **Hose and reel**, £25 (`shed.hose`, with a day's watering by can past 45 minutes, the gardener's `long watering` note): the `hose` joins the gardener's tools (`src/data/jobs.ts`), the fastest they have for watering, straight from the tap at 12 L a minute with five minutes to run it out and reel it back, no trips; all of it mains water, none of the butt's rain.
  - **Nematodes**, £13 a pack (`shed.nematodes`, with `slugs thriving`, a bed past 12 slugs a m²): for six weeks each dug bed loses 6 % of its slugs a day while the day's mean is 5 °C or more and the soil at least half its water; then the pack is spent (`nematodes spent`) and can be bought again.
  - **Compost bin**, £30 (`shed.compost-bin`, with the first compost spread): the heap breaks down 1.5 times as fast, loses 12 % of its nitrogen instead of 20 %, and makes 1.25 times the methane and nitrous oxide (`src/sim/models/carbon.ts`).
  - **Cold frame**, £40 (`shed.cold-frame`, with the first frost damage or the first empty autumn bed): it goes over the first empty dug bed (the bed's `cover` lever, which a plan command can move to another dug bed), keeps 3 °C of frost off (`shelter`), widens that bed's sowing seasons by three weeks at each end (`coverDays`, `src/sim/models/crops.ts`), and keeps the rain off it (`src/sim/models/water.ts`), so the gardener waters it.
  - **Second water butt**, £40 (`shed.water-butt`, with the butt run dry while there's watering to do, `butt dry`): the butt's cap rises by 200 L.
- **Raised bed**, £45 a bed (`shed.raised-bed`, with the first digging): goes on the next dug bed that isn't raised (the bed's `raised` lever, which no plan can set), widening its seasons 10 days at each end and draining it twice as fast; bought again for each bed.
- **Rainwater tank**, £85 (`shed.water-tank`, with the butt run dry): 350 L more in the store, and half the house's back roof (20 m²) draining into it through a diverter (`src/sim/models/water.ts`).
- **The mid-priced kit** (round three), each unfolding when it first helps and each a smaller trade:
  - **Digging fork**, £22 (`shed.fork`, with the first digging): joins the gardener's tools, digging a m² in 0.8 of the spade's time (`FORK`; `fork` in `src/data/jobs.ts`).
  - **Cloches**, £20 (`shed.cloches`, with the first frost damage or empty autumn bed): go over the first dug bed in the open with nothing in it (cover `cloches`, which a plan can move): 2 °C of frost kept off and the sowing seasons two weeks wider at each end (`COVERS` in `src/data/crops.ts`), and no rain under them.
  - **Propagator**, £25 (`shed.propagator`, once next year's seed is ordered from the catalogue): tomatoes, leeks and marigolds raised from a packet, their seed at 0.35 of a tray of plants (`PROPAGATOR`, `seedCost`).
  - **Bee hotel**, £12 (`shed.bee-hotel`, with the first bees on the flowers): three more bees in the bees' target from April to June (`HOTEL`, `src/sim/models/biodiversity.ts`).
  - **Cordon redcurrant**, £12 each (`shed.cordon`, when bare-root season opens in November, the `bare-root season` note): sold and planted only from November to March (the kit's `bare`), up to six along the bottom fence (`CORDON`); the first makes the `cordons` node from `SITES.cordon`, and each takes 0.3 m² of the lawn (`planting`) and is dated from its own planting (`docs/systems/fruit.md`).
- **The big buys**, each a node put on the map where it works, its land (and for the greenhouse, the lawn's soil under it, a share of each of the lawn's stocks) moved from the lawn by flows (`building`), with the ways it needs (`SITES` and `SITE_WAYS` in `src/data/garden.ts`), and the graph's `rev` raised so the ground is drawn again. The Shed tab shows how far the purse has saved towards each:
  - **Greenhouse**, £320 (`shed.greenhouse`, with the first frost damage or blight): a 6 × 8 ft border cropped like a bed (kind `bed`, cover `greenhouse`, which no plan can take off), planned for tomatoes; no rain falls in it, so the gardener waters it (`docs/systems/crops.md`, "Covers").
  - **Fruit cage**, £150 (`shed.fruit-cage`, with the first bees on the flowers): raspberry canes and currant bushes under a net, cropping from the second summer (`docs/systems/fruit.md`).
  - **Hen house and three hens**, £240 (`shed.hens`, with the first compost spread): `docs/systems/livestock.md`, "Wiring".
- **Not built:** netting over the beds (no birds or cabbage whites are modelled yet), a wormery, a hoe (no weeds are modelled), peat and a wheelbarrow.
- **The purse's line** at the top of the Shed's offers: the week's money in and out and the last big spend (`src/sim/purse.ts`: the kitchen's `purse` lever, tallied from each command's money flows, pay counted as what the job leaves after the shop and the rest of life), then the next big buy to save for in the order hens, greenhouse, fruit cage (`savingFor()`), so one is always in sight. The goal bar's button can open the tab at one offer, which it scrolls to.

## How it fits and grows

1. **Born where:** the garden (level 1): upgrades held on the shed node, bought with £ from the household's purse, each a flow to `bought`.
2. **Across the ladder:** a sealed garden carries its kit in Health (the `kit` part) and its hours saved in the hours it had; the allotment's shared store and tools, the smallholding's tractor and polytunnel, and the farm's machinery are the same pattern (`src/sim/models/machinery.ts`).
3. **Loops:** intensification (tools and a bin now, the soil and the purse later) and waste (the bin). Fast effect: the next week's hours and crop. Slow effect: the soil and the purse.
4. **People:** the gardener uses each tool within their hours; the player buys.
5. **The lever:** a purchase in the Shed tab; the cold frame's place in the plan.
6. **The map:** what's bought is used where it acts (the hose run out from the tap, the frame over its bed).
7. **Explain:** `buying`, `beer trap`, `nematodes` and the rest in `src/data/explain.ts`, each with its source.
8. **Economy and balance:** since round two the purse gains about £10 a week plus the groceries saved and the box's takings, so the shed's kit is a choice. Since round three the bot buys the beer traps on day 2, the small kit over the first 200 days, each piece of mid-priced kit in the months it pays (`WHEN` in `tools/bot/player.ts`), the hens around day 335, then a cordon every three weeks of bare-root season, and digs beds 3 to 6 one at a time as the purse allows: about a purchase or a paid card every two to three weeks.
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
- **The autumn clear-up** (mid-October to November, `LEAVES`, round three): 25 kg of fallen leaves raked onto the heap's waste, with their carbon from the air and their nitrogen (`raking leaves`), once an autumn.
- **Bare-root season** (November to March, round three): a cordon redcurrant planted along the fence for £12 (the answer buys `cordon`), asked every three weeks while the fence has room and the purse the price.
- **Dig or no-dig** (December and January, with an empty dug bed and `garden.soil`, round three, `DIG_OVER`): "Dig them over" turns up 30 % of each empty bed's slugs to the birds and the frost and releases 30 g CO₂e a m² of its humus (`digging over`); "Leave them no-dig" leaves both. Either answers it for the winter.
- **A glut** and **a dry spell** are the kitchen's and the gardener's (`docs/systems/kitchen.md`; the dry-spell card, seven days without rain and none forecast from April to September, raises the watering line to three quarters).
