# ADR-2026-09-28: A static site built with Vite from TypeScript, with three runtime dependencies

## Status

Accepted (the runbook PR, with the owner on 28 Sep 2026). Amended the same day by `docs/decisions/ADR-2026-09-28-webgl-map.md`: `pixi.js` is a fourth runtime dependency, for the living map. Also on 28 Sep the owner chose invented places everywhere (issue #2), so the Natural Earth boundaries named below are not shipped: `d3-geo` projects a generated world instead.

## Context

Final Call ships as one hand-joined HTML page of plain JavaScript with no dependencies at all, and that served an airport game well. Overgrow is a different size of thing: a systems simulation that grows from a bed to the planet, with real geography at the top, many panels, and models that other sessions must keep honest for years. The owner asked for the setup to take advantage of starting from scratch.

## Options Considered

### Option 1: Plain JavaScript in numbered files, joined by a script (Final Call's way)
**Pros:** no toolchain, one file to publish. **Cons:** no types on a complex model, tests only in a browser, panels as HTML strings, and a planet's worth of data inlined by hand.

### Option 2: TypeScript with Vite, Preact for panels, D3-geo for real geography, Vitest for the sim
**Pros:** typed models; the sim runs in Node for tests and the bot in milliseconds; declarative panels; real country outlines from Natural Earth without a map service; still a static site on GitHub Pages. **Cons:** a toolchain to keep pinned (Vite, TypeScript, Vitest, Playwright); three runtime dependencies.

### Option 3: A game engine (Phaser, Godot) or a map service (MapLibre)
**Cons:** built for sprite games or live tiles; heavy on a 320 px phone; a server dependency for a static game; mostly panels and a sim, not sprites.

## Decision

Option 2. Exactly three runtime dependencies: `preact`, `d3-geo` and the Natural Earth boundaries (data, added with the planet level). The build is `vite build` to `dist/`, published as it is. Nothing loads from elsewhere at runtime but, optionally, web fonts (the `build` check fails otherwise). Every asset is referenced relatively, so the page works under Pages' sub-path.

## Consequences

- `src/sim/` is pure TypeScript with no DOM and runs the same in a Web Worker (the game), in Node (the checks, the bot) and in a Vitest test (`docs/decisions/ADR-2026-09-28-scale-free-graph.md`).
- Adding a fourth runtime dependency needs a decision record saying why.
- The map is Canvas 2D drawn by hand; PixiJS only if thousands of moving sprites ever need it, by another record.
