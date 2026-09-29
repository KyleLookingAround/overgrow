# The rotation and field-soil model, ahead of part 11 (#43) · 29 Sep 2026

- **Numbers:** estimate $10; well under it when the PR opened (no CI rounds yet). New files only, so nothing to merge and no bot run: nothing is wired, so `PLAY` can't change. Speed (ten fields a year, about 0.026 ms) is in `docs/systems/rotation.md`.
- **Went well:**
  - Diagnosing the garden's year-three fall by topping up one stock at a time at the start of year 3 (phosphorus and potassium, then nitrate) named the cause in three runs, on three seeds: phosphorus and potassium run out in year two and nothing returns them.
  - Running the plans in a scratch script before writing the tests set the numbers (take-all, potato cyst nematode, prices) so each trade-off turns where the brief says, and the tests then assert both sides.
- **Lessons:**
  - A leaching share taken over the soil model's 30 cm layer flushed 93 % of a winter's nitrate and hid the difference between bare and green ground: leaching needs the rooting zone (0.9 m), not the layer the other stocks use.
  - The graph test caught two flow bugs the pure tests couldn't (carbon flows not scaled by area, manure carbon counted twice): a model meant to be wired needs a stocks-match-flows test from the start.
  - Continuous wheat beat the rotation over five years until take-all was set to the size the sources give; check a strategy claim over the long horizon, not only the three years the brief names.
