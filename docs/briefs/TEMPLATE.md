# Brief: <fill: item name>

Copy this file to `docs/briefs/<short-name>.md` for every session or part you start, fill in each section, and run `node tools/brief.mjs docs/briefs/<short-name>.md` before starting it. It fails if a section is missing or empty, if a `<fill: …>` is left, if "Read first" has no `tools/graph.mjs` query, or if the cost budget has no estimate in dollars. Give the finished brief to the new session as its first message, and commit it in that session's PR.

## Goal and what it may touch

- What the session delivers, in one or two sentences, and the branch: `feature/<fill: short-name>` from `main`, one PR.
- Files and hooks it may touch: <fill: files, shared hooks it may add>. Anything else is outside the brief.
- For a part of a split feature: its label, `part:<fill: feature>`, for the Parts workflow the first split feature brings back (the `feature` playbook).

## Read first

- The project notes, then `node tools/graph.mjs <fill: system, file or function>`, and only the files that lists. For a model, the founding spec's systems map entry and its sources.
- <fill: any spec, decision or lesson that matters>

## Speed budget

<fill: its share of the speed budget the spec sets (the `perf` check, once it exists), measured on `main`, or "None: no game code">

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

<fill: "The session, with Squash and merge once checks are green, then confirms the Pages publish. Subscribe to the PR's events (`subscribe_pr_activity`) once it's open and keep a `send_later` (about 20 minutes) as the fallback" or, for a part, "The coordinator, one part at a time; the part opens its PR, subscribes to its events and ends its turn">

## What's left for others

<fill: what this session must not start, and the owner's plan after it, passed on from the brief that started this one>

## When to stop and ask

- Only for something irreversible or outside this brief.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question and the option it will take by default, carry on with other work, look at the issue at each stopping point, and take the default after 12 hours with no answer. Say so in the PR.
- Where it's merely unclear, take the safer option (easier to undo, or changing the game less) and say so in the PR.

## Cost budget

- Estimate: about $<fill: dollars> (<fill: why: its size, how many CI rounds>).
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn.
- Starting another session (`create_session`)? Keep at most about four default-model sessions running at once, the rest on the cheaper model, starts staggered; start nothing new on `allowed_warning` (`coordinator` playbook §5).
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim or split what's left.
