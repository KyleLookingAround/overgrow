Theme: model
# The agency and committee models, ahead of parts 8 to 10 (#40) · 29 Sep 2026

- **Numbers:** estimate $10; cost about $3.50 when the PR opened, well under the estimate. New files only, so nothing to merge from `main` and no bot run: nothing is wired, so `PLAY` can't change. Speed measured in Node and noted in `docs/systems/agency.md` and `committee.md`.
- **Went well:**
  - Writing every lever as a trade-off that flips with one price (an audit pays when your hours are cheap and loses when they're dear; an honest helper beats doing it alone only when hours are dear) found no lever that won everywhere, and the tests state each both ways.
  - Making the neglected plot fall out of `weekGardenHours` (one household is the only lone full-time worker, so it has the least time) needed no script and no special case for the first zoom back in.
- **Lessons:**
  - A first tuning of the motions' appeals had the rota always passing and the bonfire ban never: appeals that look balanced one by one are lopsided against a real allotment's goals. Run each motion across sixty seeds before setting the numbers, and assert that each passes in some and fails in others.
  - An audit that teaches trust from the report it produces learns nothing, because watching itself narrows the report: the trust it teaches has to be measured against what they'd have said unwatched (`candour`), which the first test caught.
  - A test that prints a whole graph on failure floods the output: compare a small summary (`committeeOf`) rather than the nodes.
