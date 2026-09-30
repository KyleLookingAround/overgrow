Theme: parts
# Part 9, the first zoom back in (#87, #89) · 30 Sep 2026

- **Numbers:**
  - The estimate was $25. The session reported no cost figure at its stopping points.
  - The session started at about 11:59 UTC. The sim and the bot were in at about 12:15, the page and the `zoom` check at about 12:40, and the PR opened at about 13:20.
  - One merge from `main` (#86) by hand, before opening.
  - Item 5 (the seed catalogue's adviser) was trimmed and handed on.
- **Went well:**
  - **Going down reused the level machinery whole.** The kept garden graph became `s.graph` again at level 1, so every garden system, panel, card and bot policy worked down there with no new code. Only the page's delta and the sim's snapshot cache needed to learn that a level change swaps the graph.
  - **The bot played it on its first run**, and the garden's lines stayed identical to `main`'s on seeds 1–3.
  - **The fresh review earned its keep:** it found five sim bugs, including a rescue that fired when the beds were emptied and a second trip down bringing the slugs again.
- **Lessons:**
  - **A probe on the bot's garden hid a weather dependence.** The bot's well-kitted garden (beer traps, hens, many beds) broke the outbreak in days whatever the policy. A bare test garden in a dry June couldn't be rescued by the patrol at all, and the first `zoom` check failed on it. → `feature` step 3's "Probe before you write" now says to probe a bare garden as well as the bot's.
  - **A graph swapped under a cached snapshot shows the old level's nodes**, because the copy cache and the worker's delta keyed on node ids and the graph's revision, which two graphs can share. → The copy cache now keeps the graph it copied from, and a change of level sends the snapshot whole (`src/sim/state.ts`, `src/app/delta.ts`).
  - **The `scene` group's "at 1× the night still falls" fails about one run in three on `main` too**: the view sometimes reads a full night at noon before the first frame settles. It needs its own fix. This PR doesn't touch it.
