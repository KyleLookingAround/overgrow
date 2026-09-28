---
name: release
description: Cut an Overgrow release - claim the version, fold the What's new fragments into the game and the version history, save fixtures for the new version, roadmap. Use when the owner asks for a release or release notes after player-visible changes have merged.
---

# Release

`main` publishes to GitHub Pages on every merge that can change the page, so a release is about the record: what changed for players, and saves that keep old versions tested. Features never pick a version number: each leaves a fragment in `src/updates.d/`, and only a release numbers and folds them, so two sessions can never both claim the next version.

The first release also sets up what later ones use: `docs/HISTORY.md` (a table, newest version on top), the game's What's new list in its own `src/data/` file, `tools/saves/` and the `migrate` check. Write those into this playbook as you add them.

1. **Claim the version.** It's the next number after the top row of `docs/HISTORY.md` (1 if there's none). `git fetch origin main`, check no other `feature/release-*` branch is open, then claim it by creating the branch on GitHub from `main` with `create_branch` before any work: GitHub refuses a branch that already exists, so a second claim fails. A `git push` can't claim it: it succeeds quietly when the branch already sits at the same commit. If the create is refused, another session has the version: stop and say so. Then `git fetch origin && git checkout -b feature/release-<version> origin/feature/release-<version>`.
2. **Fold the fragments.** `node tools/join.mjs` lists what's waiting in `src/updates.d/`. From them write one entry at the top of the game's What's new list (the version, a short title and two to four points players will see) and one row at the top of `docs/HISTORY.md` (a bold headline, then what players will notice, in concise UK English). Leave out code-only changes. Delete the folded fragments (keep the README).
3. **Save fixtures.** If anything added saved fields since the last version: run the bot on seed 1 and copy its saves at each level to `tools/saves/v<version>-L<n>.json`, add their hashes to the `migrate` check (never change an existing line: if an old save's hash changed, what it loads to changed), and run `npm run check`. Every save, old and new, must load and play.
4. **Roadmap.** Add `docs/roadmap.d/<date>-release-<version>.md` with `Section: done` and a line for the version, and move the shipped items' own files to `Section: done`.
5. **Ship** it as a PR (the `steward` playbook), then confirm the "Publish to GitHub Pages" run finished green.
