# Brief: part 6a, unfolding and the first minute

The founding spec (`docs/specs/overgrow.md`) splits the first slice into fifteen parts. Parts 1 to 5 have merged (the graph and the clock, weather, soil and water, crops and the gardener, the bot, and pests, wildlife and Explain), with models written ahead for the sealing maths, the household, livestock, labour, machinery and energy, and storage and the market. The owner split part 6 into three PRs, in order: **6a, unfolding and the first minute** (this one), 6b the household, and 6c the shed, the hens and the advisers. This part makes the game show the player only what they can act on, unfolding each instrument as they gain influence, and makes the first minute the spec describes happen every time.

## Goal and what it may touch

- **Deliver** one PR on `feature/unfolding-first-minute` from `main`. Label it `part:shed-and-advisers` if the Parts workflow is in use (the `feature` playbook). Start from a GitHub issue (the Feature template); the spec rows below and the owner's decisions are approved, so this brief approves them in advance (the `feature` playbook, step 2): mark the issue so and build.
- **The owner's principle, decision 9 in `docs/briefs/coordinator-first-slice-2.md`:** every system runs from the start, and the living map shows its impacts from day one. Its instruments (numbers, dials, badges, tabs, plan lines, levers) unfold only as the player gains influence over it: never greyed, never all at once, with one first-time pulse and a short Explain. Views are keyed in `src/data/unfold.ts` from the sim's saved `seen` list; part 5 started that table for its pests and flowers. Levers are gated in the sim, so a hidden lever's command is refused and the bot plays the same game. Each new level starts simple again. A "Show all details" setting, off by default, serves players who want the numbers early.
- **What it builds:**
  - **The retrofit.** Put everything parts 1 to 5 show into the unfold table, each keyed to the influence that reveals it: soil moisture first, with the watering line; N-P-K when feeding becomes a lever; the carbon dial with the first carbon choice (the owner's principle settles the spec's "from day one", now written in the spec by #37 as the two carbon numbers of Q4); money with the first sale or purchase; the temperature; each tab only once it has something in it. Say the table's order in the notes as the order a new player meets things.
  - **Lever gating in the sim** for every lever the retrofit hides, through part 5's `GATES`, with the bot's policies updated so the bot still plays (it may only use a lever once it's unfolded, as a player would).
  - **The first-time pulse** (W26 in `docs/ideas/final-call-wins.md`): one sign per batch when several keys unfold together, never one each, with a check that builds a case where two really qualify and counts one pulse; and the short Explain beside it.
  - **An `unfold` check** (`tools/checks/unfold.mjs`, listed in `docs/SYSTEMS.md`): a new game shows only the core; each trigger reveals its key; unknown keys fail closed; a hidden lever's command is refused; "Show all details" shows everything and gates nothing in the UI (the sim's gates stay: the setting shows numbers, not powers).
  - **The first minute** as the spec's "The first minute" sets it, with the owner's head start (#11: one bed of overwintered salad leaves): the first-plan card (paused, "let them choose" as the other button), the gardener's first jobs, the dusk slugs and the first Explain, the beer trap showing in the shed, and the kitchen's first ask; the card queue so nothing covers the first card (W5), and a seeded check that plays the first minute and asserts each moment happens, causing the event where it depends on the dice (W21).
  - **The goal bar names the binding requirement** (W18): it shows the step-up offer's three numbers (Output, Reliability, Health) moving over the window the spec now sets (Q15: the garden's last full year, from `stepUpStatus()` in `src/sim/ladder.ts`, which #39 updated) and names the one holding the player back, in words a player understands ("Reliability 42 of 60: a steadier mix of crops"). Early in the year it says what the window is waiting for rather than showing an empty bar.
  - **One "try faster" nudge, once** (W17): after the first success, never during the first minute or in the headless run.
  - **Left over from part 5** (its look back, `docs/lessons/35-pests-wildlife-explain.md`): shorten the Explain card to what happened, the lever that helps, and a line each of mechanism and source; add the bot's `pests` policy line.
  - **The records.** A decision record for the owner's unfolding principle if the systems web didn't write one (check `docs/decisions/`), the founding spec's lines that the principle changes (the layout's "carbon dial from day one", "a tab appears only once it has something in it"), and a roadmap item recording the owner's split of part 6 into 6a, 6b and 6c.
- **Strategic and long, never boring** (decision 12, and the `balance` playbook): unfolding is how a long game stays readable. Check that the first hour at 1× never goes more than a few minutes without something new to see or decide, and say the longest quiet stretch you measured in the PR (by hand or from the bot's log; the bot's own measure is part 6c's).
- **It may touch:** `src/data/unfold.ts`, the sim's gating and effects (`src/sim/`), the UI's panels, top bar, goal bar, cards and settings (`src/ui/`), `src/ui/styles/tokens.css`, the bot's policies (`tools/bot*`), a new `tools/checks/unfold.mjs` and `first-minute.mjs` and changes to existing checks this breaks on purpose, the docs for what changes (`docs/systems/`, `docs/SYSTEMS.md`, the founding spec's lines named above, a decision record), `docs/roadmap.d/`, `docs/briefs/unfolding-first-minute.md` (this brief, saved as is), `src/updates.d/` (a What's new entry) and `docs/lessons/` (its look back). Don't wire the household, the hens, the shed's new upgrades or the advisers: those are 6b and 6c.

## Read first

- The project notes, then `node tools/graph.mjs "The map and the page's shell"`, `node tools/graph.mjs src/data/unfold.ts` and `node tools/graph.mjs src/sim/ladder.ts`, and only the files those list.
- The founding spec's "The first minute", "What makes the jump feel earned" and "The look: a living map"; the systems web's (`docs/specs/overgrow/systems-web.md`) "Unfolding" column for levels 1 and 2 and its pacing section; `docs/decisions/ADR-2026-09-29-strategic-and-long.md` and `ADR-2026-09-29-born-small-grows-up.md`.
- `docs/decisions/ADR-2026-09-29-ui-from-final-call.md`, and rows W5, W17, W18, W21 and W26 of `docs/ideas/final-call-wins.md` (read the Final Call files they name only where the row isn't enough; the public repo is `https://github.com/KyleLookingAround/final-call`, clone read-only).
- Part 5's look back (`docs/lessons/35-pests-wildlife-explain.md`) and its brief (`docs/briefs/pests-wildlife-explain.md`) for how it started the unfold table.
- The `feature`, `steward` and `balance` playbooks.

## How it fits and grows

Unfolding is the systems web's (`docs/specs/overgrow/systems-web.md`) "Unfolding" column made real for level 1, and the pattern every level after reuses.
1. **Born where.** The garden, on the player's own node: the `seen` list is a saved stock of keys; no physical flows move.
2. **Across the ladder.** Each new level starts simple again: a sealed node shows only its tile's numbers, and the new level's instruments unfold from zero with their own keys. Keys are named by level and system so the allotment's can reuse the pattern.
3. **Loops.** None directly; it decides when each loop's instruments appear (the carbon dial with the first carbon choice, the diet loop's basket with 6b).
4. **People.** The gardener does the work from the first minute; "let them choose" on the first card is the first delegation.
5. **The lever.** No new game lever; every existing lever is gated by its key. "Show all details" is a setting, not a lever.
6. **The map.** The map stays whole from day one; only the panels and chrome unfold. Reduced motion: the pulse is a static highlight.
7. **Explain.** Each unfolded instrument has a short Explain the first time; the Explain card itself gets shorter (part 5's leftover).
8. **Economy and balance.** No money moves; the bot uses a lever only once it unfolds, so its milestones may shift: report the bot on seeds 1 to 3 against `main`.
9. **Carbon and land.** The dial appears with the first carbon choice instead of day one.
10. **Polish.** Phones from 320 px portrait and landscape to large screens; never greyed, hidden until unlocked; concise UK English; the UI record's rules.
11. **The lesson.** You see a system's numbers once you can change it; the living map shows everything's effects before that.
12. **Unfolding.** This part is the table: every key, its cause, and the order a new player meets them.

## Speed budget

Part 5 used about 0.17 ms of the 1.0 ms garden day the parts share (`docs/SYSTEMS.md`, "Speed budget"). This part's share: 0.05 ms a garden day headless, 0.2 ms of the garden's 1440 × 900 frame, 0.1 ms of a throttled phone frame, 0.1 ms of a tick's copy, and 15 KB of `dist/` gzipped. Measure against a build of `main` in alternation, three runs each (part 5's lesson), and add your line to the "Speed budget" section.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook: Squash and merge by hand once Checks and the Description check are green on the latest head, the look back is committed, and the Balance run's table is in the PR (until the owner adds the ruleset and auto-merge); then confirm the Pages publish. Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged, the session stops.

## What's left for others

- **6b, the household** (after this merges): wires `src/sim/models/household.ts` (the job's hours, the wage, the weekly shop, the commute on the map) and unfolds each piece as it first matters.
- **6c, the shed, the hens and the advisers:** upgrades hidden until worth having, the hens, more beds, the cold frame, netting, the beer trap, nematodes and peat, advisers and "let them decide", the step-up card's queue (W4), the bot's quiet-stretch measure and the baselines reset for the full garden year, #21, #22, #23 and #24, and the beds' output falling towards nothing by year three (on `main` now; part 5's look back).
- Don't start any of them, or touch another session's branch.
- The owner has said the coordinator's recommendations stand for later choices.

## When to stop and ask

- Only for something irreversible or outside this brief: repo settings, a change to the founding spec's model or carry-over rule, a new runtime dependency, or widening the slice.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question, the options and the default, carry on with the default, and say so in the PR; the owner has said the recommended option stands unless they answer.
- Where it's merely unclear, take the safer option (easier to undo, or changing the game less) and say so in the PR.

## Cost budget

- Estimate: about $22 (a table and gating through the sim, several panels at every size, two new checks and a seeded first-minute check, the bot on seeds 1 to 3, two or three CI rounds). Model `claude-opus-5-5` at high effort. No workflows.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- Keep context down: part 5 reached 690k and $35 partly from three merges of `main` mid-build. Open the PR as soon as the core works, and merge `main` once, just before the last CI round.
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions.
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim what's left (the try-faster nudge can move to 6c).
