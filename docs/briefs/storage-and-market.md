# Brief: models ahead: storage, spoilage and the first market (for part 14)

The founding spec (`docs/specs/overgrow.md`) splits the first slice into fifteen parts. Parts 1 to 4 have merged, with four models ahead of their parts: the sealing maths (#20), labour, machinery and energy (#26), the household economy (#32) and livestock (#25, finishing). Part 5 (pests, wildlife and Explain) is building now. This session writes, ahead of part 14 (the first market and the road), the pure models of storage and spoilage and of the smallholding's first market beyond the gate: the box scheme and the farm shop. Part 14 then only has to wire them to the smallholding, the road and the map.

## Goal and what it may touch

- **Deliver** two pure, tested models: `src/sim/models/storage.ts` (shelf life, spoilage and losses by stage, the cold store's energy) and `src/sim/models/market.ts` (the box scheme and the farm shop: demand, price, contracts and what goes unsold), with their data in `src/data/storage.ts` and `src/data/market.ts`, and their notes in `docs/systems/storage.md` and `docs/systems/market.md`. Branch `feature/storage-and-market` from `main`, one PR. Start from a GitHub issue (the Feature template) and link it from the PR; no spec file, since the founding spec's rows named below are approved and this brief approves them in advance for this work (the `feature` playbook, step 2).
- **The founding spec's rows it builds:** the systems map's "Storage and spoilage" (shelf life by product and temperature; losses at field, store, road, shelf and home; the cold chain's energy; WRAP, Q10 spoilage kinetics, FAO food loss figures) and "Markets, prices and demand" as far as the smallholding needs it (households with a diet mix by income and price; retail standards; seasonal demand; imports as the substitute; price and income elasticities, DEFRA Family Food); the smallholding's "a box scheme or farm shop as the first market beyond the gate with spoilage on the way"; and roadmap part 14.
- **The owner's decisions it builds** (29 Sep 2026, all in force):
  - **Role reversal.** The household that buys from the shop at the garden becomes, at the smallholding, the farm that sells to households: the box scheme's customers are households from `src/sim/models/household.ts` (#32), their demand its baskets by income decile. Use that model's functions for demand; don't write a second demand model. Later the player runs the market (level 5), then is the buyer, then sets the rules; say in the note what these models carry up to each.
  - **Strategic and long, never boring.** Every lever here is a trade-off with no single best option, paying off over different horizons: pick now and sell fresh, or store and sell later at a better price and lose some; a cold store that cuts spoilage but costs energy and carbon; a box scheme's steady contracted price and a promise to fill every box (a shortfall costs goodwill, a slow stock), against the farm shop's higher price and uncertain footfall; cosmetic grading that raises price and wastes the ugly share. The tests show each trade-off both ways (neither option wins at every setting).
  - **Don't overwhelm the player.** The models run whether or not the player sees their numbers; say in the note which instruments part 14 should unfold and when (proposed keys for `src/data/unfold.ts`, not added).
  - **Saves.** No save compatibility before the first release: shape the state as it's best, and say in the notes what part 14 adds to the saved state.
- **Ahead of its part, in new files only** (the models-ahead track). It never edits `src/sim/systems.ts`, `state.ts`, `graph.ts`, `commands.ts`, `save.ts`, `gardener.ts`, an existing model or dataset (`kitchen.ts`, `household.ts`, `energy.ts` and `livestock.ts` included), anything under `src/ui/`, `src/app/` or `tools/`, the founding spec or the project notes: part 5 is editing the shared files now. Import from the merged models where they fit (household demand, energy prices and carbon, the kitchen's shelf lives as the home stage's starting point); if a model needs a change, say it in the note for the wiring part. If it needs a unit, stock key or boundary the graph doesn't have, define it in its own file and say what part 14 must add to `graph.ts`.
- **Shaped for wiring.** Read how the existing models are built (`src/sim/models/kitchen.ts`, `household.ts`, `energy.ts` and their tests, `src/sim/clock.ts` for `System` and `TickContext`) and write these the same way: pure functions over the graph's typed quantities (`Qty` and its units) that return the flows to move and the state to keep, no DOM, no `Math.random()` (draw from a passed `Rng` where chance matters, such as the farm shop's footfall), no global state; and an exported `System` for each (not listed in `systems.ts`) that part 14 adds with one line.
- **Real mechanisms, rough numbers** (`docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`): each model file starts with a one-line comment on what's in it, then `// Sources:` and `// Simplifies:`, and says its fast effect and its slow effect; a plausibility test beside each asserts the direction and rough size of each effect against its sources. Data carries its licence beside it and names no real place, shop or brand (invented places everywhere).
- **What it builds, concretely:**
  - **Spoilage.** Quality and saleable kg over time by product (the garden's crops, eggs, and the livestock model's products), from a shelf life at a reference temperature and a Q10 (spoilage rate multiplying by about 2 to 3 for each 10 °C warmer). Temperature by where the produce is: the field, an ambient shed, a cold store, the van, the shop shelf, the customer's home. The kitchen's `KEEP_DAYS` should fall out for the home stage within about 20 %; say how part 14 swaps it in.
  - **Losses by stage.** Kg lost at field (unharvested, graded out), store, road, shelf and home, with WRAP's and FAO's rough shares as the test's target for a typical chain, so the Explain card can say where food is wasted and that households waste the most by weight in the UK.
  - **The cold store.** Energy per day by size and outside temperature (kWh, priced and counted for carbon through `energy.ts`), and its effect on shelf life.
  - **The van's round.** A day's delivery as kg carried, time on the road and temperature, feeding spoilage; the round's distance and fuel through `machinery.ts` or `energy.ts` if they carry a vehicle, else as a number the note says part 14 wires.
  - **The box scheme.** Subscribers are households (from `household.ts`) who take a box a week at a set price; each box has a promised mix; a short box costs goodwill, and goodwill sets how many stay next month (churn) and how many join. Imports fill a short box at a cost (the substitute).
  - **The farm shop.** Footfall by season and weekday, drawn from the `Rng`; what they buy follows households' baskets and a price elasticity; unsold stock keeps spoiling; the shop's price is a lever.
  - **Grading.** A cosmetic standard (loose or strict) raises the price per kg and sends the graded-out share to waste, compost or feed.
  - **Tests** (`storage.test.ts`, `market.test.ts`): salad lasting days and potatoes weeks at ambient, both far longer cold; spoilage doubling-ish per 10 °C; a typical chain's losses by stage in WRAP's order; the cold store paying for itself for salad in summer and not for potatoes in winter; the box scheme's revenue steadier than the farm shop's (lower coefficient of variation) but lower per kg; short boxes cutting subscribers over months; strict grading raising price and waste together; N subscriber households' demand matching `household.ts` for the same N.
- **Its notes** (`docs/systems/storage.md` and `docs/systems/market.md`, naming every file in their first paragraphs): how each works, and a **Wiring** section for part 14: the stocks (in store, in the van, on the shelf), flows (sold, spoiled, graded out), boundaries (customers, imports, the grid), levers (the box price, the shop price, the grading standard, the cold store on or off, the round's day), the systems' places in `systems.ts`, what the map draws (the van on the road, boxes on doorsteps, spoiled produce to the heap), what the Explain cards say, and the bot milestones it will shift. Say also how level 5 (the market town) reuses them at scale: many farms' stores, routes and shops.
- **How it fits and grows** (answer each briefly in the notes, for what these models add):
  1. **Born where.** Hands-on at the smallholding (a store node, the van, the shop, the box scheme's customers), moving kg of produce, £, kWh and kg CO₂e, conserved (every kg picked is sold, eaten, spoiled or composted).
  2. **Across the ladder.** What a sealed smallholding carries up (its Freshness, its losses, its market share); how it shows at the market town (one of many suppliers) and at the region; the role reversal (buyer at the garden, seller at the smallholding, the market at level 5).
  3. **Loops.** The waste loop (cosmetic standards and cheap food → waste → methane and lost land) and the energy loop (the cold store's power price); the fast effect and the slow effect of each.
  4. **People.** Who packs the boxes, drives the round and serves in the shop, their hours (through `labour.ts`), and what the player delegates.
  5. **The lever.** Prices, grading, the cold store, the round, the box's promise; "let them decide".
  6. **The map.** The van, the boxes, the shop's queue, spoilage shown as produce dulling and going to the heap; what reduced motion shows.
  7. **Explain.** The mechanism and source for each effect (Q10 spoilage, where food is wasted, the cold chain's energy, why a box scheme is steadier).
  8. **Economy and balance.** The £, hours and kg they move, and which bot milestones wiring them shifts at the smallholding.
  9. **Carbon and land.** The cold store's energy, the round's fuel, the methane of waste, and the land behind wasted food.
  10. **Polish.** What the panels will need at 320 px to large screens, in concise UK English.
  11. **The lesson.** Most food waste by weight is at home and on the farm, not in shops; cold storage trades energy for less waste; a steady buyer is worth a lower price.
  12. **Unfolding.** What the player sees of each and when (the shelf-life clock with the first stored harvest, the box scheme's goodwill with the first short box), as proposed `unfold.ts` keys.
- **It may touch:** `src/sim/models/storage.ts`, `storage.test.ts`, `market.ts`, `market.test.ts`, `src/data/storage.ts`, `src/data/market.ts`, `docs/systems/storage.md`, `docs/systems/market.md`, `docs/roadmap.d/` (its own item), `docs/briefs/storage-and-market.md` (this brief, saved as is) and `docs/lessons/` (its look back). Nothing else.

## Read first

- The project notes, then `node tools/graph.mjs src/sim/models/kitchen.ts`, `node tools/graph.mjs src/sim/models/household.ts` and `node tools/graph.mjs src/sim/clock.ts`, and only the files those list.
- `docs/systems/kitchen.md`, `docs/systems/household.md`, `docs/systems/energy.md` and `docs/systems/machinery.md`.
- The founding spec's systems map rows for Storage and spoilage, and Markets, prices and demand; the ladder's rows for the smallholding and the market town; "The smallholding's first year"; not end to end.
- `docs/briefs/household-model.md`, the shape of a models-ahead brief this one follows.
- The `feature`, `steward` and `balance` playbooks (the last for "strategic and long").

## Speed budget

None shipped: nothing reaches `dist/` until part 14 wires it. Measure what a day's call costs headless in Node for one smallholding (a store, a van, a shop and a 40-box scheme) and say it in the notes, so part 14 can hold it inside its share of the parts-5-to-14 reserve (`docs/SYSTEMS.md`, "Speed budget").

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook: Squash and merge by hand once Checks and the Description check are green on the latest head and the look back is committed in the PR (until the owner adds the ruleset and auto-merge); the Pages run publishes nothing new, since nothing is wired. The Catch up workflow merges `main` in as other parts land; new files only means it should never conflict. Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged, the session stops.

## What's left for others

- Part 14 wires these; the market town (level 5) scales them later. Neighbours, agency and trust (the committee) and rotation over years are later models-ahead sessions; don't start them.
- Part 5 and the livestock session are editing or adding their own files; never touch another session's files or branch.
- The owner has said the coordinator's recommendations stand for later choices.

## When to stop and ask

- Only for something irreversible or outside this brief: repo settings, a change to the founding spec's model or carry-over rule, a new runtime dependency, or widening the slice.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question, the options and the default, carry on with the default, and say so in the PR; the owner has said the recommended option stands unless they answer.
- Where it's merely unclear, take the safer option (a plainer model with its simplification named, easier to extend later) and say so in the PR.

## Cost budget

- Estimate: about $10 (two models with their data, sourced numbers and plausibility tests, one or two CI rounds). Model `claude-sonnet-5-5`, the cheaper model (the models-ahead track). No workflows.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions.
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim what's left (the van's round can move to part 14's wiring).
