Theme: model
# The carry-over rule's maths, ahead of part 7 (#17) · 29 Sep 2026

- **Numbers:** estimate $8; cost not yet known when the PR opened (read as unknown, not free). New files only, so nothing to merge from `main` and no bot run: nothing is wired, so `PLAY` can't change. Speed measured in Node and noted in `docs/systems/ladder.md`.
- **Went well:**
  - Writing the sealed tick, events and the offer's test as pure functions over the graph's own `Totals` meant no edit to any shared file; the wiring section of the note names every stock and boundary part 7 must add.
  - A fresh reviewer found a real inconsistency (Reliability measured on weekly samples was scaled down again by a weekly tick); it's fixed by restating Reliability per day and covered by a test.
- **Lessons:**
  - The `rules` check reads the bare word for the browser's global in strings and test names as well as code, so tests can't use it as a helper name or in an `it()` title; the sources name the cycle "window" only in comments.
  - Anything quadratic hiding in a test helper (a mean recomputed inside a map) looks like a slow model: measure the model on its own before blaming it.
  - A reviewer's claim needs the same check as any other: one finding (that the offer names no blocker until the cycle is full) was wrong, and the note I'd already edited to match it had to be put back.
