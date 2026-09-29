# Brief: the playable garden

The owner, 29 Sep: "there's been lots of changes going in, but it doesn't really feel like a game yet. Once everything ongoing is merged in, I want you to make level 1 feel like a somewhat polished game (doesn't need to be perfect yet, just something I can have a go with)."

A playtest of `main` (seed 1, after part 6a and the nutrients fix) found why:
- **Nothing is ever spent.** The shed's beer trap has no price or button; money sits at £25.50 all year.
- **Beds 3 to 6 can't be dug**, so four of the six beds are dead space.
- **The goal bar's target is abstract.** "Reliability 0 of 60" doesn't say what to do.
- **The garden stands dead for months.** Tomatoes stay "ready to pick" from day 80 to 220, and all six beds are empty from day 230 to 360.
- **No moment is celebrated.**
- **Notices cover the phone's map.**
- **The quiet stretches are long.** The longest runs from day 80 to day 230, then day 230 to 360 with nothing changing.

This part makes the garden's year a game: **earn, spend, grow, see the result, reach the goal.** It takes over most of what 6c was to do (the shed's buying, digging beds, the first feeding choice) and the playable half of 6d (the goal made concrete, the level's end). The advisers, the hens, the step-up itself (part 7) and the baselines' reset come after it.

## Goal and what it may touch

- **Deliver** one PR on `feature/playable-garden` from `main`, after part 6b (#53) has merged. Start from a GitHub issue (the Feature template). The founding spec's garden section ("Upgrades", "The first minute", the goal bar and the allotment offer) already approves what's below. So does the owner's request above, so this brief approves it in advance.
- **In priority order.** Each item comes with the playtest's evidence; the screenshots are described in the PR that carries this brief. If it runs long, trim from the bottom.
  1. **Buying works: the core loop.** A `buy` command pays from the household's purse (6b's wage makes it a real budget) and adds the upgrade to the saved `upgrades` list. The Shed tab shows each offer with its price, the time it saves and its side effects before you buy, and a Buy button.
     - At least five upgrades, each through a real mechanism in the sim, not a bonus:
       - the beer trap (`FIRST_OFFER` in `src/data/shed.ts`) catches slugs at no time cost;
       - a hose shortens watering;
       - nematodes (*Phasmarhabditis*) work only in warm, moist soil;
       - a compost bin makes compost faster and loses less nitrogen;
       - a cold frame protects from frost and allows earlier and later sowings;
       - netting keeps off birds and cabbage whites;
       - a bigger water butt holds more rain.
     - Each is hidden until worth having, with its own `unfold.ts` key and a trigger from the sim (6a's table and principle). Never greyed.
     - The first buy should come by about day 20 (the founding spec's target) for a player who looks at the shed.
  2. **Digging beds 3 to 6.**
     - **The command:** `dig` on a grass bed costs hours (the gardener digs, over days if need be), a little money for edging or compost, and the soil carbon that digging releases. `dig` is already the first carbon choice, open from the start.
     - **The trigger:** once the dug beds are all in use, a bed's card offers "Dig this bed".
     - **After digging:** the dug bed joins the plan and the sowing menu.
     - **The point:** it's the garden's growth loop, so more beds mean more food, more sales and more to do.
  3. **The goal made concrete, and the level's end.**
     - **The goal bar names one next action** that would raise the requirement furthest from its target, in plain words: "Dig bed 3 and sow beans", "Sow a winter crop in bed 2", "Buy the beer trap: slugs took 20 % of the salad". Build it from the sim's own numbers (the step-up offer's three requirements, `stepUpStatus()`), not a script.
     - **Reliability must move.** The playtest saw 0 all year; find why, and make it rise when the player does the right things.
     - **The allotment offer is a visible prize:** a short line of what the next level brings.
     - **When the offer's requirements are met,** a card says so. It celebrates the year, with the garden's totals and what was learnt, and says the allotment is coming. Part 7 builds the step-up itself, so this card is the level's end for now. After it, play carries on.
  4. **No dead garden.**
     - **Two apparent bugs to fix first:**
       - tomatoes left "ready to pick" for months with the gardener resting;
       - radishes "sown, not up yet" for about forty days.
     - **Then an idle bed says why** ("Nothing sows until March") and offers what's real: a winter crop (broad beans and garlic in autumn, overwintering onions, winter salads under the cold frame) or a green manure. "In season" should say what it means.
     - **The winter should still have things to decide:** planning next year, buying, digging, the heap.
  5. **Moments.**
     - **The first harvest:** a picked-crop animation into the kitchen and a short toast ("First harvest: 0.6 kg of salad leaves").
     - **The first sale:** the money flashes once.
     - **The first thing bought:** it appears in use on the map.
     - **Once a season:** a small line of how the garden did.
     - Reduced motion shows each as a still.
  6. **Notices that don't bury the map.** One at a time, queued; short (one line, then a tap for more); a dismiss; never covering most of the map at 390 × 844 or 320 px. Keep 6a's one sign a batch.
  7. **The gardener's time.** The Explain card's "What helps" matches the state: idle hours suggest digging or sowing more, and a full day suggests a tool that saves time. Show the unused hours as an invitation, not a fault.
  8. **Choices that show their outcome.** Each plan line shows a one-line consequence where the sim can say it cheaply: the watering line's water used a week, the slug policy's hours and losses, and the rotation against one crop.
  9. **The map in motion, if time allows.** The gardener walks to each job (check what part 3 already draws), a dropped seed, a picked-leaf burst, and the new beds and tools drawn.
  10. **The first feeding choice, if time allows.** A bought feed (blood, fish and bone, or a general fertiliser), offered when a bed's P or K first runs low. Its manufacturing carbon trades against compost (#48's lesson: radish after radish still runs a bed down).
- **The quiet stretch.**
  - **The measure:** add a count to the bot of the longest run of game days with no decision, unlock, purchase, harvest to place or event to answer (`docs/decisions/ADR-2026-09-29-strategic-and-long.md`), and report it per seed.
  - **The target:** no quiet stretch over about 14 game days for a player who buys and digs. First measure the target's ceiling (#48's lesson). If it's out of reach for a reason this brief leaves alone, report the honest figure.
- **The bot.**
  - **Its policies:** buy the next upgrade worth its price, dig a bed when the dug ones are full, and sow a winter crop.
  - **The run:** seeds 1 to 3 against `main`, one full garden year (365 days).
  - **In the PR:** the first buy, the beds dug, the kg eaten and sold, the purse, and the longest quiet stretch.
  - **Balance:** this brief approves moving the milestones. The baselines are reset later, so don't reset `tools/baseline.json`; say what moved.
- **Play it yourself before opening the PR.**
  - **What:** screenshots at days 2, 7, 20, 45, 90, 180 and 365, at 1440 × 900 and 390 × 844, playing as a player would (buying and digging).
  - **In the PR:** a short "does it feel like a game now" review, with what's still flat.
  - The coordinator runs a second playtest before the owner tries it.
- **What 6b left for this part** (#53, `docs/lessons/49-household.md`):
  - `SAVE_VERSION` is 7.
  - The purse now has a weekly wage and a weekly shop, and the household buys what the garden doesn't grow, so groceries saved are a reason to grow more.
  - The garden-day speed test's 2 ms has little headroom: CI once measured 2.13 ms. Measure over the busiest stretch (summer), not only across a year. Weigh a lever (copied by reference) against a new stock, since every stock is copied each hour.
  - A job the planner may build twice must reset what it accumulates at its top.
- **Strategic and long** (the owner's decision 12): each upgrade is a trade-off, with no dominant buy. Report any the bot finds that beats every other on every seed.
- **It may touch:**
  - **the sim** (`src/sim/`: `commands.ts`, `systems.ts`, `state.ts`, `save.ts`, the gardener's jobs, crops, the kitchen, the goal, and pests' and soil's hooks for what an upgrade changes);
  - **the data** (`src/data/`: `shed.ts`, `unfold.ts`, `explain.ts`, `garden.ts`, `jobs.ts`, `crops.ts` for winter crops, the feed's figures);
  - **the UI** (`src/ui/`: the Shed tab, the place cards, the goal bar, notices, the level's-end card, the map's drawing), and `tokens.css`;
  - **the bot** (`tools/bot*`);
  - **checks:** those this breaks on purpose, plus a `shed` check (buying, hidden until worth having, refused before it unfolds) and a `dig` check;
  - **docs:** for what changes (`docs/systems/`, `docs/SYSTEMS.md`, the founding spec's garden lines if one is now wrong), `docs/roadmap.d/`, `docs/briefs/playable-garden.md` (this brief, saved as is), `src/updates.d/` and `docs/lessons/`.
- **Don't start:** the hens, advisers and "let them decide", the step-up to the allotment and the sealing (part 7), or the baselines' reset.

## Read first

- The project notes, then `node tools/graph.mjs src/data/shed.ts`, `node tools/graph.mjs src/sim/goal.ts` and `node tools/graph.mjs src/data/unfold.ts`, and only the files those list.
- The founding spec's garden section and "The first minute"; the systems web (`docs/specs/overgrow/systems-web.md`), "Technology and upgrades" at level 1.
- `docs/systems/unfolding.md`, `docs/systems/household.md`, `docs/systems/gardener.md` and `docs/systems/crops.md`.
- 6b's look back (#53) and `docs/lessons/45-unfolding-first-minute.md`. From 6a's lessons: tick to the moment in one jump of more than four steps, then wait for the element; try each new browser check once with the CPU throttled 6×.
- The `feature`, `steward` and `balance` playbooks.

## How it fits and grows

Its rows in the systems web (`docs/specs/overgrow/systems-web.md`):
- "Technology and upgrades" at level 1 (the shed);
- the land row (digging lawn into beds);
- "Money" at level 1 (the purse spent);
- the step-up offer's goal (the ladder's first seal, whose card part 7 builds).
1. **Born where.** The garden (level 1):
   - upgrades held on the garden node, bought with £ from the household's purse;
   - beds dug from lawn: m² of land moved from grass to bed, and kg CO₂e from the soil carbon digging releases;
   - all of it conserved.
2. **Across the ladder.** A sealed garden carries its kit in Health, its beds in its land, and its year in Output and Reliability. One level up: the plot's tools and a shared store. Two up: the smallholding's tractor and polytunnel. It returns as the farm's kit, and as the nation's land use.
3. **Loops.** Intensification (tools and feed now against soil and carbon over years) and waste (the bin). Fast effect: the next week's crop and hours. Slow effect: the soil and the purse.
4. **People.** The gardener uses each tool and digs each bed, within their hours after the job. The player buys and decides.
5. **The lever.** A purchase in the shed, "Dig this bed", a winter sowing, and the plan lines with their consequences. "Let them decide" is the advisers' part, later.
6. **The map.** Each tool is drawn in use, a new bed is cut from the lawn, and the harvest is carried to the kitchen. Impact first. Reduced motion shows each in place, still.
7. **Explain.** Each upgrade's mechanism and source (RHS for the trap, nematodes, netting, the cold frame and winter sowing; WRAP for the bin; Rothamsted or the carbon notes for digging's carbon).
8. **Economy and balance.** Money moves from the purse to the shed and to digging. Hours move per job, and yield rises with the beds. The bot's first buy lands by about day 20, the kg eaten and sold rise, and the longest quiet stretch falls to about 14 days.
9. **Carbon and land.** Digging's soil carbon goes to the dial, and lawn becomes bed in the land account.
10. **Polish.** 320 px portrait and landscape up to large screens. One notice at a time. Concise UK English. Hidden until worth having.
11. **The lesson.** Every tool is a trade (money for time, yield for soil or carbon), and a garden gives back what's put into it, in every season.
12. **Unfolding.** Each offer has its own key (`shed.<item>`), unfolding when the thing it answers first happens. "Dig this bed" comes when the dug beds are full. Winter crops come with the first empty autumn bed. The level's-end card comes when the offer's requirements are met.

## Speed budget

This part's share of the parts' reserve (`docs/SYSTEMS.md`, "Speed budget"; parts 5 and 6a and the nutrients fix used about 0.19 ms of its 1.0 ms a garden day, and 6b reports its own):
- 0.1 ms a garden day headless;
- 0.2 ms of the garden's 1440 × 900 frame;
- 0.15 ms of a throttled phone frame;
- 0.05 ms of a tick's copy;
- 15 KB of `dist/` gzipped.

Measure against a build of `main` in alternation, three runs each, and add your line to that section. Prefer moving a stock once at an event over a flow every day (#48's lesson).

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook. Squash and merge by hand once Checks and the Description check are green on the latest head, the look back is committed, and the Balance run's table and your playthrough review are in the PR. Then confirm the Pages publish. Merge `main` once, just before the last CI round. Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged, the session stops.

## What's left for others

- **Later in the garden:** the hens, advisers, recommendations and "let them decide" (W6, W25, W28's simple form, W29); the bot's measures folded into `tools/baseline.json` for a full garden year; the strategy tests; #21 to #24 where this part doesn't close them.
- **Part 7:** the step-up to the allotment and the sealing maths.
- The owner will play the result; the coordinator runs a playtest first.
- The owner has said the coordinator's recommendations stand for later choices.

## When to stop and ask

- Only for something irreversible or outside this brief: repo settings, a change to the founding spec's model or carry-over rule, a new runtime dependency, or widening the slice.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question, the options and the default, carry on with the default, and say so in the PR.
- Where it's merely unclear, take the safer option (easier to undo, or changing the game less) and say so in the PR. A pass mark out of reach for a reason this brief leaves alone: measure its ceiling, take the nearest honest mark, and say so.

## Cost budget

- **Estimate:** about $30. The owner's first priority justifies the size: five or more upgrades with their mechanisms, digging, the goal bar's action and the level's-end card, two apparent bugs, notices, moments, the bot's buying and quiet-stretch measure, a playthrough, and two CI rounds. Model `claude-opus-5-5` at high effort. No workflows.
- **Stopping points:** at each one (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- **Keep context down:** open the PR as soon as items 1 to 3 work, then add the rest in pushes. Merge `main` once.
- **Other sessions:** don't start any (`create_session`); only the coordinator starts sessions.
- **Past twice the estimate:** say why in the PR and in its lesson (`docs/lessons/`). Trim from item 10 upwards.
