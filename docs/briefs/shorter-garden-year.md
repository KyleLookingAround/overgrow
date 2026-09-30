# Brief: a shorter garden year

After playing round three, the owner said on 29 Sep at about 23:15: "52 weeks does feel quite long to play."

The garden runs at 24 real seconds a game day at 1× (`src/data/ladder.ts`). So its year takes about 2 h 25 min at 1× and 36 minutes at 4×. `docs/decisions/ADR-2026-09-29-strategic-and-long.md` accepted that length when it made the garden last a full year.

The coordinator chose, under decision 15:
- **Keep the full year.** The soil, the rotation, winter and the first-year card are built round it, and a shorter window would break the offer's measure.
- **Make it pass much faster in real time.**
- **Target:** a garden year in about 50–60 minutes at 1×, and about 15 at 4×.
- **Speeds:** the owner asked for both an 8× and a 16× speed at 23:15.

## Goal and what it may touch

- **Deliver** one PR on `feature/shorter-garden-year` from `main`. Start from a GitHub issue (the Feature template).
- **In order:**
  1. **A faster garden day.** Set level 1's `secondsPerDay` from 24 to 12. That makes a year about 73 minutes at 1×.
     - The ladder's other rates stay. The allotment's 4 s a day is still three times faster.
     - Check what the change moves:
       - the first minute: the first harvest is now about 1.5 real minutes at 1×, and the try-faster nudge's timing;
       - the gardener's walk speed on the map (it must still read as walking);
       - anything else in `src/app/clock-loop.ts` or the UI that assumes 24 s.
  2. **Quiet nights pass quickly.** When nothing needs the player, the night runs at four times the chosen speed:
     - the gardener has gone to bed after any dusk patrol;
     - no card or notice is waiting;
     - no pest or weather event is live on the map;
     - pause still pauses.

     Hand it back at dawn (about 06:00), or the moment something happens. Show it: a dimmer map and a small moon or "night" mark by the speeds. Under reduced motion, show the still mark only. This is page-side pacing in the real-time loop, not the sim: the sim's steps and `PLAY` must stay identical.
     - **Target:** a year in about 50–60 minutes at 1×. Measure it on seed 1 with the sensible bot's choices replayed on the page, or estimate from the share of quiet night hours, and report the figure.
  3. **8× and 16× speeds,** so the speeds are pause, 1×, 2×, 4×, 8× and 16×.
     - Make them fit the top bar. On a phone (below 640 px) the folded speed button cycles through all of them. On wider screens, show every button if they fit the one-row bar, or put 8× and 16× in the fold if they don't. The `layout` check must still pass at 320 px portrait and landscape.
     - At 16× a garden day takes 0.75 s, about 32 hourly ticks a second. Check that the worker keeps up on the `scene` check's throttled phone, and report the frame time and the tick copy at 16×. If it can't, say so in the PR and cap the quiet-night boost so that 16× never runs faster than the sim can.
  4. **The notes:**
     - Update `docs/decisions/ADR-2026-09-29-strategic-and-long.md`'s last consequence line, and add a short dated amendment naming the owner's remark and the new figures.
     - Update `docs/systems/clock.md`, the founding spec's ladder line for the garden (`docs/specs/overgrow.md`) and the What's new fragment.
- **Proof that play is unchanged:** the bot's `PLAY` is identical on seeds 1–3 against a build of `main`. The Balance workflow's table shows it; also run it locally once.
- **It may touch:**
  - `src/data/ladder.ts`, `src/app/clock-loop.ts`, `src/sim/clock.ts` (only if the rate is read there);
  - `src/ui/` (the top bar, the night mark and the map's dimming) and `tokens.css`;
  - the checks this moves on purpose (`first-minute`, `layout`, `scene`), and a new check for the quiet night;
  - the docs above, `src/updates.d/`, `docs/roadmap.d/`, `docs/briefs/shorter-garden-year.md` (this brief, saved as is) and `docs/lessons/`.
- **Don't touch:** the sim's systems, the economy, the cards or the bot's policies. A fourth playtest of round three is running, and a round four may follow on those files.

## Read first

- The project notes, then `node tools/graph.mjs src/data/ladder.ts` and `node tools/graph.mjs src/app/clock-loop.ts`, and only the files those list.
- `docs/systems/clock.md` and `docs/decisions/ADR-2026-09-29-strategic-and-long.md`.
- The `feature` and `steward` playbooks.

## How it fits and grows

Its row in the systems web (`docs/specs/overgrow/systems-web.md`) is "Calendar and climate" at level 1: the clock's rate and how quiet time passes. It adds no mechanic.

1. **Born where.** The garden (level 1), on the page's clock. No flows move: the sim's steps are unchanged, so conservation is untouched.
2. **Across the ladder.** Every level keeps its rate. The quiet-night rule belongs to the hourly-step levels (1 and 2). From level 3 the step is a day, so a night passes inside one tick. The allotment inherits the rule as it is.
3. **Loops.** None directly. Faster real time means the slow effects (the soil, fruit) are seen in one sitting.
4. **People.** The gardener's day is unchanged. Their night is shown passing quickly.
5. **The lever.** The speeds, with 8× and 16×. Quiet nights are automatic, and pausing always wins.
6. **The map.** The night dims, and the moon mark shows it's passing fast. Reduced motion shows the still mark.
7. **Explain.** Nothing new to explain: the night mark's tooltip says "Quiet night: passing quickly".
8. **Economy and balance.** No change in game days: `PLAY` is identical. A year takes about 50–60 minutes at 1× in real time.
9. **Carbon and land.** None.
10. **Polish.** 320 px portrait and landscape up to large screens. The top bar still fits. Concise UK English.
11. **The lesson.** None of its own: it lets the year's lessons fit one sitting.
12. **Unfolding.** The night mark first shows on the first quiet night, with one short notice ("Quiet nights pass quickly").

## Speed budget

The sim is untouched. On the page: nothing measurable on the garden's 1440 × 900 frame (the dimming is one tint), and under 1 KB of `dist/` gzipped. The `scene` check's figures go in the PR.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

- **When:** the session merges its own PR per the `steward` playbook. Squash and merge by hand once Checks and the Description check are green on the latest head, the look back is committed, and `PLAY` is shown identical.
- **After merging:** confirm the Pages run publishes. If `main`'s check goes red, fix it before stopping.
- **Waiting:** once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged and published, the session stops.

## What's left for others

- Round four of the playable garden, if the fourth playtest calls for it.
- The staged big buys (the hen house before the hens, a polytunnel before the greenhouse).
- Advisers and "let them decide"; the baselines reset; the strategy tests; Balance #21 to #24; part 7.
- The owner has said the coordinator chooses (decision 15). Put any question in the PR for the coordinator.

## When to stop and ask

- Only for something irreversible or outside this brief.
- Otherwise, if it truly needs a decision, open an issue labelled `needs-owner` with the options and the default, carry on with the default, and name it in the PR. The coordinator answers it.
- Where it's merely unclear, take the safer option and say so in the PR.

## Cost budget

- **Estimate:** about $12. It covers one number, the page's night pacing and its mark, the 8× and 16× speeds, the checks that move, the notes, and one or two CI rounds.
- **Stopping points:** at each one, read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn.
- **Keep context down:** don't end a turn after planning: build straight on. Don't end a turn except with a PR open and subscribed, or on a real blocker.
- **Other sessions:** don't start any.
- **Past twice the estimate:** say why in the PR and in its lesson.
