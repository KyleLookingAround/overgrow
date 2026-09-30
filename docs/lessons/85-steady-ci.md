# Steady the light check and split CI (#85) · 30 Sep 2026

- **Numbers:**
  - The estimate was $6. Session start about 10:00 UTC, PR opened at about 11:30; two commits before the PR, no merges from `main`. Cost and context weren't read from the session at the time.
  - The suite took 30–33 minutes as one job; `scene` alone took about 8 minutes a run locally, so proving it five times took most of the session.
- **Went well:**
  - **The cause was found by reading, not by reproducing.** The failing cases start from the last case's night layer, which eases at 0.2 a second and slower on a busy runner, against a fixed 2.5 s wait. The renderer was right; the check was timing-dependent.
  - **The split changes no check.** `check.mjs` only gained a list of groups and `--except`, so a new group joins "the rest" by itself.
- **Lessons:**
  - **Wait for the condition, never a fixed sleep.** A `scene` case that follows another on the same page inherits its state. → The watch now waits for the view's hour and a night layer that has stopped moving (`tools/checks/scene.mjs`).
  - **A flake that never fails locally still needs proof by reasoning.** Five local runs passed before and after the fix, so they show no regression, not that the flake is gone. → CI on this PR and the next runs of `main` are the real test; reopen if it recurs.
  - **A group past about 8 minutes wants its own job.** → "CI's limit" in `docs/SYSTEMS.md` says so.
