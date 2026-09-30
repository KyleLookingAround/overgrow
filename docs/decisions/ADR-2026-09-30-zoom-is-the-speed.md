# ADR-2026-09-30: The zoom is the only speed control, with skips where the zoom can't reach

## Status

Accepted when the PR that adds it merges. It records the owner's decisions of 30 Sep 2026 in `docs/specs/one-map.md` (#94). It replaces the speeds set by the shorter garden year (pause and 1× to 16× at every level), and amends the rates in `docs/decisions/ADR-2026-09-29-strategic-and-long.md`'s decision 2. The speeds stay in the game until the spike (`docs/briefs/one-map-spike.md`) replaces them.

## Context

Today the player sets the speed with buttons, from 1× to 16×, and a quiet night hurries itself. On one map the zoom already says how much the player is looking at. The owner: no speed buttons, "it should only be the zoom", the world "slow to where you're looking", and a day cycle that "doesn't have to be as fast" further out. At the first levels the camera can't go out far enough to hurry time, so the owner added: "time skips can happen in the early levels if it takes too long."

## Options Considered

### Option 1: keep the speed buttons beside the zoom
**Pros:** familiar; players choose. **Cons:** two controls for one thing; the owner has ruled it out.

### Option 2: the zoom alone
**Pros:** one control, and zooming out to wait is the game's own gesture. **Cons:** the garden and the allotment run slowly with nothing to hurry them.

### Option 3: the zoom, plus skips to the next thing that needs you at levels 1 to 3
**Pros:** one control where it can work, and quiet stretches cost seconds where it can't. **Cons:** a skip needs to see what's coming, and must never hide something the player would act on. The strategic-and-long record turned down a skip as a way to shorten the garden year; this one is a way through a quiet stretch, and the year keeps its length in game days.

## Decision

Option 3 (the owner, 30 Sep 2026):

1. **The zoom sets the rate.** A garden day takes 12 s, and the rate rises gently outwards, interpolated in log space: 6 s a day at the allotment, 1.2 s at the town, a year in about 73 s over the nation and about 22 s on the globe. Looking and going down share this one clock.
2. **Pause stays.** No other speed control.
3. **Skips at levels 1 to 3.** A quiet night still passes faster on its own, as today. For longer quiet stretches:
   - Offered only when no card is waiting, no event is running and no notice is up, naming the next thing that needs you.
   - Run as a time-lapse of about 2.5 s, never faster than the worker's steps come back, with every hour simulated as normal.
   - Stopped at the first wake the sim records (a card waiting, an event starting, a cause the notices would show), from a table in the sim.
   - At most 14 days, and not saved.
   - A skip is a command (with the hour to run to), so the bot, which plays without a clock, is unaffected.
4. **The light** holds steady wherever a day passes in under 8 s (`STEADY_DAY_S`, decision 22 in `docs/briefs/coordinator-first-slice-6.md`), as it does today.

## Consequences

- The top bar loses its speed buttons, and the clock loop's rate comes from the camera, not a setting.
- A garden year is at most about 53 minutes (today's 1×), less the skips taken. Longer than that, or long in play, and the rates go back to the owner.
- Each level's pacing is judged at the rate of its widest view. The bot's report adds each level's real-time length and the skips it would be offered.
- The `night` and `scene` checks' speed cases change with the spike, which updates them in its PR.
