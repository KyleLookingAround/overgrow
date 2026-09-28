# What's new, waiting for a release

A change players will notice adds its What's new entry here as its own file, `src/updates.d/<short-name>.md`. It has no version number: only a release gives one, so two sessions can never both claim the next version.

```
# A short title for the change

- **A bold lead.** One short sentence players will see.

History: a sentence or two for docs/HISTORY.md, saying what players will notice.
```

- **One to four points**, each a **bold lead** of at most four words ending in a full stop, then **one short sentence** (under 90 characters) in concise UK English.
- The first slice decides whether a point can also carry where its "Show me" button goes and the level it needs, and adds them here when it does.

The `release` playbook folds every file here into one entry in the game's What's new list and one `docs/HISTORY.md` row with the next version, then deletes them. `node tools/join.mjs` lists what's waiting, and the `graph` check fails on a fragment with a version number or no points. The build never reads this folder, so a fragment changes nothing in the game until it's released.
