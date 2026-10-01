# Brief: the land as organic parcels, built ahead (for part 11)

The one map's second step (`docs/specs/one-map.md`, #94), started by the owner on 1 Oct 2026 with two answers: the land is **organic parcels**, not hexes (`docs/decisions/ADR-2026-10-01-organic-parcels.md`), and it is built **ahead** of the level that uses it. The smallholding (level 3, part 11) can't be reached until part 10 seals the allotment and makes its offer, so this part builds the land on its own and proves its look and its budgets in a check-only scene; part 10 and then part 11 wire it into play.

## Goal and what it may touch

- **Deliver** the land model and its generated art, and a check-only scene of a smallholding's fields, in one PR on the session's designated branch (`feature/zoom-back-in`, restarted from `main`), referring to #94.
- **The land model** (`src/sim/land.ts`, pure, tested in `land.test.ts`):
  - A seeded mosaic of irregular cells over the land's rectangle: jittered points relaxed twice (Lloyd), cut into a Voronoi diagram by our own code, each cell about a third of a hectare on the smallholding. Each cell knows its polygon, area and neighbours (the cells it shares an edge with).
  - Fields: connected sets of cells, each with a kind: arable (its crop), grass or ley, woodland, water, or the yard (house and buildings). A seeded first layout grows fields of three to twelve cells from seeds, with a wood, a pond and the yard among them.
  - The land remembering: `join` two neighbouring fields (consolidation, up to `JOIN_MOST` 18 cells), and `split` a field into strips at an angle along its cells' edges (inheritance), each strip connected. Both conserve area exactly and return a new land. Each change is a record (day, what, which fields) for part 11 to save.
  - The outlines: each field's boundary traced as closed rings, and the hedges as the boundaries shared by two different fields or by a field and the edge of the land.
  - Tests: the cells tile the rectangle (areas sum to it within 0.1 %); neighbours are mutual; the same seed gives the same land; a join needs neighbours and keeps the area; a split's strips are connected, cover the field and keep the area; outlines are closed and their shoelace areas match the fields'.
- **The calendar** (`src/data/land.ts`): each arable crop's year in England (sown, emerging, green, flowering, ripe, harvested, stubble, ploughed) with sources (AHDB, the Countryside Survey for hedges), so the land's colour follows the season: oilseed rape yellow in late April and May, winter wheat gold in July, stubble in August, ploughed earth in autumn.
- **The art** (`src/ui/map/land.ts`), drawn by code from the outlines, never the cells:
  - Each field's outline smoothed (its corners rounded); its fill by kind and the season's stage; furrows or drills across arable land at the field's own angle, clipped to it; grass with a sward's texture; a wood as overlapping canopies; the pond as water with a soft shore; the yard as a house and a barn.
  - Hedges along the shared boundaries, with the odd hedgerow tree, and none inside a field: joined fields lose the hedge between them.
  - Cached as one picture, redrawn only when the land changes or the season's stage does; every colour a `--map-*` token.
- **The scene** (check-only, never a player's view): `window.__sim.land(seed, day)` replaces the map with a smallholding's land at a game day, and `window.__sim.land(null)` returns to the game; `landJoin(a, b)` and `landSplit(field, n, angle)` change it. The camera pans and zooms over it as over a level.
- **It may touch:** `src/sim/land.ts` and its test, `src/data/land.ts`, `src/ui/map/land.ts`, the renderer (the scene and its cache), `src/ui/map/palette.ts` and `src/ui/styles/tokens.css` (the land's colours), `src/app/main.tsx` (the check hooks), `tools/checks/land.mjs` (a new group), and the docs: `docs/systems/land.md` (new), `docs/systems/map.md`, `docs/SYSTEMS.md` (the source rows, the check hooks and the speed budget), `docs/roadmap.d/`, this brief and `docs/lessons/`.
- **Nothing else:** no level 3, no smallholding systems, no saving, no step up, no new commands; nothing a player sees changes.

## Read first

- The project notes, then `node tools/graph.mjs src/ui/map/renderer.ts` and `node tools/graph.mjs src/sim/random.ts`, and only the files they list.
- `docs/specs/one-map.md` ("What they see", items 14 and 15), `docs/decisions/ADR-2026-10-01-organic-parcels.md`, `docs/systems/map.md` (the camera and the style kit), `docs/specs/map-art.md`, and `docs/briefs/rotation-and-fields.md` (the fields' model part 11 wires).

## How it fits and grows

Its rows in the systems web (`docs/specs/overgrow/systems-web.md`) are land use and the map at levels 3 and up.

1. **Born where.** The smallholding's fields (level 3), each field a node in part 11. This part moves no flows: it's the land's shape and its look. Land is conserved by construction (a join or split keeps every cell's area).
2. **Across the ladder.** A sealed smallholding carries its land use in `land` as today; at the farm and the town the same mosaic, coarser, holds whole holdings and villages; the land remembering (strips, consolidation, villages growing) comes back as policy (green belts, hedgerow rules).
3. **Loops.** Intensification (consolidation joins fields and grubs out hedges; England lost about half its hedgerows after the Second World War, CPRE). Fast: none here. Slow: the shape of the land over decades, in part 11 on.
4. **People.** Nobody yet: part 11's smallholder and hand work the fields.
5. **The lever.** None yet; part 11's year plan and the land's choices (join, split, replant a hedge) act through it.
6. **The map.** Fields of every shape, hedges between them, furrows, woods, a pond and the yard, changing colour with the season; under reduced motion it's the same still picture.
7. **Explain.** Nothing caused yet; part 11 names the hedges' and the fields' effects with their sources.
8. **Economy and balance.** None: no game code changes, and `PLAY` on seeds 1–3 stays identical to `main`.
9. **Carbon and land.** None yet; each field's area is its land use when part 11 wires it.
10. **Polish.** From 320 px to large screens in the scene; the cells never show; concise UK English in the docs.
11. **The lesson.** Field shapes are history: strips from inheritance, big fields from consolidation, hedges as the boundaries that survived.
12. **Unfolding.** Nothing a player sees until part 11.

## Speed budget

- **Headless:** nothing (no game code changes).
- **One-offs,** at 4× CPU throttling on a phone-sized page: a smallholding's land generated under 20 ms; its art drawn under 40 ms; a join, a split or a new season redrawn under 40 ms.
- **Frames:** the land scene at 1440 × 900 at every zoom within the garden's frame time on `main` plus 0.3 ms (it's one cached picture).
- **`dist/`:** within 10 KB gzipped more.
- **Measuring:** against a build of `main` in a worktree, alternating, three runs each; the line goes in `docs/SYSTEMS.md`, "Speed budget".

## Commit author

KyleLookingAround <KyleMck10@hotmail.com> (the session-start hook sets it; check `git config user.email`).

## Who merges and when

The session, with Squash and merge once checks are green, then confirms the Pages publish. Subscribe to the PR's events (`subscribe_pr_activity`) once it's open and keep a `send_later` (about 20 minutes) as the fallback where the session can.

## What's left for others

- Part 10, the allotment's years, and its smallholding offer.
- Part 11 wires this land into level 3: fields as nodes, the year plan (`src/sim/models/rotation.ts`), saving the land's history, joins and splits as choices, hedges' effects with their sources, and skips at level 3.
- The rest of the one map's build order (standing, upgrades on the map, the wider world, the globe).

## When to stop and ask

- Only for something irreversible or outside this brief.
- Otherwise, if it truly needs the owner: open an issue labelled `needs-owner` with the question and the option it will take by default, carry on with other work, look at the issue at each stopping point, and take the default after 12 hours with no answer. Say so in the PR.
- Where it's merely unclear, take the safer option (easier to undo, or changing the game less) and say so in the PR.

## Cost budget

- Estimate: about $35 (a geometry model with its tests, generated art with a cache, a check-only scene and its check group, and two or three CI rounds of about 25 minutes).
- At each stopping point (a PR opened, CI back, a merge), read `get_session`: `usage.cost_usd` against the estimate (a 0 means not yet known, not free), and `rate_limit_info`. If status is "rejected" or `isUsingOverage` is true, schedule a `send_later` for a minute after `resetsAt` and end the turn.
- Starting another session (`create_session`)? Don't: this is one session's work.
- Past twice the estimate: say why in the PR and in its lesson (`docs/lessons/`), and trim or split what's left.
