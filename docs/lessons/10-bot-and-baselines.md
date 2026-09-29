# The bot and the first baselines, the first slice's part 4 (#10) · 29 Sep 2026

- **Numbers:** estimate $15; $5.84 when the fresh review ran (context about 240k of 1M). Session started 02:28 UTC; draft PR opened 02:44, part 3 merged 04:02, wired and proposed by 04:20. About 80 minutes waiting on part 3, spent reading its branch and wiring against it in a scratch worktree. One `needs-owner` issue (#15, the baselines) with a page for the pick. Merges from `main`: two, both by Catch up. Seeds 1–3 through 120 days take about 1.2 s together, start-up included.
- **Went well:**
  - Building the frame against `main` before part 3 had pushed anything (the run loop, the table, the workflow, the tests) left only the wiring for after its merge: milestones, measures and players are one line each, so part 3's shape changed three lines, not the design.
  - Wiring against part 3's branch in a `git worktree` (never pushing to it) found the crop milestones in its kitchen ledger before it merged, so the merge-day work was a copy and a re-run. The owner's head start landed in the last hour; one line (first sowing counts only a crop sown in the game) was all it needed.
  - Running more players and seeds than the brief asked (six seeds, five plans, two paces) showed the spec's rotation test fails for a reason, not by the dice: nothing yet makes a crop family cost anything. Before the owner's head start, seeds 1–3 averaged passed it, only because of when the potatoes were lifted.
  - The fresh review found no bug in the day accounting, but it found that an `it.fails` test stays green when the code under it crashes, and that a label only re-runs a workflow when added.
- **Lessons:**
  - `it.fails` passes on any throw, so it can't mark a known gap: a crash reads as the gap still being there. Assert today's relation in a plain test and say which part turns it round (`src/sim/strategy.test.ts`).
  - A strategy test on three seeds can pass by luck. Before trusting one, run a few more seeds and a second pace, and see whether the gap has a mechanism behind it.
  - A `labeled` trigger fires only when the label is added: to re-run a label-driven workflow, remove the label and add it again (the `balance` playbook, Tips).
  - A range with no upper end can't catch a milestone that regresses to never (`first-sale`, `half-kitchen` in `tools/baseline.json`). It's in the owner's issue (#15); when the game reaches them, give them both ends.
  - Push, wait for the push's run to show, and only then mark a draft ready. A push two seconds before leaving draft started a Checks run that skipped (it saw a draft) and, sharing the PR's concurrency group, cancelled the ready run; the latest head had no Checks until it was started by hand. Worth a line in the `steward` playbook at the next tidy.
