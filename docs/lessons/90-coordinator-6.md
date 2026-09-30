Theme: coordinator
# The sixth coordinator (09:15 to about 13:45, 30 Sep 2026)

- **Numbers:** about $11 and 380k of context over four and a half hours, against the brief's $20 estimate for round four, the follow-up, the playtest and part 9. Merged: #82 (the brief), #84 (round four, $23.90 of $30), #85 (steady CI, $2.70 of $6), #86 (a playbook line). Started: steady CI, part 9 (#89), round five (#88) and the map art finish (#72), plus a fifth playtest as a background helper (about $3).
- **Went well:**
  - Reading the failing lines of a docs-only PR's run found that `main` itself was red (#81's new light cases), so one small fix session (#85) unblocked three PRs at once instead of three sessions chasing the same flake.
  - The fifth playtest, briefed with a primer and a report format, came back in 13 minutes with ranked findings, and they became round five's brief within the hour.
  - Splitting a part far past its estimate (#72 at $91 of $25) into a fresh cheaper-model session with a one-page brief, instead of another round on the expensive one.
- **Lessons:**
  - **Nothing wakes an idle part when its CI finishes.** Round four, the map art, steady CI, part 9, round five and the map art finish all went idle waiting on CI, some for 30 minutes or more, and one opened its PR as a draft, so CI skipped it. → `coordinator` §7 (#86: a part waiting on CI books its own `send_later`), and part 9's and round five's briefs say so. Some sessions still didn't book one; the coordinator's check-in wakes them with the result.
  - **Real-time checks fail on the shared runner.** Four today: #81's light cases (a fixed 2.5 s wait), the allotment day's 0.5 ms budget (0.63 and 0.70 ms on PRs that didn't touch the sim), the quiet night's pace (4.9 game hours a second against 8), and the zoom-out's tap-to-skip (1.5 s). Each passed locally. → The seventh coordinator's first item: one small session makes the timing checks wait on conditions and compare against a measured baseline on the same runner, not an absolute number.
  - **A part's own diagnosis can be wrong.** Round four called its speed-budget failure a flake twice. It passed on re-run, but the steward playbook's rule (a second failure is real) was what settled it, not the session's word.
  - **The step-up's zoom-out and the map art share heavy frames on the runner**, so drawing changes need the step-up group run under CPU throttling locally before pushing.
