# Pests, wildlife and Explain, the first slice's part 5 (#35) · 29 Sep 2026

- **Numbers:** estimate $25; about $19 when the PR opened (context about 520k of 1M). Session started 04:11 UTC; a five-hour usage limit stopped it from about 05:14 to 05:20 (the fresh review's first run died with it); PR opened about 06:30 UTC. No waiting on the owner. Two asks from the coordinator arrived mid-build (unfold the instruments; make rotation pay) and went into the same PR. Five commits before opening; CI rounds and merges from `main` are counted at the merge.
- **Went well:**
  - Probing the whole garden headless before writing the tests set the pests' sizes from what the model does: the first version drained the lawn's slugs to nothing by September and the second cost 35 % of the harvest once clubroot joined, both caught before a test was written.
  - Writing the new `layout` cases first and running them on a worktree build of `main` showed them failing (three rows, no fold) before they were trusted, as the UI rules ask.
  - The speed budget found two real costs: noting every flow as it moved cost 0.08 ms a garden day, and the Explain table's words were shipping in the worker too. Effects from the merged flows, and the table split into kinds and words, fixed both.
- **Lessons:**
  - A headless per-day figure on this machine moves by ±0.05 ms from run to run and more when a browser check runs beside it; measure A/B against `main` in alternation, three runs each, with nothing else running.
  - Rollup keeps a big literal if anything computed at the top level reads it, `/*#__PURE__*/` or not: data the sim needs and words only the page needs belong in separate top-level objects, joined by functions, never by a computed constant.
  - A strategy target (rotation beating one crop by 10 % by day 120) can't be met by the mechanism meant for it when the gap comes from somewhere else (the fast crops' speed): measure where the gap comes from before building the fix, and say so in the PR rather than tuning past the sources.
  - Both plans' output falls towards nothing by the third year on `main` too; a long-run test on the kitchen's figures for years two and three would have caught it (`src/sim/index.test.ts` checks only the two-year total).
