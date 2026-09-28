# Overgrow: the founding spec

Issue: #2 (the owner's choices) · Status: Proposed · PRs: #3 (this spec)

The game's founding spec, from the owner's idea and the design agreed with them on 28 Sep 2026 (`docs/briefs/overgrow-setup.md`; the decision records `docs/decisions/ADR-2026-09-28-scale-free-graph.md` and `docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`). It's longer than a page because it sets the rules every later spec follows; each later feature gets its own one-page spec from `docs/specs/TEMPLATE.md`. Every choice the owner still has to make is in issue #2 with a default, and this spec is written to those defaults, marked *(default, #2)* where it matters.

## What the player gets

An incremental upgrade game about the food system that keeps zooming out, and an honest simulation of it underneath. **You never do the work yourself: you decide, and people do it.** In the garden you set the plan and buy the tools, and the gardener walks out and sows, waters and picks; on the farm the farmer and the hands do it; in the nation the law does it, through everyone. You start with two beds in a back garden, learning soil, water, pests and what grows when. Do that well and the garden becomes one plot on an allotment, where the problems are shared water, neighbours and surplus. The allotment becomes a field on a smallholding, the smallholding a farm, the farm a supplier to a market town, the town a link in a supermarket's supply chain, the chain a region of the nation, and the nation a country on the planet, where the climate loop your compost heap started finally closes. The skills carry over but the unit changes; the clock speeds up; now and then something fails far below and you drop back down to put it right through the people there. Every effect can be explained: tap it and the game names the mechanism and where it comes from.

## The model underneath everything

**Nodes.** A bed, a plot, a field, a farm, a herd, a shop, a depot, a town, a region, a country. Every node has the same shape whatever its size:

- **Stocks**, which persist and change slowly: land by use; soil (organic matter, nutrients, structure, water holding); water stores; standing crops and herds; food in storage, with age and temperature; money and kit; people (labour, population, diet, health, trust); the atmosphere's greenhouse gases and the warming they cause; knowledge (upgrades bought, laws in force).
- **Flows**, which move each tick and are conserved (nothing appears from nowhere), in SI units: water (litres), nutrients (kg N, P, K), carbon (kg CO₂e), food by product (kg), feed (kg), money, labour (hours), energy (kWh), waste (kg), pests and disease (a population), opinion (support points).
- **Levers**, what the player can pull at that level: a **plan** (what to grow where, when to water, what to do about slugs), an **upgrade** (a tool, a building, a machine), a **policy** (a rule the level's people follow) and, from the nation, a **law**. The same lever grows as you zoom out: "water below this moisture" → "share the trough by rota" → "irrigate or not" → "abstraction licences" → "water policy". The player never acts on a bed, a field or a lorry directly: the level's people do, under the plan, with the tools they have.
- **People have goals.** Everyone you delegate to (the gardener, a helpful neighbour, a farm manager, a buyer, an adviser, a lobbyist, a minister) has skills you can see, goals you can only infer from what they do (money, an easy life, status, their family, a belief: cheap food, the countryside, animal welfare, growth), and an integrity you can't see directly. A good manager with the wrong goal is the wrong hire: one who maximises this year's yield while you're rebuilding the soil. **Hiring is matching goals to the job**, a lever from the smallholding up. What they tell you is a report, not the truth: an adviser may recommend what pays them, a manager may flatter their own numbers, a buyer may skim. The map shows what's really happening if you watch, and the Explain card shows what the data says beside what the adviser says. The levers are watching, auditing (time and money), replacing, paying better, and from the town up regulating; trust lost recovers slowly. It starts small and mostly honest in the garden and grows with the stakes.
- **The people you don't choose.** From the town up, the people who matter most are chosen by others: the council by voters, the union by its members, the supermarket's buyer by the supermarket, the government by an election, other governments by their own people. Their goals can differ from yours, and they can reverse what you did. The levers shift from *choose* to *persuade, ally, trade favours, wait for the election, or change what voters want*. A minister elected on cheap food cuts your subsidy for hedges; you build a coalition with the health lobby, or bide your time.
- **Who the player is.** Not the minister. The player is the constant across governments, the steward of the food system at each scale: the one who plans the garden (the gardener is who does it), the plot-holder, the farmer, then the food lead of a town, a chain, a nation (a permanent official, not an elected one) and, at the planet, a body like the FAO. Governments come and go with elections and their goals with them; the job is good outcomes through whoever is in office, which is why the slow loops matter more than the fast ones.
- **Time is the first constraint.** Every level's people have so many hours; a watering-can round takes a morning, a hose half of it, drip lines none. **Money buys tools, tools buy time, time buys yield**, and a law at the top buys or costs the same things for a whole country. Labour hours are a flow from the first bed.
- **Delays** are the education. Soil takes years, forests decades, the climate a lifetime; prices move in days. Every model states its fast effect and its slow effect, and the Explain card shows both.

**The graph.** A level is a map of nodes with flows between them. At the level you're playing, you run your own nodes in detail; every node on the map, yours or not, carries the same totals. Other people's nodes (neighbours' plots, other farms, other countries) are generated from real-world ranges with the same shape and never had a detail level.

## The ladder

Eight levels *(how many ship at launch, and their names: default, #2)*. Each is built from the one below: the unit is the level below sealed into a node, and each adds the systems in **bold**.

| # | Level | A node is | The core problem | Adds | Clock at 1× (seconds per game day) |
| --- | --- | --- | --- | --- | --- |
| 1 | **Back Garden** | a bed | keep the soil alive and the plants watered, fed and unpicked-at; eat what you grow | weather, soil, water, crops, pests, waste, carbon (the compost heap, peat, the lawn), the kitchen as the first demand node, three hens | 24 s: an hour a second, a season in 36 minutes (9 at 4×) |
| 2 | **Allotment** | a plot | shared water, other people, surplus | neighbours as agents, the shared trough, the swap shed, pest spread between nodes, the committee (your first politics) | 4 s: a season in six minutes |
| 3 | **Smallholding** | a field | seasons, animals and labour: plan a year | rotation over years, livestock properly, labour, machinery, energy and fuel, the first market beyond the gate, spoilage on the way, hedgerows and pollinators | 1 s: a season in ninety seconds, a year in six minutes |
| 4 | **Farm** | an enterprise | weather risk at scale, and the buyer | insurance and credit, contracts and cosmetic standards, abstraction licences, precision inputs, animal disease, the full carbon account, seasonal labour, the union and the subsidy scheme | ⅔ s: a year in four minutes |
| 5 | **Market Town** | a shop, a market, a road | field to fork before it spoils, at a price both ends can bear | storage and spoilage by product and temperature, routes and vehicles, retail margins, local demand by income and habit, retail and household waste, redistribution, the council | ⅓ s: a year in two minutes |
| 6 | **Supply Chain** | a supplier, depot or store | demand spikes, the cold chain, waste at scale; you're now the buyer | logistics at scale, buyer power, imports as the standing substitute, packaging, the retail carbon account, depot labour, reputation | ⅙ s: a year in a minute |
| 7 | **The Nation** | a region | feed the country, keep it healthy and solvent, in a warming world, through governments you don't choose | diet and health, population and culture, the land budget, the national carbon account and target, water at basin scale, food security, trade deals; elections that change the government's goals; politics as the game | 1/30 s: a year in twelve seconds, a decade in two minutes |
| 8 | **The Planet** | a country | the climate loop closed; trade transmits every failure; politics is many governments | geopolitics, treaties and carbon prices, commodity prices, sea level, shifting crop zones, strategic imports, migration | 1/300 s: a year in 1.2 seconds, a century in two minutes |

- One rule for the clock: each level sets how many real seconds a game day takes at 1×, and every other figure follows from it. Speeds are pause, 1×, 2× and 4× at every level. The game doesn't run while the page is closed *(default, #2)*.
- One continuous save *(default, #2)*: finished levels are never replayed from scratch, only revisited by zooming back in.
- Nothing above the level you're playing is shown; the next level appears when its offer comes (locked things are hidden).
- **Politics exists at every level**, only its size changes: the neighbour over the fence, the committee, the parish, the union, the council, the lobby, the parliament, the treaty.
- **Carbon, land, water and waste are counted at every level from the first bed**, so the national and planetary accounts are sums of things the player already managed up close.

## The carry-over rule

**Sealing.** When the player steps up, the level they played is sealed into one node of the next level. A sealed node keeps the level's **totals**: its stocks summed (land by use, soil health as an index, water stored, food stored, money, herd size, emissions and sinks over the last cycle, jobs) and, over the last full cycle of the level's rhythm (the garden's last 28 days, the allotment's last season, the farm's last year, and so on), its **five headline numbers**:

| Number | Meaning | Unit |
| --- | --- | --- |
| **Output** | food delivered, by product mix | kg a day |
| **Quality** | how good it is, weighted by output | 0–100 |
| **Reliability** | how steady the output is: 100 × (1 − the coefficient of variation over the window), clamped | 0–100 |
| **Upkeep** | what it costs to run | £ a day *(currency: default, #2)* |
| **Health** | the slow stocks behind it, as one index (soil, water, kit, goodwill, herd) | 0–100 |

From the town up a node also carries **Freshness** (output-weighted shelf life, days) and every node carries its **carbon** (kg CO₂e a day, emissions less sinks) and **land** (ha by use).

**A sealed node keeps running by its totals alone.** Each tick of the level above: output = Output × (event modifiers) × (1 + noise), where the noise is drawn from the game's `Rng` with a spread of (100 − Reliability) % and averages to zero; Health drifts toward the plan the player last set for the node by at most one point a season, and each point of Health below 50 costs 1 % of Output; Upkeep is paid; emissions and land follow the plan. Nothing inside a sealed node is simulated in detail.

**Inflating.** Zooming back into a node rebuilds its detail level from its totals and its event, on a seeded layout, so the same node always looks the same. The detail level's first cycle reproduces the totals it was sealed with, within 5 % (the `carry` test).

**How events cross scales: the effect is kept, the detail is lost.** Every event has a home level, where it's hands-on, and a size, the share of a node's output it destroys over its duration if left alone. The expected food lost, in kg, is the same whichever level shows it:

| Where it shows | What the player sees | What they can do |
| --- | --- | --- |
| Its home level | the thing itself, drawn: aphids on the beans, a pump that won't start | change the plan or buy the tool, and watch the people act on it |
| One level up | the node's tile with the event's icon and "Output −20 % for 10 days" | a node-level action: buy biocontrol for the plot, send help |
| Two or more up | a regional tint and one line: "pest year in the east: veg −5 %" | policy: stock up, switch suppliers, change the mix |

A duration shorter than one tick of the level showing it is rounded up to a tick with its size scaled down, so the kg stay the same. Events never appear below their home level.

## Zooming back in

- **The trigger.** From the allotment up, when a shortage at the level you're playing (demand the map can't meet, or a price spike) traces mostly to one node (at least half the shortfall), the map draws the trace: a line from the shortage down the supply to the failing node, which pulses. At most once per game year per level, never in a level's first year. At the planet the trace runs all the way down: a country, a region, a chain, a farm, a field.
- **Dropping down.** Tap the node, then **Go down**. The camera dives in and the level below opens, inflated from the node's totals and its event. Players who'd rather not get **Send someone**: an adviser sets it right for a fee and half the reward.
- **What they fix.** The event at its home level, through that level's people and tools: see what the farm's plan and kit are, change them (cut out the blight, hire the hands, replace the cold store, fix the slurry store), and watch the farmer and the hands act on it.
- **How long the level above waits.** It doesn't pause: one clock, now running at the lower level's rate, so the level above barely moves. The rescue has a deadline in the lower level's days, shown as a strip across the top with the shortage still counting above. Ten real minutes in a garden is a month on the national map.
- **What they win.** The node's numbers come back and it earns a lasting mark: Reliability +10 and a **Rescued** badge. A rescue in time pays a reward at the level above (money, or its own currency: goodwill, reputation, political capital), bigger the faster it was done. A missed deadline fixes nothing; the shortage runs its course.
- The first zoom back in is scripted, in the allotment's first summer: slugs from a neighbour's neglected plot get into your own garden.

## The systems map

Each system names the real-world basis its models rest on; the model files repeat it in their `// Sources:` headers, and their constants are tuned inside the rough size those sources give (`docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`). "From" is the level where it's hands-on; above that it shows through the carry-over rule.

**The physical world**

| System | What it does | Basis | From |
| --- | --- | --- | --- |
| Calendar and climate | Real dates, latitude, day length, seasons. A weather generator from climate normals, shifted by the warming index the graph produces: hotter, wetter winters, drier summers, more extremes. | Met Office climate normals for a UK station; a stochastic weather generator (Richardson-type); IPCC AR6 for how warming shifts means and extremes | 1 |
| Soil | Organic matter, N-P-K, structure, moisture, biology. Fed by compost, manure, fertiliser, legumes, cover crops, rotation; drained by cropping, bare ground, erosion, compaction, leaching. Stores carbon. | Saxton & Rawls (2006) for texture → water holding; RothC in spirit for organic matter; RB209 for nutrients | 1 |
| Water | Rain → soil moisture → evapotranspiration by crop and weather; stores; irrigation and its energy; drought, bans, floods; quality downstream. Shared at every scale. | FAO-56 (Penman-Monteith, crop coefficients, the soil water balance) | 1 |
| Land use | Cropland, pasture, orchard, forest, margins, built. Changing it costs money and time, and moves carbon (clearing releases it, planting stores it slowly), biodiversity and water. | IPCC land-use guidelines for carbon stock changes | 1 (the lawn), 4 in earnest |
| Biodiversity | Pollinators, natural enemies, hedgerows and margins. Raises pollinated yields and suppresses pests; lost to pesticides, monoculture and clearing. | Klein et al. (2007) on pollinator dependence; UK agri-environment evidence on margins | 1 (marigolds), 3 |

**Growing food**

| System | What it does | Basis | From |
| --- | --- | --- | --- |
| Crops | Sowing windows, growth by degree days, stress from water, nutrients, frost and heat; yield and quality; harvest windows; perennials. | Growing-degree-day phenology; FAO-56 yield response to water; RHS sowing calendars | 1 |
| Livestock | Species by feed conversion, land and water per kg, methane, manure, welfare and stocking density, disease. The pivot of the diet question. | Poore & Nemecek (2018) for land, water and emissions per kg; IPCC Tier 1 enteric methane; FAO feed conversion ratios | 1 (hens), 3 |
| Pests, disease and weeds | Populations driven by weather and hosts; spread between neighbours and along trade; controls by picking, traps, biocontrol or chemicals, each with a cost in time and side effects. Animal disease closes borders. | Degree-day insect models; the Smith period for potato blight; UK slug and aphid guidance | 1 |
| Nutrients and fertiliser | The nitrogen cycle (fixation, synthetic from gas, manure, leaching, nitrous oxide); finite phosphate from few countries. Links energy prices to food prices. | RB209; IPCC N₂O factors; Haber-Bosch energy intensity | 1 (compost), 3 |
| Labour | Skills, seasonal peaks, wages, migration; mechanisation as the substitute. | DEFRA farm labour statistics; AHDB gross margins | 3 |

**Moving and selling food**

| System | What it does | Basis | From |
| --- | --- | --- | --- |
| Storage and spoilage | Shelf life by product and temperature; losses at field, store, road, shelf and home; the cold chain's energy. | WRAP food waste studies; Q10 spoilage kinetics; FAO global food loss figures | 3 |
| Transport and logistics | Routes, vehicles, fuel, capacity, disruption by weather, strikes, borders. | DfT road freight statistics; DEFRA emission factors for vehicles | 5 |
| Markets, prices and demand | Households with a diet mix by culture, income, prices, guidance, trends; retail contracts and cosmetic standards; seasonal and shock demand; imports as the substitute. | Price and income elasticities from the food demand literature; DEFRA Family Food | 1 (the kitchen), 5 |
| Trade and geopolitics | Countries with production, consumption, stocks, imports and exports by commodity; tariffs, export bans in shortages, chokepoints, conflict, aid. | FAOSTAT production and trade; the 2007–8 and 2010 export-ban episodes | 8 |
| Waste and circularity | Waste at every stage → landfill methane, compost, digestion or redistribution; by-products to feed. | WRAP; IPCC waste methane factors | 1 |

**Energy, carbon and climate**

| System | What it does | Basis | From |
| --- | --- | --- | --- |
| Energy | Fuel for machinery and lorries, electricity for pumps, cold stores and greenhouses, gas for fertiliser; on-farm renewables and digesters. | DEFRA and BEIS conversion factors; typical farm energy audits | 3 |
| Greenhouse gases | Emissions by source (fuel, clearing, ruminants, rice, manure, fertiliser, waste) and sinks (soil, trees, hedges), per node from the garden up, summed to the atmosphere. | IPCC AR6 and national inventory methods; Poore & Nemecek (2018) | 1 |
| Climate feedback | The gas stock sets a warming index (roughly linear in cumulative CO₂) that bends the weather generator, shifts what grows where, moves pest ranges, raises sea level against coastal land, and makes the harvest failures abroad the trade system transmits. | IPCC AR6 (TCRE, regional projections); crop-model yield responses to warming | 1 (counted), 7 (felt), 8 (closed) |

**People and power**

| System | What it does | Basis | From |
| --- | --- | --- | --- |
| Nutrition and public health | Diet mix → deficiencies, obesity, health cost; food security as access, affordability and days of stock. | The EAT-Lancet reference diet; NHS and ONS health statistics; DEFRA food security reports | 1 (the kitchen), 7 |
| Population and culture | Growth, urbanisation, income, food culture, trends (vegan, local, cheap), trust, media events. Sets demand and what policies people will bear. | ONS projections; survey evidence on dietary trends | 2 (neighbours), 7 |
| Agency and trust | Every agent has skills, goals and a hidden integrity; reports can differ from the truth; hiring, audits, replacement, pay and regulation as the levers; reputation and trust as slow stocks. Bad actors appear where the money is: a neighbour over-sharing your harvest, a manager flattering yields, a buyer abusing power, a lobby capturing a rule. From the town up the key people are chosen by others (elections, members, boards): persuasion, coalitions and timing replace hiring. | The principal–agent problem; regulatory capture; the Groceries Code Adjudicator (buyer power); coalition and veto-player models of policy; corruption indices at country level | 2 (a neighbour), 3 (hiring), 5 (people you don't choose) |
| Politics and policy | Levers by level (the committee's rota, the council's markets, the nation's subsidies, taxes, regulation, guidelines, land reform, the world's treaties). Every lever costs **political capital**, replenished by public support and spent faster against lobbies (farm unions, retail, the meat industry, campaigners) and at elections. The government in office has its own goals (from its manifesto) and can reverse laws; elections every few years change them; the player persuades, allies and times their asks. Policy reaches every node below as a modifier. | The Common Agricultural Policy and its successors; the sugar levy as a worked example; the political-capital model from the policy literature | 2 |
| Technology and upgrades | The incremental tree: tools, water butts, greenhouses, machinery, precision farming, cold stores, digesters, renewables, varieties, vertical farms, alternative proteins. Each costs money, unlocks by level, and has side effects the other systems feel. | AHDB and industry costings; life-cycle studies for alternative proteins | 1 |

**The game's own systems:** the ladder and sealing (above); advisers, recommendations and Explain (an adviser per level who recommends the plan and can be told to set it, for players who'd rather watch; recommendations that say why; an Explain card on every effect naming the mechanism and its source); events, mostly emergent from the systems above, with a few seeded scripted ones to teach.

**The loops that make it a game.** The diet loop (demand mix → herds versus crops → land, feed, water, methane → warming → yields and prices → demand; politics pushes, culture pushes back or runs ahead). The intensification loop (inputs → yields now → soil, water and biodiversity down over years → yields and regulation later). The trade loop (a failure abroad → imports dry up → prices → unrest → export bans → worse). The energy loop (a gas price → fertiliser and fuel → planting → next year's harvest). The waste loop (cosmetic standards and cheap food → waste → methane and lost land; policy and circularity claw it back). Steering the planet towards plant-based or towards meat is a real strategy with real trade-offs, felt at different speeds in land, emissions, health, prices and votes. And the agency loop: delegating buys time, every delegate has interests, watching and auditing costs time again, and a captured rule costs everyone.

## The first playable slice: the back garden and the step up to the allotment

**What ships first.** Level 1 complete and level 2's first season, built on the graph, not a garden-shaped special case: the node shape, flows in SI units, sealing, the carry-over rule, carbon and land counted from the first bed, the gardener who does the work, the Explain card, one adviser, and the bot.

**The garden.** A top-down garden behind a house: six beds (two dug at the start), a tap, a water butt, a compost heap, a shed, a lawn, a kitchen, and **the gardener**, who does everything you decide. They have about four hours a day for the garden (more at weekends); each job takes time with the tools they have, and what doesn't fit waits until tomorrow. You see them walk to each job and do it.
- **Soil per bed:** moisture (FAO-56 water balance, daily), fertility (N-P-K taken by crops, put back by compost and legumes), organic matter (rises with compost and cover, falls bare), health as an index.
- **Crops:** salad leaves, radishes, lettuce, beans, potatoes, tomatoes, each with a sowing window, degree days to maturity, a crop coefficient, a family for rotation, and the pests it draws. Frost kills tender crops; a cold frame shelters a bed.
- **Weather:** a mild UK year from early spring with seeded daily noise; drawn, never announced as text.
- **Pests:** slugs (at night, after rain), aphids (on beans; ladybirds if there are flowers), blight (potatoes and tomatoes in a Smith period).
- **Harvest and demand:** the kitchen wants about 1 kg of veg a day in a mix; surplus goes to an honesty box at the gate; unpicked crops bolt or rot to compost.
- **Carbon and land:** the compost heap stores and emits; a bag of peat compost costs carbon; digging the lawn is a land-use change. Shown on a small dial from day one, explained when tapped.
- **The plan** (the Garden tab): what to sow in each bed and when (or "follow the rotation"), the moisture below which the gardener waters, and the pest policy (leave, pick, trap, treat). The gardener follows it with the tools they have.
- **Upgrades** (the shed): tools that buy time (a hose, then drip lines; a beer trap, then nematodes; a wheelbarrow; a shed light for evenings) and things that buy yield (more beds, a bigger butt, a compost bin, a cold frame, netting, a hen house), each hidden until it's worth having, each with its time saved and its side effects shown before you buy.
- **Advisers:** recommendations on every tab say what's worth changing or buying next and why; "let them decide" hands a tab's plan to the adviser for players who'd rather watch. The first slice's advisers are honest; the first one with an interest is the seed catalogue on the allotment, whose recommendations favour its own seeds, and the Explain card lets you see that.

**The first minute.** No menu and no scenario choice: the page opens on the garden, early on a spring morning, day 1, with the gardener standing by the shed.
At 1× a game hour is a real second, so the first real minute is two and a half game days; the clock is paused while the first card is up.
1. 0–10 s (06:00, paused): a card offers the first plan: "Salad leaves in bed 1, radishes in bed 2" (or "let them choose"). Accept it and the clock starts.
2. 10–16 s (06:00–12:00): the gardener walks to the beds and sows, then fetches the can and waters both, a trip each; the soil darkens. Their card shows the day's hours ticking down.
3. 24–28 s (20:00–midnight): dusk; slugs creep onto the wet beds. The gardener goes out with a torch and picks them, slowly, and misses some. Tap a slug: the first Explain card (slugs, moisture, night).
4. 34–40 s (day 2, morning): green shoots, a nibbled leaf. The shed shows the first upgrade: a beer trap, cheap, "catches most slugs, costs no time". The goal bar shows "First harvest: 6 days".
5. 40–60 s (day 2 afternoon to day 3): a shower passes and both beds darken by themselves; the gardener stays in. The kitchen's first ask appears.
- First harvest on day 7, about three minutes at 1×; first sale a minute later; the beer trap and then the hose within ten minutes.

**What makes the jump feel earned.** The allotment committee offers a plot when your garden, sealed, would be a plot worth having: Output at least 1.5 kg a day and Reliability at least 60 over the last 28 days, with Health at least 50 *(proposed; set with the bot's baselines)*. The goal bar shows the three numbers moving, so a steady, healthy garden is visibly what's wanted, not one lucky harvest. It needs most of the garden's skills at once: a mix for steady output, rotation and compost for Health, pests kept down. The step-up card shows the garden shrinking into a tile with its numbers on it ("This is your plot now"), the camera pulls back, and the tile lands among eleven others. Straight away the old skills return as new problems: one shared trough with a daily limit, surplus to swap for what you can't grow, slugs from a neglected plot next door, and a committee vote on the water rota.

**The allotment's first season.** Twelve plots: yours plus eleven gardeners with names and habits (tidy, lazy, generous, competitive), each a node with the same totals. Your gardener now has a plot to keep and a trough rota to work round; you set their plan, take on a neglected second plot (and the hours it needs), swap at the shed, and vote. One neighbour offers to help with the second plot for a share of its harvest and takes a little more than their share, which the map shows and the totals don't; the first lesson that a report isn't the truth. The scripted zoom back in comes in its first summer.

## The simulation's state and time

- **Saved:** the level; the clock (game hours since the start); money; the ladder (each sealed node's totals and plan); the current level's graph (every node's stocks, flows last tick and levers); upgrades bought; laws in force; goals; settings; what's been seen; and the `Rng` state, so a loaded game plays on exactly as it would have. Versioned JSON in `localStorage['overgrow-save-v1']`, saved every game day and on leaving the page. Sealed nodes are compact (totals, not detail), so a save stays well under `localStorage`'s few megabytes through the ladder; the trigger to move saves to IndexedDB is a save over 1 MB, and the save module is written so that move touches nothing else.
- **Runtime only:** the camera, what's drawn (each slug, the rain, tile animations), panel state, totals rebuilt from the snapshot, toasts. Nothing in it changes play.
- **The worker boundary.** The page gets a full snapshot per tick today. At the planet a snapshot is thousands of nodes, and copying it every tick is the one real risk in this design: part 1 measures the cost at 5,000 nodes, and switches to snapshot deltas (only the nodes that changed) if a tick's copy passes 2 ms on a phone.
- **One clock.** Game hours since the start; each level sets how many a real second is worth (the ladder), times the speed. The sim advances in fixed steps of an hour (levels 1–2), a day (3–5), a week (6–7) or a month (8); systems register on the ticks (hour, day, week, season, year). Zooming changes the rate, never the clock.
- **Every action is a command** (`src/sim/index.ts`): a plan, an upgrade, a policy, a law. The panels, the advisers and the bot all go through `apply()`, so the bot plays exactly the game the player does. A tap on the map opens Explain or a node's panel; it never does the work. The page runs the sim in a Web Worker; the tests and the bot call it in Node.

## How the bot measures pacing and balance from the first build

- The bot (`bot.ts` in `tools/`, `npm run bot`) arrives with the garden, in the same wave. It plays through the same commands the player has, like a sensible player: a plan that sows in season and rotates families, a moisture line to water at, a pest policy, and the next upgrade at three times its price. It never touches a bed: the gardener does, in the sim.
- **It reports**, per seed (1, 2, 3): the game day of each milestone (first harvest, first sale, each upgrade, half the kitchen's need met, the allotment offer, the first swap, the second plot), the sealed garden's totals, money over time, food wasted, carbon, `PLAY` and `ERR`. The baselines file (`baseline.json` in `tools/`) holds a range per milestone; the `balance` playbook compares.
- **Proposed first targets** (agreed with the first baselines): first harvest by day 8, first upgrade by day 20, the allotment offer between days 55 and 75 (about 25 minutes at 1×), the allotment's first season in about 20 minutes more.
- **Strategy tests**, so no single trick wins: a rotating bot beats a one-crop bot by at least 10 % of Output by day 120; a bot whose pest policy is "leave" reaches the allotment later but still reaches it; a bot that hands every tab to the advisers reaches it within 25 % of the planning bot's day.
- **Conservation and carry-over tests:** water, nutrients, carbon and food balance across every tick; a sealed garden's Output matches its last 28 days within 1 %; an event's expected kg lost matches between its home level and one level up within 5 %.
- **The long run:** `src/sim/index.test.ts` grows to play a new game two game years headless through the step up.
- **The speed budget:** a game day of the garden under 2 ms headless in Node, a frame of the garden or the allotment under 6 ms at 1440×900 with everything moving, and a frame with 5,000 moving things under 8 ms on a mid-range phone, `dist/` under 500 KB gzipped without the map data. The slice adds the `perf` and `scene` checks that hold these.

## The look: a living map

- **One static page:** a map with Preact panels beside it (wide screens and tablets) or below it as a sheet (portrait phones), side by side on a phone on its side. Every colour and size in `src/ui/styles/tokens.css`, light and dark. Art drawn in code: flat, top-down, soft, a natural palette *(art style: default, #2)*. Real geography from Natural Earth at levels 7 and 8.
- **Things move.** The map is alive at every level, and the owner wants to see it: people, vehicles, food and animals moving, and every impact on the map first.
  - Garden: the gardener walking to the bed you tapped with the can, slugs at dusk, aphids clustering, bees and ladybirds when there are flowers, hens scratching, the cat, rain and frost crossing the beds, produce carried to the kitchen and the gate.
  - Allotment: neighbours walking their plots with barrows and cans, a queue at the trough in a dry spell, swaps carried between sheds, slugs crossing the path from the neglected plot.
  - Smallholding and farm: sheep and cattle grazing and moved between fields, the tractor ploughing and the harvester in the row, a van to market, the vet's car, contractors at harvest, a flood spreading over the low field.
  - Town and supply chain: vans and lorries on real routes, shoppers at the market and the retail park, pallets in and out of depots, a strike as parked lorries, a heatwave as queues for ice cream and empty salad shelves.
  - Nation and planet: freight along roads and rail, ships on trade lanes, a harvest failure as a region browning, a fuel shock as lorries slowing, weather systems crossing the map, sea level creeping into coastal fields.
- **Activities.** Beside its flows, the snapshot carries the level's activities: who is doing what, where, from when to when (the gardener watering bed 3 from 08:00 to 08:20; a lorry on the Leeds run leaving at 05:00; the harvester in field 4 today). The renderer animates from those and interpolates between snapshots. Things that are stocks rather than jobs (a herd of forty, the shoppers at a market, bees over the beans) are drawn from their totals with cosmetic randomness, seeded from the game's seed so a screenshot repeats.
- **The rule that keeps it honest: everything that moves is drawn from a flow or an activity the sim already has.** A route carrying 30 tonnes a day draws lorries in proportion; a herd of 40 draws 40 animals; a flow that stops (a strike, a closed border, an empty butt) stops the things that carried it. Nothing drawn changes the sim (it's runtime only, never saved), and nothing the sim does goes unseen: the impact of every decision and every event is on the map first and in the panels second. Dry soil pales, plants wilt, a shortage pulses red at the edge that lacks it, warming shifts the palette over years.
- **The renderer:** WebGL through PixiJS from the start, since the top levels draw thousands of moving things at once and a phone's Canvas 2D can't; Canvas 2D only as the fallback where WebGL is missing. The sim ticks in fixed steps in the worker; the renderer interpolates between snapshots, so movement is smooth at any speed. This is the fourth runtime dependency, with its own decision record (`docs/decisions/ADR-2026-09-28-webgl-map.md`).
- **The zoom-out** is the signature: on a step up the camera pulls back and the level shrinks into its tile on the next map; a zoom back in is the same move in reverse.
- **Access:** `prefers-reduced-motion` stops the interpolated movement (things jump per tick) and the zoom animations; every panel works by keyboard; the map's meaning is never colour alone (a badge or a pattern goes with each tint).
- **Explain:** tap any effect, badge or number for a card: what happened, the mechanism, its fast and slow effects, the source.
- **Layout:** a top bar (level, date, money, carbon dial, pause and speeds) and the map filling the rest. Tap targets at least 40 px on touch. Works at 320×568 and up, portrait and landscape, no sideways scrolling (the `build` check). Panels for the garden: Garden, Shed, Kitchen, Goals; a tab appears only once it has something in it.

## Choices re-examined

Each choice made on 28 Sep was looked at again with the whole spec in view. They stand, each for a reason:

| Choice | Stands because | Would change if |
| --- | --- | --- |
| TypeScript, strict, built by Vite | typed stocks, flows and units are what keep a planet-sized model honest across sessions; Vite builds a static site with no server | never |
| Vitest for the sim | plays years in milliseconds in Node; every model gets a plausibility test | never |
| The sim in a Web Worker, the same module in Node | a big graph never stalls the map; the bot and the tests run the identical code | the snapshot copy proves too costly and deltas don't fix it: then rendering moves into the worker too (OffscreenCanvas) |
| Preact for the panels | thirty-odd panels with Explain cards and tables need a declarative UI; React-shaped code is what sessions write most reliably; 4 KB | never |
| PixiJS for the map | thousands of moving things on a phone; interpolation and batching solved; one renderer from the bed to the globe | WebGL is missing on a target device: Canvas 2D fallback, fewer moving things |
| D3-geo with Natural Earth | real geography with no map service; a few hundred KB | never |
| `localStorage` saves | sealed nodes are compact; the checks seed saves through it easily | a save passes 1 MB: IndexedDB, behind the same save module |
| Real mechanisms, rough numbers | an educational sim that stays a game; every model sourced, tuned inside the rough size | never |
| The runbook from Final Call | briefs, one file per entry, the checks and the look backs proved themselves there | one thing done differently in hindsight: design the systems before porting the tooling, not after (`docs/lessons/1-runbook.md`) |

## Saved state

New at the first slice: everything under "The simulation's state and time". From the first saved field, old saves always load.

## Balance

No baselines yet. The first slice proposes them from the bot on seeds 1–3; the owner agrees them before they go into the baselines file. Constants are tuned only inside the rough size their sources give.

## Checks

The first slice adds: Vitest plausibility tests per model (water, soil, crops, pests, carbon), `conservation` and `carry` tests, a two-year headless run through the step up, the strategy tests above; browser groups `layout` (the sheet on phones, every size), `garden` (the first minute plays), `perf` and `scene`; screenshots at phone, tablet and desktop sizes.

## Files

New under `src/sim/`: `graph.ts` (nodes, stocks, flows, units), `clock.ts`, `ladder.ts` (sealing, inflating), `commands.ts`, `save.ts`; models in `src/sim/models/`: `weather.ts`, `soil.ts`, `water.ts`, `crops.ts`, `pests.ts`, `carbon.ts`, `kitchen.ts`, `neighbours.ts`, `committee.ts`; data in `src/data/`: `crops.ts`, `soils.ts`, `climate-normals.ts`, `upgrades.ts`; UI in `src/ui/`: the garden and allotment maps, the panels, the Explain card, the step-up card; the bot and its baselines in `tools/`; each part's tests and `docs/systems/` notes.

## The first roadmap

Each part is one PR, from its own brief, in this order. Parts 3 and 4 can build side by side once part 2 has merged; the rest follow each other.

1. **The graph and the clock:** nodes, stocks, flows in units, conservation tests, the clock and ticks, commands and snapshots, saving with versions, the page's shell (the WebGL map with interpolation between snapshots, top bar, panel, sheet) at every size. Checks: `conservation`, `layout`, `scene`.
2. **Weather, soil and water:** the weather generator (with the warming index input), the soil water balance, soil health; rain and frost crossing the beds, soil paling and darkening. Plausibility tests per model.
3. **Crops and the gardener:** growth, sowing, watering and harvesting done by the gardener under the plan, with their hours as the constraint and each job drawn; the kitchen's demand and the honesty box, with produce carried; carbon and land counted. Check: `garden`.
4. **The bot and the first baselines:** the bot in `tools/`, `npm run bot`, the Balance workflow, a proposed baselines file for the owner.
5. **Pests, wildlife and Explain:** slugs, aphids and blight moving on the map, and the gardener's pest policy (leave, pick, trap, treat) with what each costs in time and side effects; bees, ladybirds, the hens and the cat; the Explain card on every effect so far.
6. **The shed and the advisers:** tools that buy time and things that buy yield, each with its time saved and side effects shown before buying; recommendations and "let them decide"; the hen house; the goal bar and the first minute.
7. **Sealing and the step up:** the carry-over rule, the step-up card and the zoom-out. Check: `carry`.
8. **The allotment's first season:** the plots and neighbours, the trough, the swap shed, pests spreading, the second plot, the committee vote.
9. **The first zoom back in:** the trace, Go down or Send someone, the deadline and reward, on the scripted slug outbreak.
10. **The first release:** What's new, the version history, save fixtures and the `migrate` check, `perf` and `scene` for the speed budget, a link preview.

## Left out

- Levels 3 to 8: each gets its own spec once the slice has been played, keeping this spec's model and carry-over rule. The systems map above is their brief.
- Sound, a save code, progress while the page is closed, multiplayer.
- Real places, brands or live data below the nation *(default, #2)*; real countries and data from Natural Earth (public domain) and FAOSTAT (CC BY 4.0) at levels 7 and 8, and Met Office normals (Open Government Licence) for the weather, with each dataset's licence noted beside it in `src/data/`.
- Offline play through a service worker, and languages other than UK English.
- A fail state that ends the game *(default, #2)*: setbacks cost food, money and votes, never the save.
