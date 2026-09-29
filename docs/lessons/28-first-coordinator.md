Theme: coordinator
# The first slice's first coordinator · 28–29 Sep 2026 (#28)

- **Numbers.**
  - Estimate $20 for the whole slice; $21.24 and 628k of 1M context at the handover (8.5 hours).
  - Parts 1 to 4, the wins, and the first models-ahead session merged: about $87 against $108 estimated, every one under its estimate.
  - A five-hour usage limit ended a check-in at 22:02, and nothing woke the coordinator until 00:36.
- **Went well.**
  - Drafting the next part's brief while the current part's CI ran: each part started within minutes of the last merging.
  - Carrying the running plan in each check-in's prompt, so a resumed turn had it all.
  - Asking the owner directly when they were in the conversation: #11 was answered in a minute, where the issue waited.
  - The models-ahead track: three pure models built in parallel, in new files only, while part 5 edited the shared code.
  - Pasting Final Call's UI lessons into part 3 mid-build: it applied six of seven.
- **Lessons.**
  - **Book the heartbeat when the first part starts, not after the first stall.** → The `coordinator` playbook §9 should say so.
  - **Context runs out faster than cost.** The coordinator's context went mostly on `list_sessions` output (every session on the account, another project's too) and on full briefs pasted into prompts. → Use `get_session` on known ids. Paste a brief once. Hand over at about 500k or at the estimate, whichever comes first (the `coordinator` playbook §1).
  - **The owner designs in bursts while sessions run.** Record each decision at once in one list (this brief's), and pass on to a running session only what changes its current work.
  - **A first bot run finds design gaps, not just ranges.** Part 4's baselines showed no sales, a hungry kitchen and a rotation that didn't pay. → Run even a crude bot as early as the garden grows, before the parts pile on.
  - **A part's brief should say what the part before left undone.** Part 3 couldn't touch part 1's shell, so container queries and safe areas moved to part 5.
