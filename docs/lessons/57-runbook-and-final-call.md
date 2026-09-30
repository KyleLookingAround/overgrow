Theme: runbook
# The runbook and the exchange with Final Call (#1, #14, #57) · 28–29 Sep 2026

- **Numbers:** #1 estimate $25 with the spec, $17.26 at the rework, five commits; #14 $4.34 of $8, docs only; #57 about $0.25 read mid-session (unknown, not free), docs only.
- **Went well:**
  - Reading the sister repo's tools and playbooks once and writing each file for Overgrow, rather than copying, kept the port small (#1); the fresh review of the port caught eight real problems, including a Description job named `check` that could have satisfied a required `check` status by itself.
  - Checking the coordinator's digest against Final Call's files before writing it into the record changed three of its points (#14); a read-only helper fact-checked about 60 claims and found ten small errors.
  - Reading both repos' lessons through their "Lessons" sections was enough to sort what to carry (#57).
- **Lessons:**
  - A port from a sister repo carries its architecture by default: ask the owner what to keep before writing the setup, not after. → `docs/decisions/ADR-2026-09-28-runbook-from-final-call.md` lists what was changed, and why.
  - "No overflow" is not "in view": with `overflow: hidden` on the body a pushed-off element passes a scroll-size test. → the `build` check asserts the panel's bounding box is inside the viewport (`tools/checks/build.mjs`).
  - The graph check reads a backticked `docs/`, `src/` or `tools/` path as a link into this repo, so a record that names a file left out, not yet written, or in another repo fails it. → the `feature` playbook's notes step says to name those without their folder. Final Call's `graph.mjs` missed `.github/…` links and its Description job shares the `check` name; both are fixed here and worth porting back.
  - A claim about our own code needs the same check as one about theirs: reading the source changed two rows from "already there" to "partly" (#14).
  - What Overgrow carried from Final Call was mostly about environment and process, not the game; the new lines went into `feature` step 4, `release`, `balance` and `coordinator` (#57). Its relayed-message finding (a scheduled message saying "the owner said" proves the account, not the words) is the owner's to settle, so it isn't a playbook line.
  - The PR tool added its footer again; read the description back and remove it. A `Closes` line on a PR that merges before the owner answers would close the `needs-owner` issue early.
