# Brief: one map, the spike

The first part of `docs/specs/one-map.md` (#94), approved by the owner on 30 Sep 2026. The spec makes the ladder one continuous map of one fixed planet, with the zoom as the only speed control (`docs/decisions/ADR-2026-09-30-one-map.md`, `docs/decisions/ADR-2026-09-30-zoom-is-the-speed.md`). Before levels 3 to 8 are built onto it, this spike proves it on the two levels that exist: the garden and the allotment on one camera, with the clock following the zoom, and the frame and sim budgets held. If they can't be held, the spec goes back to the owner, and the ladder keeps its separate screens.

## Goal and what it may touch

- **Deliver** one PR on `feature/one-map-spike` from `main` (or the session's designated branch, restarted from `main`), referring to #94 (it stays open for the later parts).
- **In priority order.** Items 1 to 3 go together: the speed buttons can't go before the zoom and the skips replace them. Trim from item 4 if it runs long, and say in the PR what was trimmed.
  1. **One camera from the garden to the allotment.**
     - A zoom the player drives: pinch, wheel, the + and − buttons and the breadcrumb. It's a page setting, not game state.
     - At level 2 it runs from one plot filling the view (your garden, or a neighbour's, item 4) out to the whole allotment. At level 1 it runs from close on one bed out to the garden fence, which is level 1's limit.
     - The breadcrumb is new: it takes the level's name's place in the top bar, each step a tap to fly there. At 320 px it shows only where you are, with a back arrow.
     - Your plot's garden is drawn inside the allotment from what `State.ladder` kept, blended into its plot with no box and a small golden tag, never an outline.
     - The step up's zoom-out becomes this camera pulling out, and part 9's dive becomes it pushing in. A tap still ends either early, and reduced motion still cuts.
     - Detail comes by size on screen: a crop's silhouette, the gardener, the slugs at dusk appear as they grow big enough to see and fade the same way.
  2. **The clock follows the zoom.**
     - The rate comes from the camera, interpolated in log space between the spec's bands: the garden 12 s a day, the allotment 6 s a day (from 4 s at 1× today).
     - The top bar loses its speed buttons. Pause stays; `State.speed` keeps its name (the bot's `PLAY` strips it) and only pause and run.
     - The "try faster" nudge becomes a pointer to zooming out (level 2) or to a skip (level 1).
     - A quiet night still passes faster on its own, as today (`src/ui/quiet-night.ts`).
     - The light holds steady wherever a day passes in under 8 s (`STEADY_DAY_S`, decision 22), as today: the allotment already does.
     - With no speed buttons a garden year is at most about 53 minutes, less the skips taken. The bot reports it; longer than that goes back to the owner on #94.
  3. **Skips at levels 1 and 2.**
     - A `skip` command with the hour to run to.
     - The sim's own foresight names the next thing that needs you: a crop ready, a sowing window opening, the honesty box empty, or a frost forecast.
     - It's offered as a chip by the clock only when no card is waiting, no event is running and no notice is up.
     - It runs as a time-lapse of about 2.5 s in the clock loop, every hour simulated as normal, and never faster than the worker's steps come back (`QUIET_MOST`'s reason): on a slow phone a long skip takes a few seconds more.
     - It stops at the first wake the sim records: a card waiting, an event starting, or a cause the notices would show (a pest's first sighting, a frost on a crop, a crop ready), from a table in `src/sim/skip.ts`, never read from the page.
     - It goes at most 14 days, it's hidden where it can't be offered, and it isn't saved: a save taken during one keeps the hour reached.
     - The bot, which plays without a clock, doesn't use it.
  4. **A neighbour's plot, opened in detail from its totals.** Zoom into any plot and it's drawn as a garden of beds on its seeded layout (`layoutKey` in `src/sim/ladder.ts`), crops sized by its Output and tinted by its Health. This is looking only: no sim runs and nothing is saved. A test holds the drawn totals to the node's within 5 % (`inflateTarget` and `carryCheck`, the founding spec's "Inflating").
  5. **Budgets and checks.** Measure the frame with the garden composed inside the allotment and every zoom between, and the one-off cost of drawing a plot from its totals. Update the check groups that drive the clock with speeds, and add a `camera` group.
- **It may touch:**
  - `src/app/clock-loop.ts`, `src/app/main.tsx`, `src/app/bench.ts` (its speed), `src/data/ladder.ts`, `src/sim/clock.ts` (`hoursPerSecond`).
  - `src/sim/`: `state.ts`, `save.ts`, `commands.ts`, a new `src/sim/skip.ts`, the foresight it needs from the crops, kitchen and weather models (read-only), and `src/sim/ladder.ts` read-only for item 4. Their tests: `src/sim/commands.test.ts`, `src/sim/save.test.ts`, `src/sim/strategy.test.ts`.
  - `src/ui/`: `TopBar.tsx`, `App.tsx`, `MapView.tsx` (the gestures), `PlotLabels.tsx`, `Notices.tsx`, the quiet night (`src/ui/quiet-night.ts` and its test), the renderer, `src/ui/map/daylight.ts` and its test, `src/ui/map/allotment.ts` (the tile's outline becomes a tag), a new camera file in `src/ui/map/`, the first-minute card's words, `src/ui/styles/page.css` (the speeds' styles go) and `src/ui/styles/tokens.css` (the tag's gold).
  - `src/data/unfold.ts` (the core no longer lists the speeds; the skip's key) and `src/data/explain.ts`.
  - `tools/bot/`: the report's real-time length and the skips offered.
  - `tools/checks/`: the groups that set speeds (dig, explain, first-minute, garden, layout, night, scene, season, shed, stepup, unfold, zoom) move to a check-only fast clock, never a player control. Plus a new `camera` group.
  - Docs: `docs/systems/clock.md`, `docs/systems/map.md`, `docs/systems/unfolding.md`, `docs/systems/commands.md`, `docs/systems/saving.md`, `docs/specs/step-up.md` (the allotment's length at 1×), the weather row of the systems web ("a moon by the speeds"), `docs/SYSTEMS.md` (the speed line, the budget and the source-file rows), `docs/roadmap.d/`, `src/updates.d/`, this brief, and `docs/lessons/`.
- **Nothing else:** no hex land, no ghosts, no standing, no globe. Those are the spec's later parts.

## Read first

- The project notes, then `node tools/graph.mjs src/app/clock-loop.ts`, `node tools/graph.mjs src/ui/map/renderer.ts` and `node tools/graph.mjs src/sim/zoom.ts`, and only the files those list.
- `docs/specs/one-map.md` (items 1 to 7, the clock's table and the build order), and its two decision records.
- `docs/specs/step-up.md` and `docs/specs/zoom-back-in.md` (the zoom-out and the dive this replaces), `docs/systems/ladder.md` ("Inflating and the `carry` check"), `docs/systems/clock.md`, `docs/systems/map.md`.
- `docs/lessons/81-steady-light.md`, `docs/lessons/89-zoom-back-in.md`, and the `feature`, `steward` and `balance` playbooks.

## How it fits and grows

Its rows in the systems web (`docs/specs/overgrow/systems-web.md`): "The ladder and sealing" and "The step-up at every level" (the zoom-out becomes a camera you can stay in), and "Zooming back in" (the dive becomes the same camera pushing in).

1. **Born where.** The garden and the allotment (levels 1 and 2). It moves no flows: it's the camera, the clock's rate and a skip command. Every flow keeps running as it does.
2. **Across the ladder.** Every later level adds its band to the camera and its rate to the table. At level 8 the camera reaches the globe, and anywhere on it opens from its totals, as item 4 opens a plot.
3. **Loops.** None directly. Fast: the camera and the clock respond at once. Slow: none.
4. **People.** The player, looking. Nobody's work changes.
5. **The lever.** The zoom, Pause and the skip. For players who'd rather not, the skip's chip names what's next, and the goal bar keeps naming the next action.
6. **The map.** One camera, no seams; detail by size on screen; your plot tagged; a neighbour's plot drawn from its totals. Reduced motion jumps the camera between zooms and cuts the skip's time-lapse to its end.
7. **Explain.** Why the clock runs faster zoomed out (a wider view, a longer view of time), and what a skip ran through.
8. **Economy and balance.** None: `PLAY` on seeds 1–3 must stay identical to `main`, since the bot plays without a clock. The allotment's real time lengthens (6 s a day at its widest), so the bot's report adds each level's real-time length at its widest view and the skips it would be offered.
9. **Carbon and land.** None.
10. **Polish.** 320 px portrait and landscape up to large screens. Pinch and buttons on phones, one chip at a time, and nothing over the map that a tap on a bed or a plot needs. Concise UK English. The skip is hidden until it can be offered.
11. **The lesson.** Zooming out is seeing more, and seeing time pass. The garden, the allotment and the planet are one world.
12. **Unfolding.** The zoom is there from the first minute. The skip unfolds with the first quiet stretch, with one short line on what it does.

## Speed budget

- **Headless:** nothing: the sim's day is unchanged. The skip runs the same hours.
- **Frames:** the garden composed inside the allotment, at every zoom between, within the garden's frame time today plus 0.3 ms at 1440 × 900, measured the `scene` check's way.
- **One-offs:** drawing a neighbour's plot from its totals under 20 ms at 4× CPU throttling.
- **`dist/`:** within 12 KB gzipped more.
- **Measuring:** against a build of `main` in a worktree, alternating, three runs each. Add the line to `docs/SYSTEMS.md`, "Speed budget". If the frame budget can't be held, stop and say so on #94: that's the spike's answer.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

- The session merges its own PR per the `steward` playbook: Squash and merge by hand once `check` and the Description check are green on the latest head and the look back is committed, then confirm the Pages publish.
- Once the PR is open, subscribe to its events (`subscribe_pr_activity`) and keep a `send_later` about 20 minutes out as the fallback.

## What's left for others

- The spec's later parts, in its build order: land built from hexes and drawn by code (with part 11), upgrades on the map and reaching down, standing and the currencies, the wider world, and the globe with level 8.
- Part 10, the allotment's years, builds on this camera and clock, not on the speeds.
- Under a heading "Handed on" in the PR, list what the spike leaves and what its measurements say about the later parts.

## When to stop and ask

- Only for something irreversible or outside this brief.
- If the budgets can't be held, stop and put the numbers on #94 for the owner.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question and the option you'll take by default, carry on with other work, look at the issue at each stopping point, and take the default after 12 hours with no answer. Say so in the PR.
- Where it's merely unclear, take the safer option (easier to undo, or changing the game less) and say so in the PR.

## Cost budget

- **Estimate:** about $40. The camera and the renderer's composition, the clock's rate, a new command with the sim's foresight, the top bar, twelve check groups moved to a check-only clock and a new one, and three or four CI rounds of about 15 minutes each. Model: the session's model at high effort. No workflows.
- **Stopping points:** at each one (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn.
- **Other sessions:** don't start any. Keep at most about four default-model sessions running at once, and start nothing new on `allowed_warning` (`coordinator` playbook §5).
- **Past twice the estimate:** say why in the PR and in its lesson (`docs/lessons/`), and trim from item 4.
