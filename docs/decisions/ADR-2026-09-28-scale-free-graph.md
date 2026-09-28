# ADR-2026-09-28: One scale-free graph of nodes and flows, simulated in a worker

## Status

Accepted (the runbook PR, with the owner on 28 Sep 2026; the founding spec fills in the model).

## Context

Every level of Overgrow is a zoom-out: what the player micromanaged in one level becomes a single building block in the next, from a bed to a plot to a field to a farm to a supplier to a region to a country to the planet. The owner wants, eventually, oversight of the whole planet, with carbon, climate, diet and politics in the loop. If each level were its own game, the planet would be an eighth game to write, and nothing the player learnt below would add up.

## Options Considered

### Option 1: A game per level, with a hand-off between them
**Cons:** eight engines; sealing a level into a node is bespoke every time; the national carbon account can't be the sum of what the player did by hand.

### Option 2: One graph at every scale
**Description:** every node (a bed, a herd, a shop, a country) has the same shape: stocks, flows in and out, and levers. Flows are conserved and carried in SI units: water, nutrients, carbon, food by product, feed, money, labour, energy, waste, pests, opinion. Zooming out seals a node's detail into its totals; zooming in inflates them again. Only the node type and the data change by level.
**Pros:** the planet is the graph with its top node reached; carbon, land, water and waste are counted from the first bed and summed upwards; one bot, one save format, one set of checks. **Cons:** the graph has to be designed before the garden is, which is what the founding spec does.

## Decision

Option 2, with these rules from the first line of code:
- **Carbon and land are flows on every node**, so the top-level accounts are sums of things the player handled.
- **The weather generator takes a warming index** the graph itself produces, so the climate loop closes without a special case.
- **Political capital and public support are stocks** of the nodes that have politics, at every scale (a committee, a council, a parliament).
- **Every model states its fast effect and its slow effect** (soil takes years, the climate a lifetime, prices days), because those delays are what the game teaches.
- **The simulation runs in a Web Worker** (`src/app/sim.worker.ts`) so a big graph never stalls the map on a phone, and the same module runs in Node for the checks and the bot. The UI reaches it only through commands and snapshots; every player action, manager action and bot action is a command, so the bot plays exactly the game the player does.
- **`src/sim/` and `src/data/` import nothing from the UI and never name the DOM** (the `rules` check).

## Consequences

- The founding spec defines the node shape, the flow types and units, sealing, and the levers per level.
- A feature spec says which node type and flows it touches and how it reads one level up.
- The first slice is the garden and the allotment, but built on the graph, not on a garden-shaped special case.
