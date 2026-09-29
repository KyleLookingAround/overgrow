# Brief: models ahead: rotation over years and soil at field scale (for part 11)

The founding spec (`docs/specs/overgrow.md`) splits the first slice into fifteen parts. Parts 1 to 5 have merged and part 6a is building. Models written ahead have merged for the sealing maths, the household, livestock, labour, machinery and energy, storage and the market, and agency and the committee. This session writes, ahead of part 11 (fields and the year plan), the pure model of a rotation planned over years and of soil at field scale, so the smallholding's slowest levers pay back inside its two or three years (the owner's Q15), and so part 11 only has to wire it to the fields, the year plan and the map.

## Goal and what it may touch

- **Deliver** a pure, tested model in `src/sim/models/rotation.ts` (a year plan over fields, the effects of what came before, cover crops, legumes and fallow, and field-scale soil built on `soil.ts`'s functions), its data in `src/data/rotation.ts`, and its notes in `docs/systems/rotation.md`. Branch `feature/rotation-and-fields` from `main`, one PR. Start from a GitHub issue (the Feature template) and link it from the PR; the founding spec's rows below and the owner's answers on #29 approve this work in advance (the `feature` playbook, step 2).
- **The founding spec's rows it builds:** "The smallholding's first year" (a rotation planned over years: legumes, cover crops, fallow), the systems map's soil and nutrients rows at field scale (the nitrogen cycle: fixation, manure, leaching, nitrous oxide; organic matter), and roadmap part 11 (fields and the year plan: rotation over years, the year plan as the lever, soil at field scale). The tractor's compaction is in `machinery.ts` (#26); use it.
- **The owner's decisions it builds:**
  - **Q15 and decision 12, strategic and long, never boring:** each level lasts long enough for its slowest lever to pay back once, and every lever is a trade-off with no single best option. A rotation must beat growing the most valuable crop every year over three years (on soil, on pests, or both), while losing to it in year one; a cover crop costs a season's cash crop and pays back in organic matter and nitrogen; fallow rests the soil and earns nothing; a legume break fixes nitrogen and yields less cash. The tests show each trade-off both ways, over the horizon where it turns.
  - **Q6:** the wildlife part of Health: margins and hedges as a field's edge, taking land and giving pollination and pest control (`biodiversity.ts`, from part 5).
  - **Don't overwhelm the player:** say which instruments part 11 should unfold and when (proposed keys for `src/data/unfold.ts`, not added).
- **A known problem to diagnose, not fix:** part 5 found that the garden's beds' output falls towards nothing by year three, on `main` too, whatever the plan (its look back, `docs/lessons/35-pests-wildlife-explain.md`). Find why with a headless run (which stock runs down: nitrogen, organic matter, a pest's soil load, or something else) and write the cause, with numbers, in the notes' Wiring section for part 6c, which fixes it in the garden. Your field-scale model must not share the fault: a well-run rotation holds its yields over five years.
- **What it builds, concretely:**
  - **A year plan** over N fields: a crop, cover crop, legume, grass ley or fallow per field per season, with "follow the rotation" as a default plan and a score of what each plan costs and earns over three years.
  - **What came before.** Each field keeps its last few years: the families grown (soil-borne disease and pests building with repeats, as part 5's clubroot and potato cyst nematode do in the garden: use `pests.ts` where it fits), nitrogen left by legumes and manure, organic matter from cover crops and residues, and compaction from `machinery.ts`.
  - **Field-scale soil** from the per-bed soil model's functions (`soil.ts`), per hectare: moisture, N-P-K, organic matter and health, with leaching and nitrous oxide (IPCC emission factors) as the nitrogen's losses and carbon stored or lost in organic matter.
  - **Scale-free.** The same functions serve a garden bed, a field and, summed, a farm or region; say how.
  - **Tests** (`rotation.test.ts`): a legume break raises the next crop's nitrogen by roughly what RB209 credits; repeating a family builds its soil-borne pest and cuts yield in years two and three; a four-course rotation beats continuous wheat or potatoes over three years and loses in year one; a cover crop raises organic matter over years and costs the season; compaction lowers yield and recovers slowly; a well-run rotation holds yields over five years; leaching is higher on bare winter fields than under cover.
- **Ahead of its part, in new files only** (the models-ahead track). It never edits `src/sim/systems.ts`, `state.ts`, `graph.ts`, `commands.ts`, `save.ts`, `gardener.ts`, an existing model or dataset (`soil.ts`, `crops.ts`, `pests.ts`, `machinery.ts` included), anything under `src/ui/`, `src/app/` or `tools/`, the founding spec or the project notes: part 6a is editing the shared files now. Import from the merged models; if one needs a change (the soil model's year-three fault among them), say it in the notes for the wiring part. If it needs a unit, stock key or boundary the graph doesn't have, define it in its own file and say what part 11 must add to `graph.ts`.
- **Shaped for wiring.** Read how the merged models are built (`soil.ts`, `crops.ts`, `pests.ts`, `machinery.ts` and their tests, `src/sim/clock.ts` for `System` and `TickContext`) and write this one the same way: pure functions over the graph's typed quantities, no DOM, no `Math.random()`, no global state, and an exported `System` (not listed in `systems.ts`).
- **Real mechanisms, rough numbers** (`docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`): the model file starts with a one-line comment on what's in it, then `// Sources:` (AHDB RB209 for nitrogen credits and needs; IPCC N₂O emission factors; rotation trials such as Rothamsted's long-term experiments for yields over years; AHDB for soil-borne disease in rotations) and `// Simplifies:`, and says its fast and slow effect; data carries its licence and names no real place.
- **Its notes** (`docs/systems/rotation.md`, naming every file in its first paragraph): how it works, a **Wiring** section for part 11 (and the year-three fault's cause for part 6c), and "How it fits and grows" answered as below.
- **It may touch:** `src/sim/models/rotation.ts`, `rotation.test.ts`, `src/data/rotation.ts`, `docs/systems/rotation.md`, `docs/roadmap.d/` (its own item), `docs/briefs/rotation-and-fields.md` (this brief, saved as is) and `docs/lessons/` (its look back). Nothing else.

## Read first

- The project notes, then `node tools/graph.mjs src/sim/models/soil.ts` and `node tools/graph.mjs src/sim/clock.ts`, and only the files those list.
- The founding spec's "The smallholding's first year", its systems map rows for soil and nutrients, and the roadmap's part 11; not end to end.
- The systems web (`docs/specs/overgrow/systems-web.md`): the soil and rotation rows and its strategy section (rotation at levels 1 to 3).
- `docs/systems/soil.md`, `crops.md`, `pests.md`, `machinery.md` and `biodiversity.md`; part 5's look back; `docs/decisions/ADR-2026-09-29-strategic-and-long.md`; and `docs/briefs/agency-and-committee.md` (the shape of a models-ahead brief).
- The `feature` and `steward` playbooks.

## How it fits and grows

Its rows in the systems web (`docs/specs/overgrow/systems-web.md`) are soil, nutrients and rotation.
1. **Born where.** The garden's beds (a family not twice running), hands-on at the smallholding's fields (level 3): each field a node with soil stocks; flows are kg of N, P and K, kg of carbon in organic matter, kg N₂O and nitrate leached, conserved.
2. **Across the ladder.** A sealed smallholding carries its soil in Health and its rotation in Reliability; at the farm (4) many fields' plans; at the region, soil and nitrate as a tint and one line; it comes back as policy (nitrate zones, soil standards).
3. **Loops.** The intensification loop (inputs now, soil down over years) and the carbon loop (organic matter as a sink).
4. **People.** The smallholder and the hand do the work (hours through `labour.ts`); the player sets the year plan or lets the adviser.
5. **The lever.** The year plan: crop, cover, legume, ley or fallow per field per season; "follow the rotation"; "let them decide".
6. **The map.** Fields by crop and season, cover crops greening a winter field, compaction ruts, bare fields leaching; reduced motion shows seasons as steps.
7. **Explain.** Nitrogen fixation, soil-borne disease, organic matter, leaching and N₂O, each with its source.
8. **Economy and balance.** The kg and £ each plan earns over three years, and which bot milestones wiring it shifts at the smallholding.
9. **Carbon and land.** Organic matter as a sink, N₂O as an emission, margins taking land for wildlife.
10. **Polish.** What the year plan's panel needs at 320 px to large screens, in concise UK English.
11. **The lesson.** Rotation and cover pay back over years, not in the first one; the same crop every year wins once and loses after.
12. **Unfolding.** The year plan with the first field, soil numbers with the first feeding choice, as proposed `unfold.ts` keys.

## Speed budget

None shipped: nothing reaches `dist/` until part 11 wires it. Measure a year's call headless in Node for ten fields and say it in the notes.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook: Squash and merge by hand once Checks and the Description check are green on the latest head and the look back is committed in the PR; the Pages run publishes nothing new, since nothing is wired. The Catch up workflow merges `main` in as other parts land; new files only means it should never conflict. Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged, the session stops.

## What's left for others

- Part 11 wires this; part 6c fixes the garden's year-three fault from your diagnosis. Don't start them.
- Part 6a is editing the shared files; never touch another session's files or branch.
- The owner has said the coordinator's recommendations stand for later choices.

## When to stop and ask

- Only for something irreversible or outside this brief: repo settings, a change to the founding spec's model or carry-over rule, a new runtime dependency, or widening the slice.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question, the options and the default, carry on with the default, and say so in the PR.
- Where it's merely unclear, take the safer option (a plainer model with its simplification named) and say so in the PR.

## Cost budget

- Estimate: about $10 (one model with data, a diagnosis and plausibility tests over years, one or two CI rounds). Model `claude-sonnet-5-5`, the cheaper model (the models-ahead track). No workflows.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions.
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim what's left (leaching and N₂O can move to part 11).
