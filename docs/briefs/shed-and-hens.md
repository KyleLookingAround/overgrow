# Brief: part 6c, the shed and the hens

The owner split part 6 into 6a (unfolding and the first minute, #45), 6b (the household) and 6c. The coordinator splits 6c again, because together it would run to about $40 where a part should cost $15–25 (part 5 overran on a brief that held too much). This brief is **6c, the shed and the hens**: the garden's upgrades, the first feeding choice and the hens. **6d, the advisers and the garden's year** comes after it: advisers, recommendations and "let them decide", the step-up card's queue, the bot's quiet-stretch measure, the baselines reset for a full garden year, the strategy tests, and closing #21 to #24. It is the garden's last part before the ladder.

## Goal and what it may touch

- **Deliver** one PR on `feature/shed-and-hens` from `main` once 6b has merged. Start from a GitHub issue (the Feature template). The founding spec's garden section already approves what's below ("Upgrades", the hen house, #29's answers), so this brief approves it in advance (the `feature` playbook, step 2).
- **The shed** (the spec's garden section, "Upgrades"; the systems web's "Technology and upgrades" row at level 1):
  - **Buying works.** A `buy` command pays from the purse and adds the upgrade to the saved `upgrades` list. The beer trap that 6a shows (`src/data/shed.ts`, `FIRST_OFFER`) becomes buyable.
  - **The catalogue.** It sits in `src/data/shed.ts`, each item with a price, its time saved and side effects (shown before buying), and a source:
    - tools that buy time: a hose, then drip lines; the beer trap, then nematodes; a wheelbarrow; a shed light for evenings;
    - things that buy yield: more beds (the other four of the six, dug one at a time), a bigger butt, a compost bin, a cold frame, netting and the hen house.
  - Each upgrade works through a real mechanism in the sim, not a bonus:
    - the hose shortens watering's job time;
    - drip lines water at the root, using less water and taking less time;
    - nematodes are *Phasmarhabditis*, which work in warm, moist soil only;
    - the cold frame gives frost protection and earlier sowing;
    - netting keeps birds and cabbage whites off;
    - the compost bin makes compost faster and loses less nitrogen;
    - the bigger butt holds more rain;
    - the light gives evening hours in winter.
  - **Hidden until worth having** (the owner's decision 9): each item unfolds, with its own `unfold.ts` key, when the thing it answers first happens. Slugs cost time, so the beer trap and then nematodes. A dry week has the gardener carrying cans, so the hose. The first frost, so the cold frame (6a left this lever to 6c). The first bird or caterpillar damage, so netting. The heap is full, so the bin. The last dug bed is in use for a season, so more beds. Never greyed; one pulse a batch.
- **The first feeding choice.** #48 left it here (`docs/lessons/48-garden-nutrients.md`): a bed of radish after radish loses about 35 kg P a hectare a year, whatever the heap returns.
  - Offer a bought feed when a bed's P or K first falls below a threshold. That is 6a's `garden.soil` moment, if it isn't already unfolded. The feed is RB209's offtake-replacement idea at garden scale: blood, fish and bone, or a general fertiliser, and a plan line to use it.
  - Give it its carbon (the fertiliser's manufacture, from a source) so it trades against compost.
  - **Peat against peat-free compost** is the second carbon choice (`dig` is the first, as 6a set). Bought potting compost for sowing, with peat's carbon released from the bog (a source such as the IUCN UK Peatland Programme), shows on the dial.
- **The hens** (`src/sim/models/livestock.ts`, `docs/systems/livestock.md`, "Wiring"):
  - The hen house is an upgrade; three hens are a `herd` on their own node. Wire it as the Wiring note says: `livestock` in `systems.ts` after `weather` and `carbon` and before the kitchen, and the edges to the heap and the air.
  - The gardener feeds, waters and collects, and the hours come from `hoursNeeded`.
  - Eggs go to the kitchen, where they count against the basket's dairy and eggs if 6b's basket has that group, and to the honesty box.
  - Droppings go to the heap. **They carry their P and K**: #48 left the hens' manure without them.
  - Illness is an event on the map. Welfare and the light's lay rate show.
- **The bot.** Give it a buying policy: the next upgrade worth its price, as the spec's bot does (its three-times rule or better), the feed when P or K runs low, and the hen house when it can afford it. Run it on seeds 1 to 3 against `main`. The first upgrade should land by about day 20 (the spec's target). Say what moved and why; the baselines' reset is 6d's.
- **Strategic and long** (decision 12): each upgrade is a trade-off over a different horizon, with no single dominant buy.
  - Nematodes cost more than the trap and work only in warmth.
  - The fertiliser feeds this year, where compost builds the soil.
  - Peat is cheap and costs carbon.
  - The hens cost hours every day for eggs and manure.
  - Report in the PR any buy the bot finds that beats every other on every seed.
- **It may touch:** the sim (`src/sim/`: `commands.ts`, `systems.ts`, `state.ts`, `save.ts`, the gardener's jobs, the kitchen, pests' and soil's hooks for what an upgrade changes, and `livestock.ts` where wiring needs a change); `src/data/` (`shed.ts`, `unfold.ts`, `explain.ts`, `garden.ts`, `jobs.ts`, `livestock.ts`, and the feed's and peat's figures); the UI (the Shed tab, panels, the map's drawing of each new thing, the hens); `tokens.css`; the bot (`tools/bot*`); checks this breaks on purpose, and a `shed` check (buying, hidden until worth having, refused before it unfolds); the docs for what changes (`docs/systems/`, `docs/SYSTEMS.md`); `docs/roadmap.d/`; `docs/briefs/shed-and-hens.md` (this brief, saved as is); `src/updates.d/` and `docs/lessons/`.
- **Don't start** advisers, recommendations, "let them decide", the step-up queue, the bot's quiet-stretch measure or the baselines (6d); the household's own levers (6b's).

## Read first

- The project notes, then `node tools/graph.mjs src/data/shed.ts`, `node tools/graph.mjs src/sim/models/livestock.ts` and `node tools/graph.mjs src/data/unfold.ts`, and only the files those list.
- The founding spec's garden section ("Upgrades", the first minute's beer trap); the systems web (`docs/specs/overgrow/systems-web.md`): "Technology and upgrades" and "Livestock" at level 1.
- `docs/systems/livestock.md` ("Wiring"), `docs/systems/unfolding.md`, `docs/systems/soil.md` (nutrients) and `docs/systems/carbon.md` (the heap).
- 6b's look back and its brief (`docs/briefs/household-wiring.md`) for the purse and the basket; `docs/lessons/48-garden-nutrients.md`; `docs/lessons/45-unfolding-first-minute.md` (browser checks: tick in one jump of more than four steps, then wait for the element; try a new check once with the CPU throttled 6×).
- The `feature`, `steward` and `balance` playbooks.

## How it fits and grows

Its rows in the systems web (`docs/specs/overgrow/systems-web.md`): "Technology and upgrades" at level 1 (the shed), "Livestock" at level 1 (the hen house), and the soil's first feeding choice under the intensification loop.
1. **Born where.** The garden (level 1).
   - **The shed:** upgrades held on the garden node, bought with £ from the purse.
   - **The hens:** a herd node with feed (kg), water (L), eggs (kg), droppings (kg, with their N, P and K) and methane and N₂O (kg CO₂e), all conserved.
   - **The feed:** kg of N, P and K bought in from a `shop` boundary, with its manufacturing carbon.
2. **Across the ladder.**
   - A sealed garden carries its kit in Health and its eggs in Output by product group (Q2).
   - One level up: the allotment's tools and a shared tool store.
   - Two up: the smallholding's tractor and polytunnel, the flock and pigs (part 12), and fertiliser at field scale (`rotation.ts`'s `maintain`).
   - It returns as the farm's precision kit and, at the nation, as fertiliser and peat policy (the peat sales ban).
3. **Loops.**
   - **Intensification:** feed now against soil over years. The fast effect is this year's crop; the slow effect is the soil and the carbon.
   - **Waste:** droppings to the heap, and the bin.
   - **Energy:** the feed's manufacture.
   - **Diet:** the eggs.
4. **People.** The gardener uses each tool, and it changes their jobs' hours. They feed and water the hens and collect the eggs, within their hours after 6b's job. The player buys; the gardener acts.
5. **The lever.** An upgrade bought in the shed; a feeding line in the plan; the hen house. "Let them decide" for buying is 6d's.
6. **The map.** Each tool is drawn in use: the hose's line, the drip lines, the trap in the bed, the frame's glass, the netting, the barrow carried, the light at dusk. The hens scratch in their run. Eggs are carried to the kitchen and droppings to the heap. A new bed is dug. Impact first. Reduced motion shows each in place, still.
7. **Explain.** Each upgrade's mechanism and source (RHS for the trap, nematodes, netting and the cold frame; WRAP for the bin; RB209 for feeding; the IUCN UK Peatland Programme for peat; `livestock.ts`'s sources for the hens).
8. **Economy and balance.** Money moves from the purse to the shed and eggs to the kitchen and box. It shifts hours per job and yield per bed. The bot's first upgrade lands by about day 20 and the kitchen's met share rises.
9. **Carbon and land.**
   - Peat's released carbon and the feed's manufacture go on the dial.
   - The hens' methane and manure N₂O go on the dial.
   - The hen run's area goes in the land account.
   - More beds move lawn to bed, with the soil carbon of digging.
10. **Polish.** The Shed tab at 320 px portrait and landscape up to large screens. Each item's card shows its price, the time saved and the side effects in concise UK English. Hidden until worth having.
11. **The lesson.** Every tool is a trade: money for time, yield for carbon, this year against the soil's years. Hens turn scraps into eggs and manure but cost time every day. Peat compost digs up a carbon store thousands of years old.
12. **Unfolding.** Each item appears with its own key, `shed.<item>` in `src/data/unfold.ts`, when the thing it answers first happens (listed above), with one pulse a batch and a short Explain. The feed and its plan line arrive with the first low P or K. The hens' numbers arrive with the hen house.

## Speed budget

This part's share of the parts' reserve (`docs/SYSTEMS.md`, "Speed budget"; parts 5, 6a and the nutrients fix used about 0.19 ms of its 1.0 ms a garden day, and 6b has 0.05):
- 0.1 ms a garden day headless;
- 0.2 ms of the garden's 1440 × 900 frame;
- 0.15 ms of a throttled phone frame;
- 0.05 ms of a tick's copy;
- 15 KB of `dist/` gzipped.

Measure against a build of `main` in alternation, three runs each, and add your line to the section. Prefer moving a stock once at an event over a flow every day (#48's lesson).

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook. Squash and merge by hand once Checks and the Description check are green on the latest head, the look back is committed and the Balance run's table is in the PR; then confirm the Pages publish. Merge `main` once, just before the last CI round. Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged, the session stops.

## What's left for others

- **6d, the advisers and the garden's year** (after this):
  - advisers, recommendations and "let them decide" (W6, W25, W28's simple form, W29);
  - the step-up card's queue (W4);
  - the bot's longest-quiet-stretch measure;
  - `tools/baseline.json` reset for a full garden year;
  - the spec's strategy tests;
  - closing #21 to #24.
- Part 7 (the step up to the allotment) wires the sealing maths after 6d.
- The owner has said the coordinator's recommendations stand for later choices.

## When to stop and ask

- Only for something irreversible or outside this brief: repo settings, a change to the founding spec's model or carry-over rule, a new runtime dependency, or widening the slice.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question, the options and the default, carry on with the default, and say so in the PR.
- Where it's merely unclear, take the safer option (easier to undo, or changing the game less) and say so in the PR.
- If a check's pass mark in this brief proves out of reach for a reason the brief leaves alone, measure its ceiling, take the nearest honest mark, and say so in the PR rather than waiting (#48's lesson).

## Cost budget

- Estimate: about $25. That covers a catalogue of about twelve upgrades with their mechanisms, a feeding choice, a herd to wire, the Shed tab and map drawing at every size, the bot's buying, and two CI rounds. Model `claude-opus-5-5` at high effort. No workflows.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- Keep context down: open the PR as soon as the core works (buying, three upgrades, the hens), then add the rest in pushes. Merge `main` once.
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions.
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim what's left (the shed light, the wheelbarrow and the bigger butt first).
