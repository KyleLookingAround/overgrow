# Brief: a steady light at speed

The owner, 30 Sep at about 07:48: "in higher speeds the game flashes between day and night. it's not a great experience for the eyes". The map's night overlay follows `darkness()` (`src/ui/map/daylight.ts`) hour by hour, so the whole map swings between light and dark with each game day. At 1× a day is 12 s, but at 16× it takes about 0.75 s, and quiet nights pass four times faster again. That's a full-screen flash more than once a second, which is uncomfortable and fails WCAG 2.3.1 (no more than three flashes a second) for photosensitive players.

## Goal and what it may touch

- **Deliver** one PR on `feature/steady-light` from `main`: at no speed does the map's overall brightness swing faster than the eye can comfortably follow.
  - **The rule.** When a game day lasts less than about 8 real seconds (at the current speed, counting the quiet night's pace), the map stops cycling day and night. It holds a steady daylight, or a gentle fixed dim for a quiet night, and eases between them over at least a second or two. At slower speeds the day and night cycle stays as it is.
  - **The limit.** Every full-map light layer (the night, and the dawn and dusk glow once the map art lands) changes by at most a set fraction a second, so no speed change, load or jump can snap the map between dark and light.
  - **Time of day stays readable.** The top bar's clock and the quiet night's moon already say whether it's night; add nothing to the map.
  - **Reduced motion:** the same steady light.
  - Pick the numbers (the day length below which the cycle holds, and the fastest a layer may change), measure them, and put them in `src/ui/styles/tokens.css` or beside `darkness()` with a line on why.
- **A check:** in the `scene` group (or a new one), at 16× across two game days, the night layer's opacity changes by no more than the limit between frames, and never swings between day and night more than about once in 3 s. At 1×, the night still falls.
- **It may touch:**
  - `src/ui/map/daylight.ts`, and the few lines in `src/ui/map/renderer.ts` that set the night's alpha;
  - `src/ui/styles/tokens.css`, and the check in `tools/checks/`;
  - `docs/systems/map.md` (a line on the rule), a What's new fragment in `src/updates.d/`, a look back in `docs/lessons/`, and this brief as `docs/briefs/steady-light.md`, saved as given.
  - Nothing in `src/sim/`: this is drawing only, and play must be identical.
- **The map art (#72)** is rewriting `renderer.ts` and adds a dawn glow (`warmth()` in `daylight.ts`). Keep your change to a small function in `daylight.ts` that takes the raw darkness (and glow) and the real seconds per game day and returns what to draw, plus a one-line call in the renderer. Then the merge either way is easy. If #72 lands first, merge `main` and apply the same limit to its dawn glow. If you land first, #72's session will take `main`.

## Read first

- The project notes, then `node tools/graph.mjs src/ui/map/daylight.ts` and `node tools/graph.mjs src/app/clock-loop.ts` (where the real seconds per game hour come from, with the quiet night's pace), and only what they list.
- `docs/systems/map.md` and `docs/systems/clock.md`.
- The `feature` and `steward` playbooks.

## How it fits and grows

It adds no mechanic: drawing only, no rows in the systems web (`docs/specs/overgrow/systems-web.md`). It grows with the clock: every level's map uses the same `darkness()` and the same limit, and the clock only gets faster as the player goes up the ladder, so the steady light is the norm at levels 3 and up.

## Speed budget

Negligible: one clamp a frame. Confirm the `scene` check's frame figures don't move.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session squash-merges its own PR per the `steward` playbook once Checks and the Description check are green, then confirms the Pages publish and stops. Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in.

## What's left for others

- The map art (#72), the UI overhaul (#68) and the lessons tidy (#80) are open beside you: don't touch their files beyond the lines above.
- Lightning, if a later part adds it, must keep to the same limit.

## When to stop and ask

- Only for something irreversible or outside this brief.
- Otherwise, if it truly needs the owner, open an issue labelled `needs-owner` with the question and the default, carry on with the default, and name it in the PR.
- Where it's merely unclear, take the safer option (the steadier light) and say so in the PR. The coordinator answers any question there.

## Cost budget

- **Estimate:** about $6: one small drawing change, a check, one or two CI rounds (about 24 minutes each). Model: the session's model.
- **At each stopping point** (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn.
- **Past twice the estimate:** say why in the PR and in its lesson.
