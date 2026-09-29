# Brief: models ahead: livestock (for parts 6 and 12)

The founding spec (`docs/specs/overgrow.md`) splits the first slice into fifteen parts. Parts 1 to 3 have merged; part 5 (pests, wildlife and Explain) is building now. This session writes, ahead of the parts that wire it, the livestock model: the garden's three hens (part 6's hen house) and the smallholding's small flock and a few pigs or sheep (part 12).

## Goal and what it may touch

- **Deliver** the livestock model (`livestock.ts` in `src/sim/models/`, data in `livestock.ts` in `src/data/`), with its plausibility test and notes. Branch `feature/livestock-model` from `main`, one PR. Start from a GitHub issue (the Feature template) and link it from the PR; no spec file, since the founding spec's rows named below are approved and this brief approves them in advance for this work (the `feature` playbook, step 2).
- **Ahead of its part, in new files only.** This is the models-ahead track the owner agreed on 29 Sep 2026: the first slice's parts run one after another because each wires its systems into the same shared files, so the pure models they'll need are written first, in parallel, in files nobody else touches. This session adds **new files only**. It never edits `src/sim/systems.ts`, `src/sim/state.ts`, `src/sim/graph.ts`, `src/sim/commands.ts`, `src/sim/save.ts`, an existing model, anything under `src/ui/`, `src/app/` or `tools/`, or the project notes: part 5 (pests, wildlife and Explain) and part 4 (the bot) are editing those now. The part named below wires the model in (registers its system, puts its stocks on the graph, draws it, adds its commands and panel). If the model needs a unit, a boundary or a stock key the graph doesn't have yet, define it in the model's own file or its data and say in its note what the wiring part must add to `graph.ts`; don't edit `graph.ts`.
- **Shaped for wiring.** Read how the existing models are built (`src/sim/models/carbon.ts`, `crops.ts`, `soil.ts` and their tests, and `src/sim/clock.ts` for `System` and `TickContext`) and write this one the same way, so wiring it is a few lines: pure functions over the graph's typed quantities (`Qty` and its units) that return the flows to move and the state to keep, with no DOM, no `Math.random()` (draw from a passed `Rng` where chance matters) and no global state; and, where the model runs on the clock, an exported `System` (not listed in `systems.ts`) that the wiring part adds with one line. Scale-free: the same functions serve one node or many (the ladder's rule: a node is stocks, flows and levers whatever its size).
- **Real mechanisms, rough numbers** (`docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`): each model file starts with a one-line comment saying what's in it, then `// Sources:` (the founding spec's systems map row names them) and `// Simplifies:`, and says its fast effect and its slow effect; each has a plausibility test beside it (`<name>.test.ts`) asserting the direction and rough size of its effect against its sources. Data goes in `src/data/`, with each dataset's licence noted beside it and no real place or brand named (the owner's choice: invented places everywhere).
- **Its notes** (`docs/systems/<name>.md`, naming every file in the first paragraph): how it works, and a short "Wiring" section for the part that wires it: the stocks, boundaries and levers to add, the system's place in `systems.ts`, and what the map and the panel should draw from it.
- **What it builds, concretely:**
  - **Species** as data: laying hens, sheep (ewes and lambs), pigs (growers), and cattle's figures for later levels, each with feed intake and feed conversion (FAO feed conversion ratios), production (eggs by day length and season, since hens lay less in short days; liveweight gain; milk only as data for later), water drunk per head per day, land per head (grazing or run, by stocking density), and the land, water and emissions per kg of product the founding spec's diet question rests on (Poore & Nemecek 2018).
  - **Emissions and manure**: enteric methane by IPCC Tier 1 factors per head a year (sheep and cattle high, pigs low, poultry nil); manure's nitrogen excreted per head (IPCC and RB209 for its value to the soil), its methane and nitrous oxide by how it's managed (heap, spread, left on pasture); manure and droppings as flows to the heap or the field, where the carbon and soil models take over; all in kg CO₂e with AR6's warming figures, as the carbon model does.
  - **Welfare and health** as a slow index from stocking density, feed met, shelter and water, cutting production when low, and a disease-risk hook (a daily chance, drawn from a passed `Rng`, rising with density and low welfare) that part 12's vet and later levels' animal disease use.
  - **The fast and slow effects**: a missed feed or a cold snap cuts today's eggs; overstocking wears down welfare and the pasture over a season, and a flock's methane adds up over years.
  - **Tests** (`livestock.test.ts`): three hens lay about the RHS's and industry's figures (roughly 250–300 eggs a year each for a laying breed, fewer in winter); a lamb's methane per kg of meat far above a pig's and an egg's, inside Poore & Nemecek's ranges; manure nitrogen per head inside IPCC's range; overstocking lowers welfare and output; feed conversion inside FAO's ranges.
- **It may touch:** `src/sim/models/livestock.ts` and `livestock.test.ts`, `src/data/livestock.ts`, `docs/systems/livestock.md`, `docs/roadmap.d/` (its own item), `docs/briefs/livestock-model.md` (this brief, saved as is) and `docs/lessons/` (its look back). Nothing else.

## Read first

- The project notes, then `node tools/graph.mjs src/sim/models/carbon.ts` and `node tools/graph.mjs src/sim/clock.ts`, and only the files those list.
- The founding spec's systems map rows for "Livestock", "Nutrients and fertiliser" and "Greenhouse gases", the garden's "three hens", and "The smallholding's first year".
- `docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`.
- The `feature` and `steward` playbooks.

## Speed budget

Measure what a call costs headless in Node for the part's largest expected use (say it in the note), so the wiring part can hold it inside its share of the parts-5-to-14 reserve (`docs/SYSTEMS.md`, "Speed budget"); nothing ships in `dist/` until it's wired.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook: Squash and merge by hand once Checks and the Description check are green on the latest head and the look back is committed in the PR (until the owner adds the ruleset and auto-merge); the Pages run publishes nothing new, since nothing is wired. The Catch up workflow merges `main` in as other parts land; new files only means it should never conflict, and if it does, the file you touched outside your own is the mistake. Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged, the session stops.

## What's left for others

- Part 6 wires the hens (the hen house in the shed, eggs to the kitchen, droppings to the heap); part 12 wires the flock and the pigs or sheep (feed, welfare, manure, methane, land per kg, the vet). Part 5 draws only wildlife and the cat.
- Parts 4 and 5 are editing the shared files now; the other model sessions (sealing, livestock, labour, machinery and energy) add their own new files. Never touch another session's files or branch.
- The owner has said the coordinator's recommendations stand for later choices.

## When to stop and ask

- Only for something irreversible or outside this brief: repo settings, a change to the founding spec's model or carry-over rule, a new runtime dependency, or widening the slice.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question, the options and the default, carry on with the default, and say so in the PR; the owner has said the recommended option stands unless they answer.
- Where it's merely unclear, take the safer option (a plainer model with its simplification named, easier to extend later) and say so in the PR.

## Cost budget

- Estimate: about $8 (one model with its data and a plausibility test across three species, one CI round). Model `claude-sonnet-5-5`, the cheaper model (the `coordinator` playbook §5: four default-model sessions are already running, and a pure model with plausibility tests is well-bounded work). No workflows.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions.
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim what's left (cattle's figures can wait for level 4).
