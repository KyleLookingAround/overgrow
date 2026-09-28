# Brief: part 1 of the first slice, the graph and the clock

The founding spec (`docs/specs/overgrow.md`) is approved and its first roadmap splits the first slice into fifteen PR-sized parts. This is part 1: the ground every other part builds on. It builds no crop, soil, weather or gardener: those are parts 2 and 3, and they start from `main` once this merges.

## Goal and what it may touch

- **Deliver** the founding spec's part 1 ("The first roadmap", item 1): nodes, stocks, flows in SI units, conservation tests, the clock and its ticks, commands and snapshots, saving with versions, and the page's shell (the WebGL map with interpolation between snapshots, the top bar, the panel and the phone sheet) at every size, with the checks `conservation`, `layout` and `scene`. Branch `feature/graph-and-clock` from `main`, one PR.
- **The spec is its spec.** The founding spec's sections "The model underneath everything", "The simulation's state and time", "The look: a living map" (the shell, the renderer, access, layout) and "The first roadmap" item 1 are approved; this brief approves them in advance for this part (the `feature` playbook, step 2), so no new spec file. Start from a GitHub issue per the `feature` playbook (the Feature template) and link it from the PR.
- **What it builds, concretely:**
  - **The graph** (`graph.ts` in `src/sim/`): a node type with stocks, flows and levers whatever its size, and edges carrying flows between nodes. Units are part of the types (litres, kg N/P/K, kg CO₂e, kg of food by product, hours, kWh, £): a flow in one unit can't be added to another by mistake. Carbon and land are on every node from the start. Flows are conserved: every flow leaves one stock or node and arrives at another, or crosses a named boundary (rain in, evapotranspiration out, emissions to the atmosphere node), so a tick's balance can be summed. A generic node carries the five headline totals' fields (Output, Quality, Reliability, Upkeep, Health) and carbon and land, even if only part 7 computes them, so sealing adds no field later.
  - **The clock and its ticks** (`clock.ts` in `src/sim/`): game hours since the start, fixed steps of an hour at levels 1 and 2 (a day at 3), and a registry so a system subscribes to the hour, day, week, season or year tick from its own file and adding one never edits another's. The ladder's rate (seconds per game day at 1×, 24 s for the garden) and the speeds (pause, 1×, 2×, 4×) live in data, and the real-time loop that turns real seconds into ticks lives in `src/app/`, not the sim. Real calendar dates from a start date in early spring, for the top bar. The game doesn't run while the page is closed.
  - **Commands and snapshots** (`commands.ts` in `src/sim/`; `src/sim/index.ts` keeps `createSim`): the command union grows from `tick` and `new-game` into the shape every later command follows (a plan, an upgrade, a policy, a speed). The snapshot carries the current level's nodes, their stocks, the flows of the last tick and **activities** (who is doing what, where, from when to when), so the renderer can animate from them; this part defines the activity shape and the renderer's use of it, with no real activity yet.
  - **Saving with versions** (`save.ts` in `src/sim/` for the format and its migration steps; the `localStorage` side in `src/app/`): versioned JSON under `localStorage['overgrow-save-v1']`, saved every game day and on leaving the page, loaded on opening so a loaded game plays on exactly as it would have (the `Rng` state included). A migration step per version, and a Vitest test that a save round-trips and that the migration chain runs. The save fixtures and the `migrate` check are part 15's; this part leaves the module so a later move to IndexedDB touches nothing else.
  - **The shell:** the PixiJS map (the Canvas 2D fallback where WebGL is missing) drawing the current graph's nodes in the flat, top-down, soft style the owner picked (`docs/specs/overgrow/art-styles.html`, style A), interpolating between snapshots, with `prefers-reduced-motion` jumping per tick; a top bar (level, date, money, carbon dial, pause and the speeds); the panel beside the map on wide screens and tablets, below it as a sheet on portrait phones, side by side on a phone on its side; tap targets at least 40 px on touch; every panel usable by keyboard; every colour and size in `src/ui/styles/tokens.css`, light and dark. Until part 3, the map may draw the garden's empty layout (six bed plots, two dug, the tap, butt, heap, shed, lawn and kitchen) as the graph's nodes, with no gardener and nothing growing. Keep text concise, UK English; locked things hidden, not greyed.
  - **`window.__sim`:** when `window.__seed` is set, expose what the browser checks need (`docs/SYSTEMS.md`, "The sim in a worker"), and say what in the notes.
  - **Checks:** `conservation` as a Vitest test (every flow balances across every tick of a long run, to rounding) and a Vitest test per new file where it earns one; browser groups `layout` (the sheet on phones and the panel beside the map, top bar in view, no overflow, at 320×568, 568×320, 390×844, 844×390, 768×1024 and 1440×900) and `scene` (the map draws, interpolates between snapshots, and a seeded screenshot repeats). The long headless run (`src/sim/index.test.ts`) keeps passing and grows to cover a save and load mid-run.
  - **Measure the headroom and state the shares.** The spec's speed budget: a garden day under 2 ms headless in Node, a frame under 6 ms at 1440×900 with everything moving, 5,000 moving things under 8 ms a frame on a mid-range phone (Chromium with 4× CPU throttling stands in for one), `dist/` under 500 KB gzipped. Measure each on this part's build, including the cost of copying a 5,000-node snapshot across the worker boundary with a check-only synthetic scene; if a tick's copy passes 2 ms throttled, switch to snapshot deltas (only nodes that changed) in this part. Write the measurements and each later part's share of the budget into `docs/SYSTEMS.md` (a "Speed budget" section), so the coordinator can put each share in its part's brief. The `perf` check itself is part 15's; a Vitest timing test here is welcome if it isn't flaky.
- **It may touch:** `src/sim/` (`index.ts`, the new `graph.ts`, `clock.ts`, `commands.ts`, `save.ts` and their tests), `src/data/` (the ladder's clock rates and a start date), `src/app/` (the clock loop, the save's `localStorage` side, the worker and client), `src/ui/` (the map, the top bar, the panel and sheet, `tokens.css`, `page.css`), `tools/checks/` (the new `layout` and `scene` groups, and `build` where the shell changes what it asserts), `docs/systems/` (notes for the graph, the clock, saving and the map, replacing `placeholder.md`), `docs/SYSTEMS.md` outside its joined lists (state, time, `window.__sim`, the speed budget), `docs/roadmap.d/` (its own item, and move the founding spec's item to `Section: done`), `docs/briefs/graph-and-clock.md` (this brief, saved as is), `docs/lessons/` (its look back) and `src/updates.d/` (a What's new fragment: the page is now a garden with a clock). No new runtime dependency. Anything else is outside the brief.

## Read first

- The project notes, then `node tools/graph.mjs createSim`, `node tools/graph.mjs "Placeholder page"` and `node tools/graph.mjs build`, and only the files those list.
- The founding spec's sections named above (not the whole spec), and "The ladder" table for the clock rates.
- `docs/SYSTEMS.md` ("Layers", "State", "Time", "The sim in a worker, and headless", "Checks"), `docs/decisions/ADR-2026-09-28-scale-free-graph.md` and `docs/decisions/ADR-2026-09-28-webgl-map.md`.
- The `feature` and `steward` playbooks.
- `docs/lessons/1-runbook.md`: "no overflow" is not "in view"; assert bounding boxes inside the viewport.
- The owner's pick of art style is style A in `docs/specs/overgrow/art-styles.html`: read its drawing code for the palette and shapes, not the other three.

## Speed budget

This part sets it: measure the four figures above on its own build and write each later part's share into `docs/SYSTEMS.md`. As a starting point for the shares, unless measurement says otherwise: the shell and graph take at most a quarter of each budget, parts 2 and 3 a quarter between them, and the rest is held for parts 5 to 14. Say in the PR what was measured, on what, and the shares set.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook: Squash and merge by hand once Checks and the Description check are green on the latest head and the look back is committed in the PR (until the owner adds the ruleset and auto-merge), then confirm the "Publish to GitHub Pages" run finished and the site loads. Once the PR is open, call `subscribe_pr_activity` on it and end the turn: PR events wake the session. Don't book a `send_later`: the coordinator keeps the only check-in and will message this session if it stalls. When the PR has merged, the session stops; part 2 starts fresh.

## What's left for others

- Not this part: weather, soil and water (part 2); crops, the gardener, the kitchen and the `garden` check (part 3); the bot and baselines (part 4); sealing, `ladder.ts` and the `carry` check (part 7); save fixtures, the `migrate` and `perf` checks (part 15). Leave a clear hook for each (a tick registry, the activity shape, the node totals) rather than a stub of it.
- Parts 2 to 15 start from `main` after this merges, each from its own brief written by the coordinator.
- The owner: the ruleset on `main` requiring `check` and "Allow auto-merge" (noted in #1). Levels 4 to 8 each get their own spec after the slice has been played.

## When to stop and ask

- Only for something irreversible or outside this brief: repo settings, a change to the founding spec's model or carry-over rule, a new runtime dependency, or widening the slice.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question, the options and the default; where the choice is between things the owner can look at (a layout, the top bar's shape), also publish a page that shows them with the default pre-selected and saves the pick where the session can read it back. Carry on with other work, look at the issue at each stopping point, and take the default after 12 hours with no answer. Say so in the PR.
- Where it's merely unclear, take the safer option (easier to undo, or changing the game less) and say so in the PR.

## Cost budget

- Estimate: about $25 (the largest part of the slice: every layer from the sim to the map, three new checks and the speed measurements, with two or three CI rounds). Model `claude-opus-5-5` at high effort; ultracode only for the fresh review before the PR opens, as the coordinator's brief allows.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions (`coordinator` playbook §5 and §7).
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim or split what's left (the Canvas 2D fallback or the deltas can move to a follow-up part, with the coordinator's agreement).
