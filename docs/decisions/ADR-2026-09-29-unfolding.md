# ADR-2026-09-29: Instruments unfold as the player gains influence, from one table, gated in the sim

## Status

Accepted when the PR that adds it merges (the brief `docs/briefs/unfolding-first-minute.md`, #41). It records the owner's decision of 29 Sep 2026 (decision 9 of `docs/briefs/coordinator-first-slice-2.md`, and the systems web's "Unfolding"), which part 5 started and part 6a made the rule for every instrument.

## Context

The garden alone has a dozen systems running from the first hour: weather, water, soil, crops, pests, wildlife, the kitchen, carbon, money. Showing every number from day one overwhelms a new player, and most of them are numbers the player can't yet change. The owner: "I don't want to overwhelm the player with too many things to look at from the start. The systems should still be running, just unfolding to the user as they have influence." Part 5 started a table for its pests and flowers; the rest of the page still showed everything.

## Options Considered

### Option 1: show everything, and lean on the Explain card
**Pros:** nothing to build. **Cons:** the first minute is a wall of numbers; the owner has ruled it out.

### Option 2: unlock systems by level or by time
**Pros:** simple. **Cons:** a system the player can't see still acts on the garden; a timer teaches nothing about why a number matters.

### Option 3: every system runs, and its instruments unfold with the player's first influence over it, from one table the sim keeps
**Pros:** the map shows every impact from day one, and each number arrives when it becomes a choice; the sim gates the levers, so the bot and the player play the same game; one table is the order a new player meets things. **Cons:** a trigger can be rare on some seeds (the temperature waits for a frost on a crop), and every new instrument needs its key.

## Decision

Option 3 (the owner, 29 Sep 2026):

1. **Every system runs from the first hour; the map is whole from day one.** Only the panels and the chrome unfold.
2. **One table**, `src/data/unfold.ts`: each key names what it reveals, why (the sign's short line), and the causes that reveal it. The sim adds a key to the saved `seen` list the first time one of its causes is recorded. A key not in the table never unfolds (it fails closed). Keys are named by level and system (`garden.water`), and each new level starts simple again with its own.
3. **Levers are gated in the sim** (`GATES`): a command on a lever whose key hasn't unfolded is refused, so the bot waits for it too. Views (numbers, dials, badges, tabs) are gated in the UI.
4. **Never greyed, never all at once:** hidden until unfolded, and one sign a batch (win W26), with its short why.
5. **"Show all details"**, a saved setting off by default, shows every view early; it opens no lever.
6. **The garden's carbon dial comes with the first carbon choice** (the first compost spread or dig, and peat in part 6c), not from day one; money comes with the first sale or purchase. Carbon and money are counted from the first hour either way.

## Consequences

- Every part that adds an instrument adds its key to the table with its cause, names it by level and system, and lists it in `docs/systems/unfolding.md` in the order a player meets it; a new lever adds its gate, and the bot's policy waits for it.
- The founding spec's "shown on a small dial from day one" and "a tab appears only once it has something in it" now read through the table; the systems web's "Unfolds when" column is each system's row.
- The `unfold` check holds the rules on the page: only the core on a new game, each trigger revealing its key, unknown keys failing closed, a hidden lever refused, one sign a batch, and "Show all details" showing everything but opening nothing.
- Pacing is still judged by the longest quiet stretch: unfolding is part of what keeps a long game readable, and each key's arrival is something new to see.
