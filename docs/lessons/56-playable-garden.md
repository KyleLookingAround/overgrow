# The playable garden (#56) · 29 Sep 2026

- **Numbers:** estimate $30. The session's cost read $1.12 from its first reading to its last, not updating (read as unknown, not cheap). The session started at 13:29 UTC; the first turn ended at 13:31 with the plan written and nothing built, and the coordinator's check-in restarted it at 15:25. The PR opened at 16:31 UTC with items 1 to 3; later pushes added items 5 to 8. The owner has one question open (#55, the garden offer's targets and what Reliability measures), with its default built in.
- **Went well:**
  - Measuring before building the goal:
    - The bot over one year and then two, a two-bed player beside the full one, showed that the step-up offer as proposed could never be met by a back garden (0.26 kg a day against 1.5; Reliability 0 on every seed).
    - The two-bed player gave the other end of the range. That turned "make Reliability move" into a question with numbers (#55) and a default that separates good play from none.
  - A trace of the bed states day by day found both "bugs" in the brief were labels. "Ready to pick" meant the picking window, not produce waiting; "not up yet" was seed potatoes in a cold March, with no sign of time passing.
  - The rotation converging on one family (five beds of tomatoes in the same summer, killed by the same frost) only showed in a year-long trace, not in the tests. Planning the rotation across the beds fixed the winter too, since beds came free at different times.
  - The fresh review found real things before the PR opened:
    - a Buy button with no price for the first five days;
    - a trade (drowned beetles) the sim didn't model;
    - the traps at multi-day steps;
    - four stale notes.
- **Lessons:**
  - A browser check run and a timing run on the same machine at the same time double every timing. The garden-day speed test failed at over 2 ms while the checks ran, and the three branch-against-`main` runs were noise. Measure speed with nothing else running. And don't rebuild `dist/` while a check run is using it: the layout group stopped when this session did.
  - Changing notices from "two at once" to "one at a time, queued" moved every check that waited a few seconds for a sign or the nudge. When a change makes something wait its turn, search the checks for the waits on it (`waitForSelector(… {timeout`) before running them.
  - Running a new check against `main`'s build to show it failing can hang for minutes when the thing it waits for never appears there. Give that run a timeout from the start.
  - The effects log's `total` keeps adding for as long as an effect keeps happening (it isn't a week's sum). Read `last`, or keep your own window, before calling something "a week" or "a day".
  - A brief item that looks like balance ("make it rise") can be a definition problem: 100 × (1 − CV) clamps at 0 whenever the spread passes the mean, and a seasonal series always does. Check the formula's range against the series before tuning the game toward a target.
