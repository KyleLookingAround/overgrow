# Brief: models ahead: sealing and the carry-over rule's maths (for part 7)

The founding spec (`docs/specs/overgrow.md`) splits the first slice into fifteen parts. Parts 1 to 3 have merged; part 5 (pests, wildlife and Explain) is building now. This session writes, ahead of part 7 (sealing and the step up), the pure maths of the carry-over rule, so part 7 only has to wire it to the step-up card, the zoom-out and the allotment's map.

## Goal and what it may touch

- **Deliver** the carry-over rule's maths as pure, tested functions in `src/sim/ladder.ts` (the founding spec's "Files" names it), with its notes. Branch `feature/sealing-maths` from `main`, one PR. Start from a GitHub issue (the Feature template) and link it from the PR; no spec file, since the founding spec's rows named below are approved and this brief approves them in advance for this work (the `feature` playbook, step 2).
- **Ahead of its part, in new files only.** This is the models-ahead track the owner agreed on 29 Sep 2026: the first slice's parts run one after another because each wires its systems into the same shared files, so the pure models they'll need are written first, in parallel, in files nobody else touches. This session adds **new files only**. It never edits `src/sim/systems.ts`, `src/sim/state.ts`, `src/sim/graph.ts`, `src/sim/commands.ts`, `src/sim/save.ts`, an existing model, anything under `src/ui/`, `src/app/` or `tools/`, or the project notes: part 5 (pests, wildlife and Explain) and part 4 (the bot) are editing those now. The part named below wires the model in (registers its system, puts its stocks on the graph, draws it, adds its commands and panel). If the model needs a unit, a boundary or a stock key the graph doesn't have yet, define it in the model's own file or its data and say in its note what the wiring part must add to `graph.ts`; don't edit `graph.ts`.
- **Shaped for wiring.** Read how the existing models are built (`src/sim/models/carbon.ts`, `crops.ts`, `soil.ts` and their tests, and `src/sim/clock.ts` for `System` and `TickContext`) and write this one the same way, so wiring it is a few lines: pure functions over the graph's typed quantities (`Qty` and its units) that return the flows to move and the state to keep, with no DOM, no `Math.random()` (draw from a passed `Rng` where chance matters) and no global state; and, where the model runs on the clock, an exported `System` (not listed in `systems.ts`) that the wiring part adds with one line. Scale-free: the same functions serve one node or many (the ladder's rule: a node is stocks, flows and levers whatever its size).
- **Real mechanisms, rough numbers** (`docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`): each model file starts with a one-line comment saying what's in it, then `// Sources:` (the founding spec's systems map row names them) and `// Simplifies:`, and says its fast effect and its slow effect; each has a plausibility test beside it (`<name>.test.ts`) asserting the direction and rough size of its effect against its sources. Data goes in `src/data/`, with each dataset's licence noted beside it and no real place or brand named (the owner's choice: invented places everywhere).
- **Its notes** (`docs/systems/<name>.md`, naming every file in the first paragraph): how it works, and a short "Wiring" section for the part that wires it: the stocks, boundaries and levers to add, the system's place in `systems.ts`, and what the map and the panel should draw from it.
- **What it builds, concretely:**
  - **Totals over a window** ("The carry-over rule", "Sealing"): from a level's history over the last full cycle of its rhythm (the garden's last 28 days), the five headline numbers: Output (kg a day, by product mix), Quality (0–100, output-weighted), Reliability (100 × (1 − the coefficient of variation over the window), clamped 0–100), Upkeep (£ a day) and Health (one index from the slow stocks: soil, water, kit, goodwill, herd), plus carbon (kg CO₂e a day, emissions less sinks), land (m² or ha by use) and, for later levels, Freshness. Define the history the level must keep as a small typed ring (what to sample each day, capped in size) so part 7 adds one line to record it; it's never the whole detail.
  - **A sealed node's tick**: output = Output × event modifiers × (1 + noise), the noise drawn from a passed `Rng` with a spread of (100 − Reliability) % and averaging to zero; Health drifting toward the plan last set for the node by at most one point a season; each point of Health below 50 costing 1 % of Output; Upkeep paid; emissions and land following the plan. Nothing inside a sealed node is simulated in detail.
  - **Events across scales** ("How events cross scales"): an event's home level, its size (the share of a node's output it destroys over its duration), and the expected kg lost being the same whichever level shows it; a duration shorter than one tick of the level showing it rounds up to a tick with its size scaled down so the kg stay the same; events never shown below their home level; the three ways it shows (the thing itself, the node's tile with "Output −20 % for 10 days", a regional tint and one line) as data the UI will read.
  - **Inflating's target**: the function that checks a rebuilt detail level's first cycle against the totals it was sealed with, within 5 % (the `carry` test's core), and the seeded layout key (the same node always looks the same).
  - **The step-up offer's test** ("What makes the jump feel earned"): Output at least 1.5 kg a day and Reliability at least 60 over the last 28 days, with Health at least 50, as data (proposed; part 4's bot sets the baselines), and a function that says which requirement is holding the player back (the owner's chosen win W18 in `docs/ideas/final-call-wins.md`: the goal bar names the binding requirement).
  - **Tests** (`src/sim/ladder.test.ts`): Reliability 100 for a steady series and lower for a lumpy one of the same mean; a sealed node's mean output over many ticks within 1 % of Output, and its spread matching Reliability; Health below 50 cutting Output 1 % a point; an event's expected kg lost matching between its home level and one level up within 5 %, including the round-up case; the offer's test naming the right blocker. It's a rule of the game, not a real-world model, so it lives in `src/sim/` and needs no `// Sources:` block, but say in its header comment which spec section each function implements.
- **It may touch:** `src/sim/ladder.ts` and `src/sim/ladder.test.ts`, any data it needs in a new `src/data/ladder-rules.ts` (not `ladder.ts`, which part 1 owns for the clock), `docs/systems/ladder.md`, `docs/roadmap.d/` (its own item), `docs/briefs/sealing-maths.md` (this brief, saved as is) and `docs/lessons/` (its look back). Nothing else.

## Read first

- The project notes, then `node tools/graph.mjs src/sim/graph.ts` and `node tools/graph.mjs src/sim/clock.ts`, and only the files those list.
- The founding spec's "The ladder", "The carry-over rule", "Zooming back in" and "What makes the jump feel earned" sections, and "How the bot measures pacing" for the carry-over tests.
- `docs/decisions/ADR-2026-09-28-scale-free-graph.md` and `docs/decisions/ADR-2026-09-28-seeded-randomness.md`; rows W4 and W18 in `docs/ideas/final-call-wins.md`.
- The `feature` and `steward` playbooks.

## Speed budget

Measure what a call costs headless in Node for the part's largest expected use (say it in the note), so the wiring part can hold it inside its share of the parts-5-to-14 reserve (`docs/SYSTEMS.md`, "Speed budget"); nothing ships in `dist/` until it's wired.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook: Squash and merge by hand once Checks and the Description check are green on the latest head and the look back is committed in the PR (until the owner adds the ruleset and auto-merge); the Pages run publishes nothing new, since nothing is wired. The Catch up workflow merges `main` in as other parts land; new files only means it should never conflict, and if it does, the file you touched outside your own is the mistake. Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged, the session stops.

## What's left for others

- Part 7 wires this: the history ring, the step-up card (the owner's chosen win W4: built from the data that gates the game), the zoom-out and the `carry` check. Part 9 uses the events maths for the first zoom back in.
- Parts 4 and 5 are editing the shared files now; the other model sessions (sealing, livestock, labour, machinery and energy) add their own new files. Never touch another session's files or branch.
- The owner has said the coordinator's recommendations stand for later choices.

## When to stop and ask

- Only for something irreversible or outside this brief: repo settings, a change to the founding spec's model or carry-over rule, a new runtime dependency, or widening the slice.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question, the options and the default, carry on with the default, and say so in the PR; the owner has said the recommended option stands unless they answer.
- Where it's merely unclear, take the safer option (a plainer model with its simplification named, easier to extend later) and say so in the PR.

## Cost budget

- Estimate: about $8 (pure maths with careful tests, one module, one CI round). Model `claude-sonnet-5-5`, the cheaper model (the `coordinator` playbook §5: four default-model sessions are already running, and a pure model with plausibility tests is well-bounded work). No workflows.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions.
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim what's left (the inflating check can move to part 7).
