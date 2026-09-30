Theme: spec
# The one map, designed with the owner and recorded (#94, #95) · 30 Sep 2026

- **Numbers:**
  - No brief or estimate: the owner asked for the redesign in conversation after part 9 merged, in the same session. The session's whole cost at the PR was about $79, part 9 included.
  - The design ran from about 18:30 to 20:45 UTC over about twenty of the owner's answers, each worked into two sketch pages the owner could open (an interactive map and a one-page spec). The owner approved at about 20:45; the PR opened at about 21:00.
  - One push after the fresh review, before opening. No merges from `main`.
- **Went well:**
  - **A live sketch settled design questions in minutes.** Each answer (a globe, the zoom as the speed, factories and people, standing, skips, upgrades on the map, hexes drawn by code) became something the owner could play with at once. Several were refined or reversed on sight: organic parcels, then organic-looking hexes, then back to organic, then hexes drawn by code.
  - **The founding spec's model held.** Nothing the owner asked for needed a change to the carry-over rule or the graph: the one map is presentation, pacing and new models over the same nodes.
- **Lessons:**
  - **A spec that moves a rule already in the code must quote the code's value.** The draft said the light holds steady below "about a second" a day; `STEADY_DAY_S` is 8 s, and the allotment already relies on it. The draft also left the founding spec, the systems web and a decision record saying the old rates. The fresh review caught both. → `feature` step 2 now asks a spec that changes an existing rule to quote the code's value and point the older docs at the change in the same PR.
  - **A sketch's words aren't the sim's.** "Stops for anything that would pin" read well on the sketch, but the sim can't see the page's badges. The brief now defines a skip's wake from causes the sim records.
