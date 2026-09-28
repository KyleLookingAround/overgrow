# ADR-2026-09-28: The runbook comes from Final Call, trimmed to an empty game

## Status

Accepted (the runbook PR, `docs/briefs/overgrow-setup.md`).

## Context

Final Call (`KyleLookingAround/final-call`) reached version 34 in three days with a runbook of project notes, five playbooks, briefs, specs, one-file-per-entry docs, 60 check groups and eight workflows, and 70-odd look backs recording what each part of it cost or saved. Overgrow starts empty. Copying all of it would bring rules for an airport, a save format with 30 fixtures and experiments measured on work Overgrow will never have. Copying none would repeat mistakes Final Call already paid for.

## Options Considered

### Option 1: Copy the whole pack (`npm run pack` in Final Call)
**Pros:** nothing forgotten. **Cons:** most of it names airport systems or version-34 machinery; every session would read rules that don't apply, and the checks would fail on files that don't exist.

### Option 2: Start from nothing
**Pros:** smallest. **Cons:** loses the rules the lessons proved (attribution, one file per entry, briefs with budgets, subscribe instead of poll, a fresh review before opening).

### Option 3: Port the shape, rewrite each file for Overgrow, and record the cuts
**Pros:** keeps what the lessons proved, drops what they record as costly, and each cut can come back when the game needs it. **Cons:** a few things will need adding later (listed below with what brings them back).

## Decision

Option 3.

**Kept, because Final Call's lessons proved them:**
- The attribution rules, the commit-msg hook, attribution off in the editor settings, and the Description check that strips a trailing footer itself (four look backs fixed that footer by hand before the check did it; `main-overnight-stall.md`).
- One file per entry for lessons, roadmap items, decisions, systems' notes, check groups and What's new fragments, joined by `tools/join.mjs`, plus the Catch up workflow. Before it, one PR needed eight merges from `main` and several ran to 2–5× their estimate on merge-chasing alone (#46, #54, #64, #94).
- Briefs from a template that `tools/brief.mjs` checks, with a dollar estimate and a rule past twice it (#36), the `needs-owner` queue with a 12-hour default, and one PR-sized item per session.
- Subscribing to a PR's events with one `send_later` as the fallback, instead of polling (`main-overnight-stall.md`).
- A fresh review before `create_pull_request`, not after (#47, #114, #124, #140), told to use the three-dot diff (#140).
- `tools/graph.mjs` and the `graph` check, trimmed to what an empty game has (files, names, check groups, the docs' links), so a brief can say "read only what this lists".
- A cap of about four default-model sessions at once, staggered starts, and nothing new on `allowed_warning` unless a brief says otherwise (`main-overnight-stall.md`: ten sessions spent the five-hour allowance in 80 minutes).
- Checks on `main` before Pages deploys, with a "main is red" issue.
- The lessons tidy at 8 new lessons, with #131's addition: spot-check that each → really landed.

**Left out, and what brings each back:**
- **Every airport system, spec, check group, save fixture and What's new entry.** Nothing in them applies. The founding spec names Overgrow's own.
- **Routines that start a fresh session** (the lessons tidy and watchdog Routines, retired in Final Call's #134): a Routine made from a session can't attach connectors, so its sessions couldn't reach GitHub. The tidy is started by hand; only a Routine bound to the coordinator's own session is used.
- **The Balance and Health check workflows, the bot (`bot.js`, `run-bot.mjs`), its `baseline.json` and `health.mjs`.** There's no game to play. The first slice adds the bot and its baselines, and the Balance workflow with them (the `balance` playbook says how).
- **The Parts workflow and the `part:` label.** No feature is split across sessions yet. The first split feature adds it, from Final Call's Parts workflow.
- **`touched.mjs`** (only the touched check groups on drafts). With three quick groups a full run is as cheap as a partial one; Final Call measured that fixed setup dominates a partial run anyway (#79). Bring it back when a full run passes five minutes.
- **Pending checks** (`pending.txt`). Useful for a checks-first feature; none is planned yet. Bring it back, with its lines in the checks runner, for the first feature whose checks are written before its code.
- **Link previews, the update-check toast, usage counts, the feedback and Ko-fi links, the page-size budget, `npm run pack`.** Each is a feature of a released game. Add them as the game grows, each from its own brief.
- **Save fixtures, the `migrate` check, `FIELDS` and `MIGRATIONS`.** Nothing is saved yet. The first slice that saves anything adds them; the rule that old saves always load holds from that first field.
- **Stacked PRs, groundwork-branch merges and refactor quiet windows** in the playbooks. They answer problems of many sessions on one big codebase. One line each stays in the `coordinator` playbook as a warning.
- **Launch-week release rules.** No launch yet.
- **A `CATCH_UP_TOKEN` secret.** It's the owner's to add; without it Catch up dispatches Checks itself, as in Final Call.

## Consequences

- Each thing left out comes back through its own brief, which names this record.
- The first slice's brief is the first test of the trimmed runbook; its look back says what was missing.
- The owner's preferences in the project notes are Final Call's, carried over as defaults for the owner to confirm in the founding spec's `needs-owner` issue.
