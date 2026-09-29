# Energy

What each fuel emits and costs, and a pump's, a cold store's and a polytunnel heater's use (`src/sim/models/energy.ts`, its plausibility test `src/sim/models/energy.test.ts`, and its data `src/data/energy.ts`). Written ahead of part 13, which wires it (and part 14's cold chain); nothing in the game calls it yet, and it isn't in `src/sim/systems.ts`. `machinery.ts` burns its diesel through it.

- **Fuels** (`FUELS`, `co2e()`, `costOf()`, `kWhOf()`): rough 2025–26 DESNZ (formerly BEIS) and DEFRA conversion factors: diesel 2.7 kg CO₂e a litre, petrol 2.3, grid electricity 0.2 a kWh, gas 0.18 a kWh; the energy in a litre (diesel 10.7 kWh, petrol 9.6); and rough 2026 prices (red diesel 85p a litre, electricity 27p a kWh, gas 7p).
- **A pump** (`pumpKWhPerM3()`, `pumpKWh()`): ρ·g·h over an efficiency of 0.45, so a cubic metre through 10 m takes about 0.06 kWh.
- **A cold store** (`coldStoreKWh()`): about 0.6 kWh a m³ a day at 15 °C outside, 0.04 more for each degree warmer: a 20 m³ room about 12 kWh a day, and never below 0.1 kWh a m³ a day (the compressor and fans run even in a frost).
- **A tunnel heater** (`tunnelHeatKWh()`): conduction through the cover (6 W a m² of single polythene cover and kelvin, the cover 2.2 times the floor) to hold 5 °C, divided by the heater's efficiency (electric 1, gas 0.85): none above 5 °C outside, about 47 kWh a day at freezing for 30 m². The system judges it on the night, halfway between the day's mean and its minimum, so a mild day with a frosty night still runs it.
- **Every use is flows** (`burn()`, `pump()`, `loadDay()`): the fuel's energy in kWh from `bought` (electricity from `grid`) to the burning node's `energy.used` stock; its carbon in kg CO₂e from `bought` to the air node's `carbon`; and its price in £ from a payer's `money` stock (the household's) to `bought`. So the carbon account stays whole, and the dial reads it.
- **Fast effect** a day's bill and its carbon, and a frosty night's heater; **slow effect** the running total of energy used and carbon emitted, which the dial and the farm's account carry for years.
- **Speed**: the `energy` system with 20 stores, each with two loads, is part of the 0.14 ms a game day the three models take together (with 20 workers and 50 fields), measured headless in Node 22 on a 2.1 GHz Xeon.

## Hooks for the levels above

Added for the owner's answers on #29 (a lever, nothing wired):

- **The index the level above sets** (`EnergyIndex`, the `energy.index` lever, `indexOf()`): `gridCo2e`, the grid's kg CO₂e a kWh (it falls as the grid decarbonises), and `price`, a multiple by fuel of `FUELS`' price (1 is as now). `co2e()`, `costOf()`, `burn()` and `pump()` take it as an optional last argument; `burn()` finds it itself on the burning node's lever, else the payer's, else uses none, so a machine's diesel, a pump and the standing loads all follow it and the carbon account stays whole (the flow to the air is the indexed figure). Only electricity's carbon follows the grid; a fuel's price follows its own multiple. Without an index everything is as it was. It has no lag, tariff structure or standing charge.

## Wiring

For part 13 (and part 14's cold chain):

- **Nodes, stocks and levers.** A node that burns anything has an `energy.used` stock in `kWh` (a flow may make it); a node with standing loads has a `loads` lever, a list of `{kind: 'cold store', m3}` or `{kind: 'tunnel heater', m2, fuel}`. Nothing needs adding to `graph.ts`: `kWh`, `GBP` and `kgCO2e` are already units, and `bought`, `grid` and `time` are already boundaries.
- **Air.** `burn()` sends carbon from the `bought` boundary straight to the air node's `carbon` stock, so no `air-<place>` edge is needed for it.
- **System.** Add `energy` to `src/sim/systems.ts` after the weather. Each `day` it runs every node's loads against the day's mean temperature and takes the household's money (`PURSE`, `'kitchen'`; pass `state.home` if that changes).
- **Uses.** Pumps (`pump()` from the watering job), tractors (`machinery.ts`) and later lorries call `burn()` directly with the node they belong to.
- **Map and panel.** Show a small exhaust puff at a burning machine and a steam from a heater, sized by the day's kWh; the panel shows the day's bill in £ and kg CO₂e by fuel from the flows' `what`. An Explain card names the factor and DESNZ as the source.
