Theme: tidy
# The first lessons tidy (#80) · 30 Sep 2026

- **Numbers:** estimate $6; `get_session` reported no cost figure (read as unknown, not free). 33 lessons were new since the last tidy (there had never been one, and `.last-tidy` was an empty file); 33 files before, 17 after, plus this one. One docs-only PR, no bot run, no speed budget. Nothing else was open under `feature/lessons-tidy-*`.
- **Merged** (files before → after, named for the newest source):
  - `1`, `14`, `57` → `57-runbook-and-final-call`; `3`, `31`, `37` → `37-spec-and-systems-web`.
  - `17`, `18`, `20`, `30`, `34`, `2026-09-29-09` (#40), `2026-09-29-10` (#43), `39` → `43-models-ahead`.
  - `28`, `46`, `60`, `73` → `73-coordinators`; `56`, `58`, `62` → `62-playable-garden`.
- **Themes** (first line `Theme: …`, and `tools/join.mjs` does group `docs/LESSONS.md` by it, so nothing in `tools/` changed): runbook, spec, model, coordinator, parts (the part look backs: #5, #7, #12, #35, #45, #48, #49, #65, #70, #79 and the playable garden), balance (#10), checks (#61), tidy.
- **Deleted** (lines within files; no whole lesson was deleted because each had something of its own): a lesson's bullets already written into a playbook now read as a one-line → pointing at it. Where each now lives:
  - Paused view jumps only past four steps (#7, #12, #45, #62, #70) and fixed waits, timers and rates timed from outside (#5, #45, #61, #65): `feature` step 4.
  - The `rules` check reading "window" in strings, test titles and `/**` lines (#12, #20, #70): `feature` step 3.
  - Speed: measure against `main` in a worktree, alternating, nothing else running; per-day flows and stocks are the cost; time a suspect in place (#5, #7, #35, #45, #48, #49, #56, #61, #79): `feature` step 4 "Speed".
  - A label trigger needs removing and adding again (#10): already in `balance` Tips.
  - Gone as out of date or as context only: Final Call's digest detail in #57 (the wave's numbers, relayed messages) is left as a one-line pointer, not a playbook line, since it is the owner's call.
- **Spot-checked →:**
  - Landed: the runbook ADR (`docs/decisions/ADR-2026-09-28-runbook-from-final-call.md`) and the `build` check's bounding box (`tools/checks/build.mjs`) from #1; the `BEFORE` warning in `tools/brief.mjs` (#31); the founding-spec exception in `docs/specs/TEMPLATE.md` (#3); `coordinator` §1, §2, §6 and §9 lines on handover, `get_session`, carry-on after a reset, the pass mark's ceiling and the playtest (#28, #46, #48, #60).
  - Hadn't landed, made here as playbook lines: the 30-minute check-in and a committed brief (#60, #62, #73, `coordinator` §6); `PLAY` fingerprints the save's version (#79, `balance`); "name every file in the first paragraph" (#5, `feature` step 5); the push-then-ready order (#10, `steward`). The `coordinator` playbook also had the pass-mark line twice; they're one line now.
  - Not landed, listed for a session that may touch `src/`: a long headless test holding the kitchen's figures for years two and three (#46, #5). `src/sim/index.test.ts` still checks only the two-year total, so the year-three collapse would be caught late again. The bot's `it.fails` and range-without-an-upper-end notes (#10) stay in issue #15.
- **Acted on, seen three or more times without a →:** the paused view, fixed waits, the `rules` check's words, speed measurement, both-ways trade-off tests, a card's end-state test, probing headless before writing, `graph`'s backticked paths: all in the `feature` playbook; the usage-limit stall, a missing or empty brief and the session cap: `coordinator` §5 and §6. None is a rule the owner should decide, so no `needs-owner` issue was opened.
- **Left for the next tidy:** the lessons still carry long Numbers lines; shorter ones (estimate, cost, what went over and why) would keep each file to a screen. Three sessions were building beside this one (#68, #72, round four): their lessons (`68-ui-overhaul.md`, the map art's) weren't on `main`, so the last merge of `main` folds any in.
