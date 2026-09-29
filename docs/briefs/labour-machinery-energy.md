# Brief: models ahead: labour, machinery and energy (for part 13)

The founding spec (`docs/specs/overgrow.md`) splits the first slice into fifteen parts. Parts 1 to 3 have merged; part 5 (pests, wildlife and Explain) is building now. This session writes, ahead of part 13 (labour, machinery and energy at the smallholding), the three pure models that part wires.

## Goal and what it may touch

- **Deliver** three models in `src/sim/models/`: `labour.ts`, `machinery.ts` and `energy.ts`, with data in `src/data/`, plausibility tests and notes. Branch `feature/labour-machinery-energy` from `main`, one PR. Start from a GitHub issue (the Feature template) and link it from the PR; no spec file, since the founding spec's rows named below are approved and this brief approves them in advance for this work (the `feature` playbook, step 2).
- **Ahead of its part, in new files only.** This is the models-ahead track the owner agreed on 29 Sep 2026: the first slice's parts run one after another because each wires its systems into the same shared files, so the pure models they'll need are written first, in parallel, in files nobody else touches. This session adds **new files only**. It never edits `src/sim/systems.ts`, `src/sim/state.ts`, `src/sim/graph.ts`, `src/sim/commands.ts`, `src/sim/save.ts`, an existing model, anything under `src/ui/`, `src/app/` or `tools/`, or the project notes: part 5 (pests, wildlife and Explain) and part 4 (the bot) are editing those now. The part named below wires the model in (registers its system, puts its stocks on the graph, draws it, adds its commands and panel). If the model needs a unit, a boundary or a stock key the graph doesn't have yet, define it in the model's own file or its data and say in its note what the wiring part must add to `graph.ts`; don't edit `graph.ts`.
- **Shaped for wiring.** Read how the existing models are built (`src/sim/models/carbon.ts`, `crops.ts`, `soil.ts` and their tests, and `src/sim/clock.ts` for `System` and `TickContext`) and write this one the same way, so wiring it is a few lines: pure functions over the graph's typed quantities (`Qty` and its units) that return the flows to move and the state to keep, with no DOM, no `Math.random()` (draw from a passed `Rng` where chance matters) and no global state; and, where the model runs on the clock, an exported `System` (not listed in `systems.ts`) that the wiring part adds with one line. Scale-free: the same functions serve one node or many (the ladder's rule: a node is stocks, flows and levers whatever its size).
- **Real mechanisms, rough numbers** (`docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`): each model file starts with a one-line comment saying what's in it, then `// Sources:` (the founding spec's systems map row names them) and `// Simplifies:`, and says its fast effect and its slow effect; each has a plausibility test beside it (`<name>.test.ts`) asserting the direction and rough size of its effect against its sources. Data goes in `src/data/`, with each dataset's licence noted beside it and no real place or brand named (the owner's choice: invented places everywhere).
- **Its notes** (`docs/systems/<name>.md`, naming every file in the first paragraph): how it works, and a short "Wiring" section for the part that wires it: the stocks, boundaries and levers to add, the system's place in `systems.ts`, and what the map and the panel should draw from it.
- **What it builds, concretely:**
  - **Labour** (`labour.ts`): hours available per person by season and day of the week, the work a field's operations need by crop and month (seasonal peaks at sowing and harvest; AHDB and DEFRA farm labour figures), wages by role (a hired hand at harvest: the National Living Wage and agricultural rates, as rough 2026 figures), a skill factor on the time a job takes, and what doesn't fit waiting (the gardener's rule, at farm scale). Hiring's goals and hidden integrity belong to the agency system (parts 8 and 13's hire); leave the hook (a worker has `skills` and `goals` fields the model reads but doesn't decide).
  - **Machinery** (`machinery.ts`): a second-hand tractor's fuel per hectare by operation (ploughing, drilling, spraying, harvesting: typical UK contractor and energy-audit figures), hours per hectare against hand work, a breakdown hazard rising with age and hours since service (draws from a passed `Rng`), repair costs, and soil compaction from wheelings on wet ground reducing the soil's structure (feeding part 2's soil structure) and so yield; its fast effect a lost day at harvest, its slow one a compacted field.
  - **Energy** (`energy.ts`): DEFRA and BEIS greenhouse-gas conversion factors for diesel, petrol, grid electricity and gas (kg CO₂e per litre or kWh, as rough 2025–26 figures), a pump's kWh per cubic metre lifted, a cold store's and a polytunnel heater's daily kWh, and energy cost in £; every use a flow (fuel from the `bought` boundary, its carbon to the level's air node), so the carbon account stays whole.
  - **Tests** (one per model): a harvest month needing several times a quiet month's hours; a hired hand paying back only when the work would otherwise wait; ploughing a hectare burning roughly the audited litres; an old unserviced tractor breaking down more often; wet-ground wheelings cutting structure; a litre of diesel at about DEFRA's kg CO₂e.
- **It may touch:** `src/sim/models/labour.ts`, `machinery.ts`, `energy.ts` and their tests, `src/data/labour.ts`, `src/data/machinery.ts`, `src/data/energy.ts`, `docs/systems/labour.md`, `docs/systems/machinery.md`, `docs/systems/energy.md`, `docs/roadmap.d/` (its own item), `docs/briefs/labour-machinery-energy.md` (this brief, saved as is) and `docs/lessons/` (its look back). Nothing else.

## Read first

- The project notes, then `node tools/graph.mjs src/sim/gardener.ts`, `node tools/graph.mjs src/sim/models/soil.ts` and `node tools/graph.mjs src/sim/clock.ts`, and only the files those list.
- The founding spec's systems map rows for "Labour", "Energy" and "Greenhouse gases", the "People have goals" and "Time is the first constraint" bullets, and "The smallholding's first year".
- `docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`.
- The `feature` and `steward` playbooks.

## Speed budget

Measure what a call costs headless in Node for the part's largest expected use (say it in the note), so the wiring part can hold it inside its share of the parts-5-to-14 reserve (`docs/SYSTEMS.md`, "Speed budget"); nothing ships in `dist/` until it's wired.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook: Squash and merge by hand once Checks and the Description check are green on the latest head and the look back is committed in the PR (until the owner adds the ruleset and auto-merge); the Pages run publishes nothing new, since nothing is wired. The Catch up workflow merges `main` in as other parts land; new files only means it should never conflict, and if it does, the file you touched outside your own is the mistake. Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged, the session stops.

## What's left for others

- Part 13 wires these (hours at scale, the first hire and their goals, the tractor on the map, energy as a cost); part 11's fields give them their hectares; part 14's cold chain uses the energy model.
- Parts 4 and 5 are editing the shared files now; the other model sessions (sealing, livestock, labour, machinery and energy) add their own new files. Never touch another session's files or branch.
- The owner has said the coordinator's recommendations stand for later choices.

## When to stop and ask

- Only for something irreversible or outside this brief: repo settings, a change to the founding spec's model or carry-over rule, a new runtime dependency, or widening the slice.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question, the options and the default, carry on with the default, and say so in the PR; the owner has said the recommended option stands unless they answer.
- Where it's merely unclear, take the safer option (a plainer model with its simplification named, easier to extend later) and say so in the PR.

## Cost budget

- Estimate: about $10 (three small models with data and tests, one CI round). Model `claude-sonnet-5-5`, the cheaper model (the `coordinator` playbook §5: four default-model sessions are already running, and a pure model with plausibility tests is well-bounded work). No workflows.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions.
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim what's left (the cold store's figures can move to part 14).
