Theme: coordinator
# The first slice's four coordinators (#28, #46, #60, #73) · 28–30 Sep 2026

- **Numbers:** first $21.24 and 628k of context against $20 (8.5 hours); second about $10 and 380k, eleven PRs merged; third $19.30 of $20 and 455k, every part past its estimate ($14.64–$38.41); fourth about $26 of $20 and 615k. Models-ahead sessions on the cheaper model cost $3–$5 each, under estimate; parts touching the sim, the UI and the bot ran $20–$38.
- **Went well:**
  - Drafting the next brief while the current CI ran, and carrying the running plan in each check-in's prompt, so each part started within minutes of the last merging.
  - Asking the owner directly when they were in the conversation (#11 answered in a minute, #29's fifteen questions in one click with the recommended option first).
  - Two cheap playtests (about $5 each) turned the plan twice: each report became a brief within the hour (#60, #73).
  - Committed briefs with a one-line first message, and owner asks passed on within minutes as short triggers, each recorded at once as a decision (#73).
- **Lessons:**
  - **A usage limit stops every session it hits, and nothing wakes them.** It happened on 29 Sep at 22:02, at 05:14 and from 01:30 to 04:23. → `coordinator` §2 (a "carry on" message a minute after `resetsAt`), §5 (the cap of three, Fable sessions included, and booking your own wake at `allowed_warning`).
  - **Context runs out before cost, mostly on `list_sessions` output and pasted briefs, and every turn re-reads it all.** → `coordinator` §1 and §2 (`get_session` on known ids, hand over at about 500k, when it's quiet, not at the limit).
  - **Mid-build asks and repeated merges of `main` push a part over budget.** → Put the whole ask in the brief and have the part open its PR early and merge `main` once before the last CI round (in the briefs from 6a on; `coordinator` §6).
  - **Facts a brief leans on need measuring first:** a pass mark's ceiling (#48), the spec's step-up targets against the sim (1.5 kg a day was an allotment's figure; Reliability as 1 − CV is 0 for any garden), a first bot run early (it finds design gaps, not just ranges). → `coordinator` §5 and §6; the bot measures an engaged player before a level's goal ships.
  - **Playtest before calling a level done.** Six parts built to their briefs added up to a garden with nothing to buy, dig or aim for. → `coordinator` §6.
  - **A session can stop after planning, or start with no brief.** → `coordinator` §6 now says to commit the brief first, point the session at it and check in about 30 minutes after a start (it was in the fourth brief but not the playbook; made in the tidy, #73's lesson was the third sighting).
  - **A check-in can be lost across a container restart** (14:52 never fired): keep the hourly heartbeat, and check `get_trigger` on one that's overdue. → `coordinator` §9.
  - **A fault on `main` found by one part can hide for a whole wave** (the garden's year-three collapse was on `main` from part 3). A long headless test should hold the kitchen's figures for years two and three; it still checks only the two-year total (`src/sim/index.test.ts`), so this is listed in the tidy's PR for a session that may touch `src/`.
  - **Merge order matters when two PRs touch one file**, and the speed budget crept past its limit part by part (a docs-only PR failed at 2.04 ms): the next part fixes a red `main` first. → `coordinator` §6 and `feature` step 4 "Speed".
  - **Reading a generated page before publishing cost about 60k of context**: have the helper split its data out, or read it once, only when it will be published.
