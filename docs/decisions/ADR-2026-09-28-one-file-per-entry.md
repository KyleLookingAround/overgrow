# ADR-2026-09-28: One file per entry, joined lists, and Catch up

## Status

Accepted, carried over from Final Call's #94 (its record "Fewer clashes between sessions", 27 Sep 2026).

## Context

In Final Call, sessions working at once each added a line to the same lists (lessons, roadmap, decisions, the systems notes, the check list). Every merge to `main` conflicted every other open PR: one PR needed eight merges from `main`, and several look backs put most of a 2–5× cost overrun down to that chase (#46, #54, #64).

## Options Considered

### Option 1: Shared lists, merged by hand
**Cons:** the chase above.

### Option 2: One file per entry, with the lists built from the files
**Pros:** two sessions never edit the same lines; a conflict inside a built list clears by rebuilding it. **Cons:** a small tool (`tools/join.mjs`) to keep working.

## Decision

Option 2, from the start:
- `docs/lessons/<pr>-<short-name>.md`, `docs/roadmap.d/<date>-<name>.md` (first line `Section: now|next|runbook|done`), `docs/decisions/ADR-*.md`, `docs/systems/<system>.md`, `tools/checks/<group>.mjs` and `src/updates.d/<short-name>.md` are each one entry.
- `node tools/join.mjs --write` (run by `npm run build`) rebuilds the lists between `<!-- joined:… -->` markers in `docs/LESSONS.md`, `docs/ROADMAP.md`, `docs/decisions/README.md` and `docs/SYSTEMS.md`.
- The Catch up workflow merges `main` into open PRs when it moves, and clears conflicts that lie only inside the joined lists.
- Only a release gives a version number, folding the What's new fragments.

## Consequences

- Never edit between the `joined` markers; the `graph` check fails when a list is out of date or an entry is malformed.
- `window.__sim` and the list of check groups are found from the files, so a new check or system edits no shared tool.
