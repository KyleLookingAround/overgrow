# Brief: easy wins from Final Call

The owner (29 Sep 2026): Final Call, the airport sim this repo's runbook came from, has a knowledge graph of what worked in UX and UI design, multi-device support and game design; find the easy wins Overgrow can pull over from it, on any aspect of the game and its design. Overgrow may still take its own direction on anything. Before the full game is released the owner wants it to feel polished and well thought out in every way. This session reads and recommends: it builds no game code, while the first slice's parts build (part 3, crops and the gardener, and part 4, the bot, are running now).

## Goal and what it may touch

- **Deliver** one docs PR on `feature/final-call-wins` from `main`:
  1. **The wins** (`docs/ideas/final-call-wins.md`, a new folder for ideas not yet agreed): every easy win worth taking from Final Call, on any aspect (UX and UI, phones and screens, onboarding and the first minute, pacing and progression, cards and feedback, recommendations and managers, records and goals, accessibility, drawing and performance, the runbook: checks, tools, workflows, playbooks, the coordinator's habits). One row each: what it is, where it lives in Final Call (paths), why it fits Overgrow (or how it must change for a map-first, Preact and PixiJS game with light and dark themes), where it lands (which of the first slice's parts, from the founding spec's "The first roadmap", or the runbook, or after the slice), its size (S, M, L), and a recommendation (take now, take with its part, later, or no). "Easy" means the idea and its proof exist in Final Call and the cost here is small; say so where a win is valuable but not easy. Group by theme and put the ten best first. End with what Overgrow should not take, and why.
  2. **What the UI takes from Final Call** (`docs/decisions/ADR-2026-09-29-ui-from-final-call.md`, from `docs/decisions/` README's format): the UI and multi-device rules Overgrow adopts (write the layout check first and watch it fail; measure before fixing; check a row of controls, not only each; breakpoints by the map's and the panel's width, container queries; a real tap on a touch page; safe areas with `env(safe-area-inset-*)` and `viewport-fit=cover`; `dvh`/`svh` rather than heights from JavaScript; targets at least 40 px; wrap rather than ellipsis on touch; units always, chosen after rounding; step-up and level cards list only what unlocked, capped; impacts on the map, never toasts first) and what it doesn't (a manual notch band, a dark-only palette, 36 px targets, labels under 11 px, floaters at fixed map spots), each with its Final Call source. The coordinator's digest, below, is the starting point; check each point against Final Call's files before writing it down.
  3. **A polish audit before the first release** (`docs/roadmap.d/2026-09-29-04-polish-audit.md`, `Section: next`): a part before the founding spec's part 15 in which parallel read-only reviewers, each on one device or concern, drive the built game headless, return findings tables and a "checked and fine" list, and the part fixes what they find (Final Call's `docs/lessons/main-polish-audit.md` and `docs/lessons/106-launch-audit.md`). The coordinator briefs it when its turn comes. And its own roadmap item for this session's work (`Section: done` once merged).
  4. **The owner's pick.** Open an issue labelled `needs-owner` listing the wins with the default for each (the recommendation), and publish a page showing them grouped by theme with the defaults pre-selected, where the owner ticks or unticks each and saves, and the pick is saved where a session can read it back; link it from the issue and the PR. The coordinator reads the pick and folds the chosen wins into the parts' briefs; take the defaults after 12 hours with no answer.
- **Playbook wins.** A win that is only a line in a playbook (`.claude/skills/`, except `balance`, which part 4 is editing) and changes no check or tool may go straight into this PR; say which. Anything under `src/`, `tools/`, `.github/`, `package.json` or the project notes is a recommendation only: the parts own that code while they build.
- **It may touch:** `docs/ideas/`, `docs/decisions/` (the one record, and its line in the README if it isn't joined), `docs/roadmap.d/` (the two items), `.claude/skills/` other than `balance` (one-line playbook wins), `docs/briefs/final-call-wins.md` (this brief, saved as is) and `docs/lessons/` (its look back). Anything else is outside the brief.

## Read first

- The project notes, then `node tools/graph.mjs "The map and the page's shell"` and `node tools/graph.mjs build`, and only the files those list; `docs/specs/overgrow.md` end to end (it's the game's founding spec, and the wins are judged against it); `docs/decisions/ADR-2026-09-28-runbook-from-final-call.md` for what the runbook already took.
- Final Call, read-only: `GIT_LFS_SKIP_SMUDGE=1 git clone --depth 1 https://github.com/KyleLookingAround/final-call ../final-call` (public). Find your way with its own `node tools/graph.mjs <name>`; start from its project notes, `docs/SYSTEMS.md`, `docs/systems/`, `docs/lessons/` (each has a `Theme:` line), `docs/ideas/` (the release audit and the two polish lists), `docs/decisions/` and `tools/checks/`. Read what you need, not everything.
- The coordinator's digest of Final Call's UI lessons (29 Sep), as a starting point:
  - Top ten: write the layout check first and watch it fail (`docs/lessons/107-phone-topbar.md`); measure bounding boxes before fixing (`87-overlay-cards.md`, `124-polish-first-minute.md`); a row of controls needs a check on the row (107); breakpoints by the map's width with container queries (107, its `docs/SYSTEMS.md` "Views and phone layout"); measure the tab strip before adding a tab (`112-polish-where-to-look.md`); touch checks with a real tap (`100-photo-mode.md`); the toolbar's background lets taps through to the map; scroll to the smallest anchor that proves a section reachable (`88-masterplan-small-phone.md`); bring the first real moment forward and pin it with a check (`docs/decisions/ADR-2026-09-28-early-first-level.md`, `tools/checks/first-level.mjs`); a fresh review of the whole function a UI fix touches.
  - Also: budget fixed chrome at 320×568 (its release audit, row 33); icon-only tabs below about 380 px of panel; level-up card from the data that gates the game, capped at five and "and N more", pausing the game, queued behind a tour (`docs/systems/level-up-card.md`); one overlay style; the guided start never mentions UI the layout hides (`docs/systems/guided-start.md`); What's new as a bold lead and one sentence (`129-whats-new-card.md`); tips actionable, never hourly, cleared on a view change; one feedback pulse per batch (`159-release-p2-moments.md`); night visibly different; labels only when their anchor is on screen (`108-region-map-looks.md`); perf timed against a calibration run; a frame hash before a drawing refactor (`113-terminal-groundwork.md`); polish audits split by device with parallel reviewers.
  - Not to take: the manual notch band, the dark-only palette, heights from `innerHeight`, the one-page no-dependency rules, Canvas-specific batching thresholds, sound, labels under 11 px and 36 px targets, toast-first feedback and floaters at fixed map spots.

## Speed budget

None: no game code.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session itself, per the `steward` playbook: Squash and merge by hand once Checks and the Description check are green on the latest head and the look back is committed in the PR (until the owner adds the ruleset and auto-merge); it needn't wait for the owner's pick, which lands in the issue and the page. The Pages run may skip, since this changes only docs. Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged, the session stops.

## What's left for others

- The parts build the game from their briefs; the coordinator folds the owner's chosen wins into those briefs. This session never pushes to a part's branch or edits game code, tools, workflows or the project notes.
- The polish audit part is briefed by the coordinator before part 15.
- The owner: ticks the wins on the page (or the defaults stand after 12 hours).

## When to stop and ask

- Only for something irreversible or outside this brief.
- Otherwise, if it truly needs the owner: the `needs-owner` issue and the page above are the channel; carry on, and take the defaults after 12 hours with no answer. Say so in the PR.
- Where it's merely unclear, take the safer option (recommend rather than change; "later" rather than "now") and say so in the PR.

## Cost budget

- Estimate: about $8 (reading Final Call's lessons, ideas and systems, one report, one decision record, two roadmap items, a page and an issue, one CI round). Model `claude-sonnet-5-5`, the cheaper model, since this is research and docs (the `coordinator` playbook §5). No workflows.
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning` (the owner's instruction).
- Starting another session (`create_session`)? Don't: only the coordinator starts sessions.
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim what's left (the page can become the issue alone).
