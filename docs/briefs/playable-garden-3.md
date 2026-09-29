# Brief: the playable garden, round three

The owner asked for level 1 to feel like a somewhat polished game they can have a go with (the owner's decision 14). Round one (#56) gave it verbs, and round two (#59) gave it a budget, big buys, the bed card and the week's decisions.

A third playtest of `main` after #59 (seed 1, desktop to day 420, phone to day 120) found days 1–60 are a game and the goal bar is good, but:
- **A 90-day quiet stretch** from the autumn card (day 231, early November) to the winter card (day 323, early February). There was no notice, card or decision, while the beds sat under green manure and onions. Round two's own look back measured the bot's longest quiet stretch at 29–40 days and called winter "structurally quiet".
- **No finale.** The year card fires only once the offer's three requirements are met. The engaged player reached Reliability 24 of 35 and Output 0.2 of 0.25 kg a day, so year two began on day 365 with nothing, and by day 420 the goal bar read "Plan kale in bed 5".
- **Money comes in lumps.** The purse was £251 on day 222, then £26 on day 270 after the hens, a raised bed and the compost bin. The player couldn't see where it went. It was back to £158 by day 365. The Shed has £40–85 kit and £150–320 big buys, and nothing in between. So there are a handful of purchases a year, not one every week or two.
- **The goal never points at the shed.** Its verbs are jobs (dig, sow, preserve), and "Grow a steadier mix, and something for the winter" stayed up for 70 days with no button behind it.
- **Small things.**
  - The glut card says "preserve it, give it to a neighbour or sell it?" but offers only two buttons.
  - A "New: soil moisture and the watering line… +3" notice showed in every screenshot from day 200 to day 366. It may be the playtest's script re-opening it, so confirm it first.
  - The Kitchen said "groceries saved £1" at day 366, and nowhere shows what the garden saved over the year.

This round makes the autumn and winter a season of play, gives the year an ending whether or not the offer is won, and makes the money a steady stream of choices.

## Goal and what it may touch

- **Deliver** one PR on `feature/playable-garden-3` from `main`. Start from a GitHub issue (the Feature template). The owner's decisions 14 and 15 approve this in advance: the coordinator chooses, and says what was chosen.
- **Before you start:** PR #61 (the garden-day speed headroom) must be in `main`. If it isn't when you start, build on `main` and merge it in when it lands. Leave the speed work to it.
- **In priority order.** Trim from the bottom if it runs long.
  1. **Autumn and winter are a season of play.** Real jobs and choices from October to February, each a card or a shed offer, never a nag:
     - the autumn clear-up: clear or compost the spent crops, and gather leaves for leaf mould (a slow soil gain);
     - bare-root season (November to March): fruit bushes and trees are cheapest and establish best planted then (RHS). Offer them one at a time, with the fruit cage as the big version;
     - the seed catalogue in December or January, not at day 323. Choose varieties, and plan next year's beds with the rotation's suggestion;
     - winter sales at the box (kale, leeks, eggs, preserves) and the hens' shorter-days laying dip, with a choice (Explain it);
     - tool care and a winter dig or no-dig mulch (a real choice with real trade-offs for the soil);
     - frost and storm warnings, as round two's warnings.
     - **Target:** the bot's longest quiet stretch at most about 21 game days on seeds 1–3, and the playtest's day 232–323 gap gone. Measure the ceiling first, and report the honest figure if something this brief leaves alone blocks it.
  2. **The year always ends with a card.** On the garden's first anniversary, a "Your first year" card:
     - shows what was picked, eaten, sold, given and wasted, the £ the garden saved at the shop, and what was bought;
     - names which of the offer's requirements is short, by how much, and the one or two things most likely to close the gap (from the bot's tips).
     - When the offer's requirements are met, the existing card fires as now.
     - Year two carries on with the goal bar pointing at the short requirement.
  3. **Money as a stream of choices.**
     - **Mid-priced buys at £8–30,** each a real trade: a hoe or a better fork (time), cloches (a few weeks' season), a propagator, a wormery, a bird feeder or bee hotel if the pests model can use it, netting, and fruit bushes one by one.
     - **Big buys staged** so one is always in sight.
     - **A purse line:** the week's in and out, and what the last big drop was.
     - **Target:** an engaged player buys something every week or two all year (report each purchase's day for the bot on seeds 1–3), and the purse never sits unspent for months.
  4. **The goal bar points at the lever that closes the gap.** When the short requirement is best closed by a shed buy or a winter job, the bar says so, and one tap opens that card or the Shed at that item. No verb without a button behind it.
  5. **Small things:**
     - The glut card gets its "Sell at the box" button, or the text loses it.
     - The "New: …" notice goes once dismissed. Confirm with a check, not only by eye.
     - "Saved at the shop" counts over the year in the Kitchen and the year card.
     - On a phone, digging a bed is reachable in one or two taps from the goal bar.
  6. **Round two's leftovers,** if time allows, from its PR's handed-on list.
- **Tips proved by a player who follows them** (round two's tips player): the goal-bar-only bot must still reach the offer on seeds 1–3, and now also through a winter that asks things of it.
- **The bot.**
  - **Its policies:** answer the new autumn and winter cards, buy the mid-priced kit when it pays, and plant bare-root fruit.
  - **The run:** seeds 1 to 3 against `main`, a full year and into the second.
  - **In the PR:** the purse over the year; each purchase's day; the kg eaten, sold, given and wasted; the longest quiet stretch and where it falls; and the offer's day.
  - **Balance:** this brief approves the milestones moving. The baselines are reset later.
- **Play it yourself before opening the PR.**
  - **What:** screenshots at days 2, 30, 120, 200, 240, 270, 300, 330 and 366, at 1440 × 900 and 390 × 844. Weight them to October to February.
  - **In the PR:** "is the winter a game now", with what's still flat.
  - The coordinator runs a fourth playtest after merge.
- **It may touch:**
  - **the sim:** `src/sim/` (commands, systems, state, save, the cards, goal, kitchen, shed, fruit and livestock wiring);
  - **the data:** `src/data/` (shed, unfold, explain, crops, fruit, livestock, agency's catalogue);
  - **the UI:** `src/ui/` and `tokens.css`;
  - **the bot:** `tools/bot*`;
  - **checks:** those this breaks on purpose, plus new ones for each new card's end state (round two's lesson: a Vitest test per card that answers it and asserts it's gone), the year card on day 365, and the notice that must not return;
  - **docs:** for what changes (`docs/systems/`, `docs/SYSTEMS.md`), `docs/roadmap.d/`, `docs/briefs/playable-garden-3.md` (this brief, saved as is), `src/updates.d/` and `docs/lessons/`.
- **Don't start:** advisers and "let them decide", the step-up to the allotment and the sealing (part 7), or the baselines' reset.

## Read first

- The project notes, then `node tools/graph.mjs src/sim/goal.ts`, `node tools/graph.mjs src/data/shed.ts` and `node tools/graph.mjs src/ui/YearCard.tsx`, and only the files those list.
- `docs/briefs/playable-garden-2.md` and its look back `docs/lessons/58-playable-garden-2.md`: winter being structurally quiet, cards as loops, and budgeting `dist/` early.
- `docs/systems/shed.md`, `docs/systems/fruit.md`, `docs/systems/livestock.md` and `docs/systems/unfolding.md`.
- The `feature`, `steward` and `balance` playbooks.

## How it fits and grows

Its rows in the systems web (`docs/specs/overgrow/systems-web.md`):
- "Crops" at level 1 (bare-root fruit, as `src/sim/models/fruit.ts`);
- "Markets, prices and demand" at level 1 (the mid-priced kit, winter sales at the box and the purse line);
- "Waste and circularity" at level 1 (the autumn clear-up and leaf mould);
- "Soil" at level 1 (dig or no-dig);
- "Labour" at level 1 (winter's shorter days).

1. **Born where.** The garden (level 1). Conserved: £ from the purse to the shed and nursery; kg of spent crop and leaves to the heap and leaf mould; m² of lawn or bed to fruit.
2. **Across the ladder.** A sealed garden carries its fruit and kit in Health. The allotment's winter is the same season with neighbours, and its seed swaps. Dig or no-dig returns at the fields as tillage (part 11).
3. **Loops.** Waste (spent crops and leaves back to soil) and intensification (dig against mulch). Fast effect: this week's purse and cards. Slow effect: fruit's years and the soil's carbon.
4. **People.** The gardener does each job within their hours, and winter has fewer daylight hours. The player decides.
5. **The lever.** The autumn and winter cards, bare-root planting, the mid-priced kit, and the year card's pointer. "Let them decide" is the advisers' part, later.
6. **The map.** Leaves raked to a heap, bare-root fruit going in, cloches over a bed, and frost on the kit. Impact first. Reduced motion shows stills.
7. **Explain.** Each mechanism and its source: RHS for bare-root planting, leaf mould and cloches; dig or no-dig from its sources (for example Charles Dowding's trials, and RHS); the hens' laying and daylight from `livestock.ts`'s sources.
8. **Economy and balance.**
   - A purchase every week or two.
   - The longest quiet stretch at most about 21 days.
   - The year card on day 365 every game.
   - The goal-bar-only bot still reaches the offer.
9. **Carbon and land.** Leaf mould and mulch add to the soil's carbon, and digging releases some. Fruit bushes and trees hold carbon in wood, if the fruit model has a source. Bed or lawn to fruit shows in the land account.
10. **Polish.** 320 px portrait and landscape up to large screens. One card or notice at a time. Concise UK English. Hidden until worth having.
11. **The lesson.** A garden's year doesn't stop in winter: it's when you plan, plant fruit and feed the soil for next year, and it's the cheapest time to do it.
12. **Unfolding.** Each winter card and bare-root offer comes with its season, and the mid-priced kit when it first helps. The year card comes on day 365.

## Speed budget

Keep this part's additions within 0.08 ms a garden day headless, 0.2 ms of the garden's 1440 × 900 frame, 0.15 ms of a throttled phone frame, 0.05 ms of a tick's copy and 12 KB of `dist/` gzipped. Check `dist/` as you go, not at the end. Measure over the busiest stretch (summer) as well as the year, against a build of `main` in alternation, three runs each, and add your line to `docs/SYSTEMS.md`, "Speed budget". CI's garden-day test must stay green on `main` after merge: aim for local figures that leave it at least 0.15 ms under.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

- **When:** the session merges its own PR per the `steward` playbook. Squash and merge by hand once Checks and the Description check are green on the latest head, the look back is committed, and the Balance table and your playthrough review are in the PR.
- **Before the last CI round:** merge `main` once.
- **After merging:** confirm the Pages run publishes. If `main`'s check goes red, fix it before stopping.
- **Waiting:** once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged and published, the session stops.

## What's left for others

- Advisers, recommendations and "let them decide".
- The step-up card's queue.
- The baselines reset for a full garden year.
- The strategy tests.
- Balance #21 to #24.
- Part 7: the step-up to the allotment and the sealing.
- The owner has said the coordinator chooses (decision 15). Put any question in the PR for the coordinator, not the owner.

## When to stop and ask

- Only for something irreversible or outside this brief.
- Otherwise, if it truly needs a decision, open an issue labelled `needs-owner` with the options and the default, carry on with the default, and name it in the PR. The coordinator answers it (decision 15).
- Where it's merely unclear, take the safer option and say so in the PR.
- A pass mark out of reach for a reason this brief leaves alone: measure its ceiling, take the nearest honest mark, and say so.

## Cost budget

- **Estimate:** about $30. It covers the autumn and winter cards, bare-root fruit, the year card, the mid-priced kit and the purse line, the goal bar's pointer, the bot's new policies, a playthrough and two CI rounds. The owner's first priority justifies the size. The session's model at high effort. No workflows.
- **Stopping points:** at each one, read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning`.
- **Keep context down:** don't end a turn after planning: build straight on. Open the PR once items 1 and 2 work, then add the rest in pushes. Merge `main` once. Don't end a turn except with a PR open and subscribed, or on a real blocker.
- **Other sessions:** don't start any (`create_session`); only the coordinator starts sessions.
- **Past twice the estimate:** say why in the PR and in its lesson, and trim from item 6 upwards.
