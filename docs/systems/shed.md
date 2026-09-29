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
- **Not built:** netting (no birds or cabbage whites are modelled yet), peat, a wheelbarrow and the hen house.

## How it fits and grows

1. **Born where:** the garden (level 1): upgrades held on the shed node, bought with £ from the household's purse, each a flow to `bought`.
2. **Across the ladder:** a sealed garden carries its kit in Health (the `kit` part) and its hours saved in the hours it had; the allotment's shared store and tools, the smallholding's tractor and polytunnel, and the farm's machinery are the same pattern (`src/sim/models/machinery.ts`).
3. **Loops:** intensification (tools and a bin now, the soil and the purse later) and waste (the bin). Fast effect: the next week's hours and crop. Slow effect: the soil and the purse.
4. **People:** the gardener uses each tool within their hours; the player buys.
5. **The lever:** a purchase in the Shed tab; the cold frame's place in the plan.
6. **The map:** what's bought is used where it acts (the hose run out from the tap, the frame over its bed).
7. **Explain:** `buying`, `beer trap`, `nematodes` and the rest in `src/data/explain.ts`, each with its source.
8. **Economy and balance:** the bot buys the beer traps on day 2 and everything else by about day 150 on seeds 1 to 3; the purse (about £80 a week) is no constraint on these prices, so each is a trade of what it saves against what it costs besides, not of money.
9. **Carbon and land:** the bin's extra methane goes to the dial; the hose's mains water is counted as water from the `mains` boundary.
10. **Polish:** each offer in one short card with its price, what it saves and its trade, and a Buy button; nothing greyed.
11. **The lesson:** every tool is a trade.
12. **Unfolding:** each offer has its own key, unfolding when the thing it answers first happens.
