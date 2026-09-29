# Hooks for the models written ahead (#38, #39) · 29 Sep 2026

- **Numbers:** estimate $9; $3.61 read when the PR opened, well under. One commit for the hooks, one after the fresh review; CI rounds are counted at the merge.
- **Went well:**
  - Optional parameters and new functions only, and a `LadderTotals` that extends `Totals`, kept every caller working and left `graph.ts` alone.
  - Benchmarking with the mix, demand and hours in each sample showed `windowTotals()` was 50 times slower than before; iterating the groups present instead of all eight got most of it back.
  - The fresh review found the one real inconsistency: a treated outbreak's event still ran 21 days.
- **Lessons:**
  - A hook that adds a second representation of one fact (an illness in the herd, and the event that shows it) needs a test that changes the fact and checks both. Only the review noticed that treating a herd left the event long.
  - Moving the garden's window to a year leaves other places that measure 28 days: the bot's measure and baseline and one strategy test are under `tools/` and `src/sim/`, out of this brief's bounds. A brief that changes a window should name who moves the bot's copy.
  - `vite-node` refuses scripts outside the repo root; put a throwaway benchmark in `build/` (git-ignored), not the scratchpad.
