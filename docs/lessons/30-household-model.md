# The household economy's model, ahead of part 6b (#30) · 29 Sep 2026

- **Numbers:** estimate $9; cost not yet known when the PR opened (read as unknown, not free). New files only, so nothing to merge from `main` and no bot run: nothing is wired, so `PLAY` can't change. Speed measured in Node and noted in `docs/systems/household.md`.
- **Went well:**
  - Choosing the gardener's free-hours shares so the model gives exactly the four weekday and six weekend hours `jobs.ts` has means wiring it changes no pacing, and a test pins it.
  - A local flow type with three proposed boundaries kept the model out of `graph.ts` while still testing the system against a real graph.
- **Lessons:**
  - The footprint figures are rounded from the sources as I knew them, not read from the tables in this session; the note says so and asks 6b to check them, rather than presenting them as exact.
  - The kitchen's fixed ask and Family Food's purchased veg differ; the basket follows the ask (the brief's 10 % rule) and the note names the gap.
  - A household given to a plot-keeping test needs plots to share the hours across: a gardener's 32 garden hours a week keeps a whole plot easily, so neglect only shows with many plots or longer hours.
