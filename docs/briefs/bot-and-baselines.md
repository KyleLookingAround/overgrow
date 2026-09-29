# Brief: part 4 of the first slice, the bot and the first baselines

The founding spec (`docs/specs/overgrow.md`) splits the first slice into fifteen parts. Parts 1 and 2 (#5, #7) laid the graph, the clock, saves, the shell, and the weather, soil and water. This is part 4: the bot that plays the game headless and measures its pacing, and the first baselines. Part 3 (crops and the gardener) runs side by side with this part from the same `main`; part 3 owns the game code, this part owns the bot, and **this part merges after part 3**.

## Goal and what it may touch

- **Deliver** the founding spec's part 4 ("The first roadmap", item 4, and "How the bot measures pacing and balance from the first build"): the bot in `tools/`, `npm run bot`, the Balance workflow, and a proposed baselines file for the owner. Branch `feature/bot-and-baselines` from `main`, one PR.
- **The spec is its spec.** The founding spec's section "How the bot measures pacing and balance from the first build" and "The first roadmap" item 4 are approved; this brief approves them in advance for this part (the `feature` playbook, step 2), so no new spec file. The `balance` playbook is the contract the bot is built to. Start from a GitHub issue (the Feature template) and link it from the PR.
- **What it builds, concretely:**
  - **The bot** (`bot.ts` in `tools/`, `npm run bot -- <game time> --seed <n>`): plays the game headless in Node through `createSim()` and the same commands the player has, like a sensible player (a plan that sows in season and rotates families, a moisture line to water at; later parts add a pest policy and buying the next upgrade at three times its price, so leave a clear place for each). It never touches a bed or a stock: it only sends commands. It prints, as the `balance` playbook says: `SEED`, `REACHED {milestone: game time}`, `PLAY` (a fingerprint of the saved state that affects play), `ERR [...]`, and a table against `tools/baseline.json`. The same seed and code always give the same run. It runs TypeScript in Node without a build step, using what's already installed where it can; a new dev dependency only if it must, named in the PR.
  - **Milestones.** What the game has when this merges: first sowing, first harvest, first sale, half the kitchen's need met, and the sealed garden's would-be totals over the last 28 days (Output, Reliability, Health, as far as the snapshot carries them), money over time, food wasted and carbon. Milestones later parts add (each upgrade, the allotment offer, the first swap, the second plot) get a plain place in the milestone list that a later part fills in one line.
  - **Strategy tests**, as far as the game allows when this merges: a rotating bot beats a one-crop bot by at least 10 % of Output by day 120 (if part 3's plan offers rotation); the pest-policy and adviser strategy tests come with parts 5 and 6, and the notes say so. Vitest tests, so `npm run check` runs them.
  - **The Balance workflow** (`.github/workflows/balance.yml`): runs seeds 1, 2 and 3 on a PR once when it opens or leaves draft, and again when the `balance` label is added, and reports the table in the run's summary (and a PR comment only if the workflows' existing pattern does). It never fails a PR on a number; `ERR` not empty fails it. Match the other workflows' style (`checks.yml`), their triggers and permissions.
  - **The proposed baselines** (`tools/baseline.json`): ranges per milestone from the bot on seeds 1–3 against the spec's proposed first targets (first harvest by day 8, and the rest as far as the game reaches), marked proposed in the file. The owner agrees baselines before they count (the spec's "Balance" section): open an issue labelled `needs-owner` with the proposed ranges, the three seeds' numbers, and the default (take the proposal as is), and publish a page that shows the ranges against the seeds with the default pre-selected and saves the owner's pick where the session can read it back. Carry on and merge with the proposal marked proposed; an answer after the merge is a small follow-up the coordinator starts.
  - **The playbook and the notes.** The `balance` playbook: fill in the commands and the baselines table, and delete its "doesn't exist yet" paragraph. `docs/SYSTEMS.md`'s "The bot" section: what it is, how it's run, what it prints. The project notes only where a line becomes untrue.
- **Saves before the first release (the owner, 29 Sep 2026).** No compatibility with older builds' saves until the first release (part 15): `PLAY` fingerprints the current build's state only, and part 3 records the decision in the repo.
- **Order with part 3.** Build the bot, the workflow, the output and the tests against `main` while part 3 builds, reading part 3's PR (`feature/crops-and-gardener`) for its `plan` command's shape but never pushing to it. Once part 3 has merged, merge `main` into this branch, wire the crop milestones and the strategy test, run seeds 1–3 on the real garden, and propose the baselines from those runs. Open the PR as a draft until then if it helps, and don't merge before part 3.
- **It may touch:** `tools/bot.ts` and anything the bot needs beside it in `tools/`, `tools/baseline.json`, `package.json` (the `bot` script, and a dev dependency only if it must), `.github/workflows/balance.yml`, the strategy tests (a Vitest file under `src/` beside the sim, or wherever `vitest` already looks), `.claude/skills/balance/SKILL.md`, `docs/SYSTEMS.md` outside its joined lists, `docs/roadmap.d/` (its own item), `docs/briefs/bot-and-baselines.md` (this brief, saved as is), `docs/lessons/` (its look back), and the project notes only where a line becomes untrue. Nothing under `src/` beyond the strategy tests: if the bot needs something the sim doesn't expose, ask part 3's session through the coordinator, or add it in this PR only after part 3 has merged and say why. Anything else is outside the brief.

## Read first

- The project notes, then `node tools/graph.mjs createSim` and `node tools/graph.mjs src/sim/commands.ts`, and only the files those list.
- The founding spec's section "How the bot measures pacing and balance from the first build" and "Balance" (not the whole spec).
- The `balance`, `feature` and `steward` playbooks; `.github/workflows/checks.yml` for the workflows' style.
- `docs/lessons/5-graph-and-clock.md` and part 2's look back in `docs/lessons/`.

## Speed budget

None for the game: the bot runs in Node and ships nothing in `dist/`. Keep a bot run on one seed through the garden's first 120 days under a minute on CI, and say in the PR how long seeds 1–3 take.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook, after part 3 has merged: Squash and merge by hand once Checks, the Description check and the new Balance workflow are green on the latest head and the look back is committed in the PR (until the owner adds the ruleset and auto-merge), then confirm the Pages run (it may skip, since this changes no game file). Once the PR is open, call `subscribe_pr_activity` on it and end the turn: PR events wake the session, including the Catch up merge when part 3 lands. Don't book a `send_later`: the coordinator keeps the only check-in and will message this session when part 3 merges and if it stalls. When the PR has merged, the session stops.

## What's left for others

- Part 3 (running now): the crops, the gardener, the plan command, the kitchen, carbon and the `garden` check. Never push to its branch.
- Later parts add their milestones and strategy tests to the bot in one line each: the pest policy (5), upgrades and advisers (6), the allotment offer and sealing (7), the allotment's milestones (8 to 10), the smallholding's (11 to 14).
- The owner: agrees the baselines (the `needs-owner` issue this part opens); the ruleset on `main` requiring `check` and "Allow auto-merge" (noted in #1).

## When to stop and ask

- Only for something irreversible or outside this brief: repo settings, a change to the founding spec's model or carry-over rule, a new runtime dependency, or widening the slice.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question, the options and the default (the baselines are one such), and where the choice is between things the owner can look at, also publish a page that shows them with the default pre-selected and saves the pick where the session can read it back. Carry on with other work, look at the issue at each stopping point, and take the default after 12 hours with no answer. Say so in the PR.
- Where it's merely unclear, take the safer option (easier to undo, or changing the game less) and say so in the PR.

## Cost budget

- Estimate: about $15 (the bot, a workflow, tests and a baselines proposal with its page, and a wait for part 3 with one merge from `main`). Model `claude-opus-5-5` at high effort. Ultracode is allowed only for the fresh review before the PR opens; a workflow never pushes or opens the PR, and its cost counts against this estimate.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions (`coordinator` playbook §5 and §7).
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim or split what's left (the strategy test or the owner's page can move to a follow-up, with the coordinator's agreement).
