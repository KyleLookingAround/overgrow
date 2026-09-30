Theme: model
# The models written ahead of their parts (#17, #18, #20, #30, #34, #38–#40, #43) · 29 Sep 2026

- **Numbers:** estimates $8–10 each, every one under it (the cost figures that arrived ran $2.40–$4.30 when the PRs opened; several read 0, meaning not reported). New files only, so no merge from `main` could conflict and `PLAY` couldn't change; speed in Node is in each system's note.
- **Went well:**
  - A pure `step()` over plain data, with the graph work in one small function, made plausibility tests cheap: a year of a herd is a loop (#18); sealed ticks and the offer's test as pure functions over `Totals` meant no edit to a shared file (#20).
  - Every lever written as a trade-off that flips with one price, horizon or seed found none that won everywhere, and the tests assert both ways (#34, #40, #43). → the `feature` playbook's step 4.
  - A second source for each model (the breakdown hazard against ASABE, a heater's kWh against the cover's heat loss) gave the tests an independent anchor (#17); probing first moved two constants inside the sources' ranges rather than loosening a test (#18).
  - Topping up one stock at a time at the start of year 3 named the garden's collapse in three runs: P and K run out in year two and nothing returns them (#43).
- **Lessons:**
  - The heap's `waste` stock holds `greens`, and the graph refuses a flow of another product into a stock that has one: manure travels as `greens` in its own stock (#18). Two models' gases can count the same manure twice, so a note says which route counts it.
  - A model meant to be wired needs a stocks-match-flows test from the start: the graph test caught carbon not scaled by area and manure carbon counted twice that the pure tests couldn't (#43). → `feature` step 4.
  - A chain's losses come from the days each stage is given and how long a household takes to eat a purchase, so check the whole chain's total (about 29 %) against FAO before the shares; a price that falls linearly stops storing from ever paying (#34). Leaching takes the rooting zone (0.9 m), not the 30 cm layer (#43). Continuous wheat beat the rotation until take-all was set to the size the sources give: check a strategy over the long horizon (#43).
  - A hook that adds a second representation of one fact (a herd's illness and its event) needs a test that changes the fact and checks both (#39); a brief that moves a window names who moves the bot's and tests' copies of it, since they sit outside the part's files (#39).
  - Appeals that look balanced one by one are lopsided against a real allotment's goals; an audit that teaches trust from its own report learns nothing (#40). A test that prints a whole graph on failure floods the output: compare a summary.
  - The footprint figures were rounded from memory and the note says so and asks the wiring part to check them (#30).
  - Test times: the game starts at 06:00, so a `day` tick needs a start that crosses 18 h in; the `rules` check reads "window" anywhere in `src/sim/`, even in a test title (#20; now in `feature` step 3). Anything quadratic in a test helper looks like a slow model: measure the model alone (#20). A reviewer's claim needs the same check as any other (#20).
