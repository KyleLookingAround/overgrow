Theme: build
# The one map's spike: one camera, the zoom as the speed, and skips (#94, #96) · 30 Sep 2026

- **Numbers:**
  - Estimate $40; about $15 at the PR (the session's total was about $94, $79 of it part 9 and the one map's design before this brief).
  - Built from about 21:00 to 23:30 UTC in the same session that designed it, through one context compaction and one worker restart.
  - Pushes before opening: three work-in-progress commits (kept safe across the restart), then the review's fixes. No merges from `main` needed.
- **Went well:**
  - **The budgets held with room to spare.** The allotment with the garden composed and all eleven neighbours opened from their totals draws in 0.7 ms at 1440 × 900, under the garden's own frame. A plot drawn from its totals takes at most 14 ms at 4× throttling. Drawing the world at the camera it last rested at, carried by a lens until it rests again, kept the per-frame cost flat at every zoom.
  - **Putting the skip in the sim paid off.** Once the skip was a command with its wake table in `src/sim/skip.ts`, the tests could prove a skipped stretch ends where a watched one does. The bot could also estimate the minutes it saves, with no page involved.
- **Lessons:**
  - **A save version bump is play, to the bot.** `PLAY` fingerprints the save less the speed and what's seen, so raising `SAVE_VERSION` alone changed all three seeds' `PLAY`. Comparing the saves without the version showed play was identical. Keeping the version, since the shape hadn't changed, kept `PLAY` equal. → Before raising the version, ask whether the saved shape really changed; if it did, say in the PR that `PLAY` moves for that reason alone.
  - **Wake on what the notices show, not on every event of the same cause.** The first wake table held every cause a pest or frost records, so slugs at dusk ended a skip every damp evening. The brief said "a pest's first sighting", which is an unfold. The first-minute check's log showed a skip woken after 17 hours. → The wake table now lists only the causes that bring a card or notice.
  - **A paused view under reduced motion can't be positioned by a jump.** The `scene` check's steady-light case turned on reduced motion before moving the game to noon, so it started from 06:00's dusk. → Position the game first, then emulate reduced motion.
  - **The worker restart cost only a rerun because the work was committed.** Once the branch had a pushed commit, a restart lost nothing; before that, three hours of uncommitted work sat in one container. → Commit and push work in progress at each stopping point, even before a PR.
