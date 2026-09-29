Theme: model
# The storage and market models, ahead of part 14 (#34) · 29 Sep 2026

- **Numbers:** estimate $10; cost not yet known when the PR opened (read as unknown, not free). New files only, so nothing to merge from `main` and no bot run: nothing is wired, so `PLAY` can't change. Speed measured in Node and noted in `docs/systems/storage.md` and `market.md`.
- **Went well:**
  - Calibrating each product's shelf life so the home stage matches the kitchen's own days (within 20 %) means part 14 can swap the kitchen's fixed days for the model without changing the garden.
  - Writing every trade-off as a test that goes both ways (potatoes held from autumn pay, salad doesn't; a dearer shop wins on a short shelf and loses on a full one; topping up a short box costs now and pays over two years) caught three settings where one option quietly won everywhere.
- **Lessons:**
  - A chain's losses by stage come out of the days each stage is given and how long a household takes to eat a purchase, not out of the shelf life alone: the first numbers had households wasting most of what they bought until the eating days and the shop's chilled shelf were set from how food is really bought. Check the whole chain's total (about 29 % here) against FAO before the shares.
  - A price that falls linearly with life stops storing from ever paying, even for potatoes; quality that holds until the produce turns (life cubed) gave the seasonal price room to win.
  - Cost of a lever tested over one horizon can hide its trade-off: the box's top-up loses over a month and wins over two years, so the test runs both.
