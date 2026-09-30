Theme: parts
# The garden's nutrients (Bug #47, #48) · 29 Sep 2026

- **Numbers:** estimate $10; $8.18 when the PR opened, about $10 at the merge. Session started 09:45 UTC, PR opened 10:16, no hours waiting on the owner; about half an hour waiting on the coordinator's answer on the pass mark. Four pushes before the merge of `main`, one merge from `main` by hand (part 6a: both had raised the save version to 5, so 6), no red CI runs before it.
- **Went well:**
  - Reproducing the diagnosis headless first (a 30-line `vite-node` script, seeds 1–3, kg picked a year and each bed's lowest P and K) matched the rotation notes' numbers exactly and made every step measurable in seconds.
  - Setting P and K to ten times index 4 gave the upper bound: seed 1's year three stays at 67 % with unlimited P and K, so no P or K choice could reach the brief's 70 % there. Knowing the ceiling stopped tuning towards a number the fix couldn't move.
  - The speed measure against `main` caught a real cost: splitting uptake into food and held flows each day cost 0.1 ms a garden day, five times the share. Holding it all in the plant and splitting it once, when the crop is done, brought it back to about 0.02 ms.
- **Lessons:**
  - A brief's pass mark for a check needs the check's ceiling measured first: a threshold the fix can't reach on one seed for reasons the brief leaves alone (here clubroot and nitrogen) forces the check's shape into a judgement call. → the `coordinator` playbook: a brief measures a pass mark's ceiling first.
  - A new flow a day on every bed is not free: per-day flows are the sim's cost unit. Measure a sim change's speed before writing its tests, and prefer moving a stock once at an event (a crop's end) over splitting it every day.
  - Steps 1 and 2 (the real mechanism) weren't enough on their own: a bed of radish after radish loses about 35 kg P a hectare a year whatever the heap returns, since half of it leaves as food. Index 4 postpones the fault for years; feeding (6c) is what ends it.
