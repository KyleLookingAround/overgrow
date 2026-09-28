# Brief: coordinate the first slice

The founding spec (`docs/specs/overgrow.md`) is approved: the Back Garden, the Allotment and the Smallholding's first year, in fifteen PR-sized parts. This session coordinates them: it writes each part's brief, starts a fresh session per part, sweeps, and merges nothing itself. It builds no game code.

## Goal and what it may touch

- Run the first slice's parts in the spec's order ("The first roadmap"): one session per part, each from its own brief in `docs/briefs/<part>.md`, each on `feature/<part>` from `main`, each merging its own PR per the `steward` playbook. Parts 3 and 4 may run side by side once 2 has merged; 12, 13 and 14 once 11 has; everything else in sequence.
- It may touch: `docs/briefs/` (the parts' briefs), `docs/roadmap.d/` (moving items along), `docs/lessons/` (its own look back), and the playbooks where a lesson changes one. Nothing under `src/` or `tools/`: that's the parts' work.
- Before the first part, read the owner's design pages saved beside the spec: `docs/specs/overgrow/game.html` (the game described with diagrams) and `docs/specs/overgrow/art-styles.html` (the four art styles drawn; the owner picked flat top-down). Every part's brief points at the spec's section for it and its systems' rows in the systems map.
- **Workflows (the Workflow tool, opted in with the word "ultracode").** A part's session may use one in two places only: the fresh review before its PR opens (review the diff along the rules, the layers, the sources, UK English and the blast radius in parallel, then verify each finding), and a mechanical fan-out of independent files inside its own PR (one agent per model's plausibility test or data file). A workflow never opens a PR, pushes, or writes files another part owns. The coordinator itself uses none.

## Read first

- The project notes, then `node tools/graph.mjs createSim` and `node tools/graph.mjs rules`, and only the files those list.
- `docs/specs/overgrow.md` end to end, once: it's the founding spec and the only long one. Then the `coordinator` and `feature` playbooks.
- `docs/lessons/1-runbook.md` and `docs/lessons/3-game-spec.md` for what this repo's first day cost and why.

## Speed budget

None for the coordinator. The spec's speed budget (a garden day under 2 ms headless, a frame under 6 ms at 1440×900, 5,000 moving things under 8 ms on a mid-range phone, `dist/` under 500 KB gzipped) is divided among the parts in their briefs: part 1 measures the headroom and states the shares.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

Each part's session merges its own PR once Checks and the Description check are green and its look back is in, per the `steward` playbook (by hand until the owner adds the ruleset and auto-merge). The coordinator merges nothing and keeps the only check-in: `subscribe_pr_activity` on nothing, one `send_later` about 50 minutes after the last activity, then every few hours, per the `coordinator` playbook. Each part's session subscribes to its own PR.

## What's left for others

- The parts build the game; this session only briefs, starts and sweeps.
- The owner: the ruleset on `main` requiring `check` and "Allow auto-merge"; a `CATCH_UP_TOKEN` secret if they want Catch up's pushes to trigger `pull_request` runs. Both are noted in #1.
- Levels 4 to 8 each get their own spec after the slice has been played; not this session.

## When to stop and ask

- Only for something irreversible or outside this brief: repo settings, a change to the founding spec's model or carry-over rule, or a part that wants to widen the slice.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question, the options and the default; where the choice is between things the owner can look at, also publish a page that shows them with the default pre-selected and saves the pick where the session can read it back (that's what answered the spec's ten choices in minutes after an hour of silence on the issue); carry on with other work; take the default after 12 hours with no answer and say so in the PR.
- Where it's merely unclear, take the safer option (easier to undo, changing less) and say so in the PR.

## Cost budget

- Estimate: about $20 for the coordinator across the slice, and $15–25 per part (the founding session's runbook and spec together cost $50 against $25, because the owner designed in conversation; a part builds from a settled spec). Put each part's estimate in its brief.
- At each stopping point (a part started, a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. The owner has said to ignore `allowed_warning`.
- Starting another session (`create_session`)? At most about four default-model sessions at once, the rest on the cheaper model, starts staggered (the `coordinator` playbook §5); at this slice's pace that means one or two parts in flight.
- Past twice the estimate: say why in the PR and in the look back (`docs/lessons/`), and trim or split what's left.
