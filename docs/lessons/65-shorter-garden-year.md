# A shorter garden year (#65) · 29 Sep 2026

- **Numbers:** estimate $12; no cost figure had reached the session when the PR opened (read as unknown, not free). Session started 23:11 UTC, PR opened about 23:45 UTC, no waiting on the owner. One commit before opening, after the fresh review; CI rounds are counted at the merge.
- **Went well:**
  - Writing the quiet-night rule as a pure function (`src/ui/quiet-night.ts`) let one Node script replay the sensible bot for a year on seeds 1–3 and give the real-time figure (about 53 minutes at 1×) before any browser check ran.
  - `PLAY` on seeds 1–3 was taken before the first edit, so the proof that play is unchanged needed no worktree.
- **Lessons:**
  - The loop's look-ahead must not scale with a faster pace: asking the sim four times further ahead tripped the "moved far ahead by a command" jump, and the view leapt hours at a time. The loop keeps two steps ahead; the sim keeps up at 8 game hours a real second without it.
  - A browser check that plays a real-time window (a night at 8 game hours a second is under two seconds) should pick a window it has checked is clean in Node first: the first December night chosen had a frost at 04:00 that handed the pace back, which is the rule working and the check flaking.
  - Counting a top bar's rows by each part's top edge miscounts a small icon centred on the row: count by overlapping vertical extents instead (`tools/checks/night.mjs`).
  - How quiet the nights are depends on the player: the sensible bot's beer traps keep the slugs in, about 8½ quiet hours a night; with no choices at all the fresh review measured about 3½, and a year of about 65 minutes. The figure to report is the one with a player's choices, and the other belongs beside it.
