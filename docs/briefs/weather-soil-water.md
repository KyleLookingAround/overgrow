# Brief: part 2 of the first slice, weather, soil and water

The founding spec (`docs/specs/overgrow.md`) splits the first slice into fifteen parts; part 1 (#5) laid the graph, the clock, commands, saves and the page's shell. This is part 2: the physical world under the garden. Parts 3 (crops and the gardener) and 4 (the bot) start side by side from `main` once this merges, so what this part leaves is what both build on.

## Goal and what it may touch

- **Deliver** the founding spec's part 2 ("The first roadmap", item 2): the weather generator (with the warming index as an input), the soil water balance and soil health, as three models on the clock's ticks; rain and frost crossing the beds, and soil paling as it dries and darkening as it wets, on the map. Branch `feature/weather-soil-water` from `main`, one PR.
- **The spec is its spec.** The founding spec's systems map rows for "Calendar and climate", "Soil" and "Water", the garden's "Soil per bed" and "Weather" lines, and "The first roadmap" item 2 are approved; this brief approves them in advance for this part (the `feature` playbook, step 2), so no new spec file. Start from a GitHub issue (the Feature template) and link it from the PR.
- **What it builds, concretely:**
  - **Weather** (`weather.ts` in `src/sim/models/`, data in `climate-normals.ts` in `src/data/`): a daily stochastic generator of the Richardson type from monthly climate normals for an invented, UK-flavoured lowland station in southern England (the ranges from Met Office 1991–2020 normals, Open Government Licence, noted beside the data; no real place named): wet or dry days by a first-order Markov chain, rain amounts on wet days, maximum and minimum temperature with day-to-day persistence, and sunshine or radiation; hourly values shaped from the day's for the hour tick. It takes a **warming index** (°C above the baseline, read from the graph each day: at the garden it comes to roughly zero, and the notes say how part 7 and up feed it) that shifts the means and widens the extremes in the direction IPCC AR6 gives for the UK: warmer overall, wetter winters, drier summers, more hot days and heavy-rain days. Frost is a minimum below 0 °C at the ground. It draws only from its own system dice (`systemRng()`), so adding it changes no other system's draws.
  - **Water** (`water.ts` in `src/sim/models/`): the FAO-56 soil water balance per bed and for the lawn: rain in, reference evapotranspiration out (Penman-Monteith where the weather gives what it needs, Hargreaves where it doesn't, and the header says which and why), a crop coefficient hook that part 3 fills (bare soil and grass values until then), drainage below the root zone, and runoff when the soil is full. The water butt fills from the shed roof's rain up to its cap and overflows. Every litre moves as a flow through `ctx.flow`, to or from the named boundaries (rain, evapotranspiration, drainage), so the `conservation` test covers it unchanged.
  - **Soil** (`soil.ts` in `src/sim/models/`, data in `soils.ts` in `src/data/`): per bed (and the lawn), a texture giving field capacity and wilting point (Saxton & Rawls 2006), moisture as the water stock, organic matter decaying slowly RothC-style (its carbon to the atmosphere node as a flow, faster when warm and moist, stored when compost is added later), N-P-K stocks with nitrate leaching on drainage (RB209 for the sizes), structure, and a **soil health** index 0–100 from organic matter, structure and moisture stress. The inputs later parts add (compost, crops taking nutrients, legumes, digging) are flows other systems move; this part leaves the stock keys and a plain way to add them, not stubs.
  - **On the map:** rain as a cosmetic shower crossing the garden while the sim says it's raining, frost as a pale rime on the beds and lawn when the sim says there's frost, and each bed's soil darkening with moisture and paling as it dries (interpolated between snapshots). Everything drawn from the snapshot's weather and stocks; nothing drawn changes the game; `prefers-reduced-motion` stops the rain's movement but keeps it shown. The weather is never announced as text (the spec's garden: "drawn, never announced"). The top bar may show the temperature beside the date if it fits at 320 px; the panel shows a selected bed's moisture, organic matter, N-P-K and health, in concise UK English with units.
  - **Saved state.** Whatever the weather keeps between days (the Markov state, persistence) is saved; a save from part 1 must still load, with a migration step (`MIGRATIONS[1]` in `src/sim/save.ts`) that gives the new stocks and fields their defaults, and a test that a part-1 save loads and plays on.
  - **Tests.** A plausibility test per model (`<name>.test.ts` beside it), asserting the direction and rough size of its effect: a seeded year's rainfall, wet days and monthly means inside the normals' range; a warming index of 2 gives warmer means, wetter winters and drier summers; a bare bed dries faster in a hot dry week than a cool wet one and drains when rain passes field capacity; organic matter falls over years on a bare bed; nitrate leaches after heavy rain. Each model's header names its sources, what it simplifies, and its fast and slow effects. `conservation`, the long headless run and the `scene` check keep passing; the `scene` check's seeded screenshot changes on purpose, so update it and say so.
- **It may touch:** `src/sim/models/` (the three models and their tests), `src/data/` (`climate-normals.ts`, `soils.ts`, and `garden.ts` for the roof area and bed soils), `src/sim/systems.ts` (three entries), `src/sim/state.ts` and `src/sim/graph.ts` only to add the stock keys and boundaries these need, `src/sim/save.ts` (the migration step), `src/ui/map/` and `src/ui/` panels (the weather and the soil drawn and shown), `src/ui/styles/tokens.css`, `tools/checks/scene.mjs` (its screenshot and anything it should now see), `docs/systems/` (a note each for weather, soil and water, naming every file in the first paragraph), `docs/SYSTEMS.md` outside its joined lists, `docs/roadmap.d/` (its own item), `docs/briefs/weather-soil-water.md` (this brief, saved as is), `docs/lessons/` (its look back) and `src/updates.d/` (a What's new fragment). No new runtime dependency. Anything else is outside the brief.

## Read first

- The project notes, then `node tools/graph.mjs src/sim/clock.ts`, `node tools/graph.mjs src/sim/graph.ts` and `node tools/graph.mjs src/ui/map/draw.ts`, and only the files those list.
- The founding spec's systems map rows for "Calendar and climate", "Soil" and "Water", and the garden's paragraph (not the whole spec).
- `docs/SYSTEMS.md` ("Layers", "Time", "Speed budget"), `docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md` and `docs/decisions/ADR-2026-09-28-scale-free-graph.md`.
- `docs/lessons/5-graph-and-clock.md`: measure the copy and the frame the way part 1 did; name every file in a note's first paragraph.
- The `feature` and `steward` playbooks.

## Speed budget

Part 1 measured it and shared it out (`docs/SYSTEMS.md`, "Speed budget"). Parts 2 and 3 share, between them: 0.5 ms a garden game day headless in Node, 1.5 ms of a 1440 × 900 frame, 1 ms of a 4×-throttled phone frame, 0.4 ms of a tick's copy across the worker boundary, and 50 KB of `dist/` gzipped. This part takes at most half of each (0.25 ms a day, 0.75 ms and 0.5 ms a frame, 0.2 ms of copy, 25 KB), measured the way part 1 did, and says in the PR what it used.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook: Squash and merge by hand once Checks and the Description check are green on the latest head and the look back is committed in the PR (until the owner adds the ruleset and auto-merge), then confirm the "Publish to GitHub Pages" run finished and the site loads. Once the PR is open, call `subscribe_pr_activity` on it and end the turn: PR events wake the session. Don't book a `send_later`: the coordinator keeps the only check-in and will message this session if it stalls. When the PR has merged, the session stops.

## What's left for others

- Not this part: crops, the crop coefficients by crop, the gardener and watering, the kitchen, compost and the `garden` check (part 3); the bot (part 4); pests, which read this part's weather (part 5, the Smith period for blight, slugs after rain); Explain cards (part 5: write each model's header so its mechanism and source can be quoted); the upgrades that change water (part 6); sealing (part 7).
- Parts 3 and 4 start side by side from `main` after this merges, each from its own brief written by the coordinator.
- The owner: the ruleset on `main` requiring `check` and "Allow auto-merge" (noted in #1).

## When to stop and ask

- Only for something irreversible or outside this brief: repo settings, a change to the founding spec's model or carry-over rule, a new runtime dependency, or widening the slice.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question, the options and the default; where the choice is between things the owner can look at (how rain or frost is drawn), also publish a page that shows them with the default pre-selected and saves the pick where the session can read it back. Carry on with other work, look at the issue at each stopping point, and take the default after 12 hours with no answer. Say so in the PR.
- Where it's merely unclear, take the safer option (easier to undo, or changing the game less) and say so in the PR.

## Cost budget

- Estimate: about $20 (three models with sources and plausibility tests, a migration, drawing on the map, two or three CI rounds). Model `claude-opus-5-5` at high effort. Ultracode is allowed in the two places the coordinator's brief names: one agent per model's plausibility test or data file inside this PR, and the fresh review before the PR opens; a workflow never pushes or opens the PR, and its cost counts against this estimate.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions (`coordinator` playbook §5 and §7).
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim or split what's left (the map drawing can move to a follow-up, with the coordinator's agreement).
