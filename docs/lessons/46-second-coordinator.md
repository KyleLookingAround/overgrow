Theme: coordinator
# The first slice's second coordinator (#46) · 29 Sep 2026

- **Numbers.**
  - Estimate $25 through part 15; about $10 and 380k of context at the handover (04:50 to 09:40), handed over early at a quiet moment.
  - Eleven PRs merged under it: part 5, the systems web, the spec answers, seven models written ahead and two of its own. The seven models ahead cost about $30 against about $66 estimated, every one under its estimate.
  - Part 5 went to $35.54 against $25; everything else stayed under.
  - A five-hour usage limit stopped three sessions at about 05:14. It reset at 05:20, but nothing woke them until 05:48.
- **Went well.**
  - Asking the owner directly, with the recommended option first: #29's fifteen questions were answered in one click, and a docs session had them in the founding spec within 25 minutes.
  - Running the models-ahead track three at a time on the cheaper model. Each finished in 30 to 45 minutes and $3 to $5, so the queue emptied while one part built.
  - Asking a models-ahead session to diagnose a known fault it didn't own. The rotation model's session found why the garden dies by year three (phosphorus and potassium never come back), with numbers and a proof, for $4.
  - Recording each owner decision at once: in the brief's list, the right playbook, and a one-line message to the one session it changed.
- **Lessons.**
  - **A session a usage limit stops stays stopped after the reset.** → The `coordinator` playbook §2 now says to send it a "carry on" message a minute after `resetsAt` (#33).
  - **Mid-build asks and repeated merges of `main` are what push a part over budget.** Part 5 took two new asks and three merges. → Put the whole ask in the brief. Tell a part to open its PR early and merge `main` once, before the last CI round (in 6a's and 6b's briefs, and the third coordinator's).
  - **A fault on `main` found by one part can hide for a whole wave.** The garden's year-three collapse was on `main` from part 3 and only surfaced in part 5's look back. → A long-run headless test should hold the kitchen's figures for years two and three, not only the two-year total; the nutrients fix adds it.
  - **Hand over when it's quiet, not at the limit.** Every turn re-reads the whole conversation, so the last 100k before a limit cost the most. → The third brief hands over at about 450k, at a moment with no merge due.
