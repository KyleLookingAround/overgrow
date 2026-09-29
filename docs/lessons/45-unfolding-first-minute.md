# Unfolding and the first minute, the first slice's part 6a (#45) · 29 Sep 2026

- **Numbers:** estimate $22. The session's cost wasn't reported (it read 0) when the PR opened. The session started at 07:32 UTC and the PR opened at about 09:40 UTC, with no waiting on the owner. There were two commits before opening, and no merges from `main` so far. CI rounds and merges from `main` are counted at the merge.
- **Went well:**
  - Probing the first 200 days headless before writing the table showed when each cause first happens on seeds 1–3. That set the keys' triggers: slugs on day 1 at 19:00 on every seed, the first sale around day 45, the first compost around day 105. It also found that two keys unfold on the same tick, which gave the batch check a real case where two qualify.
  - The fresh review found three real bugs the checks didn't: the speed buttons skipping the first card, a late card answer, and the nudge outside the notice cap. Running it while the A/B measurement ran cost no wall-clock time.
  - Running the new checks against a build of `main` in the worktree the bot comparison already needed took one command.
- **Lessons:**
  - A paused page's view jumps only on a tick of more than four steps. A browser check that ticks an hour at a time and then reads the page sees the step before. Tick five or more, or poll for the element; the first three runs of the `unfold` check lost time to this.
  - A page that now opens paused silently breaks every measurement that relied on its clock running. The `scene` check's garden copy read "over 0 ticks" and still passed. When a change alters what a new page does at load, read the logged figures of every check group, not just PASS and FAIL.
  - `pkill -f` with a pattern that also matches your own shell command kills the shell. Stop background runs by their task id instead.
  - Two background measurement loops running at once made each other's figures useless. Stop the old loop before starting the next A/B.
