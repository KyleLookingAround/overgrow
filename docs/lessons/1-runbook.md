Theme: runbook
# The runbook, from Final Call (#1) · 28 Sep 2026

- **Numbers:** estimate $25 for this PR and the spec together; `usage.cost_usd` not yet reported when this was written (a 0 or missing reading means not yet known). About 200k of 1M context by the time the PR opened. Session started 18:02 UTC, PR opened 18:19. Two commits: the runbook, then the fresh review's fixes. No merges from `main` needed (nothing else open). CI: see the PR.
- **Went well:** reading Final Call's tools and five playbooks once, then writing each file for Overgrow rather than copying, kept the port to 50 files with three check groups that pass in seconds. The fresh review before opening caught eight real problems, including one that would have mattered later: the Description workflow's job was named `check`, like the Checks job, so a ruleset requiring the `check` status could have been satisfied by the wrong workflow (the same clash is in Final Call).
- **Lessons:**
  - The graph check fails on any doc that names a file that doesn't exist yet, which a decision record listing what was left out does on purpose. Name left-out files without their folder (`bot.js`, not the full path), as that record does. No tool change: the check is right to be strict about links.
  - Final Call's `graph.mjs` never matched `.github/…` links (a `\b` before a dot), so broken workflow links there go unflagged. Fixed here in `tools/graph.mjs`; worth porting back to Final Call by one of its own sessions.
  - Final Call's Description job has the same `check` name clash; also worth porting back.
