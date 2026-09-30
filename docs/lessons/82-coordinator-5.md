Theme: coordinator
# The first slice's fifth coordinator (#73, #74, #78, #82) · 30 Sep 2026

- **Numbers:**
  - About $16 against a $20 estimate, and about 470k of context at the handover.
  - Ran from 04:26 to about 09:20.
  - **Merged in that time:** the shorter year (#67), the night check's fix (#76), part 8 (#79, $21 of $30, in 75 minutes), the UI overhaul (#68), the lessons tidy (#80, $3.40), and its own #73, #74 and #78.
  - **Started:** part 8, the tidy, the steady light (#81, the owner's decision 22) and round four.
- **Went well:**
  - **A committed brief and a one-line first message.** Part 8 opened, reviewed and merged its whole brief with nothing trimmed, in 75 minutes and under estimate.
  - **Holding a start on `allowed_warning`,** with a check-in booked a minute after `resetsAt`. The limit warned at 08:38. Round four started at 09:13, and nothing stalled this time.
  - **An owner's ask turned into a running session within minutes** (the day and night flashing at speed).
- **Lessons:**
  - **A red `main` hides in a publish run nobody reads.** #67's Pages run failed on a timing check, and its session thought the publish was "in progress". The next PR found it an hour later. → Read the Pages run's conclusion, not the session's summary, before archiving (`coordinator` §3). When a fix changes only files the Pages paths skip, run Pages by hand (`workflow_dispatch`).
  - **The check job's limit is shared by every PR.** At 24 minutes of a 25-minute limit, two PRs that added browser groups were cancelled, not failed. → The limit is 40 (#78). Watch each run's time in the sweep, and split the browser groups across jobs past about 30.
  - **Every merge to `main` restarts every open PR's 24-minute run.** Catch up merges `main` in, and the Checks workflow cancels the older run. #72 and #68 restarted three times in an hour. → Merge small docs PRs in a batch, or when no big PR is near green.
  - **A part that lands before the parts it was told to build on hands on a follow-up.** Part 8 merged before the UI overhaul and the map art, so its panel isn't on their components. → Name the follow-up at the merge, and brief it on the cheaper model once both have landed.
  - **A long-running, over-budget session (the map art, $52 of $25) keeps finding new failures on each merge of `main`.** → Past twice the estimate, give it one round, then split what's left to a fresh session.
