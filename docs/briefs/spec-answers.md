# Brief: write the owner's answers on the systems web into the founding spec

The systems web (#31, `docs/specs/overgrow/systems-web.md`) asked the owner fifteen questions about the founding spec's model, ladder and carry-over rule on issue #29. On 29 Sep the owner took every recommendation (the coordinator's comment on #29 lists them). This session writes those answers into the founding spec, the web and the notes, so parts 6 to 15 build on a spec that says what the owner decided. It builds no game code.

## Goal and what it may touch

- **Deliver** one docs-only PR on `feature/spec-answers` from `main` that makes the founding spec, the systems web and the notes agree with the owner's answers on #29, and closes #29.
- **The answers to write in:**
  - **Yes:** Q1 (a household as a node kind at every level, and a Households row in the systems map), Q2 (a sealed node carries demand, kg a day by product group and £ a day, and hours, people-hours a day had and used), Q3 (Output carried by product group), Q4 (two carbon numbers: the dial stays territorial; the consumption footprint shows beside it and is never added to the air), Q5 (a Money, credit and insurance row, its seed a loan for the smallholding's tractor in part 13), Q6 (a wildlife part in a sealed node's Health), Q7 (the role-reversal spine as a column of the ladder table), Q8 (a) best-first at the honesty box in part 6 and (b) a hosepipe ban in part 10, Q10 (earlier "From" levels for storage, transport and trade), Q11 (the bonfire vote gets the waste system: burning against composting), Q13 (the neglected plot next door is the one whose household has the least time; the first zoom back in keeps its scripted timing), Q14 (carbon has a price at every level through its people's goodwill), Q15 (each level lasts long enough for its slowest lever to pay back once).
  - **With part 6's groceries if cheap, otherwise later:** Q8 (c) packaging, (d) days of food and an empty shelf, (e) shop prices moving with the world's.
  - **Later:** Q9 (the basket's diet lever: part 6 or after the slice) and Q12 (a demand-side zoom back in: the nation's spec).
- **Q15 in detail**, since it changes the first slice's pacing:
  - The garden runs at least a full year. The allotment offer comes after a year's steady supply, not a lucky summer: rewrite "What makes the jump feel earned" so the 28-day window becomes the last full year (or the last four seasons), keeping Output, Reliability and Health as the three numbers. Numbers stay marked proposed, for the bot to set.
  - The allotment and the smallholding run two or three years each; update the slice's text, "The first playable slice" and the roadmap's parts 8 to 14 where they say "a year" or "first year".
  - The clock keeps its rates, so the game gets longer, not slower; the longest quiet stretch guards against boredom (the owner's decision: strategic and long, never boring; the `balance` playbook says it).
  - Write a decision record for Q15 and decision 12 together, `docs/decisions/ADR-2026-09-29-strategic-and-long.md`, from the decisions template, and list it (the joined list in `docs/decisions/README.md` rebuilds with `node tools/join.mjs`).
  - The project notes' "Keep pacing within about 15% of the baselines" line becomes: pacing is judged by the longest quiet stretch and by each level lasting long enough for its slowest lever to pay back; milestones may land later than the baselines' ranges; `tools/baseline.json` is reset by part 6c with the bot's new measure. Don't edit `tools/`.
- **The web.** Turn each answered **Q** into **O** (the owner's approved additions) in `docs/specs/overgrow/systems-web.md`, and "later" ones into a plain note naming where they come back. Keep the web's own **P** rows as they are.
- **The coordinator's brief.** Add the answers as decision 13 in the owner's decisions list of `docs/briefs/coordinator-first-slice-2.md`, in one or two lines pointing at #29 and the new decision record. Change nothing else in that file.
- **The sealing maths note.** `docs/systems/ladder.md` gains a line saying Q2, Q3 and Q6 are approved and a models-ahead session will add them to `src/sim/ladder.ts`; don't edit the code.
- **It may touch:** `docs/specs/overgrow.md`, `docs/specs/overgrow/systems-web.md`, `docs/decisions/` (the new record and the joined list), `docs/systems/ladder.md` (one line), `docs/briefs/coordinator-first-slice-2.md` (decision 13 only), `docs/briefs/spec-answers.md` (this brief, saved as is), the project notes (the pacing line only), `docs/roadmap.d/` (its own item) and `docs/lessons/` (its look back). Nothing under `src/` or `tools/`.

## Read first

- The project notes, then `node tools/graph.mjs docs/specs/overgrow.md` and only what it lists.
- Issue #29 and its comments (the questions, Q14 and Q15, and the owner's answers).
- The systems web's sections for the questions, not end to end; `docs/decisions/ADR-2026-09-29-born-small-grows-up.md`; the decisions template.
- The founding spec's "The model underneath everything", "The ladder", "The carry-over rule", "Zooming back in", "The systems map", "The first playable slice" and "The first roadmap".
- The `feature`, `steward` and `balance` playbooks.

## How it fits and grows

This session changes no mechanic; it writes the owner's answers into the rows of the systems web (`docs/specs/overgrow/systems-web.md`) that ask them, and into the founding spec.
1. **Born where.** The household node (Q1) is born at the garden and summed at every level above.
2. **Across the ladder.** Sealed nodes carry demand and hours (Q2), Output by product group (Q3) and wildlife in Health (Q6); the spine becomes a ladder column (Q7).
3. **Loops.** Q4 and Q14 put the diet loop's carbon in view from the garden; Q15 lets the intensification loop's slow effects pay back inside a level.
4. **People.** Households everywhere (Q1, Q13); goodwill as carbon's price (Q14).
5. **The lever.** None new; the spec's step-up conditions change (Q15).
6. **The map.** None drawn here.
7. **Explain.** The two carbon numbers (Q4), and the food-miles myth.
8. **Economy and balance.** Q15 lengthens every level of the slice; the baselines reset in part 6c.
9. **Carbon and land.** The territorial dial and the consumption footprint beside it (Q4).
10. **Polish.** Concise UK English in every changed line.
11. **The lesson.** What you eat matters more than how far it came (Q4).
12. **Unfolding.** Unchanged: each instrument still unfolds with the player's influence.

## Speed budget

None: no game code.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook: Squash and merge by hand once Checks and the Description check are green on the latest head and the look back is committed in the PR. The PR closes #29 ("Closes #29"). Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged, the session stops.

## What's left for others

- A models-ahead session adds the hooks to the sealing maths, livestock and labour models; part 6a unfolds, 6b wires the household, 6c resets the baselines with the bot's quiet-stretch measure. Don't start them or edit their files.
- Part 5 and the storage and market session are working on their own branches; never touch another session's files or branch. The founding spec is yours for this PR; if part 5's PR also edits it, the second to merge takes both.
- The owner has said the coordinator's recommendations stand for later choices.

## When to stop and ask

- Only for something irreversible or outside this brief: a change the owner didn't answer, repo settings, or widening the slice.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question, the options and the default, carry on with the default, and say so in the PR.
- Where it's merely unclear, take the safer option (the smaller wording change, closest to the question's own text) and say so in the PR.

## Cost budget

- Estimate: about $6 (docs only, careful edits across the spec and the web, one CI round). Model `claude-sonnet-5-5`, the cheaper model (a docs-only job). No workflows.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions.
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim what's left.
