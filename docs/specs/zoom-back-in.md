# The first zoom back in

Issue: #87 · Status: Approved (the coordinator, under the owner's decisions 15 and 20, by the brief `docs/briefs/zoom-back-in.md`) · PRs: the `feature/zoom-back-in` PR

Part 9 of the founding spec's roadmap: the trace, Go down or Send someone, the deadline and the reward, on the scripted slug outbreak ("Zooming back in").

## What the player gets

In the allotment's first summer your plot's output falls: slugs from the neglected plot have got into your own garden, the plot sealed below. A line on the map runs from that plot to yours, which pulses. **Go down** and the camera dives into your garden as you left it, the slugs in its beds. Break the outbreak with the garden's own tools before a deadline, then **Back up**. Or **Send someone**, who does it for a fee and half the reward. A rescue in time brings the plot's numbers back, marks it **Rescued** with Reliability +10, and earns the neighbours' goodwill, more the sooner.

## The mechanism

- **Pests from untended ground** (RHS, "Slugs and snails"; AHDB, "Slug control"): weedy ground next door shelters slugs, and in a mild, wet summer they move into the ground beside it. A heavy slug year takes a third to a half of leafy crops.
- **The fix** is the garden's slug model (`docs/systems/pests.md`): a torch patrol, traps or pellets catch the slugs that are out on damp nights, and nematodes kill them below ground in warm, moist soil (Wilson et al. 1993).
- **An adviser with a fee** is delegating (`docs/systems/agency.md`): it buys your time and costs money and a share of the credit.
- **Simplifies:** one scripted outbreak; the allotment stands still while you're down and runs on over those hours when you come back up.
- **Fast effect:** the plot's output down 40 % while the slugs last. **Slow effect:** the Rescued mark and the goodwill it earned.

## Where it sits on the ladder

- **The allotment (level 2), reaching the garden (level 1).** The outbreak is a `GameEvent` on the sealed garden, home level 1: shown one level up as its tile's "Output −40 %", its kg conserved by `eventFactor`.
- **Carried up:** the rescued plot's Reliability +10 and its Rescued lever ride in its sealed node when the allotment seals (part 10).
- **At every level from 2 up** the same move returns: a shortage traced to one node, at most once a game year per level, never in a level's first year. The first unscripted one is part 10's or later.

## What they see

- **On the map:**
  - the trace, one line from the neglected plot to yours, with slugs along it, and your tile pulsing;
  - the dive, the zoom-out in reverse (about 3 s, a tap skips it);
  - the garden with its slugs, and the gardener's torch at dusk;
  - the Rescued rosette on the tile.
  - Reduced motion cuts straight in and out, and the light stays steady (decision 22).
- **Over the map at the allotment:** a card in the goal bar's place, "Slugs from Idris's plot are in your garden…", with the days left, the reward, **Go down** and **Send Pat · £18**.
- **Down in the garden:** the deadline strip across the top, one line: "9 days left · 0.4 kg short", with **Back up**.
- **In the plot's panel:** "Rescued", and one line on how it ended.
- 320 px portrait and landscape up to large screens.

## How it works

- **The outbreak** (`src/sim/zoom.ts`, numbers in `src/data/zoom.ts`) comes on the first wet day from June to August once the plot has been held 28 days (the last day of August if none is wet). It has size 0.4 for 28 days, a deadline of 14 garden days, and comes from `neglectedPlot(seed)`, its plot and holder unchanged. Its kg are counted as the clock runs, down there too.
- **Go down** (`go-down`, once `zoom.trace` has unfolded) inflates the garden kept in `State.ladder`:
  - its graph runs on unseen from where it was sealed to today, the gardener and your plan as they were;
  - its sealed year is kept, so the weeks down there don't join it;
  - the household's purse comes down, and the same sky;
  - 14 slugs a m² arrive in each growing bed, and 100 on the lawn's edge.
- **Down there** the level is 1 at the garden's rate: one clock, so the allotment barely moves. The fix is the growing beds' slugs halved from their peak before the deadline. The patrol does it in a damp week, nematodes (unfolded by the beds thriving) whatever the weather, and leaving it takes two weeks or more.
- **Back up** (`back-up`, whenever you like) brings the purse and the sky back. The plot runs on from now (its food came through the garden's kitchen meanwhile), and the allotment runs on over the hours spent down.
- **What reseals the garden on the way back up:** the sealed node, with the event lifted at the hour of the fix. It is not `sealNode` from the garden's window. The garden's graph is kept as left and its year's ring as sealed, so the `carry` check still compares the plot with the year it was sealed from.
- **A rescue** puts Reliability +10 on the sealed node and `rescued` on the plot, and moves every neighbour's goodwill by `after(r, {type: 'rescued', share})` (0.06 × the share: 1 at once down to 0.35 at the deadline).
- **A missed deadline** fixes nothing: the event runs its course.
- **Send someone** (`send-someone` with an adviser's id) takes the fee from the purse. The event lifts `days` later, for `reward` of the share. `ADVISERS` is the table part 10's advisers join.
- **Unfolding:** `zoom.trace` (the trace, Go down and Send someone) with the outbreak, and `zoom.dive` (the strip and Back up) on the first dive. The garden's slug line unfolds with the slugs if it never had.

## Saved state

- `State.zoom` (null until the outbreak) and `Below.at` (the hour a level kept below has been run to).
- While you're down, the allotment's graph is kept in `zoom.down`.
- The save version rises to 14. An older save starts a new game.

## Balance

- `PLAY` before the step up is unchanged. The garden's milestones on seeds 1–3 are identical.
- The bot goes down, picks slugs and waters on nematodes. It rescues in 2–5 garden days of 14 on seeds 1–3, and the outbreak costs the plot 0.2–0.5 kg.
- Left alone, it costs about 3.4 kg (seed 3).
- The bot's `ZOOM` line reports it.

## Checks

- **`src/sim/zoom.test.ts`:**
  - the outbreak's timing and place;
  - left alone: its kg, missed, running its course;
  - going down, the fix, back up, the mark and the goodwill, with the sealed year and the `carry` report untouched;
  - a save taken down there carrying on exactly;
  - sending someone, and its refusal on a short purse;
  - the reward falling with time.
- **The `zoom` check group:** the trace, the card, the dive, the strip and Back up at 320 px, landscape, tablet and desktop.

## Files

- **New:** `src/data/zoom.ts`, `src/sim/zoom.ts` and its test, `src/ui/ZoomCard.tsx`, `tools/checks/zoom.mjs`.
- **Hooks in existing files:**
  - the sim: `state.ts`, `save.ts`, `commands.ts`, `allotment.ts` and the agency model's `rescued` event;
  - the page: the renderer (the trace, the dive), the allotment's tile (the rosette), `App.tsx`, `AllotmentPanel.tsx` and the snapshot delta (a new level sends it whole);
  - the Explain table and the unfold keys;
  - the bot.

## Left out

- Unscripted zooms back in, and the trace at other levels (part 10 on).
- Advisers on other tabs (part 10's), which join `ADVISERS`.
