---
name: steward
description: Drive an Overgrow pull request to green and merged - reading CI failures, review comments, catching up with main, the look back and the merge. Use when watching or fixing a PR in this repo.
---

# Getting a PR to green

## Checks workflow (`checks.yml`)

- It runs `npm run check` on every PR that isn't a draft, and on demand; a newer push cancels the older run. Failure screenshots are in the `check-failures` artifact.
- Every page is seeded, so a failure repeats locally: `npx vitest run` for the sim, `node tools/check.mjs <group>` for a browser group. The build ships source maps, so an error in the built page names the source line.
- Fix the cause. Never skip, weaken or delete a check to get green, and never push an empty commit to re-run CI.
- A run that installs Chromium from scratch (a cache miss, or the first run after a version bump) is slower, not failed.
- GitHub runs no `pull_request` workflow at all while a PR's `mergeable_state` is `dirty`: a push with zero runs, not even queued, after a few minutes is a merge conflict with `main`. Check `mergeable_state` before waiting on CI.
- Read a PR's live checks from the PR itself (`pull_request_read` with method `get_check_runs`), not a separate runs listing, which can lag by minutes.

## Check-ins, not polling

- CI takes a few minutes. Subscribe to your own PR's events (`subscribe_pr_activity`) once it's open, and keep one `send_later` (about 20 minutes, or what the brief says) as the fallback in case an event is missed. Don't poll.
- If `rate_limit_info` shows the window close to running out, book the fallback for a minute after `resetsAt` instead: a check-in that fires while the limit is on is lost.

## Review comments

- Small, clear asks (a rename, a nit, a missing check): fix, push, and reply briefly.
- Bigger asks or design questions: propose an approach to the owner before changing course.

## Catching up with `main`

- The Catch up workflow (`catch-up.yml`) runs whenever `main` moves. It merges `main` into every open PR from this repo, rejoins the joined lists, and pushes if the merge was clean or the only conflicts were inside the joined lists. It never rebases or force-pushes. On a real conflict it comments once on the PR, naming the files, and leaves the branch alone. A PR labelled `no-catch-up` is left alone.
- Without a `CATCH_UP_TOKEN` secret, its pushes start no `pull_request` runs, so it dispatches Checks itself: read that run. The Description check runs again at your next description edit.
- So the branch on GitHub may be ahead of yours: `git pull --no-rebase origin <branch>` before you commit more, and never force-push over it.
- After its comment, merge by hand: `git fetch origin main && git merge origin/main`, resolve what it named, and push. A conflict inside a joined list needs nothing by hand: `node tools/join.mjs --write` rebuilds the list and clears it.
- Count the merges from `main` your PR needed, by you and by the workflow, for the look back.

## Before every push

- `npm run build` and `npm run check` pass locally. Don't run a build while a background `npm run check` is going (it reads the files the build rewrites); wait with one quiet waiter.
- The commit message is a plain imperative subject with no attribution lines; the commit hook enforces this.
- The PR title and description are plain and follow the template, with no tool names or editor-settings paths (the project notes). The Description check enforces this; read the description back once the PR is up. A link whose address contains the attribution pattern (an artifact page on the editor's site, for one) fails the Description check: put it in a PR comment, never in the description.

## The look back, before the PR merges

Every PR gets a short look back at the session that built it, committed into the PR itself before it merges (auto-merge can complete after the session's turn ends). Keep it to a few minutes.

1. **Numbers.** From `get_session`: cost against the brief's estimate, context used, when it started. Hours spent waiting on the owner. From the PR: when it opened, pushes, red CI runs, merges from `main` (by hand and by Catch up).
2. **Friction.** What slowed it or needed someone else.
3. **Record it** in `docs/lessons/<pr>-<short-name>.md`: `# Title · date`, then **Numbers**, **Went well** and **Lessons**, a line per lesson. Never add it to `docs/LESSONS.md` itself.
4. **Act on it** when a lesson would have saved real time or credits, or it comes up a second time: change the playbook, brief, check or tool that would have prevented it, in the same PR, and mark the lesson with → and where. Make sure the change is really there: Final Call's tidy (#131) found two → pointing at fixes nobody had written.
5. **The tidy.** `node tools/join.mjs` counts the lessons new since the last tidy. At 8 or more, say so in the PR; the coordinator starts the tidy (the `coordinator` playbook, §8).

## Done

Green checks, no conflicts, every review thread answered, and the look back committed. Then:

- **With a ruleset requiring `check` and "Allow auto-merge" on:** mark the PR ready, turn on auto-merge with the squash method (`enable_pr_auto_merge`), book one `send_later` to confirm the merge and the Pages publish, and stop.
- **Without them (today):** squash-merge it yourself (`merge_pull_request`, `merge_method: squash`, pinned to the head SHA you saw green), then confirm the Pages publish.
- Don't merge a PR that needs the owner's judgement: a balance change beyond the baselines' tolerance, or a spec question the brief doesn't settle. Say so in the PR, open a `needs-owner` issue with the default you'll take after 12 hours (the `feature` playbook), and carry on with other work.
