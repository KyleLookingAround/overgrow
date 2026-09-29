---
name: coordinator
description: Run the other Overgrow sessions - the sweep at each check-in, starting and retiring sessions, talking to an idle one, the rate limit, and the lessons tidy. Use when coordinating several sessions, or acting as the coordinator yourself.
---

# Running the other sessions

## 1. Start fresh, retire the old one

- A coordinator starts fresh for each feature or wave, from a brief, never carrying over a finished one's conversation: a long conversation re-reads its whole history every turn (Final Call's coordinator of 27 Sep had cost $176 and used 642k of context over 25 hours).
- When a new coordinator takes over, it retires the old one: `list_triggers`, `delete_trigger` its heartbeat (§9) and any other Routine bound to it, then `archive_session`.

## 2. The sweep, at each check-in

- `list_sessions` (`mine: true`).
- For each live Overgrow session, `get_session`: `status_bucket`, `usage.cost_usd` against its brief's estimate, `context_usage.used_tokens`, and `rate_limit_info`.
- `list_triggers` for booked check-ins.
- Open PRs, with their check runs and mergeability.
- Open `needs-owner` issues, and any that have passed 12 hours.

## 3. Before a session merges

- Read its PR's title and description for attribution that shouldn't be there.
- Look for lines the change makes wrong outside its own diff: the README, code comments, the project notes.

## 4. Talking to a session

- `create_trigger` with `persistent_session_id` and `run_once_at` a minute or two ahead arrives as a user turn in an idle session.
- `fire_trigger` on a session's own one-shot check-in brings it forward; check `get_session` before firing again, since a call that answers "internal error" can still have fired.
- Never push to another session's branch: ask it. A PR description can be fixed directly.
- If the safety check on session tools stops answering, stop after two or three tries rather than running into the turn's limit; GitHub reads still work.

## 5. A cap on sessions

- At most about four default-model sessions at once; put the rest on the cheaper model (`create_session` with `model` set to the cheaper model's current id, from the owner) and stagger their starts. On `allowed_warning`, start nothing new unless the brief says to ignore it; on `rejected` or `isUsingOverage`, book a `send_later` for a minute after `resetsAt` and end the turn. Final Call's ten default-model sessions started within 45 minutes spent the five-hour allowance in 80 minutes and stalled every one of them for five hours.
- Small changes and routine jobs (look backs, save fixtures, doc moves, screenshot reviews) go to the cheaper model.
- Only parts that edit the same game code are ordered, in the spec's order of work. A refactor that changes what other files call runs in a quiet window, never alongside a wave of feature sessions.

## 6. Starting a session

- Write its brief from `docs/briefs/TEMPLATE.md` and run `node tools/brief.mjs` on it.
- Every brief carries "How it fits and grows", answered for what the part adds and naming its rows in the systems web (`docs/specs/overgrow/systems-web.md`); `node tools/brief.mjs` fails a brief without it. A gap the web shows (a mechanic with no destination, a late system with no seed, or a model that needs a hook to grow) goes into the brief of the part it belongs to.
- `create_session` with `source_url` (`https://github.com/KyleLookingAround/overgrow`), `source_revision: "main"`, `outcome_branch: "feature/<name>"`, a title, an `overgrow:<feature>` tag, and the model.
- First message: the brief, with one line asking the session to save it as `docs/briefs/<name>.md` in its PR.
- One item per session: when a session's item merges, it stops, and new work goes to a fresh session with its own brief.

## 7. One check-in, and helpers only review

- The coordinator keeps a single `send_later`; parts don't book their own. PR events and that check-in wake it, not polling.
- Helper agents (`Agent`, the `code-review` skill) review and read only; they never write code or push. Only the coordinator starts sessions, and only from a brief.
- An audit's reviewers are split by device or concern, run on the cheaper model, and each gets the same one-page primer (how to open a page, fast-forward, switch tabs and open cards, what to skip, the row format). They return their report as their final message, not as a file, with a "checked and fine" list beside the findings.

## 8. The lessons tidy

- Started by hand, never by a Routine: a Routine that starts a fresh session can't attach connectors in this organisation, so its session can't reach GitHub or the repo (Final Call's tidy Routine fired on 28 Sep and pushed nothing; #134 retired it).
- When a PR says 8 or more lessons are new since the last tidy (`node tools/join.mjs`), `create_session` on the cheaper model with a tidy brief: merge lessons that say the same thing, group them by theme (a `Theme:` first line), delete those out of date or already written in, spot-check that each → really landed, turn a lesson seen three times without a → into a change, and update `docs/lessons/.last-tidy`. It ships its own PR per the `steward` playbook.
- If a tidy PR (`feature/lessons-tidy-…`) is open, let it finish before starting another.

## 9. The heartbeat

- A coordinator running overnight books one hourly Routine bound to its own session: `create_trigger` with an hourly cron and **no** `persistent_session_id` (leaving it out binds the calling session; filling in your own id targets a different session). It needs no connectors, since the session it wakes has them, and it survives a usage-limit stall that kills a one-shot check-in.
- On each firing, end the turn at once if a check-in is already booked; otherwise run the sweep (§2).
