# How the game works

The project notes (`CLAUDE.md`) hold what every change needs. This file holds how the code is laid out, how it's tested, and the rules shared by every system; each system has its own file in `docs/systems/`. Read the file for the system you're changing, not all of them (`node tools/graph.mjs <name>` finds it). Keep it true: a PR that changes how something works updates its system's file in the same PR, and a new system adds its own file there. The lists below between `joined` markers are built by `node tools/join.mjs` (`npm run build` runs it), so never edit them by hand.

Today the game is a placeholder page over a seeded clock. The founding spec (`docs/specs/overgrow.md`) sets the model: one graph of nodes and flows at every scale, from a bed to the planet (`docs/decisions/ADR-2026-09-28-scale-free-graph.md`), with real mechanisms and rough numbers (`docs/decisions/ADR-2026-09-28-real-mechanisms-rough-numbers.md`).

## Systems

<!-- joined:systems from docs/systems/ by tools/join.mjs: don't edit between these lines -->
- [Placeholder page](systems/placeholder.md) (`src/sim/index.ts`, `src/sim/random.ts`, `src/app/sim.worker.ts`, `src/app/sim-client.ts`, `src/ui/App.tsx`, `src/ui/MapCanvas.tsx`)
<!-- /joined:systems -->

## Layers

Four folders under `src/`, and the `rules` check keeps them apart:

| Folder | What's in it | May import |
| --- | --- | --- |
| `src/sim/` | The simulation: the graph, the clock, the models (`src/sim/models/`, one file per mechanism), commands and snapshots. Pure TypeScript, no DOM, no `Math.random()` outside `src/sim/random.ts`. | `src/sim/`, `src/data/` |
| `src/data/` | Real-world parameters: crops, soils, climate normals, countries. Plain typed data. | `src/data/` |
| `src/app/` | The page's glue: the worker that runs the sim (`sim.worker.ts`), the client that talks to it (`sim-client.ts`), the clock loop, saving, `main.tsx`. | anything |
| `src/ui/` | Preact panels and the canvas map, with every colour and size in `src/ui/styles/tokens.css`. Drawing is cosmetic and may use `Math.random()` on a `// cosmetic` line. | `src/ui/`, `src/app/`, the sim's types |

Every source file starts with a one-line `//` comment saying what's in it; the table below is built from those lines. `index.html` is the page's skeleton and loads `src/app/main.tsx`.

<!-- joined:files from src/, each file's first line by tools/join.mjs: don't edit between these lines -->
| File | What's in it (its first line) |
| --- | --- |
| `src/app/main.tsx` | Starts the page: the stylesheet, the simulation worker, and the UI. |
| `src/app/sim-client.ts` | The page's end of the simulation: commands go to the worker (src/app/sim.worker.ts) and snapshots come back. The |
| `src/app/sim.worker.ts` | The simulation in a Web Worker: the page posts commands, the worker answers with snapshots, so a big graph ticking |
| `src/sim/index.ts` | The simulation: pure TypeScript with no DOM, so the same code runs in a Web Worker (the game, src/app/sim.worker.ts), |
| `src/sim/random.ts` | The seeded random generator. Anything that can change the game draws from an Rng made from the game's seed, never |
| `src/ui/App.tsx` | The page: a canvas for the map and HTML panels beside or below it (the founding spec, "The look"). Until the first |
| `src/ui/MapCanvas.tsx` | The map: one canvas that fills its box at the device's pixel ratio. Drawing is cosmetic and may use Math.random(); |
| `src/ui/styles/page.css` | The page's skeleton: the map fills the screen and the panel sits beside it on wide screens, below it on portrait |
| `src/ui/styles/tokens.css` | Design tokens: every colour, size and font the UI uses, in one place. Panels and the canvas read these; nothing |
<!-- /joined:files -->

## State

- **Snapshot and runtime.** The sim owns the game's state and gives the UI a `Snapshot` after each command. Anything that can be rebuilt from the snapshot, and everything only the screen needs (the camera, animations, panel state), lives in the UI and is never saved.
- **Saves.** The spec sets the save format: versioned JSON in `localStorage['overgrow-save-v1']`, the only key, with a migration step per version. From the first saved field, never rename or remove one: old saves must keep loading. The first release that saves anything adds `tools/saves/` fixtures and a `migrate` check (the `release` playbook).

## Time

One clock for every level, in game hours since the start. Each level sets how much game time one real second is worth (the spec's ladder), so the clock speeds up as the player zooms out and slows when they zoom back in. The sim advances in fixed steps; systems register on its ticks (hour, day, week, season, year) from their own files, so adding a system never edits another's.

## The sim in a worker, and headless

- The page runs the sim in a Web Worker (`src/app/sim.worker.ts`): the UI posts commands and gets snapshots back, so a big graph never stalls the map on a phone.
- The checks and the bot skip the worker and call `createSim()` from `src/sim/index.ts` in Node directly. The sim never has two ways of being driven: **every player action, manager action and bot action is a command.**
- **Randomness.** Anything that can change the game draws from the game's `Rng` (`src/sim/random.ts`, seeded from the save or `window.__seed`), so a seed repeats a run exactly. The `rules` check rejects `Math.random()` anywhere else on a line that doesn't end with `// cosmetic`.
- **`window.__sim`.** When the game exposes names for the browser checks, it does so on `window.__sim` in the built page only when `window.__seed` is set; the spec's first slice says what.

## Build

- `npm run build` (`tools/build.mjs`) refuses to run on a broken rule (`tools/rules.mjs`), runs `vite build` into `dist/`, writes `docs/graph.json`, and rejoins the joined lists. `dist/` is the static site Pages publishes; every asset is referenced relatively (`base: './'` in `vite.config.ts`) so it works under the repo's sub-path.
- `npm run dev` starts Vite's dev server with hot reload.
- Runtime dependencies are exactly `preact` and `d3-geo`, plus the Natural Earth data once the planet level exists (`docs/decisions/ADR-2026-09-28-static-site-typescript.md`). A fourth needs a decision record.

## Checks

`npm install` once (web sessions do it at start-up through the session-start hook), then `npm run check`, which runs in order:

1. `npm run build` (above).
2. `tsc --noEmit`: the types.
3. `vitest run`: every `src/**/*.test.ts`. The sim's tests live beside the code they test: a long headless run that repeats from its seed (`src/sim/index.test.ts`), the generator (`src/sim/random.test.ts`), and a plausibility test per model as the models arrive. They run in Node in milliseconds, so a test can play years.
4. `node tools/check.mjs`: the check groups in `tools/checks/`, one file each, in file-name order. `node tools/check.mjs <group>` runs one. A group gets `open` (the built page over HTTP at a viewport, seeded), `ok`, `root`, `out`, `url`, `SAVE_KEY` and `browser`; a group that needs no browser (brief, graph, rules) just doesn't call `open`. Its opening comment says what it covers, and the list below is built from those comments: add a group by adding a file.

- **Playwright** is pinned to 1.56.1, whose Chromium (build 1194) the web image already has. If Chromium is missing, set `CHROMIUM_PATH` to an existing binary (the session-start hook does this for `/opt/pw-browsers/chromium`). Change the pin only together with the lock file. CI caches `~/.cache/ms-playwright`, keyed on the pin.
- **Looking at UI changes.** Write a small Playwright script in `build/` (git-ignored) against `npm run dev` or the served `dist/`, at 320×568, 568×320, 390×844, 844×390 (`hasTouch`, `isMobile`), 768×1024 and 1440×900; screenshot and read the images. Measure before fixing a layout bug, not after each attempt.
- **CI's limit.** The `check` job has `timeout-minutes: 25`, well over a local run.

<!-- joined:checks from tools/checks/, each file's opening comment by tools/join.mjs: don't edit between these lines -->
- `brief`: docs/briefs/TEMPLATE.md and every session brief in docs/briefs/ have all their sections, filled in (tools/brief.mjs).
- `build`: The built page (dist/, from vite build): it exists, loads nothing from elsewhere but fonts, opens without errors, says "Overgrow", gets an answer from the simulation worker, and has no sideways overflow or page scroll from a 320 px phone, portrait and landscape, to a 2560 px screen.
- `graph`: The map in tools/graph.mjs: every link in the docs resolves, every system in docs/systems/ names its files, and the joined lists (tools/join.mjs) are sound and up to date; a system's file changed without its notes is a warning.
- `rules`: The rules every source file keeps (tools/rules.mjs): Math.random() only in the seeded generator or on a `// cosmetic` line, the sim and its data never importing the UI or naming the DOM, and every model in src/sim/models/ naming its sources and what it simplifies. Each rule is also proved to catch a slip, on a small fixture.
<!-- /joined:checks -->

## Rules

`tools/rules.mjs` (the `rules` check, and the build refuses to run on a slip):
- **Randomness:** `Math.random()` only in `src/sim/random.ts` or on a line ending with `// cosmetic`.
- **Layers:** `src/sim/` and `src/data/` import nothing from `src/ui/` or `src/app/` and never name `window`, `document`, `localStorage`, `self` or `postMessage`.
- **Sources:** every model in `src/sim/models/` has a `// Sources:` block and a `// Simplifies:` line.

## The bot

Not built yet: the first slice adds it (`tools/bot.ts`, `npm run bot`) and the `balance` playbook says how it's used. It plays the game headless in Node through `createSim()` and commands, on seeds 1, 2 and 3, and prints the game time it reached each milestone, a fingerprint of the final state (`PLAY`), and any errors, against `tools/baseline.json`.

## Workflows

- **Checks** (`checks.yml`) runs `npm run check` on every PR that isn't a draft, and on demand. A newer push cancels the older run.
- **Description check** (`description.yml`) strips a trailing "Generated by" footer from a PR's description, then fails a title or description that mentions the tools or carries an attribution line. It runs when the PR is opened, edited or reopened, so editing the description re-runs it without a push.
- **Publish to GitHub Pages** (`pages.yml`) runs `npm run check` on `main` itself, then builds and deploys `dist/`, on each push that can change the page. On a failure it skips the deploy and opens (or updates) an issue titled "main is red".
- **Catch up** (`catch-up.yml`) merges `main` into every open PR when it moves, rejoins the joined lists, and pushes if the only conflicts were inside them; on a real conflict it comments once and leaves the branch alone (the `steward` playbook).
