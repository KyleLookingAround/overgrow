Theme: runbook
# Easy wins from Final Call (#14) · 29 Sep 2026

- **Numbers:** estimate $8; $4.34 when the PR opened (context about 250k of 1M), under the estimate. Session started 03:12 UTC, PR opened 03:23. Docs only, so no bot run and no speed budget; graph, brief and the joined lists checked locally, the full run left to CI.
- **Went well:**
  - Checking the coordinator's digest against Final Call's files before writing it into the record changed three of its points: `viewport-fit=cover` and `env(safe-area-inset-*)` are in Final Call (so they have a source), while `dvh`/`svh` and "impacts on the map first" are not (Final Call reads `innerHeight` and moved records to toasts), so the record calls those Overgrow's own and cites Final Call as the counter-example.
  - A read-only helper fact-checked about 60 claims before the PR opened and found ten small errors (a wrong file for a function, a button's label, a lesson cited for a figure it doesn't hold, an overstated Overgrow check). All fixed before opening.
  - The idea board's shape (one page, defaults ticked, saved as the owner goes) carried straight over to the pick page.
- **Lessons:**
  - The graph check reads any `docs/`, `src/` or `tools/` path in backticks in a decision record as a link to this repo, so a record citing another repo's paths fails it. The record gives Final Call paths relative to its own folders; the ideas file (not scanned) keeps the full ones.
  - The PR tool added its footer again; the read-back and edit removed it. A `Closes` line on a PR that is meant to merge before the owner answers would have closed the `needs-owner` issue early; it says the PR doesn't close it.
  - Reading a source for "does Overgrow already do this" (the format helper, the layout check's dark scheme) changed two rows from "already there" to "partly"; a claim about our own code needs the same check as one about theirs.
