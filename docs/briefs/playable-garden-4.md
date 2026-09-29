# Brief: the playable garden, round four: a money ladder and a winter with work in it

Round three (#63) gave the autumn and winter cards, mid-priced kit, a purse line and a year that always ends. The UI overhaul (mobile first) and a shorter garden year (12 s a day, quiet nights at 4×, 8× and 16×) have merged since. This round builds on both.

A fourth playtest of `main` after #63 (seed 1, desktop days 1–381, phone days 1–122) found:
- **The goal is out of reach for 250 days.** From day 112 the goal bar reads "Save for the hen house and three hens". It was still £218 to go at day 271, and £217 at day 381.
  - Income is about £12 a week, mostly groceries saved. The other shop items (£12–45) take it as fast as it comes.
  - "Open the Shed" leads to things the player can't afford, and the goal never names what to buy.
- **Income droughts.** Only 4.5 kg was sold at the box all year, for £11.31, and every season card said "0 kg sold". A glut pays only if the player picks "Sell", and the first choices listed (preserve, give away) pay nothing. The purse sat at £0–6 for weeks.
- **Midwinter is still empty.** The catalogue came on day 285 and dig or no-dig on day 289, and then nothing until day 323. January brought £0 in and 0.65 kg picked.
- **Repeat items pile up.** Raised beds and cordons stay on offer after buying. The player bought three raised beds at £45 with no bed to put them on.
- **The year card lists facts but no next step,** and year two starts with no new aim.
- **The bot:** round three's own measures were a quiet stretch of 15–21 days and a purchase every three or four weeks. Late March to April is the thinnest stretch.

The coordinator chose (decision 19): **cheaper steps towards the big buys,** keeping the household's income on its ONS figures.

## Goal and what it may touch

- **Deliver** one PR on `feature/playable-garden-4` from `main`. Start from a GitHub issue (the Feature template). The coordinator approves the spec (decisions 15 and 20).
- **In priority order.** Trim from the bottom if it runs long.
  1. **A money ladder the goal walks you up.**
     - **Stage the big buys:**
       - the hen house (the coop and run) before the hens, and the hens one or two at a time;
       - a polytunnel or a lean-to before the greenhouse;
       - one fruit bush before the fruit cage.

       Each stage is a real thing with its own use (the coop can shelter the compost or the tools until the hens come; a lean-to extends the season a little). Price the steps so the next one is two to four weeks of an engaged player's income away.
     - **The goal bar names the next rung:** the item, its price and the gap ("Cold frame: £12 to go"), and its button opens the Shed at that item.
     - **Cap repeat items at what the garden can take:** raised beds at the beds there are to raise, cordons at the fence's room. Then hide them.
  2. **Income a player can see and choose.**
     - The glut card shows what each choice gives: £ for selling, jars for preserving (and the £ they save in winter), goodwill for giving. Selling is listed first when the purse is short of the next rung.
     - The box sells year-round what the garden has: winter salad, kale, leeks, eggs once there are hens, and preserves.
     - The season cards' "sold" line reflects it.
     - **Target:** an engaged player reaches the next rung every two to four weeks all year. The purse never sits at £0 for more than a fortnight.
  3. **Midwinter work** (late December to early February), real jobs as cards or offers:
     - pruning the cordons;
     - ordering seed potatoes and onion sets;
     - cleaning pots and the cold frame;
     - a winter sowing under cover (broad beans, sweet peas, or salad in the propagator);
     - the hens' winter care, once they're there.

     **Target:** no stretch over about 14 game days without a card, an offer or a sale, measured by the bot on seeds 1–3, including late March to April. Measure the ceiling first. Report the honest figure.
  4. **The year card's next step:** one line naming the next rung and where the allotment offer stands. The goal bar then carries year two.
  5. **Spacing what unfolds,** so no more than one "New:" a day. The UI overhaul designed how they show; this is when they fire.
- **Tips proved by a player who follows them:** the goal-bar-only bot still reaches the offer on seeds 1–3, and now climbs the ladder rung by rung.
- **The bot.**
  - **Its policies:** climb the ladder, sell when short, and answer the midwinter cards.
  - **The run:** seeds 1–3 against `main`, a full year and into the second.
  - **In the PR:**
    - each purchase's day;
    - the purse by month;
    - the kg eaten, sold, preserved, given and wasted;
    - the longest quiet stretch and where it falls;
    - the offer's day.
  - **Balance:** this brief approves the milestones moving.
- **Play it yourself** at 390 × 844 first (the owner asked for mobile first), then 1440 × 900, at days 2, 30, 90, 150, 220, 280, 300, 330 and 366. Put "is the whole year a game now" in the PR, with what's still flat. The coordinator runs a fifth playtest after merge.
- **It may touch:**
  - `src/sim/` (shed, the cards, goal, kitchen, household spending where the box needs it, livestock wiring);
  - `src/data/` (shed, unfold, explain, crops, livestock);
  - `src/ui/`, on the overhaul's components and tokens;
  - `tools/bot*` and the checks it changes;
  - docs for what changes, `src/updates.d/`, `docs/roadmap.d/`, `docs/briefs/playable-garden-4.md` (this brief, saved as is) and `docs/lessons/`.
- **Don't touch:** `src/data/ladder.ts`, `src/app/clock-loop.ts`, or part 7's step-up and allotment files (`feature/step-up`, which may be open beside you: merge `main` when it lands).

## Read first

- The project notes, then `node tools/graph.mjs src/sim/goal.ts`, `node tools/graph.mjs src/data/shed.ts` and `node tools/graph.mjs src/sim/models/livestock.ts`, and only the files those list.
- `docs/briefs/playable-garden-3.md` and its look back `docs/lessons/62-playable-garden-3.md`, and the UI overhaul's spec `docs/specs/ui-overhaul.md`.
- `docs/systems/shed.md`, `docs/systems/kitchen.md` (if it exists), `docs/systems/livestock.md` and `docs/systems/unfolding.md`.
- The `feature`, `steward` and `balance` playbooks.

## How it fits and grows

Its rows in the systems web (`docs/specs/overgrow/systems-web.md`):
- "Markets, prices and demand" at level 1 (the box year-round and the ladder's prices);
- "Livestock" at level 1 (the hens in stages);
- "Waste and circularity" (gluts sold, preserved or given);
- "Labour" at level 1 (midwinter jobs within the gardener's hours).

1. **Born where.** The garden (level 1). Conserved: £ from the purse to the shed and from the box to the purse; kg of food to the kitchen, the box, jars or a neighbour; m² to the coop and run.
2. **Across the ladder.** A sealed garden carries its kit, hens and box takings in its totals. The allotment's swap shed is the box's next step up, and the staged buys become the allotment's shared kit.
3. **Loops.** Waste (gluts), diet (eggs and preserves) and trade (the box). Fast effect: this week's purse. Slow effect: the hens' and fruit's years.
4. **People.** The gardener does the midwinter jobs within their hours. Customers at the box are households. The player decides.
5. **The lever.** The ladder's purchases, the glut choice, what the box sells, and the midwinter cards.
6. **The map.** Each stage is drawn where it stands (the coop before the hens, the lean-to), the box stocked with what's for sale, and coins to the purse. Reduced motion shows stills.
7. **Explain.** RHS for pruning, polytunnels and winter sowing; the livestock model's sources for the hens; WRAP for gluts and preserving; a seed and garden catalogue for prices.
8. **Economy and balance.**
   - The next rung every two to four weeks.
   - The purse never at £0 for over a fortnight.
   - A quiet stretch of at most about 14 days.
   - The goal-bar bot reaches the offer.
9. **Carbon and land.** The coop and run in the land account, the hens' methane and manure N₂O as before, and a polytunnel's plastic if it has a source.
10. **Polish.** Mobile first, on the overhaul's layout. One "New:" a day at most. Concise UK English. Hidden until worth having.
11. **The lesson.** A small garden pays its way by steps: sell the glut, save for the next tool, and let the slow buys (hens, fruit) pay back over years.
12. **Unfolding.** Each rung shows when the one before is bought or nearly affordable. The box's winter stock shows with the first winter crop. The midwinter cards come with their season.

## Speed budget

- **Headless:** keep this round's additions within 0.08 ms a garden day, measured over the summer and the year against a build of `main` in alternation, three runs each.
- **Frames:** 0.2 ms of the garden's 1440 × 900 frame and 0.15 ms of the throttled phone frame.
- **`dist/`:** 10 KB gzipped, checked as you go.
- **CI:** its garden-day test must stay at least 0.15 ms under its limit on `main`.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

- **When:** the session merges its own PR per the `steward` playbook. Squash and merge by hand once Checks and the Description check are green on the latest head, the look back is committed, and the Balance table and your playthrough review are in the PR.
- **Before the last CI round:** merge `main`.
- **After merging:** confirm the Pages run publishes. If `main`'s check goes red, fix it before stopping.
- **Waiting:** once the PR is open, call `subscribe_pr_activity` and end the turn. Don't book a `send_later`. When it has merged and published, the session stops.

## What's left for others

- Advisers, recommendations and "let them decide".
- The baselines reset for a full garden year.
- The strategy tests.
- Balance #21 to #24.
- Parts 8 to 10 at the allotment.
- The owner has said the coordinator chooses (decisions 15 and 20). Put any question in the PR for the coordinator.

## When to stop and ask

- Only for something irreversible or outside this brief.
- Otherwise, if it truly needs a decision, open an issue labelled `needs-owner` with the options and the default, carry on with the default, and name it in the PR. The coordinator answers it.
- Where it's merely unclear, take the safer option and say so in the PR.
- A pass mark out of reach for a reason this brief leaves alone: measure its ceiling, take the nearest honest mark, and say so.

## Cost budget

- **Estimate:** about $28. It covers the staged buys and the ladder on the goal bar, the box year-round and the glut card's money, the midwinter cards, the year card's line, the bot's policies, a playthrough and two CI rounds. Model: the session's model at high effort. No workflows.
- **Stopping points:** at each one, read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn.
- **Keep context down:** don't end a turn after planning: build straight on. Open the PR once items 1 and 2 work. Don't end a turn except with a PR open and subscribed, or on a real blocker.
- **Other sessions:** don't start any.
- **Past twice the estimate:** say why in the PR and in its lesson, and trim from item 5 upwards.
