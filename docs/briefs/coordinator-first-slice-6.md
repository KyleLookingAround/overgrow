# Brief: coordinate the first slice on (the sixth coordinator)

The fifth coordinator ran from 04:26 to about 09:20 on 30 Sep. It handed over at about 470k of context and about $16 against its $20 estimate.

This brief keeps the second to fifth coordinator briefs in force (`docs/briefs/coordinator-first-slice-2.md` to `-5.md`): the owner's decisions, "What goes in every brief", what the coordinator may touch, its docs-only PRs, and the cost rules. It changes only the state and the plan. Where they differ, this one wins.

## Goal and what it may touch

- **The goal:** decision 20 still stands: "Make level 1 feel awesome in all ways, gameplay, pacing, ux/ui, and start on the next levels. You can change anything at any time." You sweep, brief, start, message, retire and playtest. You build no game code.
- **It may touch:** what the second brief allows, plus anything decision 20 opens: any rule, playbook, spec, workflow limit or decision record, each change recorded where it belongs. Nothing under `src/` or `tools/` yourself.
- **The owner's decision 22** (30 Sep, about 07:48, while awake): "in higher speeds the game flashes between day and night. it's not a great experience for the eyes." No full-map light layer may swing between day and night faster than the eye can follow, at any speed. #81 (the steady light) sets the rule and its check. Every later drawing part keeps to it, lightning included.
- **Merged since the fifth brief** (each has a look back in `docs/lessons/`, bar the docs PRs):
  - #67, the shorter year ($18);
  - #73 and #74, the fifth brief and part 8's brief;
  - #76, the night check timed in the page;
  - #78, the check job's limit at 40 minutes;
  - #79, part 8, the allotment's first season ($21 of $30);
  - #68, the UI overhaul ($57 of $35);
  - #80, the lessons tidy ($3.40 of $6).

  Pages is green on all of them.
- **Running at 09:20:**

  | Work | Session | PR and branch | Cost |
  | --- | --- | --- | --- |
  | The steady light | `session_01MWL73edyufiKzXvpKje1M9` | #81, `feature/steady-light` | $5.40 of $6 |
  | The map art (Fable) | `session_01T4wHW2gBjEjNeSccACTZN2` | #72, `feature/map-art` | $52 of $25 |
  | Round four | `session_018QNiJD28XFAfxYMC2xZjyp` | `feature/playable-garden-4` | started 09:13, $30 |

  - **#81** was green at 09:12 and was told to merge, confirm Pages and stop. Archive its session once Pages is green.
  - **#72** was cancelled at the 40-minute limit (run 36689685806, 08:26–09:06), so something on its branch hangs or crawls. It was told to find it, merge `main` (and #81 if it lands first), push once and merge. It is past twice its estimate. If this round isn't green, close the session and split what's left (the allotment drawing, the delights) into a fresh cheaper-model session from its PR's notes.
  - **Round four** follows `docs/briefs/playable-garden-4.md`: the money ladder, the box year-round, the midwinter work and the year card's next step. It was told the UI overhaul's components are on `main`.
- **Next, in order:**
  1. **When #72 lands** (or is split), start a small cheaper-model follow-up for what part 8 (#79) handed on. It moves `src/ui/SeasonPanel.tsx` and `season.css` onto the overhaul's components, and `src/ui/map/season.ts` onto the art kit.
  2. **After round four:** a fifth playtest, on the cheaper model at about $5. Rewrite its primer from `docs/lessons/73-coordinators.md` and round three's brief. Play past the step up: the allotment's first season is live, so include the second plot, the helper, the trough and the vote. Play at 16× too, for decision 22.
  3. **Part 9, the zoom back in:** the neglected plot's slugs in the player's own garden (`neglectedPlot(seed)`, the founding spec's scripted first zoom back in), and the seed catalogue's adviser with its bias (`docs/systems/agency.md`, "Wiring", part 9). Write its brief from `docs/briefs/TEMPLATE.md`, commit it in a docs PR, and start it when fewer than three sessions run. Budget about $25.
  4. **Then:** advisers and "let them decide", the baselines reset, the strategy tests, Balance #21 to #24, and part 10 (the allotment's years).
- **Choices the fifth coordinator made** (decision 15), to tell the owner:
  - Part 8's rota vote passes easily (7–2 to 9–1). It's left as it is, since part 10 adds closer votes.
  - The check job's limit went to 40 minutes. If a run passes about 30, split the browser groups across jobs (`docs/SYSTEMS.md`, "CI's limit").
  - The steady light was started at the owner's word, as the fourth session at once. The tidy was on the cheaper model and nearly done.

## Read first

- The project notes, `docs/briefs/coordinator-first-slice-5.md`, then `node tools/graph.mjs coordinator` and only what it lists.
- The `coordinator`, `feature` and `steward` playbooks, as the tidy (#80) left them.
- `docs/lessons/73-coordinators.md` (the coordinators' look backs, including the fifth's).

## How it fits and grows

The coordinator adds no mechanic. Every brief it writes answers this section for its part and names its rows in the systems web (`docs/specs/overgrow/systems-web.md`).

## Speed budget

None for the coordinator. Give each part its share in its brief.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

- **Merging:** each part merges its own PR per the `steward` playbook. You merge your own docs-only PRs, starting with the one that carries this brief.
- **Check-ins:** keep one `send_later`: about 45 minutes while parts build, and 30 after each start.
- **In your first turn:**
  1. Book the hourly heartbeat (`coordinator` playbook §9), bound to your own session.
  2. Retire the fifth coordinator: `delete_trigger` its heartbeat `trig_0162uh3UmqVhS4kW8f6KDBXq` and any `send_later` still bound to `session_0127YFomNs1d7gnWrMWG6NcN` (`list_triggers`), then `archive_session` on it.
  3. Merge this brief's PR once it's green.
  4. Sweep #81, #72 and round four.
  5. Book your first check-in.

## What's left for others

- The parts build the game.
- The owner may add the ruleset on `main` that requires `check`, and a `CATCH_UP_TOKEN`.
- Levels 4 to 8 each get their own spec later.

## When to stop and ask

- **Decide it yourself** (decisions 15 and 20), and tell the owner what you chose.
- **Ask** only for something irreversible, like repo settings or deleting work: directly if the owner is in the conversation; otherwise open an issue labelled `needs-owner` with the default, and take the default after 12 hours.

## Cost budget

- **Estimate:** about $20 through round four, the follow-up, the playtest and part 9.
- **Handing over:** at about 450k of context, at a quiet moment, with a brief like this one.
- **The usage limit:**
  - **Sessions at once:** at most three building, counting Fable ones. A cheaper-model tidy or follow-up may be the fourth only when it is nearly done.
  - **Warnings:** on `allowed_warning`, start nothing. Book a check-in for a minute after `resetsAt` and start then. The fifth coordinator held round four from 08:38 to 09:13 this way.
  - **Waking stalled sessions:** a session stopped by the limit stays stopped until a message wakes it.
- **Keeping context down:**
  - Point sessions at committed briefs.
  - Read look backs, not transcripts.
  - Pull only failing lines from CI logs (a `FAIL` grep), never whole logs.
