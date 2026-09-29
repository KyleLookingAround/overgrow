# Lessons from each PR

Before a PR merges, look back at the session that built it: what it cost, what slowed it, and what would have saved time or credits (the `steward` playbook's look back). A lesson marked → changed something, and says where.

- **One file per PR:** `docs/lessons/<pr>-<short-name>.md` (`main-<short-name>.md` for anything that reached `main` another way), in the shape the others have: `# Title · date`, then **Numbers**, **Went well** and **Lessons**, one line each, with → where a lesson changed something. Never add an entry to this file: the list below is joined from the folder by `node tools/join.mjs` (`npm run build` runs it).
- **The tidy.** Once 8 lessons are new since the last tidy (`node tools/join.mjs` counts them against `docs/lessons/.last-tidy`), the session that added the 8th says so in its PR, and a coordinator starts the tidy by hand (the `coordinator` playbook, §8). The tidy merges lessons that say the same thing, groups them by theme (a `Theme:` first line), deletes those out of date or already written into a playbook, the notes or a check, spot-checks that each → really landed where it says, and turns a lesson seen three times without a → into a change.
- **Final Call's lessons** (`KyleLookingAround/final-call`, `docs/LESSONS.md`) are where this runbook came from; `docs/decisions/ADR-2026-09-28-runbook-from-final-call.md` says which of them shaped what.

## The lessons

<!-- joined:lessons from docs/lessons/ by tools/join.mjs: don't edit between these lines -->
### Coordinator

- [The first slice's second coordinator (#46) · 29 Sep 2026](lessons/46-second-coordinator.md)
- [The first slice's first coordinator · 28–29 Sep 2026 (#28)](lessons/28-first-coordinator.md)

### Exchange

- [Lessons from Final Call, carried into the playbooks (#57) · 29 Sep 2026](lessons/57-lessons-from-final-call.md)

### Model

- [The agency and committee models, ahead of parts 8 to 10 (#40) · 29 Sep 2026](lessons/2026-09-29-09-agency-and-committee-models.md)
- [The storage and market models, ahead of part 14 (#34) · 29 Sep 2026](lessons/34-storage-and-market.md)
- [The carry-over rule's maths, ahead of part 7 (#20) · 29 Sep 2026](lessons/20-sealing-maths.md)

### Runbook

- [Easy wins from Final Call (#14) · 29 Sep 2026](lessons/14-final-call-wins.md)
- [The runbook, from Final Call, then reworked with the owner (#1) · 28 Sep 2026](lessons/1-runbook.md)

### Spec

- [The founding spec (#3) · 28 Sep 2026](lessons/3-game-spec.md)

### Not sorted yet

- [The rotation and field-soil model, ahead of part 11 (#43) · 29 Sep 2026](lessons/2026-09-29-10-rotation-and-fields-model.md)
- [The playable garden (#56) · 29 Sep 2026](lessons/56-playable-garden.md)
- [The household, the first slice's part 6b (#49) · 29 Sep 2026](lessons/49-household.md)
- [The garden's nutrients (Bug #47, #48) · 29 Sep 2026](lessons/48-garden-nutrients.md)
- [Unfolding and the first minute, the first slice's part 6a (#45) · 29 Sep 2026](lessons/45-unfolding-first-minute.md)
- [Hooks for the models written ahead (#38, #39) · 29 Sep 2026](lessons/39-model-hooks.md)
- [The owner's answers on the systems web, written into the spec (#37) · 29 Sep 2026](lessons/37-spec-answers.md)
- [Pests, wildlife and Explain, the first slice's part 5 (#35) · 29 Sep 2026](lessons/35-pests-wildlife-explain.md)
- [The systems web, every mechanic across the ladder (#31) · 29 Sep 2026](lessons/31-systems-web.md)
- [The household economy's model, ahead of part 6b (#30) · 29 Sep 2026](lessons/30-household-model.md)
- [Livestock model, ahead of parts 6 and 12 (#18) · 29 Sep 2026](lessons/18-livestock-model.md)
- [Labour, machinery and energy models, ahead of part 13 (#17) · 29 Sep 2026](lessons/17-labour-machinery-energy.md)
- [Crops and the gardener, the first slice’s part 3 (#12) · 29 Sep 2026](lessons/12-crops-and-gardener.md)
- [The bot and the first baselines, the first slice's part 4 (#10) · 29 Sep 2026](lessons/10-bot-and-baselines.md)
- [Weather, soil and water, the first slice's part 2 (#7) · 29 Sep 2026](lessons/7-weather-soil-water.md)
- [The graph and the clock, the first slice's part 1 (#5) · 28 Sep 2026](lessons/5-graph-and-clock.md)
<!-- /joined:lessons -->
