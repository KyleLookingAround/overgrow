# ADR-2026-09-28: The map is drawn with WebGL (PixiJS) from the start

## Status

Accepted (with the owner on 28 Sep 2026). Amends `docs/decisions/ADR-2026-09-28-static-site-typescript.md`: a fourth runtime dependency, `pixi.js`.

## Context

The owner wants a living map: people, vehicles, food and animals moving, and every impact of a decision or an event seen on the map first. The founding spec's rule for it is that everything that moves is drawn from a flow the sim already has, so a supply chain with a hundred routes and a nation's freight draw thousands of moving things at once. Canvas 2D drawn by hand, the earlier choice, is fine for a garden and struggles at that count on a phone.

## Options Considered

### Option 1: Canvas 2D, and move to WebGL when the top levels arrive
**Pros:** no dependency now. **Cons:** a renderer rewrite under six levels of drawing code, at the point the game is biggest.

### Option 2: WebGL through PixiJS from the first slice, Canvas 2D only as a fallback
**Pros:** sprites, batching and interpolation are solved; thousands of moving things on a mid-range phone; the same renderer from the garden to the globe. **Cons:** a fourth runtime dependency (about 100 KB gzipped), and the page's size budget moves to allow it.

### Option 3: A game engine (Phaser)
**Cons:** brings its own loop, scenes and input model on top of the sim and Preact; heavier; already ruled out in the static-site record.

## Decision

Option 2. `pixi.js` is the fourth and last runtime dependency without a further record. The map is a PixiJS application inside `src/ui/`, the sim ticks in fixed steps in the worker, and the renderer interpolates between snapshots so movement is smooth at any speed. Drawing stays cosmetic: nothing drawn changes the sim, and what moves is always derived from the sim's flows.

## Consequences

- The first roadmap part builds the shell on PixiJS with interpolation, and the `scene` check measures a frame with 5,000 moving things on a throttled CPU.
- The page's size budget is 500 KB gzipped without the map data (the spec's speed budget).
- The placeholder's Canvas 2D map (`MapCanvas.tsx`) was replaced by the first slice's part 1 (`src/ui/map/renderer.ts`); a Canvas 2D fallback stays only for browsers without WebGL, through Pixi's own Canvas 2D renderer.
