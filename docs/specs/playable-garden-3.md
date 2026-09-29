# The playable garden, round three

Issue: #62 · Status: Approved. The coordinator's brief (`docs/briefs/playable-garden-3.md`) approves it in advance, from the owner's decisions 14 and 15.

## What the player gets

- **Winter play.** The autumn and winter are a season of jobs and choices, not a 90-day wait.
- **An ending.** The first year always ends with a card, whether or not the offer is won.
- **Steady spending.** Money goes out as a stream of small choices, not a few lumps.
- **Buttons.** The goal bar has a button behind every verb.

## The mechanism

- **Autumn leaves** are the heap's browns: carbon-rich, rotted by fungi into leaf mould (RHS, "Leaf mould").
- **Bare-root fruit** is sold and planted while dormant, November to March. It's cheaper than potted, crops lightly the next summer and fully after (RHS, "Bare-root plants", "Redcurrants").
- **Dig or no-dig.**
  - Digging exposes slugs' eggs to birds and frost, and lets air at the soil's organic matter (RHS; Reicosky & Lindstrom 1993).
  - Undug beds under a mulch crop as well or better (Charles Dowding's no-dig trials).
- **The mid-priced kit:**
  - a fork digs heavy ground faster (RHS, "Digging");
  - cloches keep off 2 °C and widen the seasons two weeks (RHS, "Cloches");
  - a propagator raises tender plants from a packet;
  - a bee hotel brings mason bees in spring (the Wildlife Trusts).

Fast effect: this week's purse and cards. Slow effect: the fruit's years and the soil's carbon.

## Where it sits on the ladder

- **The level.** The back garden (level 1). Its rows in the systems web: "Crops", "Markets, prices and demand", "Waste and circularity", "Soil" and "Labour" at level 1.
- **Zoomed out.** A sealed garden carries its fruit and kit in Health. The allotment's winter is the same season with neighbours. Dig or no-dig returns at the fields as tillage (part 11).

## What they see

- **On the map:** cordons along the bottom fence, and cloches over their bed.
- **The Shed tab:** a purse line (the week's in and out, and the last big spend), then the next big buy to save for.
- **Cards:** one at a time in the notices' queue, and the "Your first year" card on day 366.
- **The goal bar:** its button.
- **Every size** from 320 px.

## Saved state

Version 10:
- the kitchen's `purse`;
- the kit's `bare`;
- the `cordons` node and its plantings.

An older save starts a new game.

## Balance

The brief approves the milestones moving. The PR reports:
- the purse over the year;
- each purchase's day;
- the kg eaten, sold, given and wasted;
- the longest quiet stretch;
- the offer's day.

## Checks

- A Vitest test per new card that answers it and asserts it's gone.
- The year's card on the anniversary.
- The cordon's plausibility test.
- The mid-priced kit's effects.
- The unfold sign that must not return.
