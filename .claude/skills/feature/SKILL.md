---
name: feature
description: Build a feature or change for Overgrow from issue to merged PR - spec, code, checks, screenshots, bot, docs. Use when asked to add, change or fix something in the game.
---

# Building a change

Work through these steps in order. Small fixes (a label, a nit, an obvious bug) can skip the spec; anything a player would notice as new gets one.

## 1. Start from an issue and a brief

- Find the issue for the work, or write one from `.github/ISSUE_TEMPLATE/` (Feature, Bug or Balance).
- A session starts from a brief (`docs/briefs/<short-name>.md`, from `docs/briefs/TEMPLATE.md`, checked by `node tools/brief.mjs`). Save the brief you were given there, in your PR.
- Read the issue's comments and its current state, not only its body, before you build or write the PR: the owner's answer may already be there.
- Branch from the latest `main`: `git fetch origin main && git checkout -b feature/<short-name> origin/main`.

## 2. Spec first

- Copy `docs/specs/TEMPLATE.md` to `docs/specs/<short-name>.md` and fill it in. Keep it to a page; the founding spec (`docs/specs/overgrow.md`) is the one exception.
- Check it against the owner's preferences in the project notes: no scenario choice, locked things hidden, impacts on the map, concise UK English, phones down to 320 px, managers for players who'd rather not.
- Say which level of the ladder it belongs to, which node type and flows it touches, and how it shows once that level is zoomed out (the founding spec's carry-over rule). A feature with no answer to that doesn't fit the game yet.
- Then follow it up the whole ladder, not only one level: start from its rows in the systems web (`docs/specs/overgrow/systems-web.md`) and answer the brief's "How it fits and grows" (`docs/briefs/TEMPLATE.md`). Say where it comes back higher up (an aggregate or a reversal on the web's spine), and name its seed below if it arrives at level 4 or above. Edit its rows in the web in the same PR. A dead end, a missing seed or a change to the founding spec's model goes to the owner as a proposal (`docs/decisions/ADR-2026-09-29-born-small-grows-up.md`).
- Name the real-world mechanism behind it and its sources (`docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`). No mechanism, no feature.
- Get the owner's approval before writing code, and mark the spec `Approved` when they agree. A brief that approves a spec in advance counts: mark it `Approved`, say so in the spec, and build.

## 3. Build

- Find the code with `node tools/graph.mjs <name>` (a system, file, function, name or check group), then read only what it lists.
- A new system is its own file in `src/sim/`; a model is its own file in `src/sim/models/` with its `// Sources:` and `// Simplifies:` header and a plausibility test beside it (`<name>.test.ts`); panels go in `src/ui/`, with every colour and size from `src/ui/styles/tokens.css`. Each file starts with a one-line `//` comment saying what's in it. Notes go in its own `docs/systems/` file.
- Everything that changes the game is a command through the sim (`src/sim/index.ts`); the UI, managers and the bot all go through it. The sim never names the DOM.
- New saved state: its field with a default. Until the first release, reshape saved state freely and raise `SAVE_VERSION`, with no migration; from the first release on, a migration step for older saves, and never rename or remove a saved field (`docs/decisions/ADR-2026-09-29-no-save-compatibility-before-release.md`).
- Randomness that can change the game draws from the game's `Rng`. `Math.random()` only on cosmetic lines ending with `// cosmetic`.
- `npm run dev` for a live page; `npx vitest` to watch the sim's tests while you work.

## 4. Prove it

- `npx vitest` and `node tools/check.mjs <group>` while iterating; the full `npm run check` before pushing.
- A model's plausibility test asserts the direction and rough size of its effect. A rule of the game gets a Vitest test; a rule of the page gets a check group in `tools/checks/` with an opening comment saying what it covers. Update any rule you changed on purpose.
- **Measure before you fix a layout bug.** Screenshot and measure (bounding boxes, computed styles) at every size first, then fix everything the measurement found in one pass. Final Call's #124 ran to five times its estimate fixing one geometry bug per round.
- A check that taps must tap on a touch page (`page.touchscreen.tap`), not click with a mouse; a control that shows or hides layout on `pointerup` eats the click that follows.
- A check for "many, not one" needs a case where there really are two, and every new check is shown failing before it is trusted (without the fix, or on `main`). A check that needs an event should cause it, not wait for the dice.
- To scroll a tall or variable-height target into view on a small screen, scroll to the smallest anchor that proves the section is reachable (its heading), not the whole thing.
- A new browser check group opens one page per size, not one per case: the CI job has a time limit and a slow group can cancel a publish.
- Look at UI at 320×568, 568×320, 390×844, 844×390, 768×1024 and 1440×900 with a Playwright script in `build/`.
- Run the full `npm run check` once as soon as the game code is in, not only at the end: the groups a change breaks aren't always the ones it names (Final Call, `lessons/166-release-f1-tips.md`). Stop a background run by task id or PID, never `pkill -f` with a pattern that appears in your own command.
- A check of an average over a window (Reliability or Health over 28 days) plays the window first: read too early, it sees the number still filling, not the rule (Final Call, `lessons/101-balance-rating.md`).
- **Advisers, tips and recommendations** (systems web, "Advisers, recommendations and Explain"). One that buys or does something says what makes it stop (a "replace with bigger" that buying never cleared would have looped for ever), and appears only when the player can act on it (nothing to upgrade past its top level, nothing that leaves the current goal unaffordable). Prove it with a scripted player that follows every tip and the goal bar, as well as the bot: Final Call's found a tip that took fares to 300%, a tip that fired for most of a run, and a wall no tip named (`ideas/release-audit.md` rows 1, 4, 5 and 26, `lessons/166-release-f1-tips.md`, `lessons/171-release-b1-pacing.md`).
- **Managers decide by measured value** (systems web, the same row's "let them decide" and the gardener): run the model with and without each option and take the best if it clears a threshold, one measurement per game step, all pinned to the moment the review began, so options measured apart compare fairly and it repeats from a seed and never stalls the worker; no hand-tuned threshold per lever (Final Call, `decisions/ADR-2026-09-26-managers-decide-by-value.md`).
- **The step-up card** (systems web, "The step-up at every level"): it opens even while the first-minute guidance is up, queued until that ends, never as a toast under it; and a goal for the next level shows its least-met requirement, not a count of levels (Final Call, `ideas/release-audit.md` rows 3 and 6).
- **Notices** repeat rarely: fold repeats by what failed, not by the message's shape (one fold hid several failures behind the first's code); expire them; clear a tip when it stops being true; and a cause shown only as a hover title also opens on a tap, since phones have no hover (Final Call, `lessons/92-polish-noise.md`, `lessons/101-balance-rating.md`). The map shows the impact first; the notice is the second thing.
- Pacing or economy: follow the `balance` playbook.
- If a check fails, reproduce it (pages are seeded, so it repeats) and fix the cause. Never weaken or skip a check to get green.

## 5. Keep the docs true

Never edit between the `joined` markers in `docs/LESSONS.md`, `docs/ROADMAP.md`, `docs/decisions/README.md` or `docs/SYSTEMS.md`: `npm run build` rebuilds them from the files.

- **The system's notes.** A change to how a system works updates its file in `docs/systems/`; a new system adds one (`# Name`, then how it works, naming its files). `node tools/check.mjs graph` fails on a broken link or a system that names no game files, and warns when a system's game file changed but its notes didn't.
- **The roadmap item.** Add or edit its own file in `docs/roadmap.d/` (`<date>-<short-name>.md`, first line `Section: now`, `next`, `runbook` or `done`): move it along by changing that line.
- **What's new.** A change players will notice adds `src/updates.d/<short-name>.md` (the format is in that folder's README), never a version number: the `release` playbook gives those.
- **Decisions.** Add a record in `docs/decisions/` if the change sets a rule other changes must follow.
- Re-read the project notes and the `steward` playbook after any merge from `main`: another session's process change can land under you.

## 6. A fresh review before opening

- Before `create_pull_request`, not after, start one fresh reviewer that hasn't seen the work: a helper agent (`Agent`) or the `code-review` skill, at medium effort. Give it the three-dot diff (`git diff origin/main...HEAD`; the two-dot form shows `main`'s newer commits as if you'd reverted them), the brief and the project notes, and ask for bugs; broken rules (the owner's preferences, saved fields, the layers, the seeded `Rng`, a model without sources, UK English); lines outside the diff the change makes wrong (the README, code comments, the project notes, `docs/SYSTEMS.md`); and anything in the PR's title or description the project notes don't allow.
- Describe any tool call a playbook tells sessions to make in its exact shape (which tool, which parameters), so the reviewer can check it against the tool's contract.
- Fix what you agree with. Say in the PR what the review found and what was fixed or left, without naming the tool or saying "AI" or "assistant".
- Helpers are for reviewing and reading, never for building, with one exception: a workflow (the Workflow tool, opted in with the word "ultracode") may fan out independent files inside this PR (one agent per model's plausibility test or data file) and may run this fresh review along its dimensions in parallel with a verify pass. A workflow never opens a PR, pushes, or writes files another part owns, and its cost counts against the brief's estimate.

## 7. Ship

- Commit with a short imperative subject in plain words; add a body when the reason isn't obvious. No attribution lines.
- `git push -u origin feature/<short-name>`, then open a PR with a plain title, filling in `.github/pull_request_template.md`. Open it as a draft while iterating if you expect several rounds; mark it ready for review before merging. Read the description back afterwards and remove anything the template doesn't have (a "Generated by" footer, a session link).
- Follow the `steward` playbook until the PR is merged.

## 8. Learn

- If a bug got through to players, add the check that would have caught it, in the same PR as the fix.
- Before the PR merges, look back at the session (the `steward` playbook) and commit it into the PR as its own file in `docs/lessons/`.

## Working while the owner is away

- Don't stop on a question the brief or the project notes already answer. Read them again first.
- If something is truly ambiguous, take the safer option (the one easier to undo, or that changes the game less), say so in the PR, and carry on.
- Stop and ask only for something irreversible or outside the brief.
- **The needs-owner queue.** When the owner truly has to decide, open an issue labelled `needs-owner` with the question, the options, and the one you'll take by default. Carry on with other work, look at the issue at each stopping point, and take the default after 12 hours with no answer; say so on the issue and in the PR, and close the issue.
- When the choice is between things the owner can look at (a layout, a style, a set of options with trade-offs), also publish a page that shows them with the default pre-selected and saves the pick where the session can read it back, and link it from the issue: the founding spec's ten choices and its art style were answered that way in minutes after an hour of silence on the issue.
- Read an issue's current state before writing about it: an owner's answer can overtake a brief's default.
- At each stopping point (a PR opened or merged, a spec written, CI back), read `get_session`. If `rate_limit_info` says "rejected" or `isUsingOverage`, schedule a `send_later` for a minute after `resetsAt` and end the turn.
- **The cost budget.** Compare `usage.cost_usd` with the brief's estimate at each stopping point; a 0 means not yet known, not free. Past twice the estimate, say why in the PR and in its lesson, and trim or split what's left.
- **One PR-sized item per session.** When an item merges, the session stops; the next item gets its own brief and a fresh session (the `coordinator` playbook). Keep two items in one session only when they share code and the second can be built while the first's CI runs.
- Run `git status` before committing and stage paths by name.

## A feature split across sessions

Worth it only when its parts can live in different files. Lay the shared structure first in one groundwork PR, merge it, and start every part from `main`, never from the unmerged groundwork branch. The `coordinator` playbook runs the parts; the first split feature also brings back Final Call's Parts workflow (`docs/decisions/ADR-2026-09-28-runbook-from-final-call.md`).
