# One map, from a bed to the globe

Issue: #94 · Status: Approved (the owner, 30 Sep 2026) · PRs: #96 (the spike)

Longer than a page, and approved at this length: it changes how the founding spec's ladder is presented at every level (`docs/specs/overgrow.md`), so each part's brief builds one of its sections. The founding spec's model is unchanged: one graph at every scale, sealed nodes that carry their five numbers, carbon and land, and inflating any node from its totals on a seeded layout.

## What the player gets

The whole game is one map of one fixed, invented planet. Each level lets the camera pull further out, from a bed up to a 3D globe at level 8 that the player spins. Anywhere already reached can be zoomed back into, and at level 8 that means anywhere on the planet. There are no speed buttons: zooming out runs time faster, and the world slows to the pace of wherever the player is looking. Upgrades are bought where they go on the map, decisions redraw it, and history follows from them.

## The mechanism

Presentation and pacing over the existing model, with the new mechanisms each built as its own model under the usual rules (`docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`):

- **Soft power and political capital:** getting things done by attraction and favours called in, not command (Nye 2004); power spent on one thing is spent (Neustadt 1960); short-term popularity against long-term trust (Nordhaus 1975); food prices and unrest (Bellemare 2015).
- **Land that remembers:** inheritance splitting farms into strips; consolidation joining fields and grubbing out hedges (England lost about half its hedgerows in the decades after the Second World War, CPRE, with the Countryside Survey recording further losses from 1978); green belts (from 1955) holding villages apart.
- **History:** disaster risk as hazard × exposure × vulnerability (UNDRR); warming raising fire weather and storm strength (IPCC AR6); fisheries collapsing when fished faster than they regrow (Schaefer 1954; the Grand Banks, 1992) and the Cod Wars ending in a 1976 agreement.
- **Seasons:** each crop's year, and the spring green-up that satellites record in vegetation indices (the "green wave" in MODIS NDVI).
- **Simplifies:** one fixed, invented planet; places only watched are drawn from their totals rather than simulated; a skip runs every hour but shows them as a time-lapse.
- **Fast effect:** the camera and the clock respond at once. **Slow effect:** fields, towns, standing and history change over years.

## Where it sits on the ladder

Every level. The level a player has reached sets how far out the camera goes: the garden fence, the allotment, the smallholding's fields, the farm and its neighbours, the market town, the supply chain's region, the nation and, at level 8, the planet. Nothing beyond that limit is drawn, so the world is hidden rather than greyed out. Sealing, the carry-over rule and events across scales are unchanged; the step-up offer, the Rescued mark and events shown one level up sit on one world instead of separate screens.

## What they see

- **One continuous world, no visible layers.** Detail comes by its size on screen, as in a map app, never by level. A place inside another melts into its surroundings, and your plot has a small golden tag, not a box. The breadcrumb is the only sign of level, and a scale bar shows true widths, from a 2 m bed to the 13,000 km planet.
- **Land as organic parcels, drawn by code** (the owner, 1 Oct 2026, `docs/decisions/ADR-2026-10-01-organic-parcels.md`; it replaces the hex cells of 30 Sep). Land that was never laid out on paper, from the smallholding's fields out, is a seeded mosaic of irregular cells, no grid and no two alike; a field is any connected set of them, of any shape, next to fields of any kind. Beds, plots and planned streets stay straight. The cells are never drawn: the art is generated from the fields' outlines, traced and smoothed, then hedges, furrows at each field's angle, stock, woods, water, trees and birds. It is cached as a texture and redrawn only when a field changes or a season turns. How the nation and the globe are drawn is decided with level 8.
- **Everything joins up.** Paths, roads, motorways, rail, air routes and shipping lanes are drawn from flows. Factories work, and people walk, drive and commute, each from a real flow.
- **Decisions redraw the map.** Diet, where food comes from, fishing, how land is held and whether towns spread all change what's drawn, field by field over seasons.
- **The globe.** It is lit, with an atmosphere, clouds, cities, flights arcing above the surface and ships on their lanes. Drag or flick to spin it, tilt it to the poles, tap a continent to turn it to you, or use the arrow keys.
- **Seasons and lenses.** Every field follows its crop's year, so the green wave rolls north on the globe. Lenses resize each place by food grown, food eaten, carbon or hunger, and a flows lens shows the graph itself: food as streams, carbon rising.
- **History.** Fires, floods, storms, eruptions, fishing disputes and wars show where they happen, as hatching, cut routes, people leaving, patrol boats, treaties drawn as lines, and scars that heal over years. A chronicle records them, and each entry flies to its place.
- From 320 px portrait and landscape to large screens: pinch, drag and buttons for zoom, one chip at a time on a phone.

## How it works

1. **Why zoom in:** to act (your own nodes, at any depth), to trace a problem to its cause, and to learn how others do it.
2. **Looking and going down** share one clock set by the zoom. Looking changes nothing directly and saves nothing; going down acts through the place's own people and keeps it in the ladder.
3. **Where the detail comes from:** your own lineage is real history; everywhere else is split top-down from its parent's totals (the inverse of summing a node's children), sized so the children add back up, and built when the camera arrives. A carry-style check holds a generated place to its parent's totals within 5 %.
4. **One set of coordinates:** each level keeps its own units and says where its children sit; the renderer composes the frames into one zoom.
5. **Finding your way:** the breadcrumb, Home, pins you can fly to, and pinch or buttons on phones.
6. **Your standing:** zoom in below your level and your standing comes with you. Presence smooths things around the camera for free and fades when you leave. Nudges (Visit, Praise, Convene, Ask, Champion) cost standing and can last; they tilt people's goals and never set a lever you don't run. The reach grows with the gap between your level and the place's.
7. **Skips at levels 1 to 3**, where the camera can't go out far enough to hurry time. A quiet night still passes faster on its own, as today. When nothing needs you for longer, a chip offers "Skip" to the next thing that does: a crop ready, a sowing window, the honesty box empty, a frost. It runs every hour as normal, as a time-lapse of about 2.5 s (longer on a slow phone: never faster than the worker's steps come back). It stops at the first wake the sim records: a card waiting, an event starting, or a cause the notices would show, from a table in the sim, never read from the page. It goes at most 14 days, and isn't saved: a save taken during one keeps the hour reached.
8. **Upgrades on the map:** what can be bought stands as a ghost with its price where it would go. Tap it for its card, its Explain line and Buy. Suggestions glow with their reason. Panels shrink to cards opened from the thing on the map. Buying is the same command for the player, a manager and the bot.
9. **Everything that goes on:** fishing and overfishing, fish farming, volcanoes, earthquakes, mining for phosphate and potash, soil loss, aquifers, El Niño and the monsoon, pollinators, disease and locusts, deforestation, energy prices, biofuels, export bans, war and chokepoints, labour, diets, pandemics, subsidies and seed banks. Each is its own model, added with the level that first shows it, and reaches the garden through prices, supply, the warming index and people.
10. **Starting places:** the planet is fixed; the seed picks where a game starts. The first game always starts in Northland, and a choice comes only after a game is finished, so there is still no scenario choice at the start.
11. **Reaching down:** an upgrade below your level costs its own price, plus standing that roughly doubles with each level down (2^gap − 1: 1, 3, 7 … 127) and, from the town up, political capital that triples with each level you're on above it (3^(your level − 4): 3 at the town, 81 at the planet).
12. **Decisions earn and spend:** each lever carries an effect now on political capital (how it lands) and a yearly effect on standing (the trust it builds). Outcomes pay out again when they show on the map. Below the town only standing and goodwill move.
13. **History follows the decisions:** hazards come from the game's `Rng`, but their rates rise and fall with named factors (warming, cleared land, reserves). Tension between neighbours fills with food-price stress and contested resources, and drains with trade and treaties. A tension pin warns well before a war. You never start one; wars show through their effects on food and people, never the fighting.
14. **Land that remembers:** smallholdings split fields into strips; consolidation joins neighbouring fields up to about eighteen cells (a cell about a third of a hectare on the smallholding, larger further out), along the cells' own edges. Villages grow and join a spreading town, or build denser behind a green belt. The shape opens its own upgrades and choices, hidden until then:
    - consolidated fields: a combine, a silo, centre-pivot irrigation, hedge replanting, and a supermarket's contract;
    - smallholdings: a machinery ring, a farm gate stall, fruit trees, a veg box round, and a co-operative;
    - a joined-up town: a bus route, a food bank, a rooftop farm, and building up against building out;
    - villages kept apart: their own shop, an orchard and a food hub.
15. **It feels big:** true sizes, numbers that grow in the breadcrumb, life moving at every size, and your garden's golden mark findable from anywhere.
16. **Seasons and lenses**, as above; in the game lenses work at every zoom.

**The clock:** the zoom's rate is interpolated between the bands in log space.

| Zoom out to | A day takes |
| --- | --- |
| The garden | 12 s (today's 1×) |
| The allotment | 6 s |
| The smallholding | 3 s |
| The farm | 2 s |
| The town | 1.2 s |
| The supply chain's region | 0.6 s |
| The nation | 0.2 s (a year in about 73 s) |
| The planet | 0.06 s (a year in about 22 s) |

Wherever a day passes in under 8 s the light holds steady (`STEADY_DAY_S` in `src/ui/map/daylight.ts`, decision 22), so the allotment and everything further out keep a steady light. Pause stays.

**How long level 1 takes:** with no speed buttons, a garden year at 12 s a day, its quiet nights passing on their own, is at most about 53 minutes (today's 1×), less every skip taken. The bot reports the length with the skips it would be offered taken. If it comes out longer than 53 minutes, or the owner finds it long in play, the rates go back to the owner.

## Saved state

- The camera is a page setting on the device, not game state.
- Nudges, a place's parcel history (which cells joined or split, and when), the currencies at each level, and the chronicle are saved. Places only watched and untouched are rebuilt from their seed.
- The save version rises with each part that adds a field; an older save starts a new game, as before the first release.

## Balance

- `PLAY` on seeds 1–3 is unchanged by the camera, the clock and skips: the bot plays without a clock.
- Each level's pacing is judged at its widest view's rate. The bot's report adds each level's real-time length, the skips it would be offered, how often it reaches down, how much output came from standing, and the history each seed produced. The currencies' shares and the reaching-down curves start as written and are tuned from those.

## Checks

- Each part's Vitest tests for its rules: skips wake early and end where a watched week does; a generated place adds up to its parent within 5 %; a nudge never sets a lever; history repeats from a seed.
- Browser checks at 320 × 568, 568 × 320, 390 × 844, 844 × 390, 768 × 1024 and 1440 × 900: the camera between levels with no seam, the clock following the zoom, a ghost bought, the globe spun, a lens applied.
- Frame time and each one-off inflate within budget, measured against `main`.

## Files

- **New, in the parts that build them:** the camera and its frames in `src/ui/map/`, the land's parcels in `src/sim/land.ts` and their generated art in `src/ui/map/`, and the planet's data in `src/data/`.
- **New systems in `src/sim/`:** standing and currencies, skips, parcel history, and history's hazards and tension.
- **New models in `src/sim/models/`:** one for each mechanism in item 9.
- **Changed:** the clock loop (`src/app/clock-loop.ts`, the zoom's rate), the renderer, the top bar (no speed buttons; Pause), and the shop, garden and kitchen tabs (cards opened from the map).

## Build order

1. **The spike** (its brief in `docs/briefs/one-map-spike.md`): the garden and the allotment on one camera, the clock following the zoom, skips in place of the speed buttons at levels 1 and 2, a neighbour's plot opened in detail from its totals, and no visible layer between the two.
2. **Land built from organic parcels and drawn by code**, first ahead of its level (`docs/briefs/organic-land.md`), then with seasons, land that remembers and skips at level 3, starting with the smallholding's fields (part 11).
3. **Standing, presence and nudges, and decisions earning and spending** standing (from the allotment's goodwill) and political capital (from the town).
4. **Upgrades on the map** and reaching down, the shed's ghosts first.
5. **The wider world:** routes, factories and people from flows, settlements, the supply chain's region and the nation.
6. **The 3D globe** and the fixed planet's data with level 8, then lenses, history and everything that goes on, one model at a time, and starting places.

If the spike can't hold the frame and sim budgets, the ladder keeps its separate screens and this spec returns to the owner.

## Left out

- Simulating more than one place in detail at once.
- Changing things in places you only watch, beyond presence and nudges.
- Real maps, towns or people; the planet is invented and fixed.
- Starting or fighting wars.
- Any change to the carry-over rule.
