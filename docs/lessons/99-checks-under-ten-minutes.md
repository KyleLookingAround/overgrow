Theme: process
# The checks under ten minutes (#99) · 1 Oct 2026

- **Numbers:**
  - Before: a Checks or Pages run took about 35 minutes, set by "the rest" (33) while `layout` took 6 and `scene` and `night` 15.
  - After the first push (eight parts): 12 min 49 s, all but one part done inside 7.5 minutes. `layout` alone took 12.7 minutes, more than twice its 5.7 on #97, on a slower runner. After the second push (nine parts): see the PR.
  - A small session: about an hour from the owner's question to green.
- **Went well:**
  - **Timing each case from the log's timestamps found the cause in one pass.** A short script over the job log gave each group's minutes and showed one case, `scene`'s frost search, taking 7 of `scene` and `night`'s 15. It walked seed 1's year a day at a time, and each day costs a frame or two at CI's 3–5 frames a second. Starting it at day 200 finds the same frost.
- **Lessons:**
  - **A runner's speed varies by two times or more between runs, so a part sized from one run can still overshoot.** `layout` doubled between two runs with no change to it. → Size each part at about two thirds of the target from the slowest run seen, and split a group by an environment variable (as `layout` now is) rather than letting one part carry it.
  - **A check that searches the game for a day should start near it.** Every day searched on CI costs over a second. → The "CI's limit" notes now say so.
