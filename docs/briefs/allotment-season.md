# Brief: part 8, the allotment's first season

The founding spec's roadmap, part 8: "The allotment's first season: the plots and neighbours, the trough, the swap shed, pests spreading, the second plot, the committee vote." Part 7 (#70) built the step up and left the allotment's twelve plots running as sealed nodes under a three-lever plan, with a "Coming soon at the allotment" line where this part's problems go. The models are already written and tested (`src/sim/models/agency.ts` and `committee.ts`, PR #26 and after), with their wiring notes in `docs/systems/agency.md` and `committee.md`, "Wiring". This part wires them, so the allotment becomes a place with people in it.

The owner's decision 20 (29 Sep, about 23:25) asks for level 1 to feel awesome and for work on the next levels to start. Decision 21 ("presentation is everything") and decision 18 (the UI overhaul, mobile first) set how it's shown.

## Goal and what it may touch

- **Deliver** one PR on `feature/allotment-season` from `main`. Start from a GitHub issue (the Feature template).
  - **Spec:** write `docs/specs/allotment-season.md` from the template. The coordinator approves it (decisions 15 and 20), so nothing waits on the owner.
- **In priority order.** Trim from the bottom if it runs long, and say in the PR what you trimmed. Teach the bot each item as it lands, not at the end: its first run finds design gaps (the `coordinator` playbook §5).
  1. **Neighbours as agents.** Per `docs/systems/agency.md`, "Wiring", part 8:
     - `holder` becomes the full agent: a node per neighbour with `agent`, `relation`, `takings` and `week`; `agency` listed in `src/sim/systems.ts` with `levels: [2]`.
     - Each plot's `kept` (from the agent's `week`) drives its sealed plan's Health and yield, in place of the habit's lean (`docs/systems/allotment.md`, "For part 8").
     - On the map, neighbours come and go on their plots by their week; a kept plot looks kept and a neglected one goes to weeds.
  2. **The second plot and the helper.** The heart of the level's lesson ("a report isn't the truth").
     - A command takes on the neglected second plot. Reclaiming it takes hours and seasons (`secondPlot()`), and its Output joins the player's.
     - A neighbour offers to help for a share (`helperWeek()`). Accept, refuse, and watch or audit them (`audited()`): watching costs the player's hours.
     - The map shows the helper's barrow a little too full (the `taken home` flow), and the panel shows only `reported`, never `hidden`. Goodwill shows as a face or a colour until its panel unfolds.
  3. **The trough and its rota.** The `trough` node's water and the `trough-water` edge (`docs/systems/allotment.md`).
     - The trough holds a daily limit shared by twelve plots, refilled by the mains. In a dry spell a queue forms and the plots at the back go short, which lowers their Health and Reliability.
     - The rota starts as "first come" and is a real lever (the committee's first vote, item 5).
     - Use the weather the garden already has (the same dry spells over twelve plots) and the water model's numbers. Name Ostrom's commons in its Explain.
  4. **Pests spreading from the neglected plot.** Pest pressure on a neglected plot spreads to the plots beside it through `pests.ts`, by distance on the layout; reclaiming or keeping the second plot cuts it. The scripted slugs into the player's own garden (`neglectedPlot(seed)`, the first zoom back in) are part 9's: leave that hook as it is.
  5. **The committee's first vote: the water rota.**
     - Add the `committee` node, as `docs/systems/committee.md` sets out for part 10, but with the rota as its only motion so far (first come, by rota, or by need). Wire `effects(rules, dryness)` to the trough's queue hours and litres.
     - The motion comes once in the first dry spell, put by a neighbour (`put`); the player votes, and can spend hours talking to members first (`persuasion`). The tally shows as the room's hands.
     - Leave the bonfire and the bee plot votes, the hosepipe ban, the proposing command and carbon choices moving goodwill to part 10, and say so in the spec.
  6. **The swap shed.** Surplus by product group left at the shed and swapped for what the household is short of, kg conserved. Neighbours' gluts come and go by the season. A simple first version: the weighting by each habit's `give` (`shared()`) is part 10's.
  7. **Unfolding and the panel.** Propose and add the `unfold.ts` keys that `agency.md` and `committee.md` name (`agency.helper`, `agency.trust`, `agency.goodwill`, `committee.panel`, and a key for the trough and the shed), each with one first-time pulse and a short Explain, never all at once. The "Coming soon at the allotment" line shrinks to what's left for parts 9 and 10.
- **Level 2's length.** About two years (`docs/specs/step-up.md`, "Level 2's length"): this part fills the first season and should leave the bot's longest quiet stretch at the allotment shorter than part 7's. Report it.
- **It may touch:**
  - `src/sim/` (`allotment.ts`, `systems.ts`, `commands.ts`, `state.ts`, `save.ts`, and the models' wiring halves in `src/sim/models/agency.ts`, `committee.ts`, `pests.ts` and `water.ts`);
  - `src/data/` (agency, committee, allotment, unfold, explain);
  - `src/ui/`: the allotment panel and map drawing, and new components, built on the UI overhaul's components (#68) and the map art's style kit (#72);
  - `tools/bot*` and `tools/checks/`;
  - docs: `docs/systems/agency.md`, `committee.md`, `allotment.md` and `water.md` ("Wiring" becomes "wired" for what lands), `docs/SYSTEMS.md`, `docs/roadmap.d/`, `src/updates.d/`, `docs/briefs/allotment-season.md` (this brief, as committed) and `docs/lessons/`.
- **Sessions building beside you:**
  - **The UI overhaul** (#68, `feature/ui-overhaul`, the Fable model): the page's shell, the tokens, and general components (a stat, a stat with a trend, a node card, a list of nodes, a legend). It is moving part 7's allotment panel onto them.
  - **The map art** (#72, `feature/map-art`, the Fable model): an art pass on the garden and a style kit that takes a scale, drawing the allotment with it.

  Merge `main` the moment either lands. Until then, put your UI in new files and keep edits to `AllotmentPanel.tsx` and `src/ui/map/allotment.ts` to small hooks, so the merge is easy. Before your last CI round, your panels must use the overhaul's components and your drawing the kit, if they have landed by then.

## Read first

- The project notes, then `node tools/graph.mjs src/sim/models/agency.ts`, `node tools/graph.mjs src/sim/models/committee.ts` and `node tools/graph.mjs src/sim/allotment.ts`, and only the files those list.
- `docs/systems/agency.md`, `committee.md`, `allotment.md` ("For part 8") and `water.md`, and `docs/specs/step-up.md`.
- The founding spec's sections "The allotment" and "What makes the jump feel earned", and the first roadmap's parts 8 to 10.
- `docs/specs/overgrow/systems-web.md`: level 2's rows (below) and the spine.
- `docs/lessons/70-step-up.md`, and the `feature`, `steward` and `balance` playbooks.

## How it fits and grows

Its rows in the systems web (`docs/specs/overgrow/systems-web.md`): "Agency and trust" at 2 (the neighbour who over-takes), "Water" at 2 (the shared trough, voted by the committee), "Soil" at 2 (the neglected second plot), "Pests" at 2 (pests from next door), "Trade" and "Waste" at 2 (the swap shed), and level 2's row in the quiet-stretch table ("the second plot's reclaiming; swaps as neighbours' gluts come and go; the trough rota in a dry spell; pests from next door").

1. **Born where.** The allotment (level 2). Nodes: a neighbour each, the trough, the shed and the committee. Flows: kg of food by group (the helper's take, swaps), litres from the trough, and the player's hours (watching, persuading, reclaiming) to the `time` boundary. Food and water are conserved; opinion (goodwill, trust, capital) is kept in levers and not conserved, as `agency.md` says.
2. **Across the ladder.** A sealed allotment carries its goodwill as a Health part, and its rules (part 10 seals it). One level up the hired hand reuses the agent (`asWorker`, part 13) and the parish reuses the committee. Two up, goodwill is a tint and one line. The spine: you vote at 2, and serve whoever is elected at 7.
3. **Loops.** Agency (delegating buys time, every delegate has interests, watching costs time again), water (a shared resource needs rules), and trade and waste (surplus swapped is surplus not wasted). Fast: an empty trough in a dry week, a helper's full barrow. Slow: trust lost, the second plot reclaimed over seasons.
4. **People.** Eleven neighbours with names, habits and goals, as households with their own time; the helper; the committee's members. The player plans and decides; the gardener and the neighbours do the work.
5. **The lever.** Take on the second plot, accept or refuse the helper, watch or audit them, vote on the rota (and talk first), leave surplus at the shed. "Let them decide" is the advisers' part, later: leave a hook.
6. **The map.** Neighbours on their plots, the helper's barrow too full (shown, not told), the queue at the trough, weeds on the neglected plot and pests creeping from it, swaps carried to the shed, the room's hands at the vote. Reduced motion shows each end state.
7. **Explain.** The principal–agent problem, and why a report isn't the truth (Jensen and Meckling); the commons and its rules (Ostrom); pest spread from untended hosts (RHS); swaps as gains from difference. Each effect gets its mechanism and source.
8. **Economy and balance.** The kg the helper takes (about a third agreed, up to a further third unseen), the hours an audit and persuasion cost, the litres the rota moves, and the kg swapped. The bot reports the second plot's day, the first swap's day, the vote's day and result, the helper's hidden take, the allotment's Output and the longest quiet stretch at level 2, on seeds 1–3. The garden's milestones and `PLAY` before the step up stay identical to `main`.
9. **Carbon and land.** The second plot adds its m² to the land account as it's reclaimed. Swapped food that would have gone off is waste avoided. Carbon choices moving goodwill are part 10's.
10. **Polish.** Phones first (320 px portrait and landscape) up to large screens, on the overhaul's layout. At 320 px the neighbours are a column of names with a face each, the helper's report one line, and the motion a card with its cost and buttons. Concise UK English. Everything hidden until it unfolds.
11. **The lesson.** A report isn't the truth, and watching costs time; and a shared trough needs rules that people agree to.
12. **Unfolding.** In the allotment's first weeks, one at a time: the neighbours, then the second plot with its helper's offer, the trough in the first dry spell, the vote with it, and the shed with the first surplus. Keys as item 7.

## Speed budget

- **Headless:** keep an allotment day under 0.5 ms (part 7's test), and don't slow the garden day.
- **Frames:** keep the allotment's 1440 × 900 frame under the garden's, with the neighbours and barrows moving.
- **`dist/`:** within 20 KB gzipped more.
- **Measuring:** against a build of `main` in alternation, three runs each, over the allotment's busiest stretch (a dry summer) as well as the year. Add your line to `docs/SYSTEMS.md`, "Speed budget".

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

- **When:** the session merges its own PR per the `steward` playbook. Squash and merge by hand once Checks and the Description check are green on the latest head and the look back is committed.
- **Before your last CI round:** merge `main` each time a neighbour session lands, and again before the last round.
- **After merging:** confirm the Pages run publishes. If `main`'s check goes red, fix it before stopping.
- **Waiting:** once the PR is ready, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged and published, the session stops.

## What's left for others

- **Part 9:** the first zoom back in (the neglected plot's slugs in the player's own garden, and the seed catalogue's adviser).
- **Part 10:** the allotment's years: the bonfire and bee plot votes, proposing motions, the hosepipe ban, carbon choices moving goodwill, the swap shed's weighting by habit, the partner, and sealing the allotment with its offer.
- **Round four** of the playable garden (level 1's money ladder), advisers and "let them decide", the baselines reset and the strategy tests.
- Under a heading "Handed on" in the PR, list what this part leaves for parts 9 and 10.
- The owner has said the coordinator chooses (decisions 15 and 20). Put any question in the PR for the coordinator.

## When to stop and ask

- Only for something irreversible or outside this brief.
- Otherwise, if it truly needs a decision, open an issue labelled `needs-owner` with the options and the default, carry on with the default, and name it in the PR. The coordinator answers it.
- Where it's merely unclear, take the safer option and say so in the PR.

## Cost budget

- **Estimate:** about $30. It covers wiring two tested models, the trough, pests spreading, a first vote and a simple swap shed, the panel and the map, the bot, and two or three CI rounds with merges from two neighbour sessions. Decision 20 justifies the size. Model: the session's model at high effort. No workflows.
- **Stopping points:** at each one, read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn.
- **Keep context down:** don't end a turn after planning: build straight on. Open the PR once items 1 and 2 work, then add the rest in pushes. Don't end a turn except with a PR open and subscribed, or on a real blocker.
- **Other sessions:** don't start any.
- **Past twice the estimate:** say why in the PR and in its lesson, and trim from item 7 upwards.
