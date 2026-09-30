# Brief: finish the map art (#72) and merge it

The map art session (#72, `feature/map-art`, the Fable model) built the garden's art pass and the style kit every level draws with. It merged `main` six times and fixed a hang, but ran to $91 against $25, and the coordinator closed it under the sixth coordinator's brief ("if this round isn't green, close the session and split what's left"). This session takes the branch over, gets it green and merges it. Its work is done except for one failing check and the merge.

## Goal and what it may touch

- **Deliver:** #72 green and squash-merged, on its own branch `feature/map-art` (you own it now; no other session pushes to it).
  1. **The one failure.** The split CI on head 7e22d78 (run 36711626599, the "the rest" job) passed 102 of 103, all 440 Vitest tests, and the whole `layout`, `scene` and `night` jobs. It failed `stepup: a tap skips the zoom-out` (`tools/checks/stepup.mjs:59`: the tap must end the zoom-out within 1.5 s). The same case passes on `main`, so it's this branch's: its zoom-out draws more, and CI's runner renders in software at a few frames a second. The session's earlier fix was to cache the world as one texture for the zoom-out (938bbaa). Find why a tap is still answered late on the runner, and fix it in the drawing: answer the tap on input, not on the next heavy frame, or draw less during the zoom-out. Don't loosen the 1.5 s. Reproduce it locally with CPU throttling or a software-rendering flag, and run `node tools/check.mjs stepup` five times green.
  2. **Merge `main`** (#84, #85, #86 and whatever else has landed; part 9 and round five may land while you work) once, keep both sides, run `npm run check`, and push once.
  3. **The PR's description.** Keep it true to what's in the branch. Put what it hands on under one heading, "Handed on" (the allotment drawing with the kit, and the delights it didn't reach), taken from the PR's own notes and `docs/lessons/72-map-art.md`. Add a line to the look back on the cost and why it ran long.
- **It may touch:** `src/ui/map/` and the step-up's drawing, `tools/checks/stepup.mjs` (only to wait on a real condition, never to loosen), the PR description, and `docs/lessons/72-map-art.md`. Nothing in `src/sim/`.

## Read first

- The project notes, then `node tools/graph.mjs stepup` and `node tools/graph.mjs src/ui/map`, and only the files those list.
- #72's description and its comments (the earlier timing fixes and what each one found), `docs/lessons/72-map-art.md`, `docs/lessons/85-steady-ci.md`, and the `steward` playbook.

## How it fits and grows

This adds no mechanic. It lands #72, whose rows in the systems web (`docs/specs/overgrow/systems-web.md`) are the map's at every level: the style kit takes a scale, so every later level draws with it, and the allotment's drawing with it is handed on.

1. **Born where.** None: drawing only.
2. **Across the ladder.** The kit is what the allotment and every level above draw with.
3. **Loops.** None.
4. **People.** None.
5. **The lever.** None.
6. **The map.** The garden's art pass, and the zoom-out answering a tap at once. Reduced motion cuts straight to the allotment, as now. The light stays steady (decision 22).
7. **Explain.** None.
8. **Economy and balance.** None: nothing in `src/sim/` changes, so `PLAY` can't move; the Balance workflow proves it.
9. **Carbon and land.** None.
10. **Polish.** Phones to large screens, as #72 left them; the `layout` job passes.
11. **The lesson.** None for players.
12. **Unfolding.** None.

## Speed budget

The garden's 1440 × 900 frame no slower than #72's head measures now, and the zoom-out answers a tap within 1.5 s on CI's runner.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session, with Squash and merge once `check` (the summing job over CI's three parts) and Description are green on the latest head. Then confirm the Pages publish, and stop. Call `subscribe_pr_activity` on #72, and when you end a turn waiting on CI, book a `send_later` about 15 minutes out.

## What's left for others

- The allotment drawing with the kit, and the delights: a later session, from this PR's "Handed on".
- The season panel follow-up (`SeasonPanel.tsx`, `season.css`, `src/ui/map/season.ts` onto the overhaul's components and the kit) starts when this merges.
- Part 9 (`feature/zoom-back-in`) and round five (`feature/playable-garden-5`) are building; don't touch their files.

## When to stop and ask

- Only for something irreversible or outside this brief.
- Otherwise, if it truly needs a decision, open an issue labelled `needs-owner` with the options and the default, carry on with the default, and name it in the PR. The coordinator answers it.
- Where it's merely unclear, take the safer option and say so in the PR.

## Cost budget

- **Estimate:** about $6 on the cheaper model: one timing fix in the drawing, one merge, two CI rounds of about 11 minutes.
- **Stopping points:** at each one, read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn.
- **Other sessions:** don't start any.
- **Past twice the estimate:** stop, say what's failing and why in the PR, and end the turn.
