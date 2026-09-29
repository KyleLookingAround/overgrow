# Lessons from each PR

Before a PR merges, look back at the session that built it: what it cost, what slowed it, and what would have saved time or credits (the `steward` playbook's look back). A lesson marked → changed something, and says where.

- **One file per PR:** `docs/lessons/<pr>-<short-name>.md` (`main-<short-name>.md` for anything that reached `main` another way), in the shape the others have: `# Title · date`, then **Numbers**, **Went well** and **Lessons**, one line each, with → where a lesson changed something. Never add an entry to this file: the list below is joined from the folder by `node tools/join.mjs` (`npm run build` runs it).
- **The tidy.** Once 8 lessons are new since the last tidy (`node tools/join.mjs` counts them against `docs/lessons/.last-tidy`), the session that added the 8th says so in its PR, and a coordinator starts the tidy by hand (the `coordinator` playbook, §8). The tidy merges lessons that say the same thing, groups them by theme (a `Theme:` first line), deletes those out of date or already written into a playbook, the notes or a check, spot-checks that each → really landed where it says, and turns a lesson seen three times without a → into a change.
- **Final Call's lessons** (`KyleLookingAround/final-call`, `docs/LESSONS.md`) are where this runbook came from; `docs/decisions/ADR-2026-09-28-runbook-from-final-call.md` says which of them shaped what.

## The lessons

<!-- joined:lessons from docs/lessons/ by tools/join.mjs: don't edit between these lines -->
### Model

- [The carry-over rule's maths, ahead of part 7 (#20) · 29 Sep 2026](lessons/20-sealing-maths.md)

### Runbook

- [Easy wins from Final Call (#14) · 29 Sep 2026](lessons/14-final-call-wins.md)
- [The runbook, from Final Call, then reworked with the owner (#1) · 28 Sep 2026](lessons/1-runbook.md)

### Spec

- [The founding spec (#3) · 28 Sep 2026](lessons/3-game-spec.md)

### Not sorted yet

- [Crops and the gardener, the first slice’s part 3 (#12) · 29 Sep 2026](lessons/12-crops-and-gardener.md)
- [Weather, soil and water, the first slice's part 2 (#7) · 29 Sep 2026](lessons/7-weather-soil-water.md)
- [The graph and the clock, the first slice's part 1 (#5) · 28 Sep 2026](lessons/5-graph-and-clock.md)
<!-- /joined:lessons -->
