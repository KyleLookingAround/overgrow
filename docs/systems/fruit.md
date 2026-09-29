# Soft fruit

The fruit cage's raspberry canes and currant bushes, and the cordon redcurrants on the fence (`src/sim/models/fruit.ts`, with its plausibility test in `src/sim/models/fruit.test.ts`; the `fruit` system runs on the day tick after the crops in `src/sim/systems.ts`). The shed sells the cage (`docs/systems/shed.md`); the gardener picks the fruit (`docs/systems/gardener.md`); the kitchen eats it against the household's fruit (`docs/systems/kitchen.md`).

- **The planting** is the `fruit` node's `bushes` lever (`{planted}`, game hours), dated on the first day after the cage is bought. `maturity()`: nothing the first summer, 0.4 of a full crop the next (from 240 days), all of it from 600 days: summer raspberries fruit on last year's canes and currants on older wood (RHS).
- **Each day** the fruit ripening that day (`ripening()`, a triangle over the season from 1 July through a peak on 19 July to 18 August, summing to one) × 1.6 kg a m² (`FRUIT_YIELD`, RHS's 1.5–2 kg a m² of an established planting) × the cage's cropland × maturity comes in from `growth` to the node's `food.berries` (`fruit ripening`); what's been on the canes goes soft and drops at 1/3 a day (`fruit dropping`, to `decay`, counted as wasted). A 3 × 2 m cage gives about 10 kg a summer once established.
- **Cordon redcurrants** (round three): the `cordons` node along the bottom fence keeps each cordon's planting in its `bushes` lever's `plants` (null until the fruit system's next day dates it). Each gives `CORDON.kg` (1 kg) a summer × its own maturity × the day's ripening, not the cage's yield a m²: a cordon planted in November crops lightly the next July and fully from the one after (tested in `src/sim/models/fruit.test.ts`).
- **Simplifies:** one planting, one season, no pruning, pests, disease or water stress; the bushes never age out.

## How it fits and grows

1. **Born where:** the garden (level 1), a node on the lawn with kg of food as flows.
2. **Across the ladder:** a sealed garden carries its fruit in Output; the allotment's fruit cages and the smallholding's orchard are the same model over more ground.
3. **Loops:** diet (the household's fruit) and money (the cage's slow payback). Fast effect: fruit every few days in July. Slow effect: a crop only from the second summer.
4. **People:** the gardener picks it.
5. **The lever:** buying the cage.
6. **The map:** bushes under a net, with red fruit showing as it ripens (`src/ui/map/draw.ts`).
7. **Explain:** `fruit ripening` and `fruit dropping` (RHS).
