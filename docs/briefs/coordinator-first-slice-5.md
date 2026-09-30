# Brief: coordinate the first slice overnight and on (the fifth coordinator)

The fourth coordinator ran from 20:28 on 29 Sep to about 04:30 on 30 Sep. It handed over at about 615k of context and $26 against its $20 estimate, after a usage-limit stall from about 01:40 to 04:23.

This brief keeps the second, third and fourth coordinator briefs in force (`docs/briefs/coordinator-first-slice-2.md`, `-3.md` and `-4.md`): the owner's decisions 1 to 21, "What goes in every brief", what the coordinator may touch, its docs-only PRs, and the cost rules. It changes only the state and the plan. Where they differ, this one wins.

## Goal and what it may touch

- **The goal:** decision 20, the owner's overnight instruction: "Make level 1 feel awesome in all ways, gameplay, pacing, ux/ui, and start on the next levels. You can change anything at any time."
  - You sweep, brief, start, message, retire and playtest.
  - You build no game code.
  - Decision 15 still holds: you choose, and tell the owner what you chose.
- **It may touch:** what the second brief allows, plus anything decision 20 opens: any rule, playbook, spec or decision record, each change recorded where it belongs. Nothing under `src/` or `tools/` yourself.
- **Where it stands at about 04:30 UTC, 30 Sep.** Merged since the fourth brief (each has a look back in `docs/lessons/`):
  - #59: round two;
  - #61: the garden-day headroom;
  - #63: round three, the winter cards and the first-year card;
  - #66: the owner's decisions 17 to 21 and three briefs;
  - #70: part 7, the step up to the allotment, $18.90.
- **The owner's decisions 17 to 21** are in `docs/briefs/coordinator-first-slice-4.md`:
  - a shorter garden year, with 8× and 16×;
  - the UI overhaul on the Fable model, mobile first;
  - staged big buys;
  - the overnight run;
  - "presentation is everything".
- **Running.** All three were stopped by the usage limit at about 01:25–01:40 and woken at 04:26–04:34 by one-shot triggers from the fourth coordinator:

  | Work | Session | PR and branch | Cost so far |
  | --- | --- | --- | --- |
  | The shorter year | `session_01TuSQtHiMyFKjomo6STQpXN` | #67, `feature/shorter-garden-year` | $13.17 of $12 |
  | The UI overhaul (Fable) | `session_018oVZKx4vKEWgJDavM3mBVE` | #68, `feature/ui-overhaul` | $29.27 of $35 |
  | The map art (Fable) | `session_01T4wHW2gBjEjNeSccACTZN2` | #72, `feature/map-art` | $25.77 of $25 |

  - **#67 (the shorter year):** 12 s a day, quiet nights at 4× (capped at 64 game hours a second), and 6 speeds up to 16×. It has a merge conflict with #70 in `src/app/clock-loop.ts`, and it was told to merge main, check once and merge. It comes first: #68 waits on it for the top bar and the clock loop.
  - **#68 (the UI overhaul), a draft in phase 2:**
    - a spec (`docs/specs/ui-overhaul.md`) and the before and after artifacts;
    - the owner's "especially mobile" and "presentation is everything" (layers, sparklines, and general components for every level);
    - playtest 4's UI findings;
    - it now owns moving part 7's allotment panel onto its components;
    - told to trim tablet and desktop polish first.
  - **#72 (the map art):**
    - an art pass on the garden and a style kit that takes a scale;
    - told to draw the allotment with it and to trim the small delights to finish.
- **Next, in order:**
  1. **When #67 merges:** confirm Pages, archive its session, and tell #68 and #72 to merge main.
  2. **When #68 merges:**
     - start round four: `docs/briefs/playable-garden-4.md`, on main, the default model, `feature/playable-garden-4`. Its first message: "read your brief from main, it's committed; don't add another copy". It covers the money ladder, the box year-round, the midwinter work and the year card's next step;
     - archive #68's session.
  3. **When #72 merges:** archive its session.
  4. **Part 8, the allotment's first season** (the founding spec's roadmap, `docs/systems/agency.md` and `committee.md`, "Wiring"): neighbours as agents, the trough and its rota, the swap shed, pests spreading from the neglected plot, the second plot, and the committee's first vote.
     - Write its brief from `docs/briefs/TEMPLATE.md`, commit it in a docs PR, and start it when fewer than three default-model sessions run.
     - It builds on #68's components and #72's kit, so start it after both, or tell it to merge them as they land.
     - Budget about $30.
  5. **After round four:** a fifth playtest (the cheaper model, about $5). The primer is in the fourth coordinator's scratchpad as `playtest-4.md`, and gone once that session ends: rewrite it from `docs/lessons/60-coordinator-3.md`'s line on playtests, or from round three's brief. Include the allotment: play past the step up.
  6. **Then:**
     - advisers and "let them decide";
     - the baselines reset;
     - the strategy tests;
     - Balance #21 to #24;
     - parts 9 and 10.
  7. **The knowledge map artifact,** for the owner: https://claude.ai/artifact/3ecnmP9xCoSBuL12GzYADW. It was built from `docs/graph.json` and the systems web by scripts in the fourth coordinator's scratchpad, which will be gone. Republish only if the owner asks: rebuild it the same way (a helper agent, the same page), or from the published file with the Artifact tool's read.
- **Tell the owner in the morning:**
  - what merged;
  - the link, https://kylelookingaround.github.io/overgrow/;
  - what each choice was;
  - the usage-limit stall.

## Read first

- The project notes, `docs/briefs/coordinator-first-slice-4.md` (decisions 17 to 21 and the plan it started), then `node tools/graph.mjs coordinator` and only what it lists.
- The `coordinator`, `feature` and `steward` playbooks.
- `docs/lessons/70-step-up.md`, and the fourth coordinator's look back, `docs/lessons/73-coordinator-4.md`.

## How it fits and grows

The coordinator adds no mechanic. Every brief it writes answers this section for its part and names its rows in the systems web (`docs/specs/overgrow/systems-web.md`).

## Speed budget

None for the coordinator. Give each part its share in its brief, measured over the busiest stretch as well as the year.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

- **Merging:** each part merges its own PR per the `steward` playbook. You merge your own docs-only PRs, starting with the one that carries this brief.
- **Check-ins:** keep one `send_later`: about 45 minutes while parts build, and 30 after each start.
- **In your first turn:**
  1. Book the hourly heartbeat (`coordinator` playbook §9), bound to your own session.
  2. Retire the fourth coordinator:
     - `delete_trigger` its heartbeat `trig_017RUPnpGYvkf2HV6ntcX6Lh`;
     - delete any `send_later` still bound to `session_01NfXeqh8WjATcbXpjAWvawZ` (`list_triggers`);
     - `archive_session` on it.
  3. Merge this brief's PR once it's green.
  4. Sweep #67, #68 and #72.
  5. Book your first check-in.

## What's left for others

- The parts build the game.
- The owner may add the ruleset on `main` that requires `check`, and a `CATCH_UP_TOKEN`.
- Levels 4 to 8 each get their own spec later.

## When to stop and ask

- **Decide it yourself** (decisions 15 and 20), and tell the owner what you chose.
- **Ask** only for something irreversible, like repo settings or deleting work: directly if the owner is in the conversation; otherwise open an issue labelled `needs-owner` with the default, and take the default after 12 hours.

## Cost budget

- **Estimate:** about $20 through round four, part 8 and the fifth playtest.
- **Handing over:** at about 450k of context, at a quiet moment, with a brief like this one.
- **The usage limit:**
  - **Sessions at once:** at most three at once, counting Fable sessions, and not four. Four building sessions and the coordinator spent the five-hour allowance by about 01:25 and stalled everything for about three hours (the fourth coordinator's look back).
  - **Warnings:** on `allowed_warning`, start nothing.
  - **Waking stalled sessions:** a session stopped by the limit stays stopped until a message wakes it: send a "carry on" trigger to each a minute after `resetsAt`, staggered a few minutes apart.
- **Keeping context down:**
  - Point sessions at committed briefs.
  - Read look backs, not transcripts.
  - Don't read large generated files yourself: have a helper summarise, and read only what you publish.
