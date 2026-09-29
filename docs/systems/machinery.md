# Machinery

A second-hand tractor's fuel and hours, its breakdowns and repairs, and the compaction its wheels leave (`src/sim/models/machinery.ts`, its plausibility test `src/sim/models/machinery.test.ts`, and its data `src/data/machinery.ts`). Written ahead of part 13, which wires it; nothing in the game calls it yet, and it isn't in `src/sim/systems.ts`. It burns its fuel through the energy model (`docs/systems/energy.md`).

- **What a job takes** (`jobOf()`, `handHours()`): diesel and hours a hectare by operation from typical UK contractor and farm energy audit figures, ploughing 24 L and 1.4 h (drilling 7 L, spraying 1.5 L, harvesting 18 L), against by-hand hours a hectare (ploughing 400) so a tractor does a spade's month in a day.
- **Breakdowns** (`hazardPerHour()`, `breakdownChance()`, `work()`): the chance an hour of work ends in one is 0.15 % when new and serviced, times (1 + age / 8), times (1 + (hours since service / 250)²). The used tractor (15 years, 5,000 hours) is about three times that; left unserviced a while, about ten times. `work()` draws from the passed `Rng`: a break stops the job part done (the rest waits), sets it down for one to three days and comes with a bill (`repairCost()`, about £250 × (1 + age / 10), spread 0.4 to 1.6 times). `expectedRepairPerHour()` is ASABE D497's curve, which the game's average bill is tested against.
- **Service** (`service()`): about £350; the hours since service go to nothing.
- **Compaction** (`wheelings()`, `wheelRisk()`, `recovered()`): a field's `compaction` lever is points of structure lost, 0–100. A pass adds 8 points at the worst, times the wheel share of the operation (a plough's furrow wheel half the field, a sprayer's tramlines 15 %), the axle load over 3 tonnes, and the ground's wetness: at or over field capacity every pass counts, and dry ground (below three-quarters of it) takes a twentieth. Less is left to lose as it fills. It fades by freeze and thaw, roots and worms, half in five years. `wetnessOf()` reads a bed's water over its field capacity from the soil model.
- **Structure and yield** (`compactedStructure()`, `yieldFactor()`): structure (0–100, part 2's organic carbon to clay ratio) less the compaction's share, and yield at 1 − 0.3 × compaction: a typical compacted field (about 40 points) loses about 12 %, Håkansson & Reeder's 10–15 %.
- **Fast effect** a lost day, or three, at harvest, and its bill; **slow effect** a compacted field losing structure and yield for years.
- **Speed**: `operate()` takes about 5 µs a job in Node 22 (a 2.1 GHz Xeon); the `machinery` system, with 50 fields, is part of the 0.14 ms a game day the three models take together with the `labour` and `energy` systems and 20 workers and 20 loaded stores.

## Hooks for the levels above

Added for the owner's answers on #29: nothing changes in the model itself. A job's diesel is burnt through the energy model, so the energy index a level above sets (fuel prices, the grid's carbon factor; `docs/systems/energy.md`) on the tractor's node or the payer's changes what a job costs, with the litres, hours, wear and compaction the same; a test holds it. A driver's hours are `Job.hours` and are paid through the labour model's wages (`payWages`), which the wiring part (13) joins.

## Wiring

For part 13:

- **Nodes and levers.** The tractor is a `Tractor` in a `tractor` lever on a node (the shed, or a `machine` node the map draws); a field carries a `compaction` lever (a number). Both are replaced, never changed in place.
- **Boundaries and stocks.** None new: diesel is bought (`bought`) and burnt through `burn()`, its energy in the node's `energy.used` stock (see the energy notes), and repairs and services are paid from the household's `money` to `bought`.
- **System.** Add `machinery` to `src/sim/systems.ts`. Each `day` compaction fades and a broken tractor is a day nearer mended.
- **Soil.** Part 2's `structure()` (in `src/sim/models/soil.ts`) must subtract the field's compaction (`compactedStructure()`), so `health` and the soil's card feel it; and the crop model must multiply a field's yield by `yieldFactor()`. Neither file is edited here.
- **Commands.** Working a field (`operate()`), servicing (`service()`), and whether to work when the ground is wet are part 13's; the Explain card on a compacted field should show the wetness on the days it was wheeled.
- **Map and panel.** The tractor drawn on its job, its `downDays` shown as a stopped machine, and a field's compaction as a paler, tighter ground.
