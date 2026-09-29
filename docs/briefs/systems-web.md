# Brief: the systems web, every mechanic across the ladder

The owner (29 Sep 2026): "Make sure to consider different angles and how everything fits into the game in ever expanding systems." The founding spec (`docs/specs/overgrow.md`) has the ladder, the carry-over rule, a systems map and the loops, and says where each system is first hands-on. What it doesn't have is each mechanic followed up the ladder, level by level. The owner has already added mechanics since it was approved: the gardener's job and groceries, and a partner who can earn or help. More will come. This session writes that web, finds where the design has gaps, and makes "how it fits and grows" part of every brief and spec from now on. It builds no game code.

## Goal and what it may touch

- **Deliver** one docs PR on `feature/systems-web` from `main`. Start from a GitHub issue (the Feature template) and link it from the PR.
- **What it builds, concretely:**
  1. **The systems web** (`docs/specs/overgrow/systems-web.md`, a companion to the founding spec, beside the owner's design pages).
     - **Every mechanic:** each row of the founding spec's systems map, the game's own systems (the ladder and sealing, zooming back in, advisers, recommendations and Explain, events, agency and trust), and the owner's additions (the household: the gardener's job and wage, the weekly groceries, a partner who earns or helps, and later children and family).
     - **Per level, 1 to 8:** how it shows (hands-on, a node's number, or a tint and one line); the player's lever (plan, upgrade, policy or law) and who acts on it; what's drawn on the map; what a sealed node carries up; which loops it feeds; its fast and slow effect; and the real-world lesson it teaches there.
     - **Keep it scannable:** a table per system, or one grid with a page per system, whichever reads better at 320 px and on a desktop.
     - **Mark what's settled:** mark which rows the founding spec already settles and which are this web's proposals.
  2. **The spine.** Each level puts the player on the other side of something they met below: they buy groceries from a shop in the garden; sell a box scheme to other households at the smallholding; run the market at the town; are the buyer at the supply chain; and set the wages, benefits and food rules that shaped the gardener's job and basket at the nation. Check this against the spec, extend it (the committee they voted in, the adviser they listened to, the hired hand they became the employer of), and write it as the game's narrative thread. Every later level's spec should be able to point at its reversal.
  3. **Seeds and dead ends.**
     - **Seeds:** for every system first hands-on at level 4 or above, name its seed in levels 1 to 3 that makes it legible when it arrives. For example:
       - trade: the imported tomatoes in the gardener's March basket;
       - diet and health: the kitchen's own mix;
       - population: the household's members;
       - elections: the committee's votes;
       - sea level: the flood on the low field;
       - insurance and credit: the loan for the second-hand tractor.
     - **Dead ends:** for every mechanic born in levels 1 to 3, name where it goes. Flag any that dead-ends, and any seed the spec lacks.
  4. **The household across the ladder**, worked in full as the first example the owner asked for:
     - **Garden:** one member's job and hours, the weekly shop, and shop food's carbon. Poore & Nemecek show transport is a small share of most foods' footprint, so what you eat matters more than how far it came: a myth the game can correct.
     - **Allotment:** the partner's work-or-help lever. Neighbours are households too, so a neighbour with long hours at work is why the plot next door is neglected, emerging from the same model rather than scripted.
     - **Smallholding:** the job going part-time and the family's hours. The box scheme's customers are households.
     - **Farm:** off-farm income, which many real UK farms rely on (DEFRA Farm Business Survey).
     - **Town:** household demand by income decile (DEFRA Family Food), which is the garden's grocery basket summed.
     - **Supply chain:** footfall and the category mix.
     - **Nation:** population, wages, affordability as the food share of income, and policy (the minimum wage, the sugar levy) reaching the basket.
     - **Planet:** incomes shaping diets across countries (Bennett's law).
     - **Check it against the model:** the household economy model (a models-ahead session writes it; read its PR if it's open) and the partner in part 10.
  5. **The angles, as process.**
     - **The template:** add a "How it fits and grows" section to `docs/briefs/TEMPLATE.md`, starting from the coordinator's checklist below.
     - **The playbook:** point the `feature` playbook's spec step at the web and the checklist; it already asks how a feature shows once zoomed out, and this extends that to every level and angle.
     - **The coordinator:** a line in the `coordinator` playbook §6 that every brief carries the section.
     - **The check:** if `tools/brief.mjs` can require the section cheaply without failing the briefs already in `docs/briefs/` (say, by grandfathering them by name), do that and prove it catches a missing section; otherwise leave the check as it is and say why.
     - **The record:** add one in `docs/decisions/` if you judge the principle ("every mechanic is born small and hands-on, seals into a node's totals, and returns higher up as an aggregate or a reversal") a rule other changes must follow. The spec implies it; say whether the record adds anything.
  6. **Spec proposals.** Anything the web finds that would change the founding spec's model, ladder or carry-over rule is a proposal only. List them in one issue labelled `needs-owner`, each with the recommendation and what it touches. The coordinator's brief makes those the owner's call, so nothing is built on them until the owner answers. The owner's own additions (the job, groceries, the partner) are already approved; part 6 writes them into the spec's garden section, not this session.
  7. **A page for the owner.** Publish the web as a page: the levels against the systems, the spine drawn, and the household traced up the ladder. Link it from the issue and from a PR comment, never the description (the `steward` playbook: the page's address trips the Description check).
- **It may touch:** `docs/specs/overgrow/systems-web.md`, `docs/briefs/TEMPLATE.md`, `tools/brief.mjs` and `tools/checks/brief.mjs` (only for the new section), `.claude/skills/feature/SKILL.md` and `.claude/skills/coordinator/SKILL.md` (the lines above), `docs/decisions/` (one record, if any, and its README line if it isn't joined), `docs/roadmap.d/` (its own item), `docs/briefs/systems-web.md` (this brief, saved as is) and `docs/lessons/` (its look back). Not the founding spec (proposals go in the issue), nothing under `src/`, and no other tool. Anything else is outside the brief.

## Read first

- The project notes, then `node tools/graph.mjs "The map and the page's shell"`, `node tools/graph.mjs src/sim/graph.ts` and `node tools/graph.mjs brief`, and only the files those list.
- `docs/specs/overgrow.md` end to end, and the owner's design page `docs/specs/overgrow/game.html` (its diagrams of the ladder, the model, the systems and the loops). The web builds on both; don't restate them.
- Every file in `docs/systems/` (short), the models-ahead PRs that are open or merged (sealing maths, livestock, labour, machinery and energy, the household economy), and `docs/ideas/final-call-wins.md` for anything it says about progression.
- The coordinator's checklist, to start the template's section from:

  > **How it fits and grows** (answer each briefly, for what this part adds):
  > 1. **Born where.** The level where it's hands-on, the node type, and the flows it moves (SI units), kept conserved.
  > 2. **Across the ladder.** What a sealed node carries up from it. How it shows one level up (a node's number) and two up (a tint and one line). Where it comes back later as an aggregate, or as a role reversal: the player meets at one level what they'll run at a later one.
  > 3. **Loops.** Which of the spec's loops it feeds (diet, intensification, trade, energy, waste, agency), and its fast and slow effect.
  > 4. **People.** Who does the work, their hours and goals, and what the player delegates. You decide; people do.
  > 5. **The lever.** The plan, upgrade, policy or law it adds at this level, and "let them decide" for players who'd rather not.
  > 6. **The map.** What's drawn, impact first, and what reduced motion shows.
  > 7. **Explain.** The mechanism and source for each effect it causes.
  > 8. **Economy and balance.** The money, hours and kg it moves, and the bot milestones it shifts.
  > 9. **Carbon and land.** What it adds to the dial and the land account.
  > 10. **Polish.** Phones to large screens, concise UK English, hidden until unlocked, the UI record's rules.
  > 11. **The lesson.** The one real-world thing it teaches, and any myth it corrects.

- The `feature`, `steward` and `coordinator` playbooks.

## Speed budget

None: no game code.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook: Squash and merge by hand once Checks and the Description check are green on the latest head and the look back is committed in the PR (until the owner adds the ruleset and auto-merge). It needn't wait for the owner's answer on the proposals issue: the web marks proposals as proposals. Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged, the session stops.

## What's left for others

- The parts build the game from their briefs, and from now on each brief carries "How it fits and grows" and points at its row of the web.
- Part 6 wires the household (the job, the groceries) and writes the owner's additions into the founding spec. Part 10 adds the partner. Levels 4 to 8 each get their own spec after the slice, and the web is their starting point.
- Parts 4 and 5 and the models-ahead sessions are working now. Never touch their files or branches. If the web shows one of their models needs a hook to grow, say so in the issue and the coordinator passes it on.
- The owner has said the coordinator's recommendations stand for later choices. Changes to the founding spec's model are still the owner's.

## When to stop and ask

- Only for something irreversible or outside this brief: repo settings, a change to the founding spec's model or carry-over rule (a proposal in the issue, never an edit), a new runtime dependency, or widening the slice.
- Otherwise, if it truly needs the owner: the `needs-owner` issue above is the channel. Carry on, and say so in the PR.
- Where it's merely unclear, take the safer option (a proposal rather than a change, a question in the issue rather than an assumption in the web) and say so in the PR.

## Cost budget

- Estimate: about $15 (reading the spec, the design page, the systems' notes and the model PRs; one long design document, a template, playbook and check change, a record, an issue and a page; one or two CI rounds). Model `claude-opus-5-5` at high effort, since this sets the design every remaining part and level follows. Ultracode is allowed only for the fresh review before the PR opens (for example, one reviewer per level or per loop checking the web against the spec); a workflow never pushes or opens the PR, and its cost counts against this estimate.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions.
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim what's left (the page can follow in a small PR, or the check can stay as it is).
