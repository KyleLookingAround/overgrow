# Brief: share what Overgrow and Final Call have learnt

The owner, 29 Sep: "Final Call may have some learnings. Have a session with it and vice versa to share knowledge." Final Call (`github.com/KyleLookingAround/final-call`) is the owner's first incremental game, built with the same playbooks since 26 Sep, and it has shipped 35 releases. Overgrow copied its playbooks at the start and has since learnt its own lessons. Each project should carry what fits from the other.

## Goal and what it may touch

- **Deliver two docs-only PRs**, one in each repo:
  - **Overgrow:** branch `feature/lessons-from-final-call` from `main`. Merge it yourself per the `steward` playbook.
  - **Final Call:** branch `feature/lessons-from-overgrow` from its `main`. Merge it per its own `steward` playbook, following its project notes and its Description check.
- **Access.** The session starts in Overgrow. For Final Call, call `add_repo` (owner `KyleLookingAround`, repo `final-call`, access `push`) and clone it beside Overgrow. If push access is refused, stop at Overgrow's PR, and say what you'd have written in Final Call's in Overgrow's PR description.
- **Read in each repo:** every file in `docs/lessons/` and `docs/decisions/`, the playbooks in `.claude/skills/`, and the project notes. Final Call's coordinator is writing its own look back for 29 Sep now, so check its `main` and open PRs for it before you finish.
- **Carry a lesson across only when all three hold:**
  - it applies to the other project;
  - the other project doesn't already have it;
  - it would have saved real time or credits there.
- **Where a lesson goes:**
  - a lesson that changes how the other project works goes in as a line in the right playbook, citing its source (repo and file);
  - one that's only useful context goes into a single lesson file in `docs/lessons/` in that repo, named after the PR, first line `Theme: exchange`.
- **List what you left out, and why:** in each PR's description, in a few words each (already there, game-specific, out of date).
- **What's worth carrying:**
  - From Final Call: the release audit; tips and advisers tested by a player who follows every tip; managers deciding by measured value; the step-up card; save slots; noise and notice rules; pacing and the long run; the watchdog and the usage limits; merge-chasing.
  - From Overgrow: the playtest before calling a level done; measuring a pass mark's ceiling first; the speed budget measured over the busiest stretch; unfolding as influence grows; one file per entry with joined lists; the brief checker (`tools/brief.mjs`); the systems web; a check-in about 30 minutes after starting a session.
- **May touch:** in each repo, only `docs/lessons/`, `.claude/skills/` and `docs/briefs/` (this brief, saved as is in Overgrow's PR). Never game code, checks or tools.

## Read first

- Overgrow's project notes, then `node tools/graph.mjs coordinator` and only the files it lists; Final Call's project notes and its equivalent (`node tools/graph.mjs brief`).
- Both repos' `docs/lessons/` and `.claude/skills/`.

## How it fits and grows

No mechanic: this is process knowledge. Where a Final Call lesson touches a system in Overgrow's systems web (`docs/specs/overgrow/systems-web.md`), such as advisers, the step-up card or notices, name the row in the playbook line so the part that builds it finds it.
1. **Born where.** Nothing: no game code.
2. **Across the ladder.** Nothing.
3. **Loops.** None.
4. **People.** The parts' sessions and coordinators read the playbooks.
5. **The lever.** None.
6. **The map.** None.
7. **Explain.** None.
8. **Economy and balance.** None directly. Pacing lessons go to the `balance` playbook.
9. **Carbon and land.** None.
10. **Polish.** Lessons on UI polish go to the `feature` playbook or the UI decision records.
11. **The lesson.** Two projects that learn from each other waste fewer credits.
12. **Unfolding.** None.

## Speed budget

None: no game code.

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> in both repos (check `git config user.email` in each clone).

## Who merges and when

The session merges both PRs, per each repo's `steward` playbook, once Checks and the Description check are green. Once each PR is open, subscribe to its events and end the turn. Don't book a `send_later`: the coordinator keeps the only check-in. When both PRs have merged, the session stops.

## What's left for others

- Don't change either game, and don't start other sessions.
- Final Call's coordinator writes its own look back for 29 Sep. Read it, but don't edit it.
- Lessons that would change the owner's decisions go to the coordinator in the PR description, not into a playbook.

## When to stop and ask

- Only for something irreversible or outside this brief. If one truly needs the owner, open an issue labelled `needs-owner` with the default, carry on with it, and say so in the PR.
- Otherwise take the safer option: carry a lesson as a lesson file rather than a playbook line when unsure. Say so in the PR.

## Cost budget

- Estimate: about $6: two repos' lessons and playbooks read once, two small docs PRs, one CI round each. Model `claude-sonnet-5-5`.
- At each stopping point, read `get_session`: `usage.cost_usd` against the estimate, and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn. Ignore `allowed_warning`.
- Past twice the estimate, stop at Overgrow's PR and say what's left.
