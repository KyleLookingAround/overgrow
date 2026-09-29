# How the game works

The project notes (`CLAUDE.md`) hold what every change needs. This file holds how the code is laid out, how it's tested, and the rules shared by every system; each system has its own file in `docs/systems/`. Read the file for the system you're changing, not all of them (`node tools/graph.mjs <name>` finds it). Keep it true: a PR that changes how something works updates its system's file in the same PR, and a new system adds its own file there. The lists below between `joined` markers are built by `node tools/join.mjs` (`npm run build` runs it), so never edit them by hand.

Today the game is the back garden on the graph, with the clock, saving and the page's shell (the first slice's part 1), the weather, the soil and the water under it (part 2), and the crops, the gardener, the kitchen with its honesty box, and the compost heap (part 3). The founding spec (`docs/specs/overgrow.md`) sets the model: one graph of nodes and flows at every scale, from a bed to the planet (`docs/decisions/ADR-2026-09-28-scale-free-graph.md`), with real mechanisms and rough numbers (`docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`).

## Systems

<!-- joined:systems from docs/systems/ by tools/join.mjs: don't edit between these lines -->
- [Carbon and land](systems/carbon.md) (`src/sim/models/carbon.ts`, `src/sim/models/carbon.test.ts`, `src/sim/gardener.ts`, `src/sim/models/soil.ts`, `src/ui/TopBar.tsx`)
- [The clock](systems/clock.md) (`src/sim/clock.ts`, `src/data/ladder.ts`, `src/sim/systems.ts`, `src/app/clock-loop.ts`)
- [Commands and snapshots](systems/commands.md) (`src/sim/commands.ts`, `src/sim/index.ts`, `src/sim/state.ts`, `src/sim/activity.ts`, `src/app/sim.worker.ts`, `src/app/sim-client.ts`, `src/app/delta.ts`, `src/app/bench.ts`)
- [Crops](systems/crops.md) (`src/sim/models/crops.ts`, `src/sim/models/crops.test.ts`, `src/data/crops.ts`, `src/sim/models/water.ts`, `src/ui/map/draw.ts`, `src/ui/GardenTab.tsx`)
- [Energy](systems/energy.md) (`src/sim/models/energy.ts`, `src/sim/models/energy.test.ts`, `src/data/energy.ts`, `src/sim/systems.ts`)
- [The gardener](systems/gardener.md) (`src/sim/gardener.ts`, `src/sim/gardener.test.ts`, `src/data/jobs.ts`, `src/sim/models/crops.ts`, `src/sim/models/kitchen.ts`, `src/sim/models/carbon.ts`, `src/ui/map/renderer.ts`, `src/ui/GardenTab.tsx`)
- [The graph](systems/graph.md) (`src/sim/graph.ts`, `src/sim/state.ts`, `src/data/garden.ts`, `src/sim/churn.ts`)
- [The household economy](systems/household.md) (`src/sim/models/household.ts`, `src/sim/models/household.test.ts`, `src/data/household.ts`, `src/sim/systems.ts`, `src/sim/models/labour.ts`)
- [The kitchen](systems/kitchen.md) (`src/sim/models/kitchen.ts`, `src/sim/models/kitchen.test.ts`, `src/data/kitchen.ts`, `src/data/garden.ts`, `src/ui/KitchenTab.tsx`)
- [Labour](systems/labour.md) (`src/sim/models/labour.ts`, `src/sim/models/labour.test.ts`, `src/data/labour.ts`, `src/sim/systems.ts`)
- [The carry-over rule (sealing, events across scales and the step-up test)](systems/ladder.md) (`src/sim/ladder.ts`, `src/sim/ladder.test.ts`, `src/data/ladder-rules.ts`, `src/data/ladder.ts`)
- [Machinery](systems/machinery.md) (`src/sim/models/machinery.ts`, `src/sim/models/machinery.test.ts`, `src/data/machinery.ts`, `src/sim/systems.ts`)
- [The map and the page's shell](systems/map.md) (`src/ui/App.tsx`, `src/ui/TopBar.tsx`, `src/ui/MapView.tsx`, `src/ui/map/renderer.ts`, `src/ui/map/draw.ts`, `src/ui/Panel.tsx`, `src/ui/GardenTab.tsx`, `src/ui/KitchenTab.tsx`)
- [Saving](systems/saving.md) (`src/sim/save.ts`, `src/sim/random.ts`, `src/app/storage.ts`, `src/app/main.tsx`)
- [Soil](systems/soil.md) (`src/sim/models/soil.ts`, `src/sim/models/soil.test.ts`, `src/data/soils.ts`, `src/data/garden.ts`, `src/sim/state.ts`, `src/ui/Panel.tsx`)
- [Water](systems/water.md) (`src/sim/models/water.ts`, `src/sim/models/water.test.ts`, `src/sim/models/soil.ts`, `src/sim/models/crops.ts`, `src/data/garden.ts`, `src/ui/Panel.tsx`, `src/ui/map/draw.ts`)
- [The weather](systems/weather.md) (`src/sim/models/weather.ts`, `src/data/climate-normals.ts`, `src/sim/models/weather.test.ts`, `src/ui/map/draw.ts`, `src/ui/map/renderer.ts`, `src/ui/TopBar.tsx`)
<!-- /joined:systems -->

## Layers

Four folders under `src/`, and the `rules` check keeps them apart:

| Folder | What's in it | May import |
| --- | --- | --- |
| `src/sim/` | The simulation: the graph, the clock, the models (`src/sim/models/`, one file per mechanism), commands and snapshots. Pure TypeScript, no DOM, no `Math.random()` outside `src/sim/random.ts` except on a `// cosmetic` line. | `src/sim/`, `src/data/` |
| `src/data/` | Real-world parameters: crops, soils, climate normals, countries. Plain typed data. | `src/data/` |
| `src/app/` | The page's glue: the worker that runs the sim (`sim.worker.ts`), the client that talks to it (`sim-client.ts`), the clock loop, saving, `main.tsx`. | anything |
| `src/ui/` | Preact panels and the map (PixiJS, with Pixi's Canvas 2D renderer as the fallback), with every colour and size in `src/ui/styles/tokens.css`. Drawing is cosmetic, derived from the sim's flows, and may use `Math.random()` on a `// cosmetic` line. | `src/ui/`, `src/app/`, the sim's types and pure functions (by convention; not checked) |

The `rules` check enforces the first two rows: the sim and its data import nothing from `src/ui/` or `src/app/`, and data nothing from the sim. Every source file starts with a `//` comment saying what's in it; the table below shows each one's first sentence. `index.html` is the page's skeleton and loads `src/app/main.tsx`.

<!-- joined:files from src/, each file's opening comment by tools/join.mjs: don't edit between these lines -->
| File | What's in it (its opening comment) |
| --- | --- |
| `src/app/bench.ts` | A check-only synthetic scene for measuring the speed budget (docs/SYSTEMS.md, "Speed budget"): a snapshot of n nodes shaped like the garden's, a tenth of them changing each hour, with n people walking between them on trips of two to eight hours, built in the worker so its copy across the worker boundary is measured like a real tick's. |
| `src/app/clock-loop.ts` | The real-time loop: turns real seconds into the sim's fixed steps at the level's rate and the chosen speed (the ladder, src/data/ladder.ts), and gives the map a view time between two snapshots to interpolate at. |
| `src/app/delta.ts` | Snapshot deltas across the worker boundary: after the first snapshot, the worker sends only the nodes whose stocks, levers or totals changed and the activities that started or ended, and the page patches its copy. |
| `src/app/main.tsx` | Starts the page: the stylesheet, the simulation worker, the save, the clock loop and the UI. |
| `src/app/sim-client.ts` | The page's end of the simulation: commands go to the worker (src/app/sim.worker.ts) and snapshots come back. |
| `src/app/sim.worker.ts` | The simulation in a Web Worker: the page posts commands, the worker answers with snapshots, so a big graph ticking never stalls the map on a phone. |
| `src/app/storage.ts` | The save's home on the device: localStorage under the one key (src/sim/save.ts has the format). |
| `src/data/climate-normals.ts` | The garden's climate: monthly normals for an invented lowland station in southern England, about 60 m up at 51.5° N, with the daily spread the weather generator (src/sim/models/weather.ts) draws around them. |
| `src/data/crops.ts` | Crops: the six the back garden grows, with what the crop model (src/sim/models/crops.ts) needs of each. |
| `src/data/energy.ts` | Energy: what each fuel emits and costs, and the loads a smallholding puts on it. |
| `src/data/garden.ts` | The back garden's layout: a UK back garden about 12 × 8 m behind the house, with six bed plots (two dug), a tap, a water butt, a compost heap, a shed, the lawn, the kitchen and an honesty box by the side gate, and the paths and pipes between them. |
| `src/data/household.ts` | The household economy's numbers: who lives in the household, their jobs and hours and wages, the weekly shop and its footprint, and the income deciles the same functions serve one level up. |
| `src/data/jobs.ts` | The gardener's time: the hours they have, how fast they walk, and how long each job takes with each tool. |
| `src/data/kitchen.ts` | The kitchen: what the household wants of the garden each day, and the honesty box at the gate. |
| `src/data/labour.ts` | Labour: the hours a person has, the work a hectare of each crop needs by month, what a person costs, and how skill changes the time a job takes. |
| `src/data/ladder-rules.ts` | The carry-over rule's numbers: each level's rhythm (the window its headline numbers are taken over), what goes into the Health index, how a sealed node's Health drifts and what it costs, the tolerance of inflating, and the step-up offer's test. |
| `src/data/ladder.ts` | The ladder's clock: each level's rate (real seconds per game day at 1×) and the length of the sim's fixed step, the speeds, and the date the game starts on. |
| `src/data/machinery.ts` | Machinery: what a small second-hand tractor and its implements use, how fast they work against hand work, when they fail and what fails costs, and how hard their wheels press on wet ground. |
| `src/data/soils.ts` | Soils: the textures the garden's beds and lawn are made of, and what a soil starts with. |
| `src/sim/activity.ts` | Activities: who is doing what, where, from when to when (the gardener watering bed 3 from 08:00 to 08:20; a lorry on a run leaving at 05:00). |
| `src/sim/churn.ts` | A test-only system that moves random flows of every kind across the garden each hour and starts an activity each day, so the conservation, save and long-run tests exercise the graph before the real models arrive (parts 2 and 3). |
| `src/sim/clock.ts` | The one clock: game hours since the start, advanced in fixed steps (an hour at levels 1 and 2, a day at 3 to 5, a week at 6 and 7, a month at 8), with the calendar for the top bar and the ticks systems subscribe to (hour, day, week, season, year). |
| `src/sim/commands.ts` | Commands: every way of changing the game, from the player, a manager or the bot alike. |
| `src/sim/gardener.ts` | The gardener: one person with about four hours a day for the garden (six at weekends), who does everything the plan and the garden call for. |
| `src/sim/graph.ts` | The graph every level is made of (docs/decisions/ADR-2026-09-28-scale-free-graph.md): nodes with stocks, levers and totals whatever their size, edges between them, and flows in SI units that are conserved. |
| `src/sim/index.ts` | The simulation: pure TypeScript with no DOM, so the same code runs in a Web Worker (the game, src/app/sim.worker.ts), in Node (the checks and the bot) and in a Vitest test. |
| `src/sim/ladder.ts` | The carry-over rule's maths, pure: a small history a level keeps and the five headline numbers taken from it, a sealed node's tick, an event shown at any level, inflating's target and layout key, and the step-up offer's test. |
| `src/sim/models/carbon.ts` | Carbon and land: the compost heap, compost going back to the beds, and digging a bed out of the lawn. |
| `src/sim/models/crops.ts` | Crops: what grows in each dug bed, from sowing to the compost heap. |
| `src/sim/models/energy.ts` | Energy: what fuel and electricity emit and cost, what a pump, a cold store and a polytunnel heater use, and every use as flows: the fuel in from `bought` (electricity from `grid`) to the place that burns it, its carbon to the air node, and its price out of the purse. |
| `src/sim/models/household.ts` | The household economy: who lives in the household, their jobs, hours and wages, the weekly shop, what shop food carries in carbon, land and water, the purse, and the same baskets summed over many households (an allotment's neighbours, a box scheme's customers, a town's income deciles). |
| `src/sim/models/kitchen.ts` | The kitchen: the household's daily ask of the garden, what met it, and the honesty box at the gate. |
| `src/sim/models/labour.ts` | Labour: the hours a person has by season and day of the week, the work a hectare of each crop needs by month, what a role costs, how skill stretches a job's time, and what doesn't fit waiting. |
| `src/sim/models/machinery.ts` | Machinery: a second-hand tractor's fuel and hours by operation against hand work, its breakdowns (a hazard rising with its age and the hours since it was serviced, drawn from a passed Rng), what repairs and services cost, and the soil compaction its wheels leave on wet ground, which takes structure off the soil and so yield. |
| `src/sim/models/soil.ts` | Soil: what each bed and the lawn is made of, how much water it holds, its organic matter and nutrients, and its health. |
| `src/sim/models/water.ts` | Water: the FAO-56 soil water balance for each bed and the lawn, every step. |
| `src/sim/models/weather.ts` | The weather: a daily stochastic weather generator of the Richardson type, drawn from the station's monthly normals (src/data/climate-normals.ts) and bent by the warming index, with each hour shaped from its day for the hour tick. |
| `src/sim/random.ts` | The seeded random generator. |
| `src/sim/save.ts` | The save format: versioned JSON, with a migration step per version once the game is released. |
| `src/sim/state.ts` | The game's state, what a new game starts from, and the snapshot the UI is shown. |
| `src/sim/systems.ts` | The systems that run on the clock's ticks, in the order they run. |
| `src/ui/App.tsx` | The page: the top bar, the map filling the rest, and the panel beside or below it (the founding spec, "The look: a living map"). |
| `src/ui/GardenTab.tsx` | The Garden tab: the gardener's card (the day's hours ticking down and the job in hand) and the plan (what to sow in each dug bed and from when, or the rotation, and the moisture below which the gardener waters). |
| `src/ui/KitchenTab.tsx` | The Kitchen tab: the day's ask by group and what met it at the last meal, the last week's share, what's in the kitchen and at the honesty box, and the running totals: picked, eaten, sold (and what the box took) and wasted. |
| `src/ui/MapView.tsx` | The map: one canvas filling its box, drawn by the renderer (src/ui/map/renderer.ts) every frame the clock loop gives it. |
| `src/ui/Panel.tsx` | The panel: beside the map on wide screens and tablets, below it as a sheet on portrait phones (which can fold down to its heading), beside it on a phone on its side. |
| `src/ui/TopBar.tsx` | The top bar: the level, the date and time with the air's temperature, the money, the carbon dial, and pause with the three speeds. |
| `src/ui/format.ts` | Numbers and dates as the panels show them: concise, UK English, units always named. |
| `src/ui/map/daylight.ts` | How dark the map is at a game hour: the sun's day length at a southern-English latitude from the date, with an hour's twilight either side. |
| `src/ui/map/draw.ts` | How each kind of node is drawn, in the owner's pick of art style (docs/specs/overgrow/art-styles.html, style A): flat, top-down and soft, rounded shapes with no outlines and soft shadows, in greens, soil browns and cream. |
| `src/ui/map/palette.ts` | The map's colours, read from the design tokens (src/ui/styles/tokens.css) so light and dark follow the device. |
| `src/ui/map/renderer.ts` | The map's renderer: PixiJS on WebGL, or Pixi's Canvas 2D renderer where WebGL is missing (docs/decisions/ADR-2026-09-28-webgl-map.md). |
| `src/ui/styles/page.css` | The page's skeleton: the top bar across the top, the map filling the rest, and the panel beside it on wide screens |
| `src/ui/styles/tokens.css` | Design tokens: every colour, size and font the UI uses, in one place. |
<!-- /joined:files -->

## State

- **Snapshot and runtime.** The sim owns the game's state and gives the UI a `Snapshot` after each command. Anything that can be rebuilt from the snapshot, and everything only the screen needs (the camera, animations, panel state), lives in the UI and is never saved.
- **Saves** (`docs/systems/saving.md`): versioned JSON in `localStorage['overgrow-save-v1']`, the only key (`src/sim/save.ts`; the storage side is `src/app/storage.ts`). The save is the whole `State` (`src/sim/state.ts`) less `rejected` and `errors`, with the generator's state, so a loaded game plays on exactly as it would have. It's written after a new game, every game day, after any command that isn't a tick, when the page is hidden and on leaving. Until the first release there's no compatibility promise: a change to the saved shape raises the version, and an older save starts a new game (`docs/decisions/ADR-2026-09-29-no-save-compatibility-before-release.md`). From the first release on, never rename or remove a saved field, and add a migration step per version; the first release adds `tools/saves/` fixtures and a `migrate` check (the `release` playbook).

## Time

One clock for every level, in game hours since the start (`docs/systems/clock.md`). Each level sets how many real seconds a game day takes at 1× (`src/data/ladder.ts`, from the spec's ladder), so the clock speeds up as the player zooms out and slows when they zoom back in; the speeds are pause, 1×, 2× and 4×. The sim advances in fixed steps (an hour at levels 1 and 2, a day at 3 to 5, a week at 6 and 7, a month at 8) from 06:00 on Monday 15 March; systems subscribe to its ticks (hour, day, week, season, year) from their own files, listed in `src/sim/systems.ts`, so adding a system never edits another's, and each draws its own dice. The real-time loop that turns seconds into steps is on the page (`src/app/clock-loop.ts`), not in the sim, and only runs while the page is showing.

## The sim in a worker, and headless

- The page runs the sim in a Web Worker (`src/app/sim.worker.ts`): the UI posts commands and gets snapshots back, as deltas after the first (`src/app/delta.ts`), so a big graph never stalls the map on a phone.
- The checks and the bot skip the worker and call `createSim()` from `src/sim/index.ts` in Node directly. The sim never has two ways of being driven: **every player action, manager action and bot action is a command.**
- **Randomness.** Anything that can change the game draws from the game's `Rng` (`src/sim/random.ts`). The page's first command is `new-game` with `window.__seed` when the checks set it, or a fresh seed (`src/app/main.tsx`; a save will carry its own), so a seeded run repeats exactly. The `rules` check rejects `Math.random()` anywhere else on a line that doesn't end with `// cosmetic`.
- **`window.__sim`** (`src/app/main.tsx`), only when `window.__seed` is set, for the browser checks: `send(cmd)` (a command, resolving to its snapshot), `snapshot()` (the newest), `save()` (the save text), `view()` (the view time, `alpha` between the `prev` and `cur` snapshots' hours, the `renderer` in use, the last `frames`' draw times in ms, where the first `movers` are drawn and the camera), `bench(n, m, speed)` (the check-only synthetic scene of n nodes and m people at a speed, 4× unless given; `bench(0)` returns to the game) and `copyTimes()` (each tick's copy across the worker boundary: `read` and `patched` on the page, `written` in the worker). The `scene` and `layout` checks use them; the checks put the game where they need it by commands, never by reaching into its state.

## Speed budget

The founding spec's budget, measured on part 1's build (28 Sep 2026) and shared out between the slice's parts. The `scene` check logs the page figures on every run (the "scene: speed" lines); `src/sim/index.test.ts` holds the garden day. The `perf` check that asserts them comes with part 15; until then each part's brief carries its share, and a part that needs more says so in its PR. Part 2 (the weather, the water and the soil) used, measured the same way against a build of `main` on the same machine: 0.17 ms a garden day headless; 0.1 ms of the garden's 1440 × 900 frame (0.4 → 0.5 ms, and about 0.1 ms more again in heavy rain or frost); nothing measurable of the 5,000-node scenes or of the tick's copy; and 7.5 KB of `dist/` gzipped. Part 3 (the crops, the gardener, the kitchen and the heap) used, measured the same way: about 0.22 ms a garden day headless (0.37 → 0.6 ms with every system against the weather, water and soil alone), so parts 2 and 3 together take about 0.42 ms of their 0.5; about 0.1 ms of the garden's 1440 × 900 frame (0.5 → 0.6 ms, the crops and the carried items drawn each frame); the garden's copy still about 0.1 ms a tick (the gardener's hours and day and the crops' levers); nothing measurable of the 5,000-node scenes (one figure a person now needs the activities grouped once a snapshot); and about 12 KB of `dist/` gzipped.

**How it was measured.** The garden day in Node 22 with `vite-node` on the session's 4-core 2.1 GHz Xeon: a year of hourly ticks after a warm-up, per game day. The page in the pinned headless Chromium (Playwright 1.56.1) on the same machine, with WebGL on SwiftShader (software: there is no GPU here), so the figures are the JavaScript each frame costs (the renderer's `draw`, including Pixi's work to submit it), not the GPU's; the frame rates the check logs (5 to 10 a second) are SwiftShader's limit, not the game's. "A phone" is a 390 × 844 touch page with Chromium's 4× CPU throttling, which slows the page's thread and not the worker's. The synthetic scene (`src/app/bench.ts`) runs at the garden's 4× (four ticks a second) with 5,000 nodes, a tenth of them changing each tick, and 5,000 people on trips of two to eight hours (about a thousand starting each tick), or 50 people for the nodes alone.

| Budget | Measured on part 1 | Shell and graph (part 1) | Parts 2 and 3 | Parts 5 to 14 |
| --- | --- | --- | --- | --- |
| A garden game day headless in Node: under 2 ms | 0.15 ms (the clock, the snapshot each hour, no systems yet); 0.30 ms with the test system moving eleven flows an hour | 0.5 ms | 0.5 ms between them | 1.0 ms |
| A frame at 1440 × 900 with everything moving: under 6 ms | 0.4 ms for the garden (p95 2 ms); 1.2 ms with 5,000 people over 5,000 nodes | 1.5 ms | 1.5 ms between them | 3 ms |
| 5,000 moving things on a phone (4× throttled): under 8 ms a frame | 5.4 ms (p95 34 ms, the frames that also take a tick); 2.2 ms with 50 people over the same nodes | 5.4 ms: measurement says the renderer takes more than a quarter here | 1 ms between them | 1.6 ms |
| A tick's copy across the worker boundary on a phone: under 2 ms (the spec's trigger for deltas) | whole snapshots: 94 ms for 5,000 nodes and 5,000 people, so deltas are on from part 1; with deltas, 3.6 ms for 5,000 nodes (1.5 ms reading, 1.4 ms patching) and 9.7 ms with a thousand trips starting a tick; the garden's is under 0.1 ms | the garden's 0.1 ms | 0.4 ms between them (the garden's stocks and the gardener's jobs) | 1.5 ms |
| `dist/` under 500 KB gzipped | 175 KB for what the page loads (Pixi about 150 KB of it); 768 KB with the source maps, which browsers fetch only for the developer tools | 175 KB | 50 KB between them | 275 KB |

- **The copy at scale.** A garden's copy is nothing; 5,000 nodes are levels 6 and up, past the slice. With deltas the node-only copy is still near twice the 2 ms trigger, so the part that first draws thousands of nodes should take the next step the spec's choices table names: stocks as typed arrays transferred without copying, or the renderer in the worker (OffscreenCanvas).
- **The movers at scale.** 5,000 people cost the renderer about 1 µs each a frame throttled. Levels 6 to 8 draw most movers from flows, not activities (a route's lorries in proportion to its tonnes), so their part budgets the drawing, not the copy.
- The shares follow the brief's starting point (a quarter each to the shell and to parts 2 and 3, the rest held) except where measured otherwise, as marked.

## Build

- `npm run build` (`tools/build.mjs`) refuses to run on a broken rule (`tools/rules.mjs`), runs `vite build` into `dist/`, writes `docs/graph.json`, and rejoins the joined lists. `dist/` is the static site Pages publishes; every asset is referenced relatively (`base: './'` in `vite.config.ts`) so it works under the repo's sub-path.
- `npm run dev` starts Vite's dev server with hot reload.
- Runtime dependencies are exactly `preact`, `d3-geo` and `pixi.js` (`docs/decisions/ADR-2026-09-28-static-site-typescript.md`, `docs/decisions/ADR-2026-09-28-webgl-map.md`). The world is generated from the seed, so there is no map data to ship. Another dependency needs a decision record.

## Checks

`npm install` once (web sessions do it at start-up through the session-start hook), then `npm run check`, which runs in order:

1. `npm run build` (above).
2. `tsc --noEmit`: the types.
3. `vitest run`: every `src/**/*.test.ts`. The sim's tests live beside the code they test: a long headless run that repeats from its seed, survives a save and load mid-run and keeps a garden day under 2 ms (`src/sim/index.test.ts`), the `conservation` test (`src/sim/conservation.test.ts`), the graph, clock, commands, activities and saving (`src/sim/*.test.ts`), the worker's deltas (`src/app/delta.test.ts`), the generator (`src/sim/random.test.ts`), and a plausibility test per model as the models arrive. They run in Node in milliseconds, so a test can play years.
4. `node tools/check.mjs`: the check groups in `tools/checks/`, one file each, in file-name order. `node tools/check.mjs <group>` runs one. A group gets `open` (the built page over HTTP at a viewport, seeded), `ok`, `root`, `out`, `url`, `SAVE_KEY` and `browser`; a group that needs no browser (brief, graph, rules) just doesn't call `open`. Its opening comment says what it covers, and the list below is built from those comments: add a group by adding a file.

- **Playwright** is pinned to 1.56.1, whose Chromium (build 1194) the web image already has. If Chromium is missing, set `CHROMIUM_PATH` to an existing binary (the session-start hook does this for `/opt/pw-browsers/chromium`). Change the pin only together with the lock file. CI caches `~/.cache/ms-playwright`, keyed on the pin.
- **Looking at UI changes.** Write a small Playwright script in `build/` (git-ignored) against `npm run dev` or the served `dist/`, at 320×568, 568×320, 390×844, 844×390 (`hasTouch`, `isMobile`), 768×1024 and 1440×900; screenshot and read the images. Measure before fixing a layout bug, not after each attempt.
- **CI's limit.** The `check` job has `timeout-minutes: 25`, well over a local run.

<!-- joined:checks from tools/checks/, each file's opening comment by tools/join.mjs: don't edit between these lines -->
- `brief`: docs/briefs/TEMPLATE.md and every session brief in docs/briefs/ have all their sections, filled in (tools/brief.mjs), and a brief without "How it fits and grows" fails unless it's one started before that section.
- `build`: The built page (dist/, from vite build): it exists, loads nothing from elsewhere but fonts, opens without errors, says "Overgrow", gets an answer from the simulation worker, and has no sideways overflow or page scroll from a 320 px phone, portrait and landscape, to a 2560 px screen; and the game saves on the device and carries on from its save when the page is opened again.
- `garden`: The garden at work (src/sim/gardener.ts, src/sim/models/crops.ts, src/sim/models/kitchen.ts, the map and the Garden and Kitchen tabs): a seeded game with the default plan opens with bed 1's overwintered salad leaves growing (the owner's head start, #11), and shows the gardener sow bed 2 and water it in on day 1, a can a trip from the butt, the soil darkening; the drills drawn, then shoots at the real pace; a first harvest from bed 1 carried to the kitchen in the first week; the gardener drawn where their job is; the Kitchen tab showing the day's ask and what met it; and the Garden tab's plan changing what the gardener does next.
- `graph`: The map in tools/graph.mjs: every link in the docs resolves, every system in docs/systems/ names its files, and the joined lists (tools/join.mjs) are sound and up to date; a system's file changed without its notes is a warning.
- `layout`: The page's shell at every size (320×568, 568×320, 390×844, 844×390, 768×1024, 1440×900): the top bar, the map and the panel each inside the viewport, the panel below the map as a sheet on portrait phones and beside it otherwise, no overflow, the panel's tab strip fitting its row with the sheet's toggle, every button and menu at least 40 px on touch, the sheet still showing a useful panel under the fixed chrome, the sheet folding to its heading, the dark scheme, and the top bar and panel working by keyboard alone.
- `rules`: The rules every source file keeps (tools/rules.mjs): Math.random() only in the seeded generator or on a `// cosmetic` line, the sim and its data never importing the UI or naming the DOM, and every model in src/sim/models/ naming its sources and what it simplifies. Each rule is also proved to catch a slip, on a small fixture.
- `scene`: The map (src/ui/map/): it draws the garden in the owner's style on WebGL, and on Canvas 2D where WebGL is missing; it interpolates between snapshots, gliding between ticks and jumping per tick under prefers-reduced-motion; the weather is drawn from the sim's (rain crossing the garden only while it rains, still but shown under reduced motion, frost on a frosty morning, the dug beds paling as they dry and darkening when soaked); a seeded, paused screenshot repeats exactly; and a check-only synthetic scene of 5,000 nodes and 5,000 people runs, logging the speed budget's figures (frame time, and the snapshot's copy across the worker boundary at 4× CPU throttling).
<!-- /joined:checks -->

## Rules

`tools/rules.mjs` (the `rules` check, and the build refuses to run on a slip):
- **Randomness:** `Math.random()` only in `src/sim/random.ts` or on a line ending with `// cosmetic`.
- **Layers:** `src/sim/` and `src/data/` import nothing from `src/ui/` or `src/app/` (and `src/data/` nothing from `src/sim/`), and never name `window`, `document`, `localStorage`, `sessionStorage`, `self`, `postMessage` or `requestAnimationFrame`.
- **Sources:** every model in `src/sim/models/` has a `// Sources:` block and a `// Simplifies:` line.

## The bot

`tools/bot.ts` plays the game headless in Node, like a sensible player, and measures its pacing; the `balance` playbook says how it's used, and the Balance workflow runs it on every PR once. It calls `createSim()` and sends only commands, exactly as the page does: it never touches a bed or a stock, and it reads only the snapshots.

- **How it's run:** `npm run bot -- <game time> --seed <n>` (`120d`, `2w`, `1y` or `36h`; a bare number is days, 120 by default; `--seed` again for more seeds, `--player <name>` for another player, `--markdown <file>` and `--json <file>` to keep the table and the runs). `vite-node`, which Vitest brings, runs the TypeScript as it is, with no build step. A seed through the garden's first 120 days takes well under a second.
- **What it prints**, per seed: `SEED`, `REACHED {milestone: day}` (the game day each was first reached, `—` if not yet), `PLAY` (a fingerprint of the save less the speed and what the player has seen, so two runs that played the same have the same one) and `ERR [...]` (flows the sim couldn't move, and any command it refused); then one table of every seed and their mean against `tools/baseline.json`, each value marked `ok`, `near` (within 15 %) or `off`; a milestone not reached counts as later than any day. How long each seed took goes to stderr, so two runs' output diffs cleanly. It exits 1 only when an `ERR` isn't empty, never on a number.
- **Its parts** (`tools/bot/`): `play.ts` runs a game hour by hour and asks the player's policies each morning at 06:00; `player.ts` holds the players, each a set of policies: `sensible` (salad leaves and potatoes to start, then the family rotation in each dug bed, watering at half the soil's available water) and `one-crop` (salad leaves in every bed, for the strategy test). A policy is one of the plan, the moisture line to water at, and the places for the pest policy, part 5, and the shop, part 6, which buys the next upgrade at three times its price; `milestones.ts` the milestones, one line each, read from the snapshot (a crop sown in a bed; the ledger's first harvest, first sale and the share of the ask met over the last seven meals), with the ones later parts bring already listed without a test; `measure.ts` each day's food harvested, eaten, sold and wasted (from the kitchen's ledger in the snapshot), money, the dug beds' health and carbon, and the sealed garden's would-be totals over the last 28 days (Output, Reliability, Health), worked out as part 7's sealing will; `baseline.ts` the table.
- **The strategy tests** (`src/sim/strategy.test.ts`) run with `npm run check`: the bot repeats from its seed with no errors, and its fingerprint and measures mean what they say. The founding spec's rotation test (a rotating bot beats a one-crop bot by 10 % of Output by day 120) doesn't hold yet: in the garden today nothing makes growing one family bed after bed cost anything, so on seed 1 one-crop salad makes 0.21 kg a day to the rotation's 0.10. The test holds the game to that for now; part 5's pests, which follow a family from crop to crop, should turn it round, and part 5 then makes it the spec's test on seeds 1–3. The pest-policy test comes with part 5, the advisers' with part 6.

## Workflows

- **Checks** (`checks.yml`) runs `npm run check` on every PR that isn't a draft, and on demand. A newer push cancels the older run.
- **Description check** (`description.yml`) strips a trailing "Generated by" footer from a PR's description, then fails a title or description that mentions the tools or carries an attribution line. It runs when the PR is opened, edited or reopened, so editing the description re-runs it without a push.
- **Publish to GitHub Pages** (`pages.yml`) runs `npm run check` on `main` itself, then builds and deploys `dist/`, on each push that can change the page. On a failure it skips the deploy and opens (or updates) an issue titled "main is red".
- **Balance** (`balance.yml`) runs the bot on seeds 1, 2 and 3 through the baselines' game time when a PR opens, is reopened or leaves draft, and again whenever the `balance` label is added (even on a draft), and puts its table in the run's summary; the runs are kept as the `balance` artifact. It fails only when a seed's `ERR` isn't empty, never on a number. Catch up never starts it.
- **Catch up** (`catch-up.yml`) merges `main` into every open PR when it moves, rejoins the joined lists, and pushes if the only conflicts were inside them; on a real conflict it comments once and leaves the branch alone (the `steward` playbook).
