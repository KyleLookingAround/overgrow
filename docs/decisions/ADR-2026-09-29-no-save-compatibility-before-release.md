# ADR-2026-09-29: No save compatibility before the first release

## Status

Accepted (the owner, 29 Sep 2026, in the brief for the first slice's part 3).

## Context

Part 1 set the rule that saved fields are never renamed or removed and every version has a migration step, so an old save always loads. Part 2 kept it with a migration from version 1 to 2 and a test that a part-1 save plays on. But nobody plays the game yet: most of it is built before the first release (part 15), and each part reshapes the state (part 3 adds the crops, the gardener's day and the kitchen's ledger). Keeping every intermediate shape loading costs each part a migration and a test for saves no player has.

## Options Considered

### Option 1: the rule from the first saved field
**Pros:** nothing to change later. **Cons:** every part pays for migrations of saves that exist only on developers' devices, and works round earlier parts' shapes instead of reshaping them.

### Option 2: no compatibility until the first release, the rule from then on
**Pros:** parts reshape the state freely; the rule starts when there are players' saves to protect. **Cons:** a developer's or tester's save from an earlier build starts a new game.

## Decision

Option 2. Until the first release (part 15), saves carry no compatibility promise: change the saved shape freely and raise `SAVE_VERSION` (`src/sim/save.ts`), with no migration step and no test that an older build's save loads. A save the game can't read starts a new game, as it already did. From the first release on, never rename or remove a saved field, and add a migration step per version; the release adds the save fixtures and the `migrate` check (the `release` playbook).

## Consequences

- Part 3 raises the version to 3 and drops part 2's migration step and its test; `MIGRATIONS` is empty until the release.
- The project notes, the `feature` playbook, `docs/systems/saving.md` and `docs/SYSTEMS.md` ("State") say the same.
- The save still round-trips exactly within a version: `src/sim/save.test.ts` and the long run in `src/sim/index.test.ts` keep proving it.
