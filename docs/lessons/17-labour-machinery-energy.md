# Labour, machinery and energy models, ahead of part 13 (#17) · 29 Sep 2026

- **Numbers:** estimate $10; no cost figure had reached the session when the PR opened (read as unknown, not free). One commit before opening, one CI round expected. No `needs-owner` question: every open choice had a plainer option (below).
- **Went well:**
  - New files only meant no merge from `main` could conflict, and every wiring need went into the notes' "Wiring" sections instead of `graph.ts`: the graph already had `kWh`, `GBP`, `kgCO2e` and the `bought`, `grid` and `time` boundaries, so no unit or boundary had to be invented.
  - Checking each model against a second source (the game's own breakdown hazard times its bill against ASABE's repair curve; a heater's kWh against the cover's heat loss) gave the tests an independent anchor, and both agreed first time.
- **Choices taken by default, for the wiring part to revisit:**
  - Part 2's `structure()` is computed from organic carbon and clay, not stored, so compaction is a separate `compaction` lever on the field and `compactedStructure()` subtracts it; part 13 must make `soil.ts` call it (that file is not edited here).
  - Energy has no "used" boundary, so each burn lands in a node's running `energy.used` stock in kWh, with its carbon from `bought` to the air; a litre of diesel is carried as its kWh, and the litres are in the returned `Use`.
  - Standing loads and the purse's node (`'kitchen'`) are constants in `energy.ts`; part 13 passes `state.home`.
- **Lessons:**
  - The game starts at 06:00, so a test that wants a midnight (a `day` tick) starts an hour before 18 hours in, not 23: `runStep` from `h = 23` never fires `day`, and a stock the flow was to make simply isn't there.
  - `vite-node` is in `node_modules/.bin` and runs a throwaway timing script from `src/` in seconds; delete the script after (it lives in no PR).
