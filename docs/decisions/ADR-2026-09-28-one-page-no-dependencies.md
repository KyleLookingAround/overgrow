# ADR-2026-09-28: The game ships as one HTML page with no runtime dependencies

## Status

Accepted, carried over from Final Call's record of 26 Sep 2026 for the owner to confirm with the founding spec.

## Context

Overgrow runs in the browser on phones, tablets and desktops and is published to GitHub Pages. Final Call has shipped this way for 34 versions: one page is easy to host, loads fast on a phone and can't break on a missing file.

## Options Considered

### Option 1: One self-contained page
**Description:** CSS, HTML and all game code inlined into `dist/index.html` by a plain Node script (`tools/build.mjs`). **Pros:** no build dependencies, one file to publish, works offline once loaded. **Cons:** no bundler conveniences (modules, minifying).

### Option 2: A bundler and several files
**Pros:** modules and tree shaking. **Cons:** a dependency chain to keep working across sessions, and more to go wrong on Pages.

## Decision

Option 1. The source is numbered files in `src/game/`, joined in order into one strict IIFE, plus `src/shell.html`. The page loads nothing from elsewhere except, optionally, web fonts (the `build` check fails otherwise).

## Consequences

- Playwright is the only dev dependency, for the checks; the build itself needs none.
- Art is drawn on a canvas or inlined (SVG or `data:` images); the art style the owner picks has to fit in one page.
