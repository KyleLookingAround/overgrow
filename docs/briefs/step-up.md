# Brief: part 7, sealing and the step up to the allotment

The founding spec's roadmap, part 7: "Sealing and the step up: the carry-over rule, the step-up card and the zoom-out. Check: `carry`." The maths is already written and tested in `src/sim/ladder.ts`, with its wiring notes in `docs/systems/ladder.md`. This part wires it.

The owner's decision 20 (29 Sep, about 23:25) asks the coordinator to start on the next levels overnight. This part is where the game first becomes more than one level.

Today, when the garden's offer is met, a card says "A year worth a plot" and the allotment "is coming". After this part:
1. A player who wins the offer can take the plot.
2. The garden shrinks into a tile ("This is your plot now"), the camera pulls back, and the tile lands among eleven others.
3. The allotment runs on its own clock, with the player's plot playing on as a sealed node under a plan they set.

## Goal and what it may touch

- **Deliver** one PR on `feature/step-up` from `main`. Start from a GitHub issue (the Feature template).
  - **Spec:** write `docs/specs/step-up.md` from the template. The coordinator approves it (decisions 15 and 20), so nothing waits on the owner.
- **In priority order.** Trim from the bottom if it runs long.
  1. **The sim: levels in the game state.**
     - The game knows which level is being played and each level's graph.
     - A `step-up` command, refused unless the offer is latched, seals the garden with `sealNode(windowTotals(history).totals, hours)`. The garden's detail is kept in the save, compactly, so part 9 can zoom back in to it.
     - The command builds the allotment: twelve plot nodes (kind `plot`), the player's being the sealed garden, the trough and paths as nodes where part 8 will need them.
     - The clock switches to level 2's rate (`src/data/ladder.ts`, 4 s a day) and step (an hour), and `sealedSystem` runs in `src/sim/systems.ts`.
     - The history moves up: level 2 keeps its own `History` for its own offer later.
     - Save with a raised version. There's no compatibility promise before the first release.
  2. **Neighbours' plots as sealed nodes,** generated from the seed with `layoutRng`:
     - eleven plots with invented names and habits (tidy, lazy, generous, competitive), from `src/data/agency.ts` if its tables fit;
     - totals drawn from the household model's ranges, so they sit near the player's garden;
     - one visibly neglected, the one whose household has least time (`neglectedPlot(seed)`, Q13).

     They run by `sealedTick`. Agents, the trough, swaps and the committee are part 8's. Leave the hooks it names in `docs/systems/agency.md` and `committee.md`.
  3. **The player's plot has a plan at level 2.** Coarse levers on the sealed node, each a real trade:
     - **Care:** hours a week, which moves `plan.health` up or down within the sealing rules' point a season. More hours cost the household's time.
     - **Mix:** more roots, more greens, more fruit. It shifts `outputByGroup` towards what the household is short of.
     - **Compost or buy feed:** Health against upkeep and carbon.

     Keep it to three levers, each with an Explain entry. This is the allotment's first minute, not its whole game.
  4. **The step-up card and the zoom-out.**
     - The existing offer card becomes the step-up card. It lists what the allotment opens, from the same tables the game gates on (win W4), with two buttons: "Take the plot" and "Stay in the garden a while". Staying keeps the offer latched and puts it on the goal bar.
     - **The zoom-out on the map:** the garden shrinks to a tile with its numbers, and the camera pulls back to the allotment's twelve plots. It takes about three seconds and can be skipped with a tap. Reduced motion cuts straight to the allotment with the tile highlighted.
     - **The allotment's map,** in the owner's flat, top-down, soft style:
       - twelve plots in rows, with paths, the trough and the sheds;
       - each plot's tile tinted by its Health, showing its Output;
       - the player's plot marked;
       - neighbours as small figures on their plots, drawn from the sealed nodes' flows.
     - The top bar shows "Allotment" and the level's date.
     - The panel has one tab for the plot's plan and one for the allotment (the plots in a list, with their numbers).
  5. **The `carry` check,** as `docs/systems/ladder.md` ("Inflating and the `carry` check") sets it:
     - a sealed garden's Output matches its last full year within 1 %;
     - a rebuilt level's first cycle is inside `INFLATE_TOLERANCE`.

     Add it to `tools/checks/` and list it in `docs/SYSTEMS.md`.
  6. **The bot steps up.**
     - It takes the plot when offered.
     - It sets the plot's plan sensibly, and plays the allotment for a season.
     - It reports the step-up day and the allotment's numbers.
     - The long headless run (`src/sim/index.test.ts`) must cross the step-up and keep passing, repeating from the seed.
- **Level 2's length.** The owner found the garden's year long (decision 17). Aim the allotment at about two years, about 50 minutes at 1×, and say in the spec how part 8 fills them.
- **What players see at the end of this part:**
  - they can take the plot;
  - they watch the zoom-out;
  - they set their plot's plan;
  - they watch twelve plots grow and their plot's numbers move.

  The allotment's problems (the trough, swaps, the neglected plot's slugs, the committee) come in part 8. Show a short "Coming soon at the allotment" line in the panel, not a dead end, and put it on the roadmap.
- **It may touch:**
  - `src/sim/` (state, commands, save, `systems.ts`, `ladder.ts` wiring, a new `allotment.ts` if it helps);
  - `src/data/` (ladder, agency, allotment layout, explain);
  - `src/app/` (the clock loop's level rate only);
  - `src/ui/`: new files for the step-up card, the allotment panel and the allotment map drawing, and small hooks in `App.tsx`, `MapView.tsx` and the map renderer;
  - `tools/bot*` and `tools/checks/`;
  - docs: `docs/systems/ladder.md` (Wiring becomes "wired"), a new `docs/systems/allotment.md`, `docs/SYSTEMS.md`, the founding spec's lines for part 7 if one is now wrong, `docs/roadmap.d/`, `src/updates.d/`, `docs/briefs/step-up.md` (this brief, saved as is) and `docs/lessons/`.
- **Two sessions are building beside you:**
  - **"A shorter garden year"** (`feature/shorter-garden-year`): the clock's rate and speeds, and the quiet-night pacing in `src/app/clock-loop.ts`, `src/data/ladder.ts` and the top bar.
  - **"The UI overhaul"** (`feature/ui-overhaul`, mobile first): every component, `tokens.css` and the page's layout.

  So put your UI in new files, keep edits to existing components to small hooks, and use the tokens as they stand. Merge `main` each time one of them lands, and rebuild your UI on the overhaul's layout and tokens before your last CI round. The quiet-night rule belongs to levels 1 and 2 (the shorter year's brief), so keep it working at the allotment.

## Read first

- The project notes, then `node tools/graph.mjs src/sim/ladder.ts`, `node tools/graph.mjs src/sim/goal.ts` and `node tools/graph.mjs src/sim/models/agency.ts`, and only the files those list.
- The founding spec's sections:
  - "The carry-over rule";
  - "What makes the jump feel earned";
  - "The allotment";
  - the ladder table;
  - the first roadmap's parts 7 to 10.
- `docs/systems/ladder.md`, `docs/systems/agency.md`, `docs/systems/committee.md` and `docs/specs/overgrow/systems-web.md` (the spine and the seeds).
- The `feature`, `steward` and `balance` playbooks.

## How it fits and grows

Its rows in the systems web (`docs/specs/overgrow/systems-web.md`):
- the spine, where the garden becomes a plot;
- "Land use", "Soil" and "Crops" at level 2, as a sealed node's totals and plan;
- "Population and culture" seeded by the neighbours' households;
- "Markets, prices and demand" at level 2, as the plot's mix against the household's demand.

1. **Born where.** The allotment (level 2). Its node is a plot, and flows are carried by the sealed nodes' ticks:
   - kg of food by product group;
   - £ upkeep;
   - kg CO₂e;
   - m² by use.

   The garden's totals are conserved into the plot within 1 % (the `carry` check).
2. **Across the ladder.** The same sealing seals the allotment into a field at part 10, and every level after, by the same code. One level up, a plot shows as a tile with its numbers. Two up, the plot is a tint and a line. The garden returns inflated in part 9's zoom back in.
3. **Loops.** Diet (the mix against the household's shortfalls), intensification (compost against bought feed) and waste. Fast effect: this season's Output. Slow effect: Health's point a season.
4. **People.** The gardener keeps the plot within the household's hours. Neighbours are households with their own time. The player sets the plan.
5. **The lever.** The plot's three-lever plan, and the step-up itself: take the plot or stay a while. "Let them decide" is the advisers' part, later.
6. **The map.** The zoom-out, twelve tinted tiles, figures on their plots, and the neglected plot visibly overgrown. Reduced motion shows the end state.
7. **Explain.** Sealing ("this is your garden's last year, as one plot") and each lever's mechanism. Sources: the household model's, RHS on allotment care, and the carbon notes for bought feed against compost.
8. **Economy and balance.** The offer day (about a year in), and the allotment's Output and upkeep against the household's needs. The bot reports both. The allotment's own offer waits for part 10.
9. **Carbon and land.** The sealed garden's carbon and land carry up exactly. Each plot adds its own, and the allotment's dial sums them.
10. **Polish.** 320 px portrait and landscape up to large screens, on the overhaul's layout. Concise UK English. The allotment's tabs are hidden until the step-up.
11. **The lesson.** What you learnt up close becomes a number you manage from further away: a year of care becomes a plot's Health, and you can't micromanage it any more, only plan it.
12. **Unfolding.** The step-up card comes when the offer latches. The allotment's panel unfolds its levers one at a time over the first weeks, and part 8's problems unfold from there.

## Speed budget

- **Headless:** 12 sealed plots cost about 10 µs a tick (`docs/systems/ladder.md`, "Speed"). Keep an allotment day under 0.5 ms headless, and don't slow the garden day at all.
- **Frames:** keep the allotment's 1440 × 900 frame under the garden's.
- **`dist/`:** within 20 KB gzipped more.
- **Measuring:** against a build of `main` in alternation, three runs each. Add your line to `docs/SYSTEMS.md`, "Speed budget".

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

- **When:** the session merges its own PR per the `steward` playbook. Squash and merge by hand once Checks and the Description check are green on the latest head, the look back is committed, and the bot's step-up and the `carry` check are in the PR.
- **Before your last CI round:** merge `main` each time a neighbour session lands, and again before the last round.
- **After merging:** confirm the Pages run publishes. If `main`'s check goes red, fix it before stopping.
- **Waiting:** once the PR is ready, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged and published, the session stops.

## What's left for others

- **Part 8, the allotment's first season:** neighbours as agents, the trough, the swap shed, pests spreading, the second plot and the committee vote.
- **Part 9:** the first zoom back in.
- **Part 10:** the allotment's years and its sealing.
- The level 1 work: the next playable-garden round, advisers and the baselines reset.
- The owner has said the coordinator chooses (decisions 15 and 20). Put any question in the PR for the coordinator.

## When to stop and ask

- Only for something irreversible or outside this brief.
- Otherwise, if it truly needs a decision, open an issue labelled `needs-owner` with the options and the default, carry on with the default, and name it in the PR. The coordinator answers it.
- Where it's merely unclear, take the safer option and say so in the PR.

## Cost budget

- **Estimate:** about $30. It covers the level state and the step-up command, twelve sealed plots, the plot's plan, the step-up card, the zoom-out and the allotment's map, the `carry` check, the bot stepping up, and two or three CI rounds with merges from two neighbour sessions. The owner's decision 20 justifies the size. Model: the session's model at high effort. No workflows.
- **Stopping points:** at each one, read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn.
- **Keep context down:** don't end a turn after planning: build straight on. Open the PR once items 1 and 2 work, then add the rest in pushes. Don't end a turn except with a PR open and subscribed, or on a real blocker.
- **Other sessions:** don't start any.
- **Past twice the estimate:** say why in the PR and in its lesson, and trim from item 6 upwards.
