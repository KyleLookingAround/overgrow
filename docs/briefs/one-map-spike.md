# Brief: one map, the spike

The first part of `docs/specs/one-map.md` (#94), approved by the owner on 30 Sep 2026. The spec makes the ladder one continuous map of one fixed planet, with the zoom as the only speed control (`docs/decisions/ADR-2026-09-30-one-map.md`, `docs/decisions/ADR-2026-09-30-zoom-is-the-speed.md`). Before levels 3 to 8 are built onto it, this spike proves it on the two levels that exist: the garden and the allotment on one camera, with the clock following the zoom, and the frame and sim budgets held. If they can't be held, the spec goes back to the owner, and the ladder keeps its separate screens.

## Goal and what it may touch

- **Deliver** one PR on `feature/one-map-spike` from `main` (or the session's designated branch, restarted from `main`), closing the spike's part of #94.
- **In priority order.** Items 1 to 3 go together: the speed buttons can't go before the zoom and the skips replace them. Trim from item 4 if it runs long, and say in the PR what was trimmed.
  1. **One camera from the garden to the allotment.**
     - A zoom the player drives: pinch, wheel, the + and − buttons and the breadcrumb. It's a page setting, not game state.
     - At level 2 it runs from the garden fence out to the whole allotment. At level 1 it runs from close on one bed out to the garden fence, which is level 1's limit.
     - Your plot's garden is drawn inside the allotment from what `State.ladder` kept, blended into its plot with no box and a small golden tag, never an outline.
     - The step up's zoom-out becomes this camera pulling out, and part 9's dive becomes it pushing in. Their taps to skip and their reduced-motion cuts stay.
     - Detail comes by size on screen: a crop's silhouette, the gardener, the slugs at dusk appear as they grow big enough to see and fade the same way.
  2. **The clock follows the zoom.**
     - The rate comes from the camera, interpolated in log space between the spec's bands: the garden 12 s a day, the allotment 6 s a day (from 4 s at 1× today).
     - The top bar loses its speed buttons. Pause stays; `State.speed` keeps only pause and run.
     - The "try faster" nudge becomes a pointer to zooming out (level 2) or to a skip (level 1).
     - The quiet night's four-times boost goes; item 3's "Skip to morning" replaces it.
     - The light holds steady wherever a day passes in about a second or less (decision 22). That's none of these two levels, but the rule goes in the code.
  3. **Skips at levels 1 and 2.**
     - A `skip` command with the hour to run to.
     - The sim's own foresight names the next thing that needs you: a crop ready, a sowing window opening, the honesty box empty, a frost forecast, or the morning.
     - It's offered as a chip by the clock only when no pin is open, no card is waiting and no event is running.
     - It runs as a time-lapse of about 2.5 s in the clock loop, every hour simulated as normal.
     - It stops early on anything that would pin. It goes at most 14 days, and it's hidden where it can't be offered.
     - The bot, which plays without a clock, doesn't use it.
  4. **A neighbour's plot, opened in detail from its totals.** Zoom into any plot and it's drawn as a garden of beds on its seeded layout (`layoutKey`), crops sized by its Output and tinted by its Health. This is looking only: no sim runs and nothing is saved. A test holds the drawn totals to the node's within 5 % (the founding spec's "Inflating").
  5. **Budgets and checks.** Measure the frame with the garden composed inside the allotment and every zoom between, and the one-off cost of drawing a plot from its totals. Update the check groups that drive the clock with speeds, and add a `camera` group.
- **It may touch:**
  - `src/app/clock-loop.ts`, `src/data/ladder.ts`, `src/app/main.tsx`.
  - `src/sim/`: `state.ts`, `save.ts`, `commands.ts`, a new `src/sim/skip.ts`, and the foresight it needs from the crops, kitchen and weather models, read-only.
  - `src/ui/`: `TopBar.tsx`, `App.tsx`, the quiet night (`src/ui/quiet-night.ts` and its test), the renderer and its allotment drawing (`src/ui/map/`), a new camera file there, and the first-minute card's words.
  - `src/data/unfold.ts` (the core no longer lists the speeds; the skip's key) and `src/data/explain.ts`.
  - `tools/checks/`: the groups that set speeds (dig, explain, first-minute, garden, layout, night, scene, season, shed, stepup, unfold, zoom) move to a check-only fast clock, never a player control. Plus a new `camera` group.
  - Docs: `docs/systems/clock.md`, `docs/systems/map.md`, `docs/SYSTEMS.md` (the speed line and the budget), `docs/roadmap.d/`, `src/updates.d/`, this brief, and `docs/lessons/`.
- **Nothing else:** no hex land, no ghosts, no standing, no globe. Those are the spec's later parts.

## Read first

- The project notes, then `node tools/graph.mjs src/app/clock-loop.ts`, `node tools/graph.mjs src/ui/map/renderer.ts` and `node tools/graph.mjs src/sim/zoom.ts`, and only the files those list.
- `docs/specs/one-map.md` (items 1 to 7, the clock's table and the build order), and its two decision records.
- `docs/specs/step-up.md` and `docs/specs/zoom-back-in.md` (the zoom-out and the dive this replaces), `docs/systems/ladder.md` ("Inflating and the `carry` check"), `docs/systems/clock.md`, `docs/systems/map.md`.
- `docs/lessons/81-steady-light.md`, `docs/lessons/89-zoom-back-in.md`, and the `feature`, `steward` and `balance` playbooks.

## How it fits and grows

Its rows in the systems web (`docs/specs/overgrow/systems-web.md`): "The step-up at every level" (the zoom-out becomes a camera you can stay in) and "Zooming back in" (the dive becomes the same camera pushing in).

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
