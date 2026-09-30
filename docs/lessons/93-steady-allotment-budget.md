# Scale the allotment day's budget by a garden day timed alongside it (#93) · 30 Sep 2026

- **Numbers:** made by the seventh coordinator, with the owner's leave to touch `src/`, at about 17:00–17:30 UTC. `main` had been red since #72 merged at about 14:25, and #72 wasn't on Pages.
- **Went well:**
  - **Measured before loosening.** On #79, #84, #88 and #72, an allotment day was 0.49–0.58 ms against a garden day of 1.15–1.35 ms on the same machine, about 0.43 of it every time. So nothing had got slower since part 8: the machine was slower than the one the 0.5 ms was set on.
- **Lessons:**
  - **An absolute budget in a test measures the runner, not the code.** Part 8 left the allotment day at 0.22–0.32 ms on its machine, and the shared runner reads about double. From then on the fixed 0.5 ms failed about one run in two, on PRs that didn't touch the sim: #90, #91 and #89, and `main` twice. → The test now scales the budget by a garden day timed in the same run, in alternating chunks, and keeps the budget's meaning: 0.5 ms where a garden day takes 0.675 ms. With all four cores loaded it passes at 0.72–0.81 ms against a budget of about 1.5 ms, where the old test failed every time. The quiet night's pace and the zoom-out's tap-to-skip remain the steady timing checks' part (the seventh brief's item 1).
