# A steady light at speed (#81) · 30 Sep 2026

- **Numbers:**
  - The estimate was $6; about $3.5 at the PR's opening.
  - The session started at 07:48 UTC and the PR opened at about 08:35. Two commits before the PR opened, and no merges from `main`.
- **Went well:**
  - **The brief shaped the change for the merge.** One pure function beside `darkness()` and one line in the renderer, so #72's rewrite of `renderer.ts` takes it easily.
  - **A pure limiter got unit tests before the browser check.** The 16×, 1× and long-gap cases were settled in Node in seconds.
  - **The new check was shown failing.** With the limiter bypassed, the three cases failed with 10 swings in 3.6 s.
- **Lessons:**
  - **A paused game shown from a `tick` isn't a reliable start.** After a 16× run on the same page, a new game ticked to 16:00 and paused was drawn three hours later, already at night. So the 1× case started dark and passed nothing. → The check now starts from noon and asks that it saw day before night, rather than trusting the paused hour.
  - **Time a rate against the drawer's own clock, or over a stretch.** Frame-to-frame rates timed in the page differ from the renderer's `performance.now()` by a few ms, enough to read 0.227 against a 0.2 limit. → The `scene` check times stretches of at least 0.3 s, where a real snap still reads at five times the limit.
  - **A held target can undo the effect it was meant to show.** A "gentle dim" for the quiet night, lighter than the night itself, lightened the map at 1× when the quiet night began. The fresh review caught it. → The hold is the night's own dim (`--map-night-quiet`).
