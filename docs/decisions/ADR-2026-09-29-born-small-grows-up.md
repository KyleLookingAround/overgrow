# ADR-2026-09-29: Every mechanic is born small, grows up the ladder, and unfolds with influence

## Status

Accepted when the PR that adds it merges (the brief `docs/briefs/systems-web.md`, #27).

## Context

The founding spec (`docs/specs/overgrow.md`) sets the ladder, the carry-over rule and where each system is first hands-on. So every mechanic already seals into a node's totals. What the spec doesn't require is the other half. A mechanic born low down must lead somewhere higher, and a system that first arrives high up must have been met small first. Without that, a level can bring a system in from nowhere (insurance at the farm, trade at the planet), and a mechanic the player learnt can quietly stop mattering (the committee's bonfire ban). The owner asked for "different angles and how everything fits into the game in ever expanding systems", and has already added mechanics since the spec was approved (the gardener's job and groceries, and the partner). More will come, from parts built in parallel. So the rule has to live in the process, not only in one document.

## Options Considered

### Option 1: leave it to the spec's carry-over rule
**Pros:** nothing new. **Cons:** the rule covers sealing, not destinations or seeds. Each part judges alone, and the gaps show only when a level's spec is written, too late for the slice to plant the seed.

### Option 2: a register and a question in every brief
One design document follows every mechanic up the ladder (`docs/specs/overgrow/systems-web.md`). Every brief answers "How it fits and grows" (`docs/briefs/TEMPLATE.md`), and the brief check requires the section.
**Pros:** every part answers it before building; the web shows dead ends and missing seeds in one place. **Cons:** one more section per brief, and one more file to keep true.

### Option 3: a check on the code
**Pros:** automatic. **Cons:** a destination is a design fact, not a code fact; nothing in the code can say where a mechanic will go at a level that isn't built.

## Decision

Option 2. The rule every change follows (the owner added the fifth on 29 Sep 2026):

1. **Born small and hands-on.** A mechanic is first hands-on at one level, on one node type, moving conserved flows.
2. **Seals into totals.** It carries up only through a sealed node's totals (the carry-over rule).
3. **Comes back higher up.** It returns at a later level as an aggregate that is hands-on again (the town's demand is the gardens' baskets summed), or as a reversal (the player runs what they met below: the spine). Otherwise the web says why it ends.
4. **Arrives seeded.** A system first hands-on at level 4 or above has a seed in levels 1 to 3 that makes it legible when it arrives.
5. **Unfolds with influence** (the owner, 29 Sep 2026). A mechanic runs from the start and its impacts are on the map from day one. Its instruments (numbers, dials, badges, tabs, plan lines, levers) appear only when the player first has influence over it: never greyed out, never all at once, each with one first-time pulse and a short Explain card. A lever that hasn't unfolded is refused in the sim, so the bot plays the same game. Views unfold in the UI from the saved `seen` state through one table. Each new level starts simple again, and sealed levels below show only their totals. Where this conflicts with the founding spec (the carbon dial "from day one"), the owner's principle wins.

The systems web is the register. A brief names its rows there, and a part that adds or changes a mechanic edits its row in the same PR. A proposal that would change the founding spec's model, ladder or carry-over rule still goes to the owner on a `needs-owner` issue.

## Consequences

- `docs/briefs/TEMPLATE.md` has a "How it fits and grows" section. `tools/brief.mjs` requires it, with a link to the web, in every brief except those started before this record, which it names.
- The `feature` playbook's spec step and the `coordinator` playbook's brief step point at the web and the section.
- Levels 4 to 8 each start their spec from the web's column and the spine's row for that level.
- The web gives every system at every level an "Unfolds when"; the brief template's section asks it as its twelfth point. Part 6's first piece implements the retrofit and cites this record.
- The record adds to the spec: the spec implies rule 2 and parts of 1. Rules 3 to 5, and the brief check, are new.
- The brief check asks only that the section names the web, which a copied template already does: it proves the section is there and answered, not that the answers are good. A grandfathered name in `BEFORE` stays exempt if a later brief reuses it, so don't reuse those names.
