Theme: build
# The land as organic parcels, built ahead (#94, #97) · 1 Oct 2026

- **Numbers:**
  - Estimate $35; about $15 at the PR, in the same session as the spike.
  - From the owner's "start the hex land part next" to the PR took about an hour and a half (00:55 to 01:15 UTC on 1 Oct, plus the brief and the decision before it). Two questions to the owner first: the land's look, and building it ahead.
  - One push of the scene and the art, one of its grounding in real figures, then the look back. No merges from `main` needed.
- **Went well:**
  - **Asking before building saved a rebuild.** The owner's "start the hex land" was answered with "I'm thinking organic again", which would have meant throwing a hex grid away. A two-option question settled organic parcels and the scope in one round.
  - **Building on cells kept the geometry simple.** Fields as sets of irregular cells made joins and splits set operations that conserve area exactly, and snapping the shared vertices gave neighbours, outlines and hedges from one table. The tests pinned all of it down in a morning's worth of code.
- **Lessons:**
  - **A model built ahead still owes its real mechanisms.** The first version of `land.ts` had no sources, no "Simplifies" and no plausibility test, because it isn't under `src/sim/models/` and so the `rules` check doesn't ask. The owner had to remind the session that the game is educational, with systems built around real life. Measuring the land against real small-field country (field sizes, hedge length a hectare, consolidation's loss) took ten minutes and found the model already plausible. → Treat any file that stands for a real thing as a model for the founding rule, wherever it lives, and say so in the brief's "Read first".
