# Brief: models ahead: the hooks the owner's answers ask of the merged models

The systems web (#31) found hooks the models written ahead need so they can grow up the ladder, and the owner approved the spec changes behind them on #29 (Q2, Q3, Q6, Q15; the coordinator's comment there lists every answer). This session adds those hooks to the models already merged ahead of their parts: the sealing maths (`src/sim/ladder.ts`, #20), livestock (#25), and labour, machinery and energy (#26). None of these is wired into the game yet, so nothing a player sees changes.

## Goal and what it may touch

- **Deliver** one PR on `feature/model-hooks` from `main` that adds the hooks below, each with a test, and updates each model's notes. Start from a GitHub issue (the Feature template) linking #29 and #31, and link it from the PR; the owner's answers on #29 approve this work in advance (the `feature` playbook, step 2).
- **The sealing maths** (`src/sim/ladder.ts`, `src/data/ladder-rules.ts`, `docs/systems/ladder.md`):
  - **Q2:** `Totals` (and the window's totals) carry demand (kg a day by product group, and £ a day spent) and hours (people-hours a day had and used), recorded in the history ring beside the five numbers.
  - **Q3:** Output carried by product group (the kitchen's groups: potatoes, salads, tomatoes, greens, and room for eggs, meat, milk and grain), with the headline Output their sum; the sealed tick keeps the mix.
  - A function that sums sealed children into a parent's totals (needed from level 3 up): Output and demand add by group, hours add, Reliability from the summed series, Health output-weighted, carbon and land add.
  - **Q6:** a wildlife part in `healthIndex()` (flowers, hedges and margins as an index), and the sample carrying it.
  - An event's money loss beside its kg lost, as the insurance hook.
  - **Q15:** the step-up offer's window becomes the level's last full rhythm cycle as the spec now sets it (the garden's last full year, or four seasons, instead of 28 days); the ring's cap grows to match, sampling weekly or by season if a daily ring would be too big (say which in the notes and keep the speed measured). Numbers stay marked proposed.
- **Livestock** (`src/sim/models/livestock.ts`, its data and `docs/systems/livestock.md`): hours per head (to feed labour); a sale or slaughter flow with a price; illness raising a `GameEvent` (the sealing maths' type) so an outbreak shows one and two levels up; a per-head aggregate for a herd of many (national herds later).
- **Labour, machinery and energy** (`src/sim/models/labour.ts`, `machinery.ts`, `energy.ts`, their data and notes): wages as a parameter rather than constants (so a minimum wage can set them later); a wage-payment flow; an off-farm role for the owner (the farm's off-farm income, meeting the household model's job); the grid's carbon factor and fuel prices as an index the level above sets.
- **Keep what callers use.** The storage and market (#36) and household (#32) models import some of these; change signatures only by adding optional parameters or new functions, run their tests, and fix any import you break in the same PR.
- **Real mechanisms, rough numbers** (`docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`): any new number names its source in the file's header, and each hook has a test asserting its direction and rough size (a sum of children equals the parent; an outbreak's event shows at the level above with the same kg lost; a higher wage parameter raises the wage flow).
- **It may touch:** `src/sim/ladder.ts`, `src/sim/ladder.test.ts`, `src/data/ladder-rules.ts`, `src/sim/models/livestock.ts`, `labour.ts`, `machinery.ts`, `energy.ts` and their tests and data files in `src/data/`, their notes in `docs/systems/` (`ladder.md`, `livestock.md`, `labour.md`, `machinery.md`, `energy.md`), imports in `household.ts`, `storage.ts` and `market.ts` only if a change breaks them, `docs/roadmap.d/` (its own item), `docs/briefs/model-hooks.md` (this brief, saved as is) and `docs/lessons/` (its look back). Never `src/sim/systems.ts`, `state.ts`, `graph.ts`, `commands.ts`, `save.ts`, `gardener.ts`, the kitchen, anything under `src/ui/`, `src/app/` or `tools/`, or the founding spec: part 5 is editing the shared files now, and a docs session is writing #29's answers into the spec.

## Read first

- The project notes, then `node tools/graph.mjs src/sim/ladder.ts`, `node tools/graph.mjs src/sim/models/livestock.ts` and `node tools/graph.mjs src/sim/models/labour.ts`, and only the files those list.
- Issue #29 (its "Hooks for the models being written now" section, Q2, Q3, Q6 and Q15, and the owner's answers).
- `docs/specs/overgrow/systems-web.md`: the carry-over section, the household traced up the ladder, and the rows for livestock, labour and energy; not end to end.
- `docs/systems/ladder.md`, `livestock.md`, `labour.md`, `energy.md`, `household.md` and `market.md`.
- The `feature` and `steward` playbooks.

## How it fits and grows

These hooks are how the models written ahead meet their rows in the systems web (`docs/specs/overgrow/systems-web.md`) up the ladder.
1. **Born where.** No new flows at birth; the hooks carry existing ones (kg by group, hours, £, wildlife) upwards, conserved.
2. **Across the ladder.** A sealed node now carries demand and hours (Q2), Output by group (Q3) and wildlife in Health (Q6); a parent sums its sealed children, so the town's demand is its households' baskets and the region's herd is its farms' herds.
3. **Loops.** The diet loop (demand by group meets supply by group), the agency loop (hours and wages) and the energy loop (the index the level above sets).
4. **People.** Hours per head and the owner's off-farm role put people's time in every total.
5. **The lever.** None new; the wage parameter and the energy index are levers a higher level will hold (the minimum wage, the grid).
6. **The map.** Nothing drawn until the parts wire them.
7. **Explain.** An outbreak's event carries its mechanism up the levels.
8. **Economy and balance.** The wage flow and sale flow move £; Q15's longer window changes when the offer comes, which part 6c measures with the bot.
9. **Carbon and land.** Unchanged, and summed correctly from children.
10. **Polish.** Notes in concise UK English.
11. **The lesson.** A level's totals are its people's work and its households' wants, not just its harvest.
12. **Unfolding.** No instruments here; the parts that wire them unfold them.

## Speed budget

None shipped: nothing reaches `dist/` until the parts wire it. Re-measure the sealing maths' costs in Node with the longer window and the summing function (a parent of twelve plots, and of a hundred nodes) and say them in `docs/systems/ladder.md`.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook: Squash and merge by hand once Checks and the Description check are green on the latest head and the look back is committed in the PR. The Catch up workflow merges `main` in as other parts land. Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged, the session stops.

## What's left for others

- Part 7 wires the sealing maths; parts 6c and 12 the livestock; part 13 labour, machinery and energy. Neighbours, agency and trust is a later models-ahead session. Don't start them.
- Part 5 and the spec-answers session are working on their own branches; never touch another session's files or branch.
- The owner has said the coordinator's recommendations stand for later choices.

## When to stop and ask

- Only for something irreversible or outside this brief: repo settings, a change to the founding spec's model beyond #29's answers, a new runtime dependency, or widening the slice.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question, the options and the default, carry on with the default, and say so in the PR.
- Where it's merely unclear, take the safer option (an added optional field or function rather than a changed one) and say so in the PR.

## Cost budget

- Estimate: about $9 (small changes across four models with tests, one or two CI rounds). Model `claude-sonnet-5-5`, the cheaper model (the models-ahead track). No workflows.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions.
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim what's left (the energy index can move to part 13).
