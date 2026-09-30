# Steady the light check and split CI (#85) · 30 Sep 2026

- **Numbers:**
  - The estimate was $6. Session start about 10:00 UTC, PR opened at about 11:30; two commits before the PR, no merges from `main`. Cost and context weren't read from the session at the time.
  - The suite took 30–33 minutes as one job; `scene` alone took about 8 minutes a run locally, so proving it five times took most of the session.
- **Went well:**
  - **The split works.** On its own run the three parts took 11, 14 and 10 minutes against 30–33 for one job, and the `check` gate reported red for the one failing part.
  - **The split changes no check.** `check.mjs` only gained a list of groups and `--except`, so a new group joins "the rest" by itself.
- **Lessons:**
  - **My first fix was wrong, and the cause was not the easing.** The wait I first wrote passed locally and still failed on CI. Logging the view's hour and night under 4× CPU throttling showed a new game is not at a known hour: it runs a few game hours at the last game's speed (16× here) before its pause lands, so `tick 6` from "hour 6" gave any hour, night included on a slow runner. → The watch now waits for the new game to stand still, ticks on to the hour it needs from where it really is, waits for the view and the night layer to settle, and never assumes the start hour (`tools/checks/scene.mjs`). That a new game briefly keeps the old speed is left to the coordinator (`src/app/` is outside this brief).
  - **Wait for the condition, never a fixed sleep,** and prove a timing fix under the runner's conditions, not only on a fast machine: five local runs passed before and after either fix. → Reproduce a CI-only flake with `Emulation.setCPUThrottlingRate` and a log of the values the check reads.
  - **A group past about 8 minutes wants its own job.** → "CI's limit" in `docs/SYSTEMS.md` says so.
