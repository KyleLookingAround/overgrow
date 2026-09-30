# Brief: steady CI (the light's flaky check, and the browser groups split)

## Goal and what it may touch

- Get `main`'s `check` job reliable and under 30 minutes again, in one PR on `feature/steady-ci` from `main`:
  1. **First, the flake.** Since #81 merged, two of its new `scene` cases fail on some runs of an unchanged `main`: "at 1× the night still falls" (#82's and #72's runs at 09:34 and 09:42 on 30 Sep: `from a day (false) the night reached 0.350 of 0.35 in 0.0 s`, so the watch's first frame was already full night) and, once, "under reduced motion at 16× the light is as steady" (`darkest 0.208 of 0.35`, over the quarter-night bar). The same cases passed on #81's own run and on its Pages publish, so it's order- or timing-dependent: most likely the night layer carried over from the case before (a `new-game` paused at noon, then only 2.5 s for the light to settle at 0.2 a second), or the view's snapshot lagging the new game. Find the real cause, then make the check wait for the condition it needs (the view's hour and a settled night layer) instead of a fixed sleep. If the cause is in `steadyLight()` or the renderer rather than the check (a new game or load at noon showing the last game's night), fix it there: that's a real bug decision 22 cares about. Never loosen the limit (0.2 a second), the quarter-night bar or the swings count to get green.
  2. **Then, the split.** The full run now takes 30–33 minutes (#82: 09:15–09:48; `layout` about 10 min, `scene` about 8, `night`, `season` and `garden` 2–3 each), past the 30 the notes set (`docs/SYSTEMS.md`, "CI's limit"). Split the browser groups across parallel jobs in `.github/workflows/checks.yml` (a matrix over groups, or two or three jobs balanced by time), keeping one required status named `check` that fails if any part fails (so the owner's planned ruleset on `check` still works), keeping the failure artefacts per job, and keeping `npm run check` locally as the whole suite. Do the same for the check before each Pages publish if it runs the suite. Keep `timeout-minutes: 40` per job. Update "CI's limit" in `docs/SYSTEMS.md` with the new shape and times.
- Files it may touch: `tools/checks/scene.mjs`, `tools/check.mjs` (only to take a list of groups), `src/ui/map/daylight.ts` and its test, the renderer's one `steadyLight()` line and its neighbours if the bug is there, `.github/workflows/checks.yml`, `.github/workflows/pages.yml`, `docs/SYSTEMS.md`, `docs/systems/map.md`, and its own look back in `docs/lessons/`. Anything else is outside the brief.

## Read first

- The project notes, then `node tools/graph.mjs scene` and `node tools/graph.mjs checks`, and only the files those list.
- `docs/briefs/steady-light.md` and `docs/lessons/81-steady-light.md` (what #81 built and why), and the owner's decision 22 in `docs/briefs/coordinator-first-slice-6.md` (on #82's branch until it merges).
- The `steward` playbook, "a failing test is never an infra flake".

## How it fits and grows

This adds no mechanic: it's the checks' reliability and CI's shape. In the systems web (`docs/specs/overgrow/systems-web.md`) it touches no row; the map's steady light (decision 22) stays a rule every later drawing part keeps, and this makes its check trustworthy for them.

1. **Born where.** None: no flow moves.
2. **Across the ladder.** None; every later level's drawing is checked by the same `scene` cases.
3. **Loops.** None.
4. **People.** None.
5. **The lever.** None.
6. **The map.** Unchanged, unless the cause is a real carry-over of the last game's night into a new one, which it then fixes.
7. **Explain.** None.
8. **Economy and balance.** None: nothing in `src/sim/` changes, so `PLAY` can't move; the Balance workflow's tables prove it.
9. **Carbon and land.** None.
10. **Polish.** None.
11. **The lesson.** None for players.
12. **Unfolding.** None.

## Speed budget

None: no game code, unless the fix is in the renderer, where the garden's frame stays at its current 0.9–1.1 ms.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session, with Squash and merge once `check` (all its parts) and Description are green, then confirms the Pages publish. Prove the flake is gone before pushing: run `node tools/check.mjs scene` at least five times locally, all green, and once in the order the full suite runs it. Subscribe to the PR's events (`subscribe_pr_activity`) once it's open and keep a `send_later` (about 20 minutes) as the fallback. Merge fast: #72 (the map art) and round four (`feature/playable-garden-4`) are red on this flake and wait on it; the coordinator tells them when it lands.

## What's left for others

- Don't touch #72's or round four's branches, the map art or the garden's economy.
- After it: #72 and round four merge `main` and go green; then the season panel's follow-up, the fifth playtest and part 9 (the sixth coordinator's brief).

## When to stop and ask

- Only for something irreversible or outside this brief, such as repo settings (the ruleset) or required status names.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question and the option it will take by default, carry on with other work, look at the issue at each stopping point, and take the default after 12 hours with no answer. Say so in the PR.
- Where it's merely unclear, take the safer option (easier to undo, or changing the game less) and say so in the PR.

## Cost budget

- Estimate: about $6 (a timing bug in one check group, a workflow change, two CI rounds).
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn.
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions.
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim or split what's left: land the flake fix alone first if the split is taking long.
