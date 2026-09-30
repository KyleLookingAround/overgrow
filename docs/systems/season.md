# The allotment's first season

Part 8 of the founding spec's roadmap, from `docs/briefs/allotment-season.md` with its spec in `docs/specs/allotment-season.md`: the allotment with people in it. It wires the agency and committee models (`docs/systems/agency.md`, `committee.md`), the trough's half of the water model and the spread half of the pest model into the level part 7 opened (`docs/systems/allotment.md`).

- **Where it lives:**
  - `src/sim/season.ts`, tested in `src/sim/season.test.ts`: the two systems and the player's commands;
  - its numbers in `src/data/season.ts`;
  - the models' halves: `troughDay()` and `plotNeed()` in `src/sim/models/water.ts`, `pestSource()` and `spreadPressure()` in `src/sim/models/pests.ts`, and the `waterNeed` motion and the `need` rota in `src/data/committee.ts`;
  - the page's side in `src/ui/SeasonPanel.tsx` (with `src/ui/styles/season.css`) and `src/ui/map/season.ts`, hooked into the allotment's panel and map.
- **The graph** (`allotmentGraph()` with `seasonNodes()`):
  - a node per neighbour (kind `neighbour`, no box) with `agent`, `relation`, `takings` and `week`;
  - each neighbour's plot gains `kept` (`Kept`: this week's hours and keptness, its usual keptness and its usual kg a day);
  - the `committee` node with `support.capital` and `support.goodwill` and the levers `rules` and `motion`;
  - the household gains an `hours` stock (its garden hours this week less the plot's care), the `swap` lever and the game's `seed`;
  - the trough gains `today`, and the sheds a `food` stock and a `shelf`;
  - edges carry food from every plot to the sheds and from the neglected plot to the helper's node.
  - The garden's weather and its run of dry days carry over at the step up, and the `weather` system runs at level 2 too.
- **The order** (`src/sim/systems.ts`): the weather, the `swapShed`, the `allotment`, the household's hours (`allotmentHours`), the people's week (`agency`), the `season`, the sealed plots and the `committee`. All but the weather run at level 2 only.
- **The neighbours' weeks** (`keptWeek`, `plans`): each week a neighbour's `week` goes onto their plot's `kept`. Each day a neighbour's plot heads for Health `15 + 65 × kept^1.5` and yields its usual kg times `kept / usual`, held to 0.6–1.3. The habit's lean part 7 used is gone. Their walks to the plot follow the week's hours.
- **The trough** (`troughDayTick`, `troughDay`):
  - A plot draws nothing until its soil has had three dry days in a row (the weather's forecast's `dry`). Then it draws FAO-56's use: the day's reference rate × 0.9 over half its 96 m², less for a weedy plot.
  - The queue comes in a daily order: the retired first, the rest after work, the competitive a little sooner.
  - The mains puts in up to 1,400 L a day; the trough holds 1,000 L.
  - The rota in force shares it out. First come serves the front of the queue. Slots give equal shares (water-filled). By need gives the same share of each plot's need. No plot takes more than the committee's limit, 300 L.
  - A plot that gets less than 80 % of its need is short. A short day costs `0.4 × gap` of that day's harvest (a one-day event on its sealed node), and a short week lowers its Health target by up to 10.
  - The queue waits at the trough each dry evening (activities, and figures drawn beside it).
  - Each week the household queues for `effects(rules, dryness).queueHours` over its watering days, from its hours.
  - The player's cans go along the `trough-water` edge to their plot and out as its evapotranspiration; the neighbours' go in one flow from the trough.
- **Pests from next door** (`spread`): each week every plot is a source of `min(1, (1 − kept) / 0.5)`. For the second plot kept is how far it's reclaimed; for the player's, its care against the tile's ground. The pressure on a plot is `Σ source × e^(−d / 11 m)` from the others. From April to October it costs `0.25 × pressure` of the week's harvest and up to 8 points of Health target. The map draws slugs on a plot's edges by its pressure.
- **The second plot** (`offer`, `secondPlotCommand`, `secondWeek`):
  - The neglected plot is offered on the allotment's 12th day, which unfolds `agency.helper`.
  - Taking it (`{type: 'second-plot', answer: 'take'}`) makes the player pay its rent. Its holder keeps their node but has no plot, and so leaves the committee.
  - It starts 10 % reclaimed and needs 150 hours in all. It heads for Health 30 to 70, and yields a well-kept neighbour's kg times how far it's reclaimed.
  - Its food waits on its shelf for the week. The helper takes theirs (`agency`), and the rest comes home as `eaten from the second plot`, into the ledger's week by its mix. That's after the household's week has been counted, so it counts in the next week's shop.
  - The level's history counts its crops' m² as the player's land as far as it's reclaimed (`playerLand`).
- **The helper** (`helperCommand`, `watchCommand`): the offer is the model's `helper`.
  - Accepting sets their `helping` lever: they work the plot with their spare hours, up to six a week, for the agreed third. Refusing or letting them go means the household works it from its hours.
  - `{type: 'watch', watching}` sets trust, a glance or an audit.
  - The second plot's lever keeps last week's `reported` and `took`, never the gap.
  - Their barrow (an activity carrying `took`, measured against `reported`) is drawn heaped by the ratio.
  - A week at an audit notes `audit`, which unfolds `agency.trust`.
- **The committee's first vote** (`troughDayTick`, `meetingDay`, `voteCommand`):
  - The first day the trough leaves a plot short, the holder of the shortest plot puts the rota: `waterNeed` if they're generous, else `waterRota`. This unfolds `committee.panel`.
  - The vote's dryness is the share of plots short that day.
  - `{type: 'vote', answer, talk}` spends the talk's hours and holds the vote by `put()`: a member's motion costs the player no capital.
  - If the player hasn't voted within seven days, the room decides with the player abstaining.
  - A passed motion's rule takes hold on the trough the next day.
- **The swap shed** (`shedDay`, `shedWeek`):
  - Each day the neighbours leave a share of their harvest by the season: 4 % in spring, 12 % in summer, 10 % in autumn, 2 % in winter. It goes in that season's glut groups.
  - The player's plot's kg beyond the week's need of a group is `surplus`, which unfolds `allotment.shed`. With `swap` on, it's swapped kg for kg for what the household is still short of, while the shelf has it.
  - The ledger's groups are corrected, so a swap adds its kg to the week and moves them between groups.
  - Each swap moves every neighbour's goodwill a little (`after(r, {type: 'shared'})`). The first swap unfolds `agency.goodwill`.
  - Half the shelf goes home with someone each week.
- **The household's hours** (`hoursWeek`, the `allotmentHours` system): at the start of each week, last week's queueing comes out of what's left, and the hours are topped up to its garden hours less the plot's care, from the `time` boundary. That week's watching (`agency`), reclaiming alone and talking then spend them, so the panel's "hours left" shows what they cost. Talking to members is offered only while the hours are there. The household's `seed`, `ledger` and `goal` are refused as levers.
- **Unfolding**, one at a time: `allotment.neighbours` (the first neighbour's harvest), `agency.helper`, `allotment.trough` and `committee.panel` (the first dry spell), `allotment.shed` (the first surplus), `agency.goodwill` (the first swap) and `agency.trust` (the first audit). The `swap` lever is gated on `allotment.shed`. Sections of the panel stay hidden until their key.
- **The bot** (`seasonPlay` in `tools/bot/player.ts`):
  - It takes the second plot, accepts the helper, audits for four weeks and then glances, votes for the motion, and swaps once the shed unfolds.
  - `SEASON {…}` reports the second plot's day and how far it's reclaimed, its kg home, the helper's hidden take against their report, the first swap, the vote, and the longest quiet stretch at the allotment.
  - That stretch has its own `Quiet` from the step up, with `ALLOTMENT_ANSWER`'s events. The garden's quiet measure now stops at the step up.
- **Speed:** see `docs/SYSTEMS.md`, "Speed budget", part 8's line.

## What's left

- **Part 9:** the neglected plot's slugs in the player's own garden, wired (`docs/systems/zoom.md`); the catalogue's adviser.
- **Part 10:**
  - the bonfire and bee plot votes, proposing motions, the hosepipe ban and carbon choices moving goodwill;
  - the swap shed weighted by each habit's `give` (`shared()`);
  - sealing the allotment with its goodwill as a Health part and its rules.
- **Advisers** ("let them decide"): the vote's abstention, the room deciding, is the hook.

## How it fits and grows

1. **Born where.** The allotment (level 2). Flows: kg by group (the helper's take, swaps, gluts), litres from the mains and the trough, and the household's hours to `time`. Opinion stays in levers.
2. **Across the ladder.** Sealed (part 10), the allotment carries goodwill as a Health part and its rules. The hired hand reuses the agent (part 13); the parish reuses the committee; two levels up it's a tint and a line.
3. **Loops.** Agency (delegating buys time, watching costs it again), water (a shared resource needs rules), trade and waste (surplus swapped isn't wasted).
4. **People.** Eleven neighbours as households with their own time; the helper; the committee.
5. **The lever.** The second plot, the helper and watching, the vote and talking, the swap shed.
6. **The map.** Weeds by how kept; slugs from next door; short plots paler; the queue; the barrow; swaps carried to the shed.
7. **Explain.** `secondPlot`, `helper`, `watching`, `trough`, `nextDoor`, `committee`, `swaps` and `allotmentHours` in `src/data/explain.ts`.
8. **Economy and balance.** The bot's `SEASON` line on seeds 1–3.
9. **Carbon and land.** The second plot's m² join the player's land as it's reclaimed; swapped food is food not given away unused. The allotment's air starts at 0 at the step up (part 7), so the weather's warming index reads the level's own carbon.
10. **Polish.** 320 px up: the neighbours a column of names with a face each, the report one line, the motion a card.
11. **The lesson.** A report isn't the truth, and watching costs time; a shared trough needs rules people agree to.
12. **Unfolding.** As above.
