# Roadmap

What's being worked on, what's next, and ideas not yet agreed. Now, Next, the runbook and Done are joined from `docs/roadmap.d/`, one file per item: add or move an item by adding or editing its own file (first line `Section: now`, `next`, `runbook` or `done`), never these lists. The owner's ladder and the ideas are edited here, by hand. Anything here gets an issue before work starts; features also get a spec (`docs/specs/TEMPLATE.md`). The owner decides what moves up.

## Now

<!-- joined:now from docs/roadmap.d/ (Section: now) by tools/join.mjs: don't edit between these lines -->
- **The founding spec** (`docs/specs/overgrow.md`, branch `feature/game-spec`): the ladder, the carry-over rule, zooming back in, the first playable slice (the back garden and its step up to the allotment), state and time, the bot, the food-system effects, the look and the first roadmap, with a `needs-owner` issue for the owner's choices. Nothing is built until the owner approves it.
<!-- /joined:now -->

## Next

<!-- joined:next from docs/roadmap.d/ (Section: next) by tools/join.mjs: don't edit between these lines -->
<!-- /joined:next -->

## The owner's ladder

From the owner's idea (28 Sep 2026, `docs/briefs/overgrow-setup.md`). Every level is a zoom-out: what the player micromanaged in one becomes a single building block in the next, and the clock speeds up.

1. **Back garden:** soil, watering, pests, what grows when. Time passes in days.
2. **Allotment or community garden:** shared space and water, other gardeners, swapping surplus.
3. **Smallholding or farm:** crop rotation, machinery, labour, weather risk. Time passes in seasons.
4. **Local distribution:** farm shops, markets and spoilage. Food has a shelf life on the road.
5. **Supermarket supply chain:** depots, lorry routes, cold chain, demand spikes, waste.
6. **National or global:** imports, harvest failures abroad, fuel costs, food security.

- **The twist:** now and then the player zooms back in, to fix one failing node at the small scale.

## The runbook

How sessions work, not the game. Each item is small and measured in the lessons (`docs/lessons/`); it stays only if it clearly helps.

<!-- joined:runbook from docs/roadmap.d/ (Section: runbook) by tools/join.mjs: don't edit between these lines -->
- **The runbook, from Final Call** (`docs/briefs/overgrow-setup.md`, `docs/decisions/ADR-2026-09-28-runbook-from-final-call.md`): project notes, five playbooks, briefs and specs from templates, one file per entry, the build, the checks and four workflows, trimmed to an empty game. Measure on the first slice: questions a session asks that its brief should have answered, merges from `main` by hand per PR (target zero or one), and cost against each brief's estimate.
<!-- /joined:runbook -->

## Done

<!-- joined:done from docs/roadmap.d/ (Section: done) by tools/join.mjs: don't edit between these lines -->
<!-- /joined:done -->
