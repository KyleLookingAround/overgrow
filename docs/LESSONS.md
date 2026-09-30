# Lessons from each PR

Before a PR merges, look back at the session that built it: what it cost, what slowed it, and what would have saved time or credits (the `steward` playbook's look back). A lesson marked → changed something, and says where.

- **One file per PR:** `docs/lessons/<pr>-<short-name>.md` (`main-<short-name>.md` for anything that reached `main` another way), in the shape the others have: `# Title · date`, then **Numbers**, **Went well** and **Lessons**, one line each, with → where a lesson changed something. Never add an entry to this file: the list below is joined from the folder by `node tools/join.mjs` (`npm run build` runs it).
- **The tidy.** Once 8 lessons are new since the last tidy (`node tools/join.mjs` counts them against `docs/lessons/.last-tidy`), the session that added the 8th says so in its PR, and a coordinator starts the tidy by hand (the `coordinator` playbook, §8). The tidy merges lessons that say the same thing, groups them by theme (a `Theme:` first line), deletes those out of date or already written into a playbook, the notes or a check, spot-checks that each → really landed where it says, and turns a lesson seen three times without a → into a change.
- **Final Call's lessons** (`KyleLookingAround/final-call`, `docs/LESSONS.md`) are where this runbook came from; `docs/decisions/ADR-2026-09-28-runbook-from-final-call.md` says which of them shaped what.

## The lessons

<!-- joined:lessons from docs/lessons/ by tools/join.mjs: don't edit between these lines -->
### Balance

- [The bot and the first baselines, the first slice's part 4 (#10) · 29 Sep 2026](lessons/10-bot-and-baselines.md)

### Checks

- [Headroom for the garden day, again (#61) · 29 Sep 2026](lessons/61-garden-day-headroom.md)

### Coordinator

- [The first slice's fifth coordinator (#73, #74, #78, #82) · 30 Sep 2026](lessons/82-coordinator-5.md)
- [The first slice's four coordinators (#28, #46, #60, #73) · 28–30 Sep 2026](lessons/73-coordinators.md)

### Model

- [The models written ahead of their parts (#17, #18, #20, #30, #34, #38–#40, #43) · 29 Sep 2026](lessons/43-models-ahead.md)

### Parts

- [Part 9, the first zoom back in (#87, #89) · 30 Sep 2026](lessons/89-zoom-back-in.md)
- [The playable garden, round four (#83) · 30 Sep 2026](lessons/83-playable-garden-4.md)
- [Part 8, the allotment's first season (#77, #79) · 30 Sep 2026](lessons/79-allotment-season.md)
- [Part 7, sealing and the step up (#69, #70) · 30 Sep 2026](lessons/70-step-up.md)
- [The UI and UX overhaul (#68) · 30 Sep 2026](lessons/68-ui-overhaul.md)
- [A shorter garden year (#65) · 29 Sep 2026](lessons/65-shorter-garden-year.md)
- [The playable garden, three rounds (#56, #58, #62) · 29 Sep 2026](lessons/62-playable-garden.md)
- [The household, the first slice's part 6b (#49) · 29 Sep 2026](lessons/49-household.md)
- [The garden's nutrients (Bug #47, #48) · 29 Sep 2026](lessons/48-garden-nutrients.md)
- [Unfolding and the first minute, the first slice's part 6a (#45) · 29 Sep 2026](lessons/45-unfolding-first-minute.md)
- [Pests, wildlife and Explain, the first slice's part 5 (#35) · 29 Sep 2026](lessons/35-pests-wildlife-explain.md)
- [Crops and the gardener, the first slice’s part 3 (#12) · 29 Sep 2026](lessons/12-crops-and-gardener.md)
- [Weather, soil and water, the first slice's part 2 (#7) · 29 Sep 2026](lessons/7-weather-soil-water.md)
- [The graph and the clock, the first slice's part 1 (#5) · 28 Sep 2026](lessons/5-graph-and-clock.md)

### Runbook

- [The runbook and the exchange with Final Call (#1, #14, #57) · 28–29 Sep 2026](lessons/57-runbook-and-final-call.md)

### Spec

- [The founding spec, the systems web and the owner's answers (#3, #31, #37) · 28–29 Sep 2026](lessons/37-spec-and-systems-web.md)

### Tidy

- [The first lessons tidy (#80) · 30 Sep 2026](lessons/80-lessons-tidy.md)

### Not sorted yet

- [Steady the light check and split CI (#85) · 30 Sep 2026](lessons/85-steady-ci.md)
- [A steady light at speed (#81) · 30 Sep 2026](lessons/81-steady-light.md)
<!-- /joined:lessons -->
