# Brief: tidy the lessons

The coordinator playbook (§8) starts a tidy by hand once a PR says 8 or more lessons are new since the last one. Part 8's PR (#79) counted 33 (`node tools/join.mjs`), and Overgrow has never had a tidy, so `docs/lessons/.last-tidy` doesn't exist yet.

## Goal and what it may touch

- **Deliver** one PR on `feature/lessons-tidy-2026-09-30` from `main` that leaves fewer, clearer lessons, grouped by theme, with anything learnt three times turned into a change. If a `feature/lessons-tidy-*` PR is already open, stop.
- **In that PR:**
  - **Merge** lessons that say the same thing into one file. Keep each source's PR number in its title or its Numbers line, and name the merged file after the newest source PR.
  - **Group** every remaining lesson under a theme, with a first line `Theme: <theme>`. Use short lower-case themes and reuse the ones already there (for example coordinator, checks, cost, tools, saves, specs, drawing, balance, parts) before adding one. If `tools/join.mjs` doesn't group `docs/LESSONS.md` by theme yet, leave the joining as it is and say so in the PR; changing `tools/` is outside this brief.
  - **Delete** lessons that are out of date (the tool, file or rule they describe is gone) or already written into a playbook, the project notes or a check. In the PR description, name for each where it now lives or why it's gone.
  - **Spot-check each →** (a lesson's "this changed X"): the change really landed. Where it didn't, make it in this PR if it's a playbook line; otherwise list it.
  - **Act** on a lesson seen three or more times without a →. Make the playbook change in this PR and mark the lesson →. If it's a rule the owner should decide, open an issue labelled `needs-owner` with the default you'd take, and link it.
  - **Record the tidy:** write `docs/lessons/.last-tidy` listing every lesson file left, one per line, sorted, and whatever `tools/join.mjs` reads to count new lessons (read it first and match it). Add this tidy's own look back as `docs/lessons/<pr>-lessons-tidy.md` (`Theme: tidy`): the lesson files before and after, and how many were new. List it in `.last-tidy` too.
  - **Save this brief** as `docs/briefs/lessons-tidy.md` in the PR, as given.
- **Files it may touch:** `docs/lessons/`, `docs/LESSONS.md` (only through `npm run build`; never edit between its `joined` markers), `.claude/skills/` (the playbook changes it makes), `docs/briefs/lessons-tidy.md`, and the roadmap item files in `docs/roadmap.d/` it affects. Nothing in `src/` or `tools/`, and no other file.

## Read first

- The project notes, then `node tools/graph.mjs coordinator` and `node tools/join.mjs` (it counts the new lessons), and only the files those list; `tools/join.mjs` itself, to see how it counts.
- `docs/LESSONS.md` for the shape of a lesson, every file in `docs/lessons/`, and the playbooks in `.claude/skills/`, to see what's already written in.

## How it fits and grows

It adds no mechanic and touches no system: no rows in the systems web (`docs/specs/overgrow/systems-web.md`). It keeps the lessons short enough that each session's playbooks stay true.

## Speed budget

None: no game code.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session squash-merges its own PR once Checks and the Description check are green, per the `steward` playbook. It changes nothing in the game, so Pages doesn't publish. Once the PR is open, call `subscribe_pr_activity` on it and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When the PR has merged, the session stops.

## What's left for others

- Don't touch the game, the roadmap's order or the ideas, and don't start other sessions.
- Three sessions may be building beside you (the UI overhaul #68, the map art #72, round four). They may add a lesson while you work; merge `main` before your last CI round and fold in any new lesson.
- A lesson that needs a bigger change than a playbook line goes in a `needs-owner` issue, not this PR.

## When to stop and ask

- Only for something irreversible or outside this brief.
- Otherwise, if it truly needs the owner, open an issue labelled `needs-owner` with the question and the default, carry on, and take the default after 12 hours. Say so in the PR.
- Where it's merely unclear, take the safer option and say so in the PR: keep a lesson rather than delete it when unsure.

## Cost budget

- **Estimate:** about $6: reading every lesson and the playbooks, one docs-only PR, one CI round (about 24 minutes).
- **At each stopping point** (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn.
- **Past twice the estimate:** say why in the PR and in its lesson, and trim.
