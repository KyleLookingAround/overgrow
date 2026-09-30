# Part 8, the allotment's first season (#77, #79) · 30 Sep 2026

- **Numbers:**
  - The estimate was $30. The session reported no cost figure at its stopping points.
  - The session started at about 05:50 UTC. The sim and bot were in at about 06:10, the panel, map and `season` check at about 06:25, and the PR opened at about 06:50.
  - No merges from `main` yet: neither #68 nor #72 had landed when the PR opened.
- **Went well:**
  - **The models were already written and tested** (`agency.ts`, `committee.ts`). Wiring them was one new file (`src/sim/season.ts`), the trough's and the spread's pure halves in the models, and a few hooks.
  - **The bot played the whole season on its first run**, with no errors, on seeds 1–3. It showed the design gaps early: a landslide vote, a daily "surplus" event counted as not quiet, and the garden's quiet measure picking up allotment days.
  - **Proving the garden unchanged was one command** against a build of `main` in a worktree. The only difference in `PLAY` was the save's version number.
- **Lessons:**
  - **`PLAY` fingerprints the save's version too.** Raising `SAVE_VERSION` changes `PLAY` everywhere, even where play is identical. → To prove "the garden unchanged", compare with the version held equal. The `balance` playbook's "identical `PLAY`" rule should say so; it's noted here for the next tidy.
  - **A stock topped up after the week's costs hides them.** The household's hours were refilled at the end of the week tick, after watching and reclaiming had spent them, so "watching costs time" cost nothing. The fresh review found it. → A budget stock refills at the start of its period, before anything spends it (`allotmentHours` is listed before the people's week).
  - **Profiler self-time lied about a 2 µs function.** A sampled profile under vite-node blamed `troughDay` for a tenth of a millisecond a day; timed in place, it took 2 µs. The real cost was allocation: twelve flows a day where one would do, and plans rebuilt when they hadn't moved. → Time a suspect in place with a loop before optimising it, and count flows and allocations a day.
