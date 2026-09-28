---
name: feature
description: Build a feature or change for Overgrow from issue to merged PR - spec, code, checks, screenshots, bot, docs. Use when asked to add, change or fix something in the game.
---

# Building a change

Work through these steps in order. Small fixes (a label, a nit, an obvious bug) can skip the spec; anything a player would notice as new gets one.

## 1. Start from an issue and a brief

- Find the issue for the work, or write one from `.github/ISSUE_TEMPLATE/` (Feature, Bug or Balance).
- A session starts from a brief (`docs/briefs/<short-name>.md`, from `docs/briefs/TEMPLATE.md`, checked by `node tools/brief.mjs`). Save the brief you were given there, in your PR.
- Branch from the latest `main`: `git fetch origin main && git checkout -b feature/<short-name> origin/main`.

## 2. Spec first

- Copy `docs/specs/TEMPLATE.md` to `docs/specs/<short-name>.md` and fill it in. Keep it to a page; the founding spec (`docs/specs/overgrow.md`) is the one exception.
- Check it against the owner's preferences in the project notes: no scenario choice, locked things hidden, impacts on the map, concise UK English, phones down to 320 px, managers for players who'd rather not.
- Say which level of the ladder it belongs to, and how it shows once that level is zoomed out (the founding spec's carry-over rule). A feature with no answer to that doesn't fit the game yet.
- Get the owner's approval before writing code, and mark the spec `Approved` when they agree. A brief that approves a spec in advance counts: mark it `Approved`, say so in the spec, and build.

## 3. Build

- Find the code with `node tools/graph.mjs <name>` (a system, file, function, name or check group), then read only what it lists.
- A new system gets its own numbered file before `99-start.js`, starting with a `/* ===== what's in it ===== */` line, and its own notes in `docs/systems/`.
- New saved state: its line in the saved-fields table, with its default. Never rename or remove saved fields.
- Randomness that can change the game uses `rnd()`. `Math.random()` only on cosmetic lines ending with `// cosmetic`.
- Everything reachable from `update()` must work with `R.sim=true` (no DOM, no saving).
- Tests reach the game through `window.__sim`, which the build makes from every top-level name the tools use as `S.<name>` or `__sim.<name>`: there's no list to add to.

## 4. Prove it

- `npm run build`, then `npm run check -- <group>` while iterating and the full `npm run check` before pushing.
- Add a check for each new rule, as a new group in `tools/checks/` with an opening comment saying what it covers, or in an existing group; update any rule you changed on purpose.
- **Measure before you fix a layout bug.** Screenshot and measure (bounding boxes, computed styles) at every size first, then fix everything the measurement found in one pass. Final Call's #124 ran to five times its estimate fixing one geometry bug per round.
- Look at UI at 320×568, 390×844, 844×390, 768×1024 and 1440×900 with a Playwright script in `build/`.
- Pacing or economy: follow the `balance` playbook.
- If a check fails, reproduce it (pages are seeded, so it repeats) and fix the cause. Never weaken or skip a check to get green.

## 5. Keep the docs true

Never edit between the `joined` markers in `docs/LESSONS.md`, `docs/ROADMAP.md`, `docs/decisions/README.md` or `docs/SYSTEMS.md`: `npm run build` rebuilds them from the files.

- **The system's notes.** A change to how a system works updates its file in `docs/systems/`; a new system adds one (`# Name`, then how it works, naming its files). `npm run check -- graph` fails on a broken link or a system that names no game files, and warns when a system's game file changed but its notes didn't.
- **The roadmap item.** Add or edit its own file in `docs/roadmap.d/` (`<date>-<short-name>.md`, first line `Section: now`, `next`, `runbook` or `done`): move it along by changing that line.
- **What's new.** A change players will notice adds `src/updates.d/<short-name>.md` (the format is in that folder's README), never a version number: the `release` playbook gives those.
- **Decisions.** Add a record in `docs/decisions/` if the change sets a rule other changes must follow.
- Re-read the project notes and the `steward` playbook after any merge from `main`: another session's process change can land under you.

## 6. A fresh review before opening

- Before `create_pull_request`, not after, start one fresh reviewer that hasn't seen the work: a helper agent (`Agent`) or the `code-review` skill, at medium effort. Give it the three-dot diff (`git diff origin/main...HEAD`; the two-dot form shows `main`'s newer commits as if you'd reverted them), the brief and the project notes, and ask for bugs; broken rules (the owner's preferences, saved fields, `rnd()`, `R.sim`, UK English); lines outside the diff the change makes wrong (the README, code comments, the project notes, `docs/SYSTEMS.md`); and anything in the PR's title or description the project notes don't allow.
- Describe any tool call a playbook tells sessions to make in its exact shape (which tool, which parameters), so the reviewer can check it against the tool's contract.
- Fix what you agree with. Say in the PR what the review found and what was fixed or left, without naming the tool or saying "AI" or "assistant".
- Helpers are for reviewing and reading, never for building.

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
- Read an issue's current state before writing about it: an owner's answer can overtake a brief's default.
- At each stopping point (a PR opened or merged, a spec written, CI back), read `get_session`. If `rate_limit_info` says "rejected" or `isUsingOverage`, schedule a `send_later` for a minute after `resetsAt` and end the turn.
- **The cost budget.** Compare `usage.cost_usd` with the brief's estimate at each stopping point; a 0 means not yet known, not free. Past twice the estimate, say why in the PR and in its lesson, and trim or split what's left.
- **One PR-sized item per session.** When an item merges, the session stops; the next item gets its own brief and a fresh session (the `coordinator` playbook). Keep two items in one session only when they share code and the second can be built while the first's CI runs.
- Run `git status` before committing and stage paths by name.

## A feature split across sessions

Worth it only when its parts can live in different files. Lay the shared structure first in one groundwork PR, merge it, and start every part from `main`, never from the unmerged groundwork branch. The `coordinator` playbook runs the parts; the first split feature also brings back Final Call's Parts workflow (`docs/decisions/ADR-2026-09-28-runbook-from-final-call.md`).
