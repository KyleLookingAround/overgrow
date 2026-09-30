# The zoom back in

Part 9 of the founding spec's roadmap, from `docs/briefs/zoom-back-in.md` with its spec in `docs/specs/zoom-back-in.md`: the first time the player goes back down a level. The rescue is `src/sim/zoom.ts`, tested in `src/sim/zoom.test.ts`, with its numbers in `src/data/zoom.ts`. The page's side is `src/ui/ZoomCard.tsx` (the card and the deadline strip), with the trace and the dive in `src/ui/map/renderer.ts` and the Rescued rosette in `src/ui/map/allotment.ts`. The browser check is `tools/checks/zoom.mjs`.

- **The outbreak** (`zoomTick`, run by every tick command after the systems, `src/sim/commands.ts`):
  - It comes once a game, at the allotment, on the first wet day from June to August once the plot has been held 28 days (the summer's last day if none is wet). Slugs move on wet nights, so the garden's tools have nights to work in.
  - It is a `GameEvent` on the player's sealed plot (kind `pests`, home level 1, size 0.4, 28 days): `eventFactor` takes its kg off the plot's output, and the tile shows it one level up.
  - It comes from `neglectedPlot(seed)`, its plot and holder unchanged.
  - The zoom counts its kg as the clock runs (the plan's output × 0.4 × the days, down there too), and notes them as `slugs in your garden` at the plot, which unfolds `zoom.trace`.
- **The trace** (the renderer): one line from the neglected plot to the player's, three slugs along it and the tile pulsing, while the event runs unfixed. Held still under reduced motion.
- **Go down** (`goDown`, the `go-down` command, once `zoom.trace` has unfolded, and refused once sent, rescued or missed):
  - The garden kept in `State.ladder` becomes the level again (level 1, home `kitchen`).
  - It is run on unseen from the hour it was left (`Below.at`, else the step up) to today (`runOn()`: the garden's systems, flows moved, activities and effects dropped): inflating.
  - Its goal's ring is put back as sealed, so the weeks down there never join the garden's sealed year.
  - The household's purse and the sky come down with you.
  - 14 slugs a m² arrive in every bed with a crop growing, and 100 on the lawn's edge (`slugs from next door`, from the `wild` boundary). This unfolds the garden's slug line if it never had one, and `zoom.dive` with `going down`.
  - The allotment is kept in `zoom.down` with the growing beds' slugs a m² as they arrived (`peak`).
- **Down in the garden:** one clock at the garden's rate. The step up is refused. The fix is the growing beds' slugs down to half their peak (`bedSlugs`, `OUTBREAK.clear`) before the deadline, 14 garden days from the outbreak. The rescue's hour and its share of the reward are then kept. On the probes (seeds 1–3, a sensible garden a year on and a bare one):
  - a patrol, traps or pellets break it in about a week of a damp June;
  - nematodes (unfolded by the beds thriving) do it in about a week whatever the weather;
  - leaving it takes two weeks or more, or never in a dry spell.
- **Back up** (`backUp`, the `back-up` command, whenever the player likes):
  - The garden goes back into `State.ladder` as left (`at` now), its ring as sealed.
  - The purse and the sky go back up.
  - The player's plot runs on from now (its food came through the garden's kitchen meanwhile).
  - A rescue is put on the plot, then the allotment runs on over the hours spent down (`runOn()` at level 2).
  - An unfixed event runs on.
- **A rescue** (`applyRescue`):
  - the event is cut to end at the hour of the fix;
  - Reliability +10 goes on the sealed node's totals (its sealed `base` is unchanged, so the `carry` check still reads the year it was sealed from);
  - a `rescued` lever goes on the plot (the rosette, the panel's line, and carried up when the allotment seals);
  - every neighbour's goodwill moves by the agency model's `rescued` event: 0.06 × the share, the share falling from 1 at the outbreak to 0.35 at the deadline (`shareAt`).
- **A missed deadline** fixes nothing: the event runs its course, about 3.4 kg at seed 3's plot.
- **Send someone** (`sendSomeone`, the `send-someone` command with an adviser's id; `ADVISERS` in `src/data/zoom.ts`): the fee from the household's purse (`an adviser’s fee`), and a rescue `days` later for `reward` (half) of the share at that hour. It is refused while down, once sorted, and when the purse is short. Part 10's advisers join the table, and the command's shape (an adviser by id, a fee and a share) is their hook.
- **The page** (`src/ui/App.tsx`):
  - At the allotment, while the outbreak is open and `zoom.trace` has unfolded, the card sits in the goal bar's place: the neglected plot's holder, the fall, the days left, the reward, Go down and Send someone with the fee.
  - Down in the garden, the deadline strip sits across the top of the map ("9 days left · 0.4 kg short", then "Rescued in 5 days" or "Missed the deadline"), with Back up; the goal bar and the stay bar are hidden.
  - A change of level sends the snapshot whole (`src/app/delta.ts`), and the sim copies a swapped graph afresh (`src/sim/state.ts`).
  - The dive is the zoom-out in reverse: the allotment's last picture grows about the player's plot while the garden opens out of it, about 3 s; a tap skips it; reduced motion cuts straight in. Back up plays the step up's zoom-out.
- **Saved state:** `State.zoom` (null until the outbreak; while down it holds the allotment's graph) and `Below.at`. The save version is 14.
- **The bot** (`zoomPlay` in `tools/bot/player.ts`): it goes down as soon as it can, sets the patrol, buys nematodes once the shed offers them, and comes back up once rescued or missed. Down there it runs only that policy, and the garden's measures (its diary, quiet and purchases) stay closed. `ZOOM {…}` reports the outbreak's day, how it was met, the rescue's garden days against the deadline's, the kg lost, and the plot's kg a day over the four weeks before and from it.
- **Speed:** see `docs/SYSTEMS.md`, "Speed budget", part 9's line.

## How it fits and grows

1. **Born where.** The allotment (level 2), reaching down to the garden (level 1). Flows: kg lost on the sealed garden (by the event) and saved, the slugs from next door and those caught, the purse carried down and back, and the adviser's fee. Goodwill, the reward, is opinion kept in levers.
2. **Across the ladder.** The rescued plot carries its mark and Reliability up when the allotment seals. From level 2 up the same move comes back, at most once a game year per level and never in a level's first year; the first unscripted one is part 10's or later. At the planet the trace runs all the way down.
3. **Loops.** Agency (Send someone delegates, with a fee), and a failure far off with a cause close up. Fast: the deadline. Slow: the lasting mark.
4. **People.** The player, going down; the gardener on the plan below; the neglected plot's holder, named; Pat from Row C, sent instead.
5. **The lever.** Go down or Send someone; below, the garden's own slug tools.
6. **The map.** The trace, the dive, the deadline strip, the rosette.
7. **Explain.** `outbreak`, `goingDown` and `adviserSent` in `src/data/explain.ts`.
8. **Economy and balance.** The bot's `ZOOM` line on seeds 1–3.
9. **Carbon and land.** None new: the garden's own carbon and land carry through the dive, and the `carry` check proves it.
10. **Polish.** At 320 px the strip is one line and the card a short paragraph with two buttons.
11. **The lesson.** A failure far off has a cause close up, and you can go and fix it.
12. **Unfolding.** `zoom.trace` with the outbreak, `zoom.dive` with the first dive.
