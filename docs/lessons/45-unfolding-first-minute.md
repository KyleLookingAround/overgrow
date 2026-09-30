Theme: parts
# Unfolding and the first minute, the first slice's part 6a (#45) · 29 Sep 2026

- **Numbers:** estimate $22. The session's cost wasn't reported (it read 0) when the PR opened. The session started at 07:32 UTC and the PR opened at about 09:20 UTC, with no waiting on the owner. There were two commits before opening. `main` had moved by the time the PR opened (#42 and #44), so the one merge from `main` came straight after, with conflicts only in the joined lists, which the build regenerates. CI rounds are counted at the merge.
- **Went well:**
  - Probing the first 200 days headless before writing the table showed when each cause first happens on seeds 1–3. That set the keys' triggers: slugs on day 1 at 19:00 on every seed, the first sale around day 45, the first compost around day 105. It also found that two keys unfold on the same tick, which gave the batch check a real case where two qualify.
  - The fresh review found three real bugs the checks didn't: the speed buttons skipping the first card, a late card answer, and the nudge outside the notice cap. Running it while the A/B measurement ran cost no wall-clock time.
  - Running the new checks against a build of `main` in the worktree the bot comparison already needed took one command.
- **Lessons:**
  - A paused page's view jumps only on a tick of more than four steps; an hour-at-a-time check reads the step before. → `feature` step 4.
  - A page that now opens paused silently breaks every measurement that relied on its clock running. The `scene` check's garden copy read "over 0 ticks" and still passed. When a change alters what a new page does at load, read the logged figures of every check group, not just PASS and FAIL.
  - `pkill -f` with a pattern that also matches your own shell command kills the shell, and two background measurement loops at once make each other's figures useless: stop runs by task id, one at a time. → `feature` step 4.
