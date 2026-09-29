# Brief: models ahead: neighbours, agency and trust, and the committee (for parts 8 to 10)

The founding spec (`docs/specs/overgrow.md`) splits the first slice into fifteen parts. Parts 1 to 5 have merged and part 6a (unfolding and the first minute) is building. Models written ahead have merged for the sealing maths, the household, livestock, labour, machinery and energy, and storage and the market. This session writes, ahead of parts 8 to 10 (the allotment), the pure models of other people: neighbours as agents with goals and a hidden integrity, reports that can differ from the truth, trust and goodwill as slow stocks, and the allotment committee's votes. Parts 8 to 10 then only have to wire them to the plots, the map and the panels.

## Goal and what it may touch

- **Deliver** two pure, tested models: `src/sim/models/agency.ts` (agents, their goals and hidden integrity, reports against the truth, trust and goodwill) and `src/sim/models/committee.ts` (motions, votes, persuasion and the three allotment votes), with their data in `src/data/agency.ts` and `src/data/committee.ts` and their notes in `docs/systems/agency.md` and `docs/systems/committee.md`. Branch `feature/agency-and-committee` from `main`, one PR. Start from a GitHub issue (the Feature template) and link it from the PR; the founding spec's rows below and the owner's answers on #29 approve this work in advance (the `feature` playbook, step 2).
- **The founding spec's rows it builds:** the systems map's "Agency and trust" (skills, goals and a hidden integrity; reports that differ from the truth; hiring, audits, replacement and pay as the levers; reputation and trust as slow stocks; bad actors where the money is, starting with a neighbour over-sharing your harvest) and "Politics and policy" as far as the committee (levers that cost political capital, replenished by support); "The allotment" (twelve plots, eleven gardeners with names and habits, the swap shed, the second plot, the neighbour who helps and takes a little more than their share, the committee's three votes); and roadmap parts 8, 9 and 10.
- **The owner's answers it builds** (#29, now in the founding spec by #37):
  - **Q1 and Q13:** each neighbour is a household from `src/sim/models/household.ts`; the neglected plot next door is the one whose household has the least time, so neglect emerges (the first zoom back in keeps its scripted timing: expose a function part 9 can use to pick that plot from a seed).
  - **Q11:** the bonfire vote belongs to the waste system: burning garden waste against composting it (smoke and CO₂ now against compost later), the seed of the stubble-burning ban.
  - **Q14:** carbon has a price through people: the committee's and the neighbours' goodwill respond to carbon choices (peat, bonfires, a plot dug from grass).
  - **Q8 (b):** a hosepipe ban in a very dry summer (part 10), as a committee or water-company rule the trough rota must live with.
  - **Strategic and long, never boring** (decision 12): every lever is a trade-off with no single best option. Letting the helper take the second plot saves your hours and costs kg you don't see; auditing them costs hours and some goodwill; voting with the committee's majority keeps goodwill and costs you the outcome you wanted. The tests show each both ways.
  - **Don't overwhelm the player:** say which instruments the parts should unfold and when (proposed keys for `src/data/unfold.ts`, not added).
- **What it builds, concretely:**
  - **Agents.** An agent is a person with a household (from `household.ts`), skills, goals (a few weighted wants: harvest, rest, standing, money), a habit (tidy, lazy, generous, competitive: the spec's eleven), and a hidden integrity (0 to 1). What they do each week follows their goals, time and habit, drawn from a passed `Rng`.
  - **Reports against the truth.** An agent working for the player reports what they did and what they took; the report equals the truth scaled by their integrity and how closely they're watched. The truth is always in the flows (conserved: the kg they take moves on the graph), so the map can show it while the numbers don't: the spec's "a report isn't the truth".
  - **Audits.** Watching or auditing costs the player hours and some of the agent's goodwill, and narrows the gap between report and truth.
  - **Trust and goodwill** as slow stocks per relationship and for the committee as a whole, moving with kept promises, shared surplus at the swap shed, help given, carbon choices (Q14) and audits.
  - **The committee.** Motions (the water rota, the bonfire ban, letting a plot go to bees, and a hosepipe rule), each member's vote from their goals and their goodwill towards the proposer, persuasion (hours spent talking), and political capital as the seed of the spec's politics: a stock spent on proposing and replenished by goodwill. The outcome changes a rule the plots then live under.
  - **The seed catalogue's interest** (the spec's first adviser with an interest): an adviser whose recommendations are weighted towards its own seeds, as a function the Explain card can expose.
  - **Scale-free.** The same functions serve a hired hand at the smallholding (part 13's first hire has goals of their own; use `labour.ts` where it fits), and the council and boards later; say how in the notes.
  - **Tests** (`agency.test.ts`, `committee.test.ts`): a helper with low integrity reports less taken than they took, and the truth still balances on the graph; auditing narrows the gap and costs hours and goodwill; the least-time household's plot is the most neglected over a season; goodwill rises with shared surplus and falls with a bonfire; a motion passes when enough members' goals and goodwill favour it and fails otherwise; persuasion shifts a close vote and not a lopsided one; the seed catalogue's recommendations favour its own seeds by a measurable margin.
- **Ahead of its part, in new files only** (the models-ahead track). It never edits `src/sim/systems.ts`, `state.ts`, `graph.ts`, `commands.ts`, `save.ts`, `gardener.ts`, an existing model or dataset, anything under `src/ui/`, `src/app/` or `tools/`, the founding spec or the project notes: part 6a is editing the shared files now. Import from the merged models where they fit (households, labour); if one needs a change, say it in the notes for the wiring part. If it needs a unit, stock key or boundary the graph doesn't have, define it in its own file and say what the wiring part must add to `graph.ts`.
- **Shaped for wiring.** Read how the merged models are built (`src/sim/models/household.ts`, `market.ts` and their tests, `src/sim/clock.ts` for `System` and `TickContext`) and write these the same way: pure functions over the graph's typed quantities, no DOM, no `Math.random()`, no global state, and an exported `System` for each (not listed in `systems.ts`).
- **Real mechanisms, rough numbers** (`docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`): each model file starts with a one-line comment on what's in it, then `// Sources:` (the principal–agent problem; the spec's coalition and veto-player models; trust as a slow stock from the literature on repeated games) and `// Simplifies:`, and says its fast and slow effect; data carries its licence and names no real place or person.
- **Its notes** (`docs/systems/agency.md` and `committee.md`, naming every file in their first paragraphs): how each works, a **Wiring** section for parts 8, 9 and 10 (and 13 for the hire), and "How it fits and grows" answered as below.
- **It may touch:** `src/sim/models/agency.ts`, `agency.test.ts`, `committee.ts`, `committee.test.ts`, `src/data/agency.ts`, `src/data/committee.ts`, `docs/systems/agency.md`, `docs/systems/committee.md`, `docs/roadmap.d/` (its own item), `docs/briefs/agency-and-committee.md` (this brief, saved as is) and `docs/lessons/` (its look back). Nothing else.

## Read first

- The project notes, then `node tools/graph.mjs src/sim/models/household.ts` and `node tools/graph.mjs src/sim/clock.ts`, and only the files those list.
- The founding spec's "The allotment", its systems map rows for Agency and trust and for Politics and policy, "Zooming back in", and the roadmap's parts 8 to 10; not end to end.
- The systems web (`docs/specs/overgrow/systems-web.md`): the rows for agency, politics and households, and the spine (you vote in the committee at 2 and serve whoever is elected at 7).
- `docs/systems/household.md`, `docs/systems/labour.md`, `docs/systems/market.md`, and `docs/briefs/storage-and-market.md` (the shape of a models-ahead brief).
- The `feature` and `steward` playbooks.

## How it fits and grows

Its rows in the systems web (`docs/specs/overgrow/systems-web.md`) are agency and trust, politics and policy, and households.
1. **Born where.** Hands-on at the allotment (level 2): each neighbour a household node with a plot; the committee a node whose stocks are goodwill and political capital; flows are kg taken and shared, hours spent, and votes, conserved.
2. **Across the ladder.** A sealed allotment carries its goodwill (a Health part) and its rules; one level up the hired hand and the parish reuse the agents; at 5 people you don't choose; at 7 you serve whoever is elected (the spine).
3. **Loops.** The agency loop (delegating buys time, every delegate has interests, watching costs time again) and, through Q14, the carbon loop.
4. **People.** Eleven neighbours with names, habits and goals; the helper; the committee.
5. **The lever.** Take on the second plot, accept or refuse the helper, audit, share at the swap shed, propose and vote, and "let them decide".
6. **The map.** The helper carrying a little more than their share (shown, not told), neglected plots going to weeds, the committee meeting at the shed; reduced motion shows the end states.
7. **Explain.** The principal–agent problem; why a report isn't the truth; how a vote turned.
8. **Economy and balance.** The kg a helper takes, the hours audits and persuasion cost, and which bot milestones wiring them shifts at the allotment.
9. **Carbon and land.** Bonfires against compost (Q11), and goodwill as carbon's price (Q14).
10. **Polish.** What the panels will need at 320 px to large screens, in concise UK English.
11. **The lesson.** A report isn't the truth, and watching costs time; rules are made by people with their own goals.
12. **Unfolding.** Trust with the first helper, the committee's panel with the first motion, as proposed `unfold.ts` keys.

## Speed budget

None shipped: nothing reaches `dist/` until the allotment's parts wire it. Measure a week's call headless in Node for twelve plots and a committee of twelve, and say it in the notes.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook: Squash and merge by hand once Checks and the Description check are green on the latest head and the look back is committed in the PR; the Pages run publishes nothing new, since nothing is wired. The Catch up workflow merges `main` in as other parts land; new files only means it should never conflict. Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged, the session stops.

## What's left for others

- Parts 8 to 10 wire these; part 13 the hire. Rotation over years and field-scale soil is a later models-ahead session; don't start it.
- Part 6a is editing the shared files; never touch another session's files or branch.
- The owner has said the coordinator's recommendations stand for later choices.

## When to stop and ask

- Only for something irreversible or outside this brief: repo settings, a change to the founding spec's model or carry-over rule, a new runtime dependency, or widening the slice.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question, the options and the default, carry on with the default, and say so in the PR.
- Where it's merely unclear, take the safer option (a plainer model with its simplification named) and say so in the PR.

## Cost budget

- Estimate: about $10 (two models with data and plausibility tests, one or two CI rounds). Model `claude-sonnet-5-5`, the cheaper model (the models-ahead track). No workflows.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions.
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim what's left (the seed catalogue can move to part 10).
