# Roadmap

What's being worked on, what's next, and ideas not yet agreed. Now, Next, the runbook and Done are joined from `docs/roadmap.d/`, one file per item: add or move an item by adding or editing its own file (first line `Section: now`, `next`, `runbook` or `done`), never these lists. The owner's ladder and the ideas are edited here, by hand. Anything here gets an issue before work starts; features also get a spec (`docs/specs/TEMPLATE.md`). The owner decides what moves up.

## Now

<!-- joined:now from docs/roadmap.d/ (Section: now) by tools/join.mjs: don't edit between these lines -->
- **The graph and the clock** (the first slice's part 1, `docs/briefs/graph-and-clock.md`, #4): nodes, stocks and flows in units with a conservation test, the clock and its ticks, commands and snapshots with activities, saving with versions, and the page's shell (the PixiJS map in the owner's style interpolating between snapshots, the top bar, the panel and the phone sheet) at every size, with the `layout` and `scene` checks and the speed budget's shares (`docs/SYSTEMS.md`, "Speed budget").
- **Weather, soil and water** (the first slice's part 2, `docs/briefs/weather-soil-water.md`, #6): a Richardson-type weather generator from a southern English station's normals with the warming index as its input, the FAO-56 soil water balance for each bed and the lawn with the butt filling from the shed's roof, and each soil's organic matter, nutrients and health; rain and frost drawn on the garden and the beds paling and darkening, a save from part 1 migrating to version 2.
- **Crops and the gardener** (the first slice's part 3, `docs/briefs/crops-and-gardener.md`, #8): six crops growing by degree days with FAO-56 coefficients, Ky and RB209 uptake, frost killing the tender ones; the gardener working the plan within four hours a day (six at weekends), every job drawn; the kitchen's 1 kg ask and the honesty box; the compost heap counted on the carbon dial, and digging a plot out of the lawn counted as land-use change (by command until part 6's more beds); the Garden and Kitchen tabs and the `garden` check; saves with no compatibility promise until the first release. Crops grow at the real degree-day pace, with a bed of overwintered salad leaves as the head start the owner chose (#11).
<!-- /joined:now -->

## Next

<!-- joined:next from docs/roadmap.d/ (Section: next) by tools/join.mjs: don't edit between these lines -->
- **Polish audit** (a part before the founding spec's part 15, the first release; from `docs/ideas/final-call-wins.md` W7): parallel read-only reviewers, each on one device or concern (a new game and the first minute; every tab and card at 320, 390, 768 and 1440; phones on their side; light, dark and night; the shared link, speed and a big screen; explanations and text), drive the built game headless from a one-page primer, and each returns a findings table and a "checked and fine" list as its final message. The part fixes what they find in batches by file, with a check for each fix, and records what was fine. The coordinator briefs it when its turn comes (Final Call's `docs/lessons/main-polish-audit.md` and `106-launch-audit.md`).
- **Models ahead: labour, machinery and energy** (#17, `docs/briefs/labour-machinery-energy.md`): three pure models in new files for part 13 to wire: hours and work by crop and month, wages, skill and what waits (labour); a second-hand tractor's fuel, breakdowns, repairs and compaction on wet ground (machinery); DEFRA and BEIS factors, pumps, a cold store and a tunnel heater as flows to the air (energy). Nothing is wired; part 13 adds the systems, stocks, commands and panels.
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
- **The runbook, from Final Call** (`docs/briefs/overgrow-setup.md`, `docs/decisions/ADR-2026-09-28-runbook-from-final-call.md`): project notes, five playbooks, briefs and specs from templates, one file per entry, the build, the checks and four workflows, trimmed to an empty game and reworked with the owner onto a TypeScript scaffold (`docs/decisions/ADR-2026-09-28-static-site-typescript.md`). Measure on the first slice: questions a session asks that its brief should have answered, merges from `main` by hand per PR (target zero or one), and cost against each brief's estimate.
<!-- /joined:runbook -->

## Done

<!-- joined:done from docs/roadmap.d/ (Section: done) by tools/join.mjs: don't edit between these lines -->
- **Easy wins from Final Call** (`docs/briefs/final-call-wins.md`): the wins to take from Final Call's UX, multi-device, game-design and runbook lessons (`docs/ideas/final-call-wins.md`), the UI and multi-device rules Overgrow adopts and leaves (`docs/decisions/ADR-2026-09-29-ui-from-final-call.md`), a polish audit before the first release, a few playbook lines, and the owner's pick on a `needs-owner` issue and a page; the coordinator folds the chosen wins into the parts' briefs.
- **The founding spec** (`docs/specs/overgrow.md`, #2): the model (one graph at every scale), the eight-level ladder, the carry-over rule, zooming back in, the systems map with each system's real-world basis, the first playable slice (the back garden and its step up to the allotment), state and time, the bot, the living map and the first roadmap, with #2's `needs-owner` issue for the owner's choices. Nothing is built until the owner approves it.
<!-- /joined:done -->
