# Brief: the playable garden, round two

The owner asked for level 1 to feel like a somewhat polished game they can have a go with (the owner's decision 14). Round one (#56) gave it verbs: a shed, digging, winter crops, a goal that names the next step, and moments.

A second playtest of `main` after #56 (seed 1, days 1–372, desktop and phone) found that days 1–30 now feel like a game, but the loop runs out early:
- all four beds were dug and sown by day 5, at £4.50 each;
- every useful upgrade was bought by day 150, with six items at £152 in all against a wage of about £81 a week;
- money piled up to about £4,300, with nothing to spend it on;
- after day 20, play was mostly waiting on "Reliability 21 of 35".

The playtest's verdict: "a good tutorial and a thin game. The money and the goal need to feed each other."

This round makes the whole year a game: things worth saving for, a reason to come back each week, and a garden that never sits idle without the player's say.

## Goal and what it may touch

- **Deliver** one PR on `feature/playable-garden-2` from `main`. Start from a GitHub issue (the Feature template). The owner's decisions 14 and 15 approve this in advance: the coordinator chooses, and says what was chosen.
- **In priority order.** Trim from the bottom if it runs long.
  0. **Speed headroom first.** `main`'s garden-day speed test measured 2.10 ms against its 2 ms limit on #56's last run. Get it under about 1.7 ms on CI's figure before adding anything. #56's look back (`docs/lessons/56-playable-garden.md`) and 6b's (`docs/lessons/49-household.md`) name where the time goes. Never loosen the test.
  1. **An economy with sinks.** The purse only grows. Make money something to save and choose with, through real mechanisms:
     - **The household's spending takes most of the wage**, as it does in life. The rest of life and the weekly shop leave a garden budget of a few pounds a week, plus the box's takings and what the garden saves at the shop. Check 6b's `household.ts` figures against ONS family spending.
     - **Consumables:** seed for each sowing (a packet's price, from a seed catalogue); nematodes as a six-week dose; beer for the traps; compost or manure bought when the heap is short.
     - **Big buys worth saving for,** each a real trade: a greenhouse or polytunnel (season extension, tomatoes under glass); a fruit cage and soft fruit or a fruit tree (slow payback, years); raised beds; a water tank; and the **hen house and three hens**. The hens come from `src/sim/models/livestock.ts` and its Wiring note: a daily chore, eggs to the kitchen, droppings with their N, P and K to the heap.
     - **Target:** a purchase every week or two all year for an engaged player, and no pile of unspendable money. Report the purse over the year in the PR.
  2. **Digging that's a real project.** Lifting turf and digging a bed takes a gardener most of a week's spare hours (RHS), and edging and compost cost tens of pounds, not £4.50. Beds 3 to 6 should come one at a time across spring and summer, each a choice against the shed.
  3. **No idle bed without the player's say.**
     - When a bed empties, a card asks what's next and suggests a crop for the season (the rotation's pick), answered with one tap.
     - One "Sow the empty beds for winter" action.
     - The winter line folds into the same card, not a second select.
     - The raw per-bed dropdowns stay for players who want them.
  4. **A reason to come back each week.** Small real decisions, never nags:
     - **Gluts:** when more is ready than the kitchen needs, choose to preserve, give it to a neighbour, or sell it at the box. This cuts round one's 20–28 kg of waste.
     - **The winter seed catalogue:** plan and order next year's seeds (a real winter job), with a choice of varieties.
     - **A weather warning** (frost, a dry spell) with an action.
     - **Target:** the bot's longest quiet stretch down to about 14 game days on seeds 1–3. Measure the ceiling first; if a reason this brief leaves alone blocks it, report the honest figure.
  5. **A clearer goal.**
     - The bar shows one verb and one progress ring, with the prize as an icon ("A plot at the allotment"), not a line of numbers.
     - Tapping it opens the three requirements with plain words (how well you fed the household, how steady, the soil).
     - The year card counts from the game's start, not the first harvest, so it can land in the first year for a player who does well. The playtest reached day 372 without it.
  6. **Juice.**
     - A purchase pulses on the map where the thing now stands.
     - A sale sends a coin from the box to the purse.
     - The first harvest gets a small burst.
     - Round one's seed-drop and leaf-burst animations go in if cheap.
     - Reduced motion shows stills.
  7. **The first minute's pace.**
     - The first harvest comes about day 8–10, about 3 real minutes at 1×. The owner's head start (#11, overwintered salad leaves) should be ready to pick within the first two or three days.
     - The try-faster nudge comes before the wait, not after.
  8. **Notices.**
     - Dismissed once seen, never shown again on later days.
     - A clear break between the title and the body (the playtest saw "New: a hose in the shedWatering by can…").
  9. **Round one's leftovers,** if time allows: the first feeding choice (a bought feed when P or K runs low, #48's lesson); netting, if birds or cabbage whites are modelled cheaply; whatever #56 couldn't push.
- **Tips proved by a player who follows them** (Final Call's W6, now in the `feature` playbook via #57): the goal bar's and the cards' suggestions are tips. Add a bot policy that does exactly what the goal bar says, and nothing else, for a year. It must reach the allotment offer on seeds 1–3.
- **The bot.**
  - **Its policies:** buy the big items when saved for, dig one bed at a time, answer the glut and catalogue cards, and keep the hens.
  - **The run:** seeds 1 to 3 against `main`, for a full year and into the second.
  - **In the PR:** the purse over the year; each purchase's day; the kg eaten, sold, given and wasted; the longest quiet stretch; and the offer's day.
  - **Balance:** this brief approves the milestones moving. The baselines are reset later.
- **Play it yourself before opening the PR.**
  - **What:** screenshots at days 2, 7, 20, 45, 90, 180, 270 and 365, at 1440 × 900 and 390 × 844, as an engaged player.
  - **In the PR:** "does it feel like a game all year now", with what's still flat.
  - The coordinator runs a third playtest after merge.
- **It may touch:**
  - **the sim:** `src/sim/` (commands, systems, state, save, gardener, crops, kitchen, goal, household where its spending needs it, and `livestock.ts` wiring);
  - **the data:** `src/data/` (shed, unfold, explain, garden, jobs, crops and seed prices, household, livestock);
  - **the UI:** `src/ui/` and `tokens.css`;
  - **the bot:** `tools/bot*`;
  - **checks:** those this breaks on purpose, plus new ones for the cards, the purse's sinks and the hens;
  - **docs:** for what changes (`docs/systems/`, `docs/SYSTEMS.md`, the founding spec's garden lines if one is now wrong), `docs/roadmap.d/`, `docs/briefs/playable-garden-2.md` (this brief, saved as is), `src/updates.d/` and `docs/lessons/`.
- **Don't start:** advisers and "let them decide", the step-up to the allotment and the sealing (part 7), or the baselines' reset.

## Read first

- The project notes, then `node tools/graph.mjs src/data/shed.ts`, `node tools/graph.mjs src/sim/goal.ts`, `node tools/graph.mjs src/sim/models/livestock.ts` and `node tools/graph.mjs src/sim/models/household.ts`, and only the files those list.
- `docs/briefs/playable-garden.md` and `docs/lessons/56-playable-garden.md` (round one); `docs/lessons/57-lessons-from-final-call.md` and the `feature` playbook's new tips lines.
- `docs/systems/shed.md`, `docs/systems/livestock.md` ("Wiring"), `docs/systems/household.md` and `docs/systems/unfolding.md`.
- The `feature`, `steward` and `balance` playbooks.

## How it fits and grows

Its rows in the systems web (`docs/specs/overgrow/systems-web.md`):
- "Technology and upgrades" at level 1, plus "Money" at level 1 (the purse and its sinks);
- "Livestock" at level 1 (the hens);
- the waste row (gluts preserved, given or sold);
- the diet row (eggs).
1. **Born where.** The garden (level 1), with all of these conserved:
   - £ from the purse to the shed, seeds and hens;
   - kg of food to the kitchen, the box, jars or a neighbour;
   - eggs and droppings on a herd node;
   - m² of lawn to beds, run and greenhouse.
2. **Across the ladder.**
   - A sealed garden carries its kit and hens in Health and its gifts in goodwill.
   - At the allotment: swaps and a neighbour's gift are that level's currency.
   - At the smallholding: the flock (part 12).
   - The glut decision returns at the market town as surplus and waste policy.
3. **Loops.** Waste (gluts, the heap, droppings), diet (eggs, preserves), intensification (feed against compost) and agency (a neighbour's goodwill). Fast effect: this week's purse and kitchen. Slow effect: the soil, the fruit's years, savings.
4. **People.** The gardener does each job within their hours, and the hens add a daily chore. A neighbour receives gifts. The player decides.
5. **The lever.** Purchases, the bed card, the glut card, the seed order, and the hens' keeping. "Let them decide" is the advisers' part, later.
6. **The map.** Each purchase is drawn where it works. The hens are in their run. Jars go to the kitchen shelf, and a basket goes over the fence. Impact first. Reduced motion shows stills.
7. **Explain.** Each mechanism and its source: RHS for digging, greenhouses and fruit; ONS family spending and a seed catalogue for prices; WRAP on household food waste for gluts; `livestock.ts`'s sources for the hens.
8. **Economy and balance.**
   - A purchase every week or two all year.
   - No unspendable pile.
   - Waste down on round one's 20–28 kg.
   - The longest quiet stretch about 14 days.
   - The goal-bar-only bot still reaches the offer.
9. **Carbon and land.** The hens' methane and manure N₂O; the greenhouse's embodied carbon if it has a source; lawn to run and beds in the land account.
10. **Polish.** 320 px portrait and landscape up to large screens. One card or notice at a time. Concise UK English. Hidden until worth having.
11. **The lesson.** A garden is a budget of money and hours over years: saving up for a greenhouse or hens pays back slowly, and the real waste is the glut nobody planned for.
12. **Unfolding.** Each big buy unfolds when it's worth having (the greenhouse after the first frost loss or a tomato season; the hens once the heap and kitchen are going). The glut card comes with the first glut, and the catalogue in the first winter.

## Speed budget

Make headroom first (item 0), then keep this part's own additions within 0.1 ms a garden day headless, 0.2 ms of the garden's 1440 × 900 frame, 0.15 ms of a throttled phone frame, 0.05 ms of a tick's copy and 15 KB of `dist/` gzipped. Measure over the busiest stretch (summer) as well as the year, against a build of `main` in alternation, three runs each, and add your line to `docs/SYSTEMS.md`, "Speed budget".

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook. Squash and merge by hand once Checks and the Description check are green on the latest head, the look back is committed, and the Balance table and your playthrough review are in the PR. Then confirm the Pages publish. Merge `main` once, just before the last CI round. Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged, the session stops.

## What's left for others

- Advisers, recommendations and "let them decide"; the baselines reset for a full garden year; the strategy tests; #21 to #24.
- Part 7: the step-up to the allotment and the sealing.
- The owner has said the coordinator chooses (decision 15). Put any question in the PR for the coordinator, not the owner.

## When to stop and ask

- Only for something irreversible or outside this brief.
- Otherwise, if it truly needs a decision, open an issue labelled `needs-owner` with the options and the default, carry on with the default, and name it in the PR. The coordinator answers it (decision 15).
- Where it's merely unclear, take the safer option and say so in the PR.
- A pass mark out of reach for a reason this brief leaves alone: measure its ceiling, take the nearest honest mark, and say so.

## Cost budget

- **Estimate:** about $30. It covers the speed headroom, the economy and its sinks, the hens, three cards, a clearer goal bar, juice, the bot's new policies including the tips player, a playthrough, and two CI rounds. The owner's first priority justifies the size. Model `claude-opus-5-5` at high effort. No workflows.
- **Stopping points:** at each one, read `get_session`: `usage.cost_usd` against the estimate, and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning`.
- **Keep context down:** open the PR once items 0 to 3 work, then add the rest in pushes. Merge `main` once. Don't end a turn except with a PR open and subscribed, or on a real blocker.
- **Other sessions:** don't start any (`create_session`); only the coordinator starts sessions.
- **Past twice the estimate:** say why in the PR and in its lesson, and trim from item 9 upwards.
