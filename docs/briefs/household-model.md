# Brief: models ahead: the household economy (for parts 6b, 8, 10 and 13)

The founding spec (`docs/specs/overgrow.md`) splits the first slice into fifteen parts. Parts 1 to 4 have merged, with the sealing maths (#20) ahead of part 7; part 5 (pests, wildlife and Explain) is building now, and the livestock (#25) and labour, machinery and energy (#26) models are finishing. This session writes, ahead of part 6b (the household), the pure model of the household's economy: who lives in it, their jobs and hours, their wages, the weekly shop, and what shop food carries in carbon, land and water. Part 6b then only has to wire it to the gardener, the kitchen and the map.

## Goal and what it may touch

- **Deliver** the household economy as a pure, tested model in `src/sim/models/household.ts`, with its data in `src/data/household.ts` and its notes in `docs/systems/household.md`. Branch `feature/household-model` from `main`, one PR. Start from a GitHub issue (the Feature template) and link it from the PR; no spec file, since this brief approves the owner's decisions below in advance for this work (the `feature` playbook, step 2).
- **The owner's decisions it builds** (29 Sep 2026, all in force):
  - **The job and groceries.** The gardener has a job and buys groceries. The job takes weekdays and is why the garden gets about four hours a day (more at weekends); the gardener leaves through the gate and comes home. The wage is the household's main income. A weekly shop buys what the garden doesn't meet, at DEFRA Family Food prices. Shop food carries its farm and transport carbon, land and water (Poore & Nemecek 2018; transport is a small share of most foods' footprint, a myth the game can correct). The garden's value becomes groceries saved as well as sales. At the smallholding the job can go part-time.
  - **A partner.** The household has members from the start (one to begin with: the gardener). A partner moves in during the allotment's year (part 10); work, help or a mix is a plan lever, and the kitchen's ask grows with the household. The partner has goals (the agency system, later). Later come children and family.
  - **Saves.** No save compatibility before the first release (`docs/decisions/ADR-2026-09-29-no-save-compatibility-before-release.md`): shape the state as it's best, and say in the note what part 6b adds to the saved state.
- **Ahead of its part, in new files only** (the models-ahead track). It never edits `src/sim/systems.ts`, `state.ts`, `graph.ts`, `commands.ts`, `save.ts`, `gardener.ts`, an existing model or dataset (`kitchen.ts`, `jobs.ts` included), anything under `src/ui/`, `src/app/` or `tools/`, the founding spec or the project notes: part 5 is editing the shared files now. If it needs a unit, a stock key or a boundary the graph doesn't have, define it in its own file and say in the note what the wiring part must add to `graph.ts`. If the labour model (#26, `feature/labour-machinery-energy`) has merged when you start, read its hours and wages and reuse its types where they fit rather than defining a second one; if not, don't import from its branch, and name in the note what the two should share.
- **Shaped for wiring.** Read how the existing models are built (`src/sim/models/kitchen.ts`, `crops.ts`, `carbon.ts` and their tests, `src/sim/clock.ts` for `System` and `TickContext`, `src/sim/ladder.ts` for a merged models-ahead file) and write this one the same way: pure functions over the graph's typed quantities (`Qty` and its units) that return the flows to move and the state to keep, no DOM, no `Math.random()` (draw from a passed `Rng` where chance matters), no global state; and an exported `System` (not listed in `systems.ts`) that the wiring part adds with one line.
- **Real mechanisms, rough numbers** (`docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`): the model file starts with a one-line comment on what's in it, then `// Sources:` and `// Simplifies:`, and says its fast effect and its slow effect; a plausibility test beside it (`household.test.ts`) asserts the direction and rough size of each effect against its sources. Data carries its licence beside it and names no real place, shop or brand (invented places everywhere).
- **What it builds, concretely:**
  - **Members.** A household is a list of members, each with a role (the gardener, the partner, later a child), a job (none, part-time, full-time), hours by weekday (a full-time weekday job of about 8 hours plus a commute, ONS Annual Survey of Hours and Earnings for rough hours and the median wage), a take-home wage in £ a week, and a split of their free hours between the garden and the rest of life. From that, each member's garden hours for any day: about four on a weekday and more at weekends for today's gardener, matching `src/data/jobs.ts`'s figure, so wiring it changes no pacing. The partner's **work, help or a mix** is a lever: hours moved from the job to the garden cost wage and add garden hours. **Part-time** at the smallholding is the same lever on the gardener.
  - **The departure and return times** each weekday (leaving through the gate, coming home), as data the map will draw.
  - **The weekly basket.** A household's weekly grocery basket by food group, kg per person, from DEFRA Family Food (veg by the kitchen's groups, and the rest of the diet in a few coarse groups: fruit, cereals and bread, dairy and eggs, meat and fish, other), with a price per kg for each from Family Food's expenditure and quantities. A function that, given what the garden supplied in the week (kg by group), returns what the shop must buy, its cost, and the **groceries saved** (the garden's kg at shop prices). The kitchen's daily ask (`src/data/kitchen.ts`, about 1 kg for 2.4 people) must fall out of the basket's veg for the same household size within about 10 %; say how part 6b swaps the kitchen's fixed ask for the basket's, and that the ask grows when the partner moves in.
  - **Shop food's footprint.** Per kg by group: farm-to-shop kg CO₂e, land (m² a year) and fresh water (L), from Poore & Nemecek's global means (their supplementary data, CC BY), with the transport share split out so an Explain card can show it's small for most foods (air-freighted produce the exception). A function for a week's shop: the carbon, land and water it carries, as flows the graph can count (the carbon dial and the land account).
  - **The purse.** The week's money flows in SI-free £: wages in, the shop out, sales in (the honesty box, from the kitchen's ledger), and a plain household spend for everything else, so the purse can go down as well as up. Say what the player's money is (the gardener's budget for the garden, not the whole household's savings) and keep the rest of life's spending as one flat outgoing.
  - **Scale-free.** The same functions serve many households: an allotment neighbour is a household whose long working hours mean a neglected plot (hours per plot as the output); a box scheme's customers are households whose baskets are the scheme's demand; a town's demand is baskets summed over **income deciles** (ONS household income deciles and Family Food's spend by income quintile), each decile with its own basket mix and price sensitivity (a rough own-price elasticity by group from the food demand literature). One function returns the demand of N households of a decile; a test shows the town's total is the sum of its deciles.
  - **Tests** (`src/sim/models/household.test.ts`): a full-time gardener gets about four garden hours on a weekday and more at weekends; the partner switching from work to help cuts the wage and adds garden hours; a garden supplying the whole veg ask saves its kg at shop prices and the shop buys the rest; a week's shop's carbon is dominated by meat and dairy, and its transport share is under 10 % for a typical basket; the kitchen's ask matches the basket's veg within 10 %; a lower-income decile spends a larger share of income on food (Family Food's direction); N identical households' demand is N times one.
- **Its notes** (`docs/systems/household.md`, naming every file in its first paragraph): how it works, and a **Wiring** section naming the parts and what each does with it:
  - **6b:** the job's hours on the gardener (replacing the fixed four hours in `jobs.ts`), the wage and the shop as money flows, the commute and the weekly shop drawn on the map, the kitchen buying what the garden doesn't meet, groceries saved beside sales, each piece unfolding as it first matters (keys for `src/data/unfold.ts` proposed, not added);
  - **8:** the allotment's eleven neighbours as households, their hours setting how kept their plots are;
  - **10:** the partner moving in, the work-or-help lever, the kitchen's ask growing;
  - **13:** part-time at the smallholding, hours at scale, and the box scheme's customers (with 14) as households;
  - and the stocks, flows, levers and saved fields to add, and the system's place in `systems.ts`.
- **How it fits and grows** (answer each briefly in the note, for what this model adds):
  1. **Born where.** Hands-on at the garden (the household node beside the garden), moving £, hours and kg of food bought, with carbon (kg CO₂e), land (m²) and water (L) carried in, conserved.
  2. **Across the ladder.** What a sealed garden carries up (its household's hours, spend and groceries saved); how households show one level up (allotment neighbours) and two up (the smallholding's box-scheme customers); where they come back as an aggregate (town demand by decile) and as the role reversal (the player sells to households, then runs the market they shop in).
  3. **Loops.** Which of the spec's loops it feeds; its fast effect (the week's shop and purse) and slow effect (the household's diet footprint, and time traded between job and garden).
  4. **People.** The members, their hours and goals, and what the player delegates.
  5. **The lever.** Work, help or a mix; part-time; the shop's mix later; "let them decide".
  6. **The map.** The gardener leaving and coming home, the shop bags arriving, impact first; what reduced motion shows.
  7. **Explain.** The mechanism and source for each effect (the shop's footprint and the transport myth first).
  8. **Economy and balance.** The £, hours and kg it moves, and which bot milestones wiring it shifts (the first sale, the purse, #21 and #22).
  9. **Carbon and land.** What the shop adds to the dial and the land account, beside the garden's own.
  10. **Polish.** What the panels will need at 320 px to large screens, in concise UK English.
  11. **The lesson.** Growing your own saves money and carbon mostly through what it replaces, and food miles are a small share of food's footprint.
  12. **Unfolding.** What the player sees of it and when (the purse with the first wage or purchase; the shop's footprint with the first carbon choice), as proposed `unfold.ts` keys.
- **It may touch:** `src/sim/models/household.ts` and `household.test.ts`, `src/data/household.ts`, `docs/systems/household.md`, `docs/roadmap.d/` (its own item), `docs/briefs/household-model.md` (this brief, saved as is) and `docs/lessons/` (its look back). Nothing else.

## Read first

- The project notes, then `node tools/graph.mjs src/sim/models/kitchen.ts` and `node tools/graph.mjs src/sim/clock.ts`, and only the files those list.
- `docs/systems/kitchen.md`, `docs/systems/gardener.md` and `docs/systems/ladder.md`; `src/data/kitchen.ts` and `src/data/jobs.ts`.
- The founding spec's "The garden" and "The allotment" paragraphs and its systems map rows for Labour, and Markets, prices and demand; not end to end.
- `docs/briefs/sealing-maths.md`, the shape of a models-ahead brief this one follows.
- The `feature` and `steward` playbooks.

## Speed budget

None shipped: nothing reaches `dist/` until part 6b wires it. Measure what a day's call costs headless in Node for one household and for a town of ten deciles, and say it in the note, so the wiring parts can hold it inside their share of the parts-5-to-14 reserve (`docs/SYSTEMS.md`, "Speed budget").

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook: Squash and merge by hand once Checks and the Description check are green on the latest head and the look back is committed in the PR (until the owner adds the ruleset and auto-merge); the Pages run publishes nothing new, since nothing is wired. The Catch up workflow merges `main` in as other parts land; new files only means it should never conflict. Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged, the session stops.

## What's left for others

- Part 6b wires this (after 6a, unfolding and the first minute); parts 8, 10 and 13 use it for the neighbours, the partner and part-time. Agency, goals and trust are a later models-ahead session (neighbours, agency and trust, and the committee); storage, spoilage and the market another. Don't start them.
- Part 5 and the livestock and labour sessions are editing or adding their own files; never touch another session's files or branch.
- The owner has said the coordinator's recommendations stand for later choices.

## When to stop and ask

- Only for something irreversible or outside this brief: repo settings, a change to the founding spec's model or carry-over rule, a new runtime dependency, or widening the slice.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question, the options and the default, carry on with the default, and say so in the PR; the owner has said the recommended option stands unless they answer.
- Where it's merely unclear, take the safer option (a plainer model with its simplification named, easier to extend later) and say so in the PR.

## Cost budget

- Estimate: about $9 (one model with its data, careful sourced numbers and plausibility tests, one or two CI rounds). Model `claude-sonnet-5-5`, the cheaper model (the models-ahead track). No workflows.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions.
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim what's left (the income deciles can move to part 13's wiring).
