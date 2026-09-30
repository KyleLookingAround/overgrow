# The allotment's first season

Issue: #77 · Status: Approved (the coordinator, under the owner's decisions 15 and 20; the brief approves it in advance) · PRs: the `feature/allotment-season` PR

Part 8 of the founding spec's roadmap, from `docs/briefs/allotment-season.md`. It wires the agency and committee models (`docs/systems/agency.md`, `committee.md`) into the allotment part 7 opened, so the level has people in it.

## What the player gets

Eleven neighbours who garden as their lives allow: a kept plot looks kept and a neglected one goes to weeds, with its pests creeping next door. The neglected plot comes up for the taking. Reclaiming it takes hours and seasons, and a neighbour offers to do the work for a share. Their report always looks fair, and their barrow a little too full; finding out costs your hours and their goodwill. In the first dry spell the shared trough runs short, the plots at the back of the queue go without, and a neighbour puts the water rota to the committee. You vote, after talking to members if you like. Surplus goes to the swap shed for what the household is short of.

## The mechanism

- **The principal–agent problem** (Jensen & Meckling 1976; Holmström 1979): a helper with their own goals, hidden action, and monitoring that costs the principal. `agency.ts`'s `helperWeek`, `audited` and `secondPlot`, already tested.
- **The commons and its rules** (Ostrom 1990): a trough refilled by the mains at a rate, shared by twelve plots. First come serves the front of the queue; a rota shares it out equally; by need shares it by what each plot is short. Demand is FAO-56's reference evapotranspiration over the watered share of a plot, on the garden's own weather. `committee.ts`'s `effects()` gives the queue hours and the limit a plot.
- **Pests from untended hosts** (RHS on slugs and weeds as reservoirs): a neglected plot's pressure falls off with distance on the layout. Keeping or reclaiming it cuts the source.
- **Swaps as gains from difference:** a surplus of one group traded kg for kg for a group the household is short of.
- **Fast effects:** a dry week's short plots, a helper's full barrow, a swap. **Slow effects:** Health from how kept a plot is and how short of water; trust after an audit; the second plot reclaimed over two seasons.

## Where it sits on the ladder

- **Level 2**, the allotment. New nodes: a neighbour each (kind `neighbour`), the `committee`, and the trough's water and the shed's shelf on the shared places part 7 drew.
- **Zoomed out (part 10):** the allotment carries its goodwill as a Health part and its rules; the hired hand (part 13) reuses the agent, the parish the committee. Opinion (goodwill, trust, capital) is kept in levers and not conserved; food, water and hours are flows.

## What they see

- **On the map:** neighbours walking to their plots by their week; weeds on a poorly kept plot and slugs creeping from it; the helper's barrow filled a little beyond a third; a queue at the trough in a dry spell and short plots paling; the room's hands at the vote; swaps carried to the shed. Reduced motion shows each end state.
- **In the panel** (new, beside part 7's): "The neighbours" (a face each, then goodwill and trust as they unfold), "The second plot" (take it; the helper's offer; watching; the report, never the truth), "The trough" (today's water, the queue, who went short), "The committee" (the motion as a card with its cost and buttons, talking to members, the hands) and "The swap shed".
- **320 px:** the neighbours a column of names with a face each, the helper's report one line, the motion a card.

## How it works

- Hours: the household gets its garden hours each week less the plot's care; reclaiming alone, watching, queueing and talking spend them (flows to `time`).
- Unfolding, one at a time: the neighbours (`agency.neighbours`) at once; the second plot and the helper's offer (`agency.helper`) after the first fortnight; the trough (`allotment.trough`) in the first dry spell, and the vote (`committee.panel`) with it; trust (`agency.trust`) with the first audit; goodwill (`agency.goodwill`) with the first swap; the shed (`allotment.shed`) with the first surplus.
- Managers: a player who takes nothing on keeps part 7's level; the "Coming soon" line shrinks to parts 9 and 10. "Let them decide" (advisers) leaves a hook: the vote's default is to abstain and let the room decide.

## Saved state

The version rises to 12: the neighbour and committee nodes, the plots' `kept`, `pests` and `second` levers, the trough's day, the shed's shelf, the household's hours. An older save starts a new game (no compatibility before the first release).

## Balance

The garden's milestones and `PLAY` before the step up stay identical to `main`. The bot reports the second plot's day, the first swap's day, the vote's day and result, the helper's hidden take, the allotment's Output and the longest quiet stretch at level 2, on seeds 1–3. Part 7 left the allotment with no decisions after its third week (a quiet stretch of about 700 days); this part should shorten it to a season's gap or less.

## Checks

Vitest for the trough's rules (each rota's winners and losers), pest spread by distance, the second plot, the helper's report against the truth, the vote, the swap's kg conserved, unfolding, and a two-year run with a save and load; the long headless run; a browser check group `season` at the six sizes.

## Files

New: `src/sim/season.ts` and its test, `src/data/season.ts`, `src/ui/SeasonPanel.tsx`, `src/ui/map/season.ts`, `tools/checks/season.mjs`. Hooks: `allotment.ts`, `systems.ts`, `commands.ts`, `save.ts`, the models' wiring halves (`agency.ts`, `committee.ts`, `pests.ts`, `water.ts`), `src/data/unfold.ts` and `explain.ts`, the panel and the map, and the bot.

## Left out

- **Part 9:** the neglected plot's slugs in the player's own garden (`neglectedPlot(seed)` stays as it is) and the catalogue's adviser.
- **Part 10:** the bonfire and bee plot votes, proposing motions, the hosepipe ban, carbon choices moving goodwill, the swap shed's weighting by habit (`shared()`), the partner, and sealing the allotment.
