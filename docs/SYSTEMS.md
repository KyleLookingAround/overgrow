# How the game works

The project notes (`CLAUDE.md`) hold what every change needs. This file holds how the code is laid out, how it's tested, and the rules shared by every system; each system has its own file in `docs/systems/`. Read the file for the system you're changing, not all of them (`node tools/graph.mjs <name>` finds it). Keep it true: a PR that changes how something works updates its system's file in the same PR, and a new system adds its own file there. The lists below between `joined` markers are built by `node tools/join.mjs` (`npm run build` runs it), so never edit them by hand.

Today the game is a placeholder page. The founding spec (`docs/specs/overgrow.md`, once it merges) sets the ladder, the saved state, the clock and the bot; the sections below say where each will live and the rules it keeps from the first line of game code.

## Systems

<!-- joined:systems from docs/systems/ by tools/join.mjs: don't edit between these lines -->
- [Placeholder page](systems/placeholder.md) (`00-random.js`, `99-start.js`)
<!-- /joined:systems -->

## Files

The game is one strict IIFE, split into files in `src/game/`. The build joins them in file-name order, so they share one scope: any file can use what another declares at the top level, and order only matters for code that runs at load time (`99-start.js` runs last and starts the game). Keep a new system in its own numbered file before `99-start.js`, and start it with a one-line `/* ===== what's in it ===== */` comment: the table below is built from those lines.

`src/shell.html` holds the page's title, CSS, the HTML skeleton and a `/*GAME*/` placeholder inside the only `<script>`.

<!-- joined:files from src/game/, each file's first line by tools/join.mjs: don't edit between these lines -->
| File | What's in it (its first line) |
| --- | --- |
| `00-random.js` | The seeded random generator: rnd() for anything that can change the game |
| `99-start.js` | Starts the page (the placeholder until the first slice) |
<!-- /joined:files -->

## State

- **`G` and `R`.** `G` will be the saved state (JSON in `localStorage['overgrow-save-v1']`, the only key). `R` is runtime only: anything that can be rebuilt from `G`, and everything the screen needs.
- **New and old saves.** From the first saved field: a `FIELDS` table lists every saved field with its default, a new game is built from it, and loading an older save gives its missing fields the same defaults, then runs an ordered list of `MIGRATIONS` only if the default isn't enough. Never rename or remove a saved field. The first release that saves anything adds `tools/saves/` fixtures and a `migrate` check (the `release` playbook).

## Time

One clock for every level. `update(dt)` advances game time in fixed steps; each level sets how much game time one real second is worth (the spec's table), so the clock speeds up as the player zooms out. Systems register hooks on the clock's ticks from their own files rather than being called from one long function, so adding a system never edits another's file.

## Headless sim

- `R.sim=true` means no DOM work and no saving. Everything reachable from `update()` must work that way, so the bot can play a long game in Node-driven Chromium without a screen.
- **Randomness.** Anything that can change the game uses `rnd()` (`00-random.js`, seeded from `window.__seed`), never `Math.random()`, so a seed repeats a run exactly. The build rejects `Math.random()` on any line that doesn't end with `// cosmetic`.
- **`window.__sim`.** Tests and the bot reach the game through it, in `build/test.html` only. `tools/build.mjs` builds it from every top-level name that `tools/*.mjs`, `tools/checks/*.mjs` or a throwaway `build/*.mjs` reaches as `S.<name>` or `__sim.<name>`, so there's no list to add to. A top-level `let` gets a getter and a setter, so it stays live.

## Build

- `npm run build` builds `dist/index.html` and `build/test.html` (with `window.__sim`), writes `docs/graph.json`, and rejoins the joined lists. It needs no dependencies. It fails, naming the file and line, on a syntax error, a top-level name declared twice across files, duplicate top-level function names, a `</script>` inside the game, `Math.random()` without `// cosmetic`, or a lost `/*GAME*/` or `/*SIM_HOOK*/` marker.
- `node tools/where.mjs <line>` turns a line number from an error in the built page into `src/game/<file>:<line>`.

## Checks

`npm install` once (web sessions do it at start-up through the session-start hook), then `npm run check`. `npm run check -- <group>` runs one group. Every page is seeded, so a failure repeats. When you change a rule on purpose, update its check in the same PR; add a check when you add a rule.

- **A group is a file.** Each file in `tools/checks/` is a group named after it. It exports a default async function that gets the helpers from `tools/check.mjs` (`open`, `ok`, `root`, `out`, `url`, `SAVE_KEY`, `browser`) and reports through `ok(name, pass, info)`. Its opening comment says what it covers, and the list below is built from those comments: add a group by adding a file.
- **Playwright** is pinned to 1.56.1, whose Chromium (build 1194) the web image already has. If Chromium is missing, set `CHROMIUM_PATH` to an existing binary (the session-start hook does this for `/opt/pw-browsers/chromium`). Change the pin only together with the lock file. CI caches `~/.cache/ms-playwright`, keyed on the pin.
- **Looking at UI changes.** Write a small Playwright script in `build/` (git-ignored) that opens `build/test.html` at phone (320×568 and 390×844, `hasTouch`, `isMobile`), a phone on its side (844×390), tablet (768×1024) and desktop (1440×900) sizes, screenshots it and read the images. Measure before fixing a layout bug, not after each attempt.
- **CI's limit.** The `check` job has `timeout-minutes: 25`, well over a local run: a busy runner or a Chromium cache miss can eat most of that.

<!-- joined:checks from tools/checks/, each file's opening comment by tools/join.mjs: don't edit between these lines -->
- `brief`: docs/briefs/TEMPLATE.md and every session brief in docs/briefs/ have all their sections, filled in (tools/brief.mjs).
- `build`: The build and the page it makes (tools/build.mjs): dist/index.html and build/test.html exist and are one self-contained page each, Math.random() without // cosmetic is caught, and the page opens without errors, says "Overgrow", and has no sideways overflow from a 320 px phone to a 2560 px screen, portrait and landscape.
- `graph`: The map in tools/graph.mjs: every link in the docs resolves, every system in docs/systems/ names its files, and the joined lists (tools/join.mjs) are sound and up to date; a system's file changed without its notes is a warning.
<!-- /joined:checks -->

## The bot

Not built yet: the first slice adds it (`tools/bot.js`, `tools/run-bot.mjs`, `npm run bot`) and the `balance` playbook says how it's used. It plays the game headless (`R.sim`) through `window.__sim`, on seeds 1, 2 and 3, and prints the game time it reached each milestone, a fingerprint of the final state (`PLAY`), and any errors, against `tools/baseline.json`.

## Workflows

- **Checks** (`checks.yml`) runs `npm run check` on every PR that isn't a draft, and on demand. A newer push cancels the older run.
- **Description check** (`description.yml`) strips a trailing "Generated by" footer from a PR's description, then fails a title or description that mentions the tools or carries an attribution line. It runs when the PR is opened, edited or reopened, so editing the description re-runs it without a push.
- **Publish to GitHub Pages** (`pages.yml`) runs `npm run check` on `main` itself, then builds and deploys, on each push that can change the page. On a failure it skips the deploy and opens (or updates) an issue titled "main is red".
- **Catch up** (`catch-up.yml`) merges `main` into every open PR when it moves, rejoins the joined lists, and pushes if the only conflicts were inside them; on a real conflict it comments once and leaves the branch alone (the `steward` playbook).
