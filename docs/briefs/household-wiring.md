# Brief: part 6b, the household

The founding spec (`docs/specs/overgrow.md`) splits the first slice into fifteen parts; the owner split part 6 into three PRs, in order: 6a unfolding and the first minute (merged), **6b the household** (this one), and 6c the shed, the hens and the advisers. This part wires the household economy model (#32, `src/sim/models/household.ts`) into the garden: the gardener has a job, the household buys what the garden doesn't grow, and the garden's worth becomes groceries saved as well as sales.

## Goal and what it may touch

- **Deliver** one PR on `feature/household` from `main`. Start from a GitHub issue (the Feature template); the owner's decisions and #29's answers below are approved, so this brief approves them in advance (the `feature` playbook, step 2).
- **The owner's decisions it builds** (6 and 7 in `docs/briefs/coordinator-first-slice-2.md`, and #29's Q1, Q4 and Q8, now in the founding spec):
  - **The job.** The gardener's job takes weekdays and is why the garden gets about four hours a day (more at weekends). The gardener is drawn leaving through the gate and coming home. The wage is the household's main income.
  - **Groceries.** A weekly shop buys what the garden doesn't meet, at DEFRA Family Food prices, and its food lands in the kitchen and is eaten. The garden's value becomes groceries saved as well as sales.
  - **Two carbon numbers (Q4).** The dial stays territorial (flows into the air); the shop food's footprint (Poore & Nemecek, per kg: farm, transport, land and water) shows beside it as a consumption figure and is never added to the air. Its Explain corrects the food-miles myth: what you eat matters far more than how far it came.
  - **Members from the start (decision 7).** The household is a list of members from day one (the gardener alone); the partner moves in at part 10, not here.
  - **Q8 (c), (d), (e), if cheap:** packaging on shop food that can't go on the heap; days of food in the kitchen; shop prices moving with the world's. Take each only if it's a few lines and a test; otherwise leave it for later and say so.
  - **Q8 (a):** passers-by at the honesty box take the best first, so Quality sells (the seed of cosmetic standards).
  - **Unfolding (decision 9, and 6a's table in `src/data/unfold.ts`):** every piece unfolds as it first matters, with the keys the model's notes propose (`household.purse`, `household.groceries`, `household.footprint`, `household.commute`), one pulse per batch.
  - **Strategic and long, never boring (decision 12):** the purse must make choices matter (spend on the garden or save; grow what saves most at the shop's prices or what sells best at the box) with no single best option.
- **The wiring**, as the model's own notes set it out (`docs/systems/household.md`, "Wiring", part 6b): the `household` node with its levers and footprint stocks; the boundaries `wages`, `shop` and `rest of life`; one line in `systems.ts` after the kitchen; the gardener's hours from `householdGardenHours` in place of `HOURS` in `src/data/jobs.ts` (so pacing stays where it was); the kitchen's ask from `kitchenAsk(people(household))`; the shop's food eaten by the meal; the commute and the shop's bags drawn from their flows; groceries saved beside the box's sales; saved state raised a version.
- **The bot.** Update its policies for the purse, and run it on seeds 1 to 3 against `main`. This part should leave the first sale and the kitchen's met share about where they were (the hours don't change); say what moved and why.
- **It may touch:** the sim's wiring (`src/sim/`: `systems.ts`, `graph.ts`'s boundaries, `state.ts`, `save.ts`, the gardener, the kitchen, and `household.ts` where wiring needs a change), `src/data/jobs.ts`, `kitchen.ts` and `household.ts`, `src/data/unfold.ts`, `src/data/explain.ts`, the UI's panels, top bar, dial and map drawing (`src/ui/`), `tokens.css`, the bot (`tools/bot*`), checks this breaks on purpose and a new check for the household if one is needed, the docs for what changes (`docs/systems/`, `docs/SYSTEMS.md`, the founding spec's garden section for decisions 6 and 7 if #37 didn't already write them), `docs/roadmap.d/`, `docs/briefs/household-wiring.md` (this brief, saved as is), `src/updates.d/` and `docs/lessons/`. Don't start the shed, the hens or the advisers (6c).

## Read first

- The project notes, then `node tools/graph.mjs src/sim/models/household.ts`, `node tools/graph.mjs src/sim/models/kitchen.ts` and `node tools/graph.mjs src/data/unfold.ts`, and only the files those list.
- `docs/systems/household.md` (its Wiring and "How it fits and grows" sections), `docs/systems/kitchen.md` and `docs/systems/gardener.md`.
- The founding spec's garden section and its carbon row (Q4, written in by #37); the systems web's (`docs/specs/overgrow/systems-web.md`) household traced up the ladder and its seeds (Q8).
- 6a's look back in `docs/lessons/` and its brief (`docs/briefs/unfolding-first-minute.md`) for how the unfold table and the pulse work now.
- The `feature`, `steward` and `balance` playbooks.

## How it fits and grows

The household's rows in the systems web (`docs/specs/overgrow/systems-web.md`): the household traced from the garden to the planet, and the spine's first reversal (you buy from the shop here; you sell a box scheme to households at level 3).
1. **Born where.** The garden (level 1): a `household` node beside it, moving £ (wages, the shop, the rest of life), kg of food bought, hours, and the footprint's kg CO₂e, m² and L carried in, conserved.
2. **Across the ladder.** A sealed garden carries its demand and hours (Q2); the allotment's neighbours are households (part 8); the box scheme's customers are households (parts 13 and 14); town demand is baskets summed by income decile.
3. **Loops.** The diet loop (the basket, later its mix, Q9) and the agency loop (time traded between job and garden); fast: the week's shop and purse; slow: the diet's footprint.
4. **People.** The gardener, with a job and hours; the partner later (part 10).
5. **The lever.** None new for the player yet beyond what the purse buys; the job's hours are fixed until part-time at the smallholding.
6. **The map.** The gardener leaving through the gate and coming home; shop bags arriving on shop day; impact first. Reduced motion: the gardener appears at the gate, the bags appear.
7. **Explain.** The shop's footprint and the food-miles myth (Poore & Nemecek); the wage and hours (ONS ASHE); prices (DEFRA Family Food).
8. **Economy and balance.** Wages in, the shop and the rest of life out, sales and groceries saved; the bot's first sale and the kitchen's met share should hold.
9. **Carbon and land.** The footprint beside the territorial dial, never added to it (Q4).
10. **Polish.** The purse and the footprint at 320 px portrait and landscape to large screens, concise UK English, hidden until unlocked.
11. **The lesson.** Growing your own saves money and carbon mostly through what it replaces, and food miles are a small share of food's footprint.
12. **Unfolding.** The purse with the first wage or purchase, groceries saved with the first week the garden meets some of the shop, the footprint with the first carbon choice, the commute with the first weekday.

## Speed budget

This part's share of the parts' reserve (`docs/SYSTEMS.md`, "Speed budget"): 0.05 ms a garden day headless, 0.1 ms of the garden's 1440 × 900 frame, 0.1 ms of a throttled phone frame, 0.05 ms of a tick's copy, and 8 KB of `dist/` gzipped. Measure against a build of `main` in alternation, three runs each, and add your line to the section.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook: Squash and merge by hand once Checks and the Description check are green on the latest head, the look back is committed and the Balance run's table is in the PR; then confirm the Pages publish. Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged, the session stops.

## What's left for others

- **6c, the shed, the hens and the advisers** (after this): upgrades, the hens, more beds, advisers, the step-up card's queue, the bot's quiet-stretch measure, the baselines reset for a full garden year, and #21 to #24.
- The partner (part 10), part-time (part 13) and the box scheme (parts 13 and 14) use the same model later. Don't start them.
- The owner has said the coordinator's recommendations stand for later choices.

## When to stop and ask

- Only for something irreversible or outside this brief: repo settings, a change to the founding spec's model or carry-over rule, a new runtime dependency, or widening the slice.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question, the options and the default, carry on with the default, and say so in the PR.
- Where it's merely unclear, take the safer option (easier to undo, or changing the game less) and say so in the PR.

## Cost budget

- Estimate: about $20 (a model to wire through the sim, the kitchen and the gardener, a node and three boundaries, the map's commute and bags, two panels at every size, the bot, two CI rounds). Model `claude-opus-5-5` at high effort. No workflows.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- Keep context down: open the PR as soon as the core works, and merge `main` once, just before the last CI round.
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions.
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim what's left (Q8 (c) to (e) first).
