# The systems web: every mechanic across the ladder

Issue: #27 · The owner's questions: #29 · Brief: `docs/briefs/systems-web.md` · Status: a companion to the founding spec (`docs/specs/overgrow.md`). Rows the spec settles are marked **S**, the owner's approved additions **O**, and this web's own proposals **P**. A proposal that would change the spec's model, ladder or carry-over rule carries a question number (**Q1**…) and waits for the owner's answer on the `needs-owner` issue, #29. Nothing is built on a **Q** until the owner answers. An unnumbered **P** is design inside the spec's rules, for the part or level spec that builds it to take or refuse.

The founding spec gives the ladder, the carry-over rule, the systems map and the loops, and says where each system is first hands-on. This web follows each mechanic up the ladder, level by level. It doesn't restate the spec or the owner's design page (`docs/specs/overgrow/game.html`). Every later brief answers "How it fits and grows" (`docs/briefs/TEMPLATE.md`) and points at its row here. A part that changes a row edits that row in its own PR; rows are separate lines, so parallel parts rarely conflict.

## How to read it

- **Levels:** 1 Garden, 2 Allotment, 3 Smallholding, 4 Farm, 5 Town, 6 Chain (the supply chain), 7 Nation, 8 Planet.
- **How it shows** (the carry-over rule's three ways, plus two this web adds):
  - **H**: hands-on. The thing itself is drawn, and the level's people act on it.
  - **N**: a node's number, one level up from where it's hands-on: Output, Health, an event's "−20 % for 10 days".
  - **T**: a tint and one line, two or more levels up.
  - **A**: it comes back as an aggregate that is hands-on again at this scale. For example, the town's demand is every household's basket summed.
  - **R**: it comes back reversed. The player now runs what they met below (the spine, below).
- **Each system's table** has these columns:
  - **Lv**: the level, with its marker.
  - **Shows · lever · who acts**: how it shows, the player's lever (plan, upgrade, policy or law), and whose hands do it.
  - **Drawn**: what's on the map, impact first.
  - **Seals as**: what a sealed node carries up. These are the five headline numbers (Output, Quality, Reliability, Upkeep, Health), plus Freshness, carbon, land and the summed stocks.
  - **Fast / slow · lesson**: its fast and slow effect, and the real-world lesson it teaches at that level.
- **Loops** are the spec's six: diet, intensification, trade, energy, waste and agency. Each system's loops are named once above its table and hold at every level; where a loop joins at one level only, the row's Fast / slow cell says so.
- **Unfolds when** (the owner, 29 Sep): the influence that first reveals the system's instruments (numbers, dials, badges, tabs, plan lines, levers) to the player at that level. See "Unfolding", below.

## The grid

What each system is at each level. A dot means it isn't there, and **s** means a seed: present but small, there to make the system legible when it arrives.

| System | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Calendar and climate | H | H | H | H | T | T | H | H |
| Soil | H | H | H | H | N | T | A | T |
| Water | H | H | H | H | N | T | H | A |
| Land use | H | H | H | H | N | T | H | H |
| Biodiversity | H | H | H | H | N | T | H | H |
| Crops | H | H | H | H | N | T | T | A |
| Livestock | H | s | H | H | N | T | A | A |
| Pests, disease and weeds | H | H | H | H | N | T | H | H |
| Nutrients and fertiliser | H | H | H | H | N | T | H | H |
| Labour | H | H | H | H | H | H | R | H |
| Storage and spoilage | s | s | H | H | H | H | A | H |
| Transport and logistics | s | s | s | N | H | H | T | H |
| Markets, prices and demand | H | H | R | H | R | R | A | H |
| Trade and geopolitics | s | s | s | T | T | H | H | H |
| Waste and circularity | H | H | H | H | H | H | H | T |
| Energy | s | · | H | H | H | H | H | H |
| Greenhouse gases | H | N | H | H | H | H | H | H |
| Climate feedback | s | s | s | s | s | s | H | H |
| Nutrition and public health | s | s | s | · | s | s | H | H |
| Population and culture | s | s | s | · | A | A | H | H |
| Agency and trust | s | H | H | H | H | H | H | H |
| Politics and policy | s | H | H | H | H | H | R | H |
| Technology and upgrades | H | H | H | H | H | H | H | H |
| Money, credit and insurance (**Q5**) | H | H | H | H | H | H | H | H |
| The household (**O**, **Q1**) | H | H | H | H | A | A | R | A |
| The ladder and sealing | H | H | H | H | H | H | H | H |
| Zooming back in | · | H | H | H | H | H | H | H |
| Advisers, recommendations and Explain | H | H | H | H | H | H | R | H |
| Events | H | H | H | H | H | H | H | H |

## Unfolding: the systems run, the player sees them as they gain influence

The owner (29 Sep 2026): "I don't want to overwhelm the player with too many things to look at from the start. The systems should still be running, just unfolding to the user as they have influence." This is settled by the owner, not a proposal. Each system table's last column says what reveals it at each level.

- **Everything runs from the start.** Every system in the grid runs from the first hour, and the living map shows its impacts from day one: the soil pales, slugs creep, the heap steams.
- **Instruments unfold with influence.** A system's numbers, dials, badges, tabs, plan lines and levers appear when the player first has a say over it: the first dry bed brings the watering line, and the first carbon choice brings the dial. They never appear greyed out, and never all at once. Each gets one first-time pulse and a short Explain card.
- **Levers are gated in the sim.** A command for a lever that hasn't unfolded is refused, so the bot plays the same game as the player.
- **Views are gated in the UI.** They unfold from the sim's saved `seen` state, through one table, `src/data/unfold.ts` (part 5 starts it).
- **Each level starts simple again.** A new level's instruments unfold as the player gains influence there, and sealed levels below show only their totals.

**Where it overrides the founding spec** (settled by the owner, not a question on #29):

- The garden's carbon dial is "shown on a small dial from day one" in the spec. It now appears with the first carbon choice: the first dig, a bag of peat or the first compost spread. The carbon is counted from the first bed either way.
- "Carbon, land, water and waste are counted at every level from the first bed." They're still counted. Each is shown when it unfolds.
- The spec's own rule that a tab appears once it has something in it, and the first minute's cards (the plan card, the first Explain, the beer trap on day 2, the goal bar), already unfold this way, so they stand.

## Pacing: never a long quiet stretch

The owner (29 Sep 2026): the game may take longer, so long as the player always has things to do and changes to make, with no long boring stretch. This is settled by the owner, not a proposal. So pacing across the ladder is judged by **the longest quiet stretch**, the longest real time with no decision to make, unlock to use, harvest to place or event to answer, and not only by when each milestone lands. The bot's baselines (the `balance` playbook) take it as a measure beside the milestones.

Each level's steady supply of small decisions:

| Lv | Where the small decisions come from | What would make a quiet stretch |
| --- | --- | --- |
| 1 Garden | Each bed emptying and wanting a new sowing; harvests to eat, sell or swap; the watering line in a dry spell; slugs after rain; the next shed tool as the purse fills; the week's shop against what's ripe | A bed of slow potatoes and nothing else sown; midwinter with nothing in season (the cold frame and overwintering crops fill it) |
| 2 Allotment | The second plot's reclaiming; swaps as neighbours' gluts come and go; the trough rota in a dry spell; the three committee votes; the partner's work-or-help choice; pests from next door | A season between votes with both plots settled (swaps and neighbours' events fill it) |
| 3 Smallholding | The year plan's sowing and harvest windows; the flock's feed, the vet and lambing; the box scheme's weekly contents; the hand's hours at harvest; the tractor's service and breakdowns; the parish's forms | Midwinter on the fields (the flock, the box scheme and the planning forms fill it) |
| 4 Farm | The buyer's contracts; weather losses and insurance; disease scares; seasonal pickers; the scheme's options; licences in a dry year | A year with no contract to renew (the market's weekly prices fill it) |
| 5 Town | Market days; spoilage and stock; routes; the council's votes; the food bank's surplus; the heat or cold moving demand | A steady week of sales (weather and council business fill it) |
| 6 Chain | Weekly buying rounds; promotions; supplier failures; the cold chain; reputation events | None expected: buying is weekly |
| 7 Nation | Bills and political capital; elections; the diet, land and carbon budgets; droughts and price shocks; the zoom back in | A government's quiet middle years (lobbies, events and the next budget fill it) |
| 8 Planet | Treaties; price shocks and export bans; failed harvests abroad; warming's slow turns | Decades passing in minutes with nothing to answer (events traced down the ladder fill it) |

## The physical world

### Calendar and climate

Loops: diet (yields and prices), energy (heating and cooling), trade (failures abroad). Spec: from 1.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · S | H: the day's weather over six beds. The only lever is cover (a cold frame), put on by the gardener. | Rain, frost's rime, the soil paling and darkening | Reliability (the weather's noise), Health's water part | Fast: a frost kills the beans overnight. Slow: none yet, since the warming index is a few kg. Weather is not climate; sowing follows the season. | Weather is drawn from the first hour; the temperature and forecast show when the first frost threatens a tender crop, and the cold frame's lever with it |
| 2 · P | H: the same weather over twelve plots at once. The lever is the trough rota. | A queue at the trough in a dry spell | Reliability falls because every plot's bad weeks coincide | Fast: a dry week hits everyone. Slow: none. Risk that everyone shares can't be spread across neighbours. | With the trough: the dry-spell queue first, the rota's lever with the first vote |
| 3 · S | H: weather windows for field work, and the flood on the low field. The lever is the year plan; the smallholder acts. | Tractor idle on a wet day; water spreading over the low field | Reliability; flood events | Fast: a wet autumn delays drilling. Slow: a field that floods every few years. Workable days, not the calendar, set the farm year. | The year plan's weather windows with the first field to drill |
| 4 · S | H: weather risk at scale. The levers are insurance, drainage and crop choice; the farmer acts. | Hail crossing fields; a flood | Event sizes; Reliability | Fast: a hailstorm's loss. Slow: the insurance premium rising. A farm's income swings with the weather more than with effort. | Insurance's lever with the first weather loss on the farm |
| 5 · P | T for farms' weather; H for the town's own. Heat moves demand. The lever is stock policy; shop managers act. | Queues for ice cream, empty salad shelves (settled: the spec's map list) | Freshness; demand spikes | Fast: a heatwave's salad rush. Slow: none. Weather moves demand, not only supply. | The heat-demand line with the first heatwave the market sees |
| 6 · S | T: regional tints and one line. The lever is spreading suppliers; the buyer acts. | A region browning | Reliability of each supply route | Fast: a shortage. Slow: supplier choice. Diversify sourcing across regions. | Regional tints with the first shortage traced to weather |
| 7 · S | H, felt: the warming index shows at last as hotter summers and drought years. The lever is adaptation law (reservoirs, variety research); ministers and agencies act. | The palette shifting over years; the drought map | The nation's yields and water | Fast: a drought year. Slow: the means shifting. Extremes arrive before the mean shows (IPCC AR6). | The warming readout with the first drought year felt |
| 8 · S | H, closed: the planet's air sets warming for everyone. The lever is a treaty; governments act. | Weather systems crossing the map; sea creeping in | Every country's yields | Fast: a failed harvest abroad. Slow: decades of warming. Warming follows cumulative CO₂ (TCRE); the compost heap's loop closes here. | Always shown: warming is the planet's headline |

### Soil

Loop: intensification. Spec: from 1.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · S | H: each bed's moisture, organic matter, N-P-K and health. The levers are compost and rotation in the plan; the gardener spreads and sows. | Soil colour; the gardener with a bucket of compost | Health (the soil part), carbon | Fast: a dry bed wilts a crop. Slow: organic matter builds over years. Soil is alive and slow. | Moisture shows with the first watering choice; organic matter and N-P-K when the first crop shows stress or the first compost is ready |
| 2 · P | H: your plot's soil; neighbours' plots as their Health. The lever is taking on and reclaiming the neglected second plot. | Weeds on the neglected plot, cleared by degrees | Health | Fast: none. Slow: reclaiming takes seasons. Neglect costs years, not weeks. | The second plot's soil when it's offered |
| 3 · S | H at field scale: rotation over years, cover crops, and the tractor's compaction (PR #26: up to −30 % yield, a five-year half-life). The lever is the year plan; the smallholder and the hand act. | Wheel ruts; cover crops greening a winter field | Health | Fast: a compacted wet field. Slow: rotation rebuilding it. Rotation and cover crops put back what cropping takes. | Compaction with the tractor's first pass; the rotation's soil view with the year plan |
| 4 · P | H: soil as the farm's capital. The levers are the tillage policy and the manager you hire. A manager whose goal is this year's yield mines it (spec). | A tired field's paler crop | Health; carbon (the full account) | Fast: the manager's yield bump. Slow: the soil's decline. Soil is capital; a short-term goal spends it. | The farm's soil Health with the first manager hired |
| 5 · S | N: each farm's Health number. The lever is where the market buys from. | Farm tiles with Health | — | Soil shows only as Reliability downstream. | Farms' Health on their tiles, from the start of the level |
| 6 · P | T: a supplier's slow decline. The lever is contract terms; the buyer acts. | A tint on a sourcing region | — | Fast: price pressure. Slow: suppliers' soils decline. A buyer's squeeze can mine soils it never sees. | The supplier tint with the first contract squeeze |
| 7 · P | A: a soil health index by region. The lever is law (paying for soil cover, the way England's Sustainable Farming Incentive does); farmers respond. | Regions tinted by soil health | — | Fast: none. Slow: decades. Public money for public goods. | The soil index with the first soil law on the table |
| 8 · P | T: degraded land by country. The lever is a treaty. | Countries tinted | — | About a third of the world's soils are degraded (FAO, Status of the World's Soil Resources, 2015). | A tint once a treaty is possible |

### Water

Loops: intensification, energy (pumping), climate. The spec settles the lever's growth: "water below this moisture" → "share the trough by rota" → "irrigate or not" → "abstraction licences" → "water policy".

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · S | H: the FAO-56 balance, the butt and the tap. The lever is the watering line; the gardener waters with a can, then a hose, then drip lines. A hosepipe ban in a dry summer is **Q8**. | The gardener with the can; the butt's level; soil colour | Health (water part); Upkeep (mains water) | Fast: a watered bed recovers today. Slow: a dry summer empties the butt. Plants drink by the weather, not by the calendar. | The watering line appears with the first dry bed the gardener must choose to water; the butt's level from the first rain |
| 2 · S | H: the shared trough with a daily limit; the rota is voted by the committee. | A queue at the trough | Health (water part) | Fast: an empty trough. Slow: the rota's fairness. A shared resource needs rules (Ostrom's commons). | The trough's limit with the first queue; the rota with the vote |
| 3 · S+P | H: irrigate or not; the pump's energy (PR #26, `pumpKWh()`). The levers are the plan and (**P**) a borehole or reservoir; the smallholder acts. | The pump running; the irrigated field greener | Upkeep; Reliability | Fast: a field saved in a drought. Slow: the energy bill. Water costs energy. | Irrigate-or-not with the first dry field |
| 4 · S | H: abstraction licences, the farm reservoir, and floods. The levers are the licence application and the reservoir; the farmer and the agency act. | Reservoir level; a dry river | Reliability | Fast: a licence cut in a dry year. Slow: none. A licence caps what you can take when everyone needs it. | The licence with the first application or cut |
| 5 · S | N: water as farms' Reliability. | — | — | The town sees drought only as price. | Only as prices |
| 6 · P | T, and imported water: salad from a dry region. The lever is sourcing; the buyer acts. | Sourcing tint | — | Importing food imports its water (Hoekstra & Mekonnen, 2012). | Imported water with the first dry-region sourcing choice |
| 7 · S | H: basin scale, water policy and drought orders. The lever is law; the agency and water companies act. | Reservoirs and rivers by basin | — | Basins, not borders, set the limit. | Basin water with the first drought order |
| 8 · P | A: water stress by country. The lever is a treaty or aid. | Countries tinted | — | Farming takes about 70 % of freshwater withdrawals (FAO AQUASTAT). | With the first water treaty or aid |

### Land use

Loops: diet (grazing against crops), intensification. Spec: from 1 (the lawn), 4 in earnest.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · S | H: digging the lawn, and a bag of peat (land used elsewhere). The lever is `dig`; the gardener digs. | The dug plot, a square metre at a time | Land by use; carbon | Fast: the spade. Slow: the lost soil carbon (IPCC's ×0.69). Changing land use moves carbon. | The land account with the first dig (the dial's first carbon choice) |
| 2 · S | H: the second plot, and the committee's vote on letting a plot go to bees. | The bee plot flowering | Land by use | Fast: none. Slow: the bee plot pays back in pollination. Sharing land with nature, in miniature. | The bee plot with its vote; the second plot with its offer |
| 3 · S+P | H: fields, pasture, hedges and (**P**) a woodland corner. The lever is the year plan; the smallholder acts. | Fields by use; a new hedge | Land by use; carbon | Fast: none. Slow: the hedge's carbon over decades. A field's use decides its carbon, water and wildlife. | Field uses with the first year plan |
| 4 · S | H in earnest: plant woodland, drain or rewet, pasture or arable. The farmer acts. | Rewetted land; planted trees | Land; carbon | Fast: a lost crop's income. Slow: trees' carbon. Grazing needs far more land per kg of protein (Poore & Nemecek, 2018). | Woodland and rewetting with the first offer to plant or drain |
| 5 · P | N: farmland around the town; the town's own built land. The lever is planning; the council decides. | Houses spreading onto fields | Land (built) | Homes and food compete for the same fields. | Built land with the first planning decision |
| 6 · P | T: the land the chain's imports use abroad. | Sourcing tint | — | A shop's shelf has a land footprint. | The land footprint with the first sourcing choice |
| 7 · S | H: the land budget (food, forest, energy, homes, nature). The lever is law; the tension shows as votes. | Regions' land use shifting | — | The country's land can't do everything at once. | The land budget with the first land law |
| 8 · P | H: deforestation embedded in commodities. The levers are treaties and trade rules. | Forest edges receding | — | Livestock uses over four fifths of farmland for under a fifth of calories (Poore & Nemecek, 2018). | Deforestation with the first commodity treaty |

### Biodiversity

Loops: intensification (pesticides and monoculture against natural enemies). Spec: from 1 (marigolds), 3.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · S | H: flowers bring ladybirds (aphids) and bees (beans, tomatoes). The levers are flowers in the plan and the pest policy's "treat", which kills them too. The gardener acts. | Bees and ladybirds over flowers | Health has no wildlife part (**Q6**) | Fast: aphids eaten. Slow: a population that builds. Natural enemies are pest control you don't pay for. | Bees and ladybirds are drawn from the start; their count shows with the first flowers sown or the first treat |
| 2 · S+P | H: neighbours' spraying reaches your bees (**P**); the vote on the bee plot. | Bees crossing plots | — | Wildlife crosses fences. | Drift with the first neighbour's spraying; the bee plot with its vote |
| 3 · S | H: hedgerows and margins for pollinators. The lever is the year plan; the smallholder plants. | Hedges; margins flowering | **Q6** | Fast: none. Slow: pollinated yields up over years (Klein et al., 2007). | Margins with the first hedge or margin offered |
| 4 · S | H: agri-environment payments (the subsidy scheme). The lever is the scheme's options; the farmer acts. | Margins, beetle banks | **Q6** | Paid nature is still nature. | Scheme options with the scheme |
| 5–6 · P | N, then T: suppliers' wildlife standards. At 6 the buyer can set one. | — | — | A chain's standard reaches thousands of farms. | A standard's lever at 6 with the first buying round |
| 7 · P | H: the land budget's nature share and pesticide rules. The lever is law. | The farmland bird index as a map layer | — | England's farmland bird index has fallen by about three fifths since 1970 (DEFRA). | Nature law with the first nature bill |
| 8 · P | H: a treaty (30 % protected by 2030, Kunming-Montreal). | Protected land by country | — | Nature targets are shared or not met. | The treaty with the first round |

## Growing food

### Crops

Loops: diet, intensification, trade. Spec: from 1.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · S | H: six crops grown by degree days, water and nutrients. The lever is the plan (what to sow where and from when, or the rotation); the gardener sows, waters and picks. | Drills, shoots, ripe fruit, wilting, frost-blackened tops | Output, Quality, Reliability | Fast: a harvest. Slow: the rotation's effect on the soil. What grows when, and why. | The plan's first card (salad and radishes) from the first minute; more lines as each bed is dug |
| 2 · S | H: your plot and the neglected second one; neighbours' plots as their totals. The lever is the plot's plan; your gardener and the helping neighbour act. | Neighbours' crops drawn from their totals | Output by product (the spec's "by product mix"; **Q3**) | Fast: a glut of courgettes. Slow: none. Surplus is only useful if it's what others lack. | Swaps with the swap shed |
| 3 · S | H: fields, with rotation over years (legumes, cover crops, fallow). The lever is the year plan; the smallholder and the hand act. | Fields by crop; the drill and harvest | Output, Health | Fast: a crop in the barn. Slow: a rotation paying back over years. Rotation is a plan over years, not a season. | The year plan with the smallholding |
| 4 · S | H: the enterprise's crops, varieties and contracts. The lever is the cropping plan against the contract; the farmer and the manager act. | Harvesters in the row | Output against the contract; Quality | Fast: a contract met or missed. Slow: a variety's disease resistance. Food is grown to a buyer's spec. | Contracts with the first buyer's offer |
| 5 · S | N: each farm's Output by product. The lever is which farms the market buys from. | Farm tiles with their numbers | — | Fast: a farm's short week. Slow: none. The town sees fields only as supply. | Tiles from the start |
| 6 · S | T: a supplier region's harvest in one line. The lever is sourcing; the buyer acts. | A region's tint | — | Fast: a failed region's gap. Slow: none. A chain sources from many so one failure doesn't empty a shelf. | Tints with the first failure |
| 7 · P | T: the national crop mix. The lever is law (grants for horticulture, the land budget); growers respond. | Regions tinted by crop | — | Fast: none. Slow: a decade's shift. The UK grows about 60 % of the food it eats (DEFRA, UK Food Security Report). | The crop mix with the first horticulture bill |
| 8 · S | A: crop zones moving with warming; commodity crops by country. The lever is a treaty or research. | Growing zones creeping north | — | Fast: a failed harvest abroad. Slow: zones moving over decades. Warming moves where things grow. | Crop zones with the first failed harvest abroad |

### Livestock

Loops: diet (the pivot), waste (manure), energy. Spec: from 1 (hens), 3. The model is PR #25.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · S | H: three hens, with eggs to the kitchen and manure to the heap (part 6's hen house). The levers are feed and the hen house; the gardener feeds them and collects the eggs. | Hens scratching; eggs carried in | Output (eggs); carbon | Fast: fewer eggs in December (about a third of June's). Slow: none. Animals turn feed into food, at a loss. | The hens' panel with the hen house bought |
| 2 · P | s: a neighbour's hens, and the committee's rule on cockerels. No lever of yours. | Hens on a neighbour's plot | — | A seed only: animals are part of the neighbours' households. | Drawn only |
| 3 · S | H: a small flock and pigs or sheep, with feed, welfare, manure, methane and the vet. The lever is stocking and feed in the year plan; the smallholder and the vet act. | Sheep grazing and moved between fields; the vet's car | Output; Health (the herd part); carbon | Fast: an ill flock at half output for three weeks. Slow: overgrazed ground wearing. Welfare and stocking density set what a herd gives. | The flock's plan with the first animals |
| 4 · S | H: herds and animal disease. The levers are herd size and biosecurity; the farmer and the vet act. | Cattle between fields; a disease zone drawn | Output; carbon; disease events | Fast: a movement ban. Slow: rebuilding a herd. A disease zone closes markets. | Biosecurity with the first disease scare |
| 5 · S | N: meat, milk and eggs as farms' Output. The lever is the market's buying. | Livestock farms' tiles | — | The town sees animals only as supply and price. | Tiles from the start |
| 6 · P | T, plus welfare standards the buyer sets. | Sourcing tint | — | Fast: none. Slow: a standard reaching thousands of farms. A chain's welfare standard is a law in all but name. | Standards with the first buying round |
| 7 · S | A: the national herd, pushed by the diet loop. The levers are law, guidance and subsidy; farmers and eaters respond. | Pasture turning to woodland, or back | — | Fast: none. Slow: herd and land change over decades. The herd is the biggest single lever on farm emissions. | The herd lever with the first diet or methane bill |
| 8 · S | A: herds by country; methane in treaties. The lever is a treaty. | Countries tinted by herd | — | Fast: methane falls within a decade of a cut. Slow: none. Methane is short-lived, so cutting it works fast. | With the methane treaty |

### Pests, disease and weeds

Loops: intensification, trade (spread along routes). Spec: from 1; part 5 builds the garden's.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · S | H: slugs, aphids and blight. The pest policy is leave, pick, trap or treat; the gardener acts, with a torch at dusk. | Slugs on wet beds at dusk, aphids clustering, blight browning | Events against Output | Fast: a night's damage. Slow: predators lost to treating. Every control costs time or has side effects. | Drawn from the first night; the pest policy when the gardener first meets slugs (part 5) |
| 2 · S | H: pests spreading from the neglected plot; the first zoom back in. The lever is your plot's policy, and help for the neighbour. | Slugs crossing the path | Events | Fast: an outbreak next door. Slow: none. Your pests are your neighbours' too. | Spread with the first outbreak next door |
| 3 · S+P | H at field scale, plus weeds (**P**): hand-weeding against spraying. The hand and the smallholder act. | The hand hoeing; a sprayer pass | Events; Upkeep | Fast: a weedy field. Slow: the seed bank. Weeding is one of the costliest jobs in hours. | Weeding with the first weedy field |
| 4 · S | H: chemicals and their rules; animal disease. The lever is the spray programme; the farmer acts. | Sprayer passes | Events | Fast: a clean crop. Slow: resistance building. Resistance grows with use. | The spray programme with the first spray decision |
| 5 · S | N: a farm's "Output −20 % for 10 days". The lever is buying elsewhere. | The event's icon on a tile | — | The town feels a pest as a gap. | Event icons from the start |
| 6 · S | T: "pest year in the east: veg −5 %". The lever is stock and sourcing. | A regional tint | — | Fast: a gap on the shelf. Slow: none. Stock and spread sourcing absorb a bad year. | Tints with the first regional event |
| 7 · P | H: pesticide law and plant health at the border. The lever is law; the agency acts. | Border checks | — | Fast: a pest kept out. Slow: none. A plant health border is cheap insurance. | Plant health with the first border scare |
| 8 · S | H: animal disease closes borders; pest ranges shift with warming. The lever is a treaty and trade rules. | Pest ranges moving north | — | Warming moves pests north. | Borders with the first disease closure |

### Nutrients and fertiliser

Loops: energy (gas → fertiliser), intensification. Spec: from 1 (compost), 3.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · S | H: compost and legumes put N-P-K back, and bare beds leach. The levers are the compost bin and the rotation; the gardener spreads. | Compost carried; beans | Health (soil) | Fast: none. Slow: a winter's leaching. Nitrogen leaves with winter rain. | N-P-K with the first stressed crop; the compost bin with the heap's first finished compost |
| 2 · P | H: manure from the stables down the lane, shared out by rota. | A heap of manure by the gate | Health | A shared input needs a rule, like the trough. | With the stables' offer |
| 3 · S | H: manure against bought fertiliser, by RB209. The lever is the year plan; the smallholder spreads. | The spreader | Upkeep; carbon (N₂O) | Fast: a greener crop. Slow: none. Synthetic nitrogen is made from gas. | Fertiliser with the first year plan |
| 4 · P | H: precision inputs and the nitrate rules (nitrate vulnerable zones). The lever is the input plan; the farmer and the adviser act. | Variable-rate passes | Upkeep; carbon | Fast: saved fertiliser. Slow: cleaner water. Putting on only what the crop takes pays twice. | Precision with the first input bill worth cutting |
| 5 · S | N: through farms' Upkeep and Output. | — | — | The town sees fertiliser only as farms' costs and yields. | Through Upkeep |
| 6 · P | T: the fertiliser price in supplier costs. | — | — | Fast: suppliers' prices rise after a gas spike. Slow: none. Input costs pass down the chain. | Tints with a price spike |
| 7 · P | H: nitrate and phosphate rules; fertiliser price support. The lever is law. | Rivers tinted by nitrate | — | Fast: none. Slow: rivers recovering over decades. Farm nitrate is a river's problem. | Nitrate rules with the first river bill |
| 8 · S | H: finite phosphate from a few countries; gas and fertiliser in the energy loop. The lever is a treaty or a stockpile. | Fertiliser shipments | — | A gas price sets next year's harvest. | The phosphate and gas lines with the first price shock |

### Labour

Loops: agency (delegating costs trust). Spec: from 3; labour hours are a flow from the first bed. The model is PR #26.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · S+O | H: the gardener's four hours on a weekday and six at the weekend, what's left after their job (**O**). Tools buy time. | The gardener's card; the day's hours ticking down | Hours (**Q2**) | Fast: a job that doesn't fit waits. Slow: none. Time is the first constraint. | The gardener's card and hours from the first minute; the job's hours with the first week's wage |
| 2 · S+O | H: a neighbour helps for a share, and takes more. The partner can work more or help on the plot (**O**, part 10). | The neighbour at your plot; the partner with a barrow | Hours (**Q2**) | Fast: the plot kept. Slow: trust lost. Help has a price even when it's free. | The partner's work-or-help lever with the second plot |
| 3 · S | H: the first hire, with goals of their own. The hand works about 39 hours a week (PR #26); the lever is hiring and pay. | The hand in the field | Upkeep (wages) | Fast: the harvest in. Slow: a good hand stays. You're the employer now (the spine). | Hiring with the first harvest that won't fit |
| 4 · S | H: seasonal labour and the union. The lever is hiring pickers and dealing with the union. | Pickers at harvest | Upkeep | Fast: fruit picked or rotting. Slow: none. The harvest needs three or four times a quiet month's hours (AHDB and Nix labour tables, in PR #26). | Pickers with the first crop needing them |
| 5 · P | H: shop and market staff. The lever is the market's hours and staffing. | Stallholders | Upkeep | Most food jobs are after the farm gate. | Staffing with the first market day |
| 6 · S | H: depot labour. The lever is shifts and automation. | Depot shifts | Upkeep | Fast: a strike. Slow: automation. | Shifts with the first depot |
| 7 · P | R: the minimum wage, benefits and migration rules. You set the wage the gardener was paid. | — | — | Fast: none. Slow: prices follow wages. See the spine. | Wage law with the first wage bill |
| 8 · S | H: migration. The lever is a treaty or labour agreement. | People moving | — | A harvest in one country is picked by people from another. | With the first labour agreement |

## Moving and selling food

### Storage and spoilage

Loops: waste, energy (the cold chain). Spec: from 3. It's already hands-on at 1 in the kitchen's keeping, so the "From" column is **Q10**.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · P | s: the kitchen's keeping days (built); the honesty box goes off too. The lever is when to pick. | Produce in the kitchen | Freshness (carried from the town up) | Fast: a lettuce gone. Slow: none. Pick what you'll eat. | Keeping days with the first thing that goes off |
| 2 · P | s: the swap shed's shelf. | Swaps waiting | — | Fast: swaps going off on the shelf. Slow: none. A shared shelf needs someone to clear it. | With the swap shed |
| 3 · S | H: spoilage on the way to the box scheme. The lever is the delivery round; the smallholder drives it. | The van | Freshness | Fast: a box lost to a hot day. Slow: none. Distance is time. | Spoilage with the first delivery |
| 4 · P | H: the farm store. The lever is building one. | The store | Freshness; Upkeep | Store to sell when prices are better. | The store with the first price worth waiting for |
| 5 · S | H: storage by product and temperature (Q₁₀ kinetics). The lever is the stores; the shopkeepers act. | Stores | Freshness | Temperature, not distance, sets shelf life. | Stores from the start of the level |
| 6 · S | H: the cold chain at scale and its energy. The lever is depot and fleet; the chain's staff act. | Chilled lorries | Freshness; carbon | Fast: a failed chiller. Slow: none. Cold is a cost the shelf price hides. | The cold chain with the first chilled route |
| 7 · P | A: food security as days of stock (**Q8** seeds it at the garden). The lever is law. | — | — | Fast: a shortage. Slow: none. Resilience is stock and diversity. | Days of stock with the first shortage |
| 8 · P | H: strategic grain reserves. The lever is a treaty or a national store. | — | — | Reserves calm a panic. | Reserves with the first price panic |

### Transport and logistics

Loops: energy, trade. Spec: from 5. The gardener's baskets and the van come earlier (**Q10**).

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · P | s: baskets carried to the kitchen and the gate (built), and the shop food's miles (**O**). | The gardener with a basket | — | Food miles are a small share of most food's carbon ("The household across the ladder", level 1). | Drawn only (baskets); the basket's miles in Explain on the first shop |
| 2 · P | s: swaps carried between sheds. | Barrows on the path | — | Fast: none. Slow: none. Everything moved takes someone's time. | Drawn only |
| 3 · S | s: the van to market. | The van | Upkeep | Fast: a round's fuel and hours. Slow: none. Delivering is a cost the price has to carry. | The van with the box scheme |
| 4 · P | N: haulage in Upkeep. | — | — | Haulage is a line in the farm's costs, not a choice yet. | Through Upkeep |
| 5 · S | H: routes and vehicles. The lever is the routes; the drivers act. | Vans and lorries on routes | Upkeep; carbon | Fast: a road closed. Slow: none. | Routes from the start of the level |
| 6 · S | H: logistics at scale. The lever is the network; drivers and depot staff act. | Lorries, depots | — | Fast: a depot's backlog. Slow: the network's shape. Scale makes each kg cheaper to move and a failure wider. | The network from the start of the level |
| 7 · P | T: freight on roads and rail. The lever is infrastructure spending. | Freight lines | — | Fast: none. Slow: roads and rail over decades. Freight follows infrastructure. | Infrastructure with the first freight bill |
| 8 · S | H: shipping lanes and chokepoints. The lever is treaties and stockpiles. | Ships | — | A blocked strait raises prices everywhere. | Lanes with the first blockage |

### Markets, prices and demand

Loops: diet, trade, waste. Spec: from 1 (the kitchen), 5.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · S+O | H: the kitchen's ask, the honesty box at £2.50 a kg, and the weekly shop at shop prices (**O**). The levers are the plan (grow what you'd buy) and the box's price. | Baskets to the gate; the shopping | Output; Upkeep; demand (**Q2**) | Fast: a sale. Slow: none. Your veg against the shop's price. | The Kitchen tab with the first harvest; the honesty box with the first surplus; the shop's basket with the first week's shop |
| 2 · S | H: the swap shed, where barter needs what others lack. | Swaps carried between sheds | — | Trade gains come from difference. | The swap shed with the first surplus |
| 3 · S | R: the box scheme and farm shop. You are the shop for a few dozen households; the lever is the box's contents and price. | The van to customers | Output; Upkeep | You sell to households now (the spine). | The box scheme with the smallholding offer |
| 4 · S | H: the buyer's contract and cosmetic standards. The lever is taking the contract or not. | Outgrades left in the field | Output; Quality | Fast: a rejected load. Slow: none. The buyer's spec sets waste. | Contracts with the first buyer's offer |
| 5 · S | R: local demand by income and habit; you run the market. The levers are stall fees, market days and rules; stallholders act. | Shoppers at the market | Demand by decile (**Q2**) | You set the rules stallholders live by. | The market's levers from the start of the level |
| 6 · S | R: you are the buyer. The levers are range, price, promotions and standards; the chain's staff act. | Pallets in and out | — | Fast: a promotion's rush. Slow: suppliers leaving. Buyer power (the Groceries Code Adjudicator). | Buying from the start of the level |
| 7 · P | A: prices and affordability by decile. The lever is law. | — | — | The poorest spend the largest share on food (Engel's law). | Affordability with the first price rise felt |
| 8 · S | H: commodity prices. The lever is treaties and stocks. | — | — | A price spike abroad reaches the basket. | Commodity prices with the first spike |

### Trade and geopolitics

Loop: trade. Spec: from 8. Seeded from 1 (**Q10**).

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · O | s: the imported tomatoes in the March basket. | The shopping bag | — | Imports fill the gaps the season leaves. | The tomatoes' origin in Explain on the first March shop |
| 2 · P | s: the swap shed, trade's gains in miniature. | Swaps | — | Fast: a good swap. Slow: none. Both sides gain when each has what the other lacks. | With the swap shed |
| 3 · P | s: the box scheme against the supermarket. | — | — | Fast: a customer lost to a cheaper shop. Slow: none. Local sells on freshness and trust, not price. | The supermarket's price beside the box's |
| 4 · P | T: import competition sets the buyer's price. | — | — | Fast: a lower offer. Slow: none. The world's price caps what the buyer pays. | Import prices beside the contract |
| 5 · P | T: imported goods on the market's stalls. | — | — | Fast: none. Slow: none. Most shelves mix local and imported. | Drawn on stalls |
| 6 · S | H: imports as the standing substitute. The buyer acts. | Import lorries | — | Fast: a gap filled from abroad. Slow: local growers squeezed. Imports are the chain's insurance. | Imports from the start of the level |
| 7 · S | H: trade deals. The lever is law and negotiation. | — | — | Fast: none. Slow: a deal's terms over years. A trade deal is a food policy. | Deals with the first negotiation |
| 8 · S | H: tariffs, export bans, conflict and aid. The lever is treaties. | Ships and bans | — | Export bans turn a shortage into a crisis (2007–8, 2010). | From the start of the level |

### Waste and circularity

Loop: waste. Spec: from 1.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · S | H: the heap; the kitchen and the box going off. The levers are the plan and the heap; the gardener carries. | Scraps to the heap | carbon | What's wasted still cost water and hours. | The heap from the first scraps; wasted kg in the Kitchen tab with the first thing that goes off |
| 2 · S+P | H: the swap shed as redistribution. The committee's bonfire ban has no system yet (**Q11**). | — | — | Surplus given is surplus not wasted. | The swap shelf; the bonfire vote |
| 3 · S | H: manure, and spoilage on the way. | — | — | Fast: manure spread. Slow: the soil fed. One enterprise's waste is another's input. | Manure with the flock |
| 4 · S | H: outgrades under cosmetic standards (the waste loop). | Outgrades | — | Standards make waste. | Outgrades with the first rejected load |
| 5 · S | H: retail and household waste, redistribution. The lever is the council's collections and the food bank. | Food bank vans | — | Households waste the most after the farm gate (WRAP: about 60–70 % of UK post-farm waste, by year). | Waste levers from the start of the level |
| 6 · S | H: packaging and waste at scale. The lever is the chain's policy. | — | — | Fast: none. Slow: a packaging change across every store. Packaging keeps food and makes waste. | Packaging with the first range choice |
| 7 · P | H: food waste targets, separate collections, landfill tax. The lever is law. | — | — | Fast: none. Slow: habits change. Waste falls when it's measured and costs something. | Waste law with the first bill |
| 8 · P | T: loss and waste by country. | — | — | About 13 % is lost before retail and 17 % wasted after (FAO's 2019 figure as updated since; UNEP 2021). | Tints from the start |

## Energy, carbon and climate

### Energy

Loop: energy. Spec: from 3. The model is PR #26 (fuels, pumps, cold stores and tunnel heating, paid from a purse).

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · P | s (with **Q1**): the household's energy bill sits in the purse beside its food, so a cold winter squeezes the basket ("heat or eat"). The shed light buys evening hours. No energy lever yet. | The shed light on at dusk | Upkeep | A seed: energy and food compete for the same money. | The bill in the purse with the first cold month |
| 2 · · | Not present: the allotment has no power. | — | — | — | — |
| 3 · S | H: diesel, electricity for the pump, and heat for the polytunnel (PR #26). The lever is the year plan and the kit; the smallholder acts. | The tractor working; the pump running | Upkeep; carbon | Fast: the fuel bill. Slow: none. Every machine hour is a fuel cost. | Fuel with the tractor; the pump with irrigation |
| 4 · S | H: on-farm renewables and a digester. The lever is the upgrade; the farmer acts. | Panels on a barn; a digester | Upkeep (less); carbon (less) | Fast: none. Slow: a payback over years. The farm can make energy as well as use it. | Renewables with the first offer |
| 5 · S | H: shops' chillers and the vans' fuel. The lever is the market's and the fleet's kit. | Vans; chillers | Upkeep; carbon | Fast: a chiller's bill. Slow: none. Keeping food cold is the shop's biggest energy use. | Chillers with the first store |
| 6 · S | H: the cold chain's energy at scale. The lever is depot kit and routes. | Chilled lorries; depots lit at night | Upkeep; carbon | Fast: a price spike's cost. Slow: none. Cold is a cost the shelf price hides. | From the start of the level |
| 7 · P | H: the grid's mix, which sets every node's electricity carbon below (PR #26 leaves the grid factor to the level above). The lever is law. | Wind and solar on the map | — | Fast: none. Slow: a decade's build. A cleaner grid cleans every cold store at once. | The grid mix with the first energy bill |
| 8 · S | H: the gas price, which feeds fertiliser and fuel (the energy loop). The lever is a treaty or a stockpile. | Gas routes | — | A gas price reaches next year's harvest. | Gas with the first price shock |

### Greenhouse gases

Every loop ends here. Spec: from 1, counted per node from the first bed.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · S+O | H: the dial (the heap, peat, the lawn), and the embodied carbon of the shop food (**O**). The shop food's carbon is counted beside the dial by **Q4**, never added to the air. The levers are the plan, peat-free compost and what the garden replaces. | The dial | carbon | Fast: none. Slow: the heap's slow sink. What you eat matters more than how far it came. | The dial with the first carbon choice (the first dig, peat or compost), not from day one (the owner, 29 Sep); the basket's needle with the first shop |
| 2 · S | N: each plot's carbon; your plot's in detail. | The dial | carbon | Twelve plots' kg add up. | Plots' carbon on their tiles |
| 3 · S | H: methane from the flock, the tractor's diesel, and fertiliser's N₂O. The lever is the year plan. | — | carbon | Fast: none. Slow: the soil carbon of the rotation. Animals and fuel dominate a small farm's account. | Methane with the flock; diesel with the tractor |
| 4 · S | H: the full carbon account, emissions less sinks by source. The lever is the farm's plan and upgrades. | — | carbon | A farm can be a sink as well as a source. | The full account from the start of the level |
| 5 · S | H: transport and the shops' carbon. The lever is routes and chillers. | — | carbon | Transport is small beside production. | From the start of the level |
| 6 · S | H: the retail carbon account. The lever is sourcing and range. | — | carbon | A range choice (beef or beans) outweighs any lorry. | From the start of the level |
| 7 · S | H: the national account against its target. With **Q4**, the territorial account shows beside the consumption footprint, so carbon leakage is visible. The lever is law. | Regions by emissions | — | Offshoring cuts the account, not the footprint. | The target from the start of the level |
| 8 · S | H: the atmosphere itself. The lever is a treaty or a carbon price. | — | — | Every country's kg go into the same air. | The atmosphere from the start |

### Climate feedback

Spec: from 1 (counted), 7 (felt), 8 (closed). The warming index is `warmingIndex()`, read by the weather each day.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · S+P | s: counted, not felt: a garden's kilograms warm nothing. **P:** the dial's Explain card scales the garden's kg up to show why they matter summed (a garden's year, times the country's gardens, in tonnes and in warming). | The dial | carbon | Nothing shows yet, which is itself the lesson: small emissions add up. | The dial's scaled Explain with the dial |
| 2–6 · S | s: the same, summed higher up. The carbon carries up with every sealed node. | — | carbon | Small kg summed become large ones. | In each node's carbon |
| 7 · S | H, felt: hotter summers and drought years bend yields and water. The lever is adaptation law. | The palette shifting over years | — | Fast: a drought year. Slow: the mean moving. | The warming readout with the first drought year felt |
| 8 · S | H, closed: every country's emissions set the warming that bends every country's weather. The lever is a treaty. | Weather crossing the map; sea creeping in | — | Fast: none. Slow: the century. Cumulative CO₂ sets warming (IPCC AR6, TCRE). | From the start |

## People and power

### Nutrition and public health

Loop: diet. Spec: from 1 (the kitchen), 7.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · S+O | s: the kitchen's five a day, met from the garden, and the rest of the basket from the shop (**O**). A diet lever at the garden is **Q9**. | Produce carried to the kitchen | The share met (in Output's mix) | Fast: a day's five a day met. Slow: none. What a household eats is a choice, and a budget. | The five-a-day share in the Kitchen tab with the first harvest |
| 2 · P | s: swaps widen the kitchen's mix. | Swaps | — | Variety comes from others. | With swaps |
| 3 · P | s: the box customers' mix follows what's in the box. The lever is the box's contents. | Boxes | — | A seller shapes what people eat. | With the box's contents |
| 4 · · | Not present. | — | — | — | — |
| 5 · P | s: diets by income decile at the market. The lever is what the market stocks. | Shoppers' baskets | Demand (**Q2**) | The poorest eat the fewest vegetables (DEFRA Family Food). | Decile diets with the market |
| 6 · P | s: the category mix and promotions. The lever is range and promotions. | Shelves | — | Promotions change what the country eats. | The category mix with range |
| 7 · S | H: diet and health, and the health cost. The levers are law and guidance (the sugar levy, school food, the Eatwell Guide). | Regions by diet-related illness | — | Fast: none. Slow: health over a generation. Manufacturers cut sugar rather than pay the levy. | Health with the first diet bill |
| 8 · S | H: diets against the EAT-Lancet reference, with hunger and obesity side by side. The lever is a treaty or aid. | Countries by diet | — | The world has both hunger and obesity at once. | From the start of the level |

### Population and culture

Loop: diet (culture pushes back or runs ahead). Spec: from 2 (neighbours), 7.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · S+O | s: the household's members, 2.4 as built (`docs/systems/kitchen.md`), with the gardener and later the partner and children. | The household at the house | — | A household is people with their own time. | The household at the house, drawn; members in Explain |
| 2 · S | s: eleven neighbours with habits (tidy, lazy, generous, competitive). | Neighbours at their plots | — | People differ; the same plot fares differently. | Neighbours' habits as they're met |
| 3 · P | s: the box customers' tastes (local, organic, cheap). | — | — | Fast: none. Slow: none. Customers buy on values as well as price. | Customers' tastes with the box scheme |
| 4 · · | Not present: the farm's customers are buyers, not people. | — | — | — | — |
| 5 · P | A: households by income decile and habit. | Shoppers | Demand (**Q2**) | Demand is people. | Deciles from the start of the level |
| 6 · P | A: footfall and trends (vegan, local, cheap). | Queues | — | Trends move shelves faster than prices. | Footfall from the start of the level |
| 7 · S | H: population, growth, trends and what people will bear. | Regions by population | — | Fast: none. Slow: demand shifts over a generation. Culture sets what policy people will bear. | From the start of the level |
| 8 · S | H: population growth and urbanisation by country. | Cities growing | — | Fast: none. Slow: decades. More people, and more of them in cities, need more food moved. | From the start of the level |

### Agency and trust

Loop: agency. Spec: from 2 (a neighbour), 3 (hiring), 5 (people you don't choose).

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · P | s: an honest gardener and an honest adviser (the spec's agency starts at 2; the garden's people have no hidden goals yet). **P:** the partner (part 10) has goals of their own, by the spec's rule for everyone you delegate to. | The gardener's day | Health (goodwill) | You decide; people do. | The gardener's card from the first minute; the partner's goals with the partner |
| 2 · S | H: the neighbour who over-takes a share, and the seed catalogue whose advice favours its seeds. The levers are watching and changing helper. | The neighbour's barrow a little too full | Health (goodwill) | A report isn't the truth. | The neighbour's help with the second plot; the catalogue with its first advice |
| 3 · S | H: hiring the hand, whose goals you infer. The lever is hiring and pay. | The hand working, or not | — | Hiring is matching goals to the job. | Hiring with the first hire |
| 4 · S | H: the farm manager who may flatter yields, and the buyer. The levers are audits and replacement. | — | — | Watching costs time. | Audits with the first manager |
| 5 · S | H: people you don't choose (the council). The levers are persuading and allying. | — | — | You work through whoever is in office. | Persuasion with the first council vote |
| 6 · S | H: a buyer who skims; the chain's reputation. The levers are audits and the adjudicator. | — | Health (goodwill, as reputation) | Power invites abuse. | Audits with the first skim |
| 7 · S | H: lobbies and capture. The levers are coalitions and timing. | — | — | A captured rule costs everyone. | Coalitions with the first lobby |
| 8 · S | H: other governments, by corruption and goals. | — | — | Fast: a new government's U-turn. Slow: trust. Some partners can't be relied on. | From the start of the level |

### Politics and policy

Loop: agency. Spec: from 2; politics exists at every level, only its size changes.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · S+P | s: the neighbour over the fence (spec), and the household itself: **P:** the partner's goals are the garden's first politics. | The neighbour's tree shading a bed | — | Politics starts at home. | Drawn only (the neighbour's tree); the partner's goals with the partner |
| 2 · S | H: the committee's three votes (the water rota, the bonfire ban, the bee plot). The lever is your vote. | Plot-holders gathering at the shed | — | You're one vote of twelve. | Each vote as it's called |
| 3 · S | H: the parish (planning for the polytunnel), the subsidy form, the neighbour who objects. The levers are applying and persuading. | The planning notice | — | Rules shape what you may build. | The parish with the first application |
| 4 · S | H: the union and the subsidy scheme. The levers are membership and the scheme's options. | — | — | Fast: a scheme's payment. Slow: its rules shaping the farm. Subsidy steers what farms do. | The union and scheme with the first form |
| 5 · S | H: the council. The lever is proposals, persuasion and political capital. | Council meeting | — | Fast: none. Slow: a council's term. People others elected can undo your work. | The council with the first proposal |
| 6 · P | H: the retail lobby and the adjudicator. | — | — | Fast: none. Slow: a code's enforcement. Power needs a referee. | The lobby with the first code dispute |
| 7 · S | R: parliament, elections and political capital. You serve whoever is elected. | Election map | — | Slow loops outlast governments. | Political capital with the first bill |
| 8 · S | H: treaties among many governments. | — | — | Fast: none. Slow: decades. A treaty holds only while governments keep it. | From the start of the level |

### Technology and upgrades

Loops: all. Spec: from 1.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · S | H: the shed: a hose, drip lines, a beer trap, a cold frame, a hen house. Each shows its time saved and side effects before you buy. | The new tool in use | Health (the kit part) | Money buys tools, tools buy time. | The shed tab with the first thing worth buying (the beer trap, part 6) |
| 2 · P | H: tools for the plot, and a shared tool store. | — | Health (kit) | Sharing tools is cheaper than owning them. | As each is worth having |
| 3 · S | H: the second-hand tractor and the polytunnel. | The tractor | Health (kit); Upkeep | A machine saves hours and costs fuel and repairs. | The tractor with its offer |
| 4 · S | H: precision farming and varieties. | — | Health (kit) | Fast: saved inputs. Slow: the kit's payback. Precision spends money to save inputs. | As each is worth having |
| 5 · S | H: cold stores. | — | — | Fast: less spoilage. Slow: the energy bill. A cold store trades energy for time. | As each is worth having |
| 6 · P | H: depots and automation. | — | — | Fast: faster depots. Slow: fewer jobs. Automation moves who does the work. | As each is worth having |
| 7 · P | H: research policy and varieties. | — | — | Fast: none. Slow: a decade from lab to field. Research is the slowest lever and one of the strongest. | Research with the first bill |
| 8 · S | H: alternative proteins and vertical farms. | — | — | Fast: none. Slow: decades. New proteins could free land, if people eat them. | As each is worth having |

### Money, credit and insurance (Q5)

The spec's farm adds insurance and credit, and the nation must stay solvent, but the systems map has no row for money. **Q5** proposes one.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · O | H: the household's purse: the wage in, groceries out, the honesty box's takings. | — | Upkeep | Fast: the week's budget. Slow: savings. | Money in the top bar from the start; the purse's lines with the first week's wage and shop |
| 2 · P | H: plot rent. | — | Upkeep | Fast: the year's rent. Slow: none. Land always has a price, even a plot's. | Rent with the plot |
| 3 · P | H: the loan for the second-hand tractor (**Q5**). | — | Upkeep | Borrowing brings a machine forward and a repayment with it. | The loan with the tractor's offer |
| 4 · S | H: insurance and credit. | — | Upkeep | Insurance turns a disaster into a premium. | Insurance with the first loss |
| 5 · P | H: the market's margins. | — | Upkeep | Fast: a stall's takings. Slow: none. Every step between field and fork takes a share. | From the start of the level |
| 6 · P | H: the chain's margins. | — | Upkeep | Fast: none. Slow: suppliers' margins squeezed. The farmer's share of the shelf price is small. | From the start of the level |
| 7 · S | H: the national budget: subsidies and levies against spending. | — | — | Fast: none. Slow: debt. Every subsidy is paid for by someone. | The budget from the start of the level |
| 8 · P | H: commodity finance and aid. | — | — | Fast: a price spike's cost to importers. Slow: none. Aid and credit keep food moving in a crisis. | With the first crisis |

## The game's own systems

### The ladder and sealing

Spec settles it; the maths is PR #20. A sealed node keeps its totals and runs by them alone.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1–8 · S | H: the step-up offer, then sealing: the level shrinks into its tile. The lever is the plan left for the sealed node, which its Health drifts towards. | The zoom-out | The five numbers, Freshness, carbon and land | Fast: none. Slow: Health drifting a point a season. What you built keeps running, by its numbers. | The goal bar with the first harvest; the offer when it comes |

### Zooming back in

Spec: from 2.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · · | Not present: nothing below the garden. | — | — | — | — |
| 2 · S | H: the first zoom back in, scripted: slugs from a neglected plot get into your garden. | The trace; the dive | Reliability +10 and the Rescued badge | Fast: the deadline. Slow: the lasting mark. A failure far off has a cause close up. | The trace with the first zoom back in |
| 3–8 · S | H: the trace down to the failing node, at most once a game year per level. A demand-side trace is **Q12**. | The trace | — | Fixing the cause means going down to it. | The trace when it first comes |

### Advisers, recommendations and Explain

Spec settles the adviser per level and the Explain card.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1 · S | H: the adviser's recommendations and "let them decide". | — | — | Fast: none. Slow: none. Advice saves time if you can trust it. | The first recommendation with the first plan card; Explain on the first tap |
| 2 · S | H: the seed catalogue, whose advice favours its own seeds. | — | — | Ask who pays the adviser. | The catalogue's advice with the first seed purchase |
| 3–6 · S | H: advisers you hire. | — | — | Fast: none. Slow: none. A hired adviser's goals are the ones you pay for. | As hired |
| 7 · P | R: you are the adviser now, recommending to ministers who needn't listen. | — | — | Fast: none. Slow: none. Being right isn't enough; you have to persuade. | From the start of the level |
| 8 · S | H: the same, to many governments. | — | — | Fast: none. Slow: none. Advice across borders has to fit each government's goals. | From the start of the level |

### Events

Spec settles how events cross scales.

| Lv | Shows · lever · who acts | Drawn | Seals as | Fast / slow · lesson | Unfolds when |
| --- | --- | --- | --- | --- | --- |
| 1–8 · S | H at the home level, N one up, T two or more up. The kg lost are the same whichever level shows them. | The event itself, then an icon, then a tint | Output; Reliability | Fast: the loss. Slow: none. The same loss looks smaller from further up, but it's the same food. | Each event on the map when it happens; its Explain on the first tap |

## The spine: the other side of the counter

The game's narrative thread. The founding spec already has it in two places: at the supply chain "you're now the buyer", and the player is the steward who stays while governments change. This web makes it the rule of every level: **each level puts the player on the other side of something they met below.** The player learns a relationship as the weaker party, then runs it, and remembers how it felt. A later level's spec names its reversal from this table (**P** as a design rule; making it a column of the spec's ladder is **Q7**).

| Lv | You meet (the weaker side) | You run (the other side) | Reversal of |
| --- | --- | --- | --- |
| 1 Garden | The shop you buy groceries from; the employer of the gardener's job; the passers-by at the honesty box; the adviser whose recommendations you follow | The plan the gardener works under | — (the start) |
| 2 Allotment | The committee you vote in; the neighbour who helps and takes a bit more; the seed catalogue's advice with an interest | Your plot and the second plot; your swaps | 1's neighbour over the fence: you're now one of eleven neighbours, and your surplus supplies others at the swap shed |
| 3 Smallholding | The parish's planning office and subsidy form; the lender for the tractor (**Q5**); the neighbour who objects | A box scheme sold to other households; the hired hand | 1's shop (you're now the shop for a few dozen households) and 1's job (you're now the employer) |
| 4 Farm | The buyer's contract and cosmetic standards; the union; the subsidy scheme; the insurer; the agency's abstraction licence | The farm business and its seasonal pickers | 3's hand at scale: you employ a crew whose wages someone else sets |
| 5 Town | The council, elected by others | The market: stall fees, market days, rules; redistribution of surplus | 1's honesty box and 3's box scheme (you now set the rules every stall sells by); 2's committee (you now put proposals to a body others elected) |
| 6 Chain | The Groceries Code Adjudicator; the public's view of your reputation | The buying: range, price, promotions, and the standards suppliers must meet | 4's buyer (you now set the cosmetic standards and terms you once suffered); 1's shop (you're the shop the gardener bought from, and you chose the March tomatoes' origin); 2's seed catalogue (your own-label advice has an interest too) |
| 7 Nation | Ministers you didn't choose; elections; lobbies | The minimum wage, benefits and food rules; the subsidy scheme; water licences; land and carbon budgets | 1's job and basket (you set the wage the gardener was paid and the rules that shaped their basket); 1's adviser (you're the adviser now, and ministers may ignore you); 2's committee vote (you serve whoever the voters chose); 3's hand and 4's pickers (you set the labour and migration rules); 3's form and 4's scheme (you design the scheme) |
| 8 Planet | Many governments with their own goals | Treaties, carbon prices, aid | 2's trough (the atmosphere is the shared trough, and every country a plot-holder: a treaty is the rota); 1's honesty box (food aid is the surplus at the gate); 6's imports (export bans are the shop shutting its door) |

Two threads run the whole length and are worth drawing on the page:

- **The basket.** It's bought at 1, sold at 3, set out at 5, chosen at 6 and made affordable (or not) at 7. At 8, incomes change what's in it (the household, below).
- **The hands.** You plan for someone at 1 and are helped at 2. You employ at 3 and 4, staff at 5 and 6, set the wage at 7 and the migration rules at 8.

## Seeds: every late system starts small

Every system first hands-on at level 4 or above, and the seed in levels 1 to 3 that makes it legible when it arrives. **S**: the spec has the seed. **O**: the owner's additions give it. **Q8** and the other numbers: the seed is missing and proposed.

| System (first hands-on) | Its seed in levels 1–3 | Status |
| --- | --- | --- |
| Insurance and credit (4) | The loan for the second-hand tractor (3); the purse with no cushion when the job's wage is late (1) | Lacking in the spec: **Q5** |
| Contracts and cosmetic standards (4) | Passers-by at the honesty box take the best first, so Quality sets what sells (1); box customers complain about a scabby potato (3) | Lacking: **Q8** |
| Abstraction licences (4) | The trough's daily limit and rota (2); a hosepipe ban in a dry garden summer (1) | Trough **S**; the ban lacking: **Q8** |
| Precision inputs (4) | The watering line and drip lines (1) | **S** |
| Animal disease (4) | The hens' and the flock's illness and the vet (1, 3; PR #25's `diseaseRisk()`) | **S** |
| The full carbon account (4) | The dial from the first day (1) | **S** |
| Seasonal labour (4) | The hand hired at harvest (3) | **S** |
| The union (4) | The committee (2): plot-holders with a shared voice. Weak, since a union bargains against someone and the committee doesn't | Weak: named in the needs-owner issue under **Q8** |
| The subsidy scheme (4) | The parish subsidy form (3) | **S** |
| Storage by product and temperature (5) | The kitchen's keeping days (1, built); spoilage on the way (3) | **S** |
| Routes and vehicles (5) | Baskets carried (1, built); the van to market (3) | **S** |
| Retail margins (5) | The honesty box's £2.50 a kg beside the shop's price for the same veg (1) | **O** (the groceries) |
| Local demand by income (5) | The household's own basket (1) | **O** |
| Retail and household waste (5) | The kitchen going off (1, built) | **S** |
| Redistribution (5) | The honesty box's surplus and the swap shed (1, 2) | **S** |
| The council (5) | The committee (2) | **S** |
| Logistics at scale (6) | The van's round (3) | **S** |
| Buyer power (6) | The farm's buyer (4), itself seeded by the box scheme (3) | **S** |
| Imports as the standing substitute (6) | The imported tomatoes in the March basket (1) | **O** |
| Packaging (6) | The basket's packaging in the kitchen's waste, where it can't go on the heap (1) | Lacking: **Q8** |
| The retail carbon account (6) | The basket's embodied carbon beside the dial (1) | **O** with **Q4** |
| Depot labour (6) | The hand (3) | **S** |
| Reputation (6) | Neighbours' goodwill (2); the box customers staying or leaving (3) | **S** (goodwill is a Health part in PR #20) |
| Diet and health (7) | The kitchen's own mix (1) | **S** |
| Population and culture (7) | The household's members (1); neighbours' habits (2) | **O**, **S** |
| The land budget (7) | Digging the lawn (1); the second plot and the bee plot (2); fields (3) | **S** |
| The national carbon account and target (7) | The dial (1) | **S** |
| Water at basin scale (7) | The trough (2) | **S** |
| Food security (7) | Days of food in the kitchen, and an empty shop shelf in a shortage (1) | Lacking: **Q8** |
| Trade deals (7) | The swap shed (2) | **S** |
| Elections (7) | The committee's votes (2) | **S** |
| Geopolitics (8) | The neighbour over the fence (1) | **S** (a line in the spec, no mechanic: **P**) |
| Treaties (8) | The trough rota (2): a shared resource under an agreed rule | **S** |
| Carbon prices (8) | Nothing prices carbon below 8. Nearest: peat compost costing more than peat-free (1) | Weak: named under **Q8** |
| Commodity prices (8) | The basket's prices moving with the world's (1) | Lacking: **Q8** |
| Sea level (8) | The flood on the low field (3) | **S** (the spec's map list) |
| Shifting crop zones (8) | Sowing windows and frost dates (1) | **S** |
| Strategic imports (8) | The March tomatoes (1) | **O** |
| Migration (8) | The hand (3) and the seasonal pickers (4) | **S** |

## Dead ends: every early mechanic goes somewhere

Every mechanic born in levels 1 to 3, and where it goes up the ladder. A flag means it stops, or its route isn't in the spec yet.

| Mechanic (born) | Where it goes | Flag |
| --- | --- | --- |
| The watering line (1) | The trough rota (2) → irrigate or not (3) → abstraction licences (4) → water policy (7) | — (the spec's own example) |
| The butt and the tap (1) | The borehole and reservoir (3, 4) → basin water (7) | — |
| The compost heap (1) | Manure (3) → a digester (4) → waste collections and landfill tax (7) → methane (8) | — |
| Peat compost (1) | Peatland in the land budget (7); England's planned ban on peat in retail compost, a law that reaches the garden's shed | — |
| Digging the lawn (1) | The second plot (2) → fields and hedges (3) → woodland and rewetting (4) → the land budget (7) → deforestation (8) | — |
| Marigolds and flowers (1) | Margins and hedgerows (3) → agri-environment payments (4) → nature law (7) → the 30 by 30 treaty (8) | Lost at sealing: **Q6** |
| The hens (1) | Your own hens carry up in the sealed garden's Output (2, N) → the flock (3) → herds (4) → the diet loop (7) → methane (8) | — |
| The cold frame (1) | The polytunnel (3) → heated glasshouses and their energy (4–6), where the heated local tomato can beat the imported one on price and lose on carbon | — |
| The pest policy (1) | Pest spread (2) → sprays and resistance (4) → pesticide law (7) → borders closing (8) | — |
| The gardener's hours (1) | Help (2) → the hand (3) → pickers (4) → staff (5, 6) → the wage (7) → migration (8) | — |
| The gardener's job and wage (1, **O**) | The partner's choice (2) → part-time (3) → off-farm income (4) → the minimum wage (7) | — |
| The weekly shop (1, **O**) | The box scheme's customers (3) → demand by decile (5) → footfall and the category mix (6) → affordability (7) → Bennett's law (8) | — |
| The kitchen's ask (1) | The basket (1) → demand (5) → diet and health (7) → EAT-Lancet (8) | — |
| The honesty box (1) | The box scheme (3) → the market (5) → the shop (6) → food aid (8) | — |
| The honesty box's passers-by (1) | Nowhere named. **P:** they're households of the same model, and some become the box scheme's customers at 3 | Flag: fixed by **Q1** |
| Quality (1) | Cosmetic standards (4) → price (5) | Flag: no price effect below 4 (**Q8**) |
| The shed light (1) | Evening hours → labour (3) | — |
| The cat (1) | Nowhere | Flag: decoration. Recommend keeping it so; it's drawn from nothing the sim has and changes nothing |
| The adviser (1) | The seed catalogue (2) → hired advisers (3–6) → you, advising ministers (7) | — |
| The warming index (1) | Felt only at 7: counted for six levels without being legible | Flag: **P**, the dial's Explain card scales it up |
| The trough (2) | Water at basin scale (7) → the atmosphere as a commons (8) | — |
| The swap shed (2) | Trade deals (7) → trade (8) | — |
| The committee's water rota (2) | The parish (3) → the council (5) → elections (7) → treaties (8) | — |
| The committee's bonfire ban (2) | Nowhere: no system models burning or air quality | Flag: **Q11** |
| The committee's bee plot (2) | Biodiversity (3, 7, 8) | — |
| The neighbour who helps and over-takes (2) | The hand (3) → a manager who flatters yields (4) → a buyer who skims (6) → a captured rule (7) | — |
| The seed catalogue's interest (2) | Advisers with interests → own-label advice (6) → lobbies (7) | — |
| The neglected plot (2) | Reclaiming land (3, 4); the first zoom back in | Its cause is scripted today: **Q13** |
| Rotation over years (3) | Soil Health carried up → the soil index (7) | — |
| The flock and the vet (3) | Animal disease (4) → borders (8) | — |
| The hired hand's goals (3) | Managers (4) → people you don't choose (5 and up) | — |
| The second-hand tractor (3) | Machinery at scale (4), sealed into Upkeep and Reliability | — |
| The tractor's cost (3) | Nowhere: it's paid outright | Flag: **Q5** |
| Energy and fuel (3) | Renewables (4) → the cold chain (6) → the grid (7) → gas (8) | — |
| The box scheme and farm shop (3) | The market (5) → the chain (6) | — |
| Spoilage on the way (3) | Storage (5) → the cold chain (6) | — |
| Hedgerows and margins (3) | Agri-environment (4) → nature law (7) | Lost at sealing: **Q6** |
| The parish: planning, the subsidy form, the objector (3) | The scheme (4) → the council (5) → the land budget and planning law (7) | — |
| The flood on the low field (3) | Floods (4) → sea level (8) | — |

## The household across the ladder

The owner's additions (**O**), worked in full as the first example of a mechanic followed up the ladder. It's one model at every scale: **a household** is people with hours, a job or not, a purse, and a basket bought from a shop. The player's own household, the neighbours, the box customers, the town's deciles, the nation's population and each country's people are the same thing, summed. Making "household" a node kind at every level is **Q1**.

### 1 · Garden: one household, hands-on

- **The job and its hours.** One member is the gardener. They have a paid job, and the garden gets what's left: the spec's four hours on a weekday and six at the weekend. The wage comes into the purse weekly: the National Living Wage, £12.71 an hour from April 2026, the same figure PR #26 uses for a picker. The job's hours are a flow out to an employer, and the wage a flow in (a hook for the household model, below).
- **The weekly shop.** The kitchen's ask that the garden doesn't meet is bought, together with everything the garden doesn't grow (bread, dairy, meat, fruit). It comes in from the `bought` boundary, with the money out to it. The UK average household spends roughly £70 a week on food and non-alcoholic drink (ONS, Family spending). Each kg grown is a kg not bought, so the garden's value is the shop price it replaces, not the £2.50 at the gate.
- **Shop food's carbon.** Each product in the basket carries its footprint per kg (Poore & Nemecek, 2018), shown beside the dial (**Q4**). Transport is a small share of most foods' footprint, about 6 % of food's emissions worldwide. What you eat matters far more than how far it came, and the game corrects the food-miles myth here. The exceptions are air-freighted food and heated glasshouse produce: a tomato from a heated glasshouse nearby can carry more carbon than one trucked from Spain.
- **The lever and who acts.** The plan decides what the garden replaces; the gardener grows it. A basket lever (swap some meat for beans) would seed the diet loop and is **Q9**. "Let them decide" keeps the usual basket.
- **Drawn.** The gardener leaving for work in the morning and coming back; the shopping carried in on shop day. The basket's carbon shows as a second, paler needle beside the dial.
- **Seals as.** Output, Upkeep (the basket's cost less the box's takings), and, with **Q2**, the node's demand (kg a day by group, £ a day) and hours.
- **Fast / slow.** Fast: a week's shop. Slow: savings, and a diet's footprint.
- **Lesson.** Local isn't the same as low-carbon: the food matters more than the miles.

### 2 · Allotment: the partner, and neighbours as households

- **The partner's lever (O, part 10).** The partner can work more hours (more money for the shed) or help on the plot (more hours for the second plot). The player chooses and the partner acts. By the spec's own rule the partner has goals too: they might want the lawn kept, or weekends free.
- **Neighbours are households.** Each of the eleven plot-holders is a household of the same model, with members, a job and hours. A neighbour whose job has long hours can't keep their plot, so the neglected plot next door emerges from the model rather than being scripted. The scripted first zoom back in can keep its timing and pick the household with the least time (**Q13**).
- **Drawn.** Neighbours arriving after work; the busy one's plot going to weeds.
- **Seals as.** The allotment's Output and Health, and the households' hours (**Q2**).
- **Fast / slow.** Fast: a weekend's help. Slow: a neglected plot's weeds and slugs.
- **Lesson.** Time is the scarcest input, and it's set by people's jobs.

### 3 · Smallholding: the job goes part-time, and the customers are households

- **The job goes part-time.** The household moves hours from the job to the land: less wage, more hours. The lever is the job's hours. The family works the land at weekends and in the holidays, and later so do the children (**O**, later).
- **The box scheme's customers are households.** A few dozen, of the same model: their basket is what they'd otherwise buy at the shop. The smallholding sells what the garden used to buy (the spine).
- **The hand is another household's member.** Their wage is that household's income.
- **Drawn.** The van delivering boxes to houses; the family in the field at the weekend.
- **Seals as.** Output, Upkeep, and (**Q2**) the family's hours and the customers' demand.
- **Fast / slow.** Fast: a box sold. Slow: the business outgrowing the job.
- **Lesson.** A small farm's first capital is the family's time.

### 4 · Farm: off-farm income

- **Off-farm income.** The farm household still has a job, or a lodger, or a farm shop. Many real UK farms make little or a loss from farming alone and rely on diversification, off-farm work and subsidy (DEFRA Farm Business Survey). A bad year is paid from the job.
- **Children and succession (O, later).** Who takes the farm on? The average English farm holder is about 60 (DEFRA), and succession decides whether a farm's slow stocks are kept.
- **Seasonal pickers are households too,** often from abroad, which is the migration seed for 8.
- **Drawn.** The farmhouse with a car leaving for the off-farm job.
- **Seals as.** Upkeep netted by the off-farm income, and Health (goodwill).
- **Fast / slow.** Fast: the job cushions a bad harvest. Slow: succession.
- **Lesson.** Farming often doesn't pay on its own.

### 5 · Town: demand by decile, the basket summed

- **Household demand by income decile** (DEFRA Family Food): each decile a basket by product group, with prices and income shaping it, and its waste. The town's demand is the garden's basket summed, which is **A**, an aggregate that is hands-on again. The player's own household is in there: one of the deciles, by its income.
- **The lever.** The market's rules, stall fees and redistribution; stallholders and the council act.
- **Drawn.** Shoppers by decile at the market and the retail park, with what they carry.
- **Seals as.** Demand by product group and decile (**Q2**).
- **Fast / slow.** Fast: a price change moves baskets within a week (price elasticity). Slow: habits change over years.
- **Lesson.** The poorest spend the largest share of income on food and eat the fewest vegetables (Engel's law; DEFRA Family Food).

### 6 · Supply chain: footfall and the category mix

- **Footfall** (households a day per store) and the **category mix** (the baskets summed by category): the player sets the range, the price and the promotions.
- **Drawn.** Queues, shelves emptying and filling.
- **Seals as.** Demand by category (**Q2**), reputation (Health's goodwill).
- **Fast / slow.** Fast: a promotion's rush. Slow: what the country eats.
- **Lesson.** Promotions and range shape what people eat more than guidance does.

### 7 · Nation: population, wages and affordability

- **Population.** The households summed, with growth and trends.
- **Wages.** The minimum wage is a law that sets the gardener's wage at 1 and the hand's at 3.
- **Affordability.** The food share of spending by decile, standing in for income. The UK average is roughly a tenth, and more than that for the poorest fifth (DEFRA, Food Statistics Pocketbook).
- **Policy reaching the basket.** The sugar levy changes what's in the basket: manufacturers cut the sugar rather than pay. Benefits and free school meals change who can afford it.
- **The lever.** Law, spending political capital; ministers act.
- **Seals as.** Nothing above but the planet: a country's population, income and diet mix carried as its demand (**Q2**).
- **Drawn.** Regions tinted by affordability, with a badge where food insecurity rises.
- **Fast / slow.** Fast: a price spike's hardship. Slow: a generation's health.
- **Lesson.** Wages and food rules shape diets as much as shops do. This is where the player sets the rules that shaped the gardener's job and basket (the spine).

### 8 · Planet: incomes shape diets

- **Bennett's law.** As incomes rise, the share of calories from starchy staples falls and meat and dairy rise. Countries' households, summed, move along that path, and the diet loop feels it in land, methane and prices.
- **The lever.** Treaties, aid and trade; governments act.
- **Seals as.** Nothing: the planet is the top. Its totals are the game's end state.
- **Drawn.** Countries tinted by diet; herds and fields shifting.
- **Fast / slow.** Fast: a commodity price reaching every basket. Slow: the diet transition over decades.
- **Lesson.** Growing incomes change diets, and diets change the planet.

### Checked against the models

- **The household economy model** (a models-ahead session writes it) has no PR yet, so this section is its brief's starting point. It should be **one model for every household**, not only the player's: members, the job's hours and wage, the partner's choice, and the basket by product group with prices, embodied carbon and income elasticities. Then neighbours (2), box customers (3), deciles (5), footfall (6), the population (7) and countries (8) reuse it by summing. The hooks it needs are in the needs-owner issue.
- **Labour, machinery and energy** (PR #26) already has a `person` node with a role, hours and a wage (`WAGES`), and pays from a purse (`PURSE = 'kitchen'`, to become `state.home`). The household model should own that purse. The model has no off-farm role and no wage-payment flow yet, and its wages are constants; the nation's minimum wage needs them to be a lever.
- **Sealing** (PR #20): `Totals` has no demand, hours or income, so a sealed household carries up only as Upkeep. **Q2** is the change that lets the town's demand be the gardens' baskets summed.
- **The partner** (part 10): the work-or-help lever above; their goals follow the spec's rule for everyone you delegate to.

## Questions for the owner (#29)

Each changes the founding spec's model, ladder or carry-over rule, so each is a proposal until the owner answers. The recommendation is given with each on the issue.

- **Q1.** A Households row in the systems map, and "a household" as a node kind at every level (the consumer side of the graph).
- **Q2.** A sealed node carries its demand (kg a day by product group, £ a day) and its hours (had and used) beside the five numbers.
- **Q3** (a note, not a change). The spec already carries Output "by product mix"; PR #20 carries one number. Asked so the owner confirms the product groups.
- **Q4.** Two carbon numbers: the dial stays territorial (flows into the air, conserved), and a consumption footprint (the basket's attributed carbon) shows beside it and is never added to the air.
- **Q5.** A Money, credit and insurance row, seeded by the tractor loan at 3.
- **Q6.** A wildlife part in the carried Health, so hedges and margins survive sealing.
- **Q7.** The spine as a column of the ladder table.
- **Q8.** The seeds the slice lacks: Quality selling at the honesty box, a hosepipe ban, packaging in the basket, days of stock in the kitchen, the basket's prices moving with the world, and a weak union seed and carbon-price seed.
- **Q9.** A diet lever at the garden: the household's basket mix.
- **Q10.** Earlier "From" levels for storage (1), transport (1, 3) and trade (1).
- **Q11.** A home for the bonfire ban (waste: burning against composting, which leads to the stubble-burning ban and burning abroad), or a different third vote.
- **Q12.** A zoom back in on the demand side at the nation: a household that can't afford its basket. Decide at the nation's spec, not now.
- **Q13.** The neglected plot's cause emerges from the household model; the first zoom back in keeps its scripted timing.

## Using the web

- **A brief** answers "How it fits and grows" (`docs/briefs/TEMPLATE.md`) and names its rows here.
- **A part** that changes a row edits that row in its own PR, and adds a row for a new mechanic. A mechanic with no destination, or a late system with no seed, is flagged here in the same PR.
- **A level's spec** (4 to 8) starts from its column in the grid and its row of the spine.
- The rule this web keeps is in `docs/decisions/ADR-2026-09-29-born-small-grows-up.md`.
