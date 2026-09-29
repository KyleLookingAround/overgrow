# The playable garden

Issue: #54 · Status: Approved (the playable garden's brief (#52) approves it in advance, from the founding spec's garden section and the owner's request of 29 Sep 2026) · PRs: (added as they open)

## What the player gets

Level 1 as a game: earn, spend, grow, see the result, reach the goal. The shed sells things worth having, each a trade; beds 3 to 6 can be dug from the lawn once the dug ones are full; beds stay busy through the winter; the goal bar says the one next thing to do, and a card ends the year when the allotment offer's requirements are met.

## The mechanism

Each upgrade is a real one with its source (`docs/systems/shed.md`): beer traps drowning slugs (RHS), a hose from the tap, *Phasmarhabditis* nematodes in warm moist soil (Wilson et al. 1993), a closed compost bin (WRAP; Amlinger et al. 2008), a cold frame's frost, rain and season (RHS), a second butt. Digging turns turf over (a CO₂ flush, Reicosky & Lindstrom 1993) and costs edging. Winter crops and a green manure are the RHS's autumn sowings (Thorup-Kristensen et al. 2003 for the green manure's nitrogen). Fast effect: the next week's hours and crop. Slow effect: the soil, the purse and the kitchen's winter.

## Where it sits on the ladder

The back garden. A sealed garden carries its kit in Health, its beds in its land, and its year in Output and Reliability; the allotment's tools and shared store, the smallholding's tractor and polytunnel, and the nation's land use are the same pattern higher up.

## What they see

- On the map: the new beds cut from the lawn and planted, the gardener using the hose.
- In the panel: the Shed tab's offers with price, what they save and their trade, and a Buy button; "Dig this bed" on a grass plot's card; each bed's line saying what's true now and why it's empty; the winter line.
- Over the map: the goal bar's next action and the prize; the year's card.
- On a 320 px phone, a landscape phone, a tablet and a large screen, like the rest of the panel.

## How it works

`docs/systems/shed.md`, `docs/systems/crops.md`, `docs/systems/gardener.md`, `docs/systems/ladder.md` ("The garden's offer"). Each offer, "Dig this bed" and the winter line unfold when they first answer something that happened (`docs/systems/unfolding.md`).

## Saved state

Version 8: the shed's `kit`, each bed's `winter` and `cover`, the goal's `fed`. An older save starts a new game (no compatibility before the first release).

## Balance

The bot's first buy on day 2; all six beds dug; the allotment offer on days 378 to 469 on seeds 1 to 3, with the garden's targets set at its measured ceiling (`docs/decisions/ADR-2026-09-29-garden-reliability.md`, the owner's question #55). The brief approves moving the milestones; `tools/baseline.json` isn't reset here.

## Checks

`src/sim/shed.test.ts` (each upgrade's direction and rough size, digging, the green manure), the `shed` and `dig` check groups, and the first-minute group's Shed tab.

## Files

`src/data/shed.ts`, `src/sim/shed.ts`, `src/sim/kit.ts`, `src/ui/ShedTab.tsx`, `src/ui/YearCard.tsx` (new); `src/data/crops.ts`, `jobs.ts`, `garden.ts`, `kitchen.ts`, `storage.ts`, `unfold.ts`, `explain.ts`, `ladder-rules.ts`; `src/sim/commands.ts`, `gardener.ts`, `goal.ts`, `state.ts`, `save.ts`, `systems.ts`, `models/crops.ts`, `carbon.ts`, `water.ts`, `pests.ts`, `kitchen.ts`; `src/ui/Panel.tsx`, `GardenTab.tsx`, `GoalBar.tsx`, `goal.ts`, `App.tsx`, `map/draw.ts`; the bot.
