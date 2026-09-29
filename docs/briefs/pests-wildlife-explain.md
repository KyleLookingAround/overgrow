# Brief: part 5 of the first slice, pests, wildlife and Explain

The founding spec (`docs/specs/overgrow.md`) splits the first slice into fifteen parts. Parts 1 to 3 (#5, #7, #12) laid the graph, the clock, saves and the shell; the weather, soil and water; and the crops, the gardener and the kitchen, with the owner's head start (#11). Part 4 (the bot, #10) is finishing beside this part and touches only `tools/`. This is part 5: the garden's pests and wildlife, the gardener's pest policy, and the Explain card on every effect so far. Three model sessions run beside it (sealing for part 7, livestock for parts 6 and 12, labour, machinery and energy for part 13): they add new files only and never touch this part's.

## Goal and what it may touch

- **Deliver** the founding spec's part 5 ("The first roadmap", item 5): slugs, aphids and blight moving on the map; the gardener's pest policy (leave, pick, trap, treat) with what each costs in time and its side effects; bees and ladybirds when there are flowers, and the cat; and the Explain card on every effect so far. Branch `feature/pests-wildlife-explain` from `main`, one PR.
- **The spec is its spec.** The founding spec's systems map rows for "Pests, disease and weeds" and "Biodiversity", the garden's "Pests" line, "The first minute" steps 3 and 4 (the slugs at dusk and the first Explain card; the beer trap itself is part 6's shed), "Every effect can be explained" and "Explain" in "The look", and "The first roadmap" item 5 are approved; this brief approves them in advance for this part (the `feature` playbook, step 2), so no new spec file. Start from a GitHub issue (the Feature template) and link it from the PR.
- **What it builds, concretely:**
  - **Pests** (`pests.ts` in `src/sim/models/`, data beside the crops'): slugs as a population per bed and the lawn's edge, active at night after rain and on wet soil, eating seedlings and leaves (UK slug guidance, AHDB); aphids on beans by degree days (a degree-day insect model), checked by ladybirds when there are flowers; potato and tomato blight in a Smith period (two days at or above 10 °C minimum with 11 hours or more at 90 % humidity: part 2's weather gives the humidity or a documented stand-in), spreading on the crop and cutting its yield. Losses are kilograms taken from the crops as flows (to the heap, or eaten by the pest and lost as `waste`), so the `conservation` test covers them. Each pest names its fast effect (a nibbled bed tonight) and its slow one (a population that grows over a wet season, or blight spores carried year to year on left tubers).
  - **Wildlife** (`biodiversity.ts` in `src/sim/models/`): pollinators raising the yield of pollinated crops (beans, tomatoes) by the share Klein et al. (2007) gives, and natural enemies (ladybirds) suppressing aphids, both scaled by flowers in the garden: marigolds (and other flowers) become something the plan can sow in a bed or its edge, from part 3's crop data. The cat is drawn from totals and does nothing to the game.
  - **The pest policy** (the plan's pest line in the Garden tab, part 3 left room for it): leave, pick (the gardener's hours, at dusk with a torch for slugs, a share caught), trap (a time cost and a catch rate; the beer trap to buy is part 6's), treat (pellets or a spray, quick, with its side effects: fewer ladybirds and bees, and ferric phosphate's or a fungicide's rough effect). The gardener does the work as activities, each trip a new id. Part 6's advisers and upgrades build on it.
  - **The Explain card, with every change having a cause and a place** (the owner's chosen win W3, `docs/ideas/final-call-wins.md`): one entry point in the sim that records each effect's kind, its cause and amount, and the node it happened at, carried in the snapshot; one table in `src/data/` that maps each cause to what to say, its mechanism, its fast and slow effects and its source (the model headers already name them); the Explain card reads it, and the map pulses at the place. A tap on any effect, badge or number opens its card. Cover every effect the game has so far: rain, frost, drought and waterlogging, soil organic matter and nitrate leaching, growth and water stress, frost damage, harvest, the kitchen's ask and the honesty box, the heap and digging, and this part's pests and wildlife. A browser check (`explain`) plays a seeded week and fails on any cause with no entry, and taps one effect of each kind to see its card.
  - **On the map** (impacts on the map first): slugs creeping onto wet beds at dusk and leaving slime and nibbled leaves; aphids clustering on bean tips; blight browning leaves; bees and ladybirds over flowers; the cat; the gardener with a torch. All drawn from the sim's populations, cosmetic randomness seeded from the game's seed; nothing drawn changes the game; reduced motion jumps per tick. No text events.
  - **Tests.** A plausibility test per model (`<name>.test.ts`): slugs rise after a wet week and do most damage to seedlings; aphids build on beans in a warm June and fall with ladybirds present; a Smith period starts blight and an unsprayed potato bed loses a large share of its tops; flowers raise bean yield by Klein's rough size; treating cuts pests fast and wildlife with them. `conservation`, the long headless run, `garden`, `layout` and `scene` keep passing; part 4's bot, once merged, still runs.
- **The UI rules** (`docs/decisions/ADR-2026-09-29-ui-from-final-call.md`, which binds a part as it touches the UI) and the owner's chosen wins that land here (`docs/ideas/final-call-wins.md`):
  - W13, one overlay style: a single Preact `Card` (title, body, footer, close, safe-area padding) for the Explain card and every card after it.
  - W15, a placement pass for map badges and labels (labels only when their anchor is on screen), with a check that calls the same helper the map draws with.
  - W12, the chrome lets taps through to the map.
  - W27, notices are capped and expire (rare in Overgrow; impacts go on the map).
  - Part 3 left two: W2, breakpoints by the map's and the panel's width with container queries, and safe areas with `env(safe-area-inset-*)` on every side; and W11, the speeds fold into one cycling button when the top bar is narrow. Take both here, since the Explain card and the pest line add to the chrome, and extend the `layout` check (write it first and watch it fail; check the row, not only each control; tap on a touch page).
- **It may touch:** `src/sim/models/` (pests, biodiversity and their tests; `crops.ts` for pest damage and pollination hooks), `src/sim/` (the cause-and-place entry point in its own file, `systems.ts` entries, `commands.ts` and the gardener's file for the pest policy and its jobs, `state.ts`, `graph.ts` and `save.ts` as needed: no save compatibility before the first release), `src/data/` (pests, flowers, the Explain table), `src/ui/` (the Card, the Explain card, the pest line, badges and the map's drawing, `tokens.css`, `page.css`), `tools/checks/` (the new `explain` group, and `layout`, `scene` or `garden` where this changes what they see), `docs/systems/` (a note each for pests, biodiversity and Explain, naming every file in the first paragraph, and edits to the notes this changes), `docs/SYSTEMS.md` outside its joined lists, `docs/roadmap.d/` (its own item), `docs/briefs/pests-wildlife-explain.md` (this brief, saved as is), `docs/lessons/` (its look back) and `src/updates.d/` (a What's new fragment). Not `tools/bot.ts` or `tools/baseline.json` (part 4's), and none of the model sessions' new files. No new runtime dependency. Anything else is outside the brief.

## Read first

- The project notes, then `node tools/graph.mjs src/sim/models/crops.ts`, `node tools/graph.mjs src/sim/gardener.ts` and `node tools/graph.mjs "The map and the page's shell"`, and only the files those list.
- The founding spec's rows and lines named above (not the whole spec).
- `docs/decisions/ADR-2026-09-29-ui-from-final-call.md`, `docs/decisions/ADR-2026-09-29-no-save-compatibility-before-release.md`, the rows W2, W3, W11, W12, W13, W15 and W27 in `docs/ideas/final-call-wins.md` (Final Call is public: `GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/KyleLookingAround/final-call ../final-call` if a row's source is worth reading), and `docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`.
- The look backs in `docs/lessons/` from parts 1 to 3.
- The `feature` and `steward` playbooks (both changed on 29 Sep).

## Speed budget

Parts 5 to 14 share a reserve (`docs/SYSTEMS.md`, "Speed budget"): 1.0 ms a garden game day headless, 3 ms of a 1440 × 900 frame, 1.6 ms of a 4×-throttled phone frame, 1.5 ms of a tick's copy and 275 KB of `dist/` gzipped. This part takes at most 0.15 ms a day, 0.4 ms of the desktop frame, 0.25 ms of the phone frame, 0.15 ms of the copy and 25 KB, measured the way part 1 did, and says in the PR what it used.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook: Squash and merge by hand once Checks, the Description check and (once part 4 has added it) the Balance workflow are green on the latest head and the look back is committed in the PR (until the owner adds the ruleset and auto-merge), then confirm the "Publish to GitHub Pages" run finished and the site loads. Pests change pacing: once part 4's bot is on `main`, run it on seeds 1–3 before and after (the `balance` playbook) and report the table; a change beyond the proposed baselines is reported, not blocked on, while they're still proposed. Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged, the session stops.

## What's left for others

- Part 6: the shed and its upgrades (the beer trap, nematodes, netting, the hen house), the advisers, "let them decide", the goal bar and the scripted first minute. Leave the pest policy and the Explain table ready for them.
- Part 7: sealing (a model session is writing its maths in `src/sim/ladder.ts` beside you; don't touch it).
- The model sessions' new files (`ladder.ts`, the livestock, labour, machinery and energy models and their data) are theirs.
- The owner has said the coordinator's recommendations stand for later choices.

## When to stop and ask

- Only for something irreversible or outside this brief: repo settings, a change to the founding spec's model or carry-over rule, a new runtime dependency, or widening the slice.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question, the options and the default, carry on with the default, and say so in the PR; the owner has said the recommended option stands unless they answer.
- Where it's merely unclear, take the safer option (easier to undo, or changing the game less) and say so in the PR.

## Cost budget

- Estimate: about $25 (two models and a pest policy with their tests, the Explain table and card over every effect, the map's drawing, the shell's container queries and folding speeds, a new check, and a bot run before and after, with two or three CI rounds). Model `claude-opus-5-5` at high effort. Ultracode is allowed in the two places the coordinator's brief names: one agent per model's plausibility test or data file inside this PR (the Explain table's entries are a good fan-out), and the fresh review before the PR opens; a workflow never pushes or opens the PR, and its cost counts against this estimate.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions.
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim or split what's left (the cat, or the shell's folding speeds, can move to a follow-up, with the coordinator's agreement).
