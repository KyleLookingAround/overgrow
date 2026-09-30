Theme: parts
# Weather, soil and water, the first slice's part 2 (#7) · 29 Sep 2026

- **Numbers:** estimate $20; no cost figure had reached the session when the PR opened (read as unknown, not free). Session started 00:37 UTC, PR opened 01:41 UTC, no waiting on the owner. Three commits before opening, the last acting on the fresh review; CI rounds and merges from `main` are counted at the merge.
- **Went well:**
  - Probing the models in Node before writing tests caught the sizes early. A ten-year run of the whole garden and a forty-year run of the generator against the normals set the tests' bounds from what the model does, not from guesses.
  - Rebuilding a part-1 save from this build and checking it byte for byte against one written by `main`'s own build (in a worktree) gave the migration test a real fixture without adding a file.
  - Measuring the top bar's height at every size, with and without the temperature, settled "if it fits at 320 px" in one pass: it doesn't.
  - The fresh review found the one real bug. At a week's or a month's step, one day's weather stood for the step and turned a week's rain into one downpour. No test ran a step longer than an hour.
- **Lessons:**
  - A model on the clock's ticks gets a test at every step length it will run at (an hour, a day, a week, a month), not only the garden's. The water test now holds the four to the same balance.
  - Don't `git stash` or `git checkout` around a build to compare with `main`: `npm run build` rewrites the joined lists and the dist left is neither build. Build `main` in a `git worktree`. → `balance` and `feature` step 4 "Speed".
  - The page's speed figures vary by ±0.5 ms on SwiftShader, as big as a part's share: compare against `main` run for run. → `feature` step 4 "Speed".
  - A paused view jumps only past four steps, and under reduced motion holds the snapshot before the jump. → `feature` step 4 (seen again in #12, #45, #62, #70).
