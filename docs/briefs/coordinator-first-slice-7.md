# Brief: coordinate the first slice on (the seventh coordinator)

The sixth coordinator ran from 09:15 to about 13:45 on 30 Sep. It handed over at about 390k of context and about $11 against its $20 estimate, to keep context down while three parts finish.

This brief keeps the second to sixth coordinator briefs in force (`docs/briefs/coordinator-first-slice-2.md` to `-6.md`): the owner's decisions (22 is the latest: no full-map light swinging between day and night faster than the eye can follow, at any speed), "What goes in every brief", what the coordinator may touch, its docs-only PRs, and the cost rules. It changes only the state and the plan. Where they differ, this one wins.

## Goal and what it may touch

- **The goal:** decision 20 still stands: "Make level 1 feel awesome in all ways, gameplay, pacing, ux/ui, and start on the next levels. You can change anything at any time." You sweep, brief, start, message, retire and playtest. You build no game code.
- **It may touch:** what the second brief allows, plus anything decision 20 opens: any rule, playbook, spec, workflow limit or decision record, each change recorded where it belongs. Nothing under `src/` or `tools/` yourself.
- **Merged since the sixth brief** (each has a look back in `docs/lessons/`, bar the docs PRs): #82 (the sixth brief), #84 (round four, $23.90 of $30), #85 (steady CI: the light check's flake fixed and CI split into three parallel jobs plus a summing `check`, about 11 minutes a run; $2.70 of $6), #86 (a part waiting on CI books its own `send_later`). Pages is green on each.
- **Running at about 13:45:**

  | Work | Session | PR and branch | Cost |
  | --- | --- | --- | --- |
  | Part 9, the first zoom back in | `session_01DQQcqG8qXGeSeyf46Dk7WJ` | #89, `feature/zoom-back-in` | $19 of $25, 458k context |
  | Round five of the garden (cheaper model) | `session_01FYCPMmh7iLUV9dzxhqvjQu` | #88, `feature/playable-garden-5` | $2.90 of $8 |
  | The map art finish (cheaper model) | `session_01NKzcJW7kMDE7ycNuqDuQRV` | #72, `feature/map-art` | $2.60 of $6 |

  - All three were in CI at 13:36, idle, each with a one-shot wake at 13:48–13:50 to read its result, merge on green, confirm Pages and stop. Archive each once its Pages run is green.
  - **#72** was taken over from the Fable session (closed at $91 of $25) with `docs/briefs/map-art-finish.md`: one failing case, `stepup: a tap skips the zoom-out`, on the runner. If it fails twice more, stop and split again.
  - **Part 9** is past 450k of context. If it isn't green by $30, have it land items 1–3 and hand the rest (Send someone, the catalogue's adviser, unfolding) to a follow-up under "Handed on".
- **Next, in order:**
  1. **Steady timing checks** (the cheaper model, about $6). Four real-time checks failed on the shared runner today on PRs that didn't touch them (see `docs/lessons/90-coordinator-6.md`): the allotment day's 0.5 ms budget, the quiet night's pace, the zoom-out's tap-to-skip, and #81's light cases (fixed by #85). Make each wait on a condition and compare against a baseline measured on the same runner in the same run, not an absolute number. Keep every limit's meaning. Start it the moment a slot frees.
  2. **When #72 lands:** the season panel follow-up (the cheaper model, about $6). It moves `src/ui/SeasonPanel.tsx` and `season.css` onto the overhaul's components and `src/ui/map/season.ts` onto the art kit. It also fixes two things from the fifth playtest: the helper's offer text overflowing past its buttons at 390 px, and the plot's care and feed levers showing no effect ("Health heads for 71" for both settings). Tell part 9 and round five to merge `main` when #72 lands, if they're still open.
  3. **The allotment's goal and shop** (after part 9; about $20). The fifth playtest's worst finding: after the step up there's no goal bar and nothing to buy, and a player sits on £538 by year three. Give level 2 a goal bar walking towards the smallholding offer's numbers (the founding spec's "What makes the jump feel earned", and the step-up spec), and a money ladder of real allotment purchases (a shed, a water butt of your own, tools that save the gardener's hours, netting, a polytunnel share). Round four's ladder is the pattern. Write the brief from `docs/briefs/TEMPLATE.md` with a one-page spec approved by you.
  4. **A sixth playtest** after round five, the goal and shop, and part 9 (the cheaper model, about $5). Reuse the fifth's primer (in the sixth coordinator's conversation, summarised here). Play seed 1 on phone first, then desktop. Look at days 2, 30, 90, 150, 220, 280, 300, 330 and 366, then into the allotment for about 120 days, and at 16× and 1× for the light. Answer cards by tapping, and use `tick` only between checkpoints. Also play the rota vote live (the fifth jumped past it) and the zoom back in. The report is ranked findings, flat stretches, "checked and fine", and what it didn't reach.
  5. **Then:** advisers and "let them decide" on every tab, the baselines reset (part 6c), the strategy tests, Balance #21 to #24, and part 10 (the allotment's years).
- **Choices the sixth coordinator made** (decision 15), to tell the owner:
  - CI was split into three parallel jobs rather than raising the limit again. It runs in about 11 minutes now, with one summing `check` for the planned ruleset.
  - The fifth playtest's allotment gaps (no goal, nothing to buy) became a part of their own after part 9, not an addition to part 9.
  - #72 was closed on the Fable model at $91 and finished on the cheaper one.
  - Parts now book their own check-ins while waiting on CI (#86).

## Read first

- The project notes, `docs/briefs/coordinator-first-slice-6.md`, then `node tools/graph.mjs coordinator` and only what it lists.
- The `coordinator`, `feature` and `steward` playbooks.
- `docs/lessons/73-coordinators.md`, `docs/lessons/82-coordinator-5.md` and `docs/lessons/90-coordinator-6.md`.

## How it fits and grows

The coordinator adds no mechanic. Every brief it writes answers this section for its part and names its rows in the systems web (`docs/specs/overgrow/systems-web.md`).

## Speed budget

None for the coordinator. Give each part its share in its brief.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

- **Merging:** each part merges its own PR per the `steward` playbook. You merge your own docs-only PRs, starting with the one that carries this brief.
- **Check-ins:** keep one `send_later`: about 45 minutes while parts build, and 30 after each start. When parts are waiting on CI, check that each has a wake booked (`list_triggers`), and book one for any that hasn't.
- **In your first turn:**
  1. Book the hourly heartbeat (`coordinator` playbook §9), bound to your own session.
  2. Retire the sixth coordinator: `delete_trigger` its heartbeat `trig_01LGyzr7W78tJiAgkL5pdn4T` and any `send_later` still bound to `session_0173JtznnCLkG2LdTtw6Czui` (`list_triggers`), then `archive_session` on it.
  3. Merge this brief's PR once it's green.
  4. Sweep #89, #88 and #72.
  5. Book your first check-in.

## What's left for others

- The parts build the game.
- The owner may add the ruleset on `main` that requires `check`, and a `CATCH_UP_TOKEN`.
- Levels 4 to 8 each get their own spec later.

## When to stop and ask

- **Decide it yourself** (decisions 15 and 20), and tell the owner what you chose.
- **Ask** only for something irreversible, like repo settings or deleting work: directly if the owner is in the conversation; otherwise open an issue labelled `needs-owner` with the default, and take the default after 12 hours.

## Cost budget

- **Estimate:** about $20 through the timing checks, the season panel follow-up, the allotment's goal and shop, and the sixth playtest.
- **Handing over:** at about 450k of context, at a quiet moment, with a brief like this one.
- **The usage limit:**
  - **Sessions at once:** at most three building, counting Fable ones. A cheaper-model tidy or follow-up may be the fourth only when it is nearly done.
  - **Warnings:** on `allowed_warning`, start nothing. Book a check-in for a minute after `resetsAt` and start then.
  - **Waking stalled sessions:** a session stopped by the limit stays stopped until a message wakes it.
- **Keeping context down:**
  - Point sessions at committed briefs. A part's brief can be committed on its own branch, so it starts without waiting for a docs PR's CI.
  - Read look backs, not transcripts.
  - Pull only failing lines from CI logs: when `get_job_logs` output is too big, it's saved to a file, so grep that file for `FAIL`.
